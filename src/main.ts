import './style.css';
import {
  acceptAscension,
  buy,
  consult,
  declineAscension,
  endWeek,
  newGame,
  quickTrade,
  sell,
  setHedge,
  type ActionResult,
  fmt,
} from './sim/game';
import { assetName, guildOfAsset, isBasket, isBond } from './sim/assets';
import type { ExpertId, GameState } from './sim/types';
import { SCREENS, initialUi, render, type Screen } from './ui/render';
import { clearGame, loadGame, saveGame } from './ui/storage';

const root = document.querySelector<HTMLDivElement>('#app')!;

let state: GameState = loadGame() ?? newGame();
let ui = initialUi();

function update(): void {
  saveGame(state);
  root.innerHTML = render(state, ui);
}

function report(result: ActionResult): void {
  ui.message = result.ok ? null : { text: result.error, tone: 'error' };
}

function amountFor(assetId: string): number {
  return Number.parseFloat((ui.amounts[assetId] ?? '').replace(',', '.'));
}

function selectAsset(assetId: string): void {
  ui.selectedAsset = assetId;
  ui.marketDetailOpen = true;
  // Picking a company opens its guild so it stays visible in the list.
  if (!isBasket(assetId) && !isBond(assetId)) ui.expandedGuilds[guildOfAsset(assetId).id] = true;
}

function go(screen: Screen): void {
  ui.screen = screen;
  ui.confirmingRestart = false;
}

function finishWeek(): void {
  const previousTop = state.log[0];
  ui.lastReport = endWeek(state);
  const fresh = [];
  for (const entry of state.log) {
    if (entry === previousTop) break;
    fresh.push(entry);
  }
  ui.weekNews = fresh.reverse();
  ui.showReport = true;
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const assetId = target.dataset.asset ?? '';
  ui.message = null;

  switch (target.dataset.action) {
    case 'go':
      go(target.dataset.screen as Screen);
      break;
    case 'select-asset':
      selectAsset(assetId);
      break;
    case 'open-asset':
      selectAsset(assetId);
      go('market');
      break;
    case 'portfolio-tab':
      ui.portfolioTab = target.dataset.tab === 'returns' ? 'returns' : 'position';
      break;
    case 'square-tab':
      ui.squareTab = target.dataset.tab === 'almanac' ? 'almanac' : 'news';
      break;
    case 'almanac':
      ui.squareTab = 'almanac';
      ui.almanacEntry = target.dataset.entry ?? 'city';
      go('square');
      break;
    case 'toggle-guild': {
      const guildId = target.dataset.guild ?? '';
      ui.expandedGuilds[guildId] = !ui.expandedGuilds[guildId];
      break;
    }
    case 'close-detail':
      ui.marketDetailOpen = false;
      break;
    case 'buy':
      report(buy(state, assetId, amountFor(assetId)));
      if (!ui.message) ui.amounts[assetId] = '';
      break;
    case 'sell': {
      const amount = amountFor(assetId);
      report(sell(state, assetId, Number.isNaN(amount) ? Infinity : amount));
      if (!ui.message) ui.amounts[assetId] = '';
      break;
    }
    case 'quick': {
      const share = Number(target.dataset.share);
      const result = quickTrade(state, assetId, share);
      ui.message = result.ok
        ? {
            text: `${share > 0 ? 'Comprou' : 'Vendeu'} ${fmt(result.amount)} fl de ${assetName(assetId)}.`,
            tone: 'info',
          }
        : { text: result.error, tone: 'error' };
      break;
    }
    case 'fill': {
      const fraction = Number(target.dataset.fraction ?? 1);
      ui.amounts[assetId] = String(Math.floor(state.cash * fraction * 10) / 10);
      break;
    }
    case 'pick-expert':
      ui.tavernExpert = target.dataset.expert as ExpertId;
      break;
    case 'consult':
      report(consult(state, target.dataset.expert as ExpertId, assetId));
      break;
    case 'accept-title':
      report(acceptAscension(state));
      if (!ui.message) ui.showReport = false;
      break;
    case 'decline-title':
      report(declineAscension(state));
      break;
    case 'end-week':
      finishWeek();
      break;
    case 'close-report':
      ui.showReport = false;
      break;
    case 'cancel-restart':
      ui.confirmingRestart = false;
      break;
    case 'new-game':
      if (state.status === 'playing' && !ui.confirmingRestart) {
        ui.confirmingRestart = true;
        break;
      }
      clearGame();
      state = newGame();
      ui = initialUi();
      break;
    default:
      return;
  }
  update();
});

root.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  const assetId = input.dataset.amount;
  if (assetId) ui.amounts[assetId] = input.value;
});

root.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  const assetId = input.dataset.hedge;
  if (!assetId) return;
  ui.message = null;
  report(setHedge(state, assetId, input.checked));
  update();
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (target instanceof HTMLInputElement) {
    if (event.key === 'Enter' && target.dataset.amount) {
      root
        .querySelector<HTMLButtonElement>(
          `[data-action="buy"][data-asset="${target.dataset.amount}"]`,
        )
        ?.click();
    }
    return;
  }
  if (event.key === 'Escape' && ui.showReport) {
    ui.showReport = false;
    update();
    return;
  }
  const index = Number(event.key) - 1;
  const screen = SCREENS[index];
  if (screen && !ui.showReport) {
    go(screen.id);
    update();
  }
});

update();
