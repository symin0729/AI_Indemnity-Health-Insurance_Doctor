import { describe, expect, it } from 'vitest';
import { calculateSamsungAnnualComparison, calculateSamsungComparisonItem } from '../src/engine/calculateSamsungComparison';
import type { MedicalUsage } from '../src/domain/medical';
import type { AnalysisCalculationAssumptions } from '../src/store/useAnalysisStore';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';

const contract = { insurer: '삼성화재', productName: '2107.1', inceptionDate: '2021-07-01', generation: 4 as const, monthlyPremium: 50000, renewalCycleMonths: 12, reentryCycleMonths: 60, coverages: [] };
const selections = useAnalysisStore.getState().productCalculationSelections;
const usage: MedicalUsage = { id: 'a', treatmentName: '급여 통원', careSetting: 'OUTPATIENT', benefitClass: 'COVERED', severityClass: 'UNKNOWN', frequency: 2, unitCost: 100000, coveredAmount: 100000, claimCause: 'DISEASE', institutionType: 'CLINIC_HOSPITAL', healthInsuranceCopayRate: 0.3, nationalHealthInsuranceStatus: 'APPLIED' };
const policy: AnalysisCalculationAssumptions = { comparisonBasis: 'FRESH_YEAR', assumeSingleIndemnityContract: true, assumeNoPolicyExclusions: true, assumeEntireMedicalCostCovered: false, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true, currentContractFacts: confirmedContractFacts, targetContractFacts: confirmedContractFacts };
const annual = (usages = [usage], assumptions = policy) => calculateSamsungAnnualComparison(contract, 30000, [], selections, usages, assumptions);

describe('미래 비교 정책과 약관 계산 경계', () => {
  it('청구 확인값 없이 명시한 가정으로 같은 치료를 비교하고 회차를 누적한다', () => {
    const result = annual();
    expect(result.complete).toBe(true);
    expect(result.currentClaimTotal).toBe(160000);
    expect(result.targetClaimTotal).toBe(140000);
    expect(result.currentTotal).toBe(640000);
    expect(result.targetTotal).toBe(420000);
    expect(result.items[0].current.appliedAssumptions?.join(' ')).toContain('가정');
  });
  it('새 1년은 과거 사용분을 제외하지만 남은 한도 비교는 현재 계약에만 반영한다', () => {
    const historical = { ...policy, currentContractFacts: { ...confirmedContractFacts, priorCoveredDiseasePaid: 49990000 } };
    expect(annual([usage], historical).currentClaimTotal).toBe(160000);
    const result = annual([usage], { ...historical, comparisonBasis: 'REMAINING_LIMITS' });
    expect(result.currentClaimTotal).toBe(10000);
    expect(result.targetClaimTotal).toBe(140000);
    expect(historical.currentContractFacts.priorCoveredDiseasePaid).toBe(49990000);
  });
  it('가정을 선택하지 않은 미확인 면책과 명시된 제외 사실을 임의로 통과시키지 않는다', () => {
    expect(annual([usage], { ...policy, assumeNoPolicyExclusions: false }).complete).toBe(false);
    expect(annual([{ ...usage, samsungCalculationInput: { policyExclusionsCleared: false } }]).complete).toBe(false);
  });
  it('현재 계약만 보류되어도 계산 가능한 5세대 합계는 유지하고 비교는 미완성으로 둔다', () => {
    const result = annual([usage], { ...policy, currentContractFacts: {} });
    expect(result.currentComplete).toBe(false);
    expect(result.currentTotal).toBeNull();
    expect(result.targetComplete).toBe(true);
    expect(result.targetTotal).toBe(420000);
    expect(result.complete).toBe(false);
  });
  it('중증 여부는 면책 가정으로 채우지 않는다', () => {
    const result = calculateSamsungComparisonItem({ ...contract, coverages: ['SPECIAL_RIDER_1', 'SPECIAL_RIDER_2'] }, selections, { ...usage, benefitClass: 'NON_COVERED' }, policy, true);
    expect(result.claim).toBeNull();
  });
  it('보험금은 같은 담보의 연간 한도를 넘지 않고 총부담 항등식을 만족한다', () => {
    for (const frequency of [1, 2, 10, 99, 100, 101]) {
      const result = annual([{ ...usage, frequency }], { ...policy, currentContractFacts: { ...confirmedContractFacts, coveredBenefitCap: 100000 } });
      expect(result.currentClaimTotal).toBeLessThanOrEqual(100000);
      expect(result.currentTotal).toBe(contract.monthlyPremium * 12 + frequency * usage.unitCost - result.currentClaimTotal!);
    }
  });
});

it('앞선 미확인 치료가 같은 한도에 미칠 영향을 뒤 치료에서 확정하지 않는다', () => {
  const result = annual([{ ...usage, id: 'unknown', healthInsuranceCopayRate: undefined }, { ...usage, id: 'known' }]);
  expect(result.items[0].targetClaimTotal).toBeNull();
  expect(result.items[1].targetClaimTotal).toBeNull();
  expect(result.items[1].target.reasons.join(' ')).toContain('앞선 미확인 치료');
  expect(result.currentClaimTotal).toBe(320000);
});
