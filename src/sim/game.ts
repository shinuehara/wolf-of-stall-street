import {
  ASTROLOGER_ACCURACY,
  BOND_LOCK_WEEKS,
  INSURERS_DISCOUNT,
  ITEMS,
  LENS_BONUS,
  MONTH_LENGTH,
  SCALES_GAIN,
  SMUGGLER_CHANCE,
  VISITOR_OFFERS,
  getItem,
  PERKS,
  SHOCK_BAD_NEWS,
  SHOCK_BAD_RANGE,
  SHOCK_BASE_CHANCE,
  SHOCK_GOOD_NEWS,
  SHOCK_GOOD_RANGE,
  SHOCK_GOOD_SHARE,
  SHOCK_HIGH_CHANCE,
  SHOCK_HIGH_SHARE,
  SPY_FAKE_CHANCE,
  SPY_NOISE,
  CITY,
  CITY_NEWS,
  COMPANIES,
  COMPANY_EVENT_CHANCE,
  COMPANY_NEWS,
  CYCLE_LIMIT,
  CYCLE_PERSISTENCE,
  CYCLE_SHOCK,
  DRUNK_ACCURACY,
  EXPERT_PERK,
  EXPERT_RANKS,
  EVENT_CHANCE,
  EVENTS,
  GUILDS,
  LOCAL_NEWS_CHANCE,
  MAX_ACTIVE_EVENTS,
  MAX_COMPANY_EVENTS,
  MAX_LOCAL_NEWS,
  REGIONS,
  REGION_NEWS,
  SEASON_LENGTH,
  STARTING_GOLD,
  STARTING_PURSE,
  TOP_CLASS,
  companiesOf,
  getClass,
  getEvent,
  getExpert,
  getGuild,
  getPerk,
  isRegionId,
  FLOW_DEAD_ZONE,
  FLOW_MAX_IN,
  FLOW_MAX_OUT,
  FLOW_SENSITIVITY,
  INVESTORS,
  OFFER_CHANCE,
  getInvestor,
} from './data';
import {
  ASSET_IDS,
  BOND_LIQUID,
  BOND_LOCKED,
  bondRate,
  isBond,
  assetRange,
  assetStartPrice,
  companyMove,
  factorForecast,
  guildOfAsset,
  type FactorId,
} from './assets';
import { applyHedge, bands, eventShift, generateForecast, leansUp, sampleReturn } from './forecast';
import { nextRandom, pick, randomInt } from './rng';
import type {
  CompanyDef,
  ExpertId,
  Forecast,
  GameState,
  GuildDef,
  Band,
  ItemId,
  VisitorKind,
  LogEntry,
  PerkId,
  SeasonReview,
  Shock,
  SocialClass,
  InvestorKind,
} from './types';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export interface WeekReport {
  /** Return in % per asset (market move, before insurance). */
  marketReturns: Record<string, number>;
  /** Move in % of each factor (city, districts, sectors, companies' own business). */
  factorMoves: Record<string, number>;
  /** Gold gained or lost on each held position, after insurance. */
  positionPnl: Record<string, number>;
  bondIncome: number;
  hedgeFees: number;
  /** Paid from the fund to the manager. */
  managementFee: number;
  performanceFee: number;
  /** Paid from the manager's purse. */
  livingCost: number;
  seasonEnded: boolean;
  classChange: 'down' | 'stay' | 'up-offer' | null;
  /** Surprises outside the announced ranges this week. */
  shocks: Shock[];
  /** Set on the last week of a season. */
  seasonReview: SeasonReview | null;
  /** Smuggled goods whose effect ended this week, and whether you got caught. */
  smuggling: { item: ItemId; caught: boolean }[];
  /** Set when a visitor arrives at the square this week. */
  visitorArrived: VisitorKind | null;
  /** Investors' monthly deposit (+) or withdrawal (-), 0 when nobody moved. */
  investorFlow: number;
  /** Deposits traced and taken back this week. */
  confiscations: { kind: InvestorKind; amount: number; fine: number }[];
  /** Someone offered to invest in the fund (answer before the week ends). */
  offerArrived: InvestorKind | null;
}

const MAX_LOG = 60;

/** Weeks of simulated market history that exist before the game starts, so charts are never empty. */
export const PRE_HISTORY_WEEKS = 26;

/** Every factor with its own weekly forecast: the city, the districts, the sectors, the companies. */
const FACTOR_IDS: readonly FactorId[] = [
  'city',
  ...REGIONS.map((r) => r.id),
  ...GUILDS.map((g) => g.id),
  ...COMPANIES.map((c) => c.id),
];

/** Indicators shown in the almanac: the city's GDP and each district's local demand. */
export const INDICATOR_IDS: readonly string[] = ['city', ...REGIONS.map((r) => r.id)];

/** Samples one week of moves for every factor, then combines them into every asset's move. */
function sampleMoves(
  state: GameState,
  forecastOf: (factorId: FactorId) => Forecast,
): { factors: Record<FactorId, number>; assets: Record<string, number> } {
  const factors: Record<FactorId, number> = {};
  for (const id of FACTOR_IDS) {
    factors[id] = sampleReturn(forecastOf(id), nextRandom(state), nextRandom(state));
  }
  const assets: Record<string, number> = {};
  for (const guild of GUILDS) {
    const companies = companiesOf(guild.id);
    for (const company of companies) assets[company.id] = companyMove(company, factors);
    assets[guild.id] = companies.reduce((sum, c) => sum + assets[c.id]!, 0) / companies.length;
  }
  return { factors, assets };
}

