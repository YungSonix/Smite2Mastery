#!/usr/bin/env node
/**
 * Move completed tasks from Master Task List → 4-Archives/Tasks/
 * Run weekly: npm run vault:archive
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = path.join(ROOT, 'Vault');
const MASTER = path.join(VAULT, 'Master Task List.md');
const ARCHIVE_DIR = path.join(VAULT, '4-Archives', 'Tasks');

const COMPLETED_RE = /^- \[x\]/i;

function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function ensureDailyNote(date = new Date()) {
  const folder = path.join(VAULT, 'Daily');
  fs.mkdirSync(folder, { recursive: true });
  const key = date.toISOString().slice(0, 10);
  const file = path.join(folder, `${key}.md`);
  if (fs.existsSync(file)) return { created: false, path: file };

  const templatePath = path.join(VAULT, 'Templates', 'Daily note.md');
  let body = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf8')
    : `---\ntags:\n  - daily\n---\n\n# ${key}\n\n## Workout log\n\n- \n`;
  body = body.replace(/\{\{date:YYYY-MM-DD\}\}/g, key).replace(/\{\{DATE:YYYY-MM-DD\}\}/g, key);
  if (!body.includes(`# ${key}`)) {
    body = body.replace(/^# .+$/m, `# ${key}`);
  }
  fs.writeFileSync(file, body);
  return { created: true, path: file };
}

function archiveCompletedTasks() {
  if (!fs.existsSync(MASTER)) {
    console.log('No Master Task List.md found.');
    return 0;
  }

  const lines = fs.readFileSync(MASTER, 'utf8').split('\n');
  const kept = [];
  const archived = [];

  for (const line of lines) {
    if (COMPLETED_RE.test(line.trim())) {
      archived.push(line);
    } else {
      kept.push(line);
    }
  }

  if (archived.length === 0) {
    console.log('No completed tasks to archive.');
    return 0;
  }

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const weekKey = isoWeekKey();
  const archiveFile = path.join(ARCHIVE_DIR, `${weekKey}-completed.md`);
  const stamp = new Date().toISOString().slice(0, 10);

  let archiveBody = '';
  if (fs.existsSync(archiveFile)) {
    archiveBody = fs.readFileSync(archiveFile, 'utf8');
  } else {
    archiveBody = `# Completed tasks — ${weekKey}\n\n_Auto-archived from [[Master Task List]]_\n`;
  }

  archiveBody += `\n## ${stamp}\n\n${archived.join('\n')}\n`;
  fs.writeFileSync(archiveFile, archiveBody);
  fs.writeFileSync(MASTER, kept.join('\n').replace(/\n{3,}/g, '\n\n'));

  console.log(`Archived ${archived.length} task(s) → 4-Archives/Tasks/${weekKey}-completed.md`);
  return archived.length;
}

function main() {
  const daily = ensureDailyNote();
  if (daily.created) {
    console.log(`Created daily note: Daily/${path.basename(daily.path)}`);
  }

  const n = archiveCompletedTasks();
  console.log(n > 0 ? 'Archive done.' : 'Nothing to archive (mark tasks [x] when done).');
}

main();
