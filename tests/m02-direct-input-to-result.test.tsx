// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import M02InputPage from "../src/pages/M02InputPage/M02InputPage";
import { prepareUsageForSamsungComparison } from "../src/pages/M04ResultPage/M04ResultPage";
import { calculateSamsungAnnualComparison } from "../src/engine/calculateSamsungComparison";
import { useAnalysisStore } from "../src/store/useAnalysisStore";

/**
 * 샘플을 쓰지 않고 화면에 직접 입력한 값만으로 결과(현재 계약·5세대)가 계산되는지 확인한다.
 * 샘플은 계산에 필요한 값을 미리 채워 두기 때문에, 화면에 입력칸이 빠져도 샘플 테스트로는 드러나지 않는다.
 * 엔진이 새 값을 요구하는데 화면에 칸이 없으면 이 테스트가 실패한다.
 */
beforeEach(() => {
  useAnalysisStore.getState().resetAnalysis();
  // 화면은 주소의 #input-step-N으로 현재 단계를 기억하므로 테스트마다 처음 단계로 돌린다.
  window.history.replaceState(null, "", "/input");
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

async function fillStep1(user: UserEvent, generation: 1 | 4, options: { gen4NonCoveredRider?: boolean; gen4PerOccurrenceCap?: string; priorCoveredDiseasePaid?: string } = {}) {
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
  target5GRiders?: boolean;
}

async function fillStep2(user: UserEvent, treatment: TreatmentInput) {
  const step2 = panel(2);
  await user.type(step2.getByPlaceholderText("예: MRI"), "직접 입력 치료");
  await user.selectOptions(step2.getByLabelText(/입원 \/ 통원/), treatment.careSetting);
  await user.selectOptions(step2.getByLabelText(/급여 여부/), treatment.benefitClass);
  await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, treatment.cost);
  await user.selectOptions(document.getElementById("copay-institution") as HTMLSelectElement, "CLINIC");

  const common = within(step2.getByRole("group", { name: "치료 원인과 보장 확인" }));
  await user.selectOptions(common.getAllByRole("combobox")[0], treatment.cause);
  await user.click(common.getByRole("checkbox"));
  if (treatment.nonCoveredType) await user.selectOptions(common.getAllByRole("combobox")[2], treatment.nonCoveredType);
  if (treatment.severity) await user.selectOptions(step2.getByDisplayValue("모름"), treatment.severity);
  if (treatment.daysSinceAccident !== undefined) {
    await user.type(daysSinceAccidentInput(), treatment.daysSinceAccident);
  }
  await user.click(step2.getByRole("button", { name: "추가하기" }));
  expect(alertText()).toBe("");

  // 필수 입력 안내 확인(STEP 3 진행 조건)
  await user.click(screen.getByRole("button", { name: /입력 도움말/ }));
  await user.click(screen.getAllByRole("button", { name: "확인" }).at(-1) as HTMLElement);
  await user.click(nextButton());
  expect(alertText()).toBe("");
}

async function fillStep3(user: UserEvent, options: { priorUsageNone?: boolean; priorCoveredDiseasePaid?: string; priorOutpatientCount?: string; submit?: boolean } = {}) {
  await user.type(document.getElementById("target-premium") as HTMLInputElement, "30000");
  await user.click(panel(3).getByRole("checkbox", { name: /^중증 비급여 특약/ }));
  await user.click(panel(3).getByRole("checkbox", { name: /비중증 비급여 특약/ }));
  await fillContractFacts(user, "target-contract");
  await user.click(nextButton());
  expect(alertText()).toBe("");
  const step3 = panel(4);
  if (options.priorCoveredDiseasePaid !== undefined || options.priorOutpatientCount !== undefined) {
    await user.selectOptions(document.getElementById('comparison-basis') as HTMLSelectElement, 'REMAINING_LIMITS');
    const field = document.getElementById(options.priorCoveredDiseasePaid !== undefined ? 'prior-priorCoveredDiseasePaid' : 'prior-gen23PriorOutpatientCount') as HTMLInputElement;
    await user.clear(field);
    await user.type(field, options.priorCoveredDiseasePaid ?? options.priorOutpatientCount!);
  }

  const check = (text: string) => user.click(step3.getByText(text).closest("label")?.querySelector("input") as HTMLInputElement);
  // 설계사가 보장대상 금액(C)을 모르고, 올해 사용한 한도가 없으며, 치료가 각각 다른 날 방문인 일반적인 경우
  await check("입력한 환자부담금 전액을 보장대상 금액으로 가정");
  if (options.priorUsageNone !== false && step3.queryByText("비워 둔 기존 사용분은 0으로 가정")) await check("비워 둔 기존 사용분은 0으로 가정");
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

describe("샘플 없이 직접 입력한 값으로 결과 계산", () => {
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

  it("4세대: STEP 4에 올해 이용 내역을 입력하면 사용분 가정 없이 계산하고 현재 계약 한도에만 반영한다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    expect(document.getElementById("prior-priorNonCoveredDiseasePaid")).toBeNull(); // 비급여 특약 미가입이면 숨김
    await fillStep2(user, { careSetting: "OUTPATIENT", benefitClass: "COVERED", cost: "100000", cause: "DISEASE" });
    await fillStep3(user, { priorUsageNone: false, priorCoveredDiseasePaid: "49990000" });
    expect(useAnalysisStore.getState().calculationAssumptions.assumeNoPriorLimitUsage).toBe(false);
    const result = calculateSaved();
    expect(result.items[0].current.claim).toBe(10_000); // 남은 한도 1만원
    expect(result.items[0].target.claim).toBe(70_000); // 5세대는 새 계약
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
    // 5세대 비중증 비급여 통원(G5-07): 10만원 − MAX(5만원, 10만원×50%) = 5만원
    expect(result.items[0].target.ruleId).toBe("G5-07");
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
    await user.click(screen.getByRole("button", { name: /입력 도움말/ }));
    await user.click(screen.getAllByRole("button", { name: "확인" }).at(-1) as HTMLElement);
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

  it("3세대: 올해 이용 내역은 STEP 4에서 받고, 예정 치료에는 입원의 이미 받은 보험금만 남긴다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    await user.click(nextButton());
    expect(alertText()).toBe("");

    await user.click(screen.getByRole("button", { name: "치료 샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "일반 외래 진료" }));
    // 외래 예정 치료에는 올해 이용 횟수·이미 받은 보험금 칸이 없다.
    expect(panel(2).queryByText("해당 담보의 이전 연간 이용횟수")).toBeNull();
    expect(panel(2).queryByText("해당 담보·기간의 이전 지급 보험금")).toBeNull();
    await user.click(panel(2).getByRole("button", { name: "추가하기" }));
    expect(alertText()).toBe("");
    await user.click(screen.getByRole("button", { name: /입력 도움말/ }));
    await user.click(screen.getAllByRole("button", { name: "확인" }).at(-1) as HTMLElement);
    await user.click(nextButton());
    await fillStep3(user, { priorUsageNone: false, priorOutpatientCount: "179" });
    expect(useAnalysisStore.getState().usages[0].gen23PriorAnnualCount).toBe(179);
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
    await user.click(screen.getByRole('button', { name: '3단계 5세대 비교 조건' }));
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
    await user.click(nextButton());
    expect(alertText()).toBe('');
    await user.click(panel(4).getByRole('checkbox', { name: /^입력한 환자부담금 전액/ }));
    await user.click(panel(4).getByRole('checkbox', { name: /^반복 치료/ }));
    await user.click(nextButton());
    expect(useAnalysisStore.getState().calculationAssumptions.targetContractFacts?.nonCoveredBenefitCap).toBeUndefined();
    expect(calculateSaved().complete).toBe(true);
  });

  it("치료 원인을 고르지 않으면 치료를 추가할 수 없다", async () => {
    const user = renderPage();
    await fillStep1(user, 4);
    const step2 = panel(2);
    await user.type(step2.getByPlaceholderText("예: MRI"), "직접 입력 치료");
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "100000");
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toContain("치료 원인(질병/상해)을 선택해주세요.");
  });

  it("1세대는 경과일을 넣지 않으면 치료를 추가할 수 없다", async () => {
    const user = renderPage();
    await fillStep1(user, 1);
    const step2 = panel(2);
    await user.type(step2.getByPlaceholderText("예: MRI"), "직접 입력 치료");
    await user.selectOptions(step2.getByLabelText(/급여 여부/), "COVERED");
    await user.type(document.getElementById("patient-unit-cost") as HTMLInputElement, "100000");
    const common = within(step2.getByRole("group", { name: "치료 원인과 보장 확인" }));
    await user.selectOptions(common.getAllByRole("combobox")[0], "INJURY");
    await user.click(common.getByRole("checkbox"));
    await user.click(step2.getByRole("button", { name: "추가하기" }));
    expect(alertText()).toContain("경과일");
  });
});
