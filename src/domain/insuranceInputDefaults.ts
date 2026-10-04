import type { InsuranceGeneration } from "./insurance";
import type { CareSetting } from "./medical";

// 프로젝트에서 지정한 가입일 경계. UTC로 비교해 시간대 영향을 제거한다.
const GENERATION_STARTS = [
  [Date.UTC(2026, 4, 6), 5], [Date.UTC(2021, 6, 1), 4],
  [Date.UTC(2017, 3, 1), 3], [Date.UTC(2009, 9, 1), 2],
] as const;
export function generationForInceptionDate(value: string): InsuranceGeneration | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return undefined;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return GENERATION_STARTS.find(([start]) => date.getTime() >= start)?.[1] ?? 1;
}
export function formatInceptionDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
export function generationSalesPeriod(generation: InsuranceGeneration): string {
  return ({ 1: "2009.9.30 이전 가입", 2: "2009.10.1 ~ 2017.3.31 가입", 3: "2017.4.1 ~ 2021.6.30 가입", 4: "2021.7.1 ~ 2026.5.5 가입", 5: "2026.5.6 이후 가입" } as const)[generation];
}
export function inceptionDateForGeneration(generation: Exclude<InsuranceGeneration, 5>): string {
  return ({
    1: "2009-09-30",
    2: "2009-10-01",
    3: "2017-04-01",
    4: "2021-07-01",
  } as const)[generation];
}
export type CopayInstitution = "TERTIARY" | "GENERAL" | "HOSPITAL" | "CLINIC" | "PUBLIC_HEALTH";
export type CopayRegion = "DONG" | "EUP_MYEON";
export function generalPatientCopayPercent(care: CareSetting, institution?: CopayInstitution, region?: CopayRegion): number | undefined {
  // 일반 급여 입원진료에 한정. 식대 및 상급병실 비용은 별도이다.
  if (care === "INPATIENT") return 20;
  if (institution === "CLINIC") return 30;
  if (!region) return undefined;
  if (institution === "GENERAL") return region === "DONG" ? 50 : 45;
  if (institution === "HOSPITAL") return region === "DONG" ? 40 : 35;
  // 진찰료/나머지 비용, 정액/정률을 단일 비율로 변환하지 않는다.
  return undefined;
}
