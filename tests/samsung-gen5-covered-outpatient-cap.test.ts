import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';
import { describe, expect, it } from 'vitest';
import { calculateSamsungGen5 } from '../src/engine/calculateSamsungGen5';
import { calculateSamsungAnnualComparison } from '../src/engine/calculateSamsungComparison';
import { useAnalysisStore } from '../src/store/useAnalysisStore';

// 5세대 일반형·계약전환형 약관 제6조 ①·⑤(PDF 30쪽):
// 급여는 상해·질병 각각 입원·통원 합산 연간 보험가입금액(최대 5천만원), 통원 1회당 20만원 이내에서 계약자가 고른 금액 한도.
const common = { sameDayAggregationConfirmed: true, requiredCoverageConfirmed: true, policyExclusionsCleared: true, otherIndemnityPoliciesExist: false, coveragePeriodConfirmed: true, nhiApplied: true, priorPaidBenefit: 0, priorEligibleDeductible: 0, contractBenefitCap: 50_000_000, perOccurrenceBenefitCap: 200_000, institution: 'CLINIC_HOSPITAL' as const, healthInsuranceCopayRate: 0.3 };
const outpatient = (contractType: 'GENERAL' | 'CONVERSION', input: object) => calculateSamsungGen5(contractType, 'COVERED_OUTPATIENT', { ...common, conversionContractSubtype: 'CONTRACT_CONVERSION', conversionEligibilityConfirmed: true, ...input });

describe('5세대 급여 통원 한도', () => {
  it('통원 1회 보험금은 1회 가입금액(최대 20만원)을 넘지 않는다', () => {
    for (const type of ['GENERAL', 'CONVERSION'] as const) {
      // 30만원 − MAX(1만원, 30만원×20%, 30만원×30%) = 21만원 → 20만원
      expect(outpatient(type, { eligibleExpense: 300_000 }).claim).toBe(200_000);
    }
  });

  it('계약자가 고른 1회 가입금액이 더 낮으면 그 금액까지만 지급한다', () => {
    expect(outpatient('GENERAL', { eligibleExpense: 300_000, perOccurrenceBenefitCap: 150_000 }).claim).toBe(150_000);
  });

  it('1회 한도 아래에서는 공제 후 금액을 그대로 지급한다', () => {
    expect(outpatient('GENERAL', { eligibleExpense: 100_000 }).claim).toBe(70_000);
  });

  it('1회 가입금액을 모르면 계산을 보류한다', () => {
    expect(outpatient('GENERAL', { eligibleExpense: 100_000, perOccurrenceBenefitCap: undefined }).status).toBe('CONFIRMATION_REQUIRED');
  });

  it('연간 보험가입금액이 거의 소진되면 남은 금액까지만 지급한다', () => {
    expect(outpatient('GENERAL', { eligibleExpense: 100_000, priorPaidBenefit: 49_950_000 }).claim).toBe(50_000);
  });

  it('연간 비교에서 5세대 급여 입원과 통원은 같은 원인(상해/질병)끼리 연간 한도를 함께 쓴다', () => {
    const contract = { insurer: '삼성화재', productName: 'x', inceptionDate: '2022-01-01', generation: 4 as const, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
    const selections = useAnalysisStore.getState().productCalculationSelections;
    // 5세대 급여 연간 가입금액을 10만원으로 두고, 입원과 통원이 같은 연간 한도를 함께 쓰는지 본다(5세대는 올해 사용분 없이 시작).
    const assumptions = { targetContractFacts: { ...confirmedContractFacts, coveredBenefitCap: 100_000 }, currentContractFacts: confirmedContractFacts, assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true };
    const usage = (id: string, careSetting: 'INPATIENT' | 'OUTPATIENT', cost: number, priorPaidBenefit: number) => ({
      id, treatmentName: id, careSetting, benefitClass: 'COVERED' as const, severityClass: 'UNKNOWN' as const, frequency: 1, unitCost: cost, coveredAmount: cost,
      institutionType: 'CLINIC_HOSPITAL' as const, healthInsuranceCopayRate: 0.3, claimCause: 'DISEASE' as const, nationalHealthInsuranceStatus: 'APPLIED' as const,
      samsungCalculationInput: { policyExclusionsCleared: true, priorPaidBenefit, priorAnnualCount: 0, priorEligibleDeductible: 0, priorServiceDays: 0 },
    });
    // 연간 한도 10만원: 입원 10만원(보상 8만원)을 쓰고 나면 통원은 남은 2만원까지만 보상한다.
    const result = calculateSamsungAnnualComparison(contract, 60_000, [], selections, [usage('in', 'INPATIENT', 100_000, 0), usage('out', 'OUTPATIENT', 100_000, 0)], assumptions);
    expect(result.items.map((item) => item.targetClaimTotal)).toEqual([80_000, 20_000]);
  });
});
