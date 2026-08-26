/**
 * Screenshot Smite 2 emoji review sheets (2 PNGs) for friend feedback.
 * Run after: npm run minigame:emoji-clues
 *   node scripts/screenshot-emoji-guess-review.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'app/data/Minigames/god-emoji-guess');
const OUT = path.join(ROOT, 'artifacts/emoji-guess-review');

const PARTS = [
  { html: 's2-review-part1.html', png: 'smite2-emoji-sets-part1.png' },
  { html: 's2-review-part2.html', png: 'smite2-emoji-sets-part2.png' },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  for (const part of PARTS) {
    const htmlPath = path.join(DIR, part.html);
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Missing ${htmlPath} — run npm run minigame:emoji-clues first`);
    }
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const outPath = path.join(OUT, part.png);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Wrote ${outPath}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
