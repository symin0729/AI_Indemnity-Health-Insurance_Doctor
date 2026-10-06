import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';
import { describe, expect, it } from 'vitest';
import { calculateSamsungGen4Claim } from '../src/engine/calculateSamsungGen4';
import { calculateSamsungGen5 } from '../src/engine/calculateSamsungGen5';
import { calculateSamsungAnnualComparison } from '../src/engine/calculateSamsungComparison';
import { useAnalysisStore } from '../src/store/useAnalysisStore';

// 4세대 약관 제6조 ④(PDF 51쪽), 5세대 일반형·계약전환형 약관 제6조 ④(PDF 30쪽):
// 급여 입원의 나머지 20% 자기부담이 연간 200만원을 넘으면 그 초과금액을 보상한다.
const common = { requiredCoverageConfirmed: true, policyExclusionsCleared: true, otherIndemnityPoliciesExist: false, coveragePeriodConfirmed: true, nhiApplied: true, priorPaidBenefit: 0, priorEligibleDeductible: 0, contractBenefitCap: 50_000_000 };
const gen4Inpatient = (claimCause: 'INJURY' | 'DISEASE', input: object) => calculateSamsungGen4Claim(
  { baseCoveredConfirmed: true, nonCoveredRider: 'NOT_ENROLLED', benefitClass: 'COVERED', careSetting: 'INPATIENT', claimCause, treatmentType: 'GENERAL' },
  { ...common, ...input },
);

describe('급여 입원 연 200만원 자기부담 상한', () => {
  it('4세대 상해·질병 입원은 자기부담 200만원 초과분을 보상한다', () => {
    for (const cause of ['INJURY', 'DISEASE'] as const) {
      const result = gen4Inpatient(cause, { eligibleExpense: 20_000_000 });
      expect(result).toMatchObject({ status: 'CALCULATED', ruleId: cause === 'INJURY' ? 'G4-01' : 'G4-02' });
      if (result.status !== 'CALCULATED') throw new Error('계산되지 않았습니다.');
      expect(result.result.claim).toBeCloseTo(18_000_000);
      expect(result.result.deductible).toBeCloseTo(2_000_000);
    }
  });

  it('5세대 일반형과 계약전환형도 같은 상한을 적용한다', () => {
    const general = calculateSamsungGen5('GENERAL', 'COVERED_INPATIENT', { ...common, eligibleExpense: 20_000_000 });
    const conversion = calculateSamsungGen5('CONVERSION', 'COVERED_INPATIENT', { ...common, eligibleExpense: 20_000_000, conversionContractSubtype: 'CONTRACT_CONVERSION', conversionEligibilityConfirmed: true });
    for (const result of [general, conversion]) {
      expect(result.claim).toBeCloseTo(18_000_000);
      expect(result.deductible).toBeCloseTo(2_000_000);
    }
  });

  it('이미 쌓인 자기부담이 있으면 남은 상한까지만 자기부담한다', () => {
    const result = gen4Inpatient('DISEASE', { eligibleExpense: 5_000_000, priorEligibleDeductible: 1_500_000 });
    if (result.status !== 'CALCULATED') throw new Error('계산되지 않았습니다.');
    // 이번 자기부담 100만원 중 상한까지 50만원만 부담하고 50만원은 보상
    expect(result.result.claim).toBeCloseTo(4_500_000);
  });

  it('자기부담이 상한 아래이면 보험금은 80% 그대로다', () => {
    const result = gen4Inpatient('INJURY', { eligibleExpense: 1_000_000 });
    if (result.status !== 'CALCULATED') throw new Error('계산되지 않았습니다.');
    expect(result.result.claim).toBeCloseTo(800_000);
  });

  it('건강보험 미적용 입원(40% 보상)에는 상한을 적용하지 않는다', () => {
    const result = gen4Inpatient('DISEASE', { eligibleExpense: 20_000_000, nhiApplied: false });
    if (result.status !== 'CALCULATED') throw new Error('계산되지 않았습니다.');
    expect(result.result.claim).toBeCloseTo(8_000_000);
  });

  it('기존 누적 자기부담을 모르면 계산을 보류한다', () => {
    const result = gen4Inpatient('DISEASE', { eligibleExpense: 20_000_000, priorEligibleDeductible: undefined });
    expect(result.status).toBe('CALCULATED');
    if (result.status !== 'CALCULATED') return;
    expect(result.result.claim).toBeNull();
    expect(result.result.status).toBe('CONFIRMATION_REQUIRED');
  });

  it('4세대 연간 비교에서 상해·질병 입원의 자기부담을 합산해 상한을 적용한다', () => {
    const contract = { insurer: '삼성화재', productName: 'x', inceptionDate: '2022-01-01', generation: 4 as const, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
    const selections = { ...useAnalysisStore.getState().productCalculationSelections, gen4NonCoveredRider: 'NOT_ENROLLED' as const };
    const assumptions = { targetContractFacts: confirmedContractFacts, currentContractFacts: confirmedContractFacts, assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: true, assumeEachOccurrenceSeparate: true };
    const usage = (id: string, claimCause: 'INJURY' | 'DISEASE') => ({ id, treatmentName: id, careSetting: 'INPATIENT' as const, benefitClass: 'COVERED' as const, severityClass: 'UNKNOWN' as const, frequency: 1, unitCost: 10_000_000, coveredAmount: 10_000_000, institutionType: 'GENERAL_TERTIARY' as const, claimCause, nationalHealthInsuranceStatus: 'APPLIED' as const, samsungCalculationInput: { policyExclusionsCleared: true } });
    const result = calculateSamsungAnnualComparison(contract, 60_000, [], selections, [usage('injury', 'INJURY'), usage('disease', 'DISEASE')], assumptions);
    // 각 800만원 보상 + 두 번째 입원에서 합산 자기부담 400만원 중 상한 초과 200만원 보상
    expect(result.currentClaimTotal).toBeCloseTo(18_000_000);
  });
});
