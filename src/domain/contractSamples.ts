import type { InsuranceGeneration } from "./insurance";

/** STEP 1 '샘플 불러오기'에서 고르는 세대별 현재 계약 샘플. 값은 설명용 가정이며 실제 계약이 아니다. */
export type ContractSampleId = "GEN1" | "GEN2" | "GEN3" | "GEN4";

export interface ContractSample {
  id: ContractSampleId;
  generation: Exclude<InsuranceGeneration, 5>;
  label: string;
  /** 선택 창에 보이는 한 줄 설명 */
  description: string;
  inceptionDate: string;
  monthlyPremium: number;
}

export const CONTRACT_SAMPLES: readonly ContractSample[] = [
  { id: "GEN1", generation: 1, label: "1세대 샘플", description: "삼성화재 대표상품(0904.2) · 가입 2008-06-01 · 상해·질병 입원 특약 가입 · 월 70,000원", inceptionDate: "2008-06-01", monthlyPremium: 70_000 },
  { id: "GEN2", generation: 2, label: "2세대 샘플", description: "표준형(1611.7) · 가입 2016-03-01 · 입원 5천만원, 외래 25만원, 처방 5만원 · 월 45,000원", inceptionDate: "2016-03-01", monthlyPremium: 45_000 },
  { id: "GEN3", generation: 3, label: "3세대 샘플", description: "표준형(1704.1) · 가입 2018-03-01 · 3대 비급여 특약 모두 가입 · 월 60,000원", inceptionDate: "2018-03-01", monthlyPremium: 60_000 },
  { id: "GEN4", generation: 4, label: "4세대 샘플", description: "4세대(2107.1) · 가입 2022-03-01 · 비급여 특약 가입, 약관 최대 가입금액 · 월 40,000원", inceptionDate: "2022-03-01", monthlyPremium: 40_000 },
];

/** 4세대 샘플의 가입금액(약관 최대값). */
export const GEN4_SAMPLE_CONTRACT_FACTS = {
  coveredBenefitCap: "50000000",
  coveredOutpatientCap: "200000",
  nonCoveredBenefitCap: "50000000",
  nonCoveredOutpatientCap: "200000",
} as const;

/** 5세대 조건(STEP 3) 샘플의 가입금액(설명용 가정). 급여 연 5천만·통원 20만, 중증 비급여(특약1) 5천만, 비중증 비급여(특약2) 1천만원. */
export const TARGET_SAMPLE_CONTRACT_FACTS = {
  coveredBenefitCap: "50000000",
  coveredOutpatientCap: "200000",
  nonCoveredBenefitCap: "50000000",
  nonSevereBenefitCap: "10000000",
} as const;
