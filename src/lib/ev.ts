/**
 * ev.ts
 * - Functions to calculate expected value and probability helpers for lottery games.
 */
export interface PrizeTier {
  matches: number;
  payout: number;
  probability: number;
}

export interface EvInput {
  ticketPrice: number;
  jackpot: number;
  rolloverProbability: number;
  tiers: PrizeTier[];
}

export interface EvResult {
  expectedValue: number;
  jackpotContribution: number;
  secondaryContribution: number;
  houseEdge: number;
}

export function clampProbability(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

export function computeEV({ ticketPrice, jackpot, rolloverProbability, tiers }: EvInput): EvResult {
  const safeTicket = Math.max(ticketPrice, 0);
  const safeJackpot = Math.max(jackpot, 0);
  const safeRollover = clampProbability(rolloverProbability);

  const jackpotContribution = safeJackpot * safeRollover;
  const secondaryContribution = tiers.reduce((sum, tier) => {
    const prob = clampProbability(tier.probability);
    const payout = Math.max(tier.payout, 0);
    return sum + prob * payout;
  }, 0);

  const gross = jackpotContribution + secondaryContribution;
  const expectedValue = gross - safeTicket;
  const houseEdge = safeTicket > 0 ? 1 - gross / safeTicket : 1;

  return {
    expectedValue,
    jackpotContribution,
    secondaryContribution,
    houseEdge
  };
}
