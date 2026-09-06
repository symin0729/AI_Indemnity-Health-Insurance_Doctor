import AppShell from "../../components/AppShell";
import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAnalysisStore } from "../../store/useAnalysisStore";

import {
  loadRuleSet,
  type RuleSet,
} from "../../engine/loadRuleSet";

import {
  calculationService,
  type CalculationV2Input,
} from "../../services/calculationService";

import type {
  AnnualCalculationResult,
  ClaimCalculationItem,
} from "../../domain/calculation";

function formatMoney(
  value: number | null
): string {
  if (value === null) {
    return "확인 필요";
  }

  return `${value.toLocaleString()}원`;
}

function getStatusLabel(
  status: string
): string {
  if (status === "CALCULATED") {
    return "계산 완료";
  }

  if (
    status ===
    "CONFIRMATION_REQUIRED"
  ) {
    return "확인 필요";
  }

  return "지원 확인 필요";
}

function getCoverageLabel(
  value: string
): string {
  if (value === "COVERED") {
    return "보장대상";
  }

  if (
    value ===
    "PARTIALLY_COVERED"
  ) {
    return "일부 보장";
  }

  if (value === "EXCLUDED") {
    return "보장 제외";
  }

  return "확인 필요";
}

function ClaimDetail({
  item,
}: {
  item: ClaimCalculationItem;
}) {
  return (
    <article
      className="treatment-card"
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "18px",
        background: "#ffffff",
        boxShadow: "0 8px 24px rgba(18, 54, 89, 0.05)",
        padding: "18px",
      }}
    >
      <div className="treatment-card-header">
        <div>
          <span
            className={
              item.status === "CALCULATED"
                ? "status-badge success"
                : "status-badge warning"
            }
          >
            {getStatusLabel(
              item.status
            )}
          </span>

          <h3>{item.treatmentName}</h3>
        </div>

        <div
          style={{
            textAlign: "right",
            minWidth: "130px",
          }}
        >
          <p
            className="amount-label"
            style={{
              margin: "0 0 4px",
            }}
          >
            최종 의료비 부담 M-I
          </p>

          <strong>
            {formatMoney(
              item.finalMedicalBurden
            )}
          </strong>
        </div>
      </div>

      <div className="form-grid">
        <div>
          <p className="amount-label">
            의료비 M
          </p>
          <strong>
            {formatMoney(
              item.medicalCost
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            보장대상 C
          </p>
          <strong>
            {formatMoney(
              item.coveredAmount
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            보장 제외 E
          </p>
          <strong>
            {formatMoney(
              item.excludedAmount
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            기본 자기부담 d
          </p>
          <strong>
            {formatMoney(
              item.baseDeductible
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            조정 자기부담 d*
          </p>
          <strong>
            {formatMoney(
              item.adjustedDeductible
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            한도 전 보험금 q
          </p>
          <strong>
            {formatMoney(
              item.preLimitBenefit
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            최종 보험금 I
          </p>
          <strong>
            {formatMoney(
              item.insuranceBenefit
            )}
          </strong>
        </div>

        <div>
          <p className="amount-label">
            한도초과 U
          </p>
          <strong>
            {formatMoney(
              item.limitExceededAmount
            )}
          </strong>
        </div>
      </div>

      <p className="treatment-meta">
        보장 판정: {getCoverageLabel(
          item.coverageDecision
        )}
      </p>

      {item.appliedLimitIds.length >
        0 && (
        <p className="treatment-meta">
          적용 한도: {item.appliedLimitIds.join(
            ", "
          )}
        </p>
      )}

      {item.traces.length > 0 && (
        <div
          style={{
            marginTop: "18px",
            display: "grid",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                className="amount-label"
                style={{
                  marginBottom: "4px",
                }}
              >
                적용 근거
              </p>

              <strong>
                Rule Trace
              </strong>
            </div>

            <span className="rule-info">
              {item.traces.length}개 룰
            </span>
          </div>

          {item.traces.map(
            (trace, traceIndex) => (
              <details
                key={`${trace.ruleId}-${traceIndex}`}
                style={{
                  border:
                    "1px solid var(--color-border)",
                  borderRadius:
                    "var(--radius-sm)",
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    padding: "15px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                    fontWeight: 800,
                  }}
                >
                  <span>
                    {trace.displayText ??
                      trace.ruleId}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      className={
                        trace.verificationStatus ===
                        "VERIFIED"
                          ? "status-badge success"
                          : "status-badge warning"
                      }
                    >
                      {trace.verificationStatus ===
                      "VERIFIED"
                        ? "검증 완료"
                        : "보험사 확인 필요"}
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color:
                          "var(--color-primary-700, #1f5f99)",
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      근거 상세 보기
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: "0.95rem",
                          lineHeight: 1,
                        }}
                      >
                        ▾
                      </span>
                    </span>
                  </span>
                </summary>

                <div
                  style={{
                    padding:
                      "0 16px 16px",
                    borderTop:
                      "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <div>
                      <p className="amount-label">
                        Rule ID
                      </p>
                      <strong>
                        {trace.ruleId}
                      </strong>
                    </div>

                    <div>
                      <p className="amount-label">
                        적용 조건
                      </p>
                      <strong>
                        {trace.condition}
                      </strong>
                    </div>

                    <div>
                      <p className="amount-label">
                        계산식
                      </p>
                      <strong>
                        {trace.calculation}
                      </strong>
                    </div>

                    <div>
                      <p className="amount-label">
                        근거 문서
                      </p>
                      <strong>
                        {trace.sourceDocument ??
                          "확인 필요"}
                      </strong>
                    </div>

                    <div>
                      <p className="amount-label">
                        문서 버전
                      </p>
                      <strong>
                        {trace.documentVersion ??
                          "확인 필요"}
                      </strong>
                    </div>

                    <div>
                      <p className="amount-label">
                        시행일
                      </p>
                      <strong>
                        {trace.effectiveDate ??
                          "확인 필요"}
                      </strong>
                    </div>
                  </div>

                  {(trace.articleNumber ||
                    trace.articleParagraph) && (
                    <div
                      className="notice-box"
                      style={{
                        marginTop: "14px",
                      }}
                    >
                      약관 위치: {
                        trace.articleNumber ??
                        "조문 확인 필요"
                      }
                      {trace.articleParagraph
                        ? ` · ${trace.articleParagraph}`
                        : ""}
                    </div>
                  )}

                  {trace.exception && (
                    <div
                      className="notice-box warning"
                      style={{
                        marginTop: "14px",
                      }}
                    >
                      예외/주의: {trace.exception}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "16px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        padding: "13px",
                        border:
                          "1px solid var(--color-border)",
                        borderRadius:
                          "var(--radius-sm)",
                        background:
                          "var(--color-surface-soft)",
                      }}
                    >
                      <span className="status-badge success">
                        1
                      </span>
                      <p
                        className="amount-label"
                        style={{
                          marginTop: "9px",
                          marginBottom: "3px",
                        }}
                      >
                        입력 확인
                      </p>
                      <strong>
                        치료·계약 조건 확인
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "13px",
                        border:
                          "1px solid var(--color-border)",
                        borderRadius:
                          "var(--radius-sm)",
                        background:
                          "var(--color-surface-soft)",
                      }}
                    >
                      <span className="status-badge primary">
                        2
                      </span>
                      <p
                        className="amount-label"
                        style={{
                          marginTop: "9px",
                          marginBottom: "3px",
                        }}
                      >
                        룰 확인
                      </p>
                      <strong>
                        적용 조건·계산식 확인
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "13px",
                        border:
                          "1px solid var(--color-border)",
                        borderRadius:
                          "var(--radius-sm)",
                        background:
                          "var(--color-surface-soft)",
                      }}
                    >
                      <span className="status-badge warning">
                        3
                      </span>
                      <p
                        className="amount-label"
                        style={{
                          marginTop: "9px",
                          marginBottom: "3px",
                        }}
                      >
                        원문 확인
                      </p>
                      <strong>
                        실제 약관은 보험사 최종 확인
                      </strong>
                    </div>
                  </div>
                </div>
              </details>
            )
          )}
        </div>
      )}

      {item.warnings.length > 0 && (
        <div className="notice-box warning">
          {item.warnings.map(
            (warning) => (
              <p key={warning}>
                {warning}
              </p>
            )
          )}
        </div>
      )}
    </article>
  );
}

function ScenarioCard({
  title,
  subtitle,
  result,
}: {
  title: string;
  subtitle: string;
  result: AnnualCalculationResult;
}) {
  return (
    <section
      className="form-card"
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: "clamp(20px, 3vw, 28px)",
        borderRadius: "22px",
        boxShadow: "0 14px 34px rgba(18, 54, 89, 0.06)",
      }}
    >
      <span
        className={
          result.status === "CALCULATED"
            ? "status-badge success"
            : "status-badge warning"
        }
      >
        {getStatusLabel(result.status)}
      </span>

      <h2 className="card-title">
        {title}
      </h2>

      <p className="card-description">
        {subtitle}
      </p>

      <div
        className="comparison-summary"
        style={{
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          padding: "20px",
          borderRadius: "18px",
          background:
            "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 88%)",
          border: "1px solid var(--color-primary-100)",
        }}
      >
        <p className="amount-label">
          연간 총부담 T
        </p>
        <p className="amount">
          {formatMoney(
            result.totalBurden
          )}
        </p>
      </div>

      <div
        className="form-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
          gap: "16px",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            연 보험료
          </p>
          <strong>
            {formatMoney(
              result.annualPremium
            )}
          </strong>
        </div>

        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            총 의료비 ΣM
          </p>
          <strong>
            {formatMoney(
              result.totalMedicalCost
            )}
          </strong>
        </div>

        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            총 보험금 ΣI
          </p>
          <strong>
            {formatMoney(
              result.totalInsuranceBenefit
            )}
          </strong>
        </div>

        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            최종 의료비 부담
          </p>
          <strong>
            {formatMoney(
              result.totalFinalMedicalBurden
            )}
          </strong>
        </div>

        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            보장 제외 ΣE
          </p>
          <strong>
            {formatMoney(
              result.totalExcludedAmount
            )}
          </strong>
        </div>

        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            조정 자기부담 Σd*
          </p>
          <strong>
            {formatMoney(
              result.totalAdjustedDeductible
            )}
          </strong>
        </div>

        <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
          <p className="amount-label">
            한도초과 ΣU
          </p>
          <strong>
            {formatMoney(
              result.totalLimitExceededAmount
            )}
          </strong>
        </div>
      </div>

      <div className="notice-box">
        총부담 공식은 연 보험료 + ΣM - ΣI 입니다.
        E, d*, U는 M-I의 분해값이므로 다시 더하지 않습니다.
      </div>

      <h3>치료별 계산</h3>

      {result.items.map((item) => (
        <ClaimDetail
          key={item.usageId}
          item={item}
        />
      ))}
    </section>
  );
}

function M04ResultPage() {
  const navigate = useNavigate();

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

  const resetAnalysis =
    useAnalysisStore(
      (state) => state.resetAnalysis
    );

  const [ruleSet, setRuleSet] =
    useState<RuleSet | null>(null);

  const [
    isRuleLoading,
    setIsRuleLoading,
  ] = useState(true);

  const [
    ruleLoadError,
    setRuleLoadError,
  ] = useState<string | null>(null);

  const [
    isResetModalOpen,
    setIsResetModalOpen,
  ] = useState(false);

  useEffect(() => {
    const fetchRuleSet = async () => {
      try {
        setIsRuleLoading(true);
        setRuleLoadError(null);

        const loadedRuleSet =
          await loadRuleSet(
            "mvp-v2"
          );

        setRuleSet(loadedRuleSet);
      } catch (error) {
        if (
          error instanceof Error
        ) {
          setRuleLoadError(
            error.message
          );
        } else {
          setRuleLoadError(
            "룰셋을 불러오는 중 오류가 발생했습니다."
          );
        }
      } finally {
        setIsRuleLoading(false);
      }
    };

    fetchRuleSet();
  }, []);

  if (
    !contract ||
    target5GMonthlyPremium === null ||
    usages.length === 0
  ) {
    return (
      <AppShell currentStep={5}><main className="navy-page">
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>
          <h1>
            계산할 정보가 없습니다.
          </h1>
          <p className="page-description">
            보험 정보와 예정 치료를 먼저 입력해주세요.
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

  if (isRuleLoading) {
    return (
      <AppShell currentStep={5}><main className="navy-page">
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>
          <h1>보험 비교 결과</h1>
          <p className="page-description">
            mvp-v2 계산 룰을 불러오는 중입니다.
          </p>
        </header>
      </main></AppShell>
    );
  }

  if (
    ruleLoadError ||
    !ruleSet
  ) {
    return (
      <AppShell currentStep={5}><main className="navy-page">
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>
          <h1>보험 비교 결과</h1>
        </header>

        <div className="notice-box error">
          계산 룰을 불러오지 못했습니다.
          <br />
          {ruleLoadError}
        </div>

        <div className="button-group">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/confirm")
            }
          >
            이전
          </button>
        </div>
      </main></AppShell>
    );
  }

  /**
   * mvp-v2 계산 가정은 M02에서 사용자가 직접 선택하고
   * Zustand에 저장한 값만 사용한다.
   *
   * 체크하지 않은 가정은 false로 유지되며,
   * 엔진이 임의로 C·기존 한도 사용량·계산 단위를 추정하지 않는다.
   */
  const calculationInput:
    CalculationV2Input = {
    contract,
    target5GMonthlyPremium,
    target5GCoverages,
    usages,
    ruleSet,

    assumptions:
      calculationAssumptions,

    year: 1,
  };

  const validation =
    calculationService.validate(
      calculationInput
    );

  if (!validation.valid) {
    return (
      <AppShell currentStep={5}><main className="navy-page">
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>
          <h1>
            입력 정보를 확인해주세요.
          </h1>
        </header>

        <div className="notice-box error">
          {validation.errors.map(
            (error) => (
              <p key={error}>
                {error}
              </p>
            )
          )}
        </div>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate("/input")
            }
          >
            입력 수정하기
          </button>
        </div>
      </main></AppShell>
    );
  }

  const result =
    calculationService.calculateV2(
      calculationInput
    );

  const current = result.current;
  const target5G = result.target5G;

  const isComparisonAvailable =
    current.totalBurden !== null &&
    target5G.totalBurden !== null;

  let comparisonMessage =
    "확인되지 않은 계약 조건 또는 계산 입력이 있어 두 선택지의 총부담 차이를 확정하지 않습니다.";

  if (isComparisonAvailable) {
    if (
      result.target5GSaving !==
      null
    ) {
      if (
        result.target5GSaving > 0
      ) {
        comparisonMessage =
          `5세대 비교안의 연간 총부담이 현재 계약보다 ${result.target5GSaving.toLocaleString()}원 낮습니다.`;
      } else if (
        result.target5GSaving < 0
      ) {
        comparisonMessage =
          `현재 계약의 연간 총부담이 5세대 비교안보다 ${Math.abs(
            result.target5GSaving
          ).toLocaleString()}원 낮습니다.`;
      } else {
        comparisonMessage =
          "두 선택지의 연간 총부담이 같습니다.";
      }
    }
  }

  const breakEvenResults =
    usages.map((usage) => ({
      usage,
      result:
        calculationService.calculateBreakEvenV2(
          calculationInput,
          usage.id,
          {
            minFrequency: 0,
            maxFrequency: 50,
          }
        ),
    }));

  const handleStartOver = () => {
    setIsResetModalOpen(true);
  };

  const handleCancelStartOver = () => {
    setIsResetModalOpen(false);
  };

  const handleConfirmStartOver = () => {
    setIsResetModalOpen(false);
    resetAnalysis();
    navigate("/");
  };

  return (
    <AppShell currentStep={5}><main className="navy-page">
      <header
        className="page-header"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(26px, 5vw, 46px)",
          border: "1px solid var(--color-border)",
          borderRadius: "26px",
          background:
            "linear-gradient(135deg, #f7fbff 0%, #ffffff 62%, #edf6ff 100%)",
          boxShadow: "0 18px 48px rgba(18, 54, 89, 0.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.4fr) minmax(220px, 0.6fr)",
            gap: "clamp(22px, 5vw, 48px)",
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <span className="page-brand">
                AI 실손 닥터
              </span>
              <span className="step-badge">
                RESULT
              </span>
            </div>

            <h1 style={{ marginBottom: "12px" }}>
              보험 비교 결과
            </h1>

            <p
              className="page-description"
              style={{ maxWidth: "650px", marginBottom: "16px" }}
            >
              같은 의료이용 조건에서 현재 계약 유지와 5세대 비교안의
              연간 부담을 한눈에 비교했습니다.
            </p>

            <span className="rule-info">
              엔진 {result.engineVersion} · 룰셋 {result.rulesetVersion}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "180px",
            }}
          >
            <img
              src="/ai-insurance-result.png"
              alt="AI 실손 닥터 보험 비교 결과 안내"
              style={{
                width: "min(100%, 260px)",
                maxHeight: "210px",
                objectFit: "contain",
                filter: "drop-shadow(0 16px 24px rgba(31, 95, 153, 0.15))",
              }}
            />
          </div>
        </div>
      </header>

      <section
        className="app-card"
        style={{
          padding: "clamp(22px, 4vw, 34px)",
          borderRadius: "24px",
          background:
            "linear-gradient(135deg, #0f4778 0%, #1f659f 58%, #2f77b0 100%)",
          color: "#ffffff",
          boxShadow: "0 18px 44px rgba(18, 72, 120, 0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "18px",
            flexWrap: "wrap",
            marginBottom: "22px",
          }}
        >
          <div style={{ flex: "1 1 420px" }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.82rem",
                fontWeight: 800,
                opacity: 0.78,
                letterSpacing: "0.02em",
              }}
            >
              1년 예상 비교 결론
            </p>
            <h2
              className="card-title"
              style={{ color: "#ffffff", marginBottom: "8px" }}
            >
              {comparisonMessage}
            </h2>
          </div>

          {isComparisonAvailable && result.target5GSaving !== null && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.22)",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              차이 {Math.abs(result.target5GSaving).toLocaleString()}원
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "18px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <p style={{ margin: "0 0 6px", opacity: 0.75, fontWeight: 700 }}>
              현재 계약 유지
            </p>
            <strong style={{ fontSize: "1.35rem" }}>
              {formatMoney(current.totalBurden)}
            </strong>
          </div>

          <div
            style={{
              padding: "18px",
              borderRadius: "16px",
              background: "#ffffff",
              color: "var(--color-primary-900, #123f69)",
              border: "1px solid rgba(255,255,255,0.9)",
            }}
          >
            <p style={{ margin: "0 0 6px", color: "var(--color-text-sub)", fontWeight: 700 }}>
              5세대 비교안
            </p>
            <strong style={{ fontSize: "1.35rem" }}>
              {formatMoney(target5G.totalBurden)}
            </strong>
          </div>
        </div>

        {!isComparisonAvailable && (
          <div
            className="notice-box warning"
            style={{ marginTop: "16px" }}
          >
            숫자가 확인되지 않은 항목을 0원이나 대표값으로 임의 보정하지 않았습니다. 아래 치료별 경고를 확인해주세요.
          </div>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "22px",
          width: "100%",
          alignItems: "stretch",
        }}
      >
        <ScenarioCard
          title="현재 계약 유지"
          subtitle={`${contract.generation}세대 현재 계약 기준`}
          result={current}
        />

        <ScenarioCard
          title="5세대 비교안"
          subtitle="입력한 5세대 보험료와 특약 조건 기준"
          result={target5G}
        />
      </div>

      <section
        className="form-card"
        style={{
          padding: "clamp(22px, 4vw, 32px)",
          borderRadius: "22px",
          background:
            "linear-gradient(135deg, #ffffff 0%, #f7fbff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <span className="step-badge">BREAK-EVEN</span>
            <h2 className="card-title" style={{ marginTop: "10px" }}>
              손익분기 탐색
            </h2>
            <p className="card-description" style={{ marginBottom: 0 }}>
              치료 횟수를 0~50회로 바꾸며 전체 계산 엔진을 다시 실행해
              유리한 선택지가 바뀌는 구간을 찾습니다.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {breakEvenResults.map(({ usage, result: breakEven }) => (
            <article
              key={usage.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) minmax(140px, auto)",
                gap: "18px",
                alignItems: "center",
                padding: "20px",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                background: "#ffffff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p className="amount-label" style={{ marginBottom: "4px" }}>
                  치료 항목
                </p>
                <h3 style={{ margin: "0 0 8px" }}>{usage.treatmentName}</h3>

                {!breakEven ? (
                  <p className="treatment-meta" style={{ marginBottom: 0 }}>
                    손익분기 탐색을 실행할 수 없습니다.
                  </p>
                ) : (
                  <>
                    <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                      {breakEven.message}
                    </p>
                    <span
                      className={
                        breakEven.status === "AVAILABLE"
                          ? "status-badge success"
                          : "status-badge warning"
                      }
                    >
                      {breakEven.status === "AVAILABLE"
                        ? "변곡점 확인"
                        : breakEven.status}
                    </span>
                  </>
                )}
              </div>

              {breakEven?.threshold !== null && breakEven?.threshold !== undefined && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: "var(--color-primary-050)",
                    border: "1px solid var(--color-primary-100)",
                  }}
                >
                  <p className="amount-label" style={{ marginBottom: "4px" }}>
                    기준 횟수
                  </p>
                  <strong
                    style={{
                      display: "block",
                      color: "var(--color-primary-800)",
                      fontSize: "1.5rem",
                    }}
                  >
                    {breakEven.threshold}회
                  </strong>
                </div>
              )}

              {breakEven && breakEven.warnings.length > 0 && (
                <div
                  className="notice-box warning"
                  style={{ gridColumn: "1 / -1", margin: 0 }}
                >
                  {breakEven.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 실손보험 세대 변천사 */}
      <section>
        <span className="step-badge">
          GUIDE
        </span>

        <h2>
          실손보험 세대 변천사
        </h2>

        <div
          className="comparison-summary"
          style={{
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            padding:
              "clamp(22px, 4vw, 32px)",
            background:
              "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 78%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent:
                "space-between",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                flex: "1 1 420px",
                minWidth: 0,
              }}
            >
              <p
                className="amount-label"
                style={{
                  marginBottom: "4px",
                }}
              >
                한눈에 보는 위치
              </p>

              <h3
                style={{
                  marginBottom: "6px",
                }}
              >
                내 계약은 어디에 있고,
                무엇과 비교하고 있을까요?
              </h3>

              <p
                className="card-description"
                style={{
                  marginBottom: 0,
                  maxWidth: "700px",
                }}
              >
                실손보험은 세대가 바뀌면서
                보장 구조와 자기부담 방식도
                달라져 왔습니다. 아래 연표에서
                현재 계약과 5세대 비교 대상을
                확인할 수 있습니다.
              </p>
            </div>

            <span className="rule-info">
              1세대 → 5세대
            </span>
          </div>

          <div
            style={{
              overflowX: "auto",
              paddingBottom: "8px",
              WebkitOverflowScrolling:
                "touch",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, minmax(130px, 1fr))",
                minWidth: "700px",
                gap: "10px",
                position: "relative",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "31px",
                  left: "7%",
                  right: "7%",
                  height: "2px",
                  background:
                    "var(--color-primary-100)",
                  zIndex: 0,
                }}
              />

              {[1, 2, 3, 4, 5].map(
                (generation) => {
                  const isCurrent =
                    contract.generation ===
                    generation;

                  const isTarget =
                    generation === 5;

                  const isHighlighted =
                    isCurrent ||
                    isTarget;

                  return (
                    <div
                      key={`generation-${generation}`}
                      style={{
                        position:
                          "relative",
                        zIndex: 1,
                        padding: "0 6px",
                        textAlign:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          placeItems:
                            "center",
                          width: "62px",
                          height: "62px",
                          margin:
                            "0 auto 12px",
                          border:
                            isHighlighted
                              ? "2px solid var(--color-primary-700)"
                              : "2px solid var(--color-primary-100)",
                          borderRadius:
                            "50%",
                          background:
                            isHighlighted
                              ? "var(--color-primary-700)"
                              : "#ffffff",
                          color:
                            isHighlighted
                              ? "#ffffff"
                              : "var(--color-primary-800)",
                          fontSize:
                            "1.05rem",
                          fontWeight: 900,
                          boxShadow:
                            isHighlighted
                              ? "0 8px 20px rgba(29, 86, 143, 0.18)"
                              : "none",
                        }}
                      >
                        {generation}
                      </div>

                      <strong
                        style={{
                          display:
                            "block",
                          marginBottom:
                            "7px",
                          color:
                            "var(--color-text)",
                        }}
                      >
                        {generation}세대
                      </strong>

                      <div
                        style={{
                          minHeight:
                            "28px",
                        }}
                      >
                        {isCurrent && (
                          <span className="status-badge">
                            내 계약
                          </span>
                        )}

                        {isTarget &&
                          !isCurrent && (
                            <span className="status-badge primary">
                              비교 대상
                            </span>
                          )}

                        {isTarget &&
                          isCurrent && (
                            <span className="status-badge primary">
                              현재 · 비교
                            </span>
                          )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
              gap: "10px",
              marginTop: "22px",
            }}
          >
            <div
              style={{
                padding: "15px 16px",
                border:
                  "1px solid var(--color-border)",
                borderRadius:
                  "var(--radius-sm)",
                background:
                  "var(--color-surface-soft)",
              }}
            >
              <p
                className="amount-label"
                style={{
                  marginBottom: "6px",
                }}
              >
                현재 계약
              </p>

              <strong>
                {contract.generation}세대
                실손
              </strong>
            </div>

            <div
              style={{
                padding: "15px 16px",
                border:
                  "1px solid var(--color-primary-100)",
                borderRadius:
                  "var(--radius-sm)",
                background:
                  "var(--color-primary-050)",
              }}
            >
              <p
                className="amount-label"
                style={{
                  marginBottom: "6px",
                }}
              >
                이번 비교 대상
              </p>

              <strong>
                5세대 실손
              </strong>
            </div>
          </div>

          <p
            className="treatment-meta"
            style={{
              margin: "18px 0 0",
              paddingTop: "16px",
              borderTop:
                "1px solid var(--color-border)",
            }}
          >
            세대 구분만으로 실제 보장 내용을
            확정할 수는 없습니다. 가입 시기,
            상품, 특약과 약관에 따라 세부
            조건이 달라질 수 있으므로 계산 결과와
            확인 필요 항목을 함께 확인해 주세요.
          </p>
        </div>
      </section>

      <section className="form-card">
        <h2 className="card-title">
          계산 가정 및 확인 필요 사항
        </h2>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              C 미입력 시 M 전체 보장대상
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
              기존 한도·상한 사용량 0
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
              여러 회 치료를 서로 다른 계산 단위로 처리
            </p>
            <strong>
              {calculationAssumptions
                .assumeEachOccurrenceSeparate
                ? "적용"
                : "적용 안 함"}
            </strong>
          </div>
        </div>

        {!calculationAssumptions
          .assumeEntireMedicalCostCovered && (
          <div className="notice-box">
            C를 입력하지 않은 치료는 M 전체를 자동으로 보장대상으로 간주하지 않습니다.
          </div>
        )}

        {!calculationAssumptions
          .assumeNoPriorLimitUsage && (
          <div className="notice-box">
            기존 지급한도 사용액과 자기부담상한 누적액을 확인하지 않은 경우 0원으로 자동 처리하지 않습니다.
          </div>
        )}

        {!calculationAssumptions
          .assumeEachOccurrenceSeparate && (
          <div className="notice-box">
            날짜·입원건 정보가 없는 여러 회 치료를 서로 다른 계산 단위로 자동 처리하지 않습니다.
          </div>
        )}

        <div className="notice-box">
          선택형 할인특약(C안)은 실제 시행 여부, 대상 상품, 보험료 견적이 확인되기 전까지 정보성 옵션으로만 표시하며 현재 총부담 계산에는 반영하지 않습니다.
        </div>

        {result.warnings.filter(
          (warning) =>
            !warning.includes(
              "선택형 할인특약(C안)"
            )
        ).length > 0 && (
          <div className="notice-box warning">
            {result.warnings
              .filter(
                (warning) =>
                  !warning.includes(
                    "선택형 할인특약(C안)"
                  )
              )
              .map((warning) => (
                <p key={warning}>
                  {warning}
                </p>
              ))}
          </div>
        )}
      </section>

      <details
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "18px",
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "18px 20px",
            fontWeight: 900,
            color: "var(--color-text)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>기술 정보 · 재현 정보</span>
          <span className="rule-info">필요할 때 펼치기</span>
        </summary>

        <div
          style={{
            padding: "0 20px 20px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ padding: "14px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
            <p className="amount-label">엔진 버전</p>
            <strong>{result.engineVersion}</strong>
          </div>
          <div style={{ padding: "14px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
            <p className="amount-label">룰셋 버전</p>
            <strong>{result.rulesetVersion}</strong>
          </div>
          <div style={{ padding: "14px", borderRadius: "12px", background: "var(--color-surface-soft)" }}>
            <p className="amount-label">입력 해시</p>
            <strong>{result.inputHash}</strong>
          </div>
        </div>
      </details>

      <div className="notice-box warning">
        본 결과는 입력값과 현재 룰셋을 이용한 모의 계산입니다. 실제 보험금, 전환 가능 여부, 보험료를 확정하거나 보험상품 전환을 권유하지 않습니다.
      </div>

      <div
        className="button-group"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
          gap: "10px",
          marginTop: "18px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/confirm")}
          style={{
            minHeight: "48px",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            background: "#ffffff",
            color: "var(--color-text)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ← 이전
        </button>

        <button
          type="button"
          onClick={() => navigate("/input")}
          style={{
            minHeight: "48px",
            border: "1px solid var(--color-primary-200, #b9d1ea)",
            borderRadius: "12px",
            background: "var(--color-primary-050)",
            color: "var(--color-primary-800)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          입력 수정
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={handleStartOver}
          style={{ minHeight: "48px", borderRadius: "12px" }}
        >
          새 비교 시작
        </button>
      </div>

      {isResetModalOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelStartOver();
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
            backdropFilter:
              "blur(4px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            aria-describedby="reset-dialog-description"
            className="app-card"
            style={{
              width:
                "min(100%, 460px)",
              margin: 0,
              padding:
                "clamp(22px, 5vw, 30px)",
              boxSizing:
                "border-box",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.24)",
            }}
          >
            <span className="step-badge">
              다시 시작
            </span>

            <h2
              id="reset-dialog-title"
              className="card-title"
              style={{
                marginTop: "10px",
              }}
            >
              새 비교를 시작할까요?
            </h2>

            <p
              id="reset-dialog-description"
              className="card-description"
            >
              현재 입력 정보와 계산 결과가 모두 초기화됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>

            <div
              className="button-group"
              style={{
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={
                  handleCancelStartOver
                }
                autoFocus
              >
                취소
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleConfirmStartOver
                }
              >
                초기화하고 새 비교
              </button>
            </div>
          </section>
        </div>
      )}
    </main></AppShell>
  );
}

export default M04ResultPage;