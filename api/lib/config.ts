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
  llmProvider: process.env.LLM_PROVIDER ?? "gemini",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "",
  llmThinkingLevel: thinkingLevelFromEnv(process.env.LLM_THINKING_LEVEL),
  timeoutMs: numberFromEnv(process.env.CHAT_TIMEOUT_MS, 12000),
  maxLength: numberFromEnv(process.env.CHAT_MAX_LENGTH, 300),
  consentPolicyVersion:
    process.env.CHAT_CONSENT_POLICY_VERSION ?? "ai-chat-1.0",
});

export const hasRagConfig = (config = getConfig()): boolean =>
  Boolean(config.ragflowBaseUrl && config.ragflowApiKey && config.ragflowDatasetId);

export const hasLlmConfig = (config = getConfig()): boolean =>
  Boolean(config.llmApiKey && config.llmModel);
