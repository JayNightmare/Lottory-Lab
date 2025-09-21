import type { FC } from 'react';
import { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import classNames from 'classnames';

export interface DrawRow {
  date: string;
  numbers: number[];
  bonus?: number | null;
  jackpot?: number;
  rollover?: boolean;
  source_url?: string;
}

interface ResultsTableProps {
  data: DrawRow[];
  game: string;
}

const ROW_HEIGHT = 56;

const formatJackpot = (value?: number) => {
  if (typeof value !== 'number') return 'â€”';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
};

const TableRow: FC<ListChildComponentProps<DrawRow[]>> = memo(({ index, style, data }) => {
  const row = data[index];
  return (
    <div
      style={style}
      className={classNames('table-row', {
        'table-row--rollover': row.rollover
      })}
      role="row"
    >
      <span className="cell" role="cell">
        <time dateTime={row.date}>{row.date}</time>
      </span>
      <span className="cell" role="cell">
        {row.numbers.join(', ')}
        {row.bonus != null && <span className="bonus"> +{row.bonus}</span>}
      </span>
      <span className="cell" role="cell">{formatJackpot(row.jackpot)}</span>
      <span className="cell" role="cell">{row.rollover ? 'Yes' : 'No'}</span>
      <span className="cell" role="cell">
        {row.source_url ? (
          <a href={row.source_url} target="_blank" rel="noreferrer">
            Verify
          </a>
        ) : (
          'â€”'
        )}
      </span>
    </div>
  );
});

TableRow.displayName = 'TableRow';

export const ResultsTable: FC<ResultsTableProps> = ({ data, game }) => {
  const items = useMemo(() => data ?? [], [data]);

  if (!items.length) {
    return (
      <section className="results-table" data-id="results-table">
        <header>
          <h3>{game} draws</h3>
        </header>
        <p role="status">No draws match your filters yet.</p>
      </section>
    );
  }

  return (
    <section className="results-table" data-id="results-table">
      <header>
        <h3>{game} draws</h3>
        <p>Showing {items.length} draws. Rollover rows are highlighted.</p>
      </header>
      <div className="table" role="table" aria-label={game + ' draw history'}>
        <div className="table-head" role="rowgroup">
          <div className="table-row head" role="row">
            <span className="cell" role="columnheader">Date</span>
            <span className="cell" role="columnheader">Numbers</span>
            <span className="cell" role="columnheader">Jackpot</span>
            <span className="cell" role="columnheader">Rollover</span>
            <span className="cell" role="columnheader">Source</span>
          </div>
        </div>
        <div className="table-body" role="rowgroup">
          <List height={320} itemCount={items.length} itemSize={ROW_HEIGHT} width="100%" itemData={items}>
            {TableRow}
          </List>
        </div>
      </div>
    </section>
  );
};

export default ResultsTable;

