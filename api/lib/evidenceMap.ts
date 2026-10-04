import evidenceMapJson from "../../knowledge/rule-evidence-map.json";
import queryRules from "./retrieval-query-rules.json";

export interface EvidenceMapEntry {
  evidenceId: string;
  ruleId: string;
  productCode: string;
  documentId: string;
  coverage: string;
  variant: string;
  article: string;
  paragraph: string;
  sourceSection: string;
  pdfPage: number;
  printedPage: number;
  quoteSummary: string;
  sourceUrl: string;
  verifiedAt: string;
  status: string;
}

export interface EvidenceMatch {
  entry: EvidenceMapEntry;
  score: number;
}

export interface EvidenceLookupResult {
  matches: EvidenceMatch[];
  /** 같은 점수의 근거가 둘 이상이라 질문만으로 하나로 정할 수 없음 */
  ambiguous: boolean;
}

type Facet = "setting" | "cause" | "payer" | "plan" | "item" | "tier";

const entries = (evidenceMapJson as { mappings: EvidenceMapEntry[] }).mappings;

/** 질문과 담보 이름에서 같은 방식으로 속성(facet)을 뽑는다. 속성이 없으면 비교하지 않는다. */
const FACET_RULES: { facet: Facet; value: string; pattern: RegExp }[] = [
  { facet: "setting", value: "입원", pattern: /입원/ },
  { facet: "setting", value: "외래", pattern: /통원|외래/ },
  { facet: "setting", value: "처방조제비", pattern: /처방|조제|약국|약값/ },
  { facet: "cause", value: "상해", pattern: /상해|다쳐|사고|부상/ },
  { facet: "cause", value: "질병", pattern: /질병|아파서|병으로/ },
  { facet: "plan", value: "표준형", pattern: /표준형/ },
  { facet: "plan", value: "선택형Ⅱ", pattern: /선택형\s*(?:Ⅱ|II|ii|2)/ },
  { facet: "item", value: "도수", pattern: /도수|체외\s*충격파|증식|프롤로/ },
  { facet: "item", value: "주사료", pattern: /주사/ },
  { facet: "item", value: "mri", pattern: /mri|mra|엠알아이|자기\s*공명/i },
  { facet: "item", value: "보험료차등", pattern: /보험료.{0,6}(차등|할인|할증)|차등/ },
  { facet: "tier", value: "비중증", pattern: /비\s*중증/ },
  { facet: "tier", value: "중증", pattern: /(?<!비)\s*중증/ },
];

const payerOf = (text: string): string | undefined => {
  if (/3\s*대\s*비\s*급여/.test(text)) return "3대비급여";
  if (/비\s*급여/.test(text)) return "비급여";
  if (/급여/.test(text)) return "급여";
  return undefined;
};

export const extractFacets = (text: string): Partial<Record<Facet, string>> => {
  const facets: Partial<Record<Facet, string>> = {};
  for (const rule of FACET_RULES) {
    if (facets[rule.facet] === undefined && rule.pattern.test(text)) facets[rule.facet] = rule.value;
  }
  const payer = payerOf(text);
  if (payer) facets.payer = payer;
  // "3대 비급여" 안의 도수·주사·MRI 는 item 이고, "비급여 MRI/MRA"(5세대)는 tier 와 함께 쓰인다.
  return facets;
};

const entryFacets = (entry: EvidenceMapEntry): Partial<Record<Facet, string>> => {
  const facets = extractFacets(entry.coverage);
  if (facets.plan === undefined) {
    if (entry.variant === "standard") facets.plan = "표준형";
    else if (entry.variant === "selected2") facets.plan = "선택형Ⅱ";
  }
  return facets;
};

const MATCH_SCORE = 2;
const CONFLICT_PENALTY = 3;
const SPECIFIC_ASKED_GENERIC_ENTRY_PENALTY = 2;
const MIN_SCORE = 2;

/** "3대 비급여"는 "비급여"의 한 종류다. 질문이 그냥 "비급여"라고 해도 3대 비급여와 충돌하지 않는다. */
const payerScore = (asked: string, has: string): number => {
  if (asked === has) return MATCH_SCORE;
  if (asked === "비급여" && has === "3대비급여") return 1;
  return -CONFLICT_PENALTY;
};

const scoreEntry = (question: Partial<Record<Facet, string>>, entry: EvidenceMapEntry): number => {
  const target = entryFacets(entry);
  let score = 0;
  for (const facet of Object.keys(question) as Facet[]) {
    const asked = question[facet];
    const has = target[facet];
    if (asked === undefined) continue;
    if (has === undefined) {
      // 질문은 구체적인 항목(주사·MRI 등)을 말하는데 근거가 항목 구분 없는 일반 항목이면 구체적인 쪽을 우선한다.
      if (facet === "item") score -= SPECIFIC_ASKED_GENERIC_ENTRY_PENALTY;
      continue;
    }
    score += facet === "payer" ? payerScore(asked, has) : asked === has ? MATCH_SCORE : -CONFLICT_PENALTY;
  }
  return score;
};

export interface EvidenceLookupOptions {
  productCode: string;
  /** standard · selected2 · general · conversion 처럼 상품 안의 유형을 이미 알고 있는 경우 */
  variant?: string;
  limit?: number;
  /** 기본값 true: 보상·공제·한도·계산 같은 말이 없는 질문(정의·절차 등)에는 근거 맵이 개입하지 않는다 */
  requireBenefitIntent?: boolean;
}

/** 담보 이름으로 검증된 근거 맵에서 근거를 찾는다. 검색(RAG)에 의존하지 않는다. */
export const lookupEvidence = (
  question: string,
  options: EvidenceLookupOptions,
): EvidenceLookupResult => {
  if ((options.requireBenefitIntent ?? true) && !new RegExp(queryRules.benefitIntentPattern).test(question)) {
    return { matches: [], ambiguous: false };
  }
  const asked = extractFacets(question);
  const candidates = entries.filter(
    (entry) =>
      entry.productCode === options.productCode &&
      (options.variant === undefined || entry.variant === options.variant),
  );
  const scored = candidates
    .map((entry) => ({ entry, score: scoreEntry(asked, entry) }))
    .filter((match) => match.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return { matches: [], ambiguous: false };
  const top = scored[0].score;
  const tied = scored.filter((match) => match.score === top);
  const limit = options.limit ?? 6;
  return { matches: tied.slice(0, limit), ambiguous: tied.length > 1 };
};
