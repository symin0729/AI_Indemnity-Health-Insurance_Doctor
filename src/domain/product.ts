import type { InsuranceGeneration } from "./insurance";

export type ProductReviewStatus =
  | "PENDING_SELECTION"
  | "PENDING_EVIDENCE"
  | "VERIFIED"
  | "RETIRED";

export interface InsuranceProduct {
  productCode: string;
  insurer: "SAMSUNG";
  insurerName: string;
  generation: InsuranceGeneration;
  displayName: string;
  reviewStatus: ProductReviewStatus;
  ruleSetFile: string;
  evidenceDocumentIds: string[];
  verifiedAt: string | null;
}
