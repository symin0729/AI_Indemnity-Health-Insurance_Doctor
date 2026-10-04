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

  it("근거 숫자의 일부 문자열을 다른 수치로 사용하는 답변을 차단한다", () => {
    expect(validateAnswer({
      answer: "자기부담률은 2%입니다.",
      keyPoints: [],
      sourceDocumentIds: ["DOC-1"],
      confirmations: [],
    }, evidence)).toBe(false);
  });

  it("목록 번호와 문장 끝 마침표는 근거 숫자로 보지 않는다", () => {
    expect(validateAnswer({
      answer: "안내입니다.\n\n**1. 비교 항목:** 자기부담률은 20%입니다.\n2. 확인: 공식 자료 기준 20%.",
      keyPoints: [],
      sourceDocumentIds: ["DOC-1"],
      confirmations: [],
    }, evidence)).toBe(true);
  });

  it("어느 쪽이 더 좋다는 결론이나 행동 권유 표현을 차단한다", () => {
    for (const answer of ["기존 보험을 유지하는 것이 유리합니다.", "5세대가 더 좋은 상품입니다.", "전환하는 것이 좋습니다. 하는 것이 좋습니다."]) {
      expect(validateAnswer({ answer, keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence)).toBe(false);
    }
  });

  it("우열을 말할 수 없다는 부정 문장은 허용하고 우열 단정은 차단한다", () => {
    const ok = "어느 쪽이 더 낫다고 말씀드릴 수는 없습니다. 공식 자료는 20%로 안내합니다.";
    expect(validateAnswer({ answer: ok, keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence)).toBe(true);
    const bad = "5세대가 더 낫습니다. 공식 자료는 20%로 안내합니다.";
    expect(validateAnswer({ answer: bad, keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence)).toBe(false);
  });

  it("질문에 쓴 숫자와 줄임 연도(’26 → 2026)는 근거 숫자로 인정한다", () => {
    const withYear = [{ ...evidence[0], content: "’26년 11월 시행 예정이며 자기부담률은 20%입니다." }];
    expect(validateAnswer({ answer: "2026년 11월 시행 예정이고 20%입니다.", keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, withYear)).toBe(true);
    expect(validateAnswer({ answer: "2019년에 가입하셨다면 공식 자료 기준 20%입니다.", keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence, "2019년에 가입했는데 몇 세대인가요?")).toBe(true);
    expect(validateAnswer({ answer: "2019년에 가입하셨다면 20%입니다.", keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence)).toBe(false);
  });

  it("연월 표기(’26.11, 2026.11)는 연도와 월로 나눠 비교한다", () => {
    const dated = [{ ...evidence[0], content: "선택형 할인 특약은 ’26.11월 시행 예정이며 자기부담률은 20%입니다." }];
    expect(validateAnswer({ answer: "2026년 11월 시행 예정이고 20%입니다.", keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, dated)).toBe(true);
    expect(validateAnswer({ answer: "2027년 11월 시행 예정이고 20%입니다.", keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, dated)).toBe(false);
  });

  it("'반드시 확인해야 합니다'는 허용하고 '반드시 지급됩니다'는 차단한다", () => {
    const ok = "보장 여부를 반드시 확인해야 합니다. 공식 자료는 20%로 안내합니다.";
    expect(validateAnswer({ answer: ok, keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence)).toBe(true);
    const bad = "해당 치료는 반드시 보장됩니다. 20%입니다.";
    expect(validateAnswer({ answer: bad, keyPoints: [], sourceDocumentIds: ["DOC-1"], confirmations: [] }, evidence)).toBe(false);
  });
});
