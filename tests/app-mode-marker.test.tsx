// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AppShell from "../src/components/AppShell";
import ConsumerAppShell from "../src/consumer/components/AppShell";

afterEach(() => cleanup());

const shellProps = { currentStep: 1 } as never;

describe("화면 모드 표시(body data-app-mode)", () => {
  it("설계사용 화면은 planner, 소비자용 화면은 consumer로 표시하고 화면을 벗어나면 지운다", () => {
    const planner = render(createElement(MemoryRouter, null, createElement(AppShell, shellProps, createElement("div"))));
    expect(document.body.dataset.appMode).toBe("planner");
    planner.unmount();
    expect(document.body.dataset.appMode).toBeUndefined();

    const consumer = render(createElement(MemoryRouter, null, createElement(ConsumerAppShell, shellProps, createElement("div"))));
    expect(document.body.dataset.appMode).toBe("consumer");
    consumer.unmount();
    expect(document.body.dataset.appMode).toBeUndefined();
  });
});
