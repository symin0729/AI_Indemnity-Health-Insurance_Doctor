import { afterEach, describe, expect, it, vi } from "vitest";
import { callRagFlow } from "../api/_lib/callRagFlow";
import { isAllowedRagStatus, isVerifiedRagMetadata, matchesRagFilters } from "../api/_lib/ragFilters";

afterEach(() => vi.restoreAllMocks());

describe("RAG product filters", () => {
  const metadata = { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" };

  it("상품·세대·담보가 일치하는 근거만 통과시킨다", () => {
    expect(matchesRagFilters(metadata, { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" })).toBe(true);
    expect(matchesRagFilters(metadata, { productCode: "SAMSUNG_1704_1", generation: 3 })).toBe(false);
  });
});

describe("RAGFlow 검색 요청 설정", () => {
  const body = async (extra: object) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: 0, data: { chunks: [] } }));
    await callRagFlow("자기부담금", {
      baseUrl: "https://rag.example.com",
      apiKey: "secret",
      datasetId: "dataset-1",
      timeoutMs: 100,
      ...extra,
    });
    return JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
  };

  it("설정이 없으면 검색어를 그대로 보내고(벡터 0.3, 접두어·보강 문구 없음) 이름표를 요청한다", async () => {
    const sent = await body({});
    expect(sent.question).toBe("자기부담금");
    expect(sent.vector_similarity_weight).toBe(0.3);
    expect(sent.reference_metadata).toEqual({ include: true });
  });

  it("평가에서 정한 가중치와 접두어를 검색 요청에 반영한다", async () => {
    const sent = await body({ vectorWeight: 0.35, queryPrefix: "task: search result | query:", queryRules: true });
    expect(sent.question).toBe("task: search result | query: 자기부담금 보상금액 공제금액 보상한도");
    expect(sent.vector_similarity_weight).toBe(0.35);
  });
});

describe("RAG 허용 상태 정책", () => {
  it("기본은 VERIFIED 만 허용하고 상태가 없으면 차단한다", () => {
    expect(isAllowedRagStatus({ status: "VERIFIED" })).toBe(true);
    expect(isAllowedRagStatus({ status: "AI_SOURCE_VALIDATED" })).toBe(false);
    expect(isAllowedRagStatus({})).toBe(false);
  });

  it("환경변수로 넓힌 허용 상태 목록을 따른다(대소문자 무시)", () => {
    const allowed = ["VERIFIED", "AI_CROSS_CHECKED"];
    expect(isAllowedRagStatus({ status: "ai_cross_checked" }, allowed)).toBe(true);
    expect(isAllowedRagStatus({ status: "AI_SOURCE_VALIDATED" }, allowed)).toBe(false);
  });

  it("허용 상태를 넓히면 RAGFlow 응답에서 그 상태 문서도 반환한다", async () => {
    const chunk = (documentId: string, status: string) => ({
      content: `${documentId} content`,
      document_id: documentId,
      document_name: `${documentId} title`,
      metadata: { status, sourceUrl: `https://example.com/${documentId}`, publisher: "테스트 기관", verifiedAt: "2026-10-03" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      code: 0,
      data: { chunks: [chunk("a", "VERIFIED"), chunk("b", "AI_CROSS_CHECKED"), chunk("c", "AI_SOURCE_VALIDATED")] },
    }));
    const result = await callRagFlow("질문", {
      baseUrl: "https://rag.example.com", apiKey: "secret", datasetId: "d", timeoutMs: 100,
      allowedStatuses: ["VERIFIED", "AI_CROSS_CHECKED"],
    });
    expect(result.map((item) => item.source.documentId)).toEqual(["a", "b"]);
  });
});

describe("RAG evidence review status", () => {
  it.each([
    { status: "VERIFIED" },
    { reviewStatus: "verified" },
    { review_status: "Verified" },
  ])("검수 완료 메타데이터만 통과시킨다: %o", (metadata) => {
    expect(isVerifiedRagMetadata(metadata)).toBe(true);
  });

  it.each([
    {},
    { status: "PENDING" },
    { reviewStatus: "REJECTED" },
  ])("미검수 또는 상태가 없는 자료를 차단한다: %o", (metadata) => {
    expect(isVerifiedRagMetadata(metadata)).toBe(false);
  });

  it("RAGFlow 응답에서 VERIFIED 문서만 반환한다", async () => {
    const chunk = (documentId: string, status?: string) => ({
      content: `${documentId} content`,
      document_id: documentId,
      document_name: `${documentId} title`,
      metadata: {
        status,
        sourceUrl: `https://example.com/${documentId}`,
        publisher: "테스트 기관",
        verifiedAt: "2026-09-28",
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      code: 0,
      data: { chunks: [chunk("verified", "VERIFIED"), chunk("pending", "PENDING"), chunk("missing")] },
    }));

    const result = await callRagFlow("자기부담금", {
      baseUrl: "https://rag.example.com",
      apiKey: "secret",
      datasetId: "dataset-1",
      timeoutMs: 100,
    });

    expect(result.map((item) => item.source.documentId)).toEqual(["verified"]);
  });

  it("상품 필터를 RAGFlow 서버 요청에도 전달하고 응답을 다시 검증한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: 0, data: { chunks: [] } }));
    await callRagFlow("4세대 통원 공제", {
      baseUrl: "https://rag.example.com",
      apiKey: "secret",
      datasetId: "dataset-1",
      timeoutMs: 100,
      filters: { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" },
    });
    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    expect(body.metadata_condition).toEqual({
      logic: "and",
      conditions: [
        { name: "productCode", comparison_operator: "is", value: "SAMSUNG_2107_1" },
        { name: "generation", comparison_operator: "is", value: 4 },
        { name: "coverageCode", comparison_operator: "is", value: "BASE" },
      ],
    });
  });
});
