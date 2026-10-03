import type { MedicalUsage } from "./medical";
export interface Gen23Field {
  key: keyof MedicalUsage; label: string; kind: "number" | "select" | "boolean";
  options?: readonly (readonly [string, string])[]; generation?: number; scope?: string;
}
export const gen23Fields: readonly Gen23Field[] = [
  {
    "key": "gen23CareSetting",
    "label": "계산 구분",
    "kind": "select",
    "options": [
      [
        "INPATIENT",
        "입원"
      ],
      [
        "OUTPATIENT",
        "외래"
      ],
      [
        "PRESCRIPTION",
        "처방"
      ]
    ]
  },
  {
    "key": "claimCause",
    "label": "질병 / 상해",
    "kind": "select",
    "options": [
      [
        "INJURY",
        "상해"
      ],
      [
        "DISEASE",
        "질병"
      ]
    ]
  },
  {
    "key": "nationalHealthInsuranceStatus",
    "label": "건강보험 적용",
    "kind": "select",
    "options": [
      [
        "APPLIED",
        "적용"
      ],
      [
        "NOT_APPLIED",
        "미적용"
      ],
      [
        "PARTIAL",
        "일부 적용"
      ]
    ]
  },
  {
    "key": "gen23TreatmentType",
    "label": "3세대 치료 분류",
    "kind": "select",
    "options": [
      [
        "BASE",
        "기본형"
      ],
      [
        "MANUAL_THERAPY",
        "도수·체외충격파·증식"
      ],
      [
        "INJECTION",
        "비급여 주사"
      ],
      [
        "MRI",
        "MRI/MRA"
      ]
    ],
    "generation": 3
  },
  {
    "key": "gen23RiderEnrollmentStatus",
    "label": "선택한 기본형/특약 가입",
    "kind": "select",
    "options": [
      [
        "ENROLLED",
        "가입 확인"
      ],
      [
        "NOT_ENROLLED",
        "미가입 확인"
      ]
    ],
    "generation": 3
  },
  {
    "key": "gen23Institution",
    "label": "외래 의료기관",
    "kind": "select",
    "options": [
      [
        "CLINIC",
        "의원"
      ],
      [
        "HOSPITAL",
        "병원·일반 종합병원"
      ],
      [
        "GENERAL_TERTIARY",
        "종합전문·상급종합병원"
      ]
    ],
    "scope": "outpatient"
  },
  {
    "key": "gen23CoveredCopay",
    "label": "급여 본인부담금",
    "kind": "number"
  },
  {
    "key": "gen23NonCoveredExpense",
    "label": "비급여 금액 (병실료 별도)",
    "kind": "number"
  },
  {
    "key": "gen23InpatientExcludingRoomDifference",
    "label": "병실료 제외 입원 계산 대상액",
    "kind": "number",
    "scope": "inpatient"
  },
  {
    "key": "gen23RoomDifference",
    "label": "병실료 차액 (없으면 0)",
    "kind": "number",
    "scope": "inpatient"
  },
  {
    "key": "gen23InpatientDays",
    "label": "입원일수",
    "kind": "number",
    "scope": "inpatient"
  },
  {
    "key": "gen23NonNhiInpatientTotal",
    "label": "건강보험 미적용 입원 총액",
    "kind": "number",
    "scope": "inpatient"
  },
  {
    "key": "gen23PriorEligibleDeductible",
    "label": "이전 연간 상한 대상 자기부담액",
    "kind": "number",
    "scope": "inpatient"
  },
  {
    "key": "gen23PriorPaidBenefit",
    "label": "해당 담보·기간의 이전 지급 보험금",
    "kind": "number"
  },
  {
    "key": "gen23PriorAnnualCount",
    "label": "해당 담보의 이전 연간 이용횟수",
    "kind": "number"
  },
  {
    "key": "gen23ContractBenefitCap",
    "label": "입원 계약 가입금액",
    "kind": "number",
    "scope": "inpatient"
  },
  {
    "key": "gen23OutpatientBenefitCap",
    "label": "외래 가입금액",
    "kind": "number",
    "scope": "outpatient"
  },
  {
    "key": "gen23PrescriptionBenefitCap",
    "label": "처방 가입금액",
    "kind": "number",
    "scope": "outpatient"
  },
  {
    "key": "gen23DaysSinceTermination",
    "label": "계약 종료 후 경과일",
    "kind": "number"
  },
  {
    "key": "gen23PriorContinuationCount",
    "label": "종료 후 이전 외래·처방 이용횟수",
    "kind": "number",
    "scope": "outpatient"
  },
  {
    "key": "gen23ProportionalPaymentFactor",
    "label": "검증된 비례보상계수 (0~1)",
    "kind": "number"
  },
  {
    "key": "gen23EligibleExpense",
    "label": "특약 대상 의료비 (확인된 1계산단위)",
    "kind": "number",
    "generation": 3,
    "scope": "special"
  },
  {
    "key": "gen23AggregationUnit",
    "label": "특약 계산 단위",
    "kind": "select",
    "options": [
      [
        "TREATMENT",
        "개별 치료행위 (도수군)"
      ],
      [
        "VISIT",
        "1회 입원 또는 통원 (주사)"
      ],
      [
        "DIAGNOSTIC_ACTION",
        "개별 진단행위 (MRI)"
      ]
    ],
    "generation": 3,
    "scope": "special"
  },
  {
    "key": "gen23CoveragePeriod",
    "label": "보장기간",
    "kind": "select",
    "options": [
      [
        "ACTIVE",
        "정상 보장기간 (갱신·재가입 확인 포함)"
      ],
      [
        "POST_TERMINATION",
        "계약 종료 후 계속 치료"
      ]
    ]
  },
  {
    "key": "gen23RequiredCoverageConfirmed",
    "label": "해당 상품·종형·담보 가입 확인",
    "kind": "boolean"
  },
  {
    "key": "gen23PolicyExclusionsCleared",
    "label": "면책·제외사항에 해당하지 않음 확인",
    "kind": "boolean"
  },
  {
    "key": "gen23CoveragePeriodConfirmed",
    "label": "보장기간 검토 완료",
    "kind": "boolean"
  },
  {
    "key": "gen23PostTerminationContinuationConfirmed",
    "label": "종료 당시 계속 중인 치료 조건 충족",
    "kind": "boolean"
  },
  {
    "key": "gen23OtherIndemnityPoliciesExist",
    "label": "다른 실손보험 있음",
    "kind": "boolean"
  },
  {
    "key": "gen23SameDayAggregationConfirmed",
    "label": "동일 날짜·목적 합산 확인",
    "kind": "boolean"
  },
  {
    "key": "gen23BenefitLimitRestored",
    "label": "입원 한도 소진 후 복원 조건 충족",
    "kind": "boolean"
  },
  {
    "key": "gen23ThreeNonCoveredExcludedFromBaseConfirmed",
    "label": "기본형에서 3대 특약 대상액 제외 확인",
    "kind": "boolean",
    "generation": 3
  },
  {
    "key": "gen23InjectionRiderEligibleConfirmed",
    "label": "주사료가 항암제·항생제·희귀의약품 제외 특약 대상임",
    "kind": "boolean",
    "generation": 3
  }
];
export type Gen23FormState = Partial<Record<keyof MedicalUsage, string>>;
export function restoreGen23Form(usage: Partial<MedicalUsage>): Gen23FormState {
  return Object.fromEntries(gen23Fields.map(({key}) => [key, usage[key] === undefined ? "" : String(usage[key])]));
}
export function parseGen23Form(form: Gen23FormState): Partial<MedicalUsage> {
  return Object.fromEntries(gen23Fields.map(field => {
    const raw = form[field.key]?.trim() ?? "";
    if (raw === "" || raw === "UNKNOWN") return [field.key, undefined];
    if (field.kind === "number") {
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) throw new Error(`${field.label}: 0 이상의 유한한 숫자를 입력해주세요.`);
      return [field.key, value];
    }
    if (field.kind === "boolean") {
      if (raw !== "true" && raw !== "false") throw new Error(`${field.label}: 확인 상태를 선택해주세요.`);
      return [field.key, raw === "true"];
    }
    if (!field.options?.some(([value]) => value === raw)) throw new Error(`${field.label}: 선택값을 확인해주세요.`);
    return [field.key, raw];
  }));
}
