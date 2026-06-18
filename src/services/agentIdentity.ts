/**
 * ERC-8004 agent identity + reputation — Mantle Sepolia reads/writes.
 *
 * Ties the Coach Agent to the Mantle "Turing Test" hackathon's three
 * pillars:
 *   1. on-chain benchmarking of AI — every agent run can be recorded as
 *      an ERC-8004 ReputationRegistry.giveFeedback() entry on Mantle, a
 *      permanent on-chain record of the agent's performance.
 *   2. ERC-8004 identity — the agent is a Trustless Agent (agentId) on the
 *      canonical IdentityRegistry; we read its on-chain AgentCard here.
 *   3. radical transparency — these reads power an in-app card that shows
 *      the agent's verifiable on-chain identity + run count to the user.
 *
 * Registries are the canonical ERC-8004 singletons on Mantle Sepolia
 * (chainId 5003); addresses come from app.json `extra`.
 */
import { createPublicClient, encodeFunctionData, http, keccak256, toHex } from 'viem';
import Constants from 'expo-constants';

type MantleExtra = {
  mantleChainId?: number;
  mantleRpcUrl?: string;
  mantleExplorerUrl?: string;
  erc8004IdentityRegistry?: string;
  erc8004ReputationRegistry?: string;
  coachAgentId?: number;
};

const extra = (Constants.expoConfig?.extra ?? {}) as MantleExtra;

export const MANTLE_CHAIN_ID = extra.mantleChainId ?? 5003;
export const MANTLE_RPC_URL = extra.mantleRpcUrl ?? 'https://rpc.sepolia.mantle.xyz';
export const MANTLE_EXPLORER = extra.mantleExplorerUrl ?? 'https://explorer.sepolia.mantle.xyz';
export const IDENTITY_REGISTRY = (extra.erc8004IdentityRegistry ?? '') as `0x${string}` | '';
export const REPUTATION_REGISTRY = (extra.erc8004ReputationRegistry ?? '') as `0x${string}` | '';
export const COACH_AGENT_ID = BigInt(extra.coachAgentId ?? 0);

const IDENTITY_ABI = [
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
] as const;

const REPUTATION_ABI = [
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'NewFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'clientAddress', type: 'address', indexed: true },
      { name: 'feedbackIndex', type: 'uint64', indexed: false },
      { name: 'value', type: 'int128', indexed: false },
      { name: 'valueDecimals', type: 'uint8', indexed: false },
      { name: 'indexedTag1', type: 'string', indexed: true },
      { name: 'tag1', type: 'string', indexed: false },
      { name: 'tag2', type: 'string', indexed: false },
      { name: 'endpoint', type: 'string', indexed: false },
      { name: 'feedbackURI', type: 'string', indexed: false },
      { name: 'feedbackHash', type: 'bytes32', indexed: false },
    ],
  },
] as const;

const client = createPublicClient({ transport: http(MANTLE_RPC_URL) });

export interface AgentIdentity {
  agentId: number;
  owner: `0x${string}`;
  name: string;
  registryAddress: string;
  explorerTokenUrl: string;
}

/** Read the agent's ERC-8004 identity + AgentCard name from Mantle. */
export async function fetchAgentIdentity(): Promise<AgentIdentity | null> {
  if (!IDENTITY_REGISTRY || COACH_AGENT_ID === 0n) return null;
  try {
    const [owner, uri] = await Promise.all([
      client.readContract({
        address: IDENTITY_REGISTRY,
        abi: IDENTITY_ABI,
        functionName: 'ownerOf',
        args: [COACH_AGENT_ID],
      }),
      client.readContract({
        address: IDENTITY_REGISTRY,
        abi: IDENTITY_ABI,
        functionName: 'tokenURI',
        args: [COACH_AGENT_ID],
      }),
    ]);
    let name = 'Kajota Coach Agent';
    try {
      const json = uri.startsWith('data:')
        ? JSON.parse(decodeBase64(uri.slice(uri.indexOf(',') + 1)))
        : null;
      if (json?.name) name = json.name;
    } catch {
      /* keep default name */
    }
    return {
      agentId: Number(COACH_AGENT_ID),
      owner: owner as `0x${string}`,
      name,
      registryAddress: IDENTITY_REGISTRY,
      explorerTokenUrl: `${MANTLE_EXPLORER}/token/${IDENTITY_REGISTRY}?a=${COACH_AGENT_ID}`,
    };
  } catch {
    return null;
  }
}

