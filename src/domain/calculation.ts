/**
 * AI 실손 닥터 - 계산 도메인 타입 (mvp-v2)
 *
 * 새 계산명세의 핵심 회계식:
 *   M = C + E
 *   I = C - d* - U
 *   최종 의료비 부담 = M - I = E + d* + U
 *   연간 총부담 = 연간 납입보험료 + ΣM - ΣI
 *
 * 이 파일은 계산 "타입"만 정의합니다.
 * 실제 보장판정/공제/상한/지급한도 계산은 engine 파일에서 수행합니다.
 */

export type Money = number;

export type ComparisonOption =
  | "CURRENT"
  | "TARGET_5G"
  | "SELECTIVE_DISCOUNT";

export type CalculationStatus =
  | "CALCULATED"
  | "CONFIRMATION_REQUIRED"
  | "UNSUPPORTED";

export type CoverageDecision =
  | "COVERED"
  | "PARTIALLY_COVERED"
  | "EXCLUDED"
  | "UNKNOWN";

export type PremiumSource =
  | "ACTUAL_PAYMENT"
  | "INSURER_QUOTE"
  | "USER_ASSUMPTION"
  | "PRE_DISCOUNT";

export interface PremiumInput {
  /**
   * 할인·할증 반영 여부를 확인한 월 납입보험료.
   * ACTUAL_PAYMENT / INSURER_QUOTE라면 같은 할인·할증을 다시 적용하지 않는다.
   */
  monthlyPremium: Money;

  source: PremiumSource;

  /**
   * monthlyPremium에 이미 할인·할증이 반영되어 있는지 여부.
   * true면 엔진에서 동일 할인·할증을 재적용하면 안 된다.
   */
  includesAdjustment: boolean;

  /**
   * 실제 견적/가정값의 유효 시작일이 확인된 경우 사용.
   */
  effectiveDate?: string;

  /**
   * 보험사 견적 등의 유효기간이 확인된 경우 사용.
   */
  validUntil?: string;

  note?: string;
}

export type BenefitLimitType =
  | "ANNUAL"
  | "DAILY"
  | "PER_ADMISSION"
  | "VISIT_COUNT"
  | "CUSTOM";

export interface BenefitLimit {
  id: string;
  type: BenefitLimitType;

  /** 금액 한도. 횟수 한도만 있는 규칙이라면 생략 가능. */
  amount?: Money;

  /** 횟수 한도. 금액 한도만 있는 규칙이라면 생략 가능. */
  count?: number;

  /** 해당 보험연도/일자/입원건에서 이미 사용한 값. */
  usedAmount?: Money;
  usedCount?: number;

  /** 약관상 집계 기준을 UI/Trace에 남기기 위한 설명. */
  aggregationKey?: string;
}

export interface DeductibleCapState {
  /** 자기부담 상한 총액 H */
  capAmount: Money;

  /** 직전까지 상한 산정에 포함되는 누적 자기부담 S_prev */
  usedAmount: Money;

  /** 이번 계산 단위가 상한 적용 대상인지 여부 */
  eligible: boolean;
}

export interface RuleTrace {
  ruleId: string;

  condition: string;
  calculation: string;

  sourceDocument?: string;
  articleNumber?: string;
  articleParagraph?: string;
  documentVersion?: string;
  effectiveDate?: string;

  exception?: string;
  displayText?: string;

  verificationStatus:
    | "VERIFIED"
    | "INSURER_CONFIRMATION_REQUIRED";
}

/**
 * 약관의 공제·한도 적용 기준으로 묶인 1개 계산 단위(i)의 결과.
 *
 * M: 실손 보상 전 환자 부담 의료비
 * C: 보장대상 인정금액
 * E: 보장 제외 금액 (= M - C)
 * d: 기본 공제액
 * d*: 자기부담 상한 등을 반영한 조정 공제액
 * q: 지급한도 적용 전 보험금
 * I: 최종 모의 실손보험금
 * U: 지급한도로 인해 보전되지 않는 금액 (= q - I)
 */
export interface ClaimCalculationItem {
  usageId: string;
  treatmentName: string;

  medicalCost: Money; // M
  coveredAmount: Money | null; // C
  excludedAmount: Money | null; // E

  baseDeductible: Money | null; // d
  adjustedDeductible: Money | null; // d*

  preLimitBenefit: Money | null; // q
  insuranceBenefit: Money | null; // I
  limitExceededAmount: Money | null; // U

  /** 최종 환자 의료비 부담 = M - I */
  finalMedicalBurden: Money | null;

  coverageDecision: CoverageDecision;
  status: CalculationStatus;

  appliedLimitIds: string[];
  traces: RuleTrace[];
  warnings: string[];
}

export interface AnnualCalculationResult {
  option: ComparisonOption;
  year: number;

  /** 해당 연도에 실제 납부한다고 입력/확인된 보험료의 합. */
  annualPremium: Money | null;

  items: ClaimCalculationItem[];

  totalMedicalCost: Money | null; // ΣM
  totalInsuranceBenefit: Money | null; // ΣI
  totalFinalMedicalBurden: Money | null; // Σ(M-I)

  /** 세부 분해값. 총부담에 재가산하지 않는다. */
  totalExcludedAmount: Money | null; // ΣE
  totalAdjustedDeductible: Money | null; // Σd*
  totalLimitExceededAmount: Money | null; // ΣU

  /** 연간 총부담 = annualPremium + ΣM - ΣI */
  totalBurden: Money | null;

  status: CalculationStatus;
  warnings: string[];
}

export interface ThreeYearCalculationResult {
  option: ComparisonOption;

  yearly: AnnualCalculationResult[];

  /**
   * 3년 총부담 = Σ(연도별 totalBurden)
   * 연도 중 미확인 구간이 있으면 null로 두고 확인 필요를 표시한다.
   */
  totalBurden3Years: Money | null;

  status: CalculationStatus;
  warnings: string[];
}

export interface ComparisonResult {
  current: AnnualCalculationResult;
  target5G: AnnualCalculationResult;

  /**
   * 2026-09-05 기준 선택형 할인특약은 시행 예정이므로
   * 실제 시행/대상/상품 조건이 확인되기 전에는 계산 결과를 강제로 만들지 않는다.
   */
  selectiveDiscount?: AnnualCalculationResult | null;

  /** A 대비 B 절감액 = T_A - T_B */
  target5GSaving: Money | null;

  /** A 대비 C 절감액 = T_A - T_C */
  selectiveDiscountSaving?: Money | null;

  rulesetVersion: string;
  inputHash: string;

  warnings: string[];
}

/** 개발 중 계산 불변식 검사에 사용할 스냅샷 */
export interface CalculationInvariantSnapshot {
  medicalCost: Money; // M
  coveredAmount: Money; // C
  excludedAmount: Money; // E
  adjustedDeductible: Money; // d*
  preLimitBenefit: Money; // q
  insuranceBenefit: Money; // I
  limitExceededAmount: Money; // U
}
