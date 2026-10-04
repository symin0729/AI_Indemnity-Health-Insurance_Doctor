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

  it('fails closed when an evaluation throws', () => {
    const result = calculateBreakEvenBySimulation({
      maxFrequency: 10,
      evaluate: (frequency) => {
        if (frequency === 3) throw new Error('calculation failed');
        return { currentTotalBurden: 100, targetTotalBurden: 90 };
      },
    });

    expect(result).toMatchObject({
      status: 'CONFIRMATION_REQUIRED',
      threshold: null,
      message: '손익분기 탐색 중 계산 오류가 발생해 결과를 확정하지 않습니다.',
    });
    expect(result.points).toHaveLength(3);
    expect(result.warnings).toContain('3회 조건의 총부담 계산 중 오류가 발생했습니다.');
  });

  it('rejects a search range large enough to freeze the UI', () => {
    const evaluate = vi.fn(() => ({ currentTotalBurden: 100, targetTotalBurden: 90 }));
    const result = calculateBreakEvenBySimulation({ maxFrequency: 10_001, evaluate });

    expect(result.status).toBe('CONFIRMATION_REQUIRED');
    expect(evaluate).not.toHaveBeenCalled();
  });
});
