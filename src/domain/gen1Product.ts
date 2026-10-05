export type Gen1CompanyChoice = "OTHER_SAMSUNG" | "OTHER_POST" | "OTHER_KB" | "OTHER_HANA" | "OTHER_SHINHAN";
export type Gen1ProductChoice = "SAMSUNG_0904_2" | Gen1CompanyChoice | "OTHER" | "UNKNOWN";

/** 1세대 상품 종형 선택지: 계산 가능한 대표 상품 1개와 그 밖의 보험사(계산 미지원) */
export const GEN1_PRODUCT_LABEL = "OO 보험";
export const GEN1_PRODUCT_INSURER_DISPLAY = "OO 보험";
export const GEN1_PRODUCT_NAME_DISPLAY = "OO 실손 의료 보험";
export const GEN1_UNREGISTERED_NOTE = "약관 규칙이 등록되지 않아 계산 제공하지 않음";
export const GEN1_COMPANY_OPTIONS: ReadonlyArray<{ value: Gen1CompanyChoice; label: string }> = [
  { value: "OTHER_SAMSUNG", label: "삼성화재" },
  { value: "OTHER_POST", label: "우체국보험" },
  { value: "OTHER_KB", label: "KB손해보험" },
  { value: "OTHER_HANA", label: "하나손해보험" },
  { value: "OTHER_SHINHAN", label: "신한라이프" },
];

export function gen1CompanyLabel(choice: Gen1ProductChoice): string | undefined {
  return GEN1_COMPANY_OPTIONS.find((option) => option.value === choice)?.label;
}

/** 대표 상품 외 보험사는 약관 규칙이 없어 계산하지 않는다. */
export function isGen1ProductUnregistered(choice: Gen1ProductChoice): boolean {
  return gen1CompanyLabel(choice) !== undefined || choice === "OTHER";
}

/** 임의로 채우는 상품명 */
export function gen1CompanyProductName(company: string): string {
  return `${company} 실손 의료 보험`;
}

/** 엔진은 0904.2 대표 상품 여부만 구분한다. 그 밖의 보험사 선택은 모두 "OTHER"로 전달한다. */
export function toGen1EngineProduct(choice: Gen1ProductChoice): "SAMSUNG_0904_2" | "OTHER" | "UNKNOWN" {
  if (choice === "SAMSUNG_0904_2" || choice === "UNKNOWN") return choice;
  return "OTHER";
}

/** 1세대 D1 특약 가입 여부(체크박스 2개) ↔ 계산에 넘기는 값 */
export type Gen1D1Coverage = "INJURY" | "DISEASE" | "BOTH" | "NONE" | "UNKNOWN";

export function gen1CoverageFromChecks(injury: boolean, disease: boolean): Exclude<Gen1D1Coverage, "UNKNOWN"> {
  if (injury && disease) return "BOTH";
  if (injury) return "INJURY";
  if (disease) return "DISEASE";
  return "NONE";
}

export function gen1CoverageChecks(coverage: Gen1D1Coverage): { injury: boolean; disease: boolean } {
  return { injury: coverage === "INJURY" || coverage === "BOTH", disease: coverage === "DISEASE" || coverage === "BOTH" };
}
