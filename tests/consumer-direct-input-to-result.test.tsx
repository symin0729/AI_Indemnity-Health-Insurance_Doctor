// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import M02InputPage from "../src/consumer/pages/M02InputPage/M02InputPage";
import { prepareUsageForSamsungComparison } from "../src/consumer/pages/M04ResultPage/M04ResultPage";
import { calculateSamsungAnnualComparison } from "../src/engine/calculateSamsungComparison";
import { useAnalysisStore } from "../src/consumer/store/useAnalysisStore";

/**
 * 샘플을 쓰지 않고 화면에 직접 입력한 값만으로 결과(현재 계약·5세대)가 계산되는지 확인한다.
 * 샘플은 계산에 필요한 값을 미리 채워 두기 때문에, 화면에 입력칸이 빠져도 샘플 테스트로는 드러나지 않는다.
 * 엔진이 새 값을 요구하는데 화면에 칸이 없으면 이 테스트가 실패한다.
 */
beforeEach(() => {
  useAnalysisStore.getState().resetAnalysis();
  // 화면은 주소의 #input-step-N으로 현재 단계를 기억하므로 테스트마다 처음 단계로 돌린다.
  window.history.replaceState(null, "", "/consumer/input");
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => cleanup());

const renderPage = () => {
  const user = userEvent.setup();
  render(createElement(MemoryRouter, null, createElement(M02InputPage)));
  return user;
};
const nextButton = () => screen.getByRole("button", { name: /^(다음 단계|입력 정보 확인하기)$/ });
const panel = (n: number) => within(document.querySelector(`#input-step-${n}`)?.closest(".workflow-panel") as HTMLElement);
const daysSinceAccidentInput = () => document.querySelector('[aria-label="1세대 세부 입력"] input[type="number"]') as HTMLInputElement;
const alertText = () => screen.queryByRole("alert")?.textContent ?? "";

async function fillContractFacts(user: UserEvent, prefix: string, outpatientCap = "200000") {
  for (const [key, amount] of [["coveredBenefitCap", "50000000"], ["coveredOutpatientCap", outpatientCap], ["nonCoveredBenefitCap", "50000000"], [prefix === "current-contract" ? "nonCoveredOutpatientCap" : "nonSevereBenefitCap", prefix === "current-contract" ? "200000" : "10000000"]]) {
    const field = document.getElementById(`${prefix}-${key}`) as HTMLInputElement | null;
    // 미가입 특약의 금액은 입력하지 않는다.
    if (field) { await user.clear(field); await user.type(field, amount); }
  }
  expect(document.getElementById(`${prefix}-other`)).toBeNull();
  // 진료일 기준 보험기간 구분은 묻지 않는다(현재 계약은 유효한 계약 기준 비교).
  expect(document.getElementById(`${prefix}-period`)).toBeNull();
}

async function fillStep1(user: UserEvent, generation: 1 | 4, options: { gen4NonCoveredRider?: boolean; gen4PerOccurrenceCap?: string } = {}) {
  await user.selectOptions(document.getElementById("generation-select") as HTMLSelectElement, String(generation));
  await user.type(screen.getByLabelText(/현재 월 보험료/), "50000");
  if (generation === 1) {
    await user.selectOptions(document.getElementById("samsung-gen1-product") as HTMLSelectElement, "SAMSUNG_0904_2");
    // 상해·질병 특약 모두 가입
    const boxes = within(document.querySelector("#input-step-1 .rider-row__boxes") as HTMLElement).getAllByRole("checkbox", { hidden: true });
    for (const box of boxes) await user.click(box);
  }
  if (generation === 4 && options.gen4NonCoveredRider) {
    await user.click(within(document.getElementById("input-step-1") as HTMLElement).getByText("비급여 특약").closest("label")?.querySelector("input") as HTMLInputElement);
  }
  if (generation === 4) await fillContractFacts(user, "current-contract", options.gen4PerOccurrenceCap);
  await user.click(nextButton());
  expect(alertText()).toBe("");
}

interface TreatmentInput {
  careSetting: "OUTPATIENT" | "INPATIENT";
  benefitClass: "COVERED" | "NON_COVERED";
  cost: string;
  cause: "INJURY" | "DISEASE";
  daysSinceAccident?: string;
  nonCoveredType?: "MANUAL_THERAPY" | "INJECTION" | "MRI";
  severity?: "SEVERE" | "NON_SEVERE";
  frequency?: string;
  target5GRiders?: boolean;
}

async function fillStep2(user: UserEvent, treatment: TreatmentInput) {
  const step2 = panel(2);
  await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
  await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "직접 입력 치료");
  await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), treatment.cause);
  await user.click(step2.getByRole("checkbox", { name: treatment.careSetting === "INPATIENT" ? "입원" : "통원", exact: true }));
  await user.selectOptions(step2.getByLabelText(/급여 여부/), treatment.benefitClass);
  await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, treatment.cost);
  await user.type(step2.getByLabelText(/예상 횟수/), treatment.frequency ?? "1");
  if (treatment.benefitClass === "COVERED") await user.selectOptions(document.getElementById("copay-institution") as HTMLSelectElement, "CLINIC");

  await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), treatment.cause);
  if (treatment.nonCoveredType) { await user.click(step2.getByRole("button", { name: "목록 선택" })); await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, treatment.nonCoveredType); }
  if (treatment.severity) await user.selectOptions(step2.getByDisplayValue("모름"), treatment.severity);
  if (treatment.daysSinceAccident !== undefined) {
    await user.type(daysSinceAccidentInput(), treatment.daysSinceAccident);
  }
  await user.click(step2.getByRole("button", { name: "추가하기" }));
  expect(alertText()).toBe("");

  // 필수 입력 안내 확인(STEP 3 진행 조건)
  await user.click(nextButton());
  expect(alertText()).toBe("");
}

