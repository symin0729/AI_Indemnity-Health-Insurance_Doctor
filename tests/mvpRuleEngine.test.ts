import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateAnnualPremium,
} from "../src/engine/calculateAnnualPremium";

import {
  calculateSelfPayment,
} from "../src/engine/calculateSelfPayment";

import {
  calculateExcludedExpense,
} from "../src/engine/calculateExcludedExpense";

import {
  applyDeductibleCap,
} from "../src/engine/applyDeductibleCap";

import {
  applyBenefitLimits,
} from "../src/engine/applyBenefitLimits";

import {
  calculateClaim,
} from "../src/engine/calculateClaim";

import {
  calculateScenario,
} from "../src/engine/calculateScenario";

import type {
  RuleSet,
  SelfPaymentRule,
} from "../src/engine/loadRuleSet";

const rules: SelfPaymentRule[] = [
  {
    ruleId:
      "G5_BASE_INPATIENT",
    ruleKind: "DEDUCTIBLE",
    generation: 5,
    careSetting: "INPATIENT",
    benefitClass: "COVERED",
    severityClass: "ANY",
    selfPaymentRate: 0.2,
    deductibleFormula: "RATE",
    description:
      "5세대 급여 입원",
  },
  {
    ruleId:
      "G5_BASE_OUTPATIENT",
    ruleKind: "DEDUCTIBLE",
    generation: 5,
    careSetting: "OUTPATIENT",
    benefitClass: "COVERED",
    severityClass: "ANY",
    selfPaymentRate: 0.2,
    deductibleFormula:
      "COVERED_OUTPATIENT",
    requiresHealthInsuranceCopayRate:
      true,
    minimumDeductibleByInstitution:
      {
        CLINIC_HOSPITAL: 10000,
        GENERAL_TERTIARY:
          20000,
      },
    description:
      "5세대 급여 통원",
  },
  {
    ruleId:
      "G5_SP1_INPATIENT",
    ruleKind: "DEDUCTIBLE",
    generation: 5,
    careSetting: "INPATIENT",
    benefitClass: "NON_COVERED",
    severityClass: "SEVERE",
    requiredCoverage:
      "SPECIAL_RIDER_1",
    selfPaymentRate: 0.3,
    deductibleFormula: "RATE",
    description:
      "5세대 중증 비급여 입원",
  },
  {
    ruleId:
      "G5_SP1_OUTPATIENT",
    ruleKind: "DEDUCTIBLE",
    generation: 5,
    careSetting: "OUTPATIENT",
    benefitClass: "NON_COVERED",
    severityClass: "SEVERE",
    requiredCoverage:
      "SPECIAL_RIDER_1",
    selfPaymentRate: 0.3,
    minimumSelfPayment: 30000,
    deductibleFormula:
      "MAX_RATE_MINIMUM",
    description:
      "5세대 중증 비급여 통원",
  },
  {
    ruleId:
      "G5_SP2_INPATIENT",
    ruleKind: "DEDUCTIBLE",
    generation: 5,
    careSetting: "INPATIENT",
    benefitClass: "NON_COVERED",
    severityClass: "NON_SEVERE",
    requiredCoverage:
      "SPECIAL_RIDER_2",
    selfPaymentRate: 0.5,
    deductibleFormula: "RATE",
    description:
      "5세대 비중증 비급여 입원",
  },
  {
    ruleId:
      "G5_SP2_OUTPATIENT",
    ruleKind: "DEDUCTIBLE",
    generation: 5,
    careSetting: "OUTPATIENT",
    benefitClass: "NON_COVERED",
    severityClass: "NON_SEVERE",
    requiredCoverage:
      "SPECIAL_RIDER_2",
    selfPaymentRate: 0.5,
    minimumSelfPayment: 50000,
    deductibleFormula:
      "MAX_RATE_MINIMUM",
    description:
      "5세대 비중증 비급여 통원",
  },
];

