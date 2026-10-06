import { describe, expect, it } from 'vitest';
import { calculateSamsungComparisonItem } from '../src/engine/calculateSamsungComparison';
import { applySamsungDefaultAssumptions } from '../src/engine/samsungDefaultAssumptions';
import { prepareUsageForSamsungComparison } from '../src/pages/M04ResultPage/M04ResultPage';
import { useAnalysisStore } from '../src/store/useAnalysisStore';

const assumptions = { assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: true, assumeEachOccurrenceSeparate: true };
const selections = { ...useAnalysisStore.getState().productCalculationSelections, gen4NonCoveredRider: 'ENROLLED' as const };
const contract = { insurer: '삼성화재', productName: 'x', inceptionDate: '2022-01-01', generation: 4 as const, monthlyPremium: 50000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
// 화면에서 직접 입력한다고 가정한 값(샘플이 채우는 확인값 없음). 질병/상해·건강보험·보상하지 않는 사항은 사용자가 입력한 값이다.
const typed = { id: 'u', treatmentName: 't', careSetting: 'OUTPATIENT' as const, benefitClass: 'COVERED' as const, severityClass: 'UNKNOWN' as const, frequency: 1, unitCost: 100000, institutionType: 'CLINIC_HOSPITAL' as const, healthInsuranceCopayRate: 0.3, claimCause: 'DISEASE' as const, nationalHealthInsuranceStatus: 'APPLIED' as const, samsungCalculationInput: { policyExclusionsCleared: true } };
const run = (usage: object, gen: 4 | 5 = 4) => {
  const prepared = prepareUsageForSamsungComparison({ ...typed, ...usage } as never, assumptions);
  return calculateSamsungComparisonItem({ ...contract, generation: gen, coverages: gen === 5 ? [] : [] }, selections, prepared, assumptions, gen === 5);
};

describe('4·5세대 기본 가정', () => {
  it('4세대는 계약정보를 입력하지 않으면 계산을 보류한다', () => {
    const result = run({});
    expect(result.claim).toBeNull();
    expect(result.appliedAssumptions?.join()).not.toMatch(/없는 것으로|정상 보장기간|최대/);
  });

  it('5세대 비교 계약도 실제 계약정보가 없으면 계산을 보류한다', () => {
    const result = run({}, 5);
    expect(result.claim).toBeNull();
    expect(result.appliedAssumptions).not.toContain('다른 실손의료보험 계약은 없는 것으로 봄');
  });

  it('사용자가 입력한 값은 기본 가정으로 덮어쓰지 않는다', () => {
    const input = { otherIndemnityPoliciesExist: true, contractBenefitCap: 30_000_000, coveragePeriodConfirmed: false };
    const applied = applySamsungDefaultAssumptions(input, { generation: 4, target: false, usage: typed as never, assumeEachOccurrenceSeparate: true });
    expect(input).toMatchObject({ otherIndemnityPoliciesExist: true, contractBenefitCap: 30_000_000, coveragePeriodConfirmed: false });
    expect(applied.join()).not.toContain('다른 실손의료보험');
    expect(applied.join()).not.toContain('5천만');
  });

  it('결과를 좌우하는 값은 채우지 않고 보류한다: 질병/상해, 보상하지 않는 사항', () => {
    expect(run({ claimCause: undefined }).claim).toBeNull();
    expect(run({ samsungCalculationInput: {} }).claim).toBeNull();
  });

  it('같은 날 합산은 회차 별도 가정을 쓰지 않으면 채우지 않는다', () => {
    const input = {};
    const applied = applySamsungDefaultAssumptions(input, { generation: 4, target: false, usage: typed as never, assumeEachOccurrenceSeparate: false });
    expect(applied.join()).not.toContain('합산');
  });

  it('1~3세대 현재 계약에는 기본 가정을 적용하지 않는다', () => {
    for (const generation of [1, 2, 3]) {
      expect(applySamsungDefaultAssumptions({}, { generation, target: false, usage: typed as never, assumeEachOccurrenceSeparate: true })).toEqual([]);
    }
  });
});
