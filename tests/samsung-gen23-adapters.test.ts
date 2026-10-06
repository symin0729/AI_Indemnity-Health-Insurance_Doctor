import { genericGen23CareSetting, syncGen23CareSetting, gen23CareSettingError, gen23CareSettingLabel } from "../src/domain/samsungGen23CareSetting";
import { describe, expect, it } from "vitest";
import { calculateSamsungGen2Sample as gen2 } from "../src/engine/calculateSamsungGen2";
import { calculateSamsungGen3Sample as gen3 } from "../src/engine/calculateSamsungGen3";
import { gen23Input } from "../src/engine/samsungGen23Adapter";
import { parseGen23Form, restoreGen23Form } from "../src/domain/samsungGen23Form";
import { useAnalysisStore } from "../src/store/useAnalysisStore";
import type { MedicalUsage } from "../src/domain/medical";
const usage: MedicalUsage = {
  id: "test", treatmentName: "검산", careSetting: "INPATIENT", benefitClass: "NON_COVERED", severityClass: "UNKNOWN", frequency: 1, unitCost: 123456,
  claimCause: "DISEASE", nationalHealthInsuranceStatus: "APPLIED", gen23CareSetting: "INPATIENT",
  gen23CoveredCopay: 100000, gen23NonCoveredExpense: 0, gen23InpatientExcludingRoomDifference: 100000,
  gen23RoomDifference: 0, gen23PriorEligibleDeductible: 0, gen23PriorPaidBenefit: 0, gen23PriorAnnualCount: 0,
  gen23ContractBenefitCap: 50000000, gen23OutpatientBenefitCap: 250000, gen23PrescriptionBenefitCap: 50000,
  gen23OtherIndemnityPoliciesExist: false, gen23CoveragePeriod: "ACTIVE", gen23CoveragePeriodConfirmed: true,
  gen23RequiredCoverageConfirmed: true, gen23PolicyExclusionsCleared: true, gen23SameDayAggregationConfirmed: true,
  gen23TreatmentType: "BASE", gen23RiderEnrollmentStatus: "ENROLLED", gen23Institution: "CLINIC",
  gen23ThreeNonCoveredExcludedFromBaseConfirmed: true,
};
describe("Gen2/Gen3 adapters", () => {
  it.each([
    ["standard", "INPATIENT", "G2-STD-01",80000], ["standard","OUTPATIENT","G2-STD-02",80000], ["standard","PRESCRIPTION","G2-STD-03",50000],
    ["selected2","INPATIENT","G2-SEL2-01",90000], ["selected2","OUTPATIENT","G2-SEL2-02",90000], ["selected2","PRESCRIPTION","G2-SEL2-03",50000],
  ] as const)("Gen2 %s %s", (variant, care, ruleId, claim) => {
    const u = { ...usage, careSetting: genericGen23CareSetting(care)!, gen23CareSetting: care };
    expect(gen2(variant,u)).toMatchObject({ status:"DRAFT_CALCULATED",ruleId,claim });
    expect(gen2(variant,{...u,gen23PolicyExclusionsCleared:undefined}).status).toBe("CONFIRMATION_REQUIRED");
  });
  it.each([
    ["standard","INPATIENT","G3-STD-BASE-01",80000], ["standard","OUTPATIENT","G3-STD-BASE-02",80000], ["standard","PRESCRIPTION","G3-STD-BASE-03",50000],
    ["selected2","INPATIENT","G3-SEL2-01",90000], ["selected2","OUTPATIENT","G3-SEL2-BASE-02",90000], ["selected2","PRESCRIPTION","G3-SEL2-BASE-03",50000],
  ] as const)("Gen3 base %s %s", (variant, care, ruleId, claim) => {
    const u={...usage,careSetting:genericGen23CareSetting(care)!,gen23CareSetting:care};
    expect(gen3(variant,u)).toMatchObject({status:"DRAFT_CALCULATED",ruleId,claim});
    expect(gen3(variant,{...u,gen23RiderEnrollmentStatus:"UNKNOWN"}).status).toBe("CONFIRMATION_REQUIRED");
  });
  it.each([
    ["MANUAL_THERAPY","TREATMENT","G3-STD-01"], ["INJECTION","VISIT","G3-STD-02"], ["MRI","DIAGNOSTIC_ACTION","G3-STD-03"],
  ] as const)("Gen3 %s rider and selected2 routing", (type,unit,ruleId) => {
    const u: MedicalUsage={...usage, gen23TreatmentType:type,gen23AggregationUnit:unit,gen23EligibleExpense:100000,gen23InjectionRiderEligibleConfirmed:true};
    expect(gen3("standard",u)).toMatchObject({status:"DRAFT_CALCULATED",ruleId,claim:70000});
    expect(gen3("selected2",u)).toMatchObject({status:"DRAFT_CALCULATED",ruleId:"G3-SEL2-02",claim:70000});
    expect(gen3("standard",{...u,gen23AggregationUnit:undefined}).status).toBe("CONFIRMATION_REQUIRED");
    expect(gen3("selected2",{...u,gen23RiderEnrollmentStatus:"UNKNOWN"}).status).toBe("CONFIRMATION_REQUIRED");
    expect(gen3("standard",{...u,gen23RiderEnrollmentStatus:"NOT_ENROLLED"})).toMatchObject({status:"NOT_ENROLLED",claim:0});
  });
  it("never substitutes old unitCost/coveredAmount for missing precise amounts", () => {
    const input=gen23Input({...usage,coveredAmount:999999,gen23CoveredCopay:undefined,gen23NonCoveredExpense:undefined},"standard",2);
    expect(input.eligibleExpense).toBeUndefined();
    expect(gen2("standard",{...usage,careSetting:"OUTPATIENT",gen23CareSetting:"OUTPATIENT",gen23CoveredCopay:undefined}).status).toBe("CONFIRMATION_REQUIRED");
  });
  it("keeps UNKNOWN and actual-contract activation blocked", () => {
    for(const calc of [gen2,gen3]) {
      expect(calc("UNKNOWN",usage).status).toBe("CONFIRMATION_REQUIRED");
      expect(calc("standard",usage,"ACTUAL_CONTRACT").status).toBe("RULE_NOT_VERIFIED");
      expect(calc("standard",{...usage,gen23PriorPaidBenefit:NaN}).status).toBe("CONFIRMATION_REQUIRED");
    }
  });
  it("passes caps and proportional factor unchanged", () => {
    expect(gen2("standard",{...usage,gen23RoomDifference:400000,gen23InpatientDays:1,gen23PriorEligibleDeductible:1990000,gen23OtherIndemnityPoliciesExist:true,gen23ProportionalPaymentFactor:.5})).toMatchObject({claim:95000});
    expect(gen2("standard",{...usage,careSetting:"OUTPATIENT",gen23CareSetting:"OUTPATIENT",gen23PriorAnnualCount:180})).toMatchObject({claim:0});
  });
});
describe("M02 precise form → MedicalUsage → store", () => {
  it("round-trips values including zero and false without leaking into a blank next treatment", () => {
    const fields=parseGen23Form(restoreGen23Form(usage));
    useAnalysisStore.getState().setUsages([{...usage,...fields}]);
    const saved=useAnalysisStore.getState().usages[0];
    expect(saved.gen23RoomDifference).toBe(0); expect(saved.gen23OtherIndemnityPoliciesExist).toBe(false);
    expect(gen2("standard",saved)).toMatchObject({claim:80000});
    expect(parseGen23Form({}).gen23RoomDifference).toBeUndefined();
    expect(restoreGen23Form({}).gen23PriorPaidBenefit).toBe("");
    useAnalysisStore.getState().resetAnalysis(); expect(useAnalysisStore.getState().usages).toEqual([]);
  });
  it("allows blank, rejects invalid numeric values", () => {
    expect(parseGen23Form({gen23CoveredCopay:"  "}).gen23CoveredCopay).toBeUndefined();
    for(const v of ["-1","NaN","Infinity","-Infinity"]) expect(()=>parseGen23Form({gen23PriorPaidBenefit:v})).toThrow();
  });
});

