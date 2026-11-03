import { describe, expect, it } from 'vitest';
import { CLASSES, SEASON_LENGTH, STARTING_GOLD, TOP_CLASS } from './data';
import {
  acceptAscension,
  buy,
  consult,
  endWeek,
  expertCost,
  newGame,
  sell,
  setHedge,
  wealth,
} from './game';
import { assetRange } from './assets';

describe('newGame', () => {
  it('starts as a Serf with the starting gold and a forecast for every guild', () => {
    const state = newGame(123);
    expect(state.classIndex).toBe(0);
    expect(state.cash).toBe(STARTING_GOLD);
    expect(Object.keys(state.sectorForecasts)).toHaveLength(8);
    expect(Object.keys(state.companyForecasts)).toHaveLength(24);
    expect(Object.keys(state.assets)).toHaveLength(32);
  });

  it('is deterministic for a given seed', () => {
    const a = newGame(99);
    const b = newGame(99);
    for (let i = 0; i < 10; i++) {
      buy(a, 'bakers', 5);
      buy(b, 'bakers', 5);
      endWeek(a);
      endWeek(b);
    }
    expect(a).toEqual(b);
  });
});

describe('trading', () => {
  it('moves gold between cash and positions', () => {
    const state = newGame(1);
    expect(buy(state, 'bakers', 40).ok).toBe(true);
    expect(state.cash).toBe(60);
    expect(state.positions.bakers?.value).toBe(40);
    expect(sell(state, 'bakers', 15).ok).toBe(true);
    expect(state.cash).toBe(75);
    expect(sell(state, 'bakers', 999).ok).toBe(true);
    expect(state.positions.bakers).toBeUndefined();
    expect(state.cash).toBe(100);
  });

  it('rejects overspending and locked guilds', () => {
    const state = newGame(1);
    expect(buy(state, 'bakers', 500).ok).toBe(false);
    expect(buy(state, 'spices', 10).ok).toBe(false);
    expect(state.cash).toBe(100);
  });

  it('only insures positions you hold', () => {
    const state = newGame(1);
    expect(setHedge(state, 'mines', true).ok).toBe(false);
    buy(state, 'mines', 10);
    expect(setHedge(state, 'mines', true).ok).toBe(true);
  });
});

describe('experts', () => {
  it('charges for advice and records the insight once per week', () => {
    const state = newGame(5);
    const cost = expertCost(state, 'astrologer');
    expect(consult(state, 'astrologer', 'bakers').ok).toBe(true);
    expect(state.cash).toBe(100 - cost);
    expect(consult(state, 'astrologer', 'bakers').ok).toBe(false);
    expect(state.insights).toHaveLength(1);
  });

  it('keeps the spy away from the lower classes', () => {
    const state = newGame(5);
    expect(consult(state, 'spy', 'bakers').ok).toBe(false);
  });

  it('can be asked about a sector or about a single company', () => {
    const state = newGame(5);
    expect(consult(state, 'astrologer', 'bakers').ok).toBe(true);
    expect(consult(state, 'astrologer', 'bakers.harbor').ok).toBe(true);
    expect(consult(state, 'astrologer', 'spices.pepper').ok).toBe(false);
  });

  it('the spy reveals the true band probabilities', () => {
    const state = newGame(5);
    state.classIndex = 2;
    consult(state, 'spy', 'bakers');
    const insight = state.insights[0];
    expect(insight?.expert).toBe('spy');
    if (insight?.expert === 'spy') {
      expect(insight.bands.reduce((s, b) => s + b.p, 0)).toBeCloseTo(1);
    }
  });
});

describe('endWeek', () => {
  it('pays bond interest on idle gold and charges living cost', () => {
    const state = newGame(3);
    endWeek(state);
    const serf = CLASSES[0]!;
    expect(state.cash).toBeCloseTo(100 * (1 + serf.bondRate) - serf.livingCost);
    expect(state.week).toBe(1);
  });

  it('insured positions never move beyond the insured range', () => {
    for (let seed = 0; seed < 200; seed++) {
      const state = newGame(seed);
      buy(state, 'mines', 50);
      setHedge(state, 'mines', true);
      buy(state, 'mines.deep', 20);
      setHedge(state, 'mines.deep', true);
      const basket = assetRange(state, 'mines');
      const company = assetRange(state, 'mines.deep');
      const report = endWeek(state);
      for (const [id, r, amount] of [
        ['mines', basket, 50],
        ['mines.deep', company, 20],
      ] as const) {
        const d = (r.high - r.low) / 4;
        const pct = (report.positionPnl[id]! / amount) * 100;
        expect(pct).toBeGreaterThanOrEqual(r.low + d - 1e-9);
        expect(pct).toBeLessThanOrEqual(r.high - d + 1e-9);
      }
    }
  });

  it('a basket moves as the average of its companies, inside the announced range', () => {
    for (let seed = 0; seed < 100; seed++) {
      const state = newGame(seed);
      const range = assetRange(state, 'bakers');
      const report = endWeek(state);
      const ids = ['bakers.royal', 'bakers.north', 'bakers.harbor'];
      const avg = ids.reduce((s, id) => s + report.marketReturns[id]!, 0) / 3;
      expect(report.marketReturns.bakers).toBeCloseTo(avg);
      expect(avg).toBeGreaterThanOrEqual(range.low - 1e-9);
      expect(avg).toBeLessThanOrEqual(range.high + 1e-9);
    }
  });

  it('company news shifts only that company and reads well', () => {
    const state = newGame(8);
    for (let i = 0; i < 30; i++) endWeek(state);
    for (const e of state.companyEvents) {
      expect(e.headline).not.toMatch(/[{}]/);
      expect(e.headline[0]).toBe(e.headline[0]!.toUpperCase());
    }
  });

  it('drops you a class when a season ends below the floor', () => {
    const state = newGame(3);
    state.classIndex = 2;
    state.cash = 100; // way below the Artisan floor
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.classIndex).toBe(1);
    expect(state.status).toBe('playing');
  });

  it('sends a broke Serf to the dungeon', () => {
    const state = newGame(3);
    state.cash = 10;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.status).toBe('lost');
  });

  it('offers a title when the season ends above the ceiling', () => {
    const state = newGame(3);
    state.cash = 200;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.ascensionOffer).toBe(true);
    const before = wealth(state);
    expect(acceptAscension(state).ok).toBe(true);
    expect(state.classIndex).toBe(1);
    expect(wealth(state)).toBeCloseTo(before - CLASSES[0]!.ascensionFee);
  });

  it('becoming Count wins the game', () => {
    const state = newGame(3);
    state.classIndex = TOP_CLASS - 1;
    state.cash = 30000;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    acceptAscension(state);
    expect(state.status).toBe('won');
  });
});
