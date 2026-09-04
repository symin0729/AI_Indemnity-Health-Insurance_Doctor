import type {
  BenefitClass,
  SeverityClass,
} from "../domain/medical";

import type {
  InsuranceGeneration,
} from "../domain/insurance";

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
  benefitClass: BenefitClass;
  severityClass: SeverityClass;
  coverages: string[];

  // JSON에서 불러온 계산 룰
  rules?: SelfPaymentRule[];
}

export function calculateSelfPayment({
  treatmentCost,
  generation,
  benefitClass,
  severityClass,
  coverages,
  rules,
}: CalculateSelfPaymentParams): SelfPaymentResult {
  // 치료비 검증
  if (treatmentCost < 0) {
    return {
      amount: null,
      ruleId: null,
      warning: "치료비를 확인해주세요.",
    };
  }

  // 급여 여부를 모르는 경우
  if (benefitClass === "UNKNOWN") {
    return {
      amount: null,
      ruleId: null,
      warning: "급여 여부 확인이 필요합니다.",
    };
  }

  // 중증 여부를 모르는 경우
  if (severityClass === "UNKNOWN") {
    return {
      amount: null,
      ruleId: null,
      warning: "중증 여부 확인이 필요합니다.",
    };
  }

  // 아직 룰 파일이 전달되지 않은 경우
  if (!rules) {
    return {
      amount: null,
      ruleId: null,
      warning: "계산 룰셋이 로드되지 않았습니다.",
    };
  }

  // 입력 조건과 일치하는 룰 찾기
  const matchedRule = rules.find(
    (rule) =>
      rule.generation === generation &&
      rule.benefitClass === benefitClass &&
      rule.severityClass === severityClass &&
      coverages.includes(
        rule.requiredCoverage
      )
  );

  // 일치하는 룰이 없는 경우
  if (!matchedRule) {
    return {
      amount: null,
      ruleId: null,
      warning:
        "현재 MVP에서 지원하지 않는 계산 조건입니다.",
    };
  }

  // 룰에 정의된 자기부담률로 계산
  const amount = Math.round(
    treatmentCost *
      matchedRule.selfPaymentRate
  );

  return {
    amount,
    ruleId: matchedRule.ruleId,
    warning: null,
  };
}