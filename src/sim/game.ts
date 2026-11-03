import {
  ASTROLOGER_ACCURACY,
  COMPANIES,
  COMPANY_EVENT_CHANCE,
  COMPANY_NEWS,
  DRUNK_ACCURACY,
  EVENT_CHANCE,
  EVENTS,
  GUILDS,
  MAX_ACTIVE_EVENTS,
  MAX_COMPANY_EVENTS,
  SEASON_LENGTH,
  STARTING_GOLD,
  TOP_CLASS,
  companiesOf,
  getClass,
  getEvent,
  getExpert,
  getGuild,
} from './data';
import { ASSET_IDS, assetRange, assetStartPrice, guildOfAsset, isBasket } from './assets';
import { applyHedge, bands, eventShift, generateForecast, leansUp, sampleReturn } from './forecast';
import { nextRandom, pick, randomInt } from './rng';
import type {
  CompanyDef,
  ExpertId,
  Forecast,
  GameState,
  GuildDef,
  LogEntry,
  SocialClass,
} from './types';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

export interface WeekReport {
  /** Return in % per asset (market move, before insurance). */
  marketReturns: Record<string, number>;
  /** Gold gained or lost on each held position, after insurance. */
  positionPnl: Record<string, number>;
  bondIncome: number;
  hedgeFees: number;
  livingCost: number;
  seasonEnded: boolean;
  classChange: 'down' | 'stay' | 'up-offer' | null;
}

const MAX_LOG = 60;

/** Weeks of simulated market history that exist before the game starts, so charts are never empty. */
export const PRE_HISTORY_WEEKS = 26;

/**
 * Simulates calm weeks (same market model, no news) before the player arrives and rescales
 * each path so it ends exactly at the asset's starting price.
 */
function seedHistory(state: GameState): void {
  const paths: Record<string, number[]> = Object.fromEntries(ASSET_IDS.map((id) => [id, [1]]));
  for (let w = 0; w < PRE_HISTORY_WEEKS; w++) {
    for (const guild of GUILDS) {
      const sectorMove = sampleReturn(
        generateForecast(state, guild, 0),
        nextRandom(state),
        nextRandom(state),
      );
      const companies = companiesOf(guild.id);
      let sum = 0;
      for (const company of companies) {
        const own = sampleReturn(
          generateForecast(state, company, 0),
          nextRandom(state),
          nextRandom(state),
        );
        const move = company.beta * sectorMove + own;
        sum += move;
        const path = paths[company.id]!;
        path.push(path[path.length - 1]! * (1 + move / 100));
      }
      const basket = paths[guild.id]!;
      basket.push(basket[basket.length - 1]! * (1 + sum / companies.length / 100));
    }
  }
  for (const id of ASSET_IDS) {
    const path = paths[id]!;
    const scale = assetStartPrice(id) / path[path.length - 1]!;
    const history = path.map((v) => v * scale);
    history[history.length - 1] = assetStartPrice(id);
    state.assets[id] = { price: assetStartPrice(id), history };
  }
}

