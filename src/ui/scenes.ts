/**
 * Procedural pixel-art backdrops for each location, painted on a small canvas
 * (SCENE_W x SCENE_H) and scaled up with nearest-neighbour filtering.
 */
export type SceneName = 'square' | 'market' | 'portfolio' | 'tavern' | 'castle';

export const SCENE_W = 192;
export const SCENE_H = 64;

type Ctx = CanvasRenderingContext2D;

const cache = new Map<SceneName, string>();

export function sceneUrl(name: SceneName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  PAINTERS[name](ctx);
  const url = canvas.toDataURL();
  cache.set(name, url);
  return url;
}

const PAINTERS: Record<SceneName, (ctx: Ctx) => void> = {
  square: paintSquare,
  market: paintMarket,
  portfolio: paintCountingHouse,
  tavern: paintTavern,
  castle: paintCastle,
};

// --- helpers ---------------------------------------------------------------

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Vertical sky made of flat bands with a checkerboard dither between them. */
function sky(ctx: Ctx, colors: string[], height: number): void {
  const band = Math.ceil(height / colors.length);
  colors.forEach((color, i) => rect(ctx, 0, i * band, SCENE_W, band, color));
  for (let i = 1; i < colors.length; i++) {
    const y = i * band - 1;
    ctx.fillStyle = colors[i]!;
    for (let x = i % 2; x < SCENE_W; x += 2) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = colors[i - 1]!;
    for (let x = (i + 1) % 2; x < SCENE_W; x += 2) ctx.fillRect(x, y + 1, 1, 1);
  }
}

