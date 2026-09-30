import { describe, expect, it } from "vitest";
import {
  calculateSamsungGen4Claim,
  routeSamsungGen4Rule,
  validateSamsungGen4PremiumAdjustmentInput,
} from "../src/engine/calculateSamsungGen4";

describe("Samsung generation-4 rule routing", () => {
  it("routes covered inpatient and outpatient by injury or disease", () => {
    expect(routeSamsungGen4Rule({ baseCoveredConfirmed: true, nonCoveredRider: "NOT_ENROLLED", benefitClass: "COVERED", careSetting: "INPATIENT", claimCause: "INJURY", treatmentType: "GENERAL" })).toMatchObject({ ruleId: "G4-01" });
    expect(routeSamsungGen4Rule({ baseCoveredConfirmed: true, nonCoveredRider: "NOT_ENROLLED", benefitClass: "COVERED", careSetting: "OUTPATIENT", claimCause: "DISEASE", treatmentType: "GENERAL" })).toMatchObject({ ruleId: "G4-09" });
  });

  it("never treats an unknown non-covered rider as zero benefit", () => {
    const result = routeSamsungGen4Rule({ baseCoveredConfirmed: true, nonCoveredRider: "UNKNOWN", benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", claimCause: "INJURY", treatmentType: "GENERAL" });
    expect(result).toMatchObject({ status: "CONFIRMATION_REQUIRED" });
    if (result.status === "CONFIRMATION_REQUIRED") expect(result.requiredAction).toContain("보험증권");
  });

  it("returns not-covered only after non-enrollment is confirmed", () => {
    expect(routeSamsungGen4Rule({ baseCoveredConfirmed: true, nonCoveredRider: "NOT_ENROLLED", benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", claimCause: "INJURY", treatmentType: "MRI_MRA" })).toMatchObject({ status: "NOT_COVERED" });
  });

  it("routes general, manual therapy, injection, and MRI independently", () => {
    const base = { baseCoveredConfirmed: true, nonCoveredRider: "ENROLLED", benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", claimCause: "INJURY" } as const;
    expect(routeSamsungGen4Rule({ ...base, treatmentType: "GENERAL" })).toMatchObject({ ruleId: "G4-04" });
    expect(routeSamsungGen4Rule({ ...base, treatmentType: "MANUAL_THERAPY" })).toMatchObject({ ruleId: "G4-05" });
    expect(routeSamsungGen4Rule({ ...base, treatmentType: "INJECTION" })).toMatchObject({ ruleId: "G4-06" });
    expect(routeSamsungGen4Rule({ ...base, treatmentType: "MRI_MRA" })).toMatchObject({ ruleId: "G4-07" });
  });

  it("calculates MRI only after rider enrollment is confirmed", () => {
    const result = calculateSamsungGen4Claim(
      { baseCoveredConfirmed: true, nonCoveredRider: "ENROLLED", benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", claimCause: "DISEASE", treatmentType: "MRI_MRA" },
      { eligibleExpense: 100_000, policyExclusionsCleared: true, otherIndemnityPoliciesExist: false, coveragePeriodConfirmed: true, priorPaidBenefit: 0, aggregationUnit: "DIAGNOSTIC_ACTION" },
    );
    expect(result.status).toBe("CALCULATED");
    if (result.status === "CALCULATED") expect(result.result.claim).toBe(70_000);
  });

  it("keeps premium adjustment validation separate from claim calculation", () => {
    expect(validateSamsungGen4PremiumAdjustmentInput({ priorNonCoveredBenefit: { status: "UNKNOWN" }, adjustmentExclusion: "UNKNOWN" })).toEqual([
      "직전 기준기간 비급여 보험금 수령액",
      "할인·할증 제외 대상 여부",
    ]);
  });
});
