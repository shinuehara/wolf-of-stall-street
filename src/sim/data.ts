import type {
  CompanyDef,
  CompanyNewsTemplate,
  EventDef,
  ExpertDef,
  GuildDef,
  InvestorDef,
  InvestorKind,
  ManagerDef,
  ManagerId,
  ItemDef,
  LocalNewsTemplate,
  PerkDef,
  RegionDef,
  RegionId,
  Sector,
  SocialClass,
} from './types';

/** A quarter: the social class is reviewed every SEASON_LENGTH weeks. */
export const SEASON_LENGTH = 12;
/** A month: a visitor comes to the square every MONTH_LENGTH weeks. */
export const MONTH_LENGTH = 4;
/** The investors' money the fund starts with. */
export const STARTING_GOLD = 100;
/** The manager's own money at the start. */
export const STARTING_PURSE = 10;
export const MAX_ACTIVE_EVENTS = 2;
export const EVENT_CHANCE = 0.3;
/** Astrologer accuracy by Telescope level. */
export const ASTROLOGER_ACCURACY = [0.6, 0.62, 0.66, 0.66, 0.7];
/** How many stars (independent readings) the Astrologer consults, by rank. */
export const ASTRO_VOTES = [1, 3, 3, 5, 5];
/** The stars she reads, in order. */
export const ASTROS = [
  { symbol: '☉', name: 'Sol' },
  { symbol: '☾', name: 'Lua' },
  { symbol: '♂', name: 'Marte' },
  { symbol: '♀', name: 'Vênus' },
  { symbol: '♃', name: 'Júpiter' },
];
/** Ranks that unlock deeper reports. */
export const SPY_BREAKDOWN_LEVEL = 2;
export const SPY_GUILD_REPORT_LEVEL = 3;
export const ASTRO_GUILD_REPORT_LEVEL = 4;
/** The first expert you train becomes your confidant: their training costs this share. */
export const CONFIDANT_DISCOUNT = 0.5;
/** Drunk accuracy by Bath & Soup level. */
/** Spy quality by Veteran Spy level: noise on his estimate and chance it is a planted lie. */
export const SPY_NOISE = [0.8, 0.5, 0.3, 0.2, 0.1];
export const SPY_FAKE_CHANCE = [0.15, 0.08, 0.04, 0.02, 0.01];
/** Each expert's rank names, from rookie to master; the rank is the level of their perk. */
export const EXPERT_RANKS = {
  drunk: [
    'Bêbado da Taverna',
    'Bêbado de Meio-Dia',
    'Bêbado Remediado',
    'Quase Sóbrio',
    'Ex-Bêbado',
  ],
  astrologer: [
    'Astróloga Aprendiz',
    'Astróloga Formada',
    'Astróloga da Corte',
    'Grã-Astróloga',
    'Oráculo de Valdouro',
  ],
  spy: [
    'Espião Aprendiz',
    'Espião Júnior',
    'Espião Analista',
    'Espião Experiente',
    'Mestre Espião',
  ],
} as const;

/** The perk that ranks up each expert. */
export const EXPERT_PERK = {
  drunk: 'drunkCare',
  astrologer: 'telescope',
  spy: 'veteranSpy',
} as const;

/** Surprise shocks outside the announced range. */
export const SHOCK_BASE_CHANCE = 0.02;
export const SHOCK_HIGH_CHANCE = 0.12;
/** Share of companies with a high shock risk in a given week. */
export const SHOCK_HIGH_SHARE = 0.12;
/** Most shocks are bad; some are windfalls. */
export const SHOCK_GOOD_SHARE = 0.25;
export const SHOCK_BAD_RANGE: [number, number] = [-28, -14];
export const SHOCK_GOOD_RANGE: [number, number] = [12, 22];

export const SHOCK_BAD_NEWS: readonly string[] = [
  'Incêndio destrói o armazém {do} {c}!',
  'Escândalo: o dono {do} {c} fugiu com o cofre!',
  'Febre derruba metade dos trabalhadores {do} {c}.',
  'Ladrões esvaziaram o depósito {do} {c} durante a noite.',
  'O Rei confiscou os bens {do} {c} por dívida antiga.',
];
export const SHOCK_GOOD_NEWS: readonly string[] = [
  '{c} achou um baú de moedas antigas no porão!',
  'O Rei comprou todo o estoque {do} {c} de uma vez.',
  'Um nobre excêntrico deixou herança para {o} {c}.',
];