/** The slow economic cycle wanders a little each week, pulled back towards zero. */
function stepCycle(state: GameState): void {
  const next = state.cityCycle * CYCLE_PERSISTENCE + (nextRandom(state) - 0.5) * 2 * CYCLE_SHOCK;
  state.cityCycle = Math.max(-CYCLE_LIMIT, Math.min(CYCLE_LIMIT, next));
}

/**
 * Simulates calm weeks (same market model, no news) before the player arrives and rescales
 * each path so it ends exactly at the asset's starting price (indicators end at 100).
 */
function seedHistory(state: GameState): void {
  const ids = [...ASSET_IDS, ...INDICATOR_IDS];
  const paths: Record<string, number[]> = Object.fromEntries(ids.map((id) => [id, [1]]));
  const push = (id: string, move: number) => {
    const path = paths[id]!;
    path.push(path[path.length - 1]! * (1 + move / 100));
  };
  for (let w = 0; w < PRE_HISTORY_WEEKS; w++) {
    stepCycle(state);
    const { factors, assets } = sampleMoves(state, (id) =>
      generateForecast(state, id === 'city' ? cityProfile(state) : profileOf(id), 0),
    );
    for (const id of ASSET_IDS) push(id, assets[id]!);
    for (const id of INDICATOR_IDS) push(id, factors[id]!);
  }
  for (const id of ids) {
    const path = paths[id]!;
    const end = INDICATOR_IDS.includes(id) ? 100 : assetStartPrice(id);
    const scale = end / path[path.length - 1]!;
    const history = path.map((v) => v * scale);
    history[history.length - 1] = end;
    if (INDICATOR_IDS.includes(id)) state.indicators[id] = { value: end, history };
    else state.assets[id] = { price: end, history };
  }
}

function profileOf(factorId: FactorId): { drift: number; width: number } {
  if (isRegionId(factorId)) return REGIONS.find((r) => r.id === factorId)!;
  const guild = GUILDS.find((g) => g.id === factorId);
  if (guild) return guild;
  return COMPANIES.find((c) => c.id === factorId)!;
}

function cityProfile(state: GameState): { drift: number; width: number } {
  return { drift: CITY.drift + state.cityCycle, width: CITY.width };
}

export function newGame(seed: number = Date.now() >>> 0): GameState {
  const state: GameState = {
    version: 11,
    seed,
    rngState: seed,
    week: 0,
    classIndex: 0,
    story: { chapter: 0, queue: [{ id: 'intro' }], announced: [] },
    cash: STARTING_GOLD,
    purse: STARTING_PURSE,
    positions: {},
    assets: Object.fromEntries(
      ASSET_IDS.map((id) => [id, { price: assetStartPrice(id), history: [assetStartPrice(id)] }]),
    ),
    sectorForecasts: {},
    companyForecasts: {},
    cityForecast: { low: 0, high: 0, weights: [] },
    regionForecasts: {},
    cityCycle: 0,
    indicators: {},
    insights: [],
    events: [],
    companyEvents: [],
    localNews: [],
    lockedBonds: [],
    perks: {},
    shockRisk: {},
    ledger: [],
    assetPnl: {},
    seasonStart: { wealth: STARTING_GOLD, purse: STARTING_PURSE, assetPnl: {}, classIndex: 0 },
    visitor: null,
    effects: [],
    monthStart: STARTING_GOLD,
    weekFlows: 0,
    investorOffer: null,
    riskyDeposits: [],
    ascensionOffer: false,
    status: 'playing',
    log: [],
  };
  seedHistory(state);
  rollForecasts(state);
  log(
    state,
    `Por decreto do Rei, o povo pode comprar Títulos da Coroa. Seus vizinhos confiam ${STARTING_GOLD} florins a você.`,
    'neutral',
  );
  return state;
}

export function currentClass(state: GameState): SocialClass {
  return getClass(state.classIndex);
}

export function invested(state: GameState): number {
  return Object.values(state.positions).reduce((sum, p) => sum + p.value, 0);
}

export function lockedValue(state: GameState): number {
  return state.lockedBonds.reduce((sum, b) => sum + b.value, 0);
}

/** Everything that can be turned into cash this week (locked bonds excluded). */
export function liquidWealth(state: GameState): number {
  return state.cash + invested(state);
}

export function wealth(state: GameState): number {
  return liquidWealth(state) + lockedValue(state);
}

export function season(state: GameState): number {
  return Math.floor(state.week / SEASON_LENGTH) + 1;
}

export function weeksUntilSeasonEnd(state: GameState): number {
  return SEASON_LENGTH - (state.week % SEASON_LENGTH);
}

/** In the first quarter only Crown bonds are allowed to commoners. */
export function onlyBonds(state: GameState): boolean {
  return state.story.chapter === 0;
}

export function isGuildUnlocked(state: GameState, guild: GuildDef): boolean {
  return state.story.chapter >= (guild.minChapter ?? 1) && state.classIndex >= guild.minClass;
}

export function isAssetUnlocked(state: GameState, assetId: string): boolean {
  return isBond(assetId) || isGuildUnlocked(state, guildOfAsset(assetId));
}

export function expertCost(state: GameState, expertId: ExpertId): number {
  const expert = getExpert(expertId);
  if (expert.baseCost === 0 && expert.wealthCost === 0) return 0;
  const raw = expert.baseCost + expert.wealthCost * Math.max(0, wealth(state));
  const quill = hasEffect(state, 'sharpQuill') ? 0.5 : 1;
  return Math.round(raw * quill * 100) / 100;
}

export function hedgeFee(state: GameState, assetId: string): number {
  const position = state.positions[assetId];
  if (!position?.hedged) return 0;
  if (hasEffect(state, 'guildSeal')) return 0;
  const discount = state.perks.insurers ? 1 - INSURERS_DISCOUNT : 1;
  return position.value * currentClass(state).hedgeFeeRate * discount;
}

