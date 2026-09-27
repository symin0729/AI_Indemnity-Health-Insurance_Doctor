interface AiExplanationCardProps {
  answer: string;
  confirmations: string[];
}

export function AiExplanationCard({ answer, confirmations }: AiExplanationCardProps) {
  return <section aria-label="AI 계산 설명"><h3>AI 계산 설명</h3><p>{answer}</p>{confirmations.map((item) => <p key={item}>{item}</p>)}</section>;
}
