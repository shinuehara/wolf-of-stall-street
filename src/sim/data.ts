import type { EventDef, ExpertDef, GuildDef, SocialClass } from './types';

export const SEASON_LENGTH = 4;
export const STARTING_GOLD = 100;
export const MAX_ACTIVE_EVENTS = 2;
export const EVENT_CHANCE = 0.3;
export const ASTROLOGER_ACCURACY = 0.75;
export const DRUNK_ACCURACY = 0.5;

/**
 * The social ladder. Each ceiling minus the ascension fee lands at or above the next floor,
 * so buying a title never drops you straight back down.
 */
export const CLASSES: readonly SocialClass[] = [
  {
    id: 'serf',
    name: 'Servo',
    floor: 60,
    ceiling: 130,
    ascensionFee: 5,
    livingCost: 0.5,
    bondRate: 0.002,
    hedgeFeeRate: 0.01,
  },
  {
    id: 'peasant',
    name: 'Camponês',
    floor: 115,
    ceiling: 170,
    ascensionFee: 7,
    livingCost: 0.7,
    bondRate: 0.0025,
    hedgeFeeRate: 0.009,
  },
  {
    id: 'artisan',
    name: 'Artesão',
    floor: 150,
    ceiling: 220,
    ascensionFee: 9,
    livingCost: 0.9,
    bondRate: 0.003,
    hedgeFeeRate: 0.008,
  },
  {
    id: 'merchant',
    name: 'Mercador',
    floor: 195,
    ceiling: 285,
    ascensionFee: 12,
    livingCost: 1.2,
    bondRate: 0.0035,
    hedgeFeeRate: 0.007,
  },
  {
    id: 'burgher',
    name: 'Burguês',
    floor: 255,
    ceiling: 370,
    ascensionFee: 15,
    livingCost: 1.5,
    bondRate: 0.004,
    hedgeFeeRate: 0.006,
  },
  {
    id: 'knight',
    name: 'Cavaleiro',
    floor: 330,
    ceiling: 480,
    ascensionFee: 20,
    livingCost: 2,
    bondRate: 0.0045,
    hedgeFeeRate: 0.005,
  },
  {
    id: 'baron',
    name: 'Barão',
    floor: 430,
    ceiling: 620,
    ascensionFee: 26,
    livingCost: 2.6,
    bondRate: 0.005,
    hedgeFeeRate: 0.004,
  },
  {
    id: 'count',
    name: 'Conde',
    floor: 0,
    ceiling: Infinity,
    ascensionFee: 0,
    livingCost: 0,
    bondRate: 0.005,
    hedgeFeeRate: 0.004,
  },
];

export const TOP_CLASS = CLASSES.length - 1;

export const GUILDS: readonly GuildDef[] = [
  {
    id: 'bakers',
    name: 'Guilda dos Padeiros',
    sector: 'food',
    emoji: '🍞',
    drift: 0.3,
    width: 10,
    minClass: 0,
    startPrice: 10,
  },
  {
    id: 'mines',
    name: 'Minas de Ferro',
    sector: 'commodities',
    emoji: '⛏️',
    drift: 0.2,
    width: 18,
    minClass: 0,
    startPrice: 14,
  },
  {
    id: 'apothecaries',
    name: 'Boticários',
    sector: 'health',
    emoji: '🧪',
    drift: 0.4,
    width: 14,
    minClass: 0,
    startPrice: 12,
  },
  {
    id: 'changers',
    name: 'Casa dos Cambistas',
    sector: 'banking',
    emoji: '🪙',
    drift: 0.3,
    width: 12,
    minClass: 1,
    startPrice: 20,
  },
  {
    id: 'fair',
    name: 'Feira dos Mercadores',
    sector: 'retail',
    emoji: '🎪',
    drift: 0.3,
    width: 16,
    minClass: 1,
    startPrice: 16,
  },
  {
    id: 'forge',
    name: 'Forja Real',
    sector: 'industry',
    emoji: '⚒️',
    drift: 0.5,
    width: 20,
    minClass: 2,
    startPrice: 25,
  },
  {
    id: 'fleet',
    name: 'Companhia de Navegação',
    sector: 'shipping',
    emoji: '⛵',
    drift: 0.8,
    width: 30,
    minClass: 3,
    startPrice: 40,
  },
  {
    id: 'spices',
    name: 'Mercado de Especiarias',
    sector: 'spices',
    emoji: '🌶️',
    drift: 1.2,
    width: 40,
    minClass: 4,
    startPrice: 60,
  },
];

