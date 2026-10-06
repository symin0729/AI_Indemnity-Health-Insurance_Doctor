import { gen23ContractDetailFields, isGen23ContractDetailVisible, type Gen23ContractDetailKey } from '../../../domain/contractDetails';
import { formatWonInput, getWonInputValue } from './M02Shared';
import type { M02Form } from './useM02Form';
import SamsungContractFactsFields from '../../../components/samsung/SamsungContractFactsFields';
import { CONTRACT_DETAIL_LABELS } from './contractRequirements';

const AMOUNT_KEYS: Gen23ContractDetailKey[] = ['gen23ContractBenefitCap', 'gen23OutpatientBenefitCap', 'gen23PrescriptionBenefitCap'];
/** 2·3세대 약관(1611.7·1704.1)의 가입금액 최대치. 입원은 1상해·1질병당 5천만원, 외래·처방조제비는 회(건)당 합산 30만원 이내. */
const MAX_AMOUNT_HINT: Partial<Record<Gen23ContractDetailKey, string>> = {
  gen23ContractBenefitCap: '최대 5천만 원 (1상해·1질병당)',
  gen23OutpatientBenefitCap: '최대 30만 원 (외래·처방 합산 기준)',
  gen23PrescriptionBenefitCap: '최대 30만 원 (외래·처방 합산 기준)',
};

export default function Step1ContractDetails({ form }: { form: M02Form }) {
  const { generation, isGenerationSelected, contractDetails, setContractDetails } = form;
  if (!isGenerationSelected || ![2, 3, 4].includes(generation)) return null;
  const update = (key: Gen23ContractDetailKey, value: string) => setContractDetails({ ...contractDetails, [key]: value });
  const fields = gen23ContractDetailFields().filter(field => !['gen23RequiredCoverageConfirmed', 'gen23OtherIndemnityPoliciesExist', 'gen23ProportionalPaymentFactor'].includes(field.key) && isGen23ContractDetailVisible(field.key as Gen23ContractDetailKey, contractDetails));
  const renderField = (key: Gen23ContractDetailKey) => {
    const field = fields.find(item => item.key === key);
    if (!field) return null;
    const label = CONTRACT_DETAIL_LABELS[key] ?? field.label;
    const id = `contract-detail-${key}`;
    const amount = AMOUNT_KEYS.includes(key);
    const value = contractDetails[key] ?? '';
    const options = field.kind === 'boolean' ? [['true', '가입'], ['false', '미가입']] : field.options ?? [];
    return <label key={key} htmlFor={id}>
      <span>{label} <span className="required-mark">필수</span></span>
      {field.kind === 'number' ? <span className="input-unit-row">
        <input id={id} required aria-required="true" type="text" inputMode={amount ? 'numeric' : 'decimal'} value={amount ? formatWonInput(value) : value} onChange={event => update(key, amount ? getWonInputValue(event.target.value) : event.target.value)} placeholder={amount ? '증권에 기재된 금액' : key === 'gen23ProportionalPaymentFactor' ? '0~1 (예: 0.5)' : '예: 30'} />
        {amount ? <span className="input-unit-label">원</span> : null}
      </span> : <select id={id} className={value ? undefined : 'is-placeholder'} required aria-required="true" value={value} onChange={event => update(key, event.target.value)}>
        <option value="" disabled hidden>선택해주세요</option>
        {options.map(([option, name]) => <option key={option} value={option}>{name}</option>)}
      </select>}
      {MAX_AMOUNT_HINT[key] ? <small className="contract-field-help contract-max-hint">{MAX_AMOUNT_HINT[key]}</small> : null}
    </label>;
  };
  if (generation === 4) return <>
    <SamsungContractFactsFields value={form.currentContractFactsForm} onChange={form.setCurrentContractFactsForm} generation={4} prefix="current-contract" mode="consumer" singleContract requiredFields showNonCovered={form.gen4NonCoveredRider === 'ENROLLED'} />
  </>;
  return <>
    <div className="form-grid">{fields.map(field => renderField(field.key as Gen23ContractDetailKey))}</div>
  </>;
}
