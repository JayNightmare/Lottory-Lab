import { useMemo, useState } from 'react';
import Charts from './Charts';
import ResultsTable, { type DrawRow } from './ResultsTable';
import { computeAverageGap, computeFrequency, selectRollingWindow, type DrawSummary } from '@lib/stats';

interface DrawRecord extends DrawRow {
  bonus?: number | null;
  jackpot?: number;
  rollover?: boolean;
  source_url?: string;
}

interface GameDataset {
  game: string;
  last_updated_utc: string;
  draws: DrawRecord[];
}

interface ResultsExplorerProps {
  datasets: GameDataset[];
}

const WINDOW_OPTIONS = [25, 50, 100];

function toDrawSummary(draws: DrawRecord[]): DrawSummary[] {
  return draws.map((draw) => ({ date: draw.date, numbers: draw.numbers }));
}

export function ResultsExplorer({ datasets }: ResultsExplorerProps) {
  const [selectedGameId, setSelectedGameId] = useState(datasets[0]?.game ?? 'uk_lotto');
  const [onlyRollovers, setOnlyRollovers] = useState(false);
  const [windowSize, setWindowSize] = useState<number>(50);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const gameDataset = useMemo(
    () => datasets.find((dataset) => dataset.game === selectedGameId) ?? datasets[0],
    [datasets, selectedGameId]
  );

  const filteredDraws: DrawRecord[] = useMemo(() => {
    if (!gameDataset) return [];
    return gameDataset.draws.filter((draw) => {
      if (onlyRollovers && !draw.rollover) return false;
      if (startDate && draw.date < startDate) return false;
      if (endDate && draw.date > endDate) return false;
      return true;
    });
  }, [endDate, gameDataset, onlyRollovers, startDate]);

  const chartData = useMemo(() => {
    if (!filteredDraws.length) {
      return { hotCold: [], gaps: [] };
    }
    const summaries = toDrawSummary(filteredDraws);
    const windowed = selectRollingWindow(summaries, windowSize);
    const rangeMax = Math.max(...windowed.flatMap((item) => item.numbers));
    const rangeMin = Math.min(...windowed.flatMap((item) => item.numbers));
    return {
      hotCold: computeFrequency(windowed, rangeMin, rangeMax),
      gaps: computeAverageGap(windowed, rangeMin, rangeMax)
    };
  }, [filteredDraws, windowSize]);

  const lastUpdated = gameDataset?.last_updated_utc;

  return (
    <section>
      <header>
        <h2>Results explorer</h2>
        {lastUpdated && (
          <p>
            Latest data refresh: <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleString()}</time>
          </p>
        )}
      </header>
      <div className="results-page-controls">
        <label className="field">
          <span>Game</span>
          <select value={selectedGameId} onChange={(event) => setSelectedGameId(event.target.value)}>
            {datasets.map((dataset) => (
              <option key={dataset.game} value={dataset.game}>
                {dataset.game.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Start date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="field">
          <span>End date</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <label className="field">
          <span>Window</span>
          <select value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value))}>
            {WINDOW_OPTIONS.map((size) => (
              <option key={size} value={size}>
                Last {size} draws
              </option>
            ))}
          </select>
        </label>
        <label className="field" aria-live="polite">
          <span>Rollovers only</span>
          <input
            type="checkbox"
            checked={onlyRollovers}
            onChange={(event) => setOnlyRollovers(event.target.checked)}
          />
        </label>
      </div>
      <ResultsTable game={selectedGameId} data={filteredDraws} />
      <div className="cards">
        <Charts data={chartData.hotCold} type="hot-cold" title="Hot and cold numbers" />
        <Charts data={chartData.gaps} type="gaps" title="Average gaps between draws" />
      </div>
      <p className="footnote">
        Charts describe historical draw patterns only. They do not predict future numbers and should not guide
        wagering.
      </p>
    </section>
  );
}

export default ResultsExplorer;