describe("M02 care selection → saved usage → M03 → adapter", () => {
  it.each([
    [2, "standard", "INPATIENT", "OUTPATIENT", "G2-STD-02"],
    [2, "standard", "OUTPATIENT", "INPATIENT", "G2-STD-01"],
    [2, "selected2", "INPATIENT", "OUTPATIENT", "G2-SEL2-02"],
    [2, "selected2", "OUTPATIENT", "INPATIENT", "G2-SEL2-01"],
    [3, "standard", "INPATIENT", "OUTPATIENT", "G3-STD-BASE-02"],
    [3, "standard", "OUTPATIENT", "INPATIENT", "G3-STD-BASE-01"],
    [3, "selected2", "INPATIENT", "OUTPATIENT", "G3-SEL2-BASE-02"],
    [3, "selected2", "OUTPATIENT", "INPATIENT", "G3-SEL2-01"],
  ] as const)("Gen%s %s %s → %s", (generation, variant, first, next, ruleId) => {
    // M02's two onChange handlers use these same transitions.
    let form = { ...restoreGen23Form(usage), gen23CareSetting: first as string };
    let careSetting = genericGen23CareSetting(form.gen23CareSetting)!;
    expect(careSetting).toBe(first);
    careSetting = next;
    form = { ...form, gen23CareSetting: syncGen23CareSetting(next, form.gen23CareSetting) };
    const pending = { ...usage, ...parseGen23Form(form), careSetting };
    expect(gen23CareSettingError(pending)).toBeUndefined();
    useAnalysisStore.getState().setUsages([pending]);
    const saved = useAnalysisStore.getState().usages[0];
    expect(saved.careSetting).toBe(next);
    expect(saved.gen23CareSetting).toBe(next);
    expect(gen23CareSettingLabel(saved)).toBe(next === "INPATIENT" ? "입원" : "통원");
    expect((generation === 2 ? gen2 : gen3)(variant, saved)).toMatchObject({ status: "DRAFT_CALCULATED", ruleId });
    useAnalysisStore.getState().resetAnalysis();
  });
  it.each(["INPATIENT", "OUTPATIENT"] as const)("blocks directly supplied mismatches: %s", careSetting => {
    const invalid = { ...usage, careSetting, gen23CareSetting: careSetting === "INPATIENT" ? "OUTPATIENT" as const : "INPATIENT" as const };
    expect(gen23CareSettingError(invalid)).toContain("불일치");
    expect(gen23CareSettingLabel(invalid)).toContain("불일치");
    for (const calc of [gen2, gen3]) for (const variant of ["standard", "selected2"] as const) {
      expect(calc(variant, invalid)).toMatchObject({ status: "CONFIRMATION_REQUIRED", claim: null, reason: expect.stringContaining("불일치") });
      expect(calc(variant, invalid)).not.toHaveProperty("ruleId");
    }
  });
  it("preserves prescription and does not infer missing or UNKNOWN care", () => {
    expect(syncGen23CareSetting("OUTPATIENT", "PRESCRIPTION")).toBe("PRESCRIPTION");
    expect(gen23CareSettingError({ careSetting: "OUTPATIENT", gen23CareSetting: "PRESCRIPTION" })).toBeUndefined();
    for (const value of [undefined, "", "UNKNOWN"]) {
      expect(genericGen23CareSetting(value)).toBeUndefined();
      const missing = { ...usage, ...parseGen23Form({ gen23CareSetting: value }) };
      expect(missing.gen23CareSetting).toBeUndefined();
      for (const calc of [gen2, gen3]) expect(calc("standard", missing)).toMatchObject({status: "CONFIRMATION_REQUIRED", claim: null});
    }
  });
});

