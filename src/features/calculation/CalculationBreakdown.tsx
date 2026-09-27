interface CalculationBreakdownProps {
  rows: Array<{ label: string; value: number | null }>;
}

export function CalculationBreakdown({ rows }: CalculationBreakdownProps) {
  return (
    <dl>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value === null ? "확인 필요" : row.value.toLocaleString("ko-KR")}</dd>
        </div>
      ))}
    </dl>
  );
}
