import { gen23CareSettingLabel } from "../../domain/samsungGen23CareSetting";
import { Gen23Summary } from "../../components/samsung/Gen23Inputs";
import AppShell from "../../components/AppShell";
import { useState } from "react";
import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";

import { useAnalysisStore } from "../../store/useAnalysisStore";

function M03ConfirmPage() {
  const navigate = useNavigate();

  const [
    isCalculating,
    setIsCalculating,
  ] = useState(false);

  const contract = useAnalysisStore(
    (state) => state.contract
  );

  const target5GMonthlyPremium =
    useAnalysisStore(
      (state) =>
        state.target5GMonthlyPremium
    );

  const target5GCoverages =
    useAnalysisStore(
      (state) =>
        state.target5GCoverages
    );

  const usages = useAnalysisStore(
    (state) => state.usages
  );

  const calculationAssumptions =
    useAnalysisStore(
      (state) =>
        state.calculationAssumptions
    );

  const productCalculationSelections = useAnalysisStore(
    (state) => state.productCalculationSelections
  );

  if (
    !contract ||
    target5GMonthlyPremium === null
  ) {
    return (
      <AppShell currentStep={4}><main className="navy-page">
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            확인할 입력 정보가 없습니다.
          </h1>

          <p className="page-description">
            먼저 현재 보험과 5세대 비교 조건을 입력해주세요.
          </p>
        </header>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate("/input")
            }
          >
            입력 화면으로
          </button>
        </div>
      </main></AppShell>
    );
  }

  const currentAnnualPremium =
    contract.monthlyPremium * 12;

  const targetAnnualPremium =
    target5GMonthlyPremium * 12;

  const totalTreatmentCost =
    usages.reduce(
      (sum, usage) =>
        sum +
        usage.frequency *
          (usage.patientPaidAmount ??
            usage.unitCost),
      0
    );

  const hasUnknownUsage =
    usages.some(
      (usage) =>
        usage.benefitClass ===
          "UNKNOWN" ||
        (
          usage.benefitClass ===
            "NON_COVERED" &&
          usage.severityClass ===
            "UNKNOWN"
        )
    );

  const hasMissingPrecisionInput =
    usages.some((usage) => {
      if (
        usage.benefitClass ===
          "COVERED" &&
        usage.careSetting ===
          "OUTPATIENT"
      ) {
        return (
          usage.healthInsuranceCopayRate ===
            undefined ||
          usage.institutionType ===
            undefined
        );
      }

      return false;
    });

  const handleCalculate = () => {
    if (isCalculating) {
      return;
    }

    setIsCalculating(true);

    window.setTimeout(() => {
      navigate("/result");
    }, 900);
  };

  return (
    <AppShell currentStep={4}><main className="navy-page navy-confirm-page">
      <header className="page-header confirm-page-header">
        <span className="step-badge">STEP 04 · 입력 확인</span>
        <h1>계산 전 정보를 확인해주세요.</h1>
        <p className="page-description">
          현재 계약과 5세대에 동일한 의료이용 조건을 적용합니다.
        </p>
      </header>

      <div className="confirm-overview-grid">
      {/* STEP 1 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 1
        </span>

        <h2 className="card-title">
          현재 계약 확인
        </h2>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              보험사
            </p>

            <strong>
              {contract.insurer}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              상품명
            </p>

            <strong>
              {contract.productName}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              가입일
            </p>

            <strong>
              {contract.inceptionDate}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              실손 세대
            </p>

            <strong>
              {contract.generation}
              세대
            </strong>
          </div>

          <div>
            <p className="amount-label">
              월 보험료
            </p>

            <strong>
              {contract.monthlyPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              연 보험료
            </p>

            <strong>
              {currentAnnualPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              갱신 주기
            </p>

            <strong>
              {contract.renewalCycleMonths ===
              null
                ? "모름"
                : `${contract.renewalCycleMonths}개월`}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              재가입 주기
            </p>

            <strong>
              {contract.reentryCycleMonths ===
              null
                ? "모름"
                : `${contract.reentryCycleMonths}개월`}
            </strong>
          </div>

          {contract.generation === 1 ? (
            <>
              <div>
                <p className="amount-label">0904.2 상품</p>
                <strong>{productCalculationSelections.gen1Product === "SAMSUNG_0904_2" ? "선택됨" : productCalculationSelections.gen1Product === "OTHER" ? "다른 상품" : "확인 필요"}</strong>
              </div>
              <div>
                <p className="amount-label">D1 담보</p>
                <strong>{productCalculationSelections.gen1D1Coverage === "BOTH" ? "상해·질병 모두" : productCalculationSelections.gen1D1Coverage === "INJURY" ? "상해 D1" : productCalculationSelections.gen1D1Coverage === "DISEASE" ? "질병 D1" : "확인 필요"}</strong>
              </div>
              <div>
                <p className="amount-label">계산 기준</p>
                <strong>{productCalculationSelections.gen1ContractBasis}</strong>
              </div>
            </>
          ) : contract.generation === 2 ||
            contract.generation === 3 ? (
            <>
              <div>
                <p className="amount-label">
                  상품 종형
                </p>

                <strong>
                  {productCalculationSelections.samsungGen23Variant ===
                  "standard"
                    ? "1종 표준형"
                    : productCalculationSelections.samsungGen23Variant ===
                      "selected2"
                    ? "2종 선택형Ⅱ"
                    : "확인 필요"}
                </strong>
              </div>
            </>
          ) : contract.generation === 5 ? (
            <>
              <div>
                <p className="amount-label">
                  중증 비급여 특약1
                </p>

                <strong>
                  {contract.coverages.includes(
                    "SPECIAL_RIDER_1"
                  )
                    ? "가입으로 입력"
                    : "미가입으로 입력"}
                </strong>
              </div>

              <div>
                <p className="amount-label">
                  비중증 비급여 특약2
                </p>

                <strong>
                  {contract.coverages.includes(
                    "SPECIAL_RIDER_2"
                  )
                    ? "가입으로 입력"
                    : "미가입으로 입력"}
                </strong>
              </div>
            </>
          ) : (
            <div>
              <p className="amount-label">
                비급여 특약
              </p>

              <strong>
                {contract.coverages.includes(
                  "NON_COVERED"
                )
                  ? "가입으로 입력"
                  : "미가입으로 입력"}
              </strong>
            </div>
          )}
        </div>
      </section>

      {/* STEP 2 */}
      <section className="compare-card">
        <span className="step-badge">
          STEP 2
        </span>

        <h2 className="card-title">
          5세대 비교 조건 확인
        </h2>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              비교 대상
            </p>

            <strong>
              5세대 실손
            </strong>
          </div>

          <div>
            <p className="amount-label">
              비교용 월 보험료
            </p>

            <strong>
              {target5GMonthlyPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              비교용 연 보험료
            </p>

            <strong>
              {targetAnnualPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              중증 비급여 특약1
            </p>

            <strong>
              {target5GCoverages.includes(
                "SPECIAL_RIDER_1"
              )
                ? "가입으로 입력"
                : "미가입으로 입력"}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              비중증 비급여 특약2
            </p>

            <strong>
              {target5GCoverages.includes(
                "SPECIAL_RIDER_2"
              )
                ? "가입으로 입력"
                : "미가입으로 입력"}
            </strong>
          </div>
        </div>

        <div className="notice-box warning">
          5세대 월 보험료는 실제 보험사가
          산출한 확정 보험료가 아니라
          사용자가 비교를 위해 입력한
          가정값입니다.
        </div>
      </section>

      {/* STEP 3 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 3
        </span>

        <h2 className="card-title">
          예정 치료 확인
        </h2>

        <div className="comparison-summary">
          <p className="amount-label">
            입력한 예정 치료
          </p>

          <p className="amount">
            {usages.length}건
          </p>

          <p className="amount-label">
            전체 예상 치료비
          </p>

          <p className="amount">
            {totalTreatmentCost.toLocaleString()}
            원
          </p>
        </div>

        {usages.map(
          (usage, index) => {
            const perOccurrenceMedicalCost =
              usage.patientPaidAmount ??
              usage.unitCost;

            const treatmentCost =
              usage.frequency *
              perOccurrenceMedicalCost;

            return (
              <article
                className="treatment-card"
                key={usage.id}
              >
                <div className="treatment-card-header">
                  <div>
                    <span className="status-badge">
                      치료 {index + 1}
                    </span>

                    <h3>
                      {usage.treatmentName}
                    </h3>
                  </div>

                  <strong>
                    {treatmentCost.toLocaleString()}
                    원
                  </strong>
                </div>

                {(contract.generation === 2 || contract.generation === 3) && <Gen23Summary generation={contract.generation} usage={usage} />}
                <p className="treatment-meta">
                  {contract.generation === 2 || contract.generation === 3
                    ? gen23CareSettingLabel(usage)
                    : usage.careSetting === "OUTPATIENT" ? "통원" : "입원"}
                  {" · "}
                  {usage.benefitClass ===
                  "COVERED"
                    ? "급여"
                    : usage.benefitClass ===
                        "NON_COVERED"
                      ? "비급여"
                      : "급여 여부 모름"}
                  {" · "}
                  {usage.severityClass ===
                  "SEVERE"
                    ? "중증"
                    : usage.severityClass ===
                        "NON_SEVERE"
                      ? "비중증"
                      : "중증 여부 모름"}
                </p>

                <p className="treatment-meta">
                  {usage.frequency}
                  회 ×{" "}
                  {perOccurrenceMedicalCost.toLocaleString()}
                  원 (회당 M)
                </p>

                <div className="form-grid">
                  <div>
                    <p className="amount-label">
                      치료 분류
                    </p>
                    <strong>
                      {usage.treatmentCategory ??
                        "미입력"}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      진료 예정일
                    </p>
                    <strong>
                      {usage.treatmentDate ??
                        "미입력"}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      의료기관 종별
                    </p>
                    <strong>
                      {usage.institutionType ===
                      "CLINIC_HOSPITAL"
                        ? "병·의원"
                        : usage.institutionType ===
                            "GENERAL_TERTIARY"
                          ? "종합·상급종합병원"
                          : "미입력"}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      건강보험 본인부담률 r
                    </p>
                    <strong>
                      {usage.healthInsuranceCopayRate ===
                      undefined
                        ? "미입력"
                        : `${(
                            usage.healthInsuranceCopayRate *
                            100
                          ).toLocaleString()}%`}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      보장대상 인정금액 C
                    </p>
                    <strong>
                      {usage.coveredAmount ===
                      undefined
                        ? "미입력 · 확인 필요"
                        : `${usage.coveredAmount.toLocaleString()}원`}
                    </strong>
                  </div>
                </div>
              </article>
            );
          }
        )}

        {hasUnknownUsage && (
          <div className="notice-box warning">
            급여 여부가 '모름'이거나 비급여 치료의
            중증/비중증 분류가 '모름'인 항목이 있습니다.
            결과에서는 이를 임의 분류하지 않고
            확인 필요로 표시합니다.
          </div>
        )}

        {hasMissingPrecisionInput && (
          <div className="notice-box warning">
            급여 통원 치료 중 건강보험 본인부담률 r 또는
            의료기관 종별이 비어 있는 항목이 있습니다.
            해당 값이 필요한 계산은 임의 대표값을 사용하지 않고
            확인 필요로 표시합니다.
          </div>
        )}
      </section>

      {/* STEP 4 */}
      <section className="app-card">
        <span className="step-badge">
          STEP 4
        </span>

        <h2 className="card-title">
          계산 가정
        </h2>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              비교 기간
            </p>

            <strong>
              1년
            </strong>
          </div>

          <div>
            <p className="amount-label">
              의료이용 시나리오
            </p>

            <strong>
              유지(BASE, 100%)
            </strong>
          </div>

          <div>
            <p className="amount-label">
              룰셋 버전
            </p>

            <strong>
              삼성 {contract.generation}세대 상품별 실행 스펙 · 초안 검산
            </strong>
          </div>

          <div>
            <p className="amount-label">
              보험료 계산
            </p>

            <strong>
              월 보험료 × 12개월
            </strong>
          </div>

          <div>
            <p className="amount-label">
              치료비 계산
            </p>

            <strong>
              한 계산 단위 검산 · 반복 횟수·여러 치료의 연간 합산은 확인 필요
            </strong>
          </div>

          <div>
            <p className="amount-label">
              총부담 계산
            </p>

            <strong>
              연 보험료 + ΣM - ΣI
            </strong>
          </div>

          <div>
            <p className="amount-label">
              C 미입력 시 M 전체 보장대상 가정
            </p>

            <strong>
              {calculationAssumptions
                .assumeEntireMedicalCostCovered
                ? "적용"
                : "적용 안 함"}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              기존 한도·상한 사용량 0 가정
            </p>

            <strong>
              {calculationAssumptions
                .assumeNoPriorLimitUsage
                ? "적용"
                : "적용 안 함"}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              여러 회 치료를 서로 다른 계산 단위로 가정
            </p>

            <strong>
              {calculationAssumptions
                .assumeEachOccurrenceSeparate
                ? "적용"
                : "적용 안 함"}
            </strong>
          </div>
        </div>

        <div className="notice-box">
          자기부담액 d*, 보장 제외액 E,
          지급한도 초과액 U는 최종 의료비 부담
          M-I의 분해값이므로 총부담에 다시 더하지 않습니다.
        </div>

        <div className="notice-box">
          현재 확인 화면은 1년 비교 입력을 검토합니다.
          확인되지 않은 계약 조건·한도·분류는 0이나
          대표값으로 채우지 않고 결과에서 확인 필요로 남깁니다.
        </div>

        {!calculationAssumptions
          .assumeEntireMedicalCostCovered && (
          <div className="notice-box warning">
            C가 비어 있는 치료는 M 전체를 자동으로
            보장대상으로 간주하지 않습니다.
          </div>
        )}

        {!calculationAssumptions
          .assumeNoPriorLimitUsage && (
          <div className="notice-box warning">
            기존 지급한도 사용액 또는 자기부담 상한 누적액이
            필요한 계산은 0으로 자동 처리하지 않습니다.
          </div>
        )}

        {!calculationAssumptions
          .assumeEachOccurrenceSeparate &&
          usages.some(
            (usage) =>
              usage.frequency > 1 &&
              !usage.treatmentDate &&
              !usage.admissionId &&
              !usage.sameDayGroupId
          ) && (
            <div className="notice-box warning">
              여러 회 치료 중 날짜·동일입원·동일일자 정보가 없는
              항목이 있습니다. 각 회차를 서로 다른 계산 단위라고
              자동 가정하지 않습니다.
            </div>
          )}
      </section>

      </div>

      <div className="notice-box warning">
        본 비교는 사용자가 확인한 입력값과
        삼성 상품별 실행 스펙을 이용한 초안 검산입니다. 미확인 조건은 계산을 보류합니다.
        실제 보험금, 가입 가능 여부,
        전환 보험료를 확정하지 않으며
        보험상품 전환을 권유하지 않습니다.
      </div>

      <div className="button-group">
        <button
          type="button"
          className="secondary-button"
          disabled={isCalculating}
          onClick={() =>
            navigate("/input#input-step-3")
          }
        >
          이전
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={isCalculating}
          onClick={handleCalculate}
        >
          {isCalculating
            ? "계산 준비 중..."
            : "이 조건으로 비교 계산하기"}
        </button>
      </div>

      {isCalculating && createPortal(
        <div
          className="calculation-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calculation-modal-title"
          aria-describedby="calculation-modal-description"
        >
          <div className="calculation-modal">
            <div
              className="calculation-spinner"
              aria-hidden="true"
            />

            <h2 id="calculation-modal-title">
              예상 부담을 계산하고 있어요
            </h2>

            <p
              id="calculation-modal-description"
              aria-live="polite"
            >
              입력한 보험료와 예정 치료 조건을
              기준으로 현재 계약과 5세대 비교
              결과를 준비하고 있습니다.
            </p>
          </div>
        </div>,
        document.body
      )}
    </main></AppShell>
  );
}

export default M03ConfirmPage;
