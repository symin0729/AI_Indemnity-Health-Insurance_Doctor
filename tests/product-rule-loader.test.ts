import { describe, expect, it } from "vitest";
import { loadProductRuleSet } from "../src/engine/loadProductRuleSet";

describe("product rule loader", () => {
  it("productCode로 삼성화재 상품 룰셋을 읽는다", async () => {
    const ruleSet = await loadProductRuleSet("SAMSUNG_2107_1");
    expect(ruleSet.rulesetVersion).toBe("samsung-gen4-2107-1");
    expect(ruleSet.rules).toEqual([]);
  });

  it("등록되지 않은 productCode를 거부한다", async () => {
    await expect(loadProductRuleSet("UNKNOWN")).rejects.toThrow("지원하지 않는 상품 코드");
  });
});
