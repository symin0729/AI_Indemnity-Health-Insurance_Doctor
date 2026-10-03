export const CONSENT_POLICY_VERSION = "ai-chat-1.0";

export type ChatScreen = "START" | "INPUT" | "CONFIRM" | "RESULT";

export interface ChatRequest {
  question: string;
  mode: "GENERAL";
  consentGranted: boolean;
  consentPolicyVersion: string;
  context?: {
    screen: ChatScreen;
    productCode?: string;
    generation?: number;
    coverageCode?: string;
  };
}

export type ChatStatus =
  | "ANSWERED"
  | "INSUFFICIENT_EVIDENCE"
  | "OUT_OF_SCOPE"
  | "FALLBACK";

export interface ChatSource {
  documentId: string;
  title: string;
  organization: string;
  section?: string;
  publishedAt?: string;
  verifiedAt: string;
  url: string;
}

export interface ChatResponse {
  answer: string;
  keyPoints: string[];
  sources: ChatSource[];
  confirmations: string[];
  status: ChatStatus;
  fallback: boolean;
  requestId: string;
}

export interface RetrievedEvidence {
  content: string;
  source: ChatSource;
}

export interface LlmAnswer {
  answer: string;
  keyPoints: string[];
  sourceDocumentIds: string[];
  confirmations: string[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
  requestId: string;
}
