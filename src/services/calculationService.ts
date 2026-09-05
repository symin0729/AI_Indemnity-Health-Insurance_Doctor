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
  type BreakEvenResult,
} from "../engine/calculateBreakEven";

import type {
  RuleSet,
} from "../engine/loadRuleSet";

export const CALCULATION_ENGINE_VERSION =
  "mvp-engine-v1";

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

/**
 * MVP 추적용 결정론적 입력 해시.
 *
 * 암호화/보안 목적이 아니라
 * 동일 입력이 동일 계산 결과로
 * 재현되는지 확인하기 위한 식별자다.
 */
function createInputHash(
  input: CalculationInput
): string {
  const hashTarget = {
    contract: {
      insurer:
        input.contract.insurer,
      productName:
        input.contract.productName,
      inceptionDate:
        input.contract.inceptionDate,
      generation:
        input.contract.generation,
      monthlyPremium:
        input.contract.monthlyPremium,
      renewalCycleMonths:
        input.contract
          .renewalCycleMonths,
      reentryCycleMonths:
        input.contract
          .reentryCycleMonths,
      coverages: [
        ...input.contract
          .coverages,
      ].sort(),
    },

    target5GMonthlyPremium:
      input
        .target5GMonthlyPremium,

    target5GCoverages: [
      ...input
        .target5GCoverages,
    ].sort(),

    usages:
      input.usages.map(
        (usage) => ({
          id: usage.id,
          treatmentName:
            usage.treatmentName,
          careSetting:
            usage.careSetting,
          benefitClass:
            usage.benefitClass,
          severityClass:
            usage.severityClass,
          frequency:
            usage.frequency,
          unitCost:
            usage.unitCost,
        })
      ),

    rulesetVersion:
      input.ruleSet
        .rulesetVersion,
  };

  const serialized =
    stableStringify(
      hashTarget
    );

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

export interface CalculationResult {
  engineVersion: string;

  rulesetVersion: string;

  inputHash: string;

  current:
    ScenarioCalculationResult;

  target5G:
    ScenarioCalculationResult;

  warnings: string[];
}

function calculateScenario(
  generation: InsuranceGeneration,
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
         * 자기부담금은 회당 비용을 기준으로
         * 1회분을 먼저 계산한 뒤 연간 횟수를 곱한다.
         *
         * 예:
         * 3세대 MRI 특약
         * max(20,000원, 회당 비용의 30%) × 연간 횟수
         *
         * 이렇게 해야 최소 자기부담금이 있는 룰에서
         * 여러 회차의 비용을 먼저 합쳐 공제액을
         * 한 번만 적용하는 오류를 막을 수 있다.
         */
        const perVisitSelfPaymentResult =
          calculateSelfPayment({
            treatmentCost:
              usage.unitCost,

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

        const selfPaymentResult:
          SelfPaymentResult =
          perVisitSelfPaymentResult.amount ===
          null
            ? perVisitSelfPaymentResult
            : {
                ...perVisitSelfPaymentResult,

                amount:
                  perVisitSelfPaymentResult.amount *
                  usage.frequency,
              };

        const excludedExpenseResult =
          calculateExcludedExpense({
            treatmentCost,

            generation,

            benefitClass:
              usage.benefitClass,

            coverages,

            hasSupportedSelfPaymentRule:
              selfPaymentResult.amount !==
              null,
          });

        /**
         * 보장 제외로 판정된 치료는
         * 해당 의료비를 excluded 항목으로
         * 분리한다.
         *
         * 같은 금액을 자기부담과
         * 보장 제외에 중복 합산하지 않는다.
         */
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
   * 현재 MVP에서는
   * 실제 적용이 확인된 공식 할인
   * 입력값이 없으므로 0원으로 둔다.
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

export const calculationService = {
  validate(
    input: CalculationInput
  ): ValidationResult {
    const errors: string[] =
      [];

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
      input.contract
        .monthlyPremium <= 0
    ) {
      errors.push(
        "현재 월 보험료를 확인해주세요."
      );
    }

    if (
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
        if (
          usage.frequency < 1
        ) {
          errors.push(
            `${usage.treatmentName}: 예상 횟수를 확인해주세요.`
          );
        }

        if (
          usage.unitCost <= 0
        ) {
          errors.push(
            `${usage.treatmentName}: 회당 비용을 확인해주세요.`
          );
        }
      }
    );

    return {
      valid:
        errors.length === 0,

      errors,
    };
  },

  calculate(
    input: CalculationInput
  ): CalculationResult {
    const validation =
      this.validate(input);

    if (
      !validation.valid
    ) {
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
      calculateScenario(
        input.contract
          .generation,

        currentAnnualPremium,

        input.contract
          .coverages,

        input.usages,

        input.ruleSet
      );

    const target5G =
      calculateScenario(
        5,

        targetAnnualPremium,

        input
          .target5GCoverages,

        input.usages,

        input.ruleSet
      );

    const warnings: string[] =
      [];

    if (
      current
        .hasUnsupportedCalculation
    ) {
      warnings.push(
        "현재 계약의 일부 계산 조건은 현재 MVP 룰셋에서 지원되지 않습니다."
      );
    }

    if (
      target5G
        .hasUnsupportedCalculation
    ) {
      warnings.push(
        "5세대 비교안의 일부 계산 조건은 현재 MVP 룰셋에서 지원되지 않습니다."
      );
    }

    return {
      engineVersion:
        CALCULATION_ENGINE_VERSION,

      rulesetVersion:
        input.ruleSet
          .rulesetVersion,

      inputHash:
        createInputHash(input),

      current,

      target5G,

      warnings,
    };
  },

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