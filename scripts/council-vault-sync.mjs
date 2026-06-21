#!/usr/bin/env node
/**
 * Sync council personalities + session transcripts → Obsidian Vault + markdown RAG.
 * Vault/ is gitignored (local Obsidian). Repo copies live in docs/council/sessions/*.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COUNCIL_DIR = path.join(ROOT, 'docs', 'council');
const IDENTITIES_DIR = path.join(COUNCIL_DIR, 'identities');
const SESSIONS_DIR = path.join(COUNCIL_DIR, 'sessions');
const VAULT_COUNCIL = path.join(ROOT, 'Vault', '3-Resources', 'Council');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function escapeMd(s) {
  return String(s ?? '').replace(/\r/g, '');
}

function copyMarkdownWithFrontmatter(src, dest, meta = {}) {
  const body = fs.readFileSync(src, 'utf8').replace(/^\uFEFF?---[\s\S]*?---\n*/m, '');
  const tags = meta.tags ?? [];
  const lines = ['---'];
  if (tags.length) lines.push(`tags: [${tags.join(', ')}]`);
  if (meta.vaultZone) lines.push(`vault-zone: ${meta.vaultZone}`);
  lines.push('---', '', body.trimStart());
  fs.writeFileSync(dest, lines.join('\n') + '\n', 'utf8');
}

const COUNCIL_DOC_MAP = [
  ['README.md', 'Council Quick Start.md', ['council', 'guide']],
  ['CHAIR_SETUP.md', 'Chair Setup.md', ['council', 'setup']],
  ['OPEN_COUNCIL_LIVE.md', 'Open Council Live.md', ['council', 'guide']],
  ['COUNCIL_SYSTEM.md', 'Council System.md', ['council', 'system']],
  ['ui/README.md', 'Council Panel UI.md', ['council', 'ui']],
];

export function sessionToMarkdown(session) {
  const lines = [
    '---',
    `id: ${session.id}`,
    `topic: "${String(session.topic ?? '').replace(/"/g, '\\"')}"`,
    `status: ${session.status ?? 'unknown'}`,
    `created: ${session.createdAt ?? ''}`,
    session.completedAt ? `completed: ${session.completedAt}` : null,
    'tags: [council, session]',
    '---',
    '',
    `# Council — ${session.topic}`,
    '',
    `**Session:** \`${session.id}\` · **Status:** ${session.status ?? 'unknown'}`,
    '',
  ].filter(Boolean);

  const rounds = [1, 2];
  for (const round of rounds) {
    const items = (session.messages ?? []).filter((m) => m.round === round);
    if (!items.length) continue;
    lines.push(`## Round ${round}`, '');
    for (const m of items) {
      const label = String(m.member).toUpperCase();
      lines.push(`### ${label} · R${m.round}`, '', escapeMd(m.text), '');
    }
  }

  if (session.decision) {
    lines.push('## FINAL VERDICT', '', escapeMd(session.decision), '');
  }

  lines.push('---', '*Exported from Council Chamber — used for RAG memory.*', '');
  return lines.join('\n');
}

export function exportSessionMarkdown(session) {
  if (!session?.id) return { ok: false, reason: 'no session id' };
  ensureDir(SESSIONS_DIR);
  const mdPath = path.join(SESSIONS_DIR, `${session.id}.md`);
  fs.writeFileSync(mdPath, sessionToMarkdown(session), 'utf8');
  return { ok: true, mdPath };
}

