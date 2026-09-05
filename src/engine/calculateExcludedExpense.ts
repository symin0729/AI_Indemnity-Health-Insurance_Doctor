import type {
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  BenefitClass,
  SeverityClass,
} from "../domain/medical";

export type ExcludedExpenseStatus =
  | "NONE"
  | "EXCLUDED"
  | "UNKNOWN";

export interface ExcludedExpenseResult {
  /**
   * 보장 제외 금액 E.
   *
   * - NONE: 0
   * - EXCLUDED: 현재 MVP에서는 전액 제외이므로 M
   * - UNKNOWN: null
   */
  amount: number | null;

  status: ExcludedExpenseStatus;

  ruleId: string | null;

  /**
   * 기존 화면/서비스 호환용 상세 사유.
   */
  reason: string;

  /**
   * 새 엔진에서 그대로 노출할 수 있는 경고.
   */
  warning: string | null;
}

interface CalculateExcludedExpenseParams {
  /**
   * M: 실손 보상 전 환자 부담 의료비
   */
  treatmentCost: number;

  generation:
    InsuranceGeneration;

  benefitClass:
    BenefitClass;

  coverages: string[];

  /**
   * 5세대 비급여는
   * 중증 → SPECIAL_RIDER_1
   * 비중증 → SPECIAL_RIDER_2
   * 로 분기하므로 필요하다.
   *
   * 기존 호출부 호환을 위해 optional.
   */
  severityClass?: SeverityClass;

  /**
   * 자기부담 룰이 실제로 매칭되었다면,
   * 현재 계산 경로에서는 해당 의료비를
   * "보장대상 + 자기부담 계산 가능"으로 본다.
   *
   * 따라서 같은 금액을 E로 다시 더하지 않는다.
   */
  hasSupportedSelfPaymentRule?:
    boolean;
}

function unknownResult(
  reason: string
): ExcludedExpenseResult {
  return {
    amount: null,
    status: "UNKNOWN",
    ruleId: null,
    reason,
    warning: reason,
  };
}

function noneResult(
  reason: string
): ExcludedExpenseResult {
  return {
    amount: 0,
    status: "NONE",
    ruleId: null,
    reason,
    warning: null,
  };
}

function excludedResult(
  amount: number,
  reason: string
): ExcludedExpenseResult {
  return {
    amount,
    status: "EXCLUDED",
    ruleId: "G5_EXCLUSION",
    reason,
    warning: null,
  };
}

/**
 * 보장 제외 금액 E 판정
 *
 * 새 계산명세 원칙:
 *
 * 1. 보장 여부 필터가 자기부담 계산보다 먼저다.
 * 2. 담보 미가입 또는 보장 제외가 확정되면
 *      C = 0
 *      E = M
 *      I = 0
 * 3. 미확인 조건을 0원 또는 보장 대상으로 임의 확정하지 않는다.
 *
 * 현재 이 함수가 확정적으로 처리하는 범위:
 *
 * - 5세대 급여:
 *   비급여 특약 미가입 분기의 대상이 아니므로 E=0
 *
 * - 5세대 중증 비급여:
 *   SPECIAL_RIDER_1 미가입이면 전액 제외
 *
 * - 5세대 비중증 비급여:
 *   SPECIAL_RIDER_2 미가입이면 전액 제외
 *
 * - 자기부담 룰이 이미 정상 매칭된 경우:
 *   동일 금액을 보장 제외로 중복 계산하지 않으므로 E=0
 *
 * 실제 치료별 약관상 제외·일부 제외는
 * 추후 coverage evaluator에서 별도 확장한다.
 */
export function calculateExcludedExpense({
  treatmentCost,
  generation,
  benefitClass,
  coverages,
  severityClass,
  hasSupportedSelfPaymentRule = false,
}: CalculateExcludedExpenseParams): ExcludedExpenseResult {
  if (
    !Number.isFinite(
      treatmentCost
    ) ||
    treatmentCost < 0
  ) {
    return unknownResult(
      "의료비(M)를 확인할 수 없어 보장 제외 금액(E)을 계산할 수 없습니다."
    );
  }

  if (
    benefitClass === "UNKNOWN"
  ) {
    return unknownResult(
      "급여/비급여 여부가 확인되지 않아 보장 제외 여부를 판단하지 않습니다."
    );
  }

  /**
   * 자기부담 룰이 정상 매칭된 경우:
   *
   * 이미 현재 룰셋에서
   * 보장대상 계산 경로가 확인된 것이므로
   * E를 다시 더하지 않는다.
   */
  if (
    hasSupportedSelfPaymentRule
  ) {
    return noneResult(
      "자기부담 계산 룰이 정상 매칭되어 같은 의료비를 보장 제외 금액으로 중복 계산하지 않습니다."
    );
  }

  /**
   * 1~4세대는 개별 계약 약관이 없으면
   * 보장 제외 여부를 임의 확정하지 않는다.
   */
  if (generation !== 5) {
    return unknownResult(
      "현재 계약의 개별 약관상 보장 제외 조건이 확인되지 않아 E를 확정하지 않습니다."
    );
  }

  /**
   * 5세대 급여는
   * 아래 비급여 특약 미가입 분기의 대상이 아니다.
   *
   * 치료별 별도 제외 조건이 있을 수 있으므로
   * 정밀 계산 단계에서는 별도 coverage evaluator가 필요하다.
   */
  if (
    benefitClass === "COVERED"
  ) {
    return noneResult(
      "5세대 급여 항목은 현재 구현된 비급여 특약 미가입 보장 제외 분기의 대상이 아닙니다."
    );
  }

  /**
   * 여기부터 5세대 비급여.
   * 중증/비중증 분류가 없으면
   * 필요한 특약을 결정할 수 없다.
   */
  if (
    severityClass ===
      undefined ||
    severityClass === "UNKNOWN"
  ) {
    return unknownResult(
      "5세대 비급여의 보장 특약을 판단하려면 중증/비중증 구분을 확인해야 합니다."
    );
  }

  if (
    severityClass === "SEVERE"
  ) {
    const hasRider1 =
      coverages.includes(
        "SPECIAL_RIDER_1"
      );

    if (!hasRider1) {
      return excludedResult(
        treatmentCost,
        "5세대 중증 비급여인데 중증 비급여 특약1이 없어 현재 계산 단위의 의료비 전액을 보장 제외 금액(E)으로 분리합니다."
      );
    }

    /**
     * 특약은 있지만 자기부담 룰이
     * 매칭되지 않았다면 치료별 제외 조건 등을
     * 임의로 보장이라고 확정하지 않는다.
     */
    return unknownResult(
      "중증 비급여 특약1은 확인되었지만 해당 치료의 보장대상 여부 또는 자기부담 룰이 완전히 확인되지 않았습니다."
    );
  }

  if (
    severityClass ===
    "NON_SEVERE"
  ) {
    const hasRider2 =
      coverages.includes(
        "SPECIAL_RIDER_2"
      );

    if (!hasRider2) {
      return excludedResult(
        treatmentCost,
        "5세대 비중증 비급여인데 비중증 비급여 특약2가 없어 현재 계산 단위의 의료비 전액을 보장 제외 금액(E)으로 분리합니다."
      );
    }

    return unknownResult(
      "비중증 비급여 특약2는 확인되었지만 해당 치료의 보장대상 여부 또는 자기부담 룰이 완전히 확인되지 않았습니다."
    );
  }

  return unknownResult(
    "보장 제외 여부를 확정할 수 없습니다."
  );
}