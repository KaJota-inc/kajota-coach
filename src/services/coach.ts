/**
 * Coach orchestrator client — calls POST /ai/coach/draft on the
 * Kajota backend. See CoachOrchestrator.java in kajota-mobile-backend
 * for the chained pipeline that runs server-side.
 */
import { api } from './api';
import type {
  ApiEnvelope,
  CoachDraftPayload,
  CoachDraftRequest,
} from '@/types';

export async function draftListing(req: CoachDraftRequest): Promise<CoachDraftPayload> {
  const { data } = await api.post<ApiEnvelope<CoachDraftPayload>>('/ai/coach/draft', req);
  if (data.responseCode !== '000' || !data.payload?.draft) {
    throw new Error(data.message || 'Coach returned no draft');
  }
  return data.payload;
}
