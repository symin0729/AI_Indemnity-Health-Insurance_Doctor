import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const draftDir = path.join(root, "knowledge/drafts/samsung");
const outputDir = path.join(draftDir, "executable-specs");
const evidenceMap = JSON.parse(await readFile(path.join(root, "knowledge/rule-evidence-map.json"), "utf8"));
const sourceAndEngineValidatedProducts = new Set(["SAMSUNG_0904_2", "SAMSUNG_1611_7", "SAMSUNG_1704_1", "SAMSUNG_2107_1"]);
await mkdir(outputDir, { recursive: true });

const institutionMinimums = { CLINIC: 10000, HOSPITAL: 15000, GENERAL_TERTIARY: 20000 };

const component = (basis, benefitRate, extra = {}) => ({ basis, benefitRate, ...extra });
const rate = (benefitRate, basis = "ELIGIBLE_EXPENSE") => ({ type: "RATE_BENEFIT", components: [component(basis, benefitRate)] });
const maxDeductible = (deductibleRate, minimumAmount) => ({
  type: "EXPENSE_MINUS_MAX_DEDUCTIBLE",
  deductibleRate,
  minimumAmount,
});

function calculation(ruleId) {
  if (["G1-01", "G1-05"].includes(ruleId)) return {
    type: "COMPONENT_SUM",
    components: [component("COVERED_ROOM_AND_TREATMENT", 1), component("ROOM_DIFFERENCE", 0.5, { roomBasis: "TWO_PERSON_ROOM_FOR_PRIVATE_ROOM" })],
    nonNhiFallback: { type: "RATE_BENEFIT", benefitRate: 0.4 },
  };
  if (ruleId === "G1-02") return rate(0.4, "NON_NHI_INPATIENT_TOTAL");
  if (ruleId === "G1-03") return { type: "RATE_BENEFIT", components: [component("ROOM_DIFFERENCE", 0.5)] };
  if (ruleId === "G1-04") return {
    type: "FIXED_DEDUCTIBLE_THEN_RATE_WITH_CAP", minimumAmount: 5000, benefitRate: 1, perOccurrenceBenefitCap: 100000,
    nonNhiFallback: { benefitRate: 0.4, deductionOrder: "DEDUCT_THEN_RATE" },
  };

  if (["G2-STD-01", "G3-STD-BASE-01"].includes(ruleId)) return {
    type: "COMPONENT_SUM",
    components: [component("INPATIENT_EXCLUDING_ROOM_DIFFERENCE", 0.8), component("ROOM_DIFFERENCE", 0.5, { dailyBenefitCap: 100000 })],
    annualDeductibleCap: 2000000,
    nonNhiFallback: { type: "RATE_BENEFIT", benefitRate: 0.4 },
  };
  if (["G2-STD-02", "G3-STD-BASE-02"].includes(ruleId)) return { ...maxDeductible(0.2, null), minimumByInstitution: institutionMinimums };
  if (["G2-STD-03", "G3-STD-BASE-03"].includes(ruleId)) return maxDeductible(0.2, 8000);
  if (ruleId === "G2-STD-04") return { type: "INSTITUTION_MINIMUM_LOOKUP", minimumByInstitution: institutionMinimums, combinedWithRuleId: "G2-STD-02" };

  if (["G2-SEL2-01", "G3-SEL2-01"].includes(ruleId)) return {
    type: "COMPONENT_SUM",
    components: [component("COVERED_COPAY", 0.9), component("NON_COVERED_EXPENSE", 0.8), component("ROOM_DIFFERENCE", 0.5, { dailyBenefitCap: 100000 })],
    annualDeductibleCap: 2000000,
    nonNhiFallback: { type: "RATE_BENEFIT", benefitRate: 0.4 },
  };
  if (["G2-SEL2-02", "G3-SEL2-BASE-02"].includes(ruleId)) return {
    type: "EXPENSE_MINUS_MAX_WEIGHTED_DEDUCTIBLE",
    deductibleComponents: [{ basis: "COVERED_COPAY", rate: 0.1 }, { basis: "NON_COVERED_EXPENSE", rate: 0.2 }],
    minimumByInstitution: institutionMinimums,
  };
  if (["G2-SEL2-03", "G3-SEL2-BASE-03"].includes(ruleId)) return {
    type: "EXPENSE_MINUS_MAX_WEIGHTED_DEDUCTIBLE",
    deductibleComponents: [{ basis: "COVERED_COPAY", rate: 0.1 }, { basis: "NON_COVERED_EXPENSE", rate: 0.2 }],
    minimumAmount: 8000,
  };
  if (/^G3-(STD-0[1-3]|SEL2-02)$/.test(ruleId)) return maxDeductible(0.3, 20000);

  if (["G4-01", "G4-02"].includes(ruleId)) return {
    ...rate(0.8),
    nonNhiFallback: { benefitRate: 0.4 },
  };
  if (["G4-08", "G4-09"].includes(ruleId)) return {
    ...maxDeductible(0.2, null),
    minimumByInstitution: { CLINIC_HOSPITAL: 10000, GENERAL_TERTIARY: 20000 },
  };
  if (ruleId === "G5-01") return rate(0.8);
  if (ruleId === "G4-03") return {
    type: "COMPONENT_SUM",
    components: [component("NON_COVERED_INPATIENT_EXCLUDING_ROOM", 0.7), component("ROOM_DIFFERENCE", 0.5, { dailyBenefitCap: 100000 })],
  };
  if (/^G4-0[4-7]$/.test(ruleId)) return maxDeductible(0.3, 30000);

  if (ruleId === "G5-02") return {
    type: "COVERED_OUTPATIENT_MAX_DEDUCTIBLE",
    deductibleCandidates: ["ELIGIBLE_EXPENSE_X_20_PERCENT", "ELIGIBLE_EXPENSE_X_NHI_COPAY_RATE", "INSTITUTION_MINIMUM"],
    minimumByInstitution: { CLINIC_HOSPITAL: 10000, GENERAL_TERTIARY: 20000 },
  };
  if (ruleId === "G5-03") return {
    type: "COMPONENT_SUM",
    components: [component("SEVERE_NON_COVERED_INPATIENT_EXCLUDING_ROOM", 0.7), component("ROOM_DIFFERENCE", 0.5, { dailyBenefitCap: 100000 })],
    deductibleCap: { amount: 5000000, condition: "GENERAL_OR_TERTIARY_HOSPITAL_EXCLUDING_SPECIFIED_THREE" },
  };
  if (["G5-04", "G5-05"].includes(ruleId)) return maxDeductible(0.3, 30000);
  if (ruleId === "G5-06") return {
    type: "COMPONENT_SUM",
    components: [component("NON_SEVERE_NON_COVERED_INPATIENT_EXCLUDING_ROOM", 0.5), component("ROOM_DIFFERENCE", 0.5, { dailyBenefitCap: 100000 })],
  };
  if (["G5-07", "G5-08"].includes(ruleId)) return maxDeductible(0.5, 50000);
  if (ruleId === "G5-09") return {
    type: "TIER_LOOKUP",
    assessmentWindow: "THREE_MONTHS_BEFORE_RENEWAL_MONTH_END_TO_PRIOR_TWELVE_MONTHS",
    tiers: [
      { minInclusive: 0, maxExclusive: 1, relativeRate: "DISCOUNT" },
      { minInclusive: 1, maxExclusive: 1000000, relativeRate: 1 },
      { minInclusive: 1000000, maxExclusive: 1500000, relativeRate: 2 },
      { minInclusive: 1500000, maxExclusive: 3000000, relativeRate: 3 },
      { minInclusive: 3000000, maxExclusive: null, relativeRate: 4 },
    ],
    effectiveFrom: "2028-05-06",
  };
  throw new Error(`No executable calculation mapping: ${ruleId}`);
}

