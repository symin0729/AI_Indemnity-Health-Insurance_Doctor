import { describe, expect, it } from "vitest";
import { GEN3_RIDER_DEFAULT } from "../src/domain/gen3Riders";
import type { MedicalUsage } from "../src/domain/medical";
import { buildSubmission, isUnregisteredVariantSelected, isValidIsoDate, validateContractStep, type SubmissionInput } from "../src/pages/M02InputPage/inputModel";

/**
 * 입력 화면(M02)의 검증 순서·오류 문구·저장 값을 고정한다.
 * 화면을 단계별로 나누는 작업 전후에 이 결과가 같아야 한다.
 */
const usage = (over: Partial<MedicalUsage> = {}) =>
  ({ id: "u1", treatmentName: "치료", careSetting: "OUTPATIENT", frequency: 1, unitCost: 100000, ...over }) as MedicalUsage;

const valid = (over: Partial<SubmissionInput> = {}): SubmissionInput => ({
  generation: 3,
  generationSelected: true,
  insurerLabel: "내 보험사",
  productLabel: "내 상품",
  inceptionDate: "2018-03-01",
  monthlyPremium: "60000",
  renewalCycleMonths: "12",
  reentryCycleYears: "15",
  samsungGen23Variant: "standard",
  gen1Product: "UNKNOWN",
  gen1ContractBasis: "SAMPLE_SIMULATION",
  gen1D1Coverage: "UNKNOWN",
  gen4NonCoveredRider: "NOT_ENROLLED",
  gen3Riders: GEN3_RIDER_DEFAULT,
  target5GMonthlyPremium: "30000",
  hasTarget5GSpecialRider1: false,
  hasTarget5GSpecialRider2: false,
  plannedUsages: [usage()],
  editingUsageId: null,
  selectedSampleId: null,
  isSampleConfirmed: false,
  isTargetPremiumHelpConfirmed: true,
  isTreatmentHelpConfirmed: true,
  isStep3Confirmed: true,
  calculationAssumptions: { assumeEntireMedicalCostCovered: false, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: false },
  ...over,
});

const fail = (over: Partial<SubmissionInput>) => buildSubmission(valid(over));

describe("isValidIsoDate", () => {
  it.each([["2018-03-01", true], ["2018-02-30", false], ["2018-3-1", false], ["", false], ["2018-13-01", false]])("%s → %s", (value, expected) => {
    expect(isValidIsoDate(value)).toBe(expected);
  });
});

