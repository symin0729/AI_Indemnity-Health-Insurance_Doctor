import type { MedicalUsage } from "./medical";

/**
 * 2·3세대 현재 계약의 "올해 이미 이용한 내역" 중 연간 계약 단위 값. 이미 지나간 이용이라 예정 치료가 아니라 STEP 1-2에서 받는다.
 * 입원의 '이미 받은 보험금'은 하나의 상해·질병(1사고) 한도 값이라 예정 치료의 입원 입력에 그대로 둔다.
 * 값은 모두 화면 입력 문자열이고, 비어 있으면 입력하지 않은 것이다(0과 다르다).
 */
export const GEN23_PRIOR_KEYS = [
  "gen23PriorOutpatientCount",
  "gen23PriorPrescriptionCount",
  "gen23PriorInpatientDeductible",
  "gen23PriorManualTherapyPaid",
  "gen23PriorManualTherapyCount",
  "gen23PriorInjectionPaid",
  "gen23PriorInjectionCount",
  "gen23PriorMriPaid",
] as const;
export type Gen23PriorKey = (typeof GEN23_PRIOR_KEYS)[number];

export interface Gen23PriorField { key: Gen23PriorKey; label: string; help: string; unit: "원" | "회"; generation?: 3 }

export const GEN23_PRIOR_FIELDS: readonly Gen23PriorField[] = [
  { key: "gen23PriorOutpatientCount", label: "외래: 올해 이용 횟수", help: "계약해당일 이후 외래 방문 횟수, 연 180회 한도", unit: "회" },
  { key: "gen23PriorPrescriptionCount", label: "처방조제: 올해 이용 건수", help: "계약해당일 이후 처방전 건수, 연 180건 한도", unit: "회" },
  { key: "gen23PriorInpatientDeductible", label: "입원: 올해 누적 자기부담", help: "입원의 나머지 자기부담 누적액. 연 200만 원을 넘으면 초과분을 보상", unit: "원" },
  { key: "gen23PriorManualTherapyPaid", label: "도수·체외충격파·증식치료: 올해 이미 받은 보험금", help: "연 350만 원 한도 계산에 사용", unit: "원", generation: 3 },
  { key: "gen23PriorManualTherapyCount", label: "도수·체외충격파·증식치료: 올해 치료 횟수", help: "세 치료의 횟수 합산, 연 50회 한도", unit: "회", generation: 3 },
  { key: "gen23PriorInjectionPaid", label: "주사료: 올해 이미 받은 보험금", help: "연 250만 원 한도 계산에 사용", unit: "원", generation: 3 },
  { key: "gen23PriorInjectionCount", label: "주사료: 올해 치료 횟수", help: "입원·통원 합산, 연 50회 한도", unit: "회", generation: 3 },
  { key: "gen23PriorMriPaid", label: "MRI/MRA: 올해 이미 받은 보험금", help: "연 300만 원 한도 계산에 사용", unit: "원", generation: 3 },
];

export type Gen23PriorForm = Partial<Record<Gen23PriorKey, string>>;
export type Gen23PriorValues = Partial<Record<Gen23PriorKey, number>>;

export function parseGen23PriorUsage(form: Gen23PriorForm): Gen23PriorValues {
  const values: Gen23PriorValues = {};
  for (const key of GEN23_PRIOR_KEYS) {
    const raw = form[key]?.trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) throw new Error("올해 이미 이용한 내역은 0 이상의 정수로 입력해주세요.");
    values[key] = value;
  }
  return values;
}

type Special = "MANUAL_THERAPY" | "INJECTION" | "MRI";
const SPECIAL_KEYS: Record<Special, { paid: Gen23PriorKey; count?: Gen23PriorKey }> = {
  MANUAL_THERAPY: { paid: "gen23PriorManualTherapyPaid", count: "gen23PriorManualTherapyCount" },
  INJECTION: { paid: "gen23PriorInjectionPaid", count: "gen23PriorInjectionCount" },
  MRI: { paid: "gen23PriorMriPaid" },
};

/**
 * 담보별 올해 이용 내역을 예정 치료 하나의 계산 입력에 맞춰 넣는다.
 * 입력하지 않은 값은 undefined로 남겨 계산이 보류되거나 STEP 3의 '사용한 한도 없음' 가정으로 처리되게 한다.
 */
export function applyGen23PriorUsage(usage: MedicalUsage, prior: Gen23PriorValues): MedicalUsage {
  const care = usage.gen23CareSetting ?? usage.careSetting;
  const type = usage.gen23TreatmentType;
  if (type === "MANUAL_THERAPY" || type === "INJECTION" || type === "MRI") {
    const keys = SPECIAL_KEYS[type];
    return { ...usage, gen23PriorPaidBenefit: prior[keys.paid], gen23PriorAnnualCount: keys.count ? prior[keys.count] : usage.gen23PriorAnnualCount };
  }
  if (care === "INPATIENT") return { ...usage, gen23PriorEligibleDeductible: prior.gen23PriorInpatientDeductible };
  return { ...usage, gen23PriorAnnualCount: care === "PRESCRIPTION" ? prior.gen23PriorPrescriptionCount : prior.gen23PriorOutpatientCount };
}

/** 저장된 예정 치료들에서 담보별 입력값을 되살린다(고객 보험 정보 화면에 다시 들어올 때). */
export function gen23PriorFormFromUsages(usages: readonly Partial<MedicalUsage>[]): Gen23PriorForm {
  const form: Gen23PriorForm = {};
  const set = (key: Gen23PriorKey, value: number | undefined) => { if (value !== undefined && form[key] === undefined) form[key] = String(value); };
  for (const usage of usages) {
    const care = usage.gen23CareSetting ?? usage.careSetting;
    const type = usage.gen23TreatmentType;
    if (type === "MANUAL_THERAPY" || type === "INJECTION" || type === "MRI") {
      const keys = SPECIAL_KEYS[type];
      set(keys.paid, usage.gen23PriorPaidBenefit);
      if (keys.count) set(keys.count, usage.gen23PriorAnnualCount);
    } else if (care === "INPATIENT") set("gen23PriorInpatientDeductible", usage.gen23PriorEligibleDeductible);
    else set(care === "PRESCRIPTION" ? "gen23PriorPrescriptionCount" : "gen23PriorOutpatientCount", usage.gen23PriorAnnualCount);
  }
  return form;
}

/** 2·3세대 샘플 계약: 올해 이용 내역 없음(설명용). */
export const GEN23_SAMPLE_PRIOR_USAGE: Gen23PriorForm = Object.fromEntries(GEN23_PRIOR_KEYS.map((key) => [key, "0"]));
