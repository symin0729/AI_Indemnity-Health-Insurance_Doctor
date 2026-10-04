/**
 * 챗봇 종단 평가: 골든셋 IN 질문을 실제 챗봇 API(chat.ts)에 보내 상태·근거 표시·금지 표현을 점검한다.
 *
 *   E2E_SET=holdout2 E2E_LLM=ollama E2E_LIMIT=5 npx vitest run --config evals/e2e/vitest.config.ts
 *
 * E2E_SET   dev | final | holdout2 (기본 holdout2)
 * E2E_LLM   ollama 이면 로컬 gemma3:12b 를 쓴다(개발·평가용). 비우면 .env.local 의 LLM 설정(Gemini)
 * E2E_LIMIT 앞에서 N개만(시간 확인용)
 * 결과: knowledge/validation/ragflow/e2e-<set>-<llm>.json, 사람 검토용 e2e-<set>-<llm>.md (질문·답변·출처)
 * API 키와 개인정보는 저장하지 않는다. 결과 판정 규칙은 19a WO-09 를 따른다.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import chatHandler from "../../api/chat";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// 무료 Gemini 는 분당 5건 제한이라 질문 사이를 띄우고, 429·503 이면 기다렸다가 다시 시도한다
const DELAY_MS = Number(process.env.E2E_DELAY_MS ?? "0");
const SET = process.env.E2E_SET ?? "holdout2";
const LLM = process.env.E2E_LLM ?? "gemini";
const LIMIT = Number(process.env.E2E_LIMIT ?? "0");
if (LLM === "ollama") {
  process.env.LLM_PROVIDER = "ollama";
  process.env.LLM_MODEL = process.env.E2E_MODEL ?? "gemma3:12b";
  process.env.CHAT_TIMEOUT_MS = "120000";
}
if (process.env.E2E_THINKING) process.env.LLM_THINKING_LEVEL = process.env.E2E_THINKING;
process.env.CHAT_DEBUG = "1";

const FORBIDDEN = /(더 좋습니다|더 낫습니다|가입하세요|해지하세요|전환하세요|바꾸세요|추천합니다|유리합니다|하시는 게 좋)/;
const file = SET === "holdout2" ? "evals/golden-holdout2.json" : SET === "team15" ? "evals/golden-team-in15.json" : "evals/golden-questions.json";
const all = (JSON.parse(readFileSync(file, "utf-8")).questions as Array<Record<string, any>>).filter(
  (q) => q.expectedRoute === "IN" && q.split === SET,
);
const ONLY = (process.env.E2E_IDS ?? "").split(",").filter(Boolean);
const TAG = process.env.E2E_TAG ? `-${process.env.E2E_TAG}` : "";
const picked = ONLY.length ? all.filter((q) => ONLY.includes(q.questionId)) : all;
const questions = LIMIT > 0 ? picked.slice(0, LIMIT) : picked;

it(`종단 평가 ${SET} (${LLM}) ${questions.length}문항`, async () => {
  // 질문 하나가 끝날 때마다 .rows.jsonl 에 저장한다. 중간에 멈춰도 다시 실행하면 끝난 질문은 건너뛰고 이어서 한다.
  // 처음부터 다시 하려면 .rows.jsonl 과 .progress.txt 를 지운다.
  const rowsFile = `knowledge/validation/ragflow/e2e-${SET}-${LLM}${TAG}.rows.jsonl`;
  const progress = `knowledge/validation/ragflow/e2e-${SET}-${LLM}${TAG}.progress.txt`;
  const rows: Array<Record<string, any>> = existsSync(rowsFile)
    ? readFileSync(rowsFile, "utf-8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const done = new Set(rows.map((r) => r.questionId));
  appendFileSync(progress, `${rows.length ? "이어서 시작" : "시작"} ${new Date().toLocaleTimeString("ko-KR")} / 총 ${questions.length}문항 / 이미 끝남 ${rows.length}\n`);
  for (const q of questions) {
    if (done.has(q.questionId)) continue;
    const started = Date.now();
    let body: any = {};
    let dailyLimit = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (DELAY_MS) await sleep(DELAY_MS);
      const response = await chatHandler(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: q.question,
            mode: "GENERAL",
            consentGranted: true,
            consentPolicyVersion: process.env.CHAT_CONSENT_POLICY_VERSION ?? "ai-chat-1.0",
          }),
        }),
      );
      body = await response.json();
      if (!/\((429|503)\)/.test(body.debugReason ?? "")) break;
      // 하루 한도(per day)를 넘었으면 재시도해도 소용없으므로 바로 멈춘다(끝난 질문은 보존됨)
      if (/per day|PerDay|daily/i.test(body.debugReason ?? "")) { dailyLimit = true; break; }
      await sleep(Number(process.env.E2E_RETRY_WAIT_MS ?? "30000"));
    }
    const expectedDocs = new Set((q.expectedPages as string[]).map((p) => p.split(" ")[0]));
    const sources = ((body.sources ?? []) as Array<{ documentId?: string; title?: string }>).map((s) => s.title ?? s.documentId ?? "");
    const text = [body.answer, ...(body.keyPoints ?? []), ...(body.confirmations ?? [])].join(" ");
    if (dailyLimit) {
      appendFileSync(progress, `하루 한도 초과로 중단: ${body.debugReason}\n`);
      break;
    }
    const row = {
      questionId: q.questionId,
      expectedId: q.expectedId,
      question: q.question,
      status: body.status ?? (body.error ? `ERROR:${body.error.code}` : "?"),
      answered: Boolean(body.answer) && !body.fallback,
      citesExpectedDoc: sources.some((id) => [...expectedDocs].some((d) => id.includes(d))),
      forbiddenPhrase: FORBIDDEN.test(text),
      sources,
      answer: body.answer ?? "",
      keyPoints: body.keyPoints ?? [],
      failureReason: body.debugReason ?? "",
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    rows.push(row);
    appendFileSync(rowsFile, JSON.stringify(row) + "\n");
    appendFileSync(progress, `${rows.length}/${questions.length} ${row.questionId} ${row.expectedId} ${row.status}${row.failureReason ? `(${row.failureReason})` : ""} 답변=${row.answered} 기대문서인용=${row.citesExpectedDoc} 금지표현=${row.forbiddenPhrase} ${row.seconds}s\n`);
    console.log(`${row.questionId} ${row.expectedId} ${row.status} 답변=${row.answered} 기대문서인용=${row.citesExpectedDoc} 금지표현=${row.forbiddenPhrase} ${row.seconds}s`);
  }
  const n = rows.length;
  const count = (f: (r: any) => boolean) => rows.filter(f).length;
  const summary = {
    set: SET,
    llm: LLM,
    questions: n,
    answered: count((r) => r.answered),
    insufficientEvidence: count((r) => r.status === "INSUFFICIENT_EVIDENCE"),
    fallback: count((r) => r.status === "FALLBACK"),
    citesExpectedDoc: count((r) => r.answered && r.citesExpectedDoc),
    forbiddenPhrase: count((r) => r.forbiddenPhrase),
    avgSeconds: Math.round((rows.reduce((a, r) => a + r.seconds, 0) / Math.max(n, 1)) * 10) / 10,
  };
  console.log("\n=== 종단 평가 요약 ===\n" + JSON.stringify(summary, null, 2));
  const base = `knowledge/validation/ragflow/e2e-${SET}-${LLM}${TAG}`;
  writeFileSync(`${base}.json`, JSON.stringify({ executedAt: new Date().toISOString(), summary, rows }, null, 2));
  writeFileSync(
    `${base}.md`,
    `# 종단 평가 ${SET} (${LLM}) — 사람 검토용\n\n` +
      rows
        .map(
          (r) =>
            `## ${r.questionId} ${r.expectedId} · ${r.status}\n- 질문: ${r.question}\n- 답변: ${r.answer || "(없음)"}\n- 출처: ${r.sources.join(", ") || "(없음)"}\n- 기대 문서 인용: ${r.citesExpectedDoc} / 금지 표현: ${r.forbiddenPhrase}\n- 검토: ☐ 답변이 근거와 맞다 ☐ 추천·결정 표현이 없다\n`,
        )
        .join("\n"),
  );
});
