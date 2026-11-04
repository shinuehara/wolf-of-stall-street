/**
 * Hand-made 12x12 pixel sprites. Each character maps to a palette colour; '.' is transparent.
 * Sprites are rasterised once to PNG data URLs and drawn with `image-rendering: pixelated`.
 */
export const PALETTE: Record<string, string> = {
  k: '#1a1033',
  w: '#fff4d6',
  y: '#ffcc33',
  o: '#ff8a3d',
  b: '#a8602f',
  B: '#5a2e1a',
  r: '#ff4f5e',
  R: '#b0243a',
  g: '#4fe08a',
  G: '#1f9e5a',
  u: '#4fb4ff',
  U: '#2c5fd1',
  p: '#b56cff',
  P: '#6a35c9',
  s: '#c3c9e8',
  S: '#6b73a3',
  c: '#ffc59e',
};

export const SPRITES = {
  bread: [
    '............',
    '....kkkk....',
    '..kkoyyokk..',
    '.koyyyyyyok.',
    '.kyoyyoyyyk.',
    'koyyyyyyyyok',
    'kooooooooook',
    'kboooooooobk',
    '.kbbbbbbbbk.',
    '..kkkkkkkk..',
    '............',
    '............',
  ],
  pickaxe: [
    '............',
    '..kkkkkkk...',
    '.kssssssskk.',
    'ksSkkkkkSssk',
    'kSk..kbk.kSk',
    'kk...kbk..kk',
    '.....kbk....',
    '.....kbk....',
    '.....kbk....',
    '.....kbk....',
    '.....kBk....',
    '......k.....',
  ],
  potion: [
    '.....kk.....',
    '....kbbk....',
    '....kkkk....',
    '.....kk.....',
    '....kwwk....',
    '...kgwggk...',
    '..kggggggk..',
    '..kgwggggk..',
    '..kggggGGk..',
    '...kGGGGk...',
    '....kkkk....',
    '............',
  ],
  coin: [
    '....kkkk....',
    '..kkyyyykk..',
    '.kyywwyyyok.',
    '.kywyyyyyok.',
    'kyyyykkyyyok',
    'kyyykyyyyyok',
    'kyyyykyyyyok',
    'kyyyyykyyyok',
    '.kyykkyyyok.',
    '.kyyyyyyook.',
    '..kkoooookk.',
    '....kkkk....',
  ],
  tent: [
    '.....kk.....',
    '.....kr.....',
    '....kkkk....',
    '...krwrwk...',
    '..krwrwrwk..',
    '.krwrwrwrwk.',
    'krwrwrwrwrwk',
    'kkkkkkkkkkkk',
    '.kbk....kbk.',
    '.kbk.kk.kbk.',
    '.kbk.kk.kbk.',
    '.kkk.kk.kkk.',
  ],
  anvil: [
    '............',
    '.....o......',
    '.kkkkkkkkk..',
    'kssssssssSk.',
    '.ksssssssSkk',
    '..kkSSSSkk..',
    '....kSSk....',
    '....kSSk....',
    '...kSSSSk...',
    '..kSSSSSSk..',
    '..kkkkkkkk..',
    '............',
  ],
  ship: [
    '......k.....',
    '.....kwk....',
    '....kwwk....',
    '...kwwwkk...',
    '..kwwwwkrk..',
    '.kwwwwwkrrk.',
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    '.kbbbbbbbbk.',
    '..kkkkkkkk..',
    'uuuuuuuuuuuu',
    '.uUu.uUu.uUu',
  ],
  pepper: [
    '.......kk...',
    '......kGk...',
    '.....kGGk...',
    '....kkkk....',
    '...krrrk....',
    '..krwrrRk...',
    '..krrrrRk...',
    '.krrrrRk....',
    '.krrrRRk....',
    'krrrRRk.....',
    'kRRRkk......',
    '.kkk........',
  ],
  mug: [
    '............',
    '.kkkkkkkk...',
    'kwwwwwwwwk..',
    'kwwwwwwwwkkk',
    'kyyyyyyyyk.k',
    'kyoyyyyoyk.k',
    'kyyyyyyyyk.k',
    'kyyyoyyyykkk',
    'kyyyyyyyyk..',
    'kooooooook..',
    '.kkkkkkkk...',
    '............',
  ],
  crystal: [
    '....kkkk....',
    '..kkuuuukk..',
    '.kuwwuuuuPk.',
    '.kuwuuuuuPk.',
    'kuuuuupuuuPk',
    'kuuuuuuuuuPk',
    '.kuuuuuuPPk.',
    '..kkPPPPkk..',
    '...kbbbbk...',
    '..kbbbbbbk..',
    '.kkkkkkkkkk.',
    '............',
  ],
  hood: [
    '....kkkk....',
    '...kSSSSk...',
    '..kSSSSSSk..',
    '.kSSkkkkSSk.',
    '.kSkkkkkkSk.',
    '.kSkykkykSk.',
    '.kSkkkkkkSk.',
    '.kSSkkkkSSk.',
    'kSSSSSSSSSSk',
    'kSSSSSkSSSSk',
    'kSSSSSkSSSSk',
    'kkkkkkkkkkkk',
  ],
  castle: [
    'kr..........',
    'krr.........',
    'k...........',
    'kk.kk..kk.kk',
    'kkkkkkkkkkkk',
    'ksssssssssSk',
    'kskksssskkSk',
    'ksssssssssSk',
    'kssskkkksssk',
    'ksskbbbbkssk',
    'ksskbbbbkssk',
    'kkkkkkkkkkkk',
  ],
  fountain: [
    '.....uu.....',
    '....u..u....',
    '...u.uu.u...',
    '.....ss.....',
    '..kkkkkkkk..',
    '.kssssssssk.',
    '.kuuuuuuuuk.',
    'kssssssssssk',
    'kSssssssssSk',
    'kSSSSSSSSSSk',
    'kkkkkkkkkkkk',
    '............',
  ],
  hourglass: [
    '.kkkkkkkkkk.',
    '..kwwwwwwk..',
    '..kyyyyyyk..',
    '...kyyyyk...',
    '....kyyk....',
    '.....kk.....',
    '....kwyk....',
    '...kwwywk...',
    '..kwwyyywk..',
    '..kyyyyyyk..',
    '.kkkkkkkkkk.',
    '............',
  ],
  shield: [
    '.kkkkkkkkkk.',
    'kuuuuyyuuuuk',
    'kuuuuyyuuuuk',
    'kuuuuyyuuuuk',
    'kyyyyyyyyyyk',
    'kyyyyyyyyyyk',
    'kuuuuyyuuuuk',
    '.kuuuyyuuuk.',
    '.kuuuyyuuuk.',
    '..kuuyyuuk..',
    '...kkyykk...',
    '.....kk.....',
  ],
  crown: [
    '............',
    '............',
    'k....k....k.',
    'kyk.kyk.kyk.',
    'kyykyyykyyk.',
    'kyyyyryyyyk.',
    'kyyyrrryyyk.',
    'kyyyyryyyyk.',
    'kooooooooook',
    '.kkkkkkkkkk.',
    '............',
    '............',
  ],
  influencer: [
    '.......rr...',
    '......rr....',
    '..PPPPPPPP..',
    '.PPPPPPPPPP.',
    '...cccccc...',
    '...ckcckc...',
    '...cccccc...',
    '...cwwwwc...',
    '....cccc....',
    '..pppyypp...',
    '.ppppyyppp..',
    '.ppppyyppp..',
  ],
  scroll: [
    '............',
    '.kkkkkkkkk..',
    'kbwwwwwwwwk.',
    'kbkwwwwwwwk.',
    '.kwkkkkkwwk.',
    '.kwwwwwwwwk.',
    '.kwkkkkwwwk.',
    '.kwwwwwwwwk.',
    '.kwkkkkkkwk.',
    '.kwwwwwwwwbk',
    '..kkkkkkkkbk',
    '...........k',
  ],
} as const;

