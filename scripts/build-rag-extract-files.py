"""검증된 구조화 추출본(knowledge/extraction/samsung/*.md)을 RAG 업로드용 작은 텍스트 파일로 바꾼다.

조항 하나 = 파일 하나 = 청크 하나. 질문에 쓰이는 말(담보 이름, 공제금액, 보상한도, 계산 방식)이
한 청크 안에 함께 들어가도록 한국어 문장으로 풀어 쓴다. 추출본에 없는 내용은 만들어 넣지 않는다.

사용법:
  python3 scripts/build-rag-extract-files.py [SAMSUNG_2107_1 ...]
결과: knowledge/rag-corpus/<productCode>/<evidenceId>.txt  (Git에 올리지 않아도 되는 생성물이다)
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRACTION = os.path.join(ROOT, "knowledge", "extraction", "samsung")
OUT = os.path.join(ROOT, "knowledge", "rag-corpus")

METHOD_TEXT = {
    "MAX_RATE_MINIMUM": "정액 공제금액과 비율 공제 중 큰 금액을 공제",
    "RATE": "비율로 보상",
    "LIMITED_FORMULA": "한도가 있는 산식으로 보상",
}
NOISE_LIMIT = ("", "-", "확인 필요")


def field(block, name):
    m = re.search(rf"^- {re.escape(name)}: (.*)$", block, flags=re.M)
    return m.group(1).strip().strip("`") if m else ""


def sub_field(block, name):
    m = re.search(rf"^\s+- {re.escape(name)}: (.*)$", block, flags=re.M)
    return m.group(1).strip() if m else ""


def build(product_code):
    text = open(os.path.join(EXTRACTION, f"{product_code}.md"), encoding="utf-8").read()
    product_name = field(text, "상품명")
    generation = field(text, "세대")
    out_dir = os.path.join(OUT, product_code)
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for block in re.split(r"\n## 조항 ", text)[1:]:
        evidence_id = field(block, "Evidence ID")
        coverage = field(block, "적용 담보")
        clause = field(block, "약관 조항").replace(" / ", " ")
        method = sub_field(block, "계산 방식")
        formula = sub_field(block, "산식") or field(block, "원문 요약")
        limit = sub_field(block, "지급한도·횟수")
        lines = [
            f"근거 ID: {evidence_id}",
            f"상품: {product_name} ({generation}세대)",
            f"담보: {coverage}",
            f"분류: {field(block, '분류')}",
            f"약관 조항: {clause}",
            f"약관 위치: PDF {field(block, 'pdfPage')}쪽 (인쇄 {field(block, 'printedPage')}쪽)",
        ]
        if formula not in NOISE_LIMIT:
            lines.append(f"보험금 계산 방식(산식): {formula}")
        if method in METHOD_TEXT:
            lines.append(f"공제·보상 방식: {METHOD_TEXT[method]}")
        if limit not in NOISE_LIMIT:
            lines.append(f"보상한도(연간·횟수 한도): {limit}")
        path = os.path.join(out_dir, f"{evidence_id}.txt")
        open(path, "w", encoding="utf-8").write("\n".join(lines) + "\n")
        written.append((evidence_id, len("\n".join(lines))))
    return written


if __name__ == "__main__":
    products = sys.argv[1:] or ["SAMSUNG_2107_1"]
    for product in products:
        files = build(product)
        print(product, "파일", len(files), "개 | 글자 수 최대", max(n for _, n in files))
