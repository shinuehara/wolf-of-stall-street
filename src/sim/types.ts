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
  /** Weekly management fee the manager takes from the fund (0.0025 = 0.25% of the fund). */
  managementFeeRate: number;
  /** Share of each week's profit the manager takes as performance fee. */
  performanceFeeRate: number;
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
  /** Story chapter that opens the guild to commoners (default 1, after the first quarter). */
  minChapter?: number;
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

export type PerkId =
  | 'drunkCare'
  | 'telescope'
  | 'veteranSpy'
  | 'informants'
  | 'insurers'
  | 'chronicler'
  | 'scribe'
  | 'treasurer';

export interface PerkLevel {
  cost: number;
  /** Minimum social class index to buy this level. */
  minClass: number;
  /** What this level does, for the shop. */
  effect: string;
}

/** An upgrade bought once per level that improves the player's information or costs. */
export interface PerkDef {
  id: PerkId;
  name: string;
  icon: string;
  description: string;
  levels: PerkLevel[];
}

/** A surprise outside the announced range that hit a company this week. */
export interface Shock {
  companyId: string;
  /** Extra move in percentage points. */
  move: number;
  headline: string;
}

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
  | {
      /**
       * A true rumour about a company whose quarter is far from the public guess. How much
       * of it the player can read depends on the Drunk's rank when it is shown.
       */
      expert: 'drunk';
      /** The company the rumour is about. */
      targetId: string;
      up: boolean;
      /** Which line of DRUNK_RUMORS for the sector and direction (or of DRUNK_RAMBLES). */
      line: number;
      /** Paid for a drink and got only rambling (targetId is empty). */
      ramble?: boolean;
      level: number;
      week: number;
      publicMid: number;
    }
  | {
      expert: 'astrologer';
      targetId: string;
      /** Majority of the stars' votes. */
      leansUp: boolean;
      /** Each star's reading (true = up), in ASTROS order. */
      votes: boolean[];
      /** The expert's rank when asked (from perks); 0 is the rookie. */
      level: number;
      /** Week asked, and the middle of the public quarter range then. */
      week: number;
      publicMid: number;
    }
  | {
      expert: 'spy';
      targetId: string;
      /** The spy's estimate, which may be off or even planted. */
      bands: Band[];
      /**
       * Full analysis (Analyst rank): where each part of the asset ends the quarter, as its
       * weighted contribution in %. Keys: 'city', a guild id, a region id, a company id, or
       * for a basket 'regions' and 'own'.
       */
      parts?: { key: string; value: number }[];
      /** The spy's rank when asked (Veteran Spy perk); says how good he is, not if he is right. */
      level: number;
      /** Week asked, and the middle of the public quarter range then. */
      week: number;
      publicMid: number;
    };

/** A factor's quarter: the public range of its destiny, the hidden destiny and the way so far. */
export interface Prophecy extends Forecast {
  /** Where the factor's cumulative move (%) is headed by the quarter's end. Hidden. */
  target: number;
  /** Cumulative move (%) since the quarter began. */
  progress: number;
  /** This week's true expected move (%): PULL of the gap to the path. Hidden. */
  weekCenter: number;
  /** This week's noise scale (% standard deviation). */
  weekNoise: number;
}

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

export type VisitorKind = 'merchant' | 'smuggler';

export type ItemId =
  | 'brassLenses'
  | 'routeMap'
  | 'guildSeal'
  | 'sharpQuill'
  | 'luckyCharm'
  | 'stolenLedger'
  | 'courtWhisper'
  | 'crookedScales';

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string;
  seller: VisitorKind;
  cost: number;
  /** Weeks it lasts; 0 for one-off effects. */
  weeks: number;
  /** 'quarter' lasts until the end of the current quarter. */
  until?: 'quarter';
  effect: string;
  /** Chance of being caught when the effect ends (smuggled goods only). */
  catchChance?: number;
  /** What happens if caught. */
  penalty?: string;
}

export interface Visitor {
  kind: VisitorKind;
  offers: ItemId[];
  sold: ItemId[];
}

export interface ActiveEffect {
  id: ItemId;
  weeksLeft: number;
}

export interface SeasonSnapshot {
  wealth: number;
  purse: number;
  assetPnl: Record<string, number>;
  classIndex: number;
}

