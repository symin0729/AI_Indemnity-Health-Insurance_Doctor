import { describe, expect, it } from "vitest";
import scope from "../knowledge/question-scope.json";

describe("question scope fixture", () => {
  it("contains IN, OUT, and clarification-required cases", () => {
    const statuses = new Set(scope.questions.map((item) => item.expectedStatus));
    expect(scope.questions.length).toBeGreaterThanOrEqual(18);
    expect(statuses.has("RAG_ALLOWED")).toBe(true);
    expect(statuses.has("RECOMMENDATION_BLOCKED")).toBe(true);
    expect(statuses.has("MEDICAL_ADVICE_BLOCKED")).toBe(true);
    expect(statuses.has("PERSONAL_DATA_BLOCKED")).toBe(true);
    expect(statuses.has("CLARIFICATION_REQUIRED")).toBe(true);
  });
});
