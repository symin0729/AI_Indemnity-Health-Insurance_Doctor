import { describe, expect, it } from "vitest";
import { formatInceptionDateInput, generationForInceptionDate, generalPatientCopayPercent, inceptionDateForGeneration } from "../src/domain/insuranceInputDefaults";
describe("가입일 자동 판별", () => {
  it.each([["2009-09-30",1],["2009-10-01",2],["2017-03-31",2],["2017-04-01",3],["2021-06-30",3],["2021-07-01",4],["2026-05-05",4],["2026-05-06",5]] as const)("%s → %s", (date, generation) => expect(generationForInceptionDate(date)).toBe(generation));
  it.each(["", "invalid", "2026-02-29", "2026-13-01", "2026-04-31", "2026-00-01", "0000-01-01"])("invalid %s leaves generation unchanged", date => expect(generationForInceptionDate(date)).toBeUndefined());
  it("accepts a leap day", () => expect(generationForInceptionDate("2024-02-29")).toBe(4));
  it.each([["2018","2018"],["201803","2018-03"],["20180301","2018-03-01"],["2018-03-01","2018-03-01"]])("formats typed date %s", (input, expected) => expect(formatInceptionDateInput(input)).toBe(expected));
  it.each([[1,"2009-09-30"],[2,"2009-10-01"],[3,"2017-04-01"],[4,"2021-07-01"]] as const)("maps generation %s to its calendar date", (generation, expected) => expect(inceptionDateForGeneration(generation)).toBe(expected));
});
describe("일반환자 본인부담률", () => {
  it.each([["GENERAL","DONG",50],["GENERAL","EUP_MYEON",45],["HOSPITAL","DONG",40],["HOSPITAL","EUP_MYEON",35],["CLINIC",undefined,30],["TERTIARY",undefined,undefined],["PUBLIC_HEALTH",undefined,undefined],["GENERAL",undefined,undefined],["HOSPITAL",undefined,undefined]] as const)("%s %s", (institution,region,expected) => expect(generalPatientCopayPercent("OUTPATIENT",institution,region)).toBe(expected));
  it("uses 20% only for general inpatient care, without mixing meal/room rates", () => expect(generalPatientCopayPercent("INPATIENT")).toBe(20));
  it("clears an inpatient default when returning to an unresolved outpatient setting", () => expect(generalPatientCopayPercent("OUTPATIENT")).toBeUndefined());
});
