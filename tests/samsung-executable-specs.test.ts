import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import evidenceMap from "../knowledge/rule-evidence-map.json";

const specDir = path.resolve("knowledge/drafts/samsung/executable-specs");
const files = fs.readdirSync(specDir).filter((name) => name.endsWith(".execution-spec.draft.json")).sort();
const specs = files.map((name) => JSON.parse(fs.readFileSync(path.join(specDir, name), "utf8")) as {
  productCode: string;
  generation: number;
  variant: string;
  calculationEnabled: boolean;
  status: string;
  rules: Array<{
    ruleId: string;
    variant: string;
    calculation: { type: string };
    requiredCoverages: string[];
    specialConditions: string[];
    evidenceIds: string[];
    source: { documentId: string; pdfPage: number };
    verificationStatus: string;
  }>;
});

describe("Samsung executable Rule specifications", () => {
  it("keeps seven generation/variant specs and all 40 Rules disabled", () => {
    expect(files).toHaveLength(7);
    expect(specs.flatMap((spec) => spec.rules)).toHaveLength(40);
    expect(specs.every((spec) => spec.calculationEnabled === false)).toBe(true);
    for (const spec of specs) {
      expect(spec.status).toBe(
        "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING",
      );
    }
  });

  it("does not mix variants and preserves unique Rule IDs", () => {
    const rules = specs.flatMap((spec) => spec.rules);
    expect(new Set(rules.map((rule) => rule.ruleId)).size).toBe(40);
    for (const spec of specs) {
      expect(spec.rules.every((rule) => rule.variant === spec.variant)).toBe(true);
    }
  });

  it("links every executable Rule to evidence and safety controls", () => {
    const evidenceIds = new Set(evidenceMap.mappings.map((item) => item.evidenceId));
    for (const rule of specs.flatMap((spec) => spec.rules)) {
      expect(rule.calculation.type).not.toBe("");
      expect(rule.evidenceIds).toHaveLength(1);
      expect(evidenceIds.has(rule.evidenceIds[0])).toBe(true);
      expect(rule.source.documentId).not.toBe("");
      expect(rule.source.pdfPage).toBeGreaterThan(0);
      expect(rule.specialConditions).toContain("POLICY_EXCLUSIONS_MUST_BE_CLEARED");
      expect(rule.verificationStatus).toBe(
        "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING",
      );
    }
  });

  it("models the high-risk exceptions explicitly", () => {
    const byId = new Map(specs.flatMap((spec) => spec.rules).map((rule) => [rule.ruleId, rule]));
    expect(byId.get("G1-04")?.calculation.type).toBe("FIXED_DEDUCTIBLE_THEN_RATE_WITH_CAP");
    expect(byId.get("G2-SEL2-02")?.calculation.type).toBe("EXPENSE_MINUS_MAX_WEIGHTED_DEDUCTIBLE");
    expect(byId.get("G4-05")?.specialConditions).toContain("AFTER_FIRST_10_TREATMENTS_IMPROVEMENT_EVIDENCE_REQUIRED");
    expect(byId.get("G5-09")?.calculation.type).toBe("TIER_LOOKUP");
  });
});
