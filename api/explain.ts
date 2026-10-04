import { z } from "zod";
import { getConfig } from "./lib/config";
import { jsonResponse } from "./lib/http";
import { ConsentValidationError, validateConsent } from "./lib/validateConsent";

const requestSchema = z.object({
  productCode: z.string().trim().min(1),
  generation: z.number().int().min(1).max(5),
  calculation: z.record(z.string(), z.unknown()),
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

    // Calculation data can contain contract and treatment details. Keep this
    // endpoint closed until a local/template-based explanation path exists.
    return jsonResponse({
      error: {
        code: "FEATURE_DISABLED",
        message: "계산 결과의 외부 AI 전송을 막기 위해 설명 생성 기능을 임시로 중지했습니다.",
      },
      requestId,
    }, 503);
  } catch (error) {
    if (error instanceof ConsentValidationError) {
      return jsonResponse({ error: { code: error.code, message: error.message }, requestId }, 400);
    }
    return jsonResponse({
      error: { code: "INVALID_REQUEST", message: "계산 설명 요청을 확인해주세요." },
      requestId,
    }, 400);
  }
}

// Vercel 실행기는 default 함수에 fetch 속성이 있으면 웹 표준 핸들러로 인식한다. 로컬 플러그인·테스트는 함수 호출 그대로 쓴다.
export default Object.assign(handler, { fetch: handler })
