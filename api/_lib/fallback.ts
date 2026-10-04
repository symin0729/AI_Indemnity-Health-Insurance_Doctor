import type { ChatResponse, ChatStatus } from "./types.js";

const messages: Record<Exclude<ChatStatus, "ANSWERED" | "PRIVACY_BLOCKED">, string> = {
  INSUFFICIENT_EVIDENCE:
    "등록된 공식 자료에서 충분한 근거를 찾지 못했습니다. 약관 또는 보험사 고객센터에서 정확한 내용을 확인해주세요.",
  OUT_OF_SCOPE:
    "실손보험이나 5세대 전환에 관한 질문을 입력해 주세요. 예: 5세대로 바꾸면 줄어드는 보장이 있나요?",
  FALLBACK:
    "현재 공식 자료를 확인하기 어렵습니다. 잠시 후 다시 시도하거나 보험사에 직접 확인해주세요.",
};

export const fallback = (
  status: Exclude<ChatStatus, "ANSWERED" | "PRIVACY_BLOCKED">,
  requestId: string,
): ChatResponse => ({
  answer: messages[status],
  keyPoints: [],
  sources: [],
  confirmations: ["가입 중인 계약의 정확한 내용은 해당 보험사에 확인해주세요."],
  status,
  fallback: true,
  requestId,
});

/**
 * 답변할 수 없는 질문 유형별 고정 안내문(팀 확정, docs 19 종합문서 2.3절).
 * RAG 검색과 LLM 답변 생성을 하지 않고 이 문구만 보여 준다.
 */
export const OUT_NOTICES = {
  "OUT-01":
    "특정 보험이나 세대를 직접 추천해 드릴 수 없습니다. 대신 현재 보험료, 보험금 수령 내역, 기존 보장 범위, 향후 의료이용 계획과 비급여 이용 가능성 등 전환 전에 비교해야 할 항목을 안내해 드릴 수 있습니다.",
  "OUT-02":
    "실제 보험금은 가입한 상품의 약관, 특약, 진료서류와 보험사의 심사를 거쳐 결정됩니다. 앱에 표시된 금액은 입력 조건에 따른 예상 결과이므로 정확한 지급액은 가입한 보험사에 확인해 주세요.",
  "OUT-03":
    "보험금을 받기 위한 치료 방법을 추천할 수 없습니다. 치료는 건강 상태와 의료적 필요에 따라 의료전문가와 상담하여 결정해야 합니다. 치료 후 보험 적용 여부는 진료서류와 가입 약관을 기준으로 보험사에 확인해 주세요.",
  "OUT-04":
    "보험사의 지급심사 결과가 정당한지 챗봇이 판단할 수 없습니다. 지급 거절 사유, 가입 약관, 진료서류와 심사자료를 확인한 후 해당 보험사에 재심사를 요청하거나 금융감독원 등 공식 민원·분쟁조정 절차를 이용해 주세요.",
  "OUT-05":
    "개인정보와 계약정보는 입력하지 마세요. AI 실손 닥터는 개인 보험계약을 조회할 수 없습니다. 이름, 주민등록번호, 전화번호, 주소와 증권번호 등을 제거한 뒤 일반적인 질문으로 다시 작성해 주세요.",
  "OUT-DOMAIN":
    "실손보험이나 5세대 전환에 관한 질문을 입력해 주세요. 예: 5세대로 바꾸면 줄어드는 보장이 있나요?",
} as const;

export type OutNoticeId = keyof typeof OUT_NOTICES;

/** 개인정보 질문은 PRIVACY_BLOCKED, 나머지 OUT 유형은 OUT_OF_SCOPE 로 표시한다. */
export const outNotice = (noticeId: OutNoticeId, requestId: string): ChatResponse => ({
  answer: OUT_NOTICES[noticeId],
  keyPoints: [],
  sources: [],
  confirmations: [],
  status: noticeId === "OUT-05" ? "PRIVACY_BLOCKED" : "OUT_OF_SCOPE",
  fallback: true,
  requestId,
  noticeId,
});
