import type { M02Form } from './useM02Form';
import ComparisonBasisField from './ComparisonBasisField';
import Step1PriorUsage from './Step1PriorUsage';
import Step1Gen23PriorUsage from './Step1Gen23PriorUsage';
import { formatWonInput, getWonInputValue } from './M02Shared';

export default function ExistingUsageFields({ form }: { form: M02Form }) {
  return <>
    <ComparisonBasisField form={form} />
    {form.comparisonBasis === 'REMAINING_LIMITS' && <section className="review-prior-usage" aria-label="기존 사용분 반영">
      {form.generation === 4 && <Step1PriorUsage value={form.currentContractFactsForm} onChange={form.setCurrentContractFactsForm} showNonCovered={form.gen4NonCoveredRider === 'ENROLLED'} />}
      {(form.generation === 2 || form.generation === 3) && <Step1Gen23PriorUsage generation={form.generation} value={form.contractDetails} onChange={form.setContractDetails} />}
      {form.plannedUsages.filter(usage => form.generation === 1 || ((form.generation === 2 || form.generation === 3) && usage.careSetting === 'INPATIENT' && (!usage.gen23TreatmentType || usage.gen23TreatmentType === 'BASE'))).map(usage => {
        const paidKey = form.generation === 1 ? 'gen1PriorPaidBenefit' : 'gen23PriorPaidBenefit';
        const update = (key: 'gen1PriorPaidBenefit' | 'gen23PriorPaidBenefit' | 'gen1PriorServiceDays', value: string) => form.setPlannedUsages(previous => previous.map(item => item.id === usage.id ? { ...item, [key]: value === '' ? undefined : Number(value) } : item));
        return <fieldset className="treatment-section" key={usage.id}><legend>{usage.treatmentName} · 같은 상해·질병의 기존 이용</legend><div className="form-grid">
          <label>이미 받은 보험금<span className="input-unit-row"><input type="text" inputMode="numeric" value={formatWonInput(String(usage[paidKey] ?? ''))} onChange={event => update(paidKey, getWonInputValue(event.target.value))} placeholder="없으면 0" /><span className="input-unit-label">원</span></span></label>
          {form.generation === 1 && usage.careSetting === 'OUTPATIENT' && <label>기존 이용일수<input type="number" min="0" step="1" value={usage.gen1PriorServiceDays ?? ''} onChange={event => update('gen1PriorServiceDays', event.target.value)} /></label>}
        </div></fieldset>;
      })}
    </section>}
  </>;
}
