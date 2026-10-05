import { gen23CareSettingError } from "../domain/samsungGen23CareSetting";
import { GEN23_UNREGISTERED_REASON, type SamsungGen23Variant } from "../domain/samsungGen23Variant";
import { gen23TermsReference } from "./samsungGen23Sources";
import type { MedicalUsage } from "../domain/medical";
import { resolveSamsungGen23Product } from "./loadProductRuleSet";
import { evaluateSamsungExecutionSpec, type SamsungDraftCalculationInput, type SamsungDraftCalculationResult, type SamsungExecutionRule } from "./evaluateSamsungExecutionSpec";

export type Gen23Variant = SamsungGen23Variant;
export type Gen23Outcome = (SamsungDraftCalculationResult & { evidenceIds: string[]; termsReference: string; resultLabel: "SAMPLE_SIMULATION" })
  | { status: "CONFIRMATION_REQUIRED" | "RULE_NOT_VERIFIED"; claim: null; reason: string };
export interface Gen23Spec { calculationEnabled: boolean; rules: SamsungExecutionRule[] }
export function gen23Input(usage: MedicalUsage, variant: Gen23Variant, generation: 2 | 3): SamsungDraftCalculationInput {
  const u = usage;
  const covered = u.gen23CoveredCopay;
  const nonCovered = u.gen23NonCoveredExpense;
  const category = u.gen23TreatmentType;
  const enrollment = u.gen23RiderEnrollmentStatus;
  return {
    coveredCopay: covered, nonCoveredExpense: nonCovered,
    eligibleExpense: generation === 3 && category !== "BASE" ? u.gen23EligibleExpense
      : covered !== undefined && nonCovered !== undefined ? covered + nonCovered : undefined,
    inpatientExcludingRoomDifference: u.gen23InpatientExcludingRoomDifference,
    roomDifference: u.gen23RoomDifference, inpatientDays: u.gen23InpatientDays,
    nonNhiInpatientTotal: u.gen23NonNhiInpatientTotal,
    nhiApplied: u.nationalHealthInsuranceStatus === "APPLIED" ? true : u.nationalHealthInsuranceStatus === "NOT_APPLIED" ? false : undefined,
    institution: u.gen23Institution,
    priorEligibleDeductible: u.gen23PriorEligibleDeductible, priorPaidBenefit: u.gen23PriorPaidBenefit,
    priorAnnualCount: u.gen23PriorAnnualCount, priorContinuationCount: u.gen23PriorContinuationCount,
    contractBenefitCap: u.gen23ContractBenefitCap, outpatientBenefitCap: u.gen23OutpatientBenefitCap,
    prescriptionBenefitCap: u.gen23PrescriptionBenefitCap,
    otherIndemnityPoliciesExist: u.gen23OtherIndemnityPoliciesExist, proportionalPaymentFactor: u.gen23ProportionalPaymentFactor,
    coveragePeriod: u.gen23CoveragePeriod, coveragePeriodConfirmed: u.gen23CoveragePeriodConfirmed,
    postTerminationContinuationConfirmed: u.gen23PostTerminationContinuationConfirmed,
    daysSinceTermination: u.gen23DaysSinceTermination, sameDayAggregationConfirmed: u.gen23SameDayAggregationConfirmed,
    requiredCoverageConfirmed: u.gen23RequiredCoverageConfirmed, policyExclusionsCleared: u.gen23PolicyExclusionsCleared,
    benefitLimitRestored: u.gen23BenefitLimitRestored,
    threeNonCoveredCategory: category === "BASE" || category === "UNKNOWN" ? undefined : category,
    aggregationUnit: u.gen23AggregationUnit,
    threeNonCoveredExcludedFromBaseConfirmed: u.gen23ThreeNonCoveredExcludedFromBaseConfirmed,
    injectionRiderEligibleConfirmed: u.gen23InjectionRiderEligibleConfirmed,
    ...(generation === 3 ? { coverageStates: {
      [variant === "selected2" ? "VARIANT_SELECTED2" : "VARIANT_STANDARD"]: u.gen23RequiredCoverageConfirmed === true ? "CONFIRMED" : "UNKNOWN",
      [category ?? "BASE"]: enrollment === "ENROLLED" ? "CONFIRMED" : enrollment ?? "UNKNOWN",
    } } : {}),
  };
}
export function calculateGen23Sample(generation: 2 | 3, variant: Gen23Variant, usage: MedicalUsage, specs: Record<"standard" | "selected2", Gen23Spec>, mode: "SAMPLE_SIMULATION" | "ACTUAL_CONTRACT" = "SAMPLE_SIMULATION"): Gen23Outcome {
  const hold = (reason: string): Gen23Outcome => ({ status: "CONFIRMATION_REQUIRED", claim: null, reason });
  if (variant === "standard2013" || variant === "selected2013" || variant === "unified2009") return { status: "RULE_NOT_VERIFIED", claim: null, reason: GEN23_UNREGISTERED_REASON };
  if (variant !== "standard" && variant !== "selected2") return hold("상품 종형을 확인해주세요.");
  const product = resolveSamsungGen23Product({ generation, variant });
  const spec = specs[product.variant];
  if (mode === "ACTUAL_CONTRACT" && !spec.calculationEnabled) return { status: "RULE_NOT_VERIFIED", claim: null, reason: "운영 계산은 비활성화되어 있습니다. 입력한 조건의 초안 검산만 제공합니다." };
  const careError = gen23CareSettingError(usage);
  if (careError) return hold(careError);
  const care = usage.gen23CareSetting;
  if (!care) return hold("입원·외래·처방 계산 구분을 확인해주세요.");
  if (usage.claimCause !== "INJURY" && usage.claimCause !== "DISEASE") return hold("질병·상해를 확인해주세요.");
  if (usage.nationalHealthInsuranceStatus === "PARTIAL") return hold("건강보험 일부 적용 의료비를 구분해주세요.");
  let ruleId: string;
  const suffix = care === "INPATIENT" ? "01" : care === "OUTPATIENT" ? "02" : "03";
  if (generation === 2) ruleId = `G2-${variant === "standard" ? "STD" : "SEL2"}-${suffix}`;
  else {
    const type = usage.gen23TreatmentType;
    if (!type || type === "UNKNOWN") return hold("기본형 또는 해당 비급여 특약의 치료 분류를 확인해주세요.");
    if (type === "BASE") ruleId = variant === "standard" ? `G3-STD-BASE-${suffix}` : care === "INPATIENT" ? "G3-SEL2-01" : `G3-SEL2-BASE-${suffix}`;
    else {
      if (care === "PRESCRIPTION") return hold("3대 비급여 특약은 입원·통원 치료 단위를 확인해주세요.");
      if (usage.benefitClass !== "NON_COVERED") return hold("특약 대상 비급여 의료비인지 확인해주세요.");
      ruleId = variant === "selected2" ? "G3-SEL2-02" : type === "MANUAL_THERAPY" ? "G3-STD-01" : type === "INJECTION" ? "G3-STD-02" : "G3-STD-03";
    }
  }
  const rule = spec.rules.find(r => r.ruleId === ruleId);
  if (!rule) return { status: "RULE_NOT_VERIFIED", claim: null, reason: `${ruleId} 실행 명세를 찾을 수 없습니다.` };
  // STD-04는 외래 공제 조회 보조 규칙이며 별도의 지급액으로 합산하지 않는다.
  return { ...evaluateSamsungExecutionSpec(rule, gen23Input(usage, variant, generation)), evidenceIds: [`${product.productCode}_E_${ruleId}`], termsReference: gen23TermsReference(generation, variant, usage), resultLabel: "SAMPLE_SIMULATION" };
}
