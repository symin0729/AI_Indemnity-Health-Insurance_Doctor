import type { InsuranceGeneration } from "./insurance";

export type ProductVerificationStatus =
  | "PENDING_SELECTION"
  | "PENDING_EVIDENCE"
  | "REVIEW_REQUIRED"
  | "SOURCE_VERIFIED"
  | "VERIFIED"
  | "RETIRED";

export interface InsuranceProduct {
  productCode: string;
  insurer: "삼성화재";
  generation: InsuranceGeneration;
  productName: string;
  sampleLabel: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  variants: string[];
  requiredSelections: string[];
  verificationStatus: ProductVerificationStatus;
  calculationEnabled: boolean;
  ruleSetIds: string[];
  documentIds: string[];
  verifiedAt: string | null;
}
