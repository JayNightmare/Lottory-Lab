import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import * as cheerio from 'cheerio';

/**
 * Harvest National Lottery draw history pages and normalise them into JSON assets.
 * Requests are rate-limited by design (single fetch per game) and avoid storing
 * any personal information. Update the user agent contact address before public use.
 */
const BASE_URL = 'https://www.national-lottery.co.uk';

const drawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numbers: z.array(z.number().int().nonnegative()),
  bonus: z.number().int().nonnegative().nullable().optional(),
  extra_numbers: z.array(z.number().int().nonnegative()).optional(),
  extra_label: z.string().optional(),
  jackpot: z.number().int().nonnegative().optional(),
  rollover: z.boolean().optional(),
  source_url: z.string().url().optional()
});

const gameSchema = z.object({
  game: z.string(),
  last_updated_utc: z.string().datetime({ offset: true }),
  draws: z.array(drawSchema).nonempty()
});

type GameConfig = {
  id: 'uk_lotto' | 'euromillions' | 'thunderball';
  url: string;
  containerId: string;
  columns: {
    date: number;
    jackpot: number;
    numbers: number;
    extras?: number;
  };
  extrasMode: 'bonus' | 'all';
  extraLabel?: string;
  limit: number;
};

const GAMES: GameConfig[] = [
  {
    id: 'uk_lotto',
    url: `${BASE_URL}/results/lotto/draw-history`,
    containerId: '#draw_history_lotto',
    columns: { date: 0, jackpot: 1, numbers: 2, extras: 3 },
    extrasMode: 'bonus',
    extraLabel: 'Bonus ball',
    limit: 60
  },
  {
    id: 'euromillions',
    url: `${BASE_URL}/results/euromillions/draw-history`,
    containerId: '#draw_history_euromillions',
    columns: { date: 0, jackpot: 1, numbers: 2, extras: 3 },
    extrasMode: 'all',
    extraLabel: 'Lucky Stars',
    limit: 60
  },
  {
    id: 'thunderball',
    url: `${BASE_URL}/results/thunderball/draw-history`,
    containerId: '#draw_history_thunderball',
    columns: { date: 0, jackpot: 1, numbers: 2, extras: 3 },
    extrasMode: 'bonus',
    extraLabel: 'Thunderball',
    limit: 60
  }
];

const MONTHS: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12'
};

function parseDate(value: string): string | null {
  const cleaned = value.replace(/\u00a0/g, ' ').trim();
  const match = cleaned.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i);
  if (!match) {
    return null;
  }
  const [, , day, monthText, year] = match;
  const month = MONTHS[monthText.slice(0, 3) as keyof typeof MONTHS];
  if (!month) return null;
  const dayPadded = day.padStart(2, '0');
  return `${year}-${month}-${dayPadded}`;
}

function parseCurrency(value: string): number | undefined {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return undefined;
  return Number.parseInt(digits, 10);
}

function parseNumbers(value: string): number[] {
  return (value.match(/\d+/g) ?? []).map((segment) => Number.parseInt(segment, 10));
}

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'LotteryLabBot/0.1 (contact: support@lottery-lab.local; purpose: educational data refresh)'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const html = await response.text();
  return cheerio.load(html);
}

function absoluteUrl(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, BASE_URL).toString();
  } catch (error) {
    return undefined;
  }
}

async function harvestGame(config: GameConfig) {
  const $ = await fetchHtml(config.url);
  const container = $(config.containerId);
  if (!container.length) {
    throw new Error(`Unable to locate results container for ${config.id}`);
  }

  const rows: any[] = [];
  const rowLists = container.find('li.table_row_body ul.list_table.list_table_presentation');

  rowLists.each((_, element) => {
    if (rows.length >= config.limit) {
      return false;
    }
    const row = $(element);

    const getCellText = (index: number) => {
      const cell = row.find('li.table_cell').eq(index);
      const block = cell.find('.table_cell_block');
      const text = (block.text() || cell.text() || '').replace(/\s+/g, ' ').trim();
      return text;
    };

    const dateText = getCellText(config.columns.date);
    const isoDate = parseDate(dateText);
    if (!isoDate) {
      return;
    }

    const jackpotText = getCellText(config.columns.jackpot);
    const numbersText = getCellText(config.columns.numbers);
    const extrasText =
      config.columns.extras !== undefined ? getCellText(config.columns.extras) : '';

    const numbers = parseNumbers(numbersText);
    if (!numbers.length) {
      return;
    }

    const extras = parseNumbers(extrasText);
    let bonus: number | null = null;
    let extraNumbers: number[] | undefined;

    if (config.extrasMode === 'bonus') {
      if (extras.length) {
        [bonus, ...extraNumbers] = extras;
      }
    } else if (config.extrasMode === 'all') {
      if (extras.length) {
        bonus = null;
        extraNumbers = extras;
      }
    }

    const detailHref = row.find("a[id^='draw_details']").attr('href');
    const sourceUrl = absoluteUrl(detailHref) ?? config.url;

    rows.push({
      date: isoDate,
      numbers,
      bonus: bonus ?? null,
      extra_numbers: extraNumbers && extraNumbers.length ? extraNumbers : undefined,
      extra_label: extraNumbers && extraNumbers.length ? config.extraLabel : undefined,
      jackpot: parseCurrency(jackpotText),
      rollover: false,
      source_url: sourceUrl
    });
  });

  return {
    game: config.id,
    last_updated_utc: new Date().toISOString(),
    draws: rows
  };
}

async function writeIfChanged(path: string, contents: string) {
  let existing = '';
  if (existsSync(path)) {
    existing = await readFile(path, 'utf-8');
  }
  if (existing === contents) {
    return false;
  }
  await writeFile(path, contents);
  return true;
}

async function main() {
  const dataDir = join(process.cwd(), 'data');
  let updated = 0;

  for (const game of GAMES) {
    try {
      const dataset = await harvestGame(game);
      const parsed = gameSchema.parse(dataset);
      const outPath = join(dataDir, `${game.id}.json`);
      const serialised = `${JSON.stringify(parsed, null, 2)}\n`;
      const changed = await writeIfChanged(outPath, serialised);
      console.log(`${game.id}: ${changed ? 'updated' : 'no change'}`);
      if (changed) {
        updated += 1;
      }
    } catch (error) {
      console.error(`Error harvesting ${game.id}:`, error instanceof Error ? error.message : error);
    }
  }

  if (updated === 0) {
    console.log('All datasets already up to date.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