const scenarioRuleSet: RuleSet = {
  rulesetVersion: "mvp-v2-test",
  rules: [
    {
      ruleId: "G5_SP2_OUTPATIENT",
      ruleKind: "DEDUCTIBLE",
      generation: 5,
      careSetting: "OUTPATIENT",
      benefitClass: "NON_COVERED",
      severityClass: "NON_SEVERE",
      requiredCoverage: "SPECIAL_RIDER_2",
      selfPaymentRate: 0.5,
      minimumSelfPayment: 50000,
      deductibleFormula: "MAX_RATE_MINIMUM",
      benefitLimits: [
        {
          id: "G5_SP2_ANNUAL",
          type: "ANNUAL",
          amount: 10000000,
          aggregationKey: "보험연도 내 입·통원 합산",
          description: "비중증 비급여 연간 지급한도",
        },
        {
          id: "G5_SP2_OUTPATIENT_DAILY",
          type: "DAILY",
          amount: 200000,
          aggregationKey: "동일 진료일",
          description: "비중증 비급여 통원 일당 지급한도",
        },
        {
          id: "G5_SP2_OUTPATIENT_DAYS",
          type: "VISIT_COUNT",
          count: 100,
          aggregationKey: "보험연도",
          description: "비중증 비급여 통원 연 100일 한도",
        },
      ],
      description: "5세대 비중증 비급여 특약2 통원 테스트 룰",
      condition: "5세대 + 비중증 비급여 + 통원 + 특약2",
      calculation:
        "d = MIN(C, MAX(C × 50%, 50,000)); 이후 지급한도 적용",
      verificationStatus: "INSURER_CONFIRMATION_REQUIRED",
    },
  ],
};


