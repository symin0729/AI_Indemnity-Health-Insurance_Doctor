import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Gen23Inputs, Gen23Summary } from "../src/components/samsung/Gen23Inputs";
import { Gen23Results } from "../src/components/samsung/Gen23Results";
import type { MedicalUsage } from "../src/domain/medical";
const usage: MedicalUsage = { id:"ui", treatmentName:"검산용 치료",careSetting:"OUTPATIENT",benefitClass:"UNKNOWN",severityClass:"UNKNOWN",frequency:3,unitCost:100000 };
describe("Gen23 input/confirmation/result display", () => {
  it("separates generation-specific fields and displays blanks", () => {
    const gen2=renderToStaticMarkup(createElement(Gen23Inputs,{generation:2,value:{gen23CareSetting:"INPATIENT"},onChange:()=>{}}));
    const gen3=renderToStaticMarkup(createElement(Gen23Inputs,{generation:3,value:{gen23CareSetting:"OUTPATIENT",gen23TreatmentType:"MRI"},onChange:()=>{}}));
    expect(gen2).toContain("2세대 삼성화재"); expect(gen2).not.toContain("3세대 치료 분류");
    expect(gen2).toContain("병실료 차액"); expect(gen2).toContain('value=""');
    expect(gen3).toContain("특약 대상 의료비"); expect(gen3).toContain("진단행위");
  });
  it("confirmation preserves unknown versus zero and false", () => {
    const html=renderToStaticMarkup(createElement(Gen23Summary,{generation:2,usage:{...usage,gen23RoomDifference:0,gen23OtherIndemnityPoliciesExist:false}}));
    expect(html).toContain("확인 필요"); expect(html).toContain("<dd>0</dd>"); expect(html).toContain("아니요");
  });
  it("never shows a fabricated claim or annual total on missing inputs", () => {
    const html=renderToStaticMarkup(createElement(Gen23Results,{generation:3,variant:"UNKNOWN",results:[{usage,result:{status:"CONFIRMATION_REQUIRED",claim:null,reason:"상품 종형 확인 필요"}}],onEdit:()=>{},onConfirm:()=>{}}));
    expect(html).toContain("CONFIRMATION_REQUIRED"); expect(html).toContain("상품 종형 확인 필요");
    expect(html).toContain("SAMPLE_SIMULATION"); expect(html).toContain("반복 횟수를 곱하지 않습니다");
    expect(html).not.toContain("<strong>0원</strong>");
  });
});
