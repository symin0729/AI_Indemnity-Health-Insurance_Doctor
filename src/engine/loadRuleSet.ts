export interface SelfPaymentRule {
  ruleId: string;
  generation: number;
  benefitClass: string;
  severityClass: string;
  requiredCoverage: string;
  selfPaymentRate: number;
  description: string;
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

  return data;
}