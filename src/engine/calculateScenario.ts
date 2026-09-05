import type {
  InsuranceGeneration,
} from "../domain/insurance";

import type {
  MedicalUsage,
} from "../domain/medical";

import {
  calculateSelfPayment,
} from "./calculateSelfPayment";

import {
  calculateExcludedExpense,
  type ExcludedExpenseResult,
} from "./calculateExcludedExpense";

import type {
  RuleSet,
} from "./loadRuleSet";

export interface ScenarioItemResult {
  usage: MedicalUsage;

  treatmentCost: number;

  selfPaymentResult: ReturnType<
    typeof calculateSelfPayment
  >;

  excludedExpenseResult:
    ExcludedExpenseResult;

  selfPaymentAmount: number | null;

  excludedAmount: number | null;

  totalMedicalBurden: number | null;
}

export interface ScenarioCalculationResult {
  generation: InsuranceGeneration;

  annualPremium: number;

  items: ScenarioItemResult[];

  totalSelfPayment: number | null;

  totalExcludedExpense: number | null;

  totalAnnualCost: number | null;

  hasUnsupportedCalculation: boolean;
}

interface CalculateScenarioParams {
  generation: InsuranceGeneration;

  annualPremium: number;

  coverages: string[];

  usages: MedicalUsage[];

  ruleSet: RuleSet;
}

export function calculateScenario({
  generation,
  annualPremium,
  coverages,
  usages,
  ruleSet,
}: CalculateScenarioParams): ScenarioCalculationResult {
  const items: ScenarioItemResult[] =
    usages.map((usage) => {
      const treatmentCost =
        usage.frequency *
        usage.unitCost;

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

          coverages,
        });

      /*
       * 보장 제외라면
       * 해당 치료비는 자기부담금이 아니라
       * 보장 제외 의료비 항목으로 들어간다.
       */
      if (
        excludedExpenseResult.status ===
        "EXCLUDED"
      ) {
        return {
          usage,

          treatmentCost,

          selfPaymentResult,

          excludedExpenseResult,

          selfPaymentAmount: 0,

          excludedAmount:
            excludedExpenseResult.amount,

          totalMedicalBurden:
            excludedExpenseResult.amount,
        };
      }

      /*
       * 보장 제외 여부 자체를
       * 판단할 수 없는 경우
       */
      if (
        excludedExpenseResult.status ===
        "UNKNOWN"
      ) {
        return {
          usage,

          treatmentCost,

          selfPaymentResult,

          excludedExpenseResult,

          selfPaymentAmount:
            selfPaymentResult.amount,

          excludedAmount: null,

          totalMedicalBurden: null,
        };
      }

      /*
       * 보장 대상이지만
       * 자기부담 룰이 없는 경우
       */
      if (
        selfPaymentResult.amount ===
        null
      ) {
        return {
          usage,

          treatmentCost,

          selfPaymentResult,

          excludedExpenseResult,

          selfPaymentAmount: null,

          excludedAmount:
            excludedExpenseResult.amount,

          totalMedicalBurden: null,
        };
      }

      const selfPaymentAmount =
        selfPaymentResult.amount;

      const excludedAmount =
        excludedExpenseResult.amount ??
        0;

      return {
        usage,

        treatmentCost,

        selfPaymentResult,

        excludedExpenseResult,

        selfPaymentAmount,

        excludedAmount,

        totalMedicalBurden:
          selfPaymentAmount +
          excludedAmount,
      };
    });

  const hasUnsupportedCalculation =
    items.some(
      (item) =>
        item.totalMedicalBurden ===
        null
    );

  if (hasUnsupportedCalculation) {
    return {
      generation,

      annualPremium,

      items,

      totalSelfPayment: null,

      totalExcludedExpense: null,

      totalAnnualCost: null,

      hasUnsupportedCalculation: true,
    };
  }

  const totalSelfPayment =
    items.reduce(
      (sum, item) =>
        sum +
        (item.selfPaymentAmount ?? 0),
      0
    );

  const totalExcludedExpense =
    items.reduce(
      (sum, item) =>
        sum +
        (item.excludedAmount ?? 0),
      0
    );

  /*
   * 핵심 공식
   *
   * 연간 총부담
   * =
   * 연 보험료
   * + 자기부담금
   * + 보장 제외 의료비
   */
  const totalAnnualCost =
    annualPremium +
    totalSelfPayment +
    totalExcludedExpense;

  return {
    generation,

    annualPremium,

    items,

    totalSelfPayment,

    totalExcludedExpense,

    totalAnnualCost,

    hasUnsupportedCalculation: false,
  };
}
