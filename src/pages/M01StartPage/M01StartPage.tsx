import { useState } from "react";
import { useNavigate } from "react-router-dom";

function M01StartPage() {
  const navigate = useNavigate();

  // ========================================
  // 필수 동의 상태
  // ========================================

  const [
    isCalculationConsentChecked,
    setIsCalculationConsentChecked,
  ] = useState(false);

  const [
    isMedicalInfoConsentChecked,
    setIsMedicalInfoConsentChecked,
  ] = useState(false);

  // 두 필수 동의를 모두 해야 시작 가능
  const canStart =
    isCalculationConsentChecked &&
    isMedicalInfoConsentChecked;

  // ========================================
  // 시작
  // ========================================

  const handleStart = () => {
    if (!canStart) {
      return;
    }

    navigate("/input");
  };

  return (
    <main>
      {/* ==============================
          HEADER
      ============================== */}

      <header className="page-header">
        <span className="page-brand">
          AI 실손 닥터
        </span>

        <h1>
          지금 실손보험,
          <br />
          5세대로 바꾸면 얼마나 달라질까요?
        </h1>

        <p className="page-description">
          현재 계약을 유지할 때와
          5세대로 전환한다고 가정했을 때의
          1년 예상 부담을 같은 의료이용 조건으로
          비교합니다.
        </p>
      </header>

      {/* ==============================
          서비스 흐름
      ============================== */}

      <section className="card-grid">
        <article className="app-card">
          <span className="step-badge">
            STEP 1
          </span>

          <h2 className="card-title">
            현재 보험 입력
          </h2>

          <p className="card-description">
            보험사, 상품명, 가입일,
            실손 세대와 월 보험료를
            입력합니다.
          </p>
        </article>

        <article className="app-card">
          <span className="step-badge">
            STEP 2
          </span>

          <h2 className="card-title">
            예정 치료 입력
          </h2>

          <p className="card-description">
            앞으로 예상되는 치료를
            최대 3건까지 입력합니다.
          </p>
        </article>

        <article className="app-card">
          <span className="step-badge">
            STEP 3
          </span>

          <h2 className="card-title">
            1년 부담 비교
          </h2>

          <p className="card-description">
            보험료, 자기부담금,
            보장 제외 의료비를 함께
            비교합니다.
          </p>
        </article>
      </section>

      {/* ==============================
          핵심 설명
      ============================== */}

      <section className="comparison-summary">
        <span className="status-badge primary">
          현재 계약 vs 5세대
        </span>

        <h2>
          보험료만이 아니라
          내가 실제로 부담할 비용을 함께 봅니다.
        </h2>

        <p>
          연 보험료와 예상 자기부담,
          보장 제외 의료비를 합산하여
          비교하고 확인되지 않은 조건은
          임의로 추정하지 않습니다.
        </p>
      </section>

      {/* ==============================
          필수 동의
      ============================== */}

      <section className="form-card">
        <span className="step-badge">
          시작 전 확인
        </span>

        <h2 className="card-title">
          필수 동의
        </h2>

        <p className="card-description">
          아래 두 항목에 모두 동의해야
          모의 비교를 시작할 수 있습니다.
        </p>

        {/* 계산 이용 동의 */}

        <div className="notice-box">
          <label>
            <input
              type="checkbox"
              checked={
                isCalculationConsentChecked
              }
              onChange={(e) =>
                setIsCalculationConsentChecked(
                  e.target.checked
                )
              }
            />{" "}
            <strong>
              [필수] 모의 계산 서비스 이용 동의
            </strong>
          </label>

          <p className="treatment-meta">
            사용자가 입력한 보험 및 치료 조건을
            이용해 현재 계약과 5세대의
            예상 부담을 모의 계산하는 것에
            동의합니다.
          </p>

          <details>
            <summary>
              자세히 보기
            </summary>

            <p className="treatment-meta">
              본 서비스는 보험상품 가입 또는
              전환을 권유하지 않으며 실제
              보험금 지급액이나 전환 보험료를
              확정하지 않습니다.
            </p>
          </details>
        </div>

        {/* 의료정보 이용 동의 */}

        <div className="notice-box">
          <label>
            <input
              type="checkbox"
              checked={
                isMedicalInfoConsentChecked
              }
              onChange={(e) =>
                setIsMedicalInfoConsentChecked(
                  e.target.checked
                )
              }
            />{" "}
            <strong>
              [필수] 의료이용 정보 처리 동의
            </strong>
          </label>

          <p className="treatment-meta">
            치료명, 입원·통원,
            급여·비급여 여부,
            중증 여부, 예상 횟수와 비용 등
            사용자가 입력한 정보를
            모의 계산에 사용하는 것에
            동의합니다.
          </p>

          <details>
            <summary>
              자세히 보기
            </summary>

            <p className="treatment-meta">
              현재 MVP에서는 주민등록번호,
              전체 보험증권번호와 같은
              직접 식별정보를 입력받지 않습니다.
            </p>

            <p className="treatment-meta">
              입력한 비교 데이터는
              현재 브라우저의 임시 상태로만
              사용하며 전체 초기화 또는
              새 비교 시작 기능으로 삭제할 수 있습니다.
            </p>
          </details>
        </div>

        {/* 동의 미완료 */}

        {!canStart && (
          <div className="notice-box warning">
            모의 계산 서비스 이용 동의와
            의료이용 정보 처리 동의를
            모두 확인해주세요.
          </div>
        )}

        {/* 동의 완료 */}

        {canStart && (
          <div className="notice-box">
            <strong>
              필수 동의가 완료되었습니다.
            </strong>

            <p>
              이제 보험 비교를 시작할 수 있습니다.
            </p>
          </div>
        )}
      </section>

      {/* ==============================
          MVP 안내
      ============================== */}

      <section className="app-card">
        <h2 className="card-title">
          공모전 MVP 안내
        </h2>

        <p>
          실제 OCR 대신 사전에 검증한
          샘플 보험증권 값을 불러올 수 있습니다.
        </p>

        <p>
          계산 결과 설명은 생성형 AI가
          보험금 숫자를 만드는 방식이 아니라,
          룰 엔진의 계산 결과를
          템플릿으로 설명합니다.
        </p>

        <p>
          확인되지 않은 급여 여부나
          중증 여부는 임의로 판단하지 않습니다.
        </p>
      </section>

      {/* ==============================
          주의사항
      ============================== */}

      <div className="notice-box warning">
        본 결과는 약관과 사용자 입력값을
        기반으로 한 모의 계산입니다.
        실제 보험금, 가입 가능 여부,
        전환 보험료를 확정하지 않으며
        보험상품 가입을 권유하지 않습니다.
      </div>

      {/* ==============================
          시작 버튼
      ============================== */}

      <div className="button-group">
        <button
          type="button"
          className="primary-button"
          onClick={handleStart}
          disabled={!canStart}
        >
          {canStart
            ? "내 보험 비교 시작하기"
            : "필수 동의를 확인해주세요"}
        </button>
      </div>
    </main>
  );
}

export default M01StartPage;