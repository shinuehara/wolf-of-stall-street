import { GUILDS, SEASON_LENGTH, companiesOf, getClass } from './data';
import { BOND_LIQUID, assetProphecy, isBond } from './assets';
import { PULL } from './forecast';
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
  perkCost,
  perkLevel,
  sell,
  wealth,
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
 * - oracle: knows every true destiny; an upper bound for diagnostics, not a player.
 * - drunk: buys the Drunk drinks and reads every clue right: as a rookie the cause gives the
 *   guild and the direction (bet on the basket); once he says the district, the company.
 *   Trains him as soon as it can (he becomes the confidant). drunkRookie never trains him.
 */
export type BotStrategy =
  'bonds' | 'naive' | 'astrologer' | 'spy' | 'perks' | 'oracle' | 'drunk' | 'drunkRookie';

/**
 * How far from the public middle a perfect reader of the Drunk assumes his company ends the
 * quarter (he hints the direction, not the size). Rumours pick companies at least
 * DRUNK_MIN_DEVIATION away; this is about their typical gap.
 */
const DRUNK_GAP_GUESS = 8;

/** Diagnostics only: the oracle knows every true destiny (an upper bound, not a player). */
let ORACLE = false;

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

/** Where the bot believes an asset ends the quarter: the spy's estimate, a hint, or the public middle. */
function believedTarget(state: GameState, assetId: string): number {
  const p = assetProphecy(state, assetId);
  if (ORACLE) return p.target;
  const middle = (p.low + p.high) / 2;
  // Answers are read against the public range: if it moved since (a fire everyone saw),
  // the estimate moves with it.
  const spy = state.insights.find((i) => i.targetId === assetId && i.expert === 'spy');
  if (spy?.expert === 'spy') {
    const said = spy.bands.reduce((s, b) => s + b.p * ((b.from + b.to) / 2), 0);
    return said + (middle - spy.publicMid);
  }
  // The Drunk's rumours, read perfectly with what his current rank lets you see.
  const rumours = state.insights.filter(
    (i): i is Extract<typeof i, { expert: 'drunk' }> => i.expert === 'drunk' && !i.ramble,
  );
  if (rumours.length > 0) {
    const knowsCompany = perkLevel(state, 'drunkCare') >= 1;
    const sign = (up: boolean) => (up ? 1 : -1);
    const exact = rumours.find((r) => r.targetId === assetId);
    if (exact && knowsCompany) return middle + sign(exact.up) * DRUNK_GAP_GUESS;
    const guild = GUILDS.find((g) => g.id === assetId)?.id ?? assetId.split('.')[0];
    const inGuild = rumours.filter((r) => r.targetId.startsWith(`${guild}.`));
    // A basket moves as the average of its three companies; a rookie reader cannot tell which
    // company it is, so a rumour counts a third for each of them.
    if (inGuild.length > 0 && (GUILDS.some((g) => g.id === assetId) || !knowsCompany)) {
      return middle + inGuild.reduce((sum, r) => sum + sign(r.up), 0) * (DRUNK_GAP_GUESS / 3);
    }
  }
  const astro = state.insights.find((i) => i.targetId === assetId && i.expert === 'astrologer');
  if (astro?.expert === 'astrologer') {
    const share = astro.votes.filter(Boolean).length / astro.votes.length;
    return middle + (share * 2 - 1) * (p.high - p.low) * 0.15;
  }
  return middle;
}

/** What the bot believes an asset does next week: close PULL of the gap to its path. */
function believedAsset(state: GameState, assetId: string): number {
  const p = assetProphecy(state, assetId);
  const done = ((state.week % SEASON_LENGTH) + 1) / SEASON_LENGTH;
  return PULL * (believedTarget(state, assetId) * done - p.progress);
}

