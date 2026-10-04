export function calculateAnnualPremium(
  monthlyPremium: number
): number {
  if (
    !Number.isFinite(monthlyPremium) ||
    monthlyPremium < 0
  ) {
    throw new RangeError(
      "월 보험료는 유한한 0 이상의 숫자여야 합니다."
    );
  }

  const annualPremium =
    monthlyPremium * 12;

  if (!Number.isFinite(annualPremium)) {
    throw new RangeError(
      "연 보험료가 계산 가능한 범위를 초과했습니다."
    );
  }

  return annualPremium;
}