export function perkLevel(state: GameState, id: PerkId): number {
  return state.perks[id] ?? 0;
}

/** An expert's rank: the level of the perk that trains them (0 = rookie). */
export function expertLevel(state: GameState, expertId: ExpertId): number {
  return perkLevel(state, EXPERT_PERK[expertId]);
}

export function expertRankName(expertId: ExpertId, level: number): string {
  const ranks = EXPERT_RANKS[expertId];
  return ranks[Math.min(level, ranks.length - 1)]!;
}

/** The next level of a perk the player could buy, or null when maxed out. */
export function nextPerkLevel(state: GameState, id: PerkId) {
  return getPerk(id).levels[perkLevel(state, id)] ?? null;
}

export function buyPerk(state: GameState, id: PerkId): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const perk = getPerk(id);
  const level = nextPerkLevel(state, id);
  if (!level) return fail(`${perk.name} já está no nível máximo.`);
  if (state.classIndex < level.minClass) {
    return fail(`Só a partir de ${getClass(level.minClass).name}.`);
  }
  if (state.purse < level.cost) return fail('Seu bolso não tem florins para pagar.');
  state.purse -= level.cost;
  state.perks[id] = perkLevel(state, id) + 1;
  log(
    state,
    `Você contratou: ${perk.name}${perk.levels.length > 1 ? ` (nível ${state.perks[id]})` : ''}.`,
    'good',
  );
  return ok;
}

export { PERKS };

/** Standard normal sample (Box-Muller). */
function gaussian(state: GameState): number {
  const u = Math.max(1e-9, nextRandom(state));
  const v = nextRandom(state);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** The spy's estimate: true bands blurred by noise, sometimes a planted mirror image. */
function spyEstimate(state: GameState, forecast: Forecast): Band[] {
  const level = Math.min(perkLevel(state, 'veteranSpy'), SPY_NOISE.length - 1);
  const noise = SPY_NOISE[level]!;
  const planted = nextRandom(state) < SPY_FAKE_CHANCE[level]!;
  const truth = bands(forecast);
  let weights = truth.map((b) => b.p * Math.exp(noise * gaussian(state)));
  if (planted) weights = [...weights].reverse();
  const total = weights.reduce((a, b) => a + b, 0);
  return truth.map((b, i) => ({ ...b, p: weights[i]! / total }));
}

/**
 * The forecast an expert reads for a target: the city's GDP, a district's demand, a sector
 * (guild id) or a company's own business.
 */
export function targetForecast(state: GameState, targetId: string): Forecast {
  return factorForecast(state, targetId);
}

/** The city and its districts are open to everyone; guilds and companies need the right class. */
export function isTargetUnlocked(state: GameState, targetId: string): boolean {
  if (onlyBonds(state)) return false;
  return targetId === 'city' || isRegionId(targetId) || isAssetUnlocked(state, targetId);
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function buy(state: GameState, assetId: string, amount: number): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  if (!isBond(assetId)) {
    const guild = guildOfAsset(assetId);
    if (onlyBonds(state)) return fail('Por enquanto o Rei só permite ao povo os Títulos da Coroa.');
    if (!isGuildUnlocked(state, guild)) {
      return fail(
        `Só a partir de ${getClass(guild.minClass).name} se negocia com a ${guild.name}.`,
      );
    }
  }
  if (!(amount > 0)) return fail('Informe um valor positivo.');
  if (amount > state.cash + 1e-9) return fail('Você não tem tantos florins livres.');
  amount = Math.min(amount, state.cash);
  state.cash -= amount;
  if (assetId === BOND_LOCKED) {
    state.lockedBonds.push({
      value: amount,
      cost: amount,
      rate: bondRate(state, BOND_LOCKED),
      maturesWeek: state.week + BOND_LOCK_WEEKS,
    });
    return ok;
  }
  const position = (state.positions[assetId] ??= { value: 0, cost: 0, hedged: false });
  position.value += amount;
  position.cost += amount;
  return ok;
}

export function sell(state: GameState, assetId: string, amount: number): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  if (assetId === BOND_LOCKED) {
    return fail('Títulos de 4 semanas ficam presos até o vencimento; o ouro volta sozinho.');
  }
  const position = state.positions[assetId];
  if (!position || position.value <= 0) return fail('Você não tem cotas disso.');
  if (!(amount > 0)) return fail('Informe um valor positivo.');
  amount = Math.min(amount, position.value);
  reducePosition(state, assetId, amount);
  state.cash += amount;
  return ok;
}

export type QuickTradeResult = { ok: true; amount: number } | { ok: false; error: string };

/**
 * Buys (share > 0) or sells (share < 0) a slice of total wealth in one asset.
 * Buying is capped by free gold; selling is capped by the position, closing it if smaller.
 * A share of +1 buys with all free gold; -1 closes the position.
 */
export function quickTrade(state: GameState, assetId: string, share: number): QuickTradeResult {
  if (share > 0) {
    if (state.cash <= 0.005) return fail('Você não tem florins livres.');
    const amount = share >= 1 ? state.cash : Math.min(wealth(state) * share, state.cash);
    const result = buy(state, assetId, amount);
    return result.ok ? { ok: true, amount } : result;
  }
  if (assetId === BOND_LOCKED) {
    return fail('Títulos de 4 semanas ficam presos até o vencimento; o ouro volta sozinho.');
  }
  const position = state.positions[assetId];
  if (!position) return fail('Você não tem cotas disso.');
  const amount = share <= -1 ? position.value : Math.min(wealth(state) * -share, position.value);
  const result = sell(state, assetId, amount);
  return result.ok ? { ok: true, amount } : result;
}

