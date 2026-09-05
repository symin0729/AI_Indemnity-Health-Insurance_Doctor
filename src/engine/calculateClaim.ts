import type {
  BenefitLimit,
  CalculationStatus,
  ClaimCalculationItem,
  CoverageDecision,
  DeductibleCapState,
  RuleTrace,
} from "../domain/calculation";

import {
  applyDeductibleCap,
} from "./applyDeductibleCap";

import {
  applyBenefitLimits,
} from "./applyBenefitLimits";

interface CalculateClaimParams {
  usageId: string;
  treatmentName: string;

  /**
   * M: 실손 보상 전 환자 부담 의료비
   */
  medicalCost: number;

  /**
   * C: 약관상 보장대상 인정금액
   */
  coveredAmount:
    | number
    | null;

  /**
   * E: 보장 제외 금액
   *
   * 정상 계산에서는 M = C + E가 성립해야 한다.
   */
  excludedAmount:
    | number
    | null;

  /**
   * d: calculateSelfPayment에서 구한 기본 자기부담액
   */
  baseDeductible:
    | number
    | null;

  /**
   * 자기부담 상한 적용 상태.
   * 해당 룰에 상한이 없으면 생략한다.
   */
  deductibleCapState?:
    | DeductibleCapState
    | null;

  /**
   * 이번 계산 단위에 실제 적용되는 지급한도.
   *
   * amount 한도에는 usedAmount,
   * count 한도에는 usedCount가 들어 있어야 한다.
   */
  benefitLimits?: BenefitLimit[];

  /**
   * 지급한도 적용 여부를 약관 기준으로 확인했는지.
   *
   * false이면 "한도 없음"으로 임의 처리하지 않고
   * 최종 보험금 I를 확정하지 않는다.
   */
  benefitLimitsConfirmed: boolean;

  traces?: RuleTrace[];
  warnings?: string[];
}

