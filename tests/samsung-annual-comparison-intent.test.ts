import { describe, expect, it } from 'vitest';
import { calculateSamsungAnnualComparison } from '../src/engine/calculateSamsungComparison';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';

/**
 * 서비스 의도: 같은 예정 치료를 "현재 계약 유지"와 "5세대 전환"에 각각 적용해 연간 총부담을 비교한다.
 * - 예상 횟수 N회는 N번의 방문이다(진료 예정일이 하나 적혀 있어도 모두 같은 날이 아니다).
 * - 5세대는 새로 가입하는 계약이므로, 현재 계약에서 올해 이미 쓴 한도·횟수를 물려받지 않는다.
 */
const selections = { ...useAnalysisStore.getState().productCalculationSelections, gen4NonCoveredRider: 'NOT_ENROLLED' as const };
const contract = { insurer: '삼성화재', productName: 'x', inceptionDate: '2022-01-01', generation: 4 as const, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
const assumptions = { assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: true, assumeEachOccurrenceSeparate: true, assumeSingleIndemnityContract: true, currentContractFacts: confirmedContractFacts, targetContractFacts: confirmedContractFacts } as never;
const usage = (overrides: object = {}) => ({ id: 'u', treatmentName: 't', careSetting: 'OUTPATIENT', benefitClass: 'COVERED', severityClass: 'UNKNOWN', frequency: 1, unitCost: 100_000, coveredAmount: 100_000, institutionType: 'CLINIC_HOSPITAL', healthInsuranceCopayRate: 0.3, claimCause: 'DISEASE', nationalHealthInsuranceStatus: 'APPLIED', samsungCalculationInput: { policyExclusionsCleared: true }, ...overrides }) as never;
const compare = (usages: object[], extra: object = {}) => calculateSamsungAnnualComparison(contract as never, 30_000, [], selections, usages as never, { ...(assumptions as object), ...extra } as never);

describe('예상 횟수는 각각 별도 방문이다', () => {
  it('진료 예정일이 하나 입력되어 있어도 2회 통원이 계산된다', () => {
    const withDate = compare([usage({ frequency: 2, treatmentDate: '2026-11-01' })]);
    const withoutDate = compare([usage({ frequency: 2 })]);
    expect(withDate.complete).toBe(true);
    expect(withDate.currentClaimTotal).toBe(withoutDate.currentClaimTotal);
    expect(withDate.targetClaimTotal).toBe(withoutDate.targetClaimTotal);
    expect(withDate.currentClaimTotal).toBe(160_000);
  });

  it('서로 다른 치료가 같은 날 같은 담보이면 중복 공제를 막기 위해 계속 보류한다', () => {
    const result = compare([usage({ id: 'a', treatmentDate: '2026-11-01' }), usage({ id: 'b', treatmentDate: '2026-11-01' })]);
    expect(result.complete).toBe(false);
  });
});

describe('5세대는 새 계약으로 보고 올해 사용분 없이 시작한다', () => {
  const used = { policyExclusionsCleared: true, priorPaidBenefit: 49_990_000, priorAnnualCount: 0, priorEligibleDeductible: 0 };

  it('현재 계약의 올해 이미 받은 보험금은 현재 계약에만 적용한다', () => {
    const result = compare([usage({ samsungCalculationInput: used })], { assumeNoPriorLimitUsage: false });
    expect(result.items[0].current.claim).toBe(10_000); // 남은 한도 1만원
    expect(result.items[0].target.claim).toBe(70_000); // 5세대는 한도를 처음부터 사용
  });

  it('현재 계약의 사용분을 모르더라도 5세대 계산은 보류되지 않는다', () => {
    const result = compare([usage()], { assumeNoPriorLimitUsage: false });
    expect(result.items[0].current.claim).toBeNull();
    expect(result.items[0].target.claim).toBe(70_000);
  });

  it('연속 치료에서도 5세대 한도는 5세대 안에서만 누적한다', () => {
    const result = compare([usage({ id: 'a', samsungCalculationInput: used }), usage({ id: 'b', samsungCalculationInput: used })], { assumeNoPriorLimitUsage: false });
    expect(result.items.map((item) => item.currentClaimTotal)).toEqual([10_000, 0]);
    expect(result.items.map((item) => item.targetClaimTotal)).toEqual([70_000, 70_000]);
  });

  it('결과에 5세대 가정을 표시한다', () => {
    const result = compare([usage()]);
    expect(result.items[0].target.appliedAssumptions?.join()).toContain('전환 후 계약');
    expect(result.items[0].current.appliedAssumptions?.join() ?? '').not.toContain('전환 후 계약');
  });
});
