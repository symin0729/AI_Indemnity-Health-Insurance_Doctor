"""삼성화재 3세대 약관을 쪽 범위로 나눈 11개 문서(knowledge/documents/samsung/gen3/SAMSUNG_1704_1_sections)에
이름표(variant·coverageCode 포함)를 저장한다. API Key 는 환경변수 RF_KEY 로만 받는다.

  RF_KEY=... python3 scripts/set-ragflow-gen3-section-metadata.py --dataset-id <ID>
"""
import argparse, json, os, sys, urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--dataset-id", required=True)
parser.add_argument("--base-url", default="http://localhost:9380")
args = parser.parse_args()
key = os.environ.get("RF_KEY", "").strip()
if not key:
    sys.exit("RF_KEY 가 비어 있습니다.")

# 파일 앞부분 → (variant, coverageCode, 설명)
SECTIONS = {
    "S01": ("common", "COMMON", "가입자 유의사항(공통)"),
    "S02": ("standard", "SUMMARY", "1종 표준형 상품요약 일반"),
    "S03": ("standard", "BASE", "1종 표준형 기본계약(입원·외래·처방조제비)"),
    "S04": ("standard", "SPECIAL3", "1종 표준형 3대 비급여 선택계약"),
    "S05": ("standard", "SUMMARY", "1종 표준형 지급제한·예정위험률"),
    "S06": ("selected2", "SUMMARY", "2종 선택형Ⅱ 상품요약 일반"),
    "S07": ("selected2", "BASE", "2종 선택형Ⅱ 기본계약(입원·외래·처방조제비)"),
    "S08": ("selected2", "SPECIAL3", "2종 선택형Ⅱ 3대 비급여 선택계약"),
    "S09": ("selected2", "SUMMARY", "2종 선택형Ⅱ 지급제한·기타"),
    "S10": ("terms", "TERMS", "보통약관 본문"),
    "S11": ("terms", "SPECIAL_TERMS", "특별약관 본문"),
}


def call(method, path, body=None):
    req = urllib.request.Request(
        args.base_url + path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))


docs = call("GET", f"/api/v1/datasets/{args.dataset_id}/documents?page=1&page_size=100")["data"]["docs"]
for doc in docs:
    code = doc["name"][:3]
    if code not in SECTIONS:
        print("건너뜀", doc["name"]); continue
    variant, coverage, label = SECTIONS[code]
    pages = doc["name"].split("_p")[-1].replace(".pdf", "")
    start, end = (int(x) for x in pages.split("-"))
    meta = {
        "documentId": f"SAMSUNG_1704_1_{code}", "documentType": "OFFICIAL_PRODUCT_SUMMARY_AND_TERMS", "generation": 3,
        "insurer": "SAMSUNG", "productCode": "SAMSUNG_1704_1", "productName": "무배당 삼성화재 실손의료비보험(1704.1)",
        "publisher": "삼성화재해상보험주식회사", "sourceAuthority": "INSURER",
        "sourceUrl": "https://www.samsungfire.com/publication/pdf/96228_0_20170401_file1.pdf",
        "status": "AI_SOURCE_VALIDATED", "title": f"무배당 삼성화재 실손의료비보험(1704.1) 공식 PDF - {label}",
        "variant": variant, "coverageCode": coverage, "pdfPageStart": start, "pdfPageEnd": end, "verifiedAt": "2026-09-29",
    }
    res = call("PATCH", f"/api/v1/datasets/{args.dataset_id}/documents/{doc['id']}", {"meta_fields": meta})
    print(doc["name"][:30].ljust(32), variant.ljust(9), coverage.ljust(14), "OK" if res.get("code") == 0 else res)
