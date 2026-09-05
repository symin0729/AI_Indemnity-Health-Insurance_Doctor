export type RuleVerificationStatus =
  | "VERIFIED"
  | "INSURER_CONFIRMATION_REQUIRED";

export interface SelfPaymentRule {
  ruleId: string;

  generation: number;

  careSetting:
    | "INPATIENT"
    | "OUTPATIENT";

  benefitClass:
    | "COVERED"
    | "NON_COVERED"
    | "UNKNOWN";

  severityClass:
    | "SEVERE"
    | "NON_SEVERE"
    | "UNKNOWN";

  requiredCoverage: string;

  selfPaymentRate: number;

  /**
   * 일부 세대/특약은
   * "정률 또는 최소금액 중 큰 금액" 구조를 사용한다.
   *
   * 예:
   * max(20,000원, 치료비의 30%)
   *
   * 최소금액이 없는 룰은 생략한다.
   */
  minimumSelfPayment?: number;

  description: string;

  /**
   * Rule Trace용 메타데이터.
   *
   * 실제 보험사 약관과 검증 연결된 값이 없으면
   * 임의로 만들지 않고 생략 가능.
   */
  sourceDocument?: string;

  documentVersion?: string;

  effectiveDate?: string;

  verificationStatus?:
    RuleVerificationStatus;
}

export interface RuleSet {
  rulesetVersion: string;

  rules: SelfPaymentRule[];
}

export async function loadRuleSet(
  version = "mvp-v1"
): Promise<RuleSet> {
  const response = await fetch(
    `/rules/${version}.json`
  );

  if (!response.ok) {
    throw new Error(
      `룰 파일을 불러오지 못했습니다: ${version}`
    );
  }

  const data: RuleSet =
    await response.json();

  if (
    !data.rulesetVersion ||
    !Array.isArray(data.rules)
  ) {
    throw new Error(
      `룰 파일 형식이 올바르지 않습니다: ${version}`
    );
  }

  return data;
}
