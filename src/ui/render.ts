import {
  MONTH_LENGTH,
  getItem,
  getManager,
  MANAGERS,
  getInvestor,
  ASTROLOGER_ACCURACY,
  ASTRO_GUILD_REPORT_LEVEL,
  ASTRO_VOTES,
  ASTROS,
  DRUNK_FILLER,
  SPY_BREAKDOWN_LEVEL,
  SPY_GUILD_REPORT_LEVEL,
  DRUNK_DRINKS_PER_WEEK,
  DRUNK_PLACES,
  DRUNK_RAMBLE_CHANCE,
  DRUNK_RAMBLES,
  DRUNK_RUMORS,
  SPY_FAKE_CHANCE,
  CHART_WEEKS_BASE,
  CHART_WEEKS_SCRIBE,
  INSURERS_DISCOUNT,
  PERKS,
  BOND_LOCK_MULTIPLIER,
  BOND_LOCK_WEEKS,
  CITY,
  CLASSES,
  EXPERTS,
  GUILD_DESCRIPTIONS,
  GUILDS,
  LOCAL_DEMAND,
  REGIONS,
  SEASON_LENGTH,
  TRADE_FEE,
  STOP_GAIN_LEVELS,
  STOP_LOSS_LEVELS,
  TOP_CLASS,
  companiesOf,
  getClass,
  getCompany,
  getEvent,
  getGuild,
  getRegion,
  isRegionId,
  PARK_LIMIT,
} from '../sim/data';
import {
  BOND_LIQUID,
  BOND_LOCKED,
  assetName,
  assetRange,
  assetProphecy,
  bondRate,
  isBond,
  isManager,
  managerAsset,
  managerOf,
  companyExposures,
  componentsOf,
  factorForecast,
  guildOfAsset,
  isBasket,
} from '../sim/assets';
import { hedgeBounds, type Range } from '../sim/forecast';
import {
  currentClass,
  expertCost,
  fmt,
  hedgeFee,
  hedgeQuote,
  reading,
  sellAllPreview,
  isMatured,
  maturedValue,
  monthParkedSoFar,
  expertOfPerk,
  perkCost,
  tradeFee,
  ascensionCost,
  expertLevel,
  expertRankName,
  hasShockWarnings,
  isGuildUnlocked,
  onlyBonds,
  nextPerkLevel,
  perkLevel,
  season,
  wealth,
  weeksUntilSeasonEnd,
  type WeekReport,
} from '../sim/game';
import type {
  ExpertId,
  GameState,
  GuildDef,
  Insight,
  LogEntry,
  SeasonReview,
  Sector,
  WeekRecord,
  ManagerId,
  WeekBar,
} from '../sim/types';
import { seasonReturn, seasonSpeech } from './ceremony';
import { GALA_NAMES, galaUrl, sceneUrl, storyUrl, type SceneName } from './scenes';
import { storyFor } from './story';
import { expertSprite, maxRank, sprite, type SpriteName } from './sprites';

export type Screen = SceneName;

export interface UiState {
  screen: Screen;
  /** Asset shown in the market: a guild id (basket) or a company id. */
  selectedAsset: string;
  /** Which panel the Square shows: this week's news or the city almanac. */
  squareTab: 'news' | 'almanac';
  /** Almanac entry: 'city', a region id or a guild id. */
  almanacEntry: string;
  /** Which line of the pending story cut scene is showing. */
  storyStep: number;
  /** The investor's offer was put aside for now (still answerable until the week ends). */
  offerDismissed: boolean;
  /** The week's price time-lapse is playing (before the report). */
  timelapse: boolean;
  /** Quarter-close party: 0 = the scene and the speech, 1 = the numbers. */
  galaStep: 0 | 1;
  /** The visitor of the month was sent away (or not yet). */
  visitorDismissed: boolean;
  /** Which view the portfolio shows: today's holdings or past returns. */
  portfolioTab: 'position' | 'returns' | 'managers';
  /** Guilds whose companies are listed under the basket in the market. */
  expandedGuilds: Record<string, boolean>;
  /** On narrow screens the market shows either the list or one asset's detail. */
  marketDetailOpen: boolean;
  tavernExpert: ExpertId;
  /** Tavern view: ask experts or hire perks. */
  tavernTab: 'ask' | 'hire';
  amounts: Record<string, string>;
  lastReport: WeekReport | null;
  weekNews: LogEntry[];
  showReport: boolean;
  confirmingRestart: boolean;
  /** The "sell everything" button was pressed and waits for confirmation. */
  confirmingSellAll: boolean;
  message: { text: string; tone: 'error' | 'info' } | null;
}

export function initialUi(): UiState {
  return {
    screen: 'square',
    selectedAsset: BOND_LIQUID,
    squareTab: 'news',
    portfolioTab: 'position',
    storyStep: 0,
    offerDismissed: false,
    timelapse: false,
    galaStep: 0,
    visitorDismissed: false,
    almanacEntry: 'city',
    expandedGuilds: { bakers: true },
    marketDetailOpen: false,
    tavernExpert: 'astrologer',
    tavernTab: 'ask',
    amounts: {},
    lastReport: null,
    weekNews: [],
    showReport: false,
    confirmingRestart: false,
    confirmingSellAll: false,
    message: null,
  };
}

export const SCREENS: {
  id: Screen;
  label: string;
  icon: SpriteName;
  title: string;
  tagline: string;
}[] = [
  {
    id: 'square',
    label: 'Praça',
    icon: 'fountain',
    title: 'Praça Central',
    tagline: 'Onde o arauto grita as notícias do reino.',
  },
  {
    id: 'market',
    label: 'Mercado',
    icon: 'tent',
    title: 'Mercado das Guildas',
    tagline: 'Compre na baixa, venda na alta, reze no meio.',
  },
  {
    id: 'portfolio',
    label: 'Carteira',
    icon: 'scroll',
    title: 'Casa de Contas',
    tagline: 'Onde o escriba anota cada florim que entra e sai.',
  },
  {
    id: 'tavern',
    label: 'Taverna',
    icon: 'mug',
    title: 'Taverna do Javali Bêbado',
    tagline: 'Rumores, profecias e segredos à venda.',
  },
  {
    id: 'castle',
    label: 'Castelo',
    icon: 'castle',
    title: 'Castelo do Conde',
    tagline: 'Títulos, juros da Coroa e a escada social.',
  },
];

const SECTOR_NAMES: Record<Sector, string> = {
  food: 'Alimentos',
  commodities: 'Commodities',
  health: 'Saúde',
  banking: 'Bancos',
  retail: 'Varejo',
  industry: 'Indústria',
  shipping: 'Navegação',
  spices: 'Especiarias',
};

const GUILD_SPRITE: Record<string, SpriteName> = {
  bakers: 'bread',
  mines: 'pickaxe',
  apothecaries: 'potion',
  changers: 'coin',
  fair: 'tent',
  forge: 'anvil',
  fleet: 'ship',
  spices: 'pepper',
};

const MANAGER_SPRITE: Record<ManagerId, SpriteName> = {
  prudencio: 'scroll',
  ambrosina: 'coin',
  rodrigo: 'hood2',
};

/**
 * Buttons to buy the titles on offer: one per class you can climb to, each with the total
 * price; the ones the purse cannot pay are disabled.
 */
function titleOfferHtml(
  state: GameState,
  lead: string,
  laterAction: string,
  laterLabel: string,
): string {
  const levels = state.ascensionOffer;
  const buttons = Array.from({ length: levels }, (_, i) => {
    const target = getClass(state.classIndex + i + 1);
    const cost = ascensionCost(state, i + 1);
    return `<button class="pbtn" data-action="accept-title" data-levels="${i + 1}" ${state.purse >= cost ? '' : 'disabled'}>${levels > 1 ? `Até ${target.name}` : `Virar ${target.name}`} · ${fmt(cost)} fl</button>`;
  }).join('');
  return `<div class="offer">
      <p>${sprite('scroll', 20)} <span>${lead} ${levels > 1 ? `Você pode subir <strong>${levels} classes</strong> de uma vez, um título por classe.` : ''} Pago do seu bolso (<strong class="gold">${fmt(state.purse)} fl</strong>).</span></p>
      <div class="actions">${buttons}<button class="pbtn pbtn-ghost" data-action="${laterAction}">${laterLabel}</button></div>
    </div>`;
}

/** Distinct line colours for the companies of a basket chart. */
const COMPANY_COLORS = ['var(--blue)', 'var(--purple)', 'var(--orange)'];

/** Scale of the range bars, in % per week. */
const SCALE = 25;

/** Weeks of history shown in charts. */
/** Weeks of history shown in charts; set per render from the Scribe perk. */
let CHART_WEEKS = CHART_WEEKS_BASE;

/** The Drunk's rank right now: his old rumours read better once he is trained. */
let DRUNK_LEVEL = 0;

function assetSprite(assetId: string): SpriteName {
  if (isBond(assetId)) return 'crown';
  if (isManager(assetId)) return MANAGER_SPRITE[managerOf(assetId)];
  return GUILD_SPRITE[guildOfAsset(assetId).id]!;
}

/** "Setor Padeiros" for a guild id, the company name otherwise. */
function targetName(targetId: string): string {
  if (targetId === 'city') return `PIB de ${CITY.name}`;
  if (isRegionId(targetId)) return getRegion(targetId).name;
  return isBasket(targetId) ? `Cesta ${getGuild(targetId).short}` : getCompany(targetId).name;
}

/** "Cidade" or the district name, for news tags. */
function localTag(targetId: string): string {
  return targetId === 'city' ? 'Cidade' : getRegion(targetId).name;
}

function localDemandLabel(value: number): string {
  if (value >= 1) return 'vive da freguesia do bairro';
  if (value >= 0.7) return 'depende bastante do bairro';
  if (value >= 0.5) return 'sente um pouco o bairro';
  return 'vende para longe; o bairro pouco importa';
}

