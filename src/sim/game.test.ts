import { describe, expect, it } from 'vitest';
import { bands } from './forecast';
import {
  BOND_LOCK_MULTIPLIER,
  BOND_LOCK_WEEKS,
  CLASSES,
  SEASON_LENGTH,
  STARTING_GOLD,
  STARTING_PURSE,
  TOP_CLASS,
  TRADE_FEE,
  MONTH_LENGTH,
  getItem,
  getPerk,
} from './data';
import {
  acceptAscension,
  ascensionCost,
  hireManager,
  dismissManager,
  acceptInvestor,
  declineInvestor,
  buy,
  consult,
  endWeek,
  expertCost,
  newGame as freshGame,
  buyItem,
  hasShockWarnings,
  hedgeFee,
  expertLevel,
  expertRankName,
  buyPerk,
  perkLevel,
  quickTrade,
  PRE_HISTORY_WEEKS,
  sell,
  sellAll,
  sellAllPreview,
  setHedge,
  targetForecast,
  wealth,
} from './game';
import { BOND_LIQUID, BOND_LOCKED } from './assets';
import { assetProphecy, assetRange, companyExposures } from './assets';
import { DRUNK_MIN_DEVIATION, getCompany } from './data';
import type { GameState } from './types';

/** Most rules are tested with the market already open (after the opening quarter). */
function newGame(seed: number): GameState {
  const state = freshGame(seed);
  state.story = { chapter: 2, queue: [], announced: ['bakers', 'mines', 'apothecaries'] };
  return state;
}

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
  it('moves gold between cash and positions, paying the broker on each trade', () => {
    const state = newGame(1);
    expect(buy(state, 'bakers', 40).ok).toBe(true);
    expect(state.cash).toBe(60);
    expect(state.positions.bakers?.value).toBeCloseTo(40 * (1 - TRADE_FEE));
    expect(sell(state, 'bakers', 15).ok).toBe(true);
    expect(state.cash).toBeCloseTo(60 + 15 * (1 - TRADE_FEE));
    expect(sell(state, 'bakers', 999).ok).toBe(true);
    expect(state.positions.bakers).toBeUndefined();
    // A round trip costs about two broker's fees
    expect(state.cash).toBeCloseTo(100 - 40 * TRADE_FEE * (2 - TRADE_FEE));
    // Crown bonds have no broker
    buy(state, BOND_LIQUID, 50);
    expect(state.positions[BOND_LIQUID]!.value).toBe(50);
  });

  it('rejects overspending and locked guilds', () => {
    const state = newGame(1);
    expect(buy(state, 'bakers', 500).ok).toBe(false);
    expect(buy(state, 'spices', 10).ok).toBe(false);
    expect(state.cash).toBe(100);
  });

  it('quick trades use a share of total wealth, capped by free gold or the position', () => {
    const state = newGame(1);
    // Crown bonds have no broker's fee, so the numbers are exact.
    // wealth 100, all free: +10% buys 10
    expect(quickTrade(state, BOND_LIQUID, 0.1)).toEqual({ ok: true, amount: 10 });
    // +50% would be 50, still fits in the 90 free
    quickTrade(state, 'bakers', 0.5);
    expect(state.cash).toBeCloseTo(40);
    // +50% again would be ~50, but only 40 is free: buys 40
    expect(quickTrade(state, 'bakers.royal', 0.5)).toEqual({ ok: true, amount: 40 });
    expect(state.cash).toBeCloseTo(0);
    expect(quickTrade(state, BOND_LIQUID, 0.05).ok).toBe(false);
    // -50% would sell ~50, but the bond position is only 10: closes it
    expect(quickTrade(state, BOND_LIQUID, -0.5)).toEqual({ ok: true, amount: 10 });
    expect(state.positions[BOND_LIQUID]).toBeUndefined();
    // -all closes the position
    quickTrade(state, 'bakers.royal', -1);
    expect(state.positions['bakers.royal']).toBeUndefined();
  });

  it('tracks the cost of each position, reduced pro rata on sales', () => {
    const state = newGame(1);
    buy(state, 'bakers', 40);
    endWeek(state);
    const value = state.positions.bakers!.value;
    expect(state.positions.bakers!.cost).toBe(40);
    sell(state, 'bakers', value / 2);
    expect(state.positions.bakers!.cost).toBeCloseTo(20);
    // Gains and losses include the broker's fees on the way in and out
    expect(state.assetPnl.bakers).toBeCloseTo(value - 40 - (value / 2) * TRADE_FEE);
  });

  it('keeps a weekly ledger of the fund that adds up', () => {
    const state = newGame(9);
    buy(state, 'bakers.royal', 30);
    consult(state, 'astrologer', 'bakers.royal');
    endWeek(state);
    buy(state, 'bakers', 20);
    endWeek(state);
    expect(state.ledger).toHaveLength(2);
    const [first, second] = state.ledger;
    expect(first!.startWealth).toBe(100);
    expect(second!.startWealth).toBeCloseTo(first!.endWealth);
    for (const r of state.ledger) {
      const sum = r.marketPnl + r.bondIncome - r.hedgeFees - r.fees - r.tradeFees + r.other;
      expect(r.endWealth - r.startWealth).toBeCloseTo(sum);
      // Experts are paid by the manager, not by the investors.
      expect(r.other).toBeCloseTo(0);
      expect(r.fees).toBeGreaterThan(0);
    }
    expect(second!.purse).toBeCloseTo(state.purse);
  });
  it('only insures positions you hold', () => {
    const state = newGame(1);
    expect(setHedge(state, 'bakers.royal', true).ok).toBe(false);
    buy(state, 'bakers.royal', 10);
    expect(setHedge(state, 'bakers.royal', true).ok).toBe(true);
  });
});

