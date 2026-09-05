import type {
  MedicalUsage,
} from "../domain/medical";

import type {
  SampleId,
} from "./samplePolicyService";

export interface SampleScenario {
  sampleId: SampleId;

  plannedUsages: MedicalUsage[];

  /**
   * null이면 문서에서 확정되지 않은 값이라
   * 자동으로 체크 상태를 바꾸지 않는다.
   */
  target5GSpecialRider2:
    boolean | null;

  notice: string;
}

/**
 * 문서에서 실제 수치까지 확인 가능한
 * 예정 의료이용 샘플.
 *
 * MRI / 통원 / 비급여 / 비중증
 * 연 2회 / 회당 400,000원
 */
const VERIFIED_MRI_USAGE:
  MedicalUsage = {
  id: "sample-mri-001",

  treatmentName: "MRI",

  careSetting:
    "OUTPATIENT",

  benefitClass:
    "NON_COVERED",

  severityClass:
    "NON_SEVERE",

  frequency: 2,

  unitCost: 400000,
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

        notice:
          "문서에 확인된 MRI 시연값을 예정 치료에 자동 입력합니다. 5세대 비중증 비급여 통원 비교 시연용입니다.",
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

        notice:
          "문서에 확인된 MRI 시연값을 사용하고, 5세대 비급여 특약2 미가입 조건으로 보장 제외 흐름을 확인합니다.",
      };
    }

    /**
     * LOW_USAGE는 PM 문서에
     * 치료 종류·횟수·금액이 확정되어 있지 않다.
     *
     * 임의로 1회, 100,000원 같은 값을
     * 생성하지 않고 계약 샘플만 불러온 뒤
     * 사용자가 예정 치료를 직접 입력한다.
     */
    return {
      sampleId,

      plannedUsages: [],

      target5GSpecialRider2:
        null,

      notice:
        "저이용 샘플의 치료 횟수와 금액은 현재 문서에 확정값이 없어 예정 치료를 자동 생성하지 않습니다. 필요한 치료를 직접 입력해주세요.",
    };
  },
};
