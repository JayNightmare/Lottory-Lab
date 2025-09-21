import { useCallback, useEffect, useMemo, useState } from 'react';
import { commitSeed, deriveNumbers, loadCommitment, persistCommitment, type Commitment, verifyCommit } from '@lib/rng';

interface GameConfig {
  id: string;
  label: string;
  range: [number, number];
  picks: number;
}

const GAMES: GameConfig[] = [
  { id: 'uk_lotto', label: 'UK Lotto', range: [1, 59], picks: 6 },
  { id: 'euromillions', label: 'EuroMillions (main balls)', range: [1, 50], picks: 5 },
  { id: 'thunderball', label: 'Thunderball', range: [1, 39], picks: 5 }
];

interface GeneratedLine {
  numbers: number[];
}

const birthdaySet = new Set(Array.from({ length: 31 }, (_, i) => i + 1));

const extendSeed = (seed: string, value: number) => {
  const suffix = value.toString(16);
  const normalized = suffix.length % 2 === 0 ? suffix : `0${suffix}`;
  return `${seed}${normalized}`;
};

const hasCommonPatterns = (numbers: number[]): boolean => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const consecutive = sorted.some((n, idx) => idx > 0 && n === sorted[idx - 1] + 1);
  const birthdayHeavy = sorted.filter((n) => birthdaySet.has(n)).length >= Math.ceil(sorted.length * 0.6);
  return consecutive || birthdayHeavy;
};

const makeCsv = (commitment: Commitment | null, lines: GeneratedLine[]) => {
  const header = ['game_id', 'timestamp', 'commit', 'numbers'];
  const rows = lines.map((line) => [commitment?.gameId ?? '', commitment?.ts ?? '', commitment?.commit ?? '', line.numbers.join(' ')]);
  return [header, ...rows].map((row) => row.map((value) => `"${value}"`).join(',')).join('\n');
};

export function NumberGenerator() {
  const [gameId, setGameId] = useState(GAMES[0].id);
  const [linesRequested, setLinesRequested] = useState(1);
  const [avoidCommon, setAvoidCommon] = useState(true);
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [lines, setLines] = useState<GeneratedLine[]>([]);
  const [revealState, setRevealState] = useState<'hidden' | 'revealed'>('hidden');
  const [verification, setVerification] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const config = useMemo(() => GAMES.find((g) => g.id === gameId) ?? GAMES[0], [gameId]);

  useEffect(() => {
    const saved = loadCommitment(gameId);
    if (saved) {
      setCommitment(saved);
    }
  }, [gameId]);

  const handleCommit = useCallback(async () => {
    const newCommit = await commitSeed(gameId);
    persistCommitment(newCommit);
    setCommitment(newCommit);
    setLines([]);
    setRevealState('hidden');
    setVerification('idle');
  }, [gameId]);

  const generateLine = useCallback(
    async (seed: string): Promise<number[]> => {
      let nums = await deriveNumbers(seed, config.picks, config.range[0], config.range[1]);
      if (avoidCommon) {
        let attempts = 0;
        while (hasCommonPatterns(nums) && attempts < 10) {
          const jitterSeed = extendSeed(seed, attempts);
          nums = await deriveNumbers(jitterSeed, config.picks, config.range[0], config.range[1]);
          attempts += 1;
        }
      }
      return nums;
    },
    [config, avoidCommon]
  );

  const handleReveal = useCallback(async () => {
    if (!commitment) return;
    const newLines: GeneratedLine[] = [];
    for (let i = 0; i < linesRequested; i += 1) {
      // Deterministic per line using hex-suffixed counter keeps verification straightforward.
      const seeded = extendSeed(commitment.seed, i);
      const numbers = await generateLine(seeded);
      newLines.push({ numbers });
    }
    setLines(newLines);
    setRevealState('revealed');
    const valid = await verifyCommit(commitment);
    setVerification(valid ? 'valid' : 'invalid');
  }, [commitment, generateLine, linesRequested]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([makeCsv(commitment, lines)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = commitment ? commitment.ts.replace(/[:T]/g, '-').replace(/\..+/, '') : Date.now();
    link.href = url;
    link.download = `lottery-lines-${commitment?.gameId ?? 'unknown'}-${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [commitment, lines]);

  const statusCopy = useMemo(() => {
    if (verification === 'valid') return 'Commitment verified. You can recompute locally to confirm.';
    if (verification === 'invalid') return 'Warning: commitment hash did not verify.';
    return 'Awaiting reveal.';
  }, [verification]);

  return (
    <section aria-live="polite" className="number-generator" data-id="number-generator">
      <header>
        <h2>Provably random lines</h2>
        <p>
          Generate lines with a commit first, reveal once you are ready. Hashes are shown immediately, seeds remain
          local.
        </p>
      </header>
      <div className="results-page-controls">
        <label className="field">
          <span>Game</span>
          <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
            {GAMES.map((game) => (
              <option key={game.id} value={game.id}>
                {game.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Lines</span>
          <input
            type="number"
            min={1}
            max={10}
            value={linesRequested}
            onChange={(event) => setLinesRequested(Number(event.target.value))}
          />
        </label>
        <label className="field" aria-live="polite">
          <span>Collision avoidance</span>
          <div>
            <input
              id="avoid-common"
              type="checkbox"
              checked={avoidCommon}
              onChange={(event) => setAvoidCommon(event.target.checked)}
            />
            <label htmlFor="avoid-common">Avoid birthdays and obvious runs (prize-split mitigation)</label>
          </div>
        </label>
      </div>
      <div className="generator-output">
        <div className="commit-panel" role="status">
          <h3>Commitment</h3>
          {commitment ? (
            <ul className="commit-details">
              <li>
                <span>Commit hash</span>
                <code>{commitment.commit}</code>
              </li>
              <li>
                <span>Timestamp (UTC)</span>
                <time dateTime={commitment.ts}>{commitment.ts}</time>
              </li>
              <li>
                <span>Game ID</span>
                <code>{commitment.gameId}</code>
              </li>
            </ul>
          ) : (
            <p>Generate a commitment to get started.</p>
          )}
          <div className="generator-buttons">
            <button type="button" onClick={handleCommit} className="btn primary">
              New commit
            </button>
            <button type="button" onClick={handleReveal} className="btn secondary" disabled={!commitment}>
              Reveal lines
            </button>
            <button type="button" onClick={handleDownload} className="btn tertiary" disabled={!lines.length}>
              Download CSV
            </button>
          </div>
          <p aria-live="polite">{statusCopy}</p>
        </div>
        <div className="generator-lines">
          {revealState === 'revealed' &&
            lines.map((line, idx) => (
              <div key={idx} className="generator-line">
                <span>Line {idx + 1}</span>
                <strong>{line.numbers.join(', ')}</strong>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

export default NumberGenerator;

