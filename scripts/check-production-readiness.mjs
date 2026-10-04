import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
const manifest = readJson("knowledge/manifest.json");
const review = readJson("knowledge/validation/samsung/two-person-independent-review.json");
const aiValidation = readJson("knowledge/validation/samsung/ai-terms-validation.json");
const retrieval = readJson("knowledge/retrieval-evaluation.json");
const products = readJson("src/data/products.json");

const failures = [];
for (const document of manifest.documents) {
  const absolutePath = resolve(root, document.relativePath);
  const actual = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
  if (actual !== document.sha256) failures.push(`${document.documentId}: PDF SHA-256 불일치`);
}
if (aiValidation.status !== "AI_VALIDATED_WITH_CORRECTIONS") failures.push("AI 약관 검증 상태 미완료");
if (retrieval.executionStatus !== "PASSED") failures.push("RAGFlow 검색 평가 미통과");
if (!review.humanApproval || review.humanApproval.status !== "APPROVED") failures.push("2인 독립 인간 검수 승인 없음");
if (!review.guardApproval || review.guardApproval.status !== "PASSED") failures.push("Gemini Guard 실행 평가 미통과");

const enabledProducts = products.filter((product) => product.calculationEnabled);
if (failures.length > 0 && enabledProducts.length > 0) {
  failures.push(`승인 전에 활성화된 상품: ${enabledProducts.map((product) => product.productCode).join(", ")}`);
}

const ready = failures.length === 0 && products.length > 0 && enabledProducts.length === products.length;
console.log(JSON.stringify({
  status: ready ? "READY" : "BLOCKED",
  verifiedPdfCount: manifest.documents.length,
  productCount: products.length,
  enabledProductCount: enabledProducts.length,
  failures,
}, null, 2));

if (process.argv.includes("--require-ready") && !ready) process.exitCode = 1;
