import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Samsung generation-3 RAG source hygiene", () => {
  const extractionPath = path.resolve("knowledge/extraction/samsung/SAMSUNG_1704_1.md");

  it("keeps PDF extraction artifacts out of the curated source", () => {
    const text = fs.readFileSync(extractionPath, "utf8");
    expect(text).not.toMatch(/Advanced encoding|UniKS-UTF16-H/);
    expect(text).not.toMatch(/무\s+무\s+배\s+배/);
    expect(text).not.toMatch(/제\s+제\s+제/);
  });

  it("keeps the basic coverage and three non-covered riders distinct", () => {
    const text = fs.readFileSync(extractionPath, "utf8");
    expect(text).toContain("G3-STD-BASE-01");
    expect(text).toContain("G3-STD-01");
    expect(text).toContain("G3-SEL2-02");
  });
});
