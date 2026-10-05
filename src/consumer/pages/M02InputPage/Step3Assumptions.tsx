

import type { M02Form } from "./useM02Form";

export default function Step3Assumptions({ form }: { form: M02Form }) {
  const {
    assumeEachOccurrenceSeparate,
    assumeEntireMedicalCostCovered,
    assumeNoPriorLimitUsage,
    isStep3Confirmed,
    setAssumeEachOccurrenceSeparate,
    setAssumeEntireMedicalCostCovered,
    setAssumeNoPriorLimitUsage,
    setIsStep3Confirmed,
  } = form;

  return (
    <section id="input-step-3" tabIndex={-1} className="form-card">
        <span className="step-badge">
          STEP 03 · 명시적 계산 가정
        </span>

        <h2 className="card-title">
          계산을 위한 추가 확인
        </h2>

        <p className="card-description">
          부족한 정보를 임의 추정하지 않습니다. 사실에 맞는 항목만 선택해주세요.
        </p>

        <div
          style={{
            display: "grid",
            gap: "14px",
            marginTop: "18px",
          }}
        >
          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: assumeEntireMedicalCostCovered
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: assumeEntireMedicalCostCovered
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                assumeEntireMedicalCostCovered
              }
              onChange={(e) =>
                setAssumeEntireMedicalCostCovered(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                현재 계약과 5세대의 보장대상 금액(C)을 모르겠어요.
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                선택하면 현재 계약과 5세대 모두 입력한 회당 환자부담 의료비
                전액을 보장대상 금액(C)으로 가정합니다.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: assumeNoPriorLimitUsage
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: assumeNoPriorLimitUsage
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                assumeNoPriorLimitUsage
              }
              onChange={(e) =>
                setAssumeNoPriorLimitUsage(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                올해 이미 사용한 보험 한도가 없어요.
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                같은 보장으로 받은 보험금이나 사용한 한도가 없다고 가정합니다.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: assumeEachOccurrenceSeparate
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: assumeEachOccurrenceSeparate
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                assumeEachOccurrenceSeparate
              }
              onChange={(e) =>
                setAssumeEachOccurrenceSeparate(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                각 치료를 별도 방문으로 계산
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                선택하면 입력한 치료 횟수를 각각 별도의 병원 방문으로 계산합니다.
                같은 날 여러 치료를 받을 예정이라면 선택하지 마세요.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: isStep3Confirmed
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: isStep3Confirmed
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                isStep3Confirmed
              }
              onChange={(e) =>
                setIsStep3Confirmed(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                예정치료를 입력하셨나요?
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                예정 치료와 진료 예정일을 포함한 입력 내용을 확인했습니다.
                예정 치료가 없는 경우에는 해당 선택을 확인해주세요.
              </span>
            </span>
          </label>
        </div>

        <div
          className="notice-box"
          style={{ marginTop: "16px" }}
        >
          체크하지 않은 조건과 ‘모름’으로 둔 급여·중증 여부는 계산 근거에서
          보험사 확인 필요 항목으로 표시됩니다.
        </div>
      </section>
  );
}
