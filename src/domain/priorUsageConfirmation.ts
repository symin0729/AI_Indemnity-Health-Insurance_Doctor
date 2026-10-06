import type { MedicalUsage } from "./medical";
import type { AnalysisCalculationAssumptions, ProductCalculationSelections } from "../store/useAnalysisStore";

/**
 * 비교 시작 조건이 '한도 사용 후(REMAINING_LIMITS)'일 때, 모든 예정 치료에 올해 이용 내역이 입력되어 있는지.
 * 이제 올해 이용 내역을 받지 않고 항상 한도 사용 전부터 1년을 비교하므로(FRESH_YEAR) 이 확인은 필요하지 않다.
 * M03 확인 화면이 이 함수를 import하는데 원본 파일이 저장소에 올라가 있지 않아 같은 이름·인자로 둔다.
 */
export function hasRequiredPriorUsage(
  _generation: number,
  _usage: MedicalUsage,
  _assumptions: AnalysisCalculationAssumptions,
  _selections: ProductCalculationSelections,
): boolean {
  return true;
}
