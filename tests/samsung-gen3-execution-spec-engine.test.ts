import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateSamsungExecutionSpec as evaluate, type SamsungDraftCalculationInput as Input, type SamsungExecutionRule } from "../src/engine/evaluateSamsungExecutionSpec";
const rules = new Map<string, SamsungExecutionRule>(["standard", "selected2"].flatMap(variant => {
  const spec = JSON.parse(fs.readFileSync(`knowledge/drafts/samsung/executable-specs/SAMSUNG_1704_1.${variant}.execution-spec.draft.json`, "utf8"));
  return spec.rules.map((r: SamsungExecutionRule) => [r.ruleId, r]);
}));
const base: Input = {
  nhiApplied: true, policyExclusionsCleared: true, otherIndemnityPoliciesExist: false,
  threeNonCoveredExcludedFromBaseConfirmed: true,
  sameDayAggregationConfirmed: true, priorAnnualCount: 0, priorPaidBenefit: 0, priorEligibleDeductible: 0,
  outpatientBenefitCap: 250000, prescriptionBenefitCap: 50000, contractBenefitCap: 50000000,
  roomDifference: 0, inpatientExcludingRoomDifference: 100000, coveredCopay: 100000, nonCoveredExpense: 0,
  eligibleExpense: 100000, institution: "CLINIC",
  coverageStates: { VARIANT_STANDARD: "CONFIRMED", VARIANT_SELECTED2: "CONFIRMED", BASE: "CONFIRMED", MANUAL_THERAPY: "CONFIRMED", INJECTION: "CONFIRMED", MRI: "CONFIRMED" },
};
function run(id: string, input: Input = {}) { return evaluate(rules.get(id)!, { ...base, ...input }); }
function paid(id: string, input: Input, claim: number, deductible?: number) {
  const result = run(id, input);
  expect(result.status).toBe("DRAFT_CALCULATED");
  expect(result.ruleId).toBe(id);
  expect(result.source.documentId).toBe("SAMSUNG_1704_1_TERMS");
  expect(result.claim).toBeCloseTo(claim, 6);
  if (deductible !== undefined) expect(result.deductible).toBeCloseTo(deductible, 6);
}
function blocked(id: string, input: Input) {
  expect(run(id, input)).toMatchObject({ status: "CONFIRMATION_REQUIRED", claim: null });
}
const riders = [
  { id: "G3-STD-01", category: "MANUAL_THERAPY", unit: "TREATMENT", cap: 3500000, count: 50 },
  { id: "G3-STD-02", category: "INJECTION", unit: "VISIT", cap: 2500000, count: 50 },
  { id: "G3-STD-03", category: "MRI", unit: "DIAGNOSTIC_ACTION", cap: 3000000 },
] as const;
describe("1704.1 PDF-based base coverage", () => {
  it("standard inpatient and selected II covered/noncovered components", () => {
    paid("G3-STD-BASE-01", {}, 80000, 20000);
    paid("G3-SEL2-01", {}, 90000, 10000);
    paid("G3-SEL2-01", { coveredCopay: 0, nonCoveredExpense: 100000 }, 80000, 20000);
    paid("G3-SEL2-01", { nonCoveredExpense: 100000 }, 170000, 30000);
  });
  it("room unpaid and non-NHI unpaid amounts never enter the annual ceiling", () => {
    paid("G3-STD-BASE-01", { roomDifference: 400000, inpatientDays: 1, priorEligibleDeductible: 1990000 }, 190000, 310000);
    paid("G3-SEL2-01", { nhiApplied: false, nonNhiInpatientTotal: 100000, priorEligibleDeductible: 2000000 }, 40000, 60000);
  });
  it("outpatient institution minimum and weighted deductions", () => {
    for (const [institution, deductible] of [["CLINIC", 10000], ["HOSPITAL", 15000], ["GENERAL_HOSPITAL", 15000], ["GENERAL_TERTIARY", 20000]] as const) {
      paid("G3-STD-BASE-02", { eligibleExpense: 50000, institution }, 50000 - deductible, deductible);
      paid("G3-SEL2-BASE-02", { coveredCopay: 50000, institution }, 50000 - deductible, deductible);
    }
    paid("G3-SEL2-BASE-02", { coveredCopay: 100000, nonCoveredExpense: 100000 }, 170000, 30000);
  });
  it("prescription minimum, percentage and non-NHI deductions", () => {
    paid("G3-STD-BASE-03", { eligibleExpense: 40000 }, 32000, 8000);
    paid("G3-SEL2-BASE-03", { coveredCopay: 80000 }, 50000, 8000);
    paid("G3-STD-BASE-03", { eligibleExpense: 50000, nhiApplied: false }, 16000, 34000);
    paid("G3-SEL2-BASE-03", { coveredCopay: 0, nonCoveredExpense: 50000, nhiApplied: false }, 16000, 34000);
  });
  it("base counts 179/180/181", () => {
    for (const id of ["G3-STD-BASE-02", "G3-STD-BASE-03", "G3-SEL2-BASE-02", "G3-SEL2-BASE-03"]) {
      for (const n of [179,180,181]) paid(id, { eligibleExpense: 50000, coveredCopay: 0, nonCoveredExpense: 50000, priorAnnualCount: n }, n < 180 ? 40000 : 0);
    }
  });
  it("caps and invalid or unknown base inputs", () => {
    paid("G3-STD-BASE-01", { priorPaidBenefit: 49990000 }, 10000);
    paid("G3-STD-BASE-01", { priorPaidBenefit: 50000000, benefitLimitRestored: false }, 0);
    blocked("G3-STD-BASE-01", { roomDifference: undefined });
    blocked("G3-STD-BASE-01", { roomDifference: 1, inpatientDays: undefined });
    blocked("G3-STD-BASE-02", { prescriptionBenefitCap: 50001 });
    blocked("G3-STD-BASE-01", { threeNonCoveredExcludedFromBaseConfirmed: undefined });
  });
});
describe.each(riders)("1704.1 $category special rider", ({ id, category, unit, cap, count }) => {
  const input: Input = { aggregationUnit: unit, injectionRiderEligibleConfirmed: true };
  it("confirmed enrollment pays the PDF deduction; selected II uses the same rider", () => {
    paid(id, input, 70000, 30000);
    paid("G3-SEL2-02", { ...input, threeNonCoveredCategory: category }, 70000, 30000);
  });
  it("UNKNOWN differs from NOT_ENROLLED", () => {
    blocked(id, { ...input, coverageStates: { ...base.coverageStates, [category]: "UNKNOWN" } });
    expect(run(id, { ...input, coverageStates: { ...base.coverageStates, [category]: "NOT_ENROLLED" } })).toMatchObject({ status: "NOT_ENROLLED", claim: 0, deductible: null });
  });
  it("deductible boundaries and zero expense", () => {
    for (const [expense, claim] of [[0,0],[19999,0],[20000,0],[20001,1],[60000,40000],[70000,49000]]) paid(id, { ...input, eligibleExpense: expense }, claim);
  });
  it("annual cap boundaries and over-limit", () => {
    paid(id, { ...input, priorPaidBenefit: cap - 1 }, 1);
    paid(id, { ...input, priorPaidBenefit: cap }, 0);
    paid(id, { ...input, priorPaidBenefit: cap + 1 }, 0);
  });
  it("count boundaries or no invented MRI count limit", () => {
    for (const n of [49,50,51]) paid(id, { ...input, priorAnnualCount: n }, count && n >= count ? 0 : 70000);
  });
  it("rejects missing unit, exclusions and numeric non-finite input", () => {
    blocked(id, { ...input, aggregationUnit: undefined });
    blocked(id, { ...input, policyExclusionsCleared: false });
    for (const key of ["eligibleExpense", "priorPaidBenefit", "priorAnnualCount"]) for (const value of [NaN,Infinity,-Infinity]) blocked(id, { ...input, [key]: value });
  });
});
it("blocks unclassified injection and unreviewed rules", () => {
  blocked("G3-STD-02", { aggregationUnit: "VISIT" });
  const result = evaluate({ ...rules.get("G3-STD-01")!, verificationStatus: "NEEDS_REVIEW" }, { ...base, aggregationUnit: "TREATMENT" });
  expect(result.status).toBe("CONFIRMATION_REQUIRED");
});
