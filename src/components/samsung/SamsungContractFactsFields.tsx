import type { SamsungContractForm } from '../../domain/samsungContractFacts';
import { COVERED_ANNUAL_CAP_HELP, COVERED_OUTPATIENT_CAP_HELP } from '../../domain/contractFieldWording';
const getWonInputValue = (value: string) => value.replace(/\D/g, '');
const formatWonInput = (value: string) => value ? Number(getWonInputValue(value)).toLocaleString('ko-KR') : '';

/** 화면 문구 구분(설계사용·소비자용). 값과 입력 검증은 두 모드가 같다. */
export type ContractFactsMode = 'planner' | 'consumer';

export default function SamsungContractFactsFields({ value, onChange, generation, prefix, requiredFields = false, compactLabels = false, showNonCovered = true, showSevere = true, showNonSevere = true, singleContract = false, mode = 'planner' }: {
  value: SamsungContractForm;
  onChange: (value: SamsungContractForm) => void;
  generation: 4 | 5;
  prefix: string;
  requiredFields?: boolean;
  compactLabels?: boolean;
  showNonCovered?: boolean;
  showSevere?: boolean;
  showNonSevere?: boolean;
  singleContract?: boolean;
  /** 화면 문구 구분. 기본은 설계사용. */
  mode?: ContractFactsMode;
}) {
  const planner = mode === 'planner';
  const capHelp: Partial<Record<keyof SamsungContractForm, string>> = planner && !compactLabels ? { coveredBenefitCap: COVERED_ANNUAL_CAP_HELP, coveredOutpatientCap: COVERED_OUTPATIENT_CAP_HELP } : {};
  const fields = [
    ['coveredBenefitCap', '급여 연간 가입금액 (상해·질병 각각, 최대 5천만원)'],
    ['coveredOutpatientCap', '급여 통원 1회 가입금액 (최대 20만원)'],
    ['nonCoveredBenefitCap', generation === 4 ? '일반 비급여 연간 가입금액 (상해·질병 각각, 최대 5천만원)' : '중증 비급여 연간 가입금액 (5천만·3천만·1천만원)'],
    ...(generation === 4 ? [['nonCoveredOutpatientCap', '일반 비급여 통원 1회 가입금액 (최대 20만원)']] : [['nonSevereBenefitCap', '비중증 비급여 연간 가입금액 (1천만·600만·200만원)']]),
  ] as Array<[keyof SamsungContractForm, string]>;
  const visibleFields = fields.filter(([key]) => {
    if (generation === 5 && key === 'nonCoveredBenefitCap') return showSevere;
    if (generation === 5 && key === 'nonSevereBenefitCap') return showNonSevere;
    return showNonCovered || !key.startsWith('nonCovered');
  });
  const requiredMark = requiredFields || compactLabels ? <span className="required-mark">필수</span> : null;
  return <>
    {!requiredFields && !compactLabels && <p className="sample-note">보험증권 또는 전환 견적에서 해당 담보의 실제 가입금액을 확인해주세요. 필요한 정보가 비어 있으면 계산을 보류합니다. 입원·통원은 같은 담보의 연간 한도를 함께 사용합니다.</p>}
    <div className="form-grid">
      {visibleFields.map(([key, label]) => <label key={key} htmlFor={`${prefix}-${key}`}><span>{requiredFields || compactLabels ? label.split(' (')[0] : label} {requiredMark}{capHelp[key] && <small className="contract-field-help contract-field-inline-help">{capHelp[key]}</small>}</span>
        <span className="input-unit-row"><input required={requiredFields} aria-required={requiredFields || undefined} id={`${prefix}-${key}`} type="text" inputMode="numeric" value={formatWonInput(value[key] ?? '')} onChange={(event) => onChange({ ...value, [key]: getWonInputValue(event.target.value) })} placeholder="확인된 가입금액" /><span className="input-unit-label">원</span></span>
        {requiredFields && <small className="contract-field-help">{key.includes('Outpatient') ? '1회 최대 20만 원' : '연간 최대 5천만 원'}</small>}
        {compactLabels && <small className="contract-field-help">{label.match(/\((.+)\)/)?.[1]}</small>}
      </label>)}

      {!singleContract && <label htmlFor={`${prefix}-other`}><span>다른 실손 계약이 있나요? {requiredMark}</span>
        <select className={requiredFields && !value.otherIndemnityPoliciesExist ? 'is-placeholder' : undefined} required={requiredFields} aria-required={requiredFields || undefined} id={`${prefix}-other`} value={value.otherIndemnityPoliciesExist ?? ''} onChange={(event) => onChange({ ...value, otherIndemnityPoliciesExist: event.target.value, proportionalPaymentFactor: undefined })}>
          <option value="" disabled={requiredFields} hidden={requiredFields}>{requiredFields ? '선택해주세요' : '확인 필요'}</option><option value="false">없음</option><option value="true">있음</option>
        </select>
        {requiredFields && <small className="contract-field-help">같은 의료비를 보장하는 다른 실손 계약이 있으면 선택하세요. 보험사별 분담 계산에 사용합니다.</small>}
      </label>}
      {!singleContract && value.otherIndemnityPoliciesExist === 'true' && <label htmlFor={`${prefix}-factor`}><span>보험사에서 확인한 비례분담 계수 (0~1) {requiredMark}</span>
        <input required={requiredFields} aria-required={requiredFields || undefined} id={`${prefix}-factor`} inputMode="decimal" value={value.proportionalPaymentFactor ?? ''} onChange={(event) => onChange({ ...value, proportionalPaymentFactor: event.target.value })} placeholder="예: 0.5" />
      </label>}
    </div>
    {generation === 5 && <p className="sample-note">중증 통원은 가입금액 순서에 따라 1회 20만·15만·10만원, 비중증 통원은 1일 20만·15만·10만원 한도를 적용합니다. 3대 비급여는 별도 행위별 공제·한도를 적용합니다.</p>}
  </>;
}
