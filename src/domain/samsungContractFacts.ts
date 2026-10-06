import type { MedicalUsage } from './medical';
import type { SamsungDraftCalculationInput } from '../engine/evaluateSamsungExecutionSpec';

/** 보험증권/전환 견적에서 담보별로 확인한 값. 현재 계약과 비교 계약은 별도로 저장한다. */
export interface SamsungContractFacts {
  coveredBenefitCap?: number;
  nonCoveredBenefitCap?: number;
  nonSevereBenefitCap?: number;
  coveredOutpatientCap?: number;
  nonCoveredOutpatientCap?: number;
  otherIndemnityPoliciesExist?: boolean;
  proportionalPaymentFactor?: number;
  /** 4세대 현재 계약의 올해 이미 이용한 내역(선택). 비우면 STEP 3의 '사용한 한도 없음' 가정으로만 계산한다. */
  priorCoveredInjuryPaid?: number;
  priorCoveredDiseasePaid?: number;
  priorCoveredInpatientDeductible?: number;
  priorNonCoveredInjuryPaid?: number;
  priorNonCoveredDiseasePaid?: number;
  priorNonCoveredInjuryVisits?: number;
  priorNonCoveredDiseaseVisits?: number;
  /** 3대 비급여(도수·체외충격파·증식 / 주사 / MRI) 올해 이미 받은 보험금과 치료 횟수 */
  priorManualTherapyPaid?: number;
  priorManualTherapyCount?: number;
  priorInjectionPaid?: number;
  priorInjectionCount?: number;
  priorMriPaid?: number;
}

/** 올해 이용한 내역 입력 칸(순서가 화면 순서). */
export const PRIOR_USAGE_KEYS = [
  'priorCoveredInjuryPaid', 'priorCoveredDiseasePaid', 'priorCoveredInpatientDeductible',
  'priorNonCoveredInjuryPaid', 'priorNonCoveredDiseasePaid', 'priorNonCoveredInjuryVisits', 'priorNonCoveredDiseaseVisits',
  'priorManualTherapyPaid', 'priorManualTherapyCount', 'priorInjectionPaid', 'priorInjectionCount', 'priorMriPaid',
] as const satisfies readonly (keyof SamsungContractFacts)[];
export type PriorUsageKey = (typeof PRIOR_USAGE_KEYS)[number];
export type SamsungContractForm = Partial<Record<keyof SamsungContractFacts, string>>;

export function samsungContractForm(facts?: SamsungContractFacts): SamsungContractForm {
  return Object.fromEntries(Object.entries(facts ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
}

export function parseSamsungContractFacts(form: SamsungContractForm, generation: 4 | 5): SamsungContractFacts {
  const facts: SamsungContractFacts = {};
  for (const key of ['coveredBenefitCap', 'nonCoveredBenefitCap', 'nonSevereBenefitCap', 'coveredOutpatientCap', 'nonCoveredOutpatientCap', 'proportionalPaymentFactor'] as const) {
    if (!form[key]?.trim() || (key === 'proportionalPaymentFactor' && form.otherIndemnityPoliciesExist !== 'true')) continue;
    const value = Number(form[key]);
    const max = key === 'proportionalPaymentFactor' ? 1 : key.includes('Outpatient') ? 200_000 : key === 'nonSevereBenefitCap' ? 10_000_000 : 50_000_000;
    if (!Number.isFinite(value) || value < 0 || (key !== 'proportionalPaymentFactor' && (value === 0 || !Number.isInteger(value))) || value > max) throw new Error(`가입금액·비례분담 값은 ${max.toLocaleString("ko-KR")} 이하의 유효한 값으로 입력해주세요.`);
    facts[key] = value;
  }
  for (const key of PRIOR_USAGE_KEYS) {
    const raw = form[key]?.trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) throw new Error('올해 이미 이용한 내역은 0 이상의 정수로 입력해주세요.');
    facts[key] = value;
  }
  if (generation === 5) {
    if (facts.nonCoveredBenefitCap !== undefined && ![50_000_000, 30_000_000, 10_000_000].includes(facts.nonCoveredBenefitCap)) throw new Error('중증 비급여 가입금액은 5천만·3천만·1천만원 중 확인해주세요.');
    if (facts.nonSevereBenefitCap !== undefined && ![10_000_000, 6_000_000, 2_000_000].includes(facts.nonSevereBenefitCap)) throw new Error('비중증 비급여 가입금액은 1천만·600만·200만원 중 확인해주세요.');
  }
  if (form.otherIndemnityPoliciesExist === 'true' || form.otherIndemnityPoliciesExist === 'false') facts.otherIndemnityPoliciesExist = form.otherIndemnityPoliciesExist === 'true';
  return facts;
}

export function contractFactsForUsage(facts: SamsungContractFacts, usage: MedicalUsage, generation: number): Partial<SamsungDraftCalculationInput> {
  const covered = usage.benefitClass === 'COVERED';
  const severe = usage.samsungGen5Facts
    ? usage.samsungGen5Facts.specialCaseDisease === 'YES' && usage.samsungGen5Facts.treatmentRelatedness === 'RELATED'
    : usage.severityClass === 'SEVERE';
  return {
    contractBenefitCap: covered ? facts.coveredBenefitCap : generation === 5 && !severe ? facts.nonSevereBenefitCap : facts.nonCoveredBenefitCap,
    perOccurrenceBenefitCap: covered ? facts.coveredOutpatientCap : generation === 4 ? facts.nonCoveredOutpatientCap : undefined,
    otherIndemnityPoliciesExist: facts.otherIndemnityPoliciesExist,
    proportionalPaymentFactor: facts.proportionalPaymentFactor,
  };
}
