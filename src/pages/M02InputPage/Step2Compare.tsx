import { useRef, useState } from "react";
import { TARGET_SAMPLES } from "../../domain/contractSamples";
import { formatWonInput, getWonInputValue } from "./M02Shared";
import type { M02Form } from "./useM02Form";
import SamsungContractFactsFields from '../../components/samsung/SamsungContractFactsFields';
import type { MedicalUsage, SeverityClass } from "../../domain/medical";

export default function Step2Compare({ form }: { form: M02Form }) {
  const [premiumExamplesVisible, setPremiumExamplesVisible] = useState(false);
  const targetSampleDialogRef = useRef<HTMLDialogElement>(null);
  const {
    hasTarget5GSpecialRider1,
    hasTarget5GSpecialRider2,
    riderDetailVisible,
    setHasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider2,
    setTarget5GMonthlyPremiumInput,
    target5GMonthlyPremium,
    toggleRiderDetail,
    plannedUsages,
    setPlannedUsages,
  } = form;
  const nonCoveredUsages = plannedUsages.filter(usage => usage.benefitClass === "NON_COVERED");
  const updateUsage = (id: string, patch: Partial<MedicalUsage>) => setPlannedUsages(previous => previous.map(usage => usage.id === id ? { ...usage, ...patch } : usage));
  // 종별 선택은 예정 치료의 급여 종별 선택과 같은 값으로 저장한다(엔진은 institutionType을 읽는다).
  const updateInstitution = (id: string, value: "GENERAL_TERTIARY" | "CLINIC_HOSPITAL" | "") => updateUsage(id, {
    institutionType: value || undefined,
    copayInstitution: value === "GENERAL_TERTIARY" ? "GENERAL" : value === "CLINIC_HOSPITAL" ? "HOSPITAL" : undefined,
  });

  return (
    <section id="input-step-3" tabIndex={-1} className="target-comparison-layout">
      <section className="form-card target-contract-card" aria-label="5세대 전환 계약 조건">
        <span className="step-badge">
          STEP 3-1 · 5세대 비교 조건
        </span>

        <h2 className="card-title">
          5세대 계약전환형 비교
        </h2>

        <p className="card-description">
          2단계에서 입력한 동일한 예정 치료를 현재 보험과 5세대에 각각 적용합니다.
        </p>

        <div className="html-sample-actions">
          <button type="button" className="sample-button" onClick={() => targetSampleDialogRef.current?.showModal()}>샘플 불러오기</button>
          <button type="button" className="sample-button" onClick={form.handleResetAll}>초기화</button>
        </div>

        <dialog ref={targetSampleDialogRef} className="treatment-help-dialog" aria-labelledby="target-sample-title">
          <section className="app-card" style={{ margin: 0 }}>
            <h2 id="target-sample-title" className="card-title">샘플 선택</h2>
            <p>고른 샘플로 5세대 월 보험료·특약·가입금액이 채워집니다. 값은 연습용 가정이니 직접 수정하세요.</p>
            <div style={{ display: "grid", gap: "12px" }}>
              {TARGET_SAMPLES.map((sample) => (
                <button key={sample.id} type="button" className="sample-button contract-sample-option" onClick={() => { form.handleLoadTargetSample(sample.id); targetSampleDialogRef.current?.close(); }}>
                  <strong>{sample.label}</strong> <small>{sample.description}</small>
                </button>
              ))}
              <button type="button" className="secondary-button" onClick={() => targetSampleDialogRef.current?.close()}>닫기</button>
            </div>
          </section>
        </dialog>


        <div className="target-contract-grid">
        <label className="target-premium-field" id="target-premium-help-area" htmlFor="target-premium">
          <span className="target-premium-heading">월 보험료 <span className="required-mark">필수</span> <button type="button" className="premium-example-toggle" aria-expanded={premiumExamplesVisible} aria-controls="target-premium-examples" onClick={() => setPremiumExamplesVisible(visible => !visible)}>예시</button></span>
          <small className="target-premium-note">비교용 보험료는 사용자가 직접 입력한 가정값입니다. 실제 5세대 전환 보험료를 확정하지 않습니다.</small>
          <span className="input-unit-row"><input id="target-premium"
            type="text"
            inputMode="numeric"
            value={
              formatWonInput(target5GMonthlyPremium)
            }
            onChange={(e) =>
              setTarget5GMonthlyPremiumInput(
                getWonInputValue(e.target.value)
              )
            }
            placeholder="예: 15,000"
          /><span className="input-unit-label">원</span></span>
        </label>
        {premiumExamplesVisible && <aside className="target-premium-examples" id="target-premium-examples" aria-label="5세대 월 보험료 예시">
          <table className="target-rider-cap-table">
            <caption>금융위원회 월 보험료 예시</caption>
            <thead><tr><th scope="col">예시 대상</th><th scope="col">조건</th><th scope="col">월 보험료</th></tr></thead>
            <tbody>
              <tr><td>40대 남성</td><td>5세대 비교 예시</td><td>약 16,000원</td></tr>
              <tr><td>60대 여성</td><td>5세대 전환 예시</td><td>42,539원</td></tr>
              <tr><td>60대 여성</td><td>전환 할인 적용 예시<br />전환 후 3년간</td><td>21,270원</td></tr>
            </tbody>
          </table>
          <small className="target-premium-note">공식 자료의 비교 예시이며 개인별 견적이나 기본값이 아닙니다. 자료는 연령대로 제시되어 있어 정확한 나이·직업·가입 특약별 보험료는 확인할 수 없습니다. 60대 여성 예시는 6개 대형 손보사 기준이며 보험사별로 다릅니다. 할인 예시는 2026년 11월 시행 예정 제도를 설명한 것으로 자동 적용하지 않습니다.</small>
          <a className="target-premium-note" href="https://www.fsc.go.kr/po010101/86831" target="_blank" rel="noopener noreferrer">출처: 금융위원회 2026.5.4. 보도자료, 참고2(14쪽)</a>
          <table className="target-rider-cap-table">
            <caption>신한EZ 5세대 연령별 월 보험료 예시</caption>
            <thead><tr><th scope="col">연령</th><th scope="col">남성</th><th scope="col">여성</th></tr></thead>
            <tbody>
              <tr><td>30세</td><td>9,201원</td><td>10,200원</td></tr>
              <tr><td>40세</td><td>11,990원</td><td>14,359원</td></tr>
              <tr><td>50세</td><td>17,056원</td><td>23,095원</td></tr>
            </tbody>
          </table>
          <small className="target-premium-note">신한 SOL 처음실손의료보험(무배당), 기본계약·특약1·2 모두 가입, 1년·전기납·월납 기준. 갱신 시 보험료가 오를 수 있습니다. 삼성 계약전환 견적이 아닌 타사 5세대 상품의 참고 예시입니다.</small>
          <a className="target-premium-note" href="https://www.shinhanez.co.kr/static/prd/PRD12000M01.html" target="_blank" rel="noopener noreferrer">출처: 신한EZ손해보험 공식 상품안내 · 확인일 2026.10.6.</a>
        </aside>}

        <div className="target-riders-field">
        <div className="select-like-field" style={{ marginTop: 0, marginBottom: 0 }}>
          <span id="target-rider-title">
            특약 가입 여부 <span className="optional-mark">선택</span>
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <label className="no-treatment-option" style={{ flex: 1, margin: 0 }}>
              <input
                type="checkbox"
                checked={hasTarget5GSpecialRider1}
                onChange={(event) => setHasTarget5GSpecialRider1(event.target.checked)}
              />
              <span><strong>중증 비급여 특약(특약1)</strong></span>
            </label>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                toggleRiderDetail("special1")
              }
              style={{
                minHeight: "38px",
                padding: "0 12px",
                fontSize: "0.82rem",
              }}
            >
              {riderDetailVisible.special1 ? "설명 숨김" : "설명"}
            </button>
          </div>

          <div
            style={{
              display: riderDetailVisible.special1 ? "block" : "none",
              marginTop: "22px",
              padding: "20px 18px",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 10px" }}>중증 비급여 (특약1)</h3>
            <ul className="target-rider-summary">
              <li><strong>보상 대상</strong><span>산정특례 대상 질환(암·뇌혈관·심장질환·희귀난치성질환 등) 및 그 질환과 의학적 인과관계가 분명한 합병증의 비급여 치료</span></li>
              <li><strong>입원 보상</strong><span>보장대상 의료비의 70% (자기부담률 30%, 기존 보장 수준 유지)</span></li>
              <li><strong>통원 공제</strong><span>3만원과 보장대상 의료비의 30% 중 큰 금액을 공제</span></li>
              <li><strong>상급병실</strong><span>비급여 병실료의 50% (1일 평균 10만원 한도)</span></li>
              <li><strong>연간 한도</strong><span>상해·질병 각각 입원·통원 합산 가입금액 적용</span></li>
            </ul>
            <table className="target-rider-cap-table">
              <caption>가입금액별 통원 1회 한도</caption>
              <thead><tr><th scope="col">연간 가입금액</th><th scope="col">통원 1회 한도</th></tr></thead>
              <tbody><tr><td>5천만원</td><td>20만원</td></tr><tr><td>3천만원</td><td>15만원</td></tr><tr><td>1천만원</td><td>10만원</td></tr></tbody>
            </table>
            <ul className="target-rider-summary target-rider-summary-extra">
              <li><strong>입원 자기부담 상한</strong><span>종합·상급종합병원 입원은 연 500만원. 근골격계 이학요법·체외충격파와 주사는 상한에서 제외되며, MRI는 포함됩니다.</span></li>
              <li><strong>3대 비급여</strong><span>도수·체외충격파·증식치료, 주사, MRI/MRA도 산정특례 대상 질환으로 인한 경우에만 보상하며, 별도 공제·금액·횟수 한도를 적용합니다.</span></li>
            </ul>
            <p className="sample-note">출처: 금융위원회·금융감독원 5세대 실손보험 보도자료(2026.5.4) 5쪽, 손해보험협회 실손의료보험 안내(2026.10.3), 삼성화재 5세대 약관 8·50·52쪽</p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginTop: "14px",
            }}
          >
            <label className="no-treatment-option" style={{ flex: 1, margin: 0 }}>
              <input
                type="checkbox"
                checked={hasTarget5GSpecialRider2}
                onChange={(event) => setHasTarget5GSpecialRider2(event.target.checked)}
              />
              <span><strong>비중증 비급여 특약(특약2)</strong></span>
            </label>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                toggleRiderDetail("special2")
              }
              style={{
                minHeight: "38px",
                padding: "0 12px",
                fontSize: "0.82rem",
              }}
            >
              {riderDetailVisible.special2 ? "설명 숨김" : "설명"}
            </button>
          </div>

          <div
            style={{
              display: riderDetailVisible.special2 ? "block" : "none",
              marginTop: "22px",
              padding: "20px 18px",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 10px" }}>비중증 비급여 (특약2)</h3>
            <ul className="target-rider-summary">
              <li><strong>보상 대상</strong><span>특약1에서 보장하지 않는 비급여 치료 (산정특례 대상 질환이 아닌 질환의 치료)</span></li>
              <li><strong>입원 보상</strong><span>보장대상 의료비의 50% (자기부담률 50%, 한도 1천만원으로 낮춤)</span></li>
              <li><strong>통원 공제</strong><span>5만원과 보장대상 의료비의 50% 중 큰 금액을 공제</span></li>
              <li><strong>상급병실</strong><span>비급여 병실료의 50% (1일 평균 10만원 한도)</span></li>
              <li><strong>연간 한도</strong><span>상해·질병 각각 입원·통원 합산 가입금액 적용</span></li>
            </ul>
            <table className="target-rider-cap-table">
              <caption>가입금액별 통원 1일 한도</caption>
              <thead><tr><th scope="col">연간 가입금액</th><th scope="col">통원 1일 한도</th></tr></thead>
              <tbody><tr><td>1천만원</td><td>20만원</td></tr><tr><td>600만원</td><td>15만원</td></tr><tr><td>200만원</td><td>10만원</td></tr></tbody>
            </table>
            <ul className="target-rider-summary target-rider-summary-extra">
              <li><strong>입원 한도</strong><span>종합·상급종합병원 외 입원은 1회 300만원</span></li>
              <li><strong>MRI/MRA 한도</strong><span>비중증 MRI/MRA는 연 200만원. 일반 통원과 다른 별도 공제·한도를 적용합니다.</span></li>
              <li><strong>보장 제외</strong><span>진료내역과 약관에 따라 확인합니다.</span></li>
              <li><strong>보험료 차등</strong><span>2028년 5월 6일부터 적용. 비중증 보험금 수령액에 따른 구간과 제외 대상을 별도로 확인합니다.</span></li>
            </ul>
            <p className="sample-note target-rider-source">출처: 금융위원회·금융감독원 5세대 실손보험 보도자료(2026.5.4) 5쪽, 손해보험협회 실손의료보험 안내(2026.10.3), 삼성화재 5세대 약관 8·52·64쪽</p>
          </div>
        </div>

        </div>
        </div>
        {(hasTarget5GSpecialRider1 || hasTarget5GSpecialRider2) && <p className="notice-box" role="status">
          {`5세대 비교안: 급여 주계약 + ${[hasTarget5GSpecialRider1 && '특약1(중증 비급여)', hasTarget5GSpecialRider2 && '특약2(비중증 비급여)'].filter(Boolean).join(' + ')}`}
        </p>}
      </section>
        <section className="form-card target-benefit-card" aria-label="5세대 비교 계약 상세">
          <span className="step-badge">STEP 3-2 · 5세대 비교 조건</span>
          <h2 className="card-title">5세대 전환 계약의 가입금액</h2>
          <p className="card-description">5세대로 전환할 때 가입할 보장의 가입금액을 입력해주세요. 선택한 보장의 한도를 적용해 계산합니다.</p>
          <SamsungContractFactsFields value={form.targetContractFactsForm} onChange={form.setTargetContractFactsForm} generation={5} prefix="target-contract" compactLabels singleContract showSevere={hasTarget5GSpecialRider1} showNonSevere={hasTarget5GSpecialRider2} />
        </section>
        {(hasTarget5GSpecialRider1 || hasTarget5GSpecialRider2) && nonCoveredUsages.length > 0 && <section className="form-card gen5-detail-inputs" aria-label="5세대 세부 보장 및 계약 확인">
          <span className="step-badge">STEP 3-3 · 5세대 비교 조건</span>
          <h2 className="card-title">5세대 세부 보장 및 계약 확인</h2>
          <p className="card-description">{hasTarget5GSpecialRider1 ? "선택한 5세대 비급여 특약에 맞춰, 예정 치료 중 비급여 치료가 중증에 해당하는지와 입원 의료기관을 확인합니다." : "중증 비급여 특약(특약1)을 선택하지 않아 비급여 치료는 비중증으로 보고, 입원 의료기관만 확인합니다."}</p>
          <div className="gen5-usage-list">
            {nonCoveredUsages.map(usage => {
              const severityValue = usage.severityClass === "SEVERE" || usage.severityClass === "NON_SEVERE" ? usage.severityClass : "";
              const covered = usage.severityClass === "SEVERE" ? hasTarget5GSpecialRider1 : usage.severityClass === "NON_SEVERE" ? hasTarget5GSpecialRider2 : undefined;
              const institutionValue = usage.institutionType === "GENERAL_TERTIARY" || usage.institutionType === "CLINIC_HOSPITAL" ? usage.institutionType : "";
              return <fieldset className="gen5-usage-card" key={usage.id} aria-label={`${usage.treatmentName} 5세대 확인`}>
                <legend>{usage.treatmentName} · {usage.careSetting === "INPATIENT" ? "입원" : "통원"}</legend>
                {usage.careSetting === "INPATIENT" && <p className="sample-note">병실료 차액 {(usage.samsungCalculationInput?.roomDifference ?? usage.gen23RoomDifference ?? usage.gen1RoomDifference ?? 0).toLocaleString("ko-KR")}원 · 입원일 수 {(usage.samsungCalculationInput?.inpatientDays ?? usage.gen23InpatientDays) ?? "미입력"}{(usage.samsungCalculationInput?.inpatientDays ?? usage.gen23InpatientDays) === undefined ? "" : "일"} (예정 치료 입력을 같이 사용합니다)</p>}
                <div className="form-grid">
                  {hasTarget5GSpecialRider1 && <label>
                    <span className="gen1-field-heading">산정특례 질환(또는 합병증) 치료인가요?</span>
                    <small className="treatment-hint-list">
                      <span>산정특례: 보건복지부 고시 대상 질환(암, 뇌혈관·심장질환, 희귀난치성질환 등)</span>
                      <span>해당 질환 또는 그 합병증의 치료 → ‘예’ (중증 비급여, 특약1)</span>
                      <span>그 외 치료 → ‘아니오’ (비중증 비급여, 특약2)</span>
                      <span className="gen5-source">출처: 금융위원회·금융감독원 보도자료(2026.5.4), 삼성화재 5세대 약관 51쪽</span>
                    </small>
                    <select aria-label={`${usage.treatmentName} 산정특례 질환 치료 여부`} className={severityValue === "" ? "is-placeholder" : undefined} value={severityValue} onChange={event => updateUsage(usage.id, { severityClass: (event.target.value || "UNKNOWN") as SeverityClass })}>
                      <option value="">선택해주세요</option>
                      <option value="SEVERE">예</option>
                      <option value="NON_SEVERE">아니오</option>
                    </select>
                    {covered === false && <small className="treatment-hint-list"><span>{usage.severityClass === "SEVERE" ? "특약1" : "특약2"}에 가입하지 않아 5세대에서 보상하지 않습니다</span></small>}
                  </label>}
                  {usage.careSetting === "INPATIENT" && <label>
                    <span className="gen1-field-heading">종합병원 이상(상급종합병원 포함)에 입원하나요? <small className="treatment-inline-hint">5세대 비급여 입원 한도에 필요</small></span>
                    <small className="treatment-hint-list">
                      <span>중증 비급여(특약1): 상급종합·종합병원 입원에 연간 자기부담 상한 500만원 적용</span>
                      <span>비중증 비급여(특약2): 종합·상급종합병원이 아닌 병·의원 입원은 1회 300만원 한도</span>
                    </small>
                    <select aria-label={`${usage.treatmentName} 종합병원 이상 입원 여부`} className={institutionValue === "" ? "is-placeholder" : undefined} value={institutionValue} onChange={event => updateInstitution(usage.id, event.target.value as "GENERAL_TERTIARY" | "CLINIC_HOSPITAL" | "")}>
                      <option value="">선택해주세요</option>
                      <option value="GENERAL_TERTIARY">예 — 종합·상급종합병원</option>
                      <option value="CLINIC_HOSPITAL">아니오 — 병원·의원</option>
                    </select>
                  </label>}
                </div>
              </fieldset>;
            })}
          </div>
        </section>}
      </section>
  );
}