/** What happened in a season that just ended, for the review ceremony. */
export interface SeasonReview {
  season: number;
  classBefore: number;
  classAfter: number;
  outcome: 'down' | 'stay' | 'up-offer' | 'lost';
  /** Titles on offer after the review (several when the fund passed several ceilings). */
  offerLevels: number;
  startWealth: number;
  endWealth: number;
  startPurse: number;
  endPurse: number;
  /** Investor deposits (+) and withdrawals (-) during the season. */
  flows: number;
  /** The season's weeks, oldest first. */
  weeks: WeekRecord[];
  /** Gain or loss per asset during the season. */
  assetPnl: Record<string, number>;
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
  /** Management + performance fees paid from the fund to the manager. */
  fees: number;
  /** Money put in (+) or taken out (-) by investors, confiscations included. */
  flows: number;
  /** Broker's fees paid on purchases and sales since the previous week. */
  tradeFees: number;
  /** Anything else that changed the fund (should be ~0). */
  other: number;
  /** Manager's purse at the end of the week. */
  purse: number;
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

/**
 * Story beats shown as cut scenes: the opening decree, the influencer after quarter 1 and a
 * new influencer video ("the new trend is…") whenever guilds open to the player.
 */
export type StoryEvent = { id: 'intro' } | { id: 'influencer' } | { id: 'trend'; guilds: string[] };

export interface StoryState {
  /** 0: only Crown bonds (quarter 1). 1: bakers open (quarter 2). 2: guilds open by class. */
  chapter: number;
  /** Cut scenes waiting to be shown, oldest first. */
  queue: StoryEvent[];
  /** Guilds the player has already been told about (each opens with one scene). */
  announced: string[];
}

/** Hired managers who invest part of the fund on their own. */
export type ManagerId = 'prudencio' | 'ambrosina' | 'rodrigo';
export type ManagerStyle = 'cautious' | 'balanced' | 'bold';

export interface ManagerDef {
  id: ManagerId;
  name: string;
  title: string;
  style: ManagerStyle;
  /** What the player is told about how this manager invests. */
  styleText: string;
  line: string;
  minClass: number;
  /** One-off signing fee, paid from the purse. */
  hireCost: number;
  /** Weekly fee on the money managed (0.0005 = 0.05%). */
  weeklyFee: number;
  /** Share of each week's gain the manager keeps. */
  performanceShare: number;
  /** How far off the manager reads the forecasts, as a share of the range width. */
  noise: number;
}

/** Someone wants to put money in the fund; it may be dirty. */
export type InvestorKind = 'militia' | 'abbot' | 'widow';

export interface InvestorDef {
  id: InvestorKind;
  name: string;
  title: string;
  line: string;
  /** Deposit as a share of the fund. */
  share: number;
  /** Chance the money is dirty (1 = certainly, 0 = clean). Hidden from the player. */
  dirtyChance: number;
  /** While the money is being "washed", chance per week that it is traced. */
  catchChance: number;
  /** Weeks until dirty money is considered clean. */
  riskWeeks: number;
  /** Share of the purse taken as a fine when caught (on top of the confiscation). */
  purseFine: number;
  /** What the player is told about the risk. */
  risk: string;
  caught: string;
  safe: string;
}

export interface InvestorOffer {
  kind: InvestorKind;
  amount: number;
}

/** A deposit that can still be confiscated. */
export interface RiskyDeposit {
  kind: InvestorKind;
  amount: number;
  dirty: boolean;
  weeksLeft: number;
}

export interface GameState {
  version: 16;
  seed: number;
  rngState: number;
  /** Weeks elapsed. A season is SEASON_LENGTH weeks. */
  week: number;
  classIndex: number;
  story: StoryState;
  /** The fund's idle gold (investors' money). */
  cash: number;
  /**
   * The manager's own purse: receives the fees, pays experts, perks, living costs and titles.
   */
  purse: number;
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
  /** This quarter's prophecy for every factor (city, districts, sectors, companies). */
  prophecies: Record<string, Prophecy>;
  /**
   * Slow economic cycle of the city, in % per week. It drifts a little every week and
   * sets the long-term trend of the GDP; weekly moves stay noisy around it.
   */
  cityCycle: number;
  /** GDP and district indices ('city' and region ids), starting at 100. */
  indicators: Record<string, IndicatorState>;
  /** What the experts said this quarter (kept until the quarter ends). */
  insights: Insight[];
  events: ActiveEvent[];
  companyEvents: ActiveCompanyEvent[];
  localNews: ActiveLocalNews[];
  /** Crown bonds locked until maturity (the liquid bond is a normal position). */
  lockedBonds: LockedBond[];
  /** Level bought of each perk (missing = 0). */
  perks: Partial<Record<PerkId, number>>;
  /** This week's chance (0-1) of a surprise shock per company; hidden unless informants are hired. */
  shockRisk: Record<string, number>;
  /** One record per finished week, oldest first. */
  ledger: WeekRecord[];
  /** Lifetime gains and losses per asset, in gold. */
  assetPnl: Record<string, number>;
  /** Snapshot taken when the current season started, for the season review. */
  seasonStart: SeasonSnapshot;
  /** Who is visiting the square this month, if anyone (offers valid until the week ends). */
  visitor: Visitor | null;
  /** Items bought from visitors that are still in effect. */
  effects: ActiveEffect[];
  /** Fund at the start of the current month, after flows: investors judge the month by it. */
  monthStart: number;
  /** Deposits and withdrawals since the last finished week. */
  weekFlows: number;
  /** Broker's fees paid since the last finished week. */
  weekTradeFees: number;
  /** An investor waiting for an answer (valid until the week ends). */
  investorOffer: InvestorOffer | null;
  /** Accepted deposits that can still be traced and confiscated. */
  riskyDeposits: RiskyDeposit[];
  /** Excess return over the Crown bond of the last months (%, newest last, up to 3). */
  monthlyExcess: number[];
  /** The first expert you trained: their training costs less. */
  confidant: ExpertId | null;
  /** Managers hired; their money is a position with id `mgr.<id>`. */
  managers: ManagerId[];
  /** Titles on offer after a season review (0 = none); one per ceiling the fund passed. */
  ascensionOffer: number;
  status: GameStatus;
  log: LogEntry[];
}
