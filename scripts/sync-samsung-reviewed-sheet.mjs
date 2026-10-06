import fs from 'node:fs';
import path from 'node:path';
import { reviewedLimit, reviewedSource } from './samsung-reviewed-display.mjs';

// Downloaded review data is retained verbatim; only mapped descriptive fields are synchronized.
// Executable formulas are maintained and tested in build-samsung-executable-specs.mjs.
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = 'knowledge/validation/samsung/spreadsheet-review-2026-10-06.json';
const review = JSON.parse(fs.readFileSync(path.join(root, sourcePath), 'utf8'));
const rows = review.sheets['4.규칙목록(참고)'].slice(1);
const byId = new Map(rows.map((row) => [row[3], row]));
const draftDir = path.join(root, 'knowledge/drafts/samsung');
const files = fs.readdirSync(draftDir).filter((name) => name.endsWith('.rules.draft.json'));
const drafts = files.map((name) => ({ name, data: JSON.parse(fs.readFileSync(path.join(draftDir, name), 'utf8')) }));
const evidencePath = path.join(root, 'knowledge/rule-evidence-map.json');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const ruleIds = drafts.flatMap(({ data }) => data.rules.map((rule) => rule.id));
if (rows.length !== 49 || byId.size !== 49 || ruleIds.length !== 49 || ruleIds.some((id) => !byId.has(id))) {
  throw new Error('Review and draft Rule IDs do not match; no files updated.');
}
for (const row of rows) {
  if (!evidence.mappings.some((item) => item.ruleId === row[3]) || !Number.isInteger(row[11]) || row[11] < 1) {
    throw new Error(`Missing evidence or invalid PDF page: ${row[3]}`);
  }
}
const reference = (row) => ({ sourcePath, sheet: '4.규칙목록(참고)', row: row[0] + 1, reviewDate: review.reviewDate });
for (const { name, data } of drafts) {
  for (const rule of data.rules) {
    const row = byId.get(rule.id);
    rule.formula = row[7];
    rule.limit = reviewedLimit(row);
    rule.page = row[11];
    rule.spreadsheetReview = reference(row);
  }
  fs.writeFileSync(path.join(draftDir, name), `${JSON.stringify(data, null, 2)}\n`);
}
for (const item of evidence.mappings) {
  const row = byId.get(item.ruleId);
  if (!row) continue;
  Object.assign(item, reviewedSource(item.ruleId));
  item.quoteSummary = row[14];
  item.pdfPage = row[11];
  item.printedPage = row[12];
  item.spreadsheetReview = reference(row);
}
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Synchronized ${rows.length} reviewed rules; numeric evidence and assumptions retained in ${sourcePath}`);