function cityBetaLabel(value: number): string {
  if (value >= 1.2) return 'é o primeiro a sentir as crises e as bonanças da cidade';
  if (value >= 0.9) return 'acompanha a economia da cidade';
  return 'sente pouco as crises da cidade';
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function render(state: GameState, ui: UiState): string {
  CHART_WEEKS = state.perks.scribe ? CHART_WEEKS_SCRIBE : CHART_WEEKS_BASE;
  DRUNK_LEVEL = expertLevel(state, 'drunk');
  const screen = SCREENS.find((s) => s.id === ui.screen) ?? SCREENS[0]!;
  return `
    <div class="game">
      ${renderHud(state)}
      <main class="stage">
        <div class="scene" style="background-image:url(${sceneUrl(screen.id)})">
          <div class="scene-caption">
            <h1>${screen.title}</h1>
            <p>${screen.tagline}</p>
          </div>
        </div>
        <section class="screen screen-${screen.id}" aria-label="${screen.title}">
          ${renderScreen(state, ui)}
        </section>
      </main>
      ${renderNav(state, ui)}
      ${ui.message ? `<div class="toast toast-${ui.message.tone}" role="status">${esc(ui.message.text)}</div>` : ''}
      ${renderModal(state, ui)}
    </div>`;
}

function renderScreen(state: GameState, ui: UiState): string {
  switch (ui.screen) {
    case 'square':
      return renderSquare(state, ui);
    case 'market':
      return renderMarket(state, ui);
    case 'portfolio':
      return renderPortfolio(state, ui);
    case 'tavern':
      return renderTavern(state, ui);
    case 'castle':
      return renderCastle(state, ui);
  }
}

function renderHud(state: GameState): string {
  const cls = currentClass(state);
  const total = wealth(state);
  const isTop = state.classIndex >= TOP_CLASS;
  const lo = cls.floor * 0.8;
  const hi = isTop ? total : cls.ceiling * 1.1;
  const pos = (x: number) => clampPct(((x - lo) / (hi - lo)) * 100);
  const zone = isTop ? 'up' : total < cls.floor ? 'down' : total >= cls.ceiling ? 'up' : 'mid';
  return `<header class="hud px">
    <div class="hud-class">
      ${sprite(isTop ? 'crown' : 'shield', 32)}
      <div>
        <span class="hud-label">Classe</span>
        <strong class="hud-value">${cls.name}</strong>
      </div>
    </div>
    <div class="hud-stat" title="Dinheiro dos investidores sob sua gestão">
      <span class="hud-label">Fundo</span>
      <strong class="hud-value">${fmt(total)} fl</strong>
    </div>
    <div class="hud-stat" title="Ouro do fundo parado, sem render">
      <span class="hud-label">Livres</span>
      <strong class="hud-value">${fmt(state.cash)} fl</strong>
    </div>
    <div class="hud-stat purse" title="Seu bolso: recebe as taxas e paga especialistas, melhorias, títulos e custo de vida">
      <span class="hud-label">Seu bolso</span>
      <strong class="hud-value gold">${fmt(state.purse)} fl</strong>
    </div>
    <div class="hud-stat hud-week">
      <span class="hud-label">${season(state)}º trimestre · mês ${monthOfQuarter(state)}</span>
      <strong class="hud-value">Semana ${state.week + 1}</strong>
    </div>
    ${
      isTop
        ? ''
        : `<div class="hud-meter" title="Avaliação em ${weeksUntilSeasonEnd(state)} semana(s)">
            <div class="meter-head">
              <span class="hud-label">Avaliação em ${weeksUntilSeasonEnd(state)} sem.</span>
              <span class="meter-zone-label zone-${zone}">${zone === 'down' ? 'vai cair!' : zone === 'up' ? 'pode subir!' : 'seguro'}</span>
            </div>
            <div class="meter-track">
              <div class="meter-fill zone-down" style="left:0;width:${pos(cls.floor)}%"></div>
              <div class="meter-fill zone-up" style="left:${pos(cls.ceiling)}%;right:0"></div>
              <div class="meter-marker" style="left:${pos(total)}%"></div>
            </div>
            <div class="meter-ends"><span>piso ${whole(cls.floor)}</span><span>teto ${whole(cls.ceiling)}</span></div>
          </div>`
    }
  </header>`;
}

function renderNav(state: GameState, ui: UiState): string {
  const playing = state.status === 'playing';
  const fees = Object.keys(state.positions).reduce((sum, id) => sum + hedgeFee(state, id), 0);
  const bills = fees;
  return `<nav class="nav px" aria-label="Locais">
    ${SCREENS.map(
      (
        s,
        i,
      ) => `<button class="nav-btn ${ui.screen === s.id ? 'active' : ''}" data-action="go" data-screen="${s.id}"
        aria-current="${ui.screen === s.id ? 'page' : 'false'}" title="${s.label} (tecla ${i + 1})">
        ${sprite(s.icon, 28)}
        <span>${s.label}</span>
        ${s.id === 'castle' && state.ascensionOffer ? '<span class="badge">!</span>' : ''}
      </button>`,
    ).join('')}
    <button class="nav-btn end-week" data-action="end-week" ${playing ? '' : 'disabled'}
      title="Encerrar a semana (seguros do fundo: ${fmt(bills)} fl)">
      ${sprite('hourglass', 28)}
      <span>Fim da semana</span>
    </button>
  </nav>`;
}

// ---------------------------------------------------------------------------
// Praça
// ---------------------------------------------------------------------------

function renderSquare(state: GameState, ui: UiState): string {
  const events = state.events.map((e) => ({ def: getEvent(e.id), weeksLeft: e.weeksLeft }));
  const cls = currentClass(state);
  const report = ui.lastReport;
  const net = report ? reportNet(report) : null;
  const total = wealth(state);
  const weeks = weeksUntilSeasonEnd(state);
  let verdict = `Faltam ${weeks} semana(s) para o Meirinho conferir o piso. Passe do teto de ${whole(cls.ceiling)} fl em qualquer semana e o camareiro vende o próximo título.`;
  if (state.classIndex >= TOP_CLASS) verdict = 'Você é Conde. O reino é seu.';
  else if (total < cls.floor)
    verdict = `Cuidado! Faltam ${weeks} semana(s) e você está abaixo do piso de ${whole(cls.floor)} fl. Se nada mudar, vai cair de classe.`;
  else if (total >= cls.ceiling)
    verdict = `Você passou do teto de ${whole(cls.ceiling)} fl: o camareiro tem um título à venda no Castelo.`;

  const noNews =
    events.length === 0 && state.companyEvents.length === 0 && state.localNews.length === 0;
  const tabs = `<div class="tabs" role="tablist">
    <button role="tab" class="tab ${ui.squareTab === 'news' ? 'active' : ''}" aria-selected="${ui.squareTab === 'news'}" data-action="square-tab" data-tab="news">${sprite('scroll', 16)} Notícias da semana</button>
    <button role="tab" class="tab ${ui.squareTab === 'almanac' ? 'active' : ''}" aria-selected="${ui.squareTab === 'almanac'}" data-action="square-tab" data-tab="almanac">${sprite('castle', 16)} Almanaque de ${CITY.name}</button>
  </div>`;
  if (ui.squareTab === 'almanac')
    return `<div class="square">${tabs}${renderAlmanac(state, ui)}</div>`;
  return `<div class="square">
  ${tabs}
  <div class="cols cols-3">
    <article class="card px">
      <h2>${sprite('scroll', 20)} O Arauto anuncia</h2>
      ${noNews ? '<p class="muted">Tempos calmos no reino. Por enquanto.</p>' : ''}
      ${
        state.visitor
          ? `<button class="visitor-call px" data-action="open-visitor">${sprite(state.visitor.kind === 'merchant' ? 'tent' : 'hood0', 28)}<span><strong>${state.visitor.kind === 'merchant' ? 'Um Mercador Viajante está na praça' : 'Um Contrabandista sussurra na esquina'}</strong><span class="small muted">Só até o fim da semana. Ver ofertas ▶</span></span></button>`
          : ''
      }
      ${
        state.investorOffer
          ? `<button class="visitor-call px" data-action="open-offer">${sprite('coin', 28)}<span><strong>${getInvestor(state.investorOffer.kind).name} quer investir ${fmt(state.investorOffer.amount)} fl</strong><span class="small muted">Responda até o fim da semana ▶</span></span></button>`
          : ''
      }
      <ul class="news">
        ${state.localNews
          .map(
            (n) => `<li>
              <button class="linkish news-link" data-action="almanac" data-entry="${n.targetId}"><span class="news-tag tag-local">${localTag(n.targetId)}</span></button>
              <span class="muted">· ${n.weeksLeft} sem.</span>
              <p class="headline">"${esc(n.headline)}"</p>
            </li>`,
          )
          .join('')}
        ${events
          .map(
            ({ def, weeksLeft }) => `<li>
              <span class="news-tag">Reino</span> <strong>${def.name}</strong> <span class="muted">· ${weeksLeft} sem.</span>
              <p class="headline">"${def.headline}"</p>
              <div class="chips">${Object.entries(def.effects)
                .map(
                  ([sector, v]) =>
                    `<span class="chip ${tone(v)}">${SECTOR_NAMES[sector as Sector]} ${v > 0 ? '▲' : '▼'}</span>`,
                )
                .join('')}</div>
            </li>`,
          )
          .join('')}
        ${state.companyEvents
          .map((e) => {
            const company = getCompany(e.companyId);
            return `<li>
              <button class="linkish news-link" data-action="open-asset" data-asset="${company.id}">
                <span class="news-tag">${getGuild(company.guildId).short}</span>
              </button>
              <p class="headline">"${esc(e.headline)}"</p>
              <div class="chips"><span class="chip ${tone(e.shift)}">${company.name} ${e.shift > 0 ? '▲' : '▼'}</span></div>
            </li>`;
          })
          .join('')}
      </ul>
    </article>
    <article class="card px">
      <h2>${sprite('coin', 20)} Sua semana</h2>
      ${
        report && net !== null
          ? `<p class="big ${tone(net)}">${signed(net)} fl</p>
             <ul class="ledger">
               <li><span>Cotas</span><span class="${tone(sumPnl(report))}">${signed(sumPnl(report))}</span></li>
               <li><span>Títulos da Coroa</span><span class="up">${signed(report.bondIncome)}</span></li>
               <li><span>Seguros</span><span class="down">${signed(-report.hedgeFees)}</span></li>
               <li><span>Taxas pagas a você</span><span class="down">${signed(-(report.managementFee + report.performanceFee))}</span></li>
             </ul>
             <p class="small">Seu bolso: <span class="up">+${fmtCost(report.managementFee)}</span> de administração, <span class="up">+${fmtCost(report.performanceFee)}</span> de performance, <span class="down">-${fmtCost(report.livingCost)}</span> de custo de vida.</p>`
          : `<p>Investidores confiaram <strong class="gold">100 florins</strong> ao seu fundo. Você tem <strong class="gold">${fmt(state.purse)} fl</strong> no bolso e um sonho: virar <strong>Conde</strong>.</p>
             <p class="muted small">Toda semana você recebe uma taxa de administração (sobre o fundo) e uma de performance (sobre o lucro). Do seu bolso saem especialistas, melhorias, títulos e o custo de vida.</p>
             <p class="muted">Ouro parado não rende. No <strong>Mercado</strong>, estacione nos Títulos da Coroa, compre a cesta de uma guilda ou aposte numa empresa. Na <strong>Taverna</strong>, ouça rumores. Depois, encerre a semana.</p>`
      }
    </article>
    <article class="card px">
      <h2>${sprite('castle', 20)} O trimestre</h2>
      <p>${verdict}</p>
      ${
        state.riskyDeposits.length
          ? `<div class="chips">${state.riskyDeposits
              .map((d) => {
                const investor = getInvestor(d.kind);
                return `<span class="chip down" title="${esc(investor.risk)}">${d.kind === 'militia' ? 'Dinheiro da Milícia' : 'Dinheiro do Abade'} · ${d.weeksLeft} sem. de risco</span>`;
              })
              .join('')}</div>`
          : ''
      }
      ${
        state.effects.length
          ? `<div class="chips">${state.effects
              .map((e) => {
                const item = getItem(e.id);
                return `<span class="chip ${item.seller === 'smuggler' ? 'down' : 'up'}" title="${esc(item.effect)}">${item.name} · ${e.weeksLeft} sem.</span>`;
              })
              .join('')}</div>`
          : ''
      }
      <p class="muted small">Ouro parado não rende. No Mercado, os Títulos da Coroa pagam ${pct(cls.bondRate * 100, 2)} por semana (livre) ou ${pct(cls.bondRate * BOND_LOCK_MULTIPLIER * 100, 2)} (preso ${BOND_LOCK_WEEKS} semanas). Suas taxas: ${pct(cls.managementFeeRate * 100, 2)} do fundo por semana + ${whole(cls.performanceFeeRate * 100)}% do lucro. Seu custo de vida: ${fmtCost(cls.livingCost)} fl por semana.</p>
    </article>
  </div>
  <div class="travel">
    ${SCREENS.filter((s) => s.id !== 'square')
      .map(
        (s) => `<button class="travel-btn px" data-action="go" data-screen="${s.id}">
          ${sprite(s.icon, 40)}
          <span><strong>${s.id === 'tavern' ? 'Ir à' : 'Ir ao'} ${s.label}</strong><span class="small muted">${s.tagline}</span></span>
        </button>`,
      )
      .join('')}
  </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Almanaque
// ---------------------------------------------------------------------------

function renderAlmanac(state: GameState, ui: UiState): string {
  const entry = ui.almanacEntry;
  const item = (id: string, label: string, icon: string, locked = false) =>
    `<li><button class="almanac-link ${entry === id ? 'selected' : ''} ${locked ? 'locked' : ''}" data-action="almanac" data-entry="${id}">${icon}<span>${label}</span></button></li>`;
  const index = `<nav class="almanac-index px" aria-label="Almanaque">
    <h3>A cidade</h3>
    <ul>${item('city', CITY.name, sprite('castle', 20))}</ul>
    <h3>Bairros</h3>
    <ul>${REGIONS.map((r) => item(r.id, r.name, `<span class="standing standing-${r.id}">${r.standing}</span>`)).join('')}</ul>
    <h3>Guildas</h3>
    <ul>${GUILDS.map((g) => item(g.id, g.short, sprite(GUILD_SPRITE[g.id]!, 20), !isGuildUnlocked(state, g))).join('')}</ul>
  </nav>`;

  let body: string;
  if (entry === 'city') body = renderCityEntry(state);
  else if (isRegionId(entry)) body = renderRegionEntry(state, entry);
  else body = renderGuildEntry(state, entry);
  return `<div class="almanac">${index}<article class="almanac-body px">${body}</article></div>`;
}

function indicatorChart(state: GameState, id: string, label: string): string {
  return renderChart(
    [{ values: state.indicators[id]!.history, color: 'var(--gold)', main: true, label }],
    false,
    `${label} nas últimas`,
  );
}

function factorRangeLine(state: GameState, factorId: string, what: string): string {
  const p = state.prophecies[factorId]!;
  return `<p>A profecia diz que ${what} termina o trimestre entre <strong>${pct(p.low, 0)} e ${pct(p.high, 0)}</strong>; até agora andou <strong class="${tone(p.progress)}">${pct(p.progress)}</strong>.</p>`;
}

function localNewsList(state: GameState, targetId: string): string {
  const news = state.localNews.filter((n) => n.targetId === targetId);
  if (news.length === 0) return '<p class="muted small">Nenhuma notícia por aqui nesta semana.</p>';
  return `<ul class="news">${news.map((n) => `<li><p class="headline">"${esc(n.headline)}"</p><span class="muted small">mais ${n.weeksLeft} sem.</span></li>`).join('')}</ul>`;
}

function renderCityEntry(state: GameState): string {
  return `<header class="almanac-head">${sprite('castle', 40)}<div><h2>${CITY.name}</h2><span class="muted small">A cidade e seu PIB</span></div></header>
    <div class="almanac-grid">
      <div class="almanac-col">
        <p>${CITY.description}</p>
        <p class="muted small">O PIB move todas as empresas, umas mais que outras: a Ribeira sente mais, o Alto da Coroa sente menos.
        A economia anda em ciclos que duram várias semanas; o gráfico mostra a tendência.</p>
        ${factorRangeLine(state, 'city', 'o PIB')}
      </div>
      <div class="almanac-col">
        ${indicatorChart(state, 'city', 'PIB')}
        <h3>Notícias da cidade</h3>
        ${localNewsList(state, 'city')}
      </div>
    </div>`;
}

function renderRegionEntry(state: GameState, regionId: string): string {
  const region = getRegion(regionId);
  const companies = GUILDS.flatMap((g) => companiesOf(g.id)).filter((c) => c.regionId === regionId);
  return `<header class="almanac-head"><span class="standing standing-${region.id} big-standing">${region.standing}</span><div><h2>${region.name}</h2><span class="muted small">Bairro ${region.standing}: ${cityBetaLabel(region.cityBeta)}</span></div></header>
    <div class="almanac-grid">
      <div class="almanac-col">
        <p>${region.description}</p>
        ${factorRangeLine(state, region.id, 'a demanda do bairro')}
        <h3>Notícias do bairro</h3>
        ${localNewsList(state, region.id)}
      </div>
      <div class="almanac-col">
        ${indicatorChart(state, region.id, 'Demanda')}
        <h3>Empresas sediadas aqui</h3>
        <ul class="almanac-companies">${companies
          .map((c) => {
            const guild = getGuild(c.guildId);
            const locked = !isGuildUnlocked(state, guild);
            return `<li><button class="member" data-action="open-asset" data-asset="${c.id}" ${locked ? 'disabled' : ''}>
              ${sprite(GUILD_SPRITE[guild.id]!, 16)} <span class="member-name">${c.name}</span>
              <span class="muted small">${guild.short} · ${localDemandLabel(LOCAL_DEMAND[guild.sector])}</span>
            </button></li>`;
          })
          .join('')}</ul>
      </div>
    </div>`;
}

/** Why a guild is closed: the story has not reached it yet, or the class is too low. */
function lockReason(state: GameState, guild: GuildDef): string {
  const chapter = guild.minChapter ?? 1;
  if (state.story.chapter < chapter) {
    return state.story.chapter === 0 ? 'proibido ao povo' : 'abre no próximo trimestre';
  }
  return `a partir de ${getClass(guild.minClass).name}`;
}

function renderGuildEntry(state: GameState, guildId: string): string {
  const guild = getGuild(guildId);
  const locked = !isGuildUnlocked(state, guild);
  return `<header class="almanac-head">${sprite(GUILD_SPRITE[guild.id]!, 40)}<div><h2>${guild.name}</h2><span class="muted small">${SECTOR_NAMES[guild.sector]}${locked ? ` · 🔒 ${lockReason(state, guild)}` : ''}</span></div></header>
    <div class="almanac-grid">
      <div class="almanac-col">
        <p>${GUILD_DESCRIPTIONS[guild.id] ?? ''}</p>
        <p class="muted small">Sobre os bairros: este setor ${localDemandLabel(LOCAL_DEMAND[guild.sector])}.</p>
        ${locked ? '' : factorRangeLine(state, guild.id, 'o setor')}
      </div>
      <div class="almanac-col">
        <h3>As empresas</h3>
        <ul class="almanac-companies">${companiesOf(guild.id)
          .map(
            (
              c,
            ) => `<li><button class="member" data-action="open-asset" data-asset="${c.id}" ${locked ? 'disabled' : ''}>
              <span class="member-name">${c.name}</span>
              <span class="small"><span class="standing standing-${c.regionId}">${getRegion(c.regionId).name}</span> ${c.trait}</span>
            </button></li>`,
          )
          .join('')}</ul>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Mercado
// ---------------------------------------------------------------------------

function renderMarket(state: GameState, ui: UiState): string {
  return `<div class="market ${ui.marketDetailOpen ? 'detail-open' : ''}">
    <ul class="guild-list px" aria-label="Guildas e empresas">
      <li class="sell-all-row">${sellAllBar(state, ui)}</li>
      ${renderCrownGroup(state, ui)}
      ${GUILDS.map((g) => renderGuildGroup(state, ui, g)).join('')}
    </ul>
    <article class="guild-detail px">${renderAssetDetail(state, ui, ui.selectedAsset)}</article>
  </div>`;
}

/** "Sell everything" with an in-page confirmation (the broker charges every sale). */
function sellAllBar(state: GameState, ui: UiState): string {
  const { amount, fees, count } = sellAllPreview(state);
  const playing = state.status === 'playing';
  if (ui.confirmingSellAll && count > 0) {
    return `<div class="sell-all confirm">
      <span>Vender <strong>tudo</strong> (${count} ${count === 1 ? 'posição' : 'posições'}): recebe <strong class="gold">${fmt(amount - fees)} fl</strong>${fees > 0 ? `, paga <span class="down">${fmtCost(fees)} fl</span> de corretagem` : ''}.${state.lockedBonds.length > state.lockedBonds.filter((b) => isMatured(state, b)).length ? ' Títulos ainda presos ficam até completar 4 semanas.' : ''}</span>
      <span class="actions">
        <button class="pbtn pbtn-small pbtn-sell" data-action="confirm-sell-all">Vender tudo</button>
        <button class="pbtn pbtn-small pbtn-ghost" data-action="cancel-sell-all">Cancelar</button>
      </span>
    </div>`;
  }
  return `<div class="sell-all">
    <span class="muted small">${count > 0 ? `Aplicado: ${fmt(amount)} fl em ${count} ${count === 1 ? 'posição' : 'posições'}` : 'Nada aplicado'}${parkedNote(state)}</span>
    <button class="pbtn pbtn-small pbtn-sell" data-action="sell-all" ${playing && count > 0 ? '' : 'disabled'}>Vender tudo</button>
  </div>`;
}

/** Warns when investors will judge the month as parked in the Crown (or idle gold). */
function parkedNote(state: GameState): string {
  if (state.story.chapter < 1 || state.status !== 'playing') return '';
  const parked = monthParkedSoFar(state);
  if (parked <= PARK_LIMIT - 0.15) return '';
  const tone = parked > PARK_LIMIT ? 'down' : 'gold';
  return ` · <span class="${tone}" title="Investidores toleram até ${whole(PARK_LIMIT * 100)}% do fundo parado (florins livres + Coroa) na média do mês. Acima disso, alguns sacam no fim do mês.">Parado na Coroa no mês: ${whole(parked * 100)}%${parked > PARK_LIMIT ? ' ⚠ investidores vão sacar' : ''}</span>`;
}

function renderCrownGroup(state: GameState, ui: UiState): string {
  const lockedTotal = state.lockedBonds.reduce((sum, b) => sum + b.value, 0);
  const row = (
    id: string,
    label: string,
    held: number,
  ) => `<div class="asset-item ${ui.selectedAsset === id ? 'selected' : ''}">
      <span class="toggle-spacer"></span>
      <button class="guild-row" data-action="select-asset" data-asset="${id}">
        ${sprite('crown', 28)}
        <span class="row-name">${label}</span>
        <span class="row-range gold">${pct(bondRate(state, id) * 100, 2)} por semana</span>
        <span class="row-pos ${held ? 'gold' : 'muted'}">${held ? `${fmt(held)} fl` : '—'}</span>
      </button>
      ${quickBar(state, id)}
    </div>`;
  return `<li class="crown-group">
    ${row(BOND_LIQUID, 'Coroa <span class="muted small">(livre)</span>', state.positions[BOND_LIQUID]?.value ?? 0)}
    ${row(BOND_LOCKED, `Coroa <span class="muted small">(${BOND_LOCK_WEEKS} sem.)</span>`, lockedTotal)}
  </li>`;
}

function renderGuildGroup(state: GameState, ui: UiState, guild: GuildDef): string {
  if (!isGuildUnlocked(state, guild)) {
    return `<li><button class="guild-row locked" data-action="select-asset" data-asset="${guild.id}">
      ${sprite(GUILD_SPRITE[guild.id]!, 28)}
      <span class="row-name">${guild.short}</span>
      <span class="row-range muted">🔒 ${lockReason(state, guild)}</span><span></span>
    </button></li>`;
  }

  const expanded = Boolean(ui.expandedGuilds[guild.id]);
  const companies = companiesOf(guild.id);
  const inCompanies = companies.reduce((s, c) => s + (state.positions[c.id]?.value ?? 0), 0);

  const row = (assetId: string, label: string, isCompany: boolean) => {
    const position = state.positions[assetId];
    const toggle = isCompany
      ? '<span class="toggle-spacer"></span>'
      : `<button class="toggle" data-action="toggle-guild" data-guild="${guild.id}" aria-expanded="${expanded}"
          title="${expanded ? 'Esconder' : 'Mostrar'} as empresas da guilda">${expanded ? '▾' : '▸'}</button>`;
    const extra =
      !isCompany && !expanded && inCompanies > 0
        ? ` <span class="muted small">+ ${fmt(inCompanies)} em empresas</span>`
        : '';
    return `<div class="asset-item ${isCompany ? 'company-item' : ''} ${ui.selectedAsset === assetId ? 'selected' : ''}">
      <div class="row-side">${toggle}${hedgeButton(state, assetId)}</div>
      <button class="guild-row ${isCompany ? 'company-row' : ''}" data-action="select-asset" data-asset="${assetId}">
        ${isCompany ? '<span class="tree">└</span>' : sprite(GUILD_SPRITE[guild.id]!, 28)}
        <span class="row-name">${label}${hasShockWarnings(state) && (state.shockRisk[assetId] ?? 0) > 0.05 ? ' <span class="warn" title="Informantes: risco alto de choque">⚠</span>' : ''}</span>
        <span class="row-range">${potentialChip(state, assetId)}</span>
        <span class="row-pos ${position ? 'gold' : 'muted'}">${position ? `${fmt(position.value)} fl${position.hedged ? ' 🛡' : ''}` : '—'}${extra}</span>
      </button>
      ${quickBar(state, assetId)}
    </div>`;
  };

  return `<li class="${expanded ? 'group-open' : ''}">
    ${row(guild.id, `${guild.short} <span class="muted small">(cesta)</span>`, false)}
    ${expanded ? companies.map((c) => row(c.id, c.name, true)).join('') : ''}
  </li>`;
}

const QUICK_SHARES: [share: number, label: string][] = [
  [0.05, '+5%'],
  [0.1, '+10%'],
  [0.5, '+50%'],
  [1, '+Tudo'],
  [-0.05, '-5%'],
  [-0.1, '-10%'],
  [-0.5, '-50%'],
  [-1, '-Tudo'],
];

/** Buy/sell shortcuts sized as a share of total wealth (capped by free gold or the position). */
function quickBar(state: GameState, assetId: string): string {
  const playing = state.status === 'playing';
  const canBuy = playing && state.cash > 0.005;
  const canSell =
    playing &&
    (assetId === BOND_LOCKED ? maturedValue(state) > 0.005 : Boolean(state.positions[assetId]));
  const name = assetName(assetId);
  return `<div class="quick" role="group" aria-label="Compra e venda rápida: ${esc(name)}">
    ${QUICK_SHARES.map(([share, label]) => {
      const buying = share > 0;
      const enabled = buying ? canBuy : canSell;
      const title = buying
        ? share >= 1
          ? `Comprar ${name} com todos os florins livres`
          : `Comprar ${name}: ${label.slice(1)} do patrimônio (até o que estiver livre)`
        : share <= -1
          ? `Vender toda a posição em ${name}`
          : `Vender ${name}: ${label.slice(1)} do patrimônio (até zerar a posição)`;
      return `<button class="qbtn ${buying ? 'qbuy' : 'qsell'}" data-action="quick" data-asset="${assetId}" data-share="${share}"
        title="${esc(title)}" ${enabled ? '' : 'disabled'}>${label}</button>`;
    }).join('')}
  </div>`;
}

function renderBondDetail(state: GameState, ui: UiState, assetId: string): string {
  const locked = assetId === BOND_LOCKED;
  const rate = bondRate(state, assetId);
  const playing = state.status === 'playing';
  const position = state.positions[assetId];
  const held = locked ? state.lockedBonds.reduce((s, b) => s + b.value, 0) : (position?.value ?? 0);
  const weekly = locked ? state.lockedBonds.reduce((s, b) => s + b.value * b.rate, 0) : held * rate;
  const back = `<button class="pbtn pbtn-small back-btn" data-action="close-detail">◀ Guildas</button>`;
  const lots = [...state.lockedBonds].sort((a, b) => a.maturesWeek - b.maturesWeek);
  return `${back}
    <header class="detail-head">
      ${sprite('crown', 48)}
      <div class="detail-title">
        <h2>${assetName(assetId)}</h2>
        <span class="muted small">Empréstimo à Coroa de ${CITY.name}: rendimento garantido, sem surpresas</span>
      </div>
      <div class="detail-price"><strong class="gold">${pct(rate * 100, 2)}</strong><span class="muted small">por semana</span></div>
    </header>
    <div class="detail-grid">
      <div class="detail-main">
        <p>${
          locked
            ? `Rende <strong>${BOND_LOCK_MULTIPLIER}×</strong> o título livre, mas o ouro fica <strong>preso por ${BOND_LOCK_WEEKS} semanas</strong>. A taxa fica fixa na compra. Depois das ${BOND_LOCK_WEEKS} semanas o lote <strong>continua rendendo</strong> e pode ser vendido quando você quiser.`
            : 'Rende a taxa da sua classe toda semana. Compre e venda quando quiser: é o lugar para estacionar o ouro entre uma aposta e outra.'
        }</p>
        <p class="muted small">Florins livres parados não rendem nada. A taxa sobe conforme você sobe na escada social.</p>
        <ul class="ledger">
          <li><span>Você tem aqui</span><span class="gold">${fmt(held)} fl</span></li>
          <li><span>Rendimento previsto nesta semana</span><span class="up">+${weekly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} fl</span></li>
          ${locked ? '' : `<li><span>Rendimento do título preso</span><span>${pct(bondRate(state, BOND_LOCKED) * 100, 2)}/sem</span></li>`}
        </ul>
        ${
          locked
            ? lots.length
              ? `<h3>Seus lotes</h3><ul class="ledger">${lots
                  .map(
                    (b) =>
                      `<li><span>${fmt(b.value)} fl a ${pct(b.rate * 100, 2)}/sem</span><span>${isMatured(state, b) ? '<span class="up">livre para vender</span>' : `preso até a semana ${b.maturesWeek} (faltam ${b.maturesWeek - state.week})`}</span></li>`,
                  )
                  .join('')}</ul>`
              : '<p class="muted small">Você não tem lotes presos.</p>'
            : ''
        }
      </div>
      <div class="detail-side">
        <div class="trade-box">
          <div class="trade">
            <input id="amount-${assetId}" type="number" inputmode="decimal" min="0" step="1" placeholder="florins"
              aria-label="Valor em florins" data-amount="${assetId}" value="${esc(ui.amounts[assetId] ?? '')}" ${playing ? '' : 'disabled'} />
          </div>
          <div class="trade">
            <button class="pbtn pbtn-small" data-action="fill" data-fraction="0.25" data-asset="${assetId}" ${playing ? '' : 'disabled'}>25%</button>
            <button class="pbtn pbtn-small" data-action="fill" data-fraction="0.5" data-asset="${assetId}" ${playing ? '' : 'disabled'}>50%</button>
            <button class="pbtn pbtn-small" data-action="fill" data-fraction="1" data-asset="${assetId}" ${playing ? '' : 'disabled'}>Tudo</button>
          </div>
          <div class="trade">
            <button class="pbtn pbtn-buy" data-action="buy" data-asset="${assetId}" ${playing ? '' : 'disabled'}>${locked ? `Prender por ${BOND_LOCK_WEEKS} sem.` : 'Comprar'}</button>
            <button class="pbtn pbtn-sell" data-action="sell" data-asset="${assetId}" ${playing && (locked ? maturedValue(state) > 0.005 : position) ? '' : 'disabled'}>Vender${locked ? ' liberados' : ''}</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAssetDetail(state: GameState, ui: UiState, assetId: string): string {
  if (isBond(assetId)) return renderBondDetail(state, ui, assetId);
  const guild = guildOfAsset(assetId);
  const basket = isBasket(assetId);
  const company = basket ? null : getCompany(assetId);
  const back = `<button class="pbtn pbtn-small back-btn" data-action="close-detail">◀ Guildas</button>`;
  const subtitle = basket
    ? `Cesta da ${guild.name}: um pouco de cada uma das 3 empresas`
    : `${guild.name} · sediada em ${getRegion(company!.regionId).name} (bairro ${getRegion(company!.regionId).standing})`;
  const head = (extra = '') => `<header class="detail-head">
      ${sprite(GUILD_SPRITE[guild.id]!, 48)}
      <div class="detail-title">
        <h2>${assetName(assetId)}</h2>
        <span class="muted small">${subtitle}</span>
      </div>
      ${extra}
    </header>`;

  if (!isGuildUnlocked(state, guild)) {
    return `${back}${head()}
      <p class="locked-note">${
        state.story.chapter < (guild.minChapter ?? 1)
          ? state.story.chapter === 0
            ? `🔒 Por decreto, o povo só pode comprar Títulos da Coroa. A ${guild.name} ainda não aceita o seu dinheiro.`
            : `🔒 A ${guild.name} abre para o povo no próximo trimestre.`
          : `🔒 A ${guild.name} só negocia com quem é <strong>${getClass(guild.minClass).name}</strong> ou mais. Suba na escada social para entrar.`
      }</p>`;
  }

  const asset = state.assets[assetId]!;
  const range = assetRange(state, assetId);
  const position = state.positions[assetId];
  const playing = state.status === 'playing';
  const hedgeRange = hedgeBounds(range);
  const fee = position
    ? position.value *
      currentClass(state).hedgeFeeRate *
      (state.perks.insurers ? 1 - INSURERS_DISCOUNT : 1)
    : 0;
  const lastMove = ui.lastReport?.marketReturns[assetId];
  const lastPnl = ui.lastReport?.positionPnl[assetId];
  const components = componentsOf(assetId);

  const targets = [
    'city',
    ...new Set(components.map((c) => c.regionId)),
    guild.id,
    ...(basket ? [] : [assetId]),
  ];
  const insights = state.insights.filter(
    (i) => targets.includes(i.targetId) && (i.expert !== 'drunk' || DRUNK_LEVEL >= 4),
  );
  const sectorNews = state.events
    .map((e) => getEvent(e.id))
    .filter((e) => (e.effects[guild.sector] ?? 0) !== 0)
    .map((e) => ({ label: e.name, shift: e.effects[guild.sector] ?? 0 }));
  const companyNews = state.companyEvents
    .filter((e) => components.some((c) => c.id === e.companyId))
    .map((e) => ({ label: e.headline, shift: e.shift }));
  const localNews = state.localNews
    .filter((n) => n.targetId === 'city' || components.some((c) => c.regionId === n.targetId))
    .map((n) => ({ label: `${localTag(n.targetId)}: ${n.headline}`, shift: 0 }));
  const warned = hasShockWarnings(state)
    ? components.filter((c) => (state.shockRisk[c.id] ?? 0) > 0.05)
    : [];
  const shockNews = warned.map((c) => ({
    label: `⚠ Informantes: risco de choque em ${c.name}`,
    shift: -1,
  }));
  const news = [...shockNews, ...sectorNews, ...companyNews, ...localNews];

  const price = `<div class="detail-price">
      <strong>${fmt(asset.price)} fl</strong>
      ${lastMove === undefined ? '' : `<span class="${tone(lastMove)}">${pct(lastMove)}</span>`}
    </div>`;

  const chartSeries = basket
    ? [
        {
          values: asset.history,
          color: 'var(--gold)',
          main: true,
          label: 'Cesta',
          bars: asset.bars,
        },
        ...components.map((c, i) => ({
          values: state.assets[c.id]!.history,
          bars: state.assets[c.id]!.bars,
          color: COMPANY_COLORS[i] ?? 'var(--muted)',
          main: false,
          label: c.name,
        })),
      ]
    : [
        {
          values: asset.history,
          color: 'var(--gold)',
          main: true,
          label: assetName(assetId),
          bars: asset.bars,
        },
      ];

  const members = basket
    ? `<div class="members">${components
        .map((c, i) => {
          const move = ui.lastReport?.marketReturns[c.id];
          return `<button class="member" data-action="select-asset" data-asset="${c.id}">
            <span class="swatch" style="background:${COMPANY_COLORS[i]}"></span>
            <span class="member-name">${c.name}</span>
            ${potentialChip(state, c.id)}
            ${move === undefined ? '' : `<span class="${tone(move)} small">semana: ${pct(move)}</span>`}
          </button>`;
        })
        .join('')}</div>`
    : '';

  const factorLabel = (factorId: string) =>
    factorId === 'city'
      ? 'cidade'
      : isRegionId(factorId)
        ? 'bairro'
        : isBasket(factorId)
          ? 'setor'
          : 'própria';
  const breakdown = company
    ? `<p class="muted small breakdown">= ${companyExposures(company)
        .map(({ factorId, weight }) => {
          const f = factorForecast(state, factorId);
          const w =
            factorId === company.id || !state.perks.chronicler ? '' : ` ×${fmtBeta(weight)}`;
          return `${factorLabel(factorId)} ${pct(f.low, 0)} a ${pct(f.high, 0)}${w}`;
        })
        .join(
          ' + ',
        )}${state.perks.chronicler ? '' : ' <span class="hint-perk">(os pesos de cada parte: contrate o Cronista)</span>'}</p>`
    : '';

  return `${back}${head(price)}
    <div class="detail-grid">
      <div class="detail-main">
        ${readingCard(state, assetId)}
        ${renderChart(chartSeries, basket, undefined, undefined, stopMarks(state, assetId))}
        ${members}
        <details class="more">
          <summary>Ver detalhes: profecia, o que cada ajudante disse, humor da semana</summary>
          ${company ? `<p class="trait">${company.trait}</p>` : ''}
          ${prophecyBlock(state, assetId)}
          ${insights.length ? `<div class="insights">${insights.map((i) => renderInsight(i, true, state.week)).join('')}</div>` : ''}
          <div class="forecast forecast-week">
            <div class="forecast-label small">Humor da semana: o arauto espera <strong>${pct(range.low, 0)} a ${pct(range.high, 0)}</strong>, contando só com a faixa pública</div>
            ${rangeBar(range, position?.hedged ? hedgeRange : null)}
            ${breakdown}
          </div>
        </details>
      </div>
      <div class="detail-side">
        ${news.length ? `<div class="chips">${news.map((n) => `<span class="chip ${tone(n.shift)}">${esc(n.label)}${n.shift > 0 ? ' ▲' : n.shift < 0 ? ' ▼' : ''}</span>`).join('')}</div>` : ''}

        <div class="trade-box">
          <div class="holding">
            Sua posição: <strong class="gold">${fmt(position?.value ?? 0)} fl</strong>
            ${lastPnl === undefined ? '' : `<span class="${tone(lastPnl)}">(${signed(lastPnl)} na semana passada)</span>`}
          </div>
          <div class="trade">
            <input id="amount-${assetId}" type="number" inputmode="decimal" min="0" step="1" placeholder="florins"
              aria-label="Valor em florins" data-amount="${assetId}" value="${esc(ui.amounts[assetId] ?? '')}" ${playing ? '' : 'disabled'} />
          </div>
          <div class="trade">
            <button class="pbtn pbtn-small" data-action="fill" data-fraction="0.25" data-asset="${assetId}" ${playing ? '' : 'disabled'}>25%</button>
            <button class="pbtn pbtn-small" data-action="fill" data-fraction="0.5" data-asset="${assetId}" ${playing ? '' : 'disabled'}>50%</button>
            <button class="pbtn pbtn-small" data-action="fill" data-fraction="1" data-asset="${assetId}" ${playing ? '' : 'disabled'}>Tudo</button>
          </div>
          <div class="trade">
            <button class="pbtn pbtn-buy" data-action="buy" data-asset="${assetId}" ${playing ? '' : 'disabled'}>Comprar</button>
            <button class="pbtn pbtn-sell" data-action="sell" data-asset="${assetId}" ${playing && position ? '' : 'disabled'}>Vender</button>
          </div>
          ${
            position
              ? `<label class="hedge ${position.hedged ? 'on' : ''}">
                  <input type="checkbox" data-hedge="${assetId}" ${position.hedged ? 'checked' : ''} ${playing ? '' : 'disabled'} />
                  ${sprite('shield', 20)}
                  <span>Seguro: limita a <strong>${pct(hedgeRange.floor)} a ${pct(hedgeRange.cap)}</strong>, inclusive contra choques, por ${fmtCost(fee)} fl/sem</span>
                </label>`
              : '<p class="muted small">Vender sem valor vende tudo.</p>'
          }
          ${position ? stopControls(state, assetId) : ''}
          ${
            isBasket(assetId) || !isBond(assetId)
              ? `<p class="muted small">Corretagem da guilda: ${(TRADE_FEE * 100).toLocaleString('pt-BR')}% em cada compra e venda (${fmtCost(tradeFee(assetId, 10))} fl a cada 10 fl).</p>`
              : ''
          }
        </div>
      </div>
    </div>`;
}

interface Series {
  values: number[];
  color: string;
  main: boolean;
  label: string;
  /** How each week traded (aligned with values); weeks without a bar get a visual wobble. */
  bars?: (WeekBar | null)[];
}

/** A horizontal line on a chart (a stop order). */
interface ChartMark {
  value: number;
  label: string;
  tone: 'up' | 'down';
}

/**
 * Price history as a stepped pixel line chart. For a basket, the companies are rescaled to
 * start where the basket starts, so the lines compare performance rather than price levels.
 */
interface ChartPoint {
  /** Position in weeks from the start of the window. */
  t: number;
  v: number;
}

/** Points drawn between two weekly closes, for a market-like line. */
const TICKS_PER_WEEK = 6;

/**
 * Adds intra-week oscillation between weekly closes so the line looks like a market chart.
 * Purely visual: each week is a random-walk bridge that starts and ends exactly at the real
 * closes, seeded by the series and the absolute week so it never changes between renders.
 */
function oscillate(
  values: number[],
  key: string,
  firstWeek: number,
  bars?: (WeekBar | null)[],
): ChartPoint[] {
  const points: ChartPoint[] = [{ t: 0, v: values[0]! }];
  // Only as jumpy as the series really is: a fund in Crown bonds draws a smooth line.
  const returns = values.slice(1).map((v, i) => (values[i]! > 0 ? v / values[i]! - 1 : 0));
  const mean = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const sd = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length || 1));
  const daily = Math.min(0.009, sd * 0.5);
  for (let i = 1; i < values.length; i++) {
    const from = values[i - 1]!;
    const to = values[i]!;
    // A week played: draw how it really traded (gap, low and high in order, close).
    const bar = bars?.[i];
    if (bar) {
      const at = (move: number) => from * (1 + move / 100);
      if (bar.gap !== 0) points.push({ t: i - 1 + 0.05, v: at(bar.gap) });
      points.push({ t: i - 1 + 0.35, v: at(bar.lowFirst ? bar.low : bar.high) });
      points.push({ t: i - 1 + 0.7, v: at(bar.lowFirst ? bar.high : bar.low) });
      points.push({ t: i, v: to });
      continue;
    }
    let seed = hashString(`${key}:${firstWeek + i}`);
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296 - 0.5;
    };
    const walk = [0];
    for (let k = 1; k <= TICKS_PER_WEEK; k++) walk.push(walk[k - 1]! + rand());
    const end = walk[TICKS_PER_WEEK]!;
    // Daily noise up to 0.9% of the price (less for calm series), more in weeks that moved a
    // lot; none at all for a smooth series (Crown bonds).
    const scale = sd < 0.0005 ? 0 : Math.abs(from) * daily + Math.abs(to - from) * 0.35;
    for (let k = 1; k <= TICKS_PER_WEEK; k++) {
      const f = k / TICKS_PER_WEEK;
      const bridge = k === TICKS_PER_WEEK ? 0 : (walk[k]! - f * end) * scale;
      points.push({ t: i - 1 + f, v: from + (to - from) * f + bridge });
    }
  }
  return points;
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function renderChart(
  series: Series[],
  rescale: boolean,
  title = 'Preço nas últimas',
  maxWeeks = CHART_WEEKS,
  marks: ChartMark[] = [],
): string {
  const main = series.find((s) => s.main)!;
  const n = Math.min(maxWeeks + 1, main.values.length);
  if (n < 2) {
    return `<div class="chart chart-empty px"><span class="muted">O gráfico aparece depois da primeira semana.</span></div>`;
  }
  const firstWeek = main.values.length - n;
  const windowed = series.map((s) => {
    const values = s.values.slice(-n);
    const bars = s.bars?.slice(-n);
    if (!rescale || s.main) return { ...s, values, bars };
    const base = values[0]!;
    const target = main.values[firstWeek]!;
    return { ...s, values: values.map((v) => (v / base) * target), bars };
  });
  const dense = windowed.map((s) => ({
    ...s,
    points: oscillate(s.values, s.label, firstWeek, s.bars),
  }));
  const all = [...dense.flatMap((s) => s.points.map((p) => p.v)), ...marks.map((m) => m.value)];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min) * 0.08 || max * 0.05 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const W = 300;
  const H = 100;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const linePath = (points: ChartPoint[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(2)} ${y(p.v).toFixed(2)}`)
      .join(' ');
  const mainDense = dense.find((s) => s.main)!;
  const mainValues = mainDense.values;
  const area = `${linePath(mainDense.points)} L${W} ${H} L0 ${H} Z`;
  const lastY = y(mainValues[mainValues.length - 1]!);
  const startValue = mainValues[0]!;
  const endValue = mainValues[mainValues.length - 1]!;
  const change = ((endValue - startValue) / startValue) * 100;

  return `<figure class="chart px">
    <figcaption class="chart-head">
      <span>${title} ${n - 1} semana(s): <strong class="${tone(change)}">${pct(change)}</strong></span>
      ${
        windowed.length > 1
          ? `<span class="legend">${windowed.map((s) => `<span><i style="background:${s.color}"></i>${s.main ? 'Cesta' : s.label}</span>`).join('')}</span>`
          : ''
      }
    </figcaption>
    <div class="chart-body">
      <div class="chart-axis"><span>${fmt(hi)}</span><span>${fmt(lo)}</span></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfico de preço">
        <line x1="0" x2="${W}" y1="${y(startValue).toFixed(1)}" y2="${y(startValue).toFixed(1)}" class="chart-base" vector-effect="non-scaling-stroke" />
        <path d="${area}" class="chart-area" />
        ${dense
          .filter((s) => !s.main)
          .map(
            (s) =>
              `<path d="${linePath(s.points)}" fill="none" stroke="${s.color}" stroke-width="1.25" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.8" />`,
          )
          .join('')}
        <path d="${linePath(mainDense.points)}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        <line x1="0" x2="${W}" y1="${lastY.toFixed(1)}" y2="${lastY.toFixed(1)}" class="chart-last" vector-effect="non-scaling-stroke" />
        ${marks
          .map(
            (m) =>
              `<line x1="0" x2="${W}" y1="${y(m.value).toFixed(1)}" y2="${y(m.value).toFixed(1)}" class="chart-stop chart-stop-${m.tone}" vector-effect="non-scaling-stroke"><title>${esc(m.label)}</title></line>`,
          )
          .join('')}
      </svg>
      ${marks
        .map(
          (m) =>
            `<span class="chart-stop-label ${m.tone}" style="top:${((y(m.value) / H) * 100).toFixed(1)}%">${esc(m.label)}</span>`,
        )
        .join('')}
    </div>
    <div class="chart-foot"><span>há ${n - 1} sem.</span><span>agora</span></div>
  </figure>`;
}

/** What an expert is like at a given rank, for the tavern cards. */
function expertBlurb(expert: ExpertId, level: number): string {
  const pctText = (p: number) => `${Math.round(p * 100)}%`;
  switch (expert) {
    case 'drunk': {
      const clues = [
        'Fala enrolado: você que adivinhe de que guilda e de que lado.',
        'Já diz de que guilda é a fofoca e o bairro.',
        'Aponta o bairro no mapa.',
        'Diz se é coisa boa ou ruim.',
        'Diz até o nome da empresa.',
      ];
      return `Uma bebida, uma fofoca. Nunca mente, mas às vezes só fala bobagem. ${clues[Math.min(level, 4)]}`;
    }
    case 'astrologer': {
      const rank = Math.min(level, ASTRO_VOTES.length - 1);
      const n = ASTRO_VOTES[rank]!;
      const acc = ASTROLOGER_ACCURACY[rank]!;
      return `Lê ${n === 1 ? 'um astro' : `${n} astros`} sobre o fim do trimestre (alta ou baixa); cada um acerta ${pctText(acc)}.${level >= ASTRO_GUILD_REPORT_LEVEL ? ' Mapa da guilda: a cesta traz as 3 empresas.' : ''}`;
    }
    case 'spy': {
      const rank = Math.min(level, SPY_FAKE_CHANCE.length - 1);
      const fake = SPY_FAKE_CHANCE[rank]!;
      const quality = [
        'Erra muito',
        'Erra menos',
        'Erra pouco',
        'Erra bem pouco',
        'Quase não erra',
      ][rank];
      const extras = [
        level >= SPY_BREAKDOWN_LEVEL ? 'análise completa' : '',
        level >= SPY_GUILD_REPORT_LEVEL ? 'relatório da guilda' : '',
      ].filter(Boolean);
      return `Estima onde o ativo termina o trimestre, faixa por faixa. ${quality}; ${pctText(fake)} de furos plantados.${extras.length ? ` Inclui ${extras.join(' e ')}.` : ''}`;
    }
  }
}

/**
 * The Drunk's rumour as he can say it now: the more he is trained, the more clues come with
 * it (guild icon and the district; the district icon; up or down; the company itself).
 */
/** The mumbling around a rumour: lots for the rookie, none once he is nearly sober. */
function drunkPadding(insight: Extract<Insight, { expert: 'drunk' }>, core: string): string {
  const before = [2, 1, 1, 0, 0][Math.min(DRUNK_LEVEL, 4)]!;
  const after = [1, 1, 0, 0, 0][Math.min(DRUNK_LEVEL, 4)]!;
  // A fixed shuffle per rumour, so the same mumbling comes back and never repeats itself.
  let seed = hashString(`${insight.week}|${insight.targetId}|${insight.line}|${insight.up}`) || 1;
  const order = DRUNK_FILLER.map((text, i) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return { text, key: (seed >> 8) + i };
  }).sort((x, y) => x.key - y.key);
  const said = order.map((o) => esc(o.text));
  return [...said.slice(0, before), core, ...said.slice(before, before + after)].join(' ');
}

function drunkLine(insight: Extract<Insight, { expert: 'drunk' }>): string {
  if (insight.ramble) return drunkPadding(insight, esc(DRUNK_RAMBLES[insight.line] ?? ''));
  const company = getCompany(insight.targetId);
  const guild = getGuild(company.guildId);
  const text = DRUNK_RUMORS[guild.sector][insight.up ? 'up' : 'down'][insight.line] ?? '';
  const lv = DRUNK_LEVEL;
  const arrow =
    lv >= 3
      ? `<strong class="${insight.up ? 'up' : 'down'}">${insight.up ? '▲' : '▼'}</strong>`
      : '';
  const sectorClue =
    lv >= 1
      ? ` <span class="drunk-clue">${sprite(GUILD_SPRITE[guild.id]!, 16, guild.short)}${arrow}</span>`
      : '';
  const placeChip =
    lv >= 4
      ? ` <span class="drunk-clue company-chip">${esc(company.name)}</span>`
      : lv >= 2
        ? ` <span class="standing standing-${company.regionId}">${getRegion(company.regionId).name}</span>`
        : '';
  const place = lv >= 1 ? `${DRUNK_PLACES[company.regionId]}${placeChip}` : '';
  const core = esc(text).replace('{S}', sectorClue).replace('{R}', place);
  return drunkPadding(insight, DRUNK_LEVEL >= 3 ? `<strong>${core}</strong>` : core);
}

/** A rank badge for an expert, coloured from rookie to master. */
function rankBadge(expert: ExpertId, level: number): string {
  const max = maxRank(expert);
  const tier = level <= 0 ? 0 : level >= max ? 3 : level === 1 ? 1 : 2;
  return `<span class="rank rank-${tier}">${expertRankName(expert, level)}</span>`;
}

function rankStars(expert: ExpertId, level: number): string {
  const max = maxRank(expert);
  return `<span class="stars" aria-label="nível ${level} de ${max}">${'★'.repeat(level)}${'☆'.repeat(max - level)}</span>`;
}

function renderInsight(insight: Insight, full: boolean, week = insight.week): string {
  const age = week - insight.week;
  const about = `<span class="insight-about">${insight.expert === 'drunk' ? '' : targetName(insight.targetId)} <span class="muted small">${age === 0 ? 'esta semana' : `há ${age} sem.`}</span></span>`;
  const face = sprite(expertSprite(insight.expert, insight.level), 20);
  const badge = rankBadge(insight.expert, insight.level);
  switch (insight.expert) {
    case 'drunk': {
      const drunkFace = sprite(expertSprite('drunk', DRUNK_LEVEL), 20);
      const when = `<span class="insight-about">${insight.ramble ? 'Bobagem ' : DRUNK_LEVEL >= 4 ? `${getCompany(insight.targetId).name} ` : 'Fofoca '}<span class="muted small">${age === 0 ? 'esta semana' : `há ${age} sem.`}</span></span>`;
      return `<div class="insight insight-drunk">${drunkFace}${when}${rankBadge('drunk', DRUNK_LEVEL)}<span><em>“${drunkLine(insight)}”</em></span></div>`;
    }
    case 'astrologer': {
      const ups = insight.votes.filter(Boolean).length;
      const n = insight.votes.length;
      const verdict = `<strong class="${insight.leansUp ? 'up' : 'down'}">${insight.leansUp ? ups : n - ups} de ${n} ${insight.leansUp ? 'alta' : 'baixa'}</strong>`;
      if (!full) return `<div class="insight">${face}${about}<span>${verdict}</span>${badge}</div>`;
      const stars = insight.votes
        .map((up, k) => {
          const astro = ASTROS[k]!;
          return `<span class="astro-vote ${up ? 'up' : 'down'}" title="${astro.name}">${astro.symbol} ${astro.name}: ${up ? 'alta' : 'baixa'}</span>`;
        })
        .join('');
      return `<div class="insight insight-astro">${face}${about}${badge}<div class="astro-votes">${stars}</div><span>→ ${verdict} até o fim do trimestre</span></div>`;
    }
    case 'spy':
      if (!full) {
        return `<div class="insight">${face}${about}<span>Chances: ${insight.bands.map((b, i) => `<span class="band-tone band-tone-${i + 1}">${Math.round(b.p * 100)}%</span>`).join(' · ')} ${badge}</span></div>`;
      }
      return `<div class="insight insight-spy">${face}${about}${badge}
        <div class="bands">${insight.bands
          .map(
            (b, i) => `<div class="band" title="Fim do trimestre: ${pct(b.from)} a ${pct(b.to)}">
              <span class="band-p band-tone-${i + 1}">${Math.round(b.p * 100)}%</span>
              <div class="band-bar band-bg-${i + 1}" style="height:${Math.max(2, Math.round(b.p * 36))}px"></div>
              <span class="band-range">${pct(b.from, 0)}…${pct(b.to, 0)}</span>
            </div>`,
          )
          .join('')}</div>${insight.parts ? spyParts(insight.parts) : ''}</div>`;
  }
}

/** The spy's full analysis: where each part of the asset ends the quarter. */
function spyParts(parts: { key: string; value: number }[]): string {
  const label = (key: string) =>
    key === 'city'
      ? `Economia de ${CITY.name}`
      : key === 'regions'
        ? 'Os bairros'
        : key === 'own'
          ? 'As empresas em si'
          : isRegionId(key)
            ? `Bairro ${getRegion(key).name}`
            : isBasket(key)
              ? `Setor ${getGuild(key).short}`
              : 'A empresa em si';
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return `<ul class="spy-parts">${parts
    .map(
      (p) =>
        `<li><span>${label(p.key)}</span><span class="${tone(p.value)}">${pct(p.value)}</span></li>`,
    )
    .join(
      '',
    )}<li class="spy-total"><span>Análise completa</span><span class="${tone(total)}">${pct(total)}</span></li></ul>`;
}

/** A shield next to each position in the market: one click turns its insurance on or off. */
function hedgeButton(state: GameState, assetId: string): string {
  const position = state.positions[assetId];
  if (!position || isBond(assetId) || isManager(assetId)) return '';
  const cover = hedgeBounds(assetRange(state, assetId));
  const fee = hedgeQuote(state, assetId);
  const title = position.hedged
    ? `Seguro ligado: a semana fica entre ${pct(cover.floor)} e ${pct(cover.cap)}, inclusive contra choques. Clique para desligar.`
    : `Ligar seguro: limita a semana a ${pct(cover.floor)} a ${pct(cover.cap)}, inclusive contra choques, por ${fmtCost(fee)} fl/sem.`;
  return `<button class="shield-btn ${position.hedged ? 'on' : ''}" data-action="toggle-hedge" data-asset="${assetId}" title="${esc(title)}" aria-pressed="${position.hedged}" ${state.status === 'playing' ? '' : 'disabled'}>${sprite('shield', 16, 'Seguro')}</button>`;
}

/** Price levels of a position's stops, for the chart. */
function stopMarks(state: GameState, assetId: string): ChartMark[] {
  const position = state.positions[assetId];
  if (!position || position.cost <= 0) return [];
  const price = state.assets[assetId]!.price;
  const r0 = position.value / position.cost - 1;
  const level = (ret: number) => price * ((1 + ret) / (1 + r0));
  const marks: ChartMark[] = [];
  if (position.stopGain !== undefined) {
    marks.push({
      value: level(position.stopGain),
      label: `stop gain ${pct(position.stopGain * 100, 0)}`,
      tone: 'up',
    });
  }
  if (position.stopLoss !== undefined) {
    marks.push({
      value: level(position.stopLoss),
      label: `stop loss ${pct(position.stopLoss * 100, 0)}`,
      tone: 'down',
    });
  }
  return marks;
}

/** Stop-order buttons for a position (with the broker), measured on its cost. */
function stopControls(state: GameState, assetId: string): string {
  if (isBond(assetId) || isManager(assetId)) return '';
  if (!state.perks.broker) {
    return '<p class="muted small">Stop loss e stop gain: contrate o Corretor de Ordens na Taverna.</p>';
  }
  const position = state.positions[assetId]!;
  const now = position.value / position.cost - 1;
  const button = (kind: 'loss' | 'gain', value: number | null, current: number | undefined) => {
    const on =
      value === null
        ? current === undefined
        : current !== undefined && Math.abs(current - value) < 1e-9;
    const label = value === null ? 'sem' : pct(value * 100, 0);
    return `<button class="qbtn ${kind === 'loss' ? 'qsell' : 'qbuy'} ${on ? 'on' : ''}" data-action="set-stop" data-kind="${kind}" data-value="${value ?? ''}" data-asset="${assetId}">${label}</button>`;
  };
  return `<div class="stops">
    <span class="small muted">Sobre o custo (agora <span class="${tone(now)}">${pct(now * 100)}</span>):</span>
    <div class="stop-row"><span class="small down">Stop loss</span>${[...STOP_LOSS_LEVELS, null].map((v) => button('loss', v, position.stopLoss)).join('')}</div>
    <div class="stop-row"><span class="small up">Stop gain</span>${[...STOP_GAIN_LEVELS, null].map((v) => button('gain', v, position.stopGain)).join('')}</div>
    ${destinyStop(state, assetId, now, position.stopGain)}
  </div>`;
}

/**
 * Stop gain where your reading says the asset ends the quarter: the remaining move from now,
 * turned into a return on the position's cost.
 */
function destinyStop(state: GameState, assetId: string, now: number, current?: number): string {
  const r = reading(state, assetId);
  if (!r.known) return '';
  const remaining = (1 + r.target / 100) / (1 + r.progress / 100) - 1;
  const onCost = Math.round(((1 + now) * (1 + remaining) - 1) * 1000) / 1000;
  if (onCost <= now + 0.005) {
    return '<p class="small muted">Stop gain no destino: o papel já chegou onde deve terminar o trimestre.</p>';
  }
  const on = current !== undefined && Math.abs(current - onCost) < 0.0015;
  return `<button class="qbtn qbuy destiny-stop ${on ? 'on' : ''}" data-action="set-stop" data-kind="gain" data-value="${onCost}" data-asset="${assetId}"
    title="Vende sozinho quando chegar onde você acredita que termina o trimestre">Stop gain no destino: ${pct(onCost * 100)} sobre o custo</button>`;
}

/** How strong a potential is, as arrows. */
function potentialArrows(value: number): string {
  if (value >= 6) return '▲▲';
  if (value >= 2) return '▲';
  if (value <= -6) return '▼▼';
  if (value <= -2) return '▼';
  return '≈';
}

/** The one number to decide on: how far the asset should still go this quarter. */
function potentialChip(state: GameState, assetId: string): string {
  const r = reading(state, assetId);
  if (!r.known) {
    return `<span class="potential unknown" title="Ninguém te contou nada sobre isto: pergunte na Taverna">Potencial ?</span>`;
  }
  const faces = r.sources
    .map((e) => sprite(expertSprite(e, expertLevel(state, e)), 14, e))
    .join('');
  return `<span class="potential ${tone(r.potential)}" title="Quanto ainda deve andar até o fim do trimestre, pelo que te contaram">${potentialArrows(r.potential)} ${pct(r.potential, 0)} ${faces}</span>`;
}

/** The detail's headline: the potential, where you think it ends, where it is, who told you. */
function readingCard(state: GameState, assetId: string): string {
  const r = reading(state, assetId);
  const left = weeksUntilSeasonEnd(state);
  const who: Record<ExpertId, string> = {
    spy: 'o Espião',
    astrologer: 'a Astróloga',
    drunk: 'o Bêbado',
  };
  if (!r.known) {
    return `<div class="reading px unknown">
      <span class="reading-big">Potencial ?</span>
      <p>Ninguém te contou para onde isto vai neste trimestre. Já andou <strong class="${tone(r.progress)}">${pct(r.progress)}</strong>, faltam ${left} semanas.
      <button class="linkish" data-action="go" data-screen="tavern">Pergunte na Taverna ▶</button></p>
    </div>`;
  }
  const verdict =
    r.potential >= 2
      ? 'ainda tem espaço para subir'
      : r.potential <= -2
        ? 'deve cair até o fim do trimestre'
        : 'já está perto de onde deve terminar';
  return `<div class="reading px ${tone(r.potential)}">
    <span class="reading-big">${potentialArrows(r.potential)} ${pct(r.potential)}</span>
    <p><strong>${verdict}.</strong> Pelo que ${r.sources.map((e) => who[e]).join(' e ')} ${r.sources.length > 1 ? 'disseram' : 'disse'}, termina o trimestre por volta de <strong>${pct(r.target, 0)}</strong>; já andou <strong class="${tone(r.progress)}">${pct(r.progress)}</strong>; faltam ${left} semanas.</p>
  </div>`;
}

/**
 * The quarter prophecy of an asset: the public range of where it ends the quarter, how far it
 * went already (marker) and the weeks left. A spy's answer shows as a gold mark.
 */
function prophecyBlock(state: GameState, assetId: string): string {
  const q = assetProphecy(state, assetId);
  const left = weeksUntilSeasonEnd(state);
  const spy = state.insights.find((i) => i.targetId === assetId && i.expert === 'spy');
  const spyMid =
    spy?.expert === 'spy'
      ? spy.bands.reduce((sum, b) => sum + b.p * ((b.from + b.to) / 2), 0) +
        ((q.low + q.high) / 2 - spy.publicMid)
      : null;
  const scale = Math.max(30, Math.abs(q.low) + 4, Math.abs(q.high) + 4, Math.abs(q.progress) + 4);
  const x = (v: number) => clampPct(((v + scale) / (2 * scale)) * 100);
  return `<div class="forecast prophecy">
    <div class="forecast-label">Profecia do trimestre: termina entre <strong>${pct(q.low, 0)} e ${pct(q.high, 0)}</strong> · já andou <strong class="${tone(q.progress)}">${pct(q.progress)}</strong> · faltam ${left} sem.</div>
    <div class="range prophecy-range" aria-hidden="true">
      <div class="range-band" style="left:${x(q.low)}%;width:${x(q.high) - x(q.low)}%"></div>
      <div class="range-zero" style="left:${x(0)}%"></div>
      ${spyMid !== null ? `<div class="prophecy-spy" style="left:${x(spyMid)}%" title="Espião: ${pct(spyMid)}"></div>` : ''}
      <div class="prophecy-now ${tone(q.progress)}" style="left:${x(q.progress)}%" title="Agora: ${pct(q.progress)}"></div>
    </div>
    <p class="muted small">▼ onde está agora${spyMid !== null ? ` · <span class="gold">◆ onde o Espião acha que termina (${pct(spyMid)})</span>` : ''}. O preço é puxado para o destino; se correu na frente, tende a devolver.</p>
  </div>`;
}

function rangeBar(r: Range, hedge: { floor: number; cap: number } | null): string {
  const x = (v: number) => clampPct(((v + SCALE) / (2 * SCALE)) * 100);
  return `<div class="range" aria-hidden="true">
    <div class="range-band" style="left:${x(r.low)}%;width:${x(r.high) - x(r.low)}%"></div>
    ${hedge ? `<div class="range-hedge" style="left:${x(hedge.floor)}%;width:${x(hedge.cap) - x(hedge.floor)}%"></div>` : ''}
    <div class="range-zero" style="left:${x(0)}%"></div>
  </div>
  <div class="range-scale"><span>-${SCALE}%</span><span>0</span><span>+${SCALE}%</span></div>`;
}

// ---------------------------------------------------------------------------
// Carteira
// ---------------------------------------------------------------------------

const ALLOC_COLORS = [
  'var(--gold)',
  'var(--blue)',
  'var(--purple)',
  'var(--orange)',
  'var(--green)',
  'var(--red)',
];

function renderPortfolio(state: GameState, ui: UiState): string {
  const tab = (id: UiState['portfolioTab'], label: string) =>
    `<button role="tab" class="tab ${ui.portfolioTab === id ? 'active' : ''}" aria-selected="${ui.portfolioTab === id}" data-action="portfolio-tab" data-tab="${id}">${label}</button>`;
  return `<div class="portfolio">
    <div class="tabs" role="tablist">${tab('position', 'Posição de hoje')}${tab('returns', 'Rentabilidade')}${tab('managers', 'Gestores')}</div>
    ${ui.portfolioTab === 'returns' ? renderReturns(state) : ui.portfolioTab === 'managers' ? renderManagers(state, ui) : renderPositions(state, ui)}
  </div>`;
}

function renderManagers(state: GameState, ui: UiState): string {
  const playing = state.status === 'playing';
  const lastPicks = ui.lastReport?.managerPicks ?? {};
  return `<div class="managers">
    <p class="muted small managers-intro">Entregue parte do fundo a um gestor: ele investe sozinho toda semana, com o estilo dele, e cobra pelo trabalho. O dinheiro continua no fundo (conta para a classe e para as suas taxas). Retire quando quiser.</p>
    <div class="manager-grid">${MANAGERS.map((m) => {
      const hired = state.managers.includes(m.id);
      const locked = state.classIndex < m.minClass;
      const asset = managerAsset(m.id);
      const position = state.positions[asset];
      const pnl = state.assetPnl[asset] ?? 0;
      const picks = lastPicks[m.id];
      const lastMove = ui.lastReport?.marketReturns[asset];
      return `<article class="manager-card px ${hired ? 'hired' : ''} ${locked ? 'locked' : ''}">
        <header>${sprite(MANAGER_SPRITE[m.id], 40)}<div><strong>${m.name}</strong><span class="muted small">${m.title}</span></div></header>
        <p class="small">“${m.line}”</p>
        <p class="small">${m.styleText}</p>
        <p class="small muted">Cobra ${(m.weeklyFee * 100).toFixed(2).replace('.', ',')}% do que gere por semana + ${whole(m.performanceShare * 100)}% do ganho.</p>
        ${
          locked
            ? `<p class="small down">🔒 Só trabalha para quem é ${getClass(m.minClass).name} ou mais.</p>`
            : !hired
              ? `<button class="pbtn pbtn-small" data-action="hire-manager" data-manager="${m.id}" ${playing && state.purse >= m.hireCost ? '' : 'disabled'}>Contratar · ${fmt(m.hireCost)} fl do bolso</button>`
              : `<div class="manager-status">
                  <span>Gere <strong class="gold">${fmt(position?.value ?? 0)} fl</strong></span>
                  <span class="${tone(pnl)}">${signed(pnl)} fl no total</span>
                  ${lastMove !== undefined ? `<span class="${tone(lastMove)}">última semana ${pct(lastMove)}</span>` : ''}
                </div>
                ${picks ? `<p class="small muted">Investiu em: ${picks.map((p) => `${assetName(p.id)} (${whole(p.weight * 100)}%)`).join(', ')}</p>` : ''}
                ${quickBar(state, asset)}
                <button class="linkish small" data-action="dismiss-manager" data-manager="${m.id}">Dispensar ${m.name}</button>`
        }
      </article>`;
    }).join('')}</div>
  </div>`;
}

function statTile(label: string, value: string, sub = '', toneClass = ''): string {
  return `<div class="tile px"><span class="hud-label">${label}</span><strong class="tile-value ${toneClass}">${value}</strong>${sub ? `<span class="muted small">${sub}</span>` : ''}</div>`;
}

interface Holding {
  id: string;
  name: string;
  where: string;
  value: number;
  cost: number;
  range: string;
  hedged: boolean;
}

function holdings(state: GameState): Holding[] {
  const fromPositions = Object.entries(state.positions).map(([id, p]) => {
    if (isManager(id)) {
      const manager = getManager(managerOf(id));
      return {
        id,
        name: manager.name,
        where: '<span class="muted small">gestor</span>',
        value: p.value,
        cost: p.cost,
        range: manager.title,
        hedged: false,
      };
    }
    const r = assetRange(state, id);
    const company = isBond(id) || isBasket(id) ? null : getCompany(id);
    return {
      id,
      name: assetName(id),
      where: isBond(id)
        ? '<span class="muted small">Coroa</span>'
        : company
          ? `<span class="standing standing-${company.regionId}">${getRegion(company.regionId).name}</span>`
          : '<span class="muted small">cesta</span>',
      value: p.value,
      cost: p.cost,
      range: isBond(id)
        ? `${pct(r.low, 2)} fixo`
        : `${pct(assetProphecy(state, id).low, 0)} a ${pct(assetProphecy(state, id).high, 0)}`,
      hedged: p.hedged,
    };
  });
  const lots = state.lockedBonds.map((b) => ({
    id: BOND_LOCKED,
    name: isMatured(state, b)
      ? 'Título da Coroa · livre, rendendo'
      : `Título da Coroa · preso até sem. ${b.maturesWeek}`,
    where: '<span class="muted small">Coroa (preso)</span>',
    value: b.value,
    cost: b.cost,
    range: `${pct(b.rate * 100, 2)} fixo`,
    hedged: false,
  }));
  return [...fromPositions, ...lots].sort((a, b) => b.value - a.value);
}

function renderPositions(state: GameState, ui: UiState): string {
  const total = wealth(state);
  const entries = holdings(state);
  const investedTotal = entries.reduce((s, h) => s + h.value, 0);
  const costTotal = entries.reduce((s, h) => s + h.cost, 0);
  const openGain = investedTotal - costTotal;
  const share = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const tiles = `<div class="tiles">
    ${statTile('Patrimônio', `${fmt(total)} fl`)}
    ${statTile('Aplicado', `${fmt(investedTotal)} fl`, `${whole(share(investedTotal))}% · cotas e Títulos da Coroa`)}
    ${statTile('Livres', `${fmt(state.cash)} fl`, `${whole(share(state.cash))}% · parados, não rendem`)}
    ${statTile('Ganho em aberto', `${signed(openGain)} fl`, costTotal > 0 ? pct((openGain / costTotal) * 100) + ' sobre o custo' : 'sem posições', tone(openGain))}
  </div>`;

  const bar = `<div class="alloc px" aria-label="Distribuição do patrimônio">
    ${entries
      .map(
        (h, i) =>
          `<span class="alloc-seg" style="width:${share(h.value)}%;background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}" title="${esc(h.name)}: ${whole(share(h.value))}%"></span>`,
      )
      .join('')}
    <span class="alloc-seg alloc-free" style="width:${share(state.cash)}%" title="Livres: ${whole(share(state.cash))}%"></span>
  </div>`;

  if (entries.length === 0) {
    return `${tiles}${bar}<div class="card px empty-state">
      <p>Você não tem nada aplicado. Ouro parado não rende: no Mercado há cotas de guildas e os Títulos da Coroa.</p>
      <button class="pbtn" data-action="go" data-screen="market">Ir ao Mercado</button>
    </div>`;
  }

  const rows = entries
    .map((h, i) => {
      const gain = h.value - h.cost;
      return `<tr>
        <td><button class="linkish asset-link" data-action="open-asset" data-asset="${h.id}">
          <span class="swatch" style="background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}"></span>
          ${sprite(assetSprite(h.id), 16)} ${h.name}</button></td>
        <td>${h.where}</td>
        <td class="num">${fmt(h.value)}</td>
        <td class="num muted">${fmt(h.cost)}</td>
        <td class="num ${tone(gain)}">${signed(gain)}</td>
        <td class="num ${tone(gain)}">${h.cost > 0 ? pct((gain / h.cost) * 100) : '—'}</td>
        <td class="num">${whole(share(h.value))}%</td>
        <td class="num">${isBond(h.id) || isManager(h.id) ? `<span class="muted">${h.range}</span>` : potentialChip(state, h.id)}</td>
        <td>${h.hedged ? '🛡 sim' : '<span class="muted">não</span>'}</td>
      </tr>`;
    })
    .join('');

  return `${tiles}${bar}
    ${sellAllBar(state, ui)}
    <div class="table-wrap px">
      <table class="ptable">
        <thead><tr><th>Ativo</th><th>Onde</th><th class="num">Valor</th><th class="num">Custo</th><th class="num">Ganho</th><th class="num">%</th><th class="num">Peso</th><th class="num">Potencial</th><th>Seguro</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total aplicado</td><td></td><td class="num">${fmt(investedTotal)}</td><td class="num muted">${fmt(costTotal)}</td><td class="num ${tone(openGain)}">${signed(openGain)}</td><td class="num ${tone(openGain)}">${costTotal > 0 ? pct((openGain / costTotal) * 100) : '—'}</td><td class="num">${whole(share(investedTotal))}%</td><td></td><td></td></tr></tfoot>
      </table>
    </div>`;
}

function renderReturns(state: GameState): string {
  const ledger = state.ledger;
  const start = ledger[0]?.startWealth ?? wealth(state);
  const now = wealth(state);
  const totalReturn = ((now - start) / start) * 100;
  const weekPct = (r: (typeof ledger)[number]) =>
    ((r.endWealth - r.startWealth) / r.startWealth) * 100;
  const last4 = ledger.slice(-4);
  const last4Return = last4.length
    ? ((last4[last4.length - 1]!.endWealth - last4[0]!.startWealth) / last4[0]!.startWealth) * 100
    : 0;
  const best = ledger.reduce<(typeof ledger)[number] | null>(
    (b, r) => (!b || weekPct(r) > weekPct(b) ? r : b),
    null,
  );
  const worst = ledger.reduce<(typeof ledger)[number] | null>(
    (b, r) => (!b || weekPct(r) < weekPct(b) ? r : b),
    null,
  );

  const tiles = `<div class="tiles">
    ${statTile('Desde o início', pct(totalReturn), `${fmt(start)} → ${fmt(now)} fl`, tone(totalReturn))}
    ${statTile('Últimas 4 semanas', last4.length ? pct(last4Return) : '—', last4.length ? `${last4.length} semana(s)` : 'nenhuma semana ainda', tone(last4Return))}
    ${statTile('Melhor semana', best ? pct(weekPct(best)) : '—', best ? `semana ${best.week}` : '', best ? tone(weekPct(best)) : '')}
    ${statTile('Pior semana', worst ? pct(weekPct(worst)) : '—', worst ? `semana ${worst.week}` : '', worst ? tone(weekPct(worst)) : '')}
  </div>`;

  if (ledger.length === 0) {
    return `${tiles}<div class="card px empty-state"><p>Ainda não terminou nenhuma semana. A rentabilidade aparece aqui depois do primeiro "Fim da semana".</p></div>`;
  }

  const wealthSeries = [ledger[0]!.startWealth, ...ledger.map((r) => r.endWealth)];
  const ranking = Object.entries(state.assetPnl)
    .filter(([, v]) => Math.abs(v) >= 0.05)
    .sort((a, b) => b[1] - a[1]);
  const maxAbs = Math.max(1, ...ranking.map(([, v]) => Math.abs(v)));

  const weekRows = [...ledger]
    .reverse()
    .map(
      (r) => `<tr>
        <td>${r.week}</td>
        <td class="num">${fmt(r.endWealth)}</td>
        <td class="num ${tone(r.endWealth - r.startWealth)}">${signed(r.endWealth - r.startWealth)}</td>
        <td class="num ${tone(weekPct(r))}">${pct(weekPct(r))}</td>
        <td class="num ${tone(r.marketPnl)}">${signed(r.marketPnl)}</td>
        <td class="num">${signed(r.bondIncome)}</td>
        <td class="num">${signed(-r.hedgeFees)}</td>
        <td class="num">${signed(-r.fees)}</td>
        <td class="num gold">${fmt(r.purse)}</td>
      </tr>`,
    )
    .join('');

  return `${tiles}
    <div class="returns-grid">
      <div class="returns-col">
        ${renderChart([{ values: wealthSeries, color: 'var(--gold)', main: true, label: 'Patrimônio' }], false, 'Patrimônio nas últimas')}
        <div class="card px">
          <h3>Quanto cada ativo já rendeu</h3>
          ${
            ranking.length === 0
              ? '<p class="muted small">Nenhum ganho ou perda em cotas ainda.</p>'
              : `<ul class="ranking">${ranking
                  .map(
                    ([id, v]) => `<li>
                      <span class="rank-name">${sprite(assetSprite(id), 16)} ${assetName(id)}</span>
                      <span class="rank-bar"><span class="${v >= 0 ? 'bar-up' : 'bar-down'}" style="width:${(Math.abs(v) / maxAbs) * 100}%"></span></span>
                      <span class="num ${tone(v)}">${signed(v)}</span>
                    </li>`,
                  )
                  .join('')}</ul>`
          }
        </div>
      </div>
      <div class="table-wrap px">
        <table class="ptable">
          <thead><tr><th>Sem.</th><th class="num">Patrimônio</th><th class="num">Resultado</th><th class="num">%</th><th class="num">Cotas</th><th class="num">Títulos</th><th class="num">Seguros</th><th class="num" title="Taxas de administração e performance pagas a você">Taxas</th><th class="num" title="Seu bolso no fim da semana">Bolso</th></tr></thead>
          <tbody>${weekRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Taverna
// ---------------------------------------------------------------------------

function renderTavern(state: GameState, ui: UiState): string {
  const tab = (id: UiState['tavernTab'], label: string) =>
    `<button role="tab" class="tab ${ui.tavernTab === id ? 'active' : ''}" aria-selected="${ui.tavernTab === id}" data-action="tavern-tab" data-tab="${id}">${label}</button>`;
  return `<div class="tavern-wrap">
    <div class="tabs" role="tablist">${tab('ask', 'Perguntar')}${tab('hire', 'Contratar melhorias')}<span class="purse-note">Pago do seu bolso: <strong class="gold">${fmt(state.purse)} fl</strong></span></div>
    ${ui.tavernTab === 'hire' ? renderPerkShop(state) : renderAsk(state, ui)}
  </div>`;
}

function renderPerkShop(state: GameState): string {
  const playing = state.status === 'playing';
  return `<div class="perk-grid">${PERKS.map((perk) => {
    const level = perkLevel(state, perk.id);
    const next = nextPerkLevel(state, perk.id);
    const classOk = next ? state.classIndex >= next.minClass : false;
    const cost = perkCost(state, perk.id);
    const affordable = next ? state.purse >= cost : false;
    const expert = expertOfPerk(perk.id);
    const confidant = expert !== null && state.confidant === expert;
    return `<article class="perk px ${level > 0 ? 'owned' : ''}">
      <header class="perk-head">
        ${sprite(perk.icon as SpriteName, 32)}
        <div><h3>${perk.name}${confidant ? ' <span class="confidant">Confidente −50%</span>' : ''}</h3><span class="muted small">${perk.description}${expert && !state.confidant ? ' O primeiro ajudante treinado vira seu confidente: o treino dele custa a metade.' : ''}</span></div>
      </header>
      <ol class="perk-levels">${perk.levels
        .map(
          (l, i) => `<li class="${i < level ? 'done' : i === level ? 'next' : ''}">
            <span>${i < level ? '✔' : perk.levels.length > 1 ? `Nv ${i + 1}` : ''} ${l.effect}</span>
          </li>`,
        )
        .join('')}</ol>
      ${
        next
          ? `<div class="perk-buy">
              <span class="${classOk ? 'muted' : 'down'} small">${classOk ? '' : `🔒 a partir de ${getClass(next.minClass).name}`}</span>
              <button class="pbtn pbtn-small" data-action="buy-perk" data-perk="${perk.id}" ${playing && classOk && affordable ? '' : 'disabled'}>Contratar · ${fmtCost(cost)} fl</button>
            </div>`
          : '<div class="perk-buy"><span class="up small">Nível máximo</span></div>'
      }
    </article>`;
  }).join('')}</div>`;
}

function renderDrunkPanel(state: GameState): string {
  const drinks = state.insights.filter((i) => i.expert === 'drunk' && i.week === state.week).length;
  const asleep = drinks >= DRUNK_DRINKS_PER_WEEK;
  const cost = expertCost(state, 'drunk');
  const level = expertLevel(state, 'drunk');
  const ramble = DRUNK_RAMBLE_CHANCE[Math.min(level, DRUNK_RAMBLE_CHANCE.length - 1)]!;
  const rumours = state.insights.filter((i) => i.expert === 'drunk');
  return `<p class="muted small">O Bêbado <strong>nunca mente</strong>: quando fala algo útil, é sobre uma empresa cujo trimestre vai bem diferente do que a faixa pública diz. O difícil é entender. E às vezes ele só fala bobagem (${whole(ramble * 100)}% das vezes agora). Com Banho e Sopa ele fica mais claro e enrola menos, inclusive sobre o que já contou.</p>
    <button class="pbtn" data-action="consult" data-expert="drunk" data-asset="" ${asleep || state.status !== 'playing' || state.purse < cost ? 'disabled' : ''}>${asleep ? 'Ele dormiu em cima da mesa (ronc…)' : `Pagar uma bebida · ${fmtCost(cost)} fl (${DRUNK_DRINKS_PER_WEEK - drinks} de ${DRUNK_DRINKS_PER_WEEK} nesta semana)`}</button>
    ${
      rumours.length
        ? `<div class="drunk-rumours">${rumours
            .slice()
            .reverse()
            .map((i) => renderInsight(i, true, state.week))
            .join('')}</div>`
        : ''
    }`;
}

function renderAsk(state: GameState, ui: UiState): string {
  if (onlyBonds(state)) {
    return `<div class="dialog px tavern-closed">
      ${sprite('mug', 48)}
      <div>
        <strong>O Taverneiro</strong> <span class="muted small">limpando o mesmo copo há uma hora</span>
        <p>“Perguntar o quê? Título da Coroa rende o que o Rei manda, não tem segredo. Os especialistas só atendem quem tem ações. Volta quando abrirem as guildas pro povo.”</p>
      </div>
    </div>`;
  }
  const playing = state.status === 'playing';
  const expert = EXPERTS.find((e) => e.id === ui.tavernExpert)!;
  const expertLocked = state.classIndex < expert.minClass;
  const askButton = (targetId: string, label: string, icon: string) => {
    const answer = state.insights.find((i) => i.expert === expert.id && i.targetId === targetId);
    const age = answer ? state.week - answer.week : 0;
    return `<button class="ask-btn ${answer ? 'done' : ''}" data-action="consult" data-expert="${expert.id}" data-asset="${targetId}" ${playing ? '' : 'disabled'} title="${answer ? 'Perguntar de novo (paga de novo e atualiza a resposta)' : 'Perguntar'}">
      ${icon}<span>${label}</span>${answer ? `<span class="tick">✔${age > 0 ? ` ${age}s` : ''}</span>` : ''}
    </button>`;
  };
  return `<div class="cols tavern">
    <div class="experts">
      ${EXPERTS.map((e) => {
        const locked = state.classIndex < e.minClass;
        const cost = expertCost(state, e.id);
        return `<button class="expert-card px ${ui.tavernExpert === e.id ? 'selected' : ''} ${locked ? 'locked' : ''}"
          data-action="pick-expert" data-expert="${e.id}" aria-pressed="${ui.tavernExpert === e.id}">
          ${sprite(expertSprite(e.id, expertLevel(state, e.id)), 40)}
          <span class="expert-text">
            <strong>${expertRankName(e.id, expertLevel(state, e.id))} ${rankStars(e.id, expertLevel(state, e.id))}</strong>
            <span class="small">${expertBlurb(e.id, expertLevel(state, e.id))}</span>
          </span>
          <span class="expert-cost ${locked ? 'muted' : 'gold'}">${locked ? `🔒 ${getClass(e.minClass).name}` : cost === 0 ? 'grátis' : `${fmtCost(cost)} fl por pergunta`}</span>
        </button>`;
      }).join('')}
    </div>
    <article class="card px ask">
      <h2>${sprite(expertSprite(expert.id, expertLevel(state, expert.id)), 20)} ${expert.id === 'drunk' ? `Ouvir o ${expertRankName('drunk', expertLevel(state, 'drunk'))}` : `Perguntar ${expert.id === 'astrologer' ? 'à' : 'ao'} ${expertRankName(expert.id, expertLevel(state, expert.id))} sobre…`}</h2>
      ${
        expertLocked
          ? `<p class="locked-note">🔒 O ${expert.name} não atende quem está abaixo de ${getClass(expert.minClass).name}.</p>`
          : expert.id === 'drunk'
            ? renderDrunkPanel(state)
            : `<p class="muted small">As respostas falam de <strong>onde o ativo termina o trimestre</strong> e valem até o fim dele. Notícias novas podem mudar o destino: pergunte de novo (pagando de novo) para atualizar. O PIB e os bairros ajudam a entender muitas empresas de uma vez.</p>
             <div class="ask-groups">
               <div class="ask-group">
                 ${askButton('city', `PIB de ${CITY.name}`, sprite('castle', 20))}
                 ${REGIONS.map((r) => askButton(r.id, r.name, '')).join('')}
               </div>
               ${GUILDS.filter((g) => isGuildUnlocked(state, g))
                 .map(
                   (g) => `<div class="ask-group">
                   ${askButton(g.id, `Cesta ${g.short}`, sprite(GUILD_SPRITE[g.id]!, 20))}
                   ${companiesOf(g.id)
                     .map((c) => askButton(c.id, c.name, ''))
                     .join('')}
                 </div>`,
                 )
                 .join('')}</div>`
      }
      <h3>Rumores deste trimestre</h3>
      ${
        state.insights.every((i) => i.expert === 'drunk')
          ? '<p class="muted">Ninguém te contou nada ainda.</p>'
          : `<ul class="rumors">${state.insights
              .filter((i) => i.expert !== 'drunk')
              .map((i) => `<li>${renderInsight(i, false, state.week)}</li>`)
              .join('')}</ul>`
      }
    </article>
  </div>`;
}

// ---------------------------------------------------------------------------
// Castelo
// ---------------------------------------------------------------------------

function renderCastle(state: GameState, ui: UiState): string {
  const cls = currentClass(state);
  const isTop = state.classIndex >= TOP_CLASS;
  const next = isTop ? null : getClass(state.classIndex + 1);
  const unlocksNext = next
    ? [
        ...GUILDS.filter((g) => g.minClass === state.classIndex + 1).map((g) => g.short),
        ...EXPERTS.filter((e) => e.minClass === state.classIndex + 1).map((e) => e.name),
      ]
    : [];
  return `<div class="cols castle">
    <article class="card px">
      <h2>${sprite('crown', 20)} A escada social</h2>
      <ol class="ladder">${[...CLASSES]
        .map((c, i) => ({ c, i }))
        .reverse()
        .map(
          ({
            c,
            i,
          }) => `<li class="${i === state.classIndex ? 'current' : i < state.classIndex ? 'past' : ''}">
            <span>${i === state.classIndex ? '▶ ' : ''}${c.name}</span>
            <span class="muted">${i === TOP_CLASS ? 'vitória' : `${whole(c.floor)}–${whole(c.ceiling)}`}</span>
          </li>`,
        )
        .join('')}</ol>
      <p class="muted small">Passou do teto em qualquer semana: o camareiro vende o próximo título (um por teto ultrapassado). A cada ${SEASON_LENGTH} semanas o Meirinho confere o piso: abaixo dele você cai (quantas classes forem precisas).</p>
    </article>
    <article class="card px">
      <h2>${sprite('shield', 20)} Seu título: ${cls.name}</h2>
      ${
        state.ascensionOffer && next
          ? titleOfferHtml(
              state,
              'O camareiro tem títulos à venda. A oferta vale esta semana e volta enquanto o fundo seguir acima do teto.',
              'decline-title',
              'Recusar',
            )
          : ''
      }
      <ul class="ledger">
        <li><span>Taxa de administração</span><span>${pct(cls.managementFeeRate * 100, 2)} do fundo/sem</span></li>
        <li><span>Taxa de performance</span><span>${whole(cls.performanceFeeRate * 100)}% do lucro</span></li>
        <li><span>Custo de vida (do bolso)</span><span>${fmtCost(cls.livingCost)} fl/sem</span></li>
        <li><span>Título da Coroa (livre)</span><span>${pct(cls.bondRate * 100, 2)}/sem</span></li>
        <li><span>Título da Coroa (${BOND_LOCK_WEEKS} sem.)</span><span>${pct(cls.bondRate * BOND_LOCK_MULTIPLIER * 100, 2)}/sem</span></li>
        <li><span>Taxa de seguro</span><span>${pct(cls.hedgeFeeRate * 100, 1)}/sem</span></li>
        ${next ? `<li><span>Título de ${next.name} (do bolso)</span><span>${fmt(cls.ascensionFee)} fl</span></li>` : ''}
      </ul>
      ${next && unlocksNext.length ? `<p class="small">Como ${next.name} você ganha acesso a: <strong>${unlocksNext.join(', ')}</strong>.</p>` : ''}
    </article>
    <article class="card px chronicle">
      <h2>${sprite('scroll', 20)} Crônica</h2>
      <ul>${state.log
        .slice(0, 8)
        .map((l) => `<li class="log-${l.tone}">${esc(l.text)}</li>`)
        .join('')}</ul>
      ${
        ui.confirmingRestart
          ? `<div class="restart-confirm" role="alert">
              <p>Abandonar esta partida e começar outra?</p>
              <div class="actions">
                <button class="pbtn pbtn-small pbtn-sell" data-action="new-game">Sim, recomeçar</button>
                <button class="pbtn pbtn-small pbtn-ghost" data-action="cancel-restart">Continuar</button>
              </div>
            </div>`
          : '<button class="pbtn pbtn-small pbtn-ghost" data-action="new-game">Recomeçar partida</button>'
      }
    </article>
  </div>`;
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function renderModal(state: GameState, ui: UiState): string {
  if (state.status === 'won') {
    return modal(`
      ${sprite('crown', 64)}
      <h2>Vida longa ao Conde!</h2>
      <p>Você saiu de Servo a Conde em <strong class="gold">${state.week} semanas</strong>, com ${fmt(wealth(state))} florins.</p>
      <button class="pbtn" data-action="new-game">Nova partida</button>`);
  }
  if (state.status === 'lost' && ui.lastReport?.seasonReview) {
    return renderSeasonModal(state, ui, ui.lastReport.seasonReview);
  }
  if (state.status === 'lost') {
    return modal(`
      ${sprite('hourglass', 64)}
      <h2>Para a masmorra!</h2>
      <p>Os credores venceram na semana ${state.week}. O Lobo vai uivar atrás das grades.</p>
      <button class="pbtn" data-action="new-game">Tentar de novo</button>`);
  }
  if (ui.timelapse && ui.lastReport) return renderTimelapse(state, ui.lastReport);
  if ((!ui.showReport || !ui.lastReport) && state.story.queue.length > 0) {
    return renderStoryModal(state, ui);
  }
  if ((!ui.showReport || !ui.lastReport) && state.investorOffer && !ui.offerDismissed) {
    return renderOfferModal(state);
  }
  if ((!ui.showReport || !ui.lastReport) && state.visitor && !ui.visitorDismissed) {
    return renderVisitorModal(state);
  }
  if (!ui.showReport || !ui.lastReport) return '';
  if (ui.lastReport.seasonReview) return renderSeasonModal(state, ui, ui.lastReport.seasonReview);

  const report = ui.lastReport;
  const net = reportNet(report);
  const held = Object.entries(report.positionPnl);
  const next = state.ascensionOffer ? getClass(state.classIndex + 1) : null;
  const news = ui.weekNews.filter((n) => !n.text.startsWith('Semana '));
  return modal(`
    <h2>Fim da semana ${state.week}</h2>
    <p class="big ${tone(net)}">${signed(net)} fl</p>
    ${
      held.length
        ? `<ul class="ledger">${held
            .map(([id, pnl]) => {
              const move = report.marketReturns[id] ?? 0;
              return `<li><span>${sprite(assetSprite(id), 20)} ${assetName(id)} <span class="${tone(move)}">${pct(move)}</span></span><span class="${tone(pnl)}">${signed(pnl)}</span></li>`;
            })
            .join('')}</ul>`
        : '<p class="muted">Você não tinha cotas de nada.</p>'
    }
    <ul class="ledger">
      <li><span>Títulos da Coroa</span><span class="up">${signed(report.bondIncome)}</span></li>
      ${report.hedgeFees > 0 ? `<li><span>Seguros</span><span class="down">${signed(-report.hedgeFees)}</span></li>` : ''}
      ${report.stops.map((st) => `<li><span>${st.kind === 'gain' ? 'Stop gain' : 'Stop loss'}: ${assetName(st.assetId)} a ${pct(st.ret * 100)}</span><span class="gold">${fmt(st.amount)} fl livres</span></li>`).join('')}
      ${(state.ledger.at(-1)?.tradeFees ?? 0) > 0.005 ? `<li><span>Corretagem</span><span class="down">${signed(-(state.ledger.at(-1)?.tradeFees ?? 0))}</span></li>` : ''}
      ${report.investorFlow ? `<li><span>${report.investorFlow > 0 ? 'Aportes de investidores' : report.parked ? `Resgates: fundo ${whole(report.parked * 100)}% parado na Coroa` : 'Resgates de investidores'}</span><span class="${tone(report.investorFlow)}">${signed(report.investorFlow)}</span></li>` : ''}
      ${report.confiscations.map((c) => `<li><span>Confisco: ${c.kind === 'militia' ? 'dinheiro da Milícia' : 'dinheiro do Abade'}</span><span class="down">${signed(-c.amount)}</span></li>`).join('')}
      <li><span>Taxas pagas a você</span><span class="down">${signed(-(report.managementFee + report.performanceFee))}</span></li>
    </ul>
    <h3 class="report-sub">Seu bolso</h3>
    <ul class="ledger">
      <li><span>Taxa de administração</span><span class="up">+${fmtCost(report.managementFee)}</span></li>
      <li><span>Taxa de performance</span><span class="up">+${fmtCost(report.performanceFee)}</span></li>
      <li><span>Custo de vida</span><span class="down">-${fmtCost(report.livingCost)}</span></li>
      ${report.confiscations
        .filter((c) => c.fine > 0)
        .map(
          (c) =>
            `<li><span>Multa do Meirinho</span><span class="down">-${fmtCost(c.fine)}</span></li>`,
        )
        .join('')}
      <li><span>Saldo do bolso</span><span class="gold">${fmt(state.purse)} fl</span></li>
    </ul>
    ${news.length ? `<ul class="report-news">${news.map((n) => `<li class="log-${n.tone}">${esc(n.text)}</li>`).join('')}</ul>` : ''}
    ${
      next
        ? titleOfferHtml(state, 'Títulos à venda.', 'close-report', 'Depois')
        : '<button class="pbtn" data-action="close-report">Continuar</button>'
    }`);
}

const VISITOR_TEXT = {
  merchant: {
    name: 'O Mercador Viajante',
    title: 'mercadorias honestas da capital',
    sprite: 'tent' as SpriteName,
    line: 'Bons dias, gestor! Tudo com selo da guilda, preço justo e nota fiscal. Bem, quase tudo.',
  },
  smuggler: {
    name: 'O Contrabandista',
    title: 'ninguém sabe o nome dele',
    sprite: 'hood0' as SpriteName,
    line: 'Psiu… gestor. Tenho coisas que o Meirinho não precisa saber. Funciona que é uma beleza. Até alguém descobrir.',
  },
};

function renderVisitorModal(state: GameState): string {
  const visitor = state.visitor!;
  const who = VISITOR_TEXT[visitor.kind];
  const playing = state.status === 'playing';
  return `<div class="modal-backdrop"><div class="modal px modal-wide visitor visitor-${visitor.kind}" role="dialog" aria-modal="true" aria-label="${who.name}">
    <div class="dialog ${visitor.kind === 'smuggler' ? 'mood-sad' : 'mood-happy'}">
      ${sprite(who.sprite, 48)}
      <div>
        <strong>${who.name}</strong> <span class="muted small">${who.title}</span>
        <p>“${who.line}”</p>
      </div>
    </div>
    <div class="item-grid">${visitor.offers
      .map((id) => {
        const item = getItem(id);
        const sold = visitor.sold.includes(id);
        return `<article class="item px ${sold ? 'sold' : ''}">
          <header>${sprite(item.icon as SpriteName, 28)}<strong>${item.name}</strong></header>
          <p class="small">${item.effect}</p>
          ${
            item.catchChance
              ? `<p class="small down">Risco: ${whole(item.catchChance * 100)}% de o Meirinho descobrir no fim. ${item.penalty ?? ''}</p>`
              : ''
          }
          <button class="pbtn pbtn-small" data-action="buy-item" data-item="${id}" ${!sold && playing && state.purse >= item.cost ? '' : 'disabled'}>
            ${sold ? 'Comprado ✔' : `Comprar · ${fmtCost(item.cost)} fl`}
          </button>
        </article>`;
      })
      .join('')}</div>
    <p class="small muted">Pago do seu bolso: <strong class="gold">${fmt(state.purse)} fl</strong>. A oferta vale só até o fim desta semana.</p>
    <button class="pbtn pbtn-ghost" data-action="dismiss-visitor">Ir embora</button>
  </div></div>`;
}

function renderOfferModal(state: GameState): string {
  const offer = state.investorOffer!;
  const investor = getInvestor(offer.kind);
  const cls = currentClass(state);
  const extraFee = offer.amount * cls.managementFeeRate;
  const mood = investor.dirtyChance >= 1 ? 'sad' : investor.dirtyChance > 0 ? 'neutral' : 'happy';
  const playing = state.status === 'playing';
  return `<div class="modal-backdrop"><div class="modal px modal-wide offer-modal" role="dialog" aria-modal="true" aria-label="${investor.name}">
    <div class="dialog mood-${mood}">
      ${sprite(offer.kind === 'militia' ? 'shield' : offer.kind === 'abbot' ? 'scroll' : 'ship', 48)}
      <div>
        <strong>${investor.name}</strong> <span class="muted small">${investor.title}</span>
        <p>“${investor.line}”</p>
      </div>
    </div>
    <div class="offer-facts">
      <div><span class="hud-label">Aporte</span><strong class="gold">${fmt(offer.amount)} fl</strong><span class="muted small">${whole((offer.amount / Math.max(1, wealth(state))) * 100)}% do fundo</span></div>
      <div><span class="hud-label">Taxa a mais</span><strong class="up">+${fmtCost(extraFee)} fl/sem.</strong><span class="muted small">só de administração</span></div>
      <div><span class="hud-label">Origem</span><strong class="${mood === 'sad' ? 'down' : mood === 'neutral' ? 'gold' : 'up'}">${mood === 'sad' ? 'suja' : mood === 'neutral' ? 'incerta' : 'limpa'}</strong><span class="muted small">${investor.dirtyChance > 0 ? `${investor.riskWeeks} sem. de risco` : 'sem risco'}</span></div>
    </div>
    <p class="small ${mood === 'happy' ? 'muted' : 'down'}">${investor.risk}</p>
    <p class="small muted">O dinheiro entra no fundo: conta para a sua classe e para as taxas.</p>
    <div class="actions">
      <button class="pbtn" data-action="accept-investor" ${playing ? '' : 'disabled'}>Aceitar o dinheiro</button>
      <button class="pbtn pbtn-ghost" data-action="decline-investor">Recusar</button>
      <button class="pbtn pbtn-ghost" data-action="dismiss-offer">Pensar até o fim da semana</button>
    </div>
  </div></div>`;
}

/** A short replay of the week: the fund's path, then a burst of green or red pixels. */
function renderTimelapse(state: GameState, report: WeekReport): string {
  const record = state.ledger[state.ledger.length - 1];
  const start = record?.startWealth ?? wealth(state);
  const end = (record?.endWealth ?? wealth(state)) - (record?.flows ?? 0);
  const change = start > 0 ? (end / start - 1) * 100 : 0;
  const up = change >= 0;
  // A random walk from start to end, the same every time for this week.
  const n = 28;
  let seed = state.week * 7919 + 17;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // Only the share in guilds and managers wobbles; Crown bonds grow in a straight line.
  const risky = Object.entries(state.positions)
    .filter(([id]) => !isBond(id))
    .reduce((sum, [, p]) => sum + p.value, 0);
  const exposure = Math.min(1, risky / Math.max(1, end));
  const vol = Math.max(Math.abs(end - start) * 0.6, start * 0.004) * exposure;
  const walk = [0];
  for (let i = 1; i < n; i++) walk.push(walk[i - 1]! + (rnd() - 0.5) * vol * 0.5);
  const values = walk.map(
    (w, i) => start + ((end - start) * i) / (n - 1) + w - (walk[n - 1]! * i) / (n - 1),
  );
  // At least ±1% of the fund on screen, so a quiet week looks quiet.
  const lo = Math.min(...values, start * 0.99);
  const hi = Math.max(...values, start * 1.01);
  const span = hi - lo || 1;
  const W = 300;
  const H = 120;
  const pts = values.map(
    (v, i) => [(i / (n - 1)) * W, H - 10 - ((v - lo) / span) * (H - 20)] as const,
  );
  const [ex, ey] = pts[pts.length - 1]!;
  const strength = Math.min(1, Math.abs(change) / 8);
  const count = 14 + Math.round(strength * 26);
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rnd() * 0.6;
    const dist = 30 + rnd() * (40 + strength * 80);
    const colors = up ? ['#4fe08a', '#1f9e5a', '#b8f0c8'] : ['#ff4f5e', '#b0243a', '#ffb3ba'];
    return `<i style="--dx:${Math.round(Math.cos(angle) * dist)}px;--dy:${Math.round(Math.sin(angle) * dist)}px;--c:${colors[i % 3]};--delay:${(1.15 + rnd() * 0.15).toFixed(2)}s"></i>`;
  }).join('');
  const held = Object.keys(report.positionPnl).slice(0, 6);
  return `<div class="modal-backdrop timelapse-backdrop" data-action="skip-timelapse">
    <div class="timelapse px" role="dialog" aria-modal="true" aria-label="Resumo da semana">
      <div class="timelapse-head"><span class="hud-label">Semana ${state.week}</span><span class="muted small">clique para pular</span></div>
      <div class="timelapse-chart">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" x2="${W}" y1="${H - 10 - ((start - lo) / span) * (H - 20)}" y2="${H - 10 - ((start - lo) / span) * (H - 20)}" class="tl-base" />
          <polyline points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" class="tl-line ${up ? 'up' : 'down'}" />
        </svg>
        <div class="burst" style="left:${((ex / W) * 100).toFixed(1)}%;top:${((ey / H) * 100).toFixed(1)}%">${particles}</div>
      </div>
      <p class="timelapse-result ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${pct(change)} <span class="small">(${signed(end - start)} fl)</span></p>
      ${
        held.length
          ? `<div class="timelapse-assets">${held
              .map((id, i) => {
                const move = report.marketReturns[id] ?? 0;
                return `<span class="chip ${tone(move)}" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s">${assetName(id)} ${pct(move)}</span>`;
              })
              .join('')}</div>`
          : ''
      }
    </div>
  </div>`;
}