export const PERKS: readonly PerkDef[] = [
  {
    id: 'drunkCare',
    name: 'Banho e Sopa para o Bêbado',
    icon: 'mug',
    description: 'Um prato quente e um balde de água fria fazem milagres.',
    levels: [
      {
        cost: 1,
        minClass: 0,
        effect: 'Lembra de que guilda é a fofoca (ícone) e fala o bairro; enrola menos (40%).',
      },
      { cost: 3, minClass: 1, effect: 'Aponta o bairro no mapa (ícone do bairro); enrola 30%.' },
      {
        cost: 6,
        minClass: 2,
        effect: 'Quase sóbrio: diz se a coisa é boa ou ruim (seta); enrola 20%.',
      },
      { cost: 12, minClass: 3, effect: 'Ex-Bêbado: diz o nome da empresa; enrola só 10%.' },
    ],
  },
  {
    id: 'telescope',
    name: 'Telescópio da Astróloga',
    icon: 'crystal',
    description: 'Lentes melhores, mais astros no céu dela.',
    levels: [
      { cost: 3, minClass: 0, effect: 'Astróloga Formada: consulta 3 astros (62% cada).' },
      { cost: 8, minClass: 1, effect: 'Astróloga da Corte: cada astro acerta 66%.' },
      { cost: 15, minClass: 2, effect: 'Grã-Astróloga: consulta 5 astros.' },
      {
        cost: 25,
        minClass: 3,
        effect: 'Oráculo de Valdouro: astros a 70% e mapa da guilda (a cesta traz as 3 empresas).',
      },
    ],
  },
  {
    id: 'veteranSpy',
    name: 'Espião Veterano',
    icon: 'hood',
    description: 'Mais anos de ofício: erra menos, cai menos em furos e analisa mais fundo.',
    levels: [
      { cost: 6, minClass: 1, effect: 'Espião Júnior: erro menor; furos plantados 15% → 8%.' },
      {
        cost: 15,
        minClass: 2,
        effect: 'Espião Analista: análise completa (economia, setor, bairro e a empresa em si).',
      },
      {
        cost: 25,
        minClass: 3,
        effect: 'Espião Experiente: relatório da guilda (a cesta traz as 3 empresas); furos 2%.',
      },
      { cost: 40, minClass: 4, effect: 'Mestre Espião: quase não erra; furos 1%.' },
    ],
  },
  {
    id: 'broker',
    name: 'Corretor de Ordens',
    icon: 'scroll',
    description: 'Um corretor da guilda que vigia seus papéis enquanto você dorme.',
    levels: [
      {
        cost: 6,
        minClass: 1,
        effect:
          'Stop loss e stop gain: vende sozinho se a posição cair ou subir até o nível que você marcar.',
      },
    ],
  },
  {
    id: 'informants',
    name: 'Rede de Informantes',
    icon: 'scroll',
    description: 'Moleques de recado que ouvem tudo pelas esquinas.',
    levels: [
      {
        cost: 15,
        minClass: 2,
        effect:
          'Avisa quais empresas estão com risco alto de choque (incêndio, escândalo…) nesta semana.',
      },
    ],
  },
  {
    id: 'insurers',
    name: 'Contrato com os Seguradores',
    icon: 'shield',
    description: 'Cliente antigo paga menos.',
    levels: [{ cost: 8, minClass: 1, effect: 'Seguro 40% mais barato.' }],
  },
  {
    id: 'chronicler',
    name: 'Cronista',
    icon: 'scroll',
    description: 'Um velho que sabe a história de cada empresa da cidade.',
    levels: [
      {
        cost: 10,
        minClass: 2,
        effect:
          'Mostra quanto cada empresa sente a cidade, o setor e o bairro (os pesos da previsão).',
      },
    ],
  },
  {
    id: 'scribe',
    name: 'Livro-caixa do Escriba',
    icon: 'scroll',
    description: 'Registros antigos de preços.',
    levels: [{ cost: 4, minClass: 0, effect: 'Gráficos com 40 semanas de histórico (antes 8).' }],
  },
  {
    id: 'treasurer',
    name: 'Amigo do Tesoureiro',
    icon: 'crown',
    description: 'Um conhecido no tesouro da Coroa consegue taxas melhores.',
    levels: [{ cost: 20, minClass: 3, effect: 'Títulos da Coroa rendem 50% a mais.' }],
  },
];

export function getPerk(id: string): PerkDef {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk) throw new Error(`Unknown perk: ${id}`);
  return perk;
}

/** Goods sold by the monthly visitors. */
export const ITEMS: readonly ItemDef[] = [
  {
    id: 'brassLenses',
    name: 'Lunetas de Bronze',
    icon: 'crystal',
    seller: 'merchant',
    cost: 2,
    weeks: 4,
    effect: 'Por 4 semanas, a Astróloga acerta 10 pontos a mais.',
  },
  {
    id: 'routeMap',
    name: 'Mapa dos Atalhos',
    icon: 'scroll',
    seller: 'merchant',
    cost: 3,
    weeks: 4,
    effect: 'Por 4 semanas, você vê (⚠) as empresas com risco alto de choque.',
  },
  {
    id: 'guildSeal',
    name: 'Selo dos Seguradores',
    icon: 'shield',
    seller: 'merchant',
    cost: 3,
    weeks: 4,
    effect: 'Por 4 semanas, o seguro do fundo sai de graça.',
  },
  {
    id: 'sharpQuill',
    name: 'Pena Afiada',
    icon: 'scroll',
    seller: 'merchant',
    cost: 1.5,
    weeks: 4,
    effect: 'Por 4 semanas, perguntas aos especialistas custam metade.',
  },
  {
    id: 'luckyCharm',
    name: 'Amuleto da Sorte',
    icon: 'coin',
    seller: 'merchant',
    cost: 3,
    weeks: 4,
    effect: 'Por 4 semanas, choques ruins nas suas posições doem pela metade.',
  },
  {
    id: 'stolenLedger',
    name: 'Livro-Caixa Roubado',
    icon: 'hood',
    seller: 'smuggler',
    cost: 6,
    weeks: 4,
    effect: 'Por 4 semanas, o Espião acerta tudo: nem erro, nem furo.',
    catchChance: 0.3,
    penalty: 'Multa: metade do seu bolso.',
  },
  {
    id: 'courtWhisper',
    name: 'Sussurro da Corte',
    icon: 'crown',
    seller: 'smuggler',
    cost: 5,
    weeks: 0,
    until: 'quarter',
    effect: 'Até o fim do trimestre, sua taxa de performance dobra.',
    catchChance: 0.35,
    penalty: 'Investidores furiosos: o fundo perde 8%.',
  },
  {
    id: 'crookedScales',
    name: 'Balança Viciada',
    icon: 'coin',
    seller: 'smuggler',
    cost: 4,
    weeks: 1,
    effect: 'Agora: o fundo ganha 3% "a mais" nas contas.',
    catchChance: 0.4,
    penalty: 'Multa: 6% do fundo e metade do seu bolso.',
  },
];

