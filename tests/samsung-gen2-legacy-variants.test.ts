import { describe, expect, it } from "vitest";
import { calculateSamsungGen2Sample } from "../src/engine/calculateSamsungGen2";
import { resolveSamsungGen23Product } from "../src/engine/loadProductRuleSet";
import { GEN23_UNREGISTERED_REASON, GEN23_VARIANT_LABELS, isGen23VariantRegistered } from "../src/domain/samsungGen23Variant";
import type { MedicalUsage } from "../src/domain/medical";

const usage = { id: "legacy", treatmentName: "검산", careSetting: "INPATIENT", frequency: 1, unitCost: 100000 } as unknown as MedicalUsage;

describe("2세대 약관 규칙 미등록 종형", () => {
  it.each(["standard2013", "selected2013", "unified2009"] as const)("%s는 계산하지 않고 RULE_NOT_VERIFIED를 돌려준다", (variant) => {
    expect(calculateSamsungGen2Sample(variant, usage)).toEqual({ status: "RULE_NOT_VERIFIED", claim: null, reason: GEN23_UNREGISTERED_REASON });
  });

  it.each(["standard2013", "selected2013", "unified2009"] as const)("%s는 룰셋 라우팅에서 미등록 사유로 거절된다", (variant) => {
    expect(() => resolveSamsungGen23Product({ generation: 2, variant })).toThrow(GEN23_UNREGISTERED_REASON);
  });

  it("등록된 종형만 계산 가능으로 판정한다", () => {
    expect(isGen23VariantRegistered("standard")).toBe(true);
    expect(isGen23VariantRegistered("selected2")).toBe(true);
    for (const v of ["standard2013", "selected2013", "unified2009", "UNKNOWN"] as const) expect(isGen23VariantRegistered(v)).toBe(false);
  });

  it("화면 표기에 미등록 사유를 명시한다", () => {
    expect(GEN23_VARIANT_LABELS.standard2013).toBe("표준형 (약관 규칙이 등록되지 않아 계산 제공하지 않음)");
    expect(GEN23_VARIANT_LABELS.selected2013).toBe("선택형 (약관 규칙이 등록되지 않아 계산 제공하지 않음)");
    expect(GEN23_VARIANT_LABELS.unified2009).toBe("단일 구조 (약관 규칙이 등록되지 않아 계산 제공하지 않음)");
  });
});
