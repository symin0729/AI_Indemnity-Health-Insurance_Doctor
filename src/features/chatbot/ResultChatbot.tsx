import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { chatApiService, ChatApiError } from "../../services/chatApiService";
import { fallbackExplanationService } from "../../services/fallbackExplanationService";
import { useAnalysisStore } from "../../store/useAnalysisStore";
import AnswerCard from "./AnswerCard";
import type { ChatResponse } from "./chatbot.schema";
import QuestionChips from "./QuestionChips";
import "../../styles/chatbot.css";

export default function ResultChatbot() {
  const navigate = useNavigate();
  const contract = useAnalysisStore((state) => state.contract);
  const hasResultState = contract !== null;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runQuestion = async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isLoading) return;

    setQuestion(trimmed);
    setErrorMessage(null);
    setIsLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await chatApiService.ask({
        question: trimmed,
        mode: "GENERAL",
        consentGranted: true,
        consentPolicyVersion: "ai-chat-1.0",
        context: contract ? {
          screen: "RESULT",
          productCode: ({1:"SAMSUNG_0904_2",2:"SAMSUNG_1611_7",3:"SAMSUNG_1704_1",4:"SAMSUNG_2107_1",5:"SAMSUNG_2605_1"} as const)[contract.generation],
          generation: contract.generation,
        } : { screen: "RESULT" },
      }, controller.signal);
      setAnswer(response);
    } catch (error) {
      if (controller.signal.aborted) return;
      const localFallback = fallbackExplanationService.create("FALLBACK");
      setAnswer({ ...localFallback, requestId: crypto.randomUUID() });
      setErrorMessage(
        error instanceof ChatApiError
          ? error.message
          : "로컬 API 서버에 연결하지 못해 정형 안내를 표시했습니다.",
      );
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const requestQuestion = (nextQuestion: string) => {
    if (!consentGranted) {
      setPendingQuestion(nextQuestion);
      setIsConsentOpen(true);
      return;
    }
    void runQuestion(nextQuestion);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    requestQuestion(question);
  };

  const handleConsent = () => {
    const nextQuestion = pendingQuestion;
    setConsentGranted(true);
    setIsConsentOpen(false);
    setPendingQuestion(null);
    if (nextQuestion) void runQuestion(nextQuestion);
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setQuestion("");
    setAnswer(null);
    setErrorMessage(null);
    setConsentGranted(false);
    setPendingQuestion(null);
    setIsConsentOpen(false);
    setIsLoading(false);
  };

  return (
    <AppShell currentStep={7} showMvpNotice={false}>
      <main className="navy-page chat-page">
        <header className="chat-hero">
          <div>
            <span className="step-badge">선택 STEP 7 · 보험 이해 도우미</span>
            <h1>실손보험, 궁금한 점을<br />쉽게 물어보세요.</h1>
            <p>공식 자료를 바탕으로 5세대 전환을 판단할 때 필요한 질문에 답합니다.</p>
          </div>
          <div className="chat-privacy-card">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>개인 비교 정보와 분리되어 있어요</strong>
              <p>STEP 1~5의 계약·치료정보와 계산 결과를 읽거나 외부로 전달하지 않습니다.</p>
            </div>
          </div>
        </header>

        <section className="chat-panel">
          <div className="chat-section-heading">
            <div>
              <span className="eyebrow">QUICK QUESTIONS</span>
              <h2>무엇이 궁금하신가요?</h2>
            </div>
            {consentGranted && <span className="chat-consent-badge">외부 AI 이용 동의됨</span>}
          </div>

          <QuestionChips disabled={isLoading} onSelect={requestQuestion} />

          <form className="chat-composer" onSubmit={handleSubmit}>
            <label htmlFor="chat-question">직접 질문하기</label>
            <div className="chat-composer__row">
              <textarea
                id="chat-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 300))}
                placeholder="실손보험이나 5세대 전환에 관해 궁금한 내용을 입력해 주세요."
                rows={2}
                disabled={isLoading}
              />
              <button className="primary-button" type="submit" disabled={!question.trim() || isLoading}>
                {isLoading ? "확인 중" : "질문 보내기"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="chat-composer__meta">
              <span>개인정보, 치료기록, 증권번호는 입력하지 마세요.</span>
              <span>{question.length} / 300</span>
            </div>
          </form>

          {isLoading && (
            <div className="chat-loading" role="status">
              <span className="chat-loading__dots" aria-hidden="true"><i /><i /><i /></span>
              <div><strong>공식 자료를 확인하고 있습니다</strong><p>등록된 근거에서 관련 내용을 찾고 있어요.</p></div>
            </div>
          )}

          {errorMessage && <p className="chat-inline-error" role="status">{errorMessage}</p>}
          {answer && !isLoading && <AnswerCard response={answer} />}
        </section>

        <footer className="chat-actions">
          <button type="button" className="secondary-button" onClick={() => navigate(hasResultState ? "/result" : "/input")}>
            ← 비교 결과로 돌아가기
          </button>
          <button type="button" className="chat-reset-button" onClick={resetChat}>대화 초기화</button>
        </footer>
      </main>

      {isConsentOpen && (
        <div className="app-shell-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsConsentOpen(false);
        }}>
          <section className="app-shell-modal-card chat-consent-modal" role="dialog" aria-modal="true" aria-labelledby="chat-consent-title">
            <span className="chat-consent-modal__icon" aria-hidden="true">AI</span>
            <h2 id="chat-consent-title">외부 AI 이용 안내</h2>
            <p>입력한 일반 질문은 답변 생성을 위해 외부 AI 서비스로 전달될 수 있습니다.</p>
            <div className="chat-consent-detail">
              <p><strong>전달하지 않는 정보</strong><br />STEP 1~5의 보험 비교 입력값과 계산 결과</p>
              <p><strong>입력 시 주의사항</strong><br />개인정보와 치료정보는 질문에 입력하지 마세요.</p>
            </div>
            <div className="app-shell-modal-actions">
              <button type="button" className="app-shell-button app-shell-button-secondary" autoFocus onClick={() => {
                setIsConsentOpen(false);
                setPendingQuestion(null);
              }}>동의하지 않음</button>
              <button type="button" className="app-shell-button app-shell-button-primary" onClick={handleConsent}>동의하고 질문하기</button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
