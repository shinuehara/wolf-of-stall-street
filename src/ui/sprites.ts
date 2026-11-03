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

export type SpriteName = keyof typeof SPRITES;

const cache = new Map<string, string>();

/** Rasterises a sprite to a PNG data URL (1 px per pixel; CSS scales it up). */
export function spriteUrl(name: SpriteName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = SPRITES[name];
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
