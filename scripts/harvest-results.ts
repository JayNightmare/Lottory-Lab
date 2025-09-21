import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const drawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numbers: z.array(z.number().int().nonnegative()),
  bonus: z.number().int().nonnegative().nullable().optional(),
  jackpot: z.number().int().nonnegative().optional(),
  rollover: z.boolean().optional(),
  source_url: z.string().url().optional()
});

const gameSchema = z.object({
  game: z.string(),
  last_updated_utc: z.string().datetime({ offset: true }),
  draws: z.array(drawSchema).nonempty()
});

const games = ['uk_lotto', 'euromillions', 'thunderball'] as const;

type GameId = (typeof games)[number];

async function fetchDataset(game: GameId) {
  const envKey = `LOTTERY_LAB_${game.toUpperCase()}_URL`;
  const source = process.env[envKey];
  if (!source) {
    console.log(`Skip ${game}: ${envKey} not configured.`);
    return null;
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to download ${game}: ${response.status}`);
  }
  const data = await response.json();
  return gameSchema.parse(data);
}

async function main() {
  const dataDir = join(process.cwd(), 'data');
  let changes = 0;

  for (const game of games) {
    try {
      const dataset = await fetchDataset(game);
      if (!dataset) continue;
      const outPath = join(dataDir, `${game}.json`);
      const serialized = JSON.stringify(dataset, null, 2);
      let existing = '';
      if (existsSync(outPath)) {
        existing = await readFile(outPath, 'utf-8');
      }
      if (existing === serialized) {
        console.log(`No change for ${game}`);
        continue;
      }
      await writeFile(outPath, serialized + '\n');
      console.log(`Updated ${game}`);
      changes += 1;
    } catch (error) {
      console.error(`Error refreshing ${game}:`, error instanceof Error ? error.message : error);
    }
  }

  if (changes === 0) {
    console.log('No datasets updated.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
