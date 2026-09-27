import { z } from "zod";
import { buildCalculationPrompt } from "./lib/buildCalculationPrompt";
import { callLlm } from "./lib/callLlm";
import { callRagFlow } from "./lib/callRagFlow";
import { getConfig, hasLlmConfig, hasRagConfig } from "./lib/config";
import { fallback } from "./lib/fallback";
import { jsonResponse } from "./lib/http";
import type { ChatResponse } from "./lib/types";
import { validateCalculationAnswer } from "./lib/validateCalculationAnswer";
import { ConsentValidationError, validateConsent } from "./lib/validateConsent";

const requestSchema = z.object({
  productCode: z.string().trim().min(1),
  generation: z.number().int().min(1).max(5),
  calculation: z.record(z.string(), z.unknown()),
  consentGranted: z.boolean(),
  consentPolicyVersion: z.string().min(1),
}).strict();

export default async function handler(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return jsonResponse({ error: { code: "METHOD_NOT_ALLOWED", message: "POST 요청만 허용됩니다." }, requestId }, 405);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "application/json 요청만 허용됩니다." }, requestId }, 415);
  }

  try {
    const input = requestSchema.parse(await request.json());
    const config = getConfig();
    validateConsent(input, config.consentPolicyVersion);
    if (!hasRagConfig(config) || !hasLlmConfig(config)) return jsonResponse(fallback("FALLBACK", requestId));

    const evidence = await callRagFlow(`${input.productCode} 실손보험 계산 근거`, {
      baseUrl: config.ragflowBaseUrl,
      apiKey: config.ragflowApiKey,
      datasetId: config.ragflowDatasetId,
      timeoutMs: config.timeoutMs,
      filters: { productCode: input.productCode, generation: input.generation },
    });
    if (evidence.length === 0) return jsonResponse(fallback("INSUFFICIENT_EVIDENCE", requestId));

    const answer = await callLlm(buildCalculationPrompt(input.calculation, evidence), {
      provider: config.llmProvider,
      apiKey: config.llmApiKey,
      model: config.llmModel,
      timeoutMs: config.timeoutMs,
    });
    if (!validateCalculationAnswer(answer, input.calculation, evidence)) return jsonResponse(fallback("FALLBACK", requestId));

    const usedIds = new Set(answer.sourceDocumentIds);
    const response: ChatResponse = {
      ...answer,
      sources: evidence.filter((item) => usedIds.has(item.source.documentId)).map((item) => item.source),
      status: "ANSWERED",
      fallback: false,
      requestId,
    };
    return jsonResponse(response);
  } catch (error) {
    if (error instanceof ConsentValidationError) {
      return jsonResponse({ error: { code: error.code, message: error.message }, requestId }, 400);
    }
    return jsonResponse(fallback("FALLBACK", requestId));
  }
}
