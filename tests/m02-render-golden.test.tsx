import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GEN3_RIDER_DEFAULT } from "../src/domain/gen3Riders";
import type { InsuranceContract } from "../src/domain/insurance";
import type { MedicalUsage } from "../src/domain/medical";
import M02InputPage from "../src/pages/M02InputPage/M02InputPage";
import { useAnalysisStore, type ProductCalculationSelections } from "../src/store/useAnalysisStore";

// 서버 렌더링(renderToStaticMarkup)은 스토어의 "초기 상태"만 읽는다.
// 테스트에서 설정한 현재 상태가 화면에 반영되도록 훅이 현재 상태를 읽게 바꾼다.
vi.mock("../src/store/useAnalysisStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/store/useAnalysisStore")>();
  const useAnalysisStore = Object.assign(
    <T,>(selector: (state: ReturnType<typeof actual.useAnalysisStore.getState>) => T) => selector(actual.useAnalysisStore.getState()),
    actual.useAnalysisStore,
  );
  return { ...actual, useAnalysisStore };
});

/**
 * 입력 화면(M02) 렌더링 결과를 상태 조합별로 저장해 두고, 화면 코드를 나눈 뒤 같은 HTML이 나오는지 비교한다.
 * 저장본(tests/.golden)은 커밋하지 않는 임시 기준이다. 화면을 일부러 바꾸는 작업에서는 다시 만들어야 한다.
 *   기준 만들기: M02_GOLDEN=write npx vitest run tests/m02-render-golden.test.tsx
 *   비교하기:    npx vitest run tests/m02-render-golden.test.tsx   (저장본이 없으면 건너뜀)
 */
const GOLDEN_DIR = "tests/.golden";
const writeMode = process.env.M02_GOLDEN === "write";

const contract = (over: Partial<InsuranceContract>): InsuranceContract => ({
  insurer: "삼성화재",
  productName: "무배당 삼성화재 실손의료비보험(1704.1)",
  inceptionDate: "2018-03-01",
  generation: 3,
  monthlyPremium: 60000,
  renewalCycleMonths: 12,
  reentryCycleMonths: 180,
  coverages: [],
  ...over,
});

const usage = { id: "u1", treatmentName: "물리치료", careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", severityClass: "UNKNOWN", frequency: 2, unitCost: 150000 } as unknown as MedicalUsage;

const selections = (over: Partial<ProductCalculationSelections>): ProductCalculationSelections => ({
  ...useAnalysisStore.getState().productCalculationSelections,
  ...over,
});

const CASES: Array<{ name: string; state: () => void }> = [
  { name: "empty", state: () => {} },
  { name: "gen1-other-company", state: () => useAnalysisStore.setState({ contract: contract({ generation: 1, inceptionDate: "2005-01-01", insurer: "우체국보험", productName: "우체국보험 실손 의료 보험" }), productCalculationSelections: selections({ gen1Product: "OTHER_POST" }) }) },
  { name: "gen1-oo-product", state: () => useAnalysisStore.setState({ contract: contract({ generation: 1, inceptionDate: "2005-01-01", insurer: "삼성화재", productName: "삼성 올라이프 100세 건강파트너보험(0904.2)" }), productCalculationSelections: selections({ gen1Product: "SAMSUNG_0904_2", gen1D1Coverage: "BOTH" }) }) },
  { name: "gen2-registered", state: () => useAnalysisStore.setState({ contract: contract({ generation: 2, inceptionDate: "2016-11-01" }), productCalculationSelections: selections({ samsungGen23Variant: "standard" }) }) },
  { name: "gen2-2013-unregistered", state: () => useAnalysisStore.setState({ contract: contract({ generation: 2, inceptionDate: "2014-05-01" }), productCalculationSelections: selections({ samsungGen23Variant: "selected2013" }) }) },
  { name: "gen2-2009-unified", state: () => useAnalysisStore.setState({ contract: contract({ generation: 2, inceptionDate: "2010-01-01" }), productCalculationSelections: selections({ samsungGen23Variant: "unified2009" }) }) },
  { name: "gen3-riders-all", state: () => useAnalysisStore.setState({ contract: contract({ insurerLabel: "내 보험사", productLabel: "내 상품" }), usages: [usage], productCalculationSelections: selections({ samsungGen23Variant: "selected2", gen3Riders: { manualTherapy: "ENROLLED", injection: "ENROLLED", mri: "ENROLLED" } }) }) },
  { name: "gen3-unselected", state: () => useAnalysisStore.setState({ contract: contract({}), productCalculationSelections: selections({ samsungGen23Variant: "UNKNOWN", gen3Riders: GEN3_RIDER_DEFAULT }) }) },
  { name: "gen4-enrolled", state: () => useAnalysisStore.setState({ contract: contract({ generation: 4, inceptionDate: "2022-01-01", coverages: ["NON_COVERED"] }), usages: [usage], productCalculationSelections: selections({ gen4NonCoveredRider: "ENROLLED" }) }) },
  { name: "gen4-not-enrolled", state: () => useAnalysisStore.setState({ contract: contract({ generation: 4, inceptionDate: "2022-01-01" }), productCalculationSelections: selections({ gen4NonCoveredRider: "NOT_ENROLLED" }) }) },
  { name: "gen3-target-riders", state: () => useAnalysisStore.setState({ contract: contract({}), target5GCoverages: ["SPECIAL_RIDER_1"], target5GMonthlyPremium: 35000, productCalculationSelections: selections({ samsungGen23Variant: "standard" }) }) },
];

describe("M02 입력 화면 렌더링 기준 비교", () => {
  beforeEach(() => {
    useAnalysisStore.getState().resetAnalysis();
    (globalThis as { window?: unknown }).window = { location: { hash: "" }, requestAnimationFrame: (f: () => void) => f(), scrollTo() {} };
  });

  it.each(CASES)("$name", ({ name, state }) => {
    state();
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(M02InputPage)));
    expect(html.length).toBeGreaterThan(1000);
    const file = `${GOLDEN_DIR}/m02-${name}.html`;
    if (writeMode) {
      mkdirSync(GOLDEN_DIR, { recursive: true });
      writeFileSync(file, html);
      return;
    }
    if (!existsSync(file)) return; // 기준이 없으면 비교하지 않는다
    expect(html).toBe(readFileSync(file, "utf8"));
  });
});
