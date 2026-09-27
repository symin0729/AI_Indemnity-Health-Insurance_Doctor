import type { LlmAnswer, RetrievedEvidence } from "./types";

const forbidden = /가입하세요|해지하세요|전환하세요|추천합니다|지급됩니다|확실히|반드시|진단|처방|치료하세요/;
const numbers = (value: string): string[] => value.match(/\d[\d,.]*%?/g) ?? [];

export const validateAnswer = (
  answer: LlmAnswer,
  evidence: RetrievedEvidence[],
  additionalNumericEvidence = "",
): boolean => {
  const combined = [answer.answer, ...answer.keyPoints, ...answer.confirmations].join(" ");
  if (forbidden.test(combined) || answer.sourceDocumentIds.length === 0) return false;

  const sourceIds = new Set(evidence.map((item) => item.source.documentId));
  if (answer.sourceDocumentIds.some((id) => !sourceIds.has(id))) return false;

  const evidenceText = `${evidence.map((item) => item.content).join(" ")} ${additionalNumericEvidence}`;
  return numbers(combined).every((number) => evidenceText.includes(number));
};
