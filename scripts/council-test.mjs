#!/usr/bin/env node
/**
 * Smoke-test council CLI + config (no LLM calls).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { readCouncilPaths } from './council-paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COUNCIL = path.join(ROOT, 'docs', 'council');
const CONFIG = path.join(COUNCIL, 'council.config.json');
const { cursorProjectSlug } = readCouncilPaths(ROOT);
const CANVAS = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.cursor/projects',
  cursorProjectSlug,
  'canvases/council-live.canvas.tsx'
);

function run(args) {
  return spawnSync('node', [path.join(__dirname, 'council.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const ids = config.members.map((m) => m.id);
const expected = ['nala', 'london', 'fasa'];
const missing = expected.filter((id) => !ids.includes(id));
if (missing.length) {
  console.error('FAIL: missing members in config:', missing.join(', '));
  process.exit(1);
}

for (const id of expected) {
  for (const file of [`identities/${id}.md`,]) {
    if (!fs.existsSync(path.join(COUNCIL, file))) {
      console.error('FAIL: missing', file);
      process.exit(1);
    }
  }
}

const prep = run(['prepare', 'Council smoke test — is the pipeline wired?']);
if (prep.status !== 0) {
  console.error('FAIL: council prepare', prep.stderr || prep.stdout);
  process.exit(1);
}

for (const id of expected) {
  const pr = run(['prompt', id]);
  if (pr.status !== 0 || !pr.stdout.includes('Council member')) {
    console.error('FAIL: council prompt', id);
    process.exit(1);
  }
}

console.log('Council smoke test passed.\n');
console.log('Config members:', expected.join(', '));
console.log('Session:', JSON.parse(fs.readFileSync(path.join(COUNCIL, 'sessions/latest.json'), 'utf8')).id);
console.log('Canvas file exists:', fs.existsSync(CANVAS));
console.log('\nManual UI test (Council Live canvas):');
console.log('  1. Type a topic → Convene council → new agent chat should open');
console.log('  2. Save models to config → agent should sync council.config.json');
console.log('  3. Ask Nala / London / Fasa → solo chat opens');
console.log('\nManual agent test (in chat):');
console.log('  Convene council on: Council smoke test — is the pipeline wired?');
