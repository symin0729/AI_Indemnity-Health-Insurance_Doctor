import { describe, expect, it } from 'vitest';
import { calculateSamsungAnnualComparison } from '../src/engine/calculateSamsungComparison';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';

/**
 * 도수·체외충격파·증식치료: 4세대(제3조 <표1> 주, PDF 103쪽)와 5세대(PDF 9·55쪽)는 최초 10회까지 보장하고,
 * 이후에는 검사결과 등으로 증상 개선·병변호전이 확인된 경우에 한해 10회 단위로 연 50회까지 보상한다.
 * 확인 입력이 없으므로 STEP 4에서 '10회 이후에도 개선이 확인된다'고 가정할 때만 11회 이후를 계산한다.
 */
const selections = { ...useAnalysisStore.getState().productCalculationSelections, gen4NonCoveredRider: 'ENROLLED' as const };
const contract = (generation: 3 | 4) => ({ insurer: '삼성화재', productName: 'x', inceptionDate: '2022-01-01', generation, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] });
const base = { assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: true, assumeEachOccurrenceSeparate: true, assumeSingleIndemnityContract: true, comparisonBasis: 'FRESH_YEAR', currentContractFacts: confirmedContractFacts, targetContractFacts: confirmedContractFacts };
const manual = (frequency: number) => ({ id: 'm', treatmentName: '도수치료', careSetting: 'OUTPATIENT', benefitClass: 'NON_COVERED', severityClass: 'SEVERE', treatmentCategory: 'MANUAL_THERAPY', frequency, unitCost: 100_000, coveredAmount: 100_000, institutionType: 'CLINIC_HOSPITAL', healthInsuranceCopayRate: 0.3, claimCause: 'DISEASE', nationalHealthInsuranceStatus: 'APPLIED',
  samsungCalculationInput: { policyExclusionsCleared: true, aggregationUnit: 'TREATMENT' },
  samsungGen5Facts: { specialCaseDisease: 'YES', treatmentRelatedness: 'RELATED', policyExcludedTreatment: 'NO', threeNonCoveredCategory: 'MANUAL_THERAPY' } });
const compare = (generation: 3 | 4, frequency: number, extra: object = {}) =>
  calculateSamsungAnnualComparison(contract(generation) as never, 30_000, ['SPECIAL_RIDER_1'], selections, [manual(frequency)] as never, { ...base, ...extra } as never);

describe('도수치료 10회 이후 증상 개선 가정', () => {
  it('10회까지는 가정 없이 4세대·5세대 모두 계산된다', () => {
    const result = compare(4, 10);
    expect(result.items[0].current.claim).not.toBeNull();
    expect(result.items[0].target.claim).not.toBeNull();
  });

  it('11회부터는 가정이 없으면 4세대와 5세대 모두 개선 확인 사유로 보류한다', () => {
    const result = compare(4, 11);
    expect(result.items[0].current.claim).toBeNull();
    expect(result.items[0].target.claim).toBeNull();
    expect(result.items[0].current.reasons.join()).toContain('개선');
    expect(result.items[0].target.reasons.join()).toContain('개선');
  });

  it('가정을 선택하면 11회 이후도 한도(연 50회·350만원) 안에서 계산한다', () => {
    const result = compare(4, 12, { assumeManualTherapyImprovement: true });
    expect(result.items[0].current.claim).not.toBeNull();
    expect(result.items[0].target.claim).not.toBeNull();
    expect(result.complete).toBe(true);
  });

  it('가정을 선택해도 50회 한도는 그대로 적용한다', () => {
    const fifty = compare(4, 50, { assumeManualTherapyImprovement: true });
    const fiftyOne = compare(4, 51, { assumeManualTherapyImprovement: true });
    expect(fifty.currentClaimTotal).not.toBeNull();
    // 51번째 치료는 연 50회 한도를 넘어 추가 보험금이 없다.
    expect(fiftyOne.currentClaimTotal).toBe(fifty.currentClaimTotal);
  });

  it('3세대 현재 계약은 이 조건이 없어 가정 없이도 계산되고, 5세대 쪽만 가정이 필요하다', () => {
    const noAssumption = compare(3, 12);
    expect(noAssumption.items[0].current.reasons.join()).not.toContain('개선');
    expect(noAssumption.items[0].target.claim).toBeNull();
    expect(noAssumption.items[0].target.reasons.join()).toContain('개선');
    const assumed = compare(3, 12, { assumeManualTherapyImprovement: true });
    expect(assumed.items[0].target.claim).not.toBeNull();
  });

  it('도수치료가 아니면 가정과 상관없이 결과가 같다', () => {
    const injection = { ...manual(12), treatmentCategory: 'INJECTION', samsungGen5Facts: { specialCaseDisease: 'YES', treatmentRelatedness: 'RELATED', policyExcludedTreatment: 'NO', threeNonCoveredCategory: 'INJECTION' } };
    const run = (extra: object) => calculateSamsungAnnualComparison(contract(4) as never, 30_000, ['SPECIAL_RIDER_1'], selections, [injection] as never, { ...base, ...extra } as never);
    expect(run({ assumeManualTherapyImprovement: true }).currentClaimTotal).toBe(run({}).currentClaimTotal);
  });
});
