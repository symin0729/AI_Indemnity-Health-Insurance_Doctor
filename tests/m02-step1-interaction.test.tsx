// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import M02InputPage from "../src/pages/M02InputPage/M02InputPage";
import { useAnalysisStore } from "../src/store/useAnalysisStore";

/**
 * 입력 화면 STEP 1을 실제로 클릭하고 입력하며 확인하는 동작 테스트.
 * 세대·가입일·샘플 불러오기·초기화가 서로 어떻게 영향을 주는지, 그리고 단계 사이가 섞이지 않는지를 확인한다.
 */
beforeEach(() => {
  useAnalysisStore.getState().resetAnalysis();
  window.history.replaceState(null, "", "/input");
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  // jsdom에는 <dialog>의 열기·닫기가 없어 화면 코드가 호출할 수 있게 비워 둔다.
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => cleanup());

const renderPage = () => {
  const user = userEvent.setup();
  render(createElement(MemoryRouter, null, createElement(M02InputPage)));
  return user;
};
const generationSelect = () => document.getElementById("generation-select") as HTMLSelectElement;
const step1 = () => within(document.getElementById("input-step-1") as HTMLElement);
const insurerInput = () => screen.getByLabelText("보험사") as HTMLInputElement;
const productInput = () => screen.getByLabelText("상품명") as HTMLInputElement;
const dateInput = () => screen.getByPlaceholderText("YYYY-MM-DD (예: 2018-03-01)") as HTMLInputElement;
const premiumInput = () => screen.getByLabelText(/현재 월 보험료/) as HTMLInputElement;
const targetPremiumInput = () => document.getElementById("target-premium") as HTMLInputElement;
const variantButton = () => document.getElementById("samsung-gen23-variant") as HTMLButtonElement;
const riderBoxes = () => within(document.querySelector("#input-step-1 .rider-row__boxes") as HTMLElement).getAllByRole("checkbox", { hidden: true }) as HTMLInputElement[];
const nextButton = () => screen.getByRole("button", { name: "다음 단계" });
const visiblePanel = (n: number) => document.querySelector(`#input-step-${n}`)?.closest(".workflow-panel") as HTMLElement;

describe("실손 세대 선택", () => {
  it("처음에는 세대가 선택되어 있지 않고 세대별 입력이 보이지 않는다", () => {
    renderPage();
    expect(generationSelect().value).toBe("");
    expect(step1().queryByText("상품 종형")).toBeNull();
    expect(step1().queryByText("가입 상품")).toBeNull();
    expect(step1().queryByText(/특약 가입 여부/)).toBeNull();
  });

  it("세대를 고르면 그 세대에 맞는 입력이 나온다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "3");
    expect(step1().getByText("상품 종형")).toBeTruthy();
    expect(riderBoxes()).toHaveLength(3);
    await user.selectOptions(generationSelect(), "1");
    expect(step1().getByText("가입 상품")).toBeTruthy();
    expect(riderBoxes().map((box) => box.closest("label")?.textContent)).toEqual([
      expect.stringContaining("상해"),
      expect.stringContaining("질병"),
    ]);
    await user.selectOptions(generationSelect(), "4");
    expect(step1().getByText(/급여 주계약은 필수 가입으로 자동 포함/)).toBeTruthy();
  });

  it("세대를 고르면 가입일이 그 세대의 기본 날짜로 채워진다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "2");
    expect(dateInput().value).toBe("2015-09-01");
  });

  it("같은 세대를 다시 골라도 입력한 보험사·상품명이 초기화된다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "3");
    await user.type(insurerInput(), "내 보험사");
    expect(insurerInput().value).toBe("내 보험사");
    await user.selectOptions(generationSelect(), "3");
    expect(insurerInput().value).toBe("");
  });

  it("샘플 없이 직접 입력한 월 보험료는 세대를 바꿔도 유지된다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "3");
    await user.type(premiumInput(), "55000");
    await user.selectOptions(generationSelect(), "4");
    expect(premiumInput().value).toBe("55,000");
  });
});

