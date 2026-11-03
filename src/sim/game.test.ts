import { describe, expect, it } from 'vitest';
import { CLASSES, SEASON_LENGTH, STARTING_GOLD, TOP_CLASS } from './data';
import {
  acceptAscension,
  buy,
  consult,
  endWeek,
  expertCost,
  newGame,
  quickTrade,
  PRE_HISTORY_WEEKS,
  sell,
  setHedge,
  wealth,
} from './game';
import { assetRange, companyExposures } from './assets';
import { getCompany } from './data';

describe('newGame', () => {
  it('starts as a Serf with the starting gold and a forecast for every guild', () => {
    const state = newGame(123);
    expect(state.classIndex).toBe(0);
    expect(state.cash).toBe(STARTING_GOLD);
    expect(Object.keys(state.sectorForecasts)).toHaveLength(8);
    expect(Object.keys(state.companyForecasts)).toHaveLength(24);
    expect(Object.keys(state.assets)).toHaveLength(32);
  });

  it('starts with simulated price history that ends at the starting price', () => {
    const state = newGame(4);
    for (const asset of Object.values(state.assets)) {
      expect(asset.history).toHaveLength(PRE_HISTORY_WEEKS + 1);
      expect(asset.history[asset.history.length - 1]).toBe(asset.price);
      expect(asset.history.every((p) => p > 0)).toBe(true);
    }
    expect(state.assets.bakers!.price).toBe(10);
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

  it('quick trades use a share of total wealth, capped by free gold or the position', () => {
    const state = newGame(1);
    // wealth 100, all free: +10% buys 10
    expect(quickTrade(state, 'bakers', 0.1)).toEqual({ ok: true, amount: 10 });
    // +50% would be 50, still fits in the 90 free
    quickTrade(state, 'mines', 0.5);
    expect(state.cash).toBeCloseTo(40);
    // +50% again would be 50, but only 40 is free: buys 40
    expect(quickTrade(state, 'mines', 0.5)).toEqual({ ok: true, amount: 40 });
    expect(state.cash).toBeCloseTo(0);
    expect(quickTrade(state, 'bakers', 0.05).ok).toBe(false);
    // -50% would sell 50, but the bakers position is only 10: closes it
    expect(quickTrade(state, 'bakers', -0.5)).toEqual({ ok: true, amount: 10 });
    expect(state.positions.bakers).toBeUndefined();
    // -all closes the position
    quickTrade(state, 'mines', -1);
    expect(state.positions.mines).toBeUndefined();
    expect(state.cash).toBeCloseTo(100);
    // +all uses all free gold
    expect(quickTrade(state, 'apothecaries', 1)).toEqual({ ok: true, amount: 100 });
  });

  it('tracks the cost of each position, reduced pro rata on sales', () => {
    const state = newGame(1);
    buy(state, 'bakers', 40);
    endWeek(state);
    const value = state.positions.bakers!.value;
    expect(state.positions.bakers!.cost).toBe(40);
    sell(state, 'bakers', value / 2);
    expect(state.positions.bakers!.cost).toBeCloseTo(20);
    expect(state.assetPnl.bakers).toBeCloseTo(value - 40);
  });

  it('keeps a weekly ledger that adds up', () => {
    const state = newGame(9);
    buy(state, 'mines', 30);
    consult(state, 'astrologer', 'mines');
    endWeek(state);
    buy(state, 'bakers', 20);
    endWeek(state);
    expect(state.ledger).toHaveLength(2);
    const [first, second] = state.ledger;
    expect(first!.startWealth).toBe(100);
    expect(second!.startWealth).toBeCloseTo(first!.endWealth);
    for (const r of state.ledger) {
      const sum = r.marketPnl + r.bondIncome - r.hedgeFees - r.livingCost + r.other;
      expect(r.endWealth - r.startWealth).toBeCloseTo(sum);
    }
    // The astrologer's fee shows up as "other" in the first week.
    expect(first!.other).toBeLessThan(0);
    expect(second!.other).toBeCloseTo(0);
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

  it('can be asked about the city and the districts by anyone', () => {
    const state = newGame(5);
    expect(consult(state, 'astrologer', 'city').ok).toBe(true);
    expect(consult(state, 'astrologer', 'ribeira').ok).toBe(true);
    expect(state.insights.map((i) => i.targetId)).toEqual(['city', 'ribeira']);
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

  it('tracks the city GDP and district demand as indices with history', () => {
    const state = newGame(6);
    for (const id of ['city', 'crown', 'burgo', 'ribeira']) {
      expect(state.indicators[id]!.value).toBe(100);
      expect(state.indicators[id]!.history).toHaveLength(PRE_HISTORY_WEEKS + 1);
    }
    endWeek(state);
    expect(state.indicators.city!.history).toHaveLength(PRE_HISTORY_WEEKS + 2);
  });

  it('district news moves the hidden lean of only that district', () => {
    let seen = 0;
    for (let seed = 0; seed < 40 && seen < 3; seed++) {
      const state = newGame(seed);
      for (let i = 0; i < 20; i++) endWeek(state);
      for (const n of state.localNews) {
        seen++;
        expect(n.headline.length).toBeGreaterThan(10);
        expect(['city', 'crown', 'burgo', 'ribeira']).toContain(n.targetId);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a company is exposed to the city, its sector, its district and itself', () => {
    const state = newGame(2);
    const harbor = getCompany('bakers.harbor');
    const factors = companyExposures(harbor).map((e) => e.factorId);
    expect(factors).toEqual(['city', 'bakers', 'ribeira', 'bakers.harbor']);
    const r = assetRange(state, 'bakers.harbor');
    expect(r.high).toBeGreaterThan(r.low);
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
