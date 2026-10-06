import type { MedicalUsage } from "../domain/medical";
import type { AnalysisCalculationAssumptions } from "../store/useAnalysisStore";

export function prepareUsageForSamsungComparison(
  usage: MedicalUsage,
  assumptions: AnalysisCalculationAssumptions,
): MedicalUsage {
  const source = usage.samsungCalculationInput ?? {};
  const eligibleExpense =
    source.eligibleExpense ??
    usage.coveredAmount ??
    (assumptions.assumeEntireMedicalCostCovered
      ? usage.patientPaidAmount ?? usage.unitCost
      : undefined);
  const policyExclusionsCleared =
    source.policyExclusionsCleared ?? usage.gen23PolicyExclusionsCleared;
  const category = usage.treatmentCategory?.toUpperCase();
  const threeNonCoveredCategory =
    category === "MRI" || category === "MANUAL_THERAPY" || category === "INJECTION"
      ? category
      : undefined;
  const aggregationUnit =
    source.aggregationUnit ??
    usage.gen23AggregationUnit ??
    (category === "MRI"
      ? "DIAGNOSTIC_ACTION"
      : category === "MANUAL_THERAPY"
        ? "TREATMENT"
        : category === "INJECTION"
          ? "VISIT"
          : "VISIT");

  return {
    ...usage,
    samsungCalculationInput: {
      ...source,
      eligibleExpense,
      ...(usage.careSetting === 'INPATIENT' && usage.benefitClass === 'NON_COVERED' && source.roomDifference !== undefined && eligibleExpense !== undefined && source.roomDifference <= eligibleExpense ? {
        nonCoveredInpatientExcludingRoom: source.nonCoveredInpatientExcludingRoom ?? eligibleExpense - source.roomDifference,
        severeNonCoveredInpatientExcludingRoom: source.severeNonCoveredInpatientExcludingRoom ?? eligibleExpense - source.roomDifference,
        nonSevereNonCoveredInpatientExcludingRoom: source.nonSevereNonCoveredInpatientExcludingRoom ?? eligibleExpense - source.roomDifference,
      } : {}),
      requiredCoverageConfirmed:
        source.requiredCoverageConfirmed ?? usage.gen23RequiredCoverageConfirmed,
      policyExclusionsCleared,
      otherIndemnityPoliciesExist:
        source.otherIndemnityPoliciesExist ?? usage.gen23OtherIndemnityPoliciesExist,
      sameDayAggregationConfirmed:
        source.sameDayAggregationConfirmed ?? usage.gen23SameDayAggregationConfirmed,
      priorPaidBenefit: source.priorPaidBenefit ?? usage.gen23PriorPaidBenefit,
      priorAnnualCount: source.priorAnnualCount ?? usage.gen23PriorAnnualCount,
      priorEligibleDeductible:
        source.priorEligibleDeductible ?? usage.gen23PriorEligibleDeductible,
      contractBenefitCap: source.contractBenefitCap ?? usage.gen23ContractBenefitCap,
      outpatientBenefitCap: source.outpatientBenefitCap ?? usage.gen23OutpatientBenefitCap,
      prescriptionBenefitCap:
        source.prescriptionBenefitCap ?? usage.gen23PrescriptionBenefitCap,
      aggregationUnit,
      threeNonCoveredCategory:
        source.threeNonCoveredCategory ?? threeNonCoveredCategory,
      threeNonCoveredExcludedFromBaseConfirmed:
        source.threeNonCoveredExcludedFromBaseConfirmed ??
        usage.gen23ThreeNonCoveredExcludedFromBaseConfirmed,
    },
    samsungGen5Facts:
      usage.samsungGen5Facts ??
      (usage.benefitClass === "NON_COVERED"
        ? {
            specialCaseDisease:
              usage.severityClass === "SEVERE" ? "YES" : usage.severityClass === "NON_SEVERE" ? "NO" : "UNKNOWN",
            treatmentRelatedness: usage.severityClass === "SEVERE" ? "RELATED" : "UNKNOWN",
            policyExcludedTreatment: policyExclusionsCleared === true ? "NO" : "UNKNOWN",
            ...(threeNonCoveredCategory ? { threeNonCoveredCategory } : {}),
          }
        : usage.samsungGen5Facts),
  };
}
