// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SamsungContractFactsFields from "../src/components/samsung/SamsungContractFactsFields";

afterEach(() => cleanup());

describe("현재·비교 계약 입력에서 보험기간 구분은 묻지 않는다", () => {
  it.each([["planner", 4], ["planner", 5], ["consumer", 4], ["consumer", 5]] as const)("%s %i세대", (mode, generation) => {
    const { container } = render(createElement(SamsungContractFactsFields, { value: {}, onChange: () => {}, generation, prefix: "t", mode }));
    expect(container.querySelector("#t-period")).toBeNull();
    expect(container.textContent).not.toMatch(/보험기간|계속치료|계속 치료/);
  });

  it("설계사용 급여 가입금액 칸 이름 옆에만 설명을 보여준다", () => {
    const planner = render(createElement(SamsungContractFactsFields, { value: {}, onChange: () => {}, generation: 4, prefix: "t", requiredFields: true, mode: "planner" }));
    expect(planner.container.textContent).toContain("상해·질병 각각, 입원+통원 합산 연 최대 보상액");
    cleanup();
    const consumer = render(createElement(SamsungContractFactsFields, { value: {}, onChange: () => {}, generation: 4, prefix: "t", requiredFields: true, mode: "consumer" }));
    expect(consumer.container.textContent).not.toContain("상해·질병 각각, 입원+통원 합산 연 최대 보상액");
  });
});
