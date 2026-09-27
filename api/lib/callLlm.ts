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
}

export const callLlm = async (
  prompt: string,
  options: LlmOptions,
): Promise<LlmAnswer> => {
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
  if (!response.ok) throw new Error(`LLM request failed (${response.status})`);
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
