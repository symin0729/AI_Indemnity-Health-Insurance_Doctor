import { Fragment, useId } from "react";
import { InputHelp } from "../InputHelp";
import { gen23InputHelp } from "./gen23InputHelp";
import { gen23Fields, type Gen23Field, type Gen23FormState } from "../../domain/samsungGen23Form";
import type { MedicalUsage } from "../../domain/medical";
const NUMBER_EXAMPLES: Partial<Record<string, string>> = {
  gen23InpatientDays: "예: 7", gen23RoomDifference: "예: 200,000",
  gen23ContractBenefitCap: "예: 50,000,000", gen23OutpatientBenefitCap: "예: 250,000", gen23PrescriptionBenefitCap: "예: 50,000",
  gen23ProportionalPaymentFactor: "예: 0.5", gen23PriorAnnualCount: "예: 3",
};
/** 칸 안에 회색 예시를 보이고, 계산에 꼭 필요하지 않은 칸은 모르면 비워두라고 안내한다. */
const numberPlaceholder = (key: string, required: boolean) => `${NUMBER_EXAMPLES[key] ?? "예: 100,000"}${required ? "" : " · 모르면 비워두세요"}`;
export function Gen23Inputs({ generation, value, onChange, insurerName = "OO 보험", variant, embedded = false, institutionManaged = false, riderManaged = false, hiddenKeys, roomDifferenceOptional = false }: { /** 병실료 차액을 비우면 0원(다인실)으로 보는 화면. 필수 표시를 빼고 안내 문구를 붙인다. */ roomDifferenceOptional?: boolean; /** 다른 화면 칸에서 받는 값. 여기서는 숨긴다. */ hiddenKeys?: ReadonlySet<string>; riderManaged?: boolean; embedded?: boolean; insurerName?: string; variant?: "standard" | "selected2" | "standard2013" | "selected2013" | "unified2009" | "UNKNOWN"; institutionManaged?: boolean; generation: 2 | 3; value: Gen23FormState; onChange: (value: Gen23FormState) => void }) {
  const fieldId = useId();
  const care = value.gen23CareSetting;
  const special = generation === 3 && value.gen23TreatmentType && value.gen23TreatmentType !== "BASE";
  const requiredFields = new Set<keyof MedicalUsage>(["gen23CareSetting", "claimCause", "gen23RequiredCoverageConfirmed", "gen23PolicyExclusionsCleared", "gen23OtherIndemnityPoliciesExist"]);
  if (generation === 3) { requiredFields.add("gen23TreatmentType"); if (!riderManaged) requiredFields.add("gen23RiderEnrollmentStatus"); }
  if (!special) {
    requiredFields.add("nationalHealthInsuranceStatus");
    if (generation === 3) requiredFields.add("gen23ThreeNonCoveredExcludedFromBaseConfirmed");
    if (care === "OUTPATIENT" || care === "PRESCRIPTION") {
      for (const key of ["gen23CoveredCopay", "gen23NonCoveredExpense", "gen23OutpatientBenefitCap", "gen23PrescriptionBenefitCap", "gen23SameDayAggregationConfirmed"] as const) requiredFields.add(key);
      requiredFields.add("gen23PriorAnnualCount");
      if (care === "OUTPATIENT") requiredFields.add("gen23Institution");
    }
    if (care === "INPATIENT") {
      requiredFields.add("gen23ContractBenefitCap"); requiredFields.add("gen23PriorPaidBenefit");
      if (value.nationalHealthInsuranceStatus === "NOT_APPLIED") requiredFields.add("gen23NonNhiInpatientTotal");
      else {
        requiredFields.add("gen23RoomDifference");
        requiredFields.add("gen23PriorEligibleDeductible");
        if (variant === "selected2") { requiredFields.add("gen23CoveredCopay"); requiredFields.add("gen23NonCoveredExpense"); }
        else if (variant === "standard") requiredFields.add("gen23InpatientExcludingRoomDifference");
        if (Number(value.gen23RoomDifference) > 0) requiredFields.add("gen23InpatientDays");
      }
      if (Number(value.gen23ContractBenefitCap) > 0 && Number(value.gen23PriorPaidBenefit) >= Number(value.gen23ContractBenefitCap)) requiredFields.add("gen23BenefitLimitRestored");
    }
  } else {
    requiredFields.add("gen23EligibleExpense"); requiredFields.add("gen23AggregationUnit"); requiredFields.add("gen23PriorPaidBenefit");
    if (value.gen23TreatmentType !== "MRI") requiredFields.add("gen23PriorAnnualCount");
    if (value.gen23TreatmentType === "INJECTION") requiredFields.add("gen23InjectionRiderEligibleConfirmed");
  }
  if (value.gen23OtherIndemnityPoliciesExist === "true") requiredFields.add("gen23ProportionalPaymentFactor");
  // 병실료 차액은 입원일 수와 짝이므로 입원일 수를 왼쪽, 병실료 차액을 오른쪽(아래 줄)에 둔다.
  const orderFields = (list: readonly Gen23Field[]) => {
    if (!roomDifferenceOptional) return list;
    const rest = list.filter(f => f.key !== "gen23InpatientDays" && f.key !== "gen23RoomDifference");
    const days = list.filter(f => f.key === "gen23InpatientDays");
    const room = list.filter(f => f.key === "gen23RoomDifference");
    const careAt = rest.findIndex(f => f.key === "gen23CareSetting");
    return [...rest.slice(0, careAt + 1), ...days, ...room, ...rest.slice(careAt + 1)];
  };
  const roomDifferenceIsOptional = (key: string) => roomDifferenceOptional && key === "gen23RoomDifference";
  if (roomDifferenceOptional) requiredFields.delete("gen23RoomDifference");
  return <fieldset className="form-card" aria-label="추가 입력 항목">
    <legend><h3>{embedded ? `${generation}세대 세부 보장 및 계약 확인` : `${generation}세대 ${insurerName} 계산 조건`}</h3></legend>
    <div className="form-grid">{orderFields(gen23Fields.filter(f => (!institutionManaged || f.key !== "gen23Institution") && !hiddenKeys?.has(f.key) && (!riderManaged || f.key !== "gen23RiderEnrollmentStatus") && (!f.generation || f.generation === generation)
      && (!f.scope || (f.scope === "inpatient" ? care === "INPATIENT" && !special : f.scope === "special" ? special : care !== "INPATIENT" && !special)))).map(f =>
      <Fragment key={f.key}><div><div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}><label htmlFor={`${fieldId}-${f.key}`} style={{ marginBottom: 0 }}>{roomDifferenceIsOptional(f.key) ? "병실료 차액" : f.label}{requiredFields.has(f.key) && (embedded ? <span className="required-mark">필수</span> : <span> (필수)</span>)}</label>{roomDifferenceIsOptional(f.key) && <small className="treatment-inline-hint">상급병실(1~2인실)을 쓸 때만 입력, 다인실이면 비워두세요</small>}{requiredFields.has(f.key) && gen23InputHelp[f.key] && (embedded ? <small className="treatment-inline-hint">{gen23InputHelp[f.key]!.description.split(".")[0]}</small> : <InputHelp title={f.label} {...gen23InputHelp[f.key]!} />)}</div>{f.kind === "number"
        ? <input id={`${fieldId}-${f.key}`} type="text" inputMode="decimal" value={value[f.key] ?? ""} onChange={e => onChange({ ...value, [f.key]: e.target.value })} placeholder={numberPlaceholder(f.key, requiredFields.has(f.key))} />
        : <select id={`${fieldId}-${f.key}`} value={value[f.key] ?? ""} onChange={e => onChange({ ...value, [f.key]: e.target.value })}>
          {f.key !== "gen23CareSetting" && <option value="">확인 필요</option>}
          {(f.kind === "boolean" ? [["true", "예 / 확인"], ["false", "아니요"]] : f.options ?? []).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>}</div>{roomDifferenceOptional && f.key === "gen23CareSetting" && <div aria-hidden="true" />}</Fragment>)}</div>
  </fieldset>;
}
export function Gen23Summary({ usage, generation }: { usage: MedicalUsage; generation: 2 | 3 }) {
  return <details><summary>{generation}세대 계산 입력·확인 필요 항목</summary><ul className="gen23-summary-list">{gen23Fields.filter(f => !f.generation || f.generation === generation).map(f => {
    const v = usage[f.key];
    const displayValue = v === undefined ? "확인 필요" : typeof v === "boolean" ? v ? "예 / 확인" : "아니요" : f.options?.find(([key]) => key === v)?.[1] ?? String(v);
    const isUnknown = v === undefined || v === "" || v === "UNKNOWN";
    return <li key={f.key} className="gen23-summary-item"><span className="gen23-summary-label">{f.label}</span><span className={`gen23-summary-value${isUnknown ? " is-unknown" : ""}`}>{displayValue}</span></li>;
  })}</ul></details>;
}
