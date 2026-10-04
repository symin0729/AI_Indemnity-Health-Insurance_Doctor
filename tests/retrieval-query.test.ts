import { describe, expect, it } from "vitest";
import { buildRetrievalQuery } from "../api/lib/retrievalQuery";

describe("RAGFlow 검색어 보강", () => {
  it("보상·공제·한도를 묻는 질문 뒤에 약관 표의 용어를 덧붙인다", () => {
    expect(buildRetrievalQuery("비급여 통원 공제금액은 얼마인가요?")).toBe(
      "비급여 통원 공제금액은 얼마인가요? 보상금액 공제금액 보상한도",
    );
  });

  it("약칭에는 약관의 공식 용어를 덧붙인다", () => {
    expect(buildRetrievalQuery("MRI 비용도 보상되나요?")).toBe(
      "MRI 비용도 보상되나요? 자기공명영상진단 보상금액 공제금액 보상한도",
    );
  });

  it("이미 공식 용어가 들어 있으면 중복해서 붙이지 않는다", () => {
    expect(buildRetrievalQuery("자기공명영상진단 MRI 보상 한도", { benefitIntentPattern: "없음", benefitSuffix: "", glossary: [{ pattern: "MRI", append: "자기공명영상진단" }] })).toBe(
      "자기공명영상진단 MRI 보상 한도",
    );
  });

  it("보상과 무관한 질문은 원문 그대로 둔다", () => {
    expect(buildRetrievalQuery("보험 계약을 철회하는 방법")).toBe("보험 계약을 철회하는 방법");
  });
});
