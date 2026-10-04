/**
 * 일상 표현을 공식 문서에 쓰인 표현으로 풀어 검색어 뒤에 붙인다(예: "싼가요" → "저렴 인하").
 * 사용자는 "싸다·줄이다"라고 묻지만 공식 문서는 "저렴·인하"라고 써서 검색이 빗나가는 문제를 줄인다.
 * 모든 질문에 같은 규칙을 적용하며, scripts/evaluate-chatbot-retrieval.py 의 GLOSSARY 와 같아야 한다.
 * 검색에만 쓰고 LLM 에게 보내는 질문은 바꾸지 않는다.
 */
const GLOSSARY: ReadonlyArray<readonly [RegExp, string]> = [
  [/싼|싸지|싸다|저렴|줄일|줄이|절약|아낄|적게|낮아|낮추/, "저렴 인하"],
  [/빠지|빠진|제외|줄어드|줄어든|축소/, "보장 제외 한도 변경"],
  [/복귀|돌아가|되돌|후회|취소/, "철회 이전 계약"],
  [/오르|오른|인상|올라/, "갱신 인상"],
];

export const withRetrievalGlossary = (question: string): string => {
  const extra = GLOSSARY.filter(([pattern]) => pattern.test(question)).map(([, add]) => add);
  return extra.length > 0 ? `${question} ${extra.join(" ")}` : question;
};