describe("가입일 입력", () => {
  it("가입일을 입력하면 해당 세대가 자동으로 선택된다", async () => {
    const user = renderPage();
    await user.type(dateInput(), "20180301");
    expect(dateInput().value).toBe("2018-03-01");
    expect(generationSelect().value).toBe("3");
  });

  it("5세대 시기 가입일은 세대를 바꾸지 않고 다음 단계에서 안내한다", async () => {
    const user = renderPage();
    await user.type(dateInput(), "20260601");
    expect(generationSelect().value).toBe("");
    await user.selectOptions(generationSelect(), "3");
    await user.clear(dateInput());
    await user.type(dateInput(), "20260601");
    await user.type(premiumInput(), "60000");
    await user.click(nextButton());
    expect(screen.getByRole("alert").textContent).toContain("가입일이 5세대 시기");
  });

  it("가입일을 바꾸면 상품 종형이 다시 필수 선택으로 돌아간다", async () => {
    const user = renderPage();
    await user.type(dateInput(), "20180301");
    await user.click(variantButton());
    await user.click(screen.getByRole("option", { name: /1\. 표준형/ }));
    expect(variantButton().textContent).toContain("1. 표준형");
    await user.type(dateInput(), "{backspace}2");
    expect(variantButton().textContent).toContain("필수 선택");
  });

  it("2세대 2013.1~2015.8 가입일은 약관 규칙 미등록 종형만 보이고 다음 단계가 막힌다", async () => {
    const user = renderPage();
    await user.type(dateInput(), "20140501");
    expect(generationSelect().value).toBe("2");
    await user.click(variantButton());
    const listbox = within(screen.getByRole("listbox"));
    const options = listbox.getAllByRole("option").map((option) => option.textContent ?? "");
    expect(options.some((text) => text.includes("1. 표준형") && text.includes("약관 규칙이 등록되지 않아 계산 제공하지 않음"))).toBe(true);
    expect(options.some((text) => text.includes("2. 선택형") && text.includes("약관 규칙이 등록되지 않아 계산 제공하지 않음"))).toBe(true);
    await user.click(listbox.getAllByRole("option")[0]);
    await user.type(premiumInput(), "60000");
    await user.click(nextButton());
    expect(document.getElementById("variant-unregistered-banner")?.textContent).toContain("약관 규칙이 등록되지 않아 계산 제공하지 않음");
    expect(visiblePanel(1).hidden).toBe(false);
  });
});

describe("STEP 1 샘플 불러오기", () => {
  it("현재 계약만 채운다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    expect(generationSelect().value).toBe("3");
    expect(dateInput().value).toBe("2018-03-01");
    expect(insurerInput().value).toBe("OO 보험");
    expect(productInput().value).toBe("OO 실손의료보험");
    expect(premiumInput().value).toBe("60,000");
    expect(variantButton().textContent).toContain("1. 표준형");
    expect(riderBoxes().every((box) => !box.checked)).toBe(true);
  });

  it("STEP 2(5세대 비교 조건·예정 치료)와 STEP 3(계산 가정)은 채우지 않는다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    expect(targetPremiumInput().value).toBe("");
    const targetRiders = within(document.getElementById("input-step-3") as HTMLElement).getAllByRole("checkbox", { hidden: true }) as HTMLInputElement[];
    expect(targetRiders.every((box) => !box.checked)).toBe(true);
    const assumptions = within(visiblePanel(4)).getAllByRole("checkbox", { hidden: true }) as HTMLInputElement[];
    expect(assumptions.length).toBeGreaterThan(0);
    expect(assumptions.every((box) => !box.checked)).toBe(true);
    expect((document.getElementById("treatment-kind") as HTMLSelectElement).value).toBe("");
  });

  it("샘플을 불러온 뒤 세대를 바꾸면 샘플이 채운 값이 남지 않는다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    expect(screen.getByText("샘플 입력 완료")).toBeTruthy();
    await user.selectOptions(generationSelect(), "2");
    expect(generationSelect().value).toBe("2");
    expect(insurerInput().value).toBe("");
    expect(productInput().value).toBe("");
    expect(premiumInput().value).toBe("");
    expect(dateInput().value).toBe("2015-09-01");
    expect(variantButton().textContent).toContain("필수 선택");
    expect(screen.queryByText("샘플 입력 완료")).toBeNull();
  });
});

