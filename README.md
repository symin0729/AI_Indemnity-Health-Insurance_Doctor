AI 실손 닥터는 1~4세대 실손보험 가입자가 현재 계약을 유지하는 경우와 5세대 실손보험으
로 전환하는 경우의 예상 연간 총부담을 동일한 의료이용 조건에서 비교할 수 있도록 구현한 
반응형 모바일 웹 서비스입니다.
사용자가 현재 실손보험 계약 정보, 5세대 비교 조건, 예정 치료 정보를 입력하면 구조화된 약
관 Rule Set과 TypeScript 기반 결정론적 룰 엔진을 이용하여 현재 계약과 5세대 전환 시나리
오의 보험료, 자기부담금, 예상 보험금, 보장 제외 금액, 지급한도 초과 금액 등을 계산합니다.

## Health API 상태 계약

`GET /api/health`는 비밀값을 노출하지 않고 API와 외부 서비스의 설정 상태만 반환합니다.

- `status`: RAG와 LLM이 모두 설정되면 `ready`, 하나라도 설정되지 않으면 `degraded`
- `services.api`: API가 응답하면 `available`
- `services.rag`, `services.llm`: 필수 환경변수 유무에 따라 `configured` 또는 `unconfigured`

`not_configured`, `ok`, `error`는 이 API의 상태값으로 사용하지 않습니다.
