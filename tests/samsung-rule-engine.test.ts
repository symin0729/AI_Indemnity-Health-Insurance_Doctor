import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/samsung/gen5-2605-1-cases.json";

describe("samsung rule engine fixtures", () => {
  it("공식 약관 검수 전 케이스를 임의로 생성하지 않는다", () => {
    expect(fixtures.status).toBe("PENDING_EVIDENCE");
    expect(fixtures.cases).toEqual([]);
  });
});
