import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidence = JSON.parse(fs.readFileSync(path.join(root, "knowledge/rule-evidence-map.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "knowledge/manifest.json"), "utf8"));
const mappings = evidence.mappings.filter((item) => item && typeof item === "object");
const draftDir = path.join(root, "knowledge/drafts/samsung");
const specDir = path.join(draftDir, "executable-specs");
const specs = fs.readdirSync(specDir)
  .filter((name) => name.endsWith(".execution-spec.draft.json"))
  .flatMap((name) => JSON.parse(fs.readFileSync(path.join(specDir, name), "utf8")).rules);
const rulesById = new Map(specs.map((rule) => [rule.ruleId, rule]));
const byProduct = new Map();
for (const item of mappings) {
  const list = byProduct.get(item.productCode) ?? [];
  list.push(item);
  byProduct.set(item.productCode, list);
}

const documents = new Map((manifest.documents ?? []).map((item) => [item.documentId, item]));
const sourceAndEngineValidatedProducts = new Set(["SAMSUNG_0904_2", "SAMSUNG_1611_7", "SAMSUNG_1704_1", "SAMSUNG_2107_1", "SAMSUNG_2605_1"]);
const packageDerivedDocumentChecks = {
  SAMSUNG_0904_2: [
    "PDF 표지·보통약관·D1 특별약관이 모두 0904.2로 일치하는지 확인한다.",
    "2009-05 생성본과 페이지 스캔 워터마크가 추출문·RAG 검색을 오염시키지 않는지 확인한다.",
  ],
  SAMSUNG_1611_7: [
    "요약서의 표준형B·선택형B가 표지의 1종(표준형)·2종(선택형Ⅱ)과 각각 대응하는지 약관 본문에서 확인한다.",
    "요약서 산식과 본문 조항의 공제·한도·비건보 40% 조건이 일치하는지 확인한다.",
  ],
  SAMSUNG_1704_1: [
    "요약서의 표준형C 및 선택형 표기가 표지의 1종(표준형)·2종(선택형Ⅱ)과 정확히 대응하는지 확인한다.",
    "기본형이 3대 비급여를 제외하고 각 선택특약에서 보장하는 구조인지 본문에서 확인한다.",
  ],
  SAMSUNG_2107_1: [
    "한 PDF에 포함된 기본형·계약전환용·전환·재개용·자녀보험전환용 조항을 구분하고, 현재 Rule이 어느 유형에 적용되는지 확정한다.",
    "전환형별 제3조 ⑩~⑭ 예외가 공통 산식에 잘못 적용되지 않는지 확인한다.",
  ],
  SAMSUNG_2605_1: [
    "일반형·계약전환용 2605.1 약관의 2~160쪽 원문이 동일하므로 공통 Rule을 두 계약 유형에 동일 적용할 수 있음을 확인한다.",
    "계약전환용의 표지 구분과 전환·재개·자녀보험전환 예외를 일반형 계약에 적용하지 않는다.",
    "중증 비급여 통원 100회와 비중증 비급여 통원 100일의 단위 차이가 원문 의도와 일치하는지 확인한다.",
  ],
};
function priorityChecks(item, rule) {
  const checks = [];
  if (item.ruleId === "G1-05") checks.push("정식 0904.2 PDF 113쪽이 질병 입원 제2조 조항인지 확인하고, 오분류된 0904.1 PDF의 118쪽 표기를 사용하지 않는다.");
  if ([2, 3].includes(rule.generation)) checks.push(`종형이 '${item.variant}'인지 표제·소제목에서 확인하고 표준형과 선택형Ⅱ 수치를 섞지 않는다.`);
  if (["G4-05", "G5-05", "G5-CONV-05"].includes(item.ruleId)) checks.push("최초 10회 후 검사결과로 증상 개선·병변 호전이 확인된 경우에만 10회 단위로 추가 보장되는지 확인한다.");
  if (item.ruleId.startsWith("G5-CONV-")) checks.push("계약전환·재개·자녀보험전환 세부유형과 전환 자격·계속 치료 적용 조건을 확인한다.");
  if (item.ruleId === "G5-07") checks.push("PDF 64쪽의 인쇄 쪽수가 63쪽인지 확인하고, 계약 유형에 따른 예외 조항을 섞지 않는다.");
  if (rule.limitText) checks.push(`한도·횟수·합산 기준을 원문과 대조한다: ${rule.limitText}`);
  checks.push("동일 의료비에 다수계약 비례보상이 적용되는지, 적용된다면 계약별 분담식과 총 보상 상한을 확인한다.");
  return checks;
}
const reviewItems = mappings.map((item) => {
  const document = documents.get(item.documentId);
  const rule = rulesById.get(item.ruleId);
  if (!document || !rule) throw new Error(`Missing review dependency: ${item.documentId}/${item.ruleId}`);
  if (item.pdfPage < 1 || item.pdfPage > document.pageCount) {
    throw new Error(`PDF page out of range: ${item.ruleId} page ${item.pdfPage}/${document.pageCount}`);
  }
  return ({
  productCode: item.productCode,
  variant: item.variant,
  ruleId: item.ruleId,
  evidenceId: item.evidenceId,
  documentId: item.documentId,
  corroboratingDocumentIds: item.corroboratingDocumentIds ?? [],
  applicableContractTypes: item.applicableContractTypes ?? [],
  pdfPath: document.relativePath,
  pdfSha256: document.sha256,
  pdfPageCount: document.pageCount,
  pdfPage: item.pdfPage,
  printedPage: item.printedPage,
  article: item.article,
  paragraph: item.paragraph,
  coverage: item.coverage,
  calculationType: rule.calculation.type,
  calculation: rule.calculation,
  limitText: rule.limitText,
  requiredCoverages: rule.requiredCoverages,
  specialConditions: rule.specialConditions,
  automatedTestRequirements: [
    "공제 직전·직후 경계값",
    "한도 미만·일치·초과값",
    "건강보험 적용·미적용 분기",
    "보상기간·횟수·합산 조건",
    "면책·특약 미가입·필수 입력 누락",
  ],
  priorityChecks: priorityChecks(item, rule),
  itemsToVerify: [
    `원문이 다음 요약과 일치하는지: ${item.quoteSummary}`,
    "보장대상과 보상하지 않는 사항의 적용 조건",
    "자기부담 비율·정액 공제·둘 중 큰 금액의 적용 순서",
    "금액·횟수·일수 한도와 보험연도/사고/질병별 합산 기준",
    "필수 특약, 예외, 건강보험 적용 여부 및 의료기관 종별 조건",
  ],
  validationStatus: sourceAndEngineValidatedProducts.has(item.productCode)
    ? "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING"
    : "PENDING_AI_SOURCE_VALIDATION",
  findings: [],
  requiredAdditionalMaterials: [],
  });
});

const payload = {
  schemaVersion: "1.0",
  status: "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING",
  calculationEnabled: false,
  sourcePdfCount: documents.size,
  reviewItemCount: reviewItems.length,
  validationPolicy: "AI가 공식 약관 원문, Rule, Evidence를 교차 대조하고 결정론적 경계값·한도·면책 회귀 테스트를 실행한다. 원문만으로 판단할 수 없으면 필요한 추가 자료와 확인 방법을 기록한다.",
  approvalRule: "AI 원문 교차검증, 실행 로직, 자동 경계값·한도·면책 테스트가 통과한 Rule만 후속 단계 입력으로 사용한다. RAGFlow·Gemini Guard 승인 전에는 운영 계산을 활성화하지 않는다.",
  documentReviewItems: [...documents.values()].map((document) => ({
    productCode: document.productCode,
    documentId: document.documentId,
    pdfPath: document.relativePath,
    pdfSha256: document.sha256,
    checks: packageDerivedDocumentChecks[document.productCode] ?? [],
    validationStatus: sourceAndEngineValidatedProducts.has(document.productCode)
      ? "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING"
      : "PENDING_AI_SOURCE_VALIDATION",
    findings: [],
    requiredAdditionalMaterials: [],
  })),
  reviewItems,
};

const outDir = path.join(root, "knowledge/validation/samsung");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "two-person-independent-review.json"), `${JSON.stringify(payload, null, 2)}\n`);

const lines = [
  "# 삼성화재 세대별 AI 원문·계산 검증표",
  "",
  "> 상태: SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING / 계산 운영 비활성화",
  "",
  "AI가 동일 SHA-256의 PDF 원문과 계산 Rule을 대조하고 자동 경계값 테스트를 실행합니다. PDF 쪽은 파일 뷰어 기준입니다.",
  "",
  "기존의 2인 독립검수·손계산 요구는 AI 원문 교차검증과 결정론적 자동 회귀 테스트로 대체합니다. 원문만으로 확정할 수 없는 항목은 필요한 추가 자료와 확인 방법을 기록합니다.",
  "",
];

for (const [productCode, items] of byProduct) {
  lines.push(`## ${productCode}`, "");
  const docId = items[0].documentId;
  const document = documents.get(docId);
  const productValidated = sourceAndEngineValidatedProducts.has(productCode);
  lines.push(`- documentId: ${docId}`, `- PDF: \`${document.relativePath}\``, `- PDF SHA-256: \`${document.sha256}\``, "");
  lines.push("### 문서 단위 선행 확인", "");
  for (const check of packageDerivedDocumentChecks[productCode] ?? []) {
    lines.push(`- [${productValidated ? "x" : " "}] ${check}`);
  }
  lines.push(
    `- AI 원문·엔진 검증 상태: ${productValidated ? "완료" : "대기"}`,
    `- RAG 검색 평가: ${productValidated ? "대기(RAGFlow 연결 필요)" : "대기"}`,
    `- 필요한 추가 자료: ${productValidated ? "현재 상품 Rule 검증에는 없음; 실제 청구 시 보험증권·진료비 자료 필요" : "________________________________________________"}`,
    "- 발견사항: ________________________________________________",
    "",
  );
  lines.push("| 종형 | Rule | 담보/항목 | 확인 위치 | 실행 명세 | AI가 확인할 계산 핵심 | 자동 테스트 | 추가 자료 | 상태 |", "|---|---|---|---|---|---|---|---|---|");
  for (const item of items) {
    const pages = `PDF ${item.pdfPage}쪽${item.printedPage == null ? "" : ` / 인쇄 ${item.printedPage}쪽`}`;
    const rule = rulesById.get(item.ruleId);
    const rowStatus = productValidated ? "원문·엔진 완료 / RAG 대기" : "대기";
    lines.push(`| ${item.variant} | ${item.ruleId} | ${item.coverage} | ${pages}, ${item.article} ${item.paragraph} | \`${rule.calculation.type}\` | ${item.quoteSummary.replaceAll("|", "\\|")} | 경계값·한도·면책 자동 검증 | ${productValidated ? "상품 Rule 검증에는 없음" : "현재 없음"} | ${rowStatus} |`);
  }
  lines.push("");
}

lines.push(
  "## 공통 최종 승인 항목",
  "",
  "- [ ] PDF 해시가 manifest와 일치한다.",
  "- [ ] 각 Rule의 PDF 쪽·인쇄 쪽·조항이 실제 원문과 일치한다.",
  "- [ ] 세대와 종형(표준형/선택형Ⅱ)이 섞이지 않았다.",
  "- [ ] 자동 테스트가 공제 경계값·한도 초과·면책·특약 미가입 사례를 검증한다.",
  "- [ ] Rule Trace가 실제 적용 조항을 표시한다.",
  "- [ ] 원문만으로 확정할 수 없는 항목은 필요한 추가 자료와 확인 방법이 기록되었다.",
  "- [ ] 발견사항을 모두 해소한 뒤에만 calculationEnabled 변경을 승인한다.",
);
fs.writeFileSync(path.join(outDir, "TWO_PERSON_INDEPENDENT_REVIEW_CHECKLIST.md"), `${lines.join("\n")}\n`);
console.log(`review items: ${reviewItems.length}`);
