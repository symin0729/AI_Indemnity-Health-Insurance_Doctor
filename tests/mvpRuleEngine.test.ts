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
  calculationService,
  type CalculationInput,
} from "../src/services/calculationService";

import type {
  SelfPaymentRule,
  RuleSet,
} from "../src/engine/loadRuleSet";

const rules: SelfPaymentRule[] = [
  {
    ruleId:
      "G3_MRI_OUTPATIENT",

    generation: 3,

    careSetting:
      "OUTPATIENT",

    benefitClass:
      "NON_COVERED",

    severityClass:
      "NON_SEVERE",

    requiredCoverage:
      "NON_COVERED",

    selfPaymentRate: 0.3,

    minimumSelfPayment:
      20000,

    description:
      "3세대 비급여 MRI 통원 MVP 검증 룰",
  },
  {
    ruleId:
      "G5_SP2_OUTPATIENT",

    generation: 5,

    careSetting:
      "OUTPATIENT",

    benefitClass:
      "NON_COVERED",

    severityClass:
      "NON_SEVERE",

    requiredCoverage:
      "SPECIAL_RIDER_2",

    selfPaymentRate: 0.5,

    description:
      "5세대 비중증 비급여 통원 치료 MVP 시연 룰",
  },
];

const ruleSet: RuleSet = {
  rulesetVersion:
    "mvp-v1",

  rules,
};

