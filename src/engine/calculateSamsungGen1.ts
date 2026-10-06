import executionSpec from "../../knowledge/drafts/samsung/executable-specs/SAMSUNG_0904_2.execution-spec.draft.json";
import {
  evaluateSamsungExecutionSpec,
  type SamsungDraftCalculationInput,
  type SamsungDraftCalculationResult,
  type SamsungExecutionRule,
} from "./evaluateSamsungExecutionSpec";

export type Gen1ProductSelection = "SAMSUNG_0904_2" | "OTHER" | "UNKNOWN";
export type Gen1D1Coverage = "INJURY" | "DISEASE" | "BOTH" | "NONE" | "UNKNOWN";
export type Gen1NhiStatus = "APPLIED" | "NOT_APPLIED" | "PARTIAL" | "UNKNOWN";

export interface SamsungGen1RouteInput {
  product: Gen1ProductSelection;
  contractBasis: "SAMPLE_SIMULATION" | "ACTUAL_CONTRACT";
  d1Coverage: Gen1D1Coverage;
  claimCause: "INJURY" | "DISEASE" | "UNKNOWN";
  careSetting: "INPATIENT" | "OUTPATIENT";
  nhiStatus: Gen1NhiStatus;
}

export type SamsungGen1RouteResult =
  | { status: "ROUTED"; ruleId: "G1-01" | "G1-02" | "G1-04" | "G1-05" }
  | { status: "UNSUPPORTED_PRODUCT"; reason: string }
  | { status: "RULE_NOT_VERIFIED"; reason: string }
  | { status: "CONFIRMATION_REQUIRED"; reason: string }
  | { status: "NOT_ENROLLED"; reason: string };

const rules = new Map(
  (executionSpec.rules as SamsungExecutionRule[]).map((rule) => [rule.ruleId, rule]),
);

export function routeSamsungGen1Rule(input: SamsungGen1RouteInput): SamsungGen1RouteResult {
  if (input.product === "OTHER") {
    return { status: "UNSUPPORTED_PRODUCT", reason: "0904.2 외 1세대 상품은 현재 계산하지 않습니다." };
  }
  if (input.product !== "SAMSUNG_0904_2") {
    return { status: "CONFIRMATION_REQUIRED", reason: "가입 상품을 확인해야 합니다." };
  }
  if (input.contractBasis === "ACTUAL_CONTRACT" && executionSpec.calculationEnabled !== true) {
    return { status: "RULE_NOT_VERIFIED", reason: "0904.2 Rule은 독립검수 전이므로 실제 계약 계산이 비활성화되어 있습니다." };
  }
  if (input.d1Coverage === "NONE") {
    return { status: "CONFIRMATION_REQUIRED", reason: "가입한 D1 특약이 없어 계산할 수 없습니다. 보험증권의 특약을 확인해주세요." };
  }
  if (input.claimCause === "UNKNOWN" || input.d1Coverage === "UNKNOWN") {
    return { status: "CONFIRMATION_REQUIRED", reason: "질병·상해와 가입한 D1 담보를 확인해야 합니다." };
  }
  const covered = input.d1Coverage === "BOTH"
    || input.d1Coverage === input.claimCause;
  if (!covered) {
    // 체크하지 않은 특약은 미가입으로 계산한다. 계산을 보류하지 않고 현재 계약은 보상 0원으로 처리한다.
    return { status: "NOT_ENROLLED", reason: "선택한 진료의 원인(질병/상해)에 해당하는 D1 특약에 가입하지 않아 현재 계약은 보상하지 않습니다." };
  }
  if (input.nhiStatus === "PARTIAL") {
    return { status: "RULE_NOT_VERIFIED", reason: "건강보험 일부 적용 사례의 분리 계산 명세가 확인되지 않았습니다." };
  }
  if (input.nhiStatus === "UNKNOWN") {
    return { status: "CONFIRMATION_REQUIRED", reason: "국민건강보험 적용 여부를 확인해야 합니다." };
  }
  if (input.claimCause === "DISEASE" && input.careSetting === "OUTPATIENT") {
    return { status: "RULE_NOT_VERIFIED", reason: "질병 통원 조합은 현재 실행 명세에서 확인되지 않았습니다." };
  }
  if (input.claimCause === "DISEASE") return { status: "ROUTED", ruleId: "G1-05" };
  if (input.careSetting === "OUTPATIENT") return { status: "ROUTED", ruleId: "G1-04" };
  return { status: "ROUTED", ruleId: input.nhiStatus === "APPLIED" ? "G1-01" : "G1-02" };
}

export interface SamsungGen1CalculationResult extends SamsungDraftCalculationResult {
  evidenceIds: string[];
  resultLabel: "SAMPLE_SIMULATION";
}

type SamsungGen1CalculationOutcome =
  | Exclude<SamsungGen1RouteResult, { status: "ROUTED" }>
  | SamsungGen1CalculationResult;

export function calculateSamsungGen1Sample(
  routeInput: SamsungGen1RouteInput,
  calculationInput: SamsungDraftCalculationInput,
): SamsungGen1CalculationOutcome {
  const route = routeSamsungGen1Rule(routeInput);
  if (route.status !== "ROUTED") return route;
  const rule = rules.get(route.ruleId);
  if (!rule) return { status: "RULE_NOT_VERIFIED", reason: `${route.ruleId} 실행 명세를 찾을 수 없습니다.` };
  return {
    ...evaluateSamsungExecutionSpec(rule, calculationInput),
    evidenceIds: [`SAMSUNG_0904_2_E_${route.ruleId}`],
    resultLabel: "SAMPLE_SIMULATION",
  };
}
