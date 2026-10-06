import { loadTreatmentSample } from '../src/services/sampleScenarioService';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SamsungTreatmentComparison from '../src/components/samsung/SamsungTreatmentComparison';
import { describe, expect, it } from 'vitest';
import { calculateSamsungAnnualComparison } from '../src/engine/calculateSamsungComparison';
import type { InsuranceContract } from '../src/domain/insurance';
import type { MedicalUsage } from '../src/domain/medical';
import { useAnalysisStore, type AnalysisCalculationAssumptions } from '../src/store/useAnalysisStore';

const usage: MedicalUsage = {
  id: 'shared', treatmentName: '같은 급여 통원', careSetting: 'OUTPATIENT', benefitClass: 'COVERED', severityClass: 'UNKNOWN',
  unitCost: 100000, coveredAmount: 100000, frequency: 2, claimCause: 'INJURY', nationalHealthInsuranceStatus: 'APPLIED', institutionType: 'CLINIC_HOSPITAL', healthInsuranceCopayRate: 0.3,
  samsungCalculationInput: { daysSinceAccidentOrDiagnosis: 10 },
  gen23RiderEnrollmentStatus: 'ENROLLED',
  gen23CareSetting: 'OUTPATIENT', gen23TreatmentType: 'BASE', gen23Institution: 'CLINIC',
  gen23CoveredCopay: 100000, gen23NonCoveredExpense: 0, gen23EligibleExpense: 100000,
  gen23RequiredCoverageConfirmed: true, gen23PolicyExclusionsCleared: true,
  gen23OtherIndemnityPoliciesExist: false, gen23SameDayAggregationConfirmed: true,
  gen23ThreeNonCoveredExcludedFromBaseConfirmed: true,
  gen23ContractBenefitCap: 30000000, gen23OutpatientBenefitCap: 50000, gen23PrescriptionBenefitCap: 50000,
};
const assumptions: AnalysisCalculationAssumptions = {
  comparisonBasis: 'FRESH_YEAR', assumeSingleIndemnityContract: true, assumeNoPolicyExclusions: true,
  assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: true, assumeEachOccurrenceSeparate: true,
  currentContractFacts: { coveredBenefitCap: 30000000, coveredOutpatientCap: 50000 },
  targetContractFacts: { coveredBenefitCap: 10000000, coveredOutpatientCap: 40000 },
};
const cases = [
  { generation: 1, variant: 'standard', rule: 'G1-04', cap: 100000, claim: 190000 },
  { generation: 2, variant: 'standard', rule: 'G2-STD-02', cap: 50000, claim: 100000 },
  { generation: 2, variant: 'selected2', rule: 'G2-SEL2-02', cap: 50000, claim: 100000 },
  { generation: 3, variant: 'standard', rule: 'G3-STD-BASE-02', cap: 50000, claim: 100000 },
  { generation: 3, variant: 'selected2', rule: 'G3-SEL2-BASE-02', cap: 50000, claim: 100000 },
  { generation: 4, variant: 'standard', rule: 'G4-08', cap: 50000, claim: 100000 },
] as const;

describe('같은 치료를 서로 다른 계약의 담보·가입금액에 연결', () => {
  it.each(cases)('$generation세대 $variant: 현재 가입금액과 5세대 가입금액을 각각 적용한다', ({ generation, variant, rule, cap, claim }) => {
    const contract: InsuranceContract = { insurer: '삼성화재', productName: '검증 상품', inceptionDate: '2018-03-01', generation, monthlyPremium: 50000, renewalCycleMonths: 12, reentryCycleMonths: 180, coverages: [] };
    const selections = { ...useAnalysisStore.getState().productCalculationSelections, samsungGen23Variant: variant, gen1Product: 'SAMSUNG_0904_2' as const, gen1D1Coverage: 'BOTH' as const };
    const snapshot = structuredClone(usage);
    const result = calculateSamsungAnnualComparison(contract, 30000, [], selections, [usage], assumptions);
    expect(result.complete, JSON.stringify(result.items.map(item => [item.current.reasons, item.target.reasons]))).toBe(true);
    expect(result.medicalCost).toBe(200000);
    expect(result.currentClaimTotal).toBe(claim);
    expect(result.targetClaimTotal).toBe(80000);
    const item = result.items[0];
    expect(item.current.ruleId).toBe(rule);
    expect(item.current.calculationDetails?.perOccurrenceCap).toBe(cap);
    expect(item.current.calculationDetails?.coverage).toBeTruthy();
    expect(item.target.ruleId).toBe('G5-02');
    expect(item.target.calculationDetails?.perOccurrenceCap).toBe(40000);
    expect(item.target.calculationDetails?.benefitCap).toBe(10000000);
    expect(item.target.calculationDetails?.source.documentId).toBe('SAMSUNG_2605_1_GENERAL_TERMS');
    expect(result.currentTotal).toBe(600000 + 200000 - claim);
    expect(result.targetTotal).toBe(360000 + 200000 - 80000);
    expect(usage).toEqual(snapshot);
    const html = renderToStaticMarkup(createElement(SamsungTreatmentComparison, { items: result.items, generation }));
    expect(html).toContain(item.current.calculationDetails!.coverage);
    expect(html).toContain(item.target.calculationDetails!.coverage);
    expect(html).toContain(`${cap.toLocaleString('ko-KR')}원`);
    expect(html).toContain('40,000원');
    expect(html).toContain('80,000원');
  });
  it.each([3, 4] as const)('%i세대 MRI 특약과 5세대 비중증 MRI는 같은 치료에 서로 다른 한도를 적용한다', generation => {
    const source = loadTreatmentSample('NON_COVERED', generation, 'MRI').plannedUsages[0];
    const shared: MedicalUsage = { ...source, frequency: 2, unitCost: 100000, patientPaidAmount: 100000, coveredAmount: 100000,
      gen23CoveredCopay: 0, gen23NonCoveredExpense: 100000, gen23EligibleExpense: 100000,
      samsungCalculationInput: { ...source.samsungCalculationInput, eligibleExpense: 100000 },
    };
    const contract: InsuranceContract = { insurer: '삼성화재', productName: 'MRI 검증 상품', inceptionDate: '2018-03-01', generation, monthlyPremium: 50000, renewalCycleMonths: 12, reentryCycleMonths: 180, coverages: ['NON_COVERED'] };
    const selections = { ...useAnalysisStore.getState().productCalculationSelections, samsungGen23Variant: 'standard' as const, gen4NonCoveredRider: 'ENROLLED' as const };
    const policy = { ...assumptions, targetContractFacts: { ...assumptions.targetContractFacts, nonSevereBenefitCap: 10000000 } };
    const result = calculateSamsungAnnualComparison(contract, 30000, ['SPECIAL_RIDER_2'], selections, [shared], policy);
    expect(result.complete, JSON.stringify(result.items[0])).toBe(true);
    expect(result.medicalCost).toBe(200000);
    expect(result.currentClaimTotal).toBe(140000);
    expect(result.targetClaimTotal).toBe(100000);
    expect(result.items[0].current.ruleId).toBe(generation === 3 ? 'G3-STD-03' : 'G4-07');
    expect(result.items[0].current.calculationDetails?.benefitCap).toBe(3000000);
    expect(result.items[0].target.ruleId).toBe('G5-08');
    expect(result.items[0].target.calculationDetails?.benefitCap).toBe(2000000);
    const withoutRider = calculateSamsungAnnualComparison(contract, 30000, [], selections, [shared], policy);
    expect(withoutRider.currentClaimTotal).toBe(140000);
    expect(withoutRider.targetClaimTotal).toBe(0);
  });

});
