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
  ConciergeToolInvocation,
} from '@/types';

const fromConfig = (
  Constants?.expoConfig?.extra as Record<string, string> | undefined
)?.conciergeAgentBaseUrl;

export const CONCIERGE_AGENT_BASE_URL =
  fromConfig ?? 'https://kajota-concierge-agent.onrender.com';

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
  // The Render free tier cold-starts in ~10s and Gemini turns with
  // MCP tool calls regularly run 15-25s. Give a generous timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

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
        'Concierge agent timed out. Cold start can take ~15s — try again.',
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