/** Deterministic pseudo-random sequence so scenes never change between renders. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function roof(ctx: Ctx, x: number, y: number, w: number, color: string, shade: string): void {
  const steps = Math.ceil(w / 2);
  for (let i = 0; i < steps; i++) {
    rect(ctx, x + i, y + steps - i, w - i * 2, 1, i % 3 === 0 ? shade : color);
  }
}

function house(
  ctx: Ctx,
  x: number,
  ground: number,
  w: number,
  h: number,
  wall: string,
  roofColor: string,
  roofShade: string,
): void {
  const top = ground - h;
  rect(ctx, x, top, w, h, wall);
  rect(ctx, x, top, 1, h, '#1a1033');
  rect(ctx, x + w - 1, top, 1, h, '#1a1033');
  roof(ctx, x - 2, top - Math.ceil((w + 4) / 2), w + 4, roofColor, roofShade);
  for (let wx = x + 3; wx + 3 < x + w - 2; wx += 6) {
    rect(ctx, wx, top + 4, 3, 4, '#ffcc33');
    rect(ctx, wx, top + 4, 3, 1, '#1a1033');
  }
  rect(ctx, x + Math.floor(w / 2) - 2, ground - 7, 4, 7, '#5a2e1a');
}

function cobbles(ctx: Ctx, top: number, base: string, dot: string, seed: number): void {
  rect(ctx, 0, top, SCENE_W, SCENE_H - top, base);
  const rnd = seeded(seed);
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(rnd() * SCENE_W);
    const y = top + 1 + Math.floor(rnd() * (SCENE_H - top - 1));
    rect(ctx, x, y, 2, 1, dot);
  }
}

// --- scenes ----------------------------------------------------------------

function paintSquare(ctx: Ctx): void {
  sky(ctx, ['#3d8bff', '#4fa6ff', '#6fc0ff', '#9ad7ff'], 44);
  // sun & clouds
  rect(ctx, 20, 6, 8, 8, '#ffcc33');
  rect(ctx, 19, 7, 10, 6, '#ffcc33');
  rect(ctx, 22, 8, 2, 2, '#fff4d6');
  for (const [cx, cy] of [
    [60, 8],
    [130, 12],
    [165, 5],
  ] as const) {
    rect(ctx, cx, cy, 16, 3, '#fff4d6');
    rect(ctx, cx + 3, cy - 2, 9, 2, '#fff4d6');
  }
  // houses
  const ground = 50;
  house(ctx, 4, ground, 22, 20, '#ffd7a8', '#ff4f5e', '#b0243a');
  house(ctx, 32, ground, 18, 16, '#b8f0c8', '#2c5fd1', '#1a1033');
  house(ctx, 136, ground, 20, 18, '#ffe48a', '#b56cff', '#6a35c9');
  house(ctx, 162, ground, 24, 22, '#ffd7a8', '#ff8a3d', '#b0243a');
  // bunting
  for (let x = 52; x < 134; x += 6) {
    const y = 14 + Math.round(Math.sin((x - 52) / 13) * 3);
    rect(ctx, x, y, 6, 1, '#1a1033');
    const colors = ['#ff4f5e', '#ffcc33', '#4fe08a', '#4fb4ff', '#b56cff'];
    const color = colors[((x / 6) % colors.length) | 0]!;
    rect(ctx, x + 1, y + 1, 4, 1, color);
    rect(ctx, x + 2, y + 2, 2, 1, color);
  }
  cobbles(ctx, ground, '#9aa3c7', '#6b73a3', 3);
  // fountain
  const fx = 84;
  rect(ctx, fx, ground - 6, 24, 8, '#c3c9e8');
  rect(ctx, fx, ground - 6, 24, 1, '#1a1033');
  rect(ctx, fx + 2, ground - 5, 20, 2, '#4fb4ff');
  rect(ctx, fx + 10, ground - 18, 4, 12, '#c3c9e8');
  rect(ctx, fx + 7, ground - 20, 10, 2, '#c3c9e8');
  for (const [dx, dy] of [
    [5, -24],
    [8, -26],
    [15, -26],
    [18, -24],
    [4, -20],
    [19, -20],
    [11, -27],
  ] as const) {
    rect(ctx, fx + dx, ground + dy, 1, 2, '#4fb4ff');
  }
}

function paintMarket(ctx: Ctx): void {
  sky(ctx, ['#ff6f91', '#ff8a5e', '#ffad5e', '#ffd36b'], 40);
  rect(ctx, 150, 22, 14, 14, '#fff4d6');
  rect(ctx, 148, 24, 18, 10, '#fff4d6');
  // distant roofs
  for (let x = 0; x < SCENE_W; x += 18) {
    rect(ctx, x, 30 + ((x / 18) % 3) * 2, 16, 12, '#b0243a');
  }
  const ground = 52;
  cobbles(ctx, ground - 10, '#c98a4b', '#a8602f', 9);
  // stalls with striped awnings
  const stalls: [number, string, string][] = [
    [6, '#ff4f5e', '#fff4d6'],
    [54, '#2c5fd1', '#ffcc33'],
    [102, '#1f9e5a', '#fff4d6'],
    [150, '#b56cff', '#ffcc33'],
  ];
  for (const [x, a, b] of stalls) {
    const w = 36;
    rect(ctx, x + 2, 26, 2, 26, '#5a2e1a');
    rect(ctx, x + w - 4, 26, 2, 26, '#5a2e1a');
    for (let i = 0; i < w; i += 4) rect(ctx, x + i, 20, 4, 8, (i / 4) % 2 ? b : a);
    for (let i = 0; i < w; i += 4) rect(ctx, x + i + 1, 28, 2, 2, (i / 4) % 2 ? b : a);
    rect(ctx, x, 20, w, 1, '#1a1033');
    // counter with goods
    rect(ctx, x + 1, 40, w - 2, 12, '#a8602f');
    rect(ctx, x + 1, 40, w - 2, 1, '#1a1033');
    const goods = ['#ffcc33', '#ff8a3d', '#4fe08a', '#ff4f5e', '#fff4d6'];
    for (let i = 0; i < 6; i++) rect(ctx, x + 4 + i * 5, 36, 4, 4, goods[(i + x) % goods.length]!);
  }
  // crates and coin piles
  rect(ctx, 44, 56, 8, 8, '#a8602f');
  rect(ctx, 44, 56, 8, 1, '#5a2e1a');
  rect(ctx, 92, 58, 6, 3, '#ffcc33');
  rect(ctx, 93, 56, 4, 2, '#ffcc33');
  rect(ctx, 140, 57, 8, 7, '#a8602f');
  rect(ctx, 140, 57, 8, 1, '#5a2e1a');
}

function paintTavern(ctx: Ctx): void {
  // planks
  rect(ctx, 0, 0, SCENE_W, SCENE_H, '#5a2e1a');
  for (let y = 0; y < 46; y += 6) {
    rect(ctx, 0, y, SCENE_W, 1, '#3a1c10');
    for (let x = (y / 6) % 2 ? 0 : 12; x < SCENE_W; x += 24) rect(ctx, x, y, 1, 6, '#3a1c10');
  }
  // floor
  rect(ctx, 0, 46, SCENE_W, 18, '#a8602f');
  for (let x = 0; x < SCENE_W; x += 10) rect(ctx, x, 46, 1, 18, '#5a2e1a');
  rect(ctx, 0, 46, SCENE_W, 1, '#1a1033');
  // fireplace
  rect(ctx, 76, 14, 40, 32, '#6b73a3');
  rect(ctx, 72, 12, 48, 4, '#c3c9e8');
  rect(ctx, 84, 24, 24, 22, '#1a1033');
  rect(ctx, 88, 38, 16, 8, '#ff4f5e');
  rect(ctx, 90, 33, 12, 7, '#ff8a3d');
  rect(ctx, 93, 29, 6, 6, '#ffcc33');
  rect(ctx, 95, 27, 2, 3, '#fff4d6');
  rect(ctx, 86, 44, 20, 2, '#5a2e1a');
  // glow
  ctx.fillStyle = 'rgba(255, 170, 60, 0.12)';
  ctx.fillRect(56, 8, 80, 56);
  // lamps
  for (const lx of [30, 162]) {
    rect(ctx, lx, 0, 1, 10, '#1a1033');
    rect(ctx, lx - 3, 10, 7, 6, '#ffcc33');
    rect(ctx, lx - 2, 11, 5, 4, '#fff4d6');
    ctx.fillStyle = 'rgba(255, 204, 51, 0.15)';
    ctx.fillRect(lx - 14, 4, 29, 26);
  }
  // barrels
  for (const bx of [8, 26, 168]) {
    rect(ctx, bx, 32, 14, 16, '#a8602f');
    rect(ctx, bx + 1, 31, 12, 18, '#a8602f');
    rect(ctx, bx, 35, 14, 1, '#1a1033');
    rect(ctx, bx, 44, 14, 1, '#1a1033');
    rect(ctx, bx + 6, 38, 2, 2, '#1a1033');
  }
  // tables with mugs
  for (const tx of [44, 130]) {
    rect(ctx, tx, 46, 22, 3, '#ff8a3d');
    rect(ctx, tx, 46, 22, 1, '#1a1033');
    rect(ctx, tx + 2, 49, 2, 10, '#5a2e1a');
    rect(ctx, tx + 18, 49, 2, 10, '#5a2e1a');
    rect(ctx, tx + 5, 41, 4, 5, '#ffcc33');
    rect(ctx, tx + 5, 41, 4, 1, '#fff4d6');
    rect(ctx, tx + 13, 42, 4, 4, '#ffcc33');
    rect(ctx, tx + 13, 42, 4, 1, '#fff4d6');
  }
}

function paintCastle(ctx: Ctx): void {
  sky(ctx, ['#1a1033', '#2b1d5e', '#4a2a85', '#7a3fa8', '#b0508f'], 56);
  const rnd = seeded(11);
  for (let i = 0; i < 40; i++) {
    rect(ctx, Math.floor(rnd() * SCENE_W), Math.floor(rnd() * 26), 1, 1, '#fff4d6');
  }
  // moon
  rect(ctx, 22, 6, 10, 10, '#fff4d6');
  rect(ctx, 21, 8, 12, 6, '#fff4d6');
  rect(ctx, 26, 7, 6, 6, '#2b1d5e');
  // hills
  for (let x = 0; x < SCENE_W; x++) {
    const h = 6 + Math.round(Math.sin(x / 17) * 3 + Math.sin(x / 7) * 1);
    rect(ctx, x, SCENE_H - 10 - h, 1, h + 10, '#1f9e5a');
  }
  rect(ctx, 0, SCENE_H - 6, SCENE_W, 6, '#156b3e');
  // castle
  const base = SCENE_H - 12;
  const cx = 70;
  rect(ctx, cx, base - 22, 52, 22, '#6b73a3');
  for (let x = cx; x < cx + 52; x += 4) rect(ctx, x, base - 25, 2, 3, '#6b73a3');
  for (const tx of [cx - 8, cx + 52]) {
    rect(ctx, tx, base - 36, 10, 36, '#c3c9e8');
    for (let x = tx; x < tx + 10; x += 4) rect(ctx, x, base - 39, 2, 3, '#c3c9e8');
    rect(ctx, tx + 4, base - 30, 2, 4, '#ffcc33');
    rect(ctx, tx + 4, base - 48, 1, 9, '#1a1033');
    rect(ctx, tx + 5, base - 48, 6, 4, '#ff4f5e');
  }
  rect(ctx, cx + 20, base - 42, 12, 20, '#c3c9e8');
  for (let x = cx + 20; x < cx + 32; x += 4) rect(ctx, x, base - 45, 2, 3, '#c3c9e8');
  rect(ctx, cx + 25, base - 56, 1, 11, '#1a1033');
  rect(ctx, cx + 26, base - 56, 8, 5, '#ffcc33');
  rect(ctx, cx + 24, base - 36, 4, 5, '#ffcc33');
  // windows & gate
  for (let x = cx + 6; x < cx + 50; x += 10) rect(ctx, x, base - 16, 3, 4, '#ffcc33');
  rect(ctx, cx + 21, base - 10, 10, 10, '#1a1033');
  rect(ctx, cx + 22, base - 11, 8, 1, '#1a1033');
}

function paintCountingHouse(ctx: Ctx): void {
  // stone wall
  rect(ctx, 0, 0, SCENE_W, SCENE_H, '#3d2b80');
  for (let y = 0; y < 44; y += 6) {
    rect(ctx, 0, y, SCENE_W, 1, '#2b1d5e');
    for (let x = (y / 6) % 2 ? 0 : 8; x < SCENE_W; x += 16) rect(ctx, x, y, 1, 6, '#2b1d5e');
  }
  // windows with night sky
  for (const wx of [14, 150]) {
    rect(ctx, wx, 6, 26, 24, '#1a1033');
    rect(ctx, wx + 2, 8, 22, 20, '#2c5fd1');
    rect(ctx, wx + 12, 8, 2, 20, '#1a1033');
    rect(ctx, wx + 2, 17, 22, 2, '#1a1033');
    rect(ctx, wx + 5, 10, 1, 1, '#fff4d6');
    rect(ctx, wx + 18, 12, 1, 1, '#fff4d6');
    rect(ctx, wx + 7, 21, 1, 1, '#fff4d6');
  }
  // shelves with scrolls and ledgers
  for (const sy of [10, 24]) {
    rect(ctx, 52, sy + 8, 88, 2, '#5a2e1a');
    for (let i = 0; i < 11; i++) {
      const colors = ['#ff4f5e', '#4fe08a', '#ffcc33', '#4fb4ff', '#b56cff', '#fff4d6'];
      const h = 5 + ((i * 7 + sy) % 3);
      rect(ctx, 55 + i * 8, sy + 8 - h, 5, h, colors[(i + sy) % colors.length]!);
    }
  }
  // floor
  rect(ctx, 0, 44, SCENE_W, 20, '#5a2e1a');
  for (let x = 0; x < SCENE_W; x += 12) rect(ctx, x, 44, 1, 20, '#3a1c10');
  rect(ctx, 0, 44, SCENE_W, 1, '#1a1033');
  // desk
  rect(ctx, 46, 38, 100, 6, '#a8602f');
  rect(ctx, 46, 38, 100, 1, '#1a1033');
  rect(ctx, 50, 44, 4, 16, '#5a2e1a');
  rect(ctx, 138, 44, 4, 16, '#5a2e1a');
  // open ledger
  rect(ctx, 80, 33, 30, 5, '#fff4d6');
  rect(ctx, 95, 33, 1, 5, '#a8602f');
  for (let i = 0; i < 4; i++) {
    rect(ctx, 82, 34 + i, 11, 1, i % 2 ? '#c3c9e8' : '#6b73a3');
    rect(ctx, 97, 34 + i, 11, 1, i % 2 ? '#6b73a3' : '#c3c9e8');
  }
  // quill
  rect(ctx, 112, 28, 1, 9, '#fff4d6');
  rect(ctx, 111, 28, 3, 4, '#fff4d6');
  // coin stacks
  for (const [cx, h] of [
    [56, 4],
    [62, 7],
    [68, 5],
    [124, 6],
    [130, 9],
  ] as const) {
    for (let i = 0; i < h; i++) rect(ctx, cx, 37 - i, 5, 1, i % 2 ? '#ffcc33' : '#ff8a3d');
  }
  // scales
  rect(ctx, 140, 22, 1, 16, '#c3c9e8');
  rect(ctx, 132, 22, 17, 1, '#c3c9e8');
  rect(ctx, 130, 27, 6, 2, '#ffcc33');
  rect(ctx, 145, 25, 6, 2, '#ffcc33');
  // candle glow
  rect(ctx, 74, 30, 2, 8, '#fff4d6');
  rect(ctx, 74, 28, 2, 2, '#ffcc33');
  ctx.fillStyle = 'rgba(255, 204, 51, 0.12)';
  ctx.fillRect(56, 18, 40, 26);
}

// --- quarter-close party -----------------------------------------------------

export const GALA_W = 192;
export const GALA_H = 80;

export const GALA_NAMES = [
  'Jantar Modesto',
  'Ceia na Taverna',
  'Banquete da Guilda',
  'Festim dos Mercadores',
  'Sarau do Burgo',
  'Festa no Castelo',
  'Grande Banquete do Barão',
  'Baile de Gala do Conde',
];

const galaCache = new Map<string, string>();

/**
 * The party at the end of a quarter. `tier` is the class index (0 Servo … 7 Conde): the room,
 * the table, the lights and the guests grow with it. `mood` dims the room or throws confetti.
 */
