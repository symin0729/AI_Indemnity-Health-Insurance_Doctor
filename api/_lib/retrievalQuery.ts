import rules from "./retrieval-query-rules.json";

export interface RetrievalQueryRules {
  benefitIntentPattern: string;
  benefitSuffix: string;
  glossary: { pattern: string; append: string }[];
}

/**
 * 사용자 질문을 약관 용어로 보강한 검색어를 만든다.
 * - 용어집: 사용자가 쓰는 약칭에 약관의 공식 용어를 덧붙인다.
 * - 보상·공제·한도를 묻는 질문에만 약관 표의 용어(보상금액 공제금액 보상한도)를 덧붙인다.
 * 원문 질문은 그대로 앞에 둔다. 규칙은 retrieval-query-rules.json 한 곳에서 관리한다.
 */
export const buildRetrievalQuery = (
  question: string,
  config: RetrievalQueryRules = rules,
): string => {
  const parts = [question];
  for (const entry of config.glossary) {
    if (new RegExp(entry.pattern, "i").test(question) && !question.includes(entry.append)) {
      parts.push(entry.append);
    }
  }
  if (config.benefitSuffix && new RegExp(config.benefitIntentPattern).test(question)) {
    parts.push(config.benefitSuffix);
  }
  return parts.join(" ");
};
