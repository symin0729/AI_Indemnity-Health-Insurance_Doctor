import type { M02Form } from './useM02Form';
import ComparisonBasisField from './ComparisonBasisField';
import Step1PriorUsage from './Step1PriorUsage';
import Step1Gen23PriorUsage from './Step1Gen23PriorUsage';
import { formatWonInput, getWonInputValue } from './M02Shared';

export default function ComparisonReview({ form }: { form: M02Form }) {
  const money = (value: string) => value ? `${Number(value).toLocaleString('ko-KR')}원` : '미입력';
  return <>
    <div className="comparison-review-grid">
      <div>
        <h3>현재 보험</h3>
        <p>{form.insurerLabel || 'OO 보험'} · {form.productLabel || 'OO 실손의료보험'}</p>
        <p>{form.generation}세대 · 월 {money(form.monthlyPremium)}</p>
        <p>가입일: {form.inceptionDate || '미입력'}</p>
        <p>갱신: {form.renewalCycleMonths ? `${form.renewalCycleMonths}개월` : '미입력'} · 재가입: {form.reentryCycleYears ? `${form.reentryCycleYears}년` : '미입력'}</p>
        {form.generation === 1 && <p>가입 보장: {form.gen1D1Coverage === 'BOTH' ? '상해·질병' : form.gen1D1Coverage === 'INJURY' ? '상해' : form.gen1D1Coverage === 'DISEASE' ? '질병' : '확인 필요'} · 선택한 대표 상품의 한도 적용</p>}
        {(form.generation === 2 || form.generation === 3) && <>
          <p>상품 종형: {form.samsungGen23Variant === 'standard' ? '표준형' : form.samsungGen23Variant === 'selected2' ? '선택형Ⅱ' : '확인 필요'}</p>
          <p>입원 가입금액: {money(form.contractDetails.gen23ContractBenefitCap ?? '')}</p>
          <p>외래 1회: {money(form.contractDetails.gen23OutpatientBenefitCap ?? '')} · 처방 1건: {money(form.contractDetails.gen23PrescriptionBenefitCap ?? '')}</p>
        </>}
        {form.generation === 3 && <p>가입 특약: {[
          form.gen3Riders.manualTherapy === 'ENROLLED' && '도수·체외충격파·증식',
          form.gen3Riders.injection === 'ENROLLED' && '주사료',
          form.gen3Riders.mri === 'ENROLLED' && 'MRI/MRA',
        ].filter(Boolean).join(' · ') || '3대 비급여 특약 미가입'}</p>}
        {form.generation === 4 && <>
          <p>급여 연간: {money(form.currentContractFactsForm.coveredBenefitCap ?? '')} · 통원 1회: {money(form.currentContractFactsForm.coveredOutpatientCap ?? '')}</p>
          <p>비급여 특약: {form.gen4NonCoveredRider === 'ENROLLED' ? '가입' : '미가입'}</p>
          {form.gen4NonCoveredRider === 'ENROLLED' && <p>일반 비급여 연간: {money(form.currentContractFactsForm.nonCoveredBenefitCap ?? '')} · 통원 1회: {money(form.currentContractFactsForm.nonCoveredOutpatientCap ?? '')}</p>}
        </>}
        <button type="button" className="review-edit-button" onClick={() => form.goToInputStep(1)}>보험 정보 수정</button>
      </div>
      <div><h3>예정 치료</h3><ul>{form.plannedUsages.map(usage => <li key={usage.id}>
        {usage.treatmentName} · {usage.careSetting === 'INPATIENT' ? '입원' : '통원'} · {usage.benefitClass === 'COVERED' ? '급여' : usage.benefitClass === 'NON_COVERED' ? '비급여' : '급여 구분 확인 필요'} · {usage.frequency}회 · 회당 {usage.unitCost.toLocaleString('ko-KR')}원
      </li>)}</ul><p>양쪽 계약에 동일하게 적용합니다.</p><button type="button" className="review-edit-button" onClick={() => form.goToInputStep(2)}>예정 치료 수정</button></div>
      <div>
        <h3>5세대 비교안</h3><p>월 {money(form.target5GMonthlyPremium)}</p>
        <p>{[form.hasTarget5GSpecialRider1 && '특약1(중증 비급여)', form.hasTarget5GSpecialRider2 && '특약2(비중증 비급여)'].filter(Boolean).join(' · ') || '비급여 특약 미가입'}</p>
        <p>급여 연간: {money(form.targetContractFactsForm.coveredBenefitCap ?? '')} · 통원 1회: {money(form.targetContractFactsForm.coveredOutpatientCap ?? '')}</p>
        {form.hasTarget5GSpecialRider1 && <p>중증 비급여 가입금액: {money(form.targetContractFactsForm.nonCoveredBenefitCap ?? '')}</p>}
        {form.hasTarget5GSpecialRider2 && <p>비중증 비급여 가입금액: {money(form.targetContractFactsForm.nonSevereBenefitCap ?? '')}</p>}
        <button type="button" className="review-edit-button" onClick={() => form.goToInputStep(3)}>5세대 조건 수정</button>
      </div>
    </div>
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
