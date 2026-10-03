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
 * 연 2회 / 회당 400,000원
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

  frequency: 2,

  unitCost: 400000,

  evidenceStatus:
    "CONFIRMED",

  note:
    "공모전 제출 문서의 시연용 MRI 의료이용: 통원·비급여·비중증, 연 2회, 회당 400,000원.",
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
   * '연 2회' 시연값은 동일 일자 2회가 아니라
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
          "문서에 확인된 MRI 시연값(통원·비급여·비중증, 연 2회, 회당 400,000원)을 자동 입력합니다. C=M, 기존 한도 사용량 0, 각 회차 별도 통원은 데모용 계산 가정으로 함께 제안되며 다음 화면에서 사용자가 확인합니다.",
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

/** 사용자가 치료 샘플 버튼을 누른 경우에만 쓰는 입력 연습용 가정값. */
export type TreatmentSampleKind = "OUTPATIENT" | "EXAM" | "MRI";
export function loadTreatmentSample(sampleId: SampleId, generation: number, kind: TreatmentSampleKind = "MRI"): SampleScenario {
  if (kind !== "MRI") {
    const scenario = loadTreatmentSample(sampleId, generation, "MRI");
    const amount = kind === "OUTPATIENT" ? 15000 : 50000;
    const name = kind === "OUTPATIENT" ? "일반 외래 진료" : "외래 검사";
    const usage: MedicalUsage = { ...scenario.plannedUsages[0], id: `example-${kind.toLowerCase()}`, treatmentName: name,
      treatmentCategory: "", benefitClass: "COVERED", severityClass: "UNKNOWN", frequency: 1,
      unitCost: amount, coveredAmount: amount,
      note: "입력 연습용 가상 예제이며 실제 의료비나 평균 진료비가 아닙니다.",
      ...(generation === 2 || generation === 3 ? { gen23CoveredCopay: amount, gen23NonCoveredExpense: 0,
        gen23EligibleExpense: undefined, gen23AggregationUnit: undefined,
        ...(generation === 3 ? { gen23TreatmentType: "BASE", gen23ThreeNonCoveredExcludedFromBaseConfirmed: true } : {}),
      } : {}),
    };
    return { ...scenario, plannedUsages: [usage], target5GSpecialRider2: null,
      notice: `${name} 입력 예제입니다. 의원, 환자부담금 ${amount.toLocaleString("ko-KR")}원과 가입·누적 상태는 설명용 가정이며 평균 진료비가 아닙니다. 실제 정보로 수정해주세요.` };
  }
  const scenario = sampleScenarioService.load(sampleId === "LOW_USAGE" ? "NON_COVERED" : sampleId);
  const usage: MedicalUsage = {
    ...scenario.plannedUsages[0],
    id: "example-treatment-mri",
    institutionType: "CLINIC_HOSPITAL", copayInstitution: "CLINIC",
    healthInsuranceCopayRate: 0.3,
    coveredAmount: 400000,
    claimCause: "DISEASE", nationalHealthInsuranceStatus: "APPLIED",
    // 보장대상액 및 계약·누적 상태는 사실 확인값이 아니라 이 예제만의 가정이다.
    evidenceStatus: undefined,
    note: "입력 연습용 예제: 보장대상 40만원, 담보 가입·보장기간·면책 확인, 기존 지급/이용 0, 중복보험 없음 가정. 실제 계약에 사용하기 전 확인 필요.",
    ...(generation === 2 || generation === 3 ? {
      gen23CareSetting: "OUTPATIENT" as const, gen23Institution: "CLINIC" as const,
      gen23CoveredCopay: 0, gen23NonCoveredExpense: 400000,
      gen23PriorPaidBenefit: 0, gen23PriorAnnualCount: 0,
      gen23OutpatientBenefitCap: 250000, gen23PrescriptionBenefitCap: 50000,
      gen23OtherIndemnityPoliciesExist: false,
      gen23CoveragePeriod: "ACTIVE" as const, gen23CoveragePeriodConfirmed: true,
      gen23RequiredCoverageConfirmed: true, gen23PolicyExclusionsCleared: true,
      gen23SameDayAggregationConfirmed: true,
      ...(generation === 3 ? {
        gen23TreatmentType: "MRI" as const, gen23RiderEnrollmentStatus: "ENROLLED" as const,
        gen23EligibleExpense: 400000, gen23AggregationUnit: "DIAGNOSTIC_ACTION" as const,
      } : {}),
    } : {}),
  };
  return { ...scenario, plannedUsages: [usage], notice: "입력 연습용 MRI 샘플입니다. 의료비 40만원, 의원, 담보 가입·보장기간·면책 확인, 기존 지급·이용 0, 중복보험 없음은 예제 가정입니다. 실제 정보로 수정한 뒤 치료를 추가하고 확인해주세요." };
}
