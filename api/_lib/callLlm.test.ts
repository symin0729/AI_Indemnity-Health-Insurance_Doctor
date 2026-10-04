import { afterEach, describe, expect, it, vi } from "vitest";
import { callLlm, type LlmOptions } from "./callLlm.js";
import { getConfig } from "./config.js";

const options: LlmOptions = {
  provider: "gemini", apiKey: "test-key", model: "gemini-3.8-flash", thinkingLevel: "low", timeoutMs: 100,
};
const answer = {
  answer: "Example answer", keyPoints: ["Point"],
  sourceDocumentIds: ["doc-1"], confirmations: [],
};
const envelope = (text: string, status = "completed") => ({
  output_text: text, status,
});
const mockResponse = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("Gemini LLM", () => {
  it("parses REST model_output steps and excludes thoughts", async () => {
    const json = JSON.stringify(answer);
    mockResponse({ status: "completed", steps: [
      { type: "thought", content: [{ type: "text", text: "Internal thought" }] },
      { type: "model_output", content: [
        { type: "text", text: json.slice(0, 20) },
        { type: "text", text: json.slice(20) },
      ] },
    ] });
    await expect(callLlm("Test", options)).resolves.toEqual(answer);
  });

  it.each(["incomplete", "failed", "cancelled", "requires_action"])("rejects REST status %s even with valid JSON", async (status) => {
    mockResponse({ status, steps: [{ type: "model_output", content: [
      { type: "text", text: JSON.stringify(answer) },
    ] }] });
    await expect(callLlm("Test", options)).rejects.toThrow("did not finish successfully");
  });

  it("sends an authenticated structured-output request and parses the answer", async () => {
    const fetchMock = mockResponse(envelope(JSON.stringify(answer)));
    await expect(callLlm("Test prompt", options)).resolves.toEqual(answer);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect(init).toMatchObject({ method: "POST", headers: {
      "x-goog-api-key": "test-key", "content-type": "application/json",
    } });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      model: options.model,
      input: "Test prompt",
      store: false,
      generation_config: { thinking_level: "low" },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object", additionalProperties: false,
          required: ["answer", "keyPoints", "sourceDocumentIds", "confirmations"],
        },
      },
    });
  });

  it.each(["minimal", "low", "medium", "high"] as const)("passes thinking level %s", async (thinkingLevel) => {
    const fetchMock = mockResponse(envelope(JSON.stringify(answer)));
    await callLlm("Test", { ...options, thinkingLevel });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).generation_config)
      .toEqual({ thinking_level: thinkingLevel });
  });

  it.each([400, 401, 429, 500])("rejects HTTP %s", async (status) => {
    mockResponse({ error: { message: "Private upstream detail" } }, status);
    await expect(callLlm("Test", options)).rejects.toThrow(`LLM request failed (${status})`);
  });

  it.each([
    {}, { output_text: null }, { output_text: 42 },
    envelope(JSON.stringify(answer), "in_progress"),
    envelope(JSON.stringify(answer), "failed"),
    envelope(""), envelope("   "), envelope("not JSON"), envelope("{}"),
    envelope(JSON.stringify({ ...answer, answer: "" })),
    envelope(JSON.stringify({ ...answer, keyPoints: "wrong type" })),
    envelope(JSON.stringify({ ...answer, extra: true })),
  ])("rejects invalid, blocked or incomplete output %#", async (body) => {
    mockResponse(body);
    await expect(callLlm("Test", options)).rejects.toThrow();
  });

  it("rejects unsupported providers before making a request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(callLlm("Test", { ...options, provider: "other" }))
      .rejects.toThrow("Unsupported LLM provider: other");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates network failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    await expect(callLlm("Test", options)).rejects.toThrow("Network unavailable");
  });

  it("aborts a request when its timeout expires", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
    }));
    const assertion = expect(callLlm("Test", options)).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(options.timeoutMs);
    await assertion;
  });

  it("defaults to Gemini and respects an explicit provider", () => {
    vi.stubEnv("LLM_PROVIDER", undefined);
    expect(getConfig().llmProvider).toBe("gemini");
    vi.stubEnv("LLM_PROVIDER", "custom");
    expect(getConfig().llmProvider).toBe("custom");
  });
});

describe("LLM environment configuration", () => {
  it.each(["minimal", "low", "medium", "high"])("accepts thinking level %s", (value) => {
    vi.stubEnv("LLM_THINKING_LEVEL", value);
    expect(getConfig().llmThinkingLevel).toBe(value);
  });
  it.each([undefined, "", "invalid", "LOW"])("defaults invalid thinking level %s to low", (value) => {
    vi.stubEnv("LLM_THINKING_LEVEL", value);
    expect(getConfig().llmThinkingLevel).toBe("low");
  });
  it.each([undefined, "", "0", "-1", "invalid"])("defaults invalid timeout %s to 12 seconds", (value) => {
    vi.stubEnv("CHAT_TIMEOUT_MS", value);
    expect(getConfig().timeoutMs).toBe(12000);
  });
  it("preserves an explicit timeout", () => {
    vi.stubEnv("CHAT_TIMEOUT_MS", "15000");
    expect(getConfig().timeoutMs).toBe(15000);
  });
});
