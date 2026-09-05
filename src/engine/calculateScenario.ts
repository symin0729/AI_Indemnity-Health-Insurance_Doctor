import type {
  AnnualCalculationResult,
  BenefitLimit,
  ComparisonOption,
  DeductibleCapState,
  RuleTrace,
} from "../domain/calculation";

import type {
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  MedicalInstitutionType,
  MedicalUsage,
} from "../domain/medical";

import {
  calculateSelfPayment,
} from "./calculateSelfPayment";

import {
  calculateExcludedExpense,
} from "./calculateExcludedExpense";

import {
  calculateClaim,
} from "./calculateClaim";

import type {
  ClaimRule,
  RuleSet,
} from "./loadRuleSet";

export interface ScenarioUsageContext {
  /**
   * 급여 통원 계산에 필요한 실제 건강보험 본인부담률 r.
   * 예: 40% → 0.4
   *
   * MedicalUsage.healthInsuranceCopayRate보다
   * 이 Context 값이 우선한다.
   */
  healthInsuranceCopayRate?: number;

  /**
   * 급여 통원 최소공제액 D 선택용 의료기관 종별.
   */
  institutionType?: MedicalInstitutionType;

  /**
   * 약관상 보장대상 인정금액 C.
   *
   * 실제 비교안별 C가 다를 수 있으므로
   * 정밀 계산에서는 Context에서 주입하는 것이 우선이다.
   */
  coveredAmountPerOccurrence?: number;

  /**
   * 치료군 전용 룰 식별용.
   * 예: MRI / MRA
   */
  treatmentCategory?: string;

  /**
   * 비교 시작 전 지급한도 기존 사용금액.
   * key = benefitLimit.id
   */
  usedBenefitAmountByLimitId?: Record<
    string,
    number
  >;

  /**
   * 비교 시작 전 횟수한도 기존 사용횟수.
   * key = benefitLimit.id
   */
  usedBenefitCountByLimitId?: Record<
    string,
    number
  >;

  /**
   * 자기부담 상한 계산 시작 전 누적 자기부담 S_prev.
   */
  deductibleCapUsedAmount?: number;

  /**
   * 이번 사용건이 자기부담 상한 적용 대상인지.
   */
  deductibleCapEligible?: boolean;
}

export interface ScenarioAssumptions {
  /**
   * true일 때만
   * 보장대상 인정금액 C가 별도로 없으면
   * 입력 의료비 M 전체를 C로 본다.
   */
  assumeEntireMedicalCostCovered: boolean;

  /**
   * true일 때만
   * 비교 시작 전 지급한도/자기부담상한 사용량을
   * 0으로 시작할 수 있다.
   */
  assumeNoPriorLimitUsage: boolean;

  /**
   * frequency가 2 이상이고
   * 날짜·입원 ID 등 실제 묶음 정보가 없을 때,
   * 각 회차를 서로 다른 통원일/입원건으로 보는 가정.
   */
  assumeEachOccurrenceSeparate: boolean;
}

export interface CalculateScenarioParams {
  option: ComparisonOption;

  year: number;

  generation: InsuranceGeneration;

  annualPremium: number | null;

  coverages: string[];

  usages: MedicalUsage[];

  ruleSet: RuleSet;

  /**
   * usage.id별 시나리오 전용 정밀 계산값.
   *
   * 동일 필드가 MedicalUsage에도 있으면
   * usageContexts 값이 우선한다.
   */
  usageContexts?: Record<
    string,
    ScenarioUsageContext
  >;

  assumptions: ScenarioAssumptions;
}

interface LimitAccumulator {
  /**
   * 지급한도는 단순 limit.id만으로 누적하면 안 된다.
   *
   * 예:
   * - 연간한도: 보험연도 단위
   * - 일당한도: 동일 진료일 단위
   * - 입원한도: 동일 입원건 단위
   *
   * 따라서 실제 집계 범위를 포함한 scopeKey로 누적한다.
   */
  usedAmountByScopeKey: Record<
    string,
    number
  >;

  usedCountByScopeKey: Record<
    string,
    number
  >;

  /**
   * VISIT_COUNT는 단순 청구 건수가 아니라
   * 약관상 "통원일수"를 세는 구조다.
   *
   * 같은 날 여러 치료가 있어도 동일 day/group은
   * 한 번만 카운트해야 하므로 이벤트키를 별도로 기억한다.
   */
  countedEventKeys: Record<
    string,
    true
  >;
}

