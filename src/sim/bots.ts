import { COMPANIES, GUILDS, companiesOf, getClass } from './data';
import { BOND_LIQUID, companyExposures, factorForecast } from './assets';
import {
  acceptAscension,
  buy,
  buyPerk,
  consult,
  endWeek,
  expertCost,
  isGuildUnlocked,
  newGame,
  nextPerkLevel,
  perkLevel,
  sell,
} from './game';
import type { ExpertId, GameState, PerkId } from './types';

/**
 * Scripted players used to check game balance. Not part of the game itself. They only use
 * what a player can see: public ranges and what experts told them (noisy, sometimes false).
 *
 * - bonds: everything in the liquid Crown bond.
 * - naive: trusts only the herald's public ranges.
 * - astrologer: also asks the Astrologer, never buys perks.
 * - spy: asks the Spy when allowed (Astrologer before that), never buys perks.
 * - perks: like spy, but buys perks as soon as it can afford them, hedges risky picks.
 */
export type BotStrategy = 'bonds' | 'naive' | 'astrologer' | 'spy' | 'perks';

export interface BotResult {
  status: GameState['status'];
  weeks: number;
  classIndex: number;
  classDrops: number;
  /** Worst week, in % of wealth. */
  worstWeek: number;
  /** Average weekly change of wealth, in %. */
  avgWeek: number;
  /** Average weekly gain from positions alone, in % of wealth. */
  avgMarket: number;
  /** Average weekly spending on experts, perks and titles, in % of wealth. */
  avgOther: number;
}

const MAX_WEEKS = 300;

const PERK_PRIORITY: PerkId[] = ['veteranSpy', 'informants', 'treasurer'];

function center(state: GameState, factorId: string): number {
  const f = factorForecast(state, factorId);
  return (f.low + f.high) / 2;
}

/** What the bot believes a factor will do, from public ranges and expert insights. */
function believedMove(state: GameState, factorId: string): number {
  const f = factorForecast(state, factorId);
  const spy = state.insights.find((i) => i.targetId === factorId && i.expert === 'spy');
  if (spy?.expert === 'spy') return spy.bands.reduce((s, b) => s + b.p * ((b.from + b.to) / 2), 0);
  const astro = state.insights.find((i) => i.targetId === factorId && i.expert === 'astrologer');
  if (astro?.expert === 'astrologer') {
    return center(state, factorId) + (astro.leansUp ? 1 : -1) * (f.high - f.low) * 0.06;
  }
  return center(state, factorId);
}

function believedAsset(state: GameState, assetId: string): number {
  const companies = GUILDS.some((g) => g.id === assetId)
    ? companiesOf(assetId)
    : COMPANIES.filter((c) => c.id === assetId);
  const moves = companies.map((c) =>
    companyExposures(c).reduce((s, e) => s + e.weight * believedMove(state, e.factorId), 0),
  );
  return moves.reduce((a, b) => a + b, 0) / moves.length;
}

export function playBot(seed: number, strategy: BotStrategy): BotResult {
  const state = newGame(seed);
  let classDrops = 0;
  let worstWeek = 0;
  while (state.status === 'playing' && state.week < MAX_WEEKS) {
    for (const id of Object.keys(state.positions)) sell(state, id, Infinity);

    if (strategy === 'perks') {
      for (const id of PERK_PRIORITY) {
        const next = nextPerkLevel(state, id);
        const floor = getClass(state.classIndex).floor;
        const reserve =
          getClass(state.classIndex).livingCost * 8 + getClass(state.classIndex).ascensionFee;
        void floor;
        if (next && state.classIndex >= next.minClass && state.purse - next.cost > reserve) {
          buyPerk(state, id);
        }
      }
    }

    if (strategy !== 'bonds') {
      const guilds = GUILDS.filter((g) => isGuildUnlocked(state, g)).sort(
        (a, b) => believedAsset(state, b.id) - believedAsset(state, a.id),
      );
      if (strategy !== 'naive') {
        const expert: ExpertId = strategy === 'spy' || strategy === 'perks' ? 'spy' : 'astrologer';
        // Five questions a week (eight with perks): the most promising sectors and the best
        // guilds' companies.
        const deep = 1;
        const targets = [
          ...guilds.slice(0, 2).map((g) => g.id),
          ...guilds.slice(0, deep).flatMap((g) => companiesOf(g.id).map((c) => c.id)),
        ];
        // Questions are paid from the manager's purse: keep a few weeks of living costs.
        const reserve = getClass(state.classIndex).livingCost * 4;
        for (const id of targets) {
          if (state.purse - expertCost(state, expert) < reserve) break;
          consult(state, expert, id);
        }
      }

      const candidates = guilds.flatMap((g) => [g.id, ...companiesOf(g.id).map((c) => c.id)]);
      const risky = (id: string) =>
        perkLevel(state, 'informants') > 0 && (state.shockRisk[id] ?? 0) > 0.05;
      const picks = candidates
        .map((id) => [id, believedAsset(state, id)] as const)
        .filter(([id, ev]) => ev > (strategy === 'naive' ? 0.3 : 0.8) && !risky(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, strategy === 'naive' ? 3 : 2);
      const budget = state.cash * 0.85;
      for (const [id] of picks) buy(state, id, budget / picks.length);
    }
    // Idle gold earns nothing: park the rest in the liquid Crown bond.
    if (state.cash > 2) buy(state, BOND_LIQUID, state.cash - 2);

    const before = state.ledger.length;
    const classBefore = state.classIndex;
    endWeek(state);
    const record = state.ledger[before];
    if (record) worstWeek = Math.min(worstWeek, (record.endWealth / record.startWealth - 1) * 100);
    if (state.classIndex < classBefore) classDrops++;
    if (state.ascensionOffer) acceptAscension(state);
  }
  const pctOf = (f: (r: GameState['ledger'][number]) => number) =>
    state.ledger.reduce((s, r) => s + (f(r) / r.startWealth) * 100, 0) / (state.ledger.length || 1);
  return {
    status: state.status,
    weeks: state.week,
    classIndex: state.classIndex,
    classDrops,
    worstWeek,
    avgWeek: pctOf((r) => r.endWealth - r.startWealth),
    avgMarket: pctOf((r) => r.marketPnl),
    avgOther: pctOf((r) => r.other),
  };
}

export function summarize(results: BotResult[]) {
  const won = results.filter((r) => r.status === 'won');
  return {
    won: won.length,
    lost: results.filter((r) => r.status === 'lost').length,
    avgWeeksToWin: Math.round(won.reduce((sum, r) => sum + r.weeks, 0) / (won.length || 1)),
    avgFinalClass: Number(
      (results.reduce((s, r) => s + r.classIndex, 0) / results.length).toFixed(2),
    ),
    avgClassDrops: Number(
      (results.reduce((s, r) => s + r.classDrops, 0) / results.length).toFixed(2),
    ),
    avgWorstWeek: Number(
      (results.reduce((s, r) => s + r.worstWeek, 0) / results.length).toFixed(1),
    ),
    avgWeek: Number((results.reduce((s, r) => s + r.avgWeek, 0) / results.length).toFixed(2)),
    avgMarket: Number((results.reduce((s, r) => s + r.avgMarket, 0) / results.length).toFixed(2)),
    avgOther: Number((results.reduce((s, r) => s + r.avgOther, 0) / results.length).toFixed(2)),
  };
}
