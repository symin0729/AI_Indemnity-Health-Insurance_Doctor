import { chatResponseSchema } from "../features/chatbot/chatbot.schema";

export interface ExplanationRequest {
  productCode: string;
  generation: number;
  calculation: Record<string, unknown>;
  consentGranted: boolean;
  consentPolicyVersion: string;
}

export const explanationApiService = {
  async explain(input: ExplanationRequest, signal?: AbortSignal) {
    const response = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new Error("계산 설명을 생성하지 못했습니다.");
    return chatResponseSchema.parse(await response.json());
  },
};
