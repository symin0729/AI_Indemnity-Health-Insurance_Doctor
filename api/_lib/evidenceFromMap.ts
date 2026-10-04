import manifestJson from "../../knowledge/manifest.json" with { type: "json" };
import { lookupEvidence, type EvidenceMapEntry } from "./evidenceMap.js";
import type { RetrievedEvidence } from "./types.js";

interface ManifestDocument {
  documentId: string;
  title: string;
  publisher: string;
}

const documents = (manifestJson as { documents: ManifestDocument[] }).documents;

const toEvidence = (entry: EvidenceMapEntry): RetrievedEvidence | undefined => {
  const document = documents.find((item) => item.documentId === entry.documentId);
  if (!document || !entry.sourceUrl || !entry.verifiedAt) return undefined;
  return {
    content: [
      `담보: ${entry.coverage}`,
      `약관 조항: ${entry.article}${entry.paragraph ? ` / ${entry.paragraph}` : ""}`,
      `보험금 산식·핵심 내용: ${entry.quoteSummary}`,
      `약관 위치: PDF ${entry.pdfPage}쪽 (인쇄 ${entry.printedPage}쪽)`,
    ].join("\n"),
    source: {
      documentId: entry.evidenceId,
      title: `${document.title} - ${entry.coverage}`,
      organization: document.publisher,
      section: entry.article,
      verifiedAt: entry.verifiedAt,
      url: entry.sourceUrl,
    },
  };
};

export interface MappedEvidenceResult {
  evidence: RetrievedEvidence[];
  /** 담보가 하나로 확정되지 않았다(예: 5세대 일반형/전환형). 호출한 쪽이 되묻거나 둘 다 보여준다 */
  ambiguous: boolean;
}

/**
 * 검증된 근거 맵에서 질문에 맞는 근거를 찾는다.
 * allowedStatuses 에 없는 상태(기본 VERIFIED 만 허용)의 근거는 쓰지 않는다.
 */
export const evidenceFromMap = (
  question: string,
  productCode: string,
  allowedStatuses: string[],
): MappedEvidenceResult => {
  const { matches, ambiguous } = lookupEvidence(question, { productCode });
  const evidence = matches
    .filter((match) => allowedStatuses.includes(match.entry.status))
    .flatMap((match) => toEvidence(match.entry) ?? []);
  return { evidence, ambiguous: ambiguous && evidence.length > 0 };
};
