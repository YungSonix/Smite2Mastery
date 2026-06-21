#!/usr/bin/env node
/**
 * Council / Chair → repo board writes + mod log + vault sync.
 * Used by: npm run council:write-task | council:write-bug | council:mod-log
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MOD_LOG_PATH = path.join(ROOT, 'docs', 'council', 'ui', 'mod-log.json');
const SESSION_PATH = path.join(ROOT, 'docs', 'council', 'sessions', 'latest.json');

function readSessionId() {
  try {
    if (!fs.existsSync(SESSION_PATH)) return null;
    const raw = fs.readFileSync(SESSION_PATH, 'utf8').trim();
    if (!raw) return null;
    return JSON.parse(raw).id ?? null;
  } catch {
    return null;
  }
}

function readModLog() {
  if (!fs.existsSync(MOD_LOG_PATH)) return { entries: [] };
  try {
    const raw = fs.readFileSync(MOD_LOG_PATH, 'utf8').trim();
    if (!raw) return { entries: [] };
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
}

function writeModLog(data) {
  fs.mkdirSync(path.dirname(MOD_LOG_PATH), { recursive: true });
  const tmp = `${MOD_LOG_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, MOD_LOG_PATH);
}

export function appendModLogEntry({ actor = 'chair', action, file, summary, sessionId = null }) {
  const log = readModLog();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor,
    action,
    file: file.replace(/\\/g, '/'),
    summary: String(summary ?? '').trim(),
    sessionId: sessionId ?? readSessionId(),
  };
  log.entries = [...(log.entries ?? []), entry].slice(-200);
  writeModLog(log);
  return entry;
}

function insertAfterSection(md, sectionHeader, line) {
  const idx = md.indexOf(sectionHeader);
  if (idx === -1) return `${md.trimEnd()}\n\n${sectionHeader}\n\n${line}\n`;
  const afterHeader = idx + sectionHeader.length;
  const rest = md.slice(afterHeader);
  const nextSection = rest.search(/\n## /);
  const block = nextSection === -1 ? rest : rest.slice(0, nextSection);
  const tail = nextSection === -1 ? '' : rest.slice(nextSection);
  const trimmedBlock = block.replace(/\n- \[ \] _Add bugs here_\n?/, '\n');
  const beforeTail = trimmedBlock.endsWith('\n') ? trimmedBlock : `${trimmedBlock}\n`;
  const tailNorm = tail.startsWith('\n') ? tail : `\n${tail}`;
  return `${md.slice(0, afterHeader)}${beforeTail}${line}\n${tailNorm}`;
}

export function appendOpenBug(title, opts = {}) {
  const filePath = path.join(ROOT, 'BUGS.md');
  const md = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '# Bugs\n\n## Open\n\n## Fixed\n';
  const clean = String(title).replace(/\*\*/g, '').trim();
  if (!clean) return { ok: false, error: 'title required' };
  const line = `- [ ] **${clean}**${opts.investigating ? '' : ''}`;
  const section = opts.investigating ? '## Investigating' : '## Open';
  const next = insertAfterSection(md, section, line);
  fs.writeFileSync(filePath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
  const entry = appendModLogEntry({
    actor: opts.actor ?? 'chair',
    action: 'write-bug',
    file: 'BUGS.md',
    summary: `Added bug: ${clean}`,
    sessionId: opts.sessionId,
  });
  return { ok: true, file: 'BUGS.md', title: clean, entry };
}

