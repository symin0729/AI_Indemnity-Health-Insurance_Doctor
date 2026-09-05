import type {
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  BenefitClass,
} from "../domain/medical";

export type ExcludedExpenseStatus =
  | "NONE"
  | "EXCLUDED"
  | "UNKNOWN";

export interface ExcludedExpenseResult {
  amount: number | null;

  status:
    ExcludedExpenseStatus;

  ruleId: string | null;

  warning: string | null;
}

interface CalculateExcludedExpenseParams {
  treatmentCost: number;

  generation:
    InsuranceGeneration;

  benefitClass:
    BenefitClass;

  coverages: string[];

  /**
   * 자기부담 룰이 실제로 매칭되었다면
   * 해당 치료는 현재 룰셋에서
   * "보장 대상 + 자기부담 적용"으로
   * 판정된 것이므로 보장 제외 의료비로
   * 중복 계산하지 않는다.
   *
   * 미전달 시에는 기존 보수적 판정을 유지한다.
   */
  hasSupportedSelfPaymentRule?:
    boolean;
}

export function calculateExcludedExpense({
  treatmentCost,
  generation,
  benefitClass,
  coverages,
  hasSupportedSelfPaymentRule = false,
}: CalculateExcludedExpenseParams): ExcludedExpenseResult {
  if (
    !Number.isFinite(treatmentCost) ||
    treatmentCost <= 0
  ) {
    return {
      amount: null,

      status: "UNKNOWN",

      ruleId: null,

      warning:
        "치료비를 확인해주세요.",
    };
  }

  /*
   * UNKNOWN은 임의로
   * 급여/비급여를 판단하지 않는다.
   */
  if (
    benefitClass === "UNKNOWN"
  ) {
    return {
      amount: null,

      status: "UNKNOWN",

      ruleId: null,

      warning:
        "급여 여부 확인이 필요합니다.",
    };
  }

  /*
   * 자기부담 룰이 실제로 매칭된 경우:
   *
   * 해당 의료비는 자기부담 계산 경로로
   * 처리할 수 있으므로 같은 치료비를
   * 보장 제외 의료비로 다시 더하지 않는다.
   *
   * 이 분기는 3세대 MRI처럼
   * 현재 룰셋에 명시적으로 추가된
   * 과거 세대 시연 룰도 안전하게 지원한다.
   */
  if (
    hasSupportedSelfPaymentRule
  ) {
    return {
      amount: 0,

      status: "NONE",

      ruleId: null,

      warning: null,
    };
  }

  /*
   * 현재 MVP에서 보장 제외 여부를
   * 별도로 확정하는 자체 분기는
   * 5세대 시연 조건만 구현한다.
   *
   * 1~4세대에서 자기부담 룰이
   * 매칭되지 않았다면 임의 추정하지 않는다.
   */
  if (generation !== 5) {
    return {
      amount: null,

      status: "UNKNOWN",

      ruleId: null,

      warning:
        "현재 MVP 룰셋에서 해당 세대의 보장 제외 여부를 확정할 수 없습니다.",
    };
  }

  /*
   * 5세대 급여 항목은
   * 현재 보장 제외 시연 분기의 대상이 아니다.
   */
  if (
    benefitClass !==
      "NON_COVERED"
  ) {
    return {
      amount: 0,

      status: "NONE",

      ruleId: null,

      warning: null,
    };
  }

  /*
   * 5세대 비중증 비급여 시연에서
   * SPECIAL_RIDER_2가 없으면
   * 해당 치료비를 보장 제외 의료비로 분리한다.
   *
   * 실제 보험사 상품의 확정 지급 여부를
   * 의미하는 것이 아니라
   * 현재 MVP 시연 룰셋의 판정이다.
   */
  if (
    !coverages.includes(
      "SPECIAL_RIDER_2"
    )
  ) {
    return {
      amount:
        treatmentCost,

      status: "EXCLUDED",

      ruleId:
        "G5_EXCLUSION",

      warning:
        "현재 MVP 시연 조건에서는 비급여 특약2 미가입으로 보장 제외 의료비에 분리합니다.",
    };
  }

  return {
    amount: 0,

    status: "NONE",

    ruleId: null,

    warning: null,
  };
}
