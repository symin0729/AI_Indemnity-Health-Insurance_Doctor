"""RAGFlow 검색 평가 실행기 (15번 문서 14장).

knowledge/retrieval-evaluation.json 의 질문을 RAGFlow에 보내고, 상위 3개 청크가
rule-evidence-map.json 에 적힌 근거 PDF 페이지(pdfPage)를 포함하는지 판정한다.

사용법 (API Key는 환경변수 RF_KEY 로만 받는다):
  python3 scripts/evaluate-ragflow-retrieval.py --generation 4 --dataset-id <ID>
  python3 scripts/evaluate-ragflow-retrieval.py --generation 4 --dataset-id <ID> --update-status

결과: knowledge/validation/ragflow/retrieval-results.json
- API Key, 약관 원문 전체, 사용자 질문 로그는 저장하지 않는다.
- --update-status 를 주면 retrieval-evaluation.json 의 executionStatus 만 PASSED/FAILED 로 바꾼다.
  질문·필터·기대값은 절대 바꾸지 않는다.
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE = os.path.join(ROOT, "knowledge")
EVAL_PATH = os.path.join(KNOWLEDGE, "retrieval-evaluation.json")
MAP_PATH = os.path.join(KNOWLEDGE, "rule-evidence-map.json")
OUT_DIR = os.path.join(KNOWLEDGE, "validation", "ragflow")
OUT_PATH = os.path.join(OUT_DIR, "retrieval-results.json")
REQUIRED_META = ["documentId", "productCode", "generation", "sourceUrl", "publisher", "verifiedAt", "title"]
PASS_RATE = 0.95

parser = argparse.ArgumentParser()
parser.add_argument("--generation", type=int, required=True)
parser.add_argument("--dataset-id", required=True)
parser.add_argument("--base-url", default="http://localhost:9380")
parser.add_argument("--embedding-model", default="embeddinggemma:latest")
parser.add_argument("--ragflow-version", default="v0.27.2")
parser.add_argument("--update-status", action="store_true")
parser.add_argument("--vector-weight", type=float, default=0.3, help="벡터 가중치 (키워드는 1 - 값)")
parser.add_argument("--similarity-threshold", type=float, default=0.2)
parser.add_argument("--query-prefix", default="", help="질문 앞에 붙일 문구 (시험용)")
parser.add_argument("--page-size", type=int, default=3)
parser.add_argument("--no-save", action="store_true", help="결과 파일을 쓰지 않는다 (설정 비교 시험용)")
parser.add_argument("--cases-file", default=EVAL_PATH, help="평가 문항 파일 (기본: 공식 평가 원본)")
parser.add_argument("--out-path", default=OUT_PATH, help="결과 저장 위치")
parser.add_argument("--page-index", default="", help="build-pdf-page-index.py 가 만든 JSON. 청크에 위치 정보가 없을 때 글자 대조로 페이지를 찾는다")
parser.add_argument("--multi-query", action="store_true", help="원문 질문과 보강한 질문을 각각 검색해 RRF(순위 합산)로 합친다. --use-rules 와 함께 쓴다")
parser.add_argument("--use-rules", action="store_true", help="서비스와 같은 검색어 보강 규칙(api/_lib/retrieval-query-rules.json)을 적용한다")
parser.add_argument("--query-suffix", default="", help="질문 뒤에 붙일 도메인 용어 (검색어 보강)")
parser.add_argument("--show-failed", type=int, default=0, metavar="N", help="실패 문항의 상위 청크 앞부분 N자를 출력한다 (진단용, 저장하지 않음)")
parser.add_argument("--quiet", action="store_true", help="문항별 줄은 출력하지 않고 요약만 출력")
args = parser.parse_args()

if args.update_status and os.path.abspath(args.cases_file) != os.path.abspath(EVAL_PATH):
    sys.exit("--update-status 는 공식 평가 원본에서만 쓸 수 있습니다.")
key = os.environ.get("RF_KEY", "").strip()
if not key:
    sys.exit("RF_KEY 가 비어 있습니다. 키를 먼저 입력하세요.")


RULES_PATH = os.path.join(ROOT, "api", "lib", "retrieval-query-rules.json")
RULES = json.load(open(RULES_PATH, encoding="utf-8")) if args.use_rules else None


def build_query(question):
    """api/_lib/retrievalQuery.ts 의 buildRetrievalQuery 와 같은 동작이어야 한다."""
    if RULES is None:
        return question
    parts = [question]
    for entry in RULES["glossary"]:
        if re.search(entry["pattern"], question, flags=re.IGNORECASE) and entry["append"] not in question:
            parts.append(entry["append"])
    if RULES["benefitSuffix"] and re.search(RULES["benefitIntentPattern"], question):
        parts.append(RULES["benefitSuffix"])
    return " ".join(parts)


def retrieve(question, expand=True, size=None):
    body = json.dumps(
        {
            "question": args.query_prefix + (build_query(question) if expand else question) + (" " + args.query_suffix if (args.query_suffix and expand) else ""),
            "dataset_ids": [args.dataset_id],
            "page": 1,
            "page_size": size or args.page_size,
            "similarity_threshold": args.similarity_threshold,
            "vector_similarity_weight": args.vector_weight,
            "reference_metadata": {"include": True},
        }
    ).encode()
    req = urllib.request.Request(
        args.base_url + "/api/v1/retrieval",
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            data = json.load(res)
    except urllib.error.HTTPError as err:
        sys.exit(f"HTTP {err.code}: {err.read().decode()[:200]}")
    if data.get("code") != 0:
        sys.exit(f"RAGFlow 오류: {data.get('message')}")
    return (data.get("data") or {}).get("chunks", [])


PAGE_TEXT = {}
if args.page_index:
    PAGE_TEXT = json.load(open(args.page_index, encoding="utf-8"))["pages"]
WINDOW = 40


def pages_by_text(chunk):
    """청크 글자(공백 제거)의 앞·중간·끝 40자가 들어 있는 PDF 페이지를 찾는다."""
    text = "".join((chunk.get("content") or chunk.get("content_with_weight") or "").split())
    if len(text) < WINDOW:
        return set()
    mid = len(text) // 2
    windows = [text[:WINDOW], text[mid - WINDOW // 2 : mid + WINDOW // 2], text[-WINDOW:]]
    found = set()
    for window in windows:
        found |= {int(page) for page, body in PAGE_TEXT.items() if window in body}
    return found


def pages_of(chunk):
    # --page-index 가 있으면 글자 대조만 쓴다.
    # Plain Text(Naive) 파서는 positions 에 페이지가 아니라 청크 순번을 넣으므로 믿을 수 없다.
    if PAGE_TEXT:
        return sorted(pages_by_text(chunk))
    pages = set()
    for pos in chunk.get("positions") or []:
        if isinstance(pos, (list, tuple)) and pos:
            pages.add(int(pos[0]))
    for p in chunk.get("page_num_int") or []:
        pages.add(int(p))
    return sorted(pages)


def meta_of(chunk):
    for candidate in (chunk.get("metadata"), chunk.get("document_metadata")):
        if isinstance(candidate, dict):
            return candidate
    return {}


evidence = {e["evidenceId"]: e for e in json.load(open(MAP_PATH, encoding="utf-8"))["mappings"]}
evaluation = json.load(open(args.cases_file, encoding="utf-8"))
cases = [c for c in evaluation["cases"] if c["filters"]["generation"] == args.generation]
if not cases:
    sys.exit(f"{args.generation}세대 평가 문항이 없습니다.")

RRF_K = 60
POOL = 10


def chunk_key(chunk):
    return chunk.get("id") or chunk.get("chunk_id") or hash(chunk.get("content") or "")


def fused_retrieve(question):
    """원문 검색과 보강 검색의 상위 POOL개를 RRF 점수로 합쳐 상위 page_size 개를 돌려준다."""
    score, keep = {}, {}
    for expand in (False, True):
        for rank, chunk in enumerate(retrieve(question, expand=expand, size=POOL), start=1):
            key = chunk_key(chunk)
            score[key] = score.get(key, 0.0) + 1.0 / (RRF_K + rank)
            keep.setdefault(key, chunk)
    ordered = sorted(score, key=lambda k: -score[k])
    return [keep[k] for k in ordered[: args.page_size]]


results = []
for case in cases:
    chunks = fused_retrieve(case["question"]) if args.multi_query else retrieve(case["question"])
    expected = [evidence[i] for i in case["expectedEvidenceIds"]]
    expected_pages = sorted({e["pdfPage"] for e in expected})
    top = []
    for rank, chunk in enumerate(chunks[:args.page_size], start=1):
        meta = meta_of(chunk)
        if args.show_failed and not (set(expected_pages) & set(pages_of(chunk))) and rank == 1:
            pass
        top.append(
            {
                "rank": rank,
                "ragflowDocumentId": chunk.get("document_id"),
                "pages": pages_of(chunk),
                "similarity": round(float(chunk.get("similarity", 0)), 4),
                "vectorSimilarity": round(float(chunk.get("vector_similarity", 0)), 4),
                "termSimilarity": round(float(chunk.get("term_similarity", 0)), 4),
                "productCode": meta.get("productCode"),
                "generation": meta.get("generation"),
                "missingMetadata": [k for k in REQUIRED_META if meta.get(k) in (None, "")],
            }
        )
    expected_ids = case["expectedEvidenceIds"]
    for t, chunk in zip(top, chunks[: args.page_size]):
        t["documentName"] = chunk.get("document_keyword") or ""
    pdf_hit_ranks = [t["rank"] for t in top if set(expected_pages) & set(t["pages"])]
    extract_hit_ranks = [t["rank"] for t in top if any(i in t["documentName"] for i in expected_ids)]
    hit_ranks = sorted(set(pdf_hit_ranks) | set(extract_hit_ranks))
    contaminated = [
        t["rank"]
        for t in top
        if str(t["productCode"]) != case["filters"]["productCode"]
        or str(t["generation"]) != str(case["filters"]["generation"])
    ]
    missing = sorted({k for t in top for k in t["missingMetadata"]})
    passed = bool(hit_ranks) and not contaminated and not missing
    results.append(
        {
            "questionId": case["questionId"],
            "expectedEvidenceIds": case["expectedEvidenceIds"],
            "expectedPdfPages": expected_pages,
            "top3": top,
            "hitRanks": hit_ranks,
            "pdfHitRanks": pdf_hit_ranks,
            "extractHitRanks": extract_hit_ranks,
            "contaminatedRanks": contaminated,
            "missingMetadata": missing,
            "executionStatus": "PASSED" if passed else "FAILED",
        }
    )
    if args.show_failed and not passed:
        print(f"\n[진단] {case['questionId']} 질문: {case['question']}")
        print(f"       기대 근거: {expected[0]['coverage']} / {expected[0]['quoteSummary']} (PDF {expected_pages}쪽)")
        for rank, chunk in enumerate(chunks[:args.page_size], start=1):
            body = "".join((chunk.get("content") or "").split())
            print(f"       #{rank} 쪽={top[rank-1]['pages']} 점수={top[rank-1]['similarity']}: {body[:args.show_failed]}")
    mark = "PASS" if passed else "FAIL"
    pages_txt = " | ".join(f"#{t['rank']}:{t['pages']}" for t in top) or "결과 없음"
    if not args.quiet:
        print(f"{case['questionId']} {mark}  기대쪽={expected_pages}  상위{args.page_size} 쪽={pages_txt}")

total = len(results)
passed_n = sum(r["executionStatus"] == "PASSED" for r in results)
top1_n = sum(1 in r["hitRanks"] for r in results)
contam_n = sum(bool(r["contaminatedRanks"]) for r in results)
missing_n = sum(bool(r["missingMetadata"]) for r in results)
recall = passed_n / total
summary = {
    "questions": total,
    "passed": passed_n,
    "top3Recall": round(recall, 4),
    "top1Hits": top1_n,
    "crossProductContaminationCases": contam_n,
    "missingMetadataCases": missing_n,
    "passedByPdfPage": sum(bool(r["pdfHitRanks"]) for r in results),
    "passedByExtract": sum(bool(r["extractHitRanks"]) for r in results),
    "failedQuestions": [r["questionId"] for r in results if r["executionStatus"] != "PASSED"],
    "passThreshold": PASS_RATE,
    "generationStatus": "PASSED" if recall >= PASS_RATE and not contam_n and not missing_n else "FAILED",
}

output = {
    "schemaVersion": "1.0",
    "executedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    "generation": args.generation,
    "ragflow": {
        "baseUrl": args.base_url,
        "version": args.ragflow_version,
        "datasetId": args.dataset_id,
        "embeddingModel": args.embedding_model,
        "similarityThreshold": args.similarity_threshold,
        "vectorSimilarityWeight": args.vector_weight,
        "queryPrefix": args.query_prefix,
        "querySuffix": args.query_suffix,
        "multiQuery": args.multi_query,
        "queryRules": json.load(open(RULES_PATH, encoding="utf-8")) if args.use_rules else None,
        "pageSize": args.page_size,
    },
    "judgement": "상위 N개 청크 중 하나가 rule-evidence-map 의 pdfPage 를 포함, 타 상품·세대 0건, 필수 이름표 누락 0건",
    "summary": summary,
    "results": results,
}
existing = {}
if os.path.exists(args.out_path):
    try:
        existing = json.load(open(args.out_path, encoding="utf-8"))
    except json.JSONDecodeError:
        existing = {}
by_gen = existing.get("byGeneration", {})
by_gen[str(args.generation)] = output
settings_txt = f"가중치(벡터)={args.vector_weight} 임계값={args.similarity_threshold} 접두어={args.query_prefix!r} 접미어={args.query_suffix!r} 상위={args.page_size}"
print("\n설정:", settings_txt)
print("요약:", json.dumps(summary, ensure_ascii=False))
if args.no_save:
    print("(--no-save: 결과 파일을 쓰지 않았습니다)")
else:
    os.makedirs(os.path.dirname(args.out_path), exist_ok=True)
    json.dump({"schemaVersion": "1.0", "byGeneration": by_gen}, open(args.out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("결과 파일:", os.path.relpath(args.out_path, ROOT))

if args.update_status:
    status_by_q = {r["questionId"]: r["executionStatus"] for r in results}
    for case in evaluation["cases"]:
        if case["questionId"] in status_by_q:
            case["executionStatus"] = status_by_q[case["questionId"]]
    json.dump(evaluation, open(EVAL_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("retrieval-evaluation.json 의 executionStatus 를 갱신했습니다.")
else:
    print("(retrieval-evaluation.json 은 바꾸지 않았습니다. 바꾸려면 --update-status)")
