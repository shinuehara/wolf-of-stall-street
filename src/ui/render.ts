import {
  CITY,
  CLASSES,
  EXPERTS,
  GUILD_DESCRIPTIONS,
  GUILDS,
  LOCAL_DEMAND,
  REGIONS,
  SEASON_LENGTH,
  TOP_CLASS,
  companiesOf,
  getClass,
  getCompany,
  getEvent,
  getGuild,
  getRegion,
  isRegionId,
} from '../sim/data';
import {
  assetName,
  assetRange,
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
  isGuildUnlocked,
  season,
  wealth,
  weeksUntilSeasonEnd,
  type WeekReport,
} from '../sim/game';
import type { ExpertId, GameState, GuildDef, Insight, LogEntry, Sector } from '../sim/types';
import { sceneUrl, type SceneName } from './scenes';
import { sprite, type SpriteName } from './sprites';

export type Screen = SceneName;

export interface UiState {
  screen: Screen;
  /** Asset shown in the market: a guild id (basket) or a company id. */
  selectedAsset: string;
  /** Which panel the Square shows: this week's news or the city almanac. */
  squareTab: 'news' | 'almanac';
  /** Almanac entry: 'city', a region id or a guild id. */
  almanacEntry: string;
  /** Guilds whose companies are listed under the basket in the market. */
  expandedGuilds: Record<string, boolean>;
  /** On narrow screens the market shows either the list or one asset's detail. */
  marketDetailOpen: boolean;
  tavernExpert: ExpertId;
  amounts: Record<string, string>;
  lastReport: WeekReport | null;
  weekNews: LogEntry[];
  showReport: boolean;
  confirmingRestart: boolean;
  message: { text: string; tone: 'error' | 'info' } | null;
}