export const EVENTS: readonly EventDef[] = [
  {
    id: 'war',
    name: 'Guerra com o Reino Vizinho',
    headline: 'Tambores de guerra! O Rei convoca os vassalos.',
    effects: { industry: 4, commodities: 3, food: 1, retail: -3, shipping: -3 },
    duration: [3, 6],
  },
  {
    id: 'plague',
    name: 'Peste',
    headline: 'A peste chegou ao porto. Fechem as janelas!',
    effects: { health: 5, retail: -4, food: -2, banking: -2 },
    duration: [2, 5],
  },
  {
    id: 'harvest-good',
    name: 'Colheita Farta',
    headline: 'Os campos transbordam de trigo este ano.',
    effects: { food: 3, commodities: -1 },
    duration: [2, 3],
  },
  {
    id: 'harvest-bad',
    name: 'Colheita Perdida',
    headline: 'Geada tardia arrasa as plantações.',
    effects: { food: -4, spices: 2 },
    duration: [2, 4],
  },
  {
    id: 'fair',
    name: 'Grande Feira Anual',
    headline: 'Mercadores de todo o reino chegam para a Grande Feira!',
    effects: { retail: 4, banking: 2, spices: 2 },
    duration: [1, 2],
  },
  {
    id: 'dragon',
    name: 'Dragão nas Minas',
    headline: 'Um dragão fez ninho nas Minas do Norte.',
    effects: { commodities: -6, industry: -2 },
    duration: [2, 4],
  },
  {
    id: 'fleet-return',
    name: 'Retorno da Frota',
    headline: 'A frota voltou das terras do Oriente, porões cheios!',
    effects: { spices: 5, shipping: 4 },
    duration: [1, 3],
  },
  {
    id: 'storm',
    name: 'Tempestade no Mar',
    headline: 'Tempestade engole três naus no estreito.',
    effects: { shipping: -6, spices: -3 },
    duration: [1, 3],
  },
  {
    id: 'debasement',
    name: 'Moeda Raspada',
    headline: 'O Rei mandou raspar as moedas. Cambistas em pânico.',
    effects: { banking: -5, commodities: 3 },
    duration: [2, 4],
  },
];

export const EXPERTS: readonly ExpertDef[] = [
  {
    id: 'drunk',
    name: 'Bêbado da Taverna',
    emoji: '🍺',
    description: 'Grátis. Metade do que diz é mentira.',
    baseCost: 0,
    wealthCost: 0,
    minClass: 0,
  },
  {
    id: 'astrologer',
    name: 'Astróloga',
    emoji: '🔮',
    description: 'Lê nos astros se a guilda pende para alta ou baixa. Acerta 3 em cada 4.',
    baseCost: 0.1,
    wealthCost: 0.0005,
    minClass: 0,
  },
  {
    id: 'spy',
    name: 'Espião',
    emoji: '🕵️',
    description: 'Traz a chance real de cada faixa de variação. Informação de primeira.',
    baseCost: 0.3,
    wealthCost: 0.002,
    minClass: 1,
  },
];

export function getGuild(id: string): GuildDef {
  const guild = GUILDS.find((g) => g.id === id);
  if (!guild) throw new Error(`Unknown guild: ${id}`);
  return guild;
}

export function getEvent(id: string): EventDef {
  const event = EVENTS.find((e) => e.id === id);
  if (!event) throw new Error(`Unknown event: ${id}`);
  return event;
}

export function getExpert(id: string): ExpertDef {
  const expert = EXPERTS.find((e) => e.id === id);
  if (!expert) throw new Error(`Unknown expert: ${id}`);
  return expert;
}

export function getClass(index: number): SocialClass {
  const cls = CLASSES[index];
  if (!cls) throw new Error(`Unknown class index: ${index}`);
  return cls;
}
