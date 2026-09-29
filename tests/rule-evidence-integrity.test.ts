import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import evidenceMap from "../knowledge/rule-evidence-map.json";
import products from "../src/data/products.json";

describe("Samsung Rule/Evidence integrity", () => {
  it("maps every draft Rule to one complete Evidence record", () => {
    const evidenceIds = new Set(evidenceMap.mappings.map((item) => item.evidenceId));
    const draftFiles = fs.readdirSync(path.resolve("knowledge/drafts/samsung"))
      .filter((name) => name.endsWith(".rules.draft.json"));

    for (const product of products) {
      const productFiles = draftFiles.filter((name) => name.startsWith(product.productCode));
      expect(productFiles.length).toBe([2, 3].includes(product.generation) ? 2 : 1);
      for (const file of productFiles) {
        const draft = JSON.parse(fs.readFileSync(path.resolve("knowledge/drafts/samsung", file), "utf8")) as {
          calculationEnabled: boolean;
          variant: string;
          rules: Array<{ id: string; variant: string; evidenceIds: string[] }>;
        };
        expect(draft.calculationEnabled).toBe(false);
        expect(draft.rules.every((rule) => rule.variant === draft.variant)).toBe(true);
        for (const rule of draft.rules) {
          expect(rule.evidenceIds).toHaveLength(1);
          expect(evidenceIds.has(rule.evidenceIds[0])).toBe(true);
          const evidence = evidenceMap.mappings.find((item) => item.evidenceId === rule.evidenceIds[0]);
          expect(evidence?.ruleId).toBe(rule.id);
          expect(evidence?.article).toBeTruthy();
          expect(evidence?.paragraph).toBeTruthy();
          expect(evidence?.pdfPage).toBeGreaterThan(0);
          expect(evidence?.status).toBe("REVIEW_REQUIRED");
        }
      }
    }
  });
});
