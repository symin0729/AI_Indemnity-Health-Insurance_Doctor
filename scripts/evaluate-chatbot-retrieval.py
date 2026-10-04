"""챗봇(IN 질문) 검색 적중률 측정기 (19a WO-06).

evals/golden-questions.json 의 IN 질문을 정책자료 데이터셋에 보내고, 서비스가 LLM에 넘기는 것과 같은 설정
(상위 6개 청크, 유사도 0.2 이상, 벡터 가중치 0.3, 검색어 보강 없음)으로 가져온 청크가
expectedPages(any-of: 하나라도 나오면 적중)를 포함하는지 판정한다.

사전 판정 규칙 (결과를 보기 전에 고정):
  - 적중 = 상위 6개 청크 중 하나가 expectedPages 의 '문서ID pN'의 쪽을 포함하거나, 쪽 지정이 없는 항목(표·요약 문서)은 그 문서에서 나옴
  - 합격선: dev(연습문제) IN 적중률 90% 이상. final(실전문제)은 이 단계에서 실행하지 않는다(마지막에 한 번만).
  - STD-14 같이 RAGFlow에 올리지 않은 근거(확인용 문서)는 기대 목록에서 제외하고, 남은 근거가 없는 문항은 '측정 대상 아님'으로 따로 센다.
  - 쪽은 청크 글자와 원문 쪽별 글자(policy-page-index.json)를 대조해 찾는다(Naive 파서는 청크 위치 정보를 믿을 수 없다).

사용법 (API Key 는 환경변수 RF_KEY 로만 받는다):
  python3 scripts/evaluate-chatbot-retrieval.py --dataset-id <ID> --split dev
결과: knowledge/validation/ragflow/chatbot-retrieval-<split>.json (키·질문 로그 없음, 질문은 골든셋 문항)
"""
import argparse
import datetime
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLDEN = os.path.join(ROOT, "evals", "golden-questions.json")
INDEX = os.path.join(ROOT, "knowledge", "validation", "ragflow", "policy-page-index.json")
NOT_UPLOADED = {"STD-14", "STD-15"}
WINDOW = 40
PASS_RATE = 0.90

parser = argparse.ArgumentParser()
parser.add_argument("--dataset-id", required=True)
parser.add_argument("--split", choices=["dev", "final", "holdout2"], default="dev")
parser.add_argument("--golden", default=GOLDEN, help="문항 파일(기본: evals/golden-questions.json)")
parser.add_argument("--base-url", default="http://localhost:9380")
parser.add_argument("--page-size", type=int, default=6)
parser.add_argument("--vector-weight", type=float, default=0.3)
parser.add_argument("--similarity-threshold", type=float, default=0.2)
parser.add_argument("--show-failed", type=int, default=0, metavar="N", help="실패 문항 상위 청크 앞부분 N자 출력(진단용)")
parser.add_argument("--query-prefix", default="", help="질문 앞에 붙일 문구(검색어 보강 시험용)")
parser.add_argument("--query-suffix", default="", help="질문 뒤에 붙일 문구(검색어 보강 시험용)")
parser.add_argument("--five-first", action="store_true", help="질문이 1~4세대·예전·세대별 비교를 묻지 않으면 5세대 문서(generation=5)만 검색한다")
parser.add_argument("--glossary", action="store_true", help="일상어를 문서 용어로 풀어 검색어 뒤에 붙인다(예: 싼·줄일 → 저렴 인하)")
parser.add_argument("--tag", default="", help="결과 파일 이름 뒤에 붙일 이름(설정 비교용)")
parser.add_argument("--quiet", action="store_true", help="질문별 줄은 숨기고 요약만 출력")
args = parser.parse_args()

key = os.environ.get("RF_KEY", "").strip()
if not key:
    sys.exit("RF_KEY 가 비어 있습니다. 키를 먼저 입력하세요.")
if args.split == "final":
    print("※ final(실전문제)은 마지막에 한 번만 실행하는 것이 원칙입니다. 이번 실행 결과는 기록에 남습니다.")

norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFC", s or ""))
PAGES = json.load(open(INDEX, encoding="utf-8"))["pages"]


# 일상 표현 → 공식 문서에 쓰인 표현. 모든 질문에 같은 규칙을 적용한다(api/lib/retrievalGlossary.ts 와 같아야 한다).
GLOSSARY = [
    (re.compile(r"싼|싸지|싸다|저렴|줄일|줄이|절약|아낄|적게|낮아|낮추"), "저렴 인하"),
    (re.compile(r"빠지|빠진|제외|줄어드|줄어든|축소"), "보장 제외 한도 변경"),
    (re.compile(r"복귀|돌아가|되돌|후회|취소"), "철회 이전 계약"),
    (re.compile(r"오르|오른|인상|올라"), "갱신 인상"),
]


def with_glossary(question):
    extra = [add for pattern, add in GLOSSARY if pattern.search(question)]
    return question + (" " + " ".join(extra) if extra else "")


OLD_GEN = re.compile(r"[1-4]\s*세대|1\s*[~·,]\s*[2-5]|예전|옛날|구\s*실손|이전\s*세대|세대별|세대\s*비교|몇\s*세대|세대\s*구분|어느\s*세대|어떤\s*세대|(가입|판매)\s*(시점|시기)")