export function setHedge(state: GameState, assetId: string, hedged: boolean): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  if (isBond(assetId))
    return fail('Títulos da Coroa não precisam de seguro: o rendimento é garantido.');
  const position = state.positions[assetId];
  if (!position) return fail('Só dá para segurar uma posição que você tem.');
  position.hedged = hedged;
  return ok;
}

export function consult(state: GameState, expertId: ExpertId, targetId: string): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const expert = getExpert(expertId);
  if (state.classIndex < expert.minClass) {
    return fail(
      `O ${expert.name} não atende quem está abaixo de ${getClass(expert.minClass).name}.`,
    );
  }
  if (onlyBonds(state)) return fail('Quem só tem Títulos da Coroa não tem o que perguntar.');
  if (!isTargetUnlocked(state, targetId)) return fail('Você ainda não tem acesso a esta guilda.');
  if (state.insights.some((i) => i.expert === expertId && i.targetId === targetId)) {
    return fail('Você já fez essa pergunta a este especialista nesta semana.');
  }
  const cost = expertCost(state, expertId);
  if (cost > state.purse) return fail('Seu bolso não tem florins para pagar a consulta.');
  const forecast = targetForecast(state, targetId);

  state.purse -= cost;
  const level = expertLevel(state, expertId);
  if (expertId === 'spy') {
    const estimate = hasEffect(state, 'stolenLedger')
      ? bands(forecast)
      : spyEstimate(state, forecast);
    state.insights.push({ expert: 'spy', targetId, bands: estimate, level });
  } else {
    const table = expertId === 'astrologer' ? ASTROLOGER_ACCURACY : DRUNK_ACCURACY;
    const lenses = expertId === 'astrologer' && hasEffect(state, 'brassLenses') ? LENS_BONUS : 0;
    const accuracy = Math.min(0.95, table[Math.min(level, table.length - 1)]! + lenses);
    const truth = leansUp(forecast);
    const honest = nextRandom(state) < accuracy;
    state.insights.push({ expert: expertId, targetId, leansUp: honest ? truth : !truth, level });
  }
  return ok;
}

export function acceptAscension(state: GameState): ActionResult {
  if (!state.ascensionOffer) return fail('Não há título à venda para você agora.');
  const cls = currentClass(state);
  if (state.purse < cls.ascensionFee) {
    return fail('O título sai do seu bolso, e ele não tem florins suficientes.');
  }
  state.purse -= cls.ascensionFee;
  state.classIndex += 1;
  state.ascensionOffer = false;
  const next = currentClass(state);
  log(state, `Você comprou o título e agora é ${next.name}!`, 'good');
  announceGuilds(state);
  if (state.classIndex >= TOP_CLASS) {
    state.status = 'won';
    log(state, `Em ${state.week} semanas, o Lobo chegou à nobreza. Vida longa ao Conde!`, 'good');
  }
  return ok;
}

export function declineAscension(state: GameState): ActionResult {
  if (!state.ascensionOffer) return fail('Não há título à venda para você agora.');
  state.ascensionOffer = false;
  log(state, 'Você recusou o título. Por ora.', 'neutral');
  return ok;
}

// ---------------------------------------------------------------------------
// Turn resolution
// ---------------------------------------------------------------------------

