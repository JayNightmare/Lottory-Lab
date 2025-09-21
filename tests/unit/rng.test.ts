import { describe, expect, it, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import { deriveNumbers, verifyCommit, type Commitment } from '../../src/lib/rng';

const encoder = new TextEncoder();

const hexToBytes = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true
  });
});

describe('rng helpers', () => {
  it('derives sorted numbers within range', async () => {
    const numbers = await deriveNumbers('aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', 6, 1, 59);
    expect(numbers).toHaveLength(6);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
    numbers.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(59);
    });
  });

  it('verifies commitment generated with the same rules', async () => {
    const seed = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const ts = '2025-09-20T12:00:00.000Z';
    const gameId = 'uk_lotto';
    const seedBytes = hexToBytes(seed);
    const tag = encoder.encode(ts + gameId);
    const payload = new Uint8Array(seedBytes.length + tag.length);
    payload.set(seedBytes);
    payload.set(tag, seedBytes.length);
    const hash = new Uint8Array(await webcrypto.subtle.digest('SHA-256', payload));
    const commitment: Commitment = {
      seed,
      ts,
      gameId,
      commit: bytesToHex(hash)
    };
    const result = await verifyCommit(commitment);
    expect(result).toBe(true);
  });
});
