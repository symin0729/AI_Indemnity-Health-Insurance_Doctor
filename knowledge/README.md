# 공식 근거 자료

`documents/`에는 검수한 공식 원문만, `metadata/`에는 원문별 출처 메타데이터만 둡니다.
개인 계약·치료·계산 데이터는 이 디렉터리와 RAGFlow에 저장하지 않습니다.

필수 메타데이터: `documentId`, `title`, `publisher`, `sourceUrl`,
`publishedAt`, `verifiedAt`, `version`, `status`.

## 등록 순서

1. `product-selection.md`에 대표상품 선정 근거를 기록합니다.
2. `documents/samsung/{generation}/{productCode}/`에 공식 PDF를 등록합니다.
3. `manifest.json`에 파일명, SHA-256, 출처, 검수일을 기록합니다.
4. `metadata/samsung/`과 `extraction/samsung/`에 구조화 메타데이터와 조항별 추출문을 작성합니다.
5. `rule-evidence-map.json`에 Rule ID와 문서·조항을 연결합니다.
6. 교차 검수가 완료된 자료만 `VERIFIED`로 변경하고 RAGFlow에 등록합니다.
