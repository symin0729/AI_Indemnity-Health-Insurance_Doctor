import type { CopayInstitution, CopayRegion } from "./insuranceInputDefaults";
/**
 * AI 실손 닥터 - 의료이용 도메인 (mvp-v2)
 *
 * 기존 화면과 샘플이 사용하던 필드는 그대로 유지하고,
 * 새 계산명세에 필요한 정밀 계산 필드를 optional로 확장한다.
 *
 * 핵심 원칙:
 * - 모르는 값은 0 또는 대표값으로 채우지 않는다.
 * - optional 값이 없으면 새 계산 엔진에서 "확인 필요"로 처리한다.
 * - unitCost는 현재 MVP에서 1회당 환자부담 의료비 M으로 사용한다.
 */

export type CareSetting =
  | "INPATIENT"
  | "OUTPATIENT";

export type BenefitClass =
  | "COVERED"
  | "NON_COVERED"
  | "UNKNOWN";

export type SeverityClass =
  | "SEVERE"
  | "NON_SEVERE"
  | "UNKNOWN";

export type ClaimCause = "INJURY" | "DISEASE" | "UNKNOWN";
export type NationalHealthInsuranceStatus =
  | "APPLIED"
  | "NOT_APPLIED"
  | "PARTIAL"
  | "UNKNOWN";

/**
 * 5세대 급여 통원 최소공제액 D 선택에 필요한
 * 의료기관 종별.
 *
 * 값이 확인되지 않은 경우 이 필드를 아예 넣지 않는다.
 */
export type MedicalInstitutionType =
  | "CLINIC_HOSPITAL"
  | "GENERAL_TERTIARY";

export type TreatmentRelatedness =
  | "RELATED"
  | "NOT_RELATED"
  | "UNKNOWN";

export type EvidenceStatus =
  | "CONFIRMED"
  | "UNCONFIRMED"
  | "NOT_PROVIDED";

export interface MedicalUsage {
  /** 삼성 상품별 계산에 필요한 확인된 값만 전달합니다. */
  samsungCalculationInput?: import('../engine/evaluateSamsungExecutionSpec').SamsungDraftCalculationInput;
  samsungGen5Facts?: Omit<import('../engine/calculateSamsungGen5').SamsungGen5ObjectiveFacts, 'benefitClass' | 'careSetting'>;
  /* =====================================================
   * 기존 MVP 필드
   * =================================================== */

  id: string;

  treatmentName: string;

  careSetting: CareSetting;

  benefitClass: BenefitClass;

  severityClass: SeverityClass;

  /**
   * 연간 예상 이용 횟수.
   *
   * 현재 M02는 1 이상 정수로 입력한다.
   * 손익분기 시뮬레이션의 0회는 원본 객체를 0으로 저장하지 않고
   * 해당 치료를 계산 목록에서 제외하여 표현한다.
   */
  frequency: number;

  /**
   * 1회당 환자부담 의료비 M.
   *
   * 계약 선택과 무관하게 동일 의료이용 시나리오에서
   * 비교 기준이 되는 금액이다.
   */
  unitCost: number;

  /* =====================================================
   * mvp-v2 정밀 계산 확장 필드
   *
   * 기존 M02 / 샘플 / Zustand를 깨지 않도록 모두 optional.
   * =================================================== */

  /**
   * 실제 또는 예정 진료일.
   * ISO 형식 권장: YYYY-MM-DD
   */
  treatmentDate?: string;

  /**
   * 룰 매칭용 치료 분류.
   * 예: MRI, MRA, INJECTION, PHYSICAL_THERAPY
   *
   * 자유 입력 치료명과 계산 분류값을 분리한다.
   */
  treatmentCategory?: string;

  /**
   * 급여 통원 최소공제액 D 판정용 의료기관 종별.
   */
  institutionType?: MedicalInstitutionType;
  copayInstitution?: CopayInstitution;
  copayRegion?: CopayRegion;

  /**
   * 급여 통원에 적용되는 건강보험 본인부담률 r.
   *
   * 40%는 40이 아니라 0.4로 저장한다.
   * 미확인 시 생략한다.
   */
  healthInsuranceCopayRate?: number;

  /**
   * 영수증 기준 1회당 환자 부담액.
   *
   * 현재 MVP에서는 unitCost와 같은 값으로 사용할 수 있지만,
   * 향후 공단 부담액·전액본인부담 등을 분리하기 위해 별도 보관한다.
   */
  patientPaidAmount?: number;

  /**
   * 건강보험공단 부담액.
   * 급여 진료 근거 확인용이며 실손 보장대상 C와 동일한 값이 아니다.
   */
  nhisPaidAmount?: number;

