# SAMSUNG_2605_1 공식 원문

- 일반형: `samsung_gen5_2605_1_general_terms.pdf`
- 계약전환형: `samsung_gen5_2605_1_conversion_terms.pdf`

5세대 계산 규칙은 일반형과 계약전환형의 독립 RuleSet으로 운영합니다. 두 원문의 공통 산식은 동일하지만 Rule ID, Evidence ID, 실행 스펙과 입력 검증은 서로 분리되어 있습니다. 계약전환형은 계약전환·재개·자녀보험전환 세부유형과 전환 자격·계속 치료 조건을 확인해야 계산됩니다.

다이렉트 약관은 이 상품의 계산 근거와 문서 목록에서 제외했습니다.

사용자 화면은 `calculateSamsungGen5Claim(contractType, enrollment, facts, input, uncertainMode)`을 사용합니다. 사용자가 중증·비중증을 직접 고르지 않고, 급여 여부·산정특례·질환 관련성·입원/통원·보장 제외 여부를 바탕으로 시스템이 Rule을 선택합니다.

- 특약 가입 상태로 유형 A~D를 자동 결정합니다.
- 정보가 부족하면 내부 검수로 넘기지 않고 `requiredQuestion`으로 부족한 사실만 다시 질문합니다.
- 끝까지 분류할 수 없으면 `HOLD`로 계산을 보류하거나 `CONDITIONAL_SIMULATION`으로 중증·비중증 두 조건의 참고 결과를 반환합니다.
- 조건별 결과에는 실제 적용 유형과 지급액이 보험회사 심사에 따라 달라질 수 있다는 안내가 항상 포함됩니다.

`calculateSamsungGen5(contractType, coverage, input)`은 검증된 Rule을 직접 실행하는 하위 계산 함수입니다.
