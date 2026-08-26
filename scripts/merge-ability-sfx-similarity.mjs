#!/usr/bin/env node
/**
 * Merge artifacts/sfx-sim/part-*.json → formative-web/src/lib/triviaAbilitySfxSimilarity.json
 * Usage: node scripts/merge-ability-sfx-similarity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PART_DIR = path.join(ROOT, 'artifacts/sfx-sim');
const DEST = path.join(ROOT, 'formative-web/src/lib/triviaAbilitySfxSimilarity.json');

function loadParts() {
  if (!fs.existsSync(PART_DIR)) return [];
  return fs
    .readdirSync(PART_DIR)
    .filter((f) => /^part-\d+\.json$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => {
      const full = path.join(PART_DIR, f);
      return { file: f, data: JSON.parse(fs.readFileSync(full, 'utf8')) };
    });
}

function main() {
  const parts = loadParts();
  if (!parts.length) {
    console.error(`No part-*.json under ${PART_DIR}`);
    process.exit(1);
  }
  const byUrl = {};
  let n = 0;
  for (const { data } of parts) {
    for (const row of data.results || []) {
      if (!row?.url) continue;
      byUrl[row.url] = {
        id: row.id || null,
        kind: row.kind || null,
        god: row.god || null,
        ability: row.ability || null,
        slot: row.slot ?? null,
        label: row.label || null,
        similar: (row.neighbors || []).map((nb) => ({
          url: nb.url,
          label: nb.label,
          god: nb.god,
          ability: nb.ability,
          slot: nb.slot,
          kind: nb.kind,
          distance: nb.distance,
        })),
      };
      n += 1;
    }
  }
  const out = {
    generatedAt: new Date().toISOString(),
    sourceParts: parts.map(({ file, data }) => ({
      file,
      shard: data.shard,
      analyzedInShard: data.analyzedInShard,
      generatedAt: data.generatedAt,
    })),
    count: n,
    byUrl,
  };
  fs.writeFileSync(DEST, `${JSON.stringify(out)}\n`);
  console.log(`Merged ${parts.length} parts (${n} urls) → ${DEST}`);
}

main();
