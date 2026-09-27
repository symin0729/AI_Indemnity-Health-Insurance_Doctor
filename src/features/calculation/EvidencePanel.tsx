interface EvidencePanelProps {
  sources: Array<{ documentId: string; title: string; url: string; verifiedAt: string }>;
}

export function EvidencePanel({ sources }: EvidencePanelProps) {
  if (sources.length === 0) return <p>검수된 약관 근거가 없습니다.</p>;
  return <ul>{sources.map((source) => <li key={source.documentId}><a href={source.url}>{source.title}</a> · 검수 {source.verifiedAt}</li>)}</ul>;
}
