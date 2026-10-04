import type { MedicalUsage } from "../domain/medical";

/** 저장소의 1611.7(218쪽), 1704.1(242쪽) PDF 본문 기준. 상품요약서 근거를 보완한다. */
export function gen23TermsReference(generation: 2 | 3, variant: "standard" | "selected2", usage: MedicalUsage): string {
  const pages = (first: number, last: number) => `PDF ${first}~${last}쪽 / 인쇄 ${first - 36}~${last - 36}쪽`;
  if (generation === 3) {
    if (usage.gen23TreatmentType === "MANUAL_THERAPY") return `비급여 도수·체외충격파·증식치료 특별약관 제3조 ①~⑥ · ${pages(165, 167)}`;
    if (usage.gen23TreatmentType === "INJECTION") return `비급여 주사료 특별약관 제3조 ①~⑧ · ${pages(172, 174)}`;
    if (usage.gen23TreatmentType === "MRI") return `비급여 자기공명영상진단 특별약관 제3조 ①~⑤ · ${pages(180, 181)}`;
  }
  const inpatient = usage.gen23CareSetting === "INPATIENT";
  const injury = usage.claimCause === "INJURY";
  const selected = variant === "selected2";
  const section = inpatient ? injury ? "(1) 상해입원" : "(3) 질병입원" : injury ? "(2) 상해통원" : "(4) 질병통원";
  const first = selected ? inpatient ? injury ? 105 : 110 : injury ? 107 : 112
    : inpatient ? injury ? 47 : 51 : injury ? 49 : 54;
  const last = selected ? inpatient ? injury ? 107 : 112 : injury ? 109 : 116
    : inpatient ? injury ? 49 : 54 : injury ? 51 : 57;
  return `${selected ? "2종 선택형Ⅱ" : "1종 표준형"} 보통약관 제3조 ${section}${inpatient ? "" : " ① 및 표1, 계속치료·합산·비건보 조항"} · ${pages(first, last)}`;
}
