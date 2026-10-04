import type { ChatResponse } from "./chatbot.schema";
import SourceList from "./SourceList";

const headingLabel = (response: ChatResponse): string => {
  if (response.status === "PRIVACY_BLOCKED") return "개인정보 보호 안내";
  if (response.status === "OUT_OF_SCOPE") return "답변할 수 없는 질문 안내";
  return response.fallback ? "정형 안내" : "공식 근거 기반 답변";
};

interface AnswerCardProps {
  response: ChatResponse;
}

export default function AnswerCard({ response }: AnswerCardProps) {
  return (
    <article className={`chat-answer ${response.fallback ? "is-fallback" : ""}`} aria-live="polite">
      <div className="chat-answer__heading">
        <span className="chat-answer__mark" aria-hidden="true">AI</span>
        <div>
          <span>보험 이해 도우미</span>
          <small>{headingLabel(response)}</small>
        </div>
      </div>

      <p className="chat-answer__body">{response.answer}</p>

      {response.keyPoints.length > 0 && (
        <div className="chat-key-points">
          <strong>핵심 내용</strong>
          <ul>
            {response.keyPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
      )}

      {response.confirmations.length > 0 && (
        <div className="chat-confirmations">
          <strong>확인해 보세요</strong>
          {response.confirmations.map((item) => <p key={item}>{item}</p>)}
        </div>
      )}

      <SourceList sources={response.sources} />
    </article>
  );
}
