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
6. AI 원문 대조·자동 경계값 테스트·RAG 검색 평가가 완료된 자료만 `VERIFIED`로 변경합니다.

## 작업 상태별 저장 위치

- `documents/`: 수정하지 않은 공식 PDF 원본
- `metadata/`: 문서·상품 메타데이터와 검수 상태
- `extraction/`: 조·항·페이지·수치 추출 기록
- `drafts/`: 검수 전 Rule 후보. 실행 코드에서 import하지 않습니다.
- `question-scope.json`: 질문 범위 분류 정답 초안
- `retrieval-evaluation.json`: 검색 질문과 기대 Evidence 초안
- `calculation-rule-candidates.json`: 구현 가능·확인 필요 Rule 후보

1·2세대 대표 상품 코드는 각각 `SAMSUNG_0904_2`, `SAMSUNG_1611_7`로 확정했습니다.
다만 AI 원문·자동 경계값·RAG 검증 전이므로 `status` 값은 `REVIEW_REQUIRED`이며,
운영 계산과 RAG 입력에 사용할 수 없습니다.
