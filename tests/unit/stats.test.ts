import { describe, expect, it } from 'vitest';
import { computeAverageGap, computeFrequency, selectRollingWindow } from '../../src/lib/stats';

const sampleDraws = [
  { date: '2025-09-01', numbers: [1, 2, 3, 4, 5] },
  { date: '2025-09-02', numbers: [1, 6, 7, 8, 9] },
  { date: '2025-09-03', numbers: [10, 11, 12, 13, 14] }
];

describe('stats helpers', () => {
  it('computes frequency within range', () => {
    const freq = computeFrequency(sampleDraws, 1, 10);
    const one = freq.find((item) => item.label === '1');
    expect(one?.value).toBe(2);
  });

  it('computes average gap', () => {
    const gaps = computeAverageGap(sampleDraws, 1, 10);
    const val = gaps.find((item) => item.label === '1');
    expect(val?.value).toBe(1);
  });

  it('selects rolling window', () => {
    const window = selectRollingWindow(sampleDraws, 2);
    expect(window).toHaveLength(2);
    expect(window[0].date).toBe('2025-09-02');
  });
});
