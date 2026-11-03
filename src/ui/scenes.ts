/**
 * Procedural pixel-art backdrops for each location, painted on a small canvas
 * (SCENE_W x SCENE_H) and scaled up with nearest-neighbour filtering.
 */
export type SceneName = 'square' | 'market' | 'tavern' | 'castle';

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
