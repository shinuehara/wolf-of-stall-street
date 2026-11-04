import { describe, expect, it } from 'vitest';
import { playBot, summarize, type BotStrategy } from './bots';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

function run(strategy: BotStrategy) {
  return summarize(SEEDS.map((seed) => playBot(seed, strategy)));
}

describe('balance', { timeout: 300_000 }, () => {
  const bonds = run('bonds');
  const naive = run('naive');
  const spy = run('spy');
  const perks = run('perks');

  it('prints a summary', () => {
    console.table({ bonds, naive, spy, perks });
  });

  it('Crown bonds alone do not pay the cost of living', () => {
    expect(bonds.won).toBe(0);
  });

  it('information beats guessing, and perks beat raw information', () => {
    expect(spy.avgWeeksToWin).toBeLessThan(naive.avgWeeksToWin);
    expect(perks.avgWeeksToWin).toBeLessThan(spy.avgWeeksToWin);
    expect(perks.won).toBeGreaterThan(naive.won);
  });

  it('perks make the ride smoother, but the market still bites', () => {
    expect(perks.avgClassDrops).toBeLessThan(naive.avgClassDrops);
    expect(perks.avgWorstWeek).toBeLessThan(-10);
  });

  it('guessing is not a reliable way to nobility', () => {
    expect(naive.won).toBeLessThan(SEEDS.length * 0.85);
  });
});
