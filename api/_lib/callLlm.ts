import { z } from "zod";
import { fetchWithTimeout } from "./http";
import type { LlmAnswer } from "./types";

const answerSchema = z.object({
  answer: z.string().min(1),
  keyPoints: z.array(z.string()),
  sourceDocumentIds: z.array(z.string()),
  confirmations: z.array(z.string()),
}).strict();

const answerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    sourceDocumentIds: { type: "array", items: { type: "string" } },
    confirmations: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "keyPoints", "sourceDocumentIds", "confirmations"],
} as const;

const geminiResponseSchema = z.object({
  output_text: z.string().optional(),
  status: z.string().optional(),
  steps: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    })).optional(),
  })).optional(),
}).passthrough();

export interface LlmOptions {
  provider: string;
  apiKey: string;
  model: string;
  thinkingLevel: "minimal" | "low" | "medium" | "high";
  timeoutMs: number;
  /** ollama 일 때만 사용 */
  baseUrl?: string;
  /** 구글 서버 과부하(503)·한도(429)·서버 오류(500)일 때 다시 시도할 횟수. 기본 0 */
  retries?: number;
  retryDelayMs?: number;
}

const ollamaResponseSchema = z.object({ message: z.object({ content: z.string() }) }).passthrough();

/** 로컬 Ollama(개발·평가용). 같은 JSON 스키마로 답을 받아 같은 검사를 거친다. 시연·제출 환경은 Gemini 를 쓴다 */
const callOllama = async (prompt: string, options: LlmOptions): Promise<LlmAnswer> => {
  const response = await fetchWithTimeout(
    `${options.baseUrl ?? "http://localhost:11434"}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        format: answerJsonSchema,
        options: { temperature: 0 },
      }),
    },
    options.timeoutMs,
  );
  if (!response.ok) throw new Error(`LLM request failed (${response.status})`);
  const parsed = ollamaResponseSchema.parse(await response.json());
  if (!parsed.message.content.trim()) throw new Error("LLM response did not contain output text");
  return answerSchema.parse(JSON.parse(parsed.message.content));
};

const RETRYABLE = /\((429|500|503)\)/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 일시적인 서버 오류(503·429·500)이면 잠깐 쉬었다가 다시 시도한다. 배포 환경에서 구글 과부하로 답이 끊기는 것을 줄인다. */
export const callLlm = async (prompt: string, options: LlmOptions): Promise<LlmAnswer> => {
  const attempts = 1 + Math.max(0, options.retries ?? 0);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await callLlmOnce(prompt, options);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !RETRYABLE.test(String(error))) break;
      await sleep((options.retryDelayMs ?? 2000) * (attempt + 1));
    }
  }
  throw lastError;
};

const callLlmOnce = async (
  prompt: string,
  options: LlmOptions,
): Promise<LlmAnswer> => {
  if (options.provider === "ollama") return callOllama(prompt, options);
  if (options.provider !== "gemini") {
    throw new Error(`Unsupported LLM provider: ${options.provider}`);
  }
  const response = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": options.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        input: prompt,
        store: false,
        generation_config: {
          thinking_level: options.thinkingLevel,
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: answerJsonSchema,
        },
      }),
    },
    options.timeoutMs,
  );
  if (!response.ok) {
    // 한도 종류(분당·하루)를 평가에서 구분할 수 있게 응답 문구 앞부분을 오류에 덧붙인다(키는 응답에 없다)
    const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
    throw new Error(`LLM request failed (${response.status}) ${detail}`);
  }
  const envelope = geminiResponseSchema.parse(await response.json());
  if (envelope.status && envelope.status !== "completed") {
    throw new Error("LLM response did not finish successfully");
  }
  const outputText = envelope.output_text ?? envelope.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
  if (!outputText?.trim()) {
    throw new Error("LLM response did not contain output text");
  }
  return answerSchema.parse(JSON.parse(outputText));
};
