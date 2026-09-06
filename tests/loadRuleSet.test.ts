import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadRuleSet } from "../src/engine/loadRuleSet";
import { calculationService } from "../src/services/calculationService";
import { samplePolicyService } from "../src/services/samplePolicyService";

describe("결과 화면 계산 규칙 로딩", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(["mvp-v1", "mvp-v2"])("네트워크 없이 %s 규칙을 읽는다", async (version) => {
    const rules = await loadRuleSet(version);
    expect(rules.rulesetVersion).toBe(version);
    expect(rules.rules.length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("지원하지 않는 버전을 다른 규칙으로 대체하지 않는다", async () => {
    await expect(loadRuleSet("unknown")).rejects.toThrow("지원하지 않는 계산 룰 버전");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("통신이 실패하는 환경에서도 비교표와 치료별 계산 값을 생성한다", async () => {
    const result = calculationService.calculateV2({
      contract: samplePolicyService.load("NON_COVERED"),
      target5GMonthlyPremium: 30000,
      target5GCoverages: ["SPECIAL_RIDER_2"],
      usages: [{
        id: "mri",
        treatmentName: "MRI",
        treatmentCategory: "MRI",
        careSetting: "OUTPATIENT",
        benefitClass: "NON_COVERED",
        severityClass: "NON_SEVERE",
        frequency: 1,
        unitCost: 100000,
        coveredAmount: 100000,
      }],
      assumptions: {
        assumeEntireMedicalCostCovered: false,
        assumeNoPriorLimitUsage: true,
        assumeEachOccurrenceSeparate: false,
      },
      ruleSet: await loadRuleSet(),
      year: 1,
    });

    expect(result.current.annualPremium).toBe(720000);
    expect(result.current.items[0].insuranceBenefit).toBe(70000);
    expect(result.current.totalBurden).toBe(750000);
    expect(result.target5G.annualPremium).toBe(360000);
    expect(result.target5G.items[0].insuranceBenefit).toBe(50000);
    expect(result.target5G.totalBurden).toBe(410000);
    expect(result.target5GSaving).toBe(340000);
    expect(fetch).not.toHaveBeenCalled();
  });
});
