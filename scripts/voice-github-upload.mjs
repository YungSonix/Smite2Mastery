/**
 * Commit + push VoiceAudio in god-folder batches (avoids single giant push timeouts).
 *
 *   node scripts/voice-github-upload.mjs commit --batches 6
 *   node scripts/voice-github-upload.mjs push --batches 6
 *   node scripts/voice-github-upload.mjs all --batches 6
 *   node scripts/voice-github-upload.mjs push --batch 3 --batches 6
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const voiceRoot = path.join(root, 'app', 'data', 'VoiceAudio');
const args = process.argv.slice(2);
const mode = args[0] || 'all';
const batchCount = Number(args.find((a, i) => args[i - 1] === '--batches') || 6);
const onlyBatch = Number(args.find((a, i) => args[i - 1] === '--batch') || 0);

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
  return r;
}

function listGods() {
  if (!fs.existsSync(voiceRoot)) {
    console.error('Missing', voiceRoot);
    process.exit(1);
  }
  return fs
    .readdirSync(voiceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function splitBatches(items, n) {
  const batches = Array.from({ length: n }, () => []);
  items.forEach((item, i) => batches[i % n].push(item));
  return batches.filter((b) => b.length);
}

function commitBatches(batches) {
  batches.forEach((gods, i) => {
    const n = i + 1;
    if (onlyBatch && n !== onlyBatch) return;
    const paths = gods.map((g) => path.join('app', 'data', 'VoiceAudio', g));
    console.log(`\n=== Commit batch ${n}/${batches.length} (${gods.length} gods) ===`);
    console.log(gods.join(', '));
    run('git', ['add', '--', ...paths]);
    const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root });
    if (diff.status === 0) {
      console.log('(no changes in this batch — skip commit)');
      return;
    }
    run('git', [
      'commit',
      '-m',
      `voice: upload batch ${n}/${batches.length} (${gods.length} gods)\n\nGods: ${gods.join(', ')}`,
    ]);
  });
}

function getVoiceUploadCommits(batches) {
  const r = spawnSync(
    'git',
    ['log', '--format=%H', '--grep=voice: upload batch', `-n${batches.length}`],
    { cwd: root, encoding: 'utf8' }
  );
  if (r.status !== 0) process.exit(1);
  return r.stdout.trim().split('\n').filter(Boolean).reverse();
}

function pushMaster() {
  console.log('\n=== Push master → origin ===');
  run('git', ['push', 'origin', 'master']);
}

function pushBatches(batches) {
  const commits = getVoiceUploadCommits(batches);
  if (commits.length === 0) {
    console.error('No voice: upload batch commits found. Run commit first.');
    process.exit(1);
  }
  commits.forEach((rev, i) => {
    const n = i + 1;
    if (onlyBatch && n !== onlyBatch) return;
    const branch = `voice-upload-${n}`;
    console.log(`\n=== Push batch ${n} → origin/${branch} (${rev.slice(0, 8)}) ===`);
    run('git', ['push', '-u', 'origin', `${rev}:refs/heads/${branch}`]);
  });
  console.log('\nBatch branches pushed. Merge voice-upload-* → master on GitHub if not using push-master.');
}

function main() {
  const gods = listGods();
  const batches = splitBatches(gods, batchCount);
  console.log(`VoiceAudio: ${gods.length} god folders → ${batches.length} batches`);
  if (mode === 'commit' || mode === 'all') commitBatches(batches);
  if (mode === 'push-master') pushMaster();
  if (mode === 'push' || mode === 'all') {
    pushMaster();
  }
}

main();
