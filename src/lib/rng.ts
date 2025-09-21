/**
 * rng.ts
 * - Implements commit-reveal helpers backed by Web Crypto.
 * - Exposes helpers to commit seeds, derive numbers with rejection sampling, and verify commitments.
 */
const encoder = new TextEncoder();

export interface Commitment {
  seed: string;
  ts: string;
  gameId: string;
  commit: string;
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) => {
  if (hex.length % 2 !== 0) throw new Error('Seed hex must have even length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

export async function commitSeed(gameId: string): Promise<Commitment> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const ts = new Date().toISOString();
  const tag = encoder.encode(ts + gameId);
  const payload = new Uint8Array(seed.length + tag.length);
  payload.set(seed);
  payload.set(tag, seed.length);
  const hashBuf = await crypto.subtle.digest('SHA-256', payload);
  const commit = toHex(new Uint8Array(hashBuf));
  return { seed: toHex(seed), ts, gameId, commit };
}

export async function deriveNumbers(seedHex: string, count: number, min: number, max: number): Promise<number[]> {
  if (count <= 0) return [];
  if (min > max) throw new Error('Invalid range');
  const range = max - min + 1;
  const seed = fromHex(seedHex);
  const out = new Set<number>();
  let counter = 0;

  while (out.size < count) {
    const counterBytes = new Uint8Array([counter & 0xff, (counter >> 8) & 0xff, (counter >> 16) & 0xff, (counter >> 24) & 0xff]);
    const input = new Uint8Array(seed.length + counterBytes.length);
    input.set(seed);
    input.set(counterBytes, seed.length);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    const maxUnbiased = Math.floor(256 / range) * range - 1;
    for (const value of hash) {
      if (out.size >= count) break;
      if (value <= maxUnbiased) {
        const mapped = (value % range) + min;
        out.add(mapped);
      }
    }
    counter += 1;
    if (counter > 1e6) {
      throw new Error('Unable to derive numbers without bias.');
    }
  }

  return Array.from(out).sort((a, b) => a - b);
}

export async function verifyCommit(commitment: Commitment): Promise<boolean> {
  const { seed, ts, gameId, commit } = commitment;
  const seedBytes = fromHex(seed);
  const tag = encoder.encode(ts + gameId);
  const payload = new Uint8Array(seedBytes.length + tag.length);
  payload.set(seedBytes);
  payload.set(tag, seedBytes.length);
  const hashBuf = await crypto.subtle.digest('SHA-256', payload);
  const calculated = toHex(new Uint8Array(hashBuf));
  return calculated === commit.toLowerCase();
}

export function localCommitmentStorageKey(gameId: string) {
  return `lottery-lab.commit.${gameId}`;
}

export function persistCommitment(commitment: Commitment) {
  try {
    localStorage.setItem(localCommitmentStorageKey(commitment.gameId), JSON.stringify(commitment));
  } catch (error) {
    console.warn('Unable to persist commitment', error);
  }
}

export function loadCommitment(gameId: string): Commitment | null {
  try {
    const raw = localStorage.getItem(localCommitmentStorageKey(gameId));
    return raw ? (JSON.parse(raw) as Commitment) : null;
  } catch (error) {
    console.warn('Unable to load commitment', error);
    return null;
  }
}
