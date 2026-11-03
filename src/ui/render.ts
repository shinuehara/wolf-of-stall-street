import {
  CLASSES,
  EXPERTS,
  GUILDS,
  SEASON_LENGTH,
  TOP_CLASS,
  getClass,
  getEvent,
} from '../sim/data';
import { bands, hedgeBounds } from '../sim/forecast';
import {
  currentClass,
  expertCost,
  fmt,
  hedgeFee,
  invested,
  isGuildUnlocked,
  season,
  wealth,
  weeksUntilSeasonEnd,
  type WeekReport,
} from '../sim/game';
import type { Forecast, GameState, GuildDef, Insight, Sector } from '../sim/types';

export interface UiState {
  confirmingRestart: boolean;
  amounts: Record<string, string>;
  lastReport: WeekReport | null;
  message: { text: string; tone: 'error' | 'info' } | null;
}

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

const CLASS_EMOJI = ['🧺', '🌾', '🔨', '⚖️', '🏠', '🛡️', '🏰', '👑'];

/** Scale of the range bars, in % per week. */
const SCALE = 25;

export function render(state: GameState, ui: UiState): string {
  return `
    <header class="masthead">
      <h1>The Wolf of Stall Street</h1>
      <p class="subtitle">O Lobo do Condado Faria Lima</p>
    </header>
    ${renderStatus(state)}
    ${renderBanner(state)}
    ${ui.message ? `<div class="toast toast-${ui.message.tone}" role="status">${esc(ui.message.text)}</div>` : ''}
    <main class="layout">
      <section class="guilds" aria-label="Guildas">
        ${GUILDS.map((g) => renderGuild(state, ui, g)).join('')}
      </section>
      <aside class="sidebar">
        ${renderHerald(state)}
        ${renderExperts(state)}
        ${renderLadder(state)}
        ${renderLog(state, ui)}
      </aside>
    </main>
    ${renderFooter(state)}
  `;
}

function renderStatus(state: GameState): string {
  const cls = currentClass(state);
  const total = wealth(state);
  const isTop = state.classIndex >= TOP_CLASS;
  const lo = cls.floor * 0.8;
  const hi = isTop ? total : cls.ceiling * 1.1;
  const pos = (x: number) => clampPct(((x - lo) / (hi - lo)) * 100);
  return `
    <section class="status panel">
      <div class="stat">
        <span class="label">Classe</span>
        <span class="value">${CLASS_EMOJI[state.classIndex] ?? ''} ${cls.name}</span>
      </div>
      <div class="stat">
        <span class="label">Patrimônio</span>
        <span class="value">${fmt(total)} fl</span>
      </div>
      <div class="stat">
        <span class="label">Florins livres</span>
        <span class="value">${fmt(state.cash)} fl</span>
        <span class="hint">rendem ${pct(cls.bondRate * 100, 2)}/sem nos Títulos da Coroa</span>
      </div>
      <div class="stat">
        <span class="label">Em guildas</span>
        <span class="value">${fmt(invested(state))} fl</span>
      </div>
      <div class="stat">
        <span class="label">Estação ${season(state)}</span>
        <span class="value">Semana ${state.week + 1}</span>
        <span class="hint">avaliação em ${weeksUntilSeasonEnd(state)} sem.</span>
      </div>
      ${
        isTop
          ? ''
          : `<div class="wealth-meter" aria-label="Patrimônio entre o piso e o teto da classe">
              <div class="meter-track">
                <div class="meter-zone zone-down" style="left:0;width:${pos(cls.floor)}%"></div>
                <div class="meter-zone zone-up" style="left:${pos(cls.ceiling)}%;right:0"></div>
                <div class="meter-marker" style="left:${pos(total)}%"></div>
              </div>
              <div class="meter-labels">
                <span style="left:${pos(cls.floor)}%">piso ${whole(cls.floor)}</span>
                <span style="left:${pos(cls.ceiling)}%">teto ${whole(cls.ceiling)}</span>
              </div>
            </div>`
      }
    </section>`;
}

