import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';
import { describe, expect, it } from "vitest";
import { loadTreatmentSample, sampleScenarioService } from "../src/services/sampleScenarioService";
import { samplePolicyService } from "../src/services/samplePolicyService";
import { calculateSamsungAnnualBreakEven, calculateSamsungAnnualComparison } from "../src/engine/calculateSamsungComparison";
import { useAnalysisStore } from "../src/store/useAnalysisStore";
import { parseGen23Form, restoreGen23Form } from "../src/domain/samsungGen23Form";
import { calculateSamsungGen2Sample } from "../src/engine/calculateSamsungGen2";
import { calculateSamsungGen3Sample } from "../src/engine/calculateSamsungGen3";
import { shouldDisableAddTreatmentButton } from "../src/pages/M02InputPage/treatmentButtonState";
import { createDraftFromUsage, createEmptyTreatmentDraft, getSeparateVisitWarningMessage, getTreatmentAddButtonLabel, getTreatmentAddLabel, getTreatmentAdditionalInfoFields } from "../src/pages/M02InputPage/treatmentSequence";
import { prepareUsageForSamsungComparison } from "../src/pages/M04ResultPage/M04ResultPage";

describe("explicit treatment sample loading", () => {
  it.each(["LOW_USAGE", "NON_COVERED", "COVERAGE_GAP"] as const)("%s fills required Gen2/3 fields through the form", id => {
    for (const generation of [2, 3] as const) {
      const scenario = loadTreatmentSample(id, generation);
      const usage = scenario.plannedUsages[0];
      const saved = { ...usage, ...parseGen23Form(restoreGen23Form(usage)) };
      expect(saved.treatmentName).toBe("MRI");
      expect(saved.unitCost).toBeGreaterThanOrEqual(300000);
      expect(saved.careSetting).toBe(saved.gen23CareSetting);
      expect(scenario.notice).toContain("예제 가정");
      for (const variant of ["standard", "selected2"] as const) {
        const result = (generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(variant, saved);
        expect(result.status).toBe("DRAFT_CALCULATED");
        if (result.status === "DRAFT_CALCULATED") expect(result.claim).toBeGreaterThan(0);
      }
    }
  });
  it("feeds a loaded outpatient sample through the annual comparison and break-even engines", () => {
    const contract = samplePolicyService.load("NON_COVERED");
    const scenario = loadTreatmentSample("NON_COVERED", 3, "OUTPATIENT");
    const usage = scenario.plannedUsages[0];
    const selections = {
      ...useAnalysisStore.getState().productCalculationSelections,
      samsungGen23Variant: "standard" as const,
    };
    const comparison = calculateSamsungAnnualComparison(
      contract,
      35_000,
      [],
      selections,
      [usage],
      { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts },
    );
    const breakEven = calculateSamsungAnnualBreakEven(
      contract,
      35_000,
      [],
      selections,
      [usage],
      { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts },
      usage.id,
    );

    expect(comparison.complete).toBe(true);
    expect(comparison.currentTotal).not.toBeNull();
    expect(comparison.targetTotal).not.toBeNull();
    expect(breakEven?.points).toHaveLength(121);
    expect(breakEven?.status).not.toBe("CONFIRMATION_REQUIRED");
  });
  it("reproduces the featured MRI result-screen case", () => {
    const contract = samplePolicyService.load("NON_COVERED");
    const scenario = loadTreatmentSample("NON_COVERED", 3, "MRI");
    const usage = scenario.plannedUsages[0];
    const selections = {
      ...useAnalysisStore.getState().productCalculationSelections,
      samsungGen23Variant: "standard" as const,
      gen5NonSevereRider: "ENROLLED" as const,
    };
    const comparison = calculateSamsungAnnualComparison(contract, 35_000, ["SPECIAL_RIDER_2"], selections, [usage], { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts });
    const breakEven = calculateSamsungAnnualBreakEven(contract, 35_000, ["SPECIAL_RIDER_2"], selections, [usage], { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts }, usage.id);

    expect(usage.frequency).toBe(8);
    expect(comparison.currentTotal).toBe(1_680_000);
    expect(comparison.targetTotal).toBe(2_020_000);
    expect(comparison.currentTotal! - comparison.targetTotal!).toBe(-340_000);
    expect(breakEven?.threshold).toBe(4);
  });
  it.each([
    ["OUTPATIENT", "EXAM"],
    ["OUTPATIENT", "MRI"],
    ["EXAM", "MRI"],
  ] as const)("calculates two registered samples together: %s + %s", (firstKind, secondKind) => {
    const contract = samplePolicyService.load("NON_COVERED");
    const firstScenario = loadTreatmentSample("NON_COVERED", 3, firstKind);
    const secondScenario = loadTreatmentSample("NON_COVERED", 3, secondKind);
    const usages = [firstScenario.plannedUsages[0], secondScenario.plannedUsages[0]];
    const selections = {
      ...useAnalysisStore.getState().productCalculationSelections,
      samsungGen23Variant: "standard" as const,
      gen5NonSevereRider: "ENROLLED" as const,
    };
    const comparison = calculateSamsungAnnualComparison(contract, 35_000, ["SPECIAL_RIDER_2"], selections, usages, { ...secondScenario.calculationAssumptions, targetContractFacts: confirmedContractFacts });
    const breakEvens = usages.map((usage) => calculateSamsungAnnualBreakEven(contract, 35_000, ["SPECIAL_RIDER_2"], selections, usages, { ...secondScenario.calculationAssumptions, targetContractFacts: confirmedContractFacts }, usage.id));

    expect(comparison.complete, `${firstKind}+${secondKind}`).toBe(true);
    expect(comparison.items).toHaveLength(2);
    expect(comparison.medicalCost).toBe(usages.reduce((sum, usage) => sum + usage.frequency * usage.unitCost, 0));
    for (const result of breakEvens) {
      expect(result?.points.length).toBe(121);
      expect(result?.status).not.toBe("CONFIRMATION_REQUIRED");
    }
  });
  it.each(["OUTPATIENT", "EXAM", "MRI"] as const)("%s sample produces different totals and a visible break-even reversal", kind => {
    for (const sampleId of ["LOW_USAGE", "NON_COVERED", "COVERAGE_GAP"] as const) {
      const contract = samplePolicyService.load(sampleId);
      const scenario = loadTreatmentSample(sampleId, 3, kind);
      const usage = scenario.plannedUsages[0];
      const selections = {
        ...useAnalysisStore.getState().productCalculationSelections,
        samsungGen23Variant: "standard" as const,
      };
      const comparison = calculateSamsungAnnualComparison(contract, 35_000, [], selections, [usage], { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts });
      const breakEven = calculateSamsungAnnualBreakEven(contract, 35_000, [], selections, [usage], { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts }, usage.id);

      expect(comparison.complete, sampleId).toBe(true);
      expect(comparison.currentTotal, sampleId).not.toBe(comparison.targetTotal);
      expect(breakEven?.status, sampleId).not.toBe("CONFIRMATION_REQUIRED");
      expect(breakEven?.points.length, sampleId).toBeGreaterThan(1);
      // 5세대 급여 통원 1회 20만원 한도(약관 제6조 ⑤) 반영 후 외래 검사 샘플의 차이는 2만원 수준이다.
      expect(Math.abs(comparison.currentTotal! - comparison.targetTotal!), sampleId).toBeGreaterThanOrEqual(10_000);
    }
  });
  it.each(["EXAM", "MRI"] as const)("restores %s Samsung inputs from saved Gen2/3 form fields", kind => {
    const contract = samplePolicyService.load("NON_COVERED");
    const scenario = loadTreatmentSample("NON_COVERED", 3, kind);
    const original = scenario.plannedUsages[0];
    const savedWithoutCommonInput = { ...original, samsungCalculationInput: undefined, samsungGen5Facts: undefined };
    const usage = prepareUsageForSamsungComparison(savedWithoutCommonInput, { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts });
    const selections = {
      ...useAnalysisStore.getState().productCalculationSelections,
      samsungGen23Variant: "standard" as const,
    };
    const comparison = calculateSamsungAnnualComparison(contract, 35_000, [], selections, [usage], { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts });
    const breakEven = calculateSamsungAnnualBreakEven(contract, 35_000, [], selections, [usage], { ...scenario.calculationAssumptions, targetContractFacts: confirmedContractFacts }, usage.id);

    expect(usage.samsungCalculationInput?.eligibleExpense).toBe(original.coveredAmount);
    expect(usage.samsungCalculationInput?.policyExclusionsCleared).toBe(true);
    expect(comparison.complete).toBe(true);
    expect(breakEven?.status).toBe("AVAILABLE");
    expect(breakEven?.threshold).toBeGreaterThan(0);
  });
  it("leaves the original low-usage contract sample empty and creates fresh examples", () => {
    expect(sampleScenarioService.load("LOW_USAGE").plannedUsages).toEqual([]);
    const first = loadTreatmentSample("LOW_USAGE", 5);
    first.plannedUsages[0].unitCost = 1;
    expect(loadTreatmentSample("LOW_USAGE", 5).plannedUsages[0].unitCost).toBe(420000);
    expect(first.plannedUsages[0].evidenceStatus).toBeUndefined();
  });
});

it.each(["OUTPATIENT", "EXAM"] as const)("%s covers common base-treatment examples without MRI rider fields", kind => {
  for (const generation of [2, 3] as const) {
    const sample = loadTreatmentSample("LOW_USAGE", generation, kind);
    const usage = sample.plannedUsages[0];
    expect(usage.benefitClass).toBe("COVERED");
    expect(usage.frequency).toBeGreaterThan(1);
    expect(usage.gen23AggregationUnit).toBeUndefined();
    expect(sample.notice).toContain("평균 진료비가 아닙니다");
    for (const variant of ["standard", "selected2"] as const) {
      expect((generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(variant, usage).status).toBe("DRAFT_CALCULATED");
    }
  }
});

it.each(["OUTPATIENT", "EXAM", "MRI"] as const)("%s sample amount changes by insurance generation", kind => {
  const gen2 = loadTreatmentSample("NON_COVERED", 2, kind).plannedUsages[0];
  const gen3 = loadTreatmentSample("NON_COVERED", 3, kind).plannedUsages[0];
  const gen4 = loadTreatmentSample("NON_COVERED", 4, kind).plannedUsages[0];

  expect(gen2.unitCost).toBeLessThan(gen3.unitCost);
  expect(gen3.unitCost).toBeLessThan(gen4.unitCost);
  expect(gen2.frequency).toBe(gen3.frequency);
  expect(gen3.frequency).toBe(gen4.frequency);
});

it("keeps the add-treatment button enabled while the form is open unless the limit is reached", () => {
  expect(shouldDisableAddTreatmentButton({ isTreatmentFormOpen: true, isTreatmentLimitReached: false })).toBe(false);
  expect(shouldDisableAddTreatmentButton({ isTreatmentFormOpen: true, isTreatmentLimitReached: true })).toBe(true);
  expect(shouldDisableAddTreatmentButton({ isTreatmentFormOpen: false, isTreatmentLimitReached: false })).toBe(false);
});

it("keeps the action button label plain and shows sequence numbers only in the form title", () => {
  expect(getTreatmentAddButtonLabel()).toBe("+ 치료 추가");
  expect(getTreatmentAddLabel(0)).toBe("치료 추가 1");
  expect(getTreatmentAddLabel(1)).toBe("치료 추가 2");
  expect(getTreatmentAddLabel(2)).toBe("치료 추가 3");
});

it("keeps additional treatment fields inside the main treatment form in a fixed order", () => {
  expect(getTreatmentAdditionalInfoFields()).toEqual([
    { key: "treatmentDate", label: "진료 예정일" },
    { key: "severityClass", label: "산정특례 및 치료 관련성" },
    { key: "coveredAmount", label: "회당 보장대상 인정금액 (C)" },
  ]);
});

it("preserves slot-specific treatment drafts when switching between treatment add slots", () => {
  const slot1 = createEmptyTreatmentDraft();
  const slot2 = createEmptyTreatmentDraft();
  slot1.treatmentName = "MRI";
  slot2.treatmentName = "CT";

  expect(slot1.treatmentName).toBe("MRI");
  expect(slot2.treatmentName).toBe("CT");
  expect(slot1).not.toEqual(slot2);
});

it("creates a slot draft from a loaded sample without losing treatment fields", () => {
  const samsungCalculationInput = {
    eligibleExpense: 300000,
    requiredCoverageConfirmed: true,
    exclusionsCleared: true,
  };
  const draft = createDraftFromUsage({
    treatmentName: "MRI",
    careSetting: "OUTPATIENT",
    benefitClass: "NON_COVERED",
    severityClass: "NON_SEVERE",
    frequency: 2,
    unitCost: 400000,
    treatmentDate: "2026-11-01",
    treatmentCategory: "MRI",
    institutionType: "GENERAL_TERTIARY",
    copayInstitution: "TERTIARY",
    copayRegion: "DONG",
    healthInsuranceCopayRate: 0.4,
    coveredAmount: 300000,
    claimCause: "DISEASE",
    nationalHealthInsuranceStatus: "UNKNOWN",
    samsungCalculationInput,
  } as any);

  expect(draft.treatmentName).toBe("MRI");
  expect(draft.treatmentDate).toBe("2026-11-01");
  expect(draft.coveredAmount).toBe("300000");
  expect(draft.copayInstitution).toBe("TERTIARY");
  // 2·3세대 세부 입력도 샘플 값으로 채운다(비워 두면 치료를 추가할 때 샘플 값이 사라진다).
  expect(draft.gen23Form).toMatchObject({ claimCause: "DISEASE" });
  expect(draft.sourceUsage?.samsungCalculationInput).toEqual(samsungCalculationInput);
});

it("shows a clear warning to enable separate-visit calculation when treatment dates differ", () => {
  expect(getSeparateVisitWarningMessage()).toBe(
    "치료 추가 1, 2, 3의 진료 예정일이 모두 다릅니다. 각 치료를 별도 방문으로 계산을 선택해주세요."
  );
});
