import { InputHelp } from "../../components/InputHelp";
import { formatWonInput, getWonInputValue } from "./M02Shared";
import type { M02Form } from "./useM02Form";

export default function Step2Compare({ form }: { form: M02Form }) {
  const {
    hasTarget5GSpecialRider1,
    hasTarget5GSpecialRider2,
    isTargetPremiumHelpConfirmed,
    riderDetailVisible,
    setHasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider2,
    setIsTargetPremiumHelpConfirmed,
    setTarget5GMonthlyPremiumInput,
    target5GMonthlyPremium,
    toggleRiderDetail,
  } = form;

  return (
    <section id="input-step-2" tabIndex={-1} className="compare-card">
        <span className="step-badge">
          STEP 2-1
        </span>

        <h2 className="card-title">
          5세대 전환 비교
        </h2>

        <p className="card-description">
          5세대로 전환한다고 가정했을 때
          사용할 비교 조건입니다.
        </p>

        <label id="target-premium-help-area" htmlFor="target-premium">
          비교용 5세대 월 보험료 (필수)
            <InputHelp title="비교용 5세대 월 보험료" description="5세대 전환 시 예상되는 월 보험료입니다. 현재 보험료와 구분하고, 보험사에서 받은 견적을 입력하세요." source="보험사의 전환 견적 또는 상담" attention confirmed={isTargetPremiumHelpConfirmed} onConfirm={() => setIsTargetPremiumHelpConfirmed(true)} />
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

        <div className="select-like-field" style={{ marginTop: "14px", marginBottom: 0 }}>
          <span id="target-rider-title">
            특약 가입 여부 <span className="optional-mark">선택</span>
            <small className="sample-note rider-row__hint">가입한 특약만 체크. 체크하지 않은 특약은 미가입으로 계산.</small>
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
            <p style={{ margin: 0, color: "var(--color-text-sub)", lineHeight: 1.7 }}>
              암, 뇌혈관·심장질환, 희귀난치성질환 등 건강보험 산정특례 대상 질환 및 그 합병증 치료를 집중 보장하는 필수 의료 지원 특약입니다. 상해·질병당 연간 5,000만 원 한도(통원 회당 20만 원, 연 100회)와 30%의 자기부담률 등 기존 4세대의 보장 수준을 유지하며, 상급종합병원 및 종합병원 입원 시 연간 자기부담금 500만 원 상한제를 신설하여 고액 치료비 부담을 크게 줄였습니다. 또한 비중증에서 제외되는 도수치료나 비급여 주사제라도 중증 질환 치료 목적임이 인정되면 통합 한도 내에서 보장되며, 비급여 이용량에 따른 보험료 할증도 적용되지 않습니다.
            </p>
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
            <p style={{ margin: 0, color: "var(--color-text-sub)", lineHeight: 1.7 }}>
              중증 비급여(특약1) 외 일반 비급여 치료를 대상으로 하며, 과잉 의료 이용 방지와 가입자 부담 완화를 위해 보장 구조가 개편되었습니다. 연간 보상한도는 1,000만 원(통원 일당 20만 원, 병·의원 입원 회당 300만 원, 비급여 MRI/MRA 연 300만 원)으로 조정되고 자기부담률은 50%로 상향되었습니다. 과잉 진료 우려가 큰 근골격계 물리치료(도수·체외충격파 등), 비급여 주사제, 미등재 신의료기술은 보장 대상에서 제외되며, 직전 2년 무사고 시 10% 보험료 할인 혜택 및 연간 수령액(100만 원 이상부터 할증)에 따라 최대 300%까지 차등 할증되는 제도가 적용됩니다.
            </p>
          </div>
        </div>

        <div className="notice-box">
          비교용 보험료는 사용자가 직접
          입력한 가정값입니다. 실제 5세대
          전환 보험료를 확정하지 않습니다.
        </div>
      </section>
  );
}
