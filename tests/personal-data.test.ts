import { describe, expect, it } from "vitest";
import { redactPersonalData } from "../api/lib/redactPersonalData";

describe("외부 AI 전송 금지 정보", () => {
  it.each([
    ["이름", "이름은 홍길동이고 실손보험이 궁금해요"],
    ["주민등록번호", "주민번호는 900101-1234567이고 실손보험 질문이 있어요"],
    ["전화번호", "010-1234-5678로 보험 안내를 보내주세요"],
    ["이메일", "test@example.com으로 보험 답변을 보내주세요"],
    ["주소", "주소는 서울시 강남구 테헤란로 123이고 보험 질문이 있어요"],
    ["보험증권 번호", "보험증권 번호 AB-123456의 자기부담금은 얼마인가요?"],
    ["보험회사 고객번호", "보험사 고객번호 CUST-12345로 계약을 확인해 주세요"],
    ["개인 계약 상세정보", "제 보험 가입일과 현재 세대를 확인해 주세요"],
    ["개인 치료내역", "제가 받은 치료 내역으로 보험금을 알려주세요"],
    ["진단명과 개인 식별정보", "제 진단명은 당뇨병입니다"],
    ["개인 보험료", "제 보험료는 120,000원입니다"],
    ["개인 보험금 계산 결과", "제 예상 보험금은 300,000원입니다"],
    ["개인 총부담 계산 결과", "제 총부담은 500,000원입니다"],
    ["개인 손익분기 계산 결과", "제 손익분기점은 3년입니다"],
    ["전체 계산 JSON", '{"calculationResult":{"totalBurden":500000}}'],
    ["Rule Engine 입력값", '{"contract":{"generation":1},"usages":[]}'],
  ])("%s를 탐지한다", (label, question) => {
    const result = redactPersonalData(question);
    expect(result.detected).toContain(label);
    expect(result.value).not.toBe(question);
  });

  it.each([
    "보험료는 어떤 원리로 정해지나요?",
    "보험금과 자기부담금은 어떻게 다른가요?",
    "손익분기점은 어떤 의미인가요?",
    "실손보험 세대별 차이를 알려주세요",
  ])("일반 보험 질문은 차단하지 않는다: %s", (question) => {
    expect(redactPersonalData(question)).toEqual({ value: question, detected: [] });
  });
});
