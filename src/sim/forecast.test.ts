import { describe, expect, it } from 'vitest';
import {
  applyHedge,
  bands,
  eventShift,
  expectedReturn,
  generateForecast,
  hedgeBounds,
  leansUp,
  sampleReturn,
  weightsFromLean,
} from './forecast';
import { GUILDS, getEvent } from './data';
import type { EventDef, Forecast } from './types';
import { nextRandom } from './rng';

describe('banded forecast', () => {
  const f = { low: -3, high: 5, weights: [0.1, 0.2, 0.3, 0.4] };

  it('splits the public range into equal bands', () => {
    expect(bands(f).map((b) => [b.from, b.to])).toEqual([
      [-3, -1],
      [-1, 1],
      [1, 3],
      [3, 5],
    ]);
  });

  it('computes the expected return from band midpoints', () => {
    expect(expectedReturn(f)).toBeCloseTo(0.1 * -2 + 0.2 * 0 + 0.3 * 2 + 0.4 * 4);
  });

  it('samples stay in range and average out to the expected return', () => {
    const rng = { rngState: 42 };
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const x = sampleReturn(f, nextRandom(rng), nextRandom(rng));
      expect(x).toBeGreaterThanOrEqual(-3);
      expect(x).toBeLessThanOrEqual(5);
      sum += x;
    }
    expect(sum / n).toBeCloseTo(expectedReturn(f), 1);
  });
});

describe('weightsFromLean', () => {
  it('is flat with no lean and tilts with it', () => {
    expect(weightsFromLean(0)).toEqual([0.25, 0.25, 0.25, 0.25]);
    const up = weightsFromLean(1);
    expect(up.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(up[3]!).toBeGreaterThan(up[0]!);
    expect(leansUp({ low: 0, high: 4, weights: up })).toBe(true);
    expect(leansUp({ low: 0, high: 4, weights: weightsFromLean(-0.5) })).toBe(false);
  });
});

describe('insurance', () => {
  const f = { low: -3, high: 5, weights: [0.25, 0.25, 0.25, 0.25] };

  it('turns [-3, +5] into [-1, +3]', () => {
    expect(hedgeBounds(f)).toEqual({ floor: -1, cap: 3 });
  });

  it('clamps outcomes to the insured range', () => {
    expect(applyHedge(f, -3)).toBe(-1);
    expect(applyHedge(f, 5)).toBe(3);
    expect(applyHedge(f, 1.5)).toBe(1.5);
  });
});

describe('generateForecast', () => {
  it('always produces a valid distribution', () => {
    const rng = { rngState: 7 };
    for (let i = 0; i < 500; i++) {
      for (const guild of GUILDS) {
        const f = generateForecast(
          rng,
          guild,
          eventShift(guild.sector, [getEvent('war'), getEvent('dragon')]),
        );
        expect(f.high - f.low).toBeGreaterThanOrEqual(2);
        expect(f.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      }
    }
  });

  it('events push the range in their direction', () => {
    const mines = GUILDS.find((g) => g.id === 'mines')!;
    const average = (events: EventDef[], measure: (f: Forecast) => number) => {
      const rng = { rngState: 1 };
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += measure(generateForecast(rng, mines, eventShift(mines.sector, events)));
      }
      return sum / 2000;
    };
    const center = (f: Forecast) => (f.low + f.high) / 2;
    // The public range moves a little; the true expected return moves a lot more.
    const publicShift = average([getEvent('dragon')], center) - average([], center);
    const trueShift = average([getEvent('dragon')], expectedReturn) - average([], expectedReturn);
    expect(publicShift).toBeLessThan(-2);
    expect(trueShift).toBeLessThan(publicShift - 1);
  });
});
