/**
 * Shapes mirror the Kajota backend DTOs 1:1 — see CoachDto.java in
 * kajota-mobile-backend.
 */

export interface CoachDraftRequest {
  imageBase64: string;
  currency?: string;
  maxCosellPercentage?: number;
  locale?: 'en' | 'yo' | 'ig' | 'ha';
  includeSocial?: boolean;
}

export interface CoachReferenceProduct {
  productId: string;
  productName: string;
  price: number;
  currency: string;
}

export interface CoachSocialDraft {
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export interface CoachDraft {
  title: string;
  description: string;
  translatedDescription?: string | null;
  locale: string;
  categoryId?: string | null;
  categoryName: string;
  suggestedPrice: number;
  currency: string;
  suggestedCosellPercentage?: number | null;
  cosellReasoning?: string | null;
  whatsapp?: CoachSocialDraft | null;
  instagram?: CoachSocialDraft | null;
  visionLabels: string[];
  referenceProducts: CoachReferenceProduct[];
}

export interface CoachDraftPayload {
  draft: CoachDraft;
  providersUsed: string[];
  pipelineTrace: string[];
}

export interface ApiEnvelope<T> {
  responseCode: string;
  message: string;
  payload: T;
}

export interface AuthUser {
  id: string;
  emailAddress: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  token: string;
  refreshToken?: string;
}

export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  CoachCapture: undefined;
  CoachReview: {
    draft: CoachDraft;
    providersUsed: string[];
    pipelineTrace: string[];
    imageUri: string;
  };
  CoachAgentChat: undefined;
  MeshSign: {
    /** Output of the agent's proposeListingForPublish tool. */
    proposal: ProposeListingForPublishResult;
  };
};

/* ------------------------------------------------------------------ */
/*  Mesh — on-chain co-sell settlement (kajota-mesh repo)             */
/* ------------------------------------------------------------------ */

/**
 * Shape of the JSON returned by the Coach Agent's
 * `proposeListingForPublish` tool. Mirrors the backend's
 * `CoachAgentService.toolProposeListingForPublish`.
 */
export interface ProposeListingForPublishResult {
  ok: boolean;
  listingId: string;
  productId: string;
  wholesalerAddress: string;
  cosellerAddress: string;
  commissionBps: number;
  currency: string;
  chain: string;
  contract: string;
  method: string;
  nextStep: string;
}

/* ------------------------------------------------------------------ */
/*  Coach Agent v2 — multi-turn chat                                  */
/*  Mirrors CoachAgentDto.java in kajota-mobile-backend.              */
/* ------------------------------------------------------------------ */

export interface CoachAgentToolInvocation {
  name: string;
  args: string;
  result: string;
  latencyMs: number;
}

export interface CoachAgentChatRequest {
  sessionId?: string | null;
  userMessage: string;
  imageBase64?: string;
  currency?: string;
  locale?: 'en' | 'yo' | 'ig' | 'ha';
}

export interface CoachAgentChatResponse {
  sessionId: string;
  reply: string;
  toolsCalled: CoachAgentToolInvocation[];
  draft?: CoachDraft | null;
  finished: boolean;
}

/** Local-only chat-bubble shape used by the mobile screen. */
export interface CoachAgentLocalMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  /** Local file URI for the image attached to a user turn, if any. */
  imageUri?: string;
  /** Tools the agent invoked while producing this reply (agent role only). */
  toolsCalled?: CoachAgentToolInvocation[];
  /** Epoch ms — for "sent at" displays. */
  timestamp: number;
  /** True while the agent's reply is being awaited from the backend. */
  pending?: boolean;
  /** Error message if this turn failed. */
  error?: string;
}
