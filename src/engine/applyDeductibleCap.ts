import type {
  DeductibleCapState,
} from "../domain/calculation";

export interface ApplyDeductibleCapResult {
  /**
   * 기본 자기부담액 d
   */
  baseDeductible: number;

  /**
   * 자기부담 상한 반영 후 d*
   */
  adjustedDeductible:
    | number
    | null;

  /**
   * 상한 적용 직전 누적액 S_prev
   */
  previousUsedAmount:
    | number
    | null;

  /**
   * 상한 적용 직전 남은 금액 R_H
   */
  remainingCapBefore:
    | number
    | null;

  /**
   * 이번 계산 후 누적액 S_next
   */
  nextUsedAmount:
    | number
    | null;

  /**
   * 실제로 d가 줄어들었는지 여부
   */
  capApplied: boolean;

  warning: string | null;
}

interface ApplyDeductibleCapParams {
  /**
   * 기본 자기부담액 d
   */
  baseDeductible: number;

  /**
   * 자기부담 상한 상태.
   * 상한 미적용 룰이면 undefined/null로 전달한다.
   */
  capState?:
    | DeductibleCapState
    | null;
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

/**
 * 자기부담 상한 적용
 *
 * 약관상 이번 진료가 상한 적용 대상이면:
 *
 *   R_H = MAX(0, H - S_prev)
 *   d*  = MIN(d, R_H)
 *   S_next = S_prev + d*
 *
 * 상한 비대상이면:
 *
 *   d* = d
 *   S_next = S_prev
 *
 * 중요:
 * - 보장 제외액 E
 * - 지급한도 초과액 U
 *
 * 는 이 누적액에 자동 가산하지 않는다.
 */
export function applyDeductibleCap({
  baseDeductible,
  capState,
}: ApplyDeductibleCapParams): ApplyDeductibleCapResult {
  if (
    !isFiniteNonNegative(
      baseDeductible
    )
  ) {
    return {
      baseDeductible:
        Number.isFinite(
          baseDeductible
        )
          ? baseDeductible
          : 0,

      adjustedDeductible: null,
      previousUsedAmount: null,
      remainingCapBefore: null,
      nextUsedAmount: null,
      capApplied: false,

      warning:
        "기본 자기부담액을 확인해주세요.",
    };
  }

  /**
   * 상한 자체가 없는 룰.
   */
  if (!capState) {
    return {
      baseDeductible,
      adjustedDeductible:
        baseDeductible,

      previousUsedAmount: null,
      remainingCapBefore: null,
      nextUsedAmount: null,

      capApplied: false,
      warning: null,
    };
  }

  if (
    !isFiniteNonNegative(
      capState.capAmount
    ) ||
    !isFiniteNonNegative(
      capState.usedAmount
    )
  ) {
    return {
      baseDeductible,
      adjustedDeductible: null,

      previousUsedAmount:
        isFiniteNonNegative(
          capState.usedAmount
        )
          ? capState.usedAmount
          : null,

      remainingCapBefore: null,
      nextUsedAmount: null,

      capApplied: false,

      warning:
        "자기부담 상한 금액 또는 누적액을 확인해주세요.",
    };
  }

  const previousUsedAmount =
    capState.usedAmount;

  /**
   * 상한 규칙은 존재하지만
   * 이번 계산 단위가 상한 적용 대상이 아닌 경우.
   */
  if (!capState.eligible) {
    return {
      baseDeductible,

      adjustedDeductible:
        baseDeductible,

      previousUsedAmount,

      remainingCapBefore:
        Math.max(
          0,
          capState.capAmount -
            previousUsedAmount
        ),

      /**
       * 비대상 진료는 상한 누적액을
       * 증가시키지 않는다.
       */
      nextUsedAmount:
        previousUsedAmount,

      capApplied: false,
      warning: null,
    };
  }

  const remainingCapBefore =
    Math.max(
      0,
      capState.capAmount -
        previousUsedAmount
    );

  const adjustedDeductible =
    Math.min(
      baseDeductible,
      remainingCapBefore
    );

  const nextUsedAmount =
    previousUsedAmount +
    adjustedDeductible;

  return {
    baseDeductible,

    adjustedDeductible,

    previousUsedAmount,

    remainingCapBefore,

    nextUsedAmount,

    capApplied:
      adjustedDeductible <
      baseDeductible,

    warning: null,
  };
}
