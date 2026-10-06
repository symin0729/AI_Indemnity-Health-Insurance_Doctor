import { InputHelp } from "../../../components/InputHelp";
import { formatWonInput, getWonInputValue } from "./M02Shared";
import type { M02Form } from "./useM02Form";
import SamsungContractFactsFields from '../../../components/samsung/SamsungContractFactsFields';

export default function Step2Compare({ form }: { form: M02Form }) {
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
    <section id="input-step-3" tabIndex={-1} className="compare-card">
        <span className="step-badge">
          STEP 3 · 5세대 조건
        </span>

        <h2 className="card-title">
          5세대 계약전환형 비교
        </h2>

        <p className="card-description">
          2단계에서 입력한 동일한 예정 치료를 현재 보험과 5세대에 각각 적용합니다.
          여기서는 5세대의 견적 보험료와 가입할 보장만 입력하세요.
        </p>

        <section className="notice-box" aria-label="두 계약에 공통으로 적용할 예정 치료">
          <strong>동일한 의료 이용으로 비교합니다</strong>
          <ul>{form.plannedUsages.map(usage => <li key={usage.id}>{usage.treatmentName} · {usage.careSetting === 'INPATIENT' ? '입원' : '통원'} · {usage.benefitClass === 'COVERED' ? '급여' : usage.benefitClass === 'NON_COVERED' ? '비급여' : '급여 구분 확인 필요'} · 회당 {usage.unitCost.toLocaleString('ko-KR')}원 · {usage.frequency}회</li>)}</ul>
          <p>치료·비용·횟수는 같고, 보험금은 각 계약의 가입 보장·공제·한도에 따라 달라집니다.</p>
          <button type="button" className="review-edit-button" onClick={() => form.goToInputStep(2)}>예정 치료 수정</button>
        </section>

        <section className="notice-box" aria-label="5세대 계약전환 조건">
          <strong>삼성 5세대 계약전환형 약관으로 비교합니다</strong>
          <p>기존 실손계약을 5세대로 전환하는 조건입니다. 전환 자격과 예정 치료의 계속 치료 적용 조건을 보험사에 확인해주세요. 미확인 시 보험금과 손익분기점 계산을 보류합니다.</p>
          <label htmlFor="target-conversion-eligibility">전환 자격·계속 치료 적용 조건
            <select id="target-conversion-eligibility" value={form.targetContractFactsForm.conversionEligibilityConfirmed ?? ''}
              onChange={event => form.setTargetContractFactsForm(previous => ({ ...previous, conversionEligibilityConfirmed: event.target.value }))}>
              <option value="">확인 필요</option>
              <option value="true">보험사 확인 완료 — 전환 및 예정 치료 적용 가능</option>
              <option value="false">적용 불가 또는 추가 확인 필요</option>
            </select>
          </label>
          <p>계약전환 할인은 자동 적용하지 않습니다. 할인 적용 여부와 기간을 확인한 실제 전환 견적 보험료를 입력하세요.</p>
        </section>

        <label id="target-premium-help-area" htmlFor="target-premium">
          비교용 5세대 월 보험료 (필수)
            <InputHelp title="비교용 5세대 월 보험료" description="5세대 전환 시 예상되는 월 보험료입니다. 현재 보험료와 구분하고, 보험사에서 받은 견적을 입력하세요." source="보험사의 전환 견적 또는 상담" />
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
            <small className="sample-note rider-row__hint">전환 견적에서 가입할 특약을 체크하세요. 현재 보험의 특약은 자동으로 복사되지 않습니다.</small>
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
              산정특례 대상 질환과 관련 치료에 적용됩니다. 상해·질병 각각 입원·통원을 합산하며, 가입금액 5천만·3천만·1천만원에 따라 통원 1회 한도는 20만·15만·10만원입니다. 일반 중증 비급여의 자기부담률은 30%이며, 종합·상급종합병원 입원의 연간 자기부담 상한은 500만원입니다. 근골격계 이학요법·체외충격파와 주사는 이 상한에서 제외되고 MRI는 포함됩니다. 3대 비급여는 별도 공제·금액·횟수 한도를 적용합니다.
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
              중증 비급여 외 보장대상 치료에 적용되며 자기부담률은 50%입니다. 상해·질병 각각 입원·통원 합산 가입금액 1천만·600만·200만원에 따라 통원 1일 한도는 20만·15만·10만원입니다. 종합·상급종합병원 외 입원은 1회 300만원, 비중증 MRI/MRA는 연 200만원 한도입니다. 보장 제외 항목은 진료내역과 약관으로 확인해야 합니다. 보험료 차등은 2028년 5월 6일부터 적용되며 비중증 보험금 수령액에 따른 구간과 제외 대상을 따로 확인합니다.
            </p>
          </div>
        </div>

        <p className="notice-box" role="status">
          {hasTarget5GSpecialRider1 || hasTarget5GSpecialRider2
            ? `5세대 비교안: 급여 주계약 + ${[hasTarget5GSpecialRider1 && '특약1(중증 비급여)', hasTarget5GSpecialRider2 && '특약2(비중증 비급여)'].filter(Boolean).join(' + ')}`
            : '5세대 비교안: 급여 주계약만 선택되어 있습니다. 비급여 특약 미가입 조건으로 비교합니다.'}
        </p>
        <fieldset className="form-card" aria-label="5세대 비교 계약 상세">
          <legend>5세대 비교 계약의 가입금액</legend>
          <SamsungContractFactsFields value={form.targetContractFactsForm} onChange={form.setTargetContractFactsForm} generation={5} prefix="target-contract" mode="consumer" singleContract showSevere={hasTarget5GSpecialRider1} showNonSevere={hasTarget5GSpecialRider2} />
        </fieldset>
        <div className="notice-box">
          비교용 보험료는 사용자가 직접
          입력한 가정값입니다. 실제 5세대
          전환 보험료를 확정하지 않습니다.
        </div>
      </section>
  );
}
