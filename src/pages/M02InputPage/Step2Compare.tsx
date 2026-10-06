import { useState } from "react";
import { formatWonInput, getWonInputValue } from "./M02Shared";
import type { M02Form } from "./useM02Form";
import SamsungContractFactsFields from '../../components/samsung/SamsungContractFactsFields';

export default function Step2Compare({ form }: { form: M02Form }) {
  const [premiumExamplesVisible, setPremiumExamplesVisible] = useState(false);
  const {
    hasTarget5GSpecialRider1,
    hasTarget5GSpecialRider2,
    riderDetailVisible,
    setHasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider2,
    setTarget5GMonthlyPremiumInput,
    target5GMonthlyPremium,
    toggleRiderDetail,
  } = form;

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
            placeholder="예: 35,000"
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
              {riderDetailVisible.special1 ? "숨김" : "보이기"}
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
              <li><strong>적용 대상</strong><span>산정특례 대상 질환과 관련된 비급여 치료</span></li>
              <li><strong>자기부담률</strong><span>일반 중증 비급여 30%</span></li>
              <li><strong>연간 한도</strong><span>상해·질병 각각 입원·통원 합산 가입금액 적용</span></li>
            </ul>
            <table className="target-rider-cap-table">
              <caption>가입금액별 통원 1회 한도</caption>
              <thead><tr><th scope="col">연간 가입금액</th><th scope="col">통원 1회 한도</th></tr></thead>
              <tbody><tr><td>5천만원</td><td>20만원</td></tr><tr><td>3천만원</td><td>15만원</td></tr><tr><td>1천만원</td><td>10만원</td></tr></tbody>
            </table>
            <ul className="target-rider-summary target-rider-summary-extra">
              <li><strong>입원 자기부담 상한</strong><span>종합·상급종합병원 입원은 연 500만원. 근골격계 이학요법·체외충격파와 주사는 상한에서 제외되며, MRI는 포함됩니다.</span></li>
              <li><strong>3대 비급여</strong><span>도수·체외충격파·증식치료, 주사, MRI/MRA는 별도 공제·금액·횟수 한도를 적용합니다.</span></li>
            </ul>
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
              {riderDetailVisible.special2 ? "숨김" : "보이기"}
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
              <li><strong>적용 대상</strong><span>중증 비급여 외 보장대상 비급여 치료</span></li>
              <li><strong>자기부담률</strong><span>50%</span></li>
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
      </section>
  );
}
