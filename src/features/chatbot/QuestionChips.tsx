const QUESTIONS = [
  "1세대와 5세대는 무엇이 다른가요?",
  "급여와 비급여는 무엇인가요?",
  "자기부담금과 공제액은 어떻게 다른가요?",
  "손익분기점은 어떤 의미인가요?",
  "보험사에 무엇을 확인해야 하나요?",
];

interface QuestionChipsProps {
  disabled?: boolean;
  onSelect: (question: string) => void;
}

export default function QuestionChips({ disabled, onSelect }: QuestionChipsProps) {
  return (
    <div className="chat-question-chips">
      {QUESTIONS.map((question) => (
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
    </div>
  );
}
