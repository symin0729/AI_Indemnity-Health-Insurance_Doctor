import type { M02Form } from './useM02Form';
import { needsManualTherapyImprovementAssumption } from '../../domain/manualTherapyCount';

export default function Step3Assumptions({ form }: { form: M02Form }) {
  const usages = form.plannedUsages;
  const missingExclusions = usages.filter(u => u.samsungCalculationInput?.policyExclusionsCleared === undefined && u.gen23PolicyExclusionsCleared === undefined && u.gen1PolicyExclusionsCleared === undefined);
  const missingExpense = usages.filter(u => u.samsungCalculationInput?.eligibleExpense === undefined && u.coveredAmount === undefined);
  const separateVisits = usages.filter(u => u.frequency > 1 || (u.careSetting === 'OUTPATIENT' && u.samsungCalculationInput?.sameDayAggregationConfirmed === undefined && u.gen23SameDayAggregationConfirmed === undefined));
  const affectedText = (items: typeof usages) => usages.length === 0 ? '등록된 예정 치료가 없습니다. 2단계에서 치료를 먼저 추가해주세요.' : items.length ? `관련 치료 ${items.length}건 · ${items.map(u => u.treatmentName).join(', ')}` : '현재 입력에서 추가 적용할 대상이 없습니다.';
  const choices = [
    { affected: affectedText(missingExclusions), consequence: '미선택 시: 면책 여부가 필요한 치료는 확인 필요로 남습니다.', label: '보장 제외 사유가 없다고 가정', description: '약관의 ‘보상하지 않는 사항’에 해당하는 치료가 없다고 보고 계산합니다. 아직 확인하지 않은 치료에만 적용하며, 이미 확인된 제외 사유는 바꾸지 않습니다. 현재 계약과 5세대 계산에 모두 적용되는 내용입니다.', source: '근거: 삼성화재 5세대 약관 제4조 보상하지 않는 사항(PDF 28~29쪽, 상해급여 기준) — 고의 자해·고의 가해, 임신·출산·산후기(분만예정일 280일 이전 가입 시 급여 일부본인부담금은 예외), 전쟁·내란·폭동, 의사 지시 불이행·자의적 입원, 직업·동호회 목적의 전문등반·스카이다이빙 등 위험 활동 중 상해, 본인부담상한제 등으로 환급 가능한 금액, 자동차·산재보험에서 보상받는 의료비, 간병비, 통원 전액본인부담(100%) 급여의료비. 요약은 약관 8쪽(임신·출산, 건강검진, 예방접종, 치과·한방 비급여, 해외 의료기관 치료비 등). 계산 규칙의 공통 조건(POLICY_EXCLUSIONS_MUST_BE_CLEARED)이며, 미확인 시 보험금은 확인 필요로 남습니다.', checked: form.assumeNoPolicyExclusions, set: form.setAssumeNoPolicyExclusions },
    { affected: affectedText(missingExpense), consequence: '미선택 시: 별도 인정금액이 필요한 계산은 확인 필요로 남습니다.', label: '입력한 환자부담금 전액을 보장대상 금액으로 가정', description: '보장대상 금액(C)을 따로 입력하지 않은 치료에만 적용합니다. 입력한 환자부담금 전액을 인정금액으로 보고, 공제금과 한도는 약관대로 계산합니다.', source: '근거: 삼성화재 5세대 약관 용어 정의(PDF 51·64쪽) ‘보장대상 의료비 = 실제 부담액 − 보장제외금액’. 이 가정은 보장제외금액을 0원으로 보는 것이므로 제외 대상 항목이 섞여 있으면 보험금이 실제보다 크게 계산됩니다. 적용 기준: 급여 입원은 요양급여 본인부담금의 80%(약관 24·26쪽), 비급여 입원은 비급여 의료비(비급여 병실료 제외)의 70%(특약1, 53쪽)·50%(특약2, 64쪽). 인정금액을 알면 앞 단계 ‘회당 보장대상 인정금액(C)’에 직접 입력하세요.', checked: form.assumeEntireMedicalCostCovered, set: form.setAssumeEntireMedicalCostCovered },
    ...(needsManualTherapyImprovementAssumption(form.plannedUsages) ? [{ affected: affectedText(usages.filter(u => needsManualTherapyImprovementAssumption([u]))), consequence: '미선택 시: 개선 확인이 필요한 치료의 연간 보험금은 확정하지 않습니다.', label: '도수치료 10회 이후에도 증상 개선이 확인되어 보상된다고 가정', description: '도수·체외충격파·증식치료는 4·5세대 약관상 최초 10회까지 보장하고, 이후에는 검사결과 등으로 증상 개선이 확인되어야 보상합니다. 이미 확인된 개선 여부는 그대로 적용합니다.', source: '근거: 삼성화재 5세대 약관 요약(PDF 9쪽)·상세(PDF 55쪽) — 근골격계 이학요법치료·체외충격파치료는 각 치료횟수를 합산해 최초 10회 보장, 이후 객관적 검사결과 등으로 증상 개선·병변호전이 확인된 경우에 한해 10회 단위로 연 50회까지 보상(5세대는 중증 비급여 3대 항목). 4세대 약관(PDF 103쪽)에도 같은 조건. 개선 확인 방법은 관절가동범위(ROM)·통증평가척도·자세평가·근력검사(MMT) 등 이학적 검사와 초음파 검사 결과(약관 55쪽 유의사항). 1·2·3세대 약관 본문에서는 이 조건이 확인되지 않았습니다. 참고: 금융위원회 Q&A(2026.5) 2쪽은 비중증 비급여(특약2)에서 도수·체외충격파·증식치료를 보장 제외한다고 안내합니다.', checked: form.assumeManualTherapyImprovement, set: form.setAssumeManualTherapyImprovement }] : []),
    { affected: affectedText(separateVisits), consequence: '미선택 시: 반복 치료 및 동일일 합산 확인이 필요한 계산은 보류합니다.', label: '반복 치료를 각각 별도 방문으로 가정', description: '각 회차를 서로 다른 날의 방문(입원은 별도 입원건)으로 계산합니다. 1회 통원도 동일일 합산 확인에 사용합니다. 같은 날의 비용은 약관상 합산 단위를 확인해 입력하세요.', source: '근거: 계산 규칙의 공통 조건 sameDayAggregationConfirmed — 연간 횟수·일수 한도가 있는 통원·처방 규칙은 같은 날 동일 목적의 중복 통원·처방을 1회·1건으로 합산했는지 확인이 필요합니다(2세대 외래 연 180회·처방 연 180건, 3세대 기본형 동일, 4세대 통원 G4-04·G4-08·G4-09). 5세대 통원 한도: 중증 비급여 통원 연 100회, 비중증 비급여 통원 연 100일(약관 8쪽). 입원은 입원건 단위로 계산합니다.', checked: form.assumeEachOccurrenceSeparate, set: form.setAssumeEachOccurrenceSeparate },
  ];
  return <section id="input-step-4" tabIndex={-1} className="assumptions-layout">
    <section className="form-card comparison-assumptions">
    <span className="step-badge">STEP 4-1 · 명시적 계산 가정</span>
    <h2 className="card-title">계산에 적용할 가정을 선택해주세요</h2>
    <p className="card-description">앞 단계에서 입력하지 못한 계산 조건을 확인하세요. 아래 가정에 동의하는 항목만 체크하면 미입력 조건을 채워 모의 계산합니다.</p>
    <div className="assumption-guide"><strong>입력한 값 우선 → 비어 있는 조건에만 가정 적용 → 공제·한도 계산</strong><p>체크는 실제 사실의 확인이 아닙니다. 모두 선택할 필요는 없으며, 확인된 보장 제외 사유·중증 여부·특약 가입 여부는 가정으로 바꾸지 않습니다.</p></div>
    <div className="assumption-checklist-heading"><h3>누락 조건 체크리스트</h3><span>선택 {choices.filter(choice => choice.checked).length} / {choices.length}</span></div>
    <div className="comparison-assumption-list">
      {choices.map(choice => <label className={`comparison-assumption${choice.checked ? " is-selected" : ""}`} key={choice.label}>
        <input type="checkbox" checked={choice.checked} onChange={event => choice.set(event.target.checked)} />
        <span><strong>{choice.label}</strong><small className="assumption-affected">{choice.affected}</small><small>{choice.description}</small><small>{choice.consequence}</small>{'source' in choice && choice.source ? <small className="assumption-source">{choice.source}</small> : null}</span>
      </label>)}
    </div>
    <button type="button" className="assumption-edit-link" onClick={() => { form.setReturnToAssumptions(true); form.goToInputStep(2); }}>예정 치료에서 직접 입력·수정하기 →</button>
    </section>
    <section className="form-card assumption-basis-card" aria-label="공통 비교 기준">
      <span className="step-badge">STEP 4-2 · 공통 비교 기준</span>
      <h2 className="card-title">두 계약에 같은 기준을 적용합니다</h2>
      <p className="card-description">체크 여부와 관계없이 적용되는 이번 모의 비교의 범위입니다.</p>
      <dl className="assumption-basis-list">
        <div><dt>비교 기간</dt><dd>한도 사용 전부터 시작하는 1년 · 기존 사용분 제외</dd></div>
        <div><dt>의료 이용</dt><dd>2단계에 등록한 동일한 예정 치료를 두 계약에 적용</dd></div>
        <div><dt>계약 조건</dt><dd>유효한 실손 계약 1개 · 5세대 계약전환 가능 가정</dd></div>
        <div><dt>연간 보험료</dt><dd>입력한 월 보험료 × 12 · 갱신·할인·할증 변화 제외</dd></div>
        <div><dt>연간 총부담</dt><dd>연간 보험료 + 환자부담 의료비 − 예상 보험금</dd></div>
      </dl>
      <p className="sample-note">실제 전환 가능 여부와 보험금 지급을 확정하는 결과는 아닙니다. 다음 단계에서 입력값과 선택한 가정을 최종 확인합니다.</p>
    </section>
  </section>;
}
