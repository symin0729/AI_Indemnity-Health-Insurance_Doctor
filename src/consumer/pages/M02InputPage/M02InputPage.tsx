import AppShell from "../../components/AppShell";
import { GEN23_UNREGISTERED_NOTE } from "../../../domain/samsungGen23Variant";
import { createPortal } from "react-dom";
import "../../../styles/M02-input.css";
import Step1Contract from "./Step1Contract";
import Step2Compare from "./Step2Compare";
import Step2Treatment from "./Step2Treatment";
import Step3Assumptions from "./Step3Assumptions";
import { useM02Form } from "./useM02Form";

function M02InputPage() {
  const form = useM02Form();
  const {
    activeStep,
    errorMessage,
    goToInputStep,
    handleCancelRemoveTreatment,
    handleCancelResetAll,
    handleConfirmRemoveTreatment,
    handleConfirmResetAll,
    handleLoadSampleTreatments,
    handleNext,
    handleStep1Next,
    handleStep2Next,
    isResetModalOpen,
    isStep3Confirmed,
    isTargetPremiumHelpConfirmed,
    isTreatmentHelpConfirmed,
    isVariantUnregistered,
    navigate,
    patientCostHelpDialogRef,
    pendingDeleteUsage,
    setIsTreatmentHelpConfirmed,
    showTargetPremiumHelp,
    transitionDirection,
    treatmentHelpDialogRef,
    treatmentSampleDialogRef,
  } = form;

  return (
    <AppShell currentStep={activeStep} onReset={handleConfirmResetAll} hideResetButton
      onStepChange={(step) => {
        if (step === 4) { handleNext(); return; }
        if (step === 3 && activeStep === 2) { handleStep2Next(); return; }
        if (step === 3 && !isTargetPremiumHelpConfirmed) {
          showTargetPremiumHelp();
          return;
        }
        if (step === 1 || step === 2 || step === 3) goToInputStep(step);
      }}>
    <main className="navy-page navy-input-page">
      {isVariantUnregistered && (
        <div
          id="variant-unregistered-banner"
          role="alert"
          className="notice-box error"
        >
          {GEN23_UNREGISTERED_NOTE}
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          tabIndex={-1}
          id="input-errors"
          className="notice-box error"
        >
          {errorMessage}
        </div>
      )}

      {/* 입력 1단계: 내 보험 정보 (왼쪽 단계 목록의 1) */}
      <div className="workflow-panel" data-direction={transitionDirection} hidden={activeStep !== 1}>
      <Step1Contract form={form} />
      </div>

      {/* 입력 2단계: 5세대 전환 비교 + 예정 치료 (단계 목록의 2) */}
      <div className="workflow-panel" data-direction={transitionDirection} hidden={activeStep !== 2}>
      <Step2Compare form={form} />

      {/* 입력 2단계의 두 번째 카드: 예정 치료 입력 */}
      <Step2Treatment form={form} />
      </div>

      {/* 입력 3단계: 계산 가정 (단계 목록의 3) */}
      <div className="workflow-panel" data-direction={transitionDirection} hidden={activeStep !== 3}>
      <Step3Assumptions form={form} />
      </div>

      <div className="button-group">
        <button
          type="button"
          className="secondary-button"
          onClick={() => activeStep === 1 ? navigate("/?mode=consumer") : goToInputStep((activeStep - 1) as 1 | 2)}
        >
          이전
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={activeStep === 3 && (!isStep3Confirmed || !isTreatmentHelpConfirmed)}
          onClick={() => {
            if (activeStep === 1) handleStep1Next();
            else if (activeStep === 2) handleStep2Next();
            else handleNext();
          }}
        >
          {activeStep < 3 ? "다음 단계" : "입력 정보 확인하기"}
        </button>
      </div>

      <dialog id="patient-cost-dialog" ref={patientCostHelpDialogRef} className="treatment-help-dialog" aria-labelledby="patient-cost-title" aria-describedby="patient-cost-help" onClick={(event) => {
        if (event.target === event.currentTarget) patientCostHelpDialogRef.current?.close();
      }}>
        <section className="app-card" style={{ margin: 0 }}>
          <h2 id="patient-cost-title" className="card-title">한 번 진료받을 때 내가 내는 금액</h2>
          <p id="patient-cost-help">진료비 영수증의 환자부담금 합계(급여 본인부담금 + 비급여)를 입력하세요. 보험사에서 돌려받을 금액은 빼지 않습니다. 진료 전이라면 병원에서 안내받은 예상 금액을 입력하세요.</p>
          <p>정밀 계산 항목은 확인되는 값만 입력하세요. 모르는 값은 비워두면 임의로 추정하지 않고 결과에서 확인 필요로 표시합니다.</p>
          <div className="button-group"><button type="button" className="primary-button" autoFocus onClick={() => patientCostHelpDialogRef.current?.close()}>닫기</button></div>
        </section>
      </dialog>

      <dialog ref={treatmentSampleDialogRef} className="treatment-help-dialog" aria-labelledby="treatment-sample-title">
        <section className="app-card" style={{ margin: 0 }}>
          <h2 id="treatment-sample-title" className="card-title">치료 샘플 선택</h2>
          <p>내 상황과 가까운 입력 예제를 선택하세요. 금액과 계약 조건은 연습용 가정입니다. 횟수와 급여 여부는 불러온 뒤 직접 입력해주세요.</p>
          <div style={{ display: "grid", gap: "12px" }}>
            <button type="button" className="sample-button" onClick={() => handleLoadSampleTreatments("OUTPATIENT")}>일반 외래 진료</button>
            <button type="button" className="sample-button" onClick={() => handleLoadSampleTreatments("EXAM")}>외래 검사</button>
            <button type="button" className="sample-button" onClick={() => handleLoadSampleTreatments("MRI")}>MRI 검사</button>
            <button type="button" className="secondary-button" onClick={() => treatmentSampleDialogRef.current?.close()}>닫기</button>
          </div>
        </section>
      </dialog>

      <dialog
        ref={treatmentHelpDialogRef}
        className="treatment-help-dialog"
        aria-labelledby="treatment-help-title"
        aria-describedby="treatment-help-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) treatmentHelpDialogRef.current?.close();
        }}
      >
        <section className="app-card" style={{ margin: 0 }}>
          <h2 id="treatment-help-title" className="card-title">필수 항목을 정확하게 입력해주세요</h2>
          <p id="treatment-help-description" className="card-description">
            ‘필수’로 표시된 항목을 실제 정보에 맞게 입력할수록, 내 상황에 맞는 비교 결과를 확인하는 데 도움이 됩니다.
            항목이 비어 있거나 실제와 다른 값을 입력하면 계산이 제한되거나 결과가 달라질 수 있습니다.
          </p>
          <p>진료비는 영수증이나 병원의 예상 비용을 참고하고, 모르는 값은 임의로 채우지 마세요. 샘플을 불러왔다면 본인의 치료·계약 정보로 수정해주세요.</p>
          <p>입력을 모두 완료해도 실제 보험금 지급액이 확정되는 것은 아닙니다.</p>
          <div className="button-group">
            <button type="button" className="primary-button" autoFocus onClick={() => { setIsTreatmentHelpConfirmed(true); treatmentHelpDialogRef.current?.close(); }}>확인</button>
          </div>
        </section>
      </dialog>

      {isResetModalOpen && createPortal(
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelResetAll();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "start center",
            padding: "clamp(48px, 12vh, 120px) 20px 20px",
            overflowY: "auto",
            background:
              "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(4px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="input-reset-dialog-title"
            aria-describedby="input-reset-dialog-description"
            className="app-card"
            style={{
              width: "min(100%, 460px)",
              margin: 0,
              padding:
                "clamp(22px, 5vw, 30px)",
              boxSizing: "border-box",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.24)",
            }}
          >
            <span className="step-badge">
              입력 초기화
            </span>

            <h2
              id="input-reset-dialog-title"
              className="card-title"
              style={{ marginTop: "10px" }}
            >
              입력 내용을 모두 지울까요?
            </h2>

            <p
              id="input-reset-dialog-description"
              className="card-description"
            >
              현재 계약, 5세대 비교 조건, 예정 치료와 계산 가정이 모두 초기화됩니다.
            </p>

            <div
              className="button-group"
              style={{ marginTop: "22px" }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelResetAll}
                autoFocus
              >
                취소
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmResetAll}
              >
                초기화
              </button>
            </div>
          </section>
        </div>
        ,
        document.body
      )}

      {pendingDeleteUsage && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelRemoveTreatment();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background:
              "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(4px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="treatment-delete-dialog-title"
            aria-describedby="treatment-delete-dialog-description"
            className="app-card"
            style={{
              width: "min(100%, 460px)",
              margin: 0,
              padding:
                "clamp(22px, 5vw, 30px)",
              boxSizing: "border-box",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.24)",
            }}
          >
            <span className="step-badge">
              예정 치료 삭제
            </span>

            <h2
              id="treatment-delete-dialog-title"
              className="card-title"
              style={{ marginTop: "10px" }}
            >
              이 치료를 삭제할까요?
            </h2>

            <p
              id="treatment-delete-dialog-description"
              className="card-description"
            >
              “{pendingDeleteUsage.treatmentName}” 항목이 예정 치료 목록에서 삭제됩니다.
            </p>

            <div
              className="button-group"
              style={{ marginTop: "22px" }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelRemoveTreatment}
                autoFocus
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleConfirmRemoveTreatment}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  minHeight: "48px",
                  padding: "0 18px",
                  border: "1px solid #dc2626",
                  borderRadius: "12px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    "0 6px 16px rgba(220, 38, 38, 0.18)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 7L7.2 19C7.2352 19.6048 7.7359 20.0769 8.3417 20.0769H15.6583C16.2641 20.0769 16.7648 19.6048 16.8 19L17.5 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11V16M14 11V16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                삭제
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
    </AppShell>
  );
}

export default M02InputPage;