describe("validateContractStep (STEP 1 다음)", () => {
  const base = { inceptionDate: "2018-03-01", gen1D1Coverage: "NONE" as const, generation: 3 as const, generationSelected: true, insurerLabel: "", productLabel: "", monthlyPremium: "60000", samsungGen23Variant: "standard" as const, gen1Product: "UNKNOWN" as const };
  it("통과하면 null", () => expect(validateContractStep(base)).toBeNull());
  it("5세대 시기 가입일은 현재 계약으로 입력할 수 없다", () => {
    const failure = { ok: false, message: "가입일이 5세대 시기(2026.5.6 이후)입니다. 현재 계약은 1~4세대만 입력할 수 있습니다.", focusId: "generation-select" };
    expect(validateContractStep({ ...base, inceptionDate: "2026-06-01" })).toEqual(failure);
    expect(validateContractStep({ ...base, inceptionDate: "2026-05-05" })).toBeNull();
  });
  it("실손 세대를 고르지 않았으면 가장 먼저 막는다", () => {
    expect(validateContractStep({ ...base, generationSelected: false, monthlyPremium: "" })).toEqual({ ok: false, message: "실손 세대를 선택해주세요.", focusId: "generation-select" });
  });
  it("월 보험료가 없거나 0 이하면 가장 먼저 막는다", () => {
    expect(validateContractStep({ ...base, monthlyPremium: "" })).toEqual({ ok: false, message: "현재 월 보험료를 입력해주세요." });
    expect(validateContractStep({ ...base, monthlyPremium: "0", samsungGen23Variant: "UNKNOWN" })).toEqual({ ok: false, message: "현재 월 보험료를 입력해주세요." });
  });
  it("1세대에서 대표 상품이 아닌 보험사를 고르면 보험사·상품명 입력이 필요하다", () => {
    expect(validateContractStep({ ...base, generation: 1, gen1Product: "OTHER_POST" })).toEqual({ ok: false, message: "보험사와 상품명을 입력해주세요." });
    expect(validateContractStep({ ...base, generation: 1, insurerLabel: "우체국보험", productLabel: "", gen1Product: "OTHER_POST" })).toEqual({ ok: false, message: "보험사와 상품명을 입력해주세요." });
  });
  it("1세대 대표 상품(OO 보험)은 이름을 비워도 된다(OO로 표시)", () => {
    expect(validateContractStep({ ...base, generation: 1, gen1Product: "SAMSUNG_0904_2", gen1D1Coverage: "BOTH" })).toBeNull();
  });
  it("2·3세대는 상품 종형을 골라야 한다", () => {
    expect(validateContractStep({ ...base, samsungGen23Variant: "UNKNOWN" })).toEqual({ ok: false, message: "3세대 실손보험의 상품 종형을 반드시 선택해주세요.", focusId: "samsung-gen23-variant" });
    expect(validateContractStep({ ...base, generation: 2, samsungGen23Variant: "UNKNOWN" })?.message).toBe("2세대 실손보험의 상품 종형을 반드시 선택해주세요.");
  });
  it("약관 규칙이 없는 종형은 안내 영역을 보여주며 막는다", () => {
    expect(validateContractStep({ ...base, generation: 2, samsungGen23Variant: "unified2009" })).toEqual({ ok: false, reveal: "UNREGISTERED_VARIANT" });
    expect(validateContractStep({ ...base, generation: 1, insurerLabel: "우체국보험", productLabel: "x", gen1Product: "OTHER_POST" })).toEqual({ ok: false, reveal: "UNREGISTERED_VARIANT" });
  });
  it("1세대 대표 상품은 D1 특약(상해/질병)을 하나 이상 체크해야 한다", () => {
    const g1 = { ...base, generation: 1 as const, gen1Product: "SAMSUNG_0904_2" as const };
    expect(validateContractStep({ ...g1, gen1D1Coverage: "NONE" })).toEqual({ ok: false, message: "가입한 특약을 하나 이상 선택해주세요.", focusId: "gen1-d1-injury" });
    for (const coverage of ["INJURY", "DISEASE", "BOTH"] as const) expect(validateContractStep({ ...g1, gen1D1Coverage: coverage })).toBeNull();
  });
  it("1세대 종형(상품) 미선택", () => {
    expect(validateContractStep({ ...base, generation: 1, gen1Product: "UNKNOWN" })).toEqual({ ok: false, message: "1세대 실손보험의 가입 상품을 반드시 선택해주세요.", focusId: "samsung-gen1-product" });
  });
  it("4세대는 종형 검증이 없다", () => expect(validateContractStep({ ...base, generation: 4, samsungGen23Variant: "UNKNOWN" })).toBeNull());
});

describe("isUnregisteredVariantSelected", () => {
  it("판정 규칙", () => {
    const b = { gen1Product: "UNKNOWN" as const, samsungGen23Variant: "UNKNOWN" as const };
    expect(isUnregisteredVariantSelected({ ...b, generation: 3, samsungGen23Variant: "standard" })).toBe(false);
    expect(isUnregisteredVariantSelected({ ...b, generation: 2, samsungGen23Variant: "selected2013" })).toBe(true);
    expect(isUnregisteredVariantSelected({ ...b, generation: 3 })).toBe(false);
    expect(isUnregisteredVariantSelected({ ...b, generation: 1, gen1Product: "SAMSUNG_0904_2" })).toBe(false);
    expect(isUnregisteredVariantSelected({ ...b, generation: 4, samsungGen23Variant: "unified2009" })).toBe(false);
  });
});

