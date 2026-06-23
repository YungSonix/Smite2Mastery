#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../config/dataPaths');

const OUT = path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-batch-b-data.json');
const PARTS = [
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-batch-b-data-partial.json'),
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-batch-b-data-egyptian.json'),
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-batch-b-data-norse.json'),
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-norse-batch-b-data.json'),
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-batch-b-data-mayan.json'),
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-mayan-batch-b-data.json'),
  path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-agent-c-mayan-data.json'),
];

const merged = { gods: [] };
const seen = new Set();

function mergeGods(data) {
  for (const god of data.gods || []) {
    const key = `${god.folder}|${god.godName}`;
    if (seen.has(key)) {
      const idx = merged.gods.findIndex((g) => `${g.folder}|${g.godName}` === key);
      merged.gods[idx] = god;
    } else {
      seen.add(key);
      merged.gods.push(god);
    }
  }
}

for (const part of PARTS) {
  if (!fs.existsSync(part)) continue;
  mergeGods(JSON.parse(fs.readFileSync(part, 'utf8')));
}

// Egyptian agent may write directly to OUT — fold in before overwrite
if (fs.existsSync(OUT)) {
  try {
    mergeGods(JSON.parse(fs.readFileSync(OUT, 'utf8')));
  } catch {
    /* ignore */
  }
}

fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log(`Merged ${merged.gods.length} gods → ${OUT}`);