/** Swaps palette characters. */
function recolor(rows: readonly string[], map: Record<string, string>): string[] {
  return rows.map((r) => [...r].map((c) => map[c] ?? c).join(''));
}

/** Sets single pixels: [row, column, character]. */
function patch(rows: readonly string[], edits: [number, number, string][]): string[] {
  const grid = rows.map((r) => [...r]);
  for (const [y, x, ch] of edits) {
    const row = grid[y];
    if (row && x < row.length) row[x] = ch;
  }
  return grid.map((r) => r.join(''));
}

function replaceRow(rows: readonly string[], y: number, row: string): string[] {
  return rows.map((r, i) => (i === y ? row : r));
}

const HOOD = SPRITES.hood;
const CRYSTAL = SPRITES.crystal;
const MUG = SPRITES.mug;

/**
 * Expert portraits by rank: they look shabbier as rookies and grander as masters.
 * Index = expert level (perk level).
 */
const RANK_SPRITES = {
  // Spy: patched grey rag → blue cloak → purple cloak with gold trim → master with gold mask.
  hood0: replaceRow(
    patch(recolor(HOOD, { y: 's' }), [
      [2, 4, 'b'],
      [8, 2, 'b'],
      [9, 9, 'b'],
      [10, 3, 'b'],
    ]),
    11,
    'k.kk.kk.k.kk',
  ),
  hood1: recolor(HOOD, { S: 'U', y: 'w' }),
  hood2: replaceRow(recolor(HOOD, { S: 'P' }), 8, 'kyyyyyyyyyyk'),
  hood3: replaceRow(
    replaceRow(replaceRow(recolor(HOOD, { S: 'P' }), 5, '.kPyykkyyPk.'), 7, '.kPRRRRRRPk.'),
    8,
    'kyyyyyyyyyyk',
  ),
  // Master spy: black cloak lined with gold, gold mask.
  hood4: replaceRow(
    replaceRow(replaceRow(recolor(HOOD, { S: 'k', s: 'B' }), 5, '.kkyykkyykk.'), 7, '.kyRRRRRRyk.'),
    8,
    'kyyyyyyyyyyk',
  ),
  // Astrologer: cracked dull ball → clear ball → ball on a gold stand with sparkles.
  crystal0: patch(recolor(CRYSTAL, { w: 's', P: 'S' }), [
    [2, 6, 'k'],
    [3, 7, 'k'],
    [4, 6, 'k'],
    [5, 7, 'k'],
  ]),
  crystal1: [...CRYSTAL],
  crystal2: patch(recolor(CRYSTAL, { b: 'y', B: 'o' }), [
    [0, 0, 'w'],
    [1, 1, 'y'],
    [0, 11, 'y'],
    [2, 11, 'w'],
    [6, 0, 'y'],
  ]),
  // Court astrologer: a violet ball on gold; the Oracle: a golden ball crowned with stars.
  crystal3: patch(recolor(CRYSTAL, { b: 'y', B: 'o', u: 'p', U: 'P' }), [
    [0, 0, 'w'],
    [1, 1, 'y'],
    [0, 11, 'y'],
    [2, 11, 'w'],
    [6, 0, 'y'],
    [6, 11, 'w'],
  ]),
  crystal4: patch(recolor(CRYSTAL, { b: 'y', B: 'o', u: 'y', U: 'o', P: 'o', p: 'y' }), [
    [0, 0, 'w'],
    [1, 1, 'y'],
    [0, 11, 'w'],
    [1, 10, 'y'],
    [2, 11, 'w'],
    [6, 0, 'w'],
    [6, 11, 'w'],
  ]),
  // Drunk: dirty mug → clean mug → a glass of milk (he is nearly sober).
  mug0: patch(recolor(MUG, { w: 's', y: 'o', o: 'b' }), [
    [5, 2, 'b'],
    [7, 6, 'B'],
  ]),
  mug1: [...MUG],
  mug2: patch(recolor(MUG, { y: 'w', o: 's' }), [
    [0, 10, 'y'],
    [1, 11, 'w'],
  ]),
  // Nearly sober: a glass of water with a lemon; finally a fine cup of tea with a gold rim.
  mug3: patch(recolor(MUG, { y: 'u', o: 'U', w: 'u' }), [
    [0, 10, 'g'],
    [1, 11, 'y'],
  ]),
  mug4: patch(recolor(MUG, { y: 'o', o: 'b', w: 'w', k: 'y' }), [
    [0, 10, 'w'],
    [1, 11, 'w'],
  ]),
};

