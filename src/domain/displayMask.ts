import { GEN1_PRODUCT_INSURER_DISPLAY, GEN1_PRODUCT_NAME_DISPLAY, type Gen1ProductChoice } from "./gen1Product";

/** 1세대를 제외한 모든 화면에서 보험사·상품명은 실제 이름 대신 이 값으로 표시한다. */
export const MASKED_INSURER = "OO 보험";
export const MASKED_PRODUCT_NAME = "OO 실손의료보험";

/** 계산 엔진은 삼성화재 계약만 지원하므로, 1세대 외에는 내부 값을 이 이름으로 고정한다. */
export const INTERNAL_INSURER = "삼성화재";
const INTERNAL_PRODUCT_CODES: Record<number, string> = { 2: "1611.7", 3: "1704.1", 4: "2107.1", 5: "2605.1" };

export function internalProductName(generation: number): string {
  return `무배당 삼성화재 실손의료비보험(${INTERNAL_PRODUCT_CODES[generation] ?? ""})`;
}

type DisplayInput = { generation: number; gen1Product?: Gen1ProductChoice };

function isMasked({ generation, gen1Product }: DisplayInput): boolean {
  return generation !== 1 || gen1Product === "SAMSUNG_0904_2";
}

/** 1세대 외에는 사용자가 입력한 표시용 이름(없으면 OO)을, 1세대는 선택한 보험사 이름을 보여준다. */
export function displayInsurer(input: DisplayInput, insurer: string, label?: string): string {
  if (input.generation !== 1) return label?.trim() || MASKED_INSURER;
  return isMasked(input) ? GEN1_PRODUCT_INSURER_DISPLAY : insurer;
}

export function displayProductName(input: DisplayInput, productName: string, label?: string): string {
  if (input.generation !== 1) return label?.trim() || MASKED_PRODUCT_NAME;
  return isMasked(input) ? GEN1_PRODUCT_NAME_DISPLAY : productName;
}
