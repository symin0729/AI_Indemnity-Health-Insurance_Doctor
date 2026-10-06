import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';
import { describe, expect, it } from "vitest";

import { calculateSamsungAnnualBreakEven, calculateSamsungAnnualComparison } from "../src/engine/calculateSamsungComparison";
import { calculateBreakEvenBySimulation } from "../src/engine/calculateBreakEven";
import type { MedicalUsage } from "../src/domain/medical";
import { allocateCombinedTreatmentFrequencies, prepareUsageForSamsungComparison } from "../src/pages/M04ResultPage/M04ResultPage";
import { samplePolicyService, type SampleId } from "../src/services/samplePolicyService";
import { loadTreatmentSample, type TreatmentSampleKind } from "../src/services/sampleScenarioService";
import type { ProductCalculationSelections } from "../src/store/useAnalysisStore";

const profiles: SampleId[] = ["LOW_USAGE", "NON_COVERED", "COVERAGE_GAP"];
const kinds: TreatmentSampleKind[] = ["OUTPATIENT", "EXAM", "NON_COVERED_MRI"];
const generations = [1, 2, 3, 4, 5] as const;
const variants = ["standard", "selected2"] as const;
const riderStates = ["ENROLLED", "NOT_ENROLLED"] as const;
const amountFactors = [0.5, 1, 2] as const;
const frequencies = [1, 4, 12] as const;
const assumptions = { targetContractFacts: confirmedContractFacts, currentContractFacts: confirmedContractFacts,
  assumeEntireMedicalCostCovered: false,
  assumeNoPriorLimitUsage: true,
  assumeEachOccurrenceSeparate: true,
  // 새 샘플은 5세대 산정특례 여부·입원 종별을 비워 두므로 소비자용과 같은 가정으로 채운다.
  assumeNonSevereNonCovered: true,
  assumeNonCoveredInpatientSmallHospital: true,
  assumeManualTherapyImprovement: true,
  assumeNoPolicyExclusions: true,
};

function selections(generation: number, variant: "standard" | "selected2", rider: "ENROLLED" | "NOT_ENROLLED"): ProductCalculationSelections {
  return {
    gen1Product: "SAMSUNG_0904_2",
    gen1ContractBasis: "SAMPLE_SIMULATION",
    gen1D1Coverage: "INJURY",
    gen4NonCoveredRider: rider,
    gen5ContractType: "GENERAL",
    gen5SevereRider: "ENROLLED",
    gen5NonSevereRider: rider,
    samsungGen23Variant: generation === 2 || generation === 3 ? variant : "standard",
  };
}

function resizeUsage(source: MedicalUsage, factor: number, frequency: number): MedicalUsage {
  const amount = Math.max(10_000, Math.round((source.unitCost * factor) / 10_000) * 10_000);
  return prepareUsageForSamsungComparison({
    ...source,
    id: `${source.id}-${factor}-${frequency}`,
    frequency,
    unitCost: amount,
    patientPaidAmount: amount,
    coveredAmount: amount,
    gen23CoveredCopay: source.benefitClass === "COVERED" ? amount : 0,
    gen23NonCoveredExpense: source.benefitClass === "NON_COVERED" ? amount : 0,
    gen23EligibleExpense: source.gen23EligibleExpense === undefined ? undefined : amount,
    samsungCalculationInput: {
      ...source.samsungCalculationInput,
      eligibleExpense: amount,
      contractBenefitCap: source.samsungCalculationInput?.contractBenefitCap ?? 50_000_000,
      perOccurrenceBenefitCap: source.samsungCalculationInput?.perOccurrenceBenefitCap ?? 200_000,
      outpatientBenefitCap: source.samsungCalculationInput?.outpatientBenefitCap ?? 250_000,
      prescriptionBenefitCap: source.samsungCalculationInput?.prescriptionBenefitCap ?? 50_000,
    },
  }, assumptions);
}

