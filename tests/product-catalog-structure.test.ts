import { describe, expect, it } from "vitest";
import products from "../src/data/products.json";

describe("Samsung product catalog structure", () => {
  it("uses the canonical catalog fields for all five generations", () => {
    expect(products).toHaveLength(5);
    expect(products.map((product) => product.generation)).toEqual([1, 2, 3, 4, 5]);

    for (const product of products) {
      expect(product.insurer).toBe("삼성화재");
      expect(product.productName).not.toBe("");
      expect(product.sampleLabel).not.toBe("");
      expect(product.effectiveFrom).toBeNull();
      expect(product.effectiveTo).toBeNull();
      expect(product.variants.length).toBeGreaterThan(0);
      expect(product.requiredSelections.length).toBeGreaterThan(0);
      expect(product.verificationStatus).toBe("REVIEW_REQUIRED");
      expect(product.calculationEnabled).toBe(false);
      expect(product.ruleSetIds).toEqual([]);
      if (product.generation === 5) {
        expect(product.documentIds).toEqual(["SAMSUNG_2605_1_GENERAL_TERMS", "SAMSUNG_2605_1_CONVERSION_TERMS"]);
      } else {
        expect(product.documentIds).toEqual([`${product.productCode}_TERMS`]);
      }
    }
  });

  it("keeps generation-specific selections explicit", () => {
    expect(products[1].variants).toEqual(["standard", "selected2"]);
    expect(products[2].requiredSelections.join(" ")).toContain("3대 비급여");
    expect(products[3].requiredSelections.join(" ")).toContain("비급여 특약");
    expect(products[4].requiredSelections.join(" ")).toContain("비중증 비급여");
    expect(products[4].variants).toEqual(["general", "conversion"]);
    expect(products[4].requiredSelections.join(" ")).toContain("계약 유형");
  });
});
