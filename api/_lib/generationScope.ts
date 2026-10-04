/**
 * 챗봇 검색 범위: 질문이 1~4세대·예전 보험·세대 비교를 묻지 않으면 5세대 문서만 검색한다.
 * 오래된 세대 문서가 5세대 질문의 검색 결과를 차지하는 문제를 줄이기 위한 규칙이며,
 * scripts/evaluate-chatbot-retrieval.py 의 OLD_GEN 규칙과 같아야 한다(평가와 서비스의 동작을 맞춘다).
 */
const OTHER_GENERATION_PATTERN =
  /[1-4]\s*세대|1\s*[~·,]\s*[2-5]|예전|옛날|구\s*실손|이전\s*세대|세대별|세대\s*비교|몇\s*세대|세대\s*구분|어느\s*세대|어떤\s*세대|(가입|판매)\s*(시점|시기)/;

export const asksAboutOtherGenerations = (question: string): boolean => OTHER_GENERATION_PATTERN.test(question);

/** 5세대만 검색해야 하면 RAGFlow metadata 조건을, 아니면 undefined 를 돌려준다 */
export const fiveGenerationCondition = (question: string): { name: string; value: string } | undefined =>
  asksAboutOtherGenerations(question) ? undefined : { name: "generation", value: "5" };
