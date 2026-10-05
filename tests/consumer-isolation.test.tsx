import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ConsumerInputPage from "../src/consumer/pages/M02InputPage/M02InputPage";
import { useAnalysisStore as plannerStore } from "../src/store/useAnalysisStore";
import { useAnalysisStore as consumerStore } from "../src/consumer/store/useAnalysisStore";

/** 소비자용(src/consumer)은 설계사용 화면·상태와 연결되지 않는 독립 복사본이어야 한다. */
const CONSUMER_DIR = "src/consumer";
const PLANNER_ONLY = ["src/pages/", "src/store/", "src/components/AppShell", "src/features/chatbot/"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const sources = walk(CONSUMER_DIR).filter((f) => /\.(ts|tsx)$/.test(f));

describe("소비자용과 설계사용의 분리", () => {
  it("소비자용 파일이 있다", () => expect(sources.length).toBeGreaterThan(5));

  it("소비자용 코드는 설계사용 화면·스토어·셸·챗봇을 가져오지 않는다", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
        const target = relative(".", normalize(join(dirname(file), match[1]))).replaceAll("\\", "/");
        if (PLANNER_ONLY.some((prefix) => target.startsWith(prefix))) offenders.push(`${file} → ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("소비자용 화면은 설계사용 경로(/input, /confirm, /result, /chat)로 이동하지 않는다", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/["'`]\/(input|confirm|result|chat)\b/g)) offenders.push(`${file}: ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("소비자용 스토어는 설계사용 스토어와 상태를 공유하지 않는다", () => {
    expect(consumerStore).not.toBe(plannerStore);
    expect(consumerStore.getState().mode).toBe("consumer");
    plannerStore.getState().setMode("planner");
    plannerStore.getState().setUsages([{ id: "x", treatmentName: "t", frequency: 1, unitCost: 1 } as never]);
    expect(consumerStore.getState().usages).toEqual([]);
    expect(consumerStore.getState().mode).toBe("consumer");
    plannerStore.getState().resetAnalysis();
  });

  it("소비자용 입력 화면이 그려지고, 모드는 소비자 용으로 잠겨 있다", () => {
    (globalThis as { window?: unknown }).window = { location: { hash: "" }, requestAnimationFrame: (f: () => void) => f(), scrollTo() {} };
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ConsumerInputPage)));
    expect(html).toContain("현재 계약");
    expect(html).toContain("소비자 용");
    expect(html).toContain("start-modes is-locked");
  });
});
