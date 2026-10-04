import { describe, expect, it } from 'vitest';

import { applyBenefitLimits } from '../src/engine/applyBenefitLimits';
import { applyDeductibleCap } from '../src/engine/applyDeductibleCap';
import { calculateAnnualPremium } from '../src/engine/calculateAnnualPremium';
import { calculateClaim } from '../src/engine/calculateClaim';

describe('calculation core invariants', () => {
  it('rejects invalid or overflowing monthly premiums', () => {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE]) {
      expect(() => calculateAnnualPremium(value)).toThrow(RangeError);
    }
    expect(calculateAnnualPremium(0)).toBe(0);
    expect(calculateAnnualPremium(50_000)).toBe(600_000);
  });

  it('never raises a deductible above its base amount or the remaining cap', () => {
    for (let base = 0; base <= 100_000; base += 5_000) {
      for (let used = 0; used <= 120_000; used += 10_000) {
        const result = applyDeductibleCap({
          baseDeductible: base,
          capState: { capAmount: 100_000, usedAmount: used, eligible: true },
        });
        expect(result.adjustedDeductible).not.toBeNull();
        expect(result.adjustedDeductible!).toBeGreaterThanOrEqual(0);
        expect(result.adjustedDeductible!).toBeLessThanOrEqual(base);
        expect(result.adjustedDeductible!).toBeLessThanOrEqual(Math.max(0, 100_000 - used));
      }
    }
  });

  it('never pays more than the pre-limit benefit or a remaining amount cap', () => {
    for (let benefit = 0; benefit <= 200_000; benefit += 10_000) {
      const result = applyBenefitLimits({
        preLimitBenefit: benefit,
        limits: [{ id: 'annual', type: 'ANNUAL', amount: 100_000, usedAmount: 30_000 }],
      });
      expect(result.insuranceBenefit).not.toBeNull();
      expect(result.insuranceBenefit!).toBeGreaterThanOrEqual(0);
      expect(result.insuranceBenefit!).toBeLessThanOrEqual(benefit);
      expect(result.insuranceBenefit!).toBeLessThanOrEqual(70_000);
    }
  });

  it('preserves M - I = E + d* + U for calculated claims', () => {
    for (let medicalCost = 0; medicalCost <= 200_000; medicalCost += 20_000) {
      for (let coveredAmount = 0; coveredAmount <= medicalCost; coveredAmount += 20_000) {
        const excludedAmount = medicalCost - coveredAmount;
        const baseDeductible = coveredAmount * 0.2;
        const result = calculateClaim({
          usageId: 'invariant',
          treatmentName: '불변식 검증',
          medicalCost,
          coveredAmount,
          excludedAmount,
          baseDeductible,
          benefitLimitsConfirmed: true,
        });
        expect(result.status).toBe('CALCULATED');
        expect(result.finalMedicalBurden).toBe(
          excludedAmount + result.adjustedDeductible! + result.limitExceededAmount!,
        );
        expect(result.finalMedicalBurden).toBe(medicalCost - result.insuranceBenefit!);
      }
    }
  });
});
