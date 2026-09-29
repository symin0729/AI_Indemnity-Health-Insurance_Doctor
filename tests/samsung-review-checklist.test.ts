import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const reviewPath = path.resolve("knowledge/validation/samsung/two-person-independent-review.json");

describe("Samsung two-person independent review package", () => {
  it("lists every Rule with PDF and printed-page evidence without enabling calculation", () => {
    const review = JSON.parse(fs.readFileSync(reviewPath, "utf8")) as {
      status: string;
      calculationEnabled: boolean;
      sourcePdfCount: number;
      reviewItemCount: number;
      documentReviewItems: Array<{
        productCode: string;
        checks: string[];
        validationStatus: string;
      }>;
      reviewItems: Array<{
        productCode: string;
        ruleId: string;
        pdfPage: number;
        printedPage: number | null;
        pdfSha256: string;
        pdfPath: string;
        calculationType: string;
        calculation: { type: string };
        automatedTestRequirements: string[];
        priorityChecks: string[];
        validationStatus: string;
      }>;
    };
    expect(review.status).toBe("PENDING_AI_SOURCE_VALIDATION");
    expect(review.calculationEnabled).toBe(false);
    expect(review.sourcePdfCount).toBe(5);
    expect(review.reviewItemCount).toBe(40);
    expect(review.documentReviewItems).toHaveLength(5);
    expect(review.documentReviewItems.every((item) => item.checks.length >= 2)).toBe(true);
    expect(review.documentReviewItems.find((item) => item.productCode === "SAMSUNG_0904_2")?.checks.join(" ")).toContain("0904.2");
    expect(review.documentReviewItems.find((item) => item.productCode === "SAMSUNG_2107_1")?.checks.join(" ")).toContain("계약전환용");
    expect(review.documentReviewItems.find((item) => item.productCode === "SAMSUNG_2605_1")?.checks.join(" ")).toContain("100일");
    expect(review.reviewItems).toHaveLength(40);
    expect(new Set(review.reviewItems.map((item) => item.ruleId)).size).toBe(40);
    for (const item of review.reviewItems) {
      expect(item.pdfPage).toBeGreaterThan(0);
      expect(item.pdfSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(path.resolve(item.pdfPath))).toBe(true);
      expect(item.calculation.type).toBe(item.calculationType);
      expect(item.validationStatus).toBe(
        ["SAMSUNG_0904_2", "SAMSUNG_1611_7", "SAMSUNG_1704_1", "SAMSUNG_2107_1"].includes(item.productCode)
          ? "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING"
          : "PENDING_AI_SOURCE_VALIDATION",
      );
      expect(item.automatedTestRequirements.length).toBeGreaterThanOrEqual(5);
    }
    expect(new Set(review.reviewItems.map((item) => item.calculationType))).toEqual(new Set([
      "RATE_BENEFIT",
      "COMPONENT_SUM",
      "EXPENSE_MINUS_MAX_DEDUCTIBLE",
      "EXPENSE_MINUS_MAX_WEIGHTED_DEDUCTIBLE",
      "FIXED_DEDUCTIBLE_THEN_RATE_WITH_CAP",
      "COVERED_OUTPATIENT_MAX_DEDUCTIBLE",
      "INSTITUTION_MINIMUM_LOOKUP",
      "TIER_LOOKUP",
    ]));
    const byId = new Map(review.reviewItems.map((item) => [item.ruleId, item]));
    expect(byId.get("G1-05")?.pdfPage).toBe(113);
    expect(byId.get("G1-05")?.printedPage).toBeNull();
    expect(byId.get("G4-05")?.priorityChecks.join(" ")).toContain("최초 10회");
    expect(byId.get("G5-05")?.priorityChecks.join(" ")).toContain("10회 단위");
    expect(byId.get("G5-07")?.pdfPage).toBe(63);
    expect(byId.get("G5-07")?.printedPage).toBe(62);
    expect(byId.get("G5-07")?.priorityChecks.join(" ")).toContain("기존 기록을 반려");
    for (const item of review.reviewItems.filter((entry) => entry.productCode === "SAMSUNG_1611_7" || entry.productCode === "SAMSUNG_1704_1")) {
      expect(item.priorityChecks.join(" ")).toContain(item.variant);
    }
    for (const item of review.reviewItems) {
      expect(item.priorityChecks.join(" ")).toContain("비례보상");
    }
  });
});