export function endWeek(state: GameState): WeekReport {
  if (state.status !== 'playing') throw new Error('Game is over');
  const cls = currentClass(state);
  const fundAtStart = wealth(state);
  const report: WeekReport = {
    marketReturns: {},
    factorMoves: {},
    positionPnl: {},
    bondIncome: 0,
    hedgeFees: 0,
    managementFee: 0,
    performanceFee: 0,
    livingCost: cls.livingCost,
    seasonEnded: false,
    classChange: null,
    shocks: [],
    seasonReview: null,
    smuggling: [],
    visitorArrived: null,
    investorFlow: 0,
    confiscations: [],
    offerArrived: null,
  };

  // Unanswered offers expire when the week ends.
  state.ascensionOffer = false;
  state.investorOffer = null;

  // 1. Insurance premiums are paid up front.
  for (const assetId of Object.keys(state.positions)) {
    const fee = hedgeFee(state, assetId);
    report.hedgeFees += fee;
    state.cash -= fee;
  }

  // 2. The market moves: the city, the districts, the sectors and each company's own business.
  const sampled = sampleMoves(state, (id) => factorForecast(state, id));
  const moves = sampled.assets;
  report.marketReturns = moves;
  report.factorMoves = sampled.factors;

  // Surprises nobody announced: fires, scandals, windfalls.
  const shockShare: Record<string, number> = {};
  for (const company of COMPANIES) {
    if (nextRandom(state) >= (state.shockRisk[company.id] ?? SHOCK_BASE_CHANCE)) continue;
    const good = nextRandom(state) < SHOCK_GOOD_SHARE;
    const [lo, hi] = good ? SHOCK_GOOD_RANGE : SHOCK_BAD_RANGE;
    const move = lo + (hi - lo) * nextRandom(state);
    const headline = companyHeadline(pick(state, good ? SHOCK_GOOD_NEWS : SHOCK_BAD_NEWS), company);
    moves[company.id] = (moves[company.id] ?? 0) + move;
    moves[company.guildId] =
      (moves[company.guildId] ?? 0) + move / companiesOf(company.guildId).length;
    report.shocks.push({ companyId: company.id, move, headline });
    shockShare[company.id] = (shockShare[company.id] ?? 0) + move;
    const basketShare = move / companiesOf(company.guildId).length;
    shockShare[company.guildId] = (shockShare[company.guildId] ?? 0) + basketShare;
    if (isAssetUnlocked(state, company.id)) log(state, headline, good ? 'good' : 'bad');
  }

  for (const [assetId, position] of Object.entries(state.positions)) {
    if (isBond(assetId)) continue;
    let raw = moves[assetId] ?? 0;
    const shock = shockShare[assetId] ?? 0;
    if (shock < 0 && hasEffect(state, 'luckyCharm')) raw -= shock / 2;
    const applied = position.hedged ? applyHedge(assetRange(state, assetId), raw) : raw;
    const pnl = position.value * (applied / 100);
    position.value += pnl;
    report.positionPnl[assetId] = pnl;
    state.assetPnl[assetId] = (state.assetPnl[assetId] ?? 0) + pnl;
  }

  for (const assetId of ASSET_IDS) {
    const asset = state.assets[assetId]!;
    asset.price *= 1 + (moves[assetId] ?? 0) / 100;
    asset.history.push(asset.price);
  }
  for (const id of INDICATOR_IDS) {
    const indicator = state.indicators[id]!;
    indicator.value *= 1 + (sampled.factors[id] ?? 0) / 100;
    indicator.history.push(indicator.value);
  }

  // 3. Crown bonds pay their interest (idle gold earns nothing); then the bills come.
  const liquidBond = state.positions[BOND_LIQUID];
  if (liquidBond) {
    const interest = liquidBond.value * bondRate(state, BOND_LIQUID);
    liquidBond.value += interest;
    report.bondIncome += interest;
    state.assetPnl[BOND_LIQUID] = (state.assetPnl[BOND_LIQUID] ?? 0) + interest;
  }
  for (const lot of state.lockedBonds) {
    const interest = lot.value * lot.rate;
    lot.value += interest;
    report.bondIncome += interest;
    state.assetPnl[BOND_LOCKED] = (state.assetPnl[BOND_LOCKED] ?? 0) + interest;
  }
  const matured = state.lockedBonds.filter((b) => b.maturesWeek <= state.week + 1);
  if (matured.length > 0) {
    const total = matured.reduce((sum, b) => sum + b.value, 0);
    state.cash += total;
    state.lockedBonds = state.lockedBonds.filter((b) => b.maturesWeek > state.week + 1);
    log(
      state,
      `Títulos da Coroa venceram: ${fmt(total)} florins voltaram para o seu bolso.`,
      'good',
    );
  }
  // 4. The manager takes the fees from the fund, then pays the bills from the purse.
  const profit = wealth(state) - fundAtStart;
  report.managementFee = wealth(state) * cls.managementFeeRate;
  const whisper = hasEffect(state, 'courtWhisper') ? 2 : 1;
  report.performanceFee = Math.max(0, profit) * cls.performanceFeeRate * whisper;
  const fees = report.managementFee + report.performanceFee;
  raiseCash(state, fees);
  state.cash -= fees;
  state.purse += fees;
  state.purse -= cls.livingCost;
  if (state.purse < 0) {
    state.status = 'lost';
    log(state, 'Seu bolso não paga nem o pão. Os credores te arrastam para a masmorra.', 'bad');
    return report;
  }

  // 5. Investors: traced dirty money, then the monthly deposits and withdrawals.
  tickRiskyDeposits(state, report);
  if ((state.week + 1) % MONTH_LENGTH === 0) applyInvestorFlows(state, report);

  state.week += 1;
  logWeekSummary(state, report);
  recordWeek(state, report);

  // 4. Season review.
  if (state.week % SEASON_LENGTH === 0) {
    report.seasonEnded = true;
    const classBefore = state.classIndex;
    report.classChange = reviewSeason(state);
    report.seasonReview = buildSeasonReview(state, classBefore, report.classChange);
    if (state.status === 'playing') advanceStory(state);
    announceGuilds(state);
    state.seasonStart = {
      wealth: wealth(state),
      purse: state.purse,
      assetPnl: { ...state.assetPnl },
      classIndex: state.classIndex,
    };
    if (state.status !== 'playing') return report;
  }

  // 5. The world turns.
  tickEvents(state);
  tickCompanyEvents(state);
  tickLocalNews(state);
  tickEffects(state, report);
  updateVisitor(state, report);
  rollInvestorOffer(state, report);
  state.insights = [];
  rollForecasts(state);
  return report;
}

function buildSeasonReview(
  state: GameState,
  classBefore: number,
  change: WeekReport['classChange'],
): SeasonReview {
  const start = state.seasonStart;
  const assetPnl: Record<string, number> = {};
  for (const [id, total] of Object.entries(state.assetPnl)) {
    const delta = total - (start.assetPnl[id] ?? 0);
    if (Math.abs(delta) >= 0.005) assetPnl[id] = delta;
  }
  return {
    season: state.week / SEASON_LENGTH,
    classBefore,
    classAfter: state.classIndex,
    outcome: state.status === 'lost' ? 'lost' : (change ?? 'stay'),
    startWealth: start.wealth,
    endWealth: wealth(state),
    startPurse: start.purse,
    endPurse: state.purse,
    flows: state.ledger.slice(-SEASON_LENGTH).reduce((sum, r) => sum + r.flows, 0),
    weeks: state.ledger.slice(-SEASON_LENGTH),
    assetPnl,
  };
}

/** The market opens to commoners in steps, one per quarter at the start of the game. */
function advanceStory(state: GameState): void {
  if (state.story.chapter === 0) {
    state.story.chapter = 1;
    state.story.queue.push({ id: 'influencer' });
    state.story.announced.push('bakers');
    log(state, 'A Guilda dos Padeiros abriu as portas para o povo!', 'good');
  } else if (state.story.chapter === 1) {
    state.story.chapter = 2;
    log(state, 'Minas e Boticários também passam a aceitar o dinheiro do povo!', 'good');
  }
}

