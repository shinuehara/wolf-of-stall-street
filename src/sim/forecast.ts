import type { Band, EventDef, Forecast, ForecastProfile, Sector } from './types';
import { nextRandom, type RngHolder } from './rng';

export const BAND_COUNT = 4;

/** Share of a news shift that shows up in the public range; the rest hides in the lean. */
export const NEWS_VISIBILITY = 0.25;

/** How strongly a news shift tilts the hidden lean (relative to the range width). */
export const NEWS_LEAN = 1;

/** How strongly the hidden lean concentrates probability on one side of the range. */
const LEAN_SHARPNESS = 2.2;

/**
 * Scales every drift (average weekly move). Without information, shares should earn only a
 * little more than Crown bonds, with far more risk; the edge must come from information.
 */
export const DRIFT_SCALE = 0.3;

/** How much the public range centre wanders from week to week, as a share of its width. */
export const CENTER_NOISE = 0.06;

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

export interface Range {
  low: number;
  high: number;
}

/**
 * Insurance narrows the outcome range by a quarter of its width on each side:
 * [-3, +5] becomes [-1, +3].
 */
export function hedgeBounds(r: Range): { floor: number; cap: number } {
  const d = (r.high - r.low) / 4;
  return { floor: r.low + d, cap: r.high - d };
}

export function applyHedge(r: Range, outcome: number): number {
  const { floor, cap } = hedgeBounds(r);
  return Math.min(cap, Math.max(floor, outcome));
}

/** Total effect of active events on a sector, in percentage points. */
export function eventShift(sector: Sector, events: readonly EventDef[]): number {
  return events.reduce((sum, e) => sum + (e.effects[sector] ?? 0), 0);
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
 * Builds next week's forecast for a sector or a company. The herald announces a range
 * centred on the drift, the known news (`shift`) and some noise. Which side of that range
 * is really more likely is a hidden lean, partly driven by the news, so paying for insider
 * knowledge has an edge.
 */
export function generateForecast(
  rng: RngHolder,
  profile: ForecastProfile,
  shift: number,
): Forecast {
  const width = profile.width * (0.8 + 0.4 * nextRandom(rng));
  const center =
    profile.drift * DRIFT_SCALE +
    shift * NEWS_VISIBILITY +
    (nextRandom(rng) - 0.5) * width * CENTER_NOISE;
  const lean = clamp(nextRandom(rng) * 2 - 1 + (shift / width) * NEWS_LEAN, -1, 1);

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
