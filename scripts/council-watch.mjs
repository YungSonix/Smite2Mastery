#!/usr/bin/env node
/** Watch Council Live canvas state → auto-sync models to council.config.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { canvasDataPath } from './council-paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CANVAS_DATA = canvasDataPath(ROOT);

function sync() {
  const r = spawnSync('node', [path.join(__dirname, 'council.mjs'), 'sync-canvas'], {
    encoding: 'utf8',
  });
  if (r.status === 0) {
    const out = JSON.parse(r.stdout);
    if (out.updated?.length) {
      console.log(`[council:watch] synced: ${out.updated.map((u) => `${u.id}=${u.model}`).join(', ')}`);
    }
  }
}

console.log('Council model auto-sync watching:', CANVAS_DATA);
console.log('Change a dropdown in Council Live — config updates here. Ctrl+C to stop.\n');

sync();

if (!fs.existsSync(CANVAS_DATA)) {
  console.log('Waiting for canvas data file (open Council Live once)…');
}

let timer = null;
try {
  fs.watch(CANVAS_DATA, () => {
    clearTimeout(timer);
    timer = setTimeout(sync, 120);
  });
} catch {
  console.error('Could not watch file. Run council:sync-canvas manually after model changes.');
  process.exit(1);
}
