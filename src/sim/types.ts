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

/** Anything with its own weekly forecast: a whole sector or one company's own business. */
export interface ForecastProfile {
  /** Average weekly return in %, before events. */
  drift: number;
  /** Typical width of the weekly return range in percentage points. */
  width: number;
}

/**
 * A guild is a sector. Its id is also the id of the guild's basket asset, which holds
 * all of the guild's companies in equal parts.
 */
export interface GuildDef extends ForecastProfile {
  id: string;
  name: string;
  short: string;
  sector: Sector;
  /** Minimum social class index that can trade this guild and its companies. */
  minClass: number;
  startPrice: number;
}

/**
 * A company inside a guild. Its weekly return is `beta x sector move + its own move`,
 * where its own move has its own forecast (drift, width) and events.
 */
export interface CompanyDef extends ForecastProfile {
  id: string;
  guildId: string;
  name: string;
  /** Grammatical gender, for headlines: 'f' -> "da Padaria", 'm' -> "do Forno". */
  gender: 'f' | 'm';
  /** Sensitivity to the sector move. */
  beta: number;
  trait: string;
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

/** Headline template for news about one company. `{c}` is the company name. */
export interface CompanyNewsTemplate {
  text: string;
  shift: number;
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
 * Distribution of a weekly return in %. `low`/`high` are public (announced by the
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

/**
 * What an expert said. `targetId` is a guild id (about the whole sector) or a company id
 * (about that company's own business, apart from the sector).
 */
export type Insight =
  | { expert: 'drunk' | 'astrologer'; targetId: string; leansUp: boolean }
  | { expert: 'spy'; targetId: string; bands: Band[] };

export interface Position {
  value: number;
  hedged: boolean;
}

export interface AssetState {
  price: number;
  history: number[];
}

export interface ActiveEvent {
  id: string;
  weeksLeft: number;
}

export interface ActiveCompanyEvent {
  companyId: string;
  headline: string;
  shift: number;
  weeksLeft: number;
}

export interface LogEntry {
  week: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  version: 2;
  seed: number;
  rngState: number;
  /** Weeks elapsed. A season is SEASON_LENGTH weeks. */
  week: number;
  classIndex: number;
  cash: number;
  /** Keyed by asset id: a guild id (basket) or a company id. */
  positions: Record<string, Position>;
  assets: Record<string, AssetState>;
  /** This week's sector forecasts, by guild id. */
  sectorForecasts: Record<string, Forecast>;
  /** This week's company-specific forecasts, by company id. */
  companyForecasts: Record<string, Forecast>;
  insights: Insight[];
  events: ActiveEvent[];
  companyEvents: ActiveCompanyEvent[];
  /** Set at a season's end when wealth reached the class ceiling. */
  ascensionOffer: boolean;
  status: GameStatus;
  log: LogEntry[];
}
