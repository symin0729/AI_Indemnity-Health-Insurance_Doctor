import gen1 from "../rules/samsung/gen1-0904-2.json";
import gen2Standard from "../rules/samsung/gen2-1611-7-standard.json";
import gen2Selected2 from "../rules/samsung/gen2-1611-7-selected2.json";
import gen3Standard from "../rules/samsung/gen3-1704-1-standard.json";
import gen3Selected2 from "../rules/samsung/gen3-1704-1-selected2.json";
import gen4 from "../rules/samsung/gen4-2107-1.json";
import gen5 from "../rules/samsung/gen5-2605-1.json";
import type { RuleSet } from "./loadRuleSet";

const ruleSets: Record<string, unknown> = {
  "SAMSUNG_0904_2:default": gen1,
  "SAMSUNG_1611_7:standard": gen2Standard,
  "SAMSUNG_1611_7:selected2": gen2Selected2,
  "SAMSUNG_1704_1:standard": gen3Standard,
  "SAMSUNG_1704_1:selected2": gen3Selected2,
  "SAMSUNG_2107_1:default": gen4,
  "SAMSUNG_2605_1:default": gen5,
};

export const loadProductRuleSet = async (productCode: string, variant = "default"): Promise<RuleSet> => {
  const candidate = ruleSets[`${productCode}:${variant}`] as RuleSet | undefined;
  if (!candidate) throw new Error(`지원하지 않는 상품·종형입니다: ${productCode}/${variant}`);
  return structuredClone(candidate);
};
