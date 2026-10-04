"""정제 텍스트 파일(.txt) 각각이 청크 하나가 되도록 문서별 설정을 바꾸고 다시 파싱한다.

구분자를 역따옴표로 감싼 값(`§§§`)으로 지정하면 RAGFlow 는 청크 크기와 상관없이 구분자 단위로 청크를 만든다.
파일 안에 §§§ 가 없으므로 파일 전체가 청크 하나가 된다. PDF 문서는 건드리지 않는다.

  python3 scripts/ragflow-one-chunk-per-file.py --dataset-id <ID>
API Key 는 환경변수 RF_KEY 로만 받는다.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--dataset-id", required=True)
parser.add_argument("--base-url", default="http://localhost:9380")
parser.add_argument("--suffix", default=".txt")
args = parser.parse_args()
key = os.environ.get("RF_KEY", "").strip()
if not key:
    sys.exit("RF_KEY 가 비어 있습니다. 키를 먼저 입력하세요.")
DELIMITER = "`§§§`"


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


def list_docs():
    status, res = call("GET", f"/api/v1/datasets/{args.dataset_id}/documents?page=1&page_size=100")
    if status != 200 or res.get("code") != 0:
        sys.exit(f"문서 목록 실패: {status} {res}")
    return res["data"]["docs"]


docs = [d for d in list_docs() if d["name"].endswith(args.suffix)]
print(f"[1] 대상 문서 {len(docs)}개 ({args.suffix})")
for d in docs:
    cfg = dict(d.get("parser_config") or {})
    cfg["delimiter"] = DELIMITER
    status, res = call("PATCH", f"/api/v1/datasets/{args.dataset_id}/documents/{d['id']}", {"parser_config": cfg})
    if status != 200 or res.get("code") != 0:
        sys.exit(f"설정 변경 실패 {d['name']}: {status} {res}")
print("[2] 문서별 구분자 설정 완료")

status, res = call("POST", f"/api/v1/datasets/{args.dataset_id}/chunks", {"document_ids": [d["id"] for d in docs]})
print("[3] 다시 파싱 요청:", status, res.get("code"), res.get("message", res.get("error", "")))
if status != 200 or res.get("code") != 0:
    sys.exit("파싱 요청 실패")

for _ in range(60):
    time.sleep(3)
    now = [d for d in list_docs() if d["name"].endswith(args.suffix)]
    if all(d.get("run") in ("DONE", "3", 3) for d in now):
        break
print("[4] 결과")
for d in sorted(now, key=lambda x: x["name"]):
    print(f"    {d['name']}: 청크 {d.get('chunk_count')} | 상태 {d.get('run')}")
