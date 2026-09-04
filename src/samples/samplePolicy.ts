import type {
  InsuranceContract,
} from "../domain/insurance";

export const SAMPLE_POLICY:
  InsuranceContract = {
  insurer: "INS_001",

  productName:
    "무배당 실손의료비보험",

  inceptionDate:
    "2018-03-01",

  generation: 3,

  monthlyPremium: 60000,

  renewalCycleMonths: 12,

  reentryCycleMonths: 180,

  /*
   * 원본 샘플의 비급여 특약과
   * 현재 MVP의 SPECIAL_RIDER_2를
   * 동일하다고 임의 판단하지 않습니다.
   */
  coverages: [],
};