import { getConfig, hasLlmConfig, hasRagConfig } from "./lib/config";
import { jsonResponse } from "./lib/http";

type ConfigurationStatus = "configured" | "unconfigured";
type HealthStatus = "ready" | "degraded";

interface HealthResponse {
  status: HealthStatus;
  services: {
    api: "available";
    rag: ConfigurationStatus;
    llm: ConfigurationStatus;
  };
}

function handler(request: Request): Response {
  if (request.method !== "GET") {
    return jsonResponse({ status: "METHOD_NOT_ALLOWED" }, 405);
  }
  const config = getConfig();
  const rag = hasRagConfig(config) ? "configured" : "unconfigured";
  const llm = hasLlmConfig(config) ? "configured" : "unconfigured";
  const body: HealthResponse = {
    status: rag === "configured" && llm === "configured" ? "ready" : "degraded",
    services: { api: "available", rag, llm },
  };
  return jsonResponse(body);
}

// Vercel 실행기는 default 함수에 fetch 속성이 있으면 웹 표준 핸들러로 인식한다. 로컬 플러그인·테스트는 함수 호출 그대로 쓴다.
export default Object.assign(handler, { fetch: handler })
