import { GEN23_PRIOR_FIELDS, type Gen23PriorKey } from "../../../domain/gen23PriorUsage";
import type { ContractDetailForm } from "../../../domain/contractDetails";
import { formatWonInput, getWonInputValue } from "./M02Shared";

/**
 * 2·3세대 현재 계약의 올해 이미 이용한 내역(연간 계약 단위). 이미 지나간 이용이라 예정 치료가 아니라 STEP 1-2에서 받는다.
 * 비워 두면 계산이 보류되고, STEP 3에서 '사용한 한도가 없어요'를 선택하면 0으로 계산한다.
 * 입원의 '이미 받은 보험금'은 하나의 상해·질병 한도라 예정 치료의 입원 입력에 있다.
 */
export default function Step1Gen23PriorUsage({ generation, value, onChange }: { generation: 2 | 3; value: ContractDetailForm; onChange: (value: ContractDetailForm) => void }) {
  return (
    <fieldset className="form-card" aria-label="올해 이미 이용한 내역">
      <legend><h3>올해 이미 이용한 내역 (선택)</h3></legend>
      <p className="sample-note">계약해당일 이후 이미 이용한 내역입니다. 미확인 값은 비워 두세요. 아래에서 ‘비워 둔 기존 사용분은 0으로 가정’을 선택할 수 있습니다. 입원으로 이미 받은 보험금은 아래 치료별 기존 이용에서 입력합니다.</p>
      <div className="form-grid">
        {GEN23_PRIOR_FIELDS.filter((field) => !field.generation || field.generation === generation).map((field) => {
          const key: Gen23PriorKey = field.key;
          return (
            <label key={key} htmlFor={`prior-${key}`}>
              <span>{field.label}<small className="contract-field-help contract-field-inline-help">{field.help}</small></span>
              <span className="input-unit-row">
                <input id={`prior-${key}`} type="text" inputMode="numeric"
                  value={field.unit === "원" ? formatWonInput(value[key] ?? "") : value[key] ?? ""}
                  onChange={(event) => onChange({ ...value, [key]: getWonInputValue(event.target.value) })}
                  placeholder="없으면 0" />
                <span className="input-unit-label">{field.unit}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