export function appendPendingTask(title, tags = [], opts = {}) {
  const filePath = path.join(ROOT, 'TASKS.md');
  const md = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '# Tasks\n\n## Pending\n\n## Completed\n';
  const clean = String(title).replace(/\*\*/g, '').trim();
  if (!clean) return { ok: false, error: 'title required' };
  const tagList = [...new Set(['#dev', '#council', ...tags.map((t) => (t.startsWith('#') ? t : `#${t}`))])];
  const line = `- [ ] **${clean}** ${tagList.join(' ')}`;
  const next = insertAfterSection(md, '## Pending', line);
  fs.writeFileSync(filePath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
  const entry = appendModLogEntry({
    actor: opts.actor ?? 'chair',
    action: 'write-task',
    file: 'TASKS.md',
    summary: `Added task: ${clean} (${tagList.join(' ')})`,
    sessionId: opts.sessionId,
  });
  return { ok: true, file: 'TASKS.md', title: clean, tags: tagList, entry };
}

export function syncVaultBoards() {
  try {
    execSync('npm run vault:sync', { cwd: ROOT, stdio: 'pipe', shell: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.stderr ?? err.message ?? err) };
  }
}

export function applyWriteWithVault(writeFn, ...args) {
  const result = writeFn(...args);
  if (!result.ok) return result;
  const sync = syncVaultBoards();
  appendModLogEntry({
    actor: 'system',
    action: 'vault-sync',
    file: 'Vault/',
    summary: sync.ok ? 'Vault Kanban + _generated/ refreshed' : `Vault sync failed: ${sync.error}`,
    sessionId: result.entry?.sessionId,
  });
  return { ...result, vaultSync: sync };
}

export function getModLogEntries({ sessionId = null, limit = 30 } = {}) {
  const log = readModLog();
  let entries = log.entries ?? [];
  if (sessionId) entries = entries.filter((e) => e.sessionId === sessionId);
  return entries.slice(-limit);
}

function cleanTaskTitle(s) {
  return String(s ?? '')
    .replace(/\*\*/g, '')
    .replace(/^[-•]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:]+$/, '');
}

export function inferTaskTags(title) {
  const t = title.toLowerCase();
  const tags = [];
  if (/build|god|item|tier|database|conquest|custom|map/.test(t)) tags.push('#builds');
  if (/shop|gold|currency|profile|cosmetic/.test(t)) tags.push('#shop');
  if (/prophecy|wordle|minigame|tcg|smite wars/.test(t)) tags.push('#prophecy');
  if (/guide|community guide/.test(t)) tags.push('#guides');
  if (/patch note|wallpaper|icon|builds\.json|voice|skin|data sync/.test(t)) tags.push('#data');
  if (/patch hub|catch.?up/.test(t)) tags.push('#patch');
  if (/vault|expo|council|reorganiz|clean up code|platform|infra/.test(t)) tags.push('#platform');
  return tags;
}

export function readPendingTaskTitles() {
  const filePath = path.join(ROOT, 'TASKS.md');
  if (!fs.existsSync(filePath)) return [];
  const md = fs.readFileSync(filePath, 'utf8');
  const pendingIdx = md.indexOf('## Pending');
  if (pendingIdx === -1) return [];
  const completedIdx = md.indexOf('\n## Completed', pendingIdx);
  const block = completedIdx === -1 ? md.slice(pendingIdx) : md.slice(pendingIdx, completedIdx);
  const titles = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^- \[ \] \*\*(.+?)\*\*/);
    if (m) titles.push(m[1].trim().toLowerCase());
  }
  return titles;
}

