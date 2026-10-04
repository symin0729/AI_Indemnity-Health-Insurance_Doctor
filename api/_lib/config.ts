const thinkingLevels = ["minimal", "low", "medium", "high"] as const;
type ThinkingLevel = (typeof thinkingLevels)[number];

const thinkingLevelFromEnv = (value: string | undefined): ThinkingLevel =>
  thinkingLevels.includes(value as ThinkingLevel)
    ? (value as ThinkingLevel)
    : "low";

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getConfig = () => ({
  ragflowBaseUrl: process.env.RAGFLOW_BASE_URL?.replace(/\/$/, "") ?? "",
  ragflowApiKey: process.env.RAGFLOW_API_KEY ?? "",
  ragflowDatasetId: process.env.RAGFLOW_DATASET_ID ?? "",
  /** 챗봇(IN 질문)이 검색할 정책자료 데이터셋. 없으면 RAGFLOW_DATASET_ID 를 쓴다 */
  ragflowGeneralDatasetId: process.env.RAGFLOW_GENERAL_DATASET_ID ?? "",
  /** on 일 때만 챗봇 검색에 상품 필터(productCode 등)를 적용한다. 정책자료 데이터셋에는 꺼 둔다 */
  chatbotProductFilter: process.env.CHATBOT_PRODUCT_FILTER === "on",
  /** on 일 때만 검색어 뒤에 보강 문구(보상금액 공제금액 보상한도 등)를 붙인다. 기본은 꺼짐 */
  ragflowQueryRules: process.env.RAGFLOW_QUERY_RULES === "on",
  /** RAG 근거로 쓸 수 있는 문서 상태. 기본은 VERIFIED 만. 승인 정책을 정하면 환경변수로 넓힌다 */
  ragAllowedStatuses: (process.env.RAG_ALLOWED_STATUS ?? "VERIFIED")
    .split(",")
    .map((status) => status.trim().toUpperCase())
    .filter(Boolean),
  ragflowVectorWeight: Math.min(numberFromEnv(process.env.RAGFLOW_VECTOR_WEIGHT, 0.3), 1),
  /** 챗봇(정책자료) 검색 전용 벡터 가중치. 평가(H2 설정)에서 0.5가 가장 좋았다 */
  chatbotVectorWeight: Math.min(numberFromEnv(process.env.CHATBOT_VECTOR_WEIGHT, 0.5), 1),
  /** 근거 검색 방식. auto(기본): RAGFlow가 설정되어 있고 연결되면 RAGFlow, 아니면 배포 파일에 포함된 근거 */
  retrievalMode: ((): "auto" | "ragflow" | "bundled" => {
    const mode = process.env.RETRIEVAL_MODE?.trim().toLowerCase();
    return mode === "ragflow" || mode === "bundled" ? mode : "auto";
  })(),
  ragflowQueryPrefix: process.env.RAGFLOW_QUERY_PREFIX?.trim() ?? "",
  /** 검증된 근거 맵에서 꺼내 쓸 수 있는 상태. 기본은 VERIFIED 만. 팀이 승인 정책을 정하면 환경변수로 넓힌다 */
  evidenceMapAllowedStatuses: (process.env.EVIDENCE_MAP_ALLOWED_STATUS ?? "VERIFIED")
    .split(",")
    .map((status) => status.trim())
    .filter(Boolean),
  llmProvider: process.env.LLM_PROVIDER ?? "gemini",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "",
  /** LLM_PROVIDER=ollama 일 때만 쓰는 로컬 Ollama 주소. 개발·평가용(시연·제출은 Gemini) */
  llmBaseUrl: process.env.LLM_BASE_URL?.trim() || "http://localhost:11434",
  /** 503·429·500일 때 다시 시도할 횟수(기본 2). 0이면 다시 시도하지 않는다 */
  llmRetries: Math.min(Math.max(numberFromEnv(process.env.LLM_RETRIES, 2), 0), 4),
  llmThinkingLevel: thinkingLevelFromEnv(process.env.LLM_THINKING_LEVEL),
  timeoutMs: numberFromEnv(process.env.CHAT_TIMEOUT_MS, 12000),
  maxLength: numberFromEnv(process.env.CHAT_MAX_LENGTH, 300),
  consentPolicyVersion:
    process.env.CHAT_CONSENT_POLICY_VERSION ?? "ai-chat-1.0",
});

export const chatbotDatasetId = (config = getConfig()): string =>
  config.ragflowGeneralDatasetId || config.ragflowDatasetId;

export const hasRagConfig = (config = getConfig()): boolean =>
  Boolean(config.ragflowBaseUrl && config.ragflowApiKey && chatbotDatasetId(config));

export const hasLlmConfig = (config = getConfig()): boolean =>
  Boolean(config.llmModel && (config.llmApiKey || config.llmProvider === "ollama"));
