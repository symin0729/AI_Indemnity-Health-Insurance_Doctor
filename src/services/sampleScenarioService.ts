import type {
  MedicalUsage,
} from "../domain/medical";

import type {
  SampleId,
} from "./samplePolicyService";

export interface SampleScenarioAssumptions {
  /**
   * 시연 샘플에서 C가 별도 수치로 주어지지 않은 경우
   * M 전체를 보장대상으로 놓는 비교 가정.
   */
  assumeEntireMedicalCostCovered: boolean;

  /**
   * 시연 시작 전 지급한도/자기부담상한 사용량을 0으로 놓는 가정.
   */
  assumeNoPriorLimitUsage: boolean;

  /**
   * 연 2회 같은 반복 이용을 서로 다른 진료일/계산 단위로 놓는 가정.
   */
  assumeEachOccurrenceSeparate: boolean;
}

export interface SampleScenario {
  sampleId: SampleId;

  plannedUsages: MedicalUsage[];

  /**
   * null이면 문서에서 확정되지 않은 값이라
   * 자동으로 체크 상태를 바꾸지 않는다.
   */
  target5GSpecialRider2:
    boolean | null;

  /**
   * 샘플 데모에서만 자동으로 제안할 계산 가정.
   * M02에서 사용자에게 그대로 보여주고 확인받은 뒤 사용한다.
   */
  calculationAssumptions:
    SampleScenarioAssumptions;

  notice: string;
}

/**
 * 문서에서 실제 수치까지 확인 가능한
 * 예정 의료이용 샘플.
 *
 * MRI / 통원 / 비급여 / 비중증
 * 연 8회 / 회당 400,000원
 *
 * 새 엔진의 치료군 전용 룰이 정확히 매칭되도록
 * treatmentCategory="MRI"를 함께 저장한다.
 *
 * C는 문서에서 별도 확정값으로 주어진 것이 아니므로
 * MedicalUsage.coveredAmount에 숫자를 임의 저장하지 않는다.
 * 샘플 비교에서는 calculationAssumptions의
 * assumeEntireMedicalCostCovered=true를 명시적 가정으로 사용한다.
 */
const VERIFIED_MRI_USAGE:
  MedicalUsage = {
  id: "sample-mri-001",

  treatmentName: "MRI",

  treatmentCategory: "MRI",

  careSetting:
    "OUTPATIENT",

  benefitClass:
    "NON_COVERED",

  severityClass:
    "NON_SEVERE",

  frequency: 8,

  unitCost: 400000,

  evidenceStatus:
    "CONFIRMED",

  note:
    "결과 화면 시연용 MRI 의료이용: 통원·비급여·비중증, 연 8회, 회당 400,000원.",
};

const VERIFIED_MRI_ASSUMPTIONS:
  SampleScenarioAssumptions = {
  /**
   * 데모 결과를 재현하기 위한 명시적 비교 가정.
   * C 자체를 '확정 사실'로 저장하는 것과 구분한다.
   */
  assumeEntireMedicalCostCovered:
    true,

  /**
   * 샘플은 비교 시작 시점의 과거 한도 사용량이 별도 제시되지 않으므로
   * 데모 가정으로 0에서 시작한다.
   */
  assumeNoPriorLimitUsage:
    true,

  /**
   * '연 8회' 시연값은 동일 일자 반복이 아니라
   * 서로 다른 통원 회차로 비교하는 데모 가정이다.
   */
  assumeEachOccurrenceSeparate:
    true,
};

const EMPTY_ASSUMPTIONS:
  SampleScenarioAssumptions = {
  assumeEntireMedicalCostCovered:
    false,

  assumeNoPriorLimitUsage:
    false,

  assumeEachOccurrenceSeparate:
    false,
};

