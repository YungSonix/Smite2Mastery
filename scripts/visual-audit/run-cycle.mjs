#!/usr/bin/env node
/**
 * Full autonomous polish cycle: capture screenshots → council brief → agent queue.
 * Dev server must be running (npm run web).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureAll } from './capture.mjs';
import { prepareBriefFromManifest } from './prepare-brief.mjs';
import { createBackup } from './backup.mjs';
import { SHOTS_DIR } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

async function main() {
  console.log('=== Polish cycle: backup ===');
  const backup = createBackup({ label: 'pre-polish' });

  console.log('\n=== Polish cycle: capture ===');
  const { runId, outDir, manifest } = await captureAll();
  const runDirRel = path.join(SHOTS_DIR, runId).replace(/\\/g, '/');

  console.log('\n=== Polish cycle: prepare brief + council queue ===');
  const brief = prepareBriefFromManifest(manifest, runDirRel);

  console.log('\n=== Ready for autonomous agent ===');
  console.log(JSON.stringify({ ok: true, runId, outDir, backupId: backup.backupId, ...brief }, null, 2));
  console.log('\nUndo all polish changes: npm run polish:undo');
  console.log('Next: In Cursor Agents, say  @autonomous-polish.mdc go');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
