import type { MedicalUsage } from "./medical";

export type Gen3RiderKey = "manualTherapy" | "injection" | "mri";
export type Gen3RiderStatus = "ENROLLED" | "NOT_ENROLLED" | "UNKNOWN";
export type Gen3RiderSelections = Record<Gen3RiderKey, Gen3RiderStatus>;

/** 특약은 선택계약이라 체크한 것만 가입으로 보고, 기본값은 모두 미가입이다. */
export const GEN3_RIDER_DEFAULT: Gen3RiderSelections = {
  manualTherapy: "NOT_ENROLLED",
  injection: "NOT_ENROLLED",
  mri: "NOT_ENROLLED",
};

/** 3세대 선택계약(특약) 3종. 약관상 기본계약과 별도로 가입하는 선택계약이다. */
export const GEN3_RIDERS: ReadonlyArray<{ key: Gen3RiderKey; label: string }> = [
  { key: "manualTherapy", label: "비급여 도수·체외충격파·증식치료 특약" },
  { key: "injection", label: "비급여 주사료 특약" },
  { key: "mri", label: "비급여 MRI/MRA 특약" },
];

/** 치료 분류에 해당하는 특약 키. 기본형이거나 분류가 없으면 undefined. */
export function gen3RiderKeyForTreatment(treatmentType: MedicalUsage["gen23TreatmentType"]): Gen3RiderKey | undefined {
  return treatmentType === "MANUAL_THERAPY" ? "manualTherapy" : treatmentType === "INJECTION" ? "injection" : treatmentType === "MRI" ? "mri" : undefined;
}

/** 치료 분류에 해당하는 가입 상태. 기본형은 항상 가입으로 본다. 계약 단계에서 고른 값이 없으면 undefined. */
export function gen3EnrollmentForTreatment(
  treatmentType: MedicalUsage["gen23TreatmentType"],
  riders: Gen3RiderSelections | undefined,
): "ENROLLED" | "NOT_ENROLLED" | undefined {
  if (treatmentType === "BASE") return "ENROLLED";
  if (!riders) return undefined;
  const key = gen3RiderKeyForTreatment(treatmentType);
  const status = key ? riders[key] : undefined;
  return status === "ENROLLED" || status === "NOT_ENROLLED" ? status : undefined;
}
