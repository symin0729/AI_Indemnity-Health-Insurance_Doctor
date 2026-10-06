import type { MedicalUsage } from "../domain/medical";
import type { SamsungDraftCalculationInput } from "./evaluateSamsungExecutionSpec";

/** 계약 연간 보험가입금액의 약관상 최대치. */
export const DEFAULT_CONTRACT_BENEFIT_CAP = 50_000_000;
/** 4세대 통원의료비 회당 보험가입금액의 약관상 최대치. */
export const DEFAULT_PER_OCCURRENCE_BENEFIT_CAP = 200_000;

/**
 * 4·5세대 계산에서 명시적으로 허용한 구조적 가정만 채운다.
 * 이미 입력된 값은 바꾸지 않고, 실제로 채운 항목만 문구로 돌려준다(결과 화면의 "적용된 가정" 용도).
 * 질병/상해, 건강보험 적용 여부, 보상하지 않는 사항처럼 계산 결과를 좌우하는 값은 채우지 않는다.
 */
export function applySamsungDefaultAssumptions(
  input: SamsungDraftCalculationInput,
  context: {
    generation: number;
    target: boolean;
    usage: MedicalUsage;
    assumeEachOccurrenceSeparate: boolean;
    /** 사용자가 입력한 현재 계약 보험가입금액. 있으면 가정 대신 이 값을 쓴다. */
    contractBenefitCap?: number;
    perOccurrenceBenefitCap?: number;
  },
): string[] {
  const applied: string[] = [];
  const { generation, target, usage } = context;
  if (!target && context.contractBenefitCap !== undefined) input.contractBenefitCap ??= context.contractBenefitCap;
  if (!target && context.perOccurrenceBenefitCap !== undefined && usage.careSetting === "OUTPATIENT") input.perOccurrenceBenefitCap ??= context.perOccurrenceBenefitCap;
  if (generation !== 4 && generation !== 5) return applied;
  if (target) applied.push("5세대는 신규 계약으로 보아 올해 사용한 보험금·한도·횟수 없이 시작함");
  const category = input.threeNonCoveredCategory ?? usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.treatmentCategory?.toUpperCase();
  const isThreeNonCovered = category === "MRI" || category === "MRI_MRA" || category === "MANUAL_THERAPY" || category === "INJECTION";
  const isSevere = usage.samsungGen5Facts
    ? usage.samsungGen5Facts.specialCaseDisease === 'YES' && usage.samsungGen5Facts.treatmentRelatedness === 'RELATED'
    : usage.severityClass === 'SEVERE';
  const separateTreatmentRule = isThreeNonCovered && (generation === 4 || isSevere || category === 'MRI' || category === 'MRI_MRA');

  if (generation === 4 && !target && input.requiredCoverageConfirmed === undefined) {
    input.requiredCoverageConfirmed = true;
    applied.push("급여 주계약에 가입한 것으로 봄");
  }
  if (input.sameDayAggregationConfirmed === undefined && context.assumeEachOccurrenceSeparate && usage.careSetting === "OUTPATIENT" && !separateTreatmentRule) {
    input.sameDayAggregationConfirmed = true;
    applied.push("각 통원을 서로 다른 날로 입력했으며, 동일일 합산은 담보별 회/일 기준을 적용함");
  }
  if (
    generation === 4
    && usage.benefitClass === "NON_COVERED"
    && !isThreeNonCovered
    && input.threeNonCoveredExcludedFromBaseConfirmed === undefined
  ) {
    input.threeNonCoveredExcludedFromBaseConfirmed = true;
    applied.push("일반 비급여 금액에는 도수·주사·MRI 특약 대상 금액이 포함되지 않은 것으로 봄");
  }
  return applied;
}
