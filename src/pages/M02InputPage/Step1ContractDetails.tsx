import { gen23ContractDetailFields, isGen23ContractDetailVisible, type Gen23ContractDetailKey } from '../../domain/contractDetails';
import { formatWonInput, getWonInputValue } from './M02Shared';
import type { M02Form } from './useM02Form';
import SamsungContractFactsFields from '../../components/samsung/SamsungContractFactsFields';
import { CONTRACT_DETAIL_LABELS } from './contractRequirements';

const AMOUNT_KEYS: Gen23ContractDetailKey[] = ['gen23ContractBenefitCap', 'gen23OutpatientBenefitCap', 'gen23PrescriptionBenefitCap'];

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
    </label>;
  };
  if (generation === 4) return <>
    <SamsungContractFactsFields value={form.currentContractFactsForm} onChange={form.setCurrentContractFactsForm} generation={4} prefix="current-contract" singleContract requiredFields showNonCovered={form.gen4NonCoveredRider === 'ENROLLED'} />
  </>;
  return <>
    <div className="form-grid">{fields.map(field => renderField(field.key as Gen23ContractDetailKey))}</div>
  </>;
}