export function initialUi(): UiState {
  return {
    screen: 'square',
    selectedAsset: 'bakers',
    squareTab: 'news',
    almanacEntry: 'city',
    expandedGuilds: { bakers: true },
    marketDetailOpen: false,
    tavernExpert: 'astrologer',
    amounts: {},
    lastReport: null,
    weekNews: [],
    showReport: false,
    confirmingRestart: false,
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

const EXPERT_SPRITE: Record<ExpertId, SpriteName> = {
  drunk: 'mug',
  astrologer: 'crystal',
  spy: 'hood',
};

/** Distinct line colours for the companies of a basket chart. */
const COMPANY_COLORS = ['var(--blue)', 'var(--purple)', 'var(--orange)'];

/** Scale of the range bars, in % per week. */
const SCALE = 25;

/** Weeks of history shown in charts. */
const CHART_WEEKS = 40;

function assetSprite(assetId: string): SpriteName {
  return GUILD_SPRITE[guildOfAsset(assetId).id]!;
}

/** "Setor Padeiros" for a guild id, the company name otherwise. */
function targetName(targetId: string): string {
  if (targetId === 'city') return `PIB de ${CITY.name}`;
  if (isRegionId(targetId)) return getRegion(targetId).name;
  return isBasket(targetId) ? `Setor ${getGuild(targetId).short}` : getCompany(targetId).name;
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
    <div class="hud-stat">
      <span class="hud-label">Patrimônio</span>
      <strong class="hud-value gold">${fmt(total)} fl</strong>
    </div>
    <div class="hud-stat">
      <span class="hud-label">Livres</span>
      <strong class="hud-value">${fmt(state.cash)} fl</strong>
    </div>
    <div class="hud-stat">
      <span class="hud-label">Estação ${season(state)}</span>
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
  const bills = currentClass(state).livingCost + fees;
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
      title="Encerrar a semana: paga ${fmt(bills)} fl de contas">
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
  let verdict = `Faltam ${weeks} semana(s) para a avaliação. Você está entre o piso e o teto: se a estação acabasse hoje, seguiria ${cls.name}.`;
  if (state.classIndex >= TOP_CLASS) verdict = 'Você é Conde. O reino é seu.';
  else if (total < cls.floor)
    verdict = `Cuidado! Faltam ${weeks} semana(s) e você está abaixo do piso de ${whole(cls.floor)} fl. Se nada mudar, vai cair de classe.`;
  else if (total >= cls.ceiling)
    verdict = `Faltam ${weeks} semana(s) e você já passou do teto de ${whole(cls.ceiling)} fl. Mantenha assim e o camareiro vai bater à sua porta.`;

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
               <li><span>Custo de vida</span><span class="down">${signed(-report.livingCost)}</span></li>
             </ul>`
          : `<p>Você chegou à cidade com <strong class="gold">100 florins</strong> e um sonho: virar <strong>Conde</strong>.</p>
             <p class="muted">No <strong>Mercado</strong>, compre a cesta de uma guilda ou aposte numa empresa. Na <strong>Taverna</strong>, ouça rumores. Depois, encerre a semana.</p>`
      }
    </article>
    <article class="card px">
      <h2>${sprite('castle', 20)} A estação</h2>
      <p>${verdict}</p>
      <p class="muted small">Florins livres rendem ${pct(cls.bondRate * 100, 2)} por semana nos Títulos da Coroa. Seu custo de vida é ${fmt(cls.livingCost)} fl por semana.</p>
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
  const f = factorForecast(state, factorId);
  return `<p>O arauto prevê que ${what} varie <strong>${pct(f.low, 0)} a ${pct(f.high, 0)}</strong> nesta semana.</p>`;
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

function renderGuildEntry(state: GameState, guildId: string): string {
  const guild = getGuild(guildId);
  const locked = !isGuildUnlocked(state, guild);
  return `<header class="almanac-head">${sprite(GUILD_SPRITE[guild.id]!, 40)}<div><h2>${guild.name}</h2><span class="muted small">${SECTOR_NAMES[guild.sector]}${locked ? ` · 🔒 a partir de ${getClass(guild.minClass).name}` : ''}</span></div></header>
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
      ${GUILDS.map((g) => renderGuildGroup(state, ui, g)).join('')}
    </ul>
    <article class="guild-detail px">${renderAssetDetail(state, ui, ui.selectedAsset)}</article>
  </div>`;
}

function renderGuildGroup(state: GameState, ui: UiState, guild: GuildDef): string {
  if (!isGuildUnlocked(state, guild)) {
    return `<li><button class="guild-row locked" data-action="select-asset" data-asset="${guild.id}">
      ${sprite(GUILD_SPRITE[guild.id]!, 28)}
      <span class="row-name">${guild.short}</span>
      <span class="row-range muted">🔒 ${getClass(guild.minClass).name}</span><span></span>
    </button></li>`;
  }

  const expanded = Boolean(ui.expandedGuilds[guild.id]);
  const companies = companiesOf(guild.id);
  const inCompanies = companies.reduce((s, c) => s + (state.positions[c.id]?.value ?? 0), 0);

  const row = (assetId: string, label: string, isCompany: boolean) => {
    const r = assetRange(state, assetId);
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
      ${toggle}
      <button class="guild-row ${isCompany ? 'company-row' : ''}" data-action="select-asset" data-asset="${assetId}">
        ${isCompany ? '<span class="tree">└</span>' : sprite(GUILD_SPRITE[guild.id]!, 28)}
        <span class="row-name">${label}</span>
        <span class="row-range">${pct(r.low, 0)} a ${pct(r.high, 0)}</span>
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
  const canSell = playing && Boolean(state.positions[assetId]);
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

function renderAssetDetail(state: GameState, ui: UiState, assetId: string): string {
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
      <p class="locked-note">🔒 A ${guild.name} só negocia com quem é <strong>${getClass(guild.minClass).name}</strong> ou mais.
      Suba na escada social para entrar.</p>`;
  }

  const asset = state.assets[assetId]!;
  const range = assetRange(state, assetId);
  const position = state.positions[assetId];
  const playing = state.status === 'playing';
  const hedgeRange = hedgeBounds(range);
  const fee = position ? position.value * currentClass(state).hedgeFeeRate : 0;
  const lastMove = ui.lastReport?.marketReturns[assetId];
  const lastPnl = ui.lastReport?.positionPnl[assetId];
  const components = componentsOf(assetId);

  const targets = [
    'city',
    ...new Set(components.map((c) => c.regionId)),
    guild.id,
    ...(basket ? [] : [assetId]),
  ];
  const insights = state.insights.filter((i) => targets.includes(i.targetId));
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
  const news = [...sectorNews, ...companyNews, ...localNews];

  const price = `<div class="detail-price">
      <strong>${fmt(asset.price)} fl</strong>
      ${lastMove === undefined ? '' : `<span class="${tone(lastMove)}">${pct(lastMove)}</span>`}
    </div>`;

  const chartSeries = basket
    ? [
        { values: asset.history, color: 'var(--gold)', main: true, label: 'Cesta' },
        ...components.map((c, i) => ({
          values: state.assets[c.id]!.history,
          color: COMPANY_COLORS[i] ?? 'var(--muted)',
          main: false,
          label: c.name,
        })),
      ]
    : [{ values: asset.history, color: 'var(--gold)', main: true, label: assetName(assetId) }];

  const members = basket
    ? `<div class="members">${components
        .map((c, i) => {
          const r = assetRange(state, c.id);
          const move = ui.lastReport?.marketReturns[c.id];
          return `<button class="member" data-action="select-asset" data-asset="${c.id}">
            <span class="swatch" style="background:${COMPANY_COLORS[i]}"></span>
            <span class="member-name">${c.name}</span>
            <span class="muted">${pct(r.low, 0)} a ${pct(r.high, 0)}</span>
            ${move === undefined ? '' : `<span class="${tone(move)}">${pct(move)}</span>`}
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
          const w = factorId === company.id ? '' : ` ×${fmtBeta(weight)}`;
          return `${factorLabel(factorId)} ${pct(f.low, 0)} a ${pct(f.high, 0)}${w}`;
        })
        .join(' + ')}</p>`
    : '';

  return `${back}${head(price)}
    <div class="detail-grid">
      <div class="detail-main">
        ${company ? `<p class="trait">${company.trait}</p>` : ''}
        ${renderChart(chartSeries, basket)}
        ${members}
        <div class="forecast">
          <div class="forecast-label">O arauto prevê <strong>${pct(range.low, 0)} a ${pct(range.high, 0)}</strong> nesta semana</div>
          ${rangeBar(range, position?.hedged ? hedgeRange : null)}
          ${breakdown}
        </div>
      </div>
      <div class="detail-side">
        ${news.length ? `<div class="chips">${news.map((n) => `<span class="chip ${tone(n.shift)}">${esc(n.label)}${n.shift > 0 ? ' ▲' : n.shift < 0 ? ' ▼' : ''}</span>`).join('')}</div>` : ''}
        ${
          insights.length
            ? `<div class="insights">${insights.map((i) => renderInsight(i, true)).join('')}</div>`
            : `<p class="muted small">Quer saber para que lado pende? <button class="linkish" data-action="go" data-screen="tavern">Pergunte na Taverna ▶</button></p>`
        }
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
                  <span>Seguro: limita a <strong>${pct(hedgeRange.floor)} a ${pct(hedgeRange.cap)}</strong> por ${fmt(fee)} fl/sem</span>
                </label>`
              : '<p class="muted small">Vender sem valor vende tudo.</p>'
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
}

/**
 * Price history as a stepped pixel line chart. For a basket, the companies are rescaled to
 * start where the basket starts, so the lines compare performance rather than price levels.
 */
function renderChart(series: Series[], rescale: boolean, title = 'Preço nas últimas'): string {
  const main = series.find((s) => s.main)!;
  const n = Math.min(CHART_WEEKS + 1, main.values.length);
  if (n < 2) {
    return `<div class="chart chart-empty px"><span class="muted">O gráfico aparece depois da primeira semana.</span></div>`;
  }
  const firstWeek = main.values.length - n;
  const windowed = series.map((s) => {
    const values = s.values.slice(-n);
    if (!rescale || s.main) return { ...s, values };
    const base = values[0]!;
    const target = main.values[firstWeek]!;
    return { ...s, values: values.map((v) => (v / base) * target) };
  });
  const all = windowed.flatMap((s) => s.values);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min) * 0.08 || max * 0.05 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const W = 300;
  const H = 100;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const stepPath = (values: number[]) =>
    values
      .map((v, i) =>
        i === 0 ? `M0 ${y(v).toFixed(1)}` : `H${x(i).toFixed(1)} V${y(v).toFixed(1)}`,
      )
      .join(' ');
  const mainValues = windowed.find((s) => s.main)!.values;
  const area = `${stepPath(mainValues)} V${H} H0 Z`;
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
        ${windowed
          .filter((s) => !s.main)
          .map(
            (s) =>
              `<path d="${stepPath(s.values)}" fill="none" stroke="${s.color}" stroke-width="1.5" vector-effect="non-scaling-stroke" opacity="0.85" />`,
          )
          .join('')}
        <path d="${stepPath(mainValues)}" fill="none" stroke="var(--gold)" stroke-width="3" vector-effect="non-scaling-stroke" />
      </svg>
    </div>
    <div class="chart-foot"><span>há ${n - 1} sem.</span><span>agora</span></div>
  </figure>`;
}

