import type {
  ComparisonResult,
} from "../domain/calculation";

import type {
  InsuranceContract,
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  MedicalUsage,
} from "../domain/medical";

import {
  calculateAnnualPremium,
} from "../engine/calculateAnnualPremium";

import {
  calculateSelfPayment,
  type SelfPaymentResult,
} from "../engine/calculateSelfPayment";

import {
  calculateExcludedExpense,
  type ExcludedExpenseResult,
} from "../engine/calculateExcludedExpense";

import {
  calculateBreakEven as calculateBreakEvenEngine,
  calculateBreakEvenBySimulation,
  type BreakEvenResult,
  type BreakEvenSimulationResult,
} from "../engine/calculateBreakEven";

import {
  calculateScenario as calculateScenarioV2,
  type ScenarioAssumptions,
  type ScenarioUsageContext,
} from "../engine/calculateScenario";

import type {
  RuleSet,
} from "../engine/loadRuleSet";

/**
 * 기존 M04 화면과의 연결을 유지하기 위한
 * 기존 입력 인터페이스.
 *
 * M04를 새 결과 구조로 교체하기 전까지 유지한다.
 */
export interface CalculationInput {
  contract: InsuranceContract;

  target5GMonthlyPremium: number;

  target5GCoverages: string[];

  usages: MedicalUsage[];

  ruleSet: RuleSet;
}

export interface ValidationResult {
  valid: boolean;

  errors: string[];
}

/**
 * 기존 M04 호환용 item.
 *
 * 새 계산 코어의 정식 결과 타입은
 * domain/calculation.ts의 ClaimCalculationItem이다.
 */
export interface ScenarioCalculationItem {
  usage: MedicalUsage;

  treatmentCost: number;

  selfPaymentResult:
    SelfPaymentResult;

  excludedExpenseResult:
    ExcludedExpenseResult;

  effectiveSelfPayment:
    number | null;

  isSupported: boolean;
}

/**
 * 기존 M04 호환용 결과.
 *
 * 기존 UI가 아직 아래 필드를 사용하고 있으므로
 * 이번 단계에서는 제거하지 않는다.
 */
export interface ScenarioCalculationResult {
  generation:
    InsuranceGeneration;

  annualPremium: number;

  items:
    ScenarioCalculationItem[];

  hasUnsupportedCalculation:
    boolean;

  totalSelfPayment: number;

  totalExcludedExpense:
    number | null;

  officialDiscount: number;

  totalAnnualCost:
    number | null;
}

/**
 * 기존 M04 호환용 결과 타입.
 */
export interface CalculationResult {
  rulesetVersion: string;

  current:
    ScenarioCalculationResult;

  target5G:
    ScenarioCalculationResult;

  warnings: string[];
}

/**
 * mvp-v2 정식 계산 입력.
 *
 * 임의 가정을 엔진 내부에서 만들어내지 않도록
 * assumptions를 반드시 호출부에서 넘기게 한다.
 */
export interface CalculationV2Input
  extends CalculationInput {
  /**
   * usage.id별 정밀 계산 보조정보.
   *
   * 예:
   * - 급여 통원 건강보험 본인부담률 r
   * - 의료기관 종별
   * - 보장대상 인정금액 C
   * - 기존 지급한도 사용액
   * - 자기부담 상한 누적액
   */
  usageContexts?: Record<
    string,
    ScenarioUsageContext
  >;

  /**
   * 계산 가정은 화면/사용자가 명시적으로 선택한 값만 전달한다.
   */
  assumptions:
    ScenarioAssumptions;

  /**
   * 비교 기준 연도.
   * 1년 계산 기준이며 3년 계산은 추후 연도별로 별도 실행한다.
   */
  year?: number;
}

export interface CalculationV2Result
  extends ComparisonResult {
  engineVersion: string;
}

export const CALCULATION_ENGINE_VERSION =
  "mvp-engine-v2";

/**
 * 결정론적 입력 해시.
 *
 * 보안용 해시가 아니라
 * "동일 입력 + 동일 룰셋 → 동일 결과" 재현 확인용이다.
 */
