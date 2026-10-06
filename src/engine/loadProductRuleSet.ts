import gen1 from "../rules/samsung/gen1-0904-2.json";
import gen2Standard from "../rules/samsung/gen2-1611-7-standard.json";
import gen2Selected2 from "../rules/samsung/gen2-1611-7-selected2.json";
import gen3Standard from "../rules/samsung/gen3-1704-1-standard.json";
import gen3Selected2 from "../rules/samsung/gen3-1704-1-selected2.json";
import gen4 from "../rules/samsung/gen4-2107-1.json";
import gen5 from "../rules/samsung/gen5-2605-1.json";
import type { RuleSet } from "./loadRuleSet";
import { GEN23_UNREGISTERED_REASON, type SamsungGen23Variant } from "../domain/samsungGen23Variant";

const ruleSets: Record<string, unknown> = {
  "SAMSUNG_0904_2:default": gen1,
  "SAMSUNG_1611_7:standard": gen2Standard,
  "SAMSUNG_1611_7:selected2": gen2Selected2,
  "SAMSUNG_1704_1:standard": gen3Standard,
  "SAMSUNG_1704_1:selected2": gen3Selected2,
  "SAMSUNG_2107_1:default": gen4,
  "SAMSUNG_2605_1:default": gen5,
};

export type SamsungGen23RoutingInput = {
  generation: 2 | 3;
  variant: SamsungGen23Variant;
};

export const resolveSamsungGen23Product = ({
  generation,
  variant,
}: SamsungGen23RoutingInput): {
  productCode: "SAMSUNG_1611_7" | "SAMSUNG_1704_1";
  variant: "standard" | "selected2";
} => {
  if (variant === "UNKNOWN") {
    throw new Error(
      `${generation}세대 상품 종형을 선택해주세요.`
    );
  }

  if (variant === "standard2013" || variant === "selected2013" || variant === "unified2009") {
    throw new Error(GEN23_UNREGISTERED_REASON);
  }

  if (generation === 2) {
    return {
      productCode: "SAMSUNG_1611_7",
      variant,
    };
  }

  return {
    productCode: "SAMSUNG_1704_1",
    variant,
  };
};

export const loadProductRuleSet = async (
  productCode: string,
  variant = "default"
): Promise<RuleSet> => {
  const candidate =
    ruleSets[`${productCode}:${variant}`] as RuleSet | undefined;

  if (!candidate) {
    throw new Error(
      `지원하지 않는 상품·종형입니다: ${productCode}/${variant}`
    );
  }

  return structuredClone(candidate);
};
