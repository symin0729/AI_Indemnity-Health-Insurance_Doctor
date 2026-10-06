import { isGen23VariantRegistered, type SamsungGen23Variant } from '../../../domain/samsungGen23Variant';
import { parseGen23ContractDetails, type ContractDetailForm, type Gen23ContractDetailKey } from '../../../domain/contractDetails';
import { parseGen23PriorUsage } from '../../../domain/gen23PriorUsage';
import { parseSamsungContractFacts, type SamsungContractForm } from '../../../domain/samsungContractFacts';
import type { InputFailure } from './inputModel';

export const CONTRACT_DETAIL_LABELS: Partial<Record<Gen23ContractDetailKey, string>> = {
  gen23ContractBenefitCap: '입원 가입금액',
  gen23OutpatientBenefitCap: '외래 1회 가입금액',
  gen23PrescriptionBenefitCap: '처방 1건 가입금액',
  gen23RequiredCoverageConfirmed: '선택한 상품·종형의 주계약 가입 여부',
  gen23OtherIndemnityPoliciesExist: '다른 실손보험 가입 여부',
  gen23ProportionalPaymentFactor: '보험사에서 확인한 비례분담 계수',
};

/** 설계사용 비교는 현재 계약과 전환 계약을 각각 실손 계약 1개 기준으로 계산한다. */
export function singleContractForm(form: SamsungContractForm): SamsungContractForm {
  return { ...form, otherIndemnityPoliciesExist: 'false', proportionalPaymentFactor: undefined };
}

export function singleContractDetails(form: ContractDetailForm, variant?: SamsungGen23Variant): ContractDetailForm {
  return { ...form, ...(variant === undefined ? {} : { gen23RequiredCoverageConfirmed: String(isGen23VariantRegistered(variant)) }), gen23OtherIndemnityPoliciesExist: 'false', gen23ProportionalPaymentFactor: undefined };
}

/** 미가입 특약의 숨겨진 금액은 저장·검증에서 제외한다. 다시 가입을 선택하면 폼의 값은 재사용할 수 있다. */
export function currentContractFormForSelection(form: SamsungContractForm, rider: string): SamsungContractForm {
  const single = singleContractForm(form);
  return rider === 'ENROLLED' ? single : {
    ...single, nonCoveredBenefitCap: undefined, nonCoveredOutpatientCap: undefined,
    priorNonCoveredInjuryPaid: undefined, priorNonCoveredDiseasePaid: undefined, priorNonCoveredInjuryVisits: undefined, priorNonCoveredDiseaseVisits: undefined,
    priorManualTherapyPaid: undefined, priorManualTherapyCount: undefined, priorInjectionPaid: undefined, priorInjectionCount: undefined, priorMriPaid: undefined,
  };
}

/** 설계사용 STEP 1: 보이는 필수값을 다음 단계와 최종 제출에서 동일하게 검증한다. */
export function validateContractDetails(input: {
  generation: number;
  contractDetails: ContractDetailForm;
  currentContractFactsForm: SamsungContractForm;
  gen4NonCoveredRider: string;
}): InputFailure | null {
  const missing = (label: string, focusId: string): InputFailure => ({ ok: false, message: `필수 항목을 입력해주세요: ${label}.`, goToStep: 1, focusId });
  if (input.generation === 2 || input.generation === 3) {
    const form = singleContractDetails(input.contractDetails);
    const keys: Gen23ContractDetailKey[] = ['gen23ContractBenefitCap', 'gen23OutpatientBenefitCap', 'gen23PrescriptionBenefitCap'];
    for (const key of keys) {
      if (!form[key]?.trim()) return missing(CONTRACT_DETAIL_LABELS[key]!, `contract-detail-${key}`);
    }
    const limits = [['gen23ContractBenefitCap', 50_000_000], ['gen23OutpatientBenefitCap', 300_000], ['gen23PrescriptionBenefitCap', 300_000]] as const;
    for (const [key, max] of limits) {
      const amount = Number(form[key]);
      if (!Number.isInteger(amount) || amount < 0 || (key === 'gen23ContractBenefitCap' && amount === 0) || amount > max) return { ok: false, message: `${CONTRACT_DETAIL_LABELS[key]}은(는) ${key === 'gen23ContractBenefitCap' ? '0원 초과' : '0원 이상'}, ${max.toLocaleString('ko-KR')}원 이하로 입력해주세요.`, goToStep: 1, focusId: `contract-detail-${key}` };
    }
    if (Number(form.gen23OutpatientBenefitCap) + Number(form.gen23PrescriptionBenefitCap) > 300_000) return { ok: false, message: '외래·처방 가입금액 합계는 30만 원 이하여야 합니다.', goToStep: 1, focusId: 'contract-detail-gen23OutpatientBenefitCap' };
    try { parseGen23ContractDetails(form); parseGen23PriorUsage(form); } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '가입금액을 확인해주세요.', goToStep: 1 };
    }
  }
  if (input.generation === 4) {
    const form = currentContractFormForSelection(input.currentContractFactsForm, input.gen4NonCoveredRider);
    const fields: Array<[keyof SamsungContractForm, string, string]> = [
      ['coveredBenefitCap', '급여 연간 가입금액', 'coveredBenefitCap'],
      ['coveredOutpatientCap', '급여 통원 1회 가입금액', 'coveredOutpatientCap'],
      ...(input.gen4NonCoveredRider === 'ENROLLED' ? [
        ['nonCoveredBenefitCap', '일반 비급여 연간 가입금액', 'nonCoveredBenefitCap'],
        ['nonCoveredOutpatientCap', '일반 비급여 통원 1회 가입금액', 'nonCoveredOutpatientCap'],
      ] as Array<[keyof SamsungContractForm, string, string]> : []),
    ];
    for (const [key, label, id] of fields) if (!form[key]?.trim()) return missing(label, `current-contract-${id}`);
    try { parseSamsungContractFacts(form, 4); } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '가입금액을 확인해주세요.', goToStep: 1 };
    }
  }
  return null;
}

/** 선택하지 않은 5세대 특약의 이전 입력은 검증·계산에서 제외한다. */
export function targetContractFormForSelection(form: SamsungContractForm, severe: boolean, nonSevere: boolean): SamsungContractForm {
  return { ...singleContractForm(form),
    nonCoveredBenefitCap: severe ? form.nonCoveredBenefitCap : undefined,
    nonSevereBenefitCap: nonSevere ? form.nonSevereBenefitCap : undefined,
  };
}
