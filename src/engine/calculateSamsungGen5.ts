import generalSpec from "../../knowledge/drafts/samsung/executable-specs/SAMSUNG_2605_1.general.execution-spec.draft.json";
import conversionSpec from "../../knowledge/drafts/samsung/executable-specs/SAMSUNG_2605_1.conversion.execution-spec.draft.json";
import {
  evaluateSamsungExecutionSpec,
  type SamsungDraftCalculationInput,
  type SamsungDraftCalculationResult,
  type SamsungExecutionRule,
} from "./evaluateSamsungExecutionSpec";

export type SamsungGen5ContractType = "GENERAL" | "CONVERSION";
export type SamsungGen5EnrollmentStatus = "ENROLLED" | "NOT_ENROLLED" | "UNKNOWN";
export type SamsungGen5ContractCombination = "A" | "B" | "C" | "D";
export type SamsungGen5FactStatus = "YES" | "NO" | "UNKNOWN";
export type SamsungGen5Coverage =
  | "COVERED_INPATIENT"
  | "COVERED_OUTPATIENT"
  | "SEVERE_NON_COVERED_INPATIENT"
  | "SEVERE_NON_COVERED_OUTPATIENT"
  | "SEVERE_THREE_NON_COVERED"
  | "NON_SEVERE_NON_COVERED_INPATIENT"
  | "NON_SEVERE_NON_COVERED_OUTPATIENT"
  | "NON_SEVERE_MRI_MRA"
  | "NON_SEVERE_PREMIUM_TIER";

export interface SamsungGen5CoverageEnrollment {
  baseCovered: SamsungGen5EnrollmentStatus;
  severeNonCoveredRider: SamsungGen5EnrollmentStatus;
  nonSevereNonCoveredRider: SamsungGen5EnrollmentStatus;
}

export interface SamsungGen5ObjectiveFacts {
  benefitClass: "COVERED" | "NON_COVERED";
  careSetting: "INPATIENT" | "OUTPATIENT";
  specialCaseDisease: SamsungGen5FactStatus;
  treatmentRelatedness: "RELATED" | "NOT_RELATED" | "UNKNOWN";
  policyExcludedTreatment: SamsungGen5FactStatus;
  threeNonCoveredCategory?: "MANUAL_THERAPY" | "INJECTION" | "MRI";
}

export type SamsungGen5UncertainMode = "HOLD" | "CONDITIONAL_SIMULATION";

export interface SamsungGen5ConditionalScenario {
  classification: "SEVERE" | "NON_SEVERE";
  coverage: SamsungGen5Coverage | null;
  covered: boolean | null;
  reason?: string;
}

export type SamsungGen5RoutingDecision =
  | { status: "ROUTED"; combination: SamsungGen5ContractCombination; classification: "COVERED" | "SEVERE" | "NON_SEVERE"; coverage: SamsungGen5Coverage }
  | { status: "CONFIRMATION_REQUIRED"; combination: SamsungGen5ContractCombination | null; reason: string; requiredQuestion: string }
  | { status: "NOT_COVERED"; combination: SamsungGen5ContractCombination; reason: string }
  | { status: "CONDITIONAL_SIMULATION"; combination: SamsungGen5ContractCombination; notice: string; scenarios: SamsungGen5ConditionalScenario[] };


const coverageNumber: Record<SamsungGen5Coverage, string> = {
  COVERED_INPATIENT: "01",
  COVERED_OUTPATIENT: "02",
  SEVERE_NON_COVERED_INPATIENT: "03",
  SEVERE_NON_COVERED_OUTPATIENT: "04",
  SEVERE_THREE_NON_COVERED: "05",
  NON_SEVERE_NON_COVERED_INPATIENT: "06",
  NON_SEVERE_NON_COVERED_OUTPATIENT: "07",
  NON_SEVERE_MRI_MRA: "08",
  NON_SEVERE_PREMIUM_TIER: "09",
};

const rulesByContract = {
  GENERAL: generalSpec.rules as SamsungExecutionRule[],
  CONVERSION: conversionSpec.rules as SamsungExecutionRule[],
};

const conditionalNotice = "현재 자료로 적용 유형을 확정할 수 없어 조건별 참고 결과를 보여드립니다. 실제 적용 유형과 지급액은 보험회사의 심사 결과에 따라 달라질 수 있습니다.";

