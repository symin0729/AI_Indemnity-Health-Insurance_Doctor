"""정제 텍스트 파일(<evidenceId>.txt)마다 이름표를 한 번에 저장한다.

값은 knowledge/rule-evidence-map.json, manifest.json, metadata/samsung/<productCode>.json 에서 읽는다.
API Key 는 환경변수 RF_KEY 로만 받는다.

  python3 scripts/set-ragflow-extract-metadata.py --dataset-id <ID> --product-code SAMSUNG_2107_1
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = os.path.join(ROOT, "knowledge")
parser = argparse.ArgumentParser()
parser.add_argument("--dataset-id", required=True)
parser.add_argument("--product-code", required=True)
parser.add_argument("--status", default="AI_SOURCE_VALIDATED")
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


evidence = {e["evidenceId"]: e for e in json.load(open(os.path.join(K, "rule-evidence-map.json"), encoding="utf-8"))["mappings"]}
manifest = json.load(open(os.path.join(K, "manifest.json"), encoding="utf-8"))["documents"]
product = json.load(open(os.path.join(K, "metadata", "samsung", f"{args.product_code}.json"), encoding="utf-8"))
terms = next(d for d in manifest if d["productCode"] == args.product_code)

status, res = call("GET", f"/api/v1/datasets/{args.dataset_id}/documents?page=1&page_size=100")
if status != 200 or res.get("code") != 0:
    sys.exit(f"문서 목록 실패: {status} {res}")
docs = [d for d in res["data"]["docs"] if d["name"].endswith(".txt")]
print(f"[1] 정제 파일 {len(docs)}개에 이름표 저장")
bad = 0
for d in sorted(docs, key=lambda x: x["name"]):
    evidence_id = d["name"][: -len(".txt")]
    ev = evidence.get(evidence_id)
    if ev is None:
        print(f"    {d['name']}: 근거 맵에 없음, 건너뜀")
        bad += 1
        continue
    meta = {
        "documentId": evidence_id,
        "documentType": "VERIFIED_STRUCTURED_EXTRACTION",
        "sourceAuthority": "INSURER",
        "insurer": "SAMSUNG",
        "productCode": ev["productCode"],
        "productName": product["productName"],
        "title": f"{product['productName']} 계산 근거 {ev['coverage']}",
        "generation": terms["generation"],
        "variant": ev.get("variant", "default"),
        "coverageCode": ev["coverage"],
        "evidenceId": evidence_id,
        "ruleId": ev["ruleId"],
        "pdfPage": ev["pdfPage"],
        "article": ev["article"],
        "publisher": terms["publisher"],
        "sourceUrl": ev["sourceUrl"],
        "verifiedAt": ev["verifiedAt"],
        "status": args.status,
    }
    s1, r1 = call("PATCH", f"/api/v1/datasets/{args.dataset_id}/documents/{d['id']}", {"meta_fields": meta})
    ok = s1 == 200 and r1.get("code") == 0
    bad += 0 if ok else 1
    print(f"    {d['name']}: {'저장 완료' if ok else '실패 ' + str(r1)}")
sys.exit(1 if bad else 0)
