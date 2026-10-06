import SamsungTreatmentComparison from "../../components/samsung/SamsungTreatmentComparison";
import { prepareUsageForSamsungComparison } from "../../engine/prepareSamsungComparison";
import mainLogo from '../../assets/main-logo.png';
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
  loadProductRuleSet,
  resolveSamsungGen23Product,
} from "../../engine/loadProductRuleSet";

import {
  calculationService,
  type CalculationV2Input,
} from "../../services/calculationService";

import type {
  AnnualCalculationResult,
  ClaimCalculationItem,
} from "../../domain/calculation";
import type { MedicalUsage } from "../../domain/medical";
import {
  calculateBreakEvenBySimulation,
  type BreakEvenSimulationResult,
} from "../../engine/calculateBreakEven";
import {
  calculateSamsungAnnualComparison,
  SAMSUNG_BREAK_EVEN_MAX_FREQUENCY,
} from "../../engine/calculateSamsungComparison";
import "../../styles/M04-result.css";

/** 전체 이용 횟수를 사용자가 입력한 치료 구성 비율대로 정수 배분한다. */
export function allocateCombinedTreatmentFrequencies(usages: MedicalUsage[], totalFrequency: number): MedicalUsage[] {
  if (totalFrequency <= 0 || usages.length === 0) return [];
  const baseTotal = usages.reduce((sum, usage) => sum + Math.max(0, usage.frequency), 0);
  const weights = usages.map((usage) => baseTotal > 0 ? Math.max(0, usage.frequency) / baseTotal : 1 / usages.length);
  const exact = weights.map((weight) => weight * totalFrequency);
  const allocated = exact.map(Math.floor);
  let remainder = totalFrequency - allocated.reduce((sum, value) => sum + value, 0);
  const priority = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) allocated[priority[index % priority.length].index] += 1;
  return usages
    .map((usage, index) => ({ ...usage, frequency: allocated[index] }))
    .filter((usage) => usage.frequency > 0);
}

/**
 * 입력 화면의 세대별 필드를 삼성 공통 계산 입력으로 연결한다.
 * 계산 규칙은 바꾸지 않고, 사용자가 확인한 값을 엔진 형식으로 전달한다.
 */
export { prepareUsageForSamsungComparison } from "../../engine/prepareSamsungComparison";

export function createPremiumOnlyBreakEvenDisplay(
  currentAnnualPremium: number,
  targetAnnualPremium: number,
  warnings: string[] = [],
): BreakEvenSimulationResult {
  const difference = currentAnnualPremium - targetAnnualPremium;
  const preferred = difference > 0 ? "TARGET_5G" : difference < 0 ? "CURRENT" : "TIE";
  return {
    status: "NO_REVERSAL",
    method: "DISCRETE_SEARCH",
    rangeChecked: { min: 0, max: SAMSUNG_BREAK_EVEN_MAX_FREQUENCY },
    threshold: null,
    exactTieFrequencies: difference === 0
      ? Array.from({ length: SAMSUNG_BREAK_EVEN_MAX_FREQUENCY + 1 }, (_, frequency) => frequency)
      : [],
    reversalIntervals: [],
    points: Array.from(
      { length: SAMSUNG_BREAK_EVEN_MAX_FREQUENCY + 1 },
      (_, frequency) => ({
        frequency,
        currentTotalBurden: currentAnnualPremium,
        targetTotalBurden: targetAnnualPremium,
        difference,
        preferred,
      }),
    ),
    warnings: Array.from(new Set([
      ...warnings,
      "의료비 계산이 완료되지 않아 확정된 연 보험료만 표시합니다. 이 선은 최종 손익분기 결과가 아닙니다.",
    ])),
    message: "의료비 확인 전 단계로, 확정된 연 보험료 두 선을 임시 표시합니다.",
  };
}

function formatMoney(
  value: number | null
): string {
  if (value === null) {
    return "확인 필요";
  }

  return `${value.toLocaleString()}원`;
}

