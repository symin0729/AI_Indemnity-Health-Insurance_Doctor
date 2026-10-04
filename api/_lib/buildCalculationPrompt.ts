import type { RetrievedEvidence } from "./types";

export const buildCalculationPrompt = (
  calculation: unknown,
  evidence: RetrievedEvidence[],
): string => {
  const sources = evidence.map((item, index) =>
    `[근거 ${index + 1}] documentId=${item.source.documentId}\n${item.content}`,
  ).join("\n\n");

  return `주어진 계산 결과를 사용자가 이해하기 쉽게 설명하세요.
계산값을 다시 생성하거나 변경하지 말고, 제공된 숫자와 공식 근거만 사용하세요.
보험금 지급을 확정하거나 상품 전환을 권유하지 마세요.
sourceDocumentIds에는 사용한 documentId만 넣으세요.

계산 결과:
${JSON.stringify(calculation, null, 2)}

${sources}`;
};