export function syncCouncilToVault() {
  const result = { ok: true, vault: VAULT_COUNCIL, exported: [] };
  if (!fs.existsSync(path.join(ROOT, 'Vault'))) {
    result.skipped = 'Vault/ folder not found — create it and open in Obsidian, then re-run';
    return result;
  }

  const personalitiesDir = path.join(VAULT_COUNCIL, 'Personalities');
  const sessionsDir = path.join(VAULT_COUNCIL, 'Sessions');
  ensureDir(personalitiesDir);
  ensureDir(sessionsDir);

  if (fs.existsSync(IDENTITIES_DIR)) {
    for (const file of fs.readdirSync(IDENTITIES_DIR).filter((f) => f.endsWith('.md'))) {
      const src = path.join(IDENTITIES_DIR, file);
      const dest = path.join(personalitiesDir, file.replace(/^_shared/, 'Shared'));
      copyMarkdownWithFrontmatter(src, dest, { tags: ['council', 'personality'], vaultZone: 'council' });
      result.exported.push(`personalities/${path.basename(dest)}`);
    }
  }

  for (const [srcName, destName, tags] of COUNCIL_DOC_MAP) {
    const src = path.join(COUNCIL_DIR, srcName);
    if (!fs.existsSync(src)) continue;
    copyMarkdownWithFrontmatter(src, path.join(VAULT_COUNCIL, destName), {
      tags,
      vaultZone: 'council',
    });
    result.exported.push(destName);
  }

  if (fs.existsSync(SESSIONS_DIR)) {
    for (const file of fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.md'))) {
      fs.copyFileSync(path.join(SESSIONS_DIR, file), path.join(sessionsDir, file));
      result.exported.push(`sessions/${file}`);
    }
    for (const file of fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json') && f !== 'latest.json')) {
      try {
        const session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8'));
        if (!session.topic) continue;
        const md = exportSessionMarkdown(session);
        if (md.ok) {
          fs.copyFileSync(md.mdPath, path.join(sessionsDir, `${session.id}.md`));
          result.exported.push(`sessions/${session.id}.md`);
        }
      } catch {
        /* skip bad json */
      }
    }
  }

  const index = [
    '---',
    'tags: [council, hub]',
    'vault-zone: council',
    '---',
    '',
    '# Council (Obsidian)',
    '',
    'Multi-model AI panel (**Nala**, **London**, **Fasa**) — personalities, session memory, and verdicts for app decisions. Synced from `docs/council/` via **npm run vault:sync**.',
    '',
    '> [!vault-council] Live panel',
    '> **npm run council:ui** → http://localhost:3939 · [[Chair Setup]] · [[Open Council Live]] · [[Council Quick Start]]',
    '',
    '> [!vault-council] For app work',
    '> Read [[Council System]] before convening · Session transcripts below feed council RAG · Repo source: `_repo/docs/council/`',
    '',
    '## Personalities',
    '',
    '- [[Personalities/nala|Nala — Contrarian]]',
    '- [[Personalities/london|London — First principles]]',
    '- [[Personalities/fasa|Fasa — Expansionist]]',
    '- [[Personalities/Shared-smite-lens|Shared Smite companion lens]]',
    '',
    '## Guides',
    '',
    '- [[Council Quick Start]]',
    '- [[Chair Setup]]',
    '- [[Open Council Live]]',
    '- [[Council Panel UI]]',
    '- [[Council System]]',
    '',
    '## Sessions',
    '',
    ...fs
      .readdirSync(sessionsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 30)
      .map((f) => `- [[Sessions/${f.replace(/\.md$/, '')}|${f.replace(/\.md$/, '')}]]`),
    '',
    `*Last sync: ${new Date().toISOString()}*`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(VAULT_COUNCIL, 'Council Index.md'), index, 'utf8');
  result.exported.push('Council Index.md');
  return result;
}

export function readVaultSessionSnippets(topic, maxChars = 6000) {
  if (!fs.existsSync(VAULT_COUNCIL)) return '';
  const sessionsDir = path.join(VAULT_COUNCIL, 'Sessions');
  if (!fs.existsSync(sessionsDir)) return '';
  const words = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const files = fs
    .readdirSync(sessionsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ f, m: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 40);

  const scored = files.map(({ f }) => {
    const raw = fs.readFileSync(path.join(sessionsDir, f), 'utf8');
    const hay = raw.toLowerCase();
    const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    return { f, raw, score };
  });
  scored.sort((a, b) => b.score - a.score || b.f.localeCompare(a.f));
  const picks = (scored.some((x) => x.score > 0) ? scored.filter((x) => x.score > 0) : scored).slice(0, 4);
  let out = picks.map((p) => `### ${p.f}\n${p.raw.slice(0, 1800)}`).join('\n\n');
  if (out.length > maxChars) out = out.slice(0, maxChars) + '\n…(truncated)';
  return out;
}

if (process.argv[1]?.includes('council-vault-sync')) {
  const sessionOnly = process.argv.includes('--session-only');
  if (sessionOnly) {
    const latest = path.join(SESSIONS_DIR, 'latest.json');
    if (!fs.existsSync(latest)) {
      console.error('No latest.json');
      process.exit(1);
    }
    const session = JSON.parse(fs.readFileSync(latest, 'utf8'));
    console.log(JSON.stringify(exportSessionMarkdown(session), null, 2));
    console.log(JSON.stringify(syncCouncilToVault(), null, 2));
  } else {
    console.log(JSON.stringify(syncCouncilToVault(), null, 2));
  }
}