def retrieve(question):
    extra = {}
    if args.five_first and not OLD_GEN.search(question):
        extra["metadata_condition"] = {"logic": "and", "conditions": [{"name": "generation", "comparison_operator": "is", "value": "5"}]}
    body = json.dumps(
        {
            **extra,
            "question": (args.query_prefix + " " if args.query_prefix else "") + (with_glossary(question) if args.glossary else question) + (" " + args.query_suffix if args.query_suffix else ""),
            "dataset_ids": [args.dataset_id],
            "page": 1,
            "page_size": args.page_size,
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


def doc_id_of(chunk):
    name = unicodedata.normalize("NFC", chunk.get("document_keyword") or "")
    m = re.match(r"([A-Za-z0-9]+-[A-Za-z0-9]+(?:-[0-9]+)?)", name)
    return m.group(1) if m else ""


def pages_of(chunk, doc_id):
    text = norm(chunk.get("content") or "")
    pages = PAGES.get(doc_id)
    if not pages or len(text) < WINDOW:
        return set()
    mid = len(text) // 2
    windows = [text[:WINDOW], text[mid - WINDOW // 2 : mid + WINDOW // 2], text[-WINDOW:]]
    found = set()
    for w in windows:
        found |= {int(p) for p, body in pages.items() if w in body}
    return found


def parse_expected(items):
    out = []
    for item in items:
        m = re.match(r"([A-Za-z0-9-]+?)(?: p\.(\d+))?$", item.strip())
        if not m or m.group(1) in NOT_UPLOADED:
            continue
        out.append((m.group(1), int(m.group(2)) if m.group(2) else None))
    return out


golden = json.load(open(args.golden, encoding="utf-8"))["questions"]
cases = [q for q in golden if q["expectedRoute"] == "IN" and q["split"] == args.split]
results, skipped = [], []
for q in cases:
    expected = parse_expected(q.get("expectedPages", []))
    if not expected:
        skipped.append(q["questionId"])
        continue
    chunks = retrieve(q["question"])
    got = []
    for rank, c in enumerate(chunks, start=1):
        d = doc_id_of(c)
        got.append({"rank": rank, "doc": d, "pages": sorted(pages_of(c, d)), "similarity": round(float(c.get("similarity", 0)), 3)})
    hit_ranks = []
    for g in got:
        for doc, page in expected:
            if g["doc"] == doc and (page is None or page in g["pages"]):
                hit_ranks.append(g["rank"])
                break
    doc_only = any(g["doc"] == doc for g in got for doc, _ in expected)
    r = {
        "questionId": q["questionId"],
        "expectedId": q["expectedId"],
        "hit": bool(hit_ranks),
        "firstHitRank": min(hit_ranks) if hit_ranks else None,
        "docLevelHit": doc_only,
        "top": got,
    }
    results.append(r)
    pages_txt = " ".join(f"{g['rank']}위 {g['doc']} {g['pages']}쪽" for g in got)
    if not args.quiet:
        print(f"{q['questionId']} {q['expectedId']:6s} {'적중' if r['hit'] else '실패'}  {pages_txt}")
    if args.show_failed and not r["hit"]:
        print(f"    질문: {q['question']}")
        print(f"    기대: {q['expectedPages'][:6]}")
        for g, c in zip(got, chunks):
            print(f"    #{g['rank']} {g['doc']}{g['pages']}: {norm(c.get('content'))[:args.show_failed]}")

n = len(results)
hits = sum(r["hit"] for r in results)
doc_hits = sum(r["docLevelHit"] for r in results)
top3 = sum(1 for r in results if r["firstHitRank"] and r["firstHitRank"] <= 3)
top1 = sum(1 for r in results if r["firstHitRank"] == 1)
by_id = {}
for r in results:
    by_id.setdefault(r["expectedId"], []).append(r["hit"])
print("\n=== 요약 ===")
print(f"측정 대상 {n}문항 (측정 대상 아님 {len(skipped)}: {', '.join(skipped) or '없음'})")
print(f"설정: 유사도하한 {args.similarity_threshold} / 벡터가중치 {args.vector_weight} / 상위 {args.page_size} / 5세대 우선 {args.five_first} / 용어풀이 {args.glossary} / 앞문구 [{args.query_prefix}] / 뒷문구 [{args.query_suffix}]")
print(f"적중(상위 {args.page_size}) {hits}/{n} = {hits / n:.1%}  | 상위3 {top3}/{n}  | 1위 {top1}/{n}  | 문서만 일치 {doc_hits}/{n}")
print("질문 유형별:", ", ".join(f"{k} {sum(v)}/{len(v)}" for k, v in sorted(by_id.items())))
verdict = "합격" if hits / n >= PASS_RATE else "미달"
print(f"사전 합격선 {PASS_RATE:.0%}: {verdict}")

out = {
    "executedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    "split": args.split,
    "settings": {"pageSize": args.page_size, "vectorWeight": args.vector_weight, "similarityThreshold": args.similarity_threshold},
    "summary": {"questions": n, "hits": hits, "rate": round(hits / n, 4), "passRate": PASS_RATE, "verdict": verdict, "skipped": skipped},
    "results": results,
}
path = os.path.join(ROOT, "knowledge", "validation", "ragflow", f"chatbot-retrieval-{args.split}{'-' + args.tag if args.tag else ''}.json")
json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("저장:", os.path.relpath(path, ROOT))
