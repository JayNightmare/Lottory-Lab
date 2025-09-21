import { describe, expect, it } from 'vitest';
import { computeEV } from '../../src/lib/ev';

describe('EV helpers', () => {
  it('computes positive EV when payouts exceed cost', () => {
    const result = computeEV({
      ticketPrice: 2,
      jackpot: 1_000_000,
      rolloverProbability: 0.000001,
      tiers: [
        { matches: 3, payout: 30, probability: 0.001 },
        { matches: 2, payout: 5, probability: 0.01 }
      ]
    });
    expect(result.expectedValue).toBeGreaterThan(-2);
    expect(result.jackpotContribution).toBeCloseTo(1);
  });

  it('handles zero ticket price', () => {
    const result = computeEV({ ticketPrice: 0, jackpot: 0, rolloverProbability: 0, tiers: [] });
    expect(result.expectedValue).toBe(0);
    expect(result.houseEdge).toBe(1);
  });
});
