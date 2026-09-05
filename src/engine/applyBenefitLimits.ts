import type {
  BenefitLimit,
} from "../domain/calculation";

export interface ApplyBenefitLimitsResult {
  /**
   * 지급한도 적용 전 보험금 q
   */
  preLimitBenefit: number;

  /**
   * 최종 모의 보험금 I
   */
  insuranceBenefit: number | null;

  /**
   * 지급한도 때문에 보전되지 않는 금액 U = q - I
   */
  limitExceededAmount: number | null;

  /**
   * 실제 계산에 반영된 한도 ID
   */
  appliedLimitIds: string[];

  warning: string | null;
}

interface ApplyBenefitLimitsParams {
  /**
   * 지급한도 적용 전 보험금 q
   */
  preLimitBenefit: number;

  /**
   * 현재 계산 단위에 적용되는 한도들.
   *
   * 예:
   * - 연간 잔여한도
   * - 통원 일당 잔여한도
   * - 입원 회당 잔여한도
   * - 연간 통원일수 한도
   *
   * 해당하지 않는 한도는 배열에 넣지 않는다.
   */
  limits?: BenefitLimit[];
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
 * 지급한도 적용
 *
 * 각 금액 한도에 대해:
 *
 *   L_remaining = MAX(0, L_total - L_used)
 *
 * 최종 보험금:
 *
 *   I = MAX(0, MIN(q, 모든 해당 L_remaining))
 *
 * 한도초과 미보상액:
 *
 *   U = q - I
 *
 * 횟수 한도는 이미 한도를 모두 사용한 경우
 * 이번 계산 단위의 지급가능액을 0원으로 만든다.
 *
 * 중요:
 * - 미확인 한도를 "무제한"으로 임의 처리하지 않는다.
 * - 해당하지 않는 한도는 애초에 limits 배열에서 제외한다.
 */
export function applyBenefitLimits({
  preLimitBenefit,
  limits = [],
}: ApplyBenefitLimitsParams): ApplyBenefitLimitsResult {
  if (
    !isFiniteNonNegative(
      preLimitBenefit
    )
  ) {
    return {
      preLimitBenefit:
        Number.isFinite(
          preLimitBenefit
        )
          ? preLimitBenefit
          : 0,

      insuranceBenefit: null,
      limitExceededAmount: null,
      appliedLimitIds: [],

      warning:
        "지급한도 적용 전 보험금(q)을 확인해주세요.",
    };
  }

  /**
   * 적용되는 지급한도가 없다면
   * I = q, U = 0
   */
  if (limits.length === 0) {
    return {
      preLimitBenefit,
      insuranceBenefit:
        preLimitBenefit,
      limitExceededAmount: 0,
      appliedLimitIds: [],
      warning: null,
    };
  }

  let payableCap =
    preLimitBenefit;

  const appliedLimitIds:
    string[] = [];

  for (const limit of limits) {
    if (
      !limit.id ||
      !limit.type
    ) {
      return {
        preLimitBenefit,
        insuranceBenefit: null,
        limitExceededAmount: null,
        appliedLimitIds,

        warning:
          "지급한도 정보 형식이 올바르지 않습니다.",
      };
    }

    /**
     * 금액 한도가 있는 경우
     * 잔여 지급가능액을 계산한다.
     */
    if (
      limit.amount !== undefined
    ) {
      if (
        !isFiniteNonNegative(
          limit.amount
        )
      ) {
        return {
          preLimitBenefit,
          insuranceBenefit: null,
          limitExceededAmount: null,
          appliedLimitIds,

          warning:
            `${limit.id}의 지급한도 금액을 확인해주세요.`,
        };
      }

      if (
        limit.usedAmount ===
        undefined
      ) {
        return {
          preLimitBenefit,
          insuranceBenefit: null,
          limitExceededAmount: null,
          appliedLimitIds,

          warning:
            `${limit.id}의 기존 사용금액을 확인해주세요.`,
        };
      }

      if (
        !isFiniteNonNegative(
          limit.usedAmount
        )
      ) {
        return {
          preLimitBenefit,
          insuranceBenefit: null,
          limitExceededAmount: null,
          appliedLimitIds,

          warning:
            `${limit.id}의 기존 사용금액을 확인해주세요.`,
        };
      }

      const remainingAmount =
        Math.max(
          0,
          limit.amount -
            limit.usedAmount
        );

      payableCap = Math.min(
        payableCap,
        remainingAmount
      );

      appliedLimitIds.push(
        limit.id
      );
    }

    /**
     * 횟수 한도.
     *
     * 예: 연 100일.
     *
     * 이번 계산 단위가 이미 한도 소진 후라면
     * 지급가능액은 0원.
     *
     * 아직 남아 있으면 이번 1개 계산 단위에 대해서는
     * 별도 금액 제한을 추가하지 않는다.
     */
    if (
      limit.count !== undefined
    ) {
      if (
        !Number.isInteger(
          limit.count
        ) ||
        limit.count < 0
      ) {
        return {
          preLimitBenefit,
          insuranceBenefit: null,
          limitExceededAmount: null,
          appliedLimitIds,

          warning:
            `${limit.id}의 횟수 한도를 확인해주세요.`,
        };
      }

      if (
        limit.usedCount ===
        undefined
      ) {
        return {
          preLimitBenefit,
          insuranceBenefit: null,
          limitExceededAmount: null,
          appliedLimitIds,

          warning:
            `${limit.id}의 기존 사용횟수를 확인해주세요.`,
        };
      }

      if (
        !Number.isInteger(
          limit.usedCount
        ) ||
        limit.usedCount < 0
      ) {
        return {
          preLimitBenefit,
          insuranceBenefit: null,
          limitExceededAmount: null,
          appliedLimitIds,

          warning:
            `${limit.id}의 기존 사용횟수를 확인해주세요.`,
        };
      }

      if (
        limit.usedCount >=
        limit.count
      ) {
        payableCap = 0;
      }

      if (
        !appliedLimitIds.includes(
          limit.id
        )
      ) {
        appliedLimitIds.push(
          limit.id
        );
      }
    }

    /**
     * 금액/횟수 어느 쪽도 없는 한도는
     * 계산 규칙이 불완전한 것으로 본다.
     */
    if (
      limit.amount === undefined &&
      limit.count === undefined
    ) {
      return {
        preLimitBenefit,
        insuranceBenefit: null,
        limitExceededAmount: null,
        appliedLimitIds,

        warning:
          `${limit.id}의 지급한도 기준을 확인해주세요.`,
      };
    }
  }

  const insuranceBenefit =
    Math.max(
      0,
      Math.min(
        preLimitBenefit,
        payableCap
      )
    );

  const limitExceededAmount =
    preLimitBenefit -
    insuranceBenefit;

  return {
    preLimitBenefit,
    insuranceBenefit,
    limitExceededAmount,
    appliedLimitIds,
    warning: null,
  };
}