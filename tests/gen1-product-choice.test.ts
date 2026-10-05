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

import { displayInsurer, displayProductName, internalProductName, INTERNAL_INSURER, MASKED_INSURER, MASKED_PRODUCT_NAME } from "../src/domain/displayMask";
describe("보험사·상품명 표시 마스킹", () => {
  it("1세대 외에는 어떤 값이 저장돼 있어도 OO로 표시한다", () => {
    for (const generation of [2, 3, 4, 5]) {
      expect(displayInsurer({ generation }, "삼성화재")).toBe(MASKED_INSURER);
      expect(displayProductName({ generation }, "무배당 삼성화재 실손의료비보험(1704.1)")).toBe(MASKED_PRODUCT_NAME);
    }
    expect(MASKED_INSURER).toBe("OO 보험");
    expect(MASKED_PRODUCT_NAME).toBe("OO 실손의료보험");
  });
  it("1세대 외에는 사용자가 입력한 표시용 이름을 보여주고 비우면 OO로 돌아간다", () => {
    expect(displayInsurer({ generation: 3 }, "삼성화재", "내 보험사")).toBe("내 보험사");
    expect(displayProductName({ generation: 4 }, "무배당 삼성화재 실손의료비보험(2107.1)", " 내 상품 ")).toBe("내 상품");
    expect(displayInsurer({ generation: 3 }, "삼성화재", "  ")).toBe("OO 보험");
    expect(displayProductName({ generation: 2 }, "무배당 삼성화재 실손의료비보험(1611.7)", undefined)).toBe("OO 실손의료보험");
  });
  it("1세대는 선택한 보험사를 그대로, 대표 상품(OO 보험)은 OO로 표시한다", () => {
    expect(displayInsurer({ generation: 1, gen1Product: "OTHER_POST" }, "우체국보험")).toBe("우체국보험");
    expect(displayProductName({ generation: 1, gen1Product: "OTHER_POST" }, "우체국보험 실손 의료 보험")).toBe("우체국보험 실손 의료 보험");
    expect(displayInsurer({ generation: 1, gen1Product: "SAMSUNG_0904_2" }, "삼성화재")).toBe("OO 보험");
    expect(displayProductName({ generation: 1, gen1Product: "SAMSUNG_0904_2" }, "삼성 올라이프 100세 건강파트너보험(0904.2)")).toBe("OO 실손 의료 보험");
  });
  it("계산용 내부 값은 삼성화재 상품으로 고정한다", () => {
    expect(INTERNAL_INSURER).toBe("삼성화재");
    expect(internalProductName(3)).toBe("무배당 삼성화재 실손의료비보험(1704.1)");
    expect(internalProductName(2)).toBe("무배당 삼성화재 실손의료비보험(1611.7)");
  });
});
