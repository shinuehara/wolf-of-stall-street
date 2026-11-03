export type Sector =
  'food' | 'commodities' | 'health' | 'banking' | 'retail' | 'industry' | 'shipping' | 'spices';

/** A rung of the social ladder. Index 0 is the lowest (Serf). */
export interface SocialClass {
  id: string;
  name: string;
  /** Wealth below this at a season's end drops you one class. */
  floor: number;
  /** Wealth at or above this at a season's end lets you buy the next title. */
  ceiling: number;
  /** Price of buying the next title. */
  ascensionFee: number;
  /** Gold spent every week just to keep up appearances. */
  livingCost: number;
  /** Weekly yield on idle gold lent to the Crown (0.002 = 0.2%). */
  bondRate: number;
  /** Weekly insurance premium, as a fraction of the insured position. */
  hedgeFeeRate: number;
}

export interface GuildDef {
  id: string;
  name: string;
  sector: Sector;
  emoji: string;
  /** Average weekly return in %, before events. */
  drift: number;
  /** Typical width of the weekly return range in percentage points. */
  width: number;
  /** Minimum social class index that can trade this guild. */
  minClass: number;
  startPrice: number;
}

export type SectorEffects = Partial<Record<Sector, number>>;

export interface EventDef {
  id: string;
  name: string;
  headline: string;
  /** Shift in percentage points applied to the weekly forecast of each sector. */
  effects: SectorEffects;
  duration: [min: number, max: number];
}

export type ExpertId = 'drunk' | 'astrologer' | 'spy';

export interface ExpertDef {
  id: ExpertId;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  /** Extra cost as a fraction of current wealth, so experts stay relevant late game. */
  wealthCost: number;
  minClass: number;
}

/**
 * Distribution of a guild's weekly return in %. `low`/`high` are public (announced by the
 * herald). The range is split into equal bands whose probabilities (`weights`) are hidden.
 */
export interface Forecast {
  low: number;
  high: number;
  weights: number[];
}

export interface Band {
  from: number;
  to: number;
  p: number;
}

export type Insight =
  | { expert: 'drunk' | 'astrologer'; guildId: string; leansUp: boolean }
  | { expert: 'spy'; guildId: string; bands: Band[] };

export interface Position {
  value: number;
  hedged: boolean;
}

export interface GuildState {
  id: string;
  price: number;
  history: number[];
}

export interface ActiveEvent {
  id: string;
  weeksLeft: number;
}

export interface LogEntry {
  week: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  version: 1;
  seed: number;
  rngState: number;
  /** Weeks elapsed. A season is SEASON_LENGTH weeks. */
  week: number;
  classIndex: number;
  cash: number;
  positions: Record<string, Position>;
  guilds: Record<string, GuildState>;
  forecasts: Record<string, Forecast>;
  insights: Insight[];
  events: ActiveEvent[];
  /** Set at a season's end when wealth reached the class ceiling. */
  ascensionOffer: boolean;
  status: GameStatus;
  log: LogEntry[];
}
