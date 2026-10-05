import type { MedicalUsage } from "../domain/medical";
import type { SamsungDraftCalculationInput } from "./evaluateSamsungExecutionSpec";

/** 계약 연간 보험가입금액의 약관상 최대치. */
export const DEFAULT_CONTRACT_BENEFIT_CAP = 50_000_000;
/** 4세대 통원의료비 회당 보험가입금액의 약관상 최대치. */
export const DEFAULT_PER_OCCURRENCE_BENEFIT_CAP = 200_000;

/**
 * 4·5세대 계산에서 사용자가 입력하지 않은 항목을 약관상 표준값으로 채운다.
 * 이미 입력된 값은 바꾸지 않고, 실제로 채운 항목만 문구로 돌려준다(결과 화면의 "적용된 가정" 용도).
 * 질병/상해, 건강보험 적용 여부, 보상하지 않는 사항처럼 계산 결과를 좌우하는 값은 채우지 않는다.
 */
export function applySamsungDefaultAssumptions(
  input: SamsungDraftCalculationInput,
  context: { generation: number; target: boolean; usage: MedicalUsage; assumeEachOccurrenceSeparate: boolean },
): string[] {
  const applied: string[] = [];
  const { generation, target, usage } = context;
  if (generation !== 4 && generation !== 5) return applied;
  const category = input.threeNonCoveredCategory ?? usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.treatmentCategory?.toUpperCase();
  const isThreeNonCovered = category === "MRI" || category === "MRI_MRA" || category === "MANUAL_THERAPY" || category === "INJECTION";

  if (generation === 4 && !target && input.requiredCoverageConfirmed === undefined) {
    input.requiredCoverageConfirmed = true;
    applied.push("급여 주계약에 가입한 것으로 봄");
  }
  if (input.otherIndemnityPoliciesExist === undefined) {
    input.otherIndemnityPoliciesExist = false;
    applied.push("다른 실손의료보험 계약은 없는 것으로 봄");
  }
  if (input.coveragePeriodConfirmed === undefined) {
    input.coveragePeriodConfirmed = true;
    applied.push("정상 보장기간(유효한 계약)으로 봄");
  }
  if (input.sameDayAggregationConfirmed === undefined && context.assumeEachOccurrenceSeparate) {
    input.sameDayAggregationConfirmed = true;
    applied.push("같은 날 동일 목적의 진료는 1회로 합산된 것으로 봄");
  }
  if (input.contractBenefitCap === undefined) {
    input.contractBenefitCap = DEFAULT_CONTRACT_BENEFIT_CAP;
    applied.push("계약 연간 보험가입금액은 약관상 최대 5천만 원으로 봄");
  }
  if (generation === 4 && usage.careSetting === "OUTPATIENT" && input.perOccurrenceBenefitCap === undefined) {
    input.perOccurrenceBenefitCap = DEFAULT_PER_OCCURRENCE_BENEFIT_CAP;
    applied.push("통원 회당 보험가입금액은 약관상 최대 20만 원으로 봄");
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
