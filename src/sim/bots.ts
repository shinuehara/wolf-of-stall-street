import { GUILDS, companiesOf } from './data';
import { BOND_LIQUID, assetExpectedReturn, assetRange } from './assets';
import { acceptAscension, buy, consult, endWeek, isGuildUnlocked, newGame, sell } from './game';
import type { GameState, Insight } from './types';

/**
 * Scripted players used to check game balance. Not part of the game itself.
 * - naive: trusts only the herald's public ranges.
 * - astrologer: asks the Astrologer about the two most promising guilds and their companies.
 * - spy: asks the Spy (when allowed) about the two most promising guilds and their companies.
 */
export type BotStrategy = 'naive' | 'astrologer' | 'spy';

export interface BotResult {
  status: GameState['status'];
  weeks: number;
  classIndex: number;
}

const MAX_WEEKS = 400;

function center(state: GameState, assetId: string): number {
  const r = assetRange(state, assetId);
  return (r.low + r.high) / 2;
}

function leanAdjust(insight: Insight | undefined, width: number): number {
  if (!insight || insight.expert === 'spy') return 0;
  return (insight.leansUp ? 1 : -1) * width * 0.1;
}

export function playBot(seed: number, strategy: BotStrategy): BotResult {
  const state = newGame(seed);
  while (state.status === 'playing' && state.week < MAX_WEEKS) {
    for (const id of Object.keys(state.positions)) sell(state, id, Infinity);

    const guilds = GUILDS.filter((g) => isGuildUnlocked(state, g)).sort(
      (a, b) => center(state, b.id) - center(state, a.id),
    );
    const estimates: [string, number][] = [];
    for (const [rank, guild] of guilds.entries()) {
      const companies = companiesOf(guild.id);
      const assets = [guild.id, ...companies.map((c) => c.id)];
      const researched = strategy !== 'naive' && rank < 2;
      if (!researched) {
        for (const id of assets) estimates.push([id, center(state, id)]);
        continue;
      }
      const expert = strategy === 'spy' && state.classIndex >= 1 ? 'spy' : 'astrologer';
      for (const id of assets) consult(state, expert, id);
      if (expert === 'spy') {
        for (const id of assets) estimates.push([id, assetExpectedReturn(state, id)]);
        continue;
      }
      const find = (id: string) =>
        state.insights.find((i) => i.targetId === id && i.expert === expert);
      const sectorAdj = leanAdjust(find(guild.id), guild.width);
      for (const c of companies) {
        estimates.push([
          c.id,
          center(state, c.id) + c.beta * sectorAdj + leanAdjust(find(c.id), c.width),
        ]);
      }
      const avgBeta = companies.reduce((s, c) => s + c.beta, 0) / companies.length;
      estimates.push([guild.id, center(state, guild.id) + avgBeta * sectorAdj]);
    }

    const picks = estimates
      .filter(([, ev]) => ev > (strategy === 'naive' ? 0.3 : 0.8))
      .sort((a, b) => b[1] - a[1])
      .slice(0, strategy === 'naive' ? 3 : 1);
    const budget = state.cash * 0.9;
    for (const [id] of picks) buy(state, id, budget / picks.length);
    // Idle gold earns nothing: park the rest in the liquid Crown bond.
    if (state.cash > 1) buy(state, BOND_LIQUID, state.cash - 1);

    endWeek(state);
    if (state.ascensionOffer) acceptAscension(state);
  }
  return { status: state.status, weeks: state.week, classIndex: state.classIndex };
}

export function summarize(results: BotResult[]) {
  const won = results.filter((r) => r.status === 'won');
  return {
    won: won.length,
    lost: results.filter((r) => r.status === 'lost').length,
    avgWeeksToWin: won.reduce((sum, r) => sum + r.weeks, 0) / (won.length || 1),
  };
}