describe(
  "AI 실손 닥터 mvp-v2 계산명세 경계값",
  () => {
    it(
      "비중증 비급여 통원 C=30,000원은 전액 자기부담이다",
      () => {
        const result =
          calculateSelfPayment({
            treatmentCost: 30000,
            generation: 5,
            careSetting:
              "OUTPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "NON_SEVERE",
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            rules,
          });

        expect(result.amount).toBe(
          30000
        );
        expect(result.ruleId).toBe(
          "G5_SP2_OUTPATIENT"
        );
      }
    );

    it(
      "비중증 비급여 통원 C=80,000원은 최소공제 50,000원, 한도 전 보험금 30,000원이다",
      () => {
        const deductible =
          calculateSelfPayment({
            treatmentCost: 80000,
            generation: 5,
            careSetting:
              "OUTPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "NON_SEVERE",
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            rules,
          });

        expect(
          deductible.amount
        ).toBe(50000);

        const claim =
          calculateClaim({
            usageId: "sp2-80k",
            treatmentName:
              "비중증 비급여 통원",
            medicalCost: 80000,
            coveredAmount: 80000,
            excludedAmount: 0,
            baseDeductible:
              deductible.amount,
            benefitLimits: [],
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.preLimitBenefit
        ).toBe(30000);
        expect(
          claim.insuranceBenefit
        ).toBe(30000);
        expect(
          claim.finalMedicalBurden
        ).toBe(50000);
      }
    );

    it(
      "비중증 비급여 입원 C=80,000원은 자기부담 40,000원이다",
      () => {
        const result =
          calculateSelfPayment({
            treatmentCost: 80000,
            generation: 5,
            careSetting:
              "INPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "NON_SEVERE",
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            rules,
          });

        expect(result.amount).toBe(
          40000
        );
      }
    );

    it(
      "비중증 비급여 입원 C=100,000원은 자기부담 50,000원이다",
      () => {
        const result =
          calculateSelfPayment({
            treatmentCost: 100000,
            generation: 5,
            careSetting:
              "INPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "NON_SEVERE",
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            rules,
          });

        expect(result.amount).toBe(
          50000
        );
      }
    );

    it(
      "급여 통원 C=5,000원, r=30%, 병·의원이면 d=5,000원이다",
      () => {
        const result =
          calculateSelfPayment({
            treatmentCost: 5000,
            generation: 5,
            careSetting:
              "OUTPATIENT",
            benefitClass:
              "COVERED",
            severityClass:
              "UNKNOWN",
            coverages: [],
            rules,
            healthInsuranceCopayRate:
              0.3,
            institutionType:
              "CLINIC_HOSPITAL",
          });

        expect(result.amount).toBe(
          5000
        );
      }
    );

    it(
      "급여 통원 C=200,000원, r=40%, 병·의원이면 d=80,000원, I=120,000원이다",
      () => {
        const deductible =
          calculateSelfPayment({
            treatmentCost: 200000,
            generation: 5,
            careSetting:
              "OUTPATIENT",
            benefitClass:
              "COVERED",
            severityClass:
              "UNKNOWN",
            coverages: [],
            rules,
            healthInsuranceCopayRate:
              0.4,
            institutionType:
              "CLINIC_HOSPITAL",
          });

        expect(
          deductible.amount
        ).toBe(80000);

        const claim =
          calculateClaim({
            usageId:
              "covered-200k",
            treatmentName:
              "급여 통원",
            medicalCost: 200000,
            coveredAmount: 200000,
            excludedAmount: 0,
            baseDeductible:
              deductible.amount,
            benefitLimits: [],
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.insuranceBenefit
        ).toBe(120000);
      }
    );

    it(
      "중증 비급여 통원 C=100,000원은 d=30,000원, I=70,000원이다",
      () => {
        const deductible =
          calculateSelfPayment({
            treatmentCost: 100000,
            generation: 5,
            careSetting:
              "OUTPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "SEVERE",
            coverages: [
              "SPECIAL_RIDER_1",
            ],
            rules,
          });

        expect(
          deductible.amount
        ).toBe(30000);

        const claim =
          calculateClaim({
            usageId: "sp1-100k",
            treatmentName:
              "중증 비급여 통원",
            medicalCost: 100000,
            coveredAmount: 100000,
            excludedAmount: 0,
            baseDeductible:
              deductible.amount,
            benefitLimits: [],
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.insuranceBenefit
        ).toBe(70000);
      }
    );

    it(
      "비중증 비급여 통원 C=1,000,000원에서 일당 잔여한도 200,000원이면 I=200,000원, U=300,000원이다",
      () => {
        const deductible =
          calculateSelfPayment({
            treatmentCost: 1000000,
            generation: 5,
            careSetting:
              "OUTPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "NON_SEVERE",
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            rules,
          });

        expect(
          deductible.amount
        ).toBe(500000);

        const claim =
          calculateClaim({
            usageId:
              "daily-limit",
            treatmentName:
              "비중증 비급여 통원",
            medicalCost: 1000000,
            coveredAmount:
              1000000,
            excludedAmount: 0,
            baseDeductible:
              deductible.amount,
            benefitLimits: [
              {
                id:
                  "G5_SP2_OUTPATIENT_DAILY",
                type: "DAILY",
                amount: 200000,
                usedAmount: 0,
              },
            ],
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.preLimitBenefit
        ).toBe(500000);
        expect(
          claim.insuranceBenefit
        ).toBe(200000);
        expect(
          claim.limitExceededAmount
        ).toBe(300000);
        expect(
          claim.finalMedicalBurden
        ).toBe(800000);
      }
    );

    it(
      "q=300,000원에서 연간 잔여한도 100,000원이면 I=100,000원, U=200,000원이다",
      () => {
        const result =
          applyBenefitLimits({
            preLimitBenefit:
              300000,
            limits: [
              {
                id:
                  "ANNUAL_LIMIT",
                type: "ANNUAL",
                amount: 1000000,
                usedAmount: 900000,
              },
            ],
          });

        expect(
          result.insuranceBenefit
        ).toBe(100000);
        expect(
          result.limitExceededAmount
        ).toBe(200000);
      }
    );

    it(
      "중증 비급여 입원 자기부담 상한 S_prev=4,800,000원, C=1,000,000원이면 d*=200,000원이다",
      () => {
        const base =
          calculateSelfPayment({
            treatmentCost: 1000000,
            generation: 5,
            careSetting:
              "INPATIENT",
            benefitClass:
              "NON_COVERED",
            severityClass:
              "SEVERE",
            coverages: [
              "SPECIAL_RIDER_1",
            ],
            rules,
          });

        expect(base.amount).toBe(
          300000
        );

        const capped =
          applyDeductibleCap({
            baseDeductible:
              base.amount ?? 0,
            capState: {
              capAmount: 5000000,
              usedAmount: 4800000,
              eligible: true,
            },
          });

        expect(
          capped.adjustedDeductible
        ).toBe(200000);
      }
    );

    it(
      "상한 적용 후 q=800,000원인데 지급 잔여한도 500,000원이면 I=500,000원, 최종 부담=500,000원이다",
      () => {
        const claim =
          calculateClaim({
            usageId:
              "severe-cap-limit",
            treatmentName:
              "중증 비급여 입원",
            medicalCost: 1000000,
            coveredAmount:
              1000000,
            excludedAmount: 0,
            baseDeductible:
              300000,
            deductibleCapState: {
              capAmount: 5000000,
              usedAmount: 4800000,
              eligible: true,
            },
            benefitLimits: [
              {
                id:
                  "REMAINING_LIMIT",
                type: "ANNUAL",
                amount: 500000,
                usedAmount: 0,
              },
            ],
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.adjustedDeductible
        ).toBe(200000);
        expect(
          claim.preLimitBenefit
        ).toBe(800000);
        expect(
          claim.insuranceBenefit
        ).toBe(500000);
        expect(
          claim.limitExceededAmount
        ).toBe(300000);
        expect(
          claim.finalMedicalBurden
        ).toBe(500000);
      }
    );

    it(
      "전액 보장 제외 M=100,000원은 C=0, E=100,000원, I=0이다",
      () => {
        const excluded =
          calculateExcludedExpense({
            treatmentCost: 100000,
            generation: 5,
            benefitClass:
              "NON_COVERED",
            severityClass:
              "NON_SEVERE",
            coverages: [],
          });

        expect(excluded.status).toBe(
          "EXCLUDED"
        );
        expect(excluded.amount).toBe(
          100000
        );

        const claim =
          calculateClaim({
            usageId: "excluded",
            treatmentName:
              "보장 제외 치료",
            medicalCost: 100000,
            coveredAmount: 0,
            excludedAmount: 100000,
            baseDeductible: 0,
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.insuranceBenefit
        ).toBe(0);
        expect(
          claim.finalMedicalBurden
        ).toBe(100000);
      }
    );

    it(
      "월 보험료 45,000원은 연 보험료 540,000원이다",
      () => {
        expect(
          calculateAnnualPremium(
            45000
          )
        ).toBe(540000);
      }
    );

    it(
      "연 보험료 540,000원, ΣM=1,000,000원, ΣI=700,000원이면 총부담은 840,000원이다",
      () => {
        const annualPremium =
          calculateAnnualPremium(
            45000
          );

        const medicalCost =
          1000000;

        const insuranceBenefit =
          700000;

        const totalBurden =
          annualPremium +
          medicalCost -
          insuranceBenefit;

        expect(totalBurden).toBe(
          840000
        );
      }
    );

    it(
      "연 100일 한도에서 과거 99일 사용 후 같은 진료일의 2회 치료는 모두 100번째 날로 처리한다",
      () => {
        const result =
          calculateScenario({
            option: "TARGET_5G",
            year: 2026,
            generation: 5,
            annualPremium: 0,
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            usages: [
              {
                id: "same-day-sp2",
                treatmentName: "같은 날 비중증 비급여 통원",
                careSetting: "OUTPATIENT",
                benefitClass: "NON_COVERED",
                severityClass: "NON_SEVERE",
                frequency: 2,
                unitCost: 80000,
                coveredAmount: 80000,
                treatmentDate: "2026-09-05",
              },
            ],
            ruleSet: scenarioRuleSet,
            usageContexts: {
              "same-day-sp2": {
                usedBenefitCountByLimitId: {
                  G5_SP2_OUTPATIENT_DAYS: 99,
                },
              },
            },
            assumptions: {
              assumeEntireMedicalCostCovered: false,
              assumeNoPriorLimitUsage: true,
              assumeEachOccurrenceSeparate: false,
            },
          });

        expect(result.items).toHaveLength(2);

        expect(
          result.items.map(
            (item) =>
              item.insuranceBenefit
          )
        ).toEqual([
          30000,
          30000,
        ]);

        expect(
          result.items.map(
            (item) =>
              item.limitExceededAmount
          )
        ).toEqual([0, 0]);
      }
    );

    it(
      "연 100일 한도에서 과거 99일 사용 후 서로 다른 진료일 2회면 첫날만 지급되고 101번째 날은 횟수한도로 차단한다",
      () => {
        const result =
          calculateScenario({
            option: "TARGET_5G",
            year: 2026,
            generation: 5,
            annualPremium: 0,
            coverages: [
              "SPECIAL_RIDER_2",
            ],
            usages: [
              {
                id: "day-100",
                treatmentName: "100번째 통원일",
                careSetting: "OUTPATIENT",
                benefitClass: "NON_COVERED",
                severityClass: "NON_SEVERE",
                frequency: 1,
                unitCost: 80000,
                coveredAmount: 80000,
                treatmentDate: "2026-09-05",
              },
              {
                id: "day-101",
                treatmentName: "101번째 통원일",
                careSetting: "OUTPATIENT",
                benefitClass: "NON_COVERED",
                severityClass: "NON_SEVERE",
                frequency: 1,
                unitCost: 80000,
                coveredAmount: 80000,
                treatmentDate: "2026-09-06",
              },
            ],
            ruleSet: scenarioRuleSet,
            usageContexts: {
              "day-100": {
                usedBenefitCountByLimitId: {
                  G5_SP2_OUTPATIENT_DAYS: 99,
                },
              },
            },
            assumptions: {
              assumeEntireMedicalCostCovered: false,
              assumeNoPriorLimitUsage: true,
              assumeEachOccurrenceSeparate: false,
            },
          });

        expect(result.items).toHaveLength(2);

        expect(
          result.items[0]
            .insuranceBenefit
        ).toBe(30000);

        expect(
          result.items[1]
            .insuranceBenefit
        ).toBe(0);

        expect(
          result.items[1]
            .limitExceededAmount
        ).toBe(30000);

        expect(
          result.items[1]
            .finalMedicalBurden
        ).toBe(80000);
      }
    );

    it(
      "핵심 불변식 M-I = E+d*+U가 유지된다",
      () => {
        const claim =
          calculateClaim({
            usageId:
              "invariant",
            treatmentName:
              "불변식 테스트",
            medicalCost: 1000000,
            coveredAmount: 900000,
            excludedAmount: 100000,
            baseDeductible:
              450000,
            benefitLimits: [
              {
                id:
                  "TEST_LIMIT",
                type: "ANNUAL",
                amount: 300000,
                usedAmount: 0,
              },
            ],
            benefitLimitsConfirmed:
              true,
          });

        expect(
          claim.insuranceBenefit
        ).toBe(300000);

        expect(
          claim.finalMedicalBurden
        ).toBe(
          (
            claim.excludedAmount ??
            0
          ) +
            (
              claim.adjustedDeductible ??
              0
            ) +
            (
              claim.limitExceededAmount ??
              0
            )
        );
      }
    );
  }
);