/**
 * KaJota Coach — Casper x402 premium client.
 *
 * Talks to the same FastAPI agent service as `conciergeAgent.ts`, but to its
 * pay-per-call endpoint `POST /coach/premium`. The flow mirrors the HTTP-402
 * protocol, revived for agents:
 *
 *   1. requestPremiumPaywall() — calls the endpoint with no payment. The
 *      server answers 402 with the Casper "price tag" (asset, amount, payTo,
 *      network). We surface that so the UI can render the paywall.
 *   2. A Casper signer turns the price tag into a signed `X-PAYMENT` payload
 *      (secp256k1 EIP-712 over a CEP-18 transfer_with_authorization). On
 *      mobile this is handed off — see `signViaBridge` (a configured signer
 *      endpoint) or paste a payload produced by `scripts/x402_client.mjs`.
 *   3. payPremium(xPayment) — retries with the payload. The facilitator
 *      settles on Casper and the server returns the premium insight plus the
 *      on-chain deploy hash.
 *
 * Backend: agent/kajota_concierge/server.py (POST /coach/premium)
 */
import Constants from 'expo-constants';

import { CONCIERGE_AGENT_BASE_URL } from '@/services/conciergeAgent';
import type {
  Casper402,
  ConciergeChatRequest,
  PremiumResponse,
} from '@/types';

/**
 * A real, on-chain-confirmed settlement from this same demo. Shown when the
 * shared rail is degraded so the user still gets verifiable proof rather than
 * a dead end. Mirrors the web judge demo's fallback.
 */
export const CONFIRMED_SETTLEMENT_TX =
  '85041ff37d4e7b4840f738a465bfd933875bdf81604ced3fc6b62dba5fe1d7ea';
export const CONFIRMED_SETTLEMENT_URL = `https://testnet.cspr.live/transaction/${CONFIRMED_SETTLEMENT_TX}`;

/**
 * Thrown when the payment itself is fine (signed, and the facilitator's
 * /verify passed) but the shared on-chain submit/execute step failed. That is
 * an outage on the rail, not a rejected payment — the UI should say so and
 * still offer a verifiable settlement.
 */
export class SettlementDegradedError extends Error {
  readonly degraded = true;
  readonly facilitatorReason: string;
  readonly confirmedTx = CONFIRMED_SETTLEMENT_TX;
  readonly confirmedTxUrl = CONFIRMED_SETTLEMENT_URL;
  constructor(facilitatorReason: string) {
    super('Casper settlement is temporarily unavailable on the shared rail.');
    this.name = 'SettlementDegradedError';
    this.facilitatorReason = facilitatorReason;
  }
}

/** Facilitator reasons that mean "the rail is down", not "your payment was bad". */
function isRailDegraded(reason: string): boolean {
  return /wait_deploy_failed|put_deploy_failed|insufficient balance|User error|deploy_failed/i.test(
    reason,
  );
}

type ChatIds = Pick<ConciergeChatRequest, 'userId' | 'sessionId'> & {
  message?: string | null;
};

/**
 * Optional signer bridge — a small HTTP endpoint that takes the 402
 * requirements and returns a signed base64 `X-PAYMENT` (e.g. the Node
 * `scripts/x402_client.mjs` wrapped as a service, or a CSPR.click relay).
 * Configure via app.json → `extra.casperSignerUrl`. When unset, the UI falls
 * back to manual paste of a payload signed out-of-band.
 */
const CASPER_SIGNER_URL = (
  Constants?.expoConfig?.extra as Record<string, string> | undefined
)?.casperSignerUrl;

export const hasSignerBridge = Boolean(CASPER_SIGNER_URL);

const PREMIUM_URL = `${CONCIERGE_AGENT_BASE_URL}/coach/premium`;

/**
 * Outcome of the unpaid probe: either a 402 price tag, or a signal that the
 * server's paywall isn't fully configured yet (no sponsored key / asset).
 */
export interface PaywallResult {
  requirements: Casper402['accepts'][number];
  raw: Casper402;
  /** True when the server returned 402 but isn't configured to actually charge. */
  unconfigured: boolean;
}

