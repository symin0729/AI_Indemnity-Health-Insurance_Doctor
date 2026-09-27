import type { ChatResponse, ChatStatus } from "./types";

const messages: Record<Exclude<ChatStatus, "ANSWERED">, string> = {
  INSUFFICIENT_EVIDENCE:
    "등록된 공식 자료에서 충분한 근거를 찾지 못했습니다. 약관 또는 보험사 고객센터에서 정확한 내용을 확인해주세요.",
  OUT_OF_SCOPE:
    "보험 이해 도우미는 실손보험의 일반 제도와 용어만 설명합니다. 개인 보험금 계산, 의료 조언, 상품 추천은 답변하지 않습니다.",
  FALLBACK:
    "현재 공식 자료를 확인하기 어렵습니다. 잠시 후 다시 시도하거나 보험사에 직접 확인해주세요.",
};

export const fallback = (
  status: Exclude<ChatStatus, "ANSWERED">,
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