function renderBanner(state: GameState): string {
  if (state.status === 'won') {
    return `<div class="banner banner-win">
      <h2>👑 Vida longa ao Conde!</h2>
      <p>Você saiu de Servo a Conde em <strong>${state.week} semanas</strong>, com ${fmt(wealth(state))} florins.</p>
      <button class="btn btn-primary" data-action="new-game">Nova partida</button>
    </div>`;
  }
  if (state.status === 'lost') {
    return `<div class="banner banner-lose">
      <h2>⛓️ Para a masmorra!</h2>
      <p>Os credores venceram na semana ${state.week}. O Lobo vai uivar atrás das grades.</p>
      <button class="btn btn-primary" data-action="new-game">Tentar de novo</button>
    </div>`;
  }
  if (state.ascensionOffer) {
    const cls = currentClass(state);
    const next = getClass(state.classIndex + 1);
    return `<div class="banner banner-offer">
      <h2>📜 O camareiro bate à sua porta</h2>
      <p>Por <strong>${fmt(cls.ascensionFee)} florins</strong> você pode se tornar <strong>${next.name}</strong>.
      O custo de vida sobe para ${fmt(next.livingCost)} fl/semana e o piso para ${fmt(next.floor)} fl.
      A oferta expira ao fim desta semana.</p>
      <div class="actions">
        <button class="btn btn-primary" data-action="accept-title">Comprar o título</button>
        <button class="btn" data-action="decline-title">Recusar</button>
      </div>
    </div>`;
  }
  return '';
}

function renderGuild(state: GameState, ui: UiState, guild: GuildDef): string {
  const unlocked = isGuildUnlocked(state, guild);
  const gs = state.guilds[guild.id]!;
  const forecast = state.forecasts[guild.id]!;
  const position = state.positions[guild.id];
  const lastMove = ui.lastReport?.marketReturns[guild.id];
  const lastPnl = ui.lastReport?.positionPnl[guild.id];

  if (!unlocked) {
    return `<article class="guild panel locked">
      <header class="guild-head">
        <span class="guild-emoji">${guild.emoji}</span>
        <div><h3>${guild.name}</h3><span class="sector">${SECTOR_NAMES[guild.sector]}</span></div>
      </header>
      <p class="locked-note">🔒 Só negocia com quem é ${getClass(guild.minClass).name} ou mais.</p>
    </article>`;
  }

  const insights = state.insights.filter((i) => i.guildId === guild.id);
  const playing = state.status === 'playing';
  const hedgeRange = hedgeBounds(forecast);
  const fee = position ? position.value * currentClass(state).hedgeFeeRate : 0;

  return `<article class="guild panel">
    <header class="guild-head">
      <span class="guild-emoji">${guild.emoji}</span>
      <div class="guild-title">
        <h3>${guild.name}</h3>
        <span class="sector">${SECTOR_NAMES[guild.sector]}</span>
      </div>
      <div class="price">
        ${sparkline(gs.history)}
        <span>${fmt(gs.price)} fl</span>
        ${lastMove === undefined ? '' : `<span class="${tone(lastMove)}">${pct(lastMove)}</span>`}
      </div>
    </header>

    <div class="forecast">
      <div class="forecast-label">📯 O arauto prevê <strong>${pct(forecast.low, 0)} a ${pct(forecast.high, 0)}</strong></div>
      ${rangeBar(forecast, position?.hedged ? hedgeRange : null, insights)}
    </div>

    ${insights.length ? `<ul class="insights">${insights.map((i) => renderInsight(i)).join('')}</ul>` : ''}

    <div class="consult">
      ${EXPERTS.map((e) => {
        const locked = state.classIndex < e.minClass;
        const asked = insights.some((i) => i.expert === e.id);
        const cost = expertCost(state, e.id);
        const label = cost === 0 ? 'grátis' : `${fmt(cost)} fl`;
        const title = locked
          ? `${e.name}: a partir de ${getClass(e.minClass).name}`
          : `${e.name}: ${e.description}`;
        return `<button class="btn btn-small" data-action="consult" data-expert="${e.id}" data-guild="${guild.id}"
          title="${esc(title)}" ${locked || asked || !playing ? 'disabled' : ''}>
          ${e.emoji} ${locked ? '🔒' : label}</button>`;
      }).join('')}
    </div>

    <div class="position">
      <div class="holding">
        <span>Sua posição: <strong>${fmt(position?.value ?? 0)} fl</strong></span>
        ${lastPnl === undefined ? '' : `<span class="${tone(lastPnl)}">(${lastPnl >= 0 ? '+' : ''}${fmt(lastPnl)} na última semana)</span>`}
      </div>
      <div class="trade">
        <input type="number" inputmode="decimal" min="0" step="1" placeholder="florins"
          aria-label="Valor em florins para ${esc(guild.name)}"
          data-amount="${guild.id}" value="${esc(ui.amounts[guild.id] ?? '')}" ${playing ? '' : 'disabled'} />
        <button class="btn btn-small" data-action="fill-max" data-guild="${guild.id}" ${playing ? '' : 'disabled'}>Tudo</button>
        <button class="btn btn-small btn-buy" data-action="buy" data-guild="${guild.id}" ${playing ? '' : 'disabled'}>Comprar</button>
        <button class="btn btn-small btn-sell" data-action="sell" data-guild="${guild.id}" ${playing && position ? '' : 'disabled'}>Vender</button>
      </div>
      ${
        position
          ? `<label class="hedge">
              <input type="checkbox" data-hedge="${guild.id}" ${position.hedged ? 'checked' : ''} ${playing ? '' : 'disabled'} />
              🛡️ Segurar: limita a ${pct(hedgeRange.floor)} a ${pct(hedgeRange.cap)} por ${fmt(fee)} fl/semana
            </label>`
          : ''
      }
    </div>
  </article>`;
}