function careSetting(coverage) {
  if (/(통원|외래|처방)/.test(coverage)) return "OUTPATIENT";
  if (/입원/.test(coverage)) return "INPATIENT";
  return "ANY";
}

function benefitClass(coverage) {
  if (/비급여/.test(coverage)) return "NON_COVERED";
  if (/급여/.test(coverage)) return "COVERED";
  return "MIXED_OR_UNSPECIFIED";
}

function severityClass(coverage) {
  if (/비중증/.test(coverage)) return "NON_SEVERE";
  if (/중증/.test(coverage)) return "SEVERE";
  return "ANY";
}

function requiredCoverages(generation, coverage, variant) {
  const values = [];
  if (generation === 1) values.push(coverage.includes("질병") ? "DISEASE_D1_RIDER" : "INJURY_D1_RIDER");
  if ([2, 3].includes(generation)) values.push(variant === "selected2" ? "VARIANT_SELECTED2" : "VARIANT_STANDARD");
  if (generation === 3 && /3대 비급여/.test(coverage)) values.push("THREE_NON_COVERED_RIDERS");
  if (generation === 4 && /비급여/.test(coverage)) values.push(/3대/.test(coverage) ? "THREE_NON_COVERED_RIDERS" : "NON_COVERED_RIDER");
  if (generation === 5 && /중증 비급여/.test(coverage)) values.push("SPECIAL_RIDER_1");
  if (generation === 5 && /비중증 비급여/.test(coverage)) values.push("SPECIAL_RIDER_2");
  return values;
}

