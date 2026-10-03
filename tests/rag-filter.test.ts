import { afterEach, describe, expect, it, vi } from "vitest";
import { callRagFlow } from "../api/lib/callRagFlow";
import { isVerifiedRagMetadata, matchesRagFilters } from "../api/lib/ragFilters";

afterEach(() => vi.restoreAllMocks());

describe("RAG product filters", () => {
  const metadata = { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" };

  it("상품·세대·담보가 일치하는 근거만 통과시킨다", () => {
    expect(matchesRagFilters(metadata, { productCode: "SAMSUNG_2107_1", generation: 4, coverageCode: "BASE" })).toBe(true);
    expect(matchesRagFilters(metadata, { productCode: "SAMSUNG_1704_1", generation: 3 })).toBe(false);
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
