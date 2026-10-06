import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';
import { describe, expect, it } from "vitest";
import { loadTreatmentSample, sampleScenarioService, TREATMENT_SAMPLE_KINDS } from "../src/services/sampleScenarioService";
import { needsManualTherapyImprovementAssumption } from "../src/domain/manualTherapyCount";
import { samplePolicyService } from "../src/services/samplePolicyService";
import { calculateSamsungAnnualBreakEven, calculateSamsungAnnualComparison } from "../src/engine/calculateSamsungComparison";
import { useAnalysisStore } from "../src/store/useAnalysisStore";
import { parseGen23Form, restoreGen23Form } from "../src/domain/samsungGen23Form";
import { calculateSamsungGen2Sample } from "../src/engine/calculateSamsungGen2";
import { calculateSamsungGen3Sample } from "../src/engine/calculateSamsungGen3";
import { shouldDisableAddTreatmentButton } from "../src/pages/M02InputPage/treatmentButtonState";
import { createDraftFromUsage, createEmptyTreatmentDraft, getSeparateVisitWarningMessage, getTreatmentAddButtonLabel, getTreatmentAddLabel, getTreatmentAdditionalInfoFields } from "../src/pages/M02InputPage/treatmentSequence";
import { prepareUsageForSamsungComparison } from "../src/pages/M04ResultPage/M04ResultPage";