async function fillStep3(user: UserEvent, options: { submit?: boolean } = {}) {
  await user.selectOptions(document.getElementById("target-conversion-eligibility") as HTMLSelectElement, "true");
  await user.type(document.getElementById("target-premium") as HTMLInputElement, "30000");
  await user.click(panel(3).getByRole("checkbox", { name: /^중증 비급여 특약/ }));
  await user.click(panel(3).getByRole("checkbox", { name: /비중증 비급여 특약/ }));
  await fillContractFacts(user, "target-contract");
  await user.click(nextButton());
  expect(alertText()).toBe("");
  const step3 = panel(4);
  const check = (text: string) => user.click(step3.getByText(text).closest("label")?.querySelector("input") as HTMLInputElement);
  // 설계사가 보장대상 금액(C)을 모르고, 올해 사용한 한도가 없으며, 치료가 각각 다른 날 방문인 일반적인 경우
  await check("보장 제외 사유가 없다고 가정");
  await check("입력한 환자부담금 전액을 보장대상 금액으로 가정");
  await check("반복 치료를 각각 별도 방문으로 가정");
  if (options.submit === false) return;
  await user.click(nextButton());
  expect(alertText()).toBe("");
}

/** 결과 화면과 같은 방식으로 저장된 입력을 계산한다. */
function calculateSaved() {
  const state = useAnalysisStore.getState();
  if (!state.contract) throw new Error("입력이 저장되지 않았습니다.");
  const usages = state.usages.map((usage) => prepareUsageForSamsungComparison(usage, state.calculationAssumptions));
  return calculateSamsungAnnualComparison(state.contract, state.target5GMonthlyPremium, state.target5GCoverages, state.productCalculationSelections, usages, state.calculationAssumptions);
}