function specialConditions(generation, ruleId) {
  const common = ["POLICY_EXCLUSIONS_MUST_BE_CLEARED", "MULTIPLE_POLICY_PROPORTIONAL_PAYMENT_REQUIRED_IF_APPLICABLE"];
  if (generation === 1) return [...common, "ACCIDENT_OR_DISEASE_365_DAY_WINDOW", "NON_NHI_FALLBACK_40_PERCENT"];
  if ([2, 3].includes(generation)) return [...common, "ANNUAL_DEDUCTIBLE_CAP_2000000_FOR_INPATIENT", "NON_NHI_FALLBACK_40_PERCENT"];
  if (generation === 4) return [...common, "POLICY_YEAR_AMOUNT_AND_COUNT_ACCUMULATION", "NON_NHI_FALLBACK_40_PERCENT_FOR_COVERED_BENEFITS", ...(ruleId === "G4-05" ? ["AFTER_FIRST_10_TREATMENTS_IMPROVEMENT_EVIDENCE_REQUIRED"] : [])];
  return [...common, "POLICY_YEAR_AMOUNT_AND_COUNT_ACCUMULATION", ...(ruleId === "G5-05" ? ["AFTER_FIRST_10_TREATMENTS_IMPROVEMENT_EVIDENCE_REQUIRED"] : [])];
}

function enforcement(ruleId) {
  if (["G1-01", "G1-02"].includes(ruleId)) return { windowDays: 365, benefitCap: 50000000 };
  if (ruleId === "G1-04") return { windowDays: 365, maxServiceDays: 30, countUnit: "SERVICE_DAY" };
  if (ruleId === "G1-05") return { windowDays: 365, resetAfterGapDays: 180, benefitCap: 50000000 };
  if (["G2-STD-01", "G2-SEL2-01", "G3-STD-BASE-01", "G3-SEL2-01"].includes(ruleId)) {
    return { annualDeductibleCap: 2000000, benefitCap: 50000000 };
  }
  if (["G2-STD-02", "G2-SEL2-02"].includes(ruleId)) return { maxAnnualCount: 180, countUnit: "VISIT", requiresPerOccurrenceBenefitCap: true };
  if (["G2-STD-03", "G2-SEL2-03"].includes(ruleId)) return { maxAnnualCount: 180, countUnit: "PRESCRIPTION", requiresPerOccurrenceBenefitCap: true };
  if (["G3-STD-BASE-02", "G3-SEL2-BASE-02"].includes(ruleId)) return { maxAnnualCount: 180, countUnit: "VISIT", requiresPerOccurrenceBenefitCap: true };
  if (["G3-STD-BASE-03", "G3-SEL2-BASE-03"].includes(ruleId)) return { maxAnnualCount: 180, countUnit: "PRESCRIPTION", requiresPerOccurrenceBenefitCap: true };
  if (ruleId === "G3-STD-01") return { annualBenefitCap: 3500000, maxAnnualCount: 50, countUnit: "TREATMENT" };
  if (ruleId === "G4-05") return { annualBenefitCap: 3500000, maxAnnualCount: 50, countUnit: "TREATMENT", improvementEvidenceAfterCount: 10 };
  if (["G3-STD-02", "G4-06"].includes(ruleId)) return { annualBenefitCap: 2500000, maxAnnualCount: 50, countUnit: "TREATMENT" };
  if (ruleId === "G3-STD-03") return { annualBenefitCap: 3000000, countUnit: "DIAGNOSTIC_ACTION", aggregationUnitMustBeProvided: true };
  if (ruleId === "G3-SEL2-02") return {
    categoryLimits: {
      MANUAL_THERAPY: { annualBenefitCap: 3500000, maxAnnualCount: 50, countUnit: "TREATMENT" },
      INJECTION: { annualBenefitCap: 2500000, maxAnnualCount: 50, countUnit: "TREATMENT" },
      MRI: { annualBenefitCap: 3000000, countUnit: "DIAGNOSTIC_ACTION", aggregationUnitMustBeProvided: true },
    },
  };
  if (ruleId === "G4-07") return { annualBenefitCap: 3000000, countUnit: "DIAGNOSTIC_ACTION", aggregationUnitMustBeProvided: true };
  if (["G4-01", "G4-02"].includes(ruleId)) return { annualBenefitCap: 50000000, requiresContractBenefitCap: true };
  if (["G4-08", "G4-09"].includes(ruleId)) return {
    annualBenefitCap: 50000000,
    requiresContractBenefitCap: true,
    requiresPerOccurrenceBenefitCap: true,
    maxPerOccurrenceBenefitCap: 200000,
  };
  if (ruleId === "G4-03") return { annualBenefitCap: 50000000, requiresContractBenefitCap: true };
  if (ruleId === "G4-04") return {
    annualBenefitCap: 50000000,
    requiresContractBenefitCap: true,
    maxAnnualCount: 100,
    countUnit: "VISIT",
    requiresPerOccurrenceBenefitCap: true,
    maxPerOccurrenceBenefitCap: 200000,
  };
  if (ruleId === "G5-04") return { maxAnnualCount: 100, countUnit: "VISIT", separateBy: "INJURY_OR_DISEASE" };
  if (ruleId === "G5-03") return { annualDeductibleCap: 5000000, appliesWhen: "GENERAL_OR_TERTIARY_HOSPITAL_EXCLUDING_SPECIFIED_THREE" };
  if (ruleId === "G5-05") return { aggregationUnitMustBeProvided: true, improvementEvidenceAfterCount: 10 };
  if (ruleId === "G5-07") return { maxAnnualCount: 100, countUnit: "SERVICE_DAY", separateBy: "INJURY_OR_DISEASE" };
  if (ruleId === "G5-08") return { annualBenefitCap: 2000000, countUnit: "DIAGNOSTIC_ACTION" };
  return null;
}

