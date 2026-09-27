import { afterEach, describe, expect, it, vi } from "vitest";
import chatHandler from "../api/chat";
import healthHandler from "../api/health";

const request = (body: unknown) => new Request("http://localhost/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("chat API", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("동의하지 않은 요청을 외부 호출 전에 차단한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await chatHandler(request({
      question: "자기부담금이 무엇인가요?",
      mode: "GENERAL",
      consentGranted: false,
      consentPolicyVersion: "ai-chat-1.0",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "CONSENT_REQUIRED" } });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("개인정보가 포함된 질문을 외부로 보내지 않는다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await chatHandler(request({
      question: "제 번호 010-1234-5678로 보험 상담해 주세요",
      mode: "GENERAL",
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "PERSONAL_DATA_DETECTED" } });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it.each([
    "주소는 서울시 강남구 테헤란로 123입니다",
    "보험증권 번호 AB-123456의 보장 내용을 알려주세요",
    "제 보험료는 120,000원이고 총부담은 얼마인가요?",
    '{"contract":{"generation":1},"usages":[]}',
  ])("금지 정보가 포함된 요청을 외부 호출 전에 차단한다: %s", async (question) => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await chatHandler(request({
      question,
      mode: "GENERAL",
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "PERSONAL_DATA_DETECTED" } });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("환경변수가 없으면 안전한 fallback을 반환한다", async () => {
    vi.stubEnv("RAGFLOW_BASE_URL", "");
    vi.stubEnv("LLM_API_KEY", "");
    const response = await chatHandler(request({
      question: "급여와 비급여는 무엇인가요?",
      mode: "GENERAL",
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
      context: { screen: "RESULT" },
    }));
    expect(await response.json()).toMatchObject({ status: "FALLBACK", fallback: true });
  });
});

describe("health API", () => {
  it("비밀값 없이 구성 상태만 반환한다", async () => {
    const response = healthHandler(new Request("http://localhost/api/health"));
    const body = await response.json();
    expect(body.services.api).toBe("available");
    expect(JSON.stringify(body)).not.toContain("API_KEY");
  });
});
