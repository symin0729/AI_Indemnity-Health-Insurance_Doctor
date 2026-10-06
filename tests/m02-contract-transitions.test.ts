import { describe, expect, it } from "vitest";
import { GEN3_RIDER_DEFAULT } from "../src/domain/gen3Riders";
import type { InsuranceContract } from "../src/domain/insurance";
import {
  GENERATION_CHANGE_RESET,
  PRODUCT_TYPE_RESET,
  contractStepResetPatch,
  generationSelectedPatch,
  inceptionDateTypedPatch,
  samplePolicyPatch,
} from "../src/pages/M02InputPage/contractTransitions";

/** STEP 1 입력들이 서로 어떻게 영향을 주는지(세대·가입일·샘플·초기화)를 규칙 단위로 고정한다. */
const sample: InsuranceContract = {
  insurer: "삼성화재",
  productName: "무배당 삼성화재 실손의료비보험(1704.1)",
  inceptionDate: "2018-03-01",
  generation: 3,
  monthlyPremium: 60000,
  renewalCycleMonths: 12,
  reentryCycleMonths: 180,
  coverages: [],
};

describe("실손 세대를 선택할 때", () => {
  it("가입일은 그 세대의 기본 날짜로, 이름·상품 종형·특약·샘플 상태는 초기화한다", () => {
    const patch = generationSelectedPatch(2, { selectedSampleId: null });
    expect(patch).toMatchObject({
      generation: 2,
      isGenerationSelected: true,
      inceptionDate: "2015-09-01",
      insurerLabel: "",
      productLabel: "",
      selectedSampleId: null,
      isSampleConfirmed: false,
      ...GENERATION_CHANGE_RESET,
    });
  });
  it("1세대 특약(상해/질병) 선택도 함께 되돌린다", () => {
    expect(generationSelectedPatch(1, { selectedSampleId: null }).gen1D1Coverage).toBe("NONE");
  });
  it("샘플을 불러오지 않았다면 직접 입력한 월 보험료와 주기는 건드리지 않는다", () => {
    const patch = generationSelectedPatch(4, { selectedSampleId: null });
    expect(patch).not.toHaveProperty("monthlyPremium");
    expect(patch).not.toHaveProperty("renewalCycleMonths");
    expect(patch).not.toHaveProperty("reentryCycleYears");
  });
  it("샘플을 불러온 상태에서 세대를 바꾸면 샘플이 채운 월 보험료와 주기도 비운다", () => {
    const patch = generationSelectedPatch(2, { selectedSampleId: "NON_COVERED" });
    expect(patch).toMatchObject({ monthlyPremium: "", renewalCycleMonths: "", reentryCycleYears: "" });
  });
  it.each([1, 2, 3, 4] as const)("%s세대 기본 가입일이 같은 세대로 판독된다", (g) => {
    const patch = generationSelectedPatch(g, { selectedSampleId: null });
    const detected = inceptionDateTypedPatch(patch.inceptionDate ?? "");
    expect(detected.generation).toBe(g);
  });
});

describe("가입일을 입력할 때", () => {
  it("상품 종형과 특약 선택을 초기화하고 1~4세대 시기이면 세대를 맞춘다", () => {
    expect(inceptionDateTypedPatch("20180301")).toMatchObject({ inceptionDate: "2018-03-01", generation: 3, isGenerationSelected: true, ...PRODUCT_TYPE_RESET });
    expect(inceptionDateTypedPatch("2022-01-01")).toMatchObject({ generation: 4, isGenerationSelected: true });
  });
  it("1세대 특약 선택은 가입일을 바꿔도 유지한다(가입일에 따라 달라지지 않는 선택)", () => {
    expect(inceptionDateTypedPatch("2005-01-01")).not.toHaveProperty("gen1D1Coverage");
  });
  it("5세대 시기 가입일은 세대를 바꾸지 않는다", () => {
    const patch = inceptionDateTypedPatch("2026-06-01");
    expect(patch).not.toHaveProperty("generation");
    expect(patch).not.toHaveProperty("isGenerationSelected");
    expect(patch.inceptionDate).toBe("2026-06-01");
  });
  it("날짜를 다 쓰기 전에는 세대를 바꾸지 않고 숫자만 정리한다", () => {
    const patch = inceptionDateTypedPatch("2018");
    expect(patch.inceptionDate).toBe("2018");
    expect(patch).not.toHaveProperty("generation");
  });
});

describe("STEP 1 샘플 불러오기", () => {
  it("현재 계약만 채운다: 세대·가입일·월 보험료·주기·OO 이름·2·3세대 표준형", () => {
    expect(samplePolicyPatch("NON_COVERED", sample)).toMatchObject({
      generation: 3,
      isGenerationSelected: true,
      inceptionDate: "2018-03-01",
      insurerLabel: "OO 보험",
      productLabel: "OO 실손의료보험",
      samsungGen23Variant: "standard",
      gen3Riders: GEN3_RIDER_DEFAULT,
      monthlyPremium: "60000",
      renewalCycleMonths: "12",
      reentryCycleYears: "15",
      selectedSampleId: "NON_COVERED",
      isSampleConfirmed: true,
    });
  });
  it("STEP 2·3(5세대 비교 조건, 예정 치료, 계산 가정)에 해당하는 값은 포함하지 않는다", () => {
    const keys = Object.keys(samplePolicyPatch("NON_COVERED", sample));
    expect(keys.filter((k) => /target|5G|Rider1|Rider2|assume|usage|treatment/i.test(k))).toEqual([]);
  });
  it("이전에 고른 1세대 상품·특약은 되돌린다", () => {
    expect(samplePolicyPatch("NON_COVERED", sample)).toMatchObject({ gen1Product: "UNKNOWN", gen1D1Coverage: "NONE" });
  });
});

describe("STEP 1 초기화", () => {
  it("STEP 1 입력을 모두 처음 상태로 되돌린다", () => {
    expect(contractStepResetPatch()).toEqual({
      ...GENERATION_CHANGE_RESET,
      generation: 3,
      isGenerationSelected: false,
      inceptionDate: "",
      insurerLabel: "",
      productLabel: "",
      gen1ContractBasis: "SAMPLE_SIMULATION",
      monthlyPremium: "",
      renewalCycleMonths: "",
      reentryCycleYears: "",
      selectedSampleId: null,
      isSampleConfirmed: false,
    });
  });
  it("다른 단계 입력은 포함하지 않는다", () => {
    const keys = Object.keys(contractStepResetPatch());
    expect(keys.filter((k) => /target|5G|assume|usage|treatment/i.test(k))).toEqual([]);
  });
});
