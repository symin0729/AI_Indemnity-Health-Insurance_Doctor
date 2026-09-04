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
  loadRuleSet,
  type RuleSet,
} from "../../engine/loadRuleSet";

function M03ConfirmPage() {
  const navigate =
    useNavigate();

  // ========================================
  // Store 데이터
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

  // ========================================
  // 룰셋
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
  // 최종 확인
  // ========================================

  const [
    isConfirmed,
    setIsConfirmed,
  ] =
    useState(false);

  // ========================================
  // 룰셋 불러오기
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

  // ========================================
  // 현재 계약이 없는 경우
  // ========================================

  if (!contract) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            확인할 보험 정보가 없습니다.
          </h1>

          <p className="page-description">
            현재 계약과 예정 치료를
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
  // 5세대 보험료 없는 경우
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
            5세대 비교용 보험료를
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
  // 치료가 없는 경우
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
  // 룰셋 로딩
  // ========================================

  if (isRuleLoading) {
    return (
      <main>
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>

          <h1>
            계산 전 확인
          </h1>

          <p className="page-description">
            적용할 계산 룰을
            불러오는 중입니다.
          </p>
        </header>
      </main>
    );
  }

  // ========================================
  // 룰셋 오류
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
            계산 전 확인
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
  // 계산용 표시 값
  // ========================================

  const currentAnnualPremium =
    calculateAnnualPremium(
      contract.monthlyPremium
    );

  const targetAnnualPremium =
    calculateAnnualPremium(
      target5GMonthlyPremium
    );

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

  const hasUnknownUsage =
    usages.some(
      (usage) =>
        usage.benefitClass ===
          "UNKNOWN" ||
        usage.severityClass ===
          "UNKNOWN"
    );

  // ========================================
  // 표시용 변환 함수
  // ========================================

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

  // ========================================
  // 계산 시작
  // ========================================

  const handleCalculate =
    () => {
      if (
        !isConfirmed
      ) {
        return;
      }

      navigate(
        "/result"
      );
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
          STEP 4
        </span>

        <h1>
          계산 전 확인
        </h1>

        <p className="page-description">
          입력한 현재 보험,
          5세대 비교 조건,
          예정 치료 정보를
          다시 확인해주세요.
        </p>
      </header>

      {/* ======================================
          현재 계약
      ====================================== */}

      <section className="result-card">
        <span className="status-badge">
          현재 계약
        </span>

        <h2 className="card-title">
          {contract.generation}
          세대 실손보험
        </h2>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              보험사
            </p>

            <strong>
              {
                contract.insurer
              }
            </strong>
          </div>

          <div>
            <p className="amount-label">
              상품명
            </p>

            <strong>
              {
                contract.productName
              }
            </strong>
          </div>

          <div>
            <p className="amount-label">
              가입일
            </p>

            <strong>
              {
                contract.inceptionDate
              }
            </strong>
          </div>

          <div>
            <p className="amount-label">
              실손 세대
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
              월 보험료
            </p>

            <strong>
              {contract.monthlyPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              연 보험료
            </p>

            <strong>
              {currentAnnualPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              갱신주기
            </p>

            <strong>
              {
                contract.renewalCycleMonths
              }
              개월
            </strong>
          </div>

          <div>
            <p className="amount-label">
              재가입주기
            </p>

            <strong>
              {
                contract.reentryCycleMonths
              }
              개월
            </strong>
          </div>
        </div>

        <hr />

        <p className="amount-label">
          현재 계약 비급여 특약2
        </p>

        <span
          className={
            contract.coverages.includes(
              "SPECIAL_RIDER_2"
            )
              ? "status-badge success"
              : "status-badge warning"
          }
        >
          {contract.coverages.includes(
            "SPECIAL_RIDER_2"
          )
            ? "가입 입력"
            : "미가입 입력"}
        </span>
      </section>

      {/* ======================================
          5세대 비교 조건
      ====================================== */}

      <section className="compare-card">
        <span className="status-badge primary">
          5세대 전환 비교
        </span>

        <h2 className="card-title">
          5세대 비교 조건
        </h2>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              비교 세대
            </p>

            <strong>
              5세대
            </strong>
          </div>

          <div>
            <p className="amount-label">
              월 보험료
            </p>

            <strong>
              {target5GMonthlyPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              연 보험료
            </p>

            <strong>
              {targetAnnualPremium.toLocaleString()}
              원
            </strong>
          </div>

          <div>
            <p className="amount-label">
              비급여 특약2
            </p>

            <span
              className={
                target5GCoverages.includes(
                  "SPECIAL_RIDER_2"
                )
                  ? "status-badge success"
                  : "status-badge warning"
              }
            >
              {target5GCoverages.includes(
                "SPECIAL_RIDER_2"
              )
                ? "가입 입력"
                : "미가입 입력"}
            </span>
          </div>
        </div>

        <div className="notice-box">
          비교용 5세대 월 보험료는
          사용자가 직접 입력한
          비교 가정값입니다.
          실제 전환 보험료를
          확정하지 않습니다.
        </div>
      </section>

      {/* ======================================
          예정 치료
      ====================================== */}

      <section className="form-card">
        <span className="status-badge">
          예정 치료
        </span>

        <h2 className="card-title">
          향후 의료이용
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
            총 {usages.length}건의
            예정 치료가 등록되어 있습니다.
          </p>
        </div>

        {usages.map(
          (
            usage,
            index
          ) => {
            const treatmentCost =
              usage.frequency *
              usage.unitCost;

            const isUnknown =
              usage.benefitClass ===
                "UNKNOWN" ||
              usage.severityClass ===
                "UNKNOWN";

            return (
              <article
                className="treatment-card"
                key={
                  usage.id
                }
              >
                <div className="treatment-card-header">
                  <div>
                    <span
                      className={
                        isUnknown
                          ? "status-badge warning"
                          : "status-badge success"
                      }
                    >
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
                    {treatmentCost.toLocaleString()}
                    원
                  </strong>
                </div>

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

                  <div>
                    <p className="amount-label">
                      예상 총 치료비
                    </p>

                    <strong>
                      {treatmentCost.toLocaleString()}
                      원
                    </strong>
                  </div>
                </div>

                {isUnknown && (
                  <div className="notice-box warning">
                    급여 여부 또는 중증 여부 중
                    확인되지 않은 값이 있습니다.
                    결과 계산에서는 임의로
                    추정하지 않고 확인 필요로
                    처리합니다.
                  </div>
                )}
              </article>
            );
          }
        )}
      </section>

      {/* ======================================
          계산 가정
      ====================================== */}

      <section className="app-card">
        <span className="step-badge">
          계산 가정
        </span>

        <h2 className="card-title">
          이번 비교 기준
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
              의료이용 시나리오
            </p>

            <strong>
              유지 ±0%
            </strong>
          </div>

          <div>
            <p className="amount-label">
              계산 룰셋
            </p>

            <strong>
              {
                ruleSet.rulesetVersion
              }
            </strong>
          </div>

          <div>
            <p className="amount-label">
              계산 기준
            </p>

            <strong>
              입력한 횟수·비용 유지
            </strong>
          </div>
        </div>

        <div className="notice-box">
          현재 MVP에서는 입력한
          예정 치료 횟수와 비용을
          그대로 사용해 1년 기준으로
          현재 계약 유지와 5세대 전환을
          비교합니다.
        </div>

        <div className="notice-box">
          3년 비교와 의료이용 감소·증가
          시나리오는 이번 MVP 계산에서
          사용하지 않습니다.
        </div>

        {hasUnknownUsage && (
          <div className="notice-box warning">
            UNKNOWN 항목이 포함되어 있습니다.
            확인되지 않은 급여 여부 또는
            중증 여부는 임의로 분류하지 않습니다.
          </div>
        )}
      </section>

      {/* ======================================
          최종 확인
      ====================================== */}

      <section className="app-card">
        <span className="step-badge">
          최종 확인
        </span>

        <h2 className="card-title">
          입력 정보 확인
        </h2>

        <label>
          <input
            type="checkbox"
            checked={
              isConfirmed
            }
            onChange={(e) =>
              setIsConfirmed(
                e.target.checked
              )
            }
          />{" "}
          <strong>
            위의 현재 계약,
            5세대 비교 조건,
            예정 치료와 계산 가정을
            모두 확인했습니다.
          </strong>
        </label>

        {!isConfirmed && (
          <div className="notice-box warning">
            비교 계산을 시작하려면
            위 입력 정보를 확인한 후
            체크해주세요.
          </div>
        )}

        {isConfirmed && (
          <div className="notice-box">
            <strong>
              입력 정보 확인이 완료되었습니다.
            </strong>

            <p>
              이제 비교 계산을 시작할 수 있습니다.
            </p>
          </div>
        )}
      </section>

      {/* ======================================
          안내
      ====================================== */}

      <div className="notice-box warning">
        본 서비스의 결과는 사용자가 입력한
        정보와 현재 MVP 룰셋을 이용한
        모의 계산입니다. 실제 보험금,
        보험상품 가입 가능 여부,
        전환 보험료를 확정하거나
        보험상품 전환을 권유하지 않습니다.
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
              "/input"
            )
          }
        >
          입력 수정
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={
            !isConfirmed
          }
          onClick={
            handleCalculate
          }
        >
          비교 계산하기
        </button>
      </div>
    </main>
  );
}

export default M03ConfirmPage;