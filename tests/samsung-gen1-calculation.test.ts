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
      daysSinceAccidentOrDiagnosis: 1, requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      coveredRoomAndTreatment: 100_000, roomDifference: 20_000, priorPaidBenefit: 0,
    });
    expect("claim" in normal && normal.claim).toBe(110_000);

    const minimum = calculateSamsungGen1Sample({ ...base, careSetting: "OUTPATIENT" }, {
      daysSinceAccidentOrDiagnosis: 1, requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      outpatientExpense: 3_000, priorServiceDays: 0,
    });
    expect("claim" in minimum && minimum.claim).toBe(0);

    const capped = calculateSamsungGen1Sample(base, {
      daysSinceAccidentOrDiagnosis: 1, requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      coveredRoomAndTreatment: 200_000, roomDifference: 0, priorPaidBenefit: 49_950_000,
    });
    expect("claim" in capped && capped.claim).toBe(50_000);

    const missing = calculateSamsungGen1Sample(base, {
      daysSinceAccidentOrDiagnosis: 1, requiredCoverageConfirmed: true, policyExclusionsCleared: true, nhiApplied: true,
      priorPaidBenefit: 0,
    });
    expect("status" in missing && missing.status).toBe("CONFIRMATION_REQUIRED");
  });

  it("가입한 D1 특약이 없으면 질병·상해 입력 여부와 관계없이 계산하지 않는다", () => {
    const expected = { status: "CONFIRMATION_REQUIRED", reason: "가입한 D1 특약이 없어 계산할 수 없습니다. 보험증권의 특약을 확인해주세요." };
    expect(routeSamsungGen1Rule({ ...base, d1Coverage: "NONE" })).toEqual(expected);
    expect(routeSamsungGen1Rule({ ...base, d1Coverage: "NONE", claimCause: "UNKNOWN" })).toEqual(expected);
  });

  it("선택한 진료의 원인에 맞는 D1 특약이 없으면 미가입으로 보고 계산을 보류하지 않는다", () => {
    const expected = { status: "NOT_ENROLLED", reason: "선택한 진료의 원인(질병/상해)에 해당하는 D1 특약에 가입하지 않아 현재 계약은 보상하지 않습니다." };
    expect(routeSamsungGen1Rule({ ...base, d1Coverage: "INJURY", claimCause: "DISEASE" })).toEqual(expected);
    expect(routeSamsungGen1Rule({ ...base, d1Coverage: "DISEASE", claimCause: "INJURY" })).toEqual(expected);
  });
});