/** Every guild that opens to the player gets its own influencer video, once per game. */
export function announceGuilds(state: GameState): void {
  const fresh = GUILDS.filter(
    (g) => isGuildUnlocked(state, g) && !state.story.announced.includes(g.id),
  ).map((g) => g.id);
  if (fresh.length === 0) return;
  state.story.announced.push(...fresh);
  state.story.queue.push({ id: 'trend', guilds: fresh });
}

/** The cut scene at the head of the queue was watched. */
export function finishStory(state: GameState): void {
  state.story.queue.shift();
}

// ---------------------------------------------------------------------------
// Investors
// ---------------------------------------------------------------------------

/** Puts gold in (+) or takes it out (-) of the fund, selling positions if needed. */
function moveFunds(state: GameState, amount: number): number {
  if (amount < 0) {
    raiseCash(state, -amount);
    amount = -Math.min(-amount, state.cash);
  }
  state.cash += amount;
  state.weekFlows += amount;
  return amount;
}

/**
 * At the end of each month investors compare the fund with the Crown bond: a good month
 * brings new money, a bad one makes them withdraw.
 */
function applyInvestorFlows(state: GameState, report: WeekReport): void {
  if (state.story.chapter >= 1 && state.monthStart > 0) {
    const ret = (wealth(state) / state.monthStart - 1) * 100;
    const benchmark = bondRate(state, BOND_LIQUID) * MONTH_LENGTH * 100;
    const excess = ret - benchmark;
    if (Math.abs(excess) > FLOW_DEAD_ZONE) {
      const mood = 0.75 + nextRandom(state) * 0.5;
      const share = Math.max(
        -FLOW_MAX_OUT,
        Math.min(FLOW_MAX_IN, ((excess * FLOW_SENSITIVITY) / 100) * mood),
      );
      const moved = moveFunds(state, wealth(state) * share);
      report.investorFlow = moved;
      log(
        state,
        moved > 0
          ? `Mês bom! Novos investidores aportaram ${fmt(moved)} florins no fundo.`
          : `Mês ruim: investidores assustados sacaram ${fmt(-moved)} florins do fundo.`,
        moved > 0 ? 'good' : 'bad',
      );
    }
  }
  state.monthStart = wealth(state);
}

function tickRiskyDeposits(state: GameState, report: WeekReport): void {
  for (const deposit of state.riskyDeposits) {
    const investor = getInvestor(deposit.kind);
    deposit.weeksLeft -= 1;
    if (deposit.dirty && nextRandom(state) < investor.catchChance) {
      const taken = -moveFunds(state, -deposit.amount);
      const fine = state.purse * investor.purseFine;
      state.purse -= fine;
      state.monthStart = Math.max(0, state.monthStart - taken);
      report.confiscations.push({ kind: deposit.kind, amount: taken, fine });
      log(
        state,
        `${investor.caught} (${fmt(taken)} fl${fine > 0 ? `, multa de ${fmt(fine)} fl` : ''})`,
        'bad',
      );
      deposit.weeksLeft = -1;
    } else if (deposit.weeksLeft === 0) {
      log(state, investor.safe, 'good');
    }
  }
  state.riskyDeposits = state.riskyDeposits.filter((d) => d.weeksLeft > 0);
}

function rollInvestorOffer(state: GameState, report: WeekReport): void {
  if (state.story.chapter < 1 || state.visitor || state.investorOffer) return;
  if (nextRandom(state) >= OFFER_CHANCE) return;
  const kind = pick(
    state,
    INVESTORS.map((i) => i.id),
  );
  const amount = Math.round(wealth(state) * getInvestor(kind).share * 10) / 10;
  state.investorOffer = { kind, amount };
  report.offerArrived = kind;
  log(
    state,
    `${getInvestor(kind).name} quer investir ${fmt(amount)} florins no seu fundo.`,
    'neutral',
  );
}

export function acceptInvestor(state: GameState): ActionResult {
  const offer = state.investorOffer;
  if (state.status !== 'playing') return fail('O jogo terminou.');
  if (!offer) return fail('Ninguém está oferecendo dinheiro agora.');
  const investor = getInvestor(offer.kind);
  moveFunds(state, offer.amount);
  state.monthStart += offer.amount;
  state.investorOffer = null;
  if (investor.dirtyChance > 0) {
    state.riskyDeposits.push({
      kind: offer.kind,
      amount: offer.amount,
      dirty: nextRandom(state) < investor.dirtyChance,
      weeksLeft: investor.riskWeeks,
    });
  }
  log(state, `${investor.name} aportou ${fmt(offer.amount)} florins no fundo.`, 'good');
  return ok;
}

export function declineInvestor(state: GameState): ActionResult {
  if (!state.investorOffer) return fail('Ninguém está oferecendo dinheiro agora.');
  state.investorOffer = null;
  return ok;
}

function reviewSeason(state: GameState): WeekReport['classChange'] {
  const cls = currentClass(state);
  const total = wealth(state);
  if (total < cls.floor) {
    if (state.classIndex === 0) {
      state.status = 'lost';
      log(
        state,
        `Fim do trimestre: ${fmt(total)} florins não bastam nem para um Servo. Masmorra!`,
        'bad',
      );
      return 'down';
    }
    state.classIndex -= 1;
    log(
      state,
      `Fim do trimestre: abaixo do piso de ${cls.name}. Você caiu para ${currentClass(state).name}.`,
      'bad',
    );
    return 'down';
  }
  if (total >= cls.ceiling && state.classIndex < TOP_CLASS) {
    state.ascensionOffer = true;
    const next = getClass(state.classIndex + 1);
    log(
      state,
      `Fim do trimestre: o camareiro oferece o título de ${next.name} por ${fmt(cls.ascensionFee)} florins.`,
      'good',
    );
    return 'up-offer';
  }
  log(state, `Fim do trimestre: você segue ${cls.name}.`, 'neutral');
  return 'stay';
}

