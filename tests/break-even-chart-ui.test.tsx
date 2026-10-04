import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { calculateBreakEvenBySimulation } from "../src/engine/calculateBreakEven";
import { BreakEvenChart, BurdenComparisonChart, createPremiumOnlyBreakEvenDisplay } from "../src/pages/M04ResultPage/M04ResultPage";

describe("BreakEvenChart", () => {
  it("renders two engine-driven series, five-visit ticks, and the calculated threshold", () => {
    const result = calculateBreakEvenBySimulation({
      minFrequency: 0,
      maxFrequency: 50,
      evaluate: (frequency) => ({
        currentTotalBurden: 720_000 + frequency * 10_000,
        targetTotalBurden: 420_000 + frequency * 40_000,
      }),
    });

    const markup = renderToStaticMarkup(<BreakEvenChart result={result} />);

    expect(result.threshold).toBe(10);
    expect(markup).toContain("break-even-chart__line--current");
    expect(markup).toContain("break-even-chart__line--target");
    expect(markup).not.toContain(">5회<");
    expect(markup).toContain("10회");
    expect(markup).toContain("50회");
    expect(markup).toContain("손익분기 10회");
    expect(markup).toContain("연간 병원 이용 횟수");
    expect(markup).toContain("횟수별 총부담 숫자표");
    expect(markup).toContain("현재 계약");
    expect(markup).toContain("5세대");
    expect(markup).toContain("1,220,000원");
  });

  it("keeps both lines and ten-visit numeric rows visible when there is no reversal", () => {
    const result = calculateBreakEvenBySimulation({
      minFrequency: 0,
      maxFrequency: 10,
      evaluate: (frequency) => ({
        currentTotalBurden: 720_000 + frequency * 10_000,
        targetTotalBurden: 719_990 + frequency * 10_000,
      }),
    });

    const markup = renderToStaticMarkup(<BreakEvenChart result={result} />);
    expect(result.status).toBe("NO_REVERSAL");
    expect(markup).toContain("break-even-chart__line--current");
    expect(markup).toContain("break-even-chart__line--target");
    expect(markup).toContain("0회");
    expect(markup).not.toContain(">5회<");
    expect(markup).toContain("10회");
    expect(markup).toContain("범위 내 없음");
    expect(markup).not.toContain("금액 차이 확대 보기");
    expect(markup).toContain("5세대가 10원 낮음");
    expect(markup).not.toContain("금액 차이 확대 그래프");
  });
});

describe("BurdenComparisonChart", () => {
  it("shows confirmed premium bars while medical burden inputs are incomplete", () => {
    const markup = renderToStaticMarkup(
      <BurdenComparisonChart
        currentBurden={null}
        targetBurden={null}
        currentAnnualPremium={720_000}
        targetAnnualPremium={420_000}
      />,
    );

    expect(markup).toContain("연간 보험료 비교");
    expect(markup).toContain("720,000원");
    expect(markup).toContain("420,000원");
    expect(markup).toContain("300,000원");
    expect(markup).toContain("burden-chart__bar--current");
    expect(markup).toContain("burden-chart__bar--target");
  });
});

it("renders a clearly labeled premium-only break-even graph when medical inputs are incomplete", () => {
  const result = createPremiumOnlyBreakEvenDisplay(720_000, 420_000, ["입력 확인 필요"]);
  const markup = renderToStaticMarkup(<BreakEvenChart result={result} />);

  expect(result.points).toHaveLength(121);
  expect(markup).toContain("break-even-chart__line--current");
  expect(markup).toContain("break-even-chart__line--target");
  expect(markup).toContain("720,000원");
  expect(markup).toContain("420,000원");
  expect(result.warnings.join(" ")).toContain("최종 손익분기 결과가 아닙니다");
});
