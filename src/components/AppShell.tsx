import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import mainLogo from "../assets/main-logo.png";

import { useAnalysisStore } from "../store/useAnalysisStore";
import ModeToggle from "./ModeToggle";
import { useAppMode } from "./useAppMode";
import "../styles/app-shell.css";

type AppStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type AppShellProps = {
  children: ReactNode;
  currentStep: AppStep;
  onStepChange?: (step: AppStep) => void;
  onReset?: () => void;
  showMvpNotice?: boolean;
  hideResetButton?: boolean;
};

const STEP_ITEMS: Array<{
  step: AppStep;
  label: string;
}> = [
  {
    step: 1,
    label: "고객 정보",
  },
  {
    step: 2,
    label: "예정 치료",
  },
  {
    step: 3,
    label: "5세대 조건",
  },
  {
    step: 4,
    label: "명시적 계산 가정",
  },
  {
    step: 5,
    label: "입력 확인"
  },
  {
    step: 6,
    label: "비교 결과",
  },
  {
    step: 7,
    label: "보험 이해 도우미",
  },
];

function AppShell({
  children,
  currentStep,
  onStepChange,
  onReset,
  showMvpNotice = true,
  hideResetButton = false,
}: AppShellProps) {
  const navigate = useNavigate();

  const resetAnalysis = useAnalysisStore(
    (state) => state.resetAnalysis
  );

  const mode = useAnalysisStore((state) => state.mode);

  const [isResetModalOpen, setIsResetModalOpen] =
    useState(false);

  const handleStepClick = (step: AppStep) => {
    if (step >= 6 && currentStep < 6) {
      return;
    }

    if (onStepChange) {
      onStepChange(step);
      return;
    }

    if (step <= 4) {
      navigate(`/input#input-step-${step}`);
      return;
    }

    if (step === 5) { navigate("/confirm"); return; }

    if (step === 6) {
      navigate("/result");
      return;
    }

    navigate("/chat");
  };

  const handleBrandClick = () => {
    navigate("/");
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

  const progressPercent = `${Math.min(currentStep, 7) / 7 * 100}%`;

  useAppMode("planner");

  return (
    <>
      <header className="app-shell-header">
        <div className="app-shell-nav">
          <button
            type="button"
            className="app-shell-brand"
            onClick={handleBrandClick}
            aria-label="AI 실손 닥터 첫 화면으로 이동"
          >
            <img
              className="app-shell-logo"
              src={mainLogo}
              alt=""
              aria-hidden="true"
            />

            <span>AI 실손 닥터</span>
          </button>

          <ModeToggle mode={mode} locked />

          <div className="app-shell-nav-right">
            <span className="app-shell-privacy">
              <span
                className="app-shell-privacy-dot"
                aria-hidden="true"
              />
              서버 저장 없이 브라우저에서 계산
            </span>

            {!hideResetButton && (
              <button
                type="button"
                className="app-shell-text-button"
                onClick={handleOpenReset}
              >
                전체 초기화
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="app-shell-layout">
        <aside className="app-shell-sidebar">
          <div className="app-shell-side-kicker">
            INSURANCE SWITCH LAB
          </div>

          <h2 className="app-shell-side-title">
            동일한 의료 이용 조건에서
            <br />
            두 개의 계약으로 비교합니다.
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

              const isDisabled = item.step >= 6 && currentStep < 6;

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
            {`${currentStep} / 7 · ${STEP_ITEMS[currentStep - 1].label}`}
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
              전체 입력값을 초기화할까요?
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
