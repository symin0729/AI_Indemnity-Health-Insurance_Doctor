import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateSamsungExecutionSpec,
  type SamsungExecutionRule,
} from "../src/engine/evaluateSamsungExecutionSpec";

type Inputs = Record<string, number | boolean | string>;

type HandCase = {
  caseId: string;
  ruleId: string;
  inputs: Inputs;
  expectedDeductible?: number;
  expectedClaim: number;
};

type HandFixture = {
  productCode: string;
  calculationEnabled: boolean;
  cases: HandCase[];
};

const draftDir = path.resolve("knowledge/drafts/samsung");
const fixtureFiles = fs
  .readdirSync(draftDir)
  .filter((name) => name.endsWith(".hand-calculation.draft.json"))
  .sort();

const fixtures = fixtureFiles.map((name) =>
  JSON.parse(fs.readFileSync(path.join(draftDir, name), "utf8")) as HandFixture,
);
const specDir = path.join(draftDir, "executable-specs");
const rules = new Map(
  fs.readdirSync(specDir)
    .filter((name) => name.endsWith(".execution-spec.draft.json"))
    .flatMap((name) => {
      const spec = JSON.parse(fs.readFileSync(path.join(specDir, name), "utf8")) as {
        rules: SamsungExecutionRule[];
      };
      return spec.rules.map((rule) => [rule.ruleId, rule] as const);
    }),
);

describe("Samsung draft hand-calculation fixtures", () => {
  it("keeps all five product fixtures blocked from production calculation", () => {
    expect(new Set(fixtures.map((fixture) => fixture.productCode)).size).toBe(5);
    expect(fixtures.every((fixture) => fixture.calculationEnabled === false)).toBe(true);
  });

  it.each(fixtures.flatMap((fixture) => fixture.cases.map((item) => [fixture.productCode, item] as const)))(
    "%s / $caseId reproduces the draft hand calculation",
    (_productCode, item) => {
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
      const actual = evaluateSamsungExecutionSpec(rule!, inputs);
      expect(actual.status).toBe("DRAFT_CALCULATED");
      expect(actual.claim).toBe(item.expectedClaim);
      if (item.expectedDeductible !== undefined) {
        expect(actual.deductible).toBe(item.expectedDeductible);
      }
    },
  );
});
