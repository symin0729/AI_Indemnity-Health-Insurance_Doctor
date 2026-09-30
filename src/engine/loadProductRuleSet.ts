import gen1 from "../rules/samsung/gen1-SAMSUNG_GEN1_PENDING.json";
import gen2 from "../rules/samsung/gen2-SAMSUNG_GEN2_PENDING.json";
import gen3 from "../rules/samsung/gen3-1704-1.json";
import gen4 from "../rules/samsung/gen4-2107-1.json";
import gen5 from "../rules/samsung/gen5-2605-1.json";
import type { RuleSet } from "./loadRuleSet";

const ruleSets: Record<string, unknown> = {
  SAMSUNG_GEN1_PENDING: gen1,
  SAMSUNG_GEN2_PENDING: gen2,
  SAMSUNG_1704_1: gen3,
  SAMSUNG_2107_1: gen4,
  SAMSUNG_2605_1: gen5,
};

export const loadProductRuleSet = async (productCode: string): Promise<RuleSet> => {
  const candidate = ruleSets[productCode] as RuleSet | undefined;
  if (!candidate) throw new Error(`지원하지 않는 상품 코드입니다: ${productCode}`);
  return structuredClone(candidate);
};