describe('experts', () => {
  it("charges advice to the manager's purse; asking again pays again and replaces it", () => {
    const state = newGame(5);
    const cost = expertCost(state, 'astrologer');
    expect(consult(state, 'astrologer', 'bakers').ok).toBe(true);
    expect(state.purse).toBeCloseTo(STARTING_PURSE - cost);
    expect(state.cash).toBe(100);
    expect(consult(state, 'astrologer', 'bakers').ok).toBe(true);
    expect(state.purse).toBeCloseTo(STARTING_PURSE - 2 * cost);
    expect(state.insights).toHaveLength(1);
  });
  it('the spy is open from the start, but his estimate can be off', () => {
    let off = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = newGame(seed);
      expect(consult(state, 'spy', 'bakers').ok).toBe(true);
      const insight = state.insights[0];
      if (insight?.expert !== 'spy') throw new Error('expected a spy insight');
      const truth = bands(state.sectorForecasts.bakers!);
      const error = insight.bands.reduce((s, b, i) => s + Math.abs(b.p - truth[i]!.p), 0);
      if (error > 0.2) off++;
      expect(insight.level).toBe(0);
    }
    expect(off).toBeGreaterThan(5);
  });

  it('experts rank up with their perk', () => {
    const state = newGame(2);
    expect(expertRankName('spy', expertLevel(state, 'spy'))).toBe('Espião Aprendiz');
    state.perks.veteranSpy = 4;
    expect(expertRankName('spy', expertLevel(state, 'spy'))).toBe('Mestre Espião');
    expect(buyPerk(state, 'drunkCare').ok).toBe(true);
    expect(expertRankName('drunk', expertLevel(state, 'drunk'))).toBe('Bêbado de Meio-Dia');
    state.perks.drunkCare = 4;
    expect(expertRankName('drunk', expertLevel(state, 'drunk'))).toBe('Ex-Bêbado');
  });

  it('the Drunk never lies: a drink buys a true rumour or useless rambling', () => {
    let told = 0;
    let rambled = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const state = newGame(seed);
      state.purse = 5;
      expect(consult(state, 'drunk', '').ok).toBe(true);
      expect(state.purse).toBeCloseTo(5 - expertCost(state, 'drunk'));
      const rumour = state.insights[0]!;
      if (rumour.expert !== 'drunk') throw new Error('expected a rumour');
      if (rumour.ramble) {
        rambled++;
        continue;
      }
      told++;
      const p = assetProphecy(state, rumour.targetId);
      const gap = p.target - (p.low + p.high) / 2;
      expect(rumour.up).toBe(gap > 0);
      expect(Math.abs(gap)).toBeGreaterThanOrEqual(DRUNK_MIN_DEVIATION);
    }
    // Rookie: about half of the drinks are wasted
    expect(told).toBeGreaterThan(15);
    expect(rambled).toBeGreaterThan(15);
  });

  it('the Drunk takes three drinks a week and rambles less when trained', () => {
    const state = newGame(3);
    state.purse = 5;
    for (let d = 0; d < 3; d++) expect(consult(state, 'drunk', '').ok).toBe(true);
    expect(consult(state, 'drunk', '').ok).toBe(false);
    let rambles = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const trained = newGame(seed);
      trained.purse = 5;
      trained.perks.drunkCare = 4;
      consult(trained, 'drunk', '');
      const r = trained.insights[0]!;
      if (r.expert === 'drunk' && r.ramble) rambles++;
    }
    expect(rambles).toBeLessThan(15);
  });

  it('the Astrologer reads more stars as she is trained', () => {
    const state = newGame(4);
    state.purse = 50;
    consult(state, 'astrologer', 'bakers');
    const one = state.insights[0]!;
    if (one.expert !== 'astrologer') throw new Error('expected a reading');
    expect(one.votes).toHaveLength(1);
    state.perks.telescope = 4;
    consult(state, 'astrologer', 'mines');
    // Oracle rank: five stars, and the guild map reads the three companies too
    const readings = state.insights.filter((i) => i.expert === 'astrologer');
    expect(readings).toHaveLength(5);
    for (const r of readings.slice(1)) {
      if (r.expert !== 'astrologer') continue;
      expect(r.votes).toHaveLength(5);
      expect(r.leansUp).toBe(r.votes.filter(Boolean).length >= 3);
    }
  });

  it('the Analyst spy breaks an asset down; the Experienced one reports the whole guild', () => {
    const state = newGame(6);
    state.purse = 50;
    state.perks.veteranSpy = 2;
    consult(state, 'spy', 'bakers.royal');
    const analysis = state.insights[0]!;
    if (analysis.expert !== 'spy') throw new Error('expected a spy answer');
    expect(analysis.parts?.map((p) => p.key)).toEqual(['city', 'bakers', 'crown', 'bakers.royal']);
    state.perks.veteranSpy = 3;
    consult(state, 'spy', 'mines');
    const minesTargets = state.insights
      .filter((i) => i.targetId.startsWith('mines'))
      .map((i) => i.targetId);
    expect(minesTargets).toHaveLength(4);
  });

  it('the first expert you train becomes your confidant and trains for half price', () => {
    const state = newGame(2);
    state.classIndex = 4;
    state.purse = 100;
    expect(state.confidant).toBeNull();
    buyPerk(state, 'telescope');
    expect(state.confidant).toBe('astrologer');
    const before = state.purse;
    buyPerk(state, 'telescope');
    expect(before - state.purse).toBeCloseTo(getPerk('telescope').levels[1]!.cost / 2);
    const spyBefore = state.purse;
    buyPerk(state, 'veteranSpy');
    expect(spyBefore - state.purse).toBeCloseTo(getPerk('veteranSpy').levels[0]!.cost);
  });

  it('the Veteran Spy perk makes the estimate sharper', () => {
    const errorWith = (level: number) => {
      let total = 0;
      for (let seed = 0; seed < 60; seed++) {
        const state = newGame(seed);
        state.classIndex = 6;
        state.cash = 10000;
        state.perks.veteranSpy = level;
        consult(state, 'spy', 'bakers');
        const insight = state.insights[0];
        if (insight?.expert !== 'spy') throw new Error('expected a spy insight');
        const truth = bands(targetForecast(state, 'bakers'));
        total += insight.bands.reduce((s, b, i) => s + Math.abs(b.p - truth[i]!.p), 0);
      }
      return total / 60;
    };
    expect(errorWith(3)).toBeLessThan(errorWith(0) / 2);
  });

  it('perks are paid from the purse, level by level, with class requirements', () => {
    const state = newGame(1);
    expect(buyPerk(state, 'scribe').ok).toBe(true);
    expect(state.purse).toBeCloseTo(STARTING_PURSE - getPerk('scribe').levels[0]!.cost);
    expect(state.cash).toBe(100);
    expect(buyPerk(state, 'scribe').ok).toBe(false); // max level
    state.purse = 1;
    expect(buyPerk(state, 'telescope').ok).toBe(false); // purse too thin
    state.purse = 100;
    expect(buyPerk(state, 'veteranSpy').ok).toBe(false); // needs Camponês
    state.classIndex = 1;
    expect(buyPerk(state, 'veteranSpy').ok).toBe(true);
    expect(perkLevel(state, 'veteranSpy')).toBe(1);
    expect(buyPerk(state, 'veteranSpy').ok).toBe(false); // level 2 needs Artesão
  });
  it('insured positions are protected from surprise shocks', () => {
    let shocked = 0;
    for (let seed = 0; seed < 300 && shocked < 5; seed++) {
      const state = newGame(seed);
      for (const c of Object.keys(state.shockRisk)) state.shockRisk[c] = 1;
      buy(state, 'bakers.harbor', 50);
      setHedge(state, 'bakers.harbor', true);
      const r = assetRange(state, 'bakers.harbor');
      const report = endWeek(state);
      if (report.shocks.some((s) => s.companyId === 'bakers.harbor')) shocked++;
      const pct = (report.positionPnl['bakers.harbor']! / 50) * 100;
      const d = (r.high - r.low) / 4;
      expect(pct).toBeGreaterThanOrEqual(r.low + d - 1e-9);
    }
    expect(shocked).toBeGreaterThan(0);
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
  it('idle gold earns nothing; the liquid Crown bond pays the class rate', () => {
    const state = newGame(3);
    const serf = CLASSES[0]!;
    buy(state, BOND_LIQUID, 60);
    const report = endWeek(state);
    const fees = report.managementFee + report.performanceFee;
    expect(state.cash).toBeCloseTo(40 - fees);
    expect(state.positions[BOND_LIQUID]!.value).toBeCloseTo(60 * (1 + serf.bondRate));
    expect(report.bondIncome).toBeCloseTo(60 * serf.bondRate);
    expect(state.week).toBe(1);
    // It can be sold any week.
    expect(sell(state, BOND_LIQUID, Infinity).ok).toBe(true);
  });

  it('the manager earns a management fee and a performance fee on profits', () => {
    const state = newGame(3);
    const serf = CLASSES[0]!;
    buy(state, BOND_LIQUID, 100);
    const report = endWeek(state);
    const fund = 100 * (1 + serf.bondRate);
    expect(report.managementFee).toBeCloseTo(fund * serf.managementFeeRate);
    expect(report.performanceFee).toBeCloseTo(100 * serf.bondRate * serf.performanceFeeRate);
    expect(state.purse).toBeCloseTo(
      STARTING_PURSE + report.managementFee + report.performanceFee - serf.livingCost,
    );
  });

  it('a broke manager goes to the dungeon even if the fund is fine', () => {
    const state = newGame(3);
    state.purse = 0;
    state.cash = 0.01;
    endWeek(state);
    expect(state.status).toBe('lost');
  });
  it('a locked Crown bond pays double, cannot be sold and returns to cash at maturity', () => {
    const state = newGame(3);
    const serf = CLASSES[0]!;
    expect(buy(state, BOND_LOCKED, 50).ok).toBe(true);
    expect(state.lockedBonds).toHaveLength(1);
    expect(state.lockedBonds[0]!.maturesWeek).toBe(BOND_LOCK_WEEKS);
    expect(sell(state, BOND_LOCKED, 10).ok).toBe(false);
    expect(quickTrade(state, BOND_LOCKED, -1).ok).toBe(false);
    expect(setHedge(state, BOND_LIQUID, true).ok).toBe(false);
    expect(wealth(state)).toBeCloseTo(100);
    for (let i = 0; i < BOND_LOCK_WEEKS - 1; i++) endWeek(state);
    expect(state.lockedBonds).toHaveLength(1);
    endWeek(state);
    expect(state.lockedBonds).toHaveLength(0);
    const grown = 50 * (1 + serf.bondRate * BOND_LOCK_MULTIPLIER) ** BOND_LOCK_WEEKS;
    const fees = state.ledger.reduce((s, r) => s + r.fees, 0);
    expect(state.cash).toBeCloseTo(50 + grown - fees);
  });
  it('locked bonds count in the fund for the season review', () => {
    const state = newGame(3);
    buy(state, BOND_LOCKED, 100);
    expect(wealth(state)).toBeCloseTo(100);
    expect(state.cash).toBeCloseTo(0);
  });

  it('insured positions never move beyond the insured range', () => {
    for (let seed = 0; seed < 200; seed++) {
      const state = newGame(seed);
      buy(state, 'bakers.royal', 50);
      setHedge(state, 'bakers.royal', true);
      buy(state, 'bakers.harbor', 20);
      setHedge(state, 'bakers.harbor', true);
      const basket = assetRange(state, 'bakers.royal');
      const company = assetRange(state, 'bakers.harbor');
      const report = endWeek(state);
      for (const [id, r, amount] of [
        ['bakers.royal', basket, 50],
        ['bakers.harbor', company, 20],
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
      if (report.shocks.some((x) => x.companyId.startsWith('bakers'))) continue;
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

  it('builds a season review at the end of each season', () => {
    const state = newGame(4);
    buy(state, 'bakers', 50);
    let review = null;
    for (let i = 0; i < SEASON_LENGTH; i++) review = endWeek(state).seasonReview;
    expect(review).not.toBeNull();
    expect(review!.season).toBe(1);
    expect(review!.weeks).toHaveLength(SEASON_LENGTH);
    expect(review!.startWealth).toBe(100);
    expect(review!.endWealth).toBeCloseTo(wealth(state));
    expect(Object.keys(review!.assetPnl)).toContain('bakers');
    // The next season starts from a fresh snapshot.
    expect(state.seasonStart.wealth).toBeCloseTo(wealth(state));
    expect(endWeek(state).seasonReview).toBeNull();
  });

  it('drops as many classes as the fund requires when a season ends below the floor', () => {
    const one = newGame(3);
    one.classIndex = 2;
    one.cash = CLASSES[1]!.floor + 15; // below the Artisan floor, above the Peasant's
    one.monthStart = one.cash;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(one);
    expect(one.classIndex).toBe(1);

    const two = newGame(3);
    two.classIndex = 2;
    two.cash = 100; // below both the Artisan and the Peasant floors
    two.monthStart = 100;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(two);
    expect(two.classIndex).toBe(0);
    expect(two.status).toBe('playing');
  });

  it('a fall from higher up stops at Serf, even below the floor (last warning)', () => {
    const state = newGame(3);
    state.classIndex = 2;
    state.cash = 40;
    state.monthStart = 40;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.classIndex).toBe(0);
    expect(state.status).toBe('playing');
  });

  it('sends a broke Serf to the dungeon', () => {
    const state = newGame(3);
    state.cash = 10;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.status).toBe('lost');
  });

  it('offers a title when the season ends above the ceiling, paid from the purse', () => {
    const state = newGame(3);
    state.cash = 140;
    state.monthStart = 140;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.ascensionOffer).toBe(1);
    const fund = wealth(state);
    const purse = state.purse;
    expect(acceptAscension(state).ok).toBe(true);
    expect(state.classIndex).toBe(1);
    expect(wealth(state)).toBeCloseTo(fund);
    expect(state.purse).toBeCloseTo(purse - CLASSES[0]!.ascensionFee);
  });
  it('offers one title per ceiling passed and sells as many as the purse pays', () => {
    const state = newGame(3);
    state.cash = CLASSES[2]!.ceiling + 30; // past the Serf, Peasant and Artisan ceilings
    state.monthStart = state.cash;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    expect(state.ascensionOffer).toBe(3);
    expect(ascensionCost(state, 3)).toBeCloseTo(
      CLASSES[0]!.ascensionFee + CLASSES[1]!.ascensionFee + CLASSES[2]!.ascensionFee,
    );
    state.purse = CLASSES[0]!.ascensionFee + CLASSES[1]!.ascensionFee + 0.5;
    expect(acceptAscension(state).ok).toBe(true);
    expect(state.classIndex).toBe(2);
    expect(state.ascensionOffer).toBe(0);
  });

  it('becoming Count wins the game', () => {
    const state = newGame(3);
    state.classIndex = TOP_CLASS - 1;
    state.cash = 30000;
    state.purse = 100;
    for (let i = 0; i < SEASON_LENGTH; i++) endWeek(state);
    acceptAscension(state);
    expect(state.status).toBe('won');
  });
});

describe('monthly visitors', () => {
  it('a visitor comes every 4 weeks, but not on the quarter close, and leaves after a week', () => {
    const state = newGame(12);
    const arrivals: number[] = [];
    for (let i = 0; i < SEASON_LENGTH * 2; i++) {
      const report = endWeek(state);
      if (report.visitorArrived) arrivals.push(state.week);
      if (state.visitor) expect(state.week % MONTH_LENGTH).toBe(0);
    }
    expect(arrivals).toEqual([4, 8, 16, 20]);
  });

  it('merchant goods are paid from the purse and take effect', () => {
    const state = newGame(3);
    state.purse = 20;
    state.visitor = { kind: 'merchant', offers: ['guildSeal', 'sharpQuill', 'routeMap'], sold: [] };
    buy(state, 'bakers.royal', 50);
    setHedge(state, 'bakers.royal', true);
    expect(hedgeFee(state, 'bakers.royal')).toBeGreaterThan(0);
    const fullCost = expertCost(state, 'spy');
    expect(buyItem(state, 'guildSeal').ok).toBe(true);
    expect(buyItem(state, 'sharpQuill').ok).toBe(true);
    expect(buyItem(state, 'sharpQuill').ok).toBe(false);
    expect(buyItem(state, 'stolenLedger').ok).toBe(false); // not on offer
    expect(hedgeFee(state, 'bakers.royal')).toBe(0);
    expect(expertCost(state, 'spy')).toBeCloseTo(fullCost / 2, 1);
    expect(state.purse).toBeCloseTo(20 - getItem('guildSeal').cost - getItem('sharpQuill').cost);
    expect(hasShockWarnings(state)).toBe(false);
    buyItem(state, 'routeMap');
    expect(hasShockWarnings(state)).toBe(true);
  });

  it('the stolen ledger makes the spy exact', () => {
    const state = newGame(5);
    state.purse = 20;
    state.visitor = { kind: 'smuggler', offers: ['stolenLedger', 'crookedScales'], sold: [] };
    buyItem(state, 'stolenLedger');
    consult(state, 'spy', 'bakers');
    const insight = state.insights[0];
    if (insight?.expert !== 'spy') throw new Error('expected a spy insight');
    expect(insight.bands).toEqual(bands(targetForecast(state, 'bakers')));
  });

  it('smuggled goods can get you caught when they wear off', () => {
    let caught = 0;
    let escaped = 0;
    for (let seed = 0; seed < 60; seed++) {
      const state = newGame(seed);
      state.purse = 20;
      state.visitor = { kind: 'smuggler', offers: ['crookedScales', 'stolenLedger'], sold: [] };
      const before = wealth(state);
      buyItem(state, 'crookedScales');
      expect(wealth(state)).toBeCloseTo(before * 1.03);
      const purseBefore = state.purse;
      const report = endWeek(state);
      const outcome = report.smuggling.find((s) => s.item === 'crookedScales');
      expect(outcome).toBeDefined();
      if (outcome!.caught) {
        caught++;
        expect(state.purse).toBeLessThan(purseBefore / 2 + 1);
      } else escaped++;
      expect(state.effects).toHaveLength(0);
    }
    expect(caught).toBeGreaterThan(10);
    expect(escaped).toBeGreaterThan(10);
  });
});

describe('the opening quarter', () => {
  it('starts with the decree and only Crown bonds for sale', () => {
    const state = freshGame(3);
    expect(state.story.chapter).toBe(0);
    expect(state.story.queue).toEqual([{ id: 'intro' }]);
    expect(buy(state, 'bakers', 10).ok).toBe(false);
    expect(consult(state, 'spy', 'city').ok).toBe(false);
    expect(buy(state, BOND_LIQUID, 60).ok).toBe(true);
    expect(buy(state, BOND_LOCKED, 40).ok).toBe(true);
  });

  it('no visitors in the first quarter; the bakers open after it with the influencer', () => {
    const state = freshGame(3);
    buy(state, BOND_LIQUID, 100);
    for (let w = 0; w < SEASON_LENGTH - 1; w++) {
      expect(endWeek(state).visitorArrived ?? null).toBeNull();
    }
    const report = endWeek(state);
    expect(report.seasonReview?.season).toBe(1);
    expect(state.classIndex).toBe(0);
    expect(state.story.chapter).toBe(1);
    expect(state.story.queue).toEqual([{ id: 'intro' }, { id: 'influencer' }]);
    sell(state, BOND_LIQUID, 20);
    expect(buy(state, 'bakers', 5).ok).toBe(true);
    expect(buy(state, 'bakers.royal', 5).ok).toBe(true);
    // Mines and apothecaries open one quarter later
    expect(buy(state, 'mines', 5).ok).toBe(false);
    for (let w = 0; w < SEASON_LENGTH; w++) endWeek(state);
    expect(state.story.chapter).toBe(2);
    expect(state.story.queue.at(-1)).toEqual({ id: 'trend', guilds: ['mines', 'apothecaries'] });
    if (state.cash < 5) sell(state, BOND_LIQUID, 5);
    expect(buy(state, 'mines', 5).ok).toBe(true);
  });
});

describe('investors', () => {
  it('a good month brings deposits and a bad one withdrawals, kept apart from returns', () => {
    const good = newGame(8);
    good.monthStart = 80; // the fund "grew" 25% this month
    for (let w = 0; w < MONTH_LENGTH; w++) endWeek(good);
    const goodFlows = good.ledger.reduce((s, r) => s + r.flows, 0);
    expect(goodFlows).toBeGreaterThan(0);

    const bad = newGame(8);
    bad.monthStart = 130;
    for (let w = 0; w < MONTH_LENGTH; w++) endWeek(bad);
    const badFlows = bad.ledger.reduce((s, r) => s + r.flows, 0);
    expect(badFlows).toBeLessThan(0);
    expect(badFlows).toBeGreaterThanOrEqual(-0.16 * 130);
    for (const r of [...good.ledger, ...bad.ledger]) expect(Math.abs(r.other)).toBeLessThan(1e-6);
  });

  it('the opening quarter has no investor flows or offers', () => {
    const state = freshGame(5);
    buy(state, BOND_LIQUID, 100);
    for (let w = 0; w < SEASON_LENGTH - 1; w++) endWeek(state);
    expect(state.ledger.every((r) => r.flows === 0)).toBe(true);
    expect(state.investorOffer).toBeNull();
  });

  it('accepting an offer adds to the fund; declining or waiting a week drops it', () => {
    const state = newGame(2);
    state.investorOffer = { kind: 'widow', amount: 15 };
    expect(acceptInvestor(state).ok).toBe(true);
    expect(wealth(state)).toBeCloseTo(115);
    expect(state.riskyDeposits).toHaveLength(0);
    state.investorOffer = { kind: 'abbot', amount: 20 };
    expect(declineInvestor(state).ok).toBe(true);
    expect(acceptInvestor(state).ok).toBe(false);
  });

  it('militia money is confiscated with a fine when traced', () => {
    let caught = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = newGame(seed);
      state.investorOffer = { kind: 'militia', amount: 35 };
      acceptInvestor(state);
      expect(state.riskyDeposits[0]?.dirty).toBe(true);
      for (let w = 0; w < 12 && state.status === 'playing'; w++) {
        const purse = state.purse;
        const report = endWeek(state);
        const hit = report.confiscations[0];
        if (hit) {
          caught++;
          expect(hit.amount).toBeCloseTo(35);
          expect(hit.fine).toBeGreaterThan(0);
          expect(state.purse).toBeLessThan(purse);
        }
      }
      expect(state.riskyDeposits).toHaveLength(0);
    }
    // 5% a week for 12 weeks: about 46% of the games
    expect(caught).toBeGreaterThan(8);
    expect(caught).toBeLessThan(32);
  });

  it('each guild opened by a promotion gets its own influencer video', () => {
    const state = newGame(4);
    state.ascensionOffer = 1;
    state.purse = 50;
    acceptAscension(state);
    expect(state.story.queue).toEqual([{ id: 'trend', guilds: ['changers', 'fair'] }]);
  });
});

describe('hired managers', () => {
  it('need the class and a signing fee, then invest the money handed to them', () => {
    const state = newGame(6);
    expect(hireManager(state, 'prudencio').ok).toBe(false); // Serf
    state.classIndex = 2;
    state.purse = 20;
    expect(hireManager(state, 'prudencio').ok).toBe(true);
    expect(state.purse).toBeCloseTo(15);
    expect(buy(state, 'mgr.prudencio', 50).ok).toBe(true);
    expect(setHedge(state, 'mgr.prudencio', true).ok).toBe(false);
    const report = endWeek(state);
    expect(report.managerPicks.prudencio!.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1);
    expect(report.positionPnl['mgr.prudencio']).toBeDefined();
    expect(Math.abs(state.ledger.at(-1)!.other)).toBeLessThan(1e-6);
    const before = state.cash + state.positions['mgr.prudencio']!.value;
    expect(dismissManager(state, 'prudencio').ok).toBe(true);
    expect(state.positions['mgr.prudencio']).toBeUndefined();
    expect(state.cash).toBeCloseTo(before);
  });
});

describe('the quarter prophecy', () => {
  it('every factor gets a destiny inside its public quarter range, kept all quarter', () => {
    const state = newGame(12);
    const p = state.prophecies.bakers!;
    expect(p.target).toBeGreaterThanOrEqual(p.low);
    expect(p.target).toBeLessThanOrEqual(p.high);
    const target = p.target;
    endWeek(state);
    // Same quarter: same prophecy (unless news moved it), progress follows the moves
    expect(state.prophecies.bakers!.low).toBeCloseTo(p.low, 0);
    expect(Math.abs(state.prophecies.bakers!.target - target)).toBeLessThan(10);
  });

  it('prices are pulled towards the destiny: the quarter ends near it on average', () => {
    let error = 0;
    let spread = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = newGame(seed);
      state.events = [];
      state.companyEvents = [];
      state.localNews = [];
      const start = { ...state.prophecies.bakers! };
      for (let w = 0; w < SEASON_LENGTH - 1; w++) endWeek(state);
      const p = state.prophecies.bakers!;
      error += Math.abs(p.progress - p.target);
      spread += Math.abs(start.target - (start.low + start.high) / 2);
    }
    // Knowing the destiny beats knowing only the public range
    expect(error).toBeLessThan(spread);
  });

  it('expert answers last the whole quarter and are cleared when a new one starts', () => {
    const state = newGame(4);
    state.purse = 50;
    expect(consult(state, 'spy', 'bakers').ok).toBe(true);
    endWeek(state);
    expect(state.insights).toHaveLength(1);
    expect(state.insights[0]!.week).toBe(0);
    for (let w = 1; w < SEASON_LENGTH; w++) endWeek(state);
    expect(state.insights).toHaveLength(0);
  });
});

describe('selling everything', () => {
  it('turns every position into free gold, paying the broker; locked bonds stay', () => {
    const state = newGame(7);
    buy(state, 'bakers', 30);
    buy(state, BOND_LIQUID, 20);
    buy(state, BOND_LOCKED, 10);
    const preview = sellAllPreview(state);
    expect(preview.count).toBe(2);
    expect(sellAll(state).ok).toBe(true);
    expect(Object.keys(state.positions)).toHaveLength(0);
    expect(state.lockedBonds).toHaveLength(1);
    expect(state.cash).toBeCloseTo(40 + preview.amount - preview.fees);
    expect(sellAll(state).ok).toBe(false);
  });
});
