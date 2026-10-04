import { z } from "zod";
import { fetchWithTimeout } from "./http";
import { buildRetrievalQuery } from "./retrievalQuery";
import { isAllowedRagStatus, matchesRagFilters, type RagFilters } from "./ragFilters";
import type { RetrievedEvidence } from "./types";

const ragflowResponseSchema = z.object({
  code: z.number().optional(),
  data: z.object({ chunks: z.array(z.record(z.string(), z.unknown())) }).optional(),
});

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export interface RagFlowOptions {
  baseUrl: string;
  apiKey: string;
  datasetId: string;
  timeoutMs: number;
  filters?: RagFilters;
  /** 벡터 가중치(0~1). 키워드 가중치는 1에서 뺀 값. 기본 0.3 */
  vectorWeight?: number;
  /** 질문 앞에 붙일 검색 접두어. 임베딩 모델이 권장하는 형식을 쓴다. 기본값 없음 */
  queryPrefix?: string;
  /** true 일 때만 검색어 보강 규칙(retrieval-query-rules.json)을 적용한다. 기본 false */
  queryRules?: boolean;
  /** 가져올 청크 수. 기본 6 */
  pageSize?: number;
  /** 유사도 하한(0~1). 기본 0.2 */
  similarityThreshold?: number;
  /** 추가 metadata 검색 조건(예: 5세대 문서만). 사후 필터(filters)와 달리 검색 단계에서만 쓴다 */
  extraConditions?: ReadonlyArray<{ name: string; value: string | number }>;
  /** 근거로 허용할 문서 상태. 기본 ["VERIFIED"] */
  allowedStatuses?: readonly string[];
}

export const callRagFlow = async (
  question: string,
  options: RagFlowOptions,
): Promise<RetrievedEvidence[]> => {
  const metadataConditions = options.filters
    ? Object.entries(options.filters)
        .filter(([, filterValue]) => filterValue !== undefined)
        .map(([name, filterValue]) => ({
          name,
          comparison_operator: "is",
          value: filterValue,
        }))
    : [];
  const searchConditions = [
    ...metadataConditions,
    ...(options.extraConditions ?? []).map(({ name, value }) => ({ name, comparison_operator: "is", value })),
  ];
  const response = await fetchWithTimeout(
    `${options.baseUrl}/api/v1/retrieval`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        question: [options.queryPrefix, options.queryRules ? buildRetrievalQuery(question) : question].filter(Boolean).join(" "),
        dataset_ids: [options.datasetId],
        page: 1,
        page_size: options.pageSize ?? 6,
        similarity_threshold: options.similarityThreshold ?? 0.2,
        vector_similarity_weight: options.vectorWeight ?? 0.3,
        reference_metadata: { include: true },
        ...(searchConditions.length > 0
          ? {
              metadata_condition: {
                logic: "and",
                conditions: searchConditions,
              },
            }
          : {}),
      }),
    },
    options.timeoutMs,
  );

  if (!response.ok) throw new Error(`RAGFlow request failed (${response.status})`);
  const parsed = ragflowResponseSchema.safeParse(await response.json());
  if (!parsed.success || (parsed.data.code ?? 0) !== 0) {
    throw new Error("RAGFlow response was invalid");
  }

  return (parsed.data.data?.chunks ?? []).flatMap((chunk) => {
    const content = text(chunk.content_with_weight) ?? text(chunk.content);
    const documentId = text(chunk.document_id);
    const title = text(chunk.document_keyword) ?? text(chunk.document_name);
    const metadata = [chunk.metadata, chunk.document_metadata].find(
      (candidate): candidate is Record<string, unknown> =>
        !!candidate && typeof candidate === "object",
    ) ?? chunk;
    if (!isAllowedRagStatus(metadata, options.allowedStatuses)) return [];
    if (options.filters && !matchesRagFilters(metadata, options.filters)) return [];
    const url = text(metadata.sourceUrl) ?? text(metadata.source_url) ?? text(metadata.url);
    const organization = text(metadata.publisher) ?? text(metadata.organization);
    const verifiedAt = text(metadata.verifiedAt) ?? text(metadata.verified_at);

    if (!content || !documentId || !title || !url || !organization || !verifiedAt) {
      return [];
    }
    const generation = text(metadata.generation);
    const scope = generation ? `${generation}세대` : text(metadata.appliesTo);
    return [{
      content,
      ...(scope ? { scope } : {}),
      source: {
        documentId,
        title,
        organization,
        section: text(metadata.section),
        publishedAt: text(metadata.publishedAt) ?? text(metadata.published_at),
        verifiedAt,
        url,
      },
    }];
  });
};
