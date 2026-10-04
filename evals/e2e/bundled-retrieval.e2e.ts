/**
 * 배포용 내장 검색(api/_lib/bundledRetrieval.ts)의 적중률을 RAGFlow 평가와 같은 기준으로 잰다.
 * 적중 = 상위 10개 청크 중 하나가 expectedPages 의 문서(와 쪽)에 해당. 쪽은 청크 글자와 policy-page-index.json 대조.
 *   npx vitest run --config evals/e2e/vitest.config.ts evals/e2e/bundled-retrieval.e2e.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { bundledRetrieve } from "../../api/_lib/bundledRetrieval";
import { fiveGenerationCondition } from "../../api/_lib/generationScope";
import { withRetrievalGlossary } from "../../api/_lib/retrievalGlossary";

const index = JSON.parse(readFileSync("knowledge/validation/ragflow/policy-page-index.json", "utf-8")).pages as Record<string, Record<string, string>>;
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, "");
const pagesOf = (docId: string, content: string): Set<number> => {
  const text = norm(content);
  const pages = index[docId];
  const found = new Set<number>();
  if (!pages || text.length < 40) return found;
  const mid = Math.floor(text.length / 2);
  for (const w of [text.slice(0, 40), text.slice(mid - 20, mid + 20), text.slice(-40)]) {
    for (const [page, body] of Object.entries(pages)) if (body.includes(w)) found.add(Number(page));
  }
  return found;
};

const load = (file: string, split: string) =>
  (JSON.parse(readFileSync(file, "utf-8")).questions as Array<Record<string, any>>).filter((q) => q.expectedRoute === "IN" && q.split === split);

it("내장 검색 적중률", () => {
  const sets: Array<[string, Array<Record<string, any>>]> = [
    ["dev", load("evals/golden-questions.json", "dev")],
    ["final", load("evals/golden-questions.json", "final")],
    ["holdout2", load("evals/golden-holdout2.json", "holdout2")],
  ];
  const lines: string[] = [];
  for (const [name, questions] of sets) {
    let n = 0;
    let hits = 0;
    let randomHits = 0;
    let top3 = 0;
    const failed: string[] = [];
    for (const q of questions) {
      const expected = (q.expectedPages as string[])
        .map((p) => p.match(/^([A-Za-z0-9-]+?)(?: p\.(\d+))?$/))
        .filter((m): m is RegExpMatchArray => !!m && !["STD-14", "STD-15"].includes(m[1]))
        .map((m) => ({ doc: m[1], page: m[2] ? Number(m[2]) : null }));
      if (expected.length === 0) continue;
      n += 1;
      const cond = fiveGenerationCondition(q.question);
      const evidence = bundledRetrieve(withRetrievalGlossary(q.question), { pageSize: 10, conditions: cond ? [cond] : undefined, allowedStatuses: ["VERIFIED", "AI_CROSS_CHECKED", "AI_SOURCE_VALIDATED"] });
      const ok = evidence.some((e) => expected.some((x) => x.doc === e.source.documentId && (x.page === null || pagesOf(e.source.documentId, e.content).has(x.page))));
      if (ok) hits += 1;
      else failed.push(q.questionId);
      // 비교용: 질문과 무관하게 무작위로 고른 10개 청크가 적중할 확률
      const pool = bundledRetrieve("실손 보험 보장 가입 전환 세대", { pageSize: 400, conditions: cond ? [cond] : undefined, allowedStatuses: ["VERIFIED", "AI_CROSS_CHECKED", "AI_SOURCE_VALIDATED"] });
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
      if (shuffled.some((e) => expected.some((x) => x.doc === e.source.documentId && (x.page === null || pagesOf(e.source.documentId, e.content).has(x.page))))) randomHits += 1;
      // 상위 3개 적중
      if (evidence.slice(0, 3).some((e) => expected.some((x) => x.doc === e.source.documentId && (x.page === null || pagesOf(e.source.documentId, e.content).has(x.page))))) top3 += 1;
    }
    lines.push(`${name}: ${hits}/${n} = ${((hits / n) * 100).toFixed(1)}% | 상위3 ${top3}/${n} | 무작위10개 기준 ${randomHits}/${n} | 실패 ${failed.join(",")}`);
  }
  writeFileSync("/private/tmp/claude-501/bundled_result.txt", lines.join("\n"));
});
