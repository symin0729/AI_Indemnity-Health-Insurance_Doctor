import { describe, expect, it } from "vitest";
import { GEN1_COMPANY_OPTIONS, gen1CompanyLabel, toGen1EngineProduct } from "../src/domain/gen1Product";

describe("1세대 상품 종형 선택", () => {
  it("보험사 선택지는 5개이며 삼성화재와 우체국보험을 포함한다", () => {
    expect(GEN1_COMPANY_OPTIONS.map((o) => o.label)).toEqual(["삼성화재", "우체국보험", "KB손해보험", "하나손해보험", "신한라이프"]);
  });
  it("엔진에는 대표 상품 여부만 전달한다", () => {
    expect(toGen1EngineProduct("SAMSUNG_0904_2")).toBe("SAMSUNG_0904_2");
    expect(toGen1EngineProduct("UNKNOWN")).toBe("UNKNOWN");
    for (const option of GEN1_COMPANY_OPTIONS) expect(toGen1EngineProduct(option.value)).toBe("OTHER");
  });
  it("보험사 이름을 찾을 수 있다", () => {
    expect(gen1CompanyLabel("OTHER_POST")).toBe("우체국보험");
    expect(gen1CompanyLabel("SAMSUNG_0904_2")).toBeUndefined();
  });
});

import { gen1CompanyProductName, isGen1ProductUnregistered } from "../src/domain/gen1Product";
describe("1세대 약관 규칙 미등록 판정", () => {
  it("대표 상품만 계산 가능하고 보험사 선택은 미등록으로 본다", () => {
    expect(isGen1ProductUnregistered("SAMSUNG_0904_2")).toBe(false);
    expect(isGen1ProductUnregistered("UNKNOWN")).toBe(false);
    for (const option of GEN1_COMPANY_OPTIONS) expect(isGen1ProductUnregistered(option.value)).toBe(true);
  });
  it("보험사 선택 시 임의 상품명을 만든다", () => {
    expect(gen1CompanyProductName("우체국보험")).toBe("우체국보험 실손 의료 보험");
  });
});