function renderInsight(insight: Insight, full: boolean): string {
  const about = `<span class="insight-about">${targetName(insight.targetId)}</span>`;
  switch (insight.expert) {
    case 'drunk':
      return `<div class="insight">${sprite('mug', 20)}${about}<span><em>"${insight.leansUp ? 'Vai subir, confia em mim! *hic*' : 'Vende tudo! Vai despencar! *hic*'}"</em></span></div>`;
    case 'astrologer':
      return `<div class="insight">${sprite('crystal', 20)}${about}<span>Os astros apontam para <strong class="${insight.leansUp ? 'up' : 'down'}">${insight.leansUp ? 'ALTA' : 'BAIXA'}</strong>.</span></div>`;
    case 'spy':
      if (!full) {
        return `<div class="insight">${sprite('hood', 20)}${about}<span>Chances: ${insight.bands.map((b) => `${Math.round(b.p * 100)}%`).join(' · ')}</span></div>`;
      }
      return `<div class="insight insight-spy">${sprite('hood', 20)}${about}
        <div class="bands">${insight.bands
          .map(
            (b) => `<div class="band" title="${pct(b.from)} a ${pct(b.to)}">
              <span class="band-p">${Math.round(b.p * 100)}%</span>
              <div class="band-bar" style="height:${Math.max(2, Math.round(b.p * 36))}px"></div>
              <span class="band-range">${pct(b.from, 0)}…${pct(b.to, 0)}</span>
            </div>`,
          )
          .join('')}</div></div>`;
  }
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
// Taverna
// ---------------------------------------------------------------------------

function renderTavern(state: GameState, ui: UiState): string {
  const playing = state.status === 'playing';
  const expert = EXPERTS.find((e) => e.id === ui.tavernExpert)!;
  const expertLocked = state.classIndex < expert.minClass;
  const askButton = (targetId: string, label: string, icon: string) => {
    const asked = state.insights.some((i) => i.expert === expert.id && i.targetId === targetId);
    return `<button class="ask-btn ${asked ? 'done' : ''}" data-action="consult" data-expert="${expert.id}" data-asset="${targetId}" ${asked || !playing ? 'disabled' : ''}>
      ${icon}<span>${label}</span>${asked ? '<span class="tick">✔</span>' : ''}
    </button>`;
  };
  return `<div class="cols tavern">
    <div class="experts">
      ${EXPERTS.map((e) => {
        const locked = state.classIndex < e.minClass;
        const cost = expertCost(state, e.id);
        return `<button class="expert-card px ${ui.tavernExpert === e.id ? 'selected' : ''} ${locked ? 'locked' : ''}"
          data-action="pick-expert" data-expert="${e.id}" aria-pressed="${ui.tavernExpert === e.id}">
          ${sprite(EXPERT_SPRITE[e.id], 40)}
          <span class="expert-text">
            <strong>${e.name}</strong>
            <span class="small">${e.description}</span>
          </span>
          <span class="expert-cost ${locked ? 'muted' : 'gold'}">${locked ? `🔒 ${getClass(e.minClass).name}` : cost === 0 ? 'grátis' : `${fmt(cost)} fl por pergunta`}</span>
        </button>`;
      }).join('')}
    </div>
    <article class="card px ask">
      <h2>${sprite(EXPERT_SPRITE[expert.id], 20)} Perguntar ${expert.id === 'astrologer' ? 'à' : 'ao'} ${expert.name} sobre…</h2>
      ${
        expertLocked
          ? `<p class="locked-note">🔒 O ${expert.name} não atende quem está abaixo de ${getClass(expert.minClass).name}.</p>`
          : `<p class="muted small">O PIB e os bairros mexem com muitas empresas de uma vez; "Setor" responde pela guilda inteira; uma empresa responde só pelos negócios dela.</p>
             <div class="ask-groups">
               <div class="ask-group">
                 ${askButton('city', `PIB de ${CITY.name}`, sprite('castle', 20))}
                 ${REGIONS.map((r) => askButton(r.id, r.name, '')).join('')}
               </div>
               ${GUILDS.filter((g) => isGuildUnlocked(state, g))
                 .map(
                   (g) => `<div class="ask-group">
                   ${askButton(g.id, `Setor ${g.short}`, sprite(GUILD_SPRITE[g.id]!, 20))}
                   ${companiesOf(g.id)
                     .map((c) => askButton(c.id, c.name, ''))
                     .join('')}
                 </div>`,
                 )
                 .join('')}</div>`
      }
      <h3>Rumores desta semana</h3>
      ${
        state.insights.length === 0
          ? '<p class="muted">Ninguém te contou nada ainda.</p>'
          : `<ul class="rumors">${state.insights.map((i) => `<li>${renderInsight(i, false)}</li>`).join('')}</ul>`
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
      <p class="muted small">A cada ${SEASON_LENGTH} semanas: abaixo do piso você cai; acima do teto pode comprar o próximo título.</p>
    </article>
    <article class="card px">
      <h2>${sprite('shield', 20)} Seu título: ${cls.name}</h2>
      ${
        state.ascensionOffer && next
          ? `<div class="offer">
              <p>${sprite('scroll', 20)} O camareiro oferece o título de <strong>${next.name}</strong> por <strong class="gold">${fmt(cls.ascensionFee)} fl</strong>. A oferta expira no fim da semana.</p>
              <div class="actions">
                <button class="pbtn" data-action="accept-title">Comprar título</button>
                <button class="pbtn pbtn-ghost" data-action="decline-title">Recusar</button>
              </div>
            </div>`
          : ''
      }
      <ul class="ledger">
        <li><span>Custo de vida</span><span>${fmt(cls.livingCost)} fl/sem</span></li>
        <li><span>Juros da Coroa</span><span>${pct(cls.bondRate * 100, 2)}/sem</span></li>
        <li><span>Taxa de seguro</span><span>${pct(cls.hedgeFeeRate * 100, 1)}/sem</span></li>
        ${next ? `<li><span>Título de ${next.name}</span><span>${fmt(cls.ascensionFee)} fl</span></li>` : ''}
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
  if (state.status === 'lost') {
    return modal(`
      ${sprite('hourglass', 64)}
      <h2>Para a masmorra!</h2>
      <p>Os credores venceram na semana ${state.week}. O Lobo vai uivar atrás das grades.</p>
      <button class="pbtn" data-action="new-game">Tentar de novo</button>`);
  }
  if (!ui.showReport || !ui.lastReport) return '';

  const report = ui.lastReport;
  const net = reportNet(report);
  const held = Object.entries(report.positionPnl);
  const cls = currentClass(state);
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
      <li><span>Custo de vida</span><span class="down">${signed(-report.livingCost)}</span></li>
    </ul>
    ${news.length ? `<ul class="report-news">${news.map((n) => `<li class="log-${n.tone}">${esc(n.text)}</li>`).join('')}</ul>` : ''}
    ${
      next
        ? `<div class="offer">
            <p>${sprite('scroll', 20)} Título de <strong>${next.name}</strong> por <strong class="gold">${fmt(cls.ascensionFee)} fl</strong>?</p>
            <div class="actions">
              <button class="pbtn" data-action="accept-title">Comprar título</button>
              <button class="pbtn pbtn-ghost" data-action="close-report">Depois</button>
            </div>
          </div>`
        : '<button class="pbtn" data-action="close-report">Continuar</button>'
    }`);
}

function modal(content: string): string {
  return `<div class="modal-backdrop"><div class="modal px" role="dialog" aria-modal="true">${content}</div></div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumPnl(report: WeekReport): number {
  return Object.values(report.positionPnl).reduce((a, b) => a + b, 0);
}

function reportNet(report: WeekReport): number {
  return sumPnl(report) + report.bondIncome - report.hedgeFees - report.livingCost;
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
