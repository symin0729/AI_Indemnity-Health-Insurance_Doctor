import type { LlmAnswer, RetrievedEvidence } from "./types";

// 항상 막는 표현: 행동 권유, 보험금 단정, 의료 행위 표현
const forbidden = /가입하세요|해지하세요|전환하세요|추천합니다|지급됩니다|확실히|반드시(?!\s*(?:보험사|해당|가입|본인|계약|약관)?\s*(?:에\s*)?(?:확인|문의|참고|살펴|알아|물어|점검|비교|상담|읽어))|진단(합니다|해|하세요|드립니다|할 수)|처방(합니다|해|하세요|드립니다)|치료하세요|좋은 선택|하는 것이 좋습니다|하는 게 좋습니다/;
// 우열 결론 표현. "어느 쪽이 더 낫다고 말씀드릴 수 없습니다"처럼 부정하는 문장에서는 허용한다.
const comparative = /더 좋|더 낫|유리합니다|유리할 수 있/g;
const negation = /수 없|수는 없|않|어렵|아닙니다|못 |곤란|단정|판단할 수|말씀드리기/;

const hasForbiddenPhrase = (text: string): boolean => {
  if (forbidden.test(text)) return true;
  for (const match of text.matchAll(comparative)) {
    const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 22);
    if (!negation.test(after)) return true;
  }
  return false;
};

// 줄 머리의 목록 번호("1.", "**2.", "3)")는 근거 숫자가 아니므로 검사에서 뺀다. 문장 끝 마침표·쉼표도 숫자에 붙이지 않는다.
// 근거의 줄임 연도(’26, '26)는 네 자리 연도(2026)로도 인정하고, 2026.11 같은 연월 표기는 연도와 월로 나눠 비교한다.
const numbers = (value: string): string[] =>
  (value
    .replace(/[’'‘](\d{2})(?=\D)/g, "20$1")
    .replace(/\b(20\d{2})\.(\d{1,2})(?!\d)/g, "$1 $2")
    .replace(/(^|\n)\s*(\*\*|-\s*)?\d{1,2}[.)]\s/g, "$1")
    .match(/\d[\d,.]*%?/g) ?? []).map((item) => item.replace(/[.,]+$/, ""));

/** 검사에서 걸린 이유 목록(통과하면 빈 배열). 평가·진단용으로 쓰고, 사용자에게는 보여 주지 않는다 */
export const answerFailureReasons = (
  answer: LlmAnswer,
  evidence: RetrievedEvidence[],
  additionalNumericEvidence = "",
): string[] => {
  const reasons: string[] = [];
  const combined = [answer.answer, ...answer.keyPoints, ...answer.confirmations].join(" ");
  if (hasForbiddenPhrase(combined)) reasons.push("금지 표현");
  if (answer.sourceDocumentIds.length === 0) reasons.push("출처 id 없음");

  const sourceIds = new Set(evidence.map((item) => item.source.documentId));
  if (answer.sourceDocumentIds.some((id) => !sourceIds.has(id))) reasons.push("근거에 없는 출처 id");

  const evidenceText = `${evidence.map((item) => item.content).join(" ")} ${additionalNumericEvidence}`;
  const allowedNumbers = new Set(numbers(evidenceText));
  const unknown = [...new Set(numbers(combined).filter((number) => !allowedNumbers.has(number)))];
  if (unknown.length > 0) reasons.push(`근거에 없는 숫자 ${unknown.slice(0, 5).join(",")}`);
  return reasons;
};

export const validateAnswer = (
  answer: LlmAnswer,
  evidence: RetrievedEvidence[],
  additionalNumericEvidence = "",
): boolean => answerFailureReasons(answer, evidence, additionalNumericEvidence).length === 0;