function normalizeKey(title) {
  return cleanTaskTitle(title).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function taskAlreadyPending(title, existing = null) {
  const key = normalizeKey(title);
  if (!key || key.length < 6) return false;
  const pending = existing ?? readPendingTaskTitles();
  return pending.some((p) => {
    const pk = normalizeKey(p);
    return pk === key || pk.includes(key) || key.includes(pk);
  });
}

/**
 * Pull actionable titles from Final Verdict + council transcript.
 * Chair can also use TASK: Item one; TASK: Item two in the verdict string.
 */
export function extractTasksFromVerdict(decision, context = {}) {
  const { topic = '', messages = [] } = context;
  const tasks = [];
  const seen = new Set();

  function add(raw) {
    let t = cleanTaskTitle(raw);
    t = t.replace(/^(?:one|three|a|the)\s+/i, '').trim();
    if (!t || t.length < 8 || t.length > 140) return;
    const key = normalizeKey(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    tasks.push(t);
  }

  const decisionStr = String(decision ?? '').trim();
  const transcript = [...(messages ?? []).map((m) => m.text), decisionStr, topic].join('\n');

  for (const m of decisionStr.matchAll(/\bTASK:\s*([^;\n|]+)/gi)) add(m[1]);

  for (const m of transcript.matchAll(/\bGOALS items?\s*[—–:-]\s*([^.!\n]+)/gi)) {
    for (const part of m[1].split(/,\s*(?:and\s+)?|\s+and\s+/)) add(part);
  }

  for (const m of decisionStr.matchAll(/(?:next convene|next step|then|action plan):\s*([^.]+)/gi)) {
    for (const part of m[1].split(/\s+and\s+/)) add(part);
  }

  for (const m of decisionStr.matchAll(
    /\b(?:ship|pick|rank|prioritize|implement|fix|build|add|update|work on|normalize|clean up|improve|create)\s+(?:one|three|\d+|a|the)?\s*([^.—;]+?)(?=\s+and\s+[a-z]|[.—;]|$)/gi
  )) {
    add(m[1]);
  }

  for (const m of transcript.matchAll(
    /\b(?:Conquest Map|builds cleanup|currency system|clean up [Cc]ode|patch notes|custom builder|Prophecy|Patch Hub)\b[^.!,\n]*/gi
  )) {
    add(m[0]);
  }

  return dedupeSupersetTasks(tasks).slice(0, 8);
}

function dedupeSupersetTasks(tasks) {
  return tasks.filter((t) => {
    const key = normalizeKey(t);
    return !tasks.some((other) => {
      if (other === t) return false;
      const ok = normalizeKey(other);
      return ok.length > key.length + 8 && ok.includes(key);
    });
  });
}

/** After council:decide — write extracted tasks, mod log each, vault sync once. */
export function applyVerdictTaskExtraction(decision, context = {}) {
  const titles = extractTasksFromVerdict(decision, context);
  if (!titles.length) {
    return { ok: true, extracted: 0, wrote: 0, skipped: 0, tasks: [] };
  }

  const existing = readPendingTaskTitles();
  const results = [];
  let wrote = 0;
  let skipped = 0;

  for (const title of titles) {
    if (taskAlreadyPending(title, existing)) {
      skipped++;
      results.push({ title, skipped: true, reason: 'already in TASKS.md Pending' });
      continue;
    }
    const tags = inferTaskTags(title);
    const r = appendPendingTask(title, tags, {
      actor: 'chair',
      sessionId: context.sessionId ?? readSessionId(),
    });
    if (r.ok) {
      wrote++;
      existing.push(normalizeKey(title));
      results.push(r);
    }
  }

  if (wrote > 0) {
    appendModLogEntry({
      actor: 'system',
      action: 'verdict-extract',
      file: 'TASKS.md',
      summary: `Auto-extracted ${wrote} task(s) from Final Verdict`,
      sessionId: context.sessionId ?? readSessionId(),
    });
    const sync = syncVaultBoards();
    appendModLogEntry({
      actor: 'system',
      action: 'vault-sync',
      file: 'Vault/',
      summary: sync.ok
        ? `Vault refreshed after verdict task extract (${wrote} new)`
        : `Vault sync failed: ${sync.error}`,
      sessionId: context.sessionId ?? readSessionId(),
    });
  }

  return { ok: true, extracted: titles.length, wrote, skipped, tasks: titles, results };
}

function parseTags(rest) {
  const tags = [];
  const titleParts = [];
  for (const part of rest) {
    if (/^#[\w-]+$/.test(part)) tags.push(part);
    else titleParts.push(part);
  }
  return { title: titleParts.join(' ').replace(/^["']|["']$/g, ''), tags };
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  switch (cmd) {
    case 'bug': {
      const title = rest.join(' ').replace(/^["']|["']$/g, '');
      console.log(JSON.stringify(applyWriteWithVault(appendOpenBug, title), null, 2));
      break;
    }
    case 'task': {
      const { title, tags } = parseTags(rest);
      console.log(JSON.stringify(applyWriteWithVault(appendPendingTask, title, tags), null, 2));
      break;
    }
    case 'mod-log': {
      const sessionId = rest[0] === '--session' ? rest[1] : null;
      console.log(JSON.stringify({ entries: getModLogEntries({ sessionId }) }, null, 2));
      break;
    }
    case 'sync-vault': {
      const sync = syncVaultBoards();
      if (sync.ok) {
        appendModLogEntry({
          actor: 'system',
          action: 'vault-sync',
          file: 'Vault/',
          summary: 'Manual vault sync',
        });
      }
      console.log(JSON.stringify(sync, null, 2));
      break;
    }
    case 'extract-verdict': {
      const decision = rest.join(' ').replace(/^["']|["']$/g, '');
      console.log(JSON.stringify(applyVerdictTaskExtraction(decision, { topic: '' }), null, 2));
      break;
    }
    default:
      console.log(`Usage:
  node scripts/council-repo-writes.mjs bug "Title"
  node scripts/council-repo-writes.mjs task "Title" #builds #shop
  node scripts/council-repo-writes.mjs mod-log [--session <id>]
  node scripts/council-repo-writes.mjs sync-vault
  node scripts/council-repo-writes.mjs extract-verdict "Final verdict text…"`);
      process.exit(cmd ? 1 : 0);
  }
}

if (process.argv[1]?.includes('council-repo-writes')) {
  main();
}