function isFiniteNonNegative(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function decideCoverage(
  medicalCost: number,
  coveredAmount: number,
  excludedAmount: number
): CoverageDecision {
  if (
    coveredAmount === 0 &&
    excludedAmount === medicalCost
  ) {
    return "EXCLUDED";
  }

  if (
    coveredAmount > 0 &&
    excludedAmount > 0
  ) {
    return "PARTIALLY_COVERED";
  }

  return "COVERED";
}

function unsupportedResult({
  usageId,
  treatmentName,
  medicalCost,
  coveredAmount,
  excludedAmount,
  baseDeductible,
  warning,
  traces = [],
  warnings = [],
}: {
  usageId: string;
  treatmentName: string;
  medicalCost: number;
  coveredAmount: number | null;
  excludedAmount: number | null;
  baseDeductible: number | null;
  warning: string;
  traces?: RuleTrace[];
  warnings?: string[];
}): ClaimCalculationItem {
  return {
    usageId,
    treatmentName,

    medicalCost,

    coveredAmount,
    excludedAmount,

    baseDeductible,
    adjustedDeductible: null,

    preLimitBenefit: null,
    insuranceBenefit: null,
    limitExceededAmount: null,

    finalMedicalBurden: null,

    coverageDecision: "UNKNOWN",
    status: "CONFIRMATION_REQUIRED",

    appliedLimitIds: [],
    traces,

    warnings: [
      ...warnings,
      warning,
    ],
  };
}

/**
 * 1개 계산 단위의 최종 모의 보험금을 계산한다.
 *
 * 계산 순서:
 *
 * 1) M = C + E 검증
 * 2) 기본 공제액 d 검증
 * 3) 자기부담 상한 반영 → d*
 * 4) q = MAX(0, C - d*)
 * 5) 지급한도 반영 → I
 * 6) U = q - I
 * 7) 최종 의료비 부담 = M - I
 *
 * 최종 불변식:
 *
 *   M - I = E + d* + U
 */
export function calculateClaim({
  usageId,
  treatmentName,
  medicalCost,
  coveredAmount,
  excludedAmount,
  baseDeductible,
  deductibleCapState,
  benefitLimits = [],
  benefitLimitsConfirmed,
  traces = [],
  warnings = [],
}: CalculateClaimParams): ClaimCalculationItem {
  if (
    !isFiniteNonNegative(
      medicalCost
    )
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost:
        Number.isFinite(
          medicalCost
        )
          ? medicalCost
          : 0,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        "의료비(M)를 확인해주세요.",
      traces,
      warnings,
    });
  }

  if (
    coveredAmount === null ||
    excludedAmount === null
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        "보장대상 인정금액(C) 또는 보장 제외 금액(E)을 확인해주세요.",
      traces,
      warnings,
    });
  }

  if (
    !isFiniteNonNegative(
      coveredAmount
    ) ||
    !isFiniteNonNegative(
      excludedAmount
    )
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        "보장대상 인정금액(C)과 보장 제외 금액(E)은 0 이상이어야 합니다.",
      traces,
      warnings,
    });
  }

  /**
   * 회계식 M = C + E 검증.
   * 계산 도중 임의 보정하지 않는다.
   */
  if (
    Math.abs(
      medicalCost -
        (
          coveredAmount +
          excludedAmount
        )
    ) > 0.000001
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        "의료비 분해가 일치하지 않습니다. M = C + E 조건을 확인해주세요.",
      traces,
      warnings,
    });
  }

  const coverageDecision =
    decideCoverage(
      medicalCost,
      coveredAmount,
      excludedAmount
    );

  /**
   * 전액 보장 제외:
   *
   * C = 0
   * I = 0
   * 최종 부담 = M
   *
   * 자기부담/지급한도 계산을 진행하지 않는다.
   */
  if (
    coverageDecision ===
    "EXCLUDED"
  ) {
    return {
      usageId,
      treatmentName,

      medicalCost,

      coveredAmount: 0,
      excludedAmount,

      baseDeductible: 0,
      adjustedDeductible: 0,

      preLimitBenefit: 0,
      insuranceBenefit: 0,
      limitExceededAmount: 0,

      finalMedicalBurden:
        medicalCost,

      coverageDecision,
      status: "CALCULATED",

      appliedLimitIds: [],
      traces,
      warnings,
    };
  }

  if (
    baseDeductible === null ||
    !isFiniteNonNegative(
      baseDeductible
    )
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        "기본 자기부담액(d)을 확인해주세요.",
      traces,
      warnings,
    });
  }

  if (
    baseDeductible >
    coveredAmount
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        "기본 자기부담액(d)이 보장대상 인정금액(C)을 초과합니다.",
      traces,
      warnings,
    });
  }

  const capResult =
    applyDeductibleCap({
      baseDeductible,
      capState:
        deductibleCapState,
    });

  if (
    capResult.adjustedDeductible ===
    null
  ) {
    return unsupportedResult({
      usageId,
      treatmentName,
      medicalCost,
      coveredAmount,
      excludedAmount,
      baseDeductible,
      warning:
        capResult.warning ??
        "자기부담 상한 계산을 확인해주세요.",
      traces,
      warnings,
    });
  }

  const adjustedDeductible =
    capResult.adjustedDeductible;

  const preLimitBenefit =
    Math.max(
      0,
      coveredAmount -
        adjustedDeductible
    );

  /**
   * 지급한도 조건이 미확인이라면
   * 빈 배열을 "무제한"으로 해석하지 않는다.
   */
  if (
    !benefitLimitsConfirmed &&
    preLimitBenefit > 0
  ) {
    return {
      usageId,
      treatmentName,

      medicalCost,

      coveredAmount,
      excludedAmount,

      baseDeductible,
      adjustedDeductible,

      preLimitBenefit,
      insuranceBenefit: null,
      limitExceededAmount: null,

      finalMedicalBurden: null,

      coverageDecision,
      status:
        "CONFIRMATION_REQUIRED",

      appliedLimitIds: [],
      traces,

      warnings: [
        ...warnings,
        "지급한도 적용 여부 또는 잔여한도를 확인해야 최종 보험금(I)을 계산할 수 있습니다.",
      ],
    };
  }

  const limitResult =
    applyBenefitLimits({
      preLimitBenefit,
      limits: benefitLimits,
    });

  if (
    limitResult.insuranceBenefit ===
      null ||
    limitResult.limitExceededAmount ===
      null
  ) {
    return {
      usageId,
      treatmentName,

      medicalCost,

      coveredAmount,
      excludedAmount,

      baseDeductible,
      adjustedDeductible,

      preLimitBenefit,
      insuranceBenefit: null,
      limitExceededAmount: null,

      finalMedicalBurden: null,

      coverageDecision,
      status:
        "CONFIRMATION_REQUIRED",

      appliedLimitIds:
        limitResult.appliedLimitIds,

      traces,

      warnings: [
        ...warnings,
        limitResult.warning ??
          "지급한도 계산을 확인해주세요.",
      ],
    };
  }

  const insuranceBenefit =
    limitResult.insuranceBenefit;

  const limitExceededAmount =
    limitResult.limitExceededAmount;

  const finalMedicalBurden =
    medicalCost -
    insuranceBenefit;

  /**
   * 불변식:
   *
   * M - I
   * =
   * E + d* + U
   */
  const decomposedBurden =
    excludedAmount +
    adjustedDeductible +
    limitExceededAmount;

  if (
    Math.abs(
      finalMedicalBurden -
        decomposedBurden
    ) > 0.000001
  ) {
    return {
      usageId,
      treatmentName,

      medicalCost,

      coveredAmount,
      excludedAmount,

      baseDeductible,
      adjustedDeductible,

      preLimitBenefit,
      insuranceBenefit,
      limitExceededAmount,

      finalMedicalBurden: null,

      coverageDecision,
      status: "UNSUPPORTED",

      appliedLimitIds:
        limitResult.appliedLimitIds,

      traces,

      warnings: [
        ...warnings,
        "계산 불변식 M - I = E + d* + U가 일치하지 않습니다.",
      ],
    };
  }

  const status:
    CalculationStatus =
    warnings.length > 0
      ? "CONFIRMATION_REQUIRED"
      : "CALCULATED";

  return {
    usageId,
    treatmentName,

    medicalCost,

    coveredAmount,
    excludedAmount,

    baseDeductible,
    adjustedDeductible,

    preLimitBenefit,
    insuranceBenefit,
    limitExceededAmount,

    finalMedicalBurden,

    coverageDecision,
    status,

    appliedLimitIds:
      limitResult.appliedLimitIds,

    traces,
    warnings,
  };
}
