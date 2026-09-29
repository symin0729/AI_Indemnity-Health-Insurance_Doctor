import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateSamsungExecutionSpec,
  type SamsungExecutionRule,
} from "../src/engine/evaluateSamsungExecutionSpec";

const draftDir = path.resolve("knowledge/drafts/samsung");
const specDir = path.join(draftDir, "executable-specs");
const specs = fs.readdirSync(specDir)
  .filter((name) => name.endsWith(".execution-spec.draft.json"))
  .map((name) => JSON.parse(fs.readFileSync(path.join(specDir, name), "utf8")) as {
    productCode: string;
    variant: string;
    calculationEnabled: boolean;
    rules: SamsungExecutionRule[];
  });
const rules = new Map(specs.flatMap((spec) => spec.rules).map((rule) => [rule.ruleId, rule]));
const automatedCases = fs.readdirSync(draftDir)
  .filter((name) => name.endsWith(".hand-calculation.draft.json"))
  .flatMap((name) => (JSON.parse(fs.readFileSync(path.join(draftDir, name), "utf8")) as {
    cases: Array<{
      caseId: string;
      ruleId: string;
      inputs: Record<string, number | boolean | string>;
      expectedClaim: number;
      expectedDeductible?: number;
    }>;
  }).cases);

describe("Samsung execution-spec draft engine", () => {
  it("keeps all source specifications disabled", () => {
    expect(specs.every((spec) => spec.calculationEnabled === false)).toBe(true);
  });

  it.each(automatedCases)("$caseId reproduces the automated draft answer", (item) => {
    const rule = rules.get(item.ruleId);
    expect(rule).toBeDefined();
    const inputs = rule?.generation === 1
      ? {
          ...item.inputs,
          nhiApplied: item.ruleId === "G1-02" ? false : (item.inputs.nhiApplied ?? true),
          requiredCoverageConfirmed: true,
          policyExclusionsCleared: true,
          priorPaidBenefit: 0,
        }
      : rule?.generation === 2
        ? {
            ...item.inputs,
            nhiApplied: item.inputs.nhiApplied ?? true,
            requiredCoverageConfirmed: true,
            policyExclusionsCleared: true,
            priorEligibleDeductible: item.inputs.priorEligibleDeductible ?? 0,
            priorPaidBenefit: item.inputs.priorPaidBenefit ?? 0,
            priorAnnualCount: item.inputs.priorAnnualCount ?? 0,
            contractBenefitCap: 50_000_000,
            perOccurrenceBenefitCap: 300_000,
            otherIndemnityPoliciesExist: false,
            coveragePeriodConfirmed: true,
            sameDayAggregationConfirmed: true,
          }
        : rule?.generation === 3
          ? {
              ...item.inputs,
              nhiApplied: item.inputs.nhiApplied ?? true,
              requiredCoverageConfirmed: true,
              policyExclusionsCleared: true,
              priorEligibleDeductible: item.inputs.priorEligibleDeductible ?? 0,
              priorPaidBenefit: item.inputs.priorPaidBenefit ?? 0,
              priorAnnualCount: item.inputs.priorAnnualCount ?? 0,
              contractBenefitCap: 50_000_000,
              perOccurrenceBenefitCap: 300_000,
              otherIndemnityPoliciesExist: false,
              coveragePeriodConfirmed: true,
              sameDayAggregationConfirmed: true,
              threeNonCoveredExcludedFromBaseConfirmed: true,
              threeNonCoveredCategory: "MANUAL_THERAPY",
              aggregationUnit: item.ruleId === "G3-STD-03" ? "DIAGNOSTIC_ACTION" : "TREATMENT",
            }
          : rule?.generation === 4
            ? {
                ...item.inputs,
                nhiApplied: item.inputs.nhiApplied ?? true,
                requiredCoverageConfirmed: true,
                policyExclusionsCleared: true,
                priorPaidBenefit: item.inputs.priorPaidBenefit ?? 0,
                priorAnnualCount: item.inputs.priorAnnualCount ?? 0,
                contractBenefitCap: 50_000_000,
                perOccurrenceBenefitCap: 200_000,
                otherIndemnityPoliciesExist: false,
                coveragePeriodConfirmed: true,
                sameDayAggregationConfirmed: true,
                threeNonCoveredExcludedFromBaseConfirmed: true,
                claimCause: "INJURY",
                improvementEvidenceConfirmed: true,
                aggregationUnit: item.ruleId === "G4-07" ? "DIAGNOSTIC_ACTION" : "TREATMENT",
              }
      : item.inputs;
    const result = evaluateSamsungExecutionSpec(rule!, inputs);
    expect(result.status).toBe("DRAFT_CALCULATED");
    expect(result.claim).toBe(item.expectedClaim);
    if (item.expectedDeductible !== undefined) expect(result.deductible).toBe(item.expectedDeductible);
    expect(result.source.pdfPage).toBeGreaterThan(0);
  });

  it("refuses the fifth-generation covered outpatient calculation without required facts", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G5-02")!, { eligibleExpense: 100_000 });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
    expect(result.claim).toBeNull();
  });

  it("calculates the fifth-generation covered outpatient maximum deductible", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G5-02")!, {
      eligibleExpense: 100_000,
      healthInsuranceCopayRate: 0.3,
      institution: "CLINIC_HOSPITAL",
    });
    expect(result.deductible).toBe(30_000);
    expect(result.claim).toBe(70_000);
  });

  it("applies the second- and third-generation annual deductible ceiling", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G2-STD-01")!, {
      eligibleExpense: 100_000,
      priorEligibleDeductible: 1_990_000,
      nhiApplied: true,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      contractBenefitCap: 50_000_000,
      priorPaidBenefit: 0,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
    });
    expect(result.deductible).toBe(10_000);
    expect(result.claim).toBe(90_000);
  });

  it("applies the second-generation non-NHI inpatient fallback rate", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G2-SEL2-01")!, {
      nonNhiInpatientTotal: 100_000,
      nhiApplied: false,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorEligibleDeductible: 0,
      contractBenefitCap: 50_000_000,
      priorPaidBenefit: 0,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
    });
    expect(result.claim).toBe(40_000);
  });

  it("requires second-generation variant, exclusions, counts, and policy limits", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G2-STD-02")!, {
      eligibleExpense: 50_000,
      institution: "CLINIC",
      nhiApplied: true,
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
  });

  it("applies the second-generation non-NHI outpatient 40% rate after deduction", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G2-STD-02")!, {
      eligibleExpense: 50_000,
      institution: "CLINIC",
      nhiApplied: false,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorAnnualCount: 0,
      perOccurrenceBenefitCap: 300_000,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
      sameDayAggregationConfirmed: true,
    });
    expect(result.claim).toBe(16_000);
    expect(result.deductible).toBe(34_000);
  });

  it("does not apply the later ten-treatment improvement condition to generation 3", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G3-STD-01")!, {
      eligibleExpense: 100_000,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorAnnualCount: 10,
      priorPaidBenefit: 0,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
    });
    expect(result.status).toBe("DRAFT_CALCULATED");
    expect(result.claim).toBe(70_000);
  });

  it("requires the selected generation-3 non-covered category", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G3-SEL2-02")!, {
      eligibleExpense: 100_000,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorPaidBenefit: 0,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
  });

  it("applies the selected generation-3 injection annual cap", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G3-SEL2-02")!, {
      eligibleExpense: 100_000,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorAnnualCount: 0,
      priorPaidBenefit: 2_480_000,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
      threeNonCoveredCategory: "INJECTION",
    });
    expect(result.claim).toBe(20_000);
  });

  it("blocks generation-3 base coverage until the three non-covered treatments are excluded", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G3-STD-BASE-01")!, {
      eligibleExpense: 100_000,
      nhiApplied: true,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorEligibleDeductible: 0,
      priorPaidBenefit: 0,
      contractBenefitCap: 50_000_000,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
  });

  it("stops a first-generation outpatient claim after the 30 service-day limit", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G1-04")!, {
      outpatientExpense: 20_000,
      nhiApplied: true,
      priorServiceDays: 30,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
    });
    expect(result.claim).toBe(0);
  });

  it("requires first-generation rider and exclusion confirmation", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G1-01")!, {
      coveredRoomAndTreatment: 100_000,
      roomDifference: 0,
      nhiApplied: true,
      priorPaidBenefit: 0,
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
  });

  it("applies the first-generation non-NHI inpatient fallback rate", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G1-01")!, {
      nonNhiInpatientTotal: 100_000,
      nhiApplied: false,
      priorPaidBenefit: 0,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
    });
    expect(result.claim).toBe(40_000);
  });

  it("caps first-generation inpatient benefits at 50 million won", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G1-01")!, {
      coveredRoomAndTreatment: 1_000_000,
      roomDifference: 0,
      nhiApplied: true,
      priorPaidBenefit: 49_500_000,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
    });
    expect(result.claim).toBe(500_000);
  });

  it("applies the 180-day disease readmission reset", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G1-05")!, {
      coveredRoomAndTreatment: 100_000,
      roomDifference: 0,
      nhiApplied: true,
      daysSinceAccidentOrDiagnosis: 366,
      daysSinceLastDischarge: 180,
      priorPaidBenefit: 0,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
    });
    expect(result.claim).toBe(100_000);
  });

  it("requires improvement evidence after the first ten covered treatments", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G4-05")!, {
      eligibleExpense: 50_000,
      priorAnnualCount: 10,
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
  });

  it("calculates fourth-generation covered outpatient deductibles and caps", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G4-08")!, {
      eligibleExpense: 50_000,
      institution: "CLINIC_HOSPITAL",
      nhiApplied: true,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorPaidBenefit: 0,
      contractBenefitCap: 50_000_000,
      perOccurrenceBenefitCap: 200_000,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
      sameDayAggregationConfirmed: true,
    });
    expect(result.status).toBe("DRAFT_CALCULATED");
    expect(result.deductible).toBe(10_000);
    expect(result.claim).toBe(40_000);
  });

  it("applies the fourth-generation non-NHI outpatient fallback rate", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G4-08")!, {
      eligibleExpense: 50_000,
      institution: "CLINIC_HOSPITAL",
      nhiApplied: false,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorPaidBenefit: 0,
      contractBenefitCap: 50_000_000,
      perOccurrenceBenefitCap: 200_000,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
      sameDayAggregationConfirmed: true,
    });
    expect(result.claim).toBe(16_000);
    expect(result.deductible).toBe(34_000);
  });

  it("blocks fourth-generation general non-covered claims until 3-major items are excluded", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G4-04")!, {
      eligibleExpense: 100_000,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      priorPaidBenefit: 0,
      priorAnnualCount: 0,
      contractBenefitCap: 50_000_000,
      perOccurrenceBenefitCap: 200_000,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
      sameDayAggregationConfirmed: true,
      claimCause: "INJURY",
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
    expect(result.warnings.join(" ")).toContain("3대 비급여");
  });

  it("caps annual benefits using the previously paid amount", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G4-07")!, {
      eligibleExpense: 100_000,
      priorPaidBenefit: 2_950_000,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      otherIndemnityPoliciesExist: false,
      coveragePeriodConfirmed: true,
      aggregationUnit: "DIAGNOSTIC_ACTION",
    });
    expect(result.claim).toBe(50_000);
  });

  it("does not expose the premium tier as an insurance claim", () => {
    const result = evaluateSamsungExecutionSpec(rules.get("G5-09")!, {
      benefitAmountForTier: 1_200_000,
    });
    expect(result.status).toBe("CONFIRMATION_REQUIRED");
    expect(result.claim).toBeNull();
  });
});
