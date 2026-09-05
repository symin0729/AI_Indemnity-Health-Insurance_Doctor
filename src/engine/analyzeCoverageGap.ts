import type {
  MedicalUsage,
} from "../domain/medical";

import type {
  SelfPaymentResult,
} from "./calculateSelfPayment";

export type CoverageGapType =
  | "NONE"
  | "INPUT_CONFIRMATION_REQUIRED"
  | "CALCULATION_UNAVAILABLE"
  | "SELF_PAYMENT_INCREASE";

export type CoverageGapLevel =
  | "INFO"
  | "WARNING"
  | "RISK";

export interface CoverageGapResult {
  usageId: string;

  treatmentName: string;

  type: CoverageGapType;

  level: CoverageGapLevel;

  title: string;

  message: string;

  treatmentCost: number;

  currentSelfPayment: number | null;

  targetSelfPayment: number | null;

  differenceAmount: number | null;

  currentRuleId: string | null;

  targetRuleId: string | null;

  requiresConfirmation: boolean;

  reasons: string[];
}

export interface AnalyzeCoverageGapItem {
  usage: MedicalUsage;

  treatmentCost: number;

  currentSelfPaymentResult:
    SelfPaymentResult;

  targetSelfPaymentResult:
    SelfPaymentResult;
}

export function analyzeCoverageGap({
  usage,
  treatmentCost,
  currentSelfPaymentResult,
  targetSelfPaymentResult,
}: AnalyzeCoverageGapItem): CoverageGapResult {
  const baseResult = {
    usageId: usage.id,

    treatmentName:
      usage.treatmentName,

    treatmentCost,

    currentSelfPayment:
      currentSelfPaymentResult.amount,

    targetSelfPayment:
      targetSelfPaymentResult.amount,

    currentRuleId:
      currentSelfPaymentResult.ruleId,

    targetRuleId:
      targetSelfPaymentResult.ruleId,
  };

  // ========================================
  // 1. 사용자 확인이 필요한 입력
  // ========================================

  if (
    usage.benefitClass ===
      "UNKNOWN" ||
    usage.severityClass ===
      "UNKNOWN"
  ) {
    const reasons: string[] =
      [];

    if (
      usage.benefitClass ===
      "UNKNOWN"
    ) {
      reasons.push(
        "급여/비급여 여부 확인이 필요합니다."
      );
    }

    if (
      usage.severityClass ===
      "UNKNOWN"
    ) {
      reasons.push(
        "중증/비중증 여부 확인이 필요합니다."
      );
    }

    return {
      ...baseResult,

      type:
        "INPUT_CONFIRMATION_REQUIRED",

      level: "WARNING",

      title:
        "입력 정보 확인 필요",

      message:
        "미확인 분류가 있어 현재 계약과 5세대의 자기부담 차이를 확정하지 않습니다.",

      differenceAmount: null,

      requiresConfirmation: true,

      reasons,
    };
  }

  // ========================================
  // 2. 현재 계약 계산 불가
  // ========================================

  if (
    currentSelfPaymentResult.amount ===
    null
  ) {
    return {
      ...baseResult,

      type:
        "CALCULATION_UNAVAILABLE",

      level: "WARNING",

      title:
        "현재 계약 계산 확인 필요",

      message:
        "현재 계약에 적용할 계산 룰이 충분하지 않아 보장 공백이나 자기부담 증가를 확정하지 않습니다.",

      differenceAmount: null,

      requiresConfirmation: true,

      reasons: [
        currentSelfPaymentResult.warning ??
          "현재 계약 계산 룰 확인이 필요합니다.",
      ],
    };
  }

  // ========================================
  // 3. 5세대 계산 불가
  // ========================================

  if (
    targetSelfPaymentResult.amount ===
    null
  ) {
    return {
      ...baseResult,

      type:
        "CALCULATION_UNAVAILABLE",

      level: "WARNING",

      title:
        "5세대 계산 확인 필요",

      message:
        "5세대 비교 조건에 적용할 계산 룰이 충분하지 않아 자기부담 차이를 확정하지 않습니다.",

      differenceAmount: null,

      requiresConfirmation: true,

      reasons: [
        targetSelfPaymentResult.warning ??
          "5세대 계산 룰 확인이 필요합니다.",
      ],
    };
  }

  // ========================================
  // 4. 자기부담 차이
  // ========================================

  const differenceAmount =
    targetSelfPaymentResult.amount -
    currentSelfPaymentResult.amount;

  if (differenceAmount > 0) {
    return {
      ...baseResult,

      type:
        "SELF_PAYMENT_INCREASE",

      level: "RISK",

      title:
        "5세대 자기부담 증가",

      message:
        `동일한 치료 조건에서 5세대 예상 자기부담금이 현재 계약보다 ${differenceAmount.toLocaleString()}원 높습니다.`,

      differenceAmount,

      requiresConfirmation: false,

      reasons: [
        `현재 계약 예상 자기부담금: ${currentSelfPaymentResult.amount.toLocaleString()}원`,
        `5세대 예상 자기부담금: ${targetSelfPaymentResult.amount.toLocaleString()}원`,
        currentSelfPaymentResult.ruleId
          ? `현재 적용 Rule ID: ${currentSelfPaymentResult.ruleId}`
          : "현재 계약 Rule ID 확인 필요",
        targetSelfPaymentResult.ruleId
          ? `5세대 적용 Rule ID: ${targetSelfPaymentResult.ruleId}`
          : "5세대 Rule ID 확인 필요",
      ],
    };
  }

  if (differenceAmount < 0) {
    return {
      ...baseResult,

      type: "NONE",

      level: "INFO",

      title:
        "확인된 자기부담 증가 없음",

      message:
        `동일한 치료 조건에서 5세대 예상 자기부담금이 현재 계약보다 ${Math.abs(
          differenceAmount
        ).toLocaleString()}원 낮습니다.`,

      differenceAmount,

      requiresConfirmation: false,

      reasons: [
        `현재 계약 예상 자기부담금: ${currentSelfPaymentResult.amount.toLocaleString()}원`,
        `5세대 예상 자기부담금: ${targetSelfPaymentResult.amount.toLocaleString()}원`,
      ],
    };
  }

  return {
    ...baseResult,

    type: "NONE",

    level: "INFO",

    title:
      "자기부담 차이 없음",

    message:
      "현재 입력 조건에서는 현재 계약과 5세대의 예상 자기부담금이 같습니다.",

    differenceAmount: 0,

    requiresConfirmation: false,

    reasons: [
      `현재 계약 예상 자기부담금: ${currentSelfPaymentResult.amount.toLocaleString()}원`,
      `5세대 예상 자기부담금: ${targetSelfPaymentResult.amount.toLocaleString()}원`,
    ],
  };
}

export function analyzeCoverageGaps(
  items: AnalyzeCoverageGapItem[]
): CoverageGapResult[] {
  return items.map(
    (item) =>
      analyzeCoverageGap(item)
  );
}