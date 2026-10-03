import { z } from "zod";
import { fetchWithTimeout } from "./http";
import { isVerifiedRagMetadata, matchesRagFilters, type RagFilters } from "./ragFilters";
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
  const response = await fetchWithTimeout(
    `${options.baseUrl}/api/v1/retrieval`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        question,
        dataset_ids: [options.datasetId],
        page: 1,
        page_size: 6,
        similarity_threshold: 0.2,
        vector_similarity_weight: 0.3,
        ...(metadataConditions.length > 0
          ? {
              metadata_condition: {
                logic: "and",
                conditions: metadataConditions,
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
    const metadata =
      chunk.metadata && typeof chunk.metadata === "object"
        ? (chunk.metadata as Record<string, unknown>)
        : chunk;
    if (!isVerifiedRagMetadata(metadata)) return [];
    if (options.filters && !matchesRagFilters(metadata, options.filters)) return [];
    const url = text(metadata.sourceUrl) ?? text(metadata.source_url) ?? text(metadata.url);
    const organization = text(metadata.publisher) ?? text(metadata.organization);
    const verifiedAt = text(metadata.verifiedAt) ?? text(metadata.verified_at);

    if (!content || !documentId || !title || !url || !organization || !verifiedAt) {
      return [];
    }
    return [{
      content,
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
