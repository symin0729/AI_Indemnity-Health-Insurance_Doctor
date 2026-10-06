import type { MedicalUsage } from "./medical";

/** 5세대 비급여 비교에서 입력 대신 가정으로 채울 수 있는 값(소비자용 STEP 4). 5세대 특약을 선택한 경우에만 계산에 영향을 준다. */
export function usagesNeedingSeverityAssumption(usages: readonly MedicalUsage[]): MedicalUsage[] {
  return usages.filter((usage) => usage.benefitClass === "NON_COVERED" && usage.severityClass === "UNKNOWN");
}

export function usagesNeedingInstitutionAssumption(usages: readonly MedicalUsage[]): MedicalUsage[] {
  return usages.filter((usage) => usage.benefitClass === "NON_COVERED" && usage.careSetting === "INPATIENT" && !usage.institutionType);
}
