#!/usr/bin/env node
/**
 * Capture PNG screenshots of key app surfaces at mobile + desktop viewports.
 * Requires: dev server on DEFAULT_BASE_URL (npm run web) + Playwright Chromium.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BASE_URL, SCENARIOS, SHOTS_DIR, VIEWPORTS } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error(
      'Playwright is not installed. Run:\n  npm install\n  npm run visual:audit:install'
    );
    process.exit(1);
  }
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { method: 'HEAD' });
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Dev server not reachable at ${baseUrl}. Start: npm run web`);
}

async function waitForAppReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const spinner = page.locator('[role="progressbar"], [aria-busy="true"]');
  if (await spinner.count()) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  }
  await page.waitForFunction(
    () => {
      const buttons = document.querySelectorAll('[role="button"]');
      return buttons.length >= 5;
    },
    { timeout: 30_000 }
  ).catch(() => {});
}

async function clickNav(page, step) {
  if (step.type === 'main') {
    const byLabel = page.getByRole('button', { name: step.label, exact: true });
    if (await byLabel.count()) {
      await byLabel.first().click({ force: true, timeout: 12_000 });
      return;
    }
    await page.getByText(step.label, { exact: false }).first().click({ force: true, timeout: 12_000 });
    return;
  }
  if (step.type === 'sub') {
    const byLabel = page.getByRole('button', { name: step.label, exact: true });
    if (await byLabel.count()) {
      await byLabel.last().click({ force: true, timeout: 12_000 });
      return;
    }
    await page.getByText(step.label, { exact: true }).first().click({ force: true, timeout: 12_000 });
    return;
  }
  if (step.type === 'text') {
    const btn = page.getByText(step.label, { exact: true }).first();
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    await btn.click({ force: true, timeout: 12_000 });
  }
}

async function runScenario(page, scenario) {
  await page.goto(DEFAULT_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await waitForAppReady(page);

  for (const step of scenario.steps) {
    await clickNav(page, step);
    await page.waitForTimeout(900);
  }

  if (scenario.readyText) {
    await page.getByText(scenario.readyText, { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 35_000,
    });
  }
  await page.waitForTimeout(600);
}

async function captureAll({ viewports = Object.keys(VIEWPORTS), scenarios = SCENARIOS } = {}) {
  await waitForServer(DEFAULT_BASE_URL);
  const { chromium } = await loadPlaywright();

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(ROOT, SHOTS_DIR, runId);
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    runId,
    capturedAt: new Date().toISOString(),
    baseUrl: DEFAULT_BASE_URL,
    shots: [],
  };

  const browser = await chromium.launch({ headless: true });

  try {
    for (const vpKey of viewports) {
      const vp = VIEWPORTS[vpKey];
      if (!vp) continue;

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      for (const scenario of scenarios) {
        const filename = `${vp.label}-${scenario.id}.png`;
        const filePath = path.join(outDir, filename);
        try {
          await runScenario(page, scenario);
          await page.screenshot({ path: filePath, fullPage: true });
          manifest.shots.push({
            id: `${vp.label}-${scenario.id}`,
            scenario: scenario.id,
            viewport: vp.label,
            label: scenario.label,
            path: path.relative(ROOT, filePath).replace(/\\/g, '/'),
            width: vp.width,
            height: vp.height,
          });
          console.log(`✓ ${filename}`);
        } catch (err) {
          console.warn(`✗ ${filename}: ${err.message}`);
          manifest.shots.push({
            id: `${vp.label}-${scenario.id}`,
            scenario: scenario.id,
            viewport: vp.label,
            label: scenario.label,
            error: err.message,
          });
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, runId, outDir: path.relative(ROOT, outDir), manifestPath }, null, 2));
  return { runId, outDir, manifest, manifestPath };
}

const isMain = process.argv[1]?.endsWith('capture.mjs');
if (isMain) {
  captureAll().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

export { captureAll };
