import fallbackAnswers from "../data/fallback-answers.json";
import type { ChatResponse } from "../features/chatbot/chatbot.schema";

type FallbackStatus = "INSUFFICIENT_EVIDENCE" | "OUT_OF_SCOPE" | "FALLBACK";

export const fallbackExplanationService = {
  create(status: FallbackStatus): Omit<ChatResponse, "requestId"> {
    return {
      answer: fallbackAnswers[status],
      keyPoints: [],
      sources: [],
      confirmations: ["가입 중인 계약의 정확한 내용은 해당 보험사에 확인해주세요."],
      status,
      fallback: true,
    };
  },
};
