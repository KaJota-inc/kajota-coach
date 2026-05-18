/**
 * Coach Agent v2 — client for `POST /ai/coach/agent/chat`.
 *
 * Where `services/coach.ts` is one-shot (image → drafted listing), this
 * is a multi-turn conversation. Caller passes the previous `sessionId`
 * (or null/undefined on the first turn) and gets back the agent's
 * natural-language reply plus a trace of tool calls.
 *
 * Backend: kajota-mobile-backend / `CoachAgentService.java`.
 */
import { api, apiErrorMessage } from './api';
import type {
  ApiEnvelope,
  CoachAgentChatRequest,
  CoachAgentChatResponse,
} from '@/types';

/**
 * Send one turn to the Coach Agent. Always returns a `CoachAgentChatResponse`
 * on success; throws an Error with a human-friendly message on failure
 * (network, auth, backend 5xx, malformed envelope).
 */
export async function sendAgentChat(
  payload: CoachAgentChatRequest,
): Promise<CoachAgentChatResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<CoachAgentChatResponse>>(
      '/ai/coach/agent/chat',
      payload,
    );
    if (data.responseCode !== '000' || !data.payload) {
      throw new Error(data.message || 'Agent returned no reply.');
    }
    return data.payload;
  } catch (err) {
    throw new Error(apiErrorMessage(err, 'Could not reach the Coach Agent.'));
  }
}
