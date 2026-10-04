"""3세대 약관 '쪽 범위로 나눈 데이터셋'의 검색 평가 (15번, 보장 유형 분리 실험).

사전 판정 규칙(결과 보기 전에 고정):
  - 질문 40개: 공식 20(retrieval-evaluation.json 3세대) + 독립 20(holdout-questions-gen3.json).
  - 적중 = 상위 6개 청크 중 하나가 기대 근거의 PDF 쪽(rule-evidence-map.json pdfPage)에서 나옴. 쪽은 청크 글자와 원문 쪽별 글자(gen3.index.json)를 대조해 찾는다.
  - 조건 3가지: C0 원본 데이터셋(나누기 전, 필터 없음) / C1 나눈 데이터셋(필터 없음) / C2 나눈 데이터셋 + 질문에서 규칙으로 뽑은 필터(variant, coverageCode).
  - 필터는 질문 문장만으로 만든다(표준형/선택형Ⅱ, 기본형 입원·외래·처방조제비 vs 3대 비급여 단어). 정답 라벨은 쓰지 않는다.
  - 채택 기준: C2 독립 20에서 17/20 이상, 공식 20에서도 17/20 이상, 질문의 variant 와 다른 variant 문서가 결과에 섞이면 안 됨(0건).
사용: RF_KEY=... python3 scripts/evaluate-gen3-bysection.py --old-id <기존ID> --new-id <새ID>
"""
import argparse, json, os, re, sys, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = ROOT + "/knowledge"
parser = argparse.ArgumentParser()
parser.add_argument("--old-id", required=True)
parser.add_argument("--new-id", required=True)
parser.add_argument("--base-url", default="http://localhost:9380")
parser.add_argument("--only-set", default="", help="holdout-b 이면 새 문항 세트만 C0·C3 로 측정")
parser.add_argument("--top", type=int, default=6)
parser.add_argument("--vector-weight", type=float, default=0.3)
args = parser.parse_args()
key = os.environ.get("RF_KEY", "").strip()
if not key:
    sys.exit("RF_KEY 가 비어 있습니다.")

norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFC", s or ""))
PAGES = json.load(open(K + "/validation/ragflow/gen3.index.json", encoding="utf-8"))["pages"]
EVID = {e["evidenceId"]: e for e in json.load(open(K + "/rule-evidence-map.json", encoding="utf-8"))["mappings"]}
official = [c for c in json.load(open(K + "/retrieval-evaluation.json", encoding="utf-8"))["cases"] if c["filters"]["generation"] == 3]
holdout = json.load(open(K + "/validation/ragflow/holdout-questions-gen3.json", encoding="utf-8"))["cases"]

SPECIAL3 = re.compile(r"3대\s*비급여|도수|체외충격파|증식|비급여\s*주사|주사|MRI|MRA|자기공명")
BASE = re.compile(r"기본형|입원|외래|통원|처방조제|약국|조제|약값")


def derive_filters(question):
    f = []
    if re.search(r"선택형\s*[Ⅱ2]|선택형", question): f.append(("variant", "selected2"))
    elif re.search(r"표준형", question): f.append(("variant", "standard"))
    if SPECIAL3.search(question): f.append(("coverageCode", "SPECIAL3"))
    elif BASE.search(question): f.append(("coverageCode", "BASE"))
    return f


def retrieve(dataset, question, filters):
    body = {"question": question, "dataset_ids": [dataset], "page": 1, "page_size": args.top, "similarity_threshold": 0.2,
            "vector_similarity_weight": args.vector_weight, "reference_metadata": {"include": True}}
    if filters:
        body["metadata_condition"] = {"logic": "and", "conditions": [{"name": n, "comparison_operator": "is", "value": v} for n, v in filters]}
    req = urllib.request.Request(args.base_url + "/api/v1/retrieval", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return (json.load(urllib.request.urlopen(req, timeout=180)).get("data") or {}).get("chunks", [])


def pages_of(chunk):
    text = norm(chunk.get("content") or "")
    if len(text) < 40: return set()
    mid = len(text) // 2
    found = set()
    for w in (text[:40], text[mid - 20: mid + 20], text[-40:]):
        found |= {int(p) for p, body in PAGES.items() if w in body}
    return found


def run(cases, dataset, use_filters, variant_from_case=False):
    hits, wrong_variant, details = 0, 0, []
    for c in cases:
        exp = {EVID[i]["pdfPage"] for i in c["expectedEvidenceIds"]}
        fl = derive_filters(c["question"]) if use_filters else []
        if use_filters and variant_from_case:  # 서비스는 사용자가 고른 가입 유형(variant)을 알고 있으므로 질문 문장 대신 요청 값으로 쓴다
            fl = [x for x in fl if x[0] != "variant"] + [("variant", c["filters"]["variant"])]
        chunks = retrieve(dataset, c["question"], fl)
        got = [sorted(pages_of(ch)) for ch in chunks]
        ok = any(exp & set(g) for g in got)
        hits += ok
        want = c["filters"].get("variant")
        for ch in chunks:
            v = (ch.get("document_metadata") or ch.get("metadata") or {}).get("variant")
            if v in ("standard", "selected2") and want in ("standard", "selected2") and v != want: wrong_variant += 1; break
        details.append((c["questionId"], ok, sorted(exp), fl))
    return hits, wrong_variant, details


sets = (("공식20", official), ("독립20", holdout))
if args.only_set == "holdout-b":
    holdout_b = json.load(open(K + "/validation/ragflow/holdout-questions-gen3-b.json", encoding="utf-8"))["cases"]
    sets = (("새20(B)", holdout_b),)
for label, cases in sets:
    for name, ds, filt in (("C0 원본·필터없음", args.old_id, False), ("C1 나눔·필터없음", args.new_id, False), ("C2 나눔+필터(질문 문장)", args.new_id, True), ("C3 나눔+필터(variant는 요청값)", args.new_id, "case")):
        h, w, d = run(cases, ds, bool(filt), filt == "case")
        print(f"{label} {name}: {h}/{len(cases)} | 다른 variant 섞임 {w}건 | 실패 {[x[0] for x in d if not x[1]]}")
        if name.startswith("C3"):
            for qid, ok, exp, fl in d:
                if not ok: print("     실패 상세", qid, "기대쪽", exp, "필터", fl)
