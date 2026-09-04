import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAnalysisStore,
} from "../../store/useAnalysisStore";

import {
  calculateAnnualPremium,
} from "../../engine/calculateAnnualPremium";

import {
  calculateScenario,
} from "../../engine/calculateScenario";

import {
  analyzeCoverageGaps,
} from "../../engine/analyzeCoverageGap";

import {
  calculateBreakEven,
  type BreakEvenResult,
} from "../../engine/calculateBreakEven";

import {
  createExplanation,
} from "../../engine/createExplanation";

import {
  loadRuleSet,
  type RuleSet,
} from "../../engine/loadRuleSet";

function M04ResultPage() {
  const navigate =
    useNavigate();

  // ========================================
  // Store
  // ========================================

  const contract =
    useAnalysisStore(
      (state) =>
        state.contract
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

  const usages =
    useAnalysisStore(
      (state) =>
        state.usages
    );

  const resetAnalysis =
    useAnalysisStore(
      (state) =>
        state.resetAnalysis
    );

  // ========================================
  // RuleSet
  // ========================================

  const [
    ruleSet,
    setRuleSet,
  ] =
    useState<RuleSet | null>(
      null
    );

  const [
    isRuleLoading,
    setIsRuleLoading,
  ] =
    useState(true);

  const [
    ruleLoadError,
    setRuleLoadError,
  ] =
    useState<string | null>(
      null
    );

  // ========================================
  // 룰 상세 보기
  // ========================================

  const [
    expandedRuleId,
    setExpandedRuleId,
  ] =
    useState<string | null>(
      null
    );

  // ========================================
  // RuleSet 불러오기
  // ========================================

  useEffect(() => {
    const fetchRuleSet =
      async () => {
        try {
          setIsRuleLoading(
            true
          );

          setRuleLoadError(
            null
          );

          const loadedRuleSet =
            await loadRuleSet(
              "mvp-v1"
            );

          setRuleSet(
            loadedRuleSet
          );
        } catch (error) {
          if (
            error instanceof
            Error
          ) {
            setRuleLoadError(
              error.message
            );
          } else {
            setRuleLoadError(
              "계산 룰셋을 불러오는 중 오류가 발생했습니다."
            );
          }
        } finally {
          setIsRuleLoading(
            false
          );
        }
      };

    fetchRuleSet();
  }, []);

  // ========================================
  // 입력 없음
  // ========================================

  if (!contract) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            계산할 정보가 없습니다.
          </h1>

          <p className="page-description">
            현재 보험과 예정 치료 정보를
            먼저 입력해주세요.
          </p>
        </header>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/input"
              )
            }
          >
            입력 화면으로
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // 5세대 비교값 없음
  // ========================================

  if (
    target5GMonthlyPremium ===
    null
  ) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            5세대 비교 조건이 없습니다.
          </h1>

          <p className="page-description">
            비교용 5세대 보험료를
            다시 입력해주세요.
          </p>
        </header>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/input"
              )
            }
          >
            입력 화면으로
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // 치료 없음
  // ========================================

  if (
    usages.length === 0
  ) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            예정 치료가 없습니다.
          </h1>

          <p className="page-description">
            예정 치료를 1건 이상
            입력해주세요.
          </p>
        </header>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/input"
              )
            }
          >
            입력 화면으로
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // 룰 로딩
  // ========================================

  if (isRuleLoading) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            보험 비교 결과
          </h1>

          <p className="page-description">
            계산 룰을 불러오는 중입니다.
          </p>
        </header>
      </main>
    );
  }

  // ========================================
  // 룰 로딩 오류
  // ========================================

  if (
    ruleLoadError ||
    !ruleSet
  ) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            보험 비교 결과
          </h1>
        </header>

        <div
          className="notice-box error"
          role="alert"
        >
          <strong>
            계산 룰을 불러오지
            못했습니다.
          </strong>

          {ruleLoadError && (
            <p>
              {
                ruleLoadError
              }
            </p>
          )}
        </div>

        <div className="button-group">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                "/confirm"
              )
            }
          >
            이전 화면
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // 보험료
  // ========================================

  const currentAnnualPremium =
    calculateAnnualPremium(
      contract.monthlyPremium
    );

  const targetAnnualPremium =
    calculateAnnualPremium(
      target5GMonthlyPremium
    );

  // ========================================
  // 현재 계약 계산
  // ========================================

  const currentResult =
    calculateScenario({
      generation:
        contract.generation,

      annualPremium:
        currentAnnualPremium,

      coverages:
        contract.coverages,

      usages,

      ruleSet,
    });

  // ========================================
  // 5세대 계산
  // ========================================

  const targetResult =
    calculateScenario({
      generation: 5,

      annualPremium:
        targetAnnualPremium,

      coverages:
        target5GCoverages,

      usages,

      ruleSet,
    });

  // ========================================
  // 보장 공백
  // ========================================

  const coverageGaps =
    analyzeCoverageGaps(
      usages.map(
        (_usage, index) => ({
          currentItem:
            currentResult.items[
              index
            ],

          targetItem:
            targetResult.items[
              index
            ],
        })
      )
    );

  const coverageGapIssueCount =
    coverageGaps.filter(
      (gap) =>
        gap.type !== "NONE"
    ).length;

  // ========================================
  // 손익분기 계산 불가 객체
  // ========================================

  const createUnavailableBreakEven =
    (
      reason: string
    ): BreakEvenResult => {
      return {
        status:
          "UNAVAILABLE",

        breakEvenTreatmentCost:
          null,

        breakEvenFrequency:
          null,

        firstWholeFrequency:
          null,

        direction:
          null,

        message:
          "손익분기점을 계산하지 않았습니다.",

        reason,
      };
    };

  // ========================================
  // 손익분기점
  //
  // 중요:
  // 보장 제외가 있거나
  // 제외 여부가 UNKNOWN이면
  // 단순 선형 계산을 하지 않는다.
  // ========================================

  const breakEvenResults =
    usages.map(
      (
        usage,
        index
      ) => {
        const currentItem =
          currentResult.items[
            index
          ];

        const targetItem =
          targetResult.items[
            index
          ];

        const currentExcludedStatus =
          currentItem
            .excludedExpenseResult
            .status;

        const targetExcludedStatus =
          targetItem
            .excludedExpenseResult
            .status;

        const hasExcludedCondition =
          currentExcludedStatus !==
            "NONE" ||
          targetExcludedStatus !==
            "NONE" ||
          (currentItem.excludedAmount ??
            0) > 0 ||
          (targetItem.excludedAmount ??
            0) > 0;

        if (
          hasExcludedCondition
        ) {
          return {
            usage,

            result:
              createUnavailableBreakEven(
                "보장 제외 의료비가 발생하거나 보장 제외 여부가 확정되지 않은 조건이 포함되어 단순 선형 손익분기점을 계산하지 않았습니다."
              ),
          };
        }

        return {
          usage,

          result:
            calculateBreakEven({
              currentAnnualPremium,

              targetAnnualPremium,

              treatmentCost:
                currentItem.treatmentCost,

              unitCost:
                usage.unitCost,

              currentSelfPayment:
                currentItem
                  .selfPaymentAmount,

              targetSelfPayment:
                targetItem
                  .selfPaymentAmount,
            }),
        };
      }
    );

  // ========================================
  // 템플릿 설명
  // ========================================

  const explanation =
    createExplanation({
      currentResult,

      targetResult,

      coverageGaps,

      breakEvenResults:
        breakEvenResults.map(
          (item) =>
            item.result
        ),
    });

  // ========================================
  // 전체 비교 가능 여부
  // ========================================

  const isFullComparisonAvailable =
    currentResult.totalAnnualCost !==
      null &&
    targetResult.totalAnnualCost !==
      null;

  // ========================================
  // 치료비 전체
  // ========================================

  const totalTreatmentCost =
    usages.reduce(
      (
        sum,
        usage
      ) =>
        sum +
        usage.frequency *
          usage.unitCost,
      0
    );

  // ========================================
  // 표시용 함수
  // ========================================

  const formatAmount = (
    amount: number | null
  ) => {
    if (
      amount === null
    ) {
      return "계산 불가";
    }

    return `${amount.toLocaleString()}원`;
  };

  const getCareSettingLabel = (
    value: string
  ) => {
    if (
      value === "INPATIENT"
    ) {
      return "입원";
    }

    return "통원";
  };

  const getBenefitLabel = (
    value: string
  ) => {
    if (
      value === "COVERED"
    ) {
      return "급여";
    }

    if (
      value ===
      "NON_COVERED"
    ) {
      return "비급여";
    }

    return "모름";
  };

  const getSeverityLabel = (
    value: string
  ) => {
    if (
      value === "CRITICAL"
    ) {
      return "중증";
    }

    if (
      value ===
      "NON_CRITICAL"
    ) {
      return "비중증";
    }

    return "모름";
  };

  const getRuleDescription = (
    ruleId:
      | string
      | null
      | undefined
  ) => {
    if (!ruleId) {
      return null;
    }

    const matchedRule =
      ruleSet.rules.find(
        (rule) =>
          rule.ruleId ===
          ruleId
      );

    return (
      matchedRule?.description ??
      null
    );
  };

  // ========================================
  // 룰 펼치기
  // ========================================

  const handleToggleRuleDetail =
    (
      ruleId: string
    ) => {
      setExpandedRuleId(
        (current) =>
          current === ruleId
            ? null
            : ruleId
      );
    };

  // ========================================
  // 새 비교
  // ========================================

  const handleStartOver =
    () => {
      const confirmed =
        window.confirm(
          "현재 입력 정보와 비교 결과를 모두 삭제하고 새 비교를 시작할까요?"
        );

      if (!confirmed) {
        return;
      }

      resetAnalysis();

      navigate("/");
    };

  return (
    <main>
      {/* ======================================
          HEADER
      ====================================== */}

      <header className="page-header">
        <span className="page-brand">
          AI 실손 닥터
        </span>

        <span className="step-badge">
          RESULT
        </span>

        <h1>
          보험 비교 결과
        </h1>

        <p className="page-description">
          입력한 예정 치료를 그대로
          이용한다고 가정하여 현재 계약
          유지와 5세대 전환의 1년 예상
          부담을 비교합니다.
        </p>

        <span className="rule-info">
          룰셋 버전:{" "}
          {
            ruleSet.rulesetVersion
          }
        </span>
      </header>

      {/* ======================================
          계산 가능 여부
      ====================================== */}

      {!isFullComparisonAvailable && (
        <div className="notice-box warning">
          <strong>
            일부 계산을 확정할 수 없습니다.
          </strong>

          <p>
            현재 입력 조건에 적용할 수 있는
            검증된 약관 룰이 부족하거나
            확인되지 않은 분류가 포함되어
            있습니다.
          </p>

          <p>
            확인되지 않은 숫자를 임의로
            추정하지 않았습니다.
          </p>
        </div>
      )}

      {/* ======================================
          RESULT 1
          총부담 비교
      ====================================== */}

      <section>
        <span className="step-badge">
          RESULT 1
        </span>

        <h2>
          1년 예상 총부담 비교
        </h2>

        <div className="card-grid">
          {/* 현재 계약 */}

          <article className="result-card">
            <span className="status-badge">
              현재 계약 유지
            </span>

            <h3>
              {contract.generation}
              세대 실손
            </h3>

            <p className="amount-label">
              연 보험료
            </p>

            <p className="amount">
              {currentAnnualPremium.toLocaleString()}
              원
            </p>

            <p className="amount-label">
              예상 자기부담금
            </p>

            <p>
              {formatAmount(
                currentResult
                  .totalSelfPayment
              )}
            </p>

            <p className="amount-label">
              보장 제외 의료비
            </p>

            <p>
              {formatAmount(
                currentResult
                  .totalExcludedExpense
              )}
            </p>

            <hr />

            <p className="amount-label">
              1년 예상 총부담
            </p>

            <p className="amount">
              {formatAmount(
                currentResult
                  .totalAnnualCost
              )}
            </p>
          </article>

          {/* 5세대 */}

          <article className="compare-card">
            <span className="status-badge primary">
              5세대 전환
            </span>

            <h3>
              5세대 실손
            </h3>

            <p className="amount-label">
              연 보험료
            </p>

            <p className="amount primary">
              {targetAnnualPremium.toLocaleString()}
              원
            </p>

            <p className="amount-label">
              예상 자기부담금
            </p>

            <p>
              {formatAmount(
                targetResult
                  .totalSelfPayment
              )}
            </p>

            <p className="amount-label">
              보장 제외 의료비
            </p>

            <p>
              {formatAmount(
                targetResult
                  .totalExcludedExpense
              )}
            </p>

            <hr />

            <p className="amount-label">
              1년 예상 총부담
            </p>

            <p className="amount primary">
              {formatAmount(
                targetResult
                  .totalAnnualCost
              )}
            </p>
          </article>
        </div>
      </section>

      {/* ======================================
          RESULT 2
          비교 요약
      ====================================== */}

      <section>
        <span className="step-badge">
          RESULT 2
        </span>

        <h2>
          비교 요약
        </h2>

        <div className="comparison-summary">
          <h3>
            {
              explanation.summary
            }
          </h3>

          {explanation.details.length >
          0 ? (
            explanation.details.map(
              (
                detail: string,
                index: number
              ) => (
                <p
                  key={
                    index
                  }
                >
                  {
                    detail
                  }
                </p>
              )
            )
          ) : (
            <p>
              추가로 표시할 비교 설명이
              없습니다.
            </p>
          )}
        </div>
      </section>

      {/* ======================================
          RESULT 3
          치료별 계산
      ====================================== */}

      <section>
        <span className="step-badge">
          RESULT 3
        </span>

        <h2>
          치료별 계산
        </h2>

        <div className="comparison-summary">
          <p className="amount-label">
            입력한 전체 예상 치료비
          </p>

          <p className="amount">
            {totalTreatmentCost.toLocaleString()}
            원
          </p>
        </div>

        {usages.map(
          (
            usage,
            index
          ) => {
            const currentItem =
              currentResult.items[
                index
              ];

            const targetItem =
              targetResult.items[
                index
              ];

            const currentRuleId =
              currentItem
                .selfPaymentResult
                .ruleId ??
              null;

            const targetRuleId =
              targetItem
                .selfPaymentResult
                .ruleId ??
              null;

            const targetExcludedRuleId =
              targetItem
                .excludedExpenseResult
                .ruleId;

            return (
              <article
                className="treatment-card"
                key={
                  usage.id
                }
              >
                <div className="treatment-card-header">
                  <div>
                    <span className="status-badge">
                      치료{" "}
                      {
                        index +
                        1
                      }
                    </span>

                    <h3>
                      {
                        usage.treatmentName
                      }
                    </h3>
                  </div>

                  <strong>
                    {currentItem.treatmentCost.toLocaleString()}
                    원
                  </strong>
                </div>

                {/* 입력 조건 */}

                <div className="form-grid">
                  <div>
                    <p className="amount-label">
                      입원 / 통원
                    </p>

                    <strong>
                      {getCareSettingLabel(
                        usage.careSetting
                      )}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      급여 여부
                    </p>

                    <strong>
                      {getBenefitLabel(
                        usage.benefitClass
                      )}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      중증 여부
                    </p>

                    <strong>
                      {getSeverityLabel(
                        usage.severityClass
                      )}
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      예상 횟수
                    </p>

                    <strong>
                      {
                        usage.frequency
                      }
                      회
                    </strong>
                  </div>

                  <div>
                    <p className="amount-label">
                      회당 비용
                    </p>

                    <strong>
                      {usage.unitCost.toLocaleString()}
                      원
                    </strong>
                  </div>
                </div>

                <hr />

                {/* 현재 계약 */}

                <h4>
                  현재 계약
                </h4>

                <p>
                  자기부담금:{" "}
                  <strong>
                    {formatAmount(
                      currentItem
                        .selfPaymentAmount
                    )}
                  </strong>
                </p>

                <p>
                  보장 제외:{" "}
                  <strong>
                    {formatAmount(
                      currentItem
                        .excludedAmount
                    )}
                  </strong>
                </p>

                {currentItem
                  .selfPaymentResult
                  .warning && (
                  <div className="notice-box warning">
                    {
                      currentItem
                        .selfPaymentResult
                        .warning
                    }
                  </div>
                )}

                {/* 5세대 */}

                <h4>
                  5세대 전환
                </h4>

                <p>
                  자기부담금:{" "}
                  <strong>
                    {formatAmount(
                      targetItem
                        .selfPaymentAmount
                    )}
                  </strong>
                </p>

                <p>
                  보장 제외:{" "}
                  <strong>
                    {formatAmount(
                      targetItem
                        .excludedAmount
                    )}
                  </strong>
                </p>

                {targetItem
                  .selfPaymentResult
                  .warning && (
                  <div className="notice-box warning">
                    {
                      targetItem
                        .selfPaymentResult
                        .warning
                    }
                  </div>
                )}

                {/* 현재 계약 RULE */}

                {currentRuleId && (
                  <div className="notice-box">
                    <strong>
                      현재 계약 적용 RULE
                    </strong>

                    <p>
                      {
                        currentRuleId
                      }
                    </p>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleToggleRuleDetail(
                          currentRuleId
                        )
                      }
                    >
                      {expandedRuleId ===
                      currentRuleId
                        ? "근거 닫기"
                        : "근거 보기"}
                    </button>

                    {expandedRuleId ===
                      currentRuleId && (
                      <div>
                        <p>
                          <strong>
                            요약
                          </strong>
                        </p>

                        <p>
                          적용된 자기부담 계산
                          룰입니다.
                        </p>

                        <p>
                          <strong>
                            상세
                          </strong>
                        </p>

                        <p>
                          {getRuleDescription(
                            currentRuleId
                          ) ??
                            "현재 룰셋에 상세 설명이 등록되어 있지 않습니다."}
                        </p>

                        <p>
                          <strong>
                            원문
                          </strong>
                        </p>

                        <p>
                          현재 MVP에는 배포가
                          허용된 원문 약관 조항이
                          연결되지 않아 원문을
                          임의로 표시하지 않습니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5세대 자기부담 RULE */}

                {targetRuleId && (
                  <div className="notice-box">
                    <strong>
                      5세대 적용 RULE
                    </strong>

                    <p>
                      {
                        targetRuleId
                      }
                    </p>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleToggleRuleDetail(
                          targetRuleId
                        )
                      }
                    >
                      {expandedRuleId ===
                      targetRuleId
                        ? "근거 닫기"
                        : "근거 보기"}
                    </button>

                    {expandedRuleId ===
                      targetRuleId && (
                      <div>
                        <p>
                          <strong>
                            요약
                          </strong>
                        </p>

                        <p>
                          5세대 자기부담금
                          계산에 적용된 룰입니다.
                        </p>

                        <p>
                          <strong>
                            상세
                          </strong>
                        </p>

                        <p>
                          {getRuleDescription(
                            targetRuleId
                          ) ??
                            "현재 룰셋에 상세 설명이 등록되어 있지 않습니다."}
                        </p>

                        <p>
                          <strong>
                            원문
                          </strong>
                        </p>

                        <p>
                          현재 MVP에는 배포가
                          허용된 원문 약관 조항이
                          연결되지 않아 원문을
                          임의로 표시하지 않습니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 보장 제외 RULE */}

                {targetExcludedRuleId && (
                  <div className="notice-box warning">
                    <strong>
                      보장 제외 RULE
                    </strong>

                    <p>
                      {
                        targetExcludedRuleId
                      }
                    </p>

                    <p>
                      {
                        targetItem
                          .excludedExpenseResult
                          .reason
                      }
                    </p>
                  </div>
                )}

                {/* UNKNOWN */}

                {(usage.benefitClass ===
                  "UNKNOWN" ||
                  usage.severityClass ===
                    "UNKNOWN") && (
                  <div className="notice-box warning">
                    이 치료에는 확인되지 않은
                    분류가 포함되어 있습니다.
                    임의로 급여 또는 중증 여부를
                    추정하지 않았습니다.
                  </div>
                )}
              </article>
            );
          }
        )}
      </section>

      {/* ======================================
          RESULT 4
          보장 공백
      ====================================== */}

      <section>
        <span className="step-badge">
          RESULT 4
        </span>

        <h2>
          보장 공백
        </h2>

        <div className="comparison-summary">
          <p className="amount-label">
            확인 필요 항목
          </p>

          <p className="amount">
            {
              coverageGapIssueCount
            }
            건
          </p>
        </div>

        {coverageGaps.map(
          (gap) => (
            <article
              className="treatment-card"
              key={
                gap.usageId
              }
            >
              <h3>
                {
                  gap.treatmentName
                }
              </h3>

              <span
                className={
                  gap.type ===
                  "NONE"
                    ? "status-badge success"
                    : "status-badge warning"
                }
              >
                {
                  gap.title
                }
              </span>

              <p>
                {
                  gap.message
                }
              </p>

              {gap.differenceAmount !==
                null &&
                gap.differenceAmount >
                  0 && (
                  <p>
                    차이 금액:{" "}
                    <strong>
                      {gap.differenceAmount.toLocaleString()}
                      원
                    </strong>
                  </p>
                )}

              {gap.reasons.map(
                (
                  reason,
                  index
                ) => (
                  <p
                    key={
                      index
                    }
                  >
                    ·{" "}
                    {
                      reason
                    }
                  </p>
                )
              )}

              {(gap.currentRuleId ||
                gap.targetRuleId) && (
                <p className="treatment-meta">
                  현재 RULE:{" "}
                  {gap.currentRuleId ??
                    "없음"}
                  <br />
                  5세대 RULE:{" "}
                  {gap.targetRuleId ??
                    "없음"}
                </p>
              )}
            </article>
          )
        )}
      </section>

      {/* ======================================
          RESULT 5
          손익분기점
      ====================================== */}

      <section>
        <span className="step-badge">
          RESULT 5
        </span>

        <h2>
          결과가 바뀌는 지점
        </h2>

        <div className="notice-box">
          손익분기점은 현재 입력한 회당 비용과
          계산 가능한 자기부담 구조를 이용한
          단순 비교입니다.
        </div>

        {breakEvenResults.map(
          ({
            usage,
            result,
          }) => (
            <article
              className="treatment-card"
              key={
                usage.id
              }
            >
              <h3>
                {
                  usage.treatmentName
                }
              </h3>

              {result.status ===
              "AVAILABLE" ? (
                <>
                  <span className="status-badge primary">
                    손익분기점 계산 가능
                  </span>

                  <p>
                    {
                      result.message
                    }
                  </p>

                  <p>
                    손익분기 치료비:{" "}
                    <strong>
                      {result.breakEvenTreatmentCost?.toLocaleString()}
                      원
                    </strong>
                  </p>

                  <p>
                    예상 횟수:{" "}
                    <strong>
                      {result.breakEvenFrequency?.toFixed(
                        2
                      )}
                      회
                    </strong>
                  </p>

                  <p>
                    정수 기준:{" "}
                    <strong>
                      {
                        result.firstWholeFrequency
                      }
                      회 부근
                    </strong>
                  </p>
                </>
              ) : (
                <>
                  <span className="status-badge warning">
                    계산 불가
                  </span>

                  <p>
                    {
                      result.message
                    }
                  </p>

                  {result.reason && (
                    <p>
                      사유:{" "}
                      {
                        result.reason
                      }
                    </p>
                  )}
                </>
              )}
            </article>
          )
        )}
      </section>

      {/* ======================================
          RESULT 6
          보험사 질문
      ====================================== */}

      <section>
        <span className="step-badge">
          RESULT 6
        </span>

        <h2>
          보험사에 확인할 질문
        </h2>

        {explanation.questions.map(
          (
            question: string,
            index: number
          ) => (
            <div
              className="notice-box"
              key={
                index
              }
            >
              <strong>
                Q{index + 1}.
              </strong>{" "}
              {
                question
              }
            </div>
          )
        )}
      </section>

      {/* ======================================
          계약 / 계산 가정
      ====================================== */}

      <section className="app-card">
        <span className="step-badge">
          계산 가정
        </span>

        <h2 className="card-title">
          적용 조건
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
              시나리오
            </p>

            <strong>
              유지 ±0%
            </strong>
          </div>

          <div>
            <p className="amount-label">
              현재 계약 세대
            </p>

            <strong>
              {
                contract.generation
              }
              세대
            </strong>
          </div>

          <div>
            <p className="amount-label">
              룰셋
            </p>

            <strong>
              {
                ruleSet.rulesetVersion
              }
            </strong>
          </div>

          <div>
            <p className="amount-label">
              갱신주기
            </p>

            <strong>
              {contract.renewalCycleMonths
                ? `${contract.renewalCycleMonths}개월`
                : "확인 필요"}
            </strong>
          </div>

          <div>
            <p className="amount-label">
              재가입주기
            </p>

            <strong>
              {contract.reentryCycleMonths
                ? `${contract.reentryCycleMonths}개월`
                : "확인 필요"}
            </strong>
          </div>
        </div>

        <div className="notice-box">
          입력한 예정 치료의 횟수와
          회당 비용을 그대로 유지한다고
          가정했습니다.
        </div>
      </section>

      {/* ======================================
          계산식
      ====================================== */}

      <section className="app-card">
        <h2 className="card-title">
          계산 방식
        </h2>

        <p>
          연 보험료 =
          월 보험료 × 12개월
        </p>

        <p>
          치료비 =
          치료 횟수 × 회당 비용
        </p>

        <p>
          <strong>
            1년 총부담 =
            연 보험료 +
            자기부담금 +
            보장 제외 의료비
          </strong>
        </p>

        <p>
          UNKNOWN 또는 지원되지 않는
          룰은 0원으로 처리하지 않고
          계산 불가 상태로 유지합니다.
        </p>
      </section>

      {/* ======================================
          최종 고지
      ====================================== */}

      <div className="notice-box warning">
        <strong>
          모의 계산 결과입니다.
        </strong>

        <p>
          본 결과는 사용자가 입력한 정보와
          현재 MVP 룰셋을 이용한
          비교 결과입니다.
        </p>

        <p>
          실제 보험금 지급액,
          보험 가입 가능 여부,
          실제 전환 보험료를 확정하지 않으며
          특정 보험상품의 유지 또는 전환을
          권유하지 않습니다.
        </p>
      </div>

      {/* ======================================
          버튼
      ====================================== */}

      <div className="button-group">
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate(
              "/confirm"
            )
          }
        >
          이전
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate(
              "/input"
            )
          }
        >
          입력 수정
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={
            handleStartOver
          }
        >
          새 비교 시작하기
        </button>
      </div>
    </main>
  );
}

export default M04ResultPage;