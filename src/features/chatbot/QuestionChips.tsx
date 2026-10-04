import { useState } from "react";

// 팀 확정 추천 질문 5개(docs 19 종합문서 2.1절). 나머지는 "다른 질문 보기"에서 보여 준다.
const MAIN_QUESTIONS = [
  "지금 보험을 유지할지 5세대로 바꿀지 무엇을 비교해야 하나요?",
  "5세대로 바꾸면 줄어드는 보장이 있나요?",
  "병원을 자주 이용하지 않으면 보험료를 줄일 수 있나요?",
  "바꾼 뒤 이전 보험으로 돌아갈 수 있나요?",
  "전환 전에 보험사에 무엇을 확인해야 하나요?",
];

const MORE_QUESTIONS = [
  "1~5세대는 뭐가 다른가요?",
  "도수치료나 비급여 주사를 자주 받는다면 5세대로 바꾸기 전에 무엇을 확인해야 하나요?",
  "5세대의 특약1과 특약2는 꼭 둘 다 가입해야 하나요?",
  "5세대에서 비급여 보험금을 많이 받으면 다음 보험료가 오르나요?",
  "선택형 할인 특약과 계약전환 할인이 뭔가요? 저도 해당되나요?",
];

interface QuestionChipsProps {
  disabled?: boolean;
  onSelect: (question: string) => void;
}

export default function QuestionChips({ disabled, onSelect }: QuestionChipsProps) {
  const [showMore, setShowMore] = useState(false);
  const questions = showMore ? [...MAIN_QUESTIONS, ...MORE_QUESTIONS] : MAIN_QUESTIONS;

  return (
    <div className="chat-question-chips">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          className="chat-question-chip"
          disabled={disabled}
          onClick={() => onSelect(question)}
        >
          {question}
          <span aria-hidden="true">→</span>
        </button>
      ))}
      <button
        type="button"
        className="chat-question-chip"
        disabled={disabled}
        onClick={() => setShowMore((current) => !current)}
      >
        {showMore ? "질문 접기" : "다른 질문 보기"}
      </button>
    </div>
  );
}
