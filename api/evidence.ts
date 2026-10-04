import { z } from "zod";
import { callRagFlow } from "./lib/callRagFlow";
import { getConfig } from "./lib/config";
import { evidenceFromMap } from "./lib/evidenceFromMap";
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

async function handler(request: Request): Promise<Response> {
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
    // 1) 보상·공제·한도 질문은 검증된 근거 맵에서 먼저 찾는다. 검색 정확도에 의존하지 않는다.
    const mapped = evidenceFromMap(redacted.value, input.productCode, config.evidenceMapAllowedStatuses);
    if (mapped.evidence.length > 0) {
      return jsonResponse({ evidence: mapped.evidence, status: "FOUND", route: "EVIDENCE_MAP", ambiguous: mapped.ambiguous, requestId });
    }
    // 2) 그 외 질문은 RAG 검색으로 넘어간다.
    // 계산 설명용 근거 검색은 약관 데이터셋(RAGFLOW_DATASET_ID)을 쓴다. 챗봇용 정책자료 데이터셋과 분리돼 있다.
    if (!(config.ragflowBaseUrl && config.ragflowApiKey && config.ragflowDatasetId)) return jsonResponse({ evidence: [], status: "UNCONFIGURED", requestId });

    const evidence = await callRagFlow(redacted.value, {
      baseUrl: config.ragflowBaseUrl,
      apiKey: config.ragflowApiKey,
      datasetId: config.ragflowDatasetId,
      timeoutMs: config.timeoutMs,
      vectorWeight: config.ragflowVectorWeight,
      queryPrefix: config.ragflowQueryPrefix,
      queryRules: config.ragflowQueryRules,
      allowedStatuses: config.ragAllowedStatuses,
      filters: {
        productCode: input.productCode,
        generation: input.generation,
        coverageCode: input.coverageCode,
      },
    });
    return jsonResponse({ evidence, status: evidence.length > 0 ? "FOUND" : "NOT_FOUND", route: "RAG", requestId });
  } catch (error) {
    if (error instanceof ConsentValidationError) {
      return jsonResponse({ error: { code: error.code, message: error.message }, requestId }, 400);
    }
    return jsonResponse({ error: { code: "INVALID_REQUEST", message: "근거 검색 요청을 확인해주세요." }, requestId }, 400);
  }
}

// Vercel 실행기는 default 함수에 fetch 속성이 있으면 웹 표준 핸들러로 인식한다. 로컬 플러그인·테스트는 함수 호출 그대로 쓴다.
export default Object.assign(handler, { fetch: handler })