export const sampleScenarioService = {
  load(
    sampleId: SampleId
  ): SampleScenario {
    if (
      sampleId ===
      "NON_COVERED"
    ) {
      return {
        sampleId,

        plannedUsages: [
          {
            ...VERIFIED_MRI_USAGE,
          },
        ],

        /**
         * 비중증 비급여 5세대 시연 룰
         * G5_SP2_OUTPATIENT 적용을 위해
         * 비교용 특약2 가입 상태로 둔다.
         */
        target5GSpecialRider2:
          true,

        calculationAssumptions: {
          ...VERIFIED_MRI_ASSUMPTIONS,
        },

        notice:
          "결과 화면 사례용 MRI 시연값(통원·비급여·비중증, 연 8회, 회당 400,000원)을 자동 입력합니다. C=M, 기존 한도 사용량 0, 각 회차 별도 통원은 데모용 계산 가정으로 함께 제안되며 다음 화면에서 사용자가 확인합니다.",
      };
    }

    if (
      sampleId ===
      "COVERAGE_GAP"
    ) {
      return {
        sampleId,

        plannedUsages: [
          {
            ...VERIFIED_MRI_USAGE,
          },
        ],

        /**
         * 동일한 검증 MRI 입력에서
         * 비급여 특약2 미가입 조건을 사용해
         * G5_EXCLUSION 흐름을 시연한다.
         */
        target5GSpecialRider2:
          false,

        calculationAssumptions: {
          ...VERIFIED_MRI_ASSUMPTIONS,
        },

        notice:
          "동일한 MRI 시연값을 사용하고 5세대 비급여 특약2 미가입 조건으로 보장 제외 흐름을 확인합니다. C=M, 기존 한도 사용량 0, 각 회차 별도 통원은 데모용 계산 가정으로 함께 제안됩니다.",
      };
    }

    /**
     * LOW_USAGE는 현재 제출 문서에서
     * 치료 종류·횟수·금액의 확정 샘플값이 없다.
     *
     * 임의로 치료를 생성하지 않고 계약 샘플만 불러온 뒤
     * 사용자가 예정 치료를 직접 입력한다.
     */
    return {
      sampleId,

      plannedUsages: [],

      target5GSpecialRider2:
        null,

      calculationAssumptions: {
        ...EMPTY_ASSUMPTIONS,
      },

      notice:
        "저이용 샘플의 치료 종류·횟수·금액은 현재 문서에 확정값이 없어 예정 치료를 자동 생성하지 않습니다. 필요한 치료를 직접 입력해주세요.",
    };
  },
};

/** 사용자가 치료 샘플 버튼을 누른 경우에만 쓰는 입력 연습용 예시. 금액·횟수는 세대와 상관없이 고정이다. */
export type TreatmentSampleKind = "OUTPATIENT" | "EXAM" | "NON_COVERED_MRI" | "MANUAL_THERAPY" | "NON_COVERED_INPATIENT";

/** 치료 샘플 버튼에 보이는 이름 순서. */
export const TREATMENT_SAMPLE_KINDS: ReadonlyArray<{ kind: TreatmentSampleKind; label: string }> = [
  { kind: "OUTPATIENT", label: "일반 외래 진료" },
  { kind: "EXAM", label: "일반 외래검사" },
  { kind: "NON_COVERED_MRI", label: "비급여 외래 치료" },
  { kind: "MANUAL_THERAPY", label: "도수치료 (11회 이상)" },
  { kind: "NON_COVERED_INPATIENT", label: "비급여 입원" },
];

interface TreatmentSampleSpec {
  /** 치료명(예정 치료 목록·치료 종류 칸에 보이는 이름) */
  name: string;
  /** 비급여 치료 종류(3대 비급여). 일반 치료는 비워 둔다. */
  category: "" | "MRI" | "MANUAL_THERAPY";
  careSetting: "OUTPATIENT" | "INPATIENT";
  benefitClass: "COVERED" | "NON_COVERED";
  amount: number;
  frequency: number;
  /** 화면 설명용 한 줄(샘플 완료 안내에 사용) */
  summary: string;
}

