import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculateSamsungGen5 } from '../src/engine/calculateSamsungGen5';
import { calculateSamsungAnnualComparison, calculateSamsungComparisonItem } from '../src/engine/calculateSamsungComparison';
import { evaluateSamsungExecutionSpec, type SamsungExecutionRule } from '../src/engine/evaluateSamsungExecutionSpec';
import { contractFactsForUsage, parseSamsungContractFacts, samsungContractForm } from '../src/domain/samsungContractFacts';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
import type { MedicalUsage } from '../src/domain/medical';
import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';

const facts = { policyExclusionsCleared: true, requiredCoverageConfirmed: true, otherIndemnityPoliciesExist: false, sameDayAggregationConfirmed: true, priorPaidBenefit: 0, priorEligibleDeductible: 0, priorAnnualCount: 0, priorServiceDays: 0, claimCause: 'DISEASE' as const, eligibleExpense: 1_000_000, conversionContractSubtype: 'CONTRACT_CONVERSION' as const, conversionEligibilityConfirmed: true };
const contract = { insurer: '삼성화재', productName: '검수표 검산', inceptionDate: '2026-06-01', generation: 5 as const, monthlyPremium: 50_000, renewalCycleMonths: null, reentryCycleMonths: null, coverages: [] };
const selections = { ...useAnalysisStore.getState().productCalculationSelections, gen4NonCoveredRider: 'ENROLLED' as const, gen5SevereRider: 'ENROLLED' as const, gen5NonSevereRider: 'ENROLLED' as const };
const assumptions = { assumeEntireMedicalCostCovered: true, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true, targetContractFacts: confirmedContractFacts };
const usage: MedicalUsage = { id: 'a', treatmentName: '통원', careSetting: 'OUTPATIENT', benefitClass: 'NON_COVERED', severityClass: 'NON_SEVERE', claimCause: 'DISEASE', nationalHealthInsuranceStatus: 'APPLIED', frequency: 1, unitCost: 1_000_000, institutionType: 'GENERAL_TERTIARY', samsungGen5Facts: { specialCaseDisease: 'NO', treatmentRelatedness: 'UNKNOWN', policyExcludedTreatment: 'NO' }, samsungCalculationInput: { ...facts, contractBenefitCap: 10_000_000 } };