export function resolveSamsungGen5ContractCombination(
  enrollment: SamsungGen5CoverageEnrollment,
): SamsungGen5ContractCombination | null {
  if (enrollment.baseCovered !== "ENROLLED") return null;
  if (enrollment.severeNonCoveredRider === "UNKNOWN" || enrollment.nonSevereNonCoveredRider === "UNKNOWN") return null;
  if (enrollment.severeNonCoveredRider === "NOT_ENROLLED" && enrollment.nonSevereNonCoveredRider === "NOT_ENROLLED") return "A";
  if (enrollment.severeNonCoveredRider === "ENROLLED" && enrollment.nonSevereNonCoveredRider === "NOT_ENROLLED") return "B";
  if (enrollment.severeNonCoveredRider === "NOT_ENROLLED" && enrollment.nonSevereNonCoveredRider === "ENROLLED") return "C";
  return "D";
}

function coverageForClassification(
  severe: boolean,
  facts: SamsungGen5ObjectiveFacts,
): SamsungGen5Coverage {
  if (severe && facts.threeNonCoveredCategory) return "SEVERE_THREE_NON_COVERED";
  if (!severe && facts.threeNonCoveredCategory === "MRI") return "NON_SEVERE_MRI_MRA";
  if (severe) return facts.careSetting === "INPATIENT" ? "SEVERE_NON_COVERED_INPATIENT" : "SEVERE_NON_COVERED_OUTPATIENT";
  return facts.careSetting === "INPATIENT" ? "NON_SEVERE_NON_COVERED_INPATIENT" : "NON_SEVERE_NON_COVERED_OUTPATIENT";
}

function classifiedScenario(
  severe: boolean,
  enrollment: SamsungGen5CoverageEnrollment,
  facts: SamsungGen5ObjectiveFacts,
): SamsungGen5ConditionalScenario {
  const classification = severe ? "SEVERE" : "NON_SEVERE";
  // 금융위원회 2026.5.4. 보도자료: 특약2는 근골격계 물리치료·체외충격파·비급여 주사제를 제외한다.
  // https://www.fsc.go.kr/po010101/86831
  if (!severe && (facts.threeNonCoveredCategory === "MANUAL_THERAPY" || facts.threeNonCoveredCategory === "INJECTION")) {
    return { classification, coverage: null, covered: false, reason: "비중증 도수·체외충격파·증식치료 및 비급여 주사제는 5세대 특약2 보장 대상에서 제외됩니다." };
  }
  const rider = severe ? enrollment.severeNonCoveredRider : enrollment.nonSevereNonCoveredRider;
  if (rider !== "ENROLLED") {
    return { classification, coverage: null, covered: rider === "UNKNOWN" ? null : false, reason: `${severe ? "특약1" : "특약2"} 가입 여부` };
  }
  if (!severe && facts.policyExcludedTreatment !== "NO") {
    return { classification, coverage: null, covered: facts.policyExcludedTreatment === "YES" ? false : null, reason: "약관상 보장 제외 여부" };
  }
  return { classification, coverage: coverageForClassification(severe, facts), covered: true };
}

export function routeSamsungGen5Coverage(
  enrollment: SamsungGen5CoverageEnrollment,
  facts: SamsungGen5ObjectiveFacts,
  uncertainMode: SamsungGen5UncertainMode = "HOLD",
): SamsungGen5RoutingDecision {
  if (enrollment.baseCovered !== "ENROLLED") {
    return { status: "CONFIRMATION_REQUIRED", combination: null, reason: "급여 기본계약 가입 확인이 필요합니다.", requiredQuestion: "급여 기본계약 가입이 확인되었나요?" };
  }
  const combination = resolveSamsungGen5ContractCombination(enrollment);
  if (!combination) {
    return { status: "CONFIRMATION_REQUIRED", combination: null, reason: "비급여 특약 가입 정보가 부족합니다.", requiredQuestion: "특약1과 특약2의 가입 여부를 각각 확인해주세요." };
  }
  if (facts.benefitClass === "COVERED") {
    return { status: "ROUTED", combination, classification: "COVERED", coverage: facts.careSetting === "INPATIENT" ? "COVERED_INPATIENT" : "COVERED_OUTPATIENT" };
  }
  let severe: boolean | null = null;
  if (facts.specialCaseDisease === "NO") severe = false;
  if (facts.specialCaseDisease === "YES" && facts.treatmentRelatedness === "RELATED") severe = true;
  if (facts.specialCaseDisease === "YES" && facts.treatmentRelatedness === "NOT_RELATED") severe = false;
  if (severe === null) {
    if (uncertainMode === "CONDITIONAL_SIMULATION") {
      return { status: "CONDITIONAL_SIMULATION", combination, notice: conditionalNotice, scenarios: [classifiedScenario(true, enrollment, facts), classifiedScenario(false, enrollment, facts)] };
    }
    return {
      status: "CONFIRMATION_REQUIRED",
      combination,
      reason: "중증·비중증 자동 분류에 필요한 객관정보가 부족합니다.",
      requiredQuestion: facts.specialCaseDisease === "UNKNOWN" ? "산정특례 적용을 받으셨나요?" : "이번 치료가 산정특례 질환의 치료 또는 관련 합병증으로 서류에 표시되어 있나요?",
    };
  }
  const scenario = classifiedScenario(severe, enrollment, facts);
  if (scenario.covered === null) {
    return { status: "CONFIRMATION_REQUIRED", combination, reason: scenario.reason ?? "추가 정보가 필요합니다.", requiredQuestion: severe ? "중증 비급여 특약1 가입 여부를 확인해주세요." : "약관상 보장 제외 항목인지 확인할 수 있는 진료비 세부내역이 필요합니다." };
  }
  if (!scenario.covered || !scenario.coverage) {
    return { status: "NOT_COVERED", combination, reason: scenario.reason ?? "가입 담보 또는 약관 조건상 보장되지 않습니다." };
  }
  return { status: "ROUTED", combination, classification: scenario.classification, coverage: scenario.coverage };
}

