import { describe, expect, it } from "vitest";
import { loadTreatmentSample, sampleScenarioService } from "../src/services/sampleScenarioService";
import { parseGen23Form, restoreGen23Form } from "../src/domain/samsungGen23Form";
import { calculateSamsungGen2Sample } from "../src/engine/calculateSamsungGen2";
import { calculateSamsungGen3Sample } from "../src/engine/calculateSamsungGen3";

describe("explicit treatment sample loading", () => {
  it.each(["LOW_USAGE", "NON_COVERED", "COVERAGE_GAP"] as const)("%s fills required Gen2/3 fields through the form", id => {
    for (const generation of [2, 3] as const) {
      const scenario = loadTreatmentSample(id, generation);
      const usage = scenario.plannedUsages[0];
      const saved = { ...usage, ...parseGen23Form(restoreGen23Form(usage)) };
      expect(saved.treatmentName).toBe("MRI");
      expect(saved.unitCost).toBe(400000);
      expect(saved.careSetting).toBe(saved.gen23CareSetting);
      expect(scenario.notice).toContain("예제 가정");
      for (const variant of ["standard", "selected2"] as const) {
        const result = (generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(variant, saved);
        expect(result).toMatchObject({status: "DRAFT_CALCULATED", claim: generation === 2 ? 250000 : 280000});
      }
    }
  });
  it("leaves the original low-usage contract sample empty and creates fresh examples", () => {
    expect(sampleScenarioService.load("LOW_USAGE").plannedUsages).toEqual([]);
    const first = loadTreatmentSample("LOW_USAGE", 5);
    first.plannedUsages[0].unitCost = 1;
    expect(loadTreatmentSample("LOW_USAGE", 5).plannedUsages[0].unitCost).toBe(400000);
    expect(first.plannedUsages[0].evidenceStatus).toBeUndefined();
  });
});

it.each(["OUTPATIENT", "EXAM"] as const)("%s covers common base-treatment examples without MRI rider fields", kind => {
  for (const generation of [2, 3] as const) {
    const sample = loadTreatmentSample("LOW_USAGE", generation, kind);
    const usage = sample.plannedUsages[0];
    expect(usage.benefitClass).toBe("COVERED");
    expect(usage.frequency).toBe(1);
    expect(usage.gen23AggregationUnit).toBeUndefined();
    expect(sample.notice).toContain("평균 진료비가 아닙니다");
    for (const variant of ["standard", "selected2"] as const) {
      expect((generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(variant, usage).status).toBe("DRAFT_CALCULATED");
    }
  }
});
