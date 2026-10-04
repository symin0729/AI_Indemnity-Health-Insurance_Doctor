import { describe, expect, it } from "vitest";
import golden from "../evals/golden-questions.json";

type GoldenQuestion = {
  questionId: string;
  question: string;
  expectedRoute: "IN" | "OUT" | "PRIVACY" | "OUT_OF_DOMAIN";
  expectedId: string;
  expectedPages: string[];
  split: "dev" | "final";
  origin: string;
  note: string;
  boundaryNo?: number;
};

const questions = golden.questions as GoldenQuestion[];
const IN_IDS = Array.from({ length: 15 }, (_, index) => `IN-${String(index + 1).padStart(2, "0")}`);
const OUT_IDS = ["OUT-01", "OUT-02", "OUT-03", "OUT-04"];
const PAGE_PATTERN = /^[A-Z0-9-]+( p\.\d+)?$/;

describe("골든셋 형식", () => {
  it("필수 칸과 허용값이 맞다", () => {
    for (const item of questions) {
      expect(item.questionId).toMatch(/^GQ-\d{3}$/);
      expect(item.question.trim().length).toBeGreaterThan(3);
      expect(golden.routes).toContain(item.expectedRoute);
      expect(["dev", "final"]).toContain(item.split);
    }
  });

  it("질문 ID와 질문 문장이 중복되지 않는다", () => {
    expect(new Set(questions.map((item) => item.questionId)).size).toBe(questions.length);
    expect(new Set(questions.map((item) => item.question)).size).toBe(questions.length);
  });

  it("final 이 전체의 30~45% 이다", () => {
    const ratio = questions.filter((item) => item.split === "final").length / questions.length;
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.45);
  });
});

describe("골든셋 구성", () => {
  it("IN-01~15 가 각각 3문항 이상이고 dev·final 이 모두 있다", () => {
    for (const id of IN_IDS) {
      const group = questions.filter((item) => item.expectedId === id);
      expect(group.length, id).toBeGreaterThanOrEqual(3);
      expect(group.some((item) => item.split === "dev"), `${id} dev`).toBe(true);
      expect(group.some((item) => item.split === "final"), `${id} final`).toBe(true);
    }
  });

  it("OUT-01~04 가 각각 3문항 이상이고 개인정보·범위 밖 유형이 있다", () => {
    for (const id of OUT_IDS) {
      expect(questions.filter((item) => item.expectedId === id).length, id).toBeGreaterThanOrEqual(3);
    }
    expect(questions.filter((item) => item.expectedRoute === "PRIVACY").length).toBeGreaterThanOrEqual(3);
    expect(questions.filter((item) => item.expectedRoute === "OUT_OF_DOMAIN").length).toBeGreaterThanOrEqual(3);
  });

  it("IN 질문은 정답 근거 쪽이 있고, OUT·개인정보·범위 밖은 없다", () => {
    for (const item of questions) {
      if (item.expectedRoute === "IN" && item.expectedId !== "IN-UNCOVERED") {
        expect(item.expectedPages.length, item.questionId).toBeGreaterThan(0);
        for (const page of item.expectedPages) expect(page, item.questionId).toMatch(PAGE_PATTERN);
      } else {
        expect(item.expectedPages, item.questionId).toEqual([]);
      }
    }
  });

  it("경계 사례 1~20 이 모두 있다", () => {
    const numbers = questions
      .filter((item) => item.boundaryNo !== undefined)
      .map((item) => item.boundaryNo as number)
      .sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  });

  it("IN-01 과 OUT-01 경계 승인 사례가 OUT-01 로 기록돼 있다", () => {
    const approved = questions.find(
      (item) => item.question === "유지하는 게 좋을까요, 5세대로 바꾸는 게 좋을까요?",
    );
    expect(approved?.expectedId).toBe("OUT-01");
    const criteria = questions.find((item) => item.question === "유지할지 바꿀지 판단하려면 무엇을 비교해야 하나요?");
    expect(criteria?.expectedId).toBe("IN-01");
  });

  it("서비스 질문은 근거 없음(IN-UNCOVERED)으로 기록돼 있다", () => {
    const uncovered = questions.filter((item) => item.expectedId === "IN-UNCOVERED");
    expect(uncovered.length).toBeGreaterThanOrEqual(3);
  });
});