const TREATMENT_SAMPLE_SPECS: Record<TreatmentSampleKind, TreatmentSampleSpec> = {
  OUTPATIENT: { name: "일반 외래 진료", category: "", careSetting: "OUTPATIENT", benefitClass: "COVERED", amount: 20_000, frequency: 4, summary: "치료 종류 X-ray, 의원급, 급여" },
  EXAM: { name: "일반 외래검사", category: "", careSetting: "OUTPATIENT", benefitClass: "COVERED", amount: 40_000, frequency: 3, summary: "치료 종류 혈액검사, 의원급, 급여" },
  NON_COVERED_MRI: { name: "비급여 외래 치료", category: "MRI", careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", amount: 400_000, frequency: 3, summary: "치료 종류 MRI, 의원급, 비급여" },
  MANUAL_THERAPY: { name: "도수치료", category: "MANUAL_THERAPY", careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", amount: 100_000, frequency: 12, summary: "치료 종류 도수치료, 의원급, 비급여, 연 12회(10회 초과)" },
  NON_COVERED_INPATIENT: { name: "비급여 입원 치료", category: "", careSetting: "INPATIENT", benefitClass: "NON_COVERED", amount: 1_500_000, frequency: 1, summary: "비급여 입원, 의원급, 병실료 차액 0원" },
};

function buildTreatmentSampleUsage(kind: TreatmentSampleKind, generation: number): MedicalUsage {
  const spec = TREATMENT_SAMPLE_SPECS[kind];
  const amount = spec.amount;
  const covered = spec.benefitClass === "COVERED";
  const inpatient = spec.careSetting === "INPATIENT";
  const aggregationUnit = spec.category === "MRI" ? "DIAGNOSTIC_ACTION" : spec.category === "MANUAL_THERAPY" ? "TREATMENT" : "VISIT";
  return {
    id: `example-${kind.toLowerCase()}`,
    treatmentName: spec.name,
    treatmentCategory: spec.category,
    careSetting: spec.careSetting,
    benefitClass: spec.benefitClass,
    severityClass: "UNKNOWN",
    frequency: spec.frequency,
    unitCost: amount,
    patientPaidAmount: amount,
    coveredAmount: amount,
    institutionType: "CLINIC_HOSPITAL",
    copayInstitution: "CLINIC",
    // 급여 외래만 건강보험 본인부담률을 둔다(의원급 30%). 비급여는 미적용.
    ...(covered && !inpatient ? { healthInsuranceCopayRate: 0.3 } : {}),
    claimCause: "DISEASE",
    nationalHealthInsuranceStatus: "APPLIED",
    samsungCalculationInput: {
      eligibleExpense: amount,
      requiredCoverageConfirmed: true,
      policyExclusionsCleared: true,
      otherIndemnityPoliciesExist: false,
      sameDayAggregationConfirmed: true,
      priorPaidBenefit: 0,
      priorAnnualCount: 0,
      priorServiceDays: 0,
      priorEligibleDeductible: 0,
      contractBenefitCap: 50_000_000,
      perOccurrenceBenefitCap: 200_000,
      outpatientBenefitCap: 250_000,
      prescriptionBenefitCap: 50_000,
      daysSinceAccidentOrDiagnosis: 1,
      aggregationUnit,
      ...(spec.category ? { threeNonCoveredCategory: spec.category, threeNonCoveredExcludedFromBaseConfirmed: true } : {}),
      ...(inpatient ? { roomDifference: 0 } : {}),
    },
    ...(generation === 1 && inpatient ? { gen1RoomDifference: 0, gen1CoveredRoomAndTreatment: amount } : {}),
    note: "입력 연습용 가상 예제이며 실제 의료비나 평균 진료비가 아닙니다.",
    ...(generation === 2 || generation === 3 ? {
      gen23CareSetting: spec.careSetting,
      gen23Institution: "CLINIC",
      gen23CoveredCopay: covered ? amount : 0,
      gen23NonCoveredExpense: covered ? 0 : amount,
      ...(inpatient ? { gen23RoomDifference: 0, gen23InpatientExcludingRoomDifference: amount, gen23ContractBenefitCap: 50_000_000 } : {}),
      gen23PriorPaidBenefit: 0, gen23PriorAnnualCount: 0, gen23PriorEligibleDeductible: 0,
      gen23OutpatientBenefitCap: 250_000, gen23PrescriptionBenefitCap: 50_000,
      gen23OtherIndemnityPoliciesExist: false,
      gen23RequiredCoverageConfirmed: true, gen23PolicyExclusionsCleared: true,
      gen23SameDayAggregationConfirmed: true,
      ...(generation === 3 ? {
        gen23TreatmentType: spec.category || "BASE",
        gen23RiderEnrollmentStatus: "ENROLLED",
        gen23ThreeNonCoveredExcludedFromBaseConfirmed: true,
        ...(spec.category ? { gen23EligibleExpense: amount, gen23AggregationUnit: aggregationUnit } : {}),
      } : {}),
    } : {}),
  } as MedicalUsage;
}

export function loadTreatmentSample(sampleId: SampleId, generation: number, kind: TreatmentSampleKind = "OUTPATIENT"): SampleScenario {
  const scenario = sampleScenarioService.load(sampleId === "LOW_USAGE" ? "NON_COVERED" : sampleId);
  const spec = TREATMENT_SAMPLE_SPECS[kind];
  const usage = buildTreatmentSampleUsage(kind, generation);
  return {
    ...scenario,
    plannedUsages: [usage],
    target5GSpecialRider2: null,
    notice: `${spec.name} 입력 예제입니다(${spec.summary}). 한 번 진료받을 때 ${spec.amount.toLocaleString("ko-KR")}원, 연 ${spec.frequency}회와 가입·누적 상태는 설명용 가정이며 평균 진료비가 아닙니다. 실제 정보로 수정해주세요.`,
  };
}
