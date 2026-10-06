/**
 * 비급여 치료 종류. 도수·주사·MRI는 약관에서 따로 정한 3대 비급여 규칙(공제·한도)을 쓴다.
 * 값은 엔진의 threeNonCoveredCategory·3세대 gen23TreatmentType과 같다. 빈 값은 일반 비급여.
 */
export type NonCoveredTreatmentType = "" | "MANUAL_THERAPY" | "INJECTION" | "MRI";

export const NON_COVERED_TREATMENT_TYPES: readonly (readonly [NonCoveredTreatmentType, string])[] = [
  ["", "일반 비급여"],
  ["MANUAL_THERAPY", "도수·체외충격파·증식치료"],
  ["INJECTION", "비급여 주사"],
  ["MRI", "MRI/MRA"],
];

export function nonCoveredTreatmentTypeLabel(value: string | undefined): string {
  return NON_COVERED_TREATMENT_TYPES.find(([key]) => key === value?.toUpperCase())?.[1] ?? value ?? "";
}

/** 화면 입력값을 엔진 값으로 바꾼다. 급여 치료이거나 일반 비급여면 빈 값. */
export function toNonCoveredTreatmentType(benefitClass: string, raw: string): NonCoveredTreatmentType {
  if (benefitClass !== "NON_COVERED") return "";
  const value = raw.trim().toUpperCase();
  return value === "MANUAL_THERAPY" || value === "INJECTION" || value === "MRI" ? value : "";
}