describe("소비자용 직접 입력부터 비교 결과까지", () => {
  it("1세대 상해 통원: 현재 계약과 5세대가 모두 계산된다", async () => {
    const user = renderPage();
    await fillStep1(user, 1);
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "INJURY", daysSinceAccident: "10" });
    await fillStep3(user);
    const result = calculateSaved();
    expect(result.currentClaimTotal).not.toBeNull();
    expect(result.targetClaimTotal).not.toBeNull();
    expect(result.complete).toBe(true);
  });

  it("4세대 질병 급여 통원: 현재 계약과 5세대가 확인한 계약정보로 모두 계산된다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    await fillStep3(user);
    const result = calculateSaved();
    expect(result.currentClaimTotal).not.toBeNull();
    expect(result.targetClaimTotal).not.toBeNull();
    expect(useAnalysisStore.getState().calculationAssumptions).toMatchObject({
      assumeSingleIndemnityContract: true,
      currentContractFacts: { otherIndemnityPoliciesExist: false },
      targetContractFacts: { otherIndemnityPoliciesExist: false },
    });
    expect(result.items[0].current.appliedAssumptions).not.toContain("다른 실손의료보험 계약은 없는 것으로 봄");
    expect(result.items[0].current.appliedAssumptions).not.toContain("통원 회당 보험가입금액은 약관상 최대 20만 원으로 봄");
  });

  it("4세대 STEP 1에서 통원 1회 가입금액을 입력하면 가정 대신 그 값으로 계산한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4, { gen4PerOccurrenceCap: "100000" });
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "300000", cause: "DISEASE" });
    await fillStep3(user);
    const result = calculateSaved();
    // 30만원 − MAX(1만원, 30만원×20%) = 24만원 → 입력한 1회 한도 10만원 적용
    expect(result.currentClaimTotal).toBe(100_000);
    expect(result.items[0].current.appliedAssumptions).not.toContain("통원 회당 보험가입금액은 약관상 최대 20만 원으로 봄");
    // 5세대 비교 계약에 별도 입력한 회당 20만원을 적용한다: 30만원 − 9만원 = 21만원 → 20만원
    expect(result.targetClaimTotal).toBe(200_000);
    expect(result.items[0].target.appliedAssumptions).not.toContain("통원 회당 보험가입금액은 약관상 최대 20만 원으로 봄");
  });

  it("4세대: 올해 이용 내역을 묻지 않고, 두 계약 모두 한도 사용 전부터 시작해 계산한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    await fillStep3(user, { submit: false });
    // 비교 시작 조건 선택과 기존 사용분 입력칸이 없다.
    expect(document.getElementById("comparison-basis")).toBeNull();
    expect(document.querySelector('[id^="prior-"]')).toBeNull();
    expect(panel(4).queryByText("비워 둔 기존 사용분은 0으로 가정")).toBeNull();
    await user.click(nextButton());
    expect(alertText()).toBe("");
    expect(useAnalysisStore.getState().calculationAssumptions.comparisonBasis).toBe("FRESH_YEAR");
    const result = calculateSaved();
    expect(result.items[0].current.claim).toBe(80_000);
    expect(result.items[0].target.claim).toBe(70_000);
  });

  it("4세대 상해 급여 입원: 현재 계약과 5세대가 모두 계산된다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    await fillStep2(user, { careSetting: "INPATIENT", benefitClass: "COVERED", cost: "1000000", cause: "INJURY" });
    await fillStep3(user);
    const result = calculateSaved();
    expect(result.currentClaimTotal).toBe(800_000);
    expect(result.targetClaimTotal).not.toBeNull();
  });

  it("4세대 비급여 도수치료: 도수치료 전용 규칙으로 계산하고 5세대는 비중증 비급여로 계산한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4, { gen4NonCoveredRider: true });
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", cost: "100000", cause: "DISEASE", nonCoveredType: "MANUAL_THERAPY", severity: "NON_SEVERE", target5GRiders: true });
    await fillStep3(user);
    expect(useAnalysisStore.getState().usages[0].treatmentCategory).toBe("MANUAL_THERAPY");
    const result = calculateSaved();
    // 4세대 3대 비급여(G4-05): 10만원 − MAX(3만원, 10만원×30%) = 7만원
    expect(result.items[0].current.ruleId).toBe("G4-05");
    expect(result.currentClaimTotal).toBe(70_000);
    // 5세대 비중증 비급여 통원(G5-CONV-07): 10만원 − MAX(5만원, 10만원×50%) = 5만원
    expect(result.items[0].target.ruleId).toBe("G5-CONV-07");
    expect(result.targetClaimTotal).toBe(50_000);
  });

  it("3세대: STEP 1 계약 상세(외래 가입금액)를 고치면 그 값이 예정 치료 계산에 쓰인다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    const outpatientCap = document.getElementById("contract-detail-gen23OutpatientBenefitCap") as HTMLInputElement;
    expect(outpatientCap.value).toBe("250,000");
    await user.clear(outpatientCap);
    await user.type(outpatientCap, "50000");
    await user.click(nextButton());
    expect(alertText()).toBe("");

    await user.click(screen.getByRole("button", { name: "치료 샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "일반 외래 진료" }));
    // 예정 치료 화면에는 계약 상세 칸이 없다.
    expect(panel(2).queryByText("외래 가입금액")).toBeNull();
    await user.click(panel(2).getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    await user.click(nextButton());
    await fillStep3(user);

    const saved = useAnalysisStore.getState().usages[0];
    expect(saved.gen23OutpatientBenefitCap).toBe(50_000);
    expect(saved.samsungCalculationInput?.outpatientBenefitCap).toBe(50_000);
    const result = calculateSaved();
    expect(result.currentClaimTotal).not.toBeNull();
    // 외래 1회 보험금이 STEP 1에서 입력한 가입금액 5만원을 넘지 않는다.
    expect(result.items[0].currentClaimTotal! / result.items[0].usage.frequency).toBeLessThanOrEqual(50_000);
  });

  it("3세대: 올해 이용 내역과 이미 받은 보험금을 묻지 않고, 예정 치료만으로 계산한다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    expect(document.querySelector('[id^="prior-"]')).toBeNull();
    await user.click(nextButton());
    expect(alertText()).toBe("");

    await user.click(screen.getByRole("button", { name: "치료 샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "일반 외래 진료" }));
    expect(panel(2).queryByText("해당 담보의 이전 연간 이용횟수")).toBeNull();
    expect(panel(2).queryByText("해당 담보·기간의 이전 지급 보험금")).toBeNull();
    await user.click(panel(2).getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    await user.click(nextButton());
    await fillStep3(user);
    expect(calculateSaved().items[0].current.claim).not.toBeNull();
  });

  it("가정 페이지에서 앞 단계로 돌아가 수정한 보험료가 확인 정보에 반영된다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    expect(panel(1).queryByLabelText('비교 시작 조건')).toBeNull();
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    await fillStep3(user, { submit: false });
    expect(panel(4).queryByRole('region', { name: '기존 사용분 반영' })).toBeNull();

    await user.click(screen.getByRole('button', { name: /1단계.*보험 정보/ }));
    const current = screen.getByLabelText(/현재 월 보험료/);
    await user.clear(current);
    await user.type(current, '45000');
    await user.click(nextButton());
    await user.click(nextButton());
    await user.click(nextButton());
    expect((screen.getByLabelText(/현재 월 보험료/) as HTMLInputElement).value).toBe('45,000');

    await user.click(screen.getByRole('button', { name: '2단계 예정 치료' }));
    expect(panel(2).getByRole('heading', { name: '예정 치료' })).toBeTruthy();
    await user.click(nextButton());
    await user.click(nextButton());
    await user.click(screen.getByRole('button', { name: '3단계 5세대 조건' }));
    const target = document.getElementById('target-premium') as HTMLInputElement;
    await user.clear(target);
    await user.type(target, '25000');
    await user.click(nextButton());
    expect((document.getElementById('target-premium') as HTMLInputElement).value).toBe('25,000');
    await user.click(nextButton());
    const saved = useAnalysisStore.getState();
    expect(saved.contract?.monthlyPremium).toBe(45000);
    expect(saved.target5GMonthlyPremium).toBe(25000);
    expect(saved.usages).toHaveLength(1);
    expect(calculateSaved().complete).toBe(true);
  });

  it("공통 치료 요약을 보여주고 미가입 5세대 특약의 숨겨진 금액은 계산에서 제외한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    const step3 = panel(3);
    expect(step3.getByRole('region', { name: '두 계약에 공통으로 적용할 예정 치료' }).textContent).toContain('직접 입력 치료');
    expect(step3.getByRole('status').textContent).toContain('비급여 특약 미가입');
    expect(document.getElementById('target-contract-nonCoveredBenefitCap')).toBeNull();
    expect(document.getElementById('target-contract-nonSevereBenefitCap')).toBeNull();
    const severe = step3.getByRole('checkbox', { name: /^중증 비급여 특약/ });
    await user.click(severe);
    const cap = document.getElementById('target-contract-nonCoveredBenefitCap') as HTMLInputElement;
    await user.type(cap, '999'); // 가입금액 선택지 밖의 값
    await user.click(severe);
    expect(document.getElementById('target-contract-nonCoveredBenefitCap')).toBeNull();
    await user.type(document.getElementById('target-premium') as HTMLInputElement, '30000');
    await fillContractFacts(user, 'target-contract');
    await user.selectOptions(document.getElementById('target-conversion-eligibility') as HTMLSelectElement, 'true');
    await user.click(nextButton());
    expect(alertText()).toBe('');
    await user.click(panel(4).getByRole('checkbox', { name: /^보장 제외 사유가 없다고 가정/ }));
    await user.click(panel(4).getByRole('checkbox', { name: /^입력한 환자부담금 전액/ }));
    await user.click(panel(4).getByRole('checkbox', { name: /^반복 치료/ }));
    await user.click(nextButton());
    expect(useAnalysisStore.getState().calculationAssumptions.targetContractFacts?.nonCoveredBenefitCap).toBeUndefined();
    expect(calculateSaved().complete).toBe(true);
  });

  it("도수치료가 10회를 넘을 때만 '증상 개선 확인' 가정이 나오고, 선택하면 계산된다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4, { gen4NonCoveredRider: true });
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", cost: "100000", cause: "DISEASE", nonCoveredType: "MANUAL_THERAPY", severity: "NON_SEVERE", target5GRiders: true, frequency: "112" });
    await fillStep3(user, { submit: false });
    const label = "도수치료 10회 이후에도 증상 개선이 확인되어 보상된다고 가정";
    expect(panel(4).getByText(label)).toBeTruthy();
    await user.click(panel(4).getByText(label).closest("label")?.querySelector("input") as HTMLInputElement);
    await user.click(nextButton());
    expect(alertText()).toBe("");
    expect(useAnalysisStore.getState().calculationAssumptions.assumeManualTherapyImprovement).toBe(true);
    expect(calculateSaved().items[0].current.claim).not.toBeNull();
  });

  it("도수치료가 10회 이하이면 증상 개선 가정을 묻지 않는다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4, { gen4NonCoveredRider: true });
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", cost: "100000", cause: "DISEASE", nonCoveredType: "MANUAL_THERAPY", severity: "NON_SEVERE", target5GRiders: true });
    await fillStep3(user, { submit: false });
    expect(panel(4).queryByText("도수치료 10회 이후에도 증상 개선이 확인되어 보상된다고 가정")).toBeNull();
  });

  it("치료를 하나 추가한 뒤 '+ 치료 추가'로 다음 치료를 더 추가할 수 있고, 3건이면 버튼이 사라진다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    const addOne = async (name: string) => {
      await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
  await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), name);
      await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
      await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "100000");
      await user.selectOptions(document.getElementById("copay-institution") as HTMLSelectElement, "CLINIC");
      await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
      await user.click(step2.getByRole("checkbox", { name: "통원", exact: true }));
      await user.type(step2.getByLabelText(/예상 횟수/), "1");
      await user.click(step2.getByRole("button", { name: "추가하기" }));
      expect(alertText()).toBe("");
    };
    await user.type(document.getElementById("target-premium") as HTMLInputElement, "30000");
    await addOne("첫 번째 치료");
    expect(step2.queryByRole("button", { name: "추가하기" })).toBeNull(); // 폼은 닫힌다
    for (const name of ["두 번째 치료", "세 번째 치료"]) {
      await user.click(step2.getByRole("button", { name: "+ 치료 추가" }));
      await addOne(name);
    }
    expect(step2.getAllByText(/첫 번째 치료|두 번째 치료|세 번째 치료/).length).toBeGreaterThanOrEqual(3);
    expect(step2.queryByRole("button", { name: "+ 치료 추가" })).toBeNull(); // 최대 3건
  });

  it("건강보험 적용 여부는 묻지 않고 항상 적용으로 저장하고 계산한다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    expect(screen.queryByText(/이번 진료의 국민건강보험 적용/)).toBeNull();
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    expect(screen.queryByText(/이번 진료의 국민건강보험 적용/)).toBeNull();
    expect(screen.queryByText(/건강보험 일부 적용은/)).toBeNull();
    await fillStep3(user);
    expect(useAnalysisStore.getState().usages[0].nationalHealthInsuranceStatus).toBe("APPLIED");
    expect(calculateSaved().items[0].current.claim).toBe(80_000);
  });

  it("급여 여부를 고르면 해당하는 칸만 나타난다: 급여=종별·지역·본인부담률, 비급여=산정특례 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    const institution = () => document.getElementById("copay-institution");
    const region = () => document.getElementById("institution-region");
    const rate = () => step2.queryByText("건강보험 본인부담률");
    const severity = () => step2.queryByText("산정특례 및 치료 관련성");
    // 치료 원인과 입원·통원은 치료 정보의 한 구역으로 묶인다.
    expect(step2.getByLabelText(/급여 여부/)).toBeTruthy();
    expect(step2.getByRole("group", { name: "치료 구분 (필수)" })).toBeTruthy();
    expect(institution()).toBeNull();
    expect(severity()).toBeNull();
    const benefitSelect = step2.getByLabelText(/급여 여부/) as HTMLSelectElement;
    expect(benefitSelect.value).toBe("UNKNOWN");
    expect(benefitSelect.options[0].disabled).toBe(true);
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    expect(institution()).not.toBeNull();
    expect(rate()).not.toBeNull();
    expect(severity()).toBeNull();
    // 종별을 고르면 본인부담률 기본값이 연동된다(의원급 통원 30%).
    await user.selectOptions(institution() as HTMLSelectElement, "CLINIC");
    expect((step2.getByLabelText(/건강보험 본인부담률/) as HTMLInputElement).value).toBe("30");
    // 병원급은 소재 지역이 나타나고, 지역에 따라 기본값이 바뀐다.
    await user.selectOptions(institution() as HTMLSelectElement, "HOSPITAL");
    expect(region()).not.toBeNull();
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
    await user.click(step2.getByRole("checkbox", { name: "입원", exact: true }));
    for (const kind of ["HOSPITAL", "GENERAL"]) {
      await user.selectOptions(institution() as HTMLSelectElement, kind);
      expect(region()).not.toBeNull();
      await user.selectOptions(region() as HTMLSelectElement, "DONG");
      expect((step2.getByLabelText(/건강보험 본인부담률/) as HTMLInputElement).value).toBe("20");
    }

    await user.selectOptions(step2.getByLabelText(/급여 여부/), "NON_COVERED");
    expect(severity()).not.toBeNull();
    expect(institution()).toBeNull(); // 비급여에서는 종별을 받지 않는다
    expect(region()).toBeNull();
    expect(rate()).toBeNull();

    expect(Array.from((step2.getByLabelText(/급여 여부/) as HTMLSelectElement).options).some(option => option.value === "UNKNOWN")).toBe(false);
  });

  it("초기화하면 모든 치료 입력과 체크가 비고 회색 예시만 남는다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    await user.click(step2.getByRole('button', { name: '치료 샘플 불러오기' }));
    await user.click(screen.getByRole('button', { name: '일반 외래 진료' }));
    await user.click(step2.getByRole('button', { name: '초기화' }));
    expect((document.getElementById('treatment-kind') as HTMLSelectElement).value).toBe('');
    expect((document.getElementById('treatment-cause') as HTMLSelectElement).value).toBe('UNKNOWN');
    expect((step2.getByLabelText(/급여 여부/) as HTMLSelectElement).value).toBe('UNKNOWN');
    expect((step2.getByLabelText(/예상 횟수/) as HTMLInputElement).value).toBe('');
    expect((document.getElementById('patient-unit-cost') as HTMLInputElement).value).toBe('');
    expect((step2.getByRole('checkbox', { name: '입원', exact: true }) as HTMLInputElement).checked).toBe(false);
    expect((step2.getByRole('checkbox', { name: '통원', exact: true }) as HTMLInputElement).checked).toBe(false);
    await user.click(step2.getByRole('button', { name: '추가하기' }));
    expect(useAnalysisStore.getState().usages).toHaveLength(0);

  });

  it("1세대는 경과일을 넣지 않으면 치료를 추가할 수 없다", async () => {
    const user = renderPage();
    await fillStep1(user, 1);
    const step2 = panel(2);
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
  await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "직접 입력 치료");
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "100000");
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "INJURY");
    await user.click(step2.getByRole("checkbox", { name: "통원", exact: true }));
    await user.type(step2.getByLabelText(/예상 횟수/), "1");
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toContain("경과일");
  });
});


