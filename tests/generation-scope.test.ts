import { describe, expect, it } from "vitest";
import { asksAboutOtherGenerations, fiveGenerationCondition } from "../api/_lib/generationScope";

describe("5세대 우선 검색 범위", () => {
  it.each([
    "5세대로 바꾸면 줄어드는 보장이 있나요?",
    "병원 자주 안 가면 5세대로 보험료를 줄일 수 있나요?",
    "유지할지 바꿀지 판단하려면 무엇을 비교해야 하나요?",
  ])("세대를 묻지 않으면 5세대 문서만 검색한다: %s", (question) => {
    expect(asksAboutOtherGenerations(question)).toBe(false);
    expect(fiveGenerationCondition(question)).toEqual({ name: "generation", value: "5" });
  });

  it.each([
    "4세대와 5세대는 무엇이 다른가요?",
    "1~5세대는 뭐가 다른가요?",
    "예전 실손보험이 보장 범위가 더 넓다는데 유리한가요?",
    "내 실손보험이 몇 세대인지 어떻게 알 수 있나요?",
    "실손보험 세대는 가입 시점으로 나뉘나요?",
  ])("세대를 묻는 질문은 필터 없이 전체 문서에서 검색한다: %s", (question) => {
    expect(asksAboutOtherGenerations(question)).toBe(true);
    expect(fiveGenerationCondition(question)).toBeUndefined();
  });
});