describe('2026-10-06 구글 시트 검수 반영', () => {
  for (const type of ['GENERAL', 'CONVERSION'] as const) {
    it.each([[50_000_000, 200_000], [30_000_000, 150_000], [10_000_000, 100_000]])(`${type}: 중증 통원 연 가입금액 %i → 회당 %i`, (contractBenefitCap, expected) => {
      expect(calculateSamsungGen5(type, 'SEVERE_NON_COVERED_OUTPATIENT', { ...facts, contractBenefitCap }).claim).toBe(expected);
    });
    it.each([[10_000_000, 200_000], [6_000_000, 150_000], [2_000_000, 100_000]])(`${type}: 비중증 통원 연 가입금액 %i → 일당 %i`, (contractBenefitCap, expected) => {
      expect(calculateSamsungGen5(type, 'NON_SEVERE_NON_COVERED_OUTPATIENT', { ...facts, contractBenefitCap }).claim).toBe(expected);
      expect(calculateSamsungGen5(type, 'NON_SEVERE_NON_COVERED_OUTPATIENT', { ...facts, contractBenefitCap, priorPaidBenefit: contractBenefitCap - 10_000 }).claim).toBe(10_000);
    });
    it.each([undefined, 0, -1, NaN, Infinity, 50_000_000])(`${type}: 비중증 계약금액 %s은 확정 보류`, (contractBenefitCap) => {
      expect(calculateSamsungGen5(type, 'NON_SEVERE_NON_COVERED_OUTPATIENT', { ...facts, contractBenefitCap }).claim).toBeNull();
    });
  }

  it('1만원 비중증 잔여 한도는 입원·통원 합산하고 상해·질병은 분리한다', () => {
    const result = calculateSamsungAnnualComparison(contract, 30_000, ['SPECIAL_RIDER_2'], selections, [
      { ...usage, id: 'in', careSetting: 'INPATIENT', samsungCalculationInput: { ...facts, contractBenefitCap: 2_000_000, nonSevereNonCoveredInpatientExcludingRoom: 100_000, roomDifference: 0, priorPaidBenefit: 1_940_000 } },
      { ...usage, id: 'out', samsungCalculationInput: { ...facts, contractBenefitCap: 2_000_000, priorPaidBenefit: 1_940_000 } },
      { ...usage, id: 'injury', claimCause: 'INJURY', samsungCalculationInput: { ...facts, contractBenefitCap: 2_000_000, priorPaidBenefit: 0 } },
    ], assumptions);
    expect(result.items.map((item) => item.currentClaimTotal)).toEqual([50_000, 10_000, 100_000]);
  });

  it('4세대 일반 비급여 상해·질병 연간 금액·횟수도 분리한다', () => {
    const make = (id: string, cause: 'INJURY' | 'DISEASE', priorPaidBenefit: number, priorAnnualCount: number): MedicalUsage => ({ ...usage, id, claimCause: cause, samsungCalculationInput: { ...facts, contractBenefitCap: 10_000_000, perOccurrenceBenefitCap: 200_000, priorPaidBenefit, priorAnnualCount, threeNonCoveredExcludedFromBaseConfirmed: true } });
    const result = calculateSamsungAnnualComparison({ ...contract, generation: 4 }, 30_000, ['SPECIAL_RIDER_2'], selections, [make('disease', 'DISEASE', 9_990_000, 99), make('injury', 'INJURY', 0, 0)], assumptions);
    expect(result.items.map((item) => item.currentClaimTotal)).toEqual([10_000, 200_000]);
  });

  it('기존 계약 금액을 전환 계약 금액으로 재사용하지 않는다', () => {
    expect(calculateSamsungComparisonItem({ ...contract, coverages: ['SPECIAL_RIDER_2'] }, selections, usage, { ...assumptions, targetContractFacts: undefined }, true).claim).toBeNull();
    expect(calculateSamsungComparisonItem({ ...contract, coverages: ['SPECIAL_RIDER_2'] }, selections, usage, { ...assumptions, targetContractFacts: { ...confirmedContractFacts, nonSevereBenefitCap: 2_000_000 } }, true).claim).toBe(100_000);
  });

  it('다수보험이 미확인이면 계산을 보류하고 0.5 비례분담은 확인 시 적용한다', () => {
    for (const patch of [{ otherIndemnityPoliciesExist: undefined }, { otherIndemnityPoliciesExist: true, proportionalPaymentFactor: undefined }]) {
      expect(calculateSamsungGen5('GENERAL', 'NON_SEVERE_NON_COVERED_OUTPATIENT', { ...facts, contractBenefitCap: 10_000_000, ...patch }).claim).toBeNull();
    }
    expect(calculateSamsungGen5('GENERAL', 'NON_SEVERE_NON_COVERED_OUTPATIENT', { ...facts, contractBenefitCap: 10_000_000, otherIndemnityPoliciesExist: true, proportionalPaymentFactor: 0.5 }).claim).toBe(100_000);
  });

  it('종합병원 입원에는 비중증 300만원 제한을 적용하지 않는다', () => {
    expect(calculateSamsungGen5('GENERAL', 'NON_SEVERE_NON_COVERED_INPATIENT', { ...facts, contractBenefitCap: 10_000_000, institution: 'GENERAL_HOSPITAL', nonSevereNonCoveredInpatientExcludingRoom: 8_000_000, roomDifference: 0 }).claim).toBe(4_000_000);
  });

  it('2세대 일반 종합병원은 15,000원, 상급종합병원은 20,000원 공제한다', () => {
    const spec = JSON.parse(fs.readFileSync('knowledge/drafts/samsung/executable-specs/SAMSUNG_1611_7.standard.execution-spec.draft.json', 'utf8'));
    const rule = spec.rules.find((r: SamsungExecutionRule) => r.ruleId === 'G2-STD-02');
    const input = { ...facts, eligibleExpense: 50_000, nhiApplied: true, outpatientBenefitCap: 250_000, prescriptionBenefitCap: 50_000 };
    expect(evaluateSamsungExecutionSpec(rule, { ...input, institution: 'GENERAL_HOSPITAL' }).claim).toBe(35_000);
    expect(evaluateSamsungExecutionSpec(rule, { ...input, institution: 'GENERAL_TERTIARY' }).claim).toBe(30_000);
  });

  it('중증 MRI 입원 자기부담은 종합병원 연 500만원 상한에 포함한다', () => {
    const input = { ...facts, careSetting: 'INPATIENT' as const, institution: 'GENERAL_HOSPITAL' as const, threeNonCoveredCategory: 'MRI' as const, aggregationUnit: 'DIAGNOSTIC_ACTION' as const, specifiedThreeNonCoveredTreatment: false, priorEligibleDeductible: 4_900_000 };
    expect(calculateSamsungGen5('GENERAL', 'SEVERE_THREE_NON_COVERED', input).claim).toBe(900_000);
    expect(calculateSamsungGen5('GENERAL', 'SEVERE_THREE_NON_COVERED', { ...input, careSetting: 'OUTPATIENT' }).claim).toBe(700_000);
  });

  it('폼의 공란과 확인된 값·담보별 가입금액을 구별한다', () => {
    expect(parseSamsungContractFacts({}, 5)).toEqual({});
    const parsed = parseSamsungContractFacts(samsungContractForm(confirmedContractFacts), 5);
    expect(parsed).toEqual(confirmedContractFacts);
    expect(contractFactsForUsage(parsed, usage, 5).contractBenefitCap).toBe(10_000_000);
    expect(() => parseSamsungContractFacts({ nonSevereBenefitCap: '50000000' }, 5)).toThrow();
    expect(parseSamsungContractFacts({ otherIndemnityPoliciesExist: 'false', proportionalPaymentFactor: '0.5' }, 5).proportionalPaymentFactor).toBeUndefined();
  });

  it('49개 규칙과 223개 숫자·7개 기본가정 원본을 보존하고 수정된 근거를 연결한다', () => {
    const review = JSON.parse(fs.readFileSync('knowledge/validation/samsung/spreadsheet-review-2026-10-06.json', 'utf8'));
    expect(review.sheets['1.숫자검수']).toHaveLength(224);
    expect(review.sheets['2.계산식검산']).toHaveLength(50);
    expect(review.sheets['3.기본가정검수']).toHaveLength(8);
    const evidence = JSON.parse(fs.readFileSync('knowledge/rule-evidence-map.json', 'utf8'));
    for (const row of review.sheets['4.규칙목록(참고)'].slice(1)) {
      const item = evidence.mappings.find((r: { ruleId: string }) => r.ruleId === row[3]);
      expect(item.pdfPage).toBe(row[11]);
      expect(item.quoteSummary).toBe(row[14]);
    }
  });
});

it('5세대 본문 근거는 실제 조항명을 쓰고 한도 표시에서 중복을 제거한다', () => {
  const evidence = JSON.parse(fs.readFileSync('knowledge/rule-evidence-map.json', 'utf8'));
  for (const item of evidence.mappings.filter((item: {ruleId: string}) => item.ruleId.startsWith('G5-'))) {
    expect(item.article).toBe(item.ruleId.endsWith('-09') ? '제6조 (보험료의 계산)' : '제3조 (보장종목별 보상내용)');
    expect(item.sourceSection).not.toContain('요약서');
  }
  const draft = JSON.parse(fs.readFileSync('knowledge/drafts/samsung/SAMSUNG_0904_2.rules.draft.json', 'utf8'));
  expect(draft.rules.find((rule: {id: string}) => rule.id === 'G1-01').limit).toBe('1사고 50,000,000원; 사고일부터 365일');
  expect(draft.rules.find((rule: {id: string}) => rule.id === 'G1-05').limit).toContain('재보장 간격 180일');
});
