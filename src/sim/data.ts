import type {
  CompanyDef,
  CompanyNewsTemplate,
  EventDef,
  ExpertDef,
  GuildDef,
  LocalNewsTemplate,
  PerkDef,
  RegionDef,
  RegionId,
  Sector,
  SocialClass,
} from './types';

export const SEASON_LENGTH = 4;
/** The investors' money the fund starts with. */
export const STARTING_GOLD = 100;
/** The manager's own money at the start. */
export const STARTING_PURSE = 10;
export const MAX_ACTIVE_EVENTS = 2;
export const EVENT_CHANCE = 0.3;
/** Astrologer accuracy by Telescope level. */
export const ASTROLOGER_ACCURACY = [0.6, 0.68, 0.75];
export const DRUNK_ACCURACY = 0.5;
/** Spy quality by Veteran Spy level: noise on his estimate and chance it is a planted lie. */
export const SPY_NOISE = [1.2, 0.6, 0.3, 0.1];
export const SPY_FAKE_CHANCE = [0.25, 0.12, 0.05, 0.01];
export const SPY_CONFIDENCE = ['baixa', 'média', 'média', 'alta'] as const;

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
    id: 'telescope',
    name: 'Telescópio da Astróloga',
    icon: 'crystal',
    description: 'Lentes melhores, profecias melhores.',
    levels: [
      { cost: 3, minClass: 0, effect: 'A Astróloga acerta 68% (antes 60%).' },
      { cost: 8, minClass: 1, effect: 'A Astróloga acerta 75%.' },
    ],
  },
  {
    id: 'veteranSpy',
    name: 'Espião Veterano',
    icon: 'hood',
    description: 'Um espião com mais anos de ofício erra menos e cai menos em furos plantados.',
    levels: [
      { cost: 6, minClass: 1, effect: 'Erro pela metade; furos plantados caem de 25% para 12%.' },
      { cost: 15, minClass: 2, effect: 'Erro bem menor; furos plantados 5%.' },
      { cost: 35, minClass: 4, effect: 'Quase sempre certeiro; furos plantados 1%.' },
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
    description: 'Grátis. Metade do que diz é mentira.',
    baseCost: 0,
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
