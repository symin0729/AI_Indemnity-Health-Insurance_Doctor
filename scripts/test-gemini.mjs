import { createServer, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = loadEnv("development", root, "");
for (const name of ["LLM_PROVIDER", "LLM_API_KEY", "LLM_MODEL", "LLM_THINKING_LEVEL", "CHAT_TIMEOUT_MS"]) {
  if (process.env[name] === undefined && env[name] !== undefined) {
    process.env[name] = env[name];
  }
}

let server;
try {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey || apiKey.includes("여기에") || apiKey.includes("YOUR_")) {
    throw new Error(".env.local의 LLM_API_KEY를 실제 Google AI Studio API 키로 설정해주세요.");
  }
  if (!process.env.LLM_MODEL?.trim()) {
    throw new Error(".env.local의 LLM_MODEL을 설정해주세요.");
  }

  // Load the real TypeScript implementation with the existing Vite dependency.
  // No HTTP server or RAGFlow connection is needed.
  server = await createServer({
    root,
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const { callLlm } = await server.ssrLoadModule("/api/_lib/callLlm.ts");
  const { getConfig } = await server.ssrLoadModule("/api/_lib/config.ts");
  const config = getConfig();
  console.log(`Gemini 연결 테스트: ${config.llmModel}, thinking=${config.llmThinkingLevel}, timeout=${config.timeoutMs}ms`);
  const started = Date.now();
  const answer = await callLlm(
    'This is an API connectivity test, not an insurance question. Return a JSON object with answer "Gemini 연결 성공", keyPoints ["API 응답 확인"], sourceDocumentIds [], and confirmations [].',
    {
      provider: config.llmProvider,
      apiKey,
      model: config.llmModel,
      thinkingLevel: config.llmThinkingLevel,
      timeoutMs: config.timeoutMs,
    },
  );
  console.log(`연결 및 응답 스키마 검증 성공 (${Date.now() - started}ms)`);
  console.log(JSON.stringify(answer, null, 2));
} catch (error) {
  // Do not print request headers, API keys, or raw upstream error bodies.
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  const apiKey = process.env.LLM_API_KEY;
  console.error(`연결 테스트 실패: ${apiKey ? message.split(apiKey).join("[REDACTED]") : message}`);
  process.exitCode = 1;
} finally {
  await server?.close();
}
