/**
 * AI 실손 닥터 - 손익분기 계산 (mvp-v2)
 *
 * 이 파일은 두 경로를 함께 제공한다.
 *
 * 1) calculateBreakEven()
 *    - 기존 M04 화면 호환용 단순식
 *    - 회당 부담 차이가 일정하다는 전제에서만 사용
 *
 * 2) calculateBreakEvenBySimulation()
 *    - mvp-v2 정식 손익분기 계산
 *    - 각 횟수를 전체 계산 엔진에 다시 넣은 결과를 받아
 *      실제 총부담 역전 구간을 탐색한다.
 */

/* =========================================================
 * 기존 M04 호환용 타입
 * ======================================================= */

export type BreakEvenStatus =
  | "AVAILABLE"
  | "UNAVAILABLE";

export interface BreakEvenResult {
  status: BreakEvenStatus;

  /**
   * 연속값 기준 손익분기 횟수.
   * 예: 12.0회 부근.
   */
  breakEvenFrequency:
    number | null;

  /**
   * 손익분기점을 지난 첫 정수 횟수.
   * 예: 12회가 동률이면 13.
   */
  firstWholeFrequency:
    number | null;

  /**
   * breakEvenFrequency × unitCost
   */
  breakEvenTreatmentCost:
    number | null;

  message: string;

  reason: string | null;
}

interface CalculateBreakEvenParams {
  currentAnnualPremium: number;
  targetAnnualPremium: number;

  /**
   * 현재 입력된 연간 치료비 합계.
   */
  treatmentCost: number;

  /**
   * 회당 치료비.
   */
  unitCost: number;

  /**
   * 현재 입력 횟수 전체에 대한 자기부담금.
   *
   * 기존 M04 호환용 값이며,
   * mvp-v2 정식 손익분기에서는 사용하지 않는다.
   */
  currentSelfPayment:
    number | null;

  /**
   * 현재 입력 횟수 전체에 대한 5세대 자기부담금.
   */
  targetSelfPayment:
    number | null;
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

function unavailable(
  reason: string
): BreakEvenResult {
  return {
    status: "UNAVAILABLE",
    breakEvenFrequency: null,
    firstWholeFrequency: null,
    breakEvenTreatmentCost: null,
    message:
      "현재 조건에서는 단일 손익분기점을 계산하지 않습니다.",
    reason,
  };
}

/**
 * 기존 화면 호환용 단순 손익분기식.
 *
 * 보험료 절감액:
 *   S = currentPremium - targetPremium
 *
 * 전환 후 회당 추가 의료비 부담:
 *   δ = targetPerUse - currentPerUse
 *
 * 단순 손익분기:
 *   n* = S / δ
 *
 * 이 식은 회당 차이가 일정하고
 * 공제·한도·상한·할증 등의 구간 변화가 없다는
 * 전제에서만 의미가 있다.
 */
export function calculateBreakEven({
  currentAnnualPremium,
  targetAnnualPremium,
  treatmentCost,
  unitCost,
  currentSelfPayment,
  targetSelfPayment,
}: CalculateBreakEvenParams): BreakEvenResult {
  if (
    !isFiniteNonNegative(
      currentAnnualPremium
    ) ||
    !isFiniteNonNegative(
      targetAnnualPremium
    )
  ) {
    return unavailable(
      "연간 보험료를 확인해주세요."
    );
  }

  if (
    !Number.isFinite(unitCost) ||
    unitCost <= 0
  ) {
    return unavailable(
      "회당 치료비를 확인해주세요."
    );
  }

  if (
    !Number.isFinite(
      treatmentCost
    ) ||
    treatmentCost <= 0
  ) {
    return unavailable(
      "현재 입력된 치료비를 확인해주세요."
    );
  }

  if (
    currentSelfPayment === null ||
    targetSelfPayment === null
  ) {
    return unavailable(
      "현재 계약 또는 5세대의 자기부담 조건이 확인되지 않아 단순 손익분기점을 계산하지 않습니다."
    );
  }

  if (
    !isFiniteNonNegative(
      currentSelfPayment
    ) ||
    !isFiniteNonNegative(
      targetSelfPayment
    )
  ) {
    return unavailable(
      "자기부담금 계산값을 확인해주세요."
    );
  }

  const currentFrequency =
    treatmentCost / unitCost;

  if (
    !Number.isFinite(
      currentFrequency
    ) ||
    currentFrequency <= 0
  ) {
    return unavailable(
      "현재 치료 횟수를 계산할 수 없습니다."
    );
  }

  const currentPerUse =
    currentSelfPayment /
    currentFrequency;

  const targetPerUse =
    targetSelfPayment /
    currentFrequency;

  const premiumSaving =
    currentAnnualPremium -
    targetAnnualPremium;

  const extraBurdenPerUse =
    targetPerUse -
    currentPerUse;

  /**
   * 5세대 보험료가 더 싸다는 출발점이 없으면
   * "보험료 절감 vs 의료비 증가" 형태의
   * 단순 손익분기식으로 해석하지 않는다.
   */
  if (premiumSaving <= 0) {
    return unavailable(
      "5세대의 연간 보험료 절감액이 양수가 아니므로 기존 단순 손익분기식의 전제가 성립하지 않습니다."
    );
  }

  /**
   * 5세대의 회당 의료비 부담이 증가하지 않는다면
   * S / δ 형태의 유한한 양의 분기점을 만들 수 없다.
   */
  if (extraBurdenPerUse <= 0) {
    return unavailable(
      "5세대의 회당 추가 의료비 부담이 양수가 아니므로 유한한 양의 손익분기점을 단정하지 않습니다."
    );
  }

  const breakEvenFrequency =
    premiumSaving /
    extraBurdenPerUse;

  if (
    !Number.isFinite(
      breakEvenFrequency
    ) ||
    breakEvenFrequency < 0
  ) {
    return unavailable(
      "손익분기 횟수를 계산할 수 없습니다."
    );
  }

  /**
   * 정확히 12회가 동률이라면
   * 결론이 바뀌는 첫 정수는 13회.
   */
  const firstWholeFrequency =
    Math.floor(
      breakEvenFrequency
    ) + 1;

  const breakEvenTreatmentCost =
    breakEvenFrequency *
    unitCost;

  return {
    status: "AVAILABLE",

    breakEvenFrequency,

    firstWholeFrequency,

    breakEvenTreatmentCost,

    message:
      `${breakEvenFrequency.toFixed(
        2
      )}회 부근에서 두 선택지의 단순 예상 부담이 비슷해집니다. ` +
      `${firstWholeFrequency}회부터는 현재 계약 유지가 더 낮아질 가능성을 확인해야 합니다.`,

    reason: null,
  };
}

/* =========================================================
 * mvp-v2 정식 손익분기 탐색
 * ======================================================= */

export type BreakEvenPreferredOption =
  | "CURRENT"
  | "TARGET_5G"
  | "TIE";

export interface BreakEvenSimulationEvaluation {
  currentTotalBurden:
    number | null;

