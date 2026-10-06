import { describe, expect, it } from "vitest";
import { gen2VariantsForInceptionDate, formatInceptionDateInput, generationForInceptionDate, generalPatientCopayPercent, inceptionDateForGeneration } from "../src/domain/insuranceInputDefaults";
describe("가입일 자동 판별", () => {
  it.each([["2009-09-30",1],["2009-10-01",2],["2017-03-31",2],["2017-04-01",3],["2021-06-30",3],["2021-07-01",4],["2026-05-05",4],["2026-05-06",5]] as const)("%s → %s", (date, generation) => expect(generationForInceptionDate(date)).toBe(generation));
  it.each(["", "invalid", "2026-02-29", "2026-13-01", "2026-04-31", "2026-00-01", "0000-01-01"])("invalid %s leaves generation unchanged", date => expect(generationForInceptionDate(date)).toBeUndefined());
  it("accepts a leap day", () => expect(generationForInceptionDate("2024-02-29")).toBe(4));
  it.each([["2018","2018"],["201803","2018-03"],["20180301","2018-03-01"],["2018-03-01","2018-03-01"]])("formats typed date %s", (input, expected) => expect(formatInceptionDateInput(input)).toBe(expected));
  it.each([[1,"2009-09-30"],[2,"2015-09-01"],[3,"2017-04-01"],[4,"2021-07-01"]] as const)("maps generation %s to its calendar date", (generation, expected) => expect(inceptionDateForGeneration(generation)).toBe(expected));
});
describe("일반환자 본인부담률", () => {
  it.each([["GENERAL","DONG",50],["GENERAL","EUP_MYEON",45],["HOSPITAL","DONG",40],["HOSPITAL","EUP_MYEON",35],["CLINIC",undefined,30],["TERTIARY",undefined,undefined],["PUBLIC_HEALTH",undefined,undefined],["GENERAL",undefined,undefined],["HOSPITAL",undefined,undefined]] as const)("%s %s", (institution,region,expected) => expect(generalPatientCopayPercent("OUTPATIENT",institution,region)).toBe(expected));
  it("uses 20% only for general inpatient care, without mixing meal/room rates", () => expect(generalPatientCopayPercent("INPATIENT")).toBe(20));
  it("clears an inpatient default when returning to an unresolved outpatient setting", () => expect(generalPatientCopayPercent("OUTPATIENT")).toBeUndefined());
});

describe("2세대 가입일별 상품 종형", () => {
  const values = (date: string) => gen2VariantsForInceptionDate(date).options.map((o) => o.value);
  it.each(["2015-09-01", "2016-11-01", "2017-03-31"])("%s: 표준형·선택형Ⅱ", (date) => {
    expect(values(date)).toEqual(["standard", "selected2"]);
  });
  it.each(["2013-01-01", "2015-08-31"])("%s: 약관 규칙 미등록 표준형·선택형", (date) => {
    expect(gen2VariantsForInceptionDate(date).options).toEqual([
      { value: "standard2013", label: "1. 표준형 (약관 규칙이 등록되지 않아 계산 제공하지 않음)" },
      { value: "selected2013", label: "2. 선택형 (약관 규칙이 등록되지 않아 계산 제공하지 않음)" },
    ]);
  });
  it.each(["2009-10-01", "2012-12-31"])("%s: 약관 규칙 미등록 단일 구조", (date) => {
    expect(gen2VariantsForInceptionDate(date).options).toEqual([{ value: "unified2009", label: "1. 단일 구조 (약관 규칙이 등록되지 않아 계산 제공하지 않음)" }]);
  });
  it.each(["", "2018-01-01", "2009-01-01", "20150"])("%s: 2세대가 아니거나 미입력이면 표준형·선택형Ⅱ", (date) => {
    expect(values(date)).toEqual(["standard", "selected2"]);
  });
});
