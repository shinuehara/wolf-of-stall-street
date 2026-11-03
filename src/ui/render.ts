import {
  CLASSES,
  EXPERTS,
  GUILDS,
  SEASON_LENGTH,
  TOP_CLASS,
  getClass,
  getEvent,
  getGuild,
} from '../sim/data';
import { bands, hedgeBounds } from '../sim/forecast';
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
import type {
  ExpertId,
  Forecast,
  GameState,
  GuildDef,
  Insight,
  LogEntry,
  Sector,
} from '../sim/types';
import { sceneUrl, type SceneName } from './scenes';
import { sprite, type SpriteName } from './sprites';

export type Screen = SceneName;

export interface UiState {
  screen: Screen;
  selectedGuild: string;
  /** On narrow screens the market shows either the list or one guild's detail. */
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
    selectedGuild: 'bakers',
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

const GUILD_SHORT: Record<string, string> = {
  bakers: 'Padeiros',
  mines: 'Minas',
  apothecaries: 'Boticários',
  changers: 'Cambistas',
  fair: 'Feira',
  forge: 'Forja',
  fleet: 'Navegação',
  spices: 'Especiarias',
};

const EXPERT_SPRITE: Record<ExpertId, SpriteName> = {
  drunk: 'mug',
  astrologer: 'crystal',
  spy: 'hood',
};

/** Scale of the range bars, in % per week. */
const SCALE = 25;

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
  const fees = GUILDS.reduce((sum, g) => sum + hedgeFee(state, g.id), 0);
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