function renderInsight(insight: Insight): string {
  switch (insight.expert) {
    case 'drunk':
      return `<li>🍺 <em>"${insight.leansUp ? 'Vai subir, confia em mim! *hic*' : 'Vende tudo! Vai despencar! *hic*'}"</em></li>`;
    case 'astrologer':
      return `<li>🔮 Os astros apontam para <strong class="${insight.leansUp ? 'up' : 'down'}">${insight.leansUp ? 'ALTA' : 'BAIXA'}</strong>.</li>`;
    case 'spy':
      return `<li class="spy">🕵️ Chances reais:
        <div class="bands">${insight.bands
          .map(
            (b) => `<div class="band" title="${pct(b.from)} a ${pct(b.to)}">
              <div class="band-bar" style="height:${Math.max(2, Math.round(b.p * 48))}px"></div>
              <span class="band-p">${Math.round(b.p * 100)}%</span>
              <span class="band-range">${pct(b.from, 0)}…${pct(b.to, 0)}</span>
            </div>`,
          )
          .join('')}</div></li>`;
  }
}

function rangeBar(
  f: Forecast,
  hedge: { floor: number; cap: number } | null,
  insights: Insight[],
): string {
  const x = (v: number) => clampPct(((v + SCALE) / (2 * SCALE)) * 100);
  const spy = insights.find((i) => i.expert === 'spy');
  const bandStops =
    spy?.expert === 'spy'
      ? bands(f)
          .map((b) => {
            const alpha = (0.15 + b.p * 0.85).toFixed(2);
            return `<div class="range-band" style="left:${x(b.from)}%;width:${x(b.to) - x(b.from)}%;opacity:${alpha}"></div>`;
          })
          .join('')
      : `<div class="range-band" style="left:${x(f.low)}%;width:${x(f.high) - x(f.low)}%"></div>`;
  return `<div class="range" aria-hidden="true">
    <div class="range-zero" style="left:${x(0)}%"></div>
    ${bandStops}
    ${hedge ? `<div class="range-hedge" style="left:${x(hedge.floor)}%;width:${x(hedge.cap) - x(hedge.floor)}%"></div>` : ''}
  </div>`;
}