/**
 * Count how many runs have been benchmarked on-chain for this agent —
 * the number of ReputationRegistry.NewFeedback events emitted for it.
 * Scans a bounded recent window so the public RPC doesn't time out.
 */
export async function fetchAgentRunCount(): Promise<number | null> {
  if (!REPUTATION_REGISTRY || COACH_AGENT_ID === 0n) return null;
  try {
    const latest = await client.getBlockNumber();
    const WINDOW = 9000n; // ~5h of Mantle blocks; covers live demo activity
    const fromBlock = latest > WINDOW ? latest - WINDOW : 0n;
    const logs = await client.getLogs({
      address: REPUTATION_REGISTRY,
      event: REPUTATION_ABI[1],
      args: { agentId: COACH_AGENT_ID },
      fromBlock,
      toBlock: latest,
    });
    return logs.length;
  } catch {
    return null;
  }
}

export interface AgentRunReceipt {
  productId: string;
  tools: string[];
  outcome: string;
  /** 0-100 quality score the user assigns to the run. */
  score?: number;
}

/**
 * Build the giveFeedback() transaction that records one agent run on the
 * Mantle ReputationRegistry. Returned shape is fed straight to the Privy
 * embedded-wallet provider's `eth_sendTransaction` (chainId 5003).
 */
export function buildRecordRunTx(run: AgentRunReceipt): {
  to: `0x${string}`;
  data: `0x${string}`;
  chainId: number;
} | null {
  if (!REPUTATION_REGISTRY) return null;
  const feedback = {
    type: 'kajota-coach-run-v1',
    agent: 'Kajota Coach Agent',
    productId: run.productId,
    tools: run.tools,
    outcome: run.outcome,
  };
  const feedbackURI =
    'data:application/json;base64,' + encodeBase64(JSON.stringify(feedback));
  const feedbackHash = keccak256(toHex(JSON.stringify(feedback)));
  const score = BigInt(Math.max(0, Math.min(100, run.score ?? 100)));
  const data = encodeFunctionData({
    abi: REPUTATION_ABI,
    functionName: 'giveFeedback',
    args: [
      COACH_AGENT_ID,
      score, // value
      0, // valueDecimals → score is a plain 0-100 integer
      'listing-created', // tag1
      'kajota-coach', // tag2
      'https://kajota-mobile-backend-2.onrender.com/kajota-mobile-backend/ai/coach/agent/chat', // endpoint
      feedbackURI,
      feedbackHash,
    ],
  });
  return { to: REPUTATION_REGISTRY, data, chainId: MANTLE_CHAIN_ID };
}

export function explorerTxUrl(hash: string): string {
  return `${MANTLE_EXPLORER}/tx/${hash}`;
}

/* base64 helpers — Hermes lacks atob/btoa; use the global Buffer polyfilled
 * by the app entry, falling back to a tiny inline codec if absent. */
function encodeBase64(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer;
  return B ? B.from(s, 'utf8').toString('base64') : btoaSafe(s);
}
function decodeBase64(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer;
  return B ? B.from(s, 'base64').toString('utf8') : atobSafe(s);
}
function btoaSafe(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (globalThis as any).btoa;
  return f ? f(s) : s;
}
function atobSafe(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (globalThis as any).atob;
  return f ? f(s) : s;
}
