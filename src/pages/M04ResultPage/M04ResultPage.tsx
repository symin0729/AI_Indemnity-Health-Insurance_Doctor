import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAnalysisStore } from "../../store/useAnalysisStore";

import {
  analyzeCoverageGaps,
} from "../../engine/analyzeCoverageGap";

import {
  loadRuleSet,
  type RuleSet,
} from "../../engine/loadRuleSet";

import {
  explanationService,
} from "../../services/explanationService";

import {
  calculationService,
  type CalculationInput,
} from "../../services/calculationService";

import {
  createRuleTrace,
} from "../../engine/createRuleTrace";

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
  ] = useState<string | null>(
    null
  );

  const [
    expandedRuleId,
    setExpandedRuleId,
  ] = useState<string | null>(
    null
  );

  const [
    isResetModalOpen,
    setIsResetModalOpen,
  ] = useState(false);

  useEffect(() => {
    const fetchRuleSet =
      async () => {
        try {
          setIsRuleLoading(true);
          setRuleLoadError(null);

          const loadedRuleSet =
            await loadRuleSet(
              "mvp-v1"
            );

          setRuleSet(
            loadedRuleSet
          );
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
          setIsRuleLoading(
            false
          );
        }
      };

    fetchRuleSet();
  }, []);

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
            먼저 보험과 예정 치료
            정보를 입력해주세요.
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
      </main>
    );
  }

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
            계산 룰을 불러오는
            중입니다.
          </p>
        </header>
      </main>
    );
  }

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

        <div className="notice-box error">
          계산 룰을 불러오지
          못했습니다.
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
      </main>
    );
  }

  if (
    target5GMonthlyPremium ===
      null ||
    usages.length === 0
  ) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            비교 계산에 필요한 정보가 없습니다.
          </h1>

          <p className="page-description">
            5세대 비교용 보험료와
            예정 치료를 다시 확인해주세요.
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
      </main>
    );
  }

  // ========================================
  // CalculationService
  //
  // M04 화면은 숫자를 직접 계산하지 않고,
  // 순수 TypeScript 계산 서비스의 결과를
  // 화면에 표시한다.
  // ========================================

  const calculationInput:
    CalculationInput = {
    contract,

    target5GMonthlyPremium,

    target5GCoverages,

    usages,

    ruleSet,
  };

  const calculationValidation =
    calculationService.validate(
      calculationInput
    );

  if (
    !calculationValidation.valid
  ) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            입력 정보를 확인해주세요.
          </h1>
        </header>

        <div className="notice-box error">
          {calculationValidation.errors.map(
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
      </main>
    );
  }

  const calculationResult =
    calculationService.calculate(
      calculationInput
    );

  const currentResult =
    calculationResult.current;

  const targetResult =
    calculationResult.target5G;

  const currentAnnualPremium =
    currentResult.annualPremium;

  const targetAnnualPremium =
    targetResult.annualPremium;

  // ========================================
  // 보장 제외 공백
  // ========================================

  const excludedCoverageItems =
    targetResult === null
      ? []
      : usages
          .map(
            (usage, index) => ({
              usage,

              currentItem:
                currentResult
                  .items[index],

              targetItem:
                targetResult
                  .items[index],
            })
          )
          .filter(
            ({
              currentItem,
              targetItem,
            }) =>
              currentItem
                .excludedExpenseResult
                .status ===
                "EXCLUDED" ||
              targetItem
                .excludedExpenseResult
                .status ===
                "EXCLUDED"
          );

  // ========================================
  // 자기부담/확인 필요 공백
  //
  // 보장 제외로 이미 판정된 항목은
  // 자기부담 공백 분석에서 중복 제외
  // ========================================

  const selfPaymentCoverageGapResults =
    targetResult === null
      ? []
      : analyzeCoverageGaps(
          usages
            .map(
              (usage, index) => ({
                usage,

                currentItem:
                  currentResult
                    .items[index],

                targetItem:
                  targetResult
                    .items[index],
              })
            )
            .filter(
              ({
                currentItem,
                targetItem,
              }) =>
                currentItem
                  .excludedExpenseResult
                  .status !==
                  "EXCLUDED" &&
                targetItem
                  .excludedExpenseResult
                  .status !==
                  "EXCLUDED"
            )
            .map(
              ({
                usage,
                currentItem,
                targetItem,
              }) => ({
                usage,

                treatmentCost:
                  currentItem
                    .treatmentCost,

                currentSelfPaymentResult:
                  currentItem
                    .selfPaymentResult,

                targetSelfPaymentResult:
                  targetItem
                    .selfPaymentResult,
              })
            )
        );

  const selfPaymentGapIssueCount =
    selfPaymentCoverageGapResults.filter(
      (gap) =>
        gap.type !== "NONE"
    ).length;

  const coverageGapIssueCount =
    excludedCoverageItems.length +
    selfPaymentGapIssueCount;

  // ========================================
  // 손익분기점
  // ========================================

  const breakEvenResults =
    usages.flatMap(
      (usage) => {
        const result =
          calculationService.calculateBreakEven(
            calculationInput,
            usage.id
          );

        if (!result) {
          return [];
        }

        return [
          {
            usage,
            result,
          },
        ];
      }
    );

  const availableBreakEvenCount =
    breakEvenResults.filter(
      (item) =>
        item.result.status ===
        "AVAILABLE"
    ).length;

  const totalTreatmentCost =
    usages.reduce(
      (sum, usage) =>
        sum +
        usage.frequency *
          usage.unitCost,
      0
    );

  const annualPremiumDifference =
    targetAnnualPremium ===
    null
      ? null
      : Math.abs(
          currentAnnualPremium -
            targetAnnualPremium
        );

  const isFullComparisonAvailable =
    currentResult
      .totalAnnualCost !== null &&
    targetResult !== null &&
    targetResult
      .totalAnnualCost !== null;

  let comparisonMessage =
    "현재 계약의 일부 계산 룰 또는 보장 제외 조건이 확인되지 않아 최종 부담액 비교를 확정할 수 없습니다.";

  if (
    isFullComparisonAvailable &&
    targetResult
  ) {
    const currentCost =
      currentResult
        .totalAnnualCost!;

    const targetCost =
      targetResult
        .totalAnnualCost!;

    const difference =
      Math.abs(
        currentCost -
          targetCost
      );

    if (
      currentCost <
      targetCost
    ) {
      comparisonMessage =
        `현재 계약 유지의 예상 연간 부담이 ${difference.toLocaleString()}원 낮습니다.`;
    } else if (
      targetCost <
      currentCost
    ) {
      comparisonMessage =
        `5세대 전환의 예상 연간 부담이 ${difference.toLocaleString()}원 낮습니다.`;
    } else {
      comparisonMessage =
        "두 선택지의 예상 연간 총 부담액이 같습니다.";
    }
  }

  // ========================================
  // 보험사 확인 질문
  // ========================================

  const insurerQuestions:
    string[] = [];

  if (
    currentResult
      .hasUnsupportedCalculation
  ) {
    insurerQuestions.push(
      "현재 계약에서 입력한 치료가 실제로 보장되는지, 치료별 자기부담률과 보장 제외 조건을 확인해주세요."
    );
  }

  if (
    !contract.coverages.includes(
      "SPECIAL_RIDER_2"
    )
  ) {
    insurerQuestions.push(
      "현재 계약에 비급여 관련 특약이 가입되어 있는지, 가입되어 있다면 정확한 특약명과 보장 조건을 확인해주세요."
    );
  }

  usages.forEach(
    (usage) => {
      if (
        usage.benefitClass ===
        "UNKNOWN"
      ) {
        insurerQuestions.push(
          `${usage.treatmentName}: 해당 치료가 급여인지 비급여인지 확인해주세요.`
        );
      }

      if (
        usage.severityClass ===
        "UNKNOWN"
      ) {
        insurerQuestions.push(
          `${usage.treatmentName}: 약관 계산에 필요한 중증/비중증 구분 기준을 확인해주세요.`
        );
      }
    }
  );

  insurerQuestions.push(
    "5세대 전환 시 실제 적용되는 월 보험료와 가입 가능 조건은 보험사에 별도로 확인해주세요."
  );

  const uniqueInsurerQuestions =
    Array.from(
      new Set(
        insurerQuestions
      )
    );

  // ========================================
  // 결과 해설 템플릿
  //
  // 외부 LLM을 호출하지 않고
  // 이미 계산된 결과만 문장으로 설명
  // ========================================

  const explanationResult =
    explanationService.create({
      currentTotalAnnualCost:
        currentResult.totalAnnualCost,

      targetTotalAnnualCost:
        targetResult?.totalAnnualCost ??
        null,

      currentTotalSelfPayment:
        currentResult.totalSelfPayment,

      targetTotalSelfPayment:
        targetResult === null ||
        currentResult
          .hasUnsupportedCalculation ||
        targetResult
          .hasUnsupportedCalculation
          ? null
          : targetResult.totalSelfPayment,

      currentExcludedExpense:
        currentResult
          .totalExcludedExpense,

      targetExcludedExpense:
        targetResult
          ?.totalExcludedExpense ??
        null,

      coverageGapCount:
        coverageGapIssueCount,

      hasUnsupportedCalculation:
        currentResult
          .hasUnsupportedCalculation ||
        targetResult === null ||
        targetResult
          .hasUnsupportedCalculation,
    });

  const handleToggleRuleDetail = (
    ruleId: string
  ) => {
    setExpandedRuleId(
      (current) =>
        current === ruleId
          ? null
          : ruleId
    );
  };

  const handleStartOver =
    () => {
      setIsResetModalOpen(true);
    };

  const handleConfirmStartOver =
    () => {
      setIsResetModalOpen(false);

      resetAnalysis();

      navigate("/");
    };

  const handleCancelStartOver =
    () => {
      setIsResetModalOpen(false);
    };

  return (
    <main>
      <header
        className="page-header"
        style={{
          position: "relative",
          maxWidth: "none",
          padding: "clamp(22px, 4vw, 36px)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          background:
            "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 72%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "clamp(18px, 4vw, 42px)",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              flex: "1 1 480px",
              minWidth: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <span className="page-brand">
              AI 실손 닥터
            </span>

            <h1
              style={{
                marginTop: "18px",
                maxWidth: "680px",
              }}
            >
              보험 비교 결과
            </h1>

            <p
              className="page-description"
              style={{
                maxWidth: "640px",
                marginBottom: "18px",
              }}
            >
              입력한 의료이용 조건을
              기준으로 현재 계약 유지와
              5세대 전환의 1년 예상 부담을
              비교합니다.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span className="rule-info">
                1년 총부담 비교
              </span>

              <span className="rule-info">
                보장 공백 확인
              </span>

              <span className="rule-info">
                룰셋{" "}
                {ruleSet.rulesetVersion}
              </span>
            </div>
          </div>

          <div
            style={{
              flex: "0 1 320px",
              width: "min(100%, 320px)",
              marginLeft: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src="/ai-insurance-result.png"
              alt="보험 비교 결과 리포트를 보여주는 AI 도우미 일러스트"
              style={{
                width: "100%",
                maxWidth: "320px",
                height: "auto",
                objectFit: "contain",
                filter:
                  "drop-shadow(0 16px 28px rgba(21, 55, 91, 0.14))",
              }}
            />
          </div>
        </div>
      </header>

      {/* RESULT 1 */}
      <section>
        <span className="step-badge">
          RESULT 1
        </span>

        <h2>
          1년 예상 부담 비교
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
              월 보험료
            </p>

            <p>
              <strong>
                {contract.monthlyPremium.toLocaleString()}
                원
              </strong>
            </p>

            <p className="amount-label">
              연 보험료
            </p>

            <p className="amount">
              {currentAnnualPremium.toLocaleString()}
              원
            </p>

            <hr />

            <p className="amount-label">
              예상 자기부담금
            </p>

            {currentResult
              .hasUnsupportedCalculation ? (
              <p>
                <span className="status-badge warning">
                  계산 확인 필요
                </span>
              </p>
            ) : (
              <p className="amount">
                {currentResult.totalSelfPayment.toLocaleString()}
                원
              </p>
            )}

            <p className="amount-label">
              보장 제외 의료비
            </p>

            {currentResult
              .totalExcludedExpense ===
            null ? (
              <p>
                <span className="status-badge warning">
                  확인 필요
                </span>
              </p>
            ) : (
              <p className="amount">
                {currentResult.totalExcludedExpense.toLocaleString()}
                원
              </p>
            )}

            <p className="amount-label">
              예상 총 부담액
            </p>

            {currentResult
              .totalAnnualCost ===
            null ? (
              <p>
                <span className="status-badge warning">
                  계산 불가
                </span>
              </p>
            ) : (
              <p className="amount">
                {currentResult.totalAnnualCost.toLocaleString()}
                원
              </p>
            )}
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
              비교용 월 보험료
            </p>

            <p>
              <strong>
                {target5GMonthlyPremium ===
                null
                  ? "입력되지 않음"
                  : `${target5GMonthlyPremium.toLocaleString()}원`}
              </strong>
            </p>

            <p className="amount-label">
              연 보험료
            </p>

            <p className="amount primary">
              {targetAnnualPremium ===
              null
                ? "계산 불가"
                : `${targetAnnualPremium.toLocaleString()}원`}
            </p>

            <hr />

            <p className="amount-label">
              예상 자기부담금
            </p>

            {targetResult ===
            null ? (
              <p>
                <span className="status-badge warning">
                  계산 불가
                </span>
              </p>
            ) : targetResult
                .hasUnsupportedCalculation ? (
              <p>
                <span className="status-badge warning">
                  계산 확인 필요
                </span>
              </p>
            ) : (
              <p className="amount primary">
                {targetResult.totalSelfPayment.toLocaleString()}
                원
              </p>
            )}

            <p className="amount-label">
              보장 제외 의료비
            </p>

            {targetResult ===
              null ||
            targetResult
              .totalExcludedExpense ===
              null ? (
              <p>
                <span className="status-badge warning">
                  확인 필요
                </span>
              </p>
            ) : (
              <p className="amount primary">
                {targetResult.totalExcludedExpense.toLocaleString()}
                원
              </p>
            )}

            <p className="amount-label">
              예상 총 부담액
            </p>

            {targetResult ===
              null ||
            targetResult
              .totalAnnualCost ===
              null ? (
              <p>
                <span className="status-badge warning">
                  계산 불가
                </span>
              </p>
            ) : (
              <p className="amount primary">
                {targetResult.totalAnnualCost.toLocaleString()}
                원
              </p>
            )}
          </article>
        </div>
      </section>

      {/* 보험료 차이 */}
      {annualPremiumDifference !==
        null && (
        <section>
          <div className="comparison-summary">
            <p className="amount-label">
              연 보험료 차이
            </p>

            <p className="amount">
              {annualPremiumDifference.toLocaleString()}
              원
            </p>

            <p>
              현재 계약 연 보험료{" "}
              <strong>
                {currentAnnualPremium.toLocaleString()}
                원
              </strong>
              과 5세대 비교용
              연 보험료{" "}
              <strong>
                {targetAnnualPremium?.toLocaleString()}
                원
              </strong>
              의 차이입니다.
            </p>
          </div>
        </section>
      )}

      {/* RESULT 2 */}
      <section>
        <span className="step-badge">
          RESULT 2
        </span>

        <h2>
          비교 결과
        </h2>

        <div className="comparison-summary">
          {isFullComparisonAvailable ? (
            <span className="status-badge success">
              비교 가능
            </span>
          ) : (
            <span className="status-badge warning">
              일부 계산 제한
            </span>
          )}

          <h3>
            {comparisonMessage}
          </h3>

          {!isFullComparisonAvailable && (
            <p>
              확인되지 않은 룰이나
              보장 조건에 임의의 숫자를
              적용하지 않았습니다.
            </p>
          )}
        </div>
      </section>

      {/* RESULT 3 */}
      <section>
        <span className="step-badge">
          RESULT 3
        </span>

        <h2>
          예정 치료 상세
        </h2>

        <div className="comparison-summary">
          <p className="amount-label">
            전체 예상 치료비
          </p>

          <p className="amount">
            {totalTreatmentCost.toLocaleString()}
            원
          </p>

          <p>
            입력한 모든 예정 치료의
            예상 비용 합계입니다.
          </p>
        </div>

        {usages.map(
          (usage, index) => {
            const currentItem =
              currentResult
                .items[index];

            const targetItem =
              targetResult
                ?.items[index];

            const matchedTargetRule =
              targetItem
                ?.selfPaymentResult
                .ruleId
                ? ruleSet.rules.find(
                    (rule) =>
                      rule.ruleId ===
                      targetItem
                        .selfPaymentResult
                        .ruleId
                  )
                : undefined;

            const targetTraceRuleId =
              targetItem
                ?.excludedExpenseResult
                .ruleId ??
              targetItem
                ?.selfPaymentResult
                .ruleId ??
              null;

            const targetRuleTrace =
              targetItem
                ? createRuleTrace({
                    ruleId:
                      targetTraceRuleId,

                    condition:
                      [
                        "5세대",
                        usage.careSetting ===
                        "OUTPATIENT"
                          ? "통원"
                          : "입원",
                        usage.benefitClass,
                        usage.severityClass,
                        target5GCoverages.length >
                        0
                          ? `특약: ${target5GCoverages.join(
                              ", "
                            )}`
                          : "비교용 특약 없음",
                      ].join(" · "),

                    calculation:
                      targetItem
                        .excludedExpenseResult
                        .status ===
                      "EXCLUDED"
                        ? `${targetItem.treatmentCost.toLocaleString()}원 전액을 보장 제외 의료비로 분리`
                        : matchedTargetRule &&
                            targetItem
                              .selfPaymentResult
                              .amount !==
                              null
                          ? `${targetItem.treatmentCost.toLocaleString()}원 × ${Math.round(
                              matchedTargetRule.selfPaymentRate *
                                100
                            )}% = ${targetItem.selfPaymentResult.amount.toLocaleString()}원`
                          : "현재 MVP에서 계산 근거 확인 필요",

                    rulesetVersion:
                      ruleSet.rulesetVersion,
                  })
                : null;

            return (
              <article
                className="treatment-card"
                key={usage.id}
              >
                <div className="treatment-card-header">
                  <div>
                    <span className="status-badge">
                      치료{" "}
                      {index + 1}
                    </span>

                    <h3>
                      {
                        usage.treatmentName
                      }
                    </h3>

                    <p className="treatment-meta">
                      {usage.careSetting ===
                      "OUTPATIENT"
                        ? "통원"
                        : "입원"}
                      {" · "}
                      {usage.frequency}
                      회 ×{" "}
                      {usage.unitCost.toLocaleString()}
                      원
                    </p>
                  </div>

                  <div>
                    <p className="amount-label">
                      총 치료비
                    </p>

                    <strong>
                      {currentItem.treatmentCost.toLocaleString()}
                      원
                    </strong>
                  </div>
                </div>

                <hr />

                <div className="card-grid">
                  {/* 현재 계약 */}
                  <div>
                    <span className="status-badge">
                      현재 계약
                    </span>

                    <p className="amount-label">
                      예상 자기부담금
                    </p>

                    {currentItem
                      .excludedExpenseResult
                      .status ===
                    "EXCLUDED" ? (
                      <p>
                        보장 제외 항목으로
                        분리
                      </p>
                    ) : currentItem
                        .selfPaymentResult
                        .amount ===
                      null ? (
                      <>
                        <p>
                          <span className="status-badge warning">
                            계산 불가
                          </span>
                        </p>

                        {currentItem
                          .selfPaymentResult
                          .warning && (
                          <p className="treatment-meta">
                            {
                              currentItem
                                .selfPaymentResult
                                .warning
                            }
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="amount">
                        {currentItem.selfPaymentResult.amount.toLocaleString()}
                        원
                      </p>
                    )}

                    <p className="amount-label">
                      보장 제외 의료비
                    </p>

                    <p>
                      {currentItem
                        .excludedExpenseResult
                        .amount ===
                      null
                        ? "확인 필요"
                        : `${currentItem.excludedExpenseResult.amount.toLocaleString()}원`}
                    </p>

                    {currentItem
                      .excludedExpenseResult
                      .ruleId && (
                      <p>
                        <span className="rule-info">
                          {
                            currentItem
                              .excludedExpenseResult
                              .ruleId
                          }
                        </span>
                      </p>
                    )}
                  </div>

                  {/* 5세대 */}
                  <div>
                    <span className="status-badge primary">
                      5세대 전환
                    </span>

                    {targetItem ? (
                      <>
                        <p className="amount-label">
                          예상 자기부담금
                        </p>

                        {targetItem
                          .excludedExpenseResult
                          .status ===
                        "EXCLUDED" ? (
                          <p>
                            보장 제외 항목으로
                            분리
                          </p>
                        ) : targetItem
                            .selfPaymentResult
                            .amount ===
                          null ? (
                          <>
                            <p>
                              <span className="status-badge warning">
                                계산 불가
                              </span>
                            </p>

                            {targetItem
                              .selfPaymentResult
                              .warning && (
                              <p className="treatment-meta">
                                {
                                  targetItem
                                    .selfPaymentResult
                                    .warning
                                }
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="amount primary">
                            {targetItem.selfPaymentResult.amount.toLocaleString()}
                            원
                          </p>
                        )}

                        <p className="amount-label">
                          보장 제외 의료비
                        </p>

                        <p>
                          {targetItem
                            .excludedExpenseResult
                            .amount ===
                          null
                            ? "확인 필요"
                            : `${targetItem.excludedExpenseResult.amount.toLocaleString()}원`}
                        </p>

                        {targetItem
                          .excludedExpenseResult
                          .ruleId && (
                          <p>
                            <span className="rule-info">
                              {
                                targetItem
                                  .excludedExpenseResult
                                  .ruleId
                              }
                            </span>
                          </p>
                        )}

                        {targetItem
                          .selfPaymentResult
                          .ruleId && (
                          <div>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                handleToggleRuleDetail(
                                  targetItem
                                    .selfPaymentResult
                                    .ruleId!
                                )
                              }
                            >
                              {expandedRuleId ===
                              targetItem
                                .selfPaymentResult
                                .ruleId
                                ? "적용 룰 닫기"
                                : "적용 룰 상세 보기"}
                            </button>

                            <p>
                              <span className="rule-info">
                                {
                                  targetItem
                                    .selfPaymentResult
                                    .ruleId
                                }
                              </span>
                            </p>
                          </div>
                        )}

                        {matchedTargetRule &&
                          expandedRuleId ===
                            matchedTargetRule.ruleId && (
                            <div className="app-card">
                              <span className="status-badge primary">
                                요약
                              </span>

                              <h3>
                                적용 룰
                              </h3>

                              <p>
                                {
                                  matchedTargetRule.description
                                }
                              </p>

                              <hr />

                              <div className="form-grid">
                                <div>
                                  <p className="amount-label">
                                    적용 세대
                                  </p>

                                  <strong>
                                    {
                                      matchedTargetRule.generation
                                    }
                                    세대
                                  </strong>
                                </div>

                                <div>
                                  <p className="amount-label">
                                    입원/통원
                                  </p>

                                  <strong>
                                    {matchedTargetRule.careSetting ===
                                    "OUTPATIENT"
                                      ? "통원"
                                      : "입원"}
                                  </strong>
                                </div>

                                <div>
                                  <p className="amount-label">
                                    급여 구분
                                  </p>

                                  <strong>
                                    {
                                      matchedTargetRule.benefitClass
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <p className="amount-label">
                                    중증 구분
                                  </p>

                                  <strong>
                                    {
                                      matchedTargetRule.severityClass
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <p className="amount-label">
                                    필요 특약
                                  </p>

                                  <strong>
                                    {
                                      matchedTargetRule.requiredCoverage
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <p className="amount-label">
                                    자기부담률
                                  </p>

                                  <strong>
                                    {Math.round(
                                      matchedTargetRule.selfPaymentRate *
                                        100
                                    )}
                                    %
                                  </strong>
                                </div>

                                <div>
                                  <p className="amount-label">
                                    RULE ID
                                  </p>

                                  <strong>
                                    {
                                      matchedTargetRule.ruleId
                                    }
                                  </strong>
                                </div>
                              </div>

                              {targetRuleTrace && (
                                <>
                                  <hr />

                                  <h3>
                                    Rule Trace
                                  </h3>

                                  <div className="form-grid">
                                    <div>
                                      <p className="amount-label">
                                        Rule ID
                                      </p>

                                      <strong>
                                        {
                                          targetRuleTrace.ruleId
                                        }
                                      </strong>
                                    </div>

                                    <div>
                                      <p className="amount-label">
                                        적용 조건
                                      </p>

                                      <strong>
                                        {
                                          targetRuleTrace.condition
                                        }
                                      </strong>
                                    </div>

                                    <div>
                                      <p className="amount-label">
                                        계산식
                                      </p>

                                      <strong>
                                        {
                                          targetRuleTrace.calculation
                                        }
                                      </strong>
                                    </div>

                                    <div>
                                      <p className="amount-label">
                                        근거 문서
                                      </p>

                                      <strong>
                                        {
                                          targetRuleTrace.sourceDocument
                                        }
                                      </strong>
                                    </div>

                                    <div>
                                      <p className="amount-label">
                                        문서 버전
                                      </p>

                                      <strong>
                                        {
                                          targetRuleTrace.documentVersion
                                        }
                                      </strong>
                                    </div>

                                    <div>
                                      <p className="amount-label">
                                        시행일
                                      </p>

                                      <strong>
                                        {
                                          targetRuleTrace.effectiveDate
                                        }
                                      </strong>
                                    </div>

                                    <div>
                                      <p className="amount-label">
                                        검증 상태
                                      </p>

                                      <strong>
                                        {targetRuleTrace.verificationStatus ===
                                        "VERIFIED"
                                          ? "검증 완료"
                                          : "보험사 확인 필요"}
                                      </strong>
                                    </div>
                                  </div>
                                </>
                              )}

                              <hr />

                              <div
                                style={{
                                  display: "grid",
                                  gap: "12px",
                                }}
                              >
                                <div>
                                  <p
                                    className="amount-label"
                                    style={{
                                      marginBottom: "4px",
                                    }}
                                  >
                                    근거 확인 3단계
                                  </p>

                                  <h3
                                    style={{
                                      marginBottom: "6px",
                                    }}
                                  >
                                    약관 원문 확인
                                  </h3>

                                  <p
                                    className="treatment-meta"
                                    style={{
                                      marginBottom: 0,
                                    }}
                                  >
                                    계산에 사용한 룰의 요약과 상세
                                    근거를 확인한 뒤, 실제 계약
                                    약관의 원문 조항은 보험사에서
                                    최종 확인해야 합니다.
                                  </p>
                                </div>

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(3, minmax(0, 1fr))",
                                    gap: "10px",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "14px",
                                      border:
                                        "1px solid var(--color-border)",
                                      borderRadius:
                                        "var(--radius-sm)",
                                      background: "#ffffff",
                                    }}
                                  >
                                    <span className="status-badge success">
                                      1
                                    </span>

                                    <p
                                      className="amount-label"
                                      style={{
                                        marginTop: "10px",
                                      }}
                                    >
                                      요약
                                    </p>

                                    <strong>
                                      적용 룰 확인 완료
                                    </strong>
                                  </div>

                                  <div
                                    style={{
                                      padding: "14px",
                                      border:
                                        "1px solid var(--color-border)",
                                      borderRadius:
                                        "var(--radius-sm)",
                                      background: "#ffffff",
                                    }}
                                  >
                                    <span className="status-badge success">
                                      2
                                    </span>

                                    <p
                                      className="amount-label"
                                      style={{
                                        marginTop: "10px",
                                      }}
                                    >
                                      상세
                                    </p>

                                    <strong>
                                      Rule Trace 확인 가능
                                    </strong>
                                  </div>

                                  <div
                                    style={{
                                      padding: "14px",
                                      border:
                                        "1px solid var(--color-border)",
                                      borderRadius:
                                        "var(--radius-sm)",
                                      background: "#ffffff",
                                    }}
                                  >
                                    <span className="status-badge warning">
                                      3
                                    </span>

                                    <p
                                      className="amount-label"
                                      style={{
                                        marginTop: "10px",
                                      }}
                                    >
                                      원문
                                    </p>

                                    <strong>
                                      보험사 확인 필요
                                    </strong>
                                  </div>
                                </div>

                                <div className="notice-box warning">
                                  <strong>
                                    실제 약관 원문은 현재 MVP에
                                    연결되어 있지 않습니다.
                                  </strong>

                                  <p
                                    style={{
                                      margin:
                                        "7px 0 0",
                                    }}
                                  >
                                    보험사·상품별 약관 조문이
                                    검증되지 않은 상태에서 임의의
                                    조문번호나 원문을 표시하지
                                    않습니다. 실제 계약 약관에서
                                    적용 특약, 자기부담 기준,
                                    보장 제외, 한도·횟수를 확인해
                                    주세요.
                                  </p>
                                </div>

                                <div
                                  style={{
                                    padding: "15px 16px",
                                    border:
                                      "1px dashed var(--color-border-strong)",
                                    borderRadius:
                                      "var(--radius-sm)",
                                    background:
                                      "var(--color-surface-soft)",
                                  }}
                                >
                                  <p
                                    className="amount-label"
                                    style={{
                                      marginBottom: "8px",
                                    }}
                                  >
                                    보험사에 이렇게 확인하세요
                                  </p>

                                  <p
                                    style={{
                                      margin: 0,
                                      lineHeight: 1.7,
                                    }}
                                  >
                                    “제 계약에서 이 치료에 적용되는
                                    특약과 자기부담 기준, 보장 제외
                                    여부, 연간 한도·횟수, 해당 약관
                                    조문을 확인해 주세요.”
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <p>
                        <span className="status-badge warning">
                          계산 불가
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          }
        )}
      </section>

      {/* RESULT 4 */}
      <section>
        <span className="step-badge">
          RESULT 4
        </span>

        <h2>
          보장 공백 분석
        </h2>

        <div
          className="comparison-summary"
          style={{
            padding:
              "clamp(22px, 4vw, 32px)",
            background:
              "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 78%)",
          }}
        >
          {targetResult ===
          null ? (
            <>
              <span className="status-badge warning">
                분석 불가
              </span>

              <h3
                style={{
                  margin:
                    "14px 0 6px",
                }}
              >
                비교 결과가 없어 보장 변화를
                확인할 수 없습니다.
              </h3>
            </>
          ) : coverageGapIssueCount >
            0 ? (
            <>
              <span className="status-badge warning">
                확인할 변화{" "}
                {coverageGapIssueCount}
                건
              </span>

              <h3
                style={{
                  margin:
                    "14px 0 6px",
                }}
              >
                보험료 차이와 별개로 확인해야
                할 보장 변화가 있습니다.
              </h3>

              <p
                className="card-description"
                style={{
                  marginBottom: 0,
                }}
              >
                자기부담 증가와 보장 제외 여부를
                치료별로 나눠서 보여드립니다.
              </p>
            </>
          ) : (
            <>
              <span className="status-badge success">
                확인된 공백 없음
              </span>

              <h3
                style={{
                  margin:
                    "14px 0 6px",
                }}
              >
                현재 구현된 룰 범위에서는
                추가로 확인된 보장 공백이 없습니다.
              </h3>

              <p
                className="card-description"
                style={{
                  marginBottom: 0,
                }}
              >
                실제 보장 여부는 보험사 약관과
                가입 조건을 함께 확인해주세요.
              </p>
            </>
          )}
        </div>

        {/* 한도 초과 여부 */}
        <article
          className="treatment-card"
          style={{
            marginTop: "16px",
            borderStyle: "dashed",
          }}
        >
          <div className="treatment-card-header">
            <div>
              <span className="status-badge warning">
                한도 확인 필요
              </span>

              <h3
                style={{
                  margin:
                    "10px 0 4px",
                }}
              >
                보장 한도·횟수 초과 여부
              </h3>

              <p
                className="treatment-meta"
                style={{
                  marginBottom: 0,
                  maxWidth: "720px",
                }}
              >
                현재 MVP 룰셋에는 보험사별
                보장 한도와 연간 횟수 한도의
                검증된 값이 포함되어 있지 않아
                초과 여부를 임의로 판정하지 않습니다.
              </p>
            </div>

            <span className="rule-info">
              보험사 확인
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginTop: "18px",
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
                금액 한도
              </p>

              <strong>
                확인 필요
              </strong>
            </div>

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
                연간 횟수 한도
              </p>

              <strong>
                확인 필요
              </strong>
            </div>
          </div>

          <div
            className="notice-box warning"
            style={{
              marginTop: "16px",
            }}
          >
            실제 보험사 약관에서 해당 치료의
            보장 한도와 연간 횟수 제한을 확인해 주세요.
            확인되지 않은 한도값은 총부담 계산에
            임의 반영하지 않습니다.
          </div>
        </article>

        {/* 보장 제외 */}
        {excludedCoverageItems.map(
          (
            {
              usage,
              currentItem,
              targetItem,
            },
            index
          ) => {
            const currentExcluded =
              currentItem
                .excludedExpenseResult
                .amount;

            const targetExcluded =
              targetItem
                .excludedExpenseResult
                .amount;

            const highlightedAmount =
              targetItem
                .excludedExpenseResult
                .status ===
                "EXCLUDED"
                ? targetExcluded
                : currentExcluded;

            return (
              <article
                className="treatment-card"
                key={`excluded-${usage.id}`}
                style={{
                  marginTop: "16px",
                }}
              >
                <div className="treatment-card-header">
                  <div>
                    <span className="status-badge warning">
                      보장 제외
                    </span>

                    <h3
                      style={{
                        margin:
                          "10px 0 4px",
                      }}
                    >
                      {
                        usage.treatmentName
                      }
                    </h3>

                    <p
                      className="treatment-meta"
                      style={{
                        marginBottom: 0,
                      }}
                    >
                      이 치료는 한쪽 조건에서
                      보장 제외로 분류되었습니다.
                    </p>
                  </div>

                  <span className="rule-info">
                    G5_EXCLUSION
                  </span>
                </div>

                {highlightedAmount !==
                  null && (
                  <div
                    style={{
                      margin:
                        "22px 0 18px",
                      padding:
                        "18px",
                      border:
                        "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-warning-bg)",
                    }}
                  >
                    <p
                      className="amount-label"
                      style={{
                        color:
                          "var(--color-warning)",
                      }}
                    >
                      보장 제외로 분리된 금액
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "4px",
                        color:
                          "var(--color-text)",
                        fontSize:
                          "clamp(1.5rem, 4vw, 2rem)",
                        letterSpacing:
                          "-0.04em",
                      }}
                    >
                      {highlightedAmount.toLocaleString()}
                      원
                    </strong>
                  </div>
                )}

                <div className="card-grid">
                  <div
                    style={{
                      padding:
                        "16px",
                      border:
                        "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-surface-soft)",
                    }}
                  >
                    <p className="amount-label">
                      현재 계약
                    </p>

                    <strong>
                      {currentExcluded ===
                      null
                        ? "확인 필요"
                        : `${currentExcluded.toLocaleString()}원`}
                    </strong>

                    {currentItem
                      .excludedExpenseResult
                      .warning && (
                      <p
                        className="treatment-meta"
                        style={{
                          margin:
                            "10px 0 0",
                        }}
                      >
                        {
                          currentItem
                            .excludedExpenseResult
                            .warning
                        }
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      padding:
                        "16px",
                      border:
                        "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-primary-050)",
                    }}
                  >
                    <p className="amount-label">
                      5세대 비교
                    </p>

                    <strong>
                      {targetExcluded ===
                      null
                        ? "확인 필요"
                        : `${targetExcluded.toLocaleString()}원`}
                    </strong>

                    {targetItem
                      .excludedExpenseResult
                      .warning && (
                      <p
                        className="treatment-meta"
                        style={{
                          margin:
                            "10px 0 0",
                        }}
                      >
                        {
                          targetItem
                            .excludedExpenseResult
                            .warning
                        }
                      </p>
                    )}
                  </div>
                </div>

                <p
                  className="treatment-meta"
                  style={{
                    margin:
                      "16px 0 0",
                  }}
                >
                  확인 항목{" "}
                  {index + 1}
                </p>
              </article>
            );
          }
        )}

        {/* 자기부담/입력 확인 */}
        {selfPaymentCoverageGapResults.map(
          (gap, index) => {
            const isIncrease =
              gap.type ===
              "SELF_PAYMENT_INCREASE";

            return (
              <article
                className="treatment-card"
                key={`gap-${gap.usageId}`}
                style={{
                  marginTop: "16px",
                }}
              >
                <div className="treatment-card-header">
                  <div>
                    <span
                      className={
                        gap.type ===
                        "NONE"
                          ? "status-badge success"
                          : "status-badge warning"
                      }
                    >
                      {isIncrease
                        ? "자기부담 증가"
                        : gap.type ===
                          "NONE"
                        ? "추가 변화 없음"
                        : "확인 필요"}
                    </span>

                    <h3
                      style={{
                        margin:
                          "10px 0 4px",
                      }}
                    >
                      {
                        gap.treatmentName
                      }
                    </h3>

                    <p
                      className="treatment-meta"
                      style={{
                        marginBottom: 0,
                      }}
                    >
                      {gap.message}
                    </p>
                  </div>

                  <span className="rule-info">
                    확인 항목{" "}
                    {index + 1}
                  </span>
                </div>

                {isIncrease &&
                  gap.differenceAmount !==
                    null && (
                  <div
                    style={{
                      margin:
                        "22px 0 18px",
                      padding:
                        "18px",
                      border:
                        "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-warning-bg)",
                    }}
                  >
                    <p
                      className="amount-label"
                      style={{
                        color:
                          "var(--color-warning)",
                      }}
                    >
                      5세대 자기부담 증가분
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "4px",
                        color:
                          "var(--color-text)",
                        fontSize:
                          "clamp(1.5rem, 4vw, 2rem)",
                        letterSpacing:
                          "-0.04em",
                      }}
                    >
                      +
                      {gap.differenceAmount.toLocaleString()}
                      원
                    </strong>
                  </div>
                )}

                <div className="card-grid">
                  <div
                    style={{
                      padding:
                        "16px",
                      border:
                        "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-surface-soft)",
                    }}
                  >
                    <p className="amount-label">
                      현재 계약 자기부담
                    </p>

                    <strong
                      style={{
                        fontSize:
                          "1.08rem",
                      }}
                    >
                      {gap.currentSelfPayment ===
                      null
                        ? "계산 불가"
                        : `${gap.currentSelfPayment.toLocaleString()}원`}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding:
                        "16px",
                      border:
                        "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-primary-050)",
                    }}
                  >
                    <p className="amount-label">
                      5세대 자기부담
                    </p>

                    <strong
                      style={{
                        fontSize:
                          "1.08rem",
                        color:
                          isIncrease
                            ? "var(--color-warning)"
                            : "var(--color-text)",
                      }}
                    >
                      {gap.targetSelfPayment ===
                      null
                        ? "계산 불가"
                        : `${gap.targetSelfPayment.toLocaleString()}원`}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    gap:
                      "10px 22px",
                    marginTop:
                      "16px",
                    paddingTop:
                      "16px",
                    borderTop:
                      "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <p className="amount-label">
                      총 치료비
                    </p>

                    <strong>
                      {gap.treatmentCost.toLocaleString()}
                      원
                    </strong>
                  </div>

                  {gap.differenceAmount !==
                    null && (
                    <div>
                      <p className="amount-label">
                        자기부담 차이
                      </p>

                      <strong>
                        {gap.differenceAmount.toLocaleString()}
                        원
                      </strong>
                    </div>
                  )}
                </div>

                {gap.reasons.length >
                  0 && (
                  <div
                    style={{
                      marginTop:
                        "18px",
                      padding:
                        "16px",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        "var(--color-surface-soft)",
                    }}
                  >
                    <p
                      className="amount-label"
                      style={{
                        marginBottom:
                          "8px",
                      }}
                    >
                      판단 근거
                    </p>

                    {gap.reasons.map(
                      (
                        reason,
                        reasonIndex
                      ) => (
                        <p
                          className="treatment-meta"
                          key={`${gap.usageId}-${reasonIndex}`}
                          style={{
                            margin:
                              reasonIndex ===
                              0
                                ? 0
                                : "6px 0 0",
                          }}
                        >
                          · {reason}
                        </p>
                      )
                    )}
                  </div>
                )}
              </article>
            );
          }
        )}
      </section>

      {/* RESULT 5 */}
      <section>
        <span className="step-badge">
          RESULT 5
        </span>

        <h2>
          손익분기점
        </h2>

        <div
          className="comparison-summary"
          style={{
            padding:
              "clamp(22px, 4vw, 32px)",
            background:
              "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 78%)",
          }}
        >
          {breakEvenResults.length ===
          0 ? (
            <>
              <span className="status-badge warning">
                계산 확인 필요
              </span>

              <h3
                style={{
                  margin:
                    "14px 0 6px",
                }}
              >
                비교할 수 있는 치료 조건이
                없습니다.
              </h3>

              <p
                className="card-description"
                style={{
                  marginBottom: 0,
                }}
              >
                치료비와 자기부담 조건이
                확인되면 어느 시점에서 두
                선택지의 부담이 비슷해지는지
                보여드립니다.
              </p>
            </>
          ) : availableBreakEvenCount >
            0 ? (
            <>
              <span className="status-badge success">
                손익분기점 확인 가능
              </span>

              <h3
                style={{
                  margin:
                    "14px 0 6px",
                }}
              >
                의료이용이 늘어날 때 부담이
                바뀌는 지점을 확인해보세요.
              </h3>

              <p
                className="card-description"
                style={{
                  marginBottom: 0,
                }}
              >
                현재 입력한 회당 비용과
                자기부담 조건이 유지된다는
                가정으로 계산한 기준입니다.
              </p>
            </>
          ) : (
            <>
              <span className="status-badge warning">
                단일 기준 없음
              </span>

              <h3
                style={{
                  margin:
                    "14px 0 6px",
                }}
              >
                현재 조건에서는 하나의
                손익분기점으로 정리하기
                어렵습니다.
              </h3>

              <p
                className="card-description"
                style={{
                  marginBottom: 0,
                }}
              >
                보장 제외나 확인되지 않은
                자기부담 조건은 임의의
                숫자로 만들지 않습니다.
              </p>
            </>
          )}
        </div>

        {breakEvenResults.map(
          (
            {
              usage,
              result,
            },
            index
          ) => {
            const threshold =
              result.breakEvenFrequency;

            const progress =
              result.status ===
                "AVAILABLE" &&
              threshold !== null &&
              threshold > 0
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      (usage.frequency /
                        threshold) *
                        100
                    )
                  )
                : 0;

            return (
              <article
                className="treatment-card"
                key={`break-even-${usage.id}`}
                style={{
                  marginTop: "16px",
                }}
              >
                <div className="treatment-card-header">
                  <div>
                    <span className="status-badge">
                      치료 {index + 1}
                    </span>

                    <h3
                      style={{
                        margin:
                          "10px 0 4px",
                      }}
                    >
                      {
                        usage.treatmentName
                      }
                    </h3>

                    <p
                      className="treatment-meta"
                      style={{
                        marginBottom: 0,
                      }}
                    >
                      현재 입력{" "}
                      <strong>
                        {usage.frequency}
                        회
                      </strong>
                      {" · "}
                      회당{" "}
                      <strong>
                        {usage.unitCost.toLocaleString()}
                        원
                      </strong>
                    </p>
                  </div>

                  <span
                    className={
                      result.status ===
                      "AVAILABLE"
                        ? "status-badge success"
                        : "status-badge warning"
                    }
                  >
                    {result.status ===
                    "AVAILABLE"
                      ? "기준 산출"
                      : "확인 필요"}
                  </span>
                </div>

                {result.status ===
                "AVAILABLE" ? (
                  <>
                    <div
                      style={{
                        margin:
                          "24px 0 20px",
                        padding:
                          "18px",
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
                          marginBottom:
                            "8px",
                        }}
                      >
                        이용 횟수 기준
                      </p>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "baseline",
                          flexWrap:
                            "wrap",
                          gap:
                            "6px 10px",
                        }}
                      >
                        <strong
                          style={{
                            color:
                              "var(--color-primary-800)",
                            fontSize:
                              "clamp(1.55rem, 4vw, 2.15rem)",
                            letterSpacing:
                              "-0.045em",
                          }}
                        >
                          {result.breakEvenFrequency ===
                          null
                            ? "-"
                            : result.breakEvenFrequency.toFixed(
                                2
                              )}
                          회
                        </strong>

                        <span
                          className="treatment-meta"
                          style={{
                            margin: 0,
                          }}
                        >
                          부근에서 두 선택지의
                          예상 부담이 비슷해집니다.
                        </span>
                      </div>

                      <div
                        style={{
                          position:
                            "relative",
                          height:
                            "8px",
                          margin:
                            "24px 2px 10px",
                          borderRadius:
                            "999px",
                          background:
                            "var(--color-primary-100)",
                          overflow:
                            "hidden",
                        }}
                        aria-hidden="true"
                      >
                        <div
                          style={{
                            width:
                              `${progress}%`,
                            height:
                              "100%",
                            borderRadius:
                              "999px",
                            background:
                              "var(--color-primary-700)",
                            transition:
                              "width 420ms var(--ease-standard)",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: "12px",
                          color:
                            "var(--color-text-sub)",
                          fontSize:
                            "0.82rem",
                          fontWeight:
                            700,
                        }}
                      >
                        <span>
                          현재{" "}
                          {usage.frequency}
                          회
                        </span>

                        <span>
                          정수 기준{" "}
                          {result.firstWholeFrequency ===
                          null
                            ? "-"
                            : `${result.firstWholeFrequency}회`}
                        </span>
                      </div>
                    </div>

                    <div
                      className="card-grid"
                      style={{
                        marginTop: 0,
                      }}
                    >
                      <div
                        style={{
                          padding:
                            "16px",
                          borderRadius:
                            "var(--radius-sm)",
                          background:
                            "var(--color-primary-050)",
                        }}
                      >
                        <p className="amount-label">
                          기준 치료비
                        </p>

                        <strong
                          style={{
                            fontSize:
                              "1.08rem",
                          }}
                        >
                          {result.breakEvenTreatmentCost?.toLocaleString()}
                          원
                        </strong>
                      </div>

                      <div
                        style={{
                          padding:
                            "16px",
                          borderRadius:
                            "var(--radius-sm)",
                          background:
                            "var(--color-primary-050)",
                        }}
                      >
                        <p className="amount-label">
                          실제 적용 판단
                        </p>

                        <strong
                          style={{
                            fontSize:
                              "1.08rem",
                          }}
                        >
                          {result.firstWholeFrequency ===
                          null
                            ? "확인 필요"
                            : `${result.firstWholeFrequency}회부터 비교`}
                        </strong>
                      </div>
                    </div>

                    <p
                      style={{
                        margin:
                          "18px 0 0",
                        paddingTop:
                          "16px",
                        borderTop:
                          "1px solid var(--color-border)",
                        color:
                          "var(--color-text-sub)",
                        fontSize:
                          "0.9rem",
                        lineHeight:
                          1.65,
                      }}
                    >
                      {result.message}
                    </p>
                  </>
                ) : (
                  <div
                    className="notice-box warning"
                    style={{
                      marginTop:
                        "20px",
                    }}
                  >
                    <strong>
                      계산하지 않은 이유
                    </strong>

                    <p
                      className="treatment-meta"
                      style={{
                        margin:
                          "8px 0 0",
                      }}
                    >
                      {result.reason ??
                        "현재 조건에서는 단일 손익분기점을 정할 수 없습니다."}
                    </p>
                  </div>
                )}
              </article>
            );
          }
        )}
      </section>

      {/* RESULT 6 */}
      <section>
        <span className="step-badge">
          RESULT 6
        </span>

        <h2>
          결과 해설
        </h2>

        <div
          className="comparison-summary"
          style={{
            padding: "clamp(22px, 4vw, 34px)",
            background:
              "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 72%)",
            borderColor:
              "var(--color-primary-100)",
          }}
        >
          <span className="status-badge primary">
            핵심 요약
          </span>

          <p
            style={{
              margin:
                "16px 0 0",
              color:
                "var(--color-text)",
              fontSize:
                "clamp(1.08rem, 2.2vw, 1.32rem)",
              fontWeight: 800,
              lineHeight: 1.55,
              letterSpacing:
                "-0.025em",
            }}
          >
            {explanationResult.summary}
          </p>

          <p
            className="card-description"
            style={{
              margin:
                "12px 0 0",
              fontSize:
                "0.9rem",
            }}
          >
            입력한 조건과 현재 룰셋을
            기준으로 정리한 모의 계산
            결과입니다.
          </p>
        </div>

        <div
          className="app-card"
          style={{
            marginTop: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: "12px",
              marginBottom:
                "18px",
            }}
          >
            <div>
              <p
                className="amount-label"
                style={{
                  marginBottom:
                    "4px",
                }}
              >
                비교 포인트
              </p>

              <h3
                style={{
                  marginBottom: 0,
                }}
              >
                무엇이 달라졌는지 확인해보세요
              </h3>
            </div>

            <span className="rule-info">
              {explanationResult.details.length}
              개 항목
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {explanationResult.details.map(
              (detail, index) => (
                <div
                  key={`explanation-detail-${index}`}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "34px minmax(0, 1fr)",
                    alignItems:
                      "start",
                    gap: "12px",
                    padding:
                      "15px 16px",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius:
                      "var(--radius-sm)",
                    background:
                      "var(--color-surface-soft)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display:
                        "grid",
                      placeItems:
                        "center",
                      width: "30px",
                      height: "30px",
                      borderRadius:
                        "50%",
                      background:
                        "var(--color-primary-100)",
                      color:
                        "var(--color-primary-800)",
                      fontSize:
                        "0.8rem",
                      fontWeight:
                        900,
                    }}
                  >
                    {index + 1}
                  </span>

                  <p
                    style={{
                      margin: 0,
                      color:
                        "var(--color-text)",
                      fontSize:
                        "0.94rem",
                      fontWeight:
                        650,
                      lineHeight:
                        1.65,
                    }}
                  >
                    {detail}
                  </p>
                </div>
              )
            )}
          </div>

          {explanationResult.warnings.length >
            0 && (
            <div
              style={{
                marginTop:
                  "20px",
                paddingTop:
                  "18px",
                borderTop:
                  "1px solid var(--color-border)",
              }}
            >
              <p
                className="amount-label"
                style={{
                  marginBottom:
                    "10px",
                  color:
                    "var(--color-warning)",
                }}
              >
                확인해 주세요
              </p>

              <div
                style={{
                  display:
                    "grid",
                  gap: "10px",
                }}
              >
                {explanationResult.warnings.map(
                  (
                    warning,
                    index
                  ) => (
                    <div
                      className="notice-box warning"
                      key={`explanation-warning-${index}`}
                      style={{
                        marginTop:
                          0,
                      }}
                    >
                      {warning}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RESULT 7 */}
      <section>
        <span className="step-badge">
          RESULT 7
        </span>

        <h2>
          보험사에 확인할 질문
        </h2>

        <div className="app-card">
          <p className="card-description">
            현재 MVP에서 확정할 수 없는
            항목을 중심으로 실제 보험사에
            확인하면 좋은 질문입니다.
          </p>

          {uniqueInsurerQuestions.map(
            (
              question,
              index
            ) => (
              <div
                key={`${question}-${index}`}
                className="notice-box"
              >
                <strong>
                  Q{index + 1}.
                </strong>{" "}
                {question}
              </div>
            )
          )}
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
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div>
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
              WebkitOverflowScrolling: "touch",
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
                    isCurrent || isTarget;

                  return (
                    <div
                      key={`generation-${generation}`}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        padding: "0 6px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: "62px",
                          height: "62px",
                          margin: "0 auto 12px",
                          border:
                            isHighlighted
                              ? "2px solid var(--color-primary-700)"
                              : "2px solid var(--color-primary-100)",
                          borderRadius: "50%",
                          background:
                            isHighlighted
                              ? "var(--color-primary-700)"
                              : "#ffffff",
                          color:
                            isHighlighted
                              ? "#ffffff"
                              : "var(--color-primary-800)",
                          fontSize: "1.05rem",
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
                          display: "block",
                          marginBottom: "7px",
                          color:
                            "var(--color-text)",
                        }}
                      >
                        {generation}세대
                      </strong>

                      <div
                        style={{
                          minHeight: "28px",
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
                "repeat(auto-fit, minmax(210px, 1fr))",
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
              margin:
                "18px 0 0",
              paddingTop: "16px",
              borderTop:
                "1px solid var(--color-border)",
            }}
          >
            세대 구분만으로 실제 보장 내용을
            확정할 수는 없습니다. 가입 시기,
            상품, 특약과 약관에 따라 세부
            조건이 달라질 수 있으므로 결과의
            Rule ID와 보험사 확인 질문을 함께
            확인해 주세요.
          </p>
        </div>
      </section>

      {/* 계산 구성 */}
      <section>
        <h2>
          계산 구성
        </h2>

        <div className="app-card">
          <div className="form-grid">
            <div>
              <p className="amount-label">
                보험료
              </p>

              <strong>
                월 보험료 × 12개월
              </strong>
            </div>

            <div>
              <p className="amount-label">
                의료비
              </p>

              <strong>
                횟수 × 회당 비용
              </strong>
            </div>

            <div>
              <p className="amount-label">
                1년 총 부담
              </p>

              <strong>
                연 보험료 +
                자기부담금 +
                보장 제외 의료비
              </strong>
            </div>
          </div>

          <div className="notice-box">
            실제 적용이 확인된 공식
            할인이 있는 경우에만
            총부담에서 차감해야 합니다.
            현재 MVP에는 확인된 할인
            입력값이 없어 임의로
            차감하지 않습니다.
          </div>
        </div>
      </section>

      <section>
        <h2>
          계산 정보
        </h2>

        <div
          className="app-card"
          style={{
            background:
              "var(--color-surface-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
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
                결과 재현 정보
              </p>

              <h3
                style={{
                  marginBottom: "6px",
                }}
              >
                같은 입력과 룰셋은 같은 결과를 냅니다
              </h3>

              <p
                className="treatment-meta"
                style={{
                  marginBottom: 0,
                  maxWidth: "700px",
                }}
              >
                아래 식별값은 보험정보 저장용이
                아니라 동일한 계산 조건을 다시
                확인하기 위한 MVP 추적 정보입니다.
              </p>
            </div>

            <span className="status-badge success">
              결정론적 계산
            </span>
          </div>

          <div className="form-grid">
            <div
              style={{
                padding: "15px 16px",
                border:
                  "1px solid var(--color-border)",
                borderRadius:
                  "var(--radius-sm)",
                background: "#ffffff",
              }}
            >
              <p className="amount-label">
                계산 엔진
              </p>

              <strong>
                {
                  calculationResult.engineVersion
                }
              </strong>
            </div>

            <div
              style={{
                padding: "15px 16px",
                border:
                  "1px solid var(--color-border)",
                borderRadius:
                  "var(--radius-sm)",
                background: "#ffffff",
              }}
            >
              <p className="amount-label">
                룰셋 버전
              </p>

              <strong>
                {
                  calculationResult.rulesetVersion
                }
              </strong>
            </div>

            <div
              style={{
                minWidth: 0,
                padding: "15px 16px",
                border:
                  "1px solid var(--color-border)",
                borderRadius:
                  "var(--radius-sm)",
                background: "#ffffff",
              }}
            >
              <p className="amount-label">
                입력 식별값
              </p>

              <strong
                style={{
                  display: "block",
                  overflowWrap: "anywhere",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: "0.9rem",
                }}
              >
                {
                  calculationResult.inputHash
                }
              </strong>
            </div>
          </div>

          <div
            className="notice-box"
            style={{
              marginTop: "16px",
            }}
          >
            입력 식별값은 주민번호·증권번호 같은
            개인정보가 아니며, 현재 입력 조건이
            바뀌면 다른 값으로 생성됩니다.
          </div>
        </div>
      </section>

      <div className="notice-box warning">
        본 결과는 사용자가 입력한 정보와
        현재 MVP 룰셋을 기반으로 한
        모의 계산이며 보험상품 전환을
        권유하지 않습니다. 실제 보험금,
        가입 가능 여부, 전환 보험료는
        보험사 확인이 필요합니다.
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

      {isResetModalOpen && (
        <div
          className="calculation-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          aria-describedby="reset-modal-description"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelStartOver();
            }
          }}
        >
          <div
            style={{
              width: "min(92vw, 440px)",
              padding:
                "clamp(24px, 5vw, 34px)",
              border:
                "1px solid rgba(255,255,255,0.75)",
              borderRadius:
                "24px",
              background:
                "#ffffff",
              boxShadow:
                "var(--shadow-modal)",
              animation:
                "modalPop 240ms var(--ease-standard) both",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: "54px",
                height: "54px",
                marginBottom: "18px",
                borderRadius: "16px",
                background:
                  "var(--color-warning-bg)",
                color:
                  "var(--color-warning)",
              }}
              aria-hidden="true"
            >
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 9v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M10.3 3.8 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p
              className="amount-label"
              style={{
                marginBottom: "6px",
              }}
            >
              새 비교 시작
            </p>

            <h2
              id="reset-modal-title"
              style={{
                marginBottom: "10px",
                fontSize:
                  "clamp(1.35rem, 4vw, 1.65rem)",
              }}
            >
              지금 입력한 내용을
              초기화할까요?
            </h2>

            <p
              id="reset-modal-description"
              className="card-description"
              style={{
                marginBottom: 0,
                lineHeight: 1.65,
              }}
            >
              현재 비교 결과와 보험·예정 치료
              입력값이 모두 지워지고 시작
              화면으로 돌아갑니다.
            </p>

            <div
              style={{
                marginTop: "18px",
                padding: "14px 15px",
                borderRadius:
                  "var(--radius-sm)",
                background:
                  "var(--color-surface-soft)",
                color:
                  "var(--color-text-sub)",
                fontSize: "0.88rem",
                lineHeight: 1.55,
              }}
            >
              필요한 결과는 먼저 확인한 뒤
              새 비교를 시작해 주세요.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) minmax(0, 1.2fr)",
                gap: "10px",
                marginTop: "24px",
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
                계속 보기
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmStartOver
                }
                style={{
                  minHeight: "48px",
                  padding:
                    "12px 16px",
                  border:
                    "1px solid var(--color-primary-700)",
                  borderRadius:
                    "var(--radius-sm)",
                  background:
                    "var(--color-primary-700)",
                  color: "#ffffff",
                  fontWeight: 800,
                  boxShadow:
                    "0 8px 18px rgba(29, 86, 143, 0.18)",
                }}
              >
                초기화하고 새 비교
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default M04ResultPage;