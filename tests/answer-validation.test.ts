import { describe, expect, it } from "vitest";
import { validateAnswer } from "../api/lib/validateAnswer";

const evidence = [{
  content: "자기부담률은 공식 자료상 20%입니다.",
  source: {
    documentId: "DOC-1",
    title: "공식 안내",
    organization: "공식 기관",
    verifiedAt: "2026-09-24",
    url: "https://example.com",
  },
}];

describe("answer guard", () => {
  it("근거에 있는 숫자와 출처만 허용한다", () => {
    expect(validateAnswer({
      answer: "공식 자료에는 20%로 안내되어 있습니다.",
      keyPoints: [],
      sourceDocumentIds: ["DOC-1"],
      confirmations: [],
    }, evidence)).toBe(true);
  });

  it("근거에 없는 숫자나 가짜 출처를 차단한다", () => {
    expect(validateAnswer({
      answer: "자기부담률은 30%입니다.",
      keyPoints: [],
      sourceDocumentIds: ["FAKE"],
      confirmations: [],
    }, evidence)).toBe(false);
  });
});
