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

  /**
   * 갱신 주기(개월)
   * 사용자가 모를 수 있으므로 null 허용
   */
  renewalCycleMonths: number | null;

  /**
   * 재가입 주기(개월)
   * 사용자가 모를 수 있으므로 null 허용
   */
  reentryCycleMonths: number | null;

  coverages: string[];
}