const draftFiles = (await readdir(draftDir)).filter((name) => name.endsWith(".rules.draft.json")).sort();
let totalRules = 0;
for (const file of draftFiles) {
  const draft = JSON.parse(await readFile(path.join(draftDir, file), "utf8"));
  const rules = draft.rules.map((rule) => {
    const evidence = evidenceMap.mappings.find((item) => item.ruleId === rule.id && item.productCode === draft.productCode);
    if (!evidence) throw new Error(`Missing evidence: ${draft.productCode}/${rule.id}`);
    return {
      ruleId: rule.id,
      productCode: draft.productCode,
      generation: draft.generation,
      variant: draft.variant,
      coverage: rule.coverage,
      careSetting: careSetting(rule.coverage),
      benefitClass: benefitClass(rule.coverage),
      severityClass: severityClass(rule.coverage),
      requiredCoverages: requiredCoverages(draft.generation, rule.coverage, draft.variant),
      calculation: calculation(rule.id),
      limitText: rule.limit,
      requiresAccumulator: /(연|365일|180회|100회|100일|50회|30일)/.test(rule.limit),
      enforcement: enforcement(rule.id),
      specialConditions: specialConditions(draft.generation, rule.id),
      evidenceIds: rule.evidenceIds,
      source: { documentId: evidence.documentId, article: evidence.article, paragraph: evidence.paragraph, pdfPage: evidence.pdfPage, printedPage: evidence.printedPage },
      verificationStatus: sourceAndEngineValidatedProducts.has(draft.productCode)
        ? "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING"
        : "PENDING_AI_SOURCE_VALIDATION",
    };
  });
  totalRules += rules.length;
  const outputName = file.replace(".rules.draft.json", ".execution-spec.draft.json");
  await writeFile(path.join(outputDir, outputName), `${JSON.stringify({
    schemaVersion: "1.0",
    specId: `${draft.ruleSetId}_EXECUTION_SPEC`,
    productCode: draft.productCode,
    generation: draft.generation,
    variant: draft.variant,
    status: sourceAndEngineValidatedProducts.has(draft.productCode)
      ? "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING"
      : "PENDING_AI_SOURCE_VALIDATION",
    calculationEnabled: false,
    rules,
  }, null, 2)}\n`);
}

console.log(JSON.stringify({ files: draftFiles.length, rules: totalRules, outputDir }, null, 2));