describe(
  "AI 실손 닥터 MVP 룰 엔진",
  () => {
    it(
      "5세대 비중증 비급여 통원 + 특약2이면 G5_SP2_OUTPATIENT를 동일하게 적용한다",
      () => {
        const run = () =>
          calculateSelfPayment({
            treatmentCost:
              400000,

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

        const first =
          run();

        expect(first).toEqual({
          amount: 200000,

          ruleId:
            "G5_SP2_OUTPATIENT",

          warning: null,
        });

        for (
          let index = 0;
          index < 100;
          index += 1
        ) {
          expect(
            run()
          ).toEqual(first);
        }
      }
    );

    it(
      "5세대 비급여인데 특약2가 없으면 치료비 전액을 G5_EXCLUSION으로 분리한다",
      () => {
        const result =
          calculateExcludedExpense({
            treatmentCost:
              400000,

            generation: 5,

            benefitClass:
              "NON_COVERED",

            coverages: [],
          });

        expect(
          result.status
        ).toBe("EXCLUDED");

        expect(
          result.amount
        ).toBe(400000);

        expect(
          result.ruleId
        ).toBe(
          "G5_EXCLUSION"
        );
      }
    );

    it(
      "UNKNOWN 급여 여부는 임의 분류하지 않는다",
      () => {
        const result =
          calculateSelfPayment({
            treatmentCost:
              400000,

            generation: 5,

            careSetting:
              "OUTPATIENT",

            benefitClass:
              "UNKNOWN",

            severityClass:
              "NON_SEVERE",

            coverages: [
              "SPECIAL_RIDER_2",
            ],

            rules,
          });

        expect(
          result.amount
        ).toBeNull();

        expect(
          result.ruleId
        ).toBeNull();

        expect(
          result.warning
        ).toBe(
          "급여 여부 확인이 필요합니다."
        );
      }
    );

    it(
      "5세대 총부담은 보험료 + 자기부담 + 보장 제외 의료비와 일치한다",
      () => {
        const annualPremium =
          calculateAnnualPremium(
            35000
          );

        const selfPayment =
          calculateSelfPayment({
            treatmentCost:
              800000,

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

        const excluded =
          calculateExcludedExpense({
            treatmentCost:
              800000,

            generation: 5,

            benefitClass:
              "NON_COVERED",

            coverages: [
              "SPECIAL_RIDER_2",
            ],
          });

        expect(
          annualPremium
        ).toBe(420000);

        expect(
          selfPayment.amount
        ).toBe(400000);

        expect(
          excluded.amount
        ).toBe(0);

        const totalBurden =
          annualPremium +
          (
            selfPayment.amount ??
            0
          ) +
          (
            excluded.amount ??
            0
          );

        expect(
          totalBurden
        ).toBe(820000);
      }
    );

    it(
      "3세대 최소 자기부담금은 회당 계산 후 횟수만큼 합산한다",
      () => {
        const input:
          CalculationInput = {
          contract: {
            insurer:
              "INS_001",

            productName:
              "무배당 실손의료비보험",

            inceptionDate:
              "2018-03-01",

            generation: 3,

            monthlyPremium:
              60000,

            renewalCycleMonths:
              12,

            reentryCycleMonths:
              180,

            coverages: [
              "NON_COVERED",
            ],
          },

          target5GMonthlyPremium:
            35000,

          target5GCoverages: [
            "SPECIAL_RIDER_2",
          ],

          usages: [
            {
              id:
                "minimum-test",

              treatmentName:
                "MRI 저비용 테스트",

              careSetting:
                "OUTPATIENT",

              benefitClass:
                "NON_COVERED",

              severityClass:
                "NON_SEVERE",

              frequency: 2,

              unitCost: 30000,
            },
          ],

          ruleSet,
        };

        const result =
          calculationService.calculate(
            input
          );

        /**
         * 회당 30,000원의 30% = 9,000원
         * 최소 자기부담 20,000원이 더 크므로
         * 20,000원 × 2회 = 40,000원
         */
        expect(
          result.current
            .totalSelfPayment
        ).toBe(40000);

        expect(
          result.current
            .items[0]
            .selfPaymentResult
            .ruleId
        ).toBe(
          "G3_MRI_OUTPATIENT"
        );

        expect(
          result.current
            .totalExcludedExpense
        ).toBe(0);
      }
    );

    it(
      "MRI 40만원 2회 샘플은 현재 3세대 96만원, 5세대 82만원으로 재현된다",
      () => {
        const input:
          CalculationInput = {
          contract: {
            insurer:
              "INS_001",

            productName:
              "무배당 실손의료비보험",

            inceptionDate:
              "2018-03-01",

            generation: 3,

            monthlyPremium:
              60000,

            renewalCycleMonths:
              12,

            reentryCycleMonths:
              180,

            coverages: [
              "NON_COVERED",
            ],
          },

          target5GMonthlyPremium:
            35000,

          target5GCoverages: [
            "SPECIAL_RIDER_2",
          ],

          usages: [
            {
              id:
                "sample-mri-001",

              treatmentName:
                "MRI",

              careSetting:
                "OUTPATIENT",

              benefitClass:
                "NON_COVERED",

              severityClass:
                "NON_SEVERE",

              frequency: 2,

              unitCost:
                400000,
            },
          ],

          ruleSet,
        };

        const first =
          calculationService.calculate(
            input
          );

        expect(
          first.current
            .annualPremium
        ).toBe(720000);

        expect(
          first.current
            .totalSelfPayment
        ).toBe(240000);

        expect(
          first.current
            .totalExcludedExpense
        ).toBe(0);

        expect(
          first.current
            .totalAnnualCost
        ).toBe(960000);

        expect(
          first.target5G
            .annualPremium
        ).toBe(420000);

        expect(
          first.target5G
            .totalSelfPayment
        ).toBe(400000);

        expect(
          first.target5G
            .totalExcludedExpense
        ).toBe(0);

        expect(
          first.target5G
            .totalAnnualCost
        ).toBe(820000);

        expect(
          first.current
            .items[0]
            .selfPaymentResult
            .ruleId
        ).toBe(
          "G3_MRI_OUTPATIENT"
        );

        expect(
          first.target5G
            .items[0]
            .selfPaymentResult
            .ruleId
        ).toBe(
          "G5_SP2_OUTPATIENT"
        );

        for (
          let index = 0;
          index < 100;
          index += 1
        ) {
          expect(
            calculationService.calculate(
              input
            )
          ).toEqual(first);
        }
      }
    );
  }
);
