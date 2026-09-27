import type { RetrievedEvidence } from "./types";

export const buildPrompt = (question: string, evidence: RetrievedEvidence[]): string => {
  const sources = evidence.map((item, index) =>
    `[근거 ${index + 1}] documentId=${item.source.documentId}\n${item.content}`,
  ).join("\n\n");

  return `다음 공식 근거만 사용해 일반적인 실손보험 제도와 용어를 쉬운 한국어로 설명하세요.
계산, 의료 조언, 상품 추천, 가입·해지·전환 권유, 보험금 확정은 하지 마세요.
근거에 없는 숫자와 사실을 만들지 마세요. sourceDocumentIds에는 사용한 documentId만 넣으세요.

질문: ${question}

${sources}`;
};
