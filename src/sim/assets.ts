import {
  BOND_LOCK_MULTIPLIER,
  GUILDS,
  getClass,
  LOCAL_DEMAND,
  companiesOf,
  getCompany,
  getGuild,
  getRegion,
  isRegionId,
} from './data';
import { expectedReturn, type Range } from './forecast';
import type { CompanyDef, Forecast, GameState, GuildDef } from './types';

/**
 * Tradeable assets: every guild's basket (id = guild id) and every company (id = company id).
 *
 * A company's weekly move is a sum of factors, each with its own weekly forecast:
 *
 *   city GDP x district's city sensitivity
 * + sector  x company's sector sensitivity (beta)
 * + district demand x how much the sector lives off its neighbours
 * + the company's own move
 *
 * A basket moves as the average of its companies.
 */
export const ASSET_IDS: readonly string[] = GUILDS.flatMap((g) => [
  g.id,
  ...companiesOf(g.id).map((c) => c.id),
]);

/** Something with its own weekly forecast: 'city', a region id, a guild id or a company id. */
export type FactorId = string;

export interface Exposure {
  factorId: FactorId;
  weight: number;
}

/** Crown bond you can buy and sell any week. */
export const BOND_LIQUID = 'crown.liquid';
/** Crown bond locked for BOND_LOCK_WEEKS weeks at a higher rate. */
export const BOND_LOCKED = 'crown.locked';

export function isBond(assetId: string): boolean {
  return assetId === BOND_LIQUID || assetId === BOND_LOCKED;
}

/** Weekly rate of a Crown bond for the player's class (0.002 = 0.2%). */
export function bondRate(state: GameState, assetId: string): number {
  const base = getClass(state.classIndex).bondRate;
  return assetId === BOND_LOCKED ? base * BOND_LOCK_MULTIPLIER : base;
}

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
  if (assetId === BOND_LIQUID) return 'Título da Coroa (livre)';
  if (assetId === BOND_LOCKED) return 'Título da Coroa (4 sem.)';
  return isBasket(assetId) ? `Cesta ${getGuild(assetId).short}` : getCompany(assetId).name;
}

export function assetStartPrice(assetId: string): number {
  return isBasket(assetId) ? getGuild(assetId).startPrice : getCompany(assetId).startPrice;
}

/** The factors that move a company, with their weights. */
export function companyExposures(company: CompanyDef): Exposure[] {
  const guild = getGuild(company.guildId);
  return [
    { factorId: 'city', weight: getRegion(company.regionId).cityBeta },
    { factorId: guild.id, weight: company.beta },
    { factorId: company.regionId, weight: LOCAL_DEMAND[guild.sector] },
    { factorId: company.id, weight: 1 },
  ];
}

/** This week's forecast for a factor. */
export function factorForecast(state: GameState, factorId: FactorId): Forecast {
  const f =
    factorId === 'city'
      ? state.cityForecast
      : isRegionId(factorId)
        ? state.regionForecasts[factorId]
        : isBasket(factorId)
          ? state.sectorForecasts[factorId]
          : state.companyForecasts[factorId];
  if (!f) throw new Error(`No forecast for ${factorId}`);
  return f;
}

/** The public range of this week's return for an asset, as announced by the herald. */
export function assetRange(state: GameState, assetId: string): Range {
  if (isBond(assetId)) {
    const r = bondRate(state, assetId) * 100;
    return { low: r, high: r };
  }
  const parts = componentsOf(assetId).map((c) =>
    companyExposures(c).reduce(
      (acc, { factorId, weight }) => {
        const f = factorForecast(state, factorId);
        return { low: acc.low + weight * f.low, high: acc.high + weight * f.high };
      },
      { low: 0, high: 0 },
    ),
  );
  return {
    low: parts.reduce((s, p) => s + p.low, 0) / parts.length,
    high: parts.reduce((s, p) => s + p.high, 0) / parts.length,
  };
}

/** The true expected return (uses hidden information; for bots and tests). */
export function assetExpectedReturn(state: GameState, assetId: string): number {
  if (isBond(assetId)) return bondRate(state, assetId) * 100;
  const parts = componentsOf(assetId).map((c) =>
    companyExposures(c).reduce(
      (sum, { factorId, weight }) => sum + weight * expectedReturn(factorForecast(state, factorId)),
      0,
    ),
  );
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/** Combines sampled factor moves into a company's weekly move. */
export function companyMove(company: CompanyDef, factorMoves: Record<FactorId, number>): number {
  return companyExposures(company).reduce(
    (sum, { factorId, weight }) => sum + weight * (factorMoves[factorId] ?? 0),
    0,
  );
}
