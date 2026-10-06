import { describe, expect, it } from 'vitest';
import { applyGen23ContractInputs, GEN23_SAMPLE_CONTRACT_DETAILS } from '../src/domain/contractDetails';
import { applyGen23PriorUsage, gen23PriorFormFromUsages, parseGen23PriorUsage } from '../src/domain/gen23PriorUsage';
import { calculateSamsungComparisonItem } from '../src/engine/calculateSamsungComparison';
import { generationSelectedPatch, contractSamplePatch } from '../src/pages/M02InputPage/contractTransitions';
import { samplePolicyService } from '../src/services/samplePolicyService';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
import type { MedicalUsage } from '../src/domain/medical';

const base = { id: 'u', treatmentName: 't', benefitClass: 'COVERED', severityClass: 'UNKNOWN', frequency: 1, unitCost: 100_000 } as MedicalUsage;
const outpatient = { ...base, careSetting: 'OUTPATIENT' } as MedicalUsage;
const prescription = { ...base, careSetting: 'OUTPATIENT', gen23CareSetting: 'PRESCRIPTION' } as MedicalUsage;
const inpatient = { ...base, careSetting: 'INPATIENT' } as MedicalUsage;
const special = (type: 'MANUAL_THERAPY' | 'INJECTION' | 'MRI') => ({ ...base, careSetting: 'OUTPATIENT', benefitClass: 'NON_COVERED', gen23TreatmentType: type }) as MedicalUsage;

const prior = parseGen23PriorUsage({
  gen23PriorOutpatientCount: '10', gen23PriorPrescriptionCount: '20', gen23PriorInpatientDeductible: '1500000',
  gen23PriorManualTherapyPaid: '300000', gen23PriorManualTherapyCount: '7', gen23PriorInjectionPaid: '400000', gen23PriorInjectionCount: '8', gen23PriorMriPaid: '500000',
});

describe('2·3세대 올해 이용 내역은 담보별로 해당 치료에만 반영한다', () => {
  it('외래·처방·입원', () => {
    expect(applyGen23PriorUsage(outpatient, prior)).toMatchObject({ gen23PriorAnnualCount: 10 });
    expect(applyGen23PriorUsage(prescription, prior)).toMatchObject({ gen23PriorAnnualCount: 20 });
    const applied = applyGen23PriorUsage(inpatient, prior);
    expect(applied.gen23PriorEligibleDeductible).toBe(1_500_000);
    expect(applied.gen23PriorAnnualCount).toBeUndefined();
  });

  it('입원의 이미 받은 보험금(1사고 한도)은 예정 치료 입력을 그대로 둔다', () => {
    expect(applyGen23PriorUsage({ ...inpatient, gen23PriorPaidBenefit: 777 }, prior).gen23PriorPaidBenefit).toBe(777);
  });

  it('3세대 특약은 치료 종류별 사용분과 횟수를 쓴다(MRI는 횟수 없음)', () => {
    expect(applyGen23PriorUsage(special('MANUAL_THERAPY'), prior)).toMatchObject({ gen23PriorPaidBenefit: 300_000, gen23PriorAnnualCount: 7 });
    expect(applyGen23PriorUsage(special('INJECTION'), prior)).toMatchObject({ gen23PriorPaidBenefit: 400_000, gen23PriorAnnualCount: 8 });
    const mri = applyGen23PriorUsage(special('MRI'), prior);
    expect(mri.gen23PriorPaidBenefit).toBe(500_000);
    expect(mri.gen23PriorAnnualCount).toBeUndefined();
  });

  it('입력하지 않은 값은 undefined로 남아 보류되거나 STEP 3 가정으로 처리된다', () => {
    expect(applyGen23PriorUsage(outpatient, {}).gen23PriorAnnualCount).toBeUndefined();
  });

  it('형식이 틀리면 알려준다', () => {
    expect(() => parseGen23PriorUsage({ gen23PriorOutpatientCount: '-1' })).toThrow('0 이상의 정수');
    expect(() => parseGen23PriorUsage({ gen23PriorOutpatientCount: '1.5' })).toThrow();
  });

  it('저장된 예정 치료에서 입력값을 되살린다', () => {
    const usages = ['MANUAL_THERAPY', 'MRI'].map((type) => applyGen23PriorUsage(special(type as 'MANUAL_THERAPY'), prior)).concat([applyGen23PriorUsage(outpatient, prior), applyGen23PriorUsage(inpatient, prior)]);
    expect(gen23PriorFormFromUsages(usages)).toMatchObject({ gen23PriorManualTherapyPaid: '300000', gen23PriorManualTherapyCount: '7', gen23PriorMriPaid: '500000', gen23PriorOutpatientCount: '10', gen23PriorInpatientDeductible: '1500000' });
  });

  it('세대를 바꾸면 비우고, STEP 1 샘플은 올해 이용 없음(0)으로 채운다', () => {
    expect(generationSelectedPatch(3, { selectedSampleId: null }).contractDetails).toEqual({});
    expect(GEN23_SAMPLE_CONTRACT_DETAILS.gen23PriorOutpatientCount).toBe('0');
    expect(contractSamplePatch('GEN3').contractDetails).toMatchObject({ gen23PriorMriPaid: '0' });
  });
});

describe('2·3세대 계산에서 올해 이용 내역이 한도에 반영된다', () => {
  const selections = { ...useAnalysisStore.getState().productCalculationSelections, samsungGen23Variant: 'standard' as const };
  const contract = { insurer: '삼성화재', productName: 'x', inceptionDate: '2018-03-01', generation: 3 as const, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
  const assumptions = { assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true, assumeSingleIndemnityContract: true } as never;
  const outpatientUsage = (form: Record<string, string>) => applyGen23ContractInputs({
    ...outpatient, claimCause: 'DISEASE', nationalHealthInsuranceStatus: 'APPLIED', institutionType: 'CLINIC_HOSPITAL', healthInsuranceCopayRate: 0.3, coveredAmount: 100_000,
    gen23CareSetting: 'OUTPATIENT', gen23Institution: 'CLINIC', gen23CoveredCopay: 100_000, gen23NonCoveredExpense: 0, gen23TreatmentType: 'BASE', gen23RiderEnrollmentStatus: 'ENROLLED',
    gen23PolicyExclusionsCleared: true, gen23SameDayAggregationConfirmed: true, gen23ThreeNonCoveredExcludedFromBaseConfirmed: true,
  } as MedicalUsage, { ...GEN23_SAMPLE_CONTRACT_DETAILS, ...form });

  it('올해 외래를 179회 이용했으면 마지막 1회까지 보상하고, 180회를 이미 이용했으면 보상하지 않는다', () => {
    const paid = (count: string) => calculateSamsungComparisonItem(contract as never, selections, outpatientUsage({ gen23PriorOutpatientCount: count }), assumptions).claim;
    expect(paid('0')).toBeGreaterThan(0);
    expect(paid('179')).toBe(paid('0'));
    expect(paid('180')).toBe(0);
  });

  it('올해 이용 내역을 비우면 보류한다', () => {
    const usage = outpatientUsage({ gen23PriorOutpatientCount: '' });
    expect(calculateSamsungComparisonItem(contract as never, selections, usage, assumptions).claim).toBeNull();
    expect(calculateSamsungComparisonItem(contract as never, selections, usage, { ...(assumptions as object), assumeNoPriorLimitUsage: true } as never).claim).toBeGreaterThan(0);
  });
});
