import './style.css';
import {
  acceptAscension,
  buy,
  consult,
  declineAscension,
  endWeek,
  newGame,
  sell,
  setHedge,
  type ActionResult,
} from './sim/game';
import type { ExpertId, GameState } from './sim/types';
import { render, type UiState } from './ui/render';
import { clearGame, loadGame, saveGame } from './ui/storage';

const root = document.querySelector<HTMLDivElement>('#app')!;

let state: GameState = loadGame() ?? newGame();
const ui: UiState = { amounts: {}, lastReport: null, message: null, confirmingRestart: false };

function update(): void {
  saveGame(state);
  root.innerHTML = render(state, ui);
}

function report(result: ActionResult): void {
  ui.message = result.ok ? null : { text: result.error, tone: 'error' };
}

function amountFor(guildId: string): number {
  const raw = (ui.amounts[guildId] ?? '').replace(',', '.');
  return Number.parseFloat(raw);
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const guildId = target.dataset.guild ?? '';
  ui.message = null;

  switch (target.dataset.action) {
    case 'buy':
      report(buy(state, guildId, amountFor(guildId)));
      if (!ui.message) ui.amounts[guildId] = '';
      break;
    case 'sell': {
      const amount = Number.isNaN(amountFor(guildId)) ? Infinity : amountFor(guildId);
      report(sell(state, guildId, amount));
      if (!ui.message) ui.amounts[guildId] = '';
      break;
    }
    case 'fill-max':
      ui.amounts[guildId] = String(Math.floor(state.cash * 10) / 10);
      break;
    case 'consult':
      report(consult(state, target.dataset.expert as ExpertId, guildId));
      break;
    case 'accept-title':
      report(acceptAscension(state));
      break;
    case 'decline-title':
      report(declineAscension(state));
      break;
    case 'cancel-restart':
      ui.confirmingRestart = false;
      break;
    case 'end-week':
      ui.lastReport = endWeek(state);
      break;
    case 'new-game':
      if (state.status === 'playing' && !ui.confirmingRestart) {
        ui.confirmingRestart = true;
        break;
      }
      ui.confirmingRestart = false;
      clearGame();
      state = newGame();
      ui.lastReport = null;
      ui.amounts = {};
      break;
    default:
      return;
  }
  update();
});

root.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  const guildId = input.dataset.amount;
  if (guildId) ui.amounts[guildId] = input.value;
});

root.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  const guildId = input.dataset.hedge;
  if (!guildId) return;
  ui.message = null;
  report(setHedge(state, guildId, input.checked));
  update();
});

root.addEventListener('keydown', (event) => {
  const input = event.target as HTMLInputElement;
  if (event.key === 'Enter' && input.dataset.amount) {
    root
      .querySelector<HTMLButtonElement>(`[data-action="buy"][data-guild="${input.dataset.amount}"]`)
      ?.click();
  }
});

update();
