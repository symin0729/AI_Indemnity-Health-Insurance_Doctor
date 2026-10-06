import type { PriorUsageKey, SamsungContractForm } from "../../domain/samsungContractFacts";
import { formatWonInput, getWonInputValue } from "./M02Shared";

interface PriorField { key: PriorUsageKey; label: string; help: string; unit: "원" | "회"; nonCovered?: boolean }

const FIELDS: readonly PriorField[] = [
  { key: "priorCoveredInjuryPaid", label: "급여 상해: 올해 이미 받은 보험금", help: "계약일(또는 계약해당일) 이후 상해 급여로 받은 입원+통원 보험금 합계", unit: "원" },
  { key: "priorCoveredDiseasePaid", label: "급여 질병: 올해 이미 받은 보험금", help: "계약일(또는 계약해당일) 이후 질병 급여로 받은 입원+통원 보험금 합계", unit: "원" },
  { key: "priorCoveredInpatientDeductible", label: "급여 입원: 올해 누적 자기부담", help: "입원의 나머지 20% 자기부담 누적액. 연 200만 원을 넘으면 초과분을 보상", unit: "원" },
  { key: "priorNonCoveredInjuryPaid", label: "일반 비급여 상해: 올해 이미 받은 보험금", help: "상해 일반 비급여로 받은 입원+통원 보험금 합계", unit: "원", nonCovered: true },
  { key: "priorNonCoveredDiseasePaid", label: "일반 비급여 질병: 올해 이미 받은 보험금", help: "질병 일반 비급여로 받은 입원+통원 보험금 합계", unit: "원", nonCovered: true },
  { key: "priorNonCoveredInjuryVisits", label: "일반 비급여 상해: 올해 통원 이용 횟수", help: "연 100회 한도 계산에 사용", unit: "회", nonCovered: true },
  { key: "priorNonCoveredDiseaseVisits", label: "일반 비급여 질병: 올해 통원 이용 횟수", help: "연 100회 한도 계산에 사용", unit: "회", nonCovered: true },
  { key: "priorManualTherapyPaid", label: "도수·체외충격파·증식치료: 올해 이미 받은 보험금", help: "연 350만 원 한도 계산에 사용", unit: "원", nonCovered: true },
  { key: "priorManualTherapyCount", label: "도수·체외충격파·증식치료: 올해 치료 횟수", help: "세 치료의 횟수 합산, 연 50회 한도", unit: "회", nonCovered: true },
  { key: "priorInjectionPaid", label: "주사료: 올해 이미 받은 보험금", help: "연 250만 원 한도 계산에 사용", unit: "원", nonCovered: true },
  { key: "priorInjectionCount", label: "주사료: 올해 치료 횟수", help: "연 50회 한도", unit: "회", nonCovered: true },
  { key: "priorMriPaid", label: "MRI/MRA: 올해 이미 받은 보험금", help: "연 300만 원 한도 계산에 사용", unit: "원", nonCovered: true },
];

/**
 * 4세대 현재 계약의 올해 이미 이용한 내역. 이미 지나간 이용이라 예정 치료가 아니라 STEP 1-2(고객 보험 정보)에서 받는다.
 * 비워 두면 계산이 보류되고, STEP 3에서 '사용한 한도가 없어요'를 선택하면 0으로 계산한다.
 */
export default function Step1PriorUsage({ value, onChange, showNonCovered }: { value: SamsungContractForm; onChange: (value: SamsungContractForm) => void; showNonCovered: boolean }) {
  return (
    <fieldset className="form-card" aria-label="올해 이미 이용한 내역">
      <legend><h3>올해 이미 이용한 내역 (선택)</h3></legend>
      <p className="sample-note">계약일(또는 계약해당일) 이후 이미 보험금을 받은 내역입니다. 미확인 값은 비워 두세요. 아래에서 ‘비워 둔 기존 사용분은 0으로 가정’을 선택할 수 있습니다.</p>
      <div className="form-grid">
        {FIELDS.filter((field) => showNonCovered || !field.nonCovered).map((field) => (
          <label key={field.key} htmlFor={`prior-${field.key}`}>
            <span>{field.label}<small className="contract-field-help contract-field-inline-help">{field.help}</small></span>
            <span className="input-unit-row">
              <input id={`prior-${field.key}`} type="text" inputMode="numeric"
                value={field.unit === "원" ? formatWonInput(value[field.key] ?? "") : value[field.key] ?? ""}
                onChange={(event) => onChange({ ...value, [field.key]: getWonInputValue(event.target.value) })}
                placeholder="없으면 0" />
              <span className="input-unit-label">{field.unit}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
