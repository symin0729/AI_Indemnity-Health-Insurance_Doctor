import { describe, expect, it } from "vitest";
import { matchesRagFilters } from "../api/lib/ragFilters";

describe("RAG product filters", () => {
  const metadata = { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" };

  it("상품·세대·담보가 일치하는 근거만 통과시킨다", () => {
    expect(matchesRagFilters(metadata, { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" })).toBe(true);
    expect(matchesRagFilters(metadata, { productCode: "SAMSUNG_1704_1", generation: 3 })).toBe(false);
  });
});
