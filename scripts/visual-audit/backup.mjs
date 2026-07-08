#!/usr/bin/env node
/**
 * Snapshot app code before autonomous polish. Restore with: npm run polish:undo
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKUP_EXTENSIONS, BACKUP_ROOTS, BACKUP_SKIP_DIRS } from './backup-paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BACKUPS_DIR = path.join(ROOT, 'scripts/visual-audit/backups');
const LATEST_PIN = path.join(ROOT, 'scripts/visual-audit/latest/backup-pin.json');

function shouldInclude(relPath) {
  const parts = relPath.split(/[/\\]/);
  if (parts.some((p) => BACKUP_SKIP_DIRS.has(p))) return false;
  return BACKUP_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

function walkDir(absDir, relBase, files = []) {
  if (!fs.existsSync(absDir)) return files;
  for (const name of fs.readdirSync(absDir)) {
    const abs = path.join(absDir, name);
    const rel = path.join(relBase, name).replace(/\\/g, '/');
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (BACKUP_SKIP_DIRS.has(name)) continue;
      walkDir(abs, rel, files);
    } else if (shouldInclude(rel)) {
      files.push({ abs, rel });
    }
  }
  return files;
}

export function createBackup({ label = 'pre-polish' } = {}) {
  const backupId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${label}`;
  const backupDir = path.join(BACKUPS_DIR, backupId);
  const filesDir = path.join(backupDir, 'files');
  fs.mkdirSync(filesDir, { recursive: true });

  const files = [];
  for (const root of BACKUP_ROOTS) {
    walkDir(path.join(ROOT, root), root, files);
  }

  const manifest = {
    backupId,
    label,
    createdAt: new Date().toISOString(),
    root: ROOT,
    fileCount: files.length,
    files: [],
  };

  for (const { abs, rel } of files) {
    const dest = path.join(filesDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
    manifest.files.push(rel);
  }

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  fs.mkdirSync(path.dirname(LATEST_PIN), { recursive: true });
  fs.writeFileSync(
    LATEST_PIN,
    JSON.stringify(
      {
        backupId,
        backupDir: path.relative(ROOT, backupDir).replace(/\\/g, '/'),
        createdAt: manifest.createdAt,
        fileCount: manifest.fileCount,
        restoreCommand: 'npm run polish:undo',
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(JSON.stringify({ ok: true, backupId, fileCount: manifest.fileCount, backupDir: path.relative(ROOT, backupDir) }, null, 2));
  return { backupId, backupDir, manifest };
}

const isMain = process.argv[1]?.endsWith('backup.mjs');
if (isMain) {
  const label = process.argv[2] || 'pre-polish';
  createBackup({ label });
}