function renderStoryModal(state: GameState, ui: UiState): string {
  const story = storyFor(state.story.queue[0]!, state.story.announced);
  const step = Math.min(ui.storyStep, story.beats.length - 1);
  const beat = story.beats[step]!;
  const last = step === story.beats.length - 1;
  return `<div class="modal-backdrop gala-backdrop"><div class="gala story px" role="dialog" aria-modal="true" aria-label="${story.heading}">
    <div class="gala-scene" style="background-image:url(${storyUrl(story.scene)})">
      <div class="gala-title"><span>${story.kicker}</span><strong>${story.heading}</strong></div>
    </div>
    <div class="dialog mood-${beat.mood}">
      ${sprite(beat.sprite, 48)}
      <div>
        <strong>${beat.name}</strong> <span class="muted small">${beat.title}</span>
        <p class="typewriter">“${beat.text}”</p>
      </div>
    </div>
    ${last ? `<p class="story-unlock">🔓 ${story.unlock}</p>` : ''}
    <div class="gala-actions">
      <span class="muted small story-dots">${story.beats.map((_, i) => (i === step ? '●' : '○')).join(' ')}</span>
      ${
        last
          ? `<button class="pbtn" data-action="story-done">${story.finish} ▶</button>`
          : `<button class="pbtn" data-action="story-next">Continuar ▶</button>`
      }
    </div>
  </div></div>`;
}

