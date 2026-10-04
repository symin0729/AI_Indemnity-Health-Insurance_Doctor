import type { LlmAnswer, RetrievedEvidence } from "./types.js";
import { validateAnswer } from "./validateAnswer.js";

export const validateCalculationAnswer = (
  answer: LlmAnswer,
  calculation: unknown,
  evidence: RetrievedEvidence[],
): boolean => {
  const calculationText = JSON.stringify(calculation);
  const formattedCalculationText = calculationText.replace(/(?<=\d)(?=(\d{3})+(?!\d))/g, ",");
  return validateAnswer(answer, evidence, `${calculationText} ${formattedCalculationText}`);
};
