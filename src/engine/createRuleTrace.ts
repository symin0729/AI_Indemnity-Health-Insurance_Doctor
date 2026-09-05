export type VerificationStatus =
  | "VERIFIED"
  | "INSURER_CONFIRMATION_REQUIRED";

export interface RuleTrace {
  ruleId: string;

  condition: string;

  calculation: string;

  sourceDocument: string;

  documentVersion: string;

  effectiveDate: string;

  verificationStatus:
    VerificationStatus;
}

interface CreateRuleTraceParams {
  ruleId: string | null;

  condition: string;

  calculation: string;

  rulesetVersion: string;

  verificationStatus?:
    VerificationStatus;
}

/**
 * MVP용 Rule Trace 생성기
 *
 * 현재 실제 보험사 약관 원문/조문번호가
 * 앱 룰과 검증 연결되어 있지 않으므로
 * 임의의 조문번호나 시행일을 만들지 않는다.
 *
 * 확인되지 않은 항목은 명시적으로
 * INSURER_CONFIRMATION_REQUIRED 상태로 남긴다.
 */
export function createRuleTrace({
  ruleId,
  condition,
  calculation,
  rulesetVersion,
  verificationStatus =
    "INSURER_CONFIRMATION_REQUIRED",
}: CreateRuleTraceParams): RuleTrace | null {
  if (!ruleId) {
    return null;
  }

  return {
    ruleId,

    condition,

    calculation,

    sourceDocument:
      "MVP 시연용 룰셋",

    documentVersion:
      rulesetVersion,

    /**
     * 실제 약관 시행일이 현재 룰 데이터와
     * 검증 연결되지 않았기 때문에
     * 임의 날짜를 생성하지 않는다.
     */
    effectiveDate:
      "확인 필요",

    verificationStatus,
  };
}
