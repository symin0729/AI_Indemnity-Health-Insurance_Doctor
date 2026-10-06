import type { SamsungAnnualComparisonItem, SamsungComparisonItemResult } from '../../engine/calculateSamsungComparison';

const money = (amount: number | null | undefined) => amount == null ? '확인 필요' : `${amount.toLocaleString('ko-KR')}원`;

function ContractResult({ label, result, total }: { label: string; result: SamsungComparisonItemResult; total: number | null }) {
  const details = result.calculationDetails;
  return <section className="form-card" aria-label={label}>
    <h4>{label}</h4>
    <p><strong>적용 보장:</strong> {details?.coverage ?? (result.claim === 0 ? '미보장' : '보장 확인 필요')}</p>
    <p><strong>예상 보험금 합계:</strong> {money(total)}</p>
    {details && <>
      {details.benefitCap !== undefined && <p><strong>적용 담보 한도:</strong> {money(details.benefitCap)}</p>}
      {details.perOccurrenceCap !== undefined && <p><strong>적용 회당·일당 한도:</strong> {money(details.perOccurrenceCap)}</p>}
      <p><strong>마지막 회차 공제 후 자기부담:</strong> {money(result.deductible)}</p>
      <p className="sample-note">위 자기부담은 마지막 회차 계산값이며, 보장 한도로 추가 지급되지 않는 의료비는 별도입니다.</p>
      {details.limitText && <p><strong>약관 한도 조건:</strong> {details.limitText}</p>}
      <p className="sample-note">근거: {details.source.documentId} · PDF {details.source.pdfPage}쪽 · {details.source.article} {details.source.paragraph}</p>
    </>}
    {result.reasons.filter(reason => !reason.startsWith('AI 검증 초안')).map((reason, index) => <p className="sample-note" key={index}>{reason}</p>)}
  </section>;
}

/** 두 계약이 실제 평가한 담보와 한도 값을 그대로 표시한다. */
export default function SamsungTreatmentComparison({ items, generation }: { items: SamsungAnnualComparisonItem[]; generation: number }) {
  return <section className="app-card" aria-label="동일한 예정 치료의 보장 비교">
    <h2 className="card-title">같은 치료에 적용한 보장과 한도</h2>
    <p>치료·환자부담 의료비·횟수는 공통입니다. 각 계약의 보장과 공제·한도를 적용해 예상 보험금을 계산했습니다.</p>
    {items.map(item => <article key={item.usage.id}>
      <h3>{item.usage.treatmentName} · {item.usage.frequency}회 · 회당 {money(item.usage.patientPaidAmount ?? item.usage.unitCost)}</h3>
      <div className="form-grid">
        <ContractResult label={`현재 ${generation}세대`} result={item.current} total={item.currentClaimTotal} />
        <ContractResult label="비교 5세대" result={item.target} total={item.targetClaimTotal} />
      </div>
    </article>)}
    <p className="sample-note">약관 기반 모의 계산이며 실제 보험금 지급액을 확정하지 않습니다.</p>
  </section>;
}
