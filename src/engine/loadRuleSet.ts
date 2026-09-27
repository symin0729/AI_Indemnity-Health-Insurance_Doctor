/**
 * AI 실손 닥터 - RuleSet Loader (mvp-v2 준비)
 *
 * 기존 mvp-v1의 단순 자기부담률 룰을 읽을 수 있으면서,
 * 새 계산명세의 공제·상한·지급한도·근거 추적 필드를 함께 수용한다.
 *
 * 중요:
 * - 이 파일은 룰을 "불러오고 타입을 정의"한다.
 * - 실제 보장판정/공제/상한/지급한도 계산은 별도 engine 함수가 담당한다.
 * - 미확인 값을 임의 기본값으로 채우지 않는다.
 */

import bundledV1 from "../rules/legacy/mvp-v1.json";
import bundledV2 from "../rules/legacy/mvp-v2.json";

export type RuleVerificationStatus =
  | "VERIFIED"
  | "INSURER_CONFIRMATION_REQUIRED";

export type RuleKind =
  | "DEDUCTIBLE"
  | "EXCLUSION"
  | "LIMIT"
  | "DEDUCTIBLE_CAP"
  | "ELIGIBILITY"
  | "INFORMATION";

export type RuleCareSetting =
  | "INPATIENT"
  | "OUTPATIENT";

export type RuleBenefitClass =
  | "COVERED"
  | "NON_COVERED"
  | "UNKNOWN";

export type RuleSeverityClass =
  | "SEVERE"
  | "NON_SEVERE"
  | "UNKNOWN";

export type DeductibleFormulaType =
  | "RATE"
  | "MAX_RATE_MINIMUM"
  | "COVERED_OUTPATIENT";

export type BenefitLimitType =
  | "ANNUAL"
  | "DAILY"
  | "PER_ADMISSION"
  | "VISIT_COUNT"
  | "CUSTOM";

export interface BenefitLimitRule {
  id: string;
  type: BenefitLimitType;

  /**
   * 보험금 지급 금액 한도.
   * 횟수 한도만 존재하면 생략한다.
   */
  amount?: number;

  /**
   * 횟수 한도.
   * 금액 한도만 존재하면 생략한다.
   */
  count?: number;

  /**
   * 같은 날 / 동일 입원 / 보험연도 등
   * 실제 약관상 합산 기준 설명.
   */
  aggregationKey?: string;

  description?: string;
}

export interface DeductibleCapRule {
  /**
   * 자기부담 상한 금액 H
   */
  amount: number;

  /**
   * 상한이 적용되는 범위.
   * 예: 상급종합·종합병원 중증 비급여 입원
   */
  condition: string;

  /**
   * 누적 기준이 약관에서 완전히 확인되지 않은 경우
   * VERIFIED로 두지 않는다.
   */
  aggregationKey?: string;
}

/**
 * mvp-v2 계산 룰.
 *
 * 기존 calculateSelfPayment가 사용하는 필드는 호환을 위해 유지한다.
 * 이후 새 엔진으로 교체하면서 ruleKind / deductibleFormula /
 * benefitLimits / deductibleCap 등을 사용한다.
 */
export interface ClaimRule {
  ruleId: string;

  /**
   * 계산/판정 룰의 역할.
   * 기존 mvp-v1 JSON에는 없을 수 있으므로 optional.
   */
  ruleKind?: RuleKind;

  generation: number;

  careSetting:
    | RuleCareSetting
    | "ANY";

  benefitClass:
    | RuleBenefitClass
    | "ANY";

  severityClass:
    | RuleSeverityClass
    | "ANY";

  /**
   * 필요한 특약 코드.
   * 필요 특약이 없는 룰은 생략한다.
   */
  requiredCoverage?: string;

  /**
   * 특정 치료군에만 적용되는 경우 사용.
   * 값이 없으면 치료군을 제한하지 않는다.
   */
  treatmentCategories?: string[];

  /**
   * 기존 mvp-v1 호환 필드.
   * 비율은 20% → 0.20 형식으로 저장한다.
   */
  selfPaymentRate?: number;

  /**
   * 기존 mvp-v1 호환 + 통원 최소공제.
   */
  minimumSelfPayment?: number;

  /**
   * 새 엔진이 사용할 공제 계산 유형.
   */
  deductibleFormula?: DeductibleFormulaType;

  /**
   * 급여 통원처럼 건강보험 본인부담률(r)이
   * 입력되어야 계산 가능한 룰인지 표시.
   */
  requiresHealthInsuranceCopayRate?: boolean;

  /**
   * 급여 통원의 의료기관 종별 최소공제.
   * 예: CLINIC_HOSPITAL 10,000 / GENERAL_TERTIARY 20,000
   */
  minimumDeductibleByInstitution?: {
    CLINIC_HOSPITAL?: number;
    GENERAL_TERTIARY?: number;
  };

  /**
   * 약관상 지급한도.
   * 연간·일당·입원 회당·횟수 등 복수 한도를 둘 수 있다.
   */
  benefitLimits?: BenefitLimitRule[];

  /**
   * 약관상 자기부담 상한.
   */
  deductibleCap?: DeductibleCapRule;

  /**
   * 보장 제외 룰인 경우 사유 코드/설명.
   */
  exclusionCode?: string;

  description: string;

  // -----------------------------
  // Rule Trace
  // -----------------------------
  condition?: string;
  calculation?: string;