export function newGame(seed: number = Date.now() >>> 0): GameState {
  const state: GameState = {
    version: 2,
    seed,
    rngState: seed,
    week: 0,
    classIndex: 0,
    cash: STARTING_GOLD,
    positions: {},
    assets: Object.fromEntries(
      ASSET_IDS.map((id) => [id, { price: assetStartPrice(id), history: [assetStartPrice(id)] }]),
    ),
    sectorForecasts: {},
    companyForecasts: {},
    insights: [],
    events: [],
    companyEvents: [],
    ascensionOffer: false,
    status: 'playing',
    log: [],
  };
  seedHistory(state);
  rollForecasts(state);
  log(
    state,
    `Você chega à cidade com ${STARTING_GOLD} florins e um sonho: virar Conde.`,
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

export function wealth(state: GameState): number {
  return state.cash + invested(state);
}

export function season(state: GameState): number {
  return Math.floor(state.week / SEASON_LENGTH) + 1;
}

export function weeksUntilSeasonEnd(state: GameState): number {
  return SEASON_LENGTH - (state.week % SEASON_LENGTH);
}

export function isGuildUnlocked(state: GameState, guild: GuildDef): boolean {
  return state.classIndex >= guild.minClass;
}

export function isAssetUnlocked(state: GameState, assetId: string): boolean {
  return isGuildUnlocked(state, guildOfAsset(assetId));
}

export function expertCost(state: GameState, expertId: ExpertId): number {
  const expert = getExpert(expertId);
  if (expert.baseCost === 0 && expert.wealthCost === 0) return 0;
  const raw = expert.baseCost + expert.wealthCost * Math.max(0, wealth(state));
  return Math.round(raw * 10) / 10;
}

export function hedgeFee(state: GameState, assetId: string): number {
  const position = state.positions[assetId];
  if (!position?.hedged) return 0;
  return position.value * currentClass(state).hedgeFeeRate;
}

/** The forecast an expert reads for a target: the sector's for a guild, the company's own otherwise. */
export function targetForecast(state: GameState, targetId: string): Forecast {
  const f = isBasket(targetId) ? state.sectorForecasts[targetId] : state.companyForecasts[targetId];
  if (!f) throw new Error(`No forecast for ${targetId}`);
  return f;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function buy(state: GameState, assetId: string, amount: number): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const guild = guildOfAsset(assetId);
  if (!isGuildUnlocked(state, guild)) {
    return fail(`Só a partir de ${getClass(guild.minClass).name} se negocia com a ${guild.name}.`);
  }
  if (!(amount > 0)) return fail('Informe um valor positivo.');
  if (amount > state.cash + 1e-9) return fail('Você não tem tantos florins livres.');
  amount = Math.min(amount, state.cash);
  state.cash -= amount;
  const position = (state.positions[assetId] ??= { value: 0, hedged: false });
  position.value += amount;
  return ok;
}

export function sell(state: GameState, assetId: string, amount: number): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const position = state.positions[assetId];
  if (!position || position.value <= 0) return fail('Você não tem cotas disso.');
  if (!(amount > 0)) return fail('Informe um valor positivo.');
  amount = Math.min(amount, position.value);
  position.value -= amount;
  state.cash += amount;
  if (position.value < 0.005) delete state.positions[assetId];
  return ok;
}

export function setHedge(state: GameState, assetId: string, hedged: boolean): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
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
  if (!isAssetUnlocked(state, targetId)) return fail('Você ainda não tem acesso a esta guilda.');
  if (state.insights.some((i) => i.expert === expertId && i.targetId === targetId)) {
    return fail('Você já fez essa pergunta a este especialista nesta semana.');
  }
  const cost = expertCost(state, expertId);
  if (cost > state.cash) return fail('Você não tem florins livres para pagar a consulta.');
  const forecast = targetForecast(state, targetId);

  state.cash -= cost;
  if (expertId === 'spy') {
    state.insights.push({ expert: 'spy', targetId, bands: bands(forecast) });
  } else {
    const accuracy = expertId === 'astrologer' ? ASTROLOGER_ACCURACY : DRUNK_ACCURACY;
    const truth = leansUp(forecast);
    const honest = nextRandom(state) < accuracy;
    state.insights.push({ expert: expertId, targetId, leansUp: honest ? truth : !truth });
  }
  return ok;
}