it('치료 샘플 완료 표시와 해당 화면 초기화는 보험 정보를 유지한다', async () => {
  const user = renderPage();
  await user.click(screen.getByRole('button', { name: '샘플 불러오기' }));
  await user.click(nextButton());
  const contractName = (document.getElementById('current-monthly-premium') as HTMLInputElement).value;
  const targetPremium = useAnalysisStore.getState().target5GMonthlyPremium;
  await user.click(panel(2).getByRole('button', { name: '치료 샘플 불러오기' }));
  await user.click(screen.getByRole('button', { name: '일반 외래 진료' }));
  expect(panel(2).getByText('샘플 입력 완료')).toBeTruthy();
  await user.click(panel(2).getByRole('button', { name: '추가하기' }));
  expect(useAnalysisStore.getState().usages).toHaveLength(1);
  await user.click(panel(2).getByRole('button', { name: '초기화' }));
  expect(useAnalysisStore.getState().usages).toHaveLength(0);
  expect(panel(2).queryByText('샘플 입력 완료')).toBeNull();
  expect((document.getElementById('treatment-kind') as HTMLSelectElement).value).toBe('');
  expect((document.getElementById('current-monthly-premium') as HTMLInputElement).value).toBe(contractName);
  expect(useAnalysisStore.getState().target5GMonthlyPremium).toBe(targetPremium);
});