  return `<div class="square">
  <div class="cols cols-3">
    <article class="card px">
      <h2>${sprite('scroll', 20)} O Arauto anuncia</h2>
      ${
        events.length === 0
          ? '<p class="muted">Tempos calmos no reino. Por enquanto.</p>'
          : `<ul class="news">${events
              .map(
                ({ def, weeksLeft }) => `<li>
                  <strong>${def.name}</strong> <span class="muted">· mais ${weeksLeft} sem.</span>
                  <p class="headline">"${def.headline}"</p>
                  <div class="chips">${Object.entries(def.effects)
                    .map(
                      ([sector, v]) =>
                        `<span class="chip ${tone(v)}">${SECTOR_NAMES[sector as Sector]} ${v > 0 ? '▲' : '▼'}</span>`,
                    )
                    .join('')}</div>
                </li>`,
              )
              .join('')}</ul>`
      }
    </article>
    <article class="card px">
      <h2>${sprite('coin', 20)} Sua semana</h2>
      ${
        report && net !== null
          ? `<p class="big ${tone(net)}">${signed(net)} fl</p>
             <ul class="ledger">
               <li><span>Guildas</span><span class="${tone(sumPnl(report))}">${signed(sumPnl(report))}</span></li>
               <li><span>Títulos da Coroa</span><span class="up">${signed(report.bondIncome)}</span></li>
               <li><span>Seguros</span><span class="down">${signed(-report.hedgeFees)}</span></li>
               <li><span>Custo de vida</span><span class="down">${signed(-report.livingCost)}</span></li>
             </ul>`
          : `<p>Você chegou à cidade com <strong class="gold">100 florins</strong> e um sonho: virar <strong>Conde</strong>.</p>
             <p class="muted">Vá ao <strong>Mercado</strong> comprar cotas, à <strong>Taverna</strong> ouvir rumores e, quando estiver pronto, encerre a semana.</p>`
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
// Mercado
// ---------------------------------------------------------------------------

function renderMarket(state: GameState, ui: UiState): string {
  const guild = getGuild(ui.selectedGuild);
  return `<div class="market ${ui.marketDetailOpen ? 'detail-open' : ''}">
    <ul class="guild-list px" aria-label="Guildas">
      ${GUILDS.map((g) => renderGuildRow(state, ui, g)).join('')}
    </ul>
    <article class="guild-detail px">${renderGuildDetail(state, ui, guild)}</article>
  </div>`;
}

function renderGuildRow(state: GameState, ui: UiState, guild: GuildDef): string {
  const unlocked = isGuildUnlocked(state, guild);
  const f = state.forecasts[guild.id]!;
  const position = state.positions[guild.id];
  const selected = ui.selectedGuild === guild.id;
  return `<li>
    <button class="guild-row ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-action="select-guild" data-guild="${guild.id}">
      ${sprite(GUILD_SPRITE[guild.id]!, 28)}
      <span class="row-name">${GUILD_SHORT[guild.id]}</span>
      ${
        unlocked
          ? `<span class="row-range">${pct(f.low, 0)} a ${pct(f.high, 0)}</span>
             <span class="row-pos ${position ? 'gold' : 'muted'}">${position ? `${fmt(position.value)} fl${position.hedged ? ' 🛡' : ''}` : '—'}</span>`
          : `<span class="row-range muted">🔒 ${getClass(guild.minClass).name}</span><span></span>`
      }
    </button>
  </li>`;
}

function renderGuildDetail(state: GameState, ui: UiState, guild: GuildDef): string {
  const back = `<button class="pbtn pbtn-small back-btn" data-action="close-detail">◀ Guildas</button>`;
  const head = (extra = '') => `<header class="detail-head">
      ${sprite(GUILD_SPRITE[guild.id]!, 48)}
      <div class="detail-title">
        <h2>${guild.name}</h2>
        <span class="muted">${SECTOR_NAMES[guild.sector]}</span>
      </div>
      ${extra}
    </header>`;

  if (!isGuildUnlocked(state, guild)) {
    return `${back}${head()}
      <p class="locked-note">🔒 A ${guild.name} só negocia com quem é <strong>${getClass(guild.minClass).name}</strong> ou mais.
      Suba na escada social para entrar.</p>`;
  }

  const gs = state.guilds[guild.id]!;
  const forecast = state.forecasts[guild.id]!;
  const position = state.positions[guild.id];
  const insights = state.insights.filter((i) => i.guildId === guild.id);
  const playing = state.status === 'playing';
  const hedgeRange = hedgeBounds(forecast);
  const fee = position ? position.value * currentClass(state).hedgeFeeRate : 0;
  const lastMove = ui.lastReport?.marketReturns[guild.id];
  const lastPnl = ui.lastReport?.positionPnl[guild.id];
  const events = state.events
    .map((e) => getEvent(e.id))
    .filter((e) => (e.effects[guild.sector] ?? 0) !== 0);

  const price = `<div class="detail-price">
      ${sparkline(gs.history)}
      <strong>${fmt(gs.price)} fl</strong>
      ${lastMove === undefined ? '' : `<span class="${tone(lastMove)}">${pct(lastMove)}</span>`}
    </div>`;

  return `${back}${head(price)}
    <div class="forecast">
      <div class="forecast-label">O arauto prevê <strong>${pct(forecast.low, 0)} a ${pct(forecast.high, 0)}</strong> nesta semana</div>
      ${rangeBar(forecast, position?.hedged ? hedgeRange : null, insights)}
      ${insights.length ? `<div class="insights">${insights.map((i) => renderInsight(i, true)).join('')}</div>` : `<p class="muted small">Quer saber para que lado pende? <button class="linkish" data-action="go" data-screen="tavern">Pergunte na Taverna ▶</button></p>`}
      ${events.length ? `<div class="chips">${events.map((e) => `<span class="chip ${tone(e.effects[guild.sector] ?? 0)}">${e.name} ${(e.effects[guild.sector] ?? 0) > 0 ? '▲' : '▼'}</span>`).join('')}</div>` : ''}
    </div>
    <div class="trade-box">
      <div class="holding">
        Sua posição: <strong class="gold">${fmt(position?.value ?? 0)} fl</strong>
        ${lastPnl === undefined ? '' : `<span class="${tone(lastPnl)}">(${signed(lastPnl)} na semana passada)</span>`}
      </div>
      <div class="trade">
        <input id="amount-${guild.id}" type="number" inputmode="decimal" min="0" step="1" placeholder="florins"
          aria-label="Valor em florins" data-amount="${guild.id}" value="${esc(ui.amounts[guild.id] ?? '')}" ${playing ? '' : 'disabled'} />
        <button class="pbtn pbtn-small" data-action="fill" data-fraction="0.25" data-guild="${guild.id}" ${playing ? '' : 'disabled'}>25%</button>
        <button class="pbtn pbtn-small" data-action="fill" data-fraction="0.5" data-guild="${guild.id}" ${playing ? '' : 'disabled'}>50%</button>
        <button class="pbtn pbtn-small" data-action="fill" data-fraction="1" data-guild="${guild.id}" ${playing ? '' : 'disabled'}>Tudo</button>
      </div>
      <div class="trade">
        <button class="pbtn pbtn-buy" data-action="buy" data-guild="${guild.id}" ${playing ? '' : 'disabled'}>Comprar</button>
        <button class="pbtn pbtn-sell" data-action="sell" data-guild="${guild.id}" ${playing && position ? '' : 'disabled'}>Vender</button>
      </div>
      ${
        position
          ? `<label class="hedge ${position.hedged ? 'on' : ''}">
              <input type="checkbox" data-hedge="${guild.id}" ${position.hedged ? 'checked' : ''} ${playing ? '' : 'disabled'} />
              ${sprite('shield', 20)}
              <span>Seguro: limita a <strong>${pct(hedgeRange.floor)} a ${pct(hedgeRange.cap)}</strong> por ${fmt(fee)} fl/semana</span>
            </label>`
          : '<p class="muted small">Vender sem informar valor vende tudo. Com uma posição aberta, você pode contratar seguro.</p>'
      }
    </div>`;
}

function renderInsight(insight: Insight, full: boolean): string {
  switch (insight.expert) {
    case 'drunk':
      return `<div class="insight">${sprite('mug', 20)}<span><em>"${insight.leansUp ? 'Vai subir, confia em mim! *hic*' : 'Vende tudo! Vai despencar! *hic*'}"</em></span></div>`;
    case 'astrologer':
      return `<div class="insight">${sprite('crystal', 20)}<span>Os astros apontam para <strong class="${insight.leansUp ? 'up' : 'down'}">${insight.leansUp ? 'ALTA' : 'BAIXA'}</strong>.</span></div>`;
    case 'spy':
      if (!full) {
        return `<div class="insight">${sprite('hood', 20)}<span>Chances: ${insight.bands.map((b) => `${Math.round(b.p * 100)}%`).join(' · ')}</span></div>`;
      }
      return `<div class="insight insight-spy">${sprite('hood', 20)}
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

function rangeBar(
  f: Forecast,
  hedge: { floor: number; cap: number } | null,
  insights: Insight[],
): string {
  const x = (v: number) => clampPct(((v + SCALE) / (2 * SCALE)) * 100);
  const spy = insights.find((i) => i.expert === 'spy');
  const fill =
    spy?.expert === 'spy'
      ? bands(f)
          .map(
            (b) =>
              `<div class="range-band" style="left:${x(b.from)}%;width:${x(b.to) - x(b.from)}%;opacity:${(0.2 + b.p * 0.8).toFixed(2)}"></div>`,
          )
          .join('')
      : `<div class="range-band" style="left:${x(f.low)}%;width:${x(f.high) - x(f.low)}%"></div>`;
  return `<div class="range" aria-hidden="true">
    ${fill}
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
          <span class="expert-cost ${locked ? 'muted' : 'gold'}">${locked ? `🔒 ${getClass(e.minClass).name}` : cost === 0 ? 'grátis' : `${fmt(cost)} fl`}</span>
        </button>`;
      }).join('')}
    </div>
    <article class="card px ask">
      <h2>${sprite(EXPERT_SPRITE[expert.id], 20)} Perguntar ${expert.id === 'drunk' ? 'ao' : expert.id === 'spy' ? 'ao' : 'à'} ${expert.name} sobre…</h2>
      ${
        expertLocked
          ? `<p class="locked-note">🔒 O ${expert.name} não atende quem está abaixo de ${getClass(expert.minClass).name}.</p>`
          : `<div class="ask-grid">${GUILDS.filter((g) => isGuildUnlocked(state, g))
              .map((g) => {
                const asked = state.insights.some(
                  (i) => i.expert === expert.id && i.guildId === g.id,
                );
                return `<button class="ask-btn ${asked ? 'done' : ''}" data-action="consult" data-expert="${expert.id}" data-guild="${g.id}" ${asked || !playing ? 'disabled' : ''}>
                  ${sprite(GUILD_SPRITE[g.id]!, 24)}<span>${GUILD_SHORT[g.id]}</span>${asked ? '<span class="tick">✔</span>' : ''}
                </button>`;
              })
              .join('')}</div>`
      }
      <h3>Rumores desta semana</h3>
      ${
        state.insights.length === 0
          ? '<p class="muted">Ninguém te contou nada ainda.</p>'
          : `<ul class="rumors">${state.insights
              .map(
                (i) =>
                  `<li><span class="rumor-guild">${GUILD_SHORT[i.guildId]}</span>${renderInsight(i, false)}</li>`,
              )
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
        ...GUILDS.filter((g) => g.minClass === state.classIndex + 1).map((g) => GUILD_SHORT[g.id]),
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
              return `<li><span>${sprite(GUILD_SPRITE[id]!, 20)} ${GUILD_SHORT[id]} <span class="${tone(move)}">${pct(move)}</span></span><span class="${tone(pnl)}">${signed(pnl)}</span></li>`;
            })
            .join('')}</ul>`
        : '<p class="muted">Você não tinha cotas de nenhuma guilda.</p>'
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

function sparkline(history: number[]): string {
  const points = history.slice(-20);
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points
    .map(
      (p, i) =>
        `${Math.round((i / (points.length - 1)) * 60)},${Math.round(18 - ((p - min) / span) * 16)}`,
    )
    .join(' ');
  const up = points[points.length - 1]! >= points[0]!;
  return `<svg class="spark ${up ? 'up' : 'down'}" viewBox="0 0 60 20" width="60" height="20" aria-hidden="true" shape-rendering="crispEdges">
    <polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2" /></svg>`;
}

function pct(value: number, digits = 1): string {
  const s = value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value > 0 ? '+' : ''}${s}%`;
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${fmt(value)}`;
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
