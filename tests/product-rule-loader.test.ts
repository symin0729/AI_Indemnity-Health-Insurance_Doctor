import { describe, expect, it } from "vitest";
import {
  loadProductRuleSet,
  resolveSamsungGen23Product,
} from "../src/engine/loadProductRuleSet";

describe("product rule loader", () => {
  it("productCode로 삼성화재 상품 룰셋을 읽는다", async () => {
    const ruleSet = await loadProductRuleSet("SAMSUNG_2107_1", "default");
    expect(ruleSet.rulesetVersion).toBe("samsung-gen4-2107-1-review-required");
    expect(ruleSet.rules).toEqual([]);
  });

  it.each([
    ["SAMSUNG_0904_2", "default"],
    ["SAMSUNG_1611_7", "standard"],
    ["SAMSUNG_1611_7", "selected2"],
    ["SAMSUNG_1704_1", "standard"],
    ["SAMSUNG_1704_1", "selected2"],
    ["SAMSUNG_2107_1", "default"],
    ["SAMSUNG_2605_1", "default"],
  ])("%s/%s는 RAG·Guard 승인 전에 운영 Rule을 로드하지 않는다", async (productCode, variant) => {
    const ruleSet = await loadProductRuleSet(productCode, variant);
    expect(ruleSet.rulesetVersion).toContain("review-required");
    expect(ruleSet.rules).toEqual([]);
  });

  it.each([
    [2, "standard", "SAMSUNG_1611_7", "standard"],
    [2, "selected2", "SAMSUNG_1611_7", "selected2"],
    [3, "standard", "SAMSUNG_1704_1", "standard"],
    [3, "selected2", "SAMSUNG_1704_1", "selected2"],
  ] as const)(
    "%s세대 %s 종형을 정확한 삼성 상품 RuleSet으로 라우팅한다",
    (generation, variant, expectedProductCode, expectedVariant) => {
      expect(
        resolveSamsungGen23Product({
          generation,
          variant,
        })
      ).toEqual({
        productCode: expectedProductCode,
        variant: expectedVariant,
      });
    }
  );

  it("2세대와 3세대는 서로 다른 상품코드로 라우팅한다", () => {
    const gen2 = resolveSamsungGen23Product({
      generation: 2,
      variant: "standard",
    });

    const gen3 = resolveSamsungGen23Product({
      generation: 3,
      variant: "standard",
    });

    expect(gen2.productCode).toBe("SAMSUNG_1611_7");
    expect(gen3.productCode).toBe("SAMSUNG_1704_1");
    expect(gen2.productCode).not.toBe(gen3.productCode);
  });

  it("2·3세대 종형이 UNKNOWN이면 라우팅을 거부한다", () => {
    expect(() =>
      resolveSamsungGen23Product({
        generation: 2,
        variant: "UNKNOWN",
      })
    ).toThrow("2세대 상품 종형을 선택해주세요.");

    expect(() =>
      resolveSamsungGen23Product({
        generation: 3,
        variant: "UNKNOWN",
      })
    ).toThrow("3세대 상품 종형을 선택해주세요.");
  });

  it("등록되지 않은 productCode를 거부한다", async () => {
    await expect(loadProductRuleSet("UNKNOWN")).rejects.toThrow("지원하지 않는 상품·종형");
  });

  it("2·3세대는 종형을 생략하면 거부한다", async () => {
    await expect(loadProductRuleSet("SAMSUNG_1611_7")).rejects.toThrow("상품·종형");
    await expect(loadProductRuleSet("SAMSUNG_1704_1")).rejects.toThrow("상품·종형");
  });
});