it.each([
  ['INJURY', 'INPATIENT', 'G4-01', 'G5-CONV-01'],
  ['DISEASE', 'INPATIENT', 'G4-02', 'G5-CONV-01'],
  ['INJURY', 'OUTPATIENT', 'G4-08', 'G5-CONV-02'],
  ['DISEASE', 'OUTPATIENT', 'G4-09', 'G5-CONV-02'],
] as const)('통합 선택 %s / %s가 현재·전환 계산 규칙으로 연결된다', async (cause, careSetting, currentRule, targetRule) => {
  const user = renderPage();
  await fillStep1(user, 4);
  const group = within(panel(2).getByRole('group', { name: '치료 구분 (필수)' }));
  expect((group.getByRole('checkbox', { name: '입원', exact: true }) as HTMLInputElement).disabled).toBe(true);
  await fillStep2(user, { cause, careSetting, benefitClass: 'COVERED', cost: '100000' });
  await fillStep3(user);
  const state = useAnalysisStore.getState();
  expect(state.usages[0]).toMatchObject({ claimCause: cause, careSetting });
  const result = calculateSaved();
  expect(result.complete).toBe(true);
  expect(result.items[0].current.ruleId).toBe(currentRule);
  expect(result.items[0].target.ruleId).toBe(targetRule);
});
