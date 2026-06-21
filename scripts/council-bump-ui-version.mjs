#!/usr/bin/env node
/**
 * Bump docs/council/ui/version.json — run after any panel HTML/CSS/JS change.
 * Server injects this into index.html cache-busters; app shows update bar on refresh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'council',
  'ui',
  'version.json'
);

const data = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
const next = Number(data.version || 0) + 1;
const out = {
  version: next,
  updatedAt: new Date().toISOString(),
};
fs.writeFileSync(VERSION_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`Council UI → chat v${next}`);
console.log('Add highlights for this version in docs/council/ui/changelog.mjs');
