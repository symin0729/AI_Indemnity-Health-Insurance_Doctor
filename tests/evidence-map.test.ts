import { describe, expect, it } from "vitest";
import { evidenceFromMap } from "../api/lib/evidenceFromMap";
import { lookupEvidence } from "../api/lib/evidenceMap";

describe("근거 맵 라우터", () => {
  it("담보 이름이 분명한 질문은 해당 근거 하나를 찾는다", () => {
    const { matches, ambiguous } = lookupEvidence("4세대 3대 비급여 중 MRI 한도는 얼마인가요?", { productCode: "SAMSUNG_2107_1" });
    expect(matches.map((m) => m.entry.evidenceId)).toEqual(["SAMSUNG_2107_1_E_G4-07"]);
    expect(ambiguous).toBe(false);
  });

  it("'비급여 주사'는 일반 비급여가 아니라 3대 비급여 주사료를 우선한다", () => {
    const { matches } = lookupEvidence("비급여 주사 치료비는 보험에서 어떻게 보상하나요?", { productCode: "SAMSUNG_2107_1" });
    expect(matches[0].entry.coverage).toBe("3대 비급여 주사료");
  });

  it("5세대 일반형과 전환형은 질문으로 구분되지 않으면 둘 다 돌려주고 모호함으로 표시한다", () => {
    const { matches, ambiguous } = lookupEvidence("5세대 급여 입원은 몇 퍼센트 보상되나요?", { productCode: "SAMSUNG_2605_1" });
    expect(matches.map((m) => m.entry.variant).sort()).toEqual(["conversion", "general"]);
    expect(ambiguous).toBe(true);
  });

  it("보상·공제·한도를 묻지 않는 일반 질문에는 개입하지 않는다", () => {
    expect(lookupEvidence("입원이라는 말은 정확히 어떤 뜻인가요?", { productCode: "SAMSUNG_2107_1" }).matches).toEqual([]);
    expect(lookupEvidence("상해와 질병은 약관에서 어떻게 구분하나요?", { productCode: "SAMSUNG_2107_1" }).matches).toEqual([]);
  });

  it("다른 상품의 근거는 찾지 않는다", () => {
    const { matches } = lookupEvidence("3대 비급여 MRI 한도는 얼마인가요?", { productCode: "SAMSUNG_0904_2" });
    expect(matches.every((m) => m.entry.productCode === "SAMSUNG_0904_2")).toBe(true);
  });
});

describe("근거 맵 상태 게이트", () => {
  const question = "4세대 3대 비급여 중 MRI 한도는 얼마인가요?";

  it("기본 정책(VERIFIED만)에서는 AI_SOURCE_VALIDATED 근거를 내보내지 않는다", () => {
    expect(evidenceFromMap(question, "SAMSUNG_2107_1", ["VERIFIED"]).evidence).toEqual([]);
  });

  it("허용 상태를 넓히면 출처가 갖춰진 근거를 돌려준다", () => {
    const { evidence } = evidenceFromMap(question, "SAMSUNG_2107_1", ["VERIFIED", "AI_SOURCE_VALIDATED"]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].source).toMatchObject({
      documentId: "SAMSUNG_2107_1_E_G4-07",
      organization: "삼성화재해상보험주식회사",
    });
    expect(evidence[0].source.url).toMatch(/^https:\/\//);
    expect(evidence[0].content).toContain("PDF 103쪽");
  });
});
