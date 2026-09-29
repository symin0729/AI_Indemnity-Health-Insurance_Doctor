import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(import.meta.dirname, "..");
const products = JSON.parse(await fs.readFile(path.join(root, "src/data/products.json"), "utf8"));
const evidenceMap = JSON.parse(await fs.readFile(path.join(root, "knowledge/rule-evidence-map.json"), "utf8"));
const manifest = JSON.parse(await fs.readFile(path.join(root, "knowledge/manifest.json"), "utf8"));
const outputDir = path.join(root, "knowledge/drafts/samsung/rule-masters");
const previewDir = "/tmp/samsung-rule-master-previews";
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const headerFormat = {
  fill: "#1F4E78",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
const bodyFont = { name: "Arial", size: 10, color: "#1F2937" };
const warningFormat = { fill: "#FFF2CC", font: { name: "Arial", size: 10, color: "#7F6000", bold: true } };
const blockedFormat = { fill: "#FCE8E6", font: { name: "Arial", size: 10, color: "#B91C1C", bold: true } };

for (const product of products) {
  const code = product.productCode;
  const splitVariants = [2, 3].includes(product.generation) ? product.variants : null;
  const ruleFiles = splitVariants
    ? splitVariants.map((variant) => `${code}.${variant === "selected2" ? "selected2" : "standard"}.rules.draft.json`)
    : [`${code}.rules.draft.json`];
  const handFiles = splitVariants
    ? splitVariants.map((variant) => `${code}.${variant === "selected2" ? "selected2" : "standard"}.hand-calculation.draft.json`)
    : [`${code}.hand-calculation.draft.json`];
  const rulesDocs = await Promise.all(ruleFiles.map(async (file) => JSON.parse(await fs.readFile(path.join(root, "knowledge/drafts/samsung", file), "utf8"))));
  const handDocs = await Promise.all(handFiles.map(async (file) => JSON.parse(await fs.readFile(path.join(root, "knowledge/drafts/samsung", file), "utf8"))));
  const rulesDoc = { rules: rulesDocs.flatMap((doc) => doc.rules) };
  const handDoc = { cases: handDocs.flatMap((doc) => doc.cases) };
  const evidence = evidenceMap.mappings.filter((item) => item.productCode === code);
  const source = manifest.documents.find((item) => item.productCode === code);
  const workbook = Workbook.create();

  const rules = workbook.worksheets.add("RULE_MASTER");
  rules.showGridlines = false;
  rules.getRange("A1:J1").values = [["Rule ID", "종형", "담보/항목", "PDF 페이지", "인쇄 페이지", "계산식/판정식", "한도/제한", "상태", "Evidence ID", "인간 검수"]];
  rules.getRange("A1:J1").format = headerFormat;
  const ruleRows = rulesDoc.rules.map((rule) => {
    const ev = evidence.find((item) => item.ruleId === rule.id);
    return [rule.id, rule.variant, rule.coverage, rule.page, ev?.printedPage ?? "미확정", rule.formula, rule.limit, rule.status, rule.evidenceIds?.[0] ?? "", "필요"];
  });
  if (ruleRows.length) rules.getRange(`A2:J${ruleRows.length + 1}`).values = ruleRows;
  rules.getRange(`A2:J${Math.max(2, ruleRows.length + 1)}`).format.font = bodyFont;
  rules.getRange(`F2:G${Math.max(2, ruleRows.length + 1)}`).format.wrapText = true;
  rules.getRange(`H2:J${Math.max(2, ruleRows.length + 1)}`).format = warningFormat;
  rules.getRange("A1:J1").format.rowHeight = 30;
  rules.getRange("A:A").format.columnWidth = 18;
  rules.getRange("B:B").format.columnWidth = 12;
  rules.getRange("C:C").format.columnWidth = 30;
  rules.getRange("D:E").format.columnWidth = 12;
  rules.getRange("F:F").format.columnWidth = 58;
  rules.getRange("G:G").format.columnWidth = 44;
  rules.getRange("H:H").format.columnWidth = 18;
  rules.getRange("I:I").format.columnWidth = 34;
  rules.getRange("J:J").format.columnWidth = 14;
  rules.freezePanes.freezeRows(1);

  const evSheet = workbook.worksheets.add("EVIDENCE");
  evSheet.showGridlines = false;
  evSheet.getRange("A1:M1").values = [["Evidence ID", "Rule ID", "종형", "담보", "조/섹션", "항/표", "PDF 페이지", "인쇄 페이지", "원문 요약", "상태", "검수자 1", "검수자 2", "검수일"]];
  evSheet.getRange("A1:M1").format = headerFormat;
  const evRows = evidence.map((item) => [item.evidenceId, item.ruleId, item.variant, item.coverage, `${item.article ?? ""} / ${item.sourceSection ?? ""}`, item.paragraph ?? "", item.pdfPage, item.printedPage ?? "미확정", item.quoteSummary, item.status, "", "", ""]);
  if (evRows.length) evSheet.getRange(`A2:M${evRows.length + 1}`).values = evRows;
  evSheet.getRange(`A2:M${Math.max(2, evRows.length + 1)}`).format.font = bodyFont;
  evSheet.getRange(`E2:I${Math.max(2, evRows.length + 1)}`).format.wrapText = true;
  evSheet.getRange(`J2:M${Math.max(2, evRows.length + 1)}`).format = warningFormat;
  [34, 18, 12, 28, 38, 28, 12, 12, 60, 18, 14, 14, 14].forEach((width, i) => evSheet.getRange(`${String.fromCharCode(65 + i)}:${String.fromCharCode(65 + i)}`).format.columnWidth = width);
  evSheet.freezePanes.freezeRows(1);

  const hand = workbook.worksheets.add("HAND_CALC");
  hand.showGridlines = false;
  hand.getRange("A1:G1").values = [["Case ID", "Rule ID", "입력", "예상 공제액", "예상 보험금", "상태", "독립 검산 결과"]];
  hand.getRange("A1:G1").format = headerFormat;
  const handRows = handDoc.cases.map((item) => [item.caseId, item.ruleId, JSON.stringify(item.inputs), item.expectedDeductible ?? "해당 없음", item.expectedClaim, item.status, "미검산"]);
  if (handRows.length) hand.getRange(`A2:G${handRows.length + 1}`).values = handRows;
  hand.getRange(`A2:G${Math.max(2, handRows.length + 1)}`).format.font = bodyFont;
  hand.getRange(`F2:G${Math.max(2, handRows.length + 1)}`).format = warningFormat;
  [28, 18, 58, 18, 18, 24, 18].forEach((width, i) => hand.getRange(`${String.fromCharCode(65 + i)}:${String.fromCharCode(65 + i)}`).format.columnWidth = width);
  hand.freezePanes.freezeRows(1);

  const approval = workbook.worksheets.add("APPROVAL");
  approval.showGridlines = false;
  approval.getRange("A1:C1").values = [["항목", "상태", "비고"]];
  approval.getRange("A1:C1").format = headerFormat;
  approval.getRange("A2:C10").values = [
    ["공식 PDF/SHA-256", "PASS", "manifest와 실제 PDF 해시 일치"],
    ["Rule/Evidence 참조", "PASS", "Rule ID와 Evidence ID 참조 무결성 통과"],
    ["조·항·페이지", "REVIEW_REQUIRED", "실제 검수자 2명의 원문 대조 필요"],
    ["손계산", "READY_FOR_REVIEW", `${handRows.length}건의 검산 후보`],
    ["자동테스트", "DRAFT_TESTED", "초안 산술 테스트; 한도·면책 추가 필요"],
    ["2인 독립 교차검수", "BLOCKED", "실제 검수자 이름·날짜 필요"],
    ["RAGFlow", "NOT_EXECUTED", "세대별 20문항 실행 필요"],
    ["Gemini Guard", "NOT_EXECUTED", "숫자·Rule·Evidence 변조 차단 시험 필요"],
    ["운영 활성화", "BLOCKED", "calculationEnabled=false"]
  ];
  approval.getRange("A2:C10").format.font = bodyFont;
  approval.getRange("B4:C10").format = blockedFormat;
  approval.getRange("A:A").format.columnWidth = 28;
  approval.getRange("B:B").format.columnWidth = 22;
  approval.getRange("C:C").format.columnWidth = 62;

  const sourceSheet = workbook.worksheets.add("SOURCE");
  sourceSheet.showGridlines = false;
  sourceSheet.getRange("A1:B1").values = [["항목", "값"]];
  sourceSheet.getRange("A1:B1").format = headerFormat;
  sourceSheet.getRange("A2:B11").values = [
    ["상품 코드", code], ["상품명", product.productName], ["세대", product.generation], ["문서 ID", source.documentId], ["공식 URL", source.sourceUrl], ["PDF 파일", source.relativePath], ["PDF 페이지", source.pageCount], ["SHA-256", source.sha256], ["검수 상태", source.status], ["계산 활성화", false]
  ];
  sourceSheet.getRange("A2:B11").format.font = bodyFont;
  sourceSheet.getRange("A:A").format.columnWidth = 24;
  sourceSheet.getRange("B:B").format.columnWidth = 100;
  sourceSheet.getRange("B10:B11").format = warningFormat;

  workbook.recalculate();
  const previewRanges = {
    RULE_MASTER: `A1:J${ruleRows.length + 1}`,
    EVIDENCE: `A1:M${evRows.length + 1}`,
    HAND_CALC: `A1:G${handRows.length + 1}`,
    APPROVAL: "A1:C10",
    SOURCE: "A1:B11",
  };
  for (const [sheetName, range] of Object.entries(previewRanges)) {
    const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
    await fs.writeFile(
      path.join(previewDir, `${code}-${sheetName}.png`),
      new Uint8Array(await preview.arrayBuffer()),
    );
  }
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path.join(outputDir, `${code}_RULE_MASTER_REVIEW.xlsx`));
}

console.log(JSON.stringify({ workbooks: products.length, outputDir, previewDir }, null, 2));
