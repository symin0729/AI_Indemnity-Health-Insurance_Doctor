import { describe, expect, it } from "vitest";
import { withRetrievalGlossary } from "../api/_lib/retrievalGlossary";

describe("검색어 용어 풀이", () => {
  it("일상 표현에 해당하는 문서 용어를 뒤에 붙인다", () => {
    expect(withRetrievalGlossary("5세대는 보험료가 얼마나 싼가요?")).toBe("5세대는 보험료가 얼마나 싼가요? 저렴 인하");
    expect(withRetrievalGlossary("전환하고 후회하면 복귀할 수 있나요?")).toBe("전환하고 후회하면 복귀할 수 있나요? 철회 이전 계약");
  });

  it("해당 표현이 없으면 질문을 그대로 둔다", () => {
    expect(withRetrievalGlossary("특약1과 특약2를 선택해서 가입할 수 있나요?")).toBe("특약1과 특약2를 선택해서 가입할 수 있나요?");
  });
});