export function galaUrl(tier: number, mood: 'sad' | 'neutral' | 'happy'): string {
  const key = `${tier}-${mood}`;
  const hit = galaCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = GALA_W;
  canvas.height = GALA_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  paintGala(ctx, Math.max(0, Math.min(7, tier)), mood);
  const url = canvas.toDataURL();
  galaCache.set(key, url);
  return url;
}

const WALLS = [
  '#3a1c10',
  '#5a2e1a',
  '#5b6390',
  '#6a35c9',
  '#4a2a85',
  '#6b73a3',
  '#7a3fa8',
  '#2b1d5e',
];
const FLOORS = [
  '#5a2e1a',
  '#a8602f',
  '#9aa3c7',
  '#a8602f',
  '#c98a4b',
  '#c3c9e8',
  '#c3c9e8',
  '#fff4d6',
];
const GUEST_COLORS = ['#ff4f5e', '#4fb4ff', '#4fe08a', '#ffcc33', '#b56cff', '#ff8a3d', '#fff4d6'];

const HAIR = ['#5a2e1a', '#1a1033', '#ffcc33', '#a8602f', '#c3c9e8'];

/** A small guest, 7 px wide and 13 px tall, with hair, arms and clothes. */
function person(ctx: Ctx, x: number, y: number, color: string, hat?: string, hair = 0): void {
  const hairColor = HAIR[hair % HAIR.length]!;
  rect(ctx, x + 2, y, 3, 1, hairColor);
  rect(ctx, x + 1, y + 1, 5, 4, '#ffc59e');
  rect(ctx, x + 1, y + 1, 1, 2, hairColor);
  rect(ctx, x + 5, y + 1, 1, 2, hairColor);
  rect(ctx, x + 2, y + 2, 1, 1, '#1a1033');
  rect(ctx, x + 4, y + 2, 1, 1, '#1a1033');
  rect(ctx, x + 3, y + 4, 1, 1, '#b0243a');
  rect(ctx, x + 1, y + 5, 5, 5, color);
  rect(ctx, x + 3, y + 5, 1, 4, '#fff4d6');
  rect(ctx, x, y + 6, 1, 3, color);
  rect(ctx, x + 6, y + 6, 1, 3, color);
  rect(ctx, x, y + 9, 1, 1, '#ffc59e');
  rect(ctx, x + 6, y + 9, 1, 1, '#ffc59e');
  rect(ctx, x + 1, y + 10, 2, 3, '#1a1033');
  rect(ctx, x + 4, y + 10, 2, 3, '#1a1033');
  if (hat) {
    rect(ctx, x + 1, y - 1, 5, 1, hat);
    rect(ctx, x + 2, y - 2, 1, 1, hat);
    rect(ctx, x + 4, y - 2, 1, 1, hat);
  }
}