describe("STEP 1 초기화", () => {
  it("STEP 1 입력만 지우고 STEP 2 입력은 유지한다", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    fireEvent.change(targetPremiumInput(), { target: { value: "35000" } });
    expect(targetPremiumInput().value).toBe("35,000");
    await user.click(screen.getByRole("button", { name: "초기화" }));
    const confirm = screen.getAllByRole("button", { name: "초기화" }).at(-1) as HTMLElement;
    await user.click(confirm);
    expect(generationSelect().value).toBe("");
    expect(insurerInput().value).toBe("");
    expect(premiumInput().value).toBe("");
    expect(targetPremiumInput().value).toBe("35,000");
  });
});

describe("보험사·상품명", () => {
  it("2세대 이후에는 입력한 이름이 그대로 보이고 비우면 OO 안내가 보인다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "3");
    expect(insurerInput().placeholder).toBe("OO 보험");
    expect(productInput().placeholder).toBe("OO 실손의료보험");
    await user.type(productInput(), "내 상품");
    expect(productInput().value).toBe("내 상품");
  });

  it("1세대 대표 상품(OO 보험)을 고르면 이름이 자동으로 채워지고 수정할 수 있다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "1");
    await user.selectOptions(document.getElementById("samsung-gen1-product") as HTMLSelectElement, "SAMSUNG_0904_2");
    expect(insurerInput().value).toBe("OO 보험");
    expect(productInput().value).toBe("OO 실손 의료 보험");
    await user.clear(insurerInput());
    await user.type(insurerInput(), "내 보험사");
    expect(insurerInput().value).toBe("내 보험사");
  });

  it("1세대 다른 보험사를 고르면 회사명과 임의 상품명이 채워진다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "1");
    await user.selectOptions(document.getElementById("samsung-gen1-product") as HTMLSelectElement, "OTHER_POST");
    expect(insurerInput().value).toBe("우체국보험");
    expect(productInput().value).toBe("우체국보험 실손 의료 보험");
  });
});

describe("1세대 필수 입력", () => {
  it("가입 상품과 특약(상해/질병)을 모두 고르면 다음 단계로 이동한다", async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), "1");
    await user.type(premiumInput(), "50000");
    await user.click(nextButton());
    expect(screen.getByRole("alert").textContent).toContain("1세대 실손보험의 가입 상품을 반드시 선택해주세요.");
    await user.selectOptions(document.getElementById("samsung-gen1-product") as HTMLSelectElement, "SAMSUNG_0904_2");
    await user.click(nextButton());
    expect(screen.getByRole("alert").textContent).toContain("가입한 특약을 하나 이상 선택해주세요.");
    await user.click(riderBoxes()[0]);
    await user.click(nextButton());
    expect(visiblePanel(1).hidden).toBe(true);
    expect(visiblePanel(2).hidden).toBe(false);
  });
});

