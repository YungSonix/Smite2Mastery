#!/usr/bin/env node
/**
 * Restore all files from the latest polish backup (npm run polish:undo).
 * Pass backup id: npm run polish:undo -- 2026-07-06T...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BACKUPS_DIR = path.join(ROOT, 'scripts/visual-audit/backups');
const LATEST_PIN = path.join(ROOT, 'scripts/visual-audit/latest/backup-pin.json');

function resolveBackupDir(backupIdArg) {
  if (backupIdArg) {
    const dir = path.join(BACKUPS_DIR, backupIdArg);
    if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
      throw new Error(`Backup not found: ${backupIdArg}`);
    }
    return dir;
  }
  if (!fs.existsSync(LATEST_PIN)) {
    throw new Error('No backup pin found. Run: npm run polish:backup');
  }
  const pin = JSON.parse(fs.readFileSync(LATEST_PIN, 'utf8'));
  const dir = path.join(ROOT, pin.backupDir);
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
    throw new Error(`Backup missing at ${pin.backupDir}`);
  }
  return dir;
}

export function restoreBackup(backupIdArg) {
  const backupDir = resolveBackupDir(backupIdArg);
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
  const filesDir = path.join(backupDir, 'files');

  let restored = 0;
  for (const rel of manifest.files) {
    const src = path.join(filesDir, rel);
    const dest = path.join(ROOT, rel);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    restored++;
  }

  const result = {
    ok: true,
    backupId: manifest.backupId,
    restored,
    createdAt: manifest.createdAt,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const isMain = process.argv[1]?.endsWith('undo.mjs');
if (isMain) {
  try {
    restoreBackup(process.argv[2]);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
