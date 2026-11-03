import type { Band, EventDef, Forecast, GuildDef } from './types';
import { nextRandom, type RngHolder } from './rng';

export const BAND_COUNT = 4;

/** How strongly the hidden lean concentrates probability on one side of the range. */
const LEAN_SHARPNESS = 1.8;

/** The public range split into equal bands, each with its hidden probability. */
export function bands(f: Forecast): Band[] {
  const step = (f.high - f.low) / f.weights.length;
  return f.weights.map((p, i) => ({
    from: f.low + step * i,
    to: i === f.weights.length - 1 ? f.high : f.low + step * (i + 1),
    p,
  }));
}

export function expectedReturn(f: Forecast): number {
  return bands(f).reduce((sum, b) => sum + b.p * ((b.from + b.to) / 2), 0);
}

/** Picks a band by its weight, then a uniform point inside it. Takes two uniforms in [0, 1). */
export function sampleReturn(f: Forecast, uBand: number, uInside: number): number {
  const all = bands(f);
  let acc = 0;
  for (const band of all) {
    acc += band.p;
    if (uBand < acc) return band.from + (band.to - band.from) * uInside;
  }
  const last = all[all.length - 1]!;
  return last.from + (last.to - last.from) * uInside;
}

/**
 * Insurance narrows the outcome range by a quarter of its width on each side:
 * [-3, +5] becomes [-1, +3].
 */
export function hedgeBounds(f: Forecast): { floor: number; cap: number } {
  const d = (f.high - f.low) / 4;
  return { floor: f.low + d, cap: f.high - d };
}

export function applyHedge(f: Forecast, outcome: number): number {
  const { floor, cap } = hedgeBounds(f);
  return Math.min(cap, Math.max(floor, outcome));
}

/** Total effect of active events on a guild's sector, in percentage points. */
export function eventShift(guild: GuildDef, events: readonly EventDef[]): number {
  return events.reduce((sum, e) => sum + (e.effects[guild.sector] ?? 0), 0);
}

/** Turns a lean in [-1, 1] into band weights: negative favours the low bands, positive the high. */
export function weightsFromLean(lean: number, count = BAND_COUNT): number[] {
  const raw = Array.from({ length: count }, (_, i) => {
    const position = i - (count - 1) / 2;
    return Math.exp(LEAN_SHARPNESS * lean * position);
  });
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / total);
}

/**
 * Builds next week's forecast. The herald announces a range centred on the guild's drift,
 * the known events and some noise. Which side of that range is really more likely is a
 * hidden lean, partly driven by events, so paying for insider knowledge has an edge.
 */
export function generateForecast(
  rng: RngHolder,
  guild: GuildDef,
  events: readonly EventDef[],
): Forecast {
  const shift = eventShift(guild, events);
  const width = guild.width * (0.8 + 0.4 * nextRandom(rng));
  const center = guild.drift + shift + (nextRandom(rng) - 0.5) * width * 0.2;
  const lean = clamp(nextRandom(rng) * 2 - 1 + (shift / width) * 2, -1, 1);

  let low = Math.round(center - width / 2);
  let high = Math.round(center + width / 2);
  if (high - low < 2) {
    low -= 1;
    high += 1;
  }
  return { low, high, weights: weightsFromLean(lean) };
}

/** Is the upper half of the range more likely than the lower half? */
export function leansUp(f: Forecast): boolean {
  const half = f.weights.length / 2;
  const upper = f.weights.slice(half).reduce((a, b) => a + b, 0);
  return upper > 0.5;
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}
