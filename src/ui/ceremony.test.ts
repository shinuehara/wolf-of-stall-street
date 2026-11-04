import { describe, expect, it } from 'vitest';
import { seasonMood, seasonSpeech } from './ceremony';
import type { SeasonReview } from '../sim/types';

function review(over: Partial<SeasonReview>): SeasonReview {
  return {
    season: 1,
    classBefore: 0,
    classAfter: 0,
    outcome: 'stay',
    startWealth: 100,
    endWealth: 101,
    startPurse: 10,
    endPurse: 11,
    flows: 0,
    offerLevels: 0,
    weeks: [],
    assetPnl: {},
    ...over,
  };
}

describe('season ceremony', () => {
  it('grades the mood by outcome and season return', () => {
    expect(seasonMood(review({ outcome: 'down' }))).toBe('sad');
    expect(seasonMood(review({ endWealth: 90 }))).toBe('sad');
    expect(seasonMood(review({}))).toBe('neutral');
    expect(seasonMood(review({ endWealth: 120 }))).toBe('happy');
    expect(seasonMood(review({ outcome: 'up-offer' }))).toBe('happy');
  });

  it('the official changes with your standing', () => {
    expect(seasonSpeech(review({ classBefore: 0 })).speaker.name).toBe('O Meirinho');
    expect(seasonSpeech(review({ classBefore: 3 })).speaker.name).toBe('O Escrivão da Guilda');
    expect(seasonSpeech(review({ classBefore: 6 })).speaker.name).toBe('O Camareiro do Castelo');
  });

  it('a noble still gets flattered after a bad season', () => {
    const { mood, line } = seasonSpeech(review({ classBefore: 6, outcome: 'down', season: 2 }));
    expect(mood).toBe('sad');
    expect(line).toMatch(/Vossa Senhoria|meu senhor/);
  });

  it('the first quarter (bonds only) gets the Meirinho at his worst', () => {
    const { speaker, line } = seasonSpeech(review({ season: 1 }));
    expect(speaker.name).toBe('O Meirinho');
    expect(line).toMatch(/imprestável/);
    expect(seasonSpeech(review({ season: 2 })).line).not.toMatch(/imprestável/);
  });
});