describe("treatment samples (치료 샘플 5종)", () => {
  const SPECS = [
    { kind: "OUTPATIENT", label: "일반 외래 진료", name: "일반 외래 진료", category: "", careSetting: "OUTPATIENT", benefitClass: "COVERED", amount: 20_000, frequency: 4 },
    { kind: "EXAM", label: "일반 외래검사", name: "일반 외래검사", category: "", careSetting: "OUTPATIENT", benefitClass: "COVERED", amount: 40_000, frequency: 3 },
    { kind: "NON_COVERED_MRI", label: "비급여 외래 치료", name: "비급여 외래 치료", category: "MRI", careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", amount: 400_000, frequency: 3 },
    { kind: "MANUAL_THERAPY", label: "도수치료 (11회 이상)", name: "도수치료", category: "MANUAL_THERAPY", careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", amount: 100_000, frequency: 12 },
    { kind: "NON_COVERED_INPATIENT", label: "비급여 입원", name: "비급여 입원 치료", category: "", careSetting: "INPATIENT", benefitClass: "NON_COVERED", amount: 1_500_000, frequency: 1 },
  ] as const;
  const assumptions = {
    targetContractFacts: confirmedContractFacts, currentContractFacts: confirmedContractFacts,
    assumeEntireMedicalCostCovered: false, assumeNoPriorLimitUsage: true, assumeEachOccurrenceSeparate: true,
    assumeNonSevereNonCovered: true, assumeNonCoveredInpatientSmallHospital: true, assumeManualTherapyImprovement: true,
  };
  const selectionsFor = (generation: number) => ({
    ...useAnalysisStore.getState().productCalculationSelections,
    gen1Product: "SAMSUNG_0904_2" as const, gen1ContractBasis: "SAMPLE_SIMULATION" as const, gen1D1Coverage: "INJURY" as const,
    gen4NonCoveredRider: "ENROLLED" as const, gen5ContractType: "GENERAL" as const, gen5SevereRider: "ENROLLED" as const, gen5NonSevereRider: "ENROLLED" as const,
    samsungGen23Variant: "standard" as const,
  });

  it("샘플 버튼 목록과 이름이 명세와 같다", () => {
    expect(TREATMENT_SAMPLE_KINDS.map(({ label }) => label)).toEqual(SPECS.map(({ label }) => label));
    expect(TREATMENT_SAMPLE_KINDS.map(({ kind }) => kind)).toEqual(SPECS.map(({ kind }) => kind));
  });

  it.each(SPECS)("$label: 치료 정보가 세대와 상관없이 같은 고정값으로 채워진다", (spec) => {
    for (const generation of [1, 2, 3, 4, 5]) {
      const usage = loadTreatmentSample("NON_COVERED", generation, spec.kind).plannedUsages[0];
      expect(usage.treatmentName).toBe(spec.name);
      expect(usage.treatmentCategory ?? "").toBe(spec.category);
      expect(usage.careSetting).toBe(spec.careSetting);
      expect(usage.benefitClass).toBe(spec.benefitClass);
      expect(usage.unitCost).toBe(spec.amount);
      expect(usage.patientPaidAmount).toBe(spec.amount);
      expect(usage.coveredAmount).toBe(spec.amount);
      expect(usage.frequency).toBe(spec.frequency);
      expect(usage.institutionType).toBe("CLINIC_HOSPITAL");
      expect(usage.copayInstitution).toBe("CLINIC");
      // 급여 외래만 건강보험 본인부담률 30%, 비급여·입원은 미적용
      if (spec.benefitClass === "COVERED") expect(usage.healthInsuranceCopayRate).toBe(0.3);
      else expect(usage.healthInsuranceCopayRate).toBeUndefined();
      expect(usage.samsungCalculationInput?.priorPaidBenefit).toBe(0);
      expect(usage.samsungCalculationInput?.priorAnnualCount).toBe(0);
      expect(usage.samsungCalculationInput?.otherIndemnityPoliciesExist).toBe(false);
    }
  });

  it("비급여 입원: 2·3세대 입원 구분·병실료 차액 0원·지급한도 5천만원·누적 0원", () => {
    for (const generation of [2, 3]) {
      const usage = loadTreatmentSample("NON_COVERED", generation, "NON_COVERED_INPATIENT").plannedUsages[0];
      expect(usage.gen23CareSetting).toBe("INPATIENT");
      expect(usage.gen23RoomDifference).toBe(0);
      expect(usage.gen23ContractBenefitCap).toBe(50_000_000);
      expect(usage.gen23PriorPaidBenefit).toBe(0);
    }
    expect(loadTreatmentSample("NON_COVERED", 1, "NON_COVERED_INPATIENT").plannedUsages[0].gen1RoomDifference).toBe(0);
  });

  it("도수치료 샘플은 연 12회로 10회 초과 가정 항목이 나오는 경우다", () => {
    expect(needsManualTherapyImprovementAssumption([loadTreatmentSample("NON_COVERED", 4, "MANUAL_THERAPY").plannedUsages[0]])).toBe(true);
  });

  it.each(SPECS)("$label: 1~4세대 현재 계약과 5세대 모두 연간 비교·손익분기가 계산된다", (spec) => {
    for (const generation of [1, 2, 3, 4] as const) {
      const contract = { ...samplePolicyService.load("NON_COVERED"), generation };
      const usage = loadTreatmentSample("NON_COVERED", generation, spec.kind).plannedUsages[0];
      const prepared = prepareUsageForSamsungComparison(generation === 1 ? { ...usage, claimCause: "INJURY" as const } : usage, assumptions);
      const result = calculateSamsungAnnualComparison(contract, 35_000, ["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"], selectionsFor(generation), [prepared], assumptions);
      expect(result.complete, `${spec.kind} gen${generation}: ${JSON.stringify(result.items[0]?.current.reasons)} / ${JSON.stringify(result.items[0]?.target.reasons)}`).toBe(true);
      const breakEven = calculateSamsungAnnualBreakEven(contract, 35_000, ["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"], selectionsFor(generation), [prepared], assumptions, prepared.id);
      // 입원은 한 번 입원 비용이 커서 연간 한도 안에서 계산할 수 있는 횟수까지만 곡선이 그려진다.
      if (spec.careSetting === "OUTPATIENT") expect(breakEven?.points.length, `${spec.kind} gen${generation}`).toBe(121);
      else expect(breakEven?.points.length, `${spec.kind} gen${generation}`).toBeGreaterThan(1);
    }
  });

  it("원래 저이용 계약 샘플은 비워 두고, 치료 샘플은 매번 새 값으로 만든다", () => {
    expect(sampleScenarioService.load("LOW_USAGE").plannedUsages).toEqual([]);
    const first = loadTreatmentSample("LOW_USAGE", 5);
    first.plannedUsages[0].unitCost = 1;
    expect(loadTreatmentSample("LOW_USAGE", 5).plannedUsages[0].unitCost).toBe(20_000);
  });
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
