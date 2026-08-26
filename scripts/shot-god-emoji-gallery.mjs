#!/usr/bin/env node
/**
 * Full-page PNG of all Smite 2 god emoji set-A cards.
 * Uses Playwright/Chromium so color emoji render (sharp/librsvg paints them black).
 * Writes: app/data/Trivia/god-emojis/gallery-all-gods.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'app/data/Trivia/god-emojis');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const HTML_OUT = path.join(OUT_DIR, '_gallery-shot.html');
const PNG_OUT = path.join(OUT_DIR, 'gallery-all-gods.png');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const gods = (manifest.gods || [])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))
  .filter((g) => fs.existsSync(path.join(OUT_DIR, `${g.slug}-a-unnamed.svg`)));

const cards = gods
  .map((g) => {
    const file = `${g.slug}-a-unnamed.svg`;
    return `<figure class="card"><img src="${file}" alt="${g.name}"/><figcaption>${g.name}</figcaption></figure>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>God emoji gallery</title>
<style>
  body { margin: 0; background: #070b14; color: #e2e8f0; font-family: "Segoe UI", system-ui, sans-serif; }
  h1 { font-size: 1.25rem; letter-spacing: 0.14em; padding: 24px 24px 8px; margin: 0; }
  p { color: #94a3b8; padding: 0 24px 20px; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; padding: 0 20px 28px; }
  .card { margin: 0; background: #0b1220; border: 1px solid rgba(125,211,252,0.35); border-radius: 10px; padding: 10px; }
  .card img { width: 100%; height: auto; display: block; border-radius: 6px; }
  figcaption { margin-top: 8px; font-size: 0.78rem; letter-spacing: 0.1em; font-weight: 700; text-align: center; color: #7dd3fc; }
</style>
</head>
<body>
  <h1>SMITE 2 — GOD EMOJI CARDS (SET A)</h1>
  <p>${gods.length} gods · gallery rendered in Chromium so emoji stay in color</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>`;

fs.writeFileSync(HTML_OUT, html);

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (err) {
  console.error(String(err?.message || err));
  console.error('\nInstall Chromium for gallery shots:\n  npx playwright install chromium\n');
  process.exit(1);
}

const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(pathToFileURL(HTML_OUT).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: PNG_OUT, fullPage: true });
await browser.close();
fs.unlinkSync(HTML_OUT);

console.log(`Wrote ${PNG_OUT} (${gods.length} gods)`);
