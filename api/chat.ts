import { callLlm } from "./lib/callLlm";
import { callRagFlow } from "./lib/callRagFlow";
import { buildPrompt } from "./lib/buildPrompt";
import { classifyQuestion } from "./lib/classifyQuestion";
import { getConfig, hasLlmConfig, hasRagConfig } from "./lib/config";
import { fallback } from "./lib/fallback";
import { jsonResponse } from "./lib/http";
import { redactPersonalData } from "./lib/redactPersonalData";
import type { ApiErrorBody, ChatResponse } from "./lib/types";
import { ConsentValidationError, validateConsent } from "./lib/validateConsent";
import { validateAnswer } from "./lib/validateAnswer";
import { InputValidationError, validateInput } from "./lib/validateInput";

export default async function handler(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return jsonResponse({ error: { code: "METHOD_NOT_ALLOWED", message: "POST 요청만 허용됩니다." }, requestId }, 405);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "application/json 요청만 허용됩니다." }, requestId }, 415);
  }

  try {
    const config = getConfig();
    const input = validateInput(await request.json(), config.maxLength);
    validateConsent(input, config.consentPolicyVersion);
    const redacted = redactPersonalData(input.question);
    if (redacted.detected.length > 0) {
      return jsonResponse({ error: { code: "PERSONAL_DATA_DETECTED", message: `질문에서 ${redacted.detected.join(", ")} 정보를 제거한 뒤 다시 입력해주세요.` }, requestId } satisfies ApiErrorBody, 422);
    }

    const classification = classifyQuestion(redacted.value);
    if (classification !== "SUPPORTED") return jsonResponse(fallback("OUT_OF_SCOPE", requestId));
    if (!hasRagConfig(config) || !hasLlmConfig(config)) return jsonResponse(fallback("FALLBACK", requestId));

    const evidence = await callRagFlow(redacted.value, {
      baseUrl: config.ragflowBaseUrl,
      apiKey: config.ragflowApiKey,
      datasetId: config.ragflowDatasetId,
      timeoutMs: config.timeoutMs,
    });
    if (evidence.length === 0) return jsonResponse(fallback("INSUFFICIENT_EVIDENCE", requestId));

    const llmAnswer = await callLlm(buildPrompt(redacted.value, evidence), {
      provider: config.llmProvider,
      apiKey: config.llmApiKey,
      model: config.llmModel,
      timeoutMs: config.timeoutMs,
    });
    if (!validateAnswer(llmAnswer, evidence)) return jsonResponse(fallback("FALLBACK", requestId));

    const usedIds = new Set(llmAnswer.sourceDocumentIds);
    const response: ChatResponse = {
      answer: llmAnswer.answer,
      keyPoints: llmAnswer.keyPoints,
      sources: evidence.filter((item) => usedIds.has(item.source.documentId)).map((item) => item.source),
      confirmations: llmAnswer.confirmations,
      status: "ANSWERED",
      fallback: false,
      requestId,
    };
    return jsonResponse(response);
  } catch (error) {
    if (error instanceof InputValidationError || error instanceof ConsentValidationError) {
      return jsonResponse({ error: { code: error.code, message: error.message }, requestId } satisfies ApiErrorBody, 400);
    }
    return jsonResponse(fallback("FALLBACK", requestId));
  }
}
