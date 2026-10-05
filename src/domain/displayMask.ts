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

/**
 * 보험사·상품명은 두 가지로 나뉜다.
 *  - 입력 이름(label): 사용자가 화면에 입력한 이름. 화면 표시용이며 모든 세대에서 같은 칸에 입력한다.
 *  - 계산용 값(insurer/productName): 계산 엔진이 상품을 구분하는 값.
 *      · 2세대 이후: 삼성화재 약관 상품으로 고정
 *      · 1세대 대표 상품(OO 보험): 삼성 0904.2로 고정
 *      · 1세대 그 밖의 보험사: 입력한 이름 그대로 (계산 미지원 상품)
 */
const GEN1_REPRESENTATIVE_INSURER = "삼성화재";
const GEN1_REPRESENTATIVE_PRODUCT = "삼성 올라이프 100세 건강파트너보험(0904.2)";

type NameInput = { generation: number; gen1Product?: Gen1ProductChoice };

function isRepresentative({ generation, gen1Product }: NameInput): boolean {
  return generation === 1 && gen1Product === "SAMSUNG_0904_2";
}

/** 입력한 이름이 OO(표시용 대체 이름)로 보이는 경우인지: 1세대 외, 1세대 대표 상품 */
export function usesPlaceholderNames(input: NameInput): boolean {
  return input.generation !== 1 || isRepresentative(input);
}

/** 계약에 저장할 계산용 보험사·상품명과 표시용 이름 */
export function resolveContractNames(
  input: NameInput & { insurerInput: string; productInput: string },
): { insurer: string; productName: string; insurerLabel?: string; productLabel?: string } {
  const insurerLabel = input.insurerInput.trim() || undefined;
  const productLabel = input.productInput.trim() || undefined;
  if (input.generation !== 1) {
    return { insurer: INTERNAL_INSURER, productName: internalProductName(input.generation), insurerLabel, productLabel };
  }
  if (isRepresentative(input)) {
    return { insurer: GEN1_REPRESENTATIVE_INSURER, productName: GEN1_REPRESENTATIVE_PRODUCT, insurerLabel, productLabel };
  }
  return { insurer: insurerLabel ?? "", productName: productLabel ?? "", insurerLabel, productLabel };
}

/** 화면(확인 화면 등)에 보여줄 이름: 입력한 이름, 없으면 OO(1세대 그 밖의 보험사는 계산용 값) */
export function displayInsurer(input: NameInput, insurer: string, label?: string): string {
  if (input.generation !== 1) return label?.trim() || MASKED_INSURER;
  return isRepresentative(input) ? label?.trim() || GEN1_PRODUCT_INSURER_DISPLAY : label?.trim() || insurer;
}

export function displayProductName(input: NameInput, productName: string, label?: string): string {
  if (input.generation !== 1) return label?.trim() || MASKED_PRODUCT_NAME;
  return isRepresentative(input) ? label?.trim() || GEN1_PRODUCT_NAME_DISPLAY : label?.trim() || productName;
}
