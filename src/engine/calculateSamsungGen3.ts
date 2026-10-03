import standard from "../../knowledge/drafts/samsung/executable-specs/SAMSUNG_1704_1.standard.execution-spec.draft.json";
import selected2 from "../../knowledge/drafts/samsung/executable-specs/SAMSUNG_1704_1.selected2.execution-spec.draft.json";
import type { MedicalUsage } from "../domain/medical";
import { calculateGen23Sample, type Gen23Variant } from "./samsungGen23Adapter";
export function calculateSamsungGen3Sample(variant: Gen23Variant, usage: MedicalUsage, mode: "SAMPLE_SIMULATION" | "ACTUAL_CONTRACT" = "SAMPLE_SIMULATION") {
  return calculateGen23Sample(3, variant, usage, { standard, selected2 }, mode);
}
