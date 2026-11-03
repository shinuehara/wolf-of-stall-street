import {
  ASTROLOGER_ACCURACY,
  DRUNK_ACCURACY,
  EVENT_CHANCE,
  EVENTS,
  GUILDS,
  MAX_ACTIVE_EVENTS,
  SEASON_LENGTH,
  STARTING_GOLD,
  TOP_CLASS,
  getClass,
  getEvent,
  getExpert,
  getGuild,
} from './data';
import { applyHedge, bands, generateForecast, leansUp, sampleReturn } from './forecast';
import { nextRandom, pick, randomInt } from './rng';
import type { ExpertId, GameState, GuildDef, LogEntry, SocialClass } from './types';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

export interface WeekReport {
  /** Return in % per guild (market move, before insurance). */
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

export function newGame(seed: number = Date.now() >>> 0): GameState {
  const state: GameState = {
    version: 1,
    seed,
    rngState: seed,
    week: 0,
    classIndex: 0,
    cash: STARTING_GOLD,
    positions: {},
    guilds: Object.fromEntries(
      GUILDS.map((g) => [g.id, { id: g.id, price: g.startPrice, history: [g.startPrice] }]),
    ),
    forecasts: {},
    insights: [],
    events: [],
    ascensionOffer: false,
    status: 'playing',
    log: [],
  };
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

export function expertCost(state: GameState, expertId: ExpertId): number {
  const expert = getExpert(expertId);
  if (expert.baseCost === 0 && expert.wealthCost === 0) return 0;
  const raw = expert.baseCost + expert.wealthCost * Math.max(0, wealth(state));
  return Math.round(raw * 10) / 10;
}

export function hedgeFee(state: GameState, guildId: string): number {
  const position = state.positions[guildId];
  if (!position?.hedged) return 0;
  return position.value * currentClass(state).hedgeFeeRate;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function buy(state: GameState, guildId: string, amount: number): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const guild = getGuild(guildId);
  if (!isGuildUnlocked(state, guild)) {
    return fail(`Só a partir de ${getClass(guild.minClass).name} se negocia com a ${guild.name}.`);
  }
  if (!(amount > 0)) return fail('Informe um valor positivo.');
  if (amount > state.cash + 1e-9) return fail('Você não tem tantos florins livres.');
  amount = Math.min(amount, state.cash);
  state.cash -= amount;
  const position = (state.positions[guildId] ??= { value: 0, hedged: false });
  position.value += amount;
  return ok;
}

export function sell(state: GameState, guildId: string, amount: number): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const position = state.positions[guildId];
  if (!position || position.value <= 0) return fail('Você não tem cotas desta guilda.');
  if (!(amount > 0)) return fail('Informe um valor positivo.');
  amount = Math.min(amount, position.value);
  position.value -= amount;
  state.cash += amount;
  if (position.value < 0.005) delete state.positions[guildId];
  return ok;
}

export function setHedge(state: GameState, guildId: string, hedged: boolean): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const position = state.positions[guildId];
  if (!position) return fail('Só dá para segurar uma posição que você tem.');
  position.hedged = hedged;
  return ok;
}

export function consult(state: GameState, expertId: ExpertId, guildId: string): ActionResult {
  if (state.status !== 'playing') return fail('O jogo terminou.');
  const expert = getExpert(expertId);
  const guild = getGuild(guildId);
  if (state.classIndex < expert.minClass) {
    return fail(
      `O ${expert.name} não atende quem está abaixo de ${getClass(expert.minClass).name}.`,
    );
  }
  if (!isGuildUnlocked(state, guild)) return fail('Você ainda não tem acesso a esta guilda.');
  if (state.insights.some((i) => i.expert === expertId && i.guildId === guildId)) {
    return fail('Você já consultou este especialista sobre esta guilda nesta semana.');
  }
  const cost = expertCost(state, expertId);
  if (cost > state.cash) return fail('Você não tem florins livres para pagar a consulta.');
  const forecast = state.forecasts[guildId];
  if (!forecast) throw new Error(`No forecast for ${guildId}`);

  state.cash -= cost;
  if (expertId === 'spy') {
    state.insights.push({ expert: 'spy', guildId, bands: bands(forecast) });
  } else {
    const accuracy = expertId === 'astrologer' ? ASTROLOGER_ACCURACY : DRUNK_ACCURACY;
    const truth = leansUp(forecast);
    const honest = nextRandom(state) < accuracy;
    state.insights.push({ expert: expertId, guildId, leansUp: honest ? truth : !truth });
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
  for (const guildId of Object.keys(state.positions)) {
    const fee = hedgeFee(state, guildId);
    report.hedgeFees += fee;
    state.cash -= fee;
  }

  // 2. The market moves.
  for (const guild of GUILDS) {
    const forecast = state.forecasts[guild.id];
    const guildState = state.guilds[guild.id];
    if (!forecast || !guildState) continue;
    const raw = sampleReturn(forecast, nextRandom(state), nextRandom(state));
    report.marketReturns[guild.id] = raw;
    guildState.price *= 1 + raw / 100;
    guildState.history.push(guildState.price);

    const position = state.positions[guild.id];
    if (position) {
      const applied = position.hedged ? applyHedge(forecast, raw) : raw;
      const pnl = position.value * (applied / 100);
      position.value += pnl;
      report.positionPnl[guild.id] = pnl;
    }
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
      log(state, `📯 ${event.headline}`, 'neutral');
    }
  }
}

function rollForecasts(state: GameState): void {
  const events = state.events.map((e) => getEvent(e.id));
  for (const guild of GUILDS) {
    state.forecasts[guild.id] = generateForecast(state, guild, events);
  }
}

/** Sells positions proportionally until there is at least `needed` cash on hand, if possible. */
function raiseCash(state: GameState, needed: number): void {
  const missing = needed - state.cash;
  if (missing <= 0) return;
  const total = invested(state);
  if (total <= 0) return;
  const fraction = Math.min(1, missing / total);
  for (const [guildId, position] of Object.entries(state.positions)) {
    const amount = position.value * fraction;
    position.value -= amount;
    state.cash += amount;
    if (position.value < 0.005) delete state.positions[guildId];
  }
}

function logWeekSummary(state: GameState, report: WeekReport): void {
  const pnl = Object.values(report.positionPnl).reduce((a, b) => a + b, 0);
  const net = pnl + report.bondIncome - report.hedgeFees - report.livingCost;
  const sign = net >= 0 ? '+' : '';
  log(
    state,
    `Semana ${state.week}: ${sign}${fmt(net)} florins (guildas ${fmt(pnl)}, títulos ${fmt(report.bondIncome)}, seguros -${fmt(report.hedgeFees)}, custo de vida -${fmt(report.livingCost)}).`,
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
