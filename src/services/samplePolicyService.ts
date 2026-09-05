import type {
  InsuranceContract,
} from "../domain/insurance";

export type SampleId =
  | "LOW_USAGE"
  | "NON_COVERED"
  | "COVERAGE_GAP";

export interface SamplePolicyOption {
  id: SampleId;
  label: string;
  description: string;
}

export const SAMPLE_POLICY_OPTIONS: SamplePolicyOption[] = [
  {
    id: "LOW_USAGE",
    label: "저이용",
    description:
      "의료이용이 적은 상황을 확인하기 위한 시연용 샘플입니다.",
  },
  {
    id: "NON_COVERED",
    label: "비중증 비급여",
    description:
      "비중증 비급여 의료이용 비교를 확인하기 위한 시연용 샘플입니다.",
  },
  {
    id: "COVERAGE_GAP",
    label: "보장 제외",
    description:
      "보장 제외 의료비가 발생할 수 있는 조건을 확인하기 위한 시연용 샘플입니다.",
  },
];

/**
 * PM/API 문서에서 확인된 시연용 현재 계약값.
 *
 * - 가입일 2018-03-01
 * - 3세대
 * - 월 보험료 60,000원
 * - 갱신주기 12개월
 * - 재가입주기 180개월
 * - 비급여 특약(NON_COVERED) 가입
 *
 * SPECIAL_RIDER_2는 5세대 비교용 특약 코드이므로
 * 현재 3세대 계약에 임의로 추가하지 않는다.
 */
const VERIFIED_SAMPLE_CONTRACT: InsuranceContract = {
  insurer: "INS_001",
  productName: "무배당 실손의료비보험",
  inceptionDate: "2018-03-01",
  generation: 3,
  monthlyPremium: 60000,
  renewalCycleMonths: 12,
  reentryCycleMonths: 180,
  coverages: ["NON_COVERED"],
};

export interface SamplePolicyService {
  load(sampleId: SampleId): InsuranceContract;
}

export const samplePolicyService: SamplePolicyService = {
  load(sampleId: SampleId): InsuranceContract {
    const supported =
      SAMPLE_POLICY_OPTIONS.some(
        (option) =>
          option.id === sampleId
      );

    if (!supported) {
      throw new Error(
        "지원하지 않는 샘플 보험증권입니다."
      );
    }

    return {
      ...VERIFIED_SAMPLE_CONTRACT,
      coverages: [
        ...VERIFIED_SAMPLE_CONTRACT.coverages,
      ],
    };
  },
};