export function selectSamsungGen5Rule(
  contractType: SamsungGen5ContractType,
  coverage: SamsungGen5Coverage,
): SamsungExecutionRule {
  const prefix = contractType === "CONVERSION" ? "G5-CONV-" : "G5-";
  const ruleId = `${prefix}${coverageNumber[coverage]}`;
  const rule = rulesByContract[contractType].find((item) => item.ruleId === ruleId);
  if (!rule) throw new Error(`5세대 계산 규칙을 찾을 수 없습니다: ${contractType}/${coverage}`);
  return structuredClone(rule);
}

export function calculateSamsungGen5(
  contractType: SamsungGen5ContractType,
  coverage: SamsungGen5Coverage,
  input: Omit<SamsungDraftCalculationInput, "contractType">,
): SamsungDraftCalculationResult {
  return evaluateSamsungExecutionSpec(
    selectSamsungGen5Rule(contractType, coverage),
    { ...input, contractType },
  );
}

export type SamsungGen5LiveCalculation =
  | { status: "CALCULATED"; combination: SamsungGen5ContractCombination; classification: "COVERED" | "SEVERE" | "NON_SEVERE"; coverage: SamsungGen5Coverage; result: SamsungDraftCalculationResult }
  | { status: "CONFIRMATION_REQUIRED"; combination: SamsungGen5ContractCombination | null; reason: string; requiredQuestion: string }
  | { status: "NOT_COVERED"; combination: SamsungGen5ContractCombination; reason: string }
  | { status: "CONDITIONAL_SIMULATION"; combination: SamsungGen5ContractCombination; notice: string; scenarios: Array<SamsungGen5ConditionalScenario & { result?: SamsungDraftCalculationResult }> };

export function calculateSamsungGen5Claim(
  contractType: SamsungGen5ContractType,
  enrollment: SamsungGen5CoverageEnrollment,
  facts: SamsungGen5ObjectiveFacts,
  input: Omit<SamsungDraftCalculationInput, "contractType">,
  uncertainMode: SamsungGen5UncertainMode = "HOLD",
): SamsungGen5LiveCalculation {
  const routing = routeSamsungGen5Coverage(enrollment, facts, uncertainMode);
  if (routing.status === "CONFIRMATION_REQUIRED" || routing.status === "NOT_COVERED") return routing;
  if (routing.status === "CONDITIONAL_SIMULATION") {
    return {
      ...routing,
      scenarios: routing.scenarios.map((scenario) => ({
        ...scenario,
        ...(scenario.covered && scenario.coverage
          ? { result: calculateSamsungGen5(contractType, scenario.coverage, { ...input, threeNonCoveredCategory: facts.threeNonCoveredCategory ?? input.threeNonCoveredCategory }) }
          : {}),
      })),
    };
  }
  return {
    status: "CALCULATED",
    combination: routing.combination,
    classification: routing.classification,
    coverage: routing.coverage,
    result: calculateSamsungGen5(contractType, routing.coverage, {
      ...input,
      careSetting: facts.careSetting,
      threeNonCoveredCategory: facts.threeNonCoveredCategory ?? input.threeNonCoveredCategory,
    }),
  };
}
