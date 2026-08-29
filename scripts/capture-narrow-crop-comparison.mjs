#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'artifacts', 'narrow-crop-comparison.html');
const OUT = path.join(ROOT, 'artifacts', 'narrow-crop-comparison.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
await page.goto(`file:///${HTML.replace(/\\/g, '/')}`, { waitUntil: 'load' });
await page.waitForTimeout(300);
await page.screenshot({ path: OUT, fullPage: true });
await browser.close();
console.log('Wrote', OUT);
