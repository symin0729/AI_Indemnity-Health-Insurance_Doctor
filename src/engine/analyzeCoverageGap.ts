import type {
  ScenarioItemResult,
} from "./calculateScenario";

export type CoverageGapType =
  | "NONE"
  | "COVERAGE_EXCLUDED"
  | "SELF_PAYMENT_INCREASE"
  | "INPUT_CONFIRMATION_REQUIRED"
  | "CALCULATION_CONFIRMATION_REQUIRED";

export interface CoverageGapResult {
  usageId: string;

  treatmentName: string;

  type: CoverageGapType;

  title: string;

  message: string;

  treatmentCost: number;

  currentSelfPayment:
    number | null;

  targetSelfPayment:
    number | null;

  currentExcluded:
    number | null;

  targetExcluded:
    number | null;

  differenceAmount:
    number | null;

  reasons: string[];

  currentRuleId:
    string | null;

  targetRuleId:
    string | null;
}

interface AnalyzeCoverageGapItem {
  currentItem: ScenarioItemResult;

  targetItem: ScenarioItemResult;
}

export function analyzeCoverageGaps(
  items: AnalyzeCoverageGapItem[]
): CoverageGapResult[] {
  return items.map(
    ({
      currentItem,
      targetItem,
    }) => {
      const usage =
        currentItem.usage;

      const currentSelfPayment =
        currentItem.selfPaymentAmount;

      const targetSelfPayment =
        targetItem.selfPaymentAmount;

      const currentExcluded =
        currentItem.excludedAmount;

      const targetExcluded =
        targetItem.excludedAmount;

      const currentRuleId =
        currentItem.selfPaymentResult
          .ruleId ?? null;

      const targetRuleId =
        targetItem.selfPaymentResult
          .ruleId ?? null;

      const reasons: string[] = [];

      /*
       * 입력값 UNKNOWN
       */
      if (
        usage.benefitClass ===
          "UNKNOWN" ||
        usage.severityClass ===
          "UNKNOWN"
      ) {
        if (
          usage.benefitClass ===
          "UNKNOWN"
        ) {
          reasons.push(
            "급여/비급여 구분이 확인되지 않았습니다."
          );
        }

        if (
          usage.severityClass ===
          "UNKNOWN"
        ) {
          reasons.push(
            "중증/비중증 구분이 확인되지 않았습니다."
          );
        }

        return {
          usageId:
            usage.id,

          treatmentName:
            usage.treatmentName,

          type:
            "INPUT_CONFIRMATION_REQUIRED",

          title:
            "입력값 확인이 필요합니다.",

          message:
            "확인되지 않은 항목을 임의로 분류하지 않았습니다.",

          treatmentCost:
            currentItem.treatmentCost,

          currentSelfPayment,

          targetSelfPayment,

          currentExcluded,

          targetExcluded,

          differenceAmount: null,

          reasons,

          currentRuleId,

          targetRuleId,
        };
      }

      /*
       * 5세대에서 보장 제외 발생
       */
      if (
        targetItem
          .excludedExpenseResult
          .status === "EXCLUDED"
      ) {
        reasons.push(
          targetItem
            .excludedExpenseResult
            .reason
        );

        return {
          usageId:
            usage.id,

          treatmentName:
            usage.treatmentName,

          type:
            "COVERAGE_EXCLUDED",

          title:
            "5세대 전환 시 보장 제외 의료비가 발생합니다.",

          message:
            `${(
              targetExcluded ?? 0
            ).toLocaleString()}원이 보장 제외 의료비로 계산되었습니다.`,

          treatmentCost:
            currentItem.treatmentCost,

          currentSelfPayment,

          targetSelfPayment,

          currentExcluded,

          targetExcluded,

          differenceAmount:
            targetExcluded,

          reasons,

          currentRuleId,

          targetRuleId,
        };
      }

      /*
       * 계산 불가
       */
      if (
        currentItem
          .totalMedicalBurden ===
          null ||
        targetItem
          .totalMedicalBurden ===
          null
      ) {
        if (
          currentItem
            .excludedExpenseResult
            .reason
        ) {
          reasons.push(
            currentItem
              .excludedExpenseResult
              .reason
          );
        }

        if (
          currentItem
            .selfPaymentResult
            .warning
        ) {
          reasons.push(
            currentItem
              .selfPaymentResult
              .warning
          );
        }

        if (
          targetItem
            .selfPaymentResult
            .warning
        ) {
          reasons.push(
            targetItem
              .selfPaymentResult
              .warning
          );
        }

        return {
          usageId:
            usage.id,

          treatmentName:
            usage.treatmentName,

          type:
            "CALCULATION_CONFIRMATION_REQUIRED",

          title:
            "계산 근거 확인이 필요합니다.",

          message:
            "지원되지 않는 약관 룰이 있어 보장 공백을 확정하지 않았습니다.",

          treatmentCost:
            currentItem.treatmentCost,

          currentSelfPayment,

          targetSelfPayment,

          currentExcluded,

          targetExcluded,

          differenceAmount: null,

          reasons,

          currentRuleId,

          targetRuleId,
        };
      }

      /*
       * 자기부담 증가
       */
      if (
        currentSelfPayment !== null &&
        targetSelfPayment !== null &&
        targetSelfPayment >
          currentSelfPayment
      ) {
        const differenceAmount =
          targetSelfPayment -
          currentSelfPayment;

        reasons.push(
          `현재 계약 대비 5세대 자기부담금이 ${differenceAmount.toLocaleString()}원 증가합니다.`
        );

        return {
          usageId:
            usage.id,

          treatmentName:
            usage.treatmentName,

          type:
            "SELF_PAYMENT_INCREASE",

          title:
            "5세대 전환 시 자기부담금이 증가합니다.",

          message:
            `예상 자기부담금이 ${differenceAmount.toLocaleString()}원 증가합니다.`,

          treatmentCost:
            currentItem.treatmentCost,

          currentSelfPayment,

          targetSelfPayment,

          currentExcluded,

          targetExcluded,

          differenceAmount,

          reasons,

          currentRuleId,

          targetRuleId,
        };
      }

      return {
        usageId:
          usage.id,

        treatmentName:
          usage.treatmentName,

        type: "NONE",

        title:
          "현재 계산 범위에서 확인된 보장 공백이 없습니다.",

        message:
          "현재 입력 조건과 구현된 룰 범위에서 추가적인 자기부담 증가 또는 보장 제외가 확인되지 않았습니다.",

        treatmentCost:
          currentItem.treatmentCost,

        currentSelfPayment,

        targetSelfPayment,

        currentExcluded,

        targetExcluded,

        differenceAmount: 0,

        reasons,

        currentRuleId,

        targetRuleId,
      };
    }
  );
}