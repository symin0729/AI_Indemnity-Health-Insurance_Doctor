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

  const hasPriorUsageInputForAllTreatments = usages.every((usage) => {
    const gen = contract.generation;
    if (gen === 1) return usage.gen1PriorPaidBenefit !== undefined || usage.gen1PriorServiceDays !== undefined || usage.samsungCalculationInput?.priorPaidBenefit !== undefined;
    if (gen === 2 || gen === 3) return usage.gen23PriorPaidBenefit !== undefined || usage.gen23PriorAnnualCount !== undefined || usage.gen23PriorEligibleDeductible !== undefined;
    return usage.samsungCalculationInput?.priorPaidBenefit !== undefined || usage.samsungCalculationInput?.priorAnnualCount !== undefined;
  });

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
        <h1>계산 전 정보를 확인해주세요.</h1>
        <p className="page-description">
          현재 계약과 5세대에 동일한 의료이용 조건을 적용합니다.
        </p>
      </header>

      {confirmationIssues.length > 0 && (
        <section className="planner-confirmation-summary" aria-labelledby="planner-confirmation-summary-title">
          <div className="planner-confirmation-summary__intro">
            <span>확인 필요</span>
            <h2 id="planner-confirmation-summary-title">
              계산 전에 확인할 항목이 {confirmationIssues.length}건 있습니다.
            </h2>
            <p>입력 내용을 수정하거나 4단계 명시적 계산 가정에서 적용할 조건을 선택해주세요.</p>
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
            <p className="amount-label">
              갱신·재가입 주기
            </p>

            <strong>
              갱신 {contract.renewalCycleMonths === null ? "모름" : `${contract.renewalCycleMonths}개월`}
              {" · "}
              재가입 {contract.reentryCycleMonths === null ? "모름" : `${contract.reentryCycleMonths}개월`}
            </strong>
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
                  상품 종형
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
          STEP 5-2
        </span>

        <h2 className="card-title">
          5세대 계약전환 조건 확인
        </h2>
          <p className="notice-box">삼성 5세대 계약전환형 · 전환 자격·계속 치료 조건: {calculationAssumptions.targetContractFacts?.conversionEligibilityConfirmed === true ? '확인 완료' : '미확인 — 계산 보류'}</p>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              비교 보험료
            </p>

            <strong>
              월 {target5GMonthlyPremium.toLocaleString()}원 · 연 {targetAnnualPremium.toLocaleString()}원
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
                    <span>회당 의료비</span>
                    <strong>{perOccurrenceMedicalCost.toLocaleString()}원</strong>
                  </div>
                  <div>
                    <span>연간 횟수</span>
                    <strong>{usage.frequency}회</strong>
                  </div>
                  <div>
                    <span>치료 분류</span>
                    <strong>{usage.treatmentCategory ?? "미입력"}</strong>
                  </div>
                  <div>
                    <span>보장대상 인정금액 C</span>
                    <strong>{usage.coveredAmount === undefined ? "미입력 · 확인 필요" : `${usage.coveredAmount.toLocaleString()}원`}</strong>
                  </div>
                </div>

                <details className="planner-treatment-details">
                  <summary>정밀 계산 입력 보기</summary>
                  <ul className="gen23-summary-list">
                    <li className="gen23-summary-item"><span className="gen23-summary-label">진료 예정일</span><span className={`gen23-summary-value${!usage.treatmentDate ? " is-unknown" : ""}`}>{usage.treatmentDate ?? "미입력"}</span></li>
                    <li className="gen23-summary-item"><span className="gen23-summary-label">의료기관 종별</span><span className={`gen23-summary-value${!usage.institutionType ? " is-unknown" : ""}`}>{usage.institutionType === "CLINIC_HOSPITAL" ? "병·의원" : usage.institutionType === "GENERAL_TERTIARY" ? "종합·상급종합병원" : "미입력"}</span></li>
                    <li className="gen23-summary-item"><span className="gen23-summary-label">건강보험 본인부담률 r</span><span className={`gen23-summary-value${usage.healthInsuranceCopayRate === undefined ? " is-unknown" : ""}`}>{usage.healthInsuranceCopayRate === undefined ? "미입력" : `${(usage.healthInsuranceCopayRate * 100).toLocaleString()}%`}</span></li>
                  </ul>
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
            급여 통원 치료 중 건강보험 본인부담률 r 또는
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
          계산 기준 및 추가 확인
        </h2>

        <p className="card-description">
          4단계에서 선택한 가정과 비교 기준입니다. 변경하려면 명시적 계산 가정 페이지로 돌아가세요.
        </p>

        <div className="planner-comparison-basis">
          <span>비교 기준</span>
          <strong>1년 · 현재 계약과 5세대에 동일한 의료 이용 조건 적용</strong>
        </div>

        <div role="region" className="planner-assumption-list" aria-label="선택한 계산 가정 확인">
          <article className="planner-assumption-item"><strong>보장 제외 사유</strong><p>{calculationAssumptions.assumeNoPolicyExclusions ? '미확인 치료에는 보장 제외 사유가 없다는 가정 적용' : '확인된 사실만 적용하며 미확인 조건은 확인 필요로 표시'}</p></article>
          <article className="planner-assumption-item"><strong>보장대상 인정금액(C)</strong><p>{missingCoveredAmountCount === 0 ? '입력한 인정금액 사용' : calculationAssumptions.assumeEntireMedicalCostCovered ? '미입력 치료는 환자부담 의료비 전액을 보장대상 금액으로 가정' : '미입력 보장대상 금액은 확인 필요로 표시'}</p></article>
          <article className="planner-assumption-item"><strong>비교 시작 조건과 기존 사용분</strong><p>{calculationAssumptions.comparisonBasis !== 'REMAINING_LIMITS' ? '한도 사용 전부터 1년 비교: 양쪽 계약 모두 기존 사용분 0에서 시작' : calculationAssumptions.assumeNoPriorLimitUsage ? '현재 계약의 입력한 기존 사용분을 반영하고 빈 값만 0으로 가정. 5세대는 기존 사용분 0에서 시작' : '현재 계약의 입력한 기존 사용분 반영. 미확인 사용분은 확인 필요로 표시. 5세대는 기존 사용분 0에서 시작'}</p></article>
          <article className="planner-assumption-item"><strong>치료 방문·합산 단위</strong><p>{calculationAssumptions.assumeEachOccurrenceSeparate ? '반복 치료를 각각 별도 방문으로 가정' : '입력한 방문 구분을 사용하고 미확인 반복 치료는 확인 필요로 표시'}</p></article>
          {calculationAssumptions.assumeManualTherapyImprovement && <article className="planner-assumption-item"><strong>도수치료 10회 이후</strong><p>증상 개선이 확인되어 보상된다고 가정(4·5세대 약관의 최초 10회 이후 조건)</p></article>}
          {calculationAssumptions.assumeNonSevereNonCovered && <article className="planner-assumption-item"><strong>5세대 비급여 중증 여부</strong><p>산정특례 질환 치료가 아닌 비중증 비급여로 가정</p></article>}
          {calculationAssumptions.assumeNonCoveredInpatientSmallHospital && <article className="planner-assumption-item"><strong>5세대 비급여 입원 의료기관</strong><p>종합·상급종합병원이 아닌 병원(1회 입원 한도 300만원 적용)으로 가정</p></article>}
          <button type="button" className="planner-assumption-edit" onClick={() => navigate('/consumer/input#input-step-4')}>명시적 계산 가정 수정하기</button>
        </div>

        <details className="planner-calculation-details">
          <summary>계산 방식 자세히 보기</summary>
          <div className="form-grid">
            <div><p className="amount-label">적용 규칙</p><strong>{contract.generation}세대 상품별 실행 스펙</strong></div>
            <div><p className="amount-label">검산 상태</p><strong>초안 검산</strong></div>
            <div><p className="amount-label">보험료 계산</p><strong>월 보험료 × 12개월</strong></div>
            <div><p className="amount-label">치료비 계산</p><strong>회차별 약관 계산 후 연간 합산</strong></div>
            <div><p className="amount-label">총부담 계산</p><strong>연 보험료 + ΣM - ΣI</strong></div>
          </div>
        </details>

      </section>

      </div>

      <section className="calculation-agreement planner-final-confirmation" aria-labelledby="planner-final-confirmation-title">
        <h2 id="planner-final-confirmation-title" className="calculation-agreement__title">
          입력 정보와 계산 기준 최종 확인
        </h2>

        <label className={`calculation-agreement__check${isFinalConfirmationChecked ? " is-confirmed" : ""}`}>
          <input
            type="checkbox"
            checked={isFinalConfirmationChecked}
            onChange={(event) => setIsFinalConfirmationChecked(event.target.checked)}
          />
          <span>
            <strong>입력한 계약·담보·예정 치료와 선택한 계산 가정을 확인했습니다.</strong>
            <small>현재 선택된 개별 계산 가정을 적용해 비교안을 계산합니다.</small>
          </span>
        </label>

        <div className="notice-box warning">
          본 비교는 사용자가 확인한 입력값과 상품별 실행 스펙을 이용한 초안 검산입니다.
          미확인 조건은 계산을 보류합니다. 실제 보험금, 가입 가능 여부, 전환 보험료를
          확정하지 않으며 보험상품 전환을 권유하지 않습니다.
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