function createSamsungScenarioDisplay({
  option,
  annualPremium,
  medicalCost,
  insuranceBenefit,
  totalBurden,
  complete,
  warnings,
}: {
  option: "CURRENT" | "TARGET_5G";
  annualPremium: number;
  medicalCost: number | null;
  insuranceBenefit: number | null;
  totalBurden: number | null;
  complete: boolean;
  warnings: string[];
}): AnnualCalculationResult {
  const finalMedicalBurden =
    medicalCost === null || insuranceBenefit === null
      ? null
      : medicalCost - insuranceBenefit;

  return {
    option,
    year: 1,
    annualPremium,
    items: [],
    totalMedicalCost: medicalCost,
    totalInsuranceBenefit: insuranceBenefit,
    totalFinalMedicalBurden: finalMedicalBurden,
    totalExcludedAmount: null,
    totalAdjustedDeductible: null,
    totalLimitExceededAmount: null,
    totalBurden,
    status: complete ? "CALCULATED" : "CONFIRMATION_REQUIRED",
    warnings,
  };
}

export function BurdenComparisonChart({
  currentBurden,
  targetBurden,
  currentAnnualPremium,
  targetAnnualPremium,
}: {
  currentBurden: number | null;
  targetBurden: number | null;
  currentAnnualPremium: number;
  targetAnnualPremium: number;
}) {
  const isFullBurdenAvailable = currentBurden !== null && targetBurden !== null;
  const displayedCurrent = currentBurden ?? currentAnnualPremium;
  const displayedTarget = targetBurden ?? targetAnnualPremium;

  const maximumBurden = Math.max(displayedCurrent, displayedTarget, 1);
  const difference = displayedCurrent - displayedTarget;
  const absoluteDifference = Math.abs(difference);
  const savingRate =
    displayedCurrent > 0
      ? (absoluteDifference / displayedCurrent) * 100
      : 0;

  const rows = [
    {
      label: "현재 계약 유지",
      shortLabel: "유지",
      value: displayedCurrent,
      width: (displayedCurrent / maximumBurden) * 100,
      tone: "current",
    },
    {
      label: "5세대 비교안",
      shortLabel: "전환",
      value: displayedTarget,
      width: (displayedTarget / maximumBurden) * 100,
      tone: "target",
    },
  ];

  const conclusion =
    difference > 0
      ? `${isFullBurdenAvailable ? "5세대 전환 시" : "보험료 기준 5세대가"} 연간 ${absoluteDifference.toLocaleString()}원 낮음`
      : difference < 0
        ? `${isFullBurdenAvailable ? "현재 계약 유지 시" : "보험료 기준 현재 계약이"} 연간 ${absoluteDifference.toLocaleString()}원 낮음`
        : "두 선택지의 연간 총부담이 같습니다";

  return (
    <div className="burden-chart" aria-label="연간 총부담 금액 비교 그래프">
      <div className="burden-chart__heading">
        <div>
          <span className="burden-chart__eyebrow">{isFullBurdenAvailable ? "금액 차이 시각화" : "확정 보험료 시각화"}</span>
          <h3>{isFullBurdenAvailable ? "연간 총부담 비교" : "연간 보험료 비교"}</h3>
          <p>{isFullBurdenAvailable ? "룰엔진 계산 결과를 기준으로 막대 길이가 자동 반영됩니다." : "의료비 계산 전에도 확인된 연 보험료 차이를 표시합니다."}</p>
        </div>
        <div className="burden-chart__difference">
          <small>연간 차이</small>
          <strong>{absoluteDifference.toLocaleString()}원</strong>
          {difference !== 0 && displayedCurrent > 0 && (
            <span>{savingRate.toFixed(1)}% 차이</span>
          )}
        </div>
      </div>

      <div className="burden-chart__plot">
        {rows.map((row) => (
          <div className="burden-chart__row" key={row.tone}>
            <span className="burden-chart__label" title={row.label}>
              {row.shortLabel}
            </span>
            <div className="burden-chart__track">
              <div
                className={`burden-chart__bar burden-chart__bar--${row.tone}`}
                style={{ width: `${row.width}%` }}
                role="meter"
                aria-label={`${row.label} ${row.value.toLocaleString()}원`}
                aria-valuemin={0}
                aria-valuemax={maximumBurden}
                aria-valuenow={row.value}
              />
            </div>
            <strong className="burden-chart__value">
              {row.value.toLocaleString()}원
            </strong>
          </div>
        ))}
      </div>

      <p className="burden-chart__conclusion">{conclusion}</p>
      {!isFullBurdenAvailable && (
        <p className="burden-chart__pending">의료비 입력 확인 후 같은 위치에 최종 총부담 그래프가 표시됩니다.</p>
      )}
    </div>
  );
}

