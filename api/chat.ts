import { callLlm } from "./_lib/callLlm.js";
import { bundledRetrieve } from "./_lib/bundledRetrieval.js";
import { callRagFlow } from "./_lib/callRagFlow.js";
import { fiveGenerationCondition } from "./_lib/generationScope.js";
import { withRetrievalGlossary } from "./_lib/retrievalGlossary.js";
import { buildGeneralPrompt } from "./_lib/buildGeneralPrompt.js";
import { classifyQuestion } from "./_lib/classifyQuestion.js";
import { chatbotDatasetId, getConfig, hasLlmConfig, hasRagConfig } from "./_lib/config.js";
import { fallback, outNotice } from "./_lib/fallback.js";
import { jsonResponse } from "./_lib/http.js";
import { redactPersonalData } from "./_lib/redactPersonalData.js";
import type { ApiErrorBody, ChatResponse } from "./_lib/types.js";
import { ConsentValidationError, validateConsent } from "./_lib/validateConsent.js";
import { answerFailureReasons, validateAnswer } from "./_lib/validateAnswer.js";
import { InputValidationError, validateInput } from "./_lib/validateInput.js";

async function handler(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return jsonResponse({ error: { code: "METHOD_NOT_ALLOWED", message: "POST 요청만 허용됩니다." }, requestId }, 405);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "application/json 요청만 허용됩니다." }, requestId }, 415);
  }

  try {
    const config = getConfig();
    const input = validateInput(await request.json(), config.maxLength);
    validateConsent(input, config.consentPolicyVersion);
    // 질문 유형 분류(외부 호출 없음). OUT·개인정보·범위 밖은 RAG·LLM 을 거치지 않고 고정 안내문만 보여 준다.
    const classification = classifyQuestion(input.question);
    if (classification.route !== "IN") return jsonResponse(outNotice(classification.id as Parameters<typeof outNotice>[0], requestId));

    // IN 질문에 "저는 병원을" 같은 가벼운 개인 표현이 있으면 삭제 표시로 바꾼 문장만 외부로 보낸다.
    const redacted = redactPersonalData(input.question);
    // RAGFlow 설정은 없어도 된다(배포 환경). 없으면 배포 파일에 포함된 근거에서 직접 찾는다.
    if (!hasLlmConfig(config) || (config.retrievalMode === "ragflow" && !hasRagConfig(config))) return jsonResponse(fallback("FALLBACK", requestId));

    // 챗봇은 정책자료 데이터셋을 상품 필터 없이 검색한다. 상품 필터는 약관 데이터셋(계산 설명, /api/evidence)용이며
    // CHATBOT_PRODUCT_FILTER=on 일 때만 챗봇에도 적용한다.
    const retrievalQuestion = withRetrievalGlossary(redacted.value);
    const generationCondition = fiveGenerationCondition(redacted.value);
    const searchBundled = () =>
      bundledRetrieve(retrievalQuestion, {
        pageSize: 10,
        conditions: generationCondition ? [generationCondition] : undefined,
        allowedStatuses: config.ragAllowedStatuses,
      });
    const searchRagflow = () =>
      callRagFlow(retrievalQuestion, {
        baseUrl: config.ragflowBaseUrl,
        apiKey: config.ragflowApiKey,
        datasetId: chatbotDatasetId(config),
        timeoutMs: config.timeoutMs,
        ...(config.chatbotProductFilter && input.context?.productCode
          ? {
              filters: {
                productCode: input.context.productCode,
                generation: input.context.generation,
                coverageCode: input.context.coverageCode,
              },
            }
          : {}),
        // 정책자료 검색 설정(scripts/evaluate-chatbot-retrieval.py 의 H2 설정과 같음): 상위 10개, 유사도 0.1 이상, 벡터 가중치 0.5
        pageSize: 10,
        similarityThreshold: 0.1,
        ...(generationCondition ? { extraConditions: [generationCondition] } : {}),
        vectorWeight: config.chatbotVectorWeight,
        queryPrefix: config.ragflowQueryPrefix,
        queryRules: config.ragflowQueryRules,
        allowedStatuses: config.ragAllowedStatuses,
      });
    // RETRIEVAL_MODE: ragflow(RAGFlow만) / bundled(배포 파일만) / auto(기본: RAGFlow 설정이 있으면 먼저 쓰고, 연결이 안 되면 배포 파일)
    let evidence: Awaited<ReturnType<typeof searchRagflow>>;
    if (config.retrievalMode === "bundled" || (config.retrievalMode === "auto" && !hasRagConfig(config))) {
      evidence = searchBundled();
    } else if (config.retrievalMode === "ragflow") {
      evidence = await searchRagflow();
    } else {
      try {
        evidence = await searchRagflow();
      } catch {
        evidence = searchBundled();
      }
    }
    if (evidence.length === 0) return jsonResponse(fallback("INSUFFICIENT_EVIDENCE", requestId));

    const llmAnswer = await callLlm(buildGeneralPrompt(redacted.value, evidence), {
      provider: config.llmProvider,
      apiKey: config.llmApiKey,
      model: config.llmModel,
      thinkingLevel: config.llmThinkingLevel,
      baseUrl: config.llmBaseUrl,
      retries: config.llmRetries,
      timeoutMs: config.timeoutMs,
    });
    // 모델이 "제공된 공식 자료에서 확인되지 않습니다"라고 하면서 출처를 비운 경우는 오류가 아니라 근거 부족이다
    if (llmAnswer.sourceDocumentIds.length === 0 && /확인되지\s*않습니다/.test(llmAnswer.answer)) {
      return jsonResponse(fallback("INSUFFICIENT_EVIDENCE", requestId));
    }
    // 사용자가 질문에 쓴 숫자(예: 2019년 가입)는 답변이 되풀이해도 되므로 근거 숫자에 포함한다
    if (!validateAnswer(llmAnswer, evidence, redacted.value)) {
      // CHAT_DEBUG=1 일 때만(평가용) 검사에서 걸린 이유를 응답에 덧붙인다. 기본은 꺼짐
      const debugReason = process.env.CHAT_DEBUG === "1" ? answerFailureReasons(llmAnswer, evidence, redacted.value).join(" + ") : undefined;
      return jsonResponse({ ...fallback("FALLBACK", requestId), ...(debugReason ? { debugReason } : {}) });
    }

    const usedIds = new Set(llmAnswer.sourceDocumentIds);
    const response: ChatResponse = {
      answer: llmAnswer.answer,
      keyPoints: llmAnswer.keyPoints,
      // 같은 문서에서 여러 조각을 썼어도 출처는 문서마다 한 번만 보여 준다
      sources: evidence
        .filter((item) => usedIds.has(item.source.documentId))
        .map((item) => item.source)
        .filter((source, index, all) => all.findIndex((other) => other.documentId === source.documentId) === index),
      confirmations: llmAnswer.confirmations,
      status: "ANSWERED",
      fallback: false,
      requestId,
    };
    return jsonResponse(response);
  } catch (error) {
    if (error instanceof InputValidationError || error instanceof ConsentValidationError) {
      return jsonResponse({ error: { code: error.code, message: error.message }, requestId } satisfies ApiErrorBody, 400);
    }
    return jsonResponse({ ...fallback("FALLBACK", requestId), ...(process.env.CHAT_DEBUG === "1" ? { debugReason: `오류: ${String(error).slice(0, 100)}` } : {}) });
  }
}

// Vercel 실행기는 default 함수에 fetch 속성이 있으면 웹 표준 핸들러로 인식한다. 로컬 플러그인·테스트는 함수 호출 그대로 쓴다.
export default Object.assign(handler, { fetch: handler })
