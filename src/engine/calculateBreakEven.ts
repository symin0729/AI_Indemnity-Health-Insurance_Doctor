export type BreakEvenStatus =
  | "AVAILABLE"
  | "UNAVAILABLE";

export interface BreakEvenResult {
  status: BreakEvenStatus;

  breakEvenTreatmentCost:
    number | null;

  breakEvenFrequency:
    number | null;

  firstWholeFrequency:
    number | null;

  direction:
    | "CURRENT_BECOMES_LOWER"
    | "TARGET_BECOMES_LOWER"
    | null;

  message: string;

  reason: string | null;
}

interface CalculateBreakEvenParams {
  currentAnnualPremium: number;

  targetAnnualPremium: number;

  treatmentCost: number;

  unitCost: number;

  currentSelfPayment:
    number | null;

  targetSelfPayment:
    number | null;
}

export function calculateBreakEven({
  currentAnnualPremium,
  targetAnnualPremium,
  treatmentCost,
  unitCost,
  currentSelfPayment,
  targetSelfPayment,
}: CalculateBreakEvenParams): BreakEvenResult {
  if (
    currentSelfPayment === null ||
    targetSelfPayment === null
  ) {
    return {
      status: "UNAVAILABLE",

      breakEvenTreatmentCost: null,

      breakEvenFrequency: null,

      firstWholeFrequency: null,

      direction: null,

      message:
        "손익분기점을 계산할 수 없습니다.",

      reason:
        "현재 계약 또는 5세대의 자기부담금 계산 결과가 확인되지 않았습니다.",
    };
  }

  if (
    treatmentCost <= 0 ||
    unitCost <= 0
  ) {
    return {
      status: "UNAVAILABLE",

      breakEvenTreatmentCost: null,

      breakEvenFrequency: null,

      firstWholeFrequency: null,

      direction: null,

      message:
        "손익분기점을 계산할 수 없습니다.",

      reason:
        "치료비와 회당 비용은 0원보다 커야 합니다.",
    };
  }

  /*
   * 현재 입력값을 이용해
   * 단순 자기부담률 산출
   */
  const currentRate =
    currentSelfPayment /
    treatmentCost;

  const targetRate =
    targetSelfPayment /
    treatmentCost;

  const rateDifference =
    currentRate -
    targetRate;

  /*
   * 두 계약 자기부담률 동일
   */
  if (
    Math.abs(rateDifference) <
    0.000001
  ) {
    return {
      status: "UNAVAILABLE",

      breakEvenTreatmentCost: null,

      breakEvenFrequency: null,

      firstWholeFrequency: null,

      direction: null,

      message:
        "단일 손익분기점이 없습니다.",

      reason:
        "두 선택지의 현재 계산 자기부담률이 동일합니다.",
    };
  }

  /*
   * currentPremium + currentRate × X
   * =
   * targetPremium + targetRate × X
   *
   * X =
   * (targetPremium - currentPremium)
   * /
   * (currentRate - targetRate)
   */

  const breakEvenTreatmentCost =
    (
      targetAnnualPremium -
      currentAnnualPremium
    ) /
    rateDifference;

  if (
    !Number.isFinite(
      breakEvenTreatmentCost
    ) ||
    breakEvenTreatmentCost <= 0
  ) {
    return {
      status: "UNAVAILABLE",

      breakEvenTreatmentCost: null,

      breakEvenFrequency: null,

      firstWholeFrequency: null,

      direction: null,

      message:
        "현재 조건에서는 유효한 손익분기점이 없습니다.",

      reason:
        "계산된 손익분기 치료비가 양의 값이 아닙니다.",
    };
  }

  const breakEvenFrequency =
    breakEvenTreatmentCost /
    unitCost;

  const firstWholeFrequency =
    Math.ceil(
      breakEvenFrequency
    );

  let direction:
    | "CURRENT_BECOMES_LOWER"
    | "TARGET_BECOMES_LOWER";

  /*
   * 치료비가 증가할수록
   * 자기부담률이 작은 계약이 유리해짐
   */
  if (
    currentRate <
    targetRate
  ) {
    direction =
      "CURRENT_BECOMES_LOWER";
  } else {
    direction =
      "TARGET_BECOMES_LOWER";
  }

  const directionText =
    direction ===
    "CURRENT_BECOMES_LOWER"
      ? "현재 계약 유지"
      : "5세대 전환";

  return {
    status: "AVAILABLE",

    breakEvenTreatmentCost:
      Math.round(
        breakEvenTreatmentCost
      ),

    breakEvenFrequency,

    firstWholeFrequency,

    direction,

    message:
      `연간 치료 횟수가 약 ${breakEvenFrequency.toFixed(
        2
      )}회 수준이 되면 두 선택지의 예상 총부담이 같아집니다. 정수 기준으로는 ${firstWholeFrequency}회 부근부터 ${directionText} 쪽이 상대적으로 낮아질 수 있습니다.`,

    reason: null,
  };
}