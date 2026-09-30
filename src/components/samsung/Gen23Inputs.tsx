import { gen23Fields, type Gen23FormState } from "../../domain/samsungGen23Form";
import type { MedicalUsage } from "../../domain/medical";
export function Gen23Inputs({ generation, value, onChange }: { generation: 2 | 3; value: Gen23FormState; onChange: (value: Gen23FormState) => void }) {
  const care = value.gen23CareSetting;
  const special = generation === 3 && value.gen23TreatmentType && value.gen23TreatmentType !== "BASE";
  return <fieldset className="form-card"><legend>{generation}세대 삼성화재 계산 조건</legend>
    <p>입력한 한 계산단위의 초안 예상액을 계산합니다. 모르는 값은 비워두세요. 누적액은 이 청구 이전, 해당 담보·보험기간 기준입니다.</p>
    <p>중복보험 계수는 산출 근거가 확인된 값만 입력하세요. 반복 치료의 연간 합계와 확정 보험금은 계산하지 않습니다.</p>
    <div className="form-grid">{gen23Fields.filter(f => (!f.generation || f.generation === generation)
      && (!f.scope || (f.scope === "inpatient" ? care === "INPATIENT" && !special : f.scope === "special" ? special : care !== "INPATIENT" && !special))).map(f =>
      <label key={f.key}>{f.label}{f.kind === "number"
        ? <input type="text" inputMode="decimal" value={value[f.key] ?? ""} onChange={e => onChange({ ...value, [f.key]: e.target.value })} placeholder="미확인 시 비워두기" />
        : <select value={value[f.key] ?? ""} onChange={e => onChange({ ...value, [f.key]: e.target.value })}>
          <option value="">확인 필요</option>
          {(f.kind === "boolean" ? [["true", "예 / 확인"], ["false", "아니요"]] : f.options ?? []).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>}</label>)}</div>
  </fieldset>;
}
export function Gen23Summary({ usage, generation }: { usage: MedicalUsage; generation: 2 | 3 }) {
  return <details><summary>{generation}세대 계산 입력·확인 필요 항목</summary><dl>{gen23Fields.filter(f => !f.generation || f.generation === generation).map(f => {
    const v = usage[f.key];
    const label = v === undefined ? "확인 필요" : typeof v === "boolean" ? v ? "예 / 확인" : "아니요" : f.options?.find(([key]) => key === v)?.[1] ?? String(v);
    return <div key={f.key}><dt>{f.label}</dt><dd>{label}</dd></div>;
  })}</dl></details>;
}