  sourceDocument?: string;
  articleNumber?: string;
  articleParagraph?: string;
  documentVersion?: string;
  effectiveDate?: string;

  exception?: string;
  displayText?: string;

  verificationStatus?:
    RuleVerificationStatus;
}

/**
 * 기존 파일들의 import를 당장 깨지 않기 위한 호환 alias.
 * 새 엔진 전환이 끝나면 ClaimRule 사용으로 통일할 수 있다.
 */
export type SelfPaymentRule = ClaimRule;

export interface RuleSet {
  rulesetVersion: string;

  /**
   * 룰셋 자체의 공식자료 확인 기준일.
   */
  sourceDate?: string;

  /**
   * 실제 보험사 개별 약관 전수 검증 여부와는 별개인 설명.
   */
  description?: string;

  rules: ClaimRule[];
}

function isFiniteNonNegativeNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function validateRule(
  rule: ClaimRule,
  index: number
): void {
  if (
    typeof rule.ruleId !== "string" ||
    !rule.ruleId.trim()
  ) {
    throw new Error(
      `룰 파일 형식 오류: rules[${index}].ruleId`
    );
  }

  if (
    !Number.isInteger(rule.generation) ||
    rule.generation < 1 ||
    rule.generation > 5
  ) {
    throw new Error(
      `룰 파일 형식 오류: ${rule.ruleId}의 generation`
    );
  }

  if (
    typeof rule.description !== "string" ||
    !rule.description.trim()
  ) {
    throw new Error(
      `룰 파일 형식 오류: ${rule.ruleId}의 description`
    );
  }

  if (
    rule.selfPaymentRate !== undefined &&
    (
      typeof rule.selfPaymentRate !==
        "number" ||
      !Number.isFinite(
        rule.selfPaymentRate
      ) ||
      rule.selfPaymentRate < 0 ||
      rule.selfPaymentRate > 1
    )
  ) {
    throw new Error(
      `룰 파일 형식 오류: ${rule.ruleId}의 selfPaymentRate`
    );
  }

  if (
    rule.minimumSelfPayment !==
      undefined &&
    !isFiniteNonNegativeNumber(
      rule.minimumSelfPayment
    )
  ) {
    throw new Error(
      `룰 파일 형식 오류: ${rule.ruleId}의 minimumSelfPayment`
    );
  }

  rule.benefitLimits?.forEach(
    (limit, limitIndex) => {
      if (
        !limit.id ||
        !limit.type
      ) {
        throw new Error(
          `룰 파일 형식 오류: ${rule.ruleId}.benefitLimits[${limitIndex}]`
        );
      }

      if (
        limit.amount !== undefined &&
        !isFiniteNonNegativeNumber(
          limit.amount
        )
      ) {
        throw new Error(
          `룰 파일 형식 오류: ${rule.ruleId}.${limit.id}.amount`
        );
      }

      if (
        limit.count !== undefined &&
        (
          !Number.isInteger(
            limit.count
          ) ||
          limit.count < 0
        )
      ) {
        throw new Error(
          `룰 파일 형식 오류: ${rule.ruleId}.${limit.id}.count`
        );
      }
    }
  );

  if (
    rule.deductibleCap &&
    !isFiniteNonNegativeNumber(
      rule.deductibleCap.amount
    )
  ) {
    throw new Error(
      `룰 파일 형식 오류: ${rule.ruleId}의 deductibleCap.amount`
    );
  }
}

function validateRuleSet(
  data: unknown
): asserts data is RuleSet {
  if (
    typeof data !== "object" ||
    data === null
  ) {
    throw new Error(
      "룰 파일 형식이 올바르지 않습니다."
    );
  }

  const candidate =
    data as Partial<RuleSet>;

  if (
    typeof candidate.rulesetVersion !==
      "string" ||
    !candidate.rulesetVersion.trim() ||
    !Array.isArray(candidate.rules)
  ) {
    throw new Error(
      "룰 파일 형식이 올바르지 않습니다."
    );
  }

  candidate.rules.forEach(
    (rule, index) =>
      validateRule(
        rule as ClaimRule,
        index
      )
  );
}

/**
 * 앱에 포함된 src/rules/{version}.json 을 읽는다.
 * 결과 화면 진입 시 별도의 네트워크 요청이 필요하지 않다.
 *
 * 마이그레이션 기본 버전은 mvp-v2.
 * 기존 화면에서 loadRuleSet("mvp-v1")을 명시 호출하면
 * 이전 룰도 계속 읽을 수 있다.
 */
export async function loadRuleSet(
  version = "mvp-v2"
): Promise<RuleSet> {
  const bundledRuleSets: Record<string, unknown> = {
    "mvp-v1": bundledV1,
    "mvp-v2": bundledV2,
  };

  if (!Object.hasOwn(bundledRuleSets, version)) {
    throw new Error(
      `지원하지 않는 계산 룰 버전입니다: ${version}`
    );
  }

  // 호출마다 독립된 데이터를 반환해 다른 계산의 규칙 변경을 방지한다.
  const data: unknown = structuredClone(bundledRuleSets[version]);

  validateRuleSet(data);

  if (
    data.rulesetVersion !== version
  ) {
    throw new Error(
      `요청한 룰 버전(${version})과 파일 버전(${data.rulesetVersion})이 일치하지 않습니다.`
    );
  }

  return data;
}
