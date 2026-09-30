import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import products from "../src/data/products.json";

describe("Samsung extraction records", () => {
  it("contains the mandatory clause-level review fields", () => {
    const requiredLabels = [
      "- 분류:", "- 약관 조항:", "- pdfPage:", "- printedPage:", "- 적용 담보:",
      "- 원문 요약:", "- 계산 후보:", "- 보장 조건:", "- 최소 공제금:",
      "- 면책·예외:", "- 특약 조건:", "- 합산 기준:", "- 적용 시점:",
      "- 1차 검수자:", "- 2차 검수자:", "- 상태: DRAFT",
    ];

    for (const product of products) {
      const file = path.resolve(`knowledge/extraction/samsung/${product.productCode}.md`);
      const text = fs.readFileSync(file, "utf8");
      expect(text).toContain("## 문서 정보");
      expect(text).toContain("## 조항 EX-001");
      for (const label of requiredLabels) expect(text).toContain(label);
    }
  });
});
