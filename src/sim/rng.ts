/** Seeded PRNG (mulberry32). The state lives inside the game state so saves are reproducible. */
export interface RngHolder {
  rngState: number;
}

export function nextRandom(holder: RngHolder): number {
  let t = (holder.rngState = (holder.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomBetween(holder: RngHolder, min: number, max: number): number {
  return min + (max - min) * nextRandom(holder);
}

export function randomInt(holder: RngHolder, min: number, max: number): number {
  return Math.floor(randomBetween(holder, min, max + 1));
}

export function pick<T>(holder: RngHolder, items: readonly T[]): T {
  const item = items[Math.floor(nextRandom(holder) * items.length)];
  if (item === undefined) throw new Error('pick() on empty list');
  return item;
}