function renderSeasonModal(state: GameState, ui: UiState, review: SeasonReview): string {
  const { speaker, mood, line } = seasonSpeech(review);
  const tier = review.classBefore;
  const party = GALA_NAMES[Math.min(tier, GALA_NAMES.length - 1)]!;
  const scene = `<div class="gala-scene" style="background-image:url(${galaUrl(tier, mood)})">
      <div class="gala-title"><span>Fechamento do ${review.season}º trimestre</span><strong>${party}</strong></div>
    </div>`;

  if (ui.galaStep === 0) {
    return `<div class="modal-backdrop gala-backdrop"><div class="gala px" role="dialog" aria-modal="true" aria-label="${party}">
      ${scene}
      <div class="dialog mood-${mood}">
        ${sprite(speaker.sprite, 48)}
        <div>
          <strong>${speaker.name}</strong> <span class="muted small">${speaker.title}</span>
          <p class="typewriter">“${line}”</p>
        </div>
      </div>
      <div class="gala-actions"><button class="pbtn" data-action="gala-next">Ver os números ▶</button></div>
    </div></div>`;
  }

  const ret = seasonReturn(review);
  const before = getClass(review.classBefore);
  const after = getClass(review.classAfter);
  const ranked = Object.entries(review.assetPnl).sort((a, b) => b[1] - a[1]);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const fundSeries = [review.startWealth, ...review.weeks.map((r: WeekRecord) => r.endWealth)];
  const winWeeks = review.weeks.filter((r: WeekRecord) => r.endWealth >= r.startWealth).length;

  let verdict: string;
  switch (review.outcome) {
    case 'lost':
      verdict = `<p class="verdict down">O fundo fechou abaixo do piso de ${before.name}. Os investidores levaram o que sobrou, e você vai para a masmorra.</p>
        <button class="pbtn" data-action="new-game">Tentar de novo</button>`;
      break;
    case 'down':
      verdict = `<p class="verdict down">O fundo ficou abaixo do piso de ${whole(before.floor)} fl. Você caiu de <strong>${before.name}</strong> para <strong>${after.name}</strong>${review.classBefore - review.classAfter > 1 ? ` (${review.classBefore - review.classAfter} classes de uma vez)` : ''}.${review.endWealth < after.floor ? ` <strong>Último aviso:</strong> o fundo nem cobre o piso de Servo (${whole(after.floor)} fl). Se continuar assim no fim do próximo trimestre, é masmorra.` : ''}</p>
        <button class="pbtn" data-action="close-report">Seguir em frente</button>`;
      break;
    case 'stay':
      verdict = `<p class="verdict">Você segue <strong>${after.name}</strong>. Para subir, o fundo precisa passar de ${whole(after.ceiling)} fl, em qualquer semana.</p>
        <button class="pbtn" data-action="close-report">Continuar</button>`;
      break;
    default: {
      verdict =
        state.ascensionOffer > 0
          ? titleOfferHtml(
              state,
              review.offerLevels > 1
                ? `O fundo passou <strong>${review.offerLevels} tetos</strong>!`
                : `O fundo passou do teto de ${whole(before.ceiling)} fl.`,
              'close-report',
              'Depois',
            )
          : '<button class="pbtn" data-action="close-report">Continuar</button>';
    }
  }

  return `<div class="modal-backdrop gala-backdrop"><div class="gala px" role="dialog" aria-modal="true" aria-label="Números do trimestre">
    <div class="gala-scene gala-scene-small" style="background-image:url(${galaUrl(tier, mood)})">
      <div class="gala-title"><span>${party}</span><strong>Os números do ${review.season}º trimestre</strong></div>
    </div>
    <div class="gala-body">
      <div class="season-tiles">
        <div><span class="hud-label">Fundo no trimestre</span><strong class="${tone(ret)}">${pct(ret)}</strong><span class="muted small">${fmt(review.startWealth)} → ${fmt(review.endWealth)} fl${Math.abs(review.flows) >= 0.05 ? ` · investidores ${signed(review.flows)}` : ''}</span></div>
        <div><span class="hud-label">Seu bolso</span><strong class="${tone(review.endPurse - review.startPurse)}">${signed(review.endPurse - review.startPurse)} fl</strong><span class="muted small">agora ${fmt(review.endPurse)} fl</span></div>
        <div><span class="hud-label">Semanas no azul</span><strong>${winWeeks} de ${review.weeks.length}</strong><span class="muted small">${mood === 'happy' ? 'que trimestre!' : mood === 'sad' ? 'trimestre para esquecer' : 'trimestre honesto'}</span></div>
      </div>
      ${renderChart([{ values: fundSeries, color: 'var(--gold)', main: true, label: 'Fundo' }], false, 'Fundo nas últimas', SEASON_LENGTH)}
      ${
        best && worst
          ? `<p class="small season-best">Destaque: <strong>${assetName(best[0])}</strong> <span class="${tone(best[1])}">${signed(best[1])} fl</span>${
              worst[0] !== best[0]
                ? ` · Decepção: <strong>${assetName(worst[0])}</strong> <span class="${tone(worst[1])}">${signed(worst[1])} fl</span>`
                : ''
            }</p>`
          : '<p class="small muted">Nenhuma aposta neste trimestre.</p>'
      }
      ${verdict}
    </div>
  </div></div>`;
}