describe("buildSubmission 검증 순서와 문구 (확인 화면으로 가기 전)", () => {
  it("순서: 안내 확인 → 치료 안내 → 체크 → 치료 등록 → 수정 중", () => {
    expect(fail({ isTargetPremiumHelpConfirmed: false, isTreatmentHelpConfirmed: false })).toEqual({ ok: false, reveal: "TARGET_PREMIUM_HELP" });
    expect(fail({ isTreatmentHelpConfirmed: false, isStep3Confirmed: false })).toEqual({ ok: false, message: "STEP 3의 필수 입력 안내를 읽고 확인해주세요." });
    expect(fail({ isStep3Confirmed: false })).toEqual({ ok: false, message: "입력 내용을 확인하고 ‘예정치료를 입력하셨나요?’에 체크해주세요." });
    expect(fail({ plannedUsages: [] })).toEqual({ ok: false, message: "예정 치료를 입력한 뒤 하단의 ‘추가하기’ 버튼을 눌러 등록해주세요.", goToStep: 2 });
    expect(fail({ editingUsageId: "u1" })).toEqual({ ok: false, message: "수정 중인 예정 치료는 ‘수정 확인’ 버튼을 눌러 저장해주세요.", goToStep: 2 });
  });
  it("확인 화면으로 가기 전에도 실손 세대 선택을 확인하고 1단계로 돌려보낸다", () => {
    expect(fail({ generationSelected: false })).toEqual({ ok: false, message: "실손 세대를 선택해주세요.", focusId: "generation-select", goToStep: 1 });
  });
  it("확인 화면으로 가기 전에도 1세대 D1 특약 선택을 확인한다", () => {
    expect(fail({ generation: 1, gen1Product: "SAMSUNG_0904_2", gen1D1Coverage: "NONE" })).toEqual({ ok: false, message: "가입한 특약을 하나 이상 선택해주세요.", focusId: "gen1-d1-injury" });
  });
  it("확인 화면으로 가기 전에도 5세대 시기 가입일을 막는다", () => {
    expect(fail({ inceptionDate: "2026-06-01" })).toEqual({ ok: false, message: "가입일이 5세대 시기(2026.5.6 이후)입니다. 현재 계약은 1~4세대만 입력할 수 있습니다.", focusId: "generation-select" });
  });
  it("계약 정보 검증 문구", () => {
    expect(fail({ generation: 1, gen1Product: "OTHER_POST", insurerLabel: "", productLabel: "x" })).toEqual({ ok: false, message: "보험사를 입력해주세요." });
    expect(fail({ generation: 1, gen1Product: "OTHER_POST", insurerLabel: "a", productLabel: "" })).toEqual({ ok: false, message: "보험 상품명을 입력해주세요." });
    expect(fail({ inceptionDate: "" })).toEqual({ ok: false, message: "보험 가입일을 입력해주세요." });
    expect(fail({ inceptionDate: "2018-02-30" })).toEqual({ ok: false, message: "보험 가입일은 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요." });
    expect(fail({ samsungGen23Variant: "UNKNOWN" })).toEqual({ ok: false, message: "3세대 실손보험의 상품 종형을 반드시 선택해주세요.", focusId: "samsung-gen23-variant" });
    expect(fail({ generation: 3, samsungGen23Variant: "standard2013" })).toEqual({ ok: false, reveal: "UNREGISTERED_VARIANT" });
    expect(fail({ generation: 1, gen1Product: "UNKNOWN" })).toEqual({ ok: false, message: "1세대 실손보험의 가입 상품을 반드시 선택해주세요.", focusId: "samsung-gen1-product" });
    expect(fail({ monthlyPremium: "0" })).toEqual({ ok: false, message: "현재 월 보험료를 올바르게 입력해주세요." });
    expect(fail({ renewalCycleMonths: "1.5" })).toEqual({ ok: false, message: "갱신 주기는 1개월 이상의 정수로 입력하거나 비워주세요." });
    expect(fail({ renewalCycleMonths: "0" })).toEqual({ ok: false, message: "갱신 주기는 1개월 이상의 정수로 입력하거나 비워주세요." });
    expect(fail({ reentryCycleYears: "-1" })).toEqual({ ok: false, message: "재가입 주기는 1년 이상의 정수로 입력하거나 비워주세요." });
    expect(fail({ selectedSampleId: "NON_COVERED", isSampleConfirmed: false })).toEqual({ ok: false, message: "불러온 샘플 보험증권 정보를 확인해주세요." });
    expect(fail({ target5GMonthlyPremium: "" })).toEqual({ ok: false, message: "비교용 5세대 월 보험료를 올바르게 입력해주세요." });
  });
  it("치료 날짜가 둘 이상이면 가정을 선택해야 한다", () => {
    const two = [usage({ id: "a", treatmentDate: "2026-01-01" }), usage({ id: "b", treatmentDate: "2026-02-01" })];
    const blocked = fail({ plannedUsages: two });
    expect(blocked.ok).toBe(false);
    expect(fail({ plannedUsages: two, calculationAssumptions: { assumeEntireMedicalCostCovered: false, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true } }).ok).toBe(true);
  });
});