  targetTotalBurden:
    number | null;

  warnings?: string[];
}

export interface BreakEvenSimulationPoint {
  frequency: number;

  currentTotalBurden: number;
  targetTotalBurden: number;

  /**
   * current - target
   *
   * 양수: TARGET_5G가 낮음
   * 음수: CURRENT가 낮음
   * 0: 동률
   */
  difference: number;

  preferred:
    BreakEvenPreferredOption;
}

export interface BreakEvenReversalInterval {
  /**
   * 역전이 발생한 것으로 확인되는 탐색 구간.
   *
   * 예:
   * 11회 TARGET_5G 우세
   * 12회 동률
   * 13회 CURRENT 우세
   *
   * → fromFrequency=11
   * → toFrequency=13
   */
  fromFrequency: number;
  toFrequency: number;

  fromPreferred:
    Exclude<
      BreakEvenPreferredOption,
      "TIE"
    >;

  toPreferred:
    Exclude<
      BreakEvenPreferredOption,
      "TIE"
    >;

  tieFrequencies: number[];
}

export type BreakEvenSimulationStatus =
  | "AVAILABLE"
  | "NO_REVERSAL"
  | "MULTIPLE_REVERSALS"
  | "CONFIRMATION_REQUIRED";

export interface BreakEvenSimulationResult {
  status:
    BreakEvenSimulationStatus;

  method: "DISCRETE_SEARCH";

  rangeChecked: {
    min: number;
    max: number;
  };

  /**
   * 첫 동률 횟수 또는
   * 첫 역전구간의 도착 횟수.
   */
  threshold:
    number | null;

  exactTieFrequencies:
    number[];

  reversalIntervals:
    BreakEvenReversalInterval[];

  points:
    BreakEvenSimulationPoint[];

  warnings: string[];

  message: string;
}

export interface CalculateBreakEvenBySimulationParams {
  /**
   * 기본값 0.
   */
  minFrequency?: number;

  /**
   * 기본값 50.
   */
  maxFrequency?: number;

  /**
   * 부동소수 오차를 동률로 볼 허용치.
   * 원 단위 계산이라면 기본값 0.000001이면 충분하다.
   */
  equalityTolerance?: number;

