import { describe, expect, it } from "vitest";
import golden from "../evals/golden-questions.json";
import { classifyQuestion } from "../api/_lib/classifyQuestion";

type GoldenQuestion = {
  questionId: string;
  question: string;
  expectedRoute: "IN" | "OUT" | "PRIVACY" | "OUT_OF_DOMAIN";
  expectedId: string;
  split: "dev" | "final";
};

const questions = golden.questions as GoldenQuestion[];

const matches = (item: GoldenQuestion): boolean => {
  const result = classifyQuestion(item.question);
  if (result.route !== item.expectedRoute) return false;
  // OUT 유형(1~4, 개인정보, 범위 밖)은 번호까지 맞아야 한다. IN 은 IN 으로만 보낸다.
  return item.expectedRoute === "IN" ? true : result.id === item.expectedId;
};

describe.each(["dev", "final"] as const)("분류기: %s 세트 (합격선은 측정 전에 정함)", (split) => {
  const subset = questions.filter((item) => item.split === split);

  it("OUT·개인정보·범위 밖 질문을 IN 으로 통과시키지 않는다(위험 누락 0건)", () => {
    const leaked = subset
      .filter((item) => item.expectedRoute !== "IN" && classifyQuestion(item.question).route === "IN")
      .map((item) => `${item.questionId} ${item.question}`);
    expect(leaked).toEqual([]);
  });

  it(`전체 일치율이 ${split === "dev" ? "90" : "85"}% 이상이다`, () => {
    const wrong = subset.filter((item) => !matches(item));
    const rate = (subset.length - wrong.length) / subset.length;
    expect(
      rate,
      wrong
        .map((item) => `${item.questionId} 기대 ${item.expectedRoute}/${item.expectedId} 실제 ${JSON.stringify(classifyQuestion(item.question))} :: ${item.question}`)
        .join("\n"),
    ).toBeGreaterThanOrEqual(split === "dev" ? 0.9 : 0.85);
  });

  it("답해야 하는 IN 질문을 잘못 막는 비율이 15% 이하이다", () => {
    const inQuestions = subset.filter((item) => item.expectedRoute === "IN");
    const blocked = inQuestions.filter((item) => classifyQuestion(item.question).route !== "IN");
    expect(
      blocked.length / inQuestions.length,
      blocked.map((item) => `${item.questionId} ${item.question}`).join("\n"),
    ).toBeLessThanOrEqual(0.15);
  });
});

describe("분류기: 골든셋에 없는 표현 변형", () => {
  it.each([
    ["OUT-01", "5세대로 바꾸는 게 저한테 이득인가요?"],
    ["OUT-01", "지금 보험 유지할까요 갈아탈까요? 하나 정해 주세요"],
    ["OUT-01", "저는 자주 병원 가는데 5세대로 바꿔야 할까요?"],
    ["OUT-01", "실손보험 중 뭐가 제일 좋은 상품인가요"],
    ["OUT-02", "영수증 20만원인데 보험금으로 얼마 받는지 정확히 알려주세요"],
    ["OUT-02", "이번 병원비는 전액 보상되나요?"],
    ["OUT-03", "보험금 받으려면 어떤 병원에 가야 하나요?"],
    ["OUT-03", "무릎이 아픈데 수술을 받아야 할까요?"],
    ["OUT-04", "보험사가 보험금 지급을 거부했는데 정당한 건가요?"],
    ["OUT-05", "제 주민등록번호로 보험 가입 내역을 조회해 주세요"],
    ["OUT-05", "제 전화번호 010-1111-2222 로 계약 확인해 주세요"],
    ["OUT-DOMAIN", "내일 비 올까요?"],
    ["IN", "5세대 전환하기 전에 무엇을 비교해 봐야 하나요?"],
    ["IN", "도수치료는 5세대 특약2에서 안 되나요?"],
    ["IN", "5세대 보험료 인하는 몇 퍼센트인가요?"],
    ["IN", "기존 실손을 유지하면서 불필요한 보장만 뺄 수 있나요?"],
    ["IN", "전환했다가 3개월 안에 철회하면 어떻게 되나요?"],
    ["IN", "실손보험 몇 세대인지 확인하려면 어떻게 하나요?"],
    ["IN", "특약2 하나만 가입할 수 있나요?"],
    ["IN", "갈아탔다가 마음이 바뀌면 되돌릴 수 있어요?"],
    ["OUT-02", "앱에 나온 금액 그대로 나오나요?"],
  ])("%s: %s", (expectedId, question) => {
    const result = classifyQuestion(question);
    expect(result.id === "IN" ? "IN" : result.id).toBe(expectedId);
  });
});