describe("buildSubmission 저장 값", () => {
  it("2~5세대는 계산용 내부 값을 삼성화재 상품으로 고정하고 입력한 이름은 표시용으로만 둔다", () => {
    const result = fail({});
    expect(result.ok).toBe(true);
    if (!result.ok || !("contract" in result)) throw new Error("expected submission");
    expect(result.contract).toEqual({
      insurer: "삼성화재",
      productName: "무배당 삼성화재 실손의료비보험(1704.1)",
      insurerLabel: "내 보험사",
      productLabel: "내 상품",
      inceptionDate: "2018-03-01",
      generation: 3,
      monthlyPremium: 60000,
      renewalCycleMonths: 12,
      reentryCycleMonths: 180,
      coverages: [],
    });
    expect(result.target5GMonthlyPremium).toBe(30000);
    expect(result.productCalculationSelections.samsungGen23Variant).toBe("standard");
    expect(result.productCalculationSelections.gen3Riders).toEqual(GEN3_RIDER_DEFAULT);
  });
  it("1세대 대표 상품은 계산용 값을 삼성 0904.2로 고정하고 입력한 이름은 표시용으로만 저장한다", () => {
    const ok = fail({ generation: 1, gen1Product: "SAMSUNG_0904_2", gen1D1Coverage: "INJURY", insurerLabel: " 내 보험사 ", productLabel: " 내 상품 " });
    if (!ok.ok && "reveal" in ok) throw new Error("unexpected");
    if (!ok.ok || !("contract" in ok)) throw new Error("expected submission");
    expect(ok.contract.insurer).toBe("삼성화재");
    expect(ok.contract.productName).toBe("삼성 올라이프 100세 건강파트너보험(0904.2)");
    expect(ok.contract.insurerLabel).toBe("내 보험사");
    expect(ok.contract.productLabel).toBe("내 상품");
  });
  it("1세대 그 밖의 보험사는 계산 미지원이라 저장 전에 막는다", () => {
    expect(fail({ generation: 1, gen1Product: "OTHER_POST", insurerLabel: " 우체국보험 ", productLabel: " 우체국보험 실손 의료 보험 " })).toEqual({ ok: false, reveal: "UNREGISTERED_VARIANT" });
  });
  it("1세대에서 대표 상품(OO 보험)을 고르면 입력한 표시 이름을 저장하고, 계산용 값은 그대로 둔다", () => {
    const r = fail({ generation: 1, gen1Product: "SAMSUNG_0904_2", gen1D1Coverage: "BOTH", insurerLabel: "내 보험사", productLabel: "내 상품" });
    if (!r.ok || !("contract" in r)) throw new Error("expected submission");
    expect(r.contract.insurer).toBe("삼성화재");
    expect(r.contract.insurerLabel).toBe("내 보험사");
    expect(r.contract.productLabel).toBe("내 상품");
  });
  it("가입 값에 따라 현재·5세대 비교 특약 코드가 만들어진다", () => {
    const g4 = fail({ generation: 4, inceptionDate: "2022-01-01", gen4NonCoveredRider: "ENROLLED", hasTarget5GSpecialRider1: true, hasTarget5GSpecialRider2: true });
    if (!g4.ok || !("contract" in g4)) throw new Error("expected submission");
    expect(g4.contract.coverages).toEqual(["NON_COVERED"]);
    expect(g4.target5GCoverages).toEqual(["SPECIAL_RIDER_1", "SPECIAL_RIDER_2"]);
    // 5세대는 현재 계약으로 입력할 수 없고, 5세대 특약은 STEP 2 비교 조건에서만 다룬다.
    expect(g4.productCalculationSelections.gen5SevereRider).toBe("UNKNOWN");
    expect(g4.productCalculationSelections.gen5NonSevereRider).toBe("UNKNOWN");
  });
  it("갱신·재가입 주기를 비우면 null로 저장한다", () => {
    const r = fail({ renewalCycleMonths: "", reentryCycleYears: "" });
    if (!r.ok || !("contract" in r)) throw new Error("expected submission");
    expect(r.contract.renewalCycleMonths).toBeNull();
    expect(r.contract.reentryCycleMonths).toBeNull();
  });
});
