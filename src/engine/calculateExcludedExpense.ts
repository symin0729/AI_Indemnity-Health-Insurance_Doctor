import type {
  BenefitClass,
} from "../domain/medical";

import type {
  InsuranceGeneration,
} from "../domain/insurance";

export type ExcludedExpenseStatus =
  | "NONE"
  | "EXCLUDED"
  | "UNKNOWN";

export interface ExcludedExpenseResult {
  amount: number | null;
  status: ExcludedExpenseStatus;
  ruleId: string | null;
  reason: string;
}

interface CalculateExcludedExpenseParams {
  treatmentCost: number;
  generation: InsuranceGeneration;
  benefitClass: BenefitClass;
  coverages: string[];

  // 자기부담 계산 룰이 실제로 적용됐는지
  hasSupportedSelfPaymentRule: boolean;
}

export function calculateExcludedExpense({
  treatmentCost,
  generation,
  benefitClass,
  coverages,
  hasSupportedSelfPaymentRule,
}: CalculateExcludedExpenseParams): ExcludedExpenseResult {
  if (
    !Number.isFinite(treatmentCost) ||
    treatmentCost < 0
  ) {
    return {
      amount: null,
      status: "UNKNOWN",
      ruleId: null,
      reason:
        "치료비를 확인할 수 없어 보장 제외 금액을 계산할 수 없습니다.",
    };
  }

  if (benefitClass === "UNKNOWN") {
    return {
      amount: null,
      status: "UNKNOWN",
      ruleId: null,
      reason:
        "급여 여부가 확인되지 않아 보장 제외 여부를 판단하지 않습니다.",
    };
  }

  /*
   * 이미 자기부담 계산 룰이 적용됐다는 것은
   * 현재 MVP 룰셋에서 해당 치료의 계산이
   * 지원된다는 의미.
   *
   * 따라서 같은 치료비를 보장 제외 금액으로
   * 중복 계산하지 않는다.
   */
  if (hasSupportedSelfPaymentRule) {
    return {
      amount: 0,
      status: "NONE",
      ruleId: null,
      reason:
        "적용 가능한 자기부담 계산 룰이 확인되어 보장 제외 의료비로 중복 계산하지 않습니다.",
    };
  }

  /*
   * 5세대 비급여 + 특약2 미가입은
   * MVP에서 명시적으로 구현한 보장 제외 조건
   */
  if (
    generation === 5 &&
    benefitClass === "NON_COVERED"
  ) {
    const hasSpecialRider2 =
      coverages.includes(
        "SPECIAL_RIDER_2"
      );

    if (!hasSpecialRider2) {
      return {
        amount: treatmentCost,
        status: "EXCLUDED",
        ruleId:
          "MVP-5G-NONCOVERED-NO-RIDER-001",
        reason:
          "5세대 비급여 치료에서 비교용 비급여 특약2를 미가입으로 입력하여 해당 치료비를 보장 제외 의료비로 분리했습니다.",
      };
    }
  }

  /*
   * 나머지는 근거 없는 숫자를 만들지 않음
   */
  return {
    amount: null,
    status: "UNKNOWN",
    ruleId: null,
    reason:
      "현재 MVP 룰셋에서 해당 치료의 보장 제외 여부를 확정할 수 없습니다.",
  };
}