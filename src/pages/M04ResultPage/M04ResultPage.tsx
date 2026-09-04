import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAnalysisStore } from "../../store/useAnalysisStore";

import type { InsuranceGeneration } from "../../domain/insurance";

import { calculateAnnualPremium } from "../../engine/calculateAnnualPremium";
import { calculateSelfPayment } from "../../engine/calculateSelfPayment";

import {
  loadRuleSet,
  type RuleSet,
} from "../../engine/loadRuleSet";

function M04ResultPage() {
  const navigate = useNavigate();

  const contract = useAnalysisStore(
    (state) => state.contract
  );

  const target5GMonthlyPremium = useAnalysisStore(
    (state) => state.target5GMonthlyPremium
  );

  const target5GCoverages = useAnalysisStore(
    (state) => state.target5GCoverages
  );

  const usages = useAnalysisStore(
    (state) => state.usages
  );

  const [ruleSet, setRuleSet] =
    useState<RuleSet | null>(null);

  const [ruleLoadError, setRuleLoadError] =
    useState<string | null>(null);

  const [isRuleLoading, setIsRuleLoading] =
    useState(true);

  useEffect(() => {
    const fetchRuleSet = async () => {
      try {
        setIsRuleLoading(true);
        setRuleLoadError(null);

        const loadedRuleSet =
          await loadRuleSet("mvp-v1");

        setRuleSet(loadedRuleSet);
      } catch (error) {
        if (error instanceof Error) {
          setRuleLoadError(error.message);
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

  if (!contract) {
    return (
      <main>
        <h1>계산할 정보가 없습니다.</h1>

        <button
          onClick={() => navigate("/input")}
        >
          입력 화면으로
        </button>
      </main>
    );
  }

  if (isRuleLoading) {
    return (
      <main>
        <h1>보험 비교 결과</h1>
        <p>계산 룰을 불러오는 중입니다.</p>
      </main>
    );
  }

  if (ruleLoadError || !ruleSet) {
    return (
      <main>
        <h1>보험 비교 결과</h1>

        <p>계산 룰을 불러오지 못했습니다.</p>

        <p>{ruleLoadError}</p>

        <button
          onClick={() => navigate("/confirm")}
        >
          이전
        </button>
      </main>
    );
  }

  const currentAnnualPremium =
    calculateAnnualPremium(
      contract.monthlyPremium
    );

  const targetAnnualPremium =
    target5GMonthlyPremium === null
      ? null
      : calculateAnnualPremium(
          target5GMonthlyPremium
        );

  const calculateScenario = (
    generation: InsuranceGeneration,
    annualPremium: number,
    coverages: string[]
  ) => {
    const items = usages.map((usage) => {
      const treatmentCost =
        usage.frequency *
        usage.unitCost;

      const selfPaymentResult =
        calculateSelfPayment({
          treatmentCost,
          generation,
          benefitClass:
            usage.benefitClass,
          severityClass:
            usage.severityClass,
          coverages,
          rules: ruleSet.rules,
        });

      return {
        usage,
        treatmentCost,
        selfPaymentResult,
      };
    });

    const hasUnsupportedCalculation =
      items.some(
        (item) =>
          item.selfPaymentResult.amount ===
          null
      );

    const totalSelfPayment =
      items.reduce(
        (sum, item) => {
          if (
            item.selfPaymentResult.amount ===
            null
          ) {
            return sum;
          }

          return (
            sum +
            item.selfPaymentResult.amount
          );
        },
        0
      );

    const totalAnnualCost =
      hasUnsupportedCalculation
        ? null
        : annualPremium +
          totalSelfPayment;

    return {
      items,
      hasUnsupportedCalculation,
      totalSelfPayment,
      totalAnnualCost,
    };
  };

  const currentResult =
    calculateScenario(
      contract.generation,
      currentAnnualPremium,
      contract.coverages
    );

  const targetResult =
    targetAnnualPremium === null
      ? null
      : calculateScenario(
          5,
          targetAnnualPremium,
          target5GCoverages
        );

  const totalTreatmentCost =
    usages.reduce(
      (sum, usage) =>
        sum +
        usage.frequency *
          usage.unitCost,
      0
    );

  let comparisonMessage =
    "일부 계산 조건을 확인해야 합니다.";

  if (
    currentResult.totalAnnualCost !==
      null &&
    targetResult !== null &&
    targetResult.totalAnnualCost !==
      null
  ) {
    const currentCost =
      currentResult.totalAnnualCost;

    const targetCost =
      targetResult.totalAnnualCost;

    const difference = Math.abs(
      currentCost - targetCost
    );

    if (currentCost < targetCost) {
      comparisonMessage =
        `현재 계약 유지가 연간 약 ${difference.toLocaleString()}원 낮습니다.`;
    } else if (
      targetCost < currentCost
    ) {
      comparisonMessage =
        `5세대 전환이 연간 약 ${difference.toLocaleString()}원 낮습니다.`;
    } else {
      comparisonMessage =
        "두 선택지의 예상 총 부담액이 같습니다.";
    }
  }

  const cardStyle = {
    flex: "1",
    minWidth: "260px",
    padding: "24px",
    border: "1px solid #e5e8eb",
    borderRadius: "16px",
    background: "#ffffff",
  };

  const amountStyle = {
    margin: "8px 0 20px",
    fontSize: "28px",
    fontWeight: 800,
  };

  const labelStyle = {
    marginTop: "18px",
    marginBottom: "4px",
    color: "#6b7684",
    fontSize: "14px",
  };

  return (
    <main>
      <div
        style={{
          marginBottom: "32px",
        }}
      >
        <p
          style={{
            marginBottom: "6px",
            color: "#3182f6",
            fontWeight: 700,
          }}
        >
          AI 실손 닥터
        </p>

        <h1>보험 비교 결과</h1>

        <p
          style={{
            color: "#6b7684",
          }}
        >
          현재 계약 유지와 5세대 전환 시
          예상되는 1년 부담을 비교합니다.
        </p>

        <div
          style={{
            display: "inline-block",
            marginTop: "10px",
            padding: "6px 10px",
            borderRadius: "8px",
            background: "#f2f4f6",
            color: "#4e5968",
            fontSize: "13px",
          }}
        >
          룰셋 버전:{" "}
          {ruleSet.rulesetVersion}
        </div>
      </div>

      <section>
        <h2>1년 예상 부담</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={cardStyle}>
            <p
              style={{
                color: "#6b7684",
                fontWeight: 700,
              }}
            >
              현재 계약 유지
            </p>

            <h3>
              {contract.generation}세대 실손
            </h3>

            <p style={labelStyle}>
              연 보험료
            </p>

            <p style={amountStyle}>
              {currentAnnualPremium.toLocaleString()}
              원
            </p>

            <p style={labelStyle}>
              예상 자기부담금
            </p>

            <p
              style={{
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              {currentResult
                .hasUnsupportedCalculation
                ? "계산 불가"
                : `${currentResult.totalSelfPayment.toLocaleString()}원`}
            </p>

            <hr
              style={{
                margin: "20px 0",
              }}
            />

            <p style={labelStyle}>
              예상 총 부담액
            </p>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: "26px",
                fontWeight: 800,
              }}
            >
              {currentResult
                .totalAnnualCost === null
                ? "계산 불가"
                : `${currentResult.totalAnnualCost.toLocaleString()}원`}
            </p>
          </div>

          <div
            style={{
              ...cardStyle,
              border: "2px solid #3182f6",
              background: "#f7faff",
            }}
          >
            <p
              style={{
                color: "#3182f6",
                fontWeight: 700,
              }}
            >
              5세대 전환
            </p>

            <h3>5세대 실손</h3>

            <p style={labelStyle}>
              연 보험료
            </p>

            <p style={amountStyle}>
              {targetAnnualPremium === null
                ? "계산 불가"
                : `${targetAnnualPremium.toLocaleString()}원`}
            </p>

            <p style={labelStyle}>
              예상 자기부담금
            </p>

            <p
              style={{
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              {targetResult === null ||
              targetResult
                .hasUnsupportedCalculation
                ? "계산 불가"
                : `${targetResult.totalSelfPayment.toLocaleString()}원`}
            </p>

            <hr
              style={{
                margin: "20px 0",
              }}
            />

            <p style={labelStyle}>
              예상 총 부담액
            </p>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: "26px",
                fontWeight: 800,
                color: "#1769d2",
              }}
            >
              {targetResult === null ||
              targetResult.totalAnnualCost ===
                null
                ? "계산 불가"
                : `${targetResult.totalAnnualCost.toLocaleString()}원`}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div
          style={{
            padding: "20px",
            borderRadius: "14px",
            background: "#f2f4f6",
          }}
        >
          <h2
            style={{
              marginBottom: "8px",
            }}
          >
            비교 결과
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            {comparisonMessage}
          </p>

          {(
            currentResult
              .totalAnnualCost === null ||
            targetResult === null ||
            targetResult.totalAnnualCost ===
              null
          ) && (
            <p
              style={{
                marginTop: "10px",
                color: "#6b7684",
              }}
            >
              현재 계약에 필요한 일부
              계산 룰이 아직 지원되지 않아
              최종 우열은 확정하지 않습니다.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2>예정 치료 상세</h2>

        <p
          style={{
            marginBottom: "20px",
            color: "#6b7684",
          }}
        >
          전체 예상 치료비{" "}
          <strong
            style={{
              color: "#191f28",
            }}
          >
            {totalTreatmentCost.toLocaleString()}
            원
          </strong>
        </p>

        {usages.map(
          (usage, index) => {
            const currentItem =
              currentResult.items[index];

            const targetItem =
              targetResult?.items[index];

            return (
              <div
                key={usage.id}
                style={{
                  marginBottom: "16px",
                  padding: "20px",
                  border:
                    "1px solid #e5e8eb",
                  borderRadius: "14px",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  {usage.treatmentName}
                </h3>

                <p>
                  {usage.frequency}회 ×{" "}
                  {usage.unitCost.toLocaleString()}
                  원
                </p>

                <p
                  style={{
                    color: "#6b7684",
                  }}
                >
                  총 치료비{" "}
                  {currentItem.treatmentCost.toLocaleString()}
                  원
                </p>

                <hr
                  style={{
                    margin: "18px 0",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      flex: "1",
                      minWidth: "200px",
                    }}
                  >
                    <strong>
                      현재 계약
                    </strong>

                    <p>
                      자기부담금:{" "}
                      {currentItem
                        .selfPaymentResult
                        .amount === null
                        ? "계산 불가"
                        : `${currentItem.selfPaymentResult.amount.toLocaleString()}원`}
                    </p>

                    {currentItem
                      .selfPaymentResult
                      .warning && (
                      <p
                        style={{
                          color: "#e5484d",
                          fontSize: "14px",
                        }}
                      >
                        {
                          currentItem
                            .selfPaymentResult
                            .warning
                        }
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      flex: "1",
                      minWidth: "200px",
                    }}
                  >
                    <strong>
                      5세대 전환
                    </strong>

                    {targetItem ? (
                      <>
                        <p>
                          자기부담금:{" "}
                          {targetItem
                            .selfPaymentResult
                            .amount === null
                            ? "계산 불가"
                            : `${targetItem.selfPaymentResult.amount.toLocaleString()}원`}
                        </p>

                        {targetItem
                          .selfPaymentResult
                          .ruleId && (
                          <p
                            style={{
                              color:
                                "#3182f6",
                              fontSize:
                                "13px",
                            }}
                          >
                            적용 룰:{" "}
                            {
                              targetItem
                                .selfPaymentResult
                                .ruleId
                            }
                          </p>
                        )}
                      </>
                    ) : (
                      <p>계산 불가</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        )}
      </section>

      <section>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#fff8e6",
            color: "#795b00",
            fontSize: "14px",
          }}
        >
          본 결과는 입력한 정보와
          MVP 룰셋을 기반으로 한 모의
          계산이며 실제 보험금 또는
          전환 보험료를 확정하지 않습니다.
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "24px",
        }}
      >
        <button
          onClick={() =>
            navigate("/confirm")
          }
        >
          이전
        </button>

        <button
          onClick={() => navigate("/")}
        >
          처음으로
        </button>
      </div>
    </main>
  );
}

export default M04ResultPage;