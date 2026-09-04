export type InsuranceGeneration =
  | 1
  | 2
  | 3
  | 4
  | 5;

export interface InsuranceContract {
  insurer: string;

  productName: string;

  inceptionDate: string;

  generation: InsuranceGeneration;

  monthlyPremium: number;

  // 갱신주기: 개월 단위
  renewalCycleMonths: number;

  // 재가입주기: 개월 단위
  reentryCycleMonths: number;

  coverages: string[];
}