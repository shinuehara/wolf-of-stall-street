// Bundles the Vite build (dist/) into one self-contained HTML page for the claude.ai
// Artifact used as the private test link. Run `npm run build` first.
//
//   node scripts/bundle-artifact.mjs <output.html>
//
// The artifact host wraps the page in its own <html>/<head>/<body>, so this writes only the
// title, fonts, inline CSS, the #app root and the inline module script.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
if (!out) {
  console.error('usage: node scripts/bundle-artifact.mjs <output.html>');
  process.exit(1);
}
const dir = 'dist/assets';
const files = fs.readdirSync(dir);
const cssFile = files.find((f) => f.endsWith('.css'));
const jsFile = files.find((f) => f.endsWith('.js'));
if (!cssFile || !jsFile) {
  console.error('dist/assets is missing CSS or JS: run `npm run build` first.');
  process.exit(1);
}
const css = fs.readFileSync(path.join(dir, cssFile), 'utf8');
const js = fs.readFileSync(path.join(dir, jsFile), 'utf8').replace(/<\/script/gi, '<\\/script');
const html = `<title>The Wolf of Stall Street</title>
<meta name="description" content="Um jogo medieval de investimentos por turnos. Do Servo ao Conde.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600&family=VT323&display=swap">
<style>${css}</style>
<div id="app"></div>
<script type="module">${js}</script>
`;
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} bytes)`);
