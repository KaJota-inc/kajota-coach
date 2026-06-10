/**
 * KaJota Concierge — client for the standalone shopping-agent service.
 *
 * Unlike `coachAgent.ts`, this does NOT go through the Java backend.
 * The Concierge agent is a separate FastAPI service (Gemini on Google
 * ADK + MongoDB MCP) deployed on Render. The mobile app talks to it
 * directly so the Rapid Agent hackathon submission can demo the full
 * Gemini + ADK + MCP stack end-to-end inside the app.
 *
 *   Default base URL: https://kajota-concierge-agent.onrender.com
 *   Override via app.json → `extra.conciergeAgentBaseUrl`
 *
 * Backend: kajota-coach/agent/kajota_concierge/server.py
 */
import Constants from 'expo-constants';

import type {
  ConciergeChatRequest,
  ConciergeChatResponse,
  ConciergeEvent,
  ConciergeProductCard,
  ConciergeToolInvocation,
} from '@/types';

const fromConfig = (
  Constants?.expoConfig?.extra as Record<string, string> | undefined
)?.conciergeAgentBaseUrl;

export const CONCIERGE_AGENT_BASE_URL =
  fromConfig ?? 'https://kajota-concierge-agent.onrender.com';

/**
 * Fire-and-forget GET on `/healthz` to spin Render's free-tier dyno
 * back up before the user fires their first chat turn. Resolves to
 * void either way — the caller doesn't need to wait or handle errors,
 * the warmup is opportunistic. Call this from ConciergeScreen's mount
 * effect.
 */
export function warmupConciergeAgent(): void {
  fetch(`${CONCIERGE_AGENT_BASE_URL}/healthz`, { method: 'GET' }).catch(
    () => {
      // Swallow — we don't surface warmup failures to the user; the
      // real chat call will surface them with a useful error message.
    },
  );
}

/**
 * Single chat turn. Server keeps an in-memory ADK session per
 * `(userId, sessionId)` pair — pass back the previous `sessionId` to
 * continue the conversation, or omit it to start a new one.
 *
 * Throws on network / non-2xx with a human-friendly message.
 */
export async function sendConciergeChat(
  payload: ConciergeChatRequest,
): Promise<ConciergeChatResponse> {
  // 120s ceiling — Render's free-tier cold start can take 60-80s for
  // a fresh dyno, and a first-turn Gemini + MongoDB MCP roundtrip
  // adds another 20-40s on top. ConciergeScreen calls warmup() on
  // mount to make this case rare in practice.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(`${CONCIERGE_AGENT_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message,
        userId: payload.userId ?? 'demo-user-1',
        sessionId: payload.sessionId ?? null,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Concierge agent error (${res.status}): ${text || res.statusText}`,
      );
    }

    return (await res.json()) as ConciergeChatResponse;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Concierge agent timed out. The free-tier dyno is cold — try again in 10s.',
      );
    }
    throw err instanceof Error
      ? err
      : new Error('Could not reach the Concierge agent.');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Flatten the ADK event trace into a tool-invocation list for the
 * "Used N tools" UI. Pairs each `tool_call` with its subsequent
 * matching `tool_response` so the trace shows args + a result preview
 * side-by-side. The order in `events` is causal, so a simple
 * latest-unmatched-by-name pass is enough.
 */
export function eventsToToolTrace(
  events: ConciergeEvent[],
): ConciergeToolInvocation[] {
  const invocations: ConciergeToolInvocation[] = [];
  for (const ev of events ?? []) {
    for (const part of ev.parts ?? []) {
      if (part.tool_call) {
        invocations.push({
          name: part.tool_call.name,
          args: safeStringify(part.tool_call.args),
        });
      } else if (part.tool_response) {
        for (let i = invocations.length - 1; i >= 0; i--) {
          const inv = invocations[i]!;
          if (inv.name === part.tool_response.name && inv.preview === undefined) {
            inv.preview = part.tool_response.preview;
            break;
          }
        }
      }
    }
  }
  return invocations;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/**
 * Strip a trailing `[CARDS] ... [/CARDS]` block off the agent's reply
 * and parse its JSON payload into a list of structured product cards.
 * The agent's system prompt instructs it to emit this block on any
 * turn that references concrete products / orders / wishlist items
 * (see `agent/kajota_concierge/agent.py`).
 *
 * Returns the cleaned text + parsed cards. If the block is missing or
 * malformed, returns the original text + an empty array — the chat
 * still renders, just without the card carousel.
 */
const CARDS_RE = /\[CARDS\]([\s\S]*?)\[\/CARDS\]/;

export function extractCards(rawText: string): {
  text: string;
  cards: ConciergeProductCard[];
} {
  const match = rawText.match(CARDS_RE);
  if (!match) return { text: rawText.trim(), cards: [] };

  const cleanText = rawText.replace(CARDS_RE, '').trim();

  try {
    const parsed = JSON.parse(match[1]!.trim());
    if (!Array.isArray(parsed)) return { text: cleanText, cards: [] };
    const cards = parsed
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c): ConciergeProductCard => ({
        title: stringField(c, 'title'),
        subtitle: stringField(c, 'subtitle'),
        price: stringField(c, 'price'),
        footer: stringField(c, 'footer'),
      }))
      .filter(c => c.title.length > 0);
    return { text: cleanText, cards };
  } catch {
    return { text: cleanText, cards: [] };
  }
}

function stringField(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : '';
}
