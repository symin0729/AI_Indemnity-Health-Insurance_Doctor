import { hasRequiredPriorUsage } from "../../../domain/priorUsageConfirmation";
import { gen23CareSettingLabel } from "../../../domain/samsungGen23CareSetting";
import { Gen23Summary } from "../../../components/samsung/Gen23Inputs";
import AppShell from "../../components/AppShell";
import { displayInsurer, displayProductName } from "../../../domain/displayMask";
import { gen1CompanyLabel } from "../../../domain/gen1Product";
import { GEN3_RIDERS } from "../../../domain/gen3Riders";
import { GEN23_VARIANT_LABELS } from "../../../domain/samsungGen23Variant";
import { useState } from "react";
import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";

import { useAnalysisStore } from "../../store/useAnalysisStore";
import "../../../styles/M03-confirm.css";

function CycleHelp({ title, description }: { title: string; description: string }) {
  return (
    <details name="consumer-cycle-help" style={{ display: "inline-block", position: "relative", flexShrink: 0 }}>
      <summary
        aria-label={`${title} 설명`}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: "1px solid #b9ccdf", background: "#eff6fc", color: "#174f83", fontSize: "12px", fontWeight: 700, cursor: "pointer", listStyle: "none" }}
      >?</summary>
      <span style={{ display: "block", position: "absolute", top: "26px", left: 0, width: "220px", padding: "10px 12px", border: "1px solid #d8e1eb", borderRadius: "10px", background: "#ffffff", color: "#334155", fontSize: "0.85rem", lineHeight: 1.6, boxShadow: "0 6px 18px rgba(18, 54, 89, 0.12)", zIndex: 2 }}>
        {description}
      </span>
    </details>
  );
}

