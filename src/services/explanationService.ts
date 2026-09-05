export interface ExplanationServiceInput {
  currentTotalAnnualCost: number | null;

  targetTotalAnnualCost: number | null;

  currentTotalSelfPayment: number;

  targetTotalSelfPayment: number | null;

  currentExcludedExpense: number | null;

  targetExcludedExpense: number | null;

  coverageGapCount: number;

  hasUnsupportedCalculation: boolean;
}

export interface ExplanationResult {
  summary: string;

  details: string[];

  warnings: string[];
}

/**
 * 2일 MVP용 결과 해설 템플릿 서비스
 *
 * - 외부 LLM API를 호출하지 않는다.
 * - 계산 엔진의 숫자를 변경하지 않는다.
 * - 이미 계산된 결과만 문장으로 설명한다.
 * - 계산 불가/미확인 값은 임의로 추정하지 않는다.
 */
export const explanationService = {
  create(
    input: ExplanationServiceInput
  ): ExplanationResult {
    const details: string[] = [];

    const warnings: string[] = [
      "본 해설은 입력값과 현재 MVP 룰셋을 기반으로 한 모의 계산 설명입니다.",
      "실제 보험금, 가입 가능 여부, 전환 보험료를 확정하거나 보험상품 전환을 권유하지 않습니다.",
    ];

    // ========================================
    // 1. 전체 비교 해설
    // ========================================

    let summary =
      "현재 계약과 5세대의 최종 부담을 확정 비교하기 위해 추가 확인이 필요합니다.";

    if (
      input.currentTotalAnnualCost !== null &&
      input.targetTotalAnnualCost !== null
    ) {
      const difference = Math.abs(
        input.currentTotalAnnualCost -
          input.targetTotalAnnualCost
      );

      if (
        input.currentTotalAnnualCost <
        input.targetTotalAnnualCost
      ) {
        summary =
          `현재 입력 조건에서는 현재 계약 유지의 1년 예상 총 부담이 5세대 비교안보다 ${difference.toLocaleString()}원 낮습니다.`;
      } else if (
        input.targetTotalAnnualCost <
        input.currentTotalAnnualCost
      ) {
        summary =
          `현재 입력 조건에서는 5세대 비교안의 1년 예상 총 부담이 현재 계약보다 ${difference.toLocaleString()}원 낮습니다.`;
      } else {
        summary =
          "현재 입력 조건에서는 현재 계약과 5세대 비교안의 1년 예상 총 부담이 같습니다.";
      }
    }

    // ========================================
    // 2. 자기부담금 해설
    // ========================================

    if (
      input.targetTotalSelfPayment !== null
    ) {
      const selfPaymentDifference =
        input.targetTotalSelfPayment -
        input.currentTotalSelfPayment;

      if (selfPaymentDifference > 0) {
        details.push(
          `5세대 비교안의 예상 자기부담금이 현재 계약보다 ${selfPaymentDifference.toLocaleString()}원 높게 계산되었습니다.`
        );
      } else if (
        selfPaymentDifference < 0
      ) {
        details.push(
          `5세대 비교안의 예상 자기부담금이 현재 계약보다 ${Math.abs(
            selfPaymentDifference
          ).toLocaleString()}원 낮게 계산되었습니다.`
        );
      } else {
        details.push(
          "현재 계산 가능한 범위에서는 두 선택지의 예상 자기부담금이 같습니다."
        );
      }
    } else {
      details.push(
        "5세대 자기부담금 일부를 계산할 수 없어 자기부담금 차이를 확정하지 않았습니다."
      );
    }

    // ========================================
    // 3. 보장 제외 의료비 해설
    // ========================================

    if (
      input.currentExcludedExpense === null ||
      input.targetExcludedExpense === null
    ) {
      details.push(
        "보장 제외 의료비 중 확인되지 않은 항목이 있어 해당 금액을 임의로 추정하지 않았습니다."
      );
    } else if (
      input.currentExcludedExpense > 0 ||
      input.targetExcludedExpense > 0
    ) {
      details.push(
        `보장 제외 의료비는 현재 계약 ${input.currentExcludedExpense.toLocaleString()}원, 5세대 비교안 ${input.targetExcludedExpense.toLocaleString()}원으로 계산되었습니다.`
      );
    } else {
      details.push(
        "현재 구현된 룰 범위에서는 계산된 보장 제외 의료비가 없습니다."
      );
    }

    // ========================================
    // 4. 보장 공백 해설
    // ========================================

    if (
      input.coverageGapCount > 0
    ) {
      details.push(
        `확인 또는 주의가 필요한 보장 공백 항목이 ${input.coverageGapCount}건 있습니다. 결과 화면의 보장 공백 분석을 함께 확인해주세요.`
      );
    } else {
      details.push(
        "현재 구현된 룰 범위에서는 추가로 표시된 보장 공백 항목이 없습니다."
      );
    }

    // ========================================
    // 5. 계산 제한 고지
    // ========================================

    if (
      input.hasUnsupportedCalculation
    ) {
      warnings.push(
        "현재 MVP에서 지원하지 않는 계산 조건이 포함되어 있어 일부 결과가 '계산 불가' 또는 '확인 필요'로 표시될 수 있습니다."
      );
    }

    return {
      summary,
      details,
      warnings,
    };
  },
};