  /**
   * 중요:
   * frequency를 바꾼 뒤
   * 반드시 CURRENT / TARGET_5G 전체 계산 엔진을
   * 다시 실행한 결과를 반환해야 한다.
   *
   * 단순 자기부담률 곱셈 콜백으로 대체하면 안 된다.
   */
  evaluate: (
    frequency: number
  ) => BreakEvenSimulationEvaluation;
}

const MAX_BREAK_EVEN_SEARCH_POINTS = 10_001;

function preferredFromDifference(
  difference: number,
  tolerance: number
): BreakEvenPreferredOption {
  if (
    Math.abs(difference) <=
    tolerance
  ) {
    return "TIE";
  }

  return difference > 0
    ? "TARGET_5G"
    : "CURRENT";
}

/**
 * 실제 앱용 손익분기 탐색.
 *
 * 0회~최대 탐색 횟수까지 하나씩 바꾸면서
 * 전체 엔진 결과의 T_CURRENT, T_TARGET_5G를 비교한다.
 *
 * 이 방식은 다음과 같은 비선형 구조를 그대로 반영할 수 있다.
 *
 * - 최소공제
 * - 일당/회당/연간 지급한도
 * - 자기부담 상한
 * - 횟수 한도
 * - 기타 구간별 룰
 *
 * 역전이 없으면 NO_REVERSAL,
 * 여러 번 역전되면 MULTIPLE_REVERSALS로 반환한다.
 */
export function calculateBreakEvenBySimulation({
  minFrequency = 0,
  maxFrequency = 50,
  equalityTolerance = 0.000001,
  evaluate,
}: CalculateBreakEvenBySimulationParams): BreakEvenSimulationResult {
  if (
    !Number.isInteger(
      minFrequency
    ) ||
    !Number.isInteger(
      maxFrequency
    ) ||
    minFrequency < 0 ||
    maxFrequency < minFrequency ||
    maxFrequency - minFrequency + 1 >
      MAX_BREAK_EVEN_SEARCH_POINTS ||
    !Number.isFinite(
      equalityTolerance
    ) ||
    equalityTolerance < 0
  ) {
    return {
      status:
        "CONFIRMATION_REQUIRED",

      method:
        "DISCRETE_SEARCH",

      rangeChecked: {
        min:
          Math.max(
            0,
            Number.isFinite(
              minFrequency
            )
              ? minFrequency
              : 0
          ),

        max:
          Math.max(
            0,
            Number.isFinite(
              maxFrequency
            )
              ? maxFrequency
              : 0
          ),
      },

      threshold: null,

      exactTieFrequencies: [],
      reversalIntervals: [],
      points: [],

      warnings: [
        "손익분기 탐색 범위와 동률 허용치를 확인해주세요.",
      ],

      message:
        "손익분기 탐색을 실행할 수 없습니다.",
    };
  }

  const points:
    BreakEvenSimulationPoint[] =
    [];

  const warnings:
    string[] = [];

  for (
    let frequency =
      minFrequency;
    frequency <=
    maxFrequency;
    frequency += 1
  ) {
    let evaluated:
      BreakEvenSimulationEvaluation;

    try {
      evaluated =
        evaluate(frequency);
    } catch {
      return {
        status:
          "CONFIRMATION_REQUIRED",

        method:
          "DISCRETE_SEARCH",

        rangeChecked: {
          min:
            minFrequency,
          max:
            maxFrequency,
        },

        threshold: null,

        exactTieFrequencies: [],
        reversalIntervals: [],
        points,

        warnings:
          Array.from(
            new Set([
              ...warnings,
              `${frequency}회 조건의 총부담 계산 중 오류가 발생했습니다.`,
            ])
          ),

        message:
          "손익분기 탐색 중 계산 오류가 발생해 결과를 확정하지 않습니다.",
      };
    }

    if (
      evaluated.warnings
    ) {
      warnings.push(
        ...evaluated.warnings
      );
    }

    if (
      evaluated
        .currentTotalBurden ===
        null ||
      evaluated
        .targetTotalBurden ===
        null
    ) {
      return {
        status:
          "CONFIRMATION_REQUIRED",

        method:
          "DISCRETE_SEARCH",

        rangeChecked: {
          min:
            minFrequency,
          max:
            maxFrequency,
        },

        threshold: null,

        exactTieFrequencies: [],
        reversalIntervals: [],
        points,

        warnings:
          Array.from(
            new Set([
              ...warnings,
              `${frequency}회 조건에서 총부담을 확정할 수 없어 손익분기 탐색을 중단했습니다.`,
            ])
          ),

        message:
          "미확인 계산 조건이 있어 손익분기점을 확정하지 않습니다.",
      };
    }

    const currentTotalBurden =
      evaluated
        .currentTotalBurden;

    const targetTotalBurden =
      evaluated
        .targetTotalBurden;

    if (
      !isFiniteNonNegative(
        currentTotalBurden
      ) ||
      !isFiniteNonNegative(
        targetTotalBurden
      )
    ) {
      return {
        status:
          "CONFIRMATION_REQUIRED",

        method:
          "DISCRETE_SEARCH",

        rangeChecked: {
          min:
            minFrequency,
          max:
            maxFrequency,
        },

        threshold: null,

        exactTieFrequencies: [],
        reversalIntervals: [],
        points,

        warnings:
          Array.from(
            new Set([
              ...warnings,
              `${frequency}회 조건의 총부담 값이 올바르지 않습니다.`,
            ])
          ),

        message:
          "손익분기 탐색 중 잘못된 총부담 값이 확인되었습니다.",
      };
    }

    const difference =
      currentTotalBurden -
      targetTotalBurden;

    points.push({
      frequency,

      currentTotalBurden,

      targetTotalBurden,

      difference,

      preferred:
        preferredFromDifference(
          difference,
          equalityTolerance
        ),
    });
  }

  const exactTieFrequencies =
    points
      .filter(
        (point) =>
          point.preferred ===
          "TIE"
      )
      .map(
        (point) =>
          point.frequency
      );

  const reversalIntervals:
    BreakEvenReversalInterval[] =
    [];

  let previousNonTie:
    BreakEvenSimulationPoint
    | null = null;

  let tiesSincePrevious:
    number[] = [];

  for (const point of points) {
    if (
      point.preferred === "TIE"
    ) {
      if (previousNonTie) {
        tiesSincePrevious.push(
          point.frequency
        );
      }

      continue;
    }

    if (
      previousNonTie &&
      previousNonTie.preferred !==
        point.preferred
    ) {
      reversalIntervals.push({
        fromFrequency:
          previousNonTie
            .frequency,

        toFrequency:
          point.frequency,

        fromPreferred:
          previousNonTie
            .preferred as
            | "CURRENT"
            | "TARGET_5G",

        toPreferred:
          point.preferred as
            | "CURRENT"
            | "TARGET_5G",

        tieFrequencies: [
          ...tiesSincePrevious,
        ],
      });
    }

    previousNonTie =
      point;

    tiesSincePrevious = [];
  }

  const firstTie =
    exactTieFrequencies[0];

  const firstReversal =
    reversalIntervals[0];

  const threshold =
    firstTie ??
    firstReversal
      ?.toFrequency ??
    null;

  const uniqueWarnings =
    Array.from(
      new Set(warnings)
    );

  if (
    reversalIntervals.length >
    1
  ) {
    return {
      status:
        "MULTIPLE_REVERSALS",

      method:
        "DISCRETE_SEARCH",

      rangeChecked: {
        min:
          minFrequency,
        max:
          maxFrequency,
      },

      threshold,

      exactTieFrequencies,
      reversalIntervals,
      points,

      warnings:
        uniqueWarnings,

      message:
        `탐색 범위 ${minFrequency}~${maxFrequency}회에서 결과가 여러 번 역전됩니다. 단일 손익분기점 대신 모든 역전 구간을 표시해야 합니다.`,
    };
  }

  if (
    reversalIntervals.length ===
      1 ||
    exactTieFrequencies.length >
      0
  ) {
    return {
      status: "AVAILABLE",

      method:
        "DISCRETE_SEARCH",

      rangeChecked: {
        min:
          minFrequency,
        max:
          maxFrequency,
      },

      threshold,

      exactTieFrequencies,
      reversalIntervals,
      points,

      warnings:
        uniqueWarnings,

      message:
        exactTieFrequencies.length >
        0
          ? `${exactTieFrequencies[0]}회에서 두 선택지의 총부담이 같습니다.`
          : `탐색 범위에서 ${firstReversal?.fromFrequency}회와 ${firstReversal?.toFrequency}회 사이에 우세 선택지가 바뀝니다.`,
    };
  }

  return {
    status: "NO_REVERSAL",

    method:
      "DISCRETE_SEARCH",

    rangeChecked: {
      min:
        minFrequency,
      max:
        maxFrequency,
    },

    threshold: null,

    exactTieFrequencies,
    reversalIntervals,
    points,

    warnings:
      uniqueWarnings,

    message:
      `계산 범위 ${minFrequency}~${maxFrequency}회 내에서는 총부담 결과의 역전이 확인되지 않았습니다.`,
  };
}
