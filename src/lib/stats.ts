/**
 * stats.ts
 * - Utility functions to compute frequency and gap metrics for lottery draws.
 */
export interface DrawSummary {
  date: string;
  numbers: number[];
}

export interface FrequencyDatum {
  label: string;
  value: number;
}

export function computeFrequency(draws: DrawSummary[], poolMin: number, poolMax: number): FrequencyDatum[] {
  const counts = new Map<number, number>();
  for (let i = poolMin; i <= poolMax; i += 1) {
    counts.set(i, 0);
  }
  draws.forEach((draw) => {
    draw.numbers.forEach((num) => {
      if (counts.has(num)) {
        counts.set(num, (counts.get(num) ?? 0) + 1);
      }
    });
  });
  return Array.from(counts.entries()).map(([label, value]) => ({ label: label.toString(), value }));
}

export function computeAverageGap(draws: DrawSummary[], poolMin: number, poolMax: number): FrequencyDatum[] {
  const lastSeen = new Map<number, number>();
  const gaps = new Map<number, number[]>();

  draws.forEach((draw, index) => {
    draw.numbers.forEach((num) => {
      if (!gaps.has(num)) {
        gaps.set(num, []);
      }
      if (lastSeen.has(num)) {
        const gap = index - (lastSeen.get(num) ?? index);
        if (gap > 0) {
          gaps.get(num)!.push(gap);
        }
      }
      lastSeen.set(num, index);
    });
  });

  const toAvg = (values: number[]) => {
    if (!values.length) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const result: FrequencyDatum[] = [];
  for (let i = poolMin; i <= poolMax; i += 1) {
    result.push({ label: i.toString(), value: Number(toAvg(gaps.get(i) ?? []).toFixed(2)) });
  }
  return result;
}
export function selectRollingWindow(draws: DrawSummary[], count: number): DrawSummary[] {
  if (count <= 0) return [];
  return draws.slice(-count);
}

