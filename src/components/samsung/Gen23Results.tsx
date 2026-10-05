import type { MedicalUsage } from "../../domain/medical";
import { GEN23_VARIANT_LABELS } from "../../domain/samsungGen23Variant";
import type { Gen23Outcome, Gen23Variant } from "../../engine/samsungGen23Adapter";
export function Gen23Results({ generation, variant, results, onEdit, onConfirm }: {
  generation: 2 | 3; variant: Gen23Variant; results: { usage: MedicalUsage; result: Gen23Outcome }[];
  onEdit: () => void; onConfirm: () => void;
}) {
  return <main className="navy-page"><header className="page-header"><h1>{generation}세대 삼성화재 계산 결과</h1>
    <p>{variant === "UNKNOWN" ? "종형 확인 필요" : GEN23_VARIANT_LABELS[variant]}</p></header>
    <section className="app-card"><h2>입력 조건에 따른 초안 검산</h2>
      <p className="notice-box">초안 검산 / 샘플 시뮬레이션 (SAMPLE_SIMULATION) · 실제 보험금 지급액이 아닙니다. 약관 및 계약조건의 최종 확인이 필요하며 운영 계산은 비활성 상태입니다. 치료별 입력한 한 계산단위의 결과이며, 연간 합계·5세대 절감액·확정 보험금을 의미하지 않습니다.</p>
      {results.length === 0 && <p>등록된 치료가 없습니다.</p>}
      {results.map(({ usage, result }) => <article key={usage.id} className="treatment-card">
        <h3>{usage.treatmentName}</h3><p>{usage.gen23CareSetting === "PRESCRIPTION" ? "처방" : usage.gen23CareSetting === "INPATIENT" ? "입원" : usage.gen23CareSetting === "OUTPATIENT" ? "외래" : "진료 구분 확인 필요"} · {result.status}</p>
        {usage.frequency > 1 && <p>예상 {usage.frequency}회 중 입력한 한 계산단위만 검산합니다. 이후 회차의 누적액·기간이 확인되지 않아 반복 횟수를 곱하지 않습니다.</p>}
        {"reason" in result ? <p role="status">{result.reason}</p> : <>
          <p>초안 검산액: <strong>{result.claim === null ? "확인 필요" : `${result.claim.toLocaleString()}원`}</strong></p>
          <p>계산상 공제·미보상액: {result.deductible === null ? "확인 필요" : `${result.deductible.toLocaleString()}원`} (한도·비례분담에 따른 추가 미지급액은 별도)</p>
          <p>적용 규칙: {result.ruleId} · {result.appliedFormula}</p>
          <p>근거: {result.source.documentId} · {result.source.article} {result.source.paragraph} · PDF {result.source.pdfPage}쪽</p>
          <p>약관 본문: {result.termsReference}</p>
          <p>{result.evidenceIds.join(", ")}</p>
          {result.gen2Trace && <p>상한 대상 자기부담: {result.gen2Trace.capEligibleDeductible?.toLocaleString()}원 · 상한 초과 복원: {result.gen2Trace.restored.toLocaleString()}원</p>}
          {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
        </>}
      </article>)}
    </section><div className="button-group"><button type="button" className="secondary-button" onClick={onConfirm}>5세대와 치료 수정</button><button type="button" className="primary-button" onClick={onEdit}>치료 입력 수정</button></div>
  </main>;
}
