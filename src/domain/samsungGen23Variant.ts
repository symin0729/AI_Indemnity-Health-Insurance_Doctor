export type SamsungGen23Variant =
  | "standard"
  | "selected2"
  | "standard2013"
  | "selected2013"
  | "unified2009"
  | "UNKNOWN";

export const GEN23_UNREGISTERED_NOTE = "약관 규칙이 등록되지 않아 계산 제공하지 않음";

export const GEN23_VARIANT_LABELS: Record<SamsungGen23Variant, string> = {
  standard: "표준형",
  selected2: "선택형Ⅱ",
  standard2013: `표준형 (${GEN23_UNREGISTERED_NOTE})`,
  selected2013: `선택형 (${GEN23_UNREGISTERED_NOTE})`,
  unified2009: `단일 구조 (${GEN23_UNREGISTERED_NOTE})`,
  UNKNOWN: "확인 필요",
};

/** 삼성화재 약관 규칙이 등록되어 계산할 수 있는 종형인지 여부 */
export function isGen23VariantRegistered(variant: SamsungGen23Variant): variant is "standard" | "selected2" {
  return variant === "standard" || variant === "selected2";
}

export const GEN23_UNREGISTERED_REASON =
  "이 가입 시기·종형의 약관 규칙이 아직 등록되지 않아 현재 계약의 보험금 계산을 제공하지 않습니다. 증권과 약관으로 확인해주세요.";
