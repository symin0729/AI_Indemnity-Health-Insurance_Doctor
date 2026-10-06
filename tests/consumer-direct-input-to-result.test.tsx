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
    if (field) {
      if (field.tagName === 'INPUT') { await user.clear(field); await user.type(field, amount); }
      else { await user.click(within(field).getByRole('button', { name: `${(Number(amount) / 10000).toLocaleString('ko-KR')}만원` })); }
    }
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
  gen1RoomDifference?: string;
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
  // 소비자용은 산정특례 여부를 묻지 않는다(STEP 4 가정으로 처리).
  if (treatment.daysSinceAccident !== undefined) {
    await user.type(daysSinceAccidentInput(), treatment.daysSinceAccident);
  }
  if (treatment.gen1RoomDifference !== undefined) await user.type(step2.getByLabelText("병실료 차액"), treatment.gen1RoomDifference);
  await user.click(step2.getByRole("button", { name: "추가하기" }));
  expect(alertText()).toBe("");

  // 필수 입력 안내 확인(STEP 3 진행 조건)
  await user.click(nextButton());
  expect(alertText()).toBe("");
}

async function fillStep3(user: UserEvent, options: { submit?: boolean } = {}) {
  await user.type(document.getElementById("target-premium") as HTMLInputElement, "30000");
  await user.click(panel(3).getByRole("checkbox", { name: /^중증 비급여 특약/ }));
  await user.click(panel(3).getByRole("checkbox", { name: /비중증 비급여 특약/ }));
  await fillContractFacts(user, "target-contract");
  await user.click(nextButton());
  expect(alertText()).toBe("");
  const step3 = panel(4);
  const check = (text: string) => user.click(step3.getByText(text).closest("label")?.querySelector("input") as HTMLInputElement);
  // 설계사가 보장대상 금액(C)을 모르고, 올해 사용한 한도가 없으며, 치료가 각각 다른 날 방문인 일반적인 경우
  await check("입력한 치료는 모두 보험금을 받을 수 있는 일반 치료인가요?");
  await check("내가 낸 금액 전체를 보험이 인정하는 금액으로 보고 계산해도 될까요?");
  await check("같은 치료를 여러 번 받는다면, 받는 날이 모두 다른가요?");
  // 5세대 비급여 특약을 고른 비급여 치료에는 5세대 전용 가정이 함께 나타난다.
  for (const text of [/일반 질환 때문인가요/, /병원이나 의원\(종합병원·상급종합병원 제외\)에서 한다고 보고/]) {
    const item = step3.queryByText(text);
    if (item) await user.click(item.closest("label")?.querySelector("input") as HTMLInputElement);
  }
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

  it("4세대 비급여 도수치료: 도수치료 전용 규칙으로 계산하고 5세대 비중증은 보장 제외한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4, { gen4NonCoveredRider: true });
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", cost: "100000", cause: "DISEASE", nonCoveredType: "MANUAL_THERAPY", severity: "NON_SEVERE", target5GRiders: true });
    await fillStep3(user);
    expect(useAnalysisStore.getState().usages[0].treatmentCategory).toBe("MANUAL_THERAPY");
    const result = calculateSaved();
    // 4세대 3대 비급여(G4-05): 10만원 − MAX(3만원, 10만원×30%) = 7만원
    expect(result.items[0].current.ruleId).toBe("G4-05");
    expect(result.currentClaimTotal).toBe(70_000);
    // 5세대 특약2: 비중증 도수치료는 공제 계산 전에 보장 제외
    expect(result.items[0].target.ruleId).toBe("");
    expect(result.targetClaimTotal).toBe(0);
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

  it("공통 치료 요약을 숨기고 미가입 5세대 특약의 숨겨진 금액은 계산에서 제외한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    const step3 = panel(3);
    expect(step3.queryByRole('region', { name: '두 계약에 공통으로 적용할 예정 치료' })).toBeNull();
    expect(step3.queryByRole('status')).toBeNull(); // 특약을 고르지 않으면 안내 문구를 띄우지 않는다
    expect(document.getElementById('target-contract-nonCoveredBenefitCap')).toBeNull();
    expect(document.getElementById('target-contract-nonSevereBenefitCap')).toBeNull();
    const severe = step3.getByRole('checkbox', { name: /^중증 비급여 특약/ });
    await user.click(severe);
    const cap = document.getElementById('target-contract-nonCoveredBenefitCap') as HTMLInputElement;
    await user.click(within(cap).getByRole('button', { name: '3,000만원' })); // 가입 후 금액을 선택했다가 특약을 해제
    await user.click(severe);
    expect(document.getElementById('target-contract-nonCoveredBenefitCap')).toBeNull();
    await user.type(document.getElementById('target-premium') as HTMLInputElement, '30000');
    await fillContractFacts(user, 'target-contract');
    await user.click(nextButton());
    expect(alertText()).toBe('');
    await user.click(panel(4).getByRole('checkbox', { name: /^입력한 치료는 모두 보험금을 받을 수 있는/ }));
    await user.click(panel(4).getByRole('checkbox', { name: /^내가 낸 금액 전체를/ }));
    await user.click(panel(4).getByRole('checkbox', { name: /^같은 치료를 여러 번 받는다면/ }));
    await user.click(nextButton());
    expect(useAnalysisStore.getState().calculationAssumptions.targetContractFacts?.nonCoveredBenefitCap).toBeUndefined();
    expect(calculateSaved().complete).toBe(true);
  });

  it("도수치료가 10회를 넘을 때만 '증상 개선 확인' 가정이 나오고, 선택하면 계산된다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4, { gen4NonCoveredRider: true });
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "NON_COVERED", cost: "100000", cause: "DISEASE", nonCoveredType: "MANUAL_THERAPY", severity: "NON_SEVERE", target5GRiders: true, frequency: "112" });
    await fillStep3(user, { submit: false });
    const label = "10번 넘게 받는 도수치료도, 치료 효과가 확인되면 보험금을 받는다고 보고 계산해도 될까요?";
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
    expect(panel(4).queryByText("10번 넘게 받는 도수치료도, 치료 효과가 확인되면 보험금을 받는다고 보고 계산해도 될까요?")).toBeNull();
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
    const severity = () => step2.queryByText(/산정특례 질환/);
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
    expect(severity()).toBeNull(); // 소비자용은 5세대 전용 질문을 묻지 않는다
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

  it("1세대 입원: 예상 금액에서 병실료 차액을 나눠 계산하고, 차액을 비우면 다인실(0원)로 본다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 1);
    await fillStep2(user, { careSetting: "INPATIENT", benefitClass: "COVERED", cost: "1000000", cause: "INJURY", daysSinceAccident: "10", gen1RoomDifference: "200000" });
    const [split] = useAnalysisStore.getState().usages;
    expect(split.gen1RoomDifference).toBe(200000);
    expect(split.gen1CoveredRoomAndTreatment).toBe(800000);
    expect(split.samsungCalculationInput?.roomDifference).toBeUndefined();
  });

  it("1세대 입원: 병실료 차액을 비우면 0원, 전액을 병실료 차액 외 부담액으로 본다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 1);
    await fillStep2(user, { careSetting: "INPATIENT", benefitClass: "COVERED", cost: "1000000", cause: "INJURY", daysSinceAccident: "10" });
    const [whole] = useAnalysisStore.getState().usages;
    expect(whole.gen1RoomDifference).toBe(0);
    expect(whole.gen1CoveredRoomAndTreatment).toBe(1000000);
  });

  for (const [variantName, option] of [["표준형", /1\. 표준형/], ["선택형Ⅱ", /2\. 선택형Ⅱ/]] as const) {
    it(`2세대 ${variantName} 입원: 예상 금액에서 병실료 차액을 나눠 저장하고, 비우면 0원으로 본다 (소비자용)`, async () => {
      const user = renderPage();
      await user.selectOptions(document.getElementById("generation-select") as HTMLSelectElement, "2");
      await user.type(screen.getByLabelText(/현재 월 보험료/), "50000");
      await user.click(document.getElementById("samsung-gen23-variant") as HTMLElement);
      await user.click(screen.getByRole("option", { name: option }));
      for (const [key, amount] of [["gen23ContractBenefitCap", "50000000"], ["gen23OutpatientBenefitCap", "250000"], ["gen23PrescriptionBenefitCap", "50000"]]) {
        await user.type(document.getElementById(`contract-detail-${key}`) as HTMLInputElement, amount);
      }
      await user.click(nextButton());
      expect(alertText()).toBe("");
      const step2 = panel(2);
      await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
      await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "입원 치료");
      await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
      await user.click(step2.getByRole("checkbox", { name: "입원", exact: true }));
      await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
      await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "1000000");
      await user.type(step2.getByLabelText(/예상 횟수/), "1");
      // 나눠 입력하던 칸은 더 이상 묻지 않는다.
      for (const name of ["급여 본인부담금", "비급여 금액", "병실료 제외 입원 계산 대상액"]) expect(step2.queryByText(new RegExp(name))).toBeNull();
      await user.type(step2.getByLabelText("병실료 차액"), "200000");
      await user.click(step2.getByRole("button", { name: "추가하기" }));
      const [split] = useAnalysisStore.getState().usages;
      expect(split.gen23RoomDifference).toBe(200000);
      if (variantName === "표준형") expect(split.gen23InpatientExcludingRoomDifference).toBe(800000);
      else { expect(split.gen23CoveredCopay).toBe(800000); expect(split.gen23NonCoveredExpense).toBe(0); }
    });
  }

  it("비급여: 소비자용은 산정특례·의료기관 종별을 묻지 않고, 5세대 비급여 특약을 고르면 STEP 4 가정으로 처리한다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
    await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "비급여 입원");
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
    await user.click(step2.getByRole("checkbox", { name: "입원", exact: true }));
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "NON_COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "1000000");
    await user.type(step2.getByLabelText(/예상 횟수/), "1");
    expect(step2.queryByText(/산정특례/)).toBeNull();
    expect(document.getElementById("copay-institution")).toBeNull();
    expect(step2.queryByRole("group", { name: "5세대 세부 보장 및 계약 확인" })).toBeNull();
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    await user.click(nextButton());
    await user.type(document.getElementById("target-premium") as HTMLInputElement, "30000");
    await user.click(panel(3).getByRole("checkbox", { name: /^중증 비급여 특약/ }));
    await fillContractFacts(user, "target-contract");
    await user.click(nextButton());
    expect(alertText()).toBe("");
    // 가정을 고르지 않으면 5세대 비급여 입원은 확인 필요로 남는다.
    const assumptionStep = panel(4);
    expect(assumptionStep.getByText(/일반 질환 때문인가요/)).toBeTruthy();
    expect(assumptionStep.getByText(/병원이나 의원\(종합병원·상급종합병원 제외\)에서 한다고 보고/)).toBeTruthy();
    await user.click(assumptionStep.getByText("입력한 치료는 모두 보험금을 받을 수 있는 일반 치료인가요?").closest("label")?.querySelector("input") as HTMLInputElement);
    await user.click(assumptionStep.getByText("내가 낸 금액 전체를 보험이 인정하는 금액으로 보고 계산해도 될까요?").closest("label")?.querySelector("input") as HTMLInputElement);
    await user.click(assumptionStep.getByText("같은 치료를 여러 번 받는다면, 받는 날이 모두 다른가요?").closest("label")?.querySelector("input") as HTMLInputElement);
    await user.click(nextButton());
    expect(calculateSaved().items[0].target.claim).toBeNull();
    // 두 가정을 고르면 5세대 비급여 입원이 비중증·병원 기준으로 계산된다.
    await user.click(screen.getByRole("button", { name: /4단계|명시적 계산 가정/ }));
    const again = panel(4);
    await user.click(again.getByText(/일반 질환 때문인가요/).closest("label")?.querySelector("input") as HTMLInputElement);
    await user.click(again.getByText(/병원이나 의원\(종합병원·상급종합병원 제외\)에서 한다고 보고/).closest("label")?.querySelector("input") as HTMLInputElement);
    await user.click(nextButton());
    const result = calculateSaved().items[0];
    expect(result.target.claim).not.toBeNull();
    expect(result.target.appliedAssumptions?.join(" ")).toContain("비중증 비급여로 봄");
  });

  async function fillGen4NonCoveredInpatient(user: UserEvent, roomDifference: string) {
    await fillStep1(user, 4, { gen4NonCoveredRider: true });
    const step2 = panel(2);
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
    await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "비급여 입원");
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
    await user.click(step2.getByRole("checkbox", { name: "입원", exact: true }));
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "NON_COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "1000000");
    await user.type(step2.getByLabelText(/예상 횟수/), "1");
    await user.type(step2.getByLabelText("병실료 차액"), roomDifference);
    await user.type(step2.getByLabelText(/입원일 수/), "5");
    await user.click(step2.getByRole("button", { name: "추가하기" }));
  }

  it("4세대 일반 비급여 입원: 총액 100만원, 병실료 차액 20만원이면 80만원×70% + 20만원×50% = 66만원 (소비자용)", async () => {
    const user = renderPage();
    await fillGen4NonCoveredInpatient(user, "200000");
    expect(alertText()).toBe("");
    await user.click(nextButton());
    await fillStep3(user);
    const current = calculateSaved().items[0].current;
    expect(current.ruleId).toBe("G4-03");
    expect(current.claim).toBe(660_000);
  });

  it("4세대 일반 비급여 입원: 병실료 차액이 위 예상 금액보다 크면 추가할 수 없다 (소비자용)", async () => {
    const user = renderPage();
    await fillGen4NonCoveredInpatient(user, "1200000");
    expect(alertText()).toContain("병실료 차액");
  });

  async function setupGen3(user: UserEvent, optionName: RegExp) {
    await user.selectOptions(document.getElementById("generation-select") as HTMLSelectElement, "3");
    await user.type(screen.getByLabelText(/현재 월 보험료/), "50000");
    await user.click(document.getElementById("samsung-gen23-variant") as HTMLElement);
    await user.click(screen.getByRole("option", { name: optionName }));
    const boxes = within(document.querySelector("#input-step-1 .rider-row__boxes") as HTMLElement).getAllByRole("checkbox", { hidden: true });
    for (const box of boxes) await user.click(box);
    for (const [key, amount] of [["gen23ContractBenefitCap", "50000000"], ["gen23OutpatientBenefitCap", "250000"], ["gen23PrescriptionBenefitCap", "50000"]]) {
      await user.type(document.getElementById(`contract-detail-${key}`) as HTMLInputElement, amount);
    }
    await user.click(nextButton());
    expect(alertText()).toBe("");
  }

  it("3세대 일반 치료 입원: 병실료 차액만 받고 나눠 저장하며, 3대 특약 제외 확인은 치료 종류로 갈음한다 (소비자용)", async () => {
    const user = renderPage();
    await setupGen3(user, /1\. 표준형/);
    const step2 = panel(2);
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
    await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "입원 치료");
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
    await user.click(step2.getByRole("checkbox", { name: "입원", exact: true }));
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "1000000");
    await user.type(step2.getByLabelText(/예상 횟수/), "1");
    for (const name of ["급여 본인부담금", "비급여 금액", "병실료 제외 입원 계산 대상액", "3대 특약 대상액 제외 확인", "항암제·항생제"]) expect(step2.queryByText(new RegExp(name))).toBeNull();
    await user.type(step2.getByLabelText("병실료 차액"), "200000");
    await user.type(step2.getByLabelText(/입원일 수/), "5");
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    const [saved] = useAnalysisStore.getState().usages;
    expect(saved.gen23RoomDifference).toBe(200000);
    expect(saved.gen23InpatientExcludingRoomDifference).toBe(800000);
    expect(saved.gen23ThreeNonCoveredExcludedFromBaseConfirmed).toBe(true);
    // 화면에서 입력한 값만으로 현재 계약(3세대) 보험금이 계산된다.
    await user.click(nextButton());
    await fillStep3(user);
    const result = calculateSaved();
    expect(result.items[0].current.reasons.join(" ")).not.toContain("확인");
    expect(result.currentClaimTotal).not.toBeNull();
  });

  it("3세대 일반 치료 통원: 확인 질문 없이 입력한 값만으로 계산된다 (소비자용)", async () => {
    const user = renderPage();
    await setupGen3(user, /1\. 표준형/);
    const step2 = panel(2);
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
    await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "외래 진료");
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
    await user.click(step2.getByRole("checkbox", { name: "통원", exact: true }));
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "100000");
    await user.type(step2.getByLabelText(/예상 횟수/), "1");
    await user.selectOptions(document.getElementById("copay-institution") as HTMLSelectElement, "CLINIC");
    expect(step2.queryByText(/3대 특약 대상액 제외 확인/)).toBeNull();
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    await user.click(nextButton());
    await fillStep3(user);
    const result = calculateSaved();
    expect(result.currentClaimTotal).not.toBeNull();
  });

  it("비급여 입원: 먼저 급여로 종별을 골랐다가 비급여로 바꿔도 5세대 병원 가정 질문이 나오고, 이전 종별은 남지 않는다 (소비자용)", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "OTHER");
    await user.type(step2.getByPlaceholderText("예: 외래 진료, 검사, 수술"), "비급여 입원");
    await user.selectOptions(step2.getByLabelText(/^치료 원인/, { selector: "select" }), "DISEASE");
    await user.click(step2.getByRole("checkbox", { name: "입원", exact: true }));
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    await user.selectOptions(document.getElementById("copay-institution") as HTMLSelectElement, "CLINIC");
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "NON_COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "1000000");
    await user.type(step2.getByLabelText(/예상 횟수/), "1");
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    const [saved] = useAnalysisStore.getState().usages;
    expect(saved.institutionType).toBeUndefined();
    expect(saved.copayInstitution).toBeUndefined();
    await user.click(nextButton());
    await user.type(document.getElementById("target-premium") as HTMLInputElement, "30000");
    await user.click(panel(3).getByRole("checkbox", { name: /^중증 비급여 특약/ }));
    await fillContractFacts(user, "target-contract");
    await user.click(nextButton());
    expect(panel(4).getByText(/병원이나 의원\(종합병원·상급종합병원 제외\)에서 한다고 보고/)).toBeTruthy();
  });

  it.each([
    ["일반 외래 진료", "X-ray 아님: 치료명", "20,000", "4", "통원", "COVERED"],
    ["일반 외래검사", "", "40,000", "3", "통원", "COVERED"],
    ["비급여 외래 치료", "MRI", "400,000", "3", "통원", "NON_COVERED"],
    ["도수치료 (11회 이상)", "MANUAL_THERAPY", "100,000", "12", "통원", "NON_COVERED"],
    ["비급여 입원", "", "1,500,000", "1", "입원", "NON_COVERED"],
  ])("치료 샘플 '%s': 치료 정보 칸이 명세대로 채워진다 (소비자용)", async (label, kindValue, cost, frequency, care, benefit) => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    await user.click(step2.getByRole("button", { name: "치료 샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: label }));
    expect((step2.getByLabelText(/급여 여부/) as HTMLSelectElement).value).toBe(benefit);
    expect((step2.getByRole("checkbox", { name: care, exact: true }) as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById("patient-unit-cost") as HTMLInputElement).value).toBe(cost);
    expect((step2.getByLabelText(/예상 횟수/) as HTMLInputElement).value).toBe(frequency);
    if (kindValue === "MRI" || kindValue === "MANUAL_THERAPY") expect((document.getElementById("treatment-kind") as HTMLSelectElement).value).toBe(kindValue);
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    expect(useAnalysisStore.getState().usages).toHaveLength(1);
  });

  it("3세대 주사: 주사 확인 질문만 나오고, 일반·도수에는 나오지 않는다 (소비자용)", async () => {
    const user = renderPage();
    await setupGen3(user, /1\. 표준형/);
    const step2 = panel(2);
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "NON_COVERED");
    expect(step2.queryByText(/항암제·항생제/)).toBeNull();
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "INJECTION");
    expect(step2.queryByText(/항암제·항생제/)).not.toBeNull();
    expect(step2.queryByText(/급여 본인부담금/)).toBeNull();
    await user.selectOptions(document.getElementById("treatment-kind") as HTMLSelectElement, "MANUAL_THERAPY");
    expect(step2.queryByText(/항암제·항생제/)).toBeNull();
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
