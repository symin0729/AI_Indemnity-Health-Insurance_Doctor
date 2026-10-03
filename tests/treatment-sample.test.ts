import { describe, expect, it } from "vitest";
import { loadTreatmentSample, sampleScenarioService } from "../src/services/sampleScenarioService";
import { parseGen23Form, restoreGen23Form } from "../src/domain/samsungGen23Form";
import { calculateSamsungGen2Sample } from "../src/engine/calculateSamsungGen2";
import { calculateSamsungGen3Sample } from "../src/engine/calculateSamsungGen3";
import { shouldDisableAddTreatmentButton } from "../src/pages/M02InputPage/treatmentButtonState";
import { createDraftFromUsage, createEmptyTreatmentDraft, getSeparateVisitWarningMessage, getTreatmentAddButtonLabel, getTreatmentAddLabel, getTreatmentAdditionalInfoFields } from "../src/pages/M02InputPage/treatmentSequence";

describe("explicit treatment sample loading", () => {
  it.each(["LOW_USAGE", "NON_COVERED", "COVERAGE_GAP"] as const)("%s fills required Gen2/3 fields through the form", id => {
    for (const generation of [2, 3] as const) {
      const scenario = loadTreatmentSample(id, generation);
      const usage = scenario.plannedUsages[0];
      const saved = { ...usage, ...parseGen23Form(restoreGen23Form(usage)) };
      expect(saved.treatmentName).toBe("MRI");
      expect(saved.unitCost).toBe(400000);
      expect(saved.careSetting).toBe(saved.gen23CareSetting);
      expect(scenario.notice).toContain("예제 가정");
      for (const variant of ["standard", "selected2"] as const) {
        const result = (generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(variant, saved);
        expect(result).toMatchObject({status: "DRAFT_CALCULATED", claim: generation === 2 ? 250000 : 280000});
      }
    }
  });
  it("leaves the original low-usage contract sample empty and creates fresh examples", () => {
    expect(sampleScenarioService.load("LOW_USAGE").plannedUsages).toEqual([]);
    const first = loadTreatmentSample("LOW_USAGE", 5);
    first.plannedUsages[0].unitCost = 1;
    expect(loadTreatmentSample("LOW_USAGE", 5).plannedUsages[0].unitCost).toBe(400000);
    expect(first.plannedUsages[0].evidenceStatus).toBeUndefined();
  });
});

it.each(["OUTPATIENT", "EXAM"] as const)("%s covers common base-treatment examples without MRI rider fields", kind => {
  for (const generation of [2, 3] as const) {
    const sample = loadTreatmentSample("LOW_USAGE", generation, kind);
    const usage = sample.plannedUsages[0];
    expect(usage.benefitClass).toBe("COVERED");
    expect(usage.frequency).toBe(1);
    expect(usage.gen23AggregationUnit).toBeUndefined();
    expect(sample.notice).toContain("평균 진료비가 아닙니다");
    for (const variant of ["standard", "selected2"] as const) {
      expect((generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(variant, usage).status).toBe("DRAFT_CALCULATED");
    }
  }
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
  } as any);

  expect(draft.treatmentName).toBe("MRI");
  expect(draft.treatmentDate).toBe("2026-11-01");
  expect(draft.coveredAmount).toBe("300000");
  expect(draft.copayInstitution).toBe("TERTIARY");
  expect(draft.gen23Form).toEqual({});
});

it("shows a clear warning to enable separate-visit calculation when treatment dates differ", () => {
  expect(getSeparateVisitWarningMessage()).toBe(
    "치료 추가 1, 2, 3의 진료 예정일이 모두 다릅니다. 각 치료를 별도 방문으로 계산을 선택해주세요."
  );
});
