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
  | "PRIVACY_BLOCKED"
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
  /** OUT 유형별 고정 안내문 번호(OUT-01~05, OUT-DOMAIN). 일반 답변·fallback 에는 없다. */
  noticeId?: string;
}

export interface RetrievedEvidence {
  content: string;
  source: ChatSource;
  /** 근거 문서가 적용되는 세대(예: "5세대", "1세대부터 4세대 비교"). 프롬프트에서 다른 세대 내용이 섞이지 않게 하는 용도이며 화면에는 보내지 않는다 */
  scope?: string;
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