export function playBot(seed: number, strategy: BotStrategy): BotResult {
  ORACLE = strategy === 'oracle';
  const state = newGame(seed);
  let classDrops = 0;
  let worstWeek = 0;
  while (state.status === 'playing' && state.week < MAX_WEEKS) {
    // Free the parked gold; stock positions are kept unless the bot changes its mind
    // (the broker charges every trade).
    if (state.positions[BOND_LIQUID]) sell(state, BOND_LIQUID, Infinity);

    if (strategy === 'perks') {
      for (const id of PERK_PRIORITY) {
        const next = nextPerkLevel(state, id);
        const floor = getClass(state.classIndex).floor;
        const reserve =
          getClass(state.classIndex).livingCost * 8 + getClass(state.classIndex).ascensionFee;
        void floor;
        if (
          next &&
          state.classIndex >= next.minClass &&
          state.purse - perkCost(state, id) > reserve
        ) {
          buyPerk(state, id);
        }
      }
    }

    if (strategy === 'drunk') {
      const next = nextPerkLevel(state, 'drunkCare');
      const reserve =
        getClass(state.classIndex).livingCost * 8 + getClass(state.classIndex).ascensionFee;
      if (
        next &&
        state.classIndex >= next.minClass &&
        state.purse - perkCost(state, 'drunkCare') > reserve
      ) {
        buyPerk(state, 'drunkCare');
      }
    }
    if (strategy === 'drunk' || strategy === 'drunkRookie') {
      const reserve = getClass(state.classIndex).livingCost * 4;
      for (let d = 0; d < 3 && state.purse - expertCost(state, 'drunk') > reserve; d++) {
        consult(state, 'drunk', '');
      }
    }

    if (strategy !== 'bonds') {
      const guilds = GUILDS.filter((g) => isGuildUnlocked(state, g)).sort(
        (a, b) => believedAsset(state, b.id) - believedAsset(state, a.id),
      );
      if (strategy !== 'naive' && strategy !== 'drunk' && strategy !== 'drunkRookie') {
        const expert: ExpertId = strategy === 'spy' || strategy === 'perks' ? 'spy' : 'astrologer';
        // Answers last the quarter: a few new questions a week, sectors first, then companies.
        // An answer older than 4 weeks is stale (news moved things): ask again.
        const asked = (id: string) =>
          state.insights.some(
            (i) => i.expert === expert && i.targetId === id && state.week - i.week < 4,
          );
        const targets = [
          ...guilds.map((g) => g.id),
          ...guilds.flatMap((g) => companiesOf(g.id).map((c) => c.id)),
        ]
          .filter((id) => !asked(id))
          .slice(0, 4);
        // Questions are paid from the manager's purse: keep a few weeks of living costs.
        const reserve = getClass(state.classIndex).livingCost * 4;
        for (const id of targets) {
          if (state.purse - expertCost(state, expert) < reserve) break;
          consult(state, expert, id);
        }
      }

      const all = guilds.flatMap((g) => [g.id, ...companiesOf(g.id).map((c) => c.id)]);
      // An informed bot only bets on what it asked about (once it asked about anything).
      const known = all.filter((id) => state.insights.some((i) => i.targetId === id));
      const hinted = all.filter((id) => {
        const p = assetProphecy(state, id);
        return Math.abs(believedTarget(state, id) - (p.low + p.high) / 2) > 1e-6;
      });
      const informed =
        strategy === 'spy' || strategy === 'perks'
          ? known
          : strategy === 'drunk' || strategy === 'drunkRookie'
            ? hinted
            : [];
      const candidates = informed.length > 0 ? informed : all;
      const risky = (id: string) =>
        perkLevel(state, 'informants') > 0 && (state.shockRisk[id] ?? 0) > 0.05;
      // Holding costs nothing; switching pays the broker twice. Keep what still looks good.
      const held = (id: string) => Boolean(state.positions[id]);
      const entry = strategy === 'naive' ? 0.6 : 1;
      const picks = candidates
        .map((id) => [id, believedAsset(state, id)] as const)
        .filter(([id, ev]) => ev > (held(id) ? 0.2 : entry) && !risky(id))
        .sort((a, b) => b[1] - a[1] + (held(b[0]) ? 0.5 : 0) - (held(a[0]) ? 0.5 : 0))
        .slice(0, strategy === 'naive' ? 3 : 2);
      const chosen = new Set(picks.map(([id]) => id));
      for (const id of Object.keys(state.positions)) {
        if (!isBond(id) && !chosen.has(id)) sell(state, id, Infinity);
      }
      // Target: 85% of the fund split among the picks; only trade gaps worth the fee.
      const target = (wealth(state) * 0.85) / Math.max(1, picks.length);
      for (const [id] of picks) {
        const gap = target - (state.positions[id]?.value ?? 0);
        if (gap > target * 0.15) buy(state, id, Math.min(gap, state.cash));
        else if (gap < -target * 0.15) sell(state, id, -gap);
      }
    }
    // Idle gold earns nothing: park the rest in the liquid Crown bond.
    if (state.cash > 2) buy(state, BOND_LIQUID, state.cash - 2);

    const before = state.ledger.length;
    const classBefore = state.classIndex;
    endWeek(state);
    const record = state.ledger[before];
    if (record) {
      const change = (record.endWealth - record.flows) / record.startWealth - 1;
      worstWeek = Math.min(worstWeek, change * 100);
    }
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
    avgWeek: pctOf((r) => r.endWealth - r.flows - r.startWealth),
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
