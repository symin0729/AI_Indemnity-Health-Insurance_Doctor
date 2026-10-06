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

/** 목록 이름(미등록 문구 없음) */
export const GEN23_VARIANT_NAMES: Record<SamsungGen23Variant, string> = {
  standard: "표준형",
  selected2: "선택형Ⅱ",
  standard2013: "표준형",
  selected2013: "선택형",
  unified2009: "단일 구조",
  UNKNOWN: "확인 필요",
};

/**
 * 상품 종형 목록에서 이름 아래에 보여줄 핵심 설명(자기부담 중심).
 * 근거: 손해보험협회 세대별 상품 특징표, 보험연구원 보고서, 삼성화재 1611.7·1704.1 약관.
 */
export function gen23VariantDescription(generation: 2 | 3, variant: SamsungGen23Variant): string {
  const rider = "특약 3종 별도 가입(자기부담 30%)";
  if (generation === 3) {
    if (variant === "standard") return `자기부담 급여 20%·비급여 20% · ${rider}`;
    if (variant === "selected2") return `자기부담 급여 10%·비급여 20% · ${rider}`;
    return "";
  }
  switch (variant) {
    case "standard": return "자기부담 급여 20%·비급여 20%";
    case "selected2": return "자기부담 급여 10%·비급여 20%";
    case "standard2013": return `자기부담 급여 20%·비급여 20% · ${GEN23_UNREGISTERED_NOTE}`;
    case "selected2013": return `자기부담 급여 10%·비급여 10% · ${GEN23_UNREGISTERED_NOTE}`;
    case "unified2009": return `자기부담 급여 10%·비급여 10% · ${GEN23_UNREGISTERED_NOTE}`;
    default: return "";
  }
}
