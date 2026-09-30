import { describe, expect, it } from "vitest";
import { calculateSamsungGen1Sample, routeSamsungGen1Rule } from "../src/engine/calculateSamsungGen1";

const base = {
  product: "SAMSUNG_0904_2",
  contractBasis: "SAMPLE_SIMULATION",
  d1Coverage: "BOTH",
  claimCause: "INJURY",
  careSetting: "INPATIENT",
  nhiStatus: "APPLIED",
} as const;

describe("Samsung 0904.2 generation 1 routing", () => {
  it("routes verified execution-spec combinations", () => {
    expect(routeSamsungGen1Rule(base)).toEqual({ status: "ROUTED", ruleId: "G1-01" });
    expect(routeSamsungGen1Rule({ ...base, nhiStatus: "NOT_APPLIED" })).toEqual({ status: "ROUTED", ruleId: "G1-02" });
    expect(routeSamsungGen1Rule({ ...base, careSetting: "OUTPATIENT" })).toEqual({ status: "ROUTED", ruleId: "G1-04" });
    expect(routeSamsungGen1Rule({ ...base, claimCause: "DISEASE" })).toEqual({ status: "ROUTED", ruleId: "G1-05" });
  });

  it("does not calculate unverified or unsupported combinations", () => {
    expect(routeSamsungGen1Rule({ ...base, claimCause: "DISEASE", careSetting: "OUTPATIENT" }).status).toBe("RULE_NOT_VERIFIED");
    expect(routeSamsungGen1Rule({ ...base, nhiStatus: "PARTIAL" }).status).toBe("RULE_NOT_VERIFIED");
    expect(routeSamsungGen1Rule({ ...base, product: "OTHER" }).status).toBe("UNSUPPORTED_PRODUCT");
    expect(routeSamsungGen1Rule({ ...base, contractBasis: "ACTUAL_CONTRACT" }).status).toBe("RULE_NOT_VERIFIED");
  });

  it("calculates normal, minimum, cap, and missing-input sample cases", () => {
    const normal = calculateSamsungGen1Sample(base, {
      requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      coveredRoomAndTreatment: 100_000, roomDifference: 20_000, priorPaidBenefit: 0,
    });
    expect("claim" in normal && normal.claim).toBe(110_000);

    const minimum = calculateSamsungGen1Sample({ ...base, careSetting: "OUTPATIENT" }, {
      requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      outpatientExpense: 3_000, priorServiceDays: 0,
    });
    expect("claim" in minimum && minimum.claim).toBe(0);

    const capped = calculateSamsungGen1Sample(base, {
      requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      coveredRoomAndTreatment: 200_000, roomDifference: 0, priorPaidBenefit: 49_950_000,
    });
    expect("claim" in capped && capped.claim).toBe(50_000);

    const missing = calculateSamsungGen1Sample(base, {
      requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      priorPaidBenefit: 0,
    });
    expect("status" in missing && missing.status).toBe("CONFIRMATION_REQUIRED");
  });
});
