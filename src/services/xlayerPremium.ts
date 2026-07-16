/**
 * KaJota Coach — XLayer x402 premium client (mobile).
 *
 * EVM-native sibling of `casperPremium.ts`, targeting the OKX.AI Genesis
 * ASP deployment on kajota-hub. Same HTTP-402 protocol, but the signing
 * side is EIP-712 `TransferWithAuthorization` (EIP-3009) over an ERC-20
 * on XLayer mainnet — signed by the Privy embedded wallet already used
 * by MeshSignScreen.
 *
 * Flow (mirrored by XLayerPremiumScreen):
 *
 *   1. requestXLayerPaywall() — POST /coach/premium with no payment. The
 *      hub answers 402 with the EVM price tag (network=eip155:196,
 *      asset=0x…, payTo=0x…, maxAmountRequired).
 *   2. signXLayerAuthorization(requirements, wallet) — builds the EIP-712
 *      typed data for `transferWithAuthorization`, hands it to the Privy
 *      wallet's provider to sign, and returns the base64 `X-PAYMENT`
 *      payload the server + facilitator expect (`{ authorization, signature }`
 *      wrapped in the x402 envelope).
 *   3. payXLayerPremium(xPayment) — retries with the payload. If Coach's
 *      env has a working EVM facilitator wired, the facilitator verifies +
 *      settles on XLayer and returns the premium insight + tx hash. If the
 *      facilitator URL is blank (current default), the server returns 402
 *      "not fully configured" and the UI surfaces the signed authorization
 *      itself as the demo artifact — matching the demo video's Beat 3.
 *
 * Backend: agent/kajota_concierge/server.py POST /coach/premium via hub
 * route /coach-okx.
 */
import Constants from 'expo-constants';

import type { Casper402, ConciergeChatRequest, PremiumResponse } from '@/types';

type ChatIds = Pick<ConciergeChatRequest, 'userId' | 'sessionId'> & {
  message?: string | null;
};

/**
 * Hub-served OKX ASP base URL. Override via `app.json → extra.xlayerCoachBaseUrl`
 * if you deploy Coach somewhere else.
 */
const XLAYER_COACH_BASE_URL: string =
  (
    Constants?.expoConfig?.extra as Record<string, string> | undefined
  )?.xlayerCoachBaseUrl ?? 'https://kajota-hub.onrender.com/coach-okx';

export const PREMIUM_URL = `${XLAYER_COACH_BASE_URL}/coach/premium`;

// XLayer mainnet chain id (matches CAIP-2 eip155:196 the server advertises).
export const XLAYER_CHAIN_ID = 196;

/** Fetched requirements plus a flag if the paywall is unconfigured server-side. */
export interface PaywallResult {
  requirements: Casper402['accepts'][number];
  raw: Casper402;
  /** True when the 402 body's error says the paywall isn't fully configured. */
  unconfigured: boolean;
}

/** The bytes we hand to the wallet for EIP-712 signing. */
export interface XLayerTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    TransferWithAuthorization: Array<{ name: string; type: string }>;
  };
  primaryType: 'TransferWithAuthorization';
  message: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
}

/** Result of signing: the ready-to-broadcast payload + a preview of the tx. */
export interface SignedAuthorization {
  /** base64-encoded x402 payload for the `X-PAYMENT` header. */
  xPayment: string;
  /** The typed message, for on-screen display before submitting. */
  message: XLayerTypedData['message'];
  /** The 65-byte ECDSA signature (r || s || v). */
  signature: string;
  /** The chain the signature is bound to. */
  chainId: number;
}

/**
 * Probe the premium endpoint with no payment. Resolves on 402 with the
 * EVM price tag; throws on anything else (200 would mean the paywall is
 * inadvertently open, which shouldn't happen).
 */
export async function requestXLayerPaywall(
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
      throw new Error('Paywall request timed out — the hub dyno may be cold.');
    }
    throw err instanceof Error ? err : new Error('Could not reach the paywall.');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Build the EIP-712 typed data for `transferWithAuthorization` from the
 * server's 402 requirements + the buyer wallet's address.
 *
 * The verifyingContract is the ERC-20 asset itself (that's what EIP-3009
 * binds to). `nonce` is a random 32-byte hex — one-shot use per payment.
 * `validBefore` mirrors the server's `maxTimeoutSeconds`.
 */
