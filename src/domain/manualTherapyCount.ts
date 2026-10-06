import type { MedicalUsage } from "./medical";

/** 도수·체외충격파·증식치료가 포함된 경우 10회 이후 개선 확인 가정이 필요하다. */
export function needsManualTherapyImprovementAssumption(usages: MedicalUsage[]): boolean {
  return usages.some(
    (usage) =>
      (usage.treatmentCategory?.toUpperCase() === "MANUAL_THERAPY") &&
      usage.frequency > 10,
  );
}
