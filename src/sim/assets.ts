import { GUILDS, companiesOf, getCompany, getGuild } from './data';
import { expectedReturn, type Range } from './forecast';
import type { CompanyDef, GameState, GuildDef } from './types';

/**
 * Tradeable assets: every guild's basket (id = guild id) and every company (id = company id).
 * A company moves `beta x sector move + its own move`; a basket moves as the average of its
 * companies.
 */
export const ASSET_IDS: readonly string[] = GUILDS.flatMap((g) => [
  g.id,
  ...companiesOf(g.id).map((c) => c.id),
]);

export function isBasket(assetId: string): boolean {
  return GUILDS.some((g) => g.id === assetId);
}

export function guildOfAsset(assetId: string): GuildDef {
  return isBasket(assetId) ? getGuild(assetId) : getGuild(getCompany(assetId).guildId);
}

/** The companies whose moves make up this asset (one for a company, all of them for a basket). */
export function componentsOf(assetId: string): CompanyDef[] {
  return isBasket(assetId) ? companiesOf(assetId) : [getCompany(assetId)];
}

export function assetName(assetId: string): string {
  return isBasket(assetId) ? `Cesta ${getGuild(assetId).short}` : getCompany(assetId).name;
}

export function assetStartPrice(assetId: string): number {
  return isBasket(assetId) ? getGuild(assetId).startPrice : getCompany(assetId).startPrice;
}

/** The public range of this week's return for an asset, as announced by the herald. */
export function assetRange(state: GameState, assetId: string): Range {
  const guild = guildOfAsset(assetId);
  const sector = state.sectorForecasts[guild.id]!;
  const parts = componentsOf(assetId).map((c) => {
    const own = state.companyForecasts[c.id]!;
    return { low: c.beta * sector.low + own.low, high: c.beta * sector.high + own.high };
  });
  return {
    low: parts.reduce((s, p) => s + p.low, 0) / parts.length,
    high: parts.reduce((s, p) => s + p.high, 0) / parts.length,
  };
}

/** The true expected return (uses hidden information; for bots and tests). */
export function assetExpectedReturn(state: GameState, assetId: string): number {
  const guild = guildOfAsset(assetId);
  const sectorEv = expectedReturn(state.sectorForecasts[guild.id]!);
  const parts = componentsOf(assetId).map(
    (c) => c.beta * sectorEv + expectedReturn(state.companyForecasts[c.id]!),
  );
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}
