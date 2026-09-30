import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import handoff from "../handoff/14-to-15-and-16.json";
import manifest from "../knowledge/manifest.json";
import evidenceMap from "../knowledge/rule-evidence-map.json";
import privacy from "../knowledge/privacy-control-requirements.json";
import products from "../src/data/products.json";

const root = path.resolve(".");
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha256 = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");

describe("Stage 14 closeout integrity", () => {
  it("keeps all official PDFs present and hash-identical to the manifest", () => {
    expect(manifest.documents).toHaveLength(6);
    for (const document of manifest.documents) {
      expect(fs.existsSync(path.join(root, document.relativePath))).toBe(true);
      expect(sha256(document.relativePath)).toBe(document.sha256);
      expect(document.status).toBe("AI_SOURCE_VALIDATED");
    }
    expect(manifest.documents.some((document) => document.title.includes("다이렉트"))).toBe(false);
  });

  it("connects all 49 Rule candidates, Evidence records, and executable specs", () => {
    const specsDir = path.join(root, handoff.executableSpecDirectory);
    const specFiles = fs.readdirSync(specsDir).filter((name) => name.endsWith(".execution-spec.draft.json"));
    const specs = specFiles.map((name) => readJson(path.join(handoff.executableSpecDirectory, name)));
    const rules = specs.flatMap((spec) => spec.rules);
    const evidenceIds = new Set(evidenceMap.mappings.map((item) => item.evidenceId));

    expect(specFiles).toHaveLength(8);
    expect(rules).toHaveLength(49);
    expect(evidenceMap.mappings).toHaveLength(49);
    expect(handoff.aiValidatedRuleIds).toHaveLength(49);
    expect(handoff.implementableRuleIds).toHaveLength(49);
    expect(handoff.blockedRuleIds).toEqual([]);
    expect(new Set(rules.map((rule) => rule.ruleId))).toEqual(new Set(handoff.aiValidatedRuleIds));
    for (const rule of rules) {
      expect(rule.evidenceIds).toHaveLength(1);
      expect(evidenceIds.has(rule.evidenceIds[0])).toBe(true);
    }
  });

  it("prevents variant mixing in generations 2 and 3", () => {
    const specsDir = path.join(root, handoff.executableSpecDirectory);
    for (const name of fs.readdirSync(specsDir).filter((item) => item.endsWith(".json"))) {
      const spec = readJson(path.join(handoff.executableSpecDirectory, name));
      expect(spec.rules.every((rule: { variant: string }) => rule.variant === spec.variant)).toBe(true);
    }
  });

  it("keeps catalog, drafts, executable specs, and runtime Rules disabled", () => {
    expect(products.every((product) => product.calculationEnabled === false)).toBe(true);
    expect(handoff.status).toBe("READY_WITH_GENERATION_STATUS");
    expect(handoff.approvedBy).toContain("Codex AI");
    expect(handoff.approvalGates.aiSourceValidationComplete).toBe(true);
    expect(handoff.approvalGates.deterministicRegressionComplete).toBe(true);

    for (const name of fs.readdirSync(path.join(root, "src/rules/samsung")).filter((item) => item.endsWith(".json"))) {
      expect(readJson(path.join("src/rules/samsung", name)).rules).toEqual([]);
    }
    for (const name of fs.readdirSync(path.join(root, handoff.executableSpecDirectory)).filter((item) => item.endsWith(".json"))) {
      expect(readJson(path.join(handoff.executableSpecDirectory, name)).calculationEnabled).toBe(false);
    }
  });

  it("defines privacy controls and leaves unresolved production controls blocked", () => {
    expect(privacy.prohibitedInputs.length).toBeGreaterThan(0);
    expect(privacy.ragKnowledgeBase.prohibited).toContain("사용자 질문·대화·상담 내용");
    expect(privacy.logging.prohibited).toContain("질문 원문");
    expect(privacy.logging.retentionPeriod).toBeNull();
    expect(privacy.productionBlockers.length).toBeGreaterThan(0);
    expect(privacy.approvedBy).toEqual([]);
  });
});