const ALL_SPRITES: Record<string, readonly string[]> = { ...SPRITES, ...RANK_SPRITES };

export type SpriteName = keyof typeof SPRITES | keyof typeof RANK_SPRITES;

/** Highest rank of each expert (perk levels). */
export function maxRank(expert: 'drunk' | 'astrologer' | 'spy'): number {
  void expert;
  return 4;
}

/** Portrait for an expert at a given rank. */
export function expertSprite(expert: 'drunk' | 'astrologer' | 'spy', level: number): SpriteName {
  const base = expert === 'spy' ? 'hood' : expert === 'astrologer' ? 'crystal' : 'mug';
  return `${base}${Math.max(0, Math.min(level, maxRank(expert)))}` as SpriteName;
}

const cache = new Map<string, string>();

/** Rasterises a sprite to a PNG data URL (1 px per pixel; CSS scales it up). */
export function spriteUrl(name: SpriteName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = ALL_SPRITES[name]!;
  const width = Math.max(...rows.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PALETTE[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  const url = canvas.toDataURL();
  cache.set(name, url);
  return url;
}

export function sprite(name: SpriteName, size: number, label = ''): string {
  const alt = label ? `alt="${label}"` : 'alt="" aria-hidden="true"';
  return `<img class="sprite" src="${spriteUrl(name)}" width="${size}" height="${size}" ${alt} />`;
}
