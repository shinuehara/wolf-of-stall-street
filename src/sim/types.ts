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

export type RegionId = 'crown' | 'burgo' | 'ribeira';

/** A district of the city. Its own factor moves the local demand of the companies based there. */
export interface RegionDef extends ForecastProfile {
  id: RegionId;
  name: string;
  /** Social standing of the people who live there. */
  standing: 'nobre' | 'médio' | 'humilde';
  description: string;
  /** How strongly the city's economy (GDP) moves companies based here. */
  cityBeta: number;
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
  /** District where the company is based. */
  regionId: RegionId;
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

/** Headline for news about the whole city (GDP) or one district. */
export interface LocalNewsTemplate {
  text: string;
  shift: number;
}

export interface ActiveLocalNews {
  /** 'city' or a region id. */
  targetId: string;
  headline: string;
  shift: number;
  weeksLeft: number;
}

/** An economic indicator tracked over time (city GDP, district demand), as an index. */
export interface IndicatorState {
  value: number;
  history: number[];
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
 * What an expert said. `targetId` is 'city', a region id, a guild id (about the whole sector)
 * or a company id (about that company's own business, apart from everything else).
 */
export type Insight =
  | { expert: 'drunk' | 'astrologer'; targetId: string; leansUp: boolean }
  | { expert: 'spy'; targetId: string; bands: Band[] };

export interface Position {
  value: number;
  /** Gold put in that is still in the position (reduced pro rata on sales). */
  cost: number;
  hedged: boolean;
}

/** A Crown bond lot locked until it matures. Its gold returns to free cash at maturity. */
export interface LockedBond {
  value: number;
  cost: number;
  /** Weekly rate fixed at purchase (0.004 = 0.4%). */
  rate: number;
  /** Week number at whose end the lot pays out. */
  maturesWeek: number;
}

/** One line of the weekly ledger: how wealth changed in a finished week. */
export interface WeekRecord {
  /** Week number that just ended (1 = first week). */
  week: number;
  startWealth: number;
  endWealth: number;
  /** Gains and losses on positions, after insurance. */
  marketPnl: number;
  bondIncome: number;
  hedgeFees: number;
  livingCost: number;
  /** Everything else: experts, titles bought. */
  other: number;
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
  version: 5;
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
  /** This week's forecast for the city's economy (GDP). */
  cityForecast: Forecast;
  /** This week's forecasts for each district's local demand. */
  regionForecasts: Record<string, Forecast>;
  /**
   * Slow economic cycle of the city, in % per week. It drifts a little every week and
   * sets the long-term trend of the GDP; weekly moves stay noisy around it.
   */
  cityCycle: number;
  /** GDP and district indices ('city' and region ids), starting at 100. */
  indicators: Record<string, IndicatorState>;
  insights: Insight[];
  events: ActiveEvent[];
  companyEvents: ActiveCompanyEvent[];
  localNews: ActiveLocalNews[];
  /** Crown bonds locked until maturity (the liquid bond is a normal position). */
  lockedBonds: LockedBond[];
  /** One record per finished week, oldest first. */
  ledger: WeekRecord[];
  /** Lifetime gains and losses per asset, in gold. */
  assetPnl: Record<string, number>;
  /** Set at a season's end when wealth reached the class ceiling. */
  ascensionOffer: boolean;
  status: GameStatus;
  log: LogEntry[];
}
