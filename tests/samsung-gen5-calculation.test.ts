import { describe, expect, it } from "vitest";
import {
  calculateSamsungGen5Claim,
  calculateSamsungGen5,
  resolveSamsungGen5ContractCombination,
  routeSamsungGen5Coverage,
  selectSamsungGen5Rule,
} from "../src/engine/calculateSamsungGen5";

const common = {
  policyExclusionsCleared: true,
  otherIndemnityPoliciesExist: false,
  coveragePeriodConfirmed: true,
};

describe("Samsung generation-5 product calculation routing", () => {
  it("derives contract combinations A through D from rider enrollment", () => {
    expect(resolveSamsungGen5ContractCombination({ baseCovered: "ENROLLED", severeNonCoveredRider: "NOT_ENROLLED", nonSevereNonCoveredRider: "NOT_ENROLLED" })).toBe("A");
    expect(resolveSamsungGen5ContractCombination({ baseCovered: "ENROLLED", severeNonCoveredRider: "ENROLLED", nonSevereNonCoveredRider: "NOT_ENROLLED" })).toBe("B");
    expect(resolveSamsungGen5ContractCombination({ baseCovered: "ENROLLED", severeNonCoveredRider: "NOT_ENROLLED", nonSevereNonCoveredRider: "ENROLLED" })).toBe("C");
    expect(resolveSamsungGen5ContractCombination({ baseCovered: "ENROLLED", severeNonCoveredRider: "ENROLLED", nonSevereNonCoveredRider: "ENROLLED" })).toBe("D");
  });

  it("classifies severe and non-severe coverage from objective facts", () => {
    const enrollment = { baseCovered: "ENROLLED", severeNonCoveredRider: "ENROLLED", nonSevereNonCoveredRider: "ENROLLED" } as const;
    expect(routeSamsungGen5Coverage(enrollment, {
      benefitClass: "NON_COVERED", careSetting: "INPATIENT", specialCaseDisease: "YES", treatmentRelatedness: "RELATED", policyExcludedTreatment: "NO",
    })).toMatchObject({ status: "ROUTED", classification: "SEVERE", coverage: "SEVERE_NON_COVERED_INPATIENT" });
    expect(routeSamsungGen5Coverage(enrollment, {
      benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", specialCaseDisease: "NO", treatmentRelatedness: "UNKNOWN", policyExcludedTreatment: "NO", threeNonCoveredCategory: "MRI",
    })).toMatchObject({ status: "ROUTED", classification: "NON_SEVERE", coverage: "NON_SEVERE_MRI_MRA" });
  });

  it("asks only for the missing objective fact instead of requesting human review", () => {
    const decision = routeSamsungGen5Coverage(
      { baseCovered: "ENROLLED", severeNonCoveredRider: "ENROLLED", nonSevereNonCoveredRider: "ENROLLED" },
      { benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", specialCaseDisease: "UNKNOWN", treatmentRelatedness: "UNKNOWN", policyExcludedTreatment: "UNKNOWN" },
    );
    expect(decision).toMatchObject({ status: "CONFIRMATION_REQUIRED", requiredQuestion: "산정특례 적용을 받으셨나요?" });
  });

  it("returns clearly labelled severe and non-severe simulations when classification remains uncertain", () => {
    const decision = calculateSamsungGen5Claim(
      "GENERAL",
      { baseCovered: "ENROLLED", severeNonCoveredRider: "ENROLLED", nonSevereNonCoveredRider: "ENROLLED" },
      { benefitClass: "NON_COVERED", careSetting: "OUTPATIENT", specialCaseDisease: "UNKNOWN", treatmentRelatedness: "UNKNOWN", policyExcludedTreatment: "NO" },
      { ...common, eligibleExpense: 100_000, requiredCoverageConfirmed: true, claimCause: "INJURY", priorAnnualCount: 0, priorServiceDays: 0, priorPaidBenefit: 0 },
      "CONDITIONAL_SIMULATION",
    );
    expect(decision.status).toBe("CONDITIONAL_SIMULATION");
    if (decision.status === "CONDITIONAL_SIMULATION") {
      expect(decision.notice).toContain("조건별 참고 결과");
      expect(decision.scenarios.map((item) => item.classification)).toEqual(["SEVERE", "NON_SEVERE"]);
      expect(decision.scenarios.every((item) => item.result?.status === "DRAFT_CALCULATED")).toBe(true);
    }
  });

  it("routes all screen coverage selections to independent contract RuleSets", () => {
    expect(selectSamsungGen5Rule("GENERAL", "COVERED_INPATIENT").ruleId).toBe("G5-01");
    expect(selectSamsungGen5Rule("GENERAL", "NON_SEVERE_MRI_MRA").source.documentId).toBe("SAMSUNG_2605_1_GENERAL_TERMS");
    expect(selectSamsungGen5Rule("CONVERSION", "COVERED_INPATIENT").ruleId).toBe("G5-CONV-01");
    expect(selectSamsungGen5Rule("CONVERSION", "NON_SEVERE_MRI_MRA").source.documentId).toBe("SAMSUNG_2605_1_CONVERSION_TERMS");
  });

  it("applies the covered inpatient annual contract limit", () => {
    const result = calculateSamsungGen5("GENERAL", "COVERED_INPATIENT", {
      ...common,
      eligibleExpense: 1_000_000,
      nhiApplied: true,
      priorPaidBenefit: 49_500_000,
      contractBenefitCap: 50_000_000,
    });
    expect(result.claim).toBe(500_000);
  });

  it("applies category-specific severe three-non-covered limits", () => {
    const result = calculateSamsungGen5("GENERAL", "SEVERE_THREE_NON_COVERED", {
      ...common,
      eligibleExpense: 100_000,
      requiredCoverageConfirmed: true,
      threeNonCoveredCategory: "INJECTION",
      priorAnnualCount: 0,
      priorPaidBenefit: 2_480_000,
    });
    expect(result.claim).toBe(20_000);
  });

  it("caps non-severe inpatient benefits at three million won outside general hospitals", () => {
    const result = calculateSamsungGen5("GENERAL", "NON_SEVERE_NON_COVERED_INPATIENT", {
      ...common,
      requiredCoverageConfirmed: true,
      nonSevereNonCoveredInpatientExcludingRoom: 8_000_000,
      roomDifference: 0,
      institution: "CLINIC_HOSPITAL",
      priorPaidBenefit: 0,
    });
    expect(result.claim).toBe(3_000_000);
  });

  it("caps non-severe outpatient benefits at two hundred thousand won per day", () => {
    const result = calculateSamsungGen5("GENERAL", "NON_SEVERE_NON_COVERED_OUTPATIENT", {
      ...common,
      eligibleExpense: 1_000_000,
      requiredCoverageConfirmed: true,
      claimCause: "INJURY",
      priorServiceDays: 0,
      priorPaidBenefit: 0,
    });
    expect(result.claim).toBe(200_000);
  });

  it("calculates the conversion RuleSet only after conversion facts are confirmed", () => {
    const blocked = calculateSamsungGen5("CONVERSION", "COVERED_OUTPATIENT", {
      eligibleExpense: 100_000,
    });
    expect(blocked.status).toBe("CONFIRMATION_REQUIRED");

    const result = calculateSamsungGen5("CONVERSION", "COVERED_OUTPATIENT", {
      ...common,
      conversionContractSubtype: "CHILD_CONVERSION",
      conversionEligibilityConfirmed: true,
      eligibleExpense: 100_000,
      healthInsuranceCopayRate: 0.3,
      institution: "CLINIC_HOSPITAL",
      nhiApplied: true,
    });
    expect(result.claim).toBe(70_000);
  });
});
