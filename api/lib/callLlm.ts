import { z } from "zod";
import { fetchWithTimeout } from "./http";
import type { LlmAnswer } from "./types";

const answerSchema = z.object({
  answer: z.string().min(1),
  keyPoints: z.array(z.string()),
  sourceDocumentIds: z.array(z.string()),
  confirmations: z.array(z.string()),
}).strict();

const responseSchema = z.object({ output_text: z.string().optional() }).passthrough();

export interface LlmOptions {
  provider: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export const callLlm = async (
  prompt: string,
  options: LlmOptions,
): Promise<LlmAnswer> => {
  if (options.provider !== "openai") {
    throw new Error(`Unsupported LLM provider: ${options.provider}`);
  }
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        store: false,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "insurance_general_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: { type: "string" },
                keyPoints: { type: "array", items: { type: "string" } },
                sourceDocumentIds: { type: "array", items: { type: "string" } },
                confirmations: { type: "array", items: { type: "string" } },
              },
              required: ["answer", "keyPoints", "sourceDocumentIds", "confirmations"],
            },
          },
        },
      }),
    },
    options.timeoutMs,
  );
  if (!response.ok) throw new Error(`LLM request failed (${response.status})`);
  const envelope = responseSchema.parse(await response.json());
  if (!envelope.output_text) throw new Error("LLM response did not contain output_text");
  return answerSchema.parse(JSON.parse(envelope.output_text));
};
