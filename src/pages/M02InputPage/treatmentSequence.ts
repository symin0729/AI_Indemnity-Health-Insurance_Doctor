import type { MedicalUsage } from "../../domain/medical";
import { restoreGen23Form } from "../../domain/samsungGen23Form";

export type TreatmentDraft = {
  /** 샘플이 제공한 계산 엔진 전용 필드를 등록 시까지 보존한다. */
  sourceUsage?: MedicalUsage;
  treatmentName: string;
  careSetting: "OUTPATIENT" | "INPATIENT";
  benefitClass: string;
  severityClass: string;
  frequency: string;
  unitCost: string;
  treatmentDate: string;
  treatmentCategory: string;
  institutionType: string;
  healthInsuranceCopayRatePercent: string;
  copayInstitution: string;
  copayRegion: string;
  coveredAmount: string;
  claimCause: string;
  nationalHealthInsuranceStatus: string;
  gen23Form: Record<string, string | undefined>;
  gen1CoveredRoomAndTreatment: string;
  gen1RoomDifference: string;
  gen1NonNhiInpatientTotal: string;
  gen1PriorPaidBenefit: string;
  gen1PriorServiceDays: string;
  gen1DaysSinceAccident: string;
  policyExclusionsCleared: boolean;
};

export function createEmptyTreatmentDraft(): TreatmentDraft {
  return {
    treatmentName: "",
    careSetting: "OUTPATIENT",
    benefitClass: "UNKNOWN",
    severityClass: "UNKNOWN",
    frequency: "1",
    unitCost: "",
    treatmentDate: "",
    treatmentCategory: "",
    institutionType: "",
    healthInsuranceCopayRatePercent: "",
    copayInstitution: "",
    copayRegion: "",
    coveredAmount: "",
    claimCause: "UNKNOWN",
    nationalHealthInsuranceStatus: "APPLIED",
    gen23Form: {},
    gen1CoveredRoomAndTreatment: "",
    gen1RoomDifference: "",
    gen1NonNhiInpatientTotal: "",
    gen1PriorPaidBenefit: "",
    gen1PriorServiceDays: "",
    gen1DaysSinceAccident: "",
    policyExclusionsCleared: false,
  };
}

export function createDraftFromUsage(usage?: Partial<MedicalUsage>): TreatmentDraft {
  const emptyDraft = createEmptyTreatmentDraft();

  if (!usage) {
    return emptyDraft;
  }

  return {
    ...emptyDraft,
    sourceUsage: usage as MedicalUsage,
    treatmentName: usage.treatmentName ?? emptyDraft.treatmentName,
    careSetting: usage.careSetting ?? emptyDraft.careSetting,
    benefitClass: usage.benefitClass ?? emptyDraft.benefitClass,
    severityClass: usage.severityClass ?? emptyDraft.severityClass,
    frequency: usage.frequency == null ? emptyDraft.frequency : String(usage.frequency),
    unitCost: usage.unitCost == null ? emptyDraft.unitCost : String(usage.unitCost),
    treatmentDate: usage.treatmentDate ?? emptyDraft.treatmentDate,
    treatmentCategory: usage.treatmentCategory ?? emptyDraft.treatmentCategory,
    institutionType: usage.institutionType ?? emptyDraft.institutionType,
    healthInsuranceCopayRatePercent:
      usage.healthInsuranceCopayRate == null ? emptyDraft.healthInsuranceCopayRatePercent : String(Math.round(usage.healthInsuranceCopayRate * 100)),
    copayInstitution: usage.copayInstitution ?? emptyDraft.copayInstitution,
    copayRegion: usage.copayRegion ?? emptyDraft.copayRegion,
    coveredAmount: usage.coveredAmount == null ? emptyDraft.coveredAmount : String(usage.coveredAmount),
    claimCause: usage.claimCause ?? emptyDraft.claimCause,
    nationalHealthInsuranceStatus: usage.nationalHealthInsuranceStatus ?? emptyDraft.nationalHealthInsuranceStatus,
    // 2·3세대 세부 입력도 함께 되살린다. 비워 두면 치료를 추가할 때 샘플 값이 빈 값으로 덮인다.
    gen23Form: { ...restoreGen23Form(usage), ...(usage.samsungCalculationInput?.inpatientDays !== undefined ? { gen23InpatientDays: String(usage.samsungCalculationInput.inpatientDays) } : {}) },
    gen1RoomDifference: (usage.gen1RoomDifference ?? usage.samsungCalculationInput?.roomDifference) === undefined ? '' : String(usage.gen1RoomDifference ?? usage.samsungCalculationInput?.roomDifference),
    gen1DaysSinceAccident: usage.samsungCalculationInput?.daysSinceAccidentOrDiagnosis == null ? emptyDraft.gen1DaysSinceAccident : String(usage.samsungCalculationInput.daysSinceAccidentOrDiagnosis),
    policyExclusionsCleared: policyExclusionsFromUsage(usage),
  };
}

/** 저장된 치료에서 '보상하지 않는 사항 확인' 값을 읽는다. 세대별로 저장 위치가 달랐던 값을 하나로 모은다. */
export function policyExclusionsFromUsage(usage: Partial<MedicalUsage>): boolean {
  return usage.samsungCalculationInput?.policyExclusionsCleared ?? usage.gen23PolicyExclusionsCleared ?? usage.gen1PolicyExclusionsCleared ?? false;
}

export function getTreatmentAddButtonLabel(): string {
  return "+ 치료 추가";
}

export function getTreatmentAddLabel(index: number): string {
  return `치료 추가 ${index + 1}`;
}

export function getSeparateVisitWarningMessage(): string {
  return "치료 추가 1, 2, 3의 진료 예정일이 모두 다릅니다. 각 치료를 별도 방문으로 계산을 선택해주세요.";
}

export function getTreatmentAdditionalInfoFields() {
  return [
    { key: "treatmentDate", label: "진료 예정일" },
    { key: "severityClass", label: "산정특례 및 치료 관련성" },
    { key: "coveredAmount", label: "회당 보장대상 인정금액 (C)" },
  ] as const;
}
