export type InsuranceGeneration = 1 | 2 | 3 | 4 | 5;

export interface InsuranceContract {
  insurer: string;
  productName: string;
  inceptionDate: string;
  generation: InsuranceGeneration;
  monthlyPremium: number;
  coverages: string[];
}