export function buildTypedData(
  requirements: Casper402['accepts'][number],
  fromAddress: string,
): XLayerTypedData {
  const now = Math.floor(Date.now() / 1000);
  const validBefore = now + Number(requirements.maxTimeoutSeconds || 60);
  // 32-byte random hex — replay-safe.
  const nonceBytes = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join('');

  return {
    domain: {
      name: requirements.extra?.name ?? 'Tether USD',
      version: requirements.extra?.version ?? '1',
      chainId: XLAYER_CHAIN_ID,
      verifyingContract: requirements.asset,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: fromAddress,
      to: requirements.payTo,
      value: requirements.maxAmountRequired ?? (requirements as any).amount,
      validAfter: '0',
      validBefore: String(validBefore),
      nonce: `0x${nonceBytes}`,
    },
  };
}

/**
 * Sign the typed data with a Privy embedded EVM wallet and package it as
 * the base64 `X-PAYMENT` header the x402 server expects. `signer` is the
 * function returned by `provider.request({ method: 'eth_signTypedData_v4' })`
 * (see MeshSignScreen for the shape) — we keep the wallet-side dep at the
 * boundary so this service stays wallet-provider agnostic.
 */
export async function signXLayerAuthorization(
  requirements: Casper402['accepts'][number],
  fromAddress: string,
  signTypedData: (params: [string, string]) => Promise<string>,
): Promise<SignedAuthorization> {
  const typed = buildTypedData(requirements, fromAddress);
  const signature = await signTypedData([fromAddress, JSON.stringify(typed)]);
  const payload = {
    x402Version: 1,
    accepted: { scheme: 'exact', network: requirements.network },
    payload: { authorization: typed.message, signature },
  };
  const xPayment = base64EncodeUtf8(JSON.stringify(payload));
  return {
    xPayment,
    message: typed.message,
    signature,
    chainId: XLAYER_CHAIN_ID,
  };
}

/**
 * Complete the paid call. On success the facilitator has settled on XLayer
 * and the server returns the insight + tx hash. A 402 here means the
 * payment was rejected — most commonly because the server's facilitator
 * URL is blank (see `PaywallResult.unconfigured`) — the UI should fall
 * back to showing the signed authorization as the demo artifact.
 */
export async function payXLayerPremium(
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
      throw new Error(
        `Payment rejected: ${body?.error ?? 'the facilitator did not settle.'}`,
      );
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

/** Format an atomic amount against its decimals for display (e.g. 0.01 USDT). */
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

/** OKLink XLayer explorer URL for an EVM tx hash. */
export function txExplorerUrl(txHash: string): string {
  return `https://www.oklink.com/x-layer/tx/${txHash}`;
}

/** Short-hex an address or hash for compact card display. */
export function shortHex(hex: string, head = 6, tail = 4): string {
  if (!hex.startsWith('0x') || hex.length <= head + tail + 2) return hex;
  return `${hex.slice(0, head + 2)}…${hex.slice(-tail)}`;
}

/**
 * base64-encode a UTF-8 string. React Native's Buffer isn't a builtin, so
 * we use the (limited but sufficient) btoa polyfill path via encoding the
 * string as binary via `encodeURIComponent` → `unescape` — safe for JSON.
 */
function base64EncodeUtf8(input: string): string {
  // React Native ships btoa via `react-native-quick-base64` in Expo SDK 51+
  // and Hermes exposes globalThis.btoa. Fall back to a manual encoder.
  const g = globalThis as unknown as { btoa?: (s: string) => string };
  if (typeof g.btoa === 'function') {
    // btoa expects binary — use encodeURIComponent to promote UTF-8.
    return g.btoa(unescape(encodeURIComponent(input)));
  }
  // Minimal fallback — unlikely path in Expo but keeps the file self-contained.
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return g.btoa!(binary);
}
