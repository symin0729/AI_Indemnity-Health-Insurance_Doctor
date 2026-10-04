import policyChunks from "../_data/policy-chunks.json";
import { isAllowedRagStatus } from "./ragFilters";
import type { RetrievedEvidence } from "./types";

/**
 * 배포 환경용 근거 검색. RAGFlow(로컬 Docker)에 닿지 못할 때 배포 파일 안에 포함된 정책자료 청크에서 직접 찾는다.
 * 한글 글자쌍(bigram) + 낱말 단위 BM25 점수. RAGFlow 의 하이브리드 검색보다 단순하므로 정확도는 evals 로 따로 측정한다.
 */
interface BundledChunk {
  id: string;
  documentId: string;
  fileName: string;
  content: string;
  metadata: Record<string, unknown>;
}

const chunks = (policyChunks as { chunks: BundledChunk[] }).chunks;

const STOPWORDS = new Set(["은", "는", "이", "가", "을", "를", "에", "의", "도", "로", "과", "와", "및", "수", "있나요", "인가요", "해요", "하나요", "무엇", "어떻게"]);

const tokenize = (text: string): string[] => {
  const normalized = text.normalize("NFC").toLowerCase();
  const words = normalized.match(/[0-9a-z]+|[가-힣]+/g) ?? [];
  const tokens: string[] = [];
  for (const word of words) {
    if (STOPWORDS.has(word)) continue;
    if (/^[0-9a-z]+$/.test(word)) {
      tokens.push(word);
      continue;
    }
    tokens.push(word);
    for (let i = 0; i < word.length - 1; i += 1) tokens.push(word.slice(i, i + 2));
  }
  return tokens;
};

const docs = chunks.map((chunk) => {
  const tokens = tokenize(chunk.content);
  const freq = new Map<string, number>();
  for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
  return { chunk, freq, length: tokens.length };
});
const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(docs.length, 1);
const docFreq = new Map<string, number>();
for (const doc of docs) for (const token of doc.freq.keys()) docFreq.set(token, (docFreq.get(token) ?? 0) + 1);

const K1 = 1.4;
const B = 0.6;

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export interface BundledOptions {
  pageSize?: number;
  /** 문서 이름표 조건(예: generation=5). 값은 문자열로 비교한다 */
  conditions?: ReadonlyArray<{ name: string; value: string | number }>;
  allowedStatuses?: readonly string[];
}

export const bundledRetrieve = (question: string, options: BundledOptions = {}): RetrievedEvidence[] => {
  const queryTokens = [...new Set(tokenize(question))];
  if (queryTokens.length === 0) return [];
  const scored: Array<{ chunk: BundledChunk; score: number }> = [];
  for (const doc of docs) {
    const metadata = doc.chunk.metadata;
    if (!isAllowedRagStatus(metadata, options.allowedStatuses)) continue;
    if (options.conditions?.some(({ name, value }) => String(metadata[name] ?? "") !== String(value))) continue;
    let score = 0;
    for (const token of queryTokens) {
      const tf = doc.freq.get(token);
      if (!tf) continue;
      const df = docFreq.get(token) ?? 1;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / avgLength)));
    }
    if (score > 0) scored.push({ chunk: doc.chunk, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const evidence: RetrievedEvidence[] = [];
  for (const { chunk } of scored.slice(0, options.pageSize ?? 10)) {
    const m = chunk.metadata;
    const url = text(m.sourceUrl);
    const organization = text(m.publisher);
    const verifiedAt = text(m.verifiedAt);
    const title = text(m.title);
    if (!url || !organization || !verifiedAt || !title) continue;
    const generation = text(m.generation) ?? (typeof m.generation === "number" ? String(m.generation) : undefined);
    const scope = generation ? `${generation}세대` : text(m.appliesTo);
    evidence.push({
      content: chunk.content,
      ...(scope ? { scope } : {}),
      source: {
        documentId: chunk.documentId,
        title,
        organization,
        publishedAt: text(m.publishedAt),
        verifiedAt,
        url,
      },
    });
  }
  return evidence;
};
