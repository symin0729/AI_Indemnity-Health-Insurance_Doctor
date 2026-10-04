"""RAGFlow 문서에 이름표(메타데이터)를 한 번에 저장하고, 검색 결과에 이름표가 오는지 확인한다.

값은 knowledge/manifest.json 과 knowledge/metadata/samsung/<productCode>.json 에서 읽는다.
API Key는 환경변수 RF_KEY 로만 받는다 (명령줄·파일에 적지 않는다).

사용법:
  python3 scripts/set-ragflow-metadata.py --dataset-id <ID> --document-id <RAGFlow 파일 ID> \
      --project-document-id SAMSUNG_2107_1_TERMS [--status AI_SOURCE_VALIDATED]

--status 의 기본값은 AI_SOURCE_VALIDATED 이다. VERIFIED 는 검색 평가를 통과한 뒤에만 쓴다.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE = os.path.join(ROOT, "knowledge")

parser = argparse.ArgumentParser()
parser.add_argument("--dataset-id", required=True)
parser.add_argument("--document-id", required=True, help="RAGFlow가 만든 파일 ID")
parser.add_argument("--project-document-id", required=True, help="manifest.json 의 documentId")
parser.add_argument("--status", default="AI_SOURCE_VALIDATED")
parser.add_argument("--variant", default="default")
parser.add_argument("--coverage-code", default="ALL")
parser.add_argument("--base-url", default="http://localhost:9380")
args = parser.parse_args()

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


manifest = json.load(open(os.path.join(KNOWLEDGE, "manifest.json"), encoding="utf-8"))
doc = next((d for d in manifest["documents"] if d["documentId"] == args.project_document_id), None)
if doc is None:
    sys.exit(f"manifest.json 에 {args.project_document_id} 가 없습니다.")
product = json.load(
    open(os.path.join(KNOWLEDGE, "metadata", "samsung", f"{doc['productCode']}.json"), encoding="utf-8")
)

meta = {
    "documentId": doc["documentId"],
    "documentType": doc["documentType"],
    "sourceAuthority": "INSURER",
    "insurer": "SAMSUNG",
    "productCode": doc["productCode"],
    "productName": product["productName"],
    "title": doc["title"],
    "generation": doc["generation"],
    "variant": args.variant,
    "coverageCode": args.coverage_code,
    "publisher": doc["publisher"],
    "sourceUrl": doc["sourceUrl"],
    "verifiedAt": doc["verifiedAt"],
    "status": args.status,
}

print(f"[1] 이름표 {len(meta)}개 저장 요청 (status={args.status})")
status, res = call(
    "PATCH", f"/api/v1/datasets/{args.dataset_id}/documents/{args.document_id}", {"meta_fields": meta}
)
print("    HTTP", status, "code =", res.get("code"), res.get("message", res.get("error", "")))
if status != 200 or res.get("code") != 0:
    sys.exit("    저장 실패. 위 메시지를 확인하세요.")

print("[2] 저장된 이름표 다시 읽기")
status, res = call("GET", f"/api/v1/datasets/{args.dataset_id}/documents?id={args.document_id}")
docs = (res.get("data") or {}).get("docs", [])
saved = (docs[0].get("meta_fields") if docs else None) or {}
missing = [k for k in meta if str(saved.get(k)) != str(meta[k])]
print("    저장된 필드 수 =", len(saved), "| 불일치 =", missing if missing else "없음")

print("[3] 검색 결과에 이름표가 함께 오는지 확인")
status, res = call(
    "POST",
    "/api/v1/retrieval",
    {
        "question": "비급여 통원 자기부담금",
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
    for k in ["status", "productCode", "generation", "sourceUrl", "publisher", "verifiedAt"]:
        print(f"    {k} = {m.get(k)}")
if missing or not chunks:
    sys.exit(1)
