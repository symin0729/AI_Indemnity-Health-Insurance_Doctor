import gen4Spec from "../../knowledge/drafts/samsung/executable-specs/SAMSUNG_2107_1.execution-spec.draft.json";
import {
  evaluateSamsungExecutionSpec,
  type SamsungDraftCalculationInput,
  type SamsungDraftCalculationResult,
  type SamsungExecutionRule,
} from "./evaluateSamsungExecutionSpec";

export type SamsungGen4EnrollmentStatus = "ENROLLED" | "NOT_ENROLLED" | "UNKNOWN";
export type SamsungGen4ClaimCause = "INJURY" | "DISEASE";
export type SamsungGen4TreatmentType = "GENERAL" | "MANUAL_THERAPY" | "INJECTION" | "MRI_MRA";

export interface SamsungGen4ClaimSelection {
  baseCoveredConfirmed: boolean;
  nonCoveredRider: SamsungGen4EnrollmentStatus;
  benefitClass: "COVERED" | "NON_COVERED";
  careSetting: "INPATIENT" | "OUTPATIENT";
  claimCause: SamsungGen4ClaimCause;
  treatmentType: SamsungGen4TreatmentType;
}

export interface SamsungGen4PremiumAdjustmentInput {
  priorNonCoveredBenefit: { status: "NONE" } | { status: "AMOUNT"; amount: number } | { status: "UNKNOWN" };
  adjustmentExclusion: "APPLIES" | "DOES_NOT_APPLY" | "UNKNOWN";
}

export type SamsungGen4RoutingDecision =
  | { status: "ROUTED"; ruleId: string }
  | { status: "CONFIRMATION_REQUIRED"; reason: string; requiredAction: string }
  | { status: "NOT_COVERED"; reason: string };

const rules = gen4Spec.rules as SamsungExecutionRule[];

export function routeSamsungGen4Rule(selection: SamsungGen4ClaimSelection): SamsungGen4RoutingDecision {
  if (!selection.baseCoveredConfirmed) {
    return { status: "CONFIRMATION_REQUIRED", reason: "급여 주계약 확인이 필요합니다.", requiredAction: "보험증권에서 급여 주계약을 확인해주세요." };
  }
  if (selection.benefitClass === "COVERED") {
    const ruleId = selection.careSetting === "INPATIENT"
      ? (selection.claimCause === "INJURY" ? "G4-01" : "G4-02")
      : (selection.claimCause === "INJURY" ? "G4-08" : "G4-09");
    return { status: "ROUTED", ruleId };
  }
  if (selection.nonCoveredRider === "UNKNOWN") {
    return { status: "CONFIRMATION_REQUIRED", reason: "비급여 특약 가입 여부가 불명확합니다.", requiredAction: "계산을 중단하고 보험증권에서 비급여 특약 가입 여부를 확인해주세요." };
  }
  if (selection.nonCoveredRider === "NOT_ENROLLED") {
    return { status: "NOT_COVERED", reason: "비급여 특약 미가입으로 비급여 보장이 없습니다." };
  }
  if (selection.treatmentType === "MANUAL_THERAPY") return { status: "ROUTED", ruleId: "G4-05" };
  if (selection.treatmentType === "INJECTION") return { status: "ROUTED", ruleId: "G4-06" };
  if (selection.treatmentType === "MRI_MRA") return { status: "ROUTED", ruleId: "G4-07" };
  return { status: "ROUTED", ruleId: selection.careSetting === "INPATIENT" ? "G4-03" : "G4-04" };
}

export function calculateSamsungGen4Claim(
  selection: SamsungGen4ClaimSelection,
  input: SamsungDraftCalculationInput,
): SamsungGen4RoutingDecision | { status: "CALCULATED"; ruleId: string; result: SamsungDraftCalculationResult } {
  const routing = routeSamsungGen4Rule(selection);
  if (routing.status !== "ROUTED") return routing;
  const rule = rules.find((item) => item.ruleId === routing.ruleId);
  if (!rule) throw new Error(`4세대 계산 규칙을 찾을 수 없습니다: ${routing.ruleId}`);
  return {
    status: "CALCULATED",
    ruleId: routing.ruleId,
    result: evaluateSamsungExecutionSpec(structuredClone(rule), {
      ...input,
      claimCause: selection.claimCause,
      requiredCoverageConfirmed: selection.benefitClass === "NON_COVERED" ? true : input.requiredCoverageConfirmed,
    }),
  };
}

// 보험료 할인·할증 입력은 보험금 계산 함수에 전달하지 않는다.
export function validateSamsungGen4PremiumAdjustmentInput(input: SamsungGen4PremiumAdjustmentInput): string[] {
  const missing: string[] = [];
  if (input.priorNonCoveredBenefit.status === "UNKNOWN") missing.push("직전 기준기간 비급여 보험금 수령액");
  if (input.adjustmentExclusion === "UNKNOWN") missing.push("할인·할증 제외 대상 여부");
  return missing;
}