function M03ConfirmPage() {
  const navigate = useNavigate();

  const [
    isCalculating,
    setIsCalculating,
  ] = useState(false);

  const [confirmation, setConfirmation] = useState({ signature: "", checked: false });

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

  const signature = JSON.stringify({ contract, usages, target5GMonthlyPremium, target5GCoverages, calculationAssumptions, productCalculationSelections });
  const isFinalConfirmationChecked = confirmation.signature === signature && confirmation.checked;
  const setIsFinalConfirmationChecked = (checked: boolean) => setConfirmation({ signature, checked });
  if (confirmation.signature !== signature) setConfirmation({ signature, checked: false });

  if (
    !contract ||
    target5GMonthlyPremium === null
  ) {
    return (
      <AppShell currentStep={5}><main className="navy-page">
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
              navigate("/consumer/input")
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

  const missingCoveredAmountCount = usages.filter(
    (usage) =>
      usage.coveredAmount === undefined &&
      usage.samsungCalculationInput?.eligibleExpense === undefined &&
      usage.gen23EligibleExpense === undefined
  ).length;

  const hasPriorUsageInputForAllTreatments = usages.every((usage) =>
    hasRequiredPriorUsage(contract.generation, usage, calculationAssumptions, productCalculationSelections)
  );

  const needsVisitUnitConfirmation = usages.some(
    (usage) =>
      usage.frequency > 1 &&
      !usage.admissionId &&
      !usage.sameDayGroupId
  );

  const confirmationIssues = [
    hasUnknownUsage
      ? {
          title: "치료 분류를 확인해주세요.",
          description: "급여·비급여 또는 비급여 치료의 중증·비중증 분류가 입력되지 않았습니다.",
        }
      : null,
    hasMissingPrecisionInput
      ? {
          title: "급여 통원 정밀 정보를 확인해주세요.",
          description: "의료기관 종별 또는 건강보험 본인부담률이 입력되지 않았습니다.",
        }
      : null,
    missingCoveredAmountCount > 0 &&
    !calculationAssumptions.assumeEntireMedicalCostCovered
      ? {
          title: "보장대상 인정금액을 확인해주세요.",
          description: `보장대상 인정금액이 없는 치료가 ${missingCoveredAmountCount}건 있습니다.`,
        }
      : null,
    calculationAssumptions.comparisonBasis === "REMAINING_LIMITS" && !hasPriorUsageInputForAllTreatments &&
    !calculationAssumptions.assumeNoPriorLimitUsage
      ? {
          title: "기존 지급·한도 사용 이력을 확인해주세요.",
          description: "현재 보장기간의 지급액 또는 누적 사용량이 입력되지 않았습니다.",
        }
      : null,
    needsVisitUnitConfirmation &&
    !calculationAssumptions.assumeEachOccurrenceSeparate
      ? {
          title: "반복 치료의 방문 단위를 확인해주세요.",
          description: "동일 입원·같은 날 받은 치료인지, 각각 별도 방문인지 선택해야 합니다.",
        }
      : null,
  ].filter((issue): issue is { title: string; description: string } => issue !== null);

  const handleCalculate = () => {
    if (isCalculating || !isFinalConfirmationChecked) {
      return;
    }

    setIsCalculating(true);

    window.setTimeout(() => {
      navigate("/consumer/result");
    }, 900);
  };

  return (
    <AppShell currentStep={5}><main className="navy-page navy-confirm-page">
      <header className="page-header confirm-page-header">
        <span className="step-badge">STEP 5 · 입력 확인</span>
        <h1>입력한 내용이 맞는지 확인해주세요.</h1>
        <p className="page-description">
          같은 치료를 받는다고 보고, 현재 보험 유지와 5세대 전환을 비교합니다.
        </p>
      </header>

      {confirmationIssues.length > 0 && (
        <section className="planner-confirmation-summary" aria-labelledby="planner-confirmation-summary-title">
          <div className="planner-confirmation-summary__intro">
            <span>확인 필요</span>
            <h2 id="planner-confirmation-summary-title">
              계산 전에 확인할 항목이 {confirmationIssues.length}건 있습니다.
            </h2>
            <p>입력 내용을 수정하거나, 4단계에서 비교에 사용할 가정을 선택해주세요.</p>
          </div>
          <div className="planner-confirmation-summary__issues">
            {confirmationIssues.map((issue, index) => (
              <article key={issue.title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{issue.title}</strong>
                  <p>{issue.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="confirm-overview-grid">
      {/* STEP 1 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 5-1
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
              {displayInsurer({ generation: contract.generation, gen1Product: productCalculationSelections.gen1Product }, contract.insurer, contract.insurerLabel)}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              상품명
            </p>

            <strong>
              {displayProductName({ generation: contract.generation, gen1Product: productCalculationSelections.gen1Product }, contract.productName, contract.productLabel)}
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
              보험료
            </p>

            <strong>
              월 {contract.monthlyPremium.toLocaleString()}원 · 연 {currentAnnualPremium.toLocaleString()}원
            </strong>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <p className="amount-label" style={{ margin: 0, whiteSpace: "nowrap" }}>보험료 갱신 주기</p>
              <CycleHelp title="보험료 갱신 주기" description="보험료가 다시 정해지는 주기입니다." />
            </div>
            <strong>{contract.renewalCycleMonths === null ? "모름" : `${contract.renewalCycleMonths}개월`}</strong>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <p className="amount-label" style={{ margin: 0, whiteSpace: "nowrap" }}>재가입 주기</p>
              <CycleHelp title="재가입 주기" description="보장 조건을 다시 정해 가입하는 주기입니다." />
            </div>
            <strong>{contract.reentryCycleMonths === null ? "모름" : `${contract.reentryCycleMonths}개월`}</strong>
          </div>

          {contract.generation === 1 ? (
            <>
              <div>
                <p className="amount-label">0904.2 상품</p>
                <strong>{productCalculationSelections.gen1Product === "SAMSUNG_0904_2" ? "선택됨" : gen1CompanyLabel(productCalculationSelections.gen1Product) ? `${gen1CompanyLabel(productCalculationSelections.gen1Product)} (계산 미지원)` : "확인 필요"}</strong>
              </div>
              <div>
                <p className="amount-label">D1 담보</p>
                <strong>{productCalculationSelections.gen1D1Coverage === "BOTH" ? "상해·질병 모두" : productCalculationSelections.gen1D1Coverage === "INJURY" ? "상해 D1" : productCalculationSelections.gen1D1Coverage === "DISEASE" ? "질병 D1" : productCalculationSelections.gen1D1Coverage === "NONE" ? "가입한 특약 없음" : "확인 필요"}</strong>
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
                  보장 유형
                </p>

                <strong>
                  {GEN23_VARIANT_LABELS[productCalculationSelections.samsungGen23Variant]}
                </strong>
              </div>

              {contract.generation === 3 && GEN3_RIDERS.map(({ key, label }) => (
                <div key={key}>
                  <p className="amount-label">{label}</p>
                  <strong>
                    {productCalculationSelections.gen3Riders?.[key] === "ENROLLED"
                      ? "가입"
                      : productCalculationSelections.gen3Riders?.[key] === "NOT_ENROLLED"
                      ? "미가입"
                      : "선택 안 함"}
                  </strong>
                </div>
              ))}
            </>
          ) : contract.generation === 5 ? (
            <>
              <div>
                <p className="amount-label">
                  중증 질환 비급여 보장 (특약1)
                </p>

                <strong>
                  {contract.coverages.includes(
                    "SPECIAL_RIDER_1"
                  )
                    ? "가입"
                    : "미가입"}
                </strong>
              </div>

              <div>
                <p className="amount-label">
                  그 외 비급여 보장 (특약2)
                </p>

                <strong>
                  {contract.coverages.includes(
                    "SPECIAL_RIDER_2"
                  )
                    ? "가입"
                    : "미가입"}
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
                  ? "가입"
                  : "미가입"}
              </strong>
            </div>
          )}
        </div>
      </section>

      {/* STEP 2 */}
      <section className="compare-card">
        <span className="step-badge">
          STEP 5-2
        </span>

        <h2 className="card-title">
          5세대로 바꿀 때의 조건
        </h2>
          <p className="notice-box">삼성 5세대 전환 상품 · 전환 가능 여부와 기존 치료의 보장 조건: {calculationAssumptions.targetContractFacts?.conversionEligibilityConfirmed === true ? '확인 완료' : '아직 확인하지 않음 · 전환 가능하다고 가정해 비교합니다.'}</p>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              전환 후 비교할 보험료
            </p>

            <strong>
              월 {target5GMonthlyPremium.toLocaleString()}원 · 연 {targetAnnualPremium.toLocaleString()}원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              중증 질환 비급여 보장 (특약1)
            </p>

            <strong>
              {target5GCoverages.includes(
                "SPECIAL_RIDER_1"
              )
                ? "가입"
                : "미가입"}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              그 외 비급여 보장 (특약2)
            </p>

            <strong>
              {target5GCoverages.includes(
                "SPECIAL_RIDER_2"
              )
                ? "가입"
                : "미가입"}
            </strong>
          </div>
        </div>

        <div className="notice-box warning">
          입력한 5세대 보험료는 비교용 금액입니다. 실제 전환 보험료는 보험사에 확인해주세요.
        </div>
      </section>

      {/* STEP 3 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 5-3
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

                </div>

                <p className="treatment-meta">
                  {contract.generation === 2 || contract.generation === 3
                    ? gen23CareSettingLabel(usage)
                    : usage.careSetting === "OUTPATIENT" ? "통원" : "입원"}
                  {" · "}
                  {usage.benefitClass === "COVERED" ? "급여" : usage.benefitClass === "NON_COVERED" ? "비급여" : (
                    <span className="planner-value-warning">급여 여부 모름</span>
                  )}
                  {usage.benefitClass === "NON_COVERED" && (
                    <>
                      {" · "}
                      {usage.severityClass === "SEVERE" ? "중증" : usage.severityClass === "NON_SEVERE" ? "비중증" : (
                        <span className="planner-value-warning">중증 여부 확인 필요</span>
                      )}
                    </>
                  )}
                </p>

                <div className="planner-treatment-core">
                  <div className="planner-treatment-core__annual">
                    <span>연간 치료비</span>
                    <strong>{treatmentCost.toLocaleString()}원</strong>
                  </div>
                  <div>
                    <span>한 번 치료받을 때 내는 금액</span>
                    <strong>{perOccurrenceMedicalCost.toLocaleString()}원</strong>
                  </div>
                  <div>
                    <span>1년 동안 받을 횟수</span>
                    <strong>{usage.frequency}회</strong>
                  </div>
                  <div>
                    <span>보험 계산에 포함할 의료비</span>
                    <strong>{usage.coveredAmount === undefined ? "미입력 · 확인 필요" : `${usage.coveredAmount.toLocaleString()}원`}</strong>
                  </div>
                </div>

                <details className="planner-treatment-details">
                  <summary>치료 세부 정보 보기</summary>
                  <table className="gen23-summary-table"><tbody>
                    <tr className="gen23-summary-item"><th scope="row" className="gen23-summary-label">진료 예정일</th><td className="gen23-summary-value"><span className={`gen23-summary-value${!usage.treatmentDate ? " is-unknown" : ""}`}>{usage.treatmentDate ?? "미입력"}</span></td></tr>
                    <tr className="gen23-summary-item"><th scope="row" className="gen23-summary-label">의료기관 종별</th><td className="gen23-summary-value"><span className={`gen23-summary-value${!usage.institutionType ? " is-unknown" : ""}`}>{usage.institutionType === "CLINIC_HOSPITAL" ? "병·의원" : usage.institutionType === "GENERAL_TERTIARY" ? "종합·상급종합병원" : "미입력"}</span></td></tr>
                    <tr className="gen23-summary-item"><th scope="row" className="gen23-summary-label">건강보험 본인부담 비율</th><td className="gen23-summary-value"><span className={`gen23-summary-value${usage.healthInsuranceCopayRate === undefined ? " is-unknown" : ""}`}>{usage.healthInsuranceCopayRate === undefined ? "미입력" : `${(usage.healthInsuranceCopayRate * 100).toLocaleString()}%`}</span></td></tr>
                  </tbody></table>
                  {(contract.generation === 2 || contract.generation === 3) && <Gen23Summary generation={contract.generation} usage={usage} />}
                </details>
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
            급여 통원 치료 중 건강보험 본인부담 비율 또는
            의료기관 종별이 비어 있는 항목이 있습니다.
            해당 값이 필요한 계산은 임의 대표값을 사용하지 않고
            확인 필요로 표시합니다.
          </div>
        )}
      </section>

      {/* STEP 5 */}
      <section className="app-card">
        <span className="step-badge">
          STEP 5-4
        </span>

        <h2 className="card-title">
          이번 비교에서 가정한 내용
        </h2>

        <p className="card-description">
          4단계에서 선택한 조건입니다. 실제 보장 여부가 확인된 사실과, 비교를 위해 가정한 내용을 구분해 확인해주세요.
        </p>

        <div className="planner-comparison-basis">
          <span>비교 기간</span>
          <strong>같은 치료를 1년 동안 받는다고 보고 두 보험을 비교합니다.</strong>
        </div>

        <div role="region" className="planner-assumption-list" aria-label="선택한 계산 가정 확인">
          <article className="planner-assumption-item"><strong>보장 제외 여부</strong><p>{calculationAssumptions.assumeNoPolicyExclusions ? '아직 확인하지 않은 치료에는 보장 제외 사유가 없다고 가정합니다. 이미 확인된 제외 사유는 그대로 반영합니다.' : '확인한 내용만 반영합니다. 보장 제외 여부를 모르는 치료는 확인이 필요합니다.'}</p></article>
          <article className="planner-assumption-item"><strong>보험 계산에 포함할 의료비</strong><p>{missingCoveredAmountCount === 0 ? '입력한 보장대상 의료비를 사용합니다. 공제금과 한도는 각 보험 기준으로 적용합니다.' : calculationAssumptions.assumeEntireMedicalCostCovered ? '보장대상 금액을 따로 입력하지 않은 치료는 내가 내는 의료비 전액을 계산에 포함합니다. 실제 지급액은 공제금과 한도에 따라 달라집니다.' : '보장대상 금액을 입력하지 않은 치료는 확인이 필요합니다.'}</p></article>
          <article className="planner-assumption-item"><strong>이미 사용한 보험금·횟수</strong><p>{calculationAssumptions.comparisonBasis !== 'REMAINING_LIMITS' ? <>두 보험 모두 기존 사용분이 없는 상태에서<br />1년 비교를 시작합니다.</> : calculationAssumptions.assumeNoPriorLimitUsage ? '현재 보험은 입력한 기존 사용분을 반영하고, 빈 값만 0으로 가정합니다. 5세대는 사용분 없이 시작합니다.' : '현재 보험은 입력한 기존 사용분을 반영합니다. 모르는 사용분은 확인이 필요합니다. 5세대는 사용분 없이 시작합니다.'}</p></article>
          <article className="planner-assumption-item"><strong>반복 치료</strong><p>{calculationAssumptions.assumeEachOccurrenceSeparate ? '입력한 치료 횟수마다 별도로 방문해 치료받는다고 가정합니다.' : '입력한 방문 구분을 사용합니다. 반복 치료가 같은 날 또는 같은 입원 중인지 모르면 확인이 필요합니다.'}</p></article>
          {calculationAssumptions.assumeManualTherapyImprovement && <article className="planner-assumption-item"><strong>도수치료 10회 이후</strong><p>10회 이후에도 증상이 나아지는 것으로 확인되어 보장된다고 가정합니다.</p></article>}
          {calculationAssumptions.assumeNonSevereNonCovered && <article className="planner-assumption-item"><strong>5세대 비급여 중증 여부</strong><p>산정특례 질환 치료가 아닌 비중증 비급여로 가정합니다.</p></article>}
          {calculationAssumptions.assumeNonCoveredInpatientSmallHospital && <article className="planner-assumption-item"><strong>5세대 비급여 입원 의료기관</strong><p>종합·상급종합병원이 아닌 병원에서 입원하는 것으로 가정합니다. (1회 입원 한도 300만원 적용)</p></article>}
          <button type="button" className="planner-assumption-edit" onClick={() => navigate('/consumer/input#input-step-4')}>비교 가정 수정하기</button>
        </div>

        <details className="planner-calculation-details">
          <summary>계산 방식 자세히 보기</summary>
          <table className="gen23-summary-table"><tbody>
            <tr><th scope="row" className="gen23-summary-label">비교 대상</th><td className="gen23-summary-value">현재 {contract.generation}세대 보험 유지와 5세대 전환</td></tr>
            <tr><th scope="row" className="gen23-summary-label">보험료</th><td className="gen23-summary-value">입력한 월 보험료 × 12개월</td></tr>
            <tr><th scope="row" className="gen23-summary-label">예상 보험금</th><td className="gen23-summary-value">치료마다 각 보험의 보장 조건과 한도를 적용해 합산합니다.</td></tr>
            <tr><th scope="row" className="gen23-summary-label">1년 동안의 총부담</th><td className="gen23-summary-value">1년 보험료 + 내가 내는 전체 의료비 − 예상 보험금</td></tr>
          </tbody></table>
        </details>

      </section>

      </div>

      <section className="calculation-agreement planner-final-confirmation" aria-labelledby="planner-final-confirmation-title">
        <h2 id="planner-final-confirmation-title" className="calculation-agreement__title" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          비교 전 마지막 확인
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 14px",
            borderRadius: "999px",
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            color: "#92400E",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.01em",
          }}>
            이 결과가 전환을 권유하는 것은 아닙니다.
          </span>
        </h2>

        <label className={`calculation-agreement__check${isFinalConfirmationChecked ? " is-confirmed" : ""}`}>
          <input
            type="checkbox"
            checked={isFinalConfirmationChecked}
            onChange={(event) => setIsFinalConfirmationChecked(event.target.checked)}
          />
          <span>
            <strong>현재 보험, 5세대 조건, 예정 치료와 비교 가정을 확인했습니다.</strong>
            <small>확인한 내용으로 두 보험의 1년 부담을 비교합니다.</small>
          </span>
        </label>

        <div className="notice-box warning">
          입력한 내용과 가정에 따른 모의 비교입니다. 계산에 꼭 필요한 조건을 모르면 해당 결과는 확인이 필요합니다.
          실제 보험금, 전환 가능 여부와 보험료는 보험사에 확인해주세요.
        </div>
      </section>

      <div className="button-group">
        <button
          type="button"
          className="secondary-button"
          disabled={isCalculating}
          onClick={() =>
            navigate("/consumer/input#input-step-4")
          }
        >
          이전
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={isCalculating || !isFinalConfirmationChecked}
          onClick={handleCalculate}
        >
          {isCalculating
            ? "계산 준비 중..."
            : "비교 결과 보기"}
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
