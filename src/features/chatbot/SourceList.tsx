import type { ChatResponse } from "./chatbot.schema";

interface SourceListProps {
  sources: ChatResponse["sources"];
}

export default function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) return null;

  return (
    <section className="chat-sources" aria-labelledby="chat-sources-title">
      <h3 id="chat-sources-title">공식 출처</h3>
      <div className="chat-source-list">
        {sources.map((source) => (
          <a
            key={`${source.documentId}-${source.url}`}
            className="chat-source"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="chat-source__icon" aria-hidden="true">↗</span>
            <span>
              <strong>{source.title}</strong>
              <small>
                {source.organization}
                {source.section ? ` · ${source.section}` : ""}
                {` · 확인 ${source.verifiedAt}`}
              </small>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