interface DeductibleCapAccumulator {
  usedAmountByScopeKey: Record<
    string,
    number
  >;
}

interface PreparedLimitScope {
  limitId: string;

  amountScopeKey?: string;

  countScopeKey?: string;

  /** VISIT_COUNT에서 동일 날짜/그룹을 식별하는 키 */
  countEventKey?: string;

  /** 현재 이벤트를 처리하기 전 실제 연간 사용 일수 */
  countUsedBefore?: number;

  /** 현재 이벤트가 이미 같은 날로 카운트됐는지 */
  countEventAlreadyCounted?: boolean;
}

interface PreparedBenefitLimits {
  limits: BenefitLimit[];

  scopes: PreparedLimitScope[];

  confirmed: boolean;

  warning: string | null;
}

interface PreparedDeductibleCap {
  state:
    | DeductibleCapState
    | null
    | "CONFIRMATION_REQUIRED";

  scopeKey: string | null;
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

function findRule(
  ruleSet: RuleSet,
  ruleId: string | null
): ClaimRule | undefined {
  if (!ruleId) {
    return undefined;
  }

  return ruleSet.rules.find(
    (rule) =>
      rule.ruleId === ruleId
  );
}

/**
 * 룰 JSON의 근거 메타데이터를
 * 계산 결과의 RuleTrace로 그대로 전달한다.
 *
 * 확인되지 않은 조문번호/시행일 등을
 * 엔진에서 임의 생성하지 않는다.
 */
function createRuleTrace(
  rule: ClaimRule
): RuleTrace {
  return {
    ruleId: rule.ruleId,

    condition:
      rule.condition ??
      rule.description,

    calculation:
      rule.calculation ??
      "계산식 확인 필요",

    ...(rule.sourceDocument
      ? {
          sourceDocument:
            rule.sourceDocument,
        }
      : {}),

    ...(rule.articleNumber
      ? {
          articleNumber:
            rule.articleNumber,
        }
      : {}),

    ...(rule.articleParagraph
      ? {
          articleParagraph:
            rule.articleParagraph,
        }
      : {}),

    ...(rule.documentVersion
      ? {
          documentVersion:
            rule.documentVersion,
        }
      : {}),

    ...(rule.effectiveDate
      ? {
          effectiveDate:
            rule.effectiveDate,
        }
      : {}),

    ...(rule.exception
      ? {
          exception:
            rule.exception,
        }
      : {}),

    ...(rule.displayText
      ? {
          displayText:
            rule.displayText,
        }
      : {}),

    verificationStatus:
      rule.verificationStatus ??
      "INSURER_CONFIRMATION_REQUIRED",
  };
}

function createClaimTraces({
  ruleSet,
  deductibleRule,
  exclusionRuleId,
}: {
  ruleSet: RuleSet;

  deductibleRule:
    | ClaimRule
    | undefined;

  exclusionRuleId:
    | string
    | null;
}): RuleTrace[] {
  const rules: ClaimRule[] = [];

  const exclusionRule =
    findRule(
      ruleSet,
      exclusionRuleId
    );

  if (exclusionRule) {
    rules.push(exclusionRule);
  }

  if (
    deductibleRule &&
    !rules.some(
      (rule) =>
        rule.ruleId ===
        deductibleRule.ruleId
    )
  ) {
    rules.push(
      deductibleRule
    );
  }

  return rules.map(
    createRuleTrace
  );
}

function resolveUsageContext(
  usage: MedicalUsage,
  context:
    | ScenarioUsageContext
    | undefined
): ScenarioUsageContext {
  return {
    healthInsuranceCopayRate:
      context
        ?.healthInsuranceCopayRate ??
      usage
        .healthInsuranceCopayRate,

    institutionType:
      context?.institutionType ??
      usage.institutionType,

    coveredAmountPerOccurrence:
      context
        ?.coveredAmountPerOccurrence ??
      usage.coveredAmount,

    treatmentCategory:
      context
        ?.treatmentCategory ??
      usage.treatmentCategory,

    usedBenefitAmountByLimitId:
      context
        ?.usedBenefitAmountByLimitId,

    usedBenefitCountByLimitId:
      context
        ?.usedBenefitCountByLimitId,

    deductibleCapUsedAmount:
      context
        ?.deductibleCapUsedAmount,

    deductibleCapEligible:
      context
        ?.deductibleCapEligible,
  };
}

function getInsuranceYearScope(
  usage: MedicalUsage,
  year: number
): string {
  return (
    usage.insuranceYearKey ??
    `scenario-year-${year}`
  );
}

function createAmountScopeKey({
  limitId,
  limitType,
  usage,
  occurrenceIndex,
  assumptions,
  year,
}: {
  limitId: string;

  limitType: BenefitLimit["type"];

  usage: MedicalUsage;

  occurrenceIndex: number;

  assumptions: ScenarioAssumptions;

  year: number;
}): string | null {
  const insuranceYearScope =
    getInsuranceYearScope(
      usage,
      year
    );

  if (limitType === "ANNUAL") {
    return `${limitId}|ANNUAL|${insuranceYearScope}`;
  }

  if (limitType === "DAILY") {
    if (usage.sameDayGroupId) {
      return `${limitId}|DAY|${usage.sameDayGroupId}`;
    }

    if (usage.treatmentDate) {
      return `${limitId}|DAY|${usage.treatmentDate}`;
    }

    if (
      usage.frequency === 1 ||
      assumptions
        .assumeEachOccurrenceSeparate
    ) {
      return `${limitId}|DAY|${usage.id}|${occurrenceIndex}`;
    }

    return null;
  }

  if (
    limitType ===
    "PER_ADMISSION"
  ) {
    if (usage.admissionId) {
      return `${limitId}|ADMISSION|${usage.admissionId}`;
    }

    if (
      usage.frequency === 1 ||
      assumptions
        .assumeEachOccurrenceSeparate
    ) {
      return `${limitId}|ADMISSION|${usage.id}|${occurrenceIndex}`;
    }

    return null;
  }

  /**
   * mvp-v2의 CUSTOM 금액한도는 현재
   * "통원 회당" 한도를 표현하기 위해 사용한다.
   */
  if (limitType === "CUSTOM") {
    if (
      usage.frequency === 1 ||
      assumptions
        .assumeEachOccurrenceSeparate
    ) {
      return `${limitId}|OCCURRENCE|${usage.id}|${occurrenceIndex}`;
    }

    return null;
  }

  /**
   * VISIT_COUNT에는 일반적으로 amount가 없지만,
   * 룰 데이터에 amount가 함께 들어오는 경우에는
   * 보험연도 범위로 제한한다.
   */
  if (
    limitType ===
    "VISIT_COUNT"
  ) {
    return `${limitId}|ANNUAL|${insuranceYearScope}`;
  }

  return null;
}

function createCountEventKey({
  limitId,
  limitType,
  usage,
  occurrenceIndex,
  assumptions,
  year,
}: {
  limitId: string;

  limitType: BenefitLimit["type"];

  usage: MedicalUsage;

  occurrenceIndex: number;

  assumptions: ScenarioAssumptions;

  year: number;
}): string | null {
  if (limitType !== "VISIT_COUNT") {
    return null;
  }

  const insuranceYearScope =
    getInsuranceYearScope(
      usage,
      year
    );

  if (usage.sameDayGroupId) {
    return `${limitId}|VISIT_DAY|${insuranceYearScope}|GROUP|${usage.sameDayGroupId}`;
  }

  if (usage.treatmentDate) {
    return `${limitId}|VISIT_DAY|${insuranceYearScope}|DATE|${usage.treatmentDate}`;
  }

  if (
    usage.frequency === 1 ||
    assumptions
      .assumeEachOccurrenceSeparate
  ) {
    return `${limitId}|VISIT_DAY|${insuranceYearScope}|OCCURRENCE|${usage.id}|${occurrenceIndex}`;
  }

  /**
   * 여러 회차인데 날짜/그룹 정보가 없고
   * 서로 다른 회차라고 가정하지도 않았다면
   * 통원일수를 임의로 계산하지 않는다.
   */
  return null;
}

function createCountScopeKey({
  limitId,
  limitType,
  usage,
  year,
}: {
  limitId: string;

  limitType: BenefitLimit["type"];

  usage: MedicalUsage;

  year: number;
}): string | null {
  const insuranceYearScope =
    getInsuranceYearScope(
      usage,
      year
    );

  if (
    limitType ===
      "VISIT_COUNT" ||
    limitType === "ANNUAL"
  ) {
    return `${limitId}|COUNT|${insuranceYearScope}`;
  }

  /**
   * 현재 룰셋의 횟수한도는 연간 통원일수 구조다.
   * 다른 집계형 횟수 룰이 추가되면
   * 룰 스키마에 count aggregation scope를 명시해 확장한다.
   */
  return `${limitId}|COUNT|${insuranceYearScope}`;
}

function buildBenefitLimits({
  rule,
  context,
  usage,
  occurrenceIndex,
  assumptions,
  accumulator,
  year,
}: {
  rule: ClaimRule | undefined;

  context: ScenarioUsageContext;

  usage: MedicalUsage;

  occurrenceIndex: number;

  assumptions: ScenarioAssumptions;

  accumulator: LimitAccumulator;

  year: number;
}): PreparedBenefitLimits {
  const ruleLimits =
    rule?.benefitLimits ?? [];

  /**
   * 5세대 비중증 비급여 입원의 300만원 회당 한도는
   * "병·의원 입원"에만 적용된다.
   *
   * 종합·상급종합병원이면 이 한도는 제외하고,
   * 의료기관 종별을 모르면 적용 여부 자체를 확정하지 않는다.
   */
  if (
    rule?.ruleId ===
      "G5_SP2_INPATIENT" &&
    ruleLimits.some(
      (limit) =>
        limit.id ===
        "G5_SP2_INPATIENT_PER_ADMISSION"
    ) &&
    context.institutionType ===
      undefined
  ) {
    return {
      limits: [],
      scopes: [],
      confirmed: false,
      warning:
        "비중증 비급여 입원 회당 한도 적용 여부를 위해 의료기관 종별을 확인해주세요.",
    };
  }

  const applicableRuleLimits =
    ruleLimits.filter(
      (limit) => {
        if (
          rule?.ruleId ===
            "G5_SP2_INPATIENT" &&
          limit.id ===
            "G5_SP2_INPATIENT_PER_ADMISSION"
        ) {
          return (
            context.institutionType ===
            "CLINIC_HOSPITAL"
          );
        }

        return true;
      }
    );

  if (
    applicableRuleLimits.length ===
    0
  ) {
    return {
      limits: [],
      scopes: [],
      confirmed: true,
      warning: null,
    };
  }

  const limits: BenefitLimit[] =
    [];

  const scopes:
    PreparedLimitScope[] = [];

  for (
    const limitRule of
      applicableRuleLimits
  ) {
    const amount =
      limitRule.amount;

    const count =
      limitRule.count;

    let usedAmount:
      number | undefined;

    let usedCount:
      number | undefined;

    let amountScopeKey:
      string | undefined;

    let countScopeKey:
      string | undefined;

    let countEventKey:
      string | undefined;

    let countUsedBefore:
      number | undefined;

    let countEventAlreadyCounted:
      boolean | undefined;

    if (amount !== undefined) {
      const resolvedScopeKey =
        createAmountScopeKey({
          limitId:
            limitRule.id,

          limitType:
            limitRule.type,

          usage,

          occurrenceIndex,

          assumptions,

          year,
        });

      if (!resolvedScopeKey) {
        return {
          limits: [],
          scopes: [],
          confirmed: false,
          warning:
            `${limitRule.id}의 동일 진료일/동일 입원 계산 단위를 확인해주세요.`,
        };
      }

      amountScopeKey =
        resolvedScopeKey;

      const accumulatedUsed =
        accumulator
          .usedAmountByScopeKey[
          amountScopeKey
        ];

      const explicitUsed =
        context
          .usedBenefitAmountByLimitId?.[
          limitRule.id
        ];

      /**
       * 이미 이번 시나리오에서 누적이 시작됐다면
       * 누적값이 우선한다.
       *
       * explicitUsed는 계산 시작 시점의 seed 값이다.
       */
      if (
        accumulatedUsed !==
        undefined
      ) {
        usedAmount =
          accumulatedUsed;
      } else if (
        explicitUsed !== undefined
      ) {
        usedAmount =
          explicitUsed;
      } else if (
        assumptions
          .assumeNoPriorLimitUsage
      ) {
        usedAmount = 0;
      } else {
        return {
          limits: [],
          scopes: [],
          confirmed: false,
          warning:
            `${limitRule.id}의 기존 지급한도 사용금액을 확인해주세요.`,
        };
      }
    }

    if (count !== undefined) {
      const resolvedScopeKey =
        createCountScopeKey({
          limitId:
            limitRule.id,

          limitType:
            limitRule.type,

          usage,

          year,
        });

      if (!resolvedScopeKey) {
        return {
          limits: [],
          scopes: [],
          confirmed: false,
          warning:
            `${limitRule.id}의 횟수 집계 단위를 확인해주세요.`,
        };
      }

      countScopeKey =
        resolvedScopeKey;

      const accumulatedUsed =
        accumulator
          .usedCountByScopeKey[
          countScopeKey
        ];

      const explicitUsed =
        context
          .usedBenefitCountByLimitId?.[
          limitRule.id
        ];

      let actualUsedCount:
        number;

      if (
        accumulatedUsed !==
        undefined
      ) {
        actualUsedCount =
          accumulatedUsed;
      } else if (
        explicitUsed !== undefined
      ) {
        actualUsedCount =
          explicitUsed;
      } else if (
        assumptions
          .assumeNoPriorLimitUsage
      ) {
        actualUsedCount = 0;
      } else {
        return {
          limits: [],
          scopes: [],
          confirmed: false,
          warning:
            `${limitRule.id}의 기존 횟수 한도 사용량을 확인해주세요.`,
        };
      }

      countUsedBefore =
        actualUsedCount;

      if (
        limitRule.type ===
        "VISIT_COUNT"
      ) {
        const resolvedEventKey =
          createCountEventKey({
            limitId:
              limitRule.id,

            limitType:
              limitRule.type,

            usage,

            occurrenceIndex,

            assumptions,

            year,
          });

        if (!resolvedEventKey) {
          return {
            limits: [],
            scopes: [],
            confirmed: false,
            warning:
              `${limitRule.id}의 통원일수 계산을 위해 진료일/동일일 그룹을 확인하거나 각 회차를 별도 진료로 가정해주세요.`,
          };
        }

        countEventKey =
          resolvedEventKey;

        countEventAlreadyCounted =
          accumulator
            .countedEventKeys[
            countEventKey
          ] === true;

        /**
         * 같은 날의 두 번째 치료는 이미 1일을 사용한 상태지만,
         * 그 날 자체는 여전히 지급 가능한 동일 1일이다.
         *
         * 예: 과거 99일 + 오늘 첫 치료 -> usedCount 99
         *     오늘 두 번째 치료 -> 실제 누적은 100일이지만
         *     한도 판정에는 99일로 전달해 같은 100번째 날을 공유한다.
         */
        usedCount =
          countEventAlreadyCounted
            ? Math.max(
                0,
                actualUsedCount - 1
              )
            : actualUsedCount;
      } else {
        usedCount =
          actualUsedCount;
      }
    }

    limits.push({
      id:
        limitRule.id,

      type:
        limitRule.type,

      amount,
      count,

      usedAmount,
      usedCount,

      aggregationKey:
        limitRule
          .aggregationKey,
    });

    scopes.push({
      limitId:
        limitRule.id,

      amountScopeKey,
      countScopeKey,
      countEventKey,
      countUsedBefore,
      countEventAlreadyCounted,
    });
  }

  return {
    limits,
    scopes,
    confirmed: true,
    warning: null,
  };
}

function buildDeductibleCapState({
  rule,
  context,
  usage,
  assumptions,
  accumulator,
  year,
}: {
  rule: ClaimRule | undefined;

  context: ScenarioUsageContext;

  usage: MedicalUsage;

  assumptions: ScenarioAssumptions;

  accumulator:
    DeductibleCapAccumulator;

  year: number;
}): PreparedDeductibleCap {
  if (!rule?.deductibleCap) {
    return {
      state: null,
      scopeKey: null,
    };
  }

  /**
   * 상한 적용 여부는 명시값이 있으면 그 값을 우선한다.
   *
   * G5_SP1_INPATIENT는 현재 mvp-v2 명세상
   * 종합·상급종합병원 중증 비급여 입원에만
   * 연 500만원 자기부담 상한을 적용하므로,
   * 명시값이 없을 때는 의료기관 종별로 판정할 수 있다.
   */
  let deductibleCapEligible =
    context.deductibleCapEligible;

  if (
    deductibleCapEligible ===
      undefined &&
    rule.ruleId ===
      "G5_SP1_INPATIENT"
  ) {
    if (
      context.institutionType ===
      "GENERAL_TERTIARY"
    ) {
      deductibleCapEligible =
        true;
    } else if (
      context.institutionType ===
      "CLINIC_HOSPITAL"
    ) {
      deductibleCapEligible =
        false;
    }
  }

  if (
    deductibleCapEligible ===
    undefined
  ) {
    return {
      state:
        "CONFIRMATION_REQUIRED",

      scopeKey: null,
    };
  }

  /**
   * 이번 치료가 상한 비대상이면
   * d*=d이므로 누적액 S_prev가 없어도 계산 가능하다.
   */
  if (
    deductibleCapEligible === false
  ) {
    return {
      state: null,
      scopeKey: null,
    };
  }

  const scopeKey =
    `${rule.ruleId}|CAP|${getInsuranceYearScope(
      usage,
      year
    )}`;

  const accumulatedUsed =
    accumulator
      .usedAmountByScopeKey[
      scopeKey
    ];

  const explicitUsed =
    context
      .deductibleCapUsedAmount;

  let usedAmount:
    number | undefined;

  if (
    accumulatedUsed !== undefined
  ) {
    usedAmount =
      accumulatedUsed;
  } else if (
    explicitUsed !== undefined
  ) {
    usedAmount =
      explicitUsed;
  } else if (
    assumptions
      .assumeNoPriorLimitUsage
  ) {
    usedAmount = 0;
  }

  if (
    usedAmount === undefined ||
    !isFiniteNonNegative(
      usedAmount
    )
  ) {
    return {
      state:
        "CONFIRMATION_REQUIRED",

      scopeKey,
    };
  }

  return {
    state: {
      capAmount:
        rule.deductibleCap.amount,

      usedAmount,

      eligible: true,
    },

    scopeKey,
  };
}

function updateLimitAccumulator({
  limits,
  scopes,
  insuranceBenefit,
  accumulator,
}: {
  limits: BenefitLimit[];

  scopes: PreparedLimitScope[];

  insuranceBenefit: number;

  accumulator: LimitAccumulator;
}) {
  for (const limit of limits) {
    const scope =
      scopes.find(
        (item) =>
          item.limitId ===
          limit.id
      );

    if (
      limit.amount !== undefined &&
      scope?.amountScopeKey
    ) {
      accumulator
        .usedAmountByScopeKey[
        scope.amountScopeKey
      ] =
        (
          limit.usedAmount ?? 0
        ) +
        insuranceBenefit;
    }

    if (
      limit.count !== undefined &&
      scope?.countScopeKey
    ) {
      const actualUsedBefore =
        scope.countUsedBefore ??
        limit.usedCount ??
        0;

      if (scope.countEventKey) {
        if (
          !scope
            .countEventAlreadyCounted
        ) {
          accumulator
            .usedCountByScopeKey[
            scope.countScopeKey
          ] =
            actualUsedBefore + 1;

          accumulator
            .countedEventKeys[
            scope.countEventKey
          ] = true;
        } else {
          /** 같은 통원일의 추가 치료는 일수를 다시 올리지 않는다. */
          accumulator
            .usedCountByScopeKey[
            scope.countScopeKey
          ] =
            actualUsedBefore;
        }
      } else {
        accumulator
          .usedCountByScopeKey[
          scope.countScopeKey
        ] =
          actualUsedBefore + 1;
      }
    }
  }
}

function sumNullable(
  values:
    Array<number | null>
): number | null {
  if (
    values.some(
      (value) =>
        value === null
    )
  ) {
    return null;
  }

  return values.reduce<number>(
    (sum, value) =>
      sum + (value ?? 0),
    0
  );
}

/**
 * 연간 시나리오 계산
 *
 * 계산 원칙:
 *
 * 1) 동일 의료이용 M을 CURRENT / TARGET_5G에 적용
 * 2) 보장 여부 판정 → C/E
 * 3) 기본 자기부담 d
 * 4) 상한 반영 d*
 * 5) q = C - d*
 * 6) 지급한도 반영 I/U
 * 7) 최종 의료비 부담 = M - I
 * 8) 연간 총부담 = 연 보험료 + ΣM - ΣI
 *
 * frequency를 먼저 합산해 최소공제를 한 번만 적용하지 않고
 * 회차별 계산한다.
 */
export function calculateScenario({
  option,
  year,
  generation,
  annualPremium,
  coverages,
  usages,
  ruleSet,
  usageContexts = {},
  assumptions,
}: CalculateScenarioParams): AnnualCalculationResult {
  const items:
    AnnualCalculationResult["items"] =
    [];

  const warnings:
    string[] = [];

  const limitAccumulator:
    LimitAccumulator = {
    usedAmountByScopeKey: {},
    usedCountByScopeKey: {},
    countedEventKeys: {},
  };

  const deductibleCapAccumulator:
    DeductibleCapAccumulator = {
    usedAmountByScopeKey: {},
  };

  for (const usage of usages) {
    const context =
      resolveUsageContext(
        usage,
        usageContexts[
          usage.id
        ]
      );

    for (
      let occurrenceIndex = 0;
      occurrenceIndex <
      usage.frequency;
      occurrenceIndex += 1
    ) {
      /**
       * M:
       * 환자부담액이 별도로 확인돼 있으면 우선 사용하고,
       * 없으면 기존 MVP의 unitCost를 1회당 M으로 사용한다.
       */
      const medicalCost =
        usage.patientPaidAmount ??
        usage.unitCost;

      /**
       * 먼저 룰 매칭 가능 여부를 확인한다.
       */
      const preliminarySelfPayment =
        calculateSelfPayment({
          treatmentCost:
            context
              .coveredAmountPerOccurrence ??
            medicalCost,

          generation,

          careSetting:
            usage.careSetting,

          benefitClass:
            usage.benefitClass,

          severityClass:
            usage.severityClass,

          coverages,

          rules:
            ruleSet.rules,

          healthInsuranceCopayRate:
            context
              .healthInsuranceCopayRate,

          institutionType:
            context
              .institutionType,

          treatmentCategory:
            context
              .treatmentCategory,
        });

      const excludedResult =
        calculateExcludedExpense({
          treatmentCost:
            medicalCost,

          generation,

          benefitClass:
            usage.benefitClass,

          severityClass:
            usage.severityClass,

          coverages,

          hasSupportedSelfPaymentRule:
            preliminarySelfPayment
              .amount !== null,
        });

      let coveredAmount:
        number | null = null;

      let excludedAmount:
        number | null =
          excludedResult.amount;

      if (
        excludedResult.status ===
        "EXCLUDED"
      ) {
        coveredAmount = 0;
        excludedAmount =
          medicalCost;
      } else if (
        excludedResult.status ===
        "NONE"
      ) {
        if (
          context
            .coveredAmountPerOccurrence !==
          undefined
        ) {
          coveredAmount =
            context
              .coveredAmountPerOccurrence;

          excludedAmount =
            medicalCost -
            coveredAmount;
        } else if (
          assumptions
            .assumeEntireMedicalCostCovered
        ) {
          coveredAmount =
            medicalCost;

          excludedAmount = 0;
        }
      }

      /**
       * 실제 C가 정해진 뒤
       * 기본 자기부담액 d를 다시 계산한다.
       */
      const selfPaymentResult =
        coveredAmount !== null &&
        coveredAmount > 0
          ? calculateSelfPayment({
              treatmentCost:
                coveredAmount,

              generation,

              careSetting:
                usage.careSetting,

              benefitClass:
                usage.benefitClass,

              severityClass:
                usage.severityClass,

              coverages,

              rules:
                ruleSet.rules,

              healthInsuranceCopayRate:
                context
                  .healthInsuranceCopayRate,

              institutionType:
                context
                  .institutionType,

              treatmentCategory:
                context
                  .treatmentCategory,
            })
          : preliminarySelfPayment;

      const matchedRule =
        findRule(
          ruleSet,
          selfPaymentResult
            .ruleId
        );

      const traces =
        createClaimTraces({
          ruleSet,

          deductibleRule:
            matchedRule,

          exclusionRuleId:
            excludedResult.ruleId,
        });

      const preparedCap =
        buildDeductibleCapState({
          rule:
            matchedRule,

          context,

          usage,

          assumptions,

          accumulator:
            deductibleCapAccumulator,

          year,
        });

      const limitResult =
        buildBenefitLimits({
          rule:
            matchedRule,

          context,

          usage,

          occurrenceIndex,

          assumptions,

          accumulator:
            limitAccumulator,

          year,
        });

      const itemWarnings:
        string[] = [];

      if (
        excludedResult.warning
      ) {
        itemWarnings.push(
          excludedResult.warning
        );
      }

      if (
        selfPaymentResult.warning
      ) {
        itemWarnings.push(
          selfPaymentResult.warning
        );
      }

      if (
        limitResult.warning
      ) {
        itemWarnings.push(
          limitResult.warning
        );
      }

      if (
        preparedCap.state ===
        "CONFIRMATION_REQUIRED"
      ) {
        itemWarnings.push(
          "자기부담 상한 적용 대상 여부 또는 기존 누적 자기부담액을 확인해주세요."
        );
      }

      const claim =
        calculateClaim({
          usageId:
            usage.frequency === 1
              ? usage.id
              : `${usage.id}#${occurrenceIndex + 1}`,

          treatmentName:
            usage.frequency === 1
              ? usage.treatmentName
              : `${usage.treatmentName} (${occurrenceIndex + 1}/${usage.frequency})`,

          medicalCost,

          coveredAmount,
          excludedAmount,

          baseDeductible:
            coveredAmount === 0
              ? 0
              : selfPaymentResult
                  .amount,

          deductibleCapState:
            preparedCap.state ===
            "CONFIRMATION_REQUIRED"
              ? undefined
              : preparedCap.state,

          benefitLimits:
            limitResult.limits,

          benefitLimitsConfirmed:
            limitResult.confirmed &&
            preparedCap.state !==
              "CONFIRMATION_REQUIRED",

          traces,

          warnings:
            itemWarnings,
        });

      items.push(claim);

      /**
       * 확정 계산된 항목만 다음 회차 누적값에 반영한다.
       */
      if (
        claim.status ===
          "CALCULATED" &&
        claim.insuranceBenefit !==
          null
      ) {
        updateLimitAccumulator({
          limits:
            limitResult.limits,

          scopes:
            limitResult.scopes,

          insuranceBenefit:
            claim
              .insuranceBenefit,

          accumulator:
            limitAccumulator,
        });

        if (
          preparedCap.scopeKey &&
          preparedCap.state !==
            "CONFIRMATION_REQUIRED" &&
          preparedCap.state !==
            null &&
          preparedCap.state.eligible &&
          claim
            .adjustedDeductible !==
            null
        ) {
          deductibleCapAccumulator
            .usedAmountByScopeKey[
            preparedCap.scopeKey
          ] =
            preparedCap
              .state
              .usedAmount +
            claim
              .adjustedDeductible;
        }
      }
    }
  }

  const totalMedicalCost =
    sumNullable(
      items.map(
        (item) =>
          item.medicalCost
      )
    );

  const totalInsuranceBenefit =
    sumNullable(
      items.map(
        (item) =>
          item.insuranceBenefit
      )
    );

  const totalFinalMedicalBurden =
    sumNullable(
      items.map(
        (item) =>
          item.finalMedicalBurden
      )
    );

  const totalExcludedAmount =
    sumNullable(
      items.map(
        (item) =>
          item.excludedAmount
      )
    );

  const totalAdjustedDeductible =
    sumNullable(
      items.map(
        (item) =>
          item.adjustedDeductible
      )
    );

  const totalLimitExceededAmount =
    sumNullable(
      items.map(
        (item) =>
          item.limitExceededAmount
      )
    );

  const hasUnconfirmedItem =
    items.some(
      (item) =>
        item.status !==
        "CALCULATED"
    );

  /**
   * 핵심 총부담 공식:
   *
   * T = annualPremium + ΣM - ΣI
   *
   * E, d*, U는 M-I의 분해값이므로
   * 총부담에 다시 더하지 않는다.
   */
  const totalBurden =
    annualPremium === null ||
    totalMedicalCost === null ||
    totalInsuranceBenefit === null ||
    hasUnconfirmedItem
      ? null
      : annualPremium +
        totalMedicalCost -
        totalInsuranceBenefit;

  const status =
    hasUnconfirmedItem ||
    totalBurden === null
      ? "CONFIRMATION_REQUIRED"
      : "CALCULATED";

  return {
    option,
    year,

    annualPremium,

    items,

    totalMedicalCost,
    totalInsuranceBenefit,
    totalFinalMedicalBurden,

    totalExcludedAmount,
    totalAdjustedDeductible,
    totalLimitExceededAmount,

    totalBurden,

    status,

    warnings:
      Array.from(
        new Set([
          ...warnings,
          ...items.flatMap(
            (item) =>
              item.warnings
          ),
        ])
      ),
  };
}