describe("STEP 2 치료 샘플 불러오기", () => {
  it("예정 치료만 채우고 STEP 1(종형·특약)과 STEP 3(계산 가정)은 건드리지 않는다", async () => {
    window.history.replaceState(null, "", "/input#input-step-2");
    const user = renderPage();
    await user.selectOptions(generationSelect(), "3");
    expect(variantButton().textContent).toContain("필수 선택");
    await user.click(screen.getByRole("button", { name: "치료 샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "MRI 검사" }));
    expect((document.getElementById("treatment-kind") as HTMLSelectElement).value).not.toBe("");
    // STEP 1
    expect(variantButton().textContent).toContain("필수 선택");
    expect(riderBoxes().every((box) => !box.checked)).toBe(true);
    // STEP 3
    const assumptions = within(visiblePanel(4)).getAllByRole("checkbox", { hidden: true }) as HTMLInputElement[];
    expect(assumptions.every((box) => !box.checked)).toBe(true);
  });
});

describe('설계사용 계약 상세 필수 입력', () => {
  it('가입금액 누락은 다음 단계와 사이드바 이동 모두 막는다', async () => {
    const user = renderPage();
    await user.click(screen.getByRole('button', { name: '샘플 불러오기' }));
    const cap = document.getElementById('contract-detail-gen23ContractBenefitCap') as HTMLInputElement;
    await user.clear(cap);
    expect(cap.required).toBe(true);
    await user.click(nextButton());
    expect(visiblePanel(1).hidden).toBe(false);
    expect(screen.getByRole('alert').textContent).toContain('입원 가입금액');
    await user.click(screen.getByRole('button', { name: '2단계 예정 치료' }));
    expect(visiblePanel(1).hidden).toBe(false);
    await user.type(cap, '30000000');
    await user.click(nextButton());
    expect(visiblePanel(2).hidden).toBe(false);
  });

  it('보험기간 구분과 종료 후 계속치료 칸은 묻지 않고, 중복 계약 칸도 없다', async () => {
    const user = renderPage();
    await user.click(screen.getByRole('button', { name: '샘플 불러오기' }));
    for (const key of ['gen23CoveragePeriod', 'gen23CoveragePeriodConfirmed', 'gen23DaysSinceTermination', 'gen23PostTerminationContinuationConfirmed', 'gen23OtherIndemnityPoliciesExist', 'gen23ProportionalPaymentFactor']) {
      expect(document.getElementById(`contract-detail-${key}`), key).toBeNull();
    }
    await user.click(nextButton());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(visiblePanel(2).hidden).toBe(false);
  });

  it('4세대 미가입 특약의 가입금액을 숨기고 가입 시 필수로 받는다', async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), '4');
    expect(document.getElementById('current-contract-nonCoveredBenefitCap')).toBeNull();
    await user.click(step1().getByRole('checkbox', { name: '비급여 특약' }));
    expect((document.getElementById('current-contract-nonCoveredBenefitCap') as HTMLInputElement).required).toBe(true);
    await user.type(premiumInput(), '50000');
    await user.type(document.getElementById('current-contract-coveredBenefitCap') as HTMLInputElement, '50000000');
    await user.type(document.getElementById('current-contract-coveredOutpatientCap') as HTMLInputElement, '200000');
    expect(document.getElementById('current-contract-other')).toBeNull();
    expect(document.getElementById('target-contract-other')).toBeNull();
    expect(document.getElementById('current-contract-period')).toBeNull();
    await user.click(nextButton());
    expect(screen.getByRole('alert').textContent).toContain('비급여 연간 가입금액');
    await user.click(step1().getByRole('checkbox', { name: '비급여 특약' }));
    await user.click(nextButton());
    expect(visiblePanel(2).hidden).toBe(false);
  });

  it('갱신 주기와 재가입 주기는 기존 위치에서 바로 입력할 수 있다', async () => {
    const user = renderPage();
    await user.selectOptions(generationSelect(), '3');
    const renewal = step1().getByRole('spinbutton', { name: /갱신 주기/ });
    const reentry = step1().getByRole('spinbutton', { name: /재가입 주기/ });
    expect(renewal.closest('details')).toBeNull();
    expect(reentry.closest('details')).toBeNull();
    await user.type(renewal, '12');
    await user.type(reentry, '15');
    expect((renewal as HTMLInputElement).value).toBe('12');
    expect((reentry as HTMLInputElement).value).toBe('15');
  });
});