  /**
   * 해당 비교안의 약관상 1회당 보장대상 인정금액 C.
   *
   * 실제로는 CURRENT와 TARGET_5G에서 C가 달라질 수 있으므로
   * 공통 MedicalUsage에 값을 확정 저장하는 것보다
   * 시나리오별 계산 Context에서 사용하는 것이 원칙이다.
   *
   * 이 필드는 사용자/증빙에서 직접 확인된 공통 기준값이 있을 때만 사용한다.
   */
  coveredAmount?: number;

  /**
   * 산정특례·중증 판정 등에서
   * 질환과 해당 치료의 관련성이 필요한 경우 사용.
   */
  treatmentRelatedness?: TreatmentRelatedness;

  /**
   * 영수증·진료비 세부내역 등
   * 계산 근거 증빙의 확인 상태.
   */
  evidenceStatus?: EvidenceStatus;

  /**
   * 동일 입원건을 하나의 약관 계산 단위로 묶기 위한 ID.
   */
  admissionId?: string;

  /**
   * 같은 날 진료·처방 등 약관상 합산 단위를 표현하기 위한 ID.
   */
  sameDayGroupId?: string;

  /**
   * 보험연도 구분 키.
   *
   * 단순 달력연도와 다를 수 있으므로 자유 문자열로 둔다.
   * 예: "2026-policy-year-1"
   */
  insuranceYearKey?: string;

  /**
   * 화면/샘플에서 명시한 가정 또는 확인 메모.
   */
  note?: string;

  /** 1세대 삼성화재 0904.2 D1 룰 라우팅용 확인값. */
  claimCause?: ClaimCause;
  nationalHealthInsuranceStatus?: NationalHealthInsuranceStatus;
  gen1CoveredRoomAndTreatment?: number;
  gen1RoomDifference?: number;
  gen1NonNhiInpatientTotal?: number;
  gen1PriorPaidBenefit?: number;
  gen1PriorServiceDays?: number;
  gen1PolicyExclusionsCleared?: boolean;
    /* =====================================================
   * 삼성 2·3세대 정밀 계산용 입력
   *
   * 확인되지 않은 값은 undefined로 유지한다.
   * 계산 엔진에서 임의로 0을 채우지 않는다.
   * =================================================== */

  /** 급여 본인부담금 */
  gen23CoveredCopay?: number;

  /** 비급여 금액 */
  gen23NonCoveredExpense?: number;

  /** 병실차액을 제외한 입원 계산 대상 금액 */
  gen23InpatientExcludingRoomDifference?: number;

  /** 병실차액 */
  gen23RoomDifference?: number;

  /** 입원일수 */
  gen23InpatientDays?: number;

  /** 계산 시작 전 연간 자기부담 누적액 */
  gen23PriorEligibleDeductible?: number;

  /** 계산 시작 전 누적 지급 보험금 */
  gen23PriorPaidBenefit?: number;

  /** 계산 시작 전 연간 통원/처방 횟수 */
  gen23PriorAnnualCount?: number;

  /** 계약상 1회당 보장한도 */
  gen23ContractBenefitCap?: number;

  /** 통원 특약 1회당 보장한도 */
  gen23OutpatientBenefitCap?: number;

  /** 처방 특약 1회당 보장한도 */
  gen23PrescriptionBenefitCap?: number;

  /** 다른 실손보험 등 중복 보장 여부 */
  gen23OtherIndemnityPoliciesExist?: boolean;

  /** 다른 보험이 있을 때의 비례보상 계수 */
  gen23ProportionalPaymentFactor?: number;

  /** 동일 날짜 합산 확인 여부 */
  gen23SameDayAggregationConfirmed?: boolean;
  /** 2·3세대 전용 분류: 기존 careSetting/institutionType의 의미는 유지한다. */
  gen23CareSetting?: "INPATIENT" | "OUTPATIENT" | "PRESCRIPTION";
  gen23Institution?: "CLINIC" | "HOSPITAL" | "GENERAL_TERTIARY";
  gen23RequiredCoverageConfirmed?: boolean;
  gen23PolicyExclusionsCleared?: boolean;
  gen23NonNhiInpatientTotal?: number;
  gen23BenefitLimitRestored?: boolean;
  gen23TreatmentType?: "BASE" | "MANUAL_THERAPY" | "INJECTION" | "MRI" | "UNKNOWN";
  gen23RiderEnrollmentStatus?: "ENROLLED" | "NOT_ENROLLED" | "UNKNOWN";
  gen23EligibleExpense?: number;
  gen23AggregationUnit?: "VISIT" | "TREATMENT" | "DIAGNOSTIC_ACTION";
  gen23ThreeNonCoveredExcludedFromBaseConfirmed?: boolean;
  gen23InjectionRiderEligibleConfirmed?: boolean;
}
