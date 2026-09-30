import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateSamsungExecutionSpec, type SamsungDraftCalculationInput as Input, type SamsungExecutionRule } from "../src/engine/evaluateSamsungExecutionSpec";

const rules = new Map<string, SamsungExecutionRule>(["standard", "selected2"].flatMap(variant => {
  const spec = JSON.parse(fs.readFileSync(`knowledge/drafts/samsung/executable-specs/SAMSUNG_1611_7.${variant}.execution-spec.draft.json`, "utf8"));
  return spec.rules.map((rule: SamsungExecutionRule) => [rule.ruleId, rule]);
}));
const inpatient: Input = {
  nhiApplied: true, requiredCoverageConfirmed: true, policyExclusionsCleared: true,
  otherIndemnityPoliciesExist: false, coveragePeriodConfirmed: true,
  inpatientExcludingRoomDifference: 100000, roomDifference: 0, coveragePeriod: "ACTIVE",
  priorEligibleDeductible: 0, priorPaidBenefit: 0, contractBenefitCap: 50000000,
};
const outpatient: Input = {
  nhiApplied: true, requiredCoverageConfirmed: true, policyExclusionsCleared: true,
  otherIndemnityPoliciesExist: false, coveragePeriodConfirmed: true,
  coveragePeriod: "ACTIVE", sameDayAggregationConfirmed: true,
  eligibleExpense: 50000, institution: "CLINIC", priorAnnualCount: 0,
  outpatientBenefitCap: 250000, prescriptionBenefitCap: 50000,
};
function run(id: string, input: Input) {
  const rule = rules.get(id)!;
  const snapshot = { ...input };
  const result = evaluateSamsungExecutionSpec(rule, input);
  expect(input).toEqual(snapshot);
  expect(rule.generation).toBe(2);
  expect(result.ruleId).toBe(id);
  expect(result.appliedFormula).toBe(rule.calculation.type);
  expect(result.source.documentId).toBe("SAMSUNG_1611_7_TERMS");
  return result;
}
function paid(id: string, input: Input, claim: number, deductible: number, capBasis: number, restored = 0) {
  const result = run(id, input);
  expect(result.status).toBe("DRAFT_CALCULATED");
  expect(result.claim).toBeCloseTo(claim, 6);
  expect(result.deductible).toBeCloseTo(deductible - restored, 6);
  expect(result.gen2Trace?.deductible).toBeCloseTo(deductible, 6);
  expect(result.gen2Trace?.capEligibleDeductible).toBeCloseTo(capBasis, 6);
  expect(result.gen2Trace?.restored).toBeCloseTo(restored, 6);
  expect(result.gen2Trace?.enforcedDeductible).toBeCloseTo(deductible - restored, 6);
  expect(result.gen2Trace?.enforcedClaim).toBeCloseTo(claim, 6);
}
function blocked(id: string, input: Input, reason: string) {
  const result = run(id, input);
  expect(result.status).toBe("CONFIRMATION_REQUIRED");
  expect(result.claim).toBeNull();
  expect(result.deductible).toBeNull();
  expect(result.gen2Trace).toBeUndefined(); // incomplete inputs must not expose a calculated trace
  expect(result.warnings.join(" ")).toContain(reason);
}

