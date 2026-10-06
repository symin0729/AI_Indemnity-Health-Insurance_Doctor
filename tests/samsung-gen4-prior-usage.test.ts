import { describe, expect, it } from 'vitest';
import { calculateSamsungAnnualComparison } from '../src/engine/calculateSamsungComparison';
import { parseSamsungContractFacts, samsungContractForm } from '../src/domain/samsungContractFacts';
import { currentContractFormForSelection } from '../src/pages/M02InputPage/contractRequirements';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';

/** 4세대 현재 계약: 올해 이미 이용한 내역(STEP 1-2)을 담보별 한도에 반영한다. */
const selections = { ...useAnalysisStore.getState().productCalculationSelections, gen4NonCoveredRider: 'ENROLLED' as const };
const contract = { insurer: '삼성화재', productName: 'x', inceptionDate: '2022-01-01', generation: 4 as const, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
const baseAssumptions = { assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true, assumeSingleIndemnityContract: true, targetContractFacts: confirmedContractFacts };
const usage = (overrides: object = {}) => ({ id: 'u', treatmentName: 't', careSetting: 'OUTPATIENT', benefitClass: 'COVERED', severityClass: 'UNKNOWN', frequency: 1, unitCost: 100_000, coveredAmount: 100_000, institutionType: 'CLINIC_HOSPITAL', healthInsuranceCopayRate: 0.3, claimCause: 'DISEASE', nationalHealthInsuranceStatus: 'APPLIED', samsungCalculationInput: { policyExclusionsCleared: true }, ...overrides }) as never;
const compare = (usages: object[], facts: object, extra: object = {}) => calculateSamsungAnnualComparison(contract as never, 30_000, [], selections, usages as never, { ...baseAssumptions, currentContractFacts: { ...confirmedContractFacts, ...facts }, ...extra } as never);

describe('4세대 올해 이미 이용한 내역', () => {
  it('입력하지 않으면 보류하고, 모두 0으로 입력하면 한도를 처음부터 쓴다', () => {
    const missing = compare([usage()], {});
    expect(missing.items[0].current.claim).toBeNull();
    expect(missing.items[0].current.reasons.join()).toContain('올해 이미 이용한 내역');
    const zero = compare([usage()], { priorCoveredDiseasePaid: 0 });
    expect(zero.items[0].current.claim).toBe(80_000);
  });

  it('급여 상해와 질병은 각각의 사용분을 쓴다', () => {
    const facts = { priorCoveredInjuryPaid: 49_990_000, priorCoveredDiseasePaid: 0 };
    expect(compare([usage({ claimCause: 'INJURY' })], facts).items[0].current.claim).toBe(10_000);
    expect(compare([usage({ claimCause: 'DISEASE' })], facts).items[0].current.claim).toBe(80_000);
  });

  it('급여 입원은 누적 자기부담을 반영해 연 200만원 상한을 적용한다', () => {
    const inpatient = usage({ careSetting: 'INPATIENT', unitCost: 5_000_000, coveredAmount: 5_000_000 });
    const facts = { priorCoveredDiseasePaid: 0, priorCoveredInpatientDeductible: 1_500_000 };
    // 이번 자기부담 100만원 중 상한까지 50만원만 부담하고 50만원은 추가 보상
    expect(compare([inpatient], facts).items[0].current.claim).toBe(4_500_000);
    expect(compare([inpatient], { priorCoveredDiseasePaid: 0 }).items[0].current.claim).toBeNull();
  });

  it('일반 비급여는 이용 횟수 한도(연 100회)를 반영한다', () => {
    const nonCovered = usage({ benefitClass: 'NON_COVERED', unitCost: 100_000, coveredAmount: 100_000, treatmentCategory: '' });
    const facts = { priorNonCoveredDiseasePaid: 0, priorNonCoveredDiseaseVisits: 100 };
    expect(compare([nonCovered], facts).items[0].current.claim).toBe(0);
    expect(compare([nonCovered], { ...facts, priorNonCoveredDiseaseVisits: 99 }).items[0].current.claim).toBeGreaterThan(0);
  });

  it('3대 비급여는 치료 종류별로 올해 사용분과 횟수를 반영한다', () => {
    const manual = usage({ benefitClass: 'NON_COVERED', treatmentCategory: 'MANUAL_THERAPY', unitCost: 200_000, coveredAmount: 200_000 });
    const none = { priorNonCoveredDiseasePaid: 0 };
    // 도수·체외충격파·증식: 연 350만원/50회. 입력이 없으면 보류
    expect(compare([manual], none).items[0].current.claim).toBeNull();
    const fresh = compare([manual], { ...none, priorManualTherapyPaid: 0, priorManualTherapyCount: 0 }).items[0].current.claim;
    expect(fresh).toBeGreaterThan(0);
    // 남은 한도 1만원
    expect(compare([manual], { ...none, priorManualTherapyPaid: 3_490_000, priorManualTherapyCount: 0 }).items[0].current.claim).toBe(10_000);
    // 올해 이미 10회 이상 받았으면 약관상 '증상 개선·병변 호전 확인'이 필요하다. 확인 입력이 없어 보류하고 이유를 알린다.
    const afterTen = compare([manual], { ...none, priorManualTherapyPaid: 0, priorManualTherapyCount: 12 }).items[0].current;
    expect(afterTen.claim).toBeNull();
    expect(afterTen.reasons.join()).toContain('개선');
    // 주사 사용분은 도수 한도에 영향을 주지 않는다
    expect(compare([manual], { ...none, priorManualTherapyPaid: 0, priorManualTherapyCount: 0, priorInjectionPaid: 2_500_000, priorInjectionCount: 50 }).items[0].current.claim).toBe(fresh);
  });

  it('MRI는 사용분만 필요하고 횟수는 필요하지 않다', () => {
    const mri = usage({ benefitClass: 'NON_COVERED', treatmentCategory: 'MRI', unitCost: 300_000, coveredAmount: 300_000, samsungCalculationInput: { policyExclusionsCleared: true, aggregationUnit: 'DIAGNOSTIC_ACTION' } });
    expect(compare([mri], { priorNonCoveredDiseasePaid: 0 }).items[0].current.claim).toBeNull();
    expect(compare([mri], { priorNonCoveredDiseasePaid: 0, priorMriPaid: 0 }).items[0].current.claim).toBeGreaterThan(0);
    expect(compare([mri], { priorNonCoveredDiseasePaid: 0, priorMriPaid: 3_000_000 }).items[0].current.claim).toBe(0);
  });

  it("STEP 3의 '올해 사용한 한도가 없어요'를 선택하면 입력 없이도 0으로 계산한다", () => {
    expect(compare([usage()], {}, { assumeNoPriorLimitUsage: true }).items[0].current.claim).toBe(80_000);
  });

  it('입력한 내역은 현재 계약에만 적용하고 5세대는 새 계약으로 시작한다', () => {
    const result = compare([usage()], { priorCoveredDiseasePaid: 49_990_000 });
    expect(result.items[0].current.claim).toBe(10_000);
    expect(result.items[0].target.claim).toBe(70_000);
  });

  it('입력 형식: 0 이상의 정수만 받고, 비급여 특약이 없으면 일반 비급여 내역은 저장하지 않는다', () => {
    expect(parseSamsungContractFacts({ priorCoveredInjuryPaid: '1200000', priorNonCoveredInjuryVisits: '3' }, 4)).toMatchObject({ priorCoveredInjuryPaid: 1_200_000, priorNonCoveredInjuryVisits: 3 });
    expect(() => parseSamsungContractFacts({ priorCoveredInjuryPaid: '-1' }, 4)).toThrow();
    expect(() => parseSamsungContractFacts({ priorCoveredInjuryPaid: '1.5' }, 4)).toThrow();
    const form = samsungContractForm({ priorCoveredInjuryPaid: 1_000, priorNonCoveredInjuryPaid: 2_000, priorNonCoveredDiseaseVisits: 4 });
    const withoutRider = parseSamsungContractFacts(currentContractFormForSelection(form, 'NOT_ENROLLED'), 4);
    // 단일 계약 정책으로 '다른 실손 없음'은 항상 함께 저장된다.
    expect(withoutRider).toEqual({ priorCoveredInjuryPaid: 1_000, otherIndemnityPoliciesExist: false });
  });
});