export function acceptAscension(state: GameState): ActionResult {
  if (!state.ascensionOffer) return fail('Não há título à venda para você agora.');
  const cls = currentClass(state);
  if (wealth(state) < cls.ascensionFee) return fail('Você não tem florins para pagar o título.');
  raiseCash(state, cls.ascensionFee);
  state.cash -= cls.ascensionFee;
  state.classIndex += 1;
  state.ascensionOffer = false;
  const next = currentClass(state);
  log(state, `Você comprou o título e agora é ${next.name}!`, 'good');
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
  const report: WeekReport = {
    marketReturns: {},
    positionPnl: {},
    bondIncome: 0,
    hedgeFees: 0,
    livingCost: cls.livingCost,
    seasonEnded: false,
    classChange: null,
  };

  // An unanswered title offer expires when the week ends.
  state.ascensionOffer = false;

  // 1. Insurance premiums are paid up front.
  for (const assetId of Object.keys(state.positions)) {
    const fee = hedgeFee(state, assetId);
    report.hedgeFees += fee;
    state.cash -= fee;
  }

  // 2. The market moves: each sector, then each company on top of its sector.
  const moves = report.marketReturns;
  for (const guild of GUILDS) {
    const sectorMove = sampleReturn(
      state.sectorForecasts[guild.id]!,
      nextRandom(state),
      nextRandom(state),
    );
    const companies = companiesOf(guild.id);
    for (const company of companies) {
      const own = sampleReturn(
        state.companyForecasts[company.id]!,
        nextRandom(state),
        nextRandom(state),
      );
      moves[company.id] = company.beta * sectorMove + own;
    }
    moves[guild.id] = companies.reduce((sum, c) => sum + moves[c.id]!, 0) / companies.length;
  }

  for (const [assetId, position] of Object.entries(state.positions)) {
    const raw = moves[assetId] ?? 0;
    const applied = position.hedged ? applyHedge(assetRange(state, assetId), raw) : raw;
    const pnl = position.value * (applied / 100);
    position.value += pnl;
    report.positionPnl[assetId] = pnl;
  }

  for (const assetId of ASSET_IDS) {
    const asset = state.assets[assetId]!;
    asset.price *= 1 + (moves[assetId] ?? 0) / 100;
    asset.history.push(asset.price);
  }

  // 3. Idle gold earns Crown bond interest; then the bills come.
  if (state.cash > 0) {
    report.bondIncome = state.cash * cls.bondRate;
    state.cash += report.bondIncome;
  }
  state.cash -= cls.livingCost;
  if (state.cash < 0) {
    const shortfall = -state.cash;
    raiseCash(state, shortfall);
    if (state.cash < 0) {
      state.status = 'lost';
      log(
        state,
        'Sem florins para pagar as contas. Os credores te arrastam para a masmorra.',
        'bad',
      );
      return report;
    }
    log(
      state,
      `Faltou dinheiro vivo: vendemos ${fmt(shortfall)} florins em cotas para pagar as contas.`,
      'bad',
    );
  }

  state.week += 1;
  logWeekSummary(state, report);

  // 4. Season review.
  if (state.week % SEASON_LENGTH === 0) {
    report.seasonEnded = true;
    report.classChange = reviewSeason(state);
    if (state.status !== 'playing') return report;
  }

  // 5. The world turns.
  tickEvents(state);
  tickCompanyEvents(state);
  state.insights = [];
  rollForecasts(state);
  return report;
}

function reviewSeason(state: GameState): WeekReport['classChange'] {
  const cls = currentClass(state);
  const total = wealth(state);
  if (total < cls.floor) {
    if (state.classIndex === 0) {
      state.status = 'lost';
      log(
        state,
        `Fim da estação: ${fmt(total)} florins não bastam nem para um Servo. Masmorra!`,
        'bad',
      );
      return 'down';
    }
    state.classIndex -= 1;
    log(
      state,
      `Fim da estação: abaixo do piso de ${cls.name}. Você caiu para ${currentClass(state).name}.`,
      'bad',
    );
    return 'down';
  }
  if (total >= cls.ceiling && state.classIndex < TOP_CLASS) {
    state.ascensionOffer = true;
    const next = getClass(state.classIndex + 1);
    log(
      state,
      `Fim da estação: o camareiro oferece o título de ${next.name} por ${fmt(cls.ascensionFee)} florins.`,
      'good',
    );
    return 'up-offer';
  }
  log(state, `Fim da estação: você segue ${cls.name}.`, 'neutral');
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

function rollForecasts(state: GameState): void {
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
    position.value -= amount;
    state.cash += amount;
    if (position.value < 0.005) delete state.positions[assetId];
  }
}

function logWeekSummary(state: GameState, report: WeekReport): void {
  const pnl = Object.values(report.positionPnl).reduce((a, b) => a + b, 0);
  const net = pnl + report.bondIncome - report.hedgeFees - report.livingCost;
  const sign = net >= 0 ? '+' : '';
  log(
    state,
    `Semana ${state.week}: ${sign}${fmt(net)} florins (cotas ${fmt(pnl)}, títulos ${fmt(report.bondIncome)}, seguros -${fmt(report.hedgeFees)}, custo de vida -${fmt(report.livingCost)}).`,
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
