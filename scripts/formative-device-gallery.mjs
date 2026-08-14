#!/usr/bin/env node
/**
 * Capture Scroll Trivia take-page screenshots across old + new phone sizes.
 *
 *   node scripts/formative-device-gallery.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_BASE = process.env.FORMATIVE_UI_BASE || 'http://localhost:5174';
const OUT_DIR = path.join(ROOT, 'artifacts', 'trivia-sims', 'device-gallery');
const QUIZ_PATH = process.env.TRIVIA_QUIZ_JSON || path.join(ROOT, 'artifacts', 'trivia-sims', 'quiz.json');

const GALAXY_S26 = {
  name: 'Galaxy S26',
  userAgent:
    'Mozilla/5.0 (Linux; Android 16; SM-S931U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
};

const GALLERY = [
  { engine: 'webkit', device: devices['iPhone SE'], name: 'iPhone-SE' },
  { engine: 'webkit', device: devices['iPhone 8'], name: 'iPhone-8' },
  { engine: 'webkit', device: devices['iPhone SE (3rd gen)'], name: 'iPhone-SE-3' },
  { engine: 'webkit', device: devices['iPhone 11'], name: 'iPhone-11' },
  { engine: 'webkit', device: devices['iPhone 13'], name: 'iPhone-13' },
  { engine: 'webkit', device: devices['iPhone 16'], name: 'iPhone-16' },
  { engine: 'chromium', device: devices['Galaxy S5'], name: 'Galaxy-S5' },
  { engine: 'chromium', device: devices['Galaxy S8'], name: 'Galaxy-S8' },
  { engine: 'chromium', device: devices['Galaxy S9+'], name: 'Galaxy-S9-Plus' },
  { engine: 'chromium', device: devices['Pixel 5'], name: 'Pixel-5' },
  { engine: 'chromium', device: devices['Galaxy S24'], name: 'Galaxy-S24' },
  { engine: 'chromium', device: GALAXY_S26, name: 'Galaxy-S26' },
  {
    engine: 'chromium',
    device: null,
    name: 'Desktop-1366x768',
    context: { viewport: { width: 1366, height: 768 } },
  },
  {
    engine: 'chromium',
    device: null,
    name: 'Desktop-1440x900',
    context: { viewport: { width: 1440, height: 900 } },
  },
];

async function main() {
  if (!fs.existsSync(QUIZ_PATH)) {
    throw new Error(`Missing ${QUIZ_PATH}. Run npm run formative:trivia:quiz first.`);
  }
  const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
  const slug = quiz.quiz?.slug;
  if (!slug) throw new Error('quiz slug missing');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chromiumBrowser = await chromium
    .launch({ headless: true, channel: 'chrome' })
    .catch(() => chromium.launch({ headless: true }));
  let webkitBrowser = null;
  try {
    webkitBrowser = await webkit.launch({ headless: true });
  } catch (err) {
    console.warn(`WebKit unavailable (${err.message}); iOS gallery uses Chromium emulation.`);
  }

  const rows = [];
  for (const item of GALLERY) {
    const browser =
      item.engine === 'webkit' && webkitBrowser ? webkitBrowser : chromiumBrowser;
    const context = await browser.newContext({
      ...(item.device || item.context || {}),
      locale: 'en-US',
    });
    const page = await context.newPage();
    const url = `${UI_BASE}/trivia/take/${slug}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForSelector('#discord-username', { timeout: 30_000 });
    await page.waitForTimeout(400);
    const shot = path.join(OUT_DIR, `${item.name}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    const metrics = await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
      optionH: Math.round(document.querySelector('.f-option-row')?.getBoundingClientRect().height || 0),
      submitH: Math.round(document.querySelector('.f-submit-btn')?.getBoundingClientRect().height || 0),
    }));
    rows.push({
      name: item.name,
      engine: item.engine,
      ...metrics,
      screenshot: path.relative(ROOT, shot),
    });
    console.log(`  ✓ ${item.name} ${metrics.w}x${metrics.h} option=${metrics.optionH}px submit=${metrics.submitH}px`);
    await context.close();
  }

  await chromiumBrowser.close().catch(() => {});
  await webkitBrowser?.close().catch(() => {});

  const summary = {
    quizSlug: slug,
    generatedAt: new Date().toISOString(),
    devices: rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'gallery.json'), JSON.stringify(summary, null, 2));
  const md = [
    '# Device gallery — Scroll Trivia take page',
    '',
    `| Device | Viewport | Option tap | Submit tap | Screenshot |`,
    `|---|---|---|---|---|`,
    ...rows.map(
      (r) =>
        `| ${r.name} | ${r.w}×${r.h} | ${r.optionH}px | ${r.submitH}px | \`${r.screenshot}\` |`
    ),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'gallery.md'), md);
  console.log(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
