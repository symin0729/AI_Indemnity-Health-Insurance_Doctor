import type {
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  BenefitClass,
  CareSetting,
  SeverityClass,
} from "../domain/medical";

import type {
  DeductibleFormulaType,
  SelfPaymentRule,
} from "./loadRuleSet";

export type MedicalInstitutionType =
  | "CLINIC_HOSPITAL"
  | "GENERAL_TERTIARY";

export interface SelfPaymentResult {
  /**
   * 기본 자기부담액 d.
   *
   * 자기부담 상한이 있는 룰의 d*,
   * 지급한도 q/I/U는 이후 엔진 단계에서 계산한다.
   */
  amount: number | null;

  ruleId: string | null;

  warning: string | null;

  formulaType?:
    | DeductibleFormulaType
    | null;

  /**
   * 급여 통원에서 실제로 적용한 최소공제액 D.
   */
  minimumDeductibleApplied?:
    | number
    | null;
}

interface CalculateSelfPaymentParams {
  /**
   * 이 함수에서 계산 기준이 되는 금액.
   *
   * mvp-v1에서는 treatmentCost를 그대로 전달했지만,
   * mvp-v2의 새 Claim 엔진에서는 보장대상 인정금액 C를 전달한다.
   */
  treatmentCost: number;

  generation: InsuranceGeneration;

  careSetting: CareSetting;

  benefitClass: BenefitClass;

  severityClass: SeverityClass;

  coverages: string[];

  rules: SelfPaymentRule[];

  /**
   * 5세대 급여 통원 계산에 필요한 건강보험 본인부담률 r.
   * 예: 40% → 0.4
   */
  healthInsuranceCopayRate?: number;

  /**
   * 5세대 급여 통원 최소공제액 D 선택용.
   */
  institutionType?: MedicalInstitutionType;

  /**
   * 치료군 전용 룰을 사용할 때 전달하는 명시적 분류값.
   * 아직 입력 모델이 이 값을 제공하지 않는 기존 화면과의 호환을 위해 optional.
   */
  treatmentCategory?: string;
}

function matchesRuleValue(
  ruleValue: string,
  inputValue: string
): boolean {
  return (
    ruleValue === "ANY" ||
    ruleValue === inputValue
  );
}

