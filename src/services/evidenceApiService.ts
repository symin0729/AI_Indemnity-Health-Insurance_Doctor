import { z } from "zod";

const responseSchema = z.object({
  evidence: z.array(z.object({
    content: z.string(),
    source: z.object({
      documentId: z.string(),
      title: z.string(),
      organization: z.string(),
      section: z.string().optional(),
      publishedAt: z.string().optional(),
      verifiedAt: z.string(),
      url: z.string().url(),
    }),
  })),
  status: z.enum(["FOUND", "NOT_FOUND", "UNCONFIGURED"]),
  requestId: z.string(),
});

export interface EvidenceRequest {
  question: string;
  productCode: string;
  generation?: number;
  coverageCode?: string;
  consentGranted: boolean;
  consentPolicyVersion: string;
}

export const evidenceApiService = {
  async search(input: EvidenceRequest, signal?: AbortSignal) {
    const response = await fetch("/api/evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new Error("약관 근거를 검색하지 못했습니다.");
    return responseSchema.parse(await response.json());
  },
};
