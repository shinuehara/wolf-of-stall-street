import { describe, expect, it } from 'vitest';
import { playBot, summarize, type BotStrategy } from './bots';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

function run(strategy: BotStrategy) {
  return summarize(SEEDS.map((seed) => playBot(seed, strategy)));
}

describe('balance', { timeout: 60_000 }, () => {
  const naive = run('naive');
  const astrologer = run('astrologer');
  const spy = run('spy');

  it('prints a summary', () => {
    console.table({ naive, astrologer, spy });
  });

  it('paying for information makes you climb faster', () => {
    expect(astrologer.avgWeeksToWin).toBeLessThan(naive.avgWeeksToWin);
    expect(spy.avgWeeksToWin).toBeLessThan(astrologer.avgWeeksToWin);
  });

  it('a well-informed run lasts roughly 40 to 90 weeks', () => {
    expect(spy.won).toBeGreaterThan(SEEDS.length * 0.8);
    expect(spy.avgWeeksToWin).toBeGreaterThan(40);
    expect(spy.avgWeeksToWin).toBeLessThan(90);
  });
});