function modal(content: string, extraClass = ''): string {
  return `<div class="modal-backdrop"><div class="modal px ${extraClass}" role="dialog" aria-modal="true">${content}</div></div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumPnl(report: WeekReport): number {
  return Object.values(report.positionPnl).reduce((a, b) => a + b, 0);
}

function reportNet(report: WeekReport): number {
  return (
    sumPnl(report) +
    report.bondIncome -
    report.hedgeFees -
    report.managementFee -
    report.performanceFee
  );
}

/** Small amounts (expert fees, premiums) with two decimals. */
function fmtCost(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthOfQuarter(state: GameState): number {
  return Math.floor((state.week % SEASON_LENGTH) / MONTH_LENGTH) + 1;
}

function fmtBeta(beta: number): string {
  return beta.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function pct(value: number, digits = 1): string {
  const s = value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value > 0 ? '+' : ''}${s}%`;
}

function signed(value: number): string {
  if (Math.abs(value) < 0.05) return '0,0';
  return `${value > 0 ? '+' : ''}${fmt(value)}`;
}

function whole(value: number): string {
  return Math.round(value).toLocaleString('pt-BR');
}

function tone(value: number): string {
  return value > 0 ? 'up' : value < 0 ? 'down' : '';
}

function clampPct(x: number): number {
  return Math.max(0, Math.min(100, x));
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