export function getItem(id: string): ItemDef {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export const VISITOR_OFFERS = { merchant: 3, smuggler: 2 } as const;
export const SMUGGLER_CHANCE = 0.45;
export const LENS_BONUS = 0.1;
export const SCALES_GAIN = 0.03;

export const INSURERS_DISCOUNT = 0.4;
export const TREASURER_BONUS = 0.5;
export const CHART_WEEKS_BASE = 8;
export const CHART_WEEKS_SCRIBE = 40;
export const MAX_COMPANY_EVENTS = 3;
export const COMPANY_EVENT_CHANCE = 0.4;
/** Crown bonds: the locked one pays this many times the class rate, for LOCK_WEEKS weeks. */
export const BOND_LOCK_WEEKS = 4;
export const BOND_LOCK_MULTIPLIER = 2;
export const MAX_LOCAL_NEWS = 2;
export const LOCAL_NEWS_CHANCE = 0.3;

export const CITY_NAME = 'Valdouro';

export const CITY = {
  name: CITY_NAME,
  description:
    'Cidade mercante às margens do rio Douro-Velho, cercada por muralhas e cobiçada por três reinos. ' +
    'Quando o PIB de Valdouro sobe, quase todo mundo ganha; quando cai, até o Conde aperta o cinto.',
  /** Average weekly GDP growth in %, before the cycle and the news. */
  drift: 0.15,
  width: 4,
};

/** How far the economic cycle can wander (in % per week) and how fast it moves. */
export const CYCLE_LIMIT = 1.2;
export const CYCLE_PERSISTENCE = 0.92;
export const CYCLE_SHOCK = 0.35;

export const REGIONS: readonly RegionDef[] = [
  {
    id: 'crown',
    name: 'Alto da Coroa',
    standing: 'nobre',
    description:
      'A colina dos palácios, perto do castelo. Moram ali nobres, bispos e banqueiros. ' +
      'Gastam muito, mas só com o que é fino, e sentem pouco as crises da cidade.',
    cityBeta: 0.7,
    drift: 0.05,
    width: 4,
  },
  {
    id: 'burgo',
    name: 'Burgo Velho',
    standing: 'médio',
    description:
      'O coração antigo da cidade: ruas de oficinas, mestres de guilda e lojistas. ' +
      'Acompanha de perto a economia de Valdouro.',
    cityBeta: 1.0,
    drift: 0.05,
    width: 5,
  },
  {
    id: 'ribeira',
    name: 'Ribeira',
    standing: 'humilde',
    description:
      'O bairro do porto e das enchentes, de estivadores, pescadores e lavadeiras. ' +
      'Quando sobra um trocado, ele vira pão e pano na hora; quando falta, é o primeiro a sentir.',
    cityBeta: 1.3,
    drift: 0.05,
    width: 7,
  },
];

/**
 * How much each sector depends on the local demand of the district where a company sits.
 * Bread and stalls live off the neighbours; ships and mines sell far away.
 */
export const LOCAL_DEMAND: Record<Sector, number> = {
  food: 1.1,
  retail: 1.2,
  health: 0.8,
  banking: 0.7,
  commodities: 0.3,
  industry: 0.5,
  shipping: 0.3,
  spices: 0.5,
};

export const GUILD_DESCRIPTIONS: Record<string, string> = {
  bakers:
    'Pão é a primeira coisa que se compra e a última que se corta. Depende muito da freguesia do bairro.',
  mines:
    'Ferro e prata que saem da serra para os três reinos. Pouco importa o bairro; importam a guerra e os dragões.',
  apothecaries:
    'Unguentos, ervas e sangrias. A peste é tragédia para a cidade e festa para os boticários.',
  changers: 'Câmbio, penhores e empréstimos. Vivem da confiança, e a confiança some num boato.',
  fair: 'Barracas, armazéns e tecidos. O termômetro do bolso de cada bairro.',
  forge: 'Armas, ferraduras e arados. A guerra enche as forjas; a paz enche os campos de arados.',
  fleet: 'Barcas e naus que levam e trazem o mundo. O mar dá e o mar toma.',
  spices:
    'Pimenta, açafrão e canela valem mais que ouro. Fortunas se fazem e se perdem numa caravana.',
};

/** News about the whole city. They move the GDP factor. */
export const CITY_NEWS: readonly LocalNewsTemplate[] = [
  { text: 'A Coroa anunciou obras na muralha: trabalho para meio Valdouro.', shift: 3 },
  { text: 'O Rei casa a filha em Valdouro: um mês de festas e banquetes.', shift: 3 },
  { text: 'Novo tratado abre as rotas do sul aos mercadores de Valdouro.', shift: 2 },
  { text: 'O Conselho criou um imposto sobre portas e janelas.', shift: -3 },
  { text: 'Inverno mais longo em memória: a cidade se tranca em casa.', shift: -2 },
  { text: 'Boatos de cerco: famílias guardam moedas debaixo do colchão.', shift: -3 },
];

/** News about one district. They move that district's local demand. */
export const REGION_NEWS: Record<RegionId, readonly LocalNewsTemplate[]> = {
  crown: [
    { text: 'Nobres voltam da corte para passar o verão no Alto da Coroa.', shift: 4 },
    { text: 'Baile de máscaras no Alto da Coroa: todos querem o mais fino.', shift: 3 },
    { text: 'O Duque taxou o luxo: o Alto da Coroa guarda a bolsa.', shift: -4 },
    { text: 'Escândalo na corte: metade do Alto da Coroa viajou às pressas.', shift: -3 },
  ],
  burgo: [
    { text: 'Nova ponte liga o Burgo Velho ao porto: mais gente nas ruas.', shift: 3 },
    { text: 'As guildas do Burgo Velho aumentaram o salário dos aprendizes.', shift: 3 },
    { text: 'Incêndio destrói uma rua inteira do Burgo Velho.', shift: -4 },
    { text: 'Obras fecham a praça do Burgo Velho por semanas.', shift: -2 },
  ],
  ribeira: [
    { text: 'A Coroa dará um saco de moedas às famílias da Ribeira.', shift: 5 },
    { text: 'Pesca farta: os barcos voltam cheios à Ribeira.', shift: 3 },
    { text: 'Enchente alaga a Ribeira até os joelhos.', shift: -5 },
    { text: 'Estivadores da Ribeira sem trabalho: o porto parou.', shift: -4 },
  ],
};

/**
 * The social ladder, measured by the size of the fund you manage. Titles are paid from the
 * manager's own purse, and the fees the manager earns grow with the title.
 */
export const CLASSES: readonly SocialClass[] = [
  {
    id: 'serf',
    name: 'Servo',
    floor: 60,
    ceiling: 125,
    ascensionFee: 3,
    livingCost: 0.12,
    bondRate: 0.002,
    hedgeFeeRate: 0.01,
    managementFeeRate: 0.0015,
    performanceFeeRate: 0.2,
  },
  {
    id: 'peasant',
    name: 'Camponês',
    floor: 112,
    ceiling: 155,
    ascensionFee: 4,
    livingCost: 0.18,
    bondRate: 0.0025,
    hedgeFeeRate: 0.009,
    managementFeeRate: 0.0017,
    performanceFeeRate: 0.21,
  },
  {
    id: 'artisan',
    name: 'Artesão',
    floor: 140,
    ceiling: 195,
    ascensionFee: 6,
    livingCost: 0.25,
    bondRate: 0.003,
    hedgeFeeRate: 0.008,
    managementFeeRate: 0.0019,
    performanceFeeRate: 0.22,
  },
  {
    id: 'merchant',
    name: 'Mercador',
    floor: 175,
    ceiling: 245,
    ascensionFee: 8,
    livingCost: 0.35,
    bondRate: 0.0035,
    hedgeFeeRate: 0.007,
    managementFeeRate: 0.0021,
    performanceFeeRate: 0.23,
  },
  {
    id: 'burgher',
    name: 'Burguês',
    floor: 220,
    ceiling: 305,
    ascensionFee: 10,
    livingCost: 0.45,
    bondRate: 0.004,
    hedgeFeeRate: 0.006,
    managementFeeRate: 0.0023,
    performanceFeeRate: 0.24,
  },
  {
    id: 'knight',
    name: 'Cavaleiro',
    floor: 275,
    ceiling: 380,
    ascensionFee: 13,
    livingCost: 0.6,
    bondRate: 0.0045,
    hedgeFeeRate: 0.005,
    managementFeeRate: 0.0025,
    performanceFeeRate: 0.25,
  },
  {
    id: 'baron',
    name: 'Barão',
    floor: 345,
    ceiling: 475,
    ascensionFee: 17,
    livingCost: 0.8,
    bondRate: 0.005,
    hedgeFeeRate: 0.004,
    managementFeeRate: 0.0028,
    performanceFeeRate: 0.27,
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
    managementFeeRate: 0.003,
    performanceFeeRate: 0.3,
  },
];

export const TOP_CLASS = CLASSES.length - 1;

export const GUILDS: readonly GuildDef[] = [
  {
    id: 'bakers',
    name: 'Guilda dos Padeiros',
    short: 'Padeiros',
    sector: 'food',
    drift: 0.3,
    width: 8,
    minClass: 0,
    startPrice: 10,
  },
  {
    id: 'mines',
    name: 'Guilda dos Mineiros',
    short: 'Minas',
    sector: 'commodities',
    drift: 0.2,
    width: 13,
    minClass: 0,
    minChapter: 2,
    startPrice: 14,
  },
  {
    id: 'apothecaries',
    name: 'Guilda dos Boticários',
    short: 'Boticários',
    sector: 'health',
    drift: 0.4,
    width: 10,
    minClass: 0,
    minChapter: 2,
    startPrice: 12,
  },
  {
    id: 'changers',
    name: 'Guilda dos Cambistas',
    short: 'Cambistas',
    sector: 'banking',
    drift: 0.3,
    width: 9,
    minClass: 1,
    startPrice: 20,
  },
  {
    id: 'fair',
    name: 'Guilda dos Mercadores',
    short: 'Feira',
    sector: 'retail',
    drift: 0.3,
    width: 12,
    minClass: 1,
    startPrice: 16,
  },
  {
    id: 'forge',
    name: 'Guilda dos Ferreiros',
    short: 'Ferreiros',
    sector: 'industry',
    drift: 0.5,
    width: 15,
    minClass: 2,
    startPrice: 25,
  },
  {
    id: 'fleet',
    name: 'Guilda dos Navegantes',
    short: 'Navegação',
    sector: 'shipping',
    drift: 0.8,
    width: 22,
    minClass: 3,
    startPrice: 40,
  },
  {
    id: 'spices',
    name: 'Guilda das Especiarias',
    short: 'Especiarias',
    sector: 'spices',
    drift: 1.2,
    width: 30,
    minClass: 4,
    startPrice: 60,
  },
];

/** Three companies per guild: a steady one, one that follows the sector and a risky one. */
export const COMPANIES: readonly CompanyDef[] = [
  {
    id: 'bakers.royal',
    guildId: 'bakers',
    regionId: 'crown',
    name: 'Padaria Real',
    gender: 'f',
    beta: 0.7,
    drift: 0.1,
    width: 3,
    startPrice: 12,
    trait: 'Estável: fornece ao castelo, oscila pouco.',
  },
  {
    id: 'bakers.north',
    guildId: 'bakers',
    regionId: 'burgo',
    name: 'Forno do Norte',
    gender: 'm',
    beta: 1.0,
    drift: 0.1,
    width: 5,
    startPrice: 9,
    trait: 'Acompanha o setor de perto.',
  },
  {
    id: 'bakers.harbor',
    guildId: 'bakers',
    regionId: 'ribeira',
    name: 'Padaria do Porto',
    gender: 'f',
    beta: 1.3,
    drift: 0.2,
    width: 8,
    startPrice: 7,
    trait: 'Arriscada: exagera os humores do setor.',
  },

  {
    id: 'mines.serra',
    guildId: 'mines',
    regionId: 'crown',
    name: 'Companhia da Serra',
    gender: 'f',
    beta: 0.8,
    drift: 0.1,
    width: 5,
    startPrice: 16,
    trait: 'Estável: contratos longos com a Coroa.',
  },
  {
    id: 'mines.silver',
    guildId: 'mines',
    regionId: 'burgo',
    name: 'Veio de Prata',
    gender: 'm',
    beta: 1.0,
    drift: 0.1,
    width: 7,
    startPrice: 13,
    trait: 'Acompanha o setor de perto.',
  },
  {
    id: 'mines.deep',
    guildId: 'mines',
    regionId: 'ribeira',
    name: 'Mina Funda',
    gender: 'f',
    beta: 1.4,
    drift: 0.2,
    width: 10,
    startPrice: 8,
    trait: 'Arriscada: cava fundo, cai fundo.',
  },

  {
    id: 'apothecaries.abbey',
    guildId: 'apothecaries',
    regionId: 'crown',
    name: 'Botica do Mosteiro',
    gender: 'f',
    beta: 0.7,
    drift: 0.1,
    width: 4,
    startPrice: 14,
    trait: 'Estável: monges não fazem loucuras.',
  },
  {
    id: 'apothecaries.central',
    guildId: 'apothecaries',
    regionId: 'burgo',
    name: 'Botica Central',
    gender: 'f',
    beta: 1.0,
    drift: 0.1,
    width: 6,
    startPrice: 11,
    trait: 'Acompanha o setor de perto.',
  },
  {
    id: 'apothecaries.phoenix',
    guildId: 'apothecaries',
    regionId: 'ribeira',
    name: 'Elixir da Fênix',
    gender: 'm',
    beta: 1.2,
    drift: 0.3,
    width: 10,
    startPrice: 6,
    trait: 'Arriscada: promete milagres.',
  },

  {
    id: 'changers.bridge',
    guildId: 'changers',
    regionId: 'burgo',
    name: 'Banco da Ponte',
    gender: 'm',
    beta: 0.8,
    drift: 0.1,
    width: 4,
    startPrice: 24,
    trait: 'Estável: cofres de pedra, juros de pedra.',
  },
  {
    id: 'changers.fortune',
    guildId: 'changers',
    regionId: 'crown',
    name: 'Casa Fortuna',
    gender: 'f',
    beta: 1.1,
    drift: 0.1,
    width: 7,
    startPrice: 18,
    trait: 'Acompanha o setor de perto.',
  },
  {
    id: 'changers.oldgold',
    guildId: 'changers',
    regionId: 'ribeira',
    name: 'Câmbio do Ouro Velho',
    gender: 'm',
    beta: 1.4,
    drift: 0.2,
    width: 9,
    startPrice: 12,
    trait: 'Arriscado: empresta para quem ninguém empresta.',
  },

  {
    id: 'fair.store',
    guildId: 'fair',
    regionId: 'ribeira',
    name: 'Armazém Bom Preço',
    gender: 'm',
    beta: 0.8,
    drift: 0.1,
    width: 5,
    startPrice: 15,
    trait: 'Estável: vende o básico para todos.',
  },
  {
    id: 'fair.silk',
    guildId: 'fair',
    regionId: 'crown',
    name: 'Sedaria Oriental',
    gender: 'f',
    beta: 1.1,
    drift: 0.2,
    width: 8,
    startPrice: 20,
    trait: 'Acompanha o setor, com um toque de luxo.',
  },
  {
    id: 'fair.peddler',
    guildId: 'fair',
    regionId: 'burgo',
    name: 'Tenda do Mascate',
    gender: 'f',
    beta: 1.3,
    drift: 0.2,
    width: 9,
    startPrice: 6,
    trait: 'Arriscada: vende de tudo, inclusive o que não tem.',
  },

  {
    id: 'forge.royal',
    guildId: 'forge',
    regionId: 'crown',
    name: 'Forja Real',
    gender: 'f',
    beta: 0.8,
    drift: 0.1,
    width: 5,
    startPrice: 30,
    trait: 'Estável: arma a guarda do Rei.',
  },
  {
    id: 'forge.bronze',
    guildId: 'forge',
    regionId: 'burgo',
    name: 'Martelo de Bronze',
    gender: 'm',
    beta: 1.1,
    drift: 0.2,
    width: 8,
    startPrice: 22,
    trait: 'Acompanha o setor de perto.',
  },
  {
    id: 'forge.valley',
    guildId: 'forge',
    regionId: 'ribeira',
    name: 'Ferraria do Vale',
    gender: 'f',
    beta: 1.3,
    drift: 0.2,
    width: 10,
    startPrice: 14,
    trait: 'Arriscada: aposta tudo em encomendas grandes.',
  },

  {
    id: 'fleet.river',
    guildId: 'fleet',
    regionId: 'ribeira',
    name: 'Barca do Rio',
    gender: 'f',
    beta: 0.7,
    drift: 0.2,
    width: 8,
    startPrice: 30,
    trait: 'Estável: só navega em água doce.',
  },
  {
    id: 'fleet.levant',
    guildId: 'fleet',
    regionId: 'burgo',
    name: 'Nau do Levante',
    gender: 'f',
    beta: 1.1,
    drift: 0.3,
    width: 14,
    startPrice: 45,
    trait: 'Acompanha o setor de perto.',
  },
  {
    id: 'fleet.galleon',
    guildId: 'fleet',
    regionId: 'crown',
    name: 'Galeão Dourado',
    gender: 'm',
    beta: 1.4,
    drift: 0.4,
    width: 18,
    startPrice: 38,
    trait: 'Arriscado: rotas longas, tesouros longos.',
  },

  {
    id: 'spices.pepper',
    guildId: 'spices',
    regionId: 'burgo',
    name: 'Pimenta & Cia',
    gender: 'f',
    beta: 1.0,
    drift: 0.3,
    width: 14,
    startPrice: 55,
    trait: 'A mais estável de um mercado instável.',
  },
  {
    id: 'spices.saffron',
    guildId: 'spices',
    regionId: 'crown',
    name: 'Rota do Açafrão',
    gender: 'f',
    beta: 1.2,
    drift: 0.4,
    width: 18,
    startPrice: 70,
    trait: 'Acompanha o setor, que já é uma montanha-russa.',
  },
  {
    id: 'spices.cinnamon',
    guildId: 'spices',
    regionId: 'ribeira',
    name: 'Canela do Oriente',
    gender: 'f',
    beta: 1.4,
    drift: 0.5,
    width: 22,
    startPrice: 48,
    trait: 'Arriscadíssima: fortuna ou ruína.',
  },
];

/**
 * Headlines about a single company. Tokens: {c} name, {do} "do"/"da", {o} "o"/"a",
 * {no} "no"/"na", {ao} "ao"/"à".
 */
export const COMPANY_NEWS: Record<Sector, readonly CompanyNewsTemplate[]> = {
  food: [
    { text: 'Nobres se mudaram para perto {do} {c}. Fila na porta!', shift: 4 },
    { text: '{c} ganhou o contrato do pão do castelo.', shift: 5 },
    { text: 'Ratos nos sacos de farinha {do} {c}.', shift: -5 },
    { text: 'O forno {do} {c} desabou.', shift: -4 },
  ],
  commodities: [
    { text: '{c} achou um veio de ferro puríssimo.', shift: 5 },
    { text: 'Novo túnel dobra a produção {do} {c}.', shift: 4 },
    { text: 'Desabamento numa galeria {do} {c}.', shift: -6 },
    { text: 'Mineiros {do} {c} cruzaram os braços.', shift: -4 },
  ],
  health: [
    { text: 'Unguento {do} {c} curou a gota do Duque.', shift: 5 },
    { text: 'O bispo abençoou {o} {c}.', shift: 3 },
    { text: 'Paciente {do} {c} ficou verde. Literalmente.', shift: -5 },
    { text: 'A Inquisição bateu à porta {do} {c}.', shift: -6 },
  ],
  banking: [
    { text: '{c} virou o banco oficial do Duque.', shift: 5 },
    { text: 'Mercadores estrangeiros confiam seus cofres {ao} {c}.', shift: 4 },
    { text: 'O cofre {do} {c} amanheceu vazio.', shift: -7 },
    { text: 'Boato de calote {no} {c}. Fila para sacar!', shift: -5 },
  ],
  retail: [
    { text: '{c} trouxe tecidos que ninguém nunca viu.', shift: 4 },
    { text: 'Um bardo famoso fez uma canção sobre {o} {c}.', shift: 3 },
    { text: 'Fiscais do Rei multaram {o} {c} por peso falso.', shift: -5 },
    { text: 'Incêndio {no} {c}!', shift: -5 },
  ],
  industry: [
    { text: '{c} vai forjar as armaduras da guarda.', shift: 5 },
    { text: 'Um fole novo acelera o trabalho {no} {c}.', shift: 3 },
    { text: 'Espada {do} {c} quebrou no torneio. Vexame!', shift: -5 },
    { text: 'O mestre {do} {c} foi contratado pela rival.', shift: -4 },
  ],
  shipping: [
    { text: '{c} voltou com o porão cheio.', shift: 6 },
    { text: '{c} descobriu uma rota mais curta.', shift: 5 },
    { text: 'Piratas atacaram {o} {c}.', shift: -7 },
    { text: '{c} encalhou num banco de areia.', shift: -5 },
  ],
  spices: [
    { text: 'A caravana {do} {c} chegou intacta do Oriente.', shift: 7 },
    { text: 'A Rainha só tempera com produtos {do} {c}.', shift: 5 },
    { text: 'O produto {do} {c} era serragem tingida!', shift: -8 },
    { text: 'A caravana {do} {c} sumiu no deserto.', shift: -7 },
  ],
};

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
    description: 'Nunca mente, mas às vezes só fala bobagem.',
    baseCost: 0.05,
    wealthCost: 0,
    minClass: 0,
  },
  {
    id: 'astrologer',
    name: 'Astróloga',
    emoji: '🔮',
    description:
      'Lê nos astros se algo pende para alta ou baixa. Acerta 6 em cada 10 (melhora com o Telescópio).',
    baseCost: 0.01,
    wealthCost: 0.0001,
    minClass: 0,
  },
  {
    id: 'spy',
    name: 'Espião',
    emoji: '🕵️',
    description:
      'Estima a chance de cada faixa. Pode errar e cair em furos (melhora com o Espião Veterano).',
    baseCost: 0.02,
    wealthCost: 0.0002,
    minClass: 0,
  },
];