function stableStringify(
  value: unknown
): string {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) =>
        stableStringify(item)
      )
      .join(",")}]`;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const keys =
    Object.keys(record).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(
          key
        )}:${stableStringify(
          record[key]
        )}`
    )
    .join(",")}}`;
}

function createInputHash(
  input: CalculationV2Input
): string {
  const serialized =
    stableStringify({
      contract:
        input.contract,

      target5GMonthlyPremium:
        input
          .target5GMonthlyPremium,

      target5GCoverages: [
        ...input
          .target5GCoverages,
      ].sort(),

      usages:
        input.usages,

      usageContexts:
        input.usageContexts ?? {},

      assumptions:
        input.assumptions,

      year:
        input.year ?? 1,

      rulesetVersion:
        input.ruleSet
          .rulesetVersion,
    });

  let hash = 0x811c9dc5;

  for (
    let index = 0;
    index < serialized.length;
    index += 1
  ) {
    hash ^=
      serialized.charCodeAt(
        index
      );

    hash = Math.imul(
      hash,
      0x01000193
    );
  }

  return `fnv1a32-${(
    hash >>> 0
  )
    .toString(16)
    .padStart(8, "0")}`;
}

/**
 * 기존 M04가 아직 사용하는 계산 경로.
 *
 * 화면을 한 파일씩 마이그레이션하고 있으므로
 * 이번 단계에서는 삭제하지 않는다.
 *
 * 단, 보장 제외 판정은 새 함수 시그니처에 맞춰
 * severityClass와 룰 매칭 여부를 전달한다.
 */
function calculateLegacyScenario(
  generation:
    InsuranceGeneration,

  annualPremium: number,

  coverages: string[],

  usages: MedicalUsage[],

  ruleSet: RuleSet
): ScenarioCalculationResult {
  const items =
    usages.map(
      (usage) => {
        const treatmentCost =
          usage.frequency *
          usage.unitCost;

        /**
         * 기존 M04 결과 구조를 유지해야 하므로
         * 기존 방식대로 합산 금액을 계산한다.
         *
         * 정식 mvp-v2 결과는 calculateV2()가 사용하며
         * 그 경로에서는 회차별 계산을 수행한다.
         */
        const selfPaymentResult =
          calculateSelfPayment({
            treatmentCost,

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
          });

        const excludedExpenseResult =
          calculateExcludedExpense({
            treatmentCost,

            generation,

            benefitClass:
              usage.benefitClass,

            severityClass:
              usage.severityClass,

            coverages,

            hasSupportedSelfPaymentRule:
              selfPaymentResult.amount !==
              null,
          });

        const effectiveSelfPayment =
          excludedExpenseResult.status ===
            "EXCLUDED" &&
          excludedExpenseResult.amount !==
            null
            ? 0
            : selfPaymentResult.amount;

        const isSupported =
          excludedExpenseResult.amount !==
            null &&
          effectiveSelfPayment !==
            null;

        return {
          usage,

          treatmentCost,

          selfPaymentResult,

          excludedExpenseResult,

          effectiveSelfPayment,

          isSupported,
        };
      }
    );

  const hasUnsupportedCalculation =
    items.some(
      (item) =>
        !item.isSupported
    );

  const totalSelfPayment =
    items.reduce(
      (sum, item) =>
        sum +
        (
          item.effectiveSelfPayment ??
          0
        ),
      0
    );

  const hasUnknownExcludedExpense =
    items.some(
      (item) =>
        item
          .excludedExpenseResult
          .amount === null
    );

  const totalExcludedExpense =
    hasUnknownExcludedExpense
      ? null
      : items.reduce(
          (sum, item) =>
            sum +
            (
              item
                .excludedExpenseResult
                .amount ?? 0
            ),
          0
        );

  /**
   * 레거시 표시값.
   *
   * 실제 mvp-v2 총부담은 이 공식을 사용하지 않는다.
   * 정식 공식은 calculateV2() 내부의
   * annualPremium + ΣM - ΣI 이다.
   */
  const officialDiscount = 0;

  const totalAnnualCost =
    hasUnsupportedCalculation ||
    totalExcludedExpense ===
      null
      ? null
      : annualPremium +
        totalSelfPayment +
        totalExcludedExpense -
        officialDiscount;

  return {
    generation,

    annualPremium,

    items,

    hasUnsupportedCalculation,

    totalSelfPayment,

    totalExcludedExpense,

    officialDiscount,

    totalAnnualCost,
  };
}

function validateBaseInput(
  input: CalculationInput
): ValidationResult {
  const errors:
    string[] = [];

  if (
    !input.contract
      .insurer.trim()
  ) {
    errors.push(
      "보험사 정보가 필요합니다."
    );
  }

  if (
    !input.contract
      .productName.trim()
  ) {
    errors.push(
      "보험 상품명이 필요합니다."
    );
  }

  if (
    !Number.isFinite(
      input.contract
        .monthlyPremium
    ) ||
    input.contract
      .monthlyPremium <= 0
  ) {
    errors.push(
      "현재 월 보험료를 확인해주세요."
    );
  }

  if (
    !Number.isFinite(
      input
        .target5GMonthlyPremium
    ) ||
    input.target5GMonthlyPremium <=
      0
  ) {
    errors.push(
      "5세대 비교용 월 보험료를 확인해주세요."
    );
  }

  if (
    input.usages.length < 1 ||
    input.usages.length > 3
  ) {
    errors.push(
      "예정 치료는 1건 이상 3건 이하로 입력해주세요."
    );
  }

  input.usages.forEach(
    (usage) => {
      const usageLabel =
        usage.treatmentName.trim() ||
        usage.id;

      if (
        !usage.treatmentName.trim()
      ) {
        errors.push(
          "치료명을 확인해주세요."
        );
      }

      if (
        !Number.isInteger(
          usage.frequency
        ) ||
        usage.frequency < 1
      ) {
        errors.push(
          `${usageLabel}: 예상 횟수를 확인해주세요.`
        );
      }

      if (
        !Number.isFinite(
          usage.unitCost
        ) ||
        usage.unitCost <= 0
      ) {
        errors.push(
          `${usageLabel}: 회당 환자부담 의료비(M)를 확인해주세요.`
        );
      }

      if (
        usage.patientPaidAmount !==
          undefined &&
        (
          !Number.isFinite(
            usage.patientPaidAmount
          ) ||
          usage.patientPaidAmount < 0
        )
      ) {
        errors.push(
          `${usageLabel}: 환자부담액을 확인해주세요.`
        );
      }

      if (
        usage.nhisPaidAmount !==
          undefined &&
        (
          !Number.isFinite(
            usage.nhisPaidAmount
          ) ||
          usage.nhisPaidAmount < 0
        )
      ) {
        errors.push(
          `${usageLabel}: 건강보험공단 부담액을 확인해주세요.`
        );
      }

      if (
        usage.healthInsuranceCopayRate !==
          undefined &&
        (
          !Number.isFinite(
            usage.healthInsuranceCopayRate
          ) ||
          usage.healthInsuranceCopayRate <
            0 ||
          usage.healthInsuranceCopayRate >
            1
        )
      ) {
        errors.push(
          `${usageLabel}: 건강보험 본인부담률(r)은 0~1 범위여야 합니다.`
        );
      }

      const medicalCost =
        usage.patientPaidAmount ??
        usage.unitCost;

      if (
        usage.coveredAmount !==
          undefined &&
        (
          !Number.isFinite(
            usage.coveredAmount
          ) ||
          usage.coveredAmount < 0 ||
          usage.coveredAmount >
            medicalCost
        )
      ) {
        errors.push(
          `${usageLabel}: 보장대상 인정금액(C)은 0원 이상이며 의료비(M)를 초과할 수 없습니다.`
        );
      }
    }
  );

  return {
    valid:
      errors.length === 0,

    errors,
  };
}

function validateV2Input(
  input: CalculationV2Input
): ValidationResult {
  const base =
    validateBaseInput(input);

  const errors = [
    ...base.errors,
  ];

  if (
    typeof input.assumptions !==
      "object" ||
    input.assumptions === null ||
    typeof input.assumptions
      .assumeEntireMedicalCostCovered !==
      "boolean" ||
    typeof input.assumptions
      .assumeNoPriorLimitUsage !==
      "boolean" ||
    typeof input.assumptions
      .assumeEachOccurrenceSeparate !==
      "boolean"
  ) {
    errors.push(
      "계산 가정 정보를 확인해주세요."
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,
  };
}

export const calculationService = {
  /**
   * 기존 호출부 호환.
   */
  validate(
    input:
      | CalculationInput
      | CalculationV2Input
  ): ValidationResult {
    if (
      "assumptions" in input
    ) {
      return validateV2Input(
        input
      );
    }

    return validateBaseInput(
      input
    );
  },

  /**
   * 기존 M04 화면용 계산.
   *
   * M04를 mvp-v2 결과 구조로 교체하는 단계에서
   * calculateV2()로 전환한다.
   */
  calculate(
    input: CalculationInput
  ): CalculationResult {
    const validation =
      validateBaseInput(input);

    if (!validation.valid) {
      throw new Error(
        validation.errors.join(
          " "
        )
      );
    }

    const currentAnnualPremium =
      calculateAnnualPremium(
        input.contract
          .monthlyPremium
      );

    const targetAnnualPremium =
      calculateAnnualPremium(
        input
          .target5GMonthlyPremium
      );

    const current =
      calculateLegacyScenario(
        input.contract
          .generation,

        currentAnnualPremium,

        input.contract
          .coverages,

        input.usages,

        input.ruleSet
      );

    const target5G =
      calculateLegacyScenario(
        5,

        targetAnnualPremium,

        input
          .target5GCoverages,

        input.usages,

        input.ruleSet
      );

    const warnings:
      string[] = [];

    if (
      current
        .hasUnsupportedCalculation
    ) {
      warnings.push(
        "현재 계약의 일부 계산 조건은 현재 룰셋에서 지원되지 않습니다."
      );
    }

    if (
      target5G
        .hasUnsupportedCalculation
    ) {
      warnings.push(
        "5세대 비교안의 일부 계산 조건은 현재 룰셋에서 지원되지 않습니다."
      );
    }

    return {
      rulesetVersion:
        input.ruleSet
          .rulesetVersion,

      current,

      target5G,

      warnings,
    };
  },

  /**
   * mvp-v2 정식 계산.
   *
   * 총부담:
   *
   *   T = annualPremium + ΣM - ΣI
   *
   * 자기부담 d*, 제외액 E, 한도초과 U는
   * 총부담에 다시 더하지 않는다.
   */
  calculateV2(
    input: CalculationV2Input
  ): CalculationV2Result {
    const validation =
      validateV2Input(input);

    if (!validation.valid) {
      throw new Error(
        validation.errors.join(
          " "
        )
      );
    }

    const year =
      input.year ?? 1;

    const currentAnnualPremium =
      calculateAnnualPremium(
        input.contract
          .monthlyPremium
      );

    const targetAnnualPremium =
      calculateAnnualPremium(
        input
          .target5GMonthlyPremium
      );

    const current =
      calculateScenarioV2({
        option:
          "CURRENT",

        year,

        generation:
          input.contract
            .generation,

        annualPremium:
          currentAnnualPremium,

        coverages:
          input.contract
            .coverages,

        usages:
          input.usages,

        ruleSet:
          input.ruleSet,

        usageContexts:
          input.usageContexts,

        assumptions:
          input.assumptions,
      });

    const target5G =
      calculateScenarioV2({
        option:
          "TARGET_5G",

        year,

        generation: 5,

        annualPremium:
          targetAnnualPremium,

        coverages:
          input
            .target5GCoverages,

        usages:
          input.usages,

        ruleSet:
          input.ruleSet,

        usageContexts:
          input.usageContexts,

        assumptions:
          input.assumptions,
      });

    const target5GSaving =
      current.totalBurden ===
        null ||
      target5G.totalBurden ===
        null
        ? null
        : current.totalBurden -
          target5G.totalBurden;

    const warnings =
      Array.from(
        new Set([
          ...current.warnings,
          ...target5G.warnings,

          /**
           * 2026-09-05 기준 제출 계산명세에 따라
           * 선택형 할인특약 C안은 시행/상품조건 검증 전
           * 정밀 계산 결과를 만들지 않는다.
           */
          "선택형 할인특약(C안)은 실제 시행·대상 상품·보험료 견적이 확인되기 전까지 정보성 옵션으로만 표시합니다.",
        ])
      );

    return {
      engineVersion:
        CALCULATION_ENGINE_VERSION,

      current,

      target5G,

      selectiveDiscount:
        null,

      target5GSaving,

      selectiveDiscountSaving:
        null,

      rulesetVersion:
        input.ruleSet
          .rulesetVersion,

      inputHash:
        createInputHash(input),

      warnings,
    };
  },

  /**
   * mvp-v2 정식 손익분기 계산.
   *
   * 선택한 치료의 연간 횟수를 0~maxFrequency까지 바꾸면서
   * CURRENT / TARGET_5G 시나리오를 매번 전체 재계산한다.
   *
   * 따라서 아래의 비선형 구조를 그대로 반영한다.
   *
   * - 최소공제
   * - 일당/회당/연간 지급한도
   * - 횟수 한도
   * - 자기부담 상한
   *
   * 0회는 해당 치료를 usages에서 제거해
   * "치료 없음" 시나리오로 계산한다.
   */
  calculateBreakEvenV2(
    input: CalculationV2Input,
    usageId: string,
    options?: {
      minFrequency?: number;
      maxFrequency?: number;
    }
  ): BreakEvenSimulationResult | null {
    const validation =
      validateV2Input(input);

    if (!validation.valid) {
      return null;
    }

    const usageIndex =
      input.usages.findIndex(
        (usage) =>
          usage.id === usageId
      );

    if (usageIndex < 0) {
      return null;
    }

    const currentAnnualPremium =
      calculateAnnualPremium(
        input.contract
          .monthlyPremium
      );

    const targetAnnualPremium =
      calculateAnnualPremium(
        input
          .target5GMonthlyPremium
      );

    const year =
      input.year ?? 1;

    return calculateBreakEvenBySimulation({
      minFrequency:
        options?.minFrequency ??
        0,

      maxFrequency:
        options?.maxFrequency ??
        50,

      evaluate: (
        frequency
      ) => {
        /**
         * 0회는 "미래에 질병이 없다"는 예측이 아니라
         * 선택한 치료의 이용량을 0건으로 놓은 비교 가정이다.
         */
        const simulatedUsages:
          MedicalUsage[] =
          frequency === 0
            ? input.usages.filter(
                (_, index) =>
                  index !==
                  usageIndex
              )
            : input.usages.map(
                (
                  usage,
                  index
                ) =>
                  index ===
                  usageIndex
                    ? {
                        ...usage,
                        frequency,
                      }
                    : usage
              );

        const current =
          calculateScenarioV2({
            option:
              "CURRENT",

            year,

            generation:
              input.contract
                .generation,

            annualPremium:
              currentAnnualPremium,

            coverages:
              input.contract
                .coverages,

            usages:
              simulatedUsages,

            ruleSet:
              input.ruleSet,

            usageContexts:
              input.usageContexts,

            assumptions:
              input.assumptions,
          });

        const target5G =
          calculateScenarioV2({
            option:
              "TARGET_5G",

            year,

            generation: 5,

            annualPremium:
              targetAnnualPremium,

            coverages:
              input
                .target5GCoverages,

            usages:
              simulatedUsages,

            ruleSet:
              input.ruleSet,

            usageContexts:
              input.usageContexts,

            assumptions:
              input.assumptions,
          });

        return {
          currentTotalBurden:
            current.totalBurden,

          targetTotalBurden:
            target5G.totalBurden,

          warnings:
            Array.from(
              new Set([
                ...current.warnings,
                ...target5G.warnings,
              ])
            ),
        };
      },
    });
  },

  /**
   * 기존 M04의 손익분기 UI 호환용.
   *
   * 이 메서드는 기존 단순식을 유지한다.
   * 새 화면 연결에서는 calculateBreakEvenV2()를 사용한다.
   */
  calculateBreakEven(
    input: CalculationInput,
    usageId: string
  ): BreakEvenResult | null {
    const result =
      this.calculate(input);

    const usageIndex =
      input.usages.findIndex(
        (usage) =>
          usage.id === usageId
      );

    if (
      usageIndex < 0
    ) {
      return null;
    }

    const usage =
      input.usages[
        usageIndex
      ];

    const currentItem =
      result.current.items[
        usageIndex
      ];

    const targetItem =
      result.target5G.items[
        usageIndex
      ];

    if (
      !currentItem ||
      !targetItem
    ) {
      return null;
    }

    const hasExcludedExpense =
      currentItem
        .excludedExpenseResult
        .status ===
        "EXCLUDED" ||
      targetItem
        .excludedExpenseResult
        .status ===
        "EXCLUDED";

    return calculateBreakEvenEngine({
      currentAnnualPremium:
        result.current
          .annualPremium,

      targetAnnualPremium:
        result.target5G
          .annualPremium,

      treatmentCost:
        currentItem
          .treatmentCost,

      unitCost:
        usage.unitCost,

      currentSelfPayment:
        hasExcludedExpense
          ? null
          : currentItem
              .selfPaymentResult
              .amount,

      targetSelfPayment:
        hasExcludedExpense
          ? null
          : targetItem
              .selfPaymentResult
              .amount,
    });
  },
};