describe("valid user-input calculation matrix", () => {
  it("distributes one combined x-axis count across all registered treatments", () => {
    const usages = kinds.map((kind) => loadTreatmentSample("NON_COVERED", 3, kind).plannedUsages[0]);
    const allocated = allocateCombinedTreatmentFrequencies(usages, 37);
    expect(allocated.reduce((sum, usage) => sum + usage.frequency, 0)).toBe(37);
    expect(allocated).toHaveLength(3);
    expect(allocateCombinedTreatmentFrequencies(usages, 0)).toEqual([]);
    const originalTotal = usages.reduce((sum, usage) => sum + usage.frequency, 0);
    expect(allocateCombinedTreatmentFrequencies(usages, originalTotal).map((usage) => usage.frequency))
      .toEqual(usages.map((usage) => usage.frequency));
  });

  it("moves the single combined chart for one, two, and three treatments with edited amounts", () => {
    const signatures: string[] = [];
    for (const count of [1, 2, 3]) {
      const usages = kinds.slice(0, count).map((kind, index) => {
        const source = loadTreatmentSample("NON_COVERED", 3, kind).plannedUsages[0];
        return resizeUsage({ ...source, id: `combined-${kind}` }, 0.75 + index * 0.5, 3 + index * 2);
      });
      const contract = { ...samplePolicyService.load("NON_COVERED"), generation: 3 };
      const chart = calculateBreakEvenBySimulation({
        minFrequency: 0,
        maxFrequency: 120,
        evaluate: (totalFrequency) => {
          const result = calculateSamsungAnnualComparison(
            contract,
            35_000,
            ["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"],
            selections(3, "standard", "ENROLLED"),
            allocateCombinedTreatmentFrequencies(usages, totalFrequency),
            assumptions,
          );
          return { currentTotalBurden: result.currentTotal, targetTotalBurden: result.targetTotal };
        },
      });
      expect(chart.points, `${count} combined treatments`).toHaveLength(121);
      expect(new Set(chart.points.map((point) => point.currentTotalBurden)).size).toBeGreaterThan(1);
      expect(new Set(chart.points.map((point) => point.targetTotalBurden)).size).toBeGreaterThan(1);
      signatures.push(JSON.stringify(chart.points.map((point) => [point.currentTotalBurden, point.targetTotalBurden])));
    }
    expect(new Set(signatures).size).toBe(3);
  }, 120_000);
  it("routes every valid annual-comparison combination to numeric totals", () => {
    let checked = 0;
    for (const generation of generations) {
      for (const profile of profiles) {
        for (const kind of kinds) {
          for (const variant of variants) {
            for (const rider of riderStates) {
              for (const amountFactor of amountFactors) {
                for (const frequency of frequencies) {
                  const contract = { ...samplePolicyService.load(profile), generation };
                  const scenario = loadTreatmentSample(profile, generation, kind);
                  const resized = resizeUsage(scenario.plannedUsages[0], amountFactor, frequency);
                  const usage = generation === 1 ? { ...resized, claimCause: "INJURY" as const } : resized;
                  const result = calculateSamsungAnnualComparison(
                    contract,
                    35_000,
                    rider === "ENROLLED" ? ["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"] : [],
                    selections(generation, variant, rider),
                    [usage],
                    assumptions,
                  );
                  const label = JSON.stringify({ generation, profile, kind, variant, rider, amountFactor, frequency });
                  expect(result.complete, label).toBe(true);
                  expect(result.currentTotal, label).not.toBeNull();
                  expect(result.targetTotal, label).not.toBeNull();
                  expect(Number.isFinite(result.currentTotal), label).toBe(true);
                  expect(Number.isFinite(result.targetTotal), label).toBe(true);
                  checked += 1;
                }
              }
            }
          }
        }
      }
    }
    expect(checked).toBe(1_620);
  });

  it("produces complete 0~120 chart series across representative generations and treatments", () => {
    let checked = 0;
    for (const generation of generations) {
      for (const profile of profiles) {
        for (const kind of kinds) {
          for (const rider of riderStates) {
            const contract = { ...samplePolicyService.load(profile), generation };
            const scenario = loadTreatmentSample(profile, generation, kind);
            const resized = resizeUsage(scenario.plannedUsages[0], 1, 8);
            const usage = generation === 1 ? { ...resized, claimCause: "INJURY" as const } : resized;
            const result = calculateSamsungAnnualBreakEven(
              contract,
              35_000,
              rider === "ENROLLED" ? ["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"] : [],
              selections(generation, "standard", rider),
              [usage],
              assumptions,
              usage.id,
            );
            const label = JSON.stringify({ generation, profile, kind, rider });
            expect(result, label).not.toBeNull();
            expect(result?.status, label).not.toBe("CONFIRMATION_REQUIRED");
            expect(result?.points, label).toHaveLength(121);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(90);
  }, 120_000);

  it("keeps every two- and three-treatment combination connected to annual totals", () => {
    const kindSets: TreatmentSampleKind[][] = [
      ["OUTPATIENT", "EXAM"],
      ["OUTPATIENT", "NON_COVERED_MRI"],
      ["EXAM", "NON_COVERED_MRI"],
      ["OUTPATIENT", "EXAM", "NON_COVERED_MRI"],
    ];
    let checked = 0;
    for (const generation of generations) {
      for (const profile of profiles) {
        for (const rider of riderStates) {
          for (const kindSet of kindSets) {
            const usages = kindSet.map((kind, index) => {
              const source = loadTreatmentSample(profile, generation, kind).plannedUsages[0];
              const resized = resizeUsage({ ...source, id: `${source.id}-${index}` }, 1, 4 + index);
              return generation === 1 ? { ...resized, claimCause: "INJURY" as const } : resized;
            });
            const result = calculateSamsungAnnualComparison(
              { ...samplePolicyService.load(profile), generation },
              35_000,
              rider === "ENROLLED" ? ["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"] : [],
              selections(generation, "standard", rider),
              usages,
              assumptions,
            );
            const label = JSON.stringify({ generation, profile, rider, kindSet });
            expect(result.complete, label).toBe(true);
            expect(Number.isFinite(result.currentTotal), label).toBe(true);
            expect(Number.isFinite(result.targetTotal), label).toBe(true);
            expect(result.items, label).toHaveLength(kindSet.length);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(120);
  });
});
