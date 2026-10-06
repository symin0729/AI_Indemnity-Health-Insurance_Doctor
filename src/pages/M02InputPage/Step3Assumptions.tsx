import type { M02Form } from './useM02Form';
import { needsManualTherapyImprovementAssumption } from '../../domain/manualTherapyCount';

export default function Step3Assumptions({ form }: { form: M02Form }) {
  const choices = [
    { label: '보장 제외 사유가 없다고 가정', description: '면책 여부를 아직 확인하지 않은 치료에만 적용합니다. 확인된 제외 사유나 중증 여부를 바꾸지는 않습니다.', checked: form.assumeNoPolicyExclusions, set: form.setAssumeNoPolicyExclusions },
    { label: '입력한 환자부담금 전액을 보장대상 금액으로 가정', description: '보장대상 금액을 따로 입력하지 않은 치료에만 적용합니다. 공제금과 한도는 약관대로 계산합니다.', checked: form.assumeEntireMedicalCostCovered, set: form.setAssumeEntireMedicalCostCovered },
    ...(needsManualTherapyImprovementAssumption(form.plannedUsages) ? [{ label: '도수치료 10회 이후에도 증상 개선이 확인되어 보상된다고 가정', description: '도수·체외충격파·증식치료는 4·5세대 약관상 최초 10회까지 보장하고, 이후에는 검사결과 등으로 증상 개선이 확인되어야 보상합니다. 선택하지 않으면 11회 이후는 확인 필요로 남습니다.', checked: form.assumeManualTherapyImprovement, set: form.setAssumeManualTherapyImprovement }] : []),
    { label: '반복 치료를 각각 별도 방문으로 가정', description: '입력한 횟수마다 별도로 공제합니다. 같은 날 같은 담보로 받는 치료는 금액을 합쳐 한 항목으로 입력하세요.', checked: form.assumeEachOccurrenceSeparate, set: form.setAssumeEachOccurrenceSeparate },
  ];
  return <section id="input-step-4" tabIndex={-1} className="form-card comparison-assumptions">
    <span className="step-badge">STEP 4 · 명시적 계산 가정</span>
    <h2 className="card-title">계산에 적용할 가정을 선택해주세요</h2>
    <p className="card-description">확인되지 않은 조건에 적용할 가정만 선택하세요. 다음 입력 확인 페이지에서 계약·예정 치료와 선택한 가정을 검토합니다.</p>
    <h3 className="review-section-title">계산에 적용할 가정</h3>
    <div className="comparison-scope">
      <strong>한도 사용 전부터 시작하는 1년 모의 비교</strong>
      <p>유효한 실손 계약 1개 · 5세대 계약전환형 · 입력한 월 보험료 × 12</p>
      <p>기존 계약을 5세대로 전환할 수 있다고 가정하고 동일한 예정 치료를 두 계약의 보장 기준으로 계산합니다. 실제 전환 가능 여부와 보험금 지급을 확정하는 결과는 아닙니다.</p>
      <p>갱신에 따른 보험료 변화와 향후 할인·할증은 추정하지 않습니다.</p>
    </div>
    <div className="comparison-assumption-list">
      {choices.map(choice => <label className="comparison-assumption" key={choice.label}>
        <input type="checkbox" checked={choice.checked} onChange={event => choice.set(event.target.checked)} />
        <span><strong>{choice.label}</strong><small>{choice.description}</small></span>
      </label>)}
    </div>
    <section className="notice-box" aria-label="선택한 계산 가정 요약">
      <h3>선택한 계산 가정</h3>
      {choices.some(choice => choice.checked)
        ? <ul>{choices.filter(choice => choice.checked).map(choice => <li key={choice.label}>{choice.label}</li>)}</ul>
        : <p>선택한 추가 가정이 없습니다. 확인되지 않은 조건은 ‘확인 필요’로 남깁니다.</p>}
    </section>
    <p className="sample-note">선택하지 않은 조건 때문에 계산할 수 없는 부분은 ‘확인 필요’로 남깁니다. 두 계약이 모두 계산된 경우에만 총부담 차이와 손익분기를 제시합니다.</p>
  </section>;
}
