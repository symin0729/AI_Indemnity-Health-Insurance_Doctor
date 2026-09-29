import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Samsung generation-2 RAG source hygiene", () => {
  const extractionPath = path.resolve("knowledge/extraction/samsung/SAMSUNG_1611_7.md");

  it("keeps PDF extraction artifacts out of the curated source", () => {
    const text = fs.readFileSync(extractionPath, "utf8");
    expect(text).not.toMatch(/Advanced encoding|UniKS-UTF16-H/);
    expect(text).not.toMatch(/무\s+무\s+배\s+배/);
    expect(text).not.toMatch(/제\s+제\s+제/);
  });

  it("declares both variants explicitly without enabling calculation", () => {
    const metadata = JSON.parse(
      fs.readFileSync(path.resolve("knowledge/metadata/samsung/SAMSUNG_1611_7.json"), "utf8"),
    ) as { variants: string[]; calculationEnabled: boolean };
    expect(metadata.variants).toEqual(["standard", "selected2"]);
    expect(metadata.calculationEnabled).toBe(false);
  });
});