function renderHerald(state: GameState): string {
  const events = state.events.map((e) => ({ def: getEvent(e.id), weeksLeft: e.weeksLeft }));
  return `<section class="panel herald">
    <h2>📯 O Arauto</h2>
    ${
      events.length === 0
        ? '<p class="muted">Tempos calmos no reino. Por enquanto.</p>'
        : `<ul>${events
            .map(
              ({ def, weeksLeft }) => `<li>
                <strong>${def.name}</strong> <span class="muted">(${weeksLeft} sem.)</span>
                <div class="effects">${Object.entries(def.effects)
                  .map(
                    ([sector, v]) =>
                      `<span class="${tone(v)}">${SECTOR_NAMES[sector as Sector]} ${v > 0 ? '▲' : '▼'}</span>`,
                  )
                  .join(' ')}</div>
              </li>`,
            )
            .join('')}</ul>`
    }
  </section>`;
}

function renderExperts(state: GameState): string {
  return `<section class="panel">
    <h2>Especialistas</h2>
    <ul class="experts">${EXPERTS.map((e) => {
      const locked = state.classIndex < e.minClass;
      return `<li class="${locked ? 'muted' : ''}">${e.emoji} <strong>${e.name}</strong>: ${e.description}
        ${locked ? ` <em>(a partir de ${getClass(e.minClass).name})</em>` : ''}</li>`;
    }).join('')}</ul>
  </section>`;
}

function renderLadder(state: GameState): string {
  return `<section class="panel">
    <h2>A Escada Social</h2>
    <ol class="ladder" reversed>${[...CLASSES]
      .map((c, i) => ({ c, i }))
      .reverse()
      .map(
        ({
          c,
          i,
        }) => `<li class="${i === state.classIndex ? 'current' : i < state.classIndex ? 'past' : ''}">
          <span>${CLASS_EMOJI[i] ?? ''} ${c.name}</span>
          <span class="muted">${i === TOP_CLASS ? 'vitória' : `${whole(c.floor)}–${whole(c.ceiling)}`}</span>
        </li>`,
      )
      .join('')}</ol>
    <p class="muted small">A cada ${SEASON_LENGTH} semanas: abaixo do piso você cai; acima do teto pode comprar o próximo título.</p>
  </section>`;
}

function renderLog(state: GameState, ui: UiState): string {
  return `<section class="panel chronicle">
    <h2>Crônica</h2>
    <ul>${state.log
      .slice(0, 15)
      .map((l) => `<li class="log-${l.tone}">${esc(l.text)}</li>`)
      .join('')}</ul>
    ${
      ui.confirmingRestart
        ? `<div class="restart-confirm" role="alert">
            <p>Abandonar esta partida e começar outra?</p>
            <div class="actions">
              <button class="btn btn-small btn-primary" data-action="new-game">Sim, recomeçar</button>
              <button class="btn btn-small" data-action="cancel-restart">Continuar jogando</button>
            </div>
          </div>`
        : '<button class="btn btn-small btn-ghost" data-action="new-game">Recomeçar partida</button>'
    }
  </section>`;
}

function renderFooter(state: GameState): string {
  if (state.status !== 'playing') return '';
  const cls = currentClass(state);
  const fees = GUILDS.reduce((sum, g) => sum + hedgeFee(state, g.id), 0);
  return `<footer class="turnbar">
    <div class="turn-info">
      Custo de vida <strong>${fmt(cls.livingCost)} fl</strong>
      ${fees > 0 ? ` · seguros <strong>${fmt(fees)} fl</strong>` : ''}
    </div>
    <button class="btn btn-primary btn-big" data-action="end-week">Encerrar semana ⏭</button>
  </footer>`;
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
        `${((i / (points.length - 1)) * 60).toFixed(1)},${(18 - ((p - min) / span) * 16).toFixed(1)}`,
    )
    .join(' ');
  const up = points[points.length - 1]! >= points[0]!;
  return `<svg class="spark ${up ? 'up' : 'down'}" viewBox="0 0 60 20" width="60" height="20" aria-hidden="true">
    <polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>`;
}

function pct(value: number, digits = 1): string {
  const s = value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value > 0 ? '+' : ''}${s}%`;
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
