import { describe, expect, it, vi } from 'vitest';

import { calculateBreakEvenBySimulation } from '../src/engine/calculateBreakEven';

describe('calculateBreakEvenBySimulation', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01])(
    'rejects an invalid equality tolerance: %s',
    (equalityTolerance) => {
      const evaluate = vi.fn(() => ({
        currentTotalBurden: 100,
        targetTotalBurden: 100,
      }));

      const result = calculateBreakEvenBySimulation({
        equalityTolerance,
        evaluate,
      });

      expect(result.status).toBe('CONFIRMATION_REQUIRED');
      expect(result.points).toEqual([]);
      expect(evaluate).not.toHaveBeenCalled();
    },
  );

  it('detects a reversal that occurs after the former 50-use search boundary', () => {
    const result = calculateBreakEvenBySimulation({
      maxFrequency: 120,
      evaluate: (frequency) => ({
        currentTotalBurden: 1_100_000 + frequency * 10_000,
        targetTotalBurden: 500_000 + frequency * 20_000,
      }),
    });

    expect(result).toMatchObject({
      status: 'AVAILABLE',
      threshold: 60,
      exactTieFrequencies: [60],
    });
    expect(result.points).toHaveLength(121);
  });
});
