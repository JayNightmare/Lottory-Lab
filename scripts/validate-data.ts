import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

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

async function main() {
  const dataDir = join(process.cwd(), 'data');
  const entries = await readdir(dataDir);
  let failures = 0;

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const fullPath = join(dataDir, entry);
    const raw = await readFile(fullPath, 'utf-8');
    try {
      const parsed = JSON.parse(raw);
      gameSchema.parse(parsed);
      console.log(`OK: ${entry} is valid`);
    } catch (error) {
      failures += 1;
      console.error(`ERR: ${entry} failed validation`);
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
