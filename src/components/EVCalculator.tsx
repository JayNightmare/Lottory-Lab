import { useMemo, useState } from 'react';
import { clampProbability, computeEV, type EvResult } from '@lib/ev';

interface TierInput {
  id: number;
  matches: number;
  payout: number;
  probability: number;
}

const DEFAULT_TIERS: TierInput[] = [
  { id: 1, matches: 5, payout: 100000, probability: 0.00000032 },
  { id: 2, matches: 4, payout: 140, probability: 0.000013 },
  { id: 3, matches: 3, payout: 10, probability: 0.00096 }
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

export function EVCalculator() {
  const [ticketPrice, setTicketPrice] = useState(2);
  const [jackpot, setJackpot] = useState(2000000);
  const [rolloverProbability, setRolloverProbability] = useState(0.0000000715);
  const [tiers, setTiers] = useState<TierInput[]>(DEFAULT_TIERS);

  const result: EvResult = useMemo(
    () =>
      computeEV({
        ticketPrice,
        jackpot,
        rolloverProbability,
        tiers: tiers.map((tier) => ({ matches: tier.matches, payout: tier.payout, probability: tier.probability }))
      }),
    [jackpot, rolloverProbability, ticketPrice, tiers]
  );

  return (
    <section className="ev-calculator" aria-live="polite" data-id="ev-calculator">
      <header>
        <h2>Odds & Expected Value Tutor</h2>
        <p>
          Adjust inputs to see how jackpot size, rollover probability, and secondary prizes influence your expected
          value.
        </p>
      </header>
      <div className="results-page-controls">
        <label className="field">
          <span>Ticket price (GBP)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={ticketPrice}
            onChange={(event) => setTicketPrice(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Jackpot (GBP)</span>
          <input type="number" min={0} value={jackpot} onChange={(event) => setJackpot(Number(event.target.value))} />
        </label>
        <label className="field">
          <span>Jackpot probability</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.0000000001}
            value={rolloverProbability}
            onChange={(event) => setRolloverProbability(clampProbability(Number(event.target.value)))}
          />
        </label>
      </div>
      <div className="cards">
        <div className="card">
          <h3>Expected value</h3>
          <p>{formatCurrency(result.expectedValue)}</p>
        </div>
        <div className="card">
          <h3>Jackpot contribution</h3>
          <p>{formatCurrency(result.jackpotContribution)}</p>
        </div>
        <div className="card">
          <h3>Secondary contribution</h3>
          <p>{formatCurrency(result.secondaryContribution)}</p>
        </div>
        <div className="card">
          <h3>House edge</h3>
          <p>{formatPercent(result.houseEdge)}</p>
        </div>
      </div>
      <section aria-labelledby="secondary-tiers">
        <h3 id="secondary-tiers">Secondary prize tiers</h3>
        <p>Adjust probabilities and payouts to see how lower tiers influence EV.</p>
        <div className="generator-lines">
          {tiers.map((tier, index) => (
            <div key={tier.id} className="generator-line">
              <div>
                <p>Matches: {tier.matches}</p>
                <label>
                  Payout
                  <input
                    type="number"
                    min={0}
                    value={tier.payout}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setTiers((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, payout: value } : item))
                      );
                    }}
                  />
                </label>
              </div>
              <div>
                <label>
                  Probability
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.0000001}
                    value={tier.probability}
                    onChange={(event) => {
                      const value = clampProbability(Number(event.target.value));
                      setTiers((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, probability: value } : item))
                      );
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="footnote">EV is an expectation over a long horizon and not financial advice.</p>
    </section>
  );
}

export default EVCalculator;
