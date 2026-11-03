import { GUILDS } from './data';
import { expectedReturn } from './forecast';
import { acceptAscension, buy, consult, endWeek, isGuildUnlocked, newGame, sell } from './game';
import type { GameState } from './types';

/**
 * Scripted players used to check game balance. Not part of the game itself.
 * - naive: trusts only the herald's public range.
 * - astrologer: also asks the Astrologer about the most promising guilds.
 * - spy: asks the Spy (when allowed) about the three most promising guilds.
 */
export type BotStrategy = 'naive' | 'astrologer' | 'spy';

export interface BotResult {
  status: GameState['status'];
  weeks: number;
  classIndex: number;
}

const MAX_WEEKS = 400;

export function playBot(seed: number, strategy: BotStrategy): BotResult {
  const state = newGame(seed);
  while (state.status === 'playing' && state.week < MAX_WEEKS) {
    for (const id of Object.keys(state.positions)) sell(state, id, Infinity);

    const center = (id: string) => {
      const f = state.forecasts[id]!;
      return (f.low + f.high) / 2;
    };
    const candidates = GUILDS.filter((g) => isGuildUnlocked(state, g))
      .map((g) => g.id)
      .sort((a, b) => center(b) - center(a));

    const estimates: [string, number][] = candidates.map((id) => [id, center(id)]);
    if (strategy !== 'naive') {
      for (const entry of estimates.slice(0, 3)) {
        const [id] = entry;
        const f = state.forecasts[id]!;
        if (strategy === 'spy' && consult(state, 'spy', id).ok) {
          entry[1] = expectedReturn(f);
        } else if (consult(state, 'astrologer', id).ok) {
          const insight = state.insights.find((i) => i.guildId === id && i.expert === 'astrologer');
          if (insight?.expert === 'astrologer') {
            entry[1] += (insight.leansUp ? 1 : -1) * (f.high - f.low) * 0.1;
          }
        }
      }
    }

    const picks = estimates
      .filter(([, ev]) => ev > (strategy === 'naive' ? 0.3 : 0.8))
      .sort((a, b) => b[1] - a[1])
      .slice(0, strategy === 'naive' ? 3 : 1);
    const budget = state.cash * 0.9;
    for (const [id] of picks) buy(state, id, budget / picks.length);

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
