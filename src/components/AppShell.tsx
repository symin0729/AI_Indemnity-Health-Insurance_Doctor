import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import headerLogo from "../assets/header-logo.png";

import { useAnalysisStore } from "../store/useAnalysisStore";

type AppStep = 1 | 2 | 3 | 4 | 5;

type AppShellProps = {
  children: ReactNode;
  currentStep: AppStep;
  onStepChange?: (step: AppStep) => void;
  onReset?: () => void;
  showMvpNotice?: boolean;
};

const STEP_ITEMS: Array<{
  step: AppStep;
  label: string;
}> = [
  {
    step: 1,
    label: "내 보험 정보",
  },
  {
    step: 2,
    label: "5세대·치료",
  },
  {
    step: 3,
    label: "계산 가정",
  },
  {
    step: 4,
    label: "입력 확인",
  },
  {
    step: 5,
    label: "비교 결과",
  },
];

function AppShell({
  children,
  currentStep,
  onStepChange,
  onReset,
  showMvpNotice = true,
}: AppShellProps) {
  const navigate = useNavigate();

  const resetAnalysis = useAnalysisStore(
    (state) => state.resetAnalysis
  );

  const [isResetModalOpen, setIsResetModalOpen] =
    useState(false);

  const handleStepClick = (step: AppStep) => {
    if (step === 5 && currentStep < 5) {
      return;
    }

    if (onStepChange) {
      onStepChange(step);
      return;
    }

    if (step <= 3) {
      navigate(`/input#input-step-${step}`);
      return;
    }

    if (step === 4) {
      navigate("/confirm");
      return;
    }

    navigate("/result");
  };

  const handleBrandClick = () => {
    if (onStepChange) {
      onStepChange(1);
      return;
    }

    navigate("/input");
  };

  const handleOpenReset = () => {
    setIsResetModalOpen(true);
  };

  const handleCloseReset = () => {
    setIsResetModalOpen(false);
  };

  const handleConfirmReset = () => {
    setIsResetModalOpen(false);

    if (onReset) {
      onReset();
      return;
    }

    resetAnalysis();
    navigate("/input");
  };

  const progressPercent = `${currentStep * 20}%`;

  return (
    <>
      <header className="app-shell-header">
        <div className="app-shell-nav">
          <button
            type="button"
            className="app-shell-brand"
            onClick={handleBrandClick}
            aria-label="AI 실손 닥터 첫 입력 단계로 이동"
          >
            <img
              className="app-shell-logo"
              src={headerLogo}
              alt=""
              aria-hidden="true"
            />

            <span>AI 실손 닥터</span>
          </button>

          <div className="app-shell-nav-right">
            <span className="app-shell-privacy">
              <span
                className="app-shell-privacy-dot"
                aria-hidden="true"
              />
              서버 저장 없이 브라우저에서 계산
            </span>

            <button
              type="button"
              className="app-shell-text-button"
              onClick={handleOpenReset}
            >
              전체 초기화
            </button>
          </div>
        </div>
      </header>

      <div className="app-shell-layout">
        <aside className="app-shell-sidebar">
          <div className="app-shell-side-kicker">
            INDEMNITY INSURANCE LAB
          </div>

          <h2 className="app-shell-side-title">
            같은 의료이용,
            <br />
            두 계약으로 비교합니다.
          </h2>

          <nav
            className="app-shell-steps"
            aria-label="AI 실손 닥터 진행 단계"
          >
            {STEP_ITEMS.map((item) => {
              const isActive =
                item.step === currentStep;

              const isDone =
                item.step < currentStep;

              const isDisabled =
                item.step === 5 &&
                currentStep < 5;

              return (
                <button
                  key={item.step}
                  type="button"
                  className={[
                    "app-shell-step",
                    isActive
                      ? "active"
                      : "",
                    isDone
                      ? "done"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    handleStepClick(
                      item.step
                    )
                  }
                  aria-label={`${item.step}단계 ${item.label}`}
                  disabled={isDisabled}
                  aria-current={
                    isActive
                      ? "step"
                      : undefined
                  }
                >
                  <span
                    className="app-shell-step-number"
                    aria-hidden="true"
                  >
                    {item.step}
                  </span>

                  <span className="app-shell-step-label">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div
            className="app-shell-progress"
            aria-hidden="true"
          >
            <span
              className="app-shell-progress-bar"
              style={{
                width: progressPercent,
              }}
            />
          </div>

          <p className="app-shell-current-step" aria-live="polite">
            {currentStep} / 5 · {STEP_ITEMS[currentStep - 1].label}
          </p>
          <p className="app-shell-side-note">
            보험상품 권유나 보험금 지급 보장이
            아닌, 입력 조건과 명시적 가정에 따른
            모의 비교입니다.
          </p>

          {showMvpNotice && (
            <p className="app-shell-side-mvp" role="note">
              <strong>MVP 안내</strong>
              <br />
              공식 제도 자료와 대표 규칙을 바탕으로
              한 시연용 서비스입니다. 실제 전환 전
              보험사별 약관·특약·견적을 확인하세요.
            </p>
          )}
        </aside>

        <div className="app-shell-workspace">
          {children}
        </div>
      </div>

      {isResetModalOpen && (
        <div
          className="app-shell-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseReset();
            }
          }}
        >
          <section
            className="app-shell-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-shell-reset-title"
            aria-describedby="app-shell-reset-description"
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.preventDefault(); handleCloseReset(); }
              if (event.key === "Tab") {
                const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
              }
            }}
          >
            <h2 id="app-shell-reset-title">
              입력값을 초기화할까요?
            </h2>

            <p id="app-shell-reset-description">
              현재 비교를 위해 입력한 보험 정보,
              예정 치료와 계산 가정이 초기화됩니다.
            </p>

            <div className="app-shell-modal-actions">
              <button
                type="button"
                className="app-shell-button app-shell-button-secondary"
                onClick={handleCloseReset}
                autoFocus
              >
                취소
              </button>

              <button
                type="button"
                className="app-shell-button app-shell-button-primary"
                onClick={handleConfirmReset}
              >
                전체 초기화
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default AppShell;
