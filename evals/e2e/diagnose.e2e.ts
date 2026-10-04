/**
 * 종단 평가에서 FALLBACK(답변 불가)이 된 질문의 원인을 가른다. chat.ts 와 같은 순서(검색 → 답변 → 검사)를 다시 실행하고
 * 어느 단계에서 왜 실패했는지 적는다. 결과: knowledge/validation/ragflow/e2e-diagnose.jsonl
 *   E2E_DIAG_IDS=GQ-201,GQ-202 npx vitest run --config evals/e2e/vitest.config.ts evals/e2e/diagnose.e2e.ts
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { callLlm } from "../../api/_lib/callLlm";
import { callRagFlow } from "../../api/_lib/callRagFlow";
import { buildGeneralPrompt } from "../../api/_lib/buildGeneralPrompt";
import { chatbotDatasetId, getConfig } from "../../api/_lib/config";
import { fiveGenerationCondition } from "../../api/_lib/generationScope";
import { withRetrievalGlossary } from "../../api/_lib/retrievalGlossary";

const OUT = "knowledge/validation/ragflow/e2e-diagnose.jsonl";
const FORBIDDEN = /가입하세요|해지하세요|전환하세요|추천합니다|지급됩니다|확실히|반드시|진단|처방|치료하세요|더 좋|더 낫|유리합니다|유리할 수 있|좋은 선택|하는 것이 좋습니다|하는 게 좋습니다/;
const nums = (v: string) => (v.replace(/(^|\n)\s*(\*\*|-\s*)?\d{1,2}[.)]\s/g, "$1").match(/\d[\d,.]*%?/g) ?? []).map((x) => x.replace(/[.,]+$/, ""));

it("원인 분석", async () => {
  process.env.LLM_PROVIDER = "ollama";
  process.env.LLM_MODEL = process.env.E2E_MODEL ?? "gemma3:12b";
  const config = getConfig();
  const ids = (process.env.E2E_DIAG_IDS ?? "").split(",").filter(Boolean);
  const all = JSON.parse(readFileSync("evals/golden-holdout2.json", "utf-8")).questions as Array<Record<string, any>>;
  writeFileSync(OUT, "");
  for (const q of all.filter((x) => ids.includes(x.questionId))) {
    const row: Record<string, unknown> = { questionId: q.questionId, expectedId: q.expectedId, question: q.question };
    const t0 = Date.now();
    try {
      const cond = fiveGenerationCondition(q.question);
      const evidence = await callRagFlow(withRetrievalGlossary(q.question), {
        baseUrl: config.ragflowBaseUrl, apiKey: config.ragflowApiKey, datasetId: chatbotDatasetId(config), timeoutMs: 60000,
        pageSize: 10, similarityThreshold: 0.1, vectorWeight: 0.5, ...(cond ? { extraConditions: [cond] } : {}), allowedStatuses: config.ragAllowedStatuses,
      });
      row.evidenceCount = evidence.length;
      row.evidenceTitles = [...new Set(evidence.map((e) => e.source.title.slice(0, 12)))];
      if (evidence.length === 0) { row.failure = "근거 0개(검색 결과 없음)"; throw new Error("stop"); }
      const prompt = buildGeneralPrompt(q.question, evidence);
      let answer;
      try {
        answer = await callLlm(prompt, { provider: "ollama", apiKey: "", model: config.llmModel, thinkingLevel: "minimal", timeoutMs: 120000, baseUrl: config.llmBaseUrl });
      } catch (e) { row.failure = `LLM 단계 실패: ${String(e).slice(0, 120)}`; throw new Error("stop"); }
      const combined = [answer.answer, ...answer.keyPoints, ...answer.confirmations].join(" ");
      const idSet = new Set(evidence.map((e) => e.source.documentId));
      const reasons: string[] = [];
      const m = FORBIDDEN.exec(combined);
      if (m) reasons.push(`금지표현「${m[0]}」`);
      if (answer.sourceDocumentIds.length === 0) reasons.push("출처 id 없음");
      const badIds = answer.sourceDocumentIds.filter((i) => !idSet.has(i));
      if (badIds.length) reasons.push(`근거에 없는 출처 id ${badIds.length}개`);
      const evNums = new Set(nums(evidence.map((e) => e.content).join(" ")));
      const badNums = [...new Set(nums(combined).filter((n) => !evNums.has(n)))];
      if (badNums.length) reasons.push(`근거에 없는 숫자 ${JSON.stringify(badNums)}`);
      row.failure = reasons.length ? reasons.join(" + ") : "검사 통과(정상 답변)";
      row.answerHead = answer.answer.slice(0, 160);
    } catch { /* 위에서 failure 기록 */ }
    row.seconds = Math.round((Date.now() - t0) / 100) / 10;
    appendFileSync(OUT, JSON.stringify(row) + "\n");
  }
});
