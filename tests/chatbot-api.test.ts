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

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "PRIVACY_BLOCKED", noticeId: "OUT-05", fallback: true });
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

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "PRIVACY_BLOCKED", noticeId: "OUT-05" });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it.each([
    ["OUT-01", "5세대로 갈아타는 게 저한테 더 좋나요?"],
    ["OUT-02", "병원비 30만원 나왔는데 보험금 얼마 받아요?"],
    ["OUT-03", "제가 수술을 받아야 하나요?"],
    ["OUT-04", "보험사가 지급을 거절했는데 불법 아닌가요?"],
    ["OUT-DOMAIN", "오늘 날씨 어때요?"],
  ])("%s 질문은 RAG·LLM 을 호출하지 않고 고정 안내문을 반환한다: %s", async (noticeId, question) => {
    vi.stubEnv("RAGFLOW_BASE_URL", "http://ragflow.invalid");
    vi.stubEnv("RAGFLOW_API_KEY", "x");
    vi.stubEnv("RAGFLOW_DATASET_ID", "x");
    vi.stubEnv("LLM_API_KEY", "x");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await chatHandler(request({
      question,
      mode: "GENERAL",
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
      context: { screen: "RESULT", productCode: "SAMSUNG_2605_1", generation: 5 },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "OUT_OF_SCOPE", noticeId, fallback: true, sources: [] });
    expect(body.answer.length).toBeGreaterThan(20);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("팀 확정 고정 안내문 문구가 그대로다(OUT-01·OUT-04)", async () => {
    const out01 = await chatHandler(request({ question: "하나만 추천해 주세요", mode: "GENERAL", consentGranted: true, consentPolicyVersion: "ai-chat-1.0" }));
    expect((await out01.json()).answer).toContain("특정 보험이나 세대를 직접 추천해 드릴 수 없습니다.");
    const out04 = await chatHandler(request({ question: "지급 거절이 부당한지 알려주세요", mode: "GENERAL", consentGranted: true, consentPolicyVersion: "ai-chat-1.0" }));
    expect((await out04.json()).answer).toContain("금융감독원 등 공식 민원·분쟁조정 절차");
  });

  it("모델이 출처 없이 '확인되지 않습니다'라고 답하면 오류가 아니라 근거 부족으로 반환한다", async () => {
    vi.stubEnv("RAGFLOW_BASE_URL", "http://ragflow.invalid");
    vi.stubEnv("RAGFLOW_API_KEY", "x");
    vi.stubEnv("RAGFLOW_DATASET_ID", "x");
    vi.stubEnv("LLM_API_KEY", "key");
    vi.stubEnv("LLM_MODEL", "model");
    const chunk = {
      content: "5세대는 2026년 5월 6일부터 판매됩니다.", document_id: "doc-1", document_keyword: "공식 안내.pdf",
      metadata: { status: "VERIFIED", sourceUrl: "https://example.com", publisher: "공식 기관", verifiedAt: "2026-10-04", generation: 5 },
    };
    const llmAnswer = { answer: "제공된 공식 자료에서 확인되지 않습니다.", keyPoints: ["확인되지 않음"], sourceDocumentIds: [], confirmations: [] };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("/api/v1/retrieval")
        ? Response.json({ code: 0, data: { chunks: [chunk] } })
        : Response.json({ status: "completed", output_text: JSON.stringify(llmAnswer) }));
    const response = await chatHandler(request({
      question: "5세대로 전환하려면 어디에 신청해야 하나요?",
      mode: "GENERAL",
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
    }));
    expect(await response.json()).toMatchObject({ status: "INSUFFICIENT_EVIDENCE" });
    fetchMock.mockRestore();
  });

  it("IN 질문의 가벼운 개인 표현은 거절하지 않고 계속 처리한다(환경변수가 없으면 fallback)", async () => {
    vi.stubEnv("RAGFLOW_BASE_URL", "");
    vi.stubEnv("LLM_API_KEY", "");
    const response = await chatHandler(request({
      question: "저는 병원을 자주 이용하지 않는데, 5세대로 바꾸면 보험료를 줄일 수 있나요?",
      mode: "GENERAL",
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "FALLBACK" });
  });

  describe("챗봇 검색 설정(정책자료 데이터셋)", () => {
    const askIn = async (context: object) => {
      vi.stubEnv("RAGFLOW_BASE_URL", "https://rag.example.com");
      vi.stubEnv("RAGFLOW_API_KEY", "secret");
      vi.stubEnv("RAGFLOW_DATASET_ID", "terms-dataset");
      vi.stubEnv("RAGFLOW_GENERAL_DATASET_ID", "policy-dataset");
      vi.stubEnv("LLM_API_KEY", "key");
      vi.stubEnv("LLM_MODEL", "model");
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: 0, data: { chunks: [] } }));
      const response = await chatHandler(request({
        question: "5세대로 바꾸면 줄어드는 보장이 있나요?",
        mode: "GENERAL",
        consentGranted: true,
        consentPolicyVersion: "ai-chat-1.0",
        context,
      }));
      const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
      fetchMock.mockRestore();
      return { sent, body: await response.json() };
    };

    it("정책자료 데이터셋을 검색하고 화면이 보낸 상품 코드를 무시한다", async () => {
      const { sent, body } = await askIn({ screen: "RESULT", productCode: "SAMSUNG_2605_1", generation: 5 });
      expect(sent.dataset_ids).toEqual(["policy-dataset"]);
      // 상품 필터는 없고, 세대를 묻지 않는 질문이라 5세대 문서만 검색한다
      expect(sent.metadata_condition.conditions).toEqual([{ name: "generation", comparison_operator: "is", value: "5" }]);
      expect(sent.page_size).toBe(10);
      expect(sent.similarity_threshold).toBe(0.1);
      expect(sent.vector_similarity_weight).toBe(0.5);
      // 검색어에는 일상어를 문서 용어로 풀어 붙인다(줄어드 → 보장 제외 한도 변경)
      expect(sent.question).toBe("5세대로 바꾸면 줄어드는 보장이 있나요? 보장 제외 한도 변경");
      expect(body).toMatchObject({ status: "INSUFFICIENT_EVIDENCE" });
    });

    it("CHATBOT_PRODUCT_FILTER=on 이면 예전처럼 상품 필터를 적용한다", async () => {
      vi.stubEnv("CHATBOT_PRODUCT_FILTER", "on");
      const { sent } = await askIn({ screen: "RESULT", productCode: "SAMSUNG_2605_1", generation: 5 });
      expect(sent.metadata_condition.conditions).toEqual(
        expect.arrayContaining([{ name: "productCode", comparison_operator: "is", value: "SAMSUNG_2605_1" }]),
      );
    });
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
  afterEach(() => vi.unstubAllEnvs());

  it("필수 설정이 없으면 degraded와 unconfigured를 반환한다", async () => {
    vi.stubEnv("RAGFLOW_BASE_URL", "");
    vi.stubEnv("RAGFLOW_API_KEY", "");
    vi.stubEnv("RAGFLOW_DATASET_ID", "");
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("LLM_MODEL", "");

    const response = healthHandler(new Request("http://localhost/api/health"));
    const body = await response.json();
    expect(body).toEqual({
      status: "degraded",
      services: {
        api: "available",
        rag: "unconfigured",
        llm: "unconfigured",
      },
    });
    expect(JSON.stringify(body)).not.toContain("API_KEY");
  });

  it("필수 설정이 모두 있으면 ready와 configured를 반환한다", async () => {
    vi.stubEnv("RAGFLOW_BASE_URL", "https://ragflow.example.com");
    vi.stubEnv("RAGFLOW_API_KEY", "rag-secret");
    vi.stubEnv("RAGFLOW_DATASET_ID", "dataset-1");
    vi.stubEnv("LLM_API_KEY", "llm-secret");
    vi.stubEnv("LLM_MODEL", "model-1");

    const response = healthHandler(new Request("http://localhost/api/health"));
    expect(await response.json()).toEqual({
      status: "ready",
      services: {
        api: "available",
        rag: "configured",
        llm: "configured",
      },
    });
  });
});