export function getGuild(id: string): GuildDef {
  const guild = GUILDS.find((g) => g.id === id);
  if (!guild) throw new Error(`Unknown guild: ${id}`);
  return guild;
}

export function getCompany(id: string): CompanyDef {
  const company = COMPANIES.find((c) => c.id === id);
  if (!company) throw new Error(`Unknown company: ${id}`);
  return company;
}

export function companiesOf(guildId: string): CompanyDef[] {
  return COMPANIES.filter((c) => c.guildId === guildId);
}

export function getRegion(id: string): RegionDef {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

export function isRegionId(id: string): id is RegionId {
  return REGIONS.some((r) => r.id === id);
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

// ---------------------------------------------------------------------------
// Investors: monthly deposits and withdrawals, and special offers
// ---------------------------------------------------------------------------

/**
 * Investors judge the average excess return of the last FLOW_MONTHS months over the Crown
 * bond. Deposits follow that average; withdrawals react to it or to a bad month alone, and
 * harder (fear is faster than trust). Shares of the fund per point of excess return.
 */
export const FLOW_MONTHS = 3;
export const FLOW_SENSITIVITY_IN = 0.8;
export const FLOW_SENSITIVITY_OUT = 1;
/** Months within this excess return (in %) over the Crown bond leave investors indifferent. */
export const FLOW_DEAD_ZONE = 2;
/** Largest monthly deposit and withdrawal, as a share of the fund. */
export const FLOW_MAX_IN = 0.12;
export const FLOW_MAX_OUT = 0.15;
/** Withdrawals stop when the fund is this close to the class floor (1.15 = 15% above it). */
export const FLOW_FLOOR_MARGIN = 1.3;
/** Investors tolerate this much of the fund parked (free gold + Crown bonds) over a month. */
export const PARK_LIMIT = 0.6;
/** A month fully parked costs this share of the fund in withdrawals (scaled above the limit). */
export const PARK_OUT = 0.04;
/**
 * Guild broker's fee on every purchase and sale of baskets and companies (not on Crown bonds,
 * not on money handed to managers). Makes churning the whole portfolio every week costly.
 */
export const TRADE_FEE = 0.005;

/** Chance per week (outside visitor weeks) that someone offers to invest in the fund. */
export const OFFER_CHANCE = 0.1;

export const INVESTORS: InvestorDef[] = [
  {
    id: 'militia',
    name: 'O Capitão da Milícia',
    title: '“segurança” particular do Burgo Velho',
    line: 'Gestor, meus rapazes juntaram umas economias… de proteção. Ninguém precisa saber de onde veio, né? Só faz render.',
    share: 0.35,
    dirtyChance: 1,
    catchChance: 0.05,
    riskWeeks: 12,
    purseFine: 0.4,
    risk: 'Dinheiro sujo. Por 12 semanas, 5% de chance por semana de o Meirinho rastrear: confisca o aporte e multa 40% do seu bolso.',
    caught:
      'O Meirinho rastreou o dinheiro da Milícia! O aporte foi confiscado e você pagou multa.',
    safe: 'O dinheiro da Milícia já circulou o bastante: agora parece limpo.',
  },
  {
    id: 'abbot',
    name: 'O Abade de São Bento do Ouro',
    title: 'tesoureiro do mosteiro',
    line: 'Paz e bem, meu filho. O mosteiro deseja multiplicar seus talentos, como manda a parábola. Os livros? Ah, os livros estão… em ordem.',
    share: 0.25,
    dirtyChance: 0.4,
    catchChance: 0.05,
    riskWeeks: 12,
    purseFine: 0,
    risk: 'Pode ser dízimo honesto ou dinheiro desviado da Igreja; ninguém sabe. Se for desvio, por 12 semanas o Bispo pode descobrir e levar o aporte de volta.',
    caught: 'O Bispo descobriu o desvio do Abade! A Igreja tomou de volta o aporte.',
    safe: 'O Bispo auditou o mosteiro: os livros do Abade estão em ordem.',
  },
  {
    id: 'widow',
    name: 'A Viúva do Armador',
    title: 'herdeira de três naus',
    line: 'Meu falecido marido dizia que ouro parado é ouro triste. Ouvi falar bem de você na feira.',
    share: 0.15,
    dirtyChance: 0,
    catchChance: 0,
    riskWeeks: 0,
    purseFine: 0,
    risk: 'Dinheiro limpo, herança registrada no cartório.',
    caught: '',
    safe: '',
  },
];

export function getInvestor(id: InvestorKind): InvestorDef {
  return INVESTORS.find((i) => i.id === id)!;
}

// ---------------------------------------------------------------------------
// Hired managers
// ---------------------------------------------------------------------------

export const MANAGERS: ManagerDef[] = [
  {
    id: 'prudencio',
    name: 'Frei Prudêncio',
    title: 'o Cauteloso',
    style: 'cautious',
    styleText: '70% em Títulos da Coroa, o resto na cesta que achar melhor.',
    line: 'Devagar se vai ao longe, meu filho. E de joelhos, se preciso.',
    minClass: 2,
    hireCost: 5,
    weeklyFee: 0.0005,
    performanceShare: 0.1,
    noise: 0.5,
  },
  {
    id: 'ambrosina',
    name: 'Dona Ambrosina',
    title: 'a Equilibrada',
    style: 'balanced',
    styleText: 'Divide entre as 3 cestas que achar melhores; foge para a Coroa se nada presta.',
    line: 'Nunca ponha todos os ovos na mesma cesta. Eu ponho em três, e conto os ovos.',
    minClass: 3,
    hireCost: 12,
    weeklyFee: 0.0008,
    performanceShare: 0.15,
    noise: 0.4,
  },
  {
    id: 'rodrigo',
    name: 'Rodrigo Rompe-Bolsa',
    title: 'o Ousado',
    style: 'bold',
    styleText: 'Aposta tudo nas 2 empresas que achar mais promissoras. Sem seguro.',
    line: 'Quem não arrisca não petisca! E eu, gestor, petisco muito.',
    minClass: 4,
    hireCost: 20,
    weeklyFee: 0.001,
    performanceShare: 0.2,
    noise: 0.6,
  },
];

export function getManager(id: ManagerId): ManagerDef {
  return MANAGERS.find((m) => m.id === id)!;
}

// ---------------------------------------------------------------------------
// The Drunk's rumours: always true, hard to read
// ---------------------------------------------------------------------------

/** Drinks you can buy him per week; after that he sleeps on the table. */
export const DRUNK_DRINKS_PER_WEEK = 3;

/** Chance a drink buys only rambling, by rank (training makes him ramble less). */
export const DRUNK_RAMBLE_CHANCE = [0.5, 0.4, 0.3, 0.2, 0.1];

/** What he says when he says nothing useful. */
export const DRUNK_RAMBLES = [
  'Minha filha foi cantar na escola hoje. Cantou bonito. *hic*',
  'Lembro que meu pai gostava de pescar. Nunca pegou nada.',
  'Tô sentindo um cheiro ruim nessa cerveja hoje… ou sou eu.',
  'Sabia que o gato do taverneiro tem sete dedos? Contei duas vezes.',
  'Uma vez eu vi um dragão. Ou era uma vaca. Era de noite.',
  'Essa caneca é a mais bonita da taverna. Não conta pras outras.',
  'Choveu ontem? Eu tava molhado, mas pode ter sido a cerveja.',
  'Meu joelho dói quando vai chover. Ou quando não vai.',
];

/**
 * The Drunk hints the direction, not the size: readers assume his company ends this far (%)
 * from the public middle (his rumours average ~11).
 */
export const DRUNK_GAP_GUESS = 8;

/** From this rank the Drunk's arrow lets the game read his rumour for you. */
export const DRUNK_READABLE_LEVEL = 3;

/** The Drunk only gossips about a company whose quarter is this far (%) from the public guess. */
export const DRUNK_MIN_DEVIATION = 3;

/**
 * One rumour per sector and direction. {S} is where the sector icon (and, trained, the arrow)
 * goes; {R} is where the district goes once he is sober enough to say it.
 */
export const DRUNK_RUMORS: Record<Sector, { up: string[]; down: string[] }> = {
  food: {
    down: [
      'O grão de trigo{S} tá vindo meio esquisito esta semana{R}… *hic*',
      'Vi um padeiro{S} chorando em cima da massa{R}. Chorava farinha!',
    ],
    up: [
      'Diz que o trigo{S} desse ano tá dourado que nem dente de rico{R}. *hic*',
      'Fila de gente pra comprar pão{S}{R} dobrando a esquina, eu vi! Ou vi duas vezes.',
    ],
  },
  commodities: {
    down: [
      'Os mineiros{S} tão voltando de mão abanando e tossindo poeira{R}… *hic*',
      'Ouvi um túnel{S} desabando{R}. Ou era meu estômago.',
    ],
    up: [
      'Um mineiro{S} pagou rodada pra taverna inteira{R}! Com prata! *hic*',
      'Diz que acharam um veio{S} brilhando mais que essa vela{R}.',
    ],
  },
  health: {
    down: [
      'Ninguém mais espirra{S}{R}, tá todo mundo com saúde. Que tédio. *hic*',
      'O xarope{S}{R} tá com gosto de sola de bota, disse meu primo.',
    ],
    up: [
      'Tá todo mundo tossindo{S}{R}… cof… eu também. Me passa o xarope.',
      'Fila na porta da botica{S}{R}, gente com cara verde! *hic*',
    ],
  },
  banking: {
    down: [
      'Um cambista{S} saiu correndo com o livro debaixo do braço{R}… estranho, né?',
      'Tão contando moeda e faltando moeda{S}{R}. *hic*',
    ],
    up: [
      'Os cambistas{S}{R} andam de chapéu novo. Chapéu novo é moeda nova.',
      'Diz que o cofre{S}{R} não fecha mais de tão cheio. *hic*',
    ],
  },
  retail: {
    down: [
      'As barracas{S}{R} tão às moscas. Até as moscas foram embora.',
      'Ninguém compra nada{S}{R}, só olha e suspira. Que nem eu na taverna.',
    ],
    up: [
      'A feira{S}{R} tava tão cheia que eu perdi meu sapato! *hic*',
      'O povo tá comprando seda e panela{S}{R} que nem doido.',
    ],
  },
  industry: {
    down: [
      'A forja{S}{R} tá fria que nem o coração da minha sogra… *hic*',
      'Ferreiro{S}{R} dormindo em cima da bigorna, sem encomenda.',
    ],
    up: [
      'Martelo{S} batendo dia e noite{R}, não consigo dormir! *hic*',
      'Diz que o castelo encomendou espada{S}{R} que não acaba mais.',
    ],
  },
  shipping: {
    down: [
      'Vi um barco{S} voltando torto, com a vela rasgada{R}… *hic*',
      'Marinheiro{S}{R} chorando no cais. Marinheiro não chora à toa.',
    ],
    up: [
      'O cais{S}{R} tá cheio de caixote cheiroso! *hic*',
      'Navio{S} chegando de barriga cheia{R}, igual eu depois do jantar.',
    ],
  },
  spices: {
    down: [
      'A pimenta{S}{R} chegou molhada, ninguém quer pimenta molhada… *hic*',
      'Tem pimenta falsa{S} circulando{R}. Serragem pintada!',
    ],
    up: [
      'Os nobres{S}{R} tão botando canela até no vinho! *hic*',
      'Cheiro de açafrão{S} por toda parte{R}. Até eu tô cheiroso.',
    ],
  },
};

/** How the Drunk says where, once he is sober enough. */
export const DRUNK_PLACES: Record<RegionId, string> = {
  crown: ' lá no Alto da Coroa',
  burgo: ' lá no Burgo Velho',
  ribeira: ' lá pra Ribeira',
};

/**
 * What the untrained Drunk mumbles around the rumour. The rookie buries it in three of these
 * before and two after; each rank of training cuts some.
 */
export const DRUNK_FILLER = [
  'Hoje andei muito na praça, tinha uns doidos gritando como sempre.',
  'Um cavalo quase pisou no meu pé, sabia? Cavalo mal-educado.',
  'Minha mulher diz que eu falo demais. Eu falo o necessário.',
  'O padre olhou torto pra mim de novo, deve ser inveja.',
  'Tinha uma nuvem com cara de queijo hoje cedo.',
  'Encontrei o ferreiro, ou o irmão dele, sei lá, são iguais.',
  'Dormi no estábulo ontem, o burro ronca mais que eu.',
  'Lembrei de uma música da minha infância, mas esqueci de novo.',
  'Aí eu cheguei aqui e pedi a minha bebida de sempre.',
  'Aí sentei nesse banco, que é o melhor banco da taverna.',
  'Depois disso eu acho que cochilei um pouco.',
  'E foi isso. Ou foi ontem? Não importa.',
];

/** Stop levels offered in the asset screen, as returns on the position's cost. */
export const STOP_LOSS_LEVELS = [-0.05, -0.1, -0.15];
export const STOP_GAIN_LEVELS = [0.05, 0.1, 0.15];
/** How far a week's high and low reach beyond its open and close, in weekly noise units. */
export const BAR_REACH = 0.6;
