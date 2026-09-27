import { describe, expect, it } from "vitest";
import { validateCalculationAnswer } from "../api/lib/validateCalculationAnswer";
import type { LlmAnswer, RetrievedEvidence } from "../api/lib/types";

const evidence: RetrievedEvidence[] = [{
  content: "약관상 해당 계산 기준은 20%입니다.",
  source: {
    documentId: "DOC-1",
    title: "검수 약관",
    organization: "삼성화재",
    verifiedAt: "2026-09-27",
    url: "https://example.com/document",
  },
}];

describe("calculation explanation validation", () => {
  it("계산값과 근거에 있는 숫자만 허용한다", () => {
    const answer: LlmAnswer = {
      answer: "예상 보험금은 80,000원이고 기준은 20%입니다.",
      keyPoints: [],
      sourceDocumentIds: ["DOC-1"],
      confirmations: [],
    };
    expect(validateCalculationAnswer(answer, { insuranceBenefit: 80000 }, evidence)).toBe(true);
    expect(validateCalculationAnswer({ ...answer, answer: "예상 보험금은 90,000원입니다." }, { insuranceBenefit: 80000 }, evidence)).toBe(false);
  });
});