export function BreakEvenChart({ result }: { result: BreakEvenSimulationResult }) {
  if (result.points.length < 2) {
    return (
      <div className="break-even-chart break-even-chart--unavailable">
        계산 조건을 확인하면 횟수별 총부담 그래프가 표시됩니다.
      </div>
    );
  }

  const width = 720;
  const height = 340;
  const padding = { top: 22, right: 18, bottom: 38, left: 76 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const minimumFrequency = result.rangeChecked.min;
  const maximumFrequency = result.rangeChecked.max;
  const totals = result.points.flatMap((point) => [
    point.currentTotalBurden,
    point.targetTotalBurden,
  ]);
  const minimumTotal = Math.min(...totals);
  const maximumTotal = Math.max(...totals);
  const baseYInterval = 50_000;
  const rawYRange = Math.max(maximumTotal - minimumTotal, baseYInterval);
  const yInterval = Math.max(
    baseYInterval,
    Math.ceil(rawYRange / (10 * baseYInterval)) * baseYInterval,
  );
  const yMinimum = Math.max(0, Math.floor(minimumTotal / yInterval) * yInterval);
  const roundedMaximum = Math.ceil(maximumTotal / yInterval) * yInterval;
  const yMaximum = Math.max(roundedMaximum, yMinimum + yInterval);
  const yRange = Math.max(yMaximum - yMinimum, 1);
  const x = (frequency: number) =>
    padding.left +
    ((frequency - minimumFrequency) /
      Math.max(maximumFrequency - minimumFrequency, 1)) *
      plotWidth;
  const y = (total: number) =>
    padding.top + ((yMaximum - total) / yRange) * plotHeight;
  const currentPoints = result.points
    .map((point) => `${x(point.frequency)},${y(point.currentTotalBurden)}`)
    .join(" ");
  const targetPoints = result.points
    .map((point) => `${x(point.frequency)},${y(point.targetTotalBurden)}`)
    .join(" ");
  const thresholdPoint =
    result.threshold === null
      ? null
      : result.points.find((point) => point.frequency === result.threshold) ?? null;
  const xTicks = Array.from(
    { length: Math.floor((maximumFrequency - minimumFrequency) / 10) + 1 },
    (_, index) => minimumFrequency + index * 10,
  ).filter((tick) => tick <= maximumFrequency);
  if (xTicks.at(-1) !== maximumFrequency) xTicks.push(maximumFrequency);
  const yTicks = Array.from(
    { length: Math.floor((yMaximum - yMinimum) / yInterval) + 1 },
    (_, index) => yMinimum + index * yInterval,
  );
  const visibleNumberPoints = result.points.filter((point) =>
    point.frequency % 10 === 0 || point.frequency === result.threshold,
  );
  const formatDifference = (difference: number) => {
    if (difference === 0) return "금액 동일";
    return difference > 0
      ? `5세대가 ${difference.toLocaleString()}원 낮음`
      : `현재 계약이 ${Math.abs(difference).toLocaleString()}원 낮음`;
  };

  return (
    <div className="break-even-chart">
      <div className="break-even-chart__legend" aria-hidden="true">
        <span><i className="is-current" />현재 계약 유지</span>
        <span><i className="is-target" />5세대 비교안</span>
        {result.threshold !== null && <span><i className="is-threshold" />손익분기 기준</span>}
      </div>

      <div className="break-even-chart__canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`치료 횟수 ${minimumFrequency}회부터 ${maximumFrequency}회까지 현재 계약과 5세대의 연간 총부담 비교`}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                className="break-even-chart__grid"
                x1={padding.left}
                x2={width - padding.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="break-even-chart__axis-label" x={padding.left - 10} y={y(tick) + 4} textAnchor="end">
                {(tick / 10000).toLocaleString()}만원
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                className="break-even-chart__grid break-even-chart__grid--vertical"
                x1={x(tick)}
                x2={x(tick)}
                y1={padding.top}
                y2={height - padding.bottom}
              />
              <text
                className="break-even-chart__axis-label"
                x={x(tick)}
                y={height - 10}
                textAnchor="middle"
              >
                {tick}회
              </text>
            </g>
          ))}

          {result.threshold !== null && (
            <g>
              <line
                className="break-even-chart__threshold"
                x1={x(result.threshold)}
                x2={x(result.threshold)}
                y1={padding.top}
                y2={height - padding.bottom}
              />
              <rect
                className="break-even-chart__threshold-label-bg"
                x={Math.min(x(result.threshold) + 7, width - 112)}
                y={padding.top + 7}
                width="104"
                height="24"
                rx="12"
              />
              <text
                className="break-even-chart__threshold-label"
                x={Math.min(x(result.threshold) + 59, width - 60)}
                y={padding.top + 23}
                textAnchor="middle"
              >
                손익분기 {result.threshold}회
              </text>
            </g>
          )}

          <polyline className="break-even-chart__line break-even-chart__line--current" points={currentPoints} />
          <polyline className="break-even-chart__line break-even-chart__line--target" points={targetPoints} />

          <text className="break-even-chart__axis-title" x={padding.left + plotWidth / 2} y={height - 1} textAnchor="middle">
            연간 병원 이용 횟수
          </text>

          {thresholdPoint && (
            <g>
              <circle className="break-even-chart__point break-even-chart__point--current" cx={x(thresholdPoint.frequency)} cy={y(thresholdPoint.currentTotalBurden)} r="5" />
              <circle className="break-even-chart__point break-even-chart__point--target" cx={x(thresholdPoint.frequency)} cy={y(thresholdPoint.targetTotalBurden)} r="5" />
            </g>
          )}
        </svg>
      </div>

      <div className="break-even-chart__summary">
        <div>
          <span>탐색 범위</span>
          <strong>{minimumFrequency}~{maximumFrequency}회</strong>
        </div>
        <div className={result.threshold === null ? "is-muted" : "is-highlighted"}>
          <span>손익분기 기준</span>
          <strong>{result.threshold === null ? "범위 내 없음" : `${result.threshold}회`}</strong>
        </div>
        <div>
          <span>탐색 결과</span>
          <strong>{result.status === "MULTIPLE_REVERSALS" ? "여러 번 역전" : result.status === "CONFIRMATION_REQUIRED" ? "확인 필요" : result.status === "NO_REVERSAL" ? "역전 없음" : "역전 확인"}</strong>
        </div>
      </div>

      <div className="break-even-chart__numbers" aria-label="횟수별 총부담 숫자표">
        <div className="break-even-chart__numbers-head" aria-hidden="true">
          <span>병원 이용</span>
          <span>현재 계약</span>
          <span>5세대</span>
          <span>차이</span>
        </div>
        {visibleNumberPoints.map((point) => (
          <div
            className={`break-even-chart__numbers-row${point.frequency === result.threshold ? " is-threshold" : ""}`}
            key={point.frequency}
          >
            <strong>{point.frequency}회</strong>
            <span>{point.currentTotalBurden.toLocaleString()}원</span>
            <span>{point.targetTotalBurden.toLocaleString()}원</span>
            <span>{formatDifference(point.difference)}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

  const productCalculationSelections = useAnalysisStore((state) => state.productCalculationSelections);

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

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    const fetchRuleSet = async () => {
      if (!contract) {
        setRuleSet(null);
        setIsRuleLoading(false);
        return;
      }

      try {
        setIsRuleLoading(true);
        setRuleLoadError(null);

        let loadedRuleSet: RuleSet;

        if (
          contract.generation === 2 ||
          contract.generation === 3
        ) {
          const routing =
            resolveSamsungGen23Product({
              generation: contract.generation,
              variant:
                productCalculationSelections.samsungGen23Variant,
            });

          loadedRuleSet =
            await loadProductRuleSet(
              routing.productCode,
              routing.variant
            );
        } else {
          loadedRuleSet =
            await loadRuleSet(
              "mvp-v2"
            );
        }

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
  }, [
    contract,
    productCalculationSelections.samsungGen23Variant,
  ]);

  if (
    !contract ||
    target5GMonthlyPremium === null
  ) {
    return (
      <AppShell currentStep={6}><main className="navy-page">
        <header className="page-header">
          <span className="page-brand">
            AI 실손 닥터
          </span>
          <h1>
            계산할 정보가 없습니다.
          </h1>
          <p className="page-description">
            보험 정보와 5세대 비교 조건을 먼저 입력해주세요.
          </p>
        </header>

        <div className="button-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate("/input#input-step-1")
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
      <AppShell currentStep={6}><main className="navy-page">
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
      <AppShell currentStep={6}><main className="navy-page">
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
      <AppShell currentStep={6}><main className="navy-page">
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
              navigate("/confirm")
            }
          >
            입력 수정하기
          </button>
        </div>
      </main></AppShell>
    );
  }

  const legacyResult =
    calculationService.calculateV2(
      calculationInput
    );

  const samsungContract =
    contract.insurer === "INS_001"
      ? { ...contract, insurer: "삼성화재" }
      : contract;
  const calculationUsages = usages.map((usage) =>
    prepareUsageForSamsungComparison(usage, calculationAssumptions),
  );

  const samsungComparison =
    calculateSamsungAnnualComparison(
      samsungContract,
      target5GMonthlyPremium,
      target5GCoverages,
      productCalculationSelections,
      calculationUsages,
      calculationAssumptions,
    );

  const currentWarnings = Array.from(new Set(
    samsungComparison.items.flatMap((item) => item.current.reasons),
  ));
  const targetWarnings = Array.from(new Set(
    samsungComparison.items.flatMap((item) => item.target.reasons),
  ));
  // 입력하지 않아 계산 엔진이 약관 표준값 등으로 채운 항목. 설계사가 알 수 있도록 결과에 표시한다.
  const currentEngineAssumptions = Array.from(new Set(
    samsungComparison.items.flatMap((item) => item.current.appliedAssumptions ?? []),
  ));
  const targetEngineAssumptions = Array.from(new Set(
    samsungComparison.items.flatMap((item) => item.target.appliedAssumptions ?? []),
  ));

  const current = createSamsungScenarioDisplay({
    option: "CURRENT",
    annualPremium: contract.monthlyPremium * 12,
    medicalCost: samsungComparison.medicalCost,
    insuranceBenefit: samsungComparison.currentClaimTotal,
    totalBurden: samsungComparison.currentTotal,
    complete: samsungComparison.currentComplete,
    warnings: currentWarnings,
  });
  const target5G = createSamsungScenarioDisplay({
    option: "TARGET_5G",
    annualPremium: target5GMonthlyPremium * 12,
    medicalCost: samsungComparison.medicalCost,
    insuranceBenefit: samsungComparison.targetClaimTotal,
    totalBurden: samsungComparison.targetTotal,
    complete: samsungComparison.targetComplete,
    warnings: targetWarnings,
  });
  const target5GSaving =
    samsungComparison.currentTotal === null || samsungComparison.targetTotal === null
      ? null
      : samsungComparison.currentTotal - samsungComparison.targetTotal;
  const result = {
    ...legacyResult,
    current,
    target5G,
    target5GSaving,
    warnings: Array.from(new Set([...currentWarnings, ...targetWarnings])),
  };

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

  const breakEvenResults = calculationUsages.length === 0 ? [] : (() => {
    const engineResult = calculateBreakEvenBySimulation({
      minFrequency: 0,
      maxFrequency: SAMSUNG_BREAK_EVEN_MAX_FREQUENCY,
      evaluate: (totalFrequency) => {
        const simulatedUsages = allocateCombinedTreatmentFrequencies(calculationUsages, totalFrequency);
        const comparison = calculateSamsungAnnualComparison(
          samsungContract,
          target5GMonthlyPremium,
          target5GCoverages,
          productCalculationSelections,
          simulatedUsages,
          calculationAssumptions,
        );
        const calculationWarnings = comparison.items.flatMap((item) => [
          ...item.current.reasons.map((reason) => `${item.usage.treatmentName} · 현재 계약: ${reason}`),
          ...item.target.reasons.map((reason) => `${item.usage.treatmentName} · 5세대: ${reason}`),
        ]);
        return {
          currentTotalBurden: comparison.currentTotal,
          targetTotalBurden: comparison.targetTotal,
          warnings: comparison.complete
            ? []
            : Array.from(new Set([
                ...calculationWarnings,
                "미확인 계산 조건 때문에 전체 치료 묶음의 손익분기점을 확정할 수 없습니다.",
              ])),
        };
      },
    });
    const usage = {
      ...calculationUsages[0],
      id: "combined-treatment-break-even",
      treatmentName: `전체 예정 치료 ${calculationUsages.length}개 합산`,
    };
    return [{
      usage,
      isPremiumOnly: false,
      result: engineResult,
    }];
  })();

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

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });

      const resultPage = document.querySelector<HTMLElement>(".navy-result-page");
      if (!resultPage) throw new Error("결과 화면을 찾을 수 없습니다.");

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(resultPage, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f2f5f8",
        logging: false,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 8;
      const contentWidth = 210 - margin * 2;
      const contentHeight = 297 - margin * 2;
      const sourcePageHeight = Math.floor(canvas.width * (contentHeight / contentWidth));

      for (let sourceY = 0, pageIndex = 0; sourceY < canvas.height; sourceY += sourcePageHeight, pageIndex += 1) {
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const context = pageCanvas.getContext("2d");
        if (!context) throw new Error("PDF 이미지를 생성할 수 없습니다.");

        context.fillStyle = "#f2f5f8";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        if (pageIndex > 0) pdf.addPage();
        const renderedHeight = sliceHeight * (contentWidth / canvas.width);
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.94),
          "JPEG",
          margin,
          margin,
          contentWidth,
          renderedHeight,
        );
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`AI_실손_닥터_비교결과_${date}.pdf`);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? `PDF를 만들지 못했습니다. ${error.message}`
          : "PDF를 만들지 못했습니다."
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <AppShell currentStep={6}><main className={`navy-page navy-result-page${isDownloadingPdf ? " is-pdf-exporting" : ""}`}>
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
              <span className="step-badge">
                STEP 6 · 비교 결과
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
              src={mainLogo}
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
      <SamsungTreatmentComparison items={samsungComparison.items} generation={contract.generation} />


      {(calculationAssumptions.assumeSingleIndemnityContract ||
        calculationAssumptions.assumeEntireMedicalCostCovered ||
        calculationAssumptions.assumeNoPriorLimitUsage ||
        calculationAssumptions.assumeEachOccurrenceSeparate ||
        currentEngineAssumptions.length > 0 ||
        targetEngineAssumptions.length > 0) && (
        <section className="result-assumption-summary" aria-labelledby="result-assumption-summary-title">
          <div>
            <span className="result-assumption-summary__badge">적용 조건</span>
            <h2 id="result-assumption-summary-title">이 결과에 적용된 계산 가정</h2>
          </div>
          <ul>
            <li>입력한 월 보험료 × 12와 같은 예정 치료를 비교합니다. 갱신 인상률·향후 할인·할증은 추정하지 않습니다.</li>
            {calculationAssumptions.comparisonBasis === 'FRESH_YEAR' && <li>두 계약 모두 한도 사용 전부터 시작하는 1년 모의 비교입니다. 기존 사용분은 반영하지 않습니다.</li>}
            {calculationAssumptions.comparisonBasis === 'REMAINING_LIMITS' && <li>현재 계약은 입력한 기존 사용분, 5세대는 전환 후 계약의 비교 시작 시점에서 사용분 0을 기준으로 비교합니다.</li>}
            {calculationAssumptions.assumeNoPolicyExclusions && <li>미확인 면책 조건은 보장 제외 사유가 없다고 가정했습니다.</li>}
            {calculationAssumptions.assumeSingleIndemnityContract && <li>실손 계약 1개 기준 비교 · 다른 실손 계약과의 보험금 분담은 반영하지 않음</li>}
            {calculationAssumptions.assumeEntireMedicalCostCovered && (
              <li>C가 없는 치료는 환자부담 의료비 M 전액을 보장대상으로 가정</li>
            )}
            {calculationAssumptions.assumeNoPriorLimitUsage && (
              <li>확인되지 않은 기존 지급액과 한도·상한 사용량을 0으로 가정</li>
            )}
            {calculationAssumptions.assumeEachOccurrenceSeparate && (
              <li>날짜·입원 구분이 없는 반복 치료를 각각 별도 방문으로 가정</li>
            )}
            {currentEngineAssumptions.map((text) => (
              <li key={`current-${text}`}>현재 계약: {text}</li>
            ))}
            {targetEngineAssumptions.map((text) => (
              <li key={`target-${text}`}>5세대: {text}</li>
            ))}
          </ul>
        </section>
      )}

      <section
        className="app-card"
        style={{
          padding: "clamp(22px, 4vw, 34px)",
          borderRadius: "24px",
          background:
            "linear-gradient(135deg, #173d5f 0%, #255578 58%, #326887 100%)",
          color: "#ffffff",
          boxShadow: "0 18px 44px rgba(15, 43, 67, 0.17)",
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

        <BurdenComparisonChart
          currentBurden={current.totalBurden}
          targetBurden={target5G.totalBurden}
          currentAnnualPremium={contract.monthlyPremium * 12}
          targetAnnualPremium={target5GMonthlyPremium * 12}
        />

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
              등록한 치료를 하나로 합산하고, 전체 이용 횟수를 0~{SAMSUNG_BREAK_EVEN_MAX_FREQUENCY}회로 바꾸며
              계산 엔진을 다시 실행해 유리한 선택지가 바뀌는 구간을 찾습니다.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {breakEvenResults.length === 0 && (
            <div className="break-even-empty-state">
              <strong>손익분기 그래프를 만들 치료 항목이 없습니다.</strong>
              <span>치료 항목과 회당 의료비를 등록한 뒤 계산하면 0~120회 구간의 두 총부담 선과 역전 시점이 표시됩니다.</span>
            </div>
          )}
          {breakEvenResults.map(({ usage, result: breakEven, isPremiumOnly }) => (
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
                      {isPremiumOnly
                        ? "보험료 기준선"
                        : breakEven.status === "AVAILABLE"
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

              {breakEven && (
                <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                  <BreakEvenChart result={breakEven} />
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
      <section className="generation-guide-section">
        <div className="generation-guide-heading">
          <span className="step-badge">
            GUIDE
          </span>

          <h2>
            실손보험 세대 변천사
          </h2>
        </div>

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
        className="button-group result-actions"
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
          onClick={() => navigate("/confirm")}
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
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          style={{
            minHeight: "48px",
            border: "1px solid var(--color-primary-200, #b9d1ea)",
            borderRadius: "12px",
            background: "#ffffff",
            color: "var(--color-primary-800)",
            fontWeight: 800,
            cursor: isDownloadingPdf ? "wait" : "pointer",
          }}
        >
          {isDownloadingPdf ? "PDF 생성 중..." : "PDF 내려받기"}
        </button>

        <button
          type="button"
          className="result-chat-button"
          onClick={() => navigate("/chat")}
        >
          챗봇으로 이동 →
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
