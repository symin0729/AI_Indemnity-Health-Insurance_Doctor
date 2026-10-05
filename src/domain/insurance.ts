export type InsuranceGeneration =
  | 1
  | 2
  | 3
  | 4
  | 5;

export interface InsuranceContract {
  insurer: string;

  productName: string;

  /** 1세대 외에는 계산용 내부 값과 별개로 사용자가 입력한 표시용 이름. 비어 있으면 OO로 표시한다. */
  insurerLabel?: string;

  productLabel?: string;

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
