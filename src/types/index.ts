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
};