function tickEvents(state: GameState): void {
  for (const event of state.events) event.weeksLeft -= 1;
  for (const ended of state.events.filter((e) => e.weeksLeft <= 0)) {
    log(state, `Fim de "${getEvent(ended.id).name}".`, 'neutral');
  }
  state.events = state.events.filter((e) => e.weeksLeft > 0);

  if (state.events.length < MAX_ACTIVE_EVENTS && nextRandom(state) < EVENT_CHANCE) {
    const candidates = EVENTS.filter((e) => !state.events.some((a) => a.id === e.id));
    if (candidates.length > 0) {
      const event = pick(state, candidates);
      state.events.push({ id: event.id, weeksLeft: randomInt(state, ...event.duration) });
      log(state, event.headline, 'neutral');
    }
  }
}

function tickCompanyEvents(state: GameState): void {
  for (const event of state.companyEvents) event.weeksLeft -= 1;
  state.companyEvents = state.companyEvents.filter((e) => e.weeksLeft > 0);

  if (state.companyEvents.length >= MAX_COMPANY_EVENTS || nextRandom(state) >= COMPANY_EVENT_CHANCE)
    return;
  const candidates = COMPANIES.filter(
    (c) => isAssetUnlocked(state, c.id) && !state.companyEvents.some((e) => e.companyId === c.id),
  );
  if (candidates.length === 0) return;
  const company = pick(state, candidates);
  const template = pick(state, COMPANY_NEWS[getGuild(company.guildId).sector]);
  const headline = companyHeadline(template.text, company);
  state.companyEvents.push({
    companyId: company.id,
    headline,
    shift: template.shift,
    weeksLeft: randomInt(state, 1, 3),
  });
  log(state, headline, template.shift > 0 ? 'good' : 'bad');
}

export function companyHeadline(template: string, company: CompanyDef): string {
  const f = company.gender === 'f';
  return template
    .replaceAll('{c}', company.name)
    .replaceAll('{do}', f ? 'da' : 'do')
    .replaceAll('{o}', f ? 'a' : 'o')
    .replaceAll('{no}', f ? 'na' : 'no')
    .replaceAll('{ao}', f ? 'à' : 'ao')
    .replace(/^./, (ch) => ch.toUpperCase());
}

/** Total effect of active news on one company's own business, in percentage points. */
export function companyShift(state: GameState, companyId: string): number {
  return state.companyEvents
    .filter((e) => e.companyId === companyId)
    .reduce((s, e) => s + e.shift, 0);
}

// ---------------------------------------------------------------------------
// Monthly visitors and their goods
// ---------------------------------------------------------------------------

export function hasEffect(state: GameState, id: ItemId): boolean {
  return state.effects.some((e) => e.id === id);
}

/** Shock warnings come from the Informants perk or from the merchant's map. */
export function hasShockWarnings(state: GameState): boolean {
  return Boolean(state.perks.informants) || hasEffect(state, 'routeMap');
}

export function buyItem(state: GameState, id: ItemId): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const visitor = state.visitor;
  if (!visitor || !visitor.offers.includes(id)) return fail('Ninguém está vendendo isso agora.');
  if (visitor.sold.includes(id)) return fail('Você já comprou este item.');
  const item = getItem(id);
  if (state.purse < item.cost) return fail('Seu bolso não tem florins para isso.');
  state.purse -= item.cost;
  visitor.sold.push(id);
  if (id === 'crookedScales') state.cash += wealth(state) * SCALES_GAIN;
  const weeks = item.until === 'quarter' ? weeksUntilSeasonEnd(state) : item.weeks;
  if (weeks > 0) {
    state.effects = state.effects.filter((e) => e.id !== id);
    state.effects.push({ id, weeksLeft: weeks });
  }
  log(state, `Você comprou: ${item.name}.`, item.seller === 'smuggler' ? 'bad' : 'good');
  return ok;
}

/** Takes a share of the whole fund (cash, positions and locked bonds) as a fine. */
function fineFund(state: GameState, share: number): number {
  const before = wealth(state);
  state.cash *= 1 - share;
  for (const p of Object.values(state.positions)) p.value *= 1 - share;
  for (const b of state.lockedBonds) b.value *= 1 - share;
  return before - wealth(state);
}

function tickEffects(state: GameState, report: WeekReport): void {
  for (const effect of state.effects) effect.weeksLeft -= 1;
  for (const effect of state.effects.filter((e) => e.weeksLeft <= 0)) {
    const item = getItem(effect.id);
    if (!item.catchChance) continue;
    const caught = nextRandom(state) < item.catchChance;
    report.smuggling.push({ item: item.id, caught });
    if (!caught) {
      log(state, `Ninguém desconfiou de ${item.name}. Desta vez.`, 'good');
      continue;
    }
    if (item.id === 'stolenLedger') state.purse /= 2;
    if (item.id === 'courtWhisper') fineFund(state, 0.08);
    if (item.id === 'crookedScales') {
      fineFund(state, 0.06);
      state.purse /= 2;
    }
    log(state, `O Meirinho descobriu ${item.name}! ${item.penalty ?? ''}`, 'bad');
  }
  state.effects = state.effects.filter((e) => e.weeksLeft > 0);
}

