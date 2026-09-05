import type {
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  BenefitClass,
  CareSetting,
  SeverityClass,
} from "../domain/medical";

import type {
  SelfPaymentRule,
} from "./loadRuleSet";

export interface SelfPaymentResult {
  amount: number | null;

  ruleId: string | null;

  warning: string | null;
}

interface CalculateSelfPaymentParams {
  treatmentCost: number;

  generation: InsuranceGeneration;

  careSetting: CareSetting;

  benefitClass: BenefitClass;

  severityClass: SeverityClass;

  coverages: string[];

  rules: SelfPaymentRule[];
}

export function calculateSelfPayment({
  treatmentCost,
  generation,
  careSetting,
  benefitClass,
  severityClass,
  coverages,
  rules,
}: CalculateSelfPaymentParams): SelfPaymentResult {
  if (
    !Number.isFinite(treatmentCost) ||
    treatmentCost <= 0
  ) {
    return {
      amount: null,

      ruleId: null,

      warning:
        "치료비를 확인해주세요.",
    };
  }

  /*
   * UNKNOWN은 임의 분류하지 않는다.
   */
  if (
    benefitClass === "UNKNOWN"
  ) {
    return {
      amount: null,

      ruleId: null,

      warning:
        "급여 여부 확인이 필요합니다.",
    };
  }

  if (
    severityClass === "UNKNOWN"
  ) {
    return {
      amount: null,

      ruleId: null,

      warning:
        "중증 여부 확인이 필요합니다.",
    };
  }

  const matchedRule =
    rules.find((rule) => {
      const coverageMatched =
        !rule.requiredCoverage ||
        coverages.includes(
          rule.requiredCoverage
        );

      return (
        rule.generation ===
          generation &&
        rule.careSetting ===
          careSetting &&
        rule.benefitClass ===
          benefitClass &&
        rule.severityClass ===
          severityClass &&
        coverageMatched
      );
    });

  if (!matchedRule) {
    return {
      amount: null,

      ruleId: null,

      warning:
        "현재 MVP 룰셋에서 해당 조건의 자기부담 계산을 지원하지 않습니다.",
    };
  }

  const proportionalAmount =
    treatmentCost *
    matchedRule.selfPaymentRate;

  /*
   * 일부 룰은
   * 정률 자기부담금과 최소 자기부담금 중
   * 큰 금액을 적용한다.
   *
   * 예:
   * max(20,000원, 치료비의 30%)
   */
  const calculatedAmount =
    matchedRule.minimumSelfPayment ===
    undefined
      ? proportionalAmount
      : Math.max(
          matchedRule.minimumSelfPayment,
          proportionalAmount
        );

  /*
   * 자기부담금이 실제 치료비를
   * 초과해서 표시되지 않도록 제한한다.
   */
  const amount = Math.round(
    Math.min(
      treatmentCost,
      calculatedAmount
    )
  );

  return {
    amount,

    ruleId:
      matchedRule.ruleId,

    warning: null,
  };
}