function paintGala(ctx: Ctx, tier: number, mood: 'sad' | 'neutral' | 'happy'): void {
  const rnd = seeded(97 + tier);
  const floorY = 56;
  // walls
  rect(ctx, 0, 0, GALA_W, floorY, WALLS[tier]!);
  if (tier <= 1) {
    for (let y = 0; y < floorY; y += 7) rect(ctx, 0, y, GALA_W, 1, '#1a1033');
  } else {
    for (let y = 0; y < floorY; y += 8) {
      rect(ctx, 0, y, GALA_W, 1, 'rgba(0,0,0,0.25)');
      for (let x = (y / 8) % 2 ? 0 : 10; x < GALA_W; x += 20)
        rect(ctx, x, y, 1, 8, 'rgba(0,0,0,0.25)');
    }
  }
  // windows (night sky; fireworks at the top tier)
  const windows = tier >= 5 ? [20, 84, 148] : tier >= 2 ? [30, 140] : [150];
  for (const wx of windows) {
    const w = tier >= 5 ? 24 : 16;
    rect(ctx, wx, 8, w, 22, '#1a1033');
    rect(ctx, wx + 2, 10, w - 4, 18, mood === 'sad' ? '#2c3a5e' : '#2c5fd1');
    if (mood === 'sad') {
      for (let i = 0; i < 8; i++)
        rect(
          ctx,
          wx + 3 + Math.floor(rnd() * (w - 6)),
          11 + Math.floor(rnd() * 14),
          1,
          2,
          '#9aa3c7',
        );
    } else if (tier === 7) {
      const cx = wx + w / 2;
      for (const [dx, dy, c] of [
        [0, -4, '#ffcc33'],
        [4, 0, '#ff4f5e'],
        [-4, 0, '#4fe08a'],
        [0, 4, '#b56cff'],
        [3, -3, '#fff4d6'],
        [-3, 3, '#fff4d6'],
      ] as const) {
        rect(ctx, cx + dx, 18 + dy, 1, 1, c);
      }
    } else {
      rect(ctx, wx + 5, 13, 1, 1, '#fff4d6');
    }
  }
  // banners and tapestries
  if (tier >= 2) {
    const count = tier >= 6 ? 6 : tier >= 4 ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const bx = 8 + Math.floor(((i + 0.5) * (GALA_W - 16)) / count) - 4;
      const color = tier >= 5 ? '#b0243a' : GUEST_COLORS[i % GUEST_COLORS.length]!;
      rect(ctx, bx, 4, 8, 18, color);
      rect(ctx, bx, 4, 8, 1, '#ffcc33');
      rect(ctx, bx + 3, 10, 2, 4, '#ffcc33');
      rect(ctx, bx, 22, 2, 2, color);
      rect(ctx, bx + 6, 22, 2, 2, color);
    }
  }
  // gold pillars for the nobility
  if (tier >= 6) {
    for (const px of [2, GALA_W - 8]) {
      rect(ctx, px, 0, 6, floorY, '#ffcc33');
      rect(ctx, px + 1, 0, 1, floorY, '#fff4d6');
      rect(ctx, px + 5, 0, 1, floorY, '#ff8a3d');
    }
  }
  // floor
  rect(ctx, 0, floorY, GALA_W, GALA_H - floorY, FLOORS[tier]!);
  if (tier >= 5) {
    for (let y = floorY; y < GALA_H; y += 4) {
      for (let x = ((y - floorY) / 4) % 2 ? 0 : 4; x < GALA_W; x += 8)
        rect(ctx, x, y, 4, 4, tier === 7 ? '#c3c9e8' : '#6b73a3');
    }
  } else {
    for (let x = 0; x < GALA_W; x += 12)
      rect(ctx, x, floorY, 1, GALA_H - floorY, 'rgba(0,0,0,0.3)');
  }
  rect(ctx, 0, floorY, GALA_W, 1, '#1a1033');
  if (tier >= 6) rect(ctx, GALA_W / 2 - 12, floorY, 24, GALA_H - floorY, '#b0243a');
  // table
  const tableW = [26, 44, 70, 90, 110, 130, 150, 120][tier]!;
  const tableX = Math.round((GALA_W - tableW) / 2);
  const tableY = floorY - 8;
  // guests seated behind the table
  const seated = Math.min(Math.floor(tableW / 10), 2 + tier * 2);
  for (let i = 0; i < seated; i++) {
    const gx = tableX + 3 + Math.floor((i * (tableW - 8)) / Math.max(1, seated - 1 || 1));
    person(
      ctx,
      Math.min(gx, tableX + tableW - 6),
      tableY - 10,
      GUEST_COLORS[(i + tier) % GUEST_COLORS.length]!,
      tier >= 5 && i % 3 === 0 ? '#ffcc33' : undefined,
    );
  }
  rect(ctx, tableX, tableY, tableW, 4, tier >= 4 ? '#fff4d6' : '#a8602f');
  rect(ctx, tableX, tableY + 4, tableW, 1, '#1a1033');
  rect(ctx, tableX + 2, tableY + 5, 2, 8, '#5a2e1a');
  rect(ctx, tableX + tableW - 4, tableY + 5, 2, 8, '#5a2e1a');
  // food on the table
  const dishes = Math.max(1, Math.floor(tableW / 14));
  for (let i = 0; i < dishes; i++) {
    const dx = tableX + 6 + i * 14;
    if (dx > tableX + tableW - 8) break;
    const kind = (i + tier) % (tier >= 4 ? 4 : tier >= 2 ? 3 : 2);
    if (kind === 0) {
      rect(ctx, dx, tableY - 3, 5, 3, '#ff8a3d'); // bread
      rect(ctx, dx + 1, tableY - 4, 3, 1, '#ffcc33');
    } else if (kind === 1) {
      rect(ctx, dx, tableY - 4, 3, 4, '#ffcc33'); // mug
      rect(ctx, dx, tableY - 4, 3, 1, '#fff4d6');
    } else if (kind === 2) {
      rect(ctx, dx - 1, tableY - 3, 7, 3, '#a8602f'); // roast
      rect(ctx, dx, tableY - 4, 5, 1, '#ff8a3d');
    } else {
      rect(ctx, dx, tableY - 6, 5, 6, '#ff9aa5'); // cake
      rect(ctx, dx, tableY - 6, 5, 1, '#fff4d6');
      rect(ctx, dx + 2, tableY - 8, 1, 2, '#ffcc33');
    }
  }
  // lights: a candle, lamps, candelabra, chandeliers
  if (tier === 0) {
    rect(ctx, tableX + tableW / 2, tableY - 6, 1, 6, '#fff4d6');
    rect(ctx, tableX + tableW / 2, tableY - 8, 1, 2, '#ffcc33');
  } else if (tier <= 3) {
    for (let i = 0; i < tier + 1; i++) {
      const lx = 20 + Math.floor((i * (GALA_W - 40)) / Math.max(1, tier));
      rect(ctx, lx, 0, 1, 8, '#1a1033');
      rect(ctx, lx - 2, 8, 5, 4, '#ffcc33');
    }
  } else {
    const count = tier - 3;
    for (let i = 0; i < count; i++) {
      const cx = Math.floor(((i + 1) * GALA_W) / (count + 1));
      rect(ctx, cx, 0, 1, 6, '#ffcc33');
      rect(ctx, cx - 8, 6, 17, 2, '#ffcc33');
      for (let k = -8; k <= 8; k += 4) {
        rect(ctx, cx + k, 3, 1, 3, '#fff4d6');
        rect(ctx, cx + k, 2, 1, 1, '#ff8a3d');
      }
    }
  }
  // dancers and musicians at the top
  if (tier >= 6) {
    const pairs = tier === 7 ? 4 : 2;
    for (let i = 0; i < pairs; i++) {
      const dx = 14 + i * 22 + (i >= pairs / 2 ? 90 : 0);
      person(ctx, dx, floorY + 6, '#b56cff', '#ffcc33', 1);
      person(ctx, dx + 7, floorY + 6, '#ff4f5e', undefined, 2);
    }
  }
  if (tier === 7) {
    for (const mx of [GALA_W / 2 - 30, GALA_W / 2 + 25]) {
      person(ctx, mx, floorY + 7, '#2c5fd1', undefined, 3);
      rect(ctx, mx + 6, floorY + 13, 3, 5, '#a8602f'); // lute
    }
  }
  // mood
  if (mood === 'sad') {
    ctx.fillStyle = 'rgba(20, 12, 43, 0.45)';
    ctx.fillRect(0, 0, GALA_W, GALA_H);
  } else if (mood === 'happy') {
    for (let i = 0; i < 70; i++) {
      rect(
        ctx,
        Math.floor(rnd() * GALA_W),
        Math.floor(rnd() * floorY),
        1,
        2,
        GUEST_COLORS[i % GUEST_COLORS.length]!,
      );
    }
  }
}
