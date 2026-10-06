import type { M02Form } from './useM02Form';
import { needsManualTherapyImprovementAssumption } from '../../../domain/manualTherapyCount';
import { usagesNeedingInstitutionAssumption, usagesNeedingSeverityAssumption } from '../../../domain/gen5NonCoveredAssumptions';

export default function Step3Assumptions({ form }: { form: M02Form }) {
  const usages = form.plannedUsages;
  const missingExclusions = usages.filter(u => u.samsungCalculationInput?.policyExclusionsCleared === undefined && u.gen23PolicyExclusionsCleared === undefined && u.gen1PolicyExclusionsCleared === undefined);
  const missingExpense = usages.filter(u => u.samsungCalculationInput?.eligibleExpense === undefined && u.coveredAmount === undefined);
  const separateVisits = usages.filter(u => u.frequency > 1 || (u.careSetting === 'OUTPATIENT' && u.samsungCalculationInput?.sameDayAggregationConfirmed === undefined && u.gen23SameDayAggregationConfirmed === undefined));
  const affectedText = (items: typeof usages) => usages.length === 0 ? '등록된 예정 치료가 없습니다. 2단계에서 치료를 먼저 추가해주세요.' : items.length ? `관련 치료 ${items.length}건 · ${items.map(u => u.treatmentName).join(', ')}` : '현재 입력에서 추가 적용할 대상이 없습니다.';
  const severityTargets = usagesNeedingSeverityAssumption(usages);
  const institutionTargets = usagesNeedingInstitutionAssumption(usages);
  const manualTargets = usages.filter(u => needsManualTherapyImprovementAssumption([u]));
  const choices = [
    {
      title: '입력한 치료는 모두 보험금을 받을 수 있는 일반 치료인가요?',
      affected: affectedText(missingExclusions),
      explain: '출산, 건강검진, 치과·한방 치료 같은 치료는 보험금이 지급되지 않습니다.',
      when: '입력한 치료가 모두 병원이나 의원에서 받는 일반 진료·치료입니다. (예: 감기, 허리 통증, 수술)',
      whenNot: '출산, 건강검진·예방접종, 치과·한방 치료, 간병비, 해외 병원 치료가 있거나, 자동차·산재보험으로 이미 보상받은 치료가 있습니다.',
      ifChecked: '보험금을 계산해서 보여 드립니다.', ifUnchecked: '해당 치료는 ‘확인 필요’로 표시됩니다.',
      note: '현재 보험과 5세대 보험 계산에 똑같이 적용됩니다.',
      checked: form.assumeNoPolicyExclusions, set: form.setAssumeNoPolicyExclusions,
    },
    {
      title: '내가 낸 금액 전체를 보험이 인정하는 금액으로 보고 계산해도 될까요?',
      affected: affectedText(missingExpense),
      explain: '보험금은 내가 낸 금액 전부가 아니라, 보험이 인정하는 금액을 기준으로 계산합니다. 이 인정 금액은 보통 알기 어렵습니다.',
      when: '영수증에 적힌 내가 낸 금액을 입력했고, 보험이 인정하는 금액은 모릅니다.',
      whenNot: '보험이 인정하는 금액을 알고 있습니다. 앞 화면의 ‘보장대상 인정금액’에 직접 입력하면 더 정확합니다.',
      ifChecked: '입력한 금액 전체를 인정 금액으로 보고 계산합니다. 인정되지 않는 부분이 섞여 있으면 실제 보험금보다 높게 나올 수 있습니다.',
      ifUnchecked: '인정 금액을 입력하지 않은 치료는 ‘확인 필요’로 표시됩니다.',
      checked: form.assumeEntireMedicalCostCovered, set: form.setAssumeEntireMedicalCostCovered,
    },
    ...(manualTargets.length ? [{
      title: '10번 넘게 받는 도수치료도, 치료 효과가 확인되면 보험금을 받는다고 보고 계산해도 될까요?',
      affected: affectedText(manualTargets),
      explain: '도수·체외충격파·증식치료는 처음 10번까지 보험금을 받을 수 있습니다. 11번째부터는 검사로 치료 효과가 확인되어야 보험금을 받을 수 있습니다.',
      when: '11번째부터 검사 결과로 치료 효과를 확인받을 예정입니다.',
      whenNot: '치료 효과를 확인받을지 모르겠습니다.',
      ifChecked: '10번 넘는 치료도 보험금에 포함해서 계산합니다.', ifUnchecked: '10번 넘는 치료가 있으면 연간 보험금이 ‘확인 필요’로 표시됩니다.',
      note: '도수·체외충격파·증식치료를 합쳐서 10번을 넘게 받을 예정이라 이 질문이 나왔습니다.',
      checked: form.assumeManualTherapyImprovement, set: form.setAssumeManualTherapyImprovement,
    }] : []),
    ...(form.hasTarget5GSpecialRider1 || form.hasTarget5GSpecialRider2 ? [
      ...(form.hasTarget5GSpecialRider1 && severityTargets.length ? [{
        title: '받는 비급여 치료는 감기·허리 통증 같은 일반 질환 때문인가요?',
        affected: affectedText(severityTargets),
        explain: '5세대는 비급여 치료를 ‘중증’과 ‘일반’으로 나눠 계산해요. 중증은 암, 뇌혈관·심장질환, 희귀난치성질환 등 건강보험 산정특례 대상 질환이에요.',
        when: '내 비급여 치료는 감기·허리 통증 같은 일반 질환 때문에 받는 치료예요.',
        whenNot: '암 같은 중증 질환 때문에 받는 치료이거나 잘 모르겠어요. 설계사와 먼저 확인해 보세요.',
        ifChecked: '‘일반’(비중증)으로 계산해요.', ifUnchecked: '5세대 비급여는 ‘확인 필요’로 나와요.',
        checked: form.assumeNonSevereNonCovered, set: form.setAssumeNonSevereNonCovered,
      }] : []),
      ...(institutionTargets.length ? [{
        title: '비급여 입원을 병원이나 의원(종합병원·상급종합병원 제외)에서 한다고 보고 계산해도 될까요?',
        affected: affectedText(institutionTargets),
        explain: '5세대는 입원하는 병원 종류에 따라 비급여 입원 보험금의 한도가 다릅니다. 병원이나 의원에서 입원하면 한 번 입원할 때 300만원까지 받을 수 있습니다. 종합병원·상급종합병원에서 입원하면 이 한도가 적용되지 않습니다.',
        when: '비급여 입원을 병원이나 의원에서 합니다. (예: 정형외과 병원, 동네 의원)',
        whenNot: '종합병원이나 상급종합병원(대학병원 등)에서 입원합니다. 또는 어느 병원인지 모릅니다.',
        ifChecked: '한 번 입원에 300만원 한도를 적용해서 계산합니다.', ifUnchecked: '5세대 비급여 입원은 ‘확인 필요’로 표시됩니다.',
        note: '비급여로 입원하는 치료를 입력해서 이 질문이 나왔습니다.',
        checked: form.assumeNonCoveredInpatientSmallHospital, set: form.setAssumeNonCoveredInpatientSmallHospital,
      }] : []),
    ] : []),
    {
      title: '같은 치료를 여러 번 받는다면, 받는 날이 모두 다른가요?',
      affected: affectedText(separateVisits),
      explain: '보험은 같은 날 같은 치료를 두 번 받으면 한 번으로 계산합니다. 같은 치료를 3번 받더라도 3일에 나눠 받는지, 하루에 몰아 받는지에 따라 보험금이 달라질 수 있습니다.',
      when: '입력한 횟수를 모두 서로 다른 날에 받습니다. (예: 일주일에 한 번씩 10번)',
      whenNot: '같은 날 같은 치료를 두 번 이상 받는 경우가 있습니다.',
      ifChecked: '한 번 한 번을 각각 다른 날의 치료로 보고 계산합니다.', ifUnchecked: '여러 번 받는 치료는 ‘확인 필요’로 표시됩니다.',
      note: '입원은 입원할 때마다 한 건으로 봅니다.',
      checked: form.assumeEachOccurrenceSeparate, set: form.setAssumeEachOccurrenceSeparate,
    },
  ];
  return <section id="input-step-4" tabIndex={-1} className="assumptions-layout">
    <section className="form-card comparison-assumptions">
    <span className="step-badge">STEP 4-1 · 명시적 계산 가정</span>
    <h2 className="card-title">이 질문들에 해당하는 것만 체크해주세요</h2>
    <p className="card-description">앞 단계에서 알려 주지 못한 내용을 아래처럼 보고 계산해도 되는지 묻는 단계예요. 맞는 것만 체크하세요. 체크하지 않은 내용은 ‘확인 필요’로 남아요.</p>
    <div className="assumption-guide"><strong>입력한 값을 먼저 사용 → 비어 있는 부분만 체크한 내용으로 채움 → 약관의 공제·한도를 적용해 계산</strong><p>체크는 사실을 확인하는 것이 아니라 ‘이렇게 보고 계산해 주세요’라는 요청입니다. 모두 체크하지 않아도 됩니다.</p></div>
    <div className="assumption-checklist-heading"><h3>누락 조건 체크리스트</h3><span>선택 {choices.filter(choice => choice.checked).length} / {choices.length}</span></div>
    <div className="comparison-assumption-list">
      {choices.map(choice => <label className={`comparison-assumption${choice.checked ? " is-selected" : ""}`} key={choice.title}>
        <input type="checkbox" checked={choice.checked} onChange={event => choice.set(event.target.checked)} />
        <span className="assumption-easy">
          <strong>{choice.title}</strong>
          <small className="assumption-affected">{choice.affected}</small>
          <small className="assumption-explain">{choice.explain}</small>
          <small className="assumption-when"><b>이럴 땐 체크하세요</b>{choice.when}</small>
          <small className="assumption-when-not"><b>이럴 땐 체크하지 마세요</b>{choice.whenNot}</small>
          <small className="assumption-effect"><b>체크하면</b>{choice.ifChecked}</small>
          <small className="assumption-effect"><b>체크하지 않으면</b>{choice.ifUnchecked}</small>
          {'note' in choice && choice.note ? <small className="assumption-note">{choice.note}</small> : null}
        </span>
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
