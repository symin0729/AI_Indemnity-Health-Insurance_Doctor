"""정책자료 데이터셋의 모든 문서에 이름표(메타데이터)를 한 번에 저장하고, 검색 결과에 이름표가 오는지 확인한다.

값은 knowledge/metadata/policy/policy-docs.json 에서 읽는다. RAGFlow 의 파일 이름이 documentId 로 시작해야 한다
(예: FSC-5G-01_20260504_5세대_보도자료.pdf). API Key 는 환경변수 RF_KEY 로만 받는다(명령줄·파일에 적지 않는다).

사용법:
  python3 scripts/set-ragflow-policy-metadata.py --dataset-id <ID> --dry-run            # 파일·값 점검만
  RF_KEY=... python3 scripts/set-ragflow-policy-metadata.py --dataset-id <ID>             # status=AI_SOURCE_VALIDATED
  RF_KEY=... python3 scripts/set-ragflow-policy-metadata.py --dataset-id <ID> --status AI_CROSS_CHECKED \
      --ai-checked-by "독립 교차검증 세션" --ai-checked-at 2026-10-03 --source-match-report "numbers 107/107"

--status 는 실제 확인 수준과 같게 쓴다. VERIFIED 는 검색 평가를 통과한 뒤에만 쓴다.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.path.dirname(ROOT)
MANIFEST = os.path.join(ROOT, "knowledge", "metadata", "policy", "policy-docs.json")
STATUSES = ["AI_SOURCE_VALIDATED", "AI_CROSS_CHECKED", "VERIFIED"]

parser = argparse.ArgumentParser()
parser.add_argument("--dataset-id")
parser.add_argument("--dataset-name", default="ihid-policy-plain256", help="--dataset-id 를 모를 때 이름으로 찾는다")
parser.add_argument("--status", default="AI_SOURCE_VALIDATED", choices=STATUSES)
parser.add_argument("--verified-at", default="2026-10-03", help="공식 출처와 대조한 날짜")
parser.add_argument("--ai-checked-by", default="")
parser.add_argument("--ai-checked-at", default="")
parser.add_argument("--source-match-report", default="")
parser.add_argument("--team-confirmed-by", default="", help="사람 검수자 이름(검수 완료 후에만)")
parser.add_argument("--team-confirmed-at", default="")
parser.add_argument("--base-url", default="http://localhost:9380")
parser.add_argument("--diagnose", default="", help="문서ID. 이름표 항목을 하나씩 넣어 어느 항목이 거부되는지 찾는다")
parser.add_argument("--only", default="", help="쉼표로 구분한 문서ID만 저장한다(예: FSC-5G-01,KNIA-01). 비우면 전체")
parser.add_argument("--dry-run", action="store_true")
args = parser.parse_args()

manifest = json.load(open(MANIFEST, encoding="utf-8"))
entries = manifest["documents"]
if args.only:
    wanted = {x.strip() for x in args.only.split(",") if x.strip()}
    entries = [e for e in entries if e["documentId"] in wanted]


def meta_for(entry):
    meta = {
        "documentId": entry["documentId"],
        "documentType": entry["documentType"],
        "sourceAuthority": entry["sourceAuthority"],
        "title": entry["title"],
        "publisher": entry["publisher"],
        "sourceUrl": entry["sourceUrl"],
        "publishedAt": entry["publishedAt"],
        "verifiedAt": args.verified_at,
        "status": args.status,
        "topic": entry["topic"],
        "appliesTo": entry["appliesTo"],
        "generalizable": str(entry["generalizable"]).lower(),
    }
    if entry["generation"]:  # 여러 세대 문서는 비운다(RAGFlow가 숫자 항목에 글자 값을 거부함)
        meta["generation"] = entry["generation"]
    if entry.get("notes"):
        meta["notes"] = entry["notes"]
    if args.ai_checked_by:
        meta["aiCheckedBy"] = args.ai_checked_by
    if args.ai_checked_at:
        meta["aiCheckedAt"] = args.ai_checked_at
    if args.source_match_report:
        meta["sourceMatchReport"] = args.source_match_report
    if args.team_confirmed_by:
        meta["teamConfirmedBy"] = args.team_confirmed_by
        meta["teamConfirmedAt"] = args.team_confirmed_at
    return meta


print(f"[점검] 문서 {len(entries)}개, status={args.status}")
missing_files = [e["file"] for e in entries if not any(os.path.exists(os.path.join(b, e["file"])) for b in (ROOT, PROJECT))]
required = ["documentId", "title", "publisher", "sourceUrl", "verifiedAt", "status"]
incomplete = [e["documentId"] for e in entries if any(not meta_for(e).get(k) for k in required)]
print("  없는 파일:", missing_files if missing_files else "없음")
print("  필수 이름표 누락(챗봇이 근거로 쓰지 못함):", incomplete if incomplete else "없음")
if args.dry_run or (not args.dataset_id and not os.environ.get("RF_KEY")):
    for e in entries:
        print(f"  - {e['documentId']:10s} {e['file']}")
    sys.exit(1 if missing_files or incomplete else 0)

key = os.environ.get("RF_KEY", "").strip()
if not key:
    sys.exit("RF_KEY 가 비어 있습니다. 키를 먼저 입력하세요.")


def call(method, path, body=None):
    req = urllib.request.Request(
        args.base_url + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as err:
        return err.code, {"error": err.read().decode()[:300]}


if not args.dataset_id:
    status, res = call("GET", "/api/v1/datasets?name=" + urllib.parse.quote(args.dataset_name))
    found = res.get("data") or []
    if status != 200 or len(found) != 1:
        sys.exit(f"데이터셋 '{args.dataset_name}' 을 하나로 찾지 못했습니다: HTTP {status}, {len(found)}개")
    args.dataset_id = found[0]["id"]
    print(f"[0] 데이터셋 '{args.dataset_name}' 찾음 (ID는 .env.local 의 RAGFLOW_GENERAL_DATASET_ID 에 넣을 값): {args.dataset_id}")

print("[1] 데이터셋의 문서 목록 읽기")
status, res = call("GET", f"/api/v1/datasets/{args.dataset_id}/documents?page=1&page_size=100")
docs = (res.get("data") or {}).get("docs", [])
print("    HTTP", status, "문서", len(docs), "개")
by_prefix = {}
for doc in docs:
    name = doc.get("name", "")
    for e in entries:
        if name.startswith(e["documentId"] + "_") or name.startswith(e["documentId"] + "."):
            by_prefix[e["documentId"]] = doc
not_found = [e["documentId"] for e in entries if e["documentId"] not in by_prefix]
print("    매칭 안 된 문서:", not_found if not_found else "없음")

if args.diagnose:
    e = next(x for x in entries if x["documentId"] == args.diagnose)
    doc = by_prefix[e["documentId"]]
    for k, v in meta_for(e).items():
        status, res = call("PATCH", f"/api/v1/datasets/{args.dataset_id}/documents/{doc['id']}", {"meta_fields": {k: v}})
        print(f"    {k:18s} {'OK' if res.get('code') == 0 else 'FAIL'}  {str(v)[:60]}")
    sys.exit(0)

print("[2] 이름표 저장")
failed = []
for e in entries:
    doc = by_prefix.get(e["documentId"])
    if not doc:
        continue
    meta = meta_for(e)
    status, res = call("PATCH", f"/api/v1/datasets/{args.dataset_id}/documents/{doc['id']}", {"meta_fields": meta})
    ok = status == 200 and res.get("code") == 0
    print(f"    {e['documentId']:10s} HTTP {status} {'OK' if ok else res}")
    if not ok:
        failed.append(e["documentId"])

print("[3] 검색 결과에 이름표가 함께 오는지 확인")
status, res = call(
    "POST",
    "/api/v1/retrieval",
    {
        "question": "5세대로 바꾸면 줄어드는 보장이 있나요?",
        "dataset_ids": [args.dataset_id],
        "page": 1,
        "page_size": 3,
        "similarity_threshold": 0.2,
        "vector_similarity_weight": 0.3,
        "reference_metadata": {"include": True},
    },
)
chunks = (res.get("data") or {}).get("chunks", [])
print("    HTTP", status, "chunks =", len(chunks))
if chunks:
    c = chunks[0]
    m = next((x for x in (c.get("metadata"), c.get("document_metadata")) if isinstance(x, dict)), {})
    for k in ["documentId", "status", "publisher", "sourceUrl", "verifiedAt", "appliesTo"]:
        print(f"    {k} = {m.get(k)}")
if failed or not_found or not chunks:
    sys.exit(1)
