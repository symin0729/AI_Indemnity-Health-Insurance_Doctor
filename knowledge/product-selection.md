# 세대별 대표상품 선정 기록

| 세대 | 상품 코드 | 상태 | 비고 |
|---|---|---|---|
| 1 | `SAMSUNG_GEN1_PENDING` | `PENDING_SELECTION` | 정확한 상품명·판매기간·약관 확정 필요 |
| 2 | `SAMSUNG_GEN2_PENDING` | `PENDING_SELECTION` | 정확한 상품명·판매기간·약관 확정 필요 |
| 3 | `SAMSUNG_1704_1` | `PENDING_EVIDENCE` | PDF 원본과 버전 검수 필요 |
| 4 | `SAMSUNG_2107_1` | `PENDING_EVIDENCE` | PDF 원본과 버전 검수 필요 |
| 5 | `SAMSUNG_2605_1` | `PENDING_EVIDENCE` | PDF 원본과 버전 검수 필요 |

`VERIFIED`로 전환하려면 공식 PDF, SHA-256 해시, 발행처, 출처 URL, 검수일을 `manifest.json`과 메타데이터에 기록해야 합니다.
