import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../knowledge/manifest.json";

describe("Samsung generation-1 RAG source hygiene", () => {
  const extractionPath = path.resolve("knowledge/extraction/samsung/SAMSUNG_0904_2.md");
  const extraction = fs.readFileSync(extractionPath, "utf8");

  it("keeps PDF watermark identifiers and duplicated glyph text out of the curated extraction", () => {
    expect(extraction).not.toContain("0507-10703093-16385306");
    expect(extraction).not.toMatch(/제\s+제\s+제|무\s+무\s+무|삼\s+삼\s+삼/);
  });

  it("indexes only the corrected 0904.2 source document in the manifest", () => {
    const gen1 = manifest.documents.filter((document) => document.generation === 1);
    expect(gen1).toHaveLength(1);
    expect(gen1[0].productCode).toBe("SAMSUNG_0904_2");
    expect(gen1[0].sha256).toBe("ee9b673d2bc222bd91bb66dc799fe0ded106b3aa03b7377b6494273aeb49f10b");
    expect(gen1[0].relativePath).not.toContain("SOURCE_MISMATCH");
  });
});
