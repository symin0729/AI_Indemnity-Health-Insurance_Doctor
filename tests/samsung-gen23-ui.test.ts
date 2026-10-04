import { calculateSamsungGen3Sample } from "../src/engine/calculateSamsungGen3";
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
    for (const text of ["입력한 한 계산단위", "모르는 값은 비워두세요", "누적액은 이 청구 이전", "중복보험 계수는", "반복 치료의 연간 합계와 확정 보험금"]) expect(gen2).not.toContain(text); expect(gen2).not.toContain("3세대 치료 분류");
    expect(gen2).toContain("<h3>2세대 삼성화재 계산 조건</h3>");
    expect(gen3).toContain("<h3>3세대 삼성화재 계산 조건</h3>");
    expect(gen3).toContain("(필수)");
    expect(gen3).not.toContain("중복보험 계수는");
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

it("labels calculated draft amounts and renders actual clause pages without annualizing", () => {
  const input: MedicalUsage = { ...usage, careSetting: "OUTPATIENT", gen23CareSetting: "OUTPATIENT", claimCause: "DISEASE", benefitClass: "NON_COVERED", gen23TreatmentType: "MRI", gen23RiderEnrollmentStatus: "ENROLLED", gen23RequiredCoverageConfirmed: true, gen23EligibleExpense: 100000, gen23PriorPaidBenefit: 0, gen23AggregationUnit: "DIAGNOSTIC_ACTION", gen23PolicyExclusionsCleared: true, gen23CoveragePeriod: "ACTIVE", gen23CoveragePeriodConfirmed: true, gen23OtherIndemnityPoliciesExist: false };
  const result = calculateSamsungGen3Sample("standard", input);
  expect(result).toMatchObject({ status: "DRAFT_CALCULATED", claim: 70000 });
  const html = renderToStaticMarkup(createElement(Gen23Results, { generation: 3, variant: "standard", results: [{ usage: input, result }], onEdit: () => {}, onConfirm: () => {} }));
  for (const text of ["초안 검산액", "실제 보험금 지급액이 아닙니다", "약관 및 계약조건의 최종 확인", "G3-STD-03", "PDF 180~181쪽 / 인쇄 144~145쪽", "70,000원"]) expect(html).toContain(text);
  expect(html).not.toContain("210,000원");
  const blocked = calculateSamsungGen3Sample("standard", input, "ACTUAL_CONTRACT");
  const blockedHtml = renderToStaticMarkup(createElement(Gen23Results, { generation: 3, variant: "standard", results: [{ usage: input, result: blocked }], onEdit: () => {}, onConfirm: () => {} }));
  expect(blockedHtml).toContain("RULE_NOT_VERIFIED");
  expect(blockedHtml).not.toContain("70,000원");
});