function isValidRate(
  value: number | undefined
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function findMatchedRule({
  generation,
  careSetting,
  benefitClass,
  severityClass,
  coverages,
  rules,
  treatmentCategory,
}: Omit<
  CalculateSelfPaymentParams,
  | "treatmentCost"
  | "healthInsuranceCopayRate"
  | "institutionType"
>): SelfPaymentRule | undefined {
  const candidates = rules.filter(
    (rule) => {
      /**
       * EXCLUSION/LIMIT 룰은 자기부담 계산 함수에서 사용하지 않는다.
       * 기존 mvp-v1에는 ruleKind가 없으므로 undefined는 허용한다.
       */
      if (
        rule.ruleKind !== undefined &&
        rule.ruleKind !== "DEDUCTIBLE"
      ) {
        return false;
      }

      const coverageMatched =
        !rule.requiredCoverage ||
        coverages.includes(
          rule.requiredCoverage
        );

      if (!coverageMatched) {
        return false;
      }

      if (
        rule.generation !==
        generation
      ) {
        return false;
      }

      if (
        !matchesRuleValue(
          rule.careSetting,
          careSetting
        )
      ) {
        return false;
      }

      if (
        !matchesRuleValue(
          rule.benefitClass,
          benefitClass
        )
      ) {
        return false;
      }

      if (
        !matchesRuleValue(
          rule.severityClass,
          severityClass
        )
      ) {
        return false;
      }

      /**
       * 치료군 전용 룰은 mvp-v2에서 반드시 명시적인
       * treatmentCategory가 있어야 매칭한다.
       *
       * 예:
       * G3_MRI_OUTPATIENT가 MRI/MRA 전용인데
       * treatmentCategory가 비어 있으면 일반 비급여 통원까지
       * 잘못 매칭될 수 있으므로 mvp-v2에서는 차단한다.
       *
       * 기존 mvp-v1 룰은 ruleKind가 없으므로,
       * 화면 마이그레이션이 끝날 때까지 레거시 호환을 유지한다.
       */
      if (
        rule.treatmentCategories &&
        rule.treatmentCategories.length > 0
      ) {
        const isMvpV2Rule =
          rule.ruleKind !== undefined;

        if (
          isMvpV2Rule &&
          !treatmentCategory
        ) {
          return false;
        }

        if (
          treatmentCategory &&
          !rule.treatmentCategories.includes(
            treatmentCategory
          )
        ) {
          return false;
        }
      }

      return true;
    }
  );

  /**
   * ANY 룰보다 정확히 일치하는 룰을 우선한다.
   */
  candidates.sort((a, b) => {
    const score = (
      rule: SelfPaymentRule
    ) => {
      let value = 0;

      if (
        rule.careSetting !== "ANY"
      ) {
        value += 1;
      }

      if (
        rule.benefitClass !== "ANY"
      ) {
        value += 1;
      }

      if (
        rule.severityClass !== "ANY"
      ) {
        value += 1;
      }

      if (rule.requiredCoverage) {
        value += 1;
      }

      if (
        rule.treatmentCategories &&
        rule.treatmentCategories.length >
          0
      ) {
        value += 1;
      }

      return value;
    };

    return score(b) - score(a);
  });

  return candidates[0];
}

function calculateRateDeductible(
  coveredAmount: number,
  rate: number
): number {
  return Math.min(
    coveredAmount,
    coveredAmount * rate
  );
}

function calculateRateWithMinimum(
  coveredAmount: number,
  rate: number,
  minimum: number
): number {
  return Math.min(
    coveredAmount,
    Math.max(
      coveredAmount * rate,
      minimum
    )
  );
}

function calculateCoveredOutpatientDeductible({
  coveredAmount,
  rate,
  healthInsuranceCopayRate,
  minimumDeductible,
}: {
  coveredAmount: number;
  rate: number;
  healthInsuranceCopayRate: number;
  minimumDeductible: number;
}): number {
  return Math.min(
    coveredAmount,
    Math.max(
      coveredAmount *
        healthInsuranceCopayRate,
      coveredAmount * rate,
      minimumDeductible
    )
  );
}

export function calculateSelfPayment({
  treatmentCost,
  generation,
  careSetting,
  benefitClass,
  severityClass,
  coverages,
  rules,
  healthInsuranceCopayRate,
  institutionType,
  treatmentCategory,
}: CalculateSelfPaymentParams): SelfPaymentResult {
  if (
    !Number.isFinite(treatmentCost) ||
    treatmentCost <= 0
  ) {
    return {
      amount: null,
      ruleId: null,
      warning:
        "치료비 또는 보장대상 인정금액을 확인해주세요.",
      formulaType: null,
      minimumDeductibleApplied:
        null,
    };
  }

  /**
   * 급여/비급여 자체가 확인되지 않으면
   * 임의 분류하지 않는다.
   */
  if (
    benefitClass === "UNKNOWN"
  ) {
    return {
      amount: null,
      ruleId: null,
      warning:
        "급여 여부 확인이 필요합니다.",
      formulaType: null,
      minimumDeductibleApplied:
        null,
    };
  }

  /**
   * 중증 분류는 비급여 특약 계산에 필요하다.
   * 급여 기본담보에서는 중증값이 UNKNOWN이어도
   * 급여 룰의 severityClass=ANY와 매칭할 수 있다.
   */
  if (
    benefitClass ===
      "NON_COVERED" &&
    severityClass === "UNKNOWN"
  ) {
    return {
      amount: null,
      ruleId: null,
      warning:
        "중증/비중증 여부 확인이 필요합니다.",
      formulaType: null,
      minimumDeductibleApplied:
        null,
    };
  }

  const matchedRule =
    findMatchedRule({
      generation,
      careSetting,
      benefitClass,
      severityClass,
      coverages,
      rules,
      treatmentCategory,
    });

  if (!matchedRule) {
    return {
      amount: null,
      ruleId: null,
      warning:
        "현재 룰셋에서 해당 조건의 자기부담 계산을 지원하지 않습니다.",
      formulaType: null,
      minimumDeductibleApplied:
        null,
    };
  }

  /**
   * mvp-v1 호환:
   * deductibleFormula가 없는 기존 룰은
   * selfPaymentRate + minimumSelfPayment 조합으로 계산한다.
   */
  const formulaType:
    DeductibleFormulaType =
    matchedRule.deductibleFormula ??
    (
      matchedRule
        .minimumSelfPayment !==
      undefined
        ? "MAX_RATE_MINIMUM"
        : "RATE"
    );

  if (
    !isValidRate(
      matchedRule.selfPaymentRate
    )
  ) {
    return {
      amount: null,
      ruleId:
        matchedRule.ruleId,
      warning:
        "적용 룰의 자기부담률이 확인되지 않아 계산할 수 없습니다.",
      formulaType,
      minimumDeductibleApplied:
        null,
    };
  }

  if (
    formulaType === "RATE"
  ) {
    return {
      amount:
        calculateRateDeductible(
          treatmentCost,
          matchedRule.selfPaymentRate
        ),
      ruleId:
        matchedRule.ruleId,
      warning: null,
      formulaType,
      minimumDeductibleApplied:
        null,
    };
  }

  if (
    formulaType ===
    "MAX_RATE_MINIMUM"
  ) {
    if (
      matchedRule
        .minimumSelfPayment ===
      undefined
    ) {
      return {
        amount: null,
        ruleId:
          matchedRule.ruleId,
        warning:
          "최소공제액이 확인되지 않아 계산할 수 없습니다.",
        formulaType,
        minimumDeductibleApplied:
          null,
      };
    }

    return {
      amount:
        calculateRateWithMinimum(
          treatmentCost,
          matchedRule.selfPaymentRate,
          matchedRule
            .minimumSelfPayment
        ),
      ruleId:
        matchedRule.ruleId,
      warning: null,
      formulaType,
      minimumDeductibleApplied:
        matchedRule
          .minimumSelfPayment,
    };
  }

  /**
   * 5세대 급여 통원
   *
   * d = MIN(
   *   C,
   *   MAX(
   *     C × r,
   *     C × 20%,
   *     D
   *   )
   * )
   */
  if (
    formulaType ===
    "COVERED_OUTPATIENT"
  ) {
    if (
      !isValidRate(
        healthInsuranceCopayRate
      )
    ) {
      return {
        amount: null,
        ruleId:
          matchedRule.ruleId,
        warning:
          "급여 통원 계산에 필요한 건강보험 본인부담률을 확인해주세요.",
        formulaType,
        minimumDeductibleApplied:
          null,
      };
    }

    if (!institutionType) {
      return {
        amount: null,
        ruleId:
          matchedRule.ruleId,
        warning:
          "급여 통원 최소공제액 확인을 위해 의료기관 종별을 확인해주세요.",
        formulaType,
        minimumDeductibleApplied:
          null,
      };
    }

    const minimumDeductible =
      matchedRule
        .minimumDeductibleByInstitution?.[
        institutionType
      ];

    if (
      minimumDeductible ===
        undefined ||
      !Number.isFinite(
        minimumDeductible
      ) ||
      minimumDeductible < 0
    ) {
      return {
        amount: null,
        ruleId:
          matchedRule.ruleId,
        warning:
          "해당 의료기관 종별의 최소공제액이 룰셋에 없습니다.",
        formulaType,
        minimumDeductibleApplied:
          null,
      };
    }

    return {
      amount:
        calculateCoveredOutpatientDeductible(
          {
            coveredAmount:
              treatmentCost,
            rate:
              matchedRule.selfPaymentRate,
            healthInsuranceCopayRate,
            minimumDeductible,
          }
        ),
      ruleId:
        matchedRule.ruleId,
      warning: null,
      formulaType,
      minimumDeductibleApplied:
        minimumDeductible,
    };
  }

  return {
    amount: null,
    ruleId:
      matchedRule.ruleId,
    warning:
      "지원하지 않는 자기부담 계산식입니다.",
    formulaType,
    minimumDeductibleApplied:
      null,
  };
}