describe("Gen23 actual terms references", () => {
  it.each(["standard", "selected2"] as const)("preserves RuleId and references injury/disease clauses for %s", variant => {
    for (const calc of [gen2, gen3]) for (const claimCause of ["INJURY", "DISEASE"] as const) {
      for (const care of ["INPATIENT", "OUTPATIENT", "PRESCRIPTION"] as const) {
        const result = calc(variant, { ...usage, claimCause, careSetting: genericGen23CareSetting(care)!, gen23CareSetting: care });
        expect(result.status).toBe("DRAFT_CALCULATED");
        const reference = "termsReference" in result ? result.termsReference : "";
        expect(reference).toContain(variant === "standard" ? "1종 표준형" : "2종 선택형Ⅱ");
        expect(reference).toContain(claimCause === "INJURY" ? care === "INPATIENT" ? "(1) 상해입원" : "(2) 상해통원" : care === "INPATIENT" ? "(3) 질병입원" : "(4) 질병통원");
        expect(reference).toContain("인쇄");
      }
    }
  });
  it.each([
    ["MANUAL_THERAPY", "TREATMENT", "PDF 165~167쪽 / 인쇄 129~131쪽"],
    ["INJECTION", "VISIT", "PDF 172~174쪽 / 인쇄 136~138쪽"],
    ["MRI", "DIAGNOSTIC_ACTION", "PDF 180~181쪽 / 인쇄 144~145쪽"],
  ] as const)("routes both variants to the actual %s rider", (category, unit, pages) => {
    for (const variant of ["standard", "selected2"] as const) {
      const result = gen3(variant, { ...usage, gen23TreatmentType: category, gen23AggregationUnit: unit, gen23EligibleExpense: 100000, gen23InjectionRiderEligibleConfirmed: true });
      expect(result).toMatchObject({ status: "DRAFT_CALCULATED", claim: 70000, termsReference: expect.stringContaining(pages) });
    }
  });
});
