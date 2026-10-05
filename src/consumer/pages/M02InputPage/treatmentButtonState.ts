export function shouldDisableAddTreatmentButton({
  isTreatmentFormOpen,
  isTreatmentLimitReached,
}: {
  isTreatmentFormOpen: boolean;
  isTreatmentLimitReached: boolean;
}): boolean {
  // 폼이 열려 있어도 '새 치료 추가'는 계속 가능해야 한다.
  // 사용자가 임시 입력을 리셋하고 새 항목을 시작할 수 있어야 하기 때문이다.
  // 실제 비활성화는 최대 등록 건수 도달 때만 적용한다.
  void isTreatmentFormOpen;
  return isTreatmentLimitReached;
}
