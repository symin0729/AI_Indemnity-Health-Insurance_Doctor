export type CareSetting =
  | "INPATIENT"
  | "OUTPATIENT";

export type BenefitClass =
  | "COVERED"
  | "NON_COVERED"
  | "UNKNOWN";

export type SeverityClass =
  | "SEVERE"
  | "NON_SEVERE"
  | "UNKNOWN";

export interface MedicalUsage {
  id: string;

  treatmentName: string;

  careSetting: CareSetting;

  benefitClass: BenefitClass;

  severityClass: SeverityClass;

  frequency: number;

  unitCost: number;
}