describe("Samsung 1611.7 C01–C06", () => {
  it("Test 01 standard inpatient 80%", () => paid("G2-STD-01", inpatient, 80000, 20000, 20000));
  it("Test 02 selected II covered 90% and non-covered 80%", () => paid("G2-SEL2-01", {
    ...inpatient, coveredCopay: 100000, nonCoveredExpense: 100000,
  }, 170000, 30000, 30000));
  it("Test 03 excludes room unpaid amount from annual ceiling", () => {
    paid("G2-STD-01", { ...inpatient, roomDifference: 400000, inpatientDays: 1, priorEligibleDeductible: 1990000 }, 190000, 320000, 20000, 10000);
    paid("G2-SEL2-01", { ...inpatient, coveredCopay: 100000, nonCoveredExpense: 100000, roomDifference: 400000, inpatientDays: 1, priorEligibleDeductible: 1990000 }, 290000, 330000, 30000, 20000);
  });
  it("Test 04 non-NHI 40/60 never restores unpaid 60%", () => {
    for (const id of ["G2-STD-01", "G2-SEL2-01"]) {
      for (const prior of [undefined, 1990000, 2000000, 2100000]) {
        paid(id, { ...inpatient, nhiApplied: false, nonNhiInpatientTotal: 100000, priorEligibleDeductible: prior }, 40000, 60000, 0);
      }
    }
  });
  it("Test 05 accepts combined caps through 300000 and uses the matching cap", () => {
    paid("G2-STD-02", outpatient, 40000, 10000, 10000);
    paid("G2-STD-03", { ...outpatient, prescriptionBenefitCap: 30000 }, 30000, 10000, 10000);
  });
  it("Test 06 rejects combined caps exceeding 300000", () => blocked("G2-STD-02", { ...outpatient, prescriptionBenefitCap: 50001 }, "300,000"));
  it("Test 07 missing room amount is unknown, explicit zero is confirmed", () => {
    blocked("G2-STD-01", { ...inpatient, roomDifference: undefined }, "병실료 차액");
    paid("G2-STD-01", inpatient, 80000, 20000, 20000);
    blocked("G2-STD-01", { ...inpatient, inpatientDays: NaN }, "유한한");
  });
  it("Test 08 missing days with room charges must not become one day", () => blocked("G2-STD-01", { ...inpatient, roomDifference: 400000 }, "입원일수"));
  it("Test 09 active outpatient allows the 180th visit only", () => {
    paid("G2-STD-02", { ...outpatient, priorAnnualCount: 179 }, 40000, 10000, 10000);
    paid("G2-STD-02", { ...outpatient, priorAnnualCount: 180 }, 0, 10000, 10000);
  });
  it("Test 10 active prescription allows the 180th prescription only", () => {
    paid("G2-STD-03", { ...outpatient, priorAnnualCount: 179 }, 40000, 10000, 10000);
    paid("G2-STD-03", { ...outpatient, priorAnnualCount: 180 }, 0, 10000, 10000);
  });
  it("Test 11 continuation has separate 90 visit/prescription counters and 180 days", () => {
    for (const id of ["G2-STD-02", "G2-STD-03", "G2-SEL2-02", "G2-SEL2-03"]) {
      const input: Input = { ...outpatient, coveredCopay: 0, nonCoveredExpense: 50000, coveragePeriod: "POST_TERMINATION", postTerminationContinuationConfirmed: true, daysSinceTermination: 180, priorContinuationCount: 89, priorAnnualCount: 180 };
      paid(id, input, 40000, 10000, 10000);
      paid(id, { ...input, priorContinuationCount: 90 }, 0, 10000, 10000);
      paid(id, { ...input, daysSinceTermination: 181 }, 0, 10000, 10000);
    }
  });
  it("Test 12 blocks unconfirmed period, eligibility, day and continuation count", () => {
    blocked("G2-STD-02", { ...outpatient, coveragePeriod: undefined }, "정상 보장기간");
    blocked("G2-STD-02", { ...outpatient, coveragePeriod: "UNKNOWN" }, "정상 보장기간");
    const input: Input = { ...outpatient, coveragePeriod: "POST_TERMINATION", daysSinceTermination: 1, priorContinuationCount: 0 };
    blocked("G2-STD-02", input, "계속 치료 조건");
    blocked("G2-STD-02", { ...input, postTerminationContinuationConfirmed: true, daysSinceTermination: undefined }, "경과일");
    blocked("G2-STD-02", { ...input, postTerminationContinuationConfirmed: true, priorContinuationCount: undefined }, "기존 외래");
  });
  it("Test 13 no other insurance preserves payment", () => paid("G2-STD-01", inpatient, 80000, 20000, 20000));
  it("Test 14 other insurance without a factor requires confirmation", () => blocked("G2-STD-01", { ...inpatient, otherIndemnityPoliciesExist: true }, "계약별 보상책임액"));
  it("Test 15 verified external factor still multiplies capped benefit", () => paid("G2-STD-01", { ...inpatient, otherIndemnityPoliciesExist: true, proportionalPaymentFactor: 0.5, priorEligibleDeductible: 1990000 }, 45000, 20000, 20000, 10000));
  it("rejects missing paired caps, contradictory legacy caps, and non-finite factors", () => {
    blocked("G2-STD-02", { ...outpatient, prescriptionBenefitCap: undefined, perOccurrenceBenefitCap: 250000 }, "각각 확인");
    blocked("G2-STD-02", { ...outpatient, perOccurrenceBenefitCap: 300000 }, "일치하지");
    for (const factor of [NaN, Infinity, -0.1, 1.1]) blocked("G2-STD-01", { ...inpatient, otherIndemnityPoliciesExist: true, proportionalPaymentFactor: factor }, factor === 1.1 ? "0~1" : "유한한");
  });
  it("requires inpatient continuation eligibility and days 1 through 180", () => {
    for (const id of ["G2-STD-01", "G2-SEL2-01"]) {
      const input: Input = { ...inpatient, coveredCopay: 100000, nonCoveredExpense: 0, coveragePeriod: "POST_TERMINATION", postTerminationContinuationConfirmed: true, daysSinceTermination: 180 };
      expect(run(id, input).status).toBe("DRAFT_CALCULATED");
      for (const days of [undefined, 0, 181]) blocked(id, { ...input, daysSinceTermination: days }, "180일");
      for (const confirmed of [undefined, false]) blocked(id, { ...input, postTerminationContinuationConfirmed: confirmed }, "계속 중인");
      blocked(id, { ...input, coveragePeriod: undefined }, "정상 보장기간");
      const exhausted = run(id, { ...input, priorPaidBenefit: 50000000, benefitLimitRestored: true });
      expect(exhausted.claim).toBe(0); // 1611.7 종료 후 계속 입원에는 제3조의 복원 조항 미적용.
    }
  });
  it("rejects all non-finite inpatient accumulators without rejecting valid zero", () => {
    for (const key of ["priorEligibleDeductible", "priorPaidBenefit", "contractBenefitCap", "inpatientDays", "roomDifference"]) {
      for (const value of [NaN, Infinity, -Infinity]) blocked("G2-STD-01", { ...inpatient, [key]: value }, "유한한");
    }
    paid("G2-STD-01", { ...inpatient, inpatientExcludingRoomDifference: 0 }, 0, 0, 0);
  });
});