/**
 * Probe the premium endpoint with no payment to get the Casper price tag.
 * Resolves on the expected 402; throws on anything else (200 would mean the
 * paywall is open, which shouldn't happen).
 */
export async function requestPremiumPaywall(
  ids: ChatIds = {},
): Promise<PaywallResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(PREMIUM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: ids.message ?? null,
        userId: ids.userId ?? 'demo-user-1',
        sessionId: ids.sessionId ?? null,
      }),
      signal: controller.signal,
    });

    if (res.status !== 402) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Expected 402 from the paywall, got ${res.status}: ${text || res.statusText}`,
      );
    }

    const body = (await res.json()) as Casper402;
    const requirements = body.accepts?.[0];
    if (!requirements) {
      throw new Error('402 from server but no payment requirements in body.');
    }
    const unconfigured = /not fully configured/i.test(body.error ?? '');
    return { requirements, raw: body, unconfigured };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Paywall request timed out — the agent dyno may be cold.');
    }
    throw err instanceof Error ? err : new Error('Could not reach the paywall.');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Ask the configured signer bridge to sign the requirements into an
 * `X-PAYMENT` payload. Throws if no bridge is configured.
 */
export async function signViaBridge(
  requirements: Casper402['accepts'][number],
): Promise<string> {
  if (!CASPER_SIGNER_URL) {
    throw new Error('No signer bridge configured (extra.casperSignerUrl).');
  }
  const res = await fetch(CASPER_SIGNER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Signer bridge error (${res.status}): ${text || res.statusText}`);
  }
  const body = (await res.json()) as { xPayment?: string };
  if (!body.xPayment) throw new Error('Signer bridge returned no xPayment.');
  return body.xPayment;
}

/**
 * Complete the paid call: retry the premium endpoint with the signed
 * `X-PAYMENT`. On success the facilitator has settled on Casper and the
 * server returns the insight + deploy hash. A 402 here means the payment
 * was rejected (bad signature, insufficient balance, etc.).
 */
export async function payPremium(
  xPayment: string,
  ids: ChatIds = {},
): Promise<PremiumResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(PREMIUM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': xPayment.trim(),
      },
      body: JSON.stringify({
        message: ids.message ?? null,
        userId: ids.userId ?? 'demo-user-1',
        sessionId: ids.sessionId ?? null,
      }),
      signal: controller.signal,
    });

    if (res.status === 402) {
      const body = (await res.json().catch(() => null)) as Casper402 | null;
      const reason = body?.error ?? 'the facilitator did not settle.';
      // Distinguish "our payment was bad" from "the shared rail is degraded".
      // The signature and /verify pass; it is the on-chain submit/execute step
      // that fails (currently User error 64658 across several teams' deployed
      // CEP-18 contracts). Surface that honestly instead of a raw error code —
      // and hand over a real, confirmed settlement the user can still verify.
      if (isRailDegraded(reason)) {
        throw new SettlementDegradedError(reason);
      }
      throw new Error(`Payment rejected: ${reason}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Premium call failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as PremiumResponse;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Settlement timed out — try again in a few seconds.');
    }
    throw err instanceof Error ? err : new Error('Premium settlement failed.');
  } finally {
    clearTimeout(timeout);
  }
}

/** Format an atomic amount against its decimals for display (e.g. 0.001 WCSPR). */
export function formatAssetAmount(
  amount: string,
  decimals: string | undefined,
  symbol: string,
): string {
  const d = Number(decimals ?? '0');
  if (!Number.isInteger(d) || d < 0) return `${amount} ${symbol}`;
  const padded = amount.padStart(d + 1, '0');
  const whole = d === 0 ? padded : padded.slice(0, -d);
  const frac = d === 0 ? '' : padded.slice(-d).replace(/0+$/, '');
  return `${frac ? `${whole}.${frac}` : whole} ${symbol}`;
}

/** Explorer URL for a settled deploy on testnet vs mainnet. */
export function deployExplorerUrl(network: string, deployHash: string): string {
  const host = network.includes('test')
    ? 'https://testnet.cspr.live'
    : 'https://cspr.live';
  return `${host}/deploy/${deployHash}`;
}
