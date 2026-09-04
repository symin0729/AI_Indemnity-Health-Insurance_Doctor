import type {
  ScenarioCalculationResult,
} from "../engine/calculateScenario";

import type {
  CoverageGapResult,
} from "../engine/analyzeCoverageGap";

import type {
  BreakEvenResult,
} from "../engine/calculateBreakEven";

interface CreateExplanationParams {
  currentResult:
    ScenarioCalculationResult;

  targetResult:
    ScenarioCalculationResult | null;

  coverageGaps:
    CoverageGapResult[];

  breakEvenResults:
    BreakEvenResult[];
}

export interface ExplanationResult {
  summary: string;

  details: string[];

  questions: string[];
}

export function createExplanation({
  currentResult,
  targetResult,
  coverageGaps,
  breakEvenResults,
}: CreateExplanationParams): ExplanationResult {
  const details: string[] = [];

  const questions: string[] = [];

  let summary =
    "현재 입력 조건에서는 전체 비교 결과를 확정할 수 없습니다.";

  if (
    currentResult.totalAnnualCost !==
      null &&
    targetResult?.totalAnnualCost !==
      null &&
    targetResult
  ) {
    const currentCost =
      currentResult.totalAnnualCost;

    const targetCost =
      targetResult.totalAnnualCost;

    const difference =
      Math.abs(
        currentCost -
          targetCost
      );

    if (
      currentCost <
      targetCost
    ) {
      summary =
        `현재 입력 조건에서는 현재 계약 유지의 1년 예상 총부담이 ${difference.toLocaleString()}원 낮습니다.`;
    } else if (
      targetCost <
      currentCost
    ) {
      summary =
        `현재 입력 조건에서는 5세대 전환의 1년 예상 총부담이 ${difference.toLocaleString()}원 낮습니다.`;
    } else {
      summary =
        "현재 입력 조건에서는 두 선택지의 1년 예상 총부담이 같습니다.";
    }
  }

  coverageGaps.forEach(
    (gap) => {
      if (
        gap.type ===
        "SELF_PAYMENT_INCREASE"
      ) {
        details.push(
          `${gap.treatmentName}: 5세대 전환 시 자기부담금이 ${(
            gap.differenceAmount ??
            0
          ).toLocaleString()}원 증가합니다.`
        );
      }

      if (
        gap.type ===
        "COVERAGE_EXCLUDED"
      ) {
        details.push(
          `${gap.treatmentName}: 5세대 조건에서 ${(
            gap.targetExcluded ??
            0
          ).toLocaleString()}원이 보장 제외 의료비로 계산되었습니다.`
        );
      }

      if (
        gap.type ===
        "INPUT_CONFIRMATION_REQUIRED"
      ) {
        questions.push(
          `${gap.treatmentName}의 급여 여부와 중증 구분을 보험사에 확인해주세요.`
        );
      }

      if (
        gap.type ===
        "CALCULATION_CONFIRMATION_REQUIRED"
      ) {
        questions.push(
          `${gap.treatmentName}의 실제 보장 여부와 자기부담 조건을 보험사에 확인해주세요.`
        );
      }
    }
  );

  breakEvenResults.forEach(
    (result) => {
      if (
        result.status ===
        "AVAILABLE"
      ) {
        details.push(
          result.message
        );
      }
    }
  );

  questions.push(
    "5세대 전환 시 실제 적용되는 월 보험료와 전환 가능 조건을 보험사에 확인해주세요."
  );

  return {
    summary,

    details:
      Array.from(
        new Set(details)
      ),

    questions:
      Array.from(
        new Set(questions)
      ),
  };
}