function updateVisitor(state: GameState, report: WeekReport): void {
  state.visitor = null;
  if (state.week % MONTH_LENGTH !== 0 || state.week % SEASON_LENGTH === 0) return;
  if (onlyBonds(state)) return;
  const kind: VisitorKind = nextRandom(state) < SMUGGLER_CHANCE ? 'smuggler' : 'merchant';
  const pool = ITEMS.filter((i) => i.seller === kind).map((i) => i.id);
  const offers: ItemId[] = [];
  while (offers.length < Math.min(VISITOR_OFFERS[kind], pool.length)) {
    const id = pick(state, pool);
    if (!offers.includes(id)) offers.push(id);
  }
  state.visitor = { kind, offers, sold: [] };
  report.visitorArrived = kind;
  log(
    state,
    kind === 'merchant'
      ? 'Um Mercador Viajante armou a tenda na praça.'
      : 'Um Contrabandista sussurra na esquina da praça…',
    'neutral',
  );
}

function tickLocalNews(state: GameState): void {
  for (const news of state.localNews) news.weeksLeft -= 1;
  state.localNews = state.localNews.filter((n) => n.weeksLeft > 0);

  if (state.localNews.length >= MAX_LOCAL_NEWS || nextRandom(state) >= LOCAL_NEWS_CHANCE) return;
  const targets = ['city', ...REGIONS.map((r) => r.id)].filter(
    (id) => !state.localNews.some((n) => n.targetId === id),
  );
  if (targets.length === 0) return;
  const targetId = pick(state, targets);
  const template = pick(state, isRegionId(targetId) ? REGION_NEWS[targetId] : CITY_NEWS);
  state.localNews.push({
    targetId,
    headline: template.text,
    shift: template.shift,
    weeksLeft: randomInt(state, 2, 4),
  });
  log(state, template.text, 'neutral');
}

/** Total effect of active news on the city or a district, in percentage points. */
export function localShift(state: GameState, targetId: string): number {
  return state.localNews.filter((n) => n.targetId === targetId).reduce((s, n) => s + n.shift, 0);
}

function rollForecasts(state: GameState): void {
  stepCycle(state);
  for (const company of COMPANIES) {
    state.shockRisk[company.id] =
      nextRandom(state) < SHOCK_HIGH_SHARE ? SHOCK_HIGH_CHANCE : SHOCK_BASE_CHANCE;
  }
  state.cityForecast = generateForecast(state, cityProfile(state), localShift(state, 'city'));
  for (const region of REGIONS) {
    state.regionForecasts[region.id] = generateForecast(
      state,
      region,
      localShift(state, region.id),
    );
  }
  const events = state.events.map((e) => getEvent(e.id));
  for (const guild of GUILDS) {
    state.sectorForecasts[guild.id] = generateForecast(
      state,
      guild,
      eventShift(guild.sector, events),
    );
  }
  for (const company of COMPANIES) {
    state.companyForecasts[company.id] = generateForecast(
      state,
      company,
      companyShift(state, company.id),
    );
  }
}

/** Sells positions proportionally until there is at least `needed` cash on hand, if possible. */
function raiseCash(state: GameState, needed: number): void {
  const missing = needed - state.cash;
  if (missing <= 0) return;
  const total = invested(state);
  if (total <= 0) return;
  const fraction = Math.min(1, missing / total);
  for (const [assetId, position] of Object.entries(state.positions)) {
    const amount = position.value * fraction;
    reducePosition(state, assetId, amount);
    state.cash += amount;
  }
}

/** Takes `amount` gold out of a position, reducing its cost in the same proportion. */
function reducePosition(state: GameState, assetId: string, amount: number): void {
  const position = state.positions[assetId];
  if (!position) return;
  const share = position.value > 0 ? Math.min(1, amount / position.value) : 1;
  position.cost -= position.cost * share;
  position.value -= amount;
  if (position.value < 0.005) delete state.positions[assetId];
}

/** Wealth at the end of the last finished week (or the starting gold). */
export function lastRecordedWealth(state: GameState): number {
  return state.ledger[state.ledger.length - 1]?.endWealth ?? STARTING_GOLD;
}

function recordWeek(state: GameState, report: WeekReport): void {
  const startWealth = lastRecordedWealth(state);
  const endWealth = wealth(state);
  const marketPnl = Object.values(report.positionPnl).reduce((a, b) => a + b, 0);
  const fees = report.managementFee + report.performanceFee;
  const flows = state.weekFlows;
  state.weekFlows = 0;
  const explained = marketPnl + report.bondIncome - report.hedgeFees - fees + flows;
  state.ledger.push({
    week: state.week,
    startWealth,
    endWealth,
    marketPnl,
    bondIncome: report.bondIncome,
    hedgeFees: report.hedgeFees,
    fees,
    flows,
    other: endWealth - startWealth - explained,
    purse: state.purse,
  });
}

function logWeekSummary(state: GameState, report: WeekReport): void {
  const pnl = Object.values(report.positionPnl).reduce((a, b) => a + b, 0);
  const fees = report.managementFee + report.performanceFee;
  const net = pnl + report.bondIncome - report.hedgeFees - fees;
  const sign = net >= 0 ? '+' : '';
  log(
    state,
    `Semana ${state.week}: fundo ${sign}${fmt(net)} fl; seu bolso recebeu ${fmt(fees)} fl de taxas e pagou ${fmt(report.livingCost)} de custo de vida.`,
    net >= 0 ? 'good' : 'bad',
  );
}

function log(state: GameState, text: string, tone: LogEntry['tone']): void {
  state.log.unshift({ week: state.week, text, tone });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}

export function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
