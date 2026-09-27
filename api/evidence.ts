import { z } from "zod";
import { callRagFlow } from "./lib/callRagFlow";
import { getConfig, hasRagConfig } from "./lib/config";
import { jsonResponse } from "./lib/http";
import { redactPersonalData } from "./lib/redactPersonalData";
import { ConsentValidationError, validateConsent } from "./lib/validateConsent";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(300),
  productCode: z.string().trim().min(1),
  generation: z.number().int().min(1).max(5).optional(),
  coverageCode: z.string().trim().min(1).optional(),
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
    const redacted = redactPersonalData(input.question);
    if (redacted.detected.length > 0) {
      return jsonResponse({ error: { code: "PERSONAL_DATA_DETECTED", message: "개인정보를 제거한 뒤 다시 요청해주세요." }, requestId }, 422);
    }
    if (!hasRagConfig(config)) return jsonResponse({ evidence: [], status: "UNCONFIGURED", requestId });

    const evidence = await callRagFlow(redacted.value, {
      baseUrl: config.ragflowBaseUrl,
      apiKey: config.ragflowApiKey,
      datasetId: config.ragflowDatasetId,
      timeoutMs: config.timeoutMs,
      filters: {
        productCode: input.productCode,
        generation: input.generation,
        coverageCode: input.coverageCode,
      },
    });
    return jsonResponse({ evidence, status: evidence.length > 0 ? "FOUND" : "NOT_FOUND", requestId });
  } catch (error) {
    if (error instanceof ConsentValidationError) {
      return jsonResponse({ error: { code: error.code, message: error.message }, requestId }, 400);
    }
    return jsonResponse({ error: { code: "INVALID_REQUEST", message: "근거 검색 요청을 확인해주세요." }, requestId }, 400);
  }
}
