import type { MedicalUsage } from "./medical";
import { gen23Fields, parseGen23Form, type Gen23Field } from "./samsungGen23Form";
import { applyGen23PriorUsage, GEN23_SAMPLE_PRIOR_USAGE, parseGen23PriorUsage, type Gen23PriorKey } from "./gen23PriorUsage";

/**
 * 현재 계약의 상세 정보(가입금액·다른 실손·보장기간 등). 보험증권에서 확인하는 계약 사실이라
 * 예정 치료가 아니라 STEP 1(고객 보험 정보)에서 한 번만 받는다. 값은 모두 화면 입력 문자열이다.
 */
export const GEN23_CONTRACT_DETAIL_KEYS = [
  "gen23ContractBenefitCap",
  "gen23OutpatientBenefitCap",
  "gen23PrescriptionBenefitCap",
  "gen23RequiredCoverageConfirmed",
  "gen23OtherIndemnityPoliciesExist",
  "gen23ProportionalPaymentFactor",
] as const satisfies readonly (keyof MedicalUsage)[];

export type Gen23ContractDetailKey = (typeof GEN23_CONTRACT_DETAIL_KEYS)[number];

/** 4세대 현재 계약의 보험가입금액(약관상 최대값 이내에서 계약자가 선택). */
export type Gen4ContractDetailKey = "gen4ContractBenefitCap" | "gen4PerOccurrenceBenefitCap";

export type ContractDetailForm = Partial<Record<Gen23ContractDetailKey | Gen4ContractDetailKey | Gen23PriorKey, string>>;

export const GEN23_CONTRACT_DETAIL_KEY_SET: ReadonlySet<string> = new Set(GEN23_CONTRACT_DETAIL_KEYS);

/** STEP 1에 보여줄 2·3세대 계약 상세 칸(라벨·선택지는 기존 2·3세대 입력 정의를 그대로 쓴다). */
export function gen23ContractDetailFields(): Gen23Field[] {
  return GEN23_CONTRACT_DETAIL_KEYS.map((key) => gen23Fields.find((field) => field.key === key)).filter((field): field is Gen23Field => field !== undefined);
}

/** 조건부 칸: 다른 실손이 있을 때만 비례보상계수를 보여준다. */
export function isGen23ContractDetailVisible(key: Gen23ContractDetailKey, form: ContractDetailForm): boolean {
  if (key === "gen23ProportionalPaymentFactor") return form.gen23OtherIndemnityPoliciesExist === "true";
  return true;
}

/** 2·3세대 계약 상세를 계산용 값으로 바꾼다. 형식이 틀리면 칸 이름과 함께 오류를 던진다. */
export function parseGen23ContractDetails(form: ContractDetailForm): Partial<MedicalUsage> {
  const picked: Partial<Record<keyof MedicalUsage, string>> = {};
  for (const key of GEN23_CONTRACT_DETAIL_KEYS) picked[key] = isGen23ContractDetailVisible(key, form) ? form[key] : undefined;
  const parsed = parseGen23Form(picked);
  return Object.fromEntries(GEN23_CONTRACT_DETAIL_KEYS.map((key) => [key, parsed[key]]));
}

/**
 * 계약 상세를 예정 치료 하나에 반영한다. 치료를 추가할 때와 입력을 확정할 때 모두 이 함수를 써서,
 * STEP 1에서 값을 고친 뒤에도 이미 추가한 치료에 같은 값이 들어가게 한다.
 * 5세대 전환 계산이 읽는 값(samsungCalculationInput)도 같은 값으로 맞춘다.
 */
export function applyGen23ContractDetails(usage: MedicalUsage, details: Partial<MedicalUsage>): MedicalUsage {
  return {
    ...usage,
    ...details,
    samsungCalculationInput: {
      ...usage.samsungCalculationInput,
      requiredCoverageConfirmed: details.gen23RequiredCoverageConfirmed,
      otherIndemnityPoliciesExist: details.gen23OtherIndemnityPoliciesExist,
      proportionalPaymentFactor: details.gen23ProportionalPaymentFactor,
      contractBenefitCap: details.gen23ContractBenefitCap,
      outpatientBenefitCap: details.gen23OutpatientBenefitCap,
      prescriptionBenefitCap: details.gen23PrescriptionBenefitCap,
    },
  };
}

/**
 * 고객 보험 정보(STEP 1)의 계약 상세와 올해 이용 내역을 예정 치료 하나에 모두 반영한다.
 * 형식이 틀리면 칸 이름과 함께 오류를 던진다.
 */
export function applyGen23ContractInputs(usage: MedicalUsage, form: ContractDetailForm): MedicalUsage {
  return applyGen23PriorUsage(applyGen23ContractDetails(usage, parseGen23ContractDetails(form)), parseGen23PriorUsage(form));
}

/** 저장된 치료에서 2·3세대 계약 상세 입력값을 되살린다(화면에 다시 들어올 때). */
export function contractDetailsFromUsage(usage: Partial<MedicalUsage> | undefined): ContractDetailForm {
  if (!usage) return {};
  const form: ContractDetailForm = {};
  for (const key of GEN23_CONTRACT_DETAIL_KEYS) {
    const value = usage[key];
    if (value !== undefined && value !== null) form[key] = String(value);
  }
  return form;
}

/** 2·3세대 샘플 계약의 상세값(예정 치료 샘플이 쓰던 설명용 값과 같다). */
export const GEN23_SAMPLE_CONTRACT_DETAILS: ContractDetailForm = {
  gen23ContractBenefitCap: "50000000",
  gen23OutpatientBenefitCap: "250000",
  gen23PrescriptionBenefitCap: "50000",
  gen23RequiredCoverageConfirmed: "true",
  gen23OtherIndemnityPoliciesExist: "false",
  ...GEN23_SAMPLE_PRIOR_USAGE,
};
