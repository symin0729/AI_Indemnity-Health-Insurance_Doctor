import { useState } from "react";

import { useNavigate } from "react-router-dom";

function M01StartPage() {
  const navigate = useNavigate();

  const [
    hasServiceConsent,
    setHasServiceConsent,
  ] = useState(false);

  const [
    hasMedicalUsageConsent,
    setHasMedicalUsageConsent,
  ] = useState(false);

  const canStart =
    hasServiceConsent &&
    hasMedicalUsageConsent;

  return (
    <main>
      <header
        className="page-header"
        style={{
          position: "relative",
          maxWidth: "none",
          minHeight: "clamp(300px, 36vw, 430px)",
          marginBottom: "clamp(28px, 4vw, 42px)",
          padding: "clamp(26px, 4vw, 44px)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 42%, rgba(255,255,255,0.58) 67%, rgba(255,255,255,0.08) 100%), url("/ai-insurance-hero.png")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          boxShadow: "0 16px 40px rgba(21, 55, 91, 0.08)",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "min(100%, 650px)",
          }}
        >
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1
            style={{
              marginTop: "18px",
              maxWidth: "650px",
            }}
          >
            보험료만 보지 말고,
            <br />
            내가 낼 총비용을 비교해 보세요
          </h1>

          <p
            className="page-description"
            style={{
              maxWidth: "600px",
              marginBottom: "18px",
            }}
          >
            현재 실손보험을 유지할 때와
            5세대 실손으로 전환한다고
            가정했을 때의 1년 예상 부담을
            같은 치료 조건으로 비교합니다.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span className="rule-info">
              보험료 비교
            </span>

            <span className="rule-info">
              자기부담 계산
            </span>

            <span className="rule-info">
              보장 변화 확인
            </span>
          </div>
        </div>
      </header>

      <section
        style={{
          marginTop: "28px",
        }}
      >
        <div className="card-grid">
          <article
            className="app-card"
            style={{
              minHeight: "170px",
            }}
          >
            <span className="status-badge">
              01
            </span>

            <h3
              style={{
                marginTop: "12px",
              }}
            >
              보험료
            </h3>

            <p
              className="card-description"
              style={{
                marginBottom: 0,
              }}
            >
              현재 계약과 5세대 비교용
              월 보험료를 1년 기준으로
              환산합니다.
            </p>
          </article>

          <article
            className="app-card"
            style={{
              minHeight: "170px",
            }}
          >
            <span className="status-badge">
              02
            </span>

            <h3
              style={{
                marginTop: "12px",
              }}
            >
              예상 자기부담
            </h3>

            <p
              className="card-description"
              style={{
                marginBottom: 0,
              }}
            >
              예정 치료의 횟수와 비용,
              적용 가능한 룰을 기준으로
              자기부담금을 계산합니다.
            </p>
          </article>

          <article
            className="app-card"
            style={{
              minHeight: "170px",
            }}
          >
            <span className="status-badge">
              03
            </span>

            <h3
              style={{
                marginTop: "12px",
              }}
            >
              보장 변화
            </h3>

            <p
              className="card-description"
              style={{
                marginBottom: 0,
              }}
            >
              자기부담 증가나 보장 제외처럼
              비교할 때 함께 확인해야 할
              항목을 보여드립니다.
            </p>
          </article>
        </div>
      </section>

      <section
        style={{
          marginTop: "24px",
        }}
      >
        <div
          className="comparison-summary"
          style={{
            padding:
              "clamp(22px, 4vw, 32px)",
            background:
              "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 78%)",
          }}
        >
          <span className="status-badge primary">
            이용 전 확인
          </span>

          <h2
            style={{
              margin:
                "14px 0 8px",
            }}
          >
            이 서비스는 보험 가입을
            추천하지 않습니다
          </h2>

          <p
            className="card-description"
            style={{
              marginBottom: 0,
            }}
          >
            결과는 사용자가 입력한 정보와
            현재 MVP 룰셋을 이용한
            모의 계산입니다. 실제 보험금,
            가입 가능 여부, 전환 보험료는
            보험사 확인이 필요합니다.
          </p>
        </div>
      </section>

      <section
        className="form-card"
        style={{
          marginTop: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent:
              "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <p
              className="amount-label"
              style={{
                marginBottom: "4px",
              }}
            >
              필수 확인
            </p>

            <h3
              style={{
                marginBottom: 0,
              }}
            >
              시작하기 전에 확인해 주세요
            </h3>
          </div>

          <span className="rule-info">
            비저장 모드
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          <label
            style={{
              marginBottom: 0,
              padding: "16px",
              border:
                hasServiceConsent
                  ? "1px solid var(--color-primary-600)"
                  : "1px solid var(--color-border)",
              borderRadius:
                "var(--radius-sm)",
              background:
                hasServiceConsent
                  ? "var(--color-primary-050)"
                  : "var(--color-surface)",
              transition:
                "border-color var(--duration-fast) ease, background var(--duration-fast) ease",
            }}
          >
            <input
              type="checkbox"
              checked={
                hasServiceConsent
              }
              onChange={(e) =>
                setHasServiceConsent(
                  e.target.checked
                )
              }
            />

            서비스 이용을 위한
            필수 안내를 확인했습니다.
          </label>

          <label
            style={{
              marginBottom: 0,
              padding: "16px",
              border:
                hasMedicalUsageConsent
                  ? "1px solid var(--color-primary-600)"
                  : "1px solid var(--color-border)",
              borderRadius:
                "var(--radius-sm)",
              background:
                hasMedicalUsageConsent
                  ? "var(--color-primary-050)"
                  : "var(--color-surface)",
              transition:
                "border-color var(--duration-fast) ease, background var(--duration-fast) ease",
            }}
          >
            <input
              type="checkbox"
              checked={
                hasMedicalUsageConsent
              }
              onChange={(e) =>
                setHasMedicalUsageConsent(
                  e.target.checked
                )
              }
            />

            보험·예정 치료 정보를
            모의 계산에 사용하는 것에
            동의합니다.
          </label>
        </div>

        <div
          className="notice-box"
          style={{
            marginTop: "16px",
          }}
        >
          입력 정보는 이번 MVP에서
          브라우저 메모리에서만 사용하며
          새로고침하면 초기화될 수 있습니다.
        </div>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            disabled={!canStart}
            onClick={() =>
              navigate("/input")
            }
          >
            {canStart
              ? "비교 시작하기"
              : "필수 확인 후 시작할 수 있어요"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default M01StartPage;