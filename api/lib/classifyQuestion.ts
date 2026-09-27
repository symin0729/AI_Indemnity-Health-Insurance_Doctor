export type QuestionClassification = "SUPPORTED" | "OUT_OF_SCOPE" | "SENSITIVE";

const insuranceTerms = /실손|보험|약관|급여|비급여|자기부담|공제|보장|세대|보험사|손익분기/;
const prohibitedTerms = /진단|치료법|약을?\s*(먹|복용)|수술해야|가입할까|해지할까|전환할까|추천해|보험금\s*(얼마|확정)/;

export const classifyQuestion = (question: string): QuestionClassification => {
  if (prohibitedTerms.test(question)) return "SENSITIVE";
  return insuranceTerms.test(question) ? "SUPPORTED" : "OUT_OF_SCOPE";
};
