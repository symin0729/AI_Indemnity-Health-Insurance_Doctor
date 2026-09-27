import { getConfig, hasLlmConfig, hasRagConfig } from "./lib/config";
import { jsonResponse } from "./lib/http";

export default function handler(request: Request): Response {
  if (request.method !== "GET") {
    return jsonResponse({ status: "METHOD_NOT_ALLOWED" }, 405);
  }
  const config = getConfig();
  const rag = hasRagConfig(config) ? "configured" : "unconfigured";
  const llm = hasLlmConfig(config) ? "configured" : "unconfigured";
  return jsonResponse({
    status: rag === "configured" && llm === "configured" ? "ready" : "degraded",
    services: { api: "available", rag, llm },
  });
}
