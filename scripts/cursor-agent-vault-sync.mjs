#!/usr/bin/env node
/**
 * Sync docs/cursor-agents/ + SMITE2_DESIGN.md → Vault/3-Resources/Cursor agents/
 * Vault/ is gitignored. Repo is canonical for skills.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_AGENTS = path.join(ROOT, 'docs', 'cursor-agents');
const DESIGN_DOC =
  fs.existsSync(path.join(ROOT, 'docs', 'SMITE2_DESIGN.md'))
    ? path.join(ROOT, 'docs', 'SMITE2_DESIGN.md')
    : path.join(ROOT, 'docs', 'WILLOW_DESIGN.md');
const DESIGN_SKILL = 'smite2-design.md';
const COUNCIL_SESSIONS = path.join(ROOT, 'docs', 'council', 'sessions');
const VAULT_AGENTS = path.join(ROOT, 'Vault', '3-Resources', 'Cursor agents');

/** Council topics that become distilled research notes in Cursor agents/research/ */
const RESEARCH_TOPIC_RE = /\b(research|lookup|look up|what is|tell me about|find out)\b/i;

const REPO_RESEARCH_MIRROR = [];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function stripExistingFrontmatter(body) {
  return String(body).replace(/^\uFEFF?---[\s\S]*?---\n*/m, '');
}

function mergeFrontmatter(body, meta) {
  const clean = stripExistingFrontmatter(body).trimStart();
  const lines = ['---'];
  if (meta.tags?.length) lines.push(`tags: [${meta.tags.join(', ')}]`);
  if (meta.vaultZone) lines.push(`vault-zone: ${meta.vaultZone}`);
  for (const [k, v] of Object.entries(meta.extra ?? {})) {
    if (v != null && v !== '') lines.push(`${k}: ${v}`);
  }
  lines.push('---', '', clean);
  return lines.join('\n') + (clean.endsWith('\n') ? '' : '\n');
}

function copyFileWithMeta(src, dest, meta = {}) {
  const body = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dest, mergeFrontmatter(body, meta), 'utf8');
}

function copyIfNewerOrMissing(src, dest) {
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  const srcM = fs.statSync(src).mtimeMs;
  const destM = fs.statSync(dest).mtimeMs;
  if (srcM > destM) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function installObsidianSnippet() {
  const src = path.join(REPO_AGENTS, 'vault-colors.cursor-agents.css');
  if (!fs.existsSync(src)) return null;
  const snippetsDir = path.join(ROOT, 'Vault', '.obsidian', 'snippets');
  ensureDir(snippetsDir);
  const dest = path.join(snippetsDir, 'cursor-agents-vault.css');
  fs.copyFileSync(src, dest);
  return dest;
}

function patchVaultColorsSnippet() {
  const src = path.join(REPO_AGENTS, 'vault-colors.cursor-agents.css');
  const vaultColors = path.join(ROOT, 'Vault', '.obsidian', 'snippets', 'vault-colors.css');
  if (!fs.existsSync(src) || !fs.existsSync(vaultColors)) return false;
  const marker = '/* cursor-agents-vault-sync */';
  const block = fs.readFileSync(src, 'utf8');
  const wrapped = `${marker}\n${block}\n/* end cursor-agents-vault-sync */`;
  let existing = fs.readFileSync(vaultColors, 'utf8');
  const re = /\/\* cursor-agents-vault-sync \*\/[\s\S]*?\/\* end cursor-agents-vault-sync \*\//;
  if (re.test(existing)) {
    existing = existing.replace(re, wrapped);
  } else {
    existing = `${existing.trimEnd()}\n\n${wrapped}\n`;
  }
  if (!existing.includes('--vault-cursor-agent')) {
    existing = existing.replace(
      /:root\s*\{/,
      ':root {\n  --vault-cursor-agent: #4db8e8;'
    );
  }
  fs.writeFileSync(vaultColors, existing, 'utf8');
  return true;
}

function patchColorLegend() {
  const legend = path.join(ROOT, 'Vault', 'Color legend.md');
  if (!fs.existsSync(legend)) return false;
  const marker = '**Cursor agents**';
  let text = fs.readFileSync(legend, 'utf8');
  if (text.includes(marker)) return false;
  const row = '| 🩵 `#4db8e8` **Cursor agents** | `3-Resources/Cursor agents/` — Karpathy, DESIGN.md, agent skills |';
  text = text.replace(
    /(\| 🟪 `#b892e8` \*\*Council\*\*[^\n]+\n)/,
    `$1${row}\n`
  );
  const tagBlock = [
    '| `#cursor-agent` | Steel blue | Agent notes |',
    '| `#karpathy` | Amber | Minimal-first |',
    '| `#design-system` | Cyan | SMITE2 DESIGN.md |',
  ].join('\n');
  if (!text.includes('#cursor-agent')) {
    text = text.replace(
      /(\| `#council`[^\n]+\n)/,
      `$1${tagBlock}\n`
    );
  }
  fs.writeFileSync(legend, text, 'utf8');
  return true;
}

function patchDashboard() {
  const dash = path.join(ROOT, 'Vault', 'Dashboard.md');
  if (!fs.existsSync(dash)) return false;
  const marker = '3-Resources/Cursor agents/Cursor agents Index';
  let text = fs.readFileSync(dash, 'utf8');
  if (text.includes(marker)) return false;
  const block = [
    '',
    '> [!vault-cursor-agent] Cursor agents',
    '> [[3-Resources/Cursor agents/Cursor agents Index]] · [[3-Resources/Cursor agents/skills/00 Read first|00 Read first]] · `docs/SMITE2_DESIGN.md`',
    '',
  ].join('\n');
  const councilLine = '> [[3-Resources/Council/Council Index]]';
  if (text.includes(councilLine) && !text.includes(marker)) {
    text = text.replace(
      `${councilLine} · **npm run council:ui** → http://localhost:3939 · [[3-Resources/Council/Chair Setup]]`,
      `${councilLine} · **npm run council:ui** → http://localhost:3939 · [[3-Resources/Council/Chair Setup]]\n${block.trimEnd()}`
    );
    fs.writeFileSync(dash, text, 'utf8');
    return true;
  }
  return false;
}

function patchStartHere() {
  const startHere = path.join(ROOT, 'Vault', 'START_HERE.md');
  if (!fs.existsSync(startHere)) return false;
  const marker = '3-Resources/Cursor agents/Cursor agents Index';
  let text = fs.readFileSync(startHere, 'utf8');
  if (text.includes(marker)) return false;
  const row = '| [[3-Resources/Cursor agents/Cursor agents Index]] | **Cursor agents** — Karpathy, DESIGN.md, token skills (read before implementing) |';
  if (text.includes('## Vault layout')) {
    text = text.replace(
      /(\| \[\[3-Resources\/Council\/Council Index\]\][^\n]+\n)/,
      `$1${row}\n`
    );
    fs.writeFileSync(startHere, text, 'utf8');
    return true;
  }
  return false;
}

function researchTitleFromSession(session) {
  const topic = String(session.topic ?? '');
  const ryse = topic.match(/\bryse\b/i);
  if (ryse) return 'RYSE Loaded Pre';
  const m = topic.match(/\bwhat is (.+?)\??$/i);
  if (m) return m[1].trim().slice(0, 48);
  const words = topic.replace(/[^\w\s-]/g, ' ').trim().split(/\s+/).slice(0, 6);
  return words.join(' ').slice(0, 48) || session.id;
}

function buildCouncilResearchNote(session) {
  const date = (session.createdAt ?? session.completedAt ?? '').slice(0, 10) || 'unknown';
  const title = researchTitleFromSession(session);
  const sessionLink = `[[../Council/Sessions/${session.id}|Full council transcript]]`;
  const r1 = (session.messages ?? []).filter((m) => m.round === 1);
  const bullets = r1.map((m) => `- **${String(m.member).toUpperCase()}:** ${String(m.text).replace(/\n/g, ' ')}`);

  return mergeFrontmatter(
    [
      `# ${title}`,
      '',
      `_Distilled from AI Council research convene · ${date}_`,
      '',
      '## Question',
      '',
      session.topic ?? '',
      '',
      '## Summary (Final Verdict)',
      '',
      session.decision ?? '_No verdict recorded._',
      '',
      '## Council Round 1 (facts)',
      '',
      bullets.length ? bullets.join('\n') : '_See transcript._',
      '',
      '## Full transcript',
      '',
      sessionLink,
      '',
      '## Related',
      '',
      '- [[Research index]]',
      '- [[../Council/Council Index|Council Index]]',
      '- [[skills/smite2app-architecture|Architecture]] — Expo routes, Supabase, data paths',
      '',
    ].join('\n'),
    {
      tags: ['web-research', 'cursor-agent', 'council'],
      vaultZone: 'cursor-agent',
      extra: {
        council_session: session.id,
        synced_from: 'docs/council/sessions',
      },
    }
  );
}

function syncAgentResearchNotes(researchDir, sessionsAgentDir, result) {
  fs.writeFileSync(
    path.join(researchDir, 'README.md'),
    mergeFrontmatter(
      [
        '# Research folder',
        '',
        'Distilled **lookup / research** notes for Cursor agents and you.',
        '',
        '| Source | Where it lands |',
        '|--------|----------------|',
        '| **AI Council** research convenes | Auto-generated `YYYY-MM-DD … — council research.md` files |',
        '| **Repo docs** (e.g. pre-workout studies) | Mirrored from `docs/` on **npm run vault:sync** |',
        '| **Manual agent research** | Copy [[../templates/research-log|research-log]] template here |',
        '',
        '**Council full debates** live under [[../Council/Council Index|Council → Sessions]] — not here.',
        '',
        'Hub: [[Research index]]',
        '',
      ].join('\n'),
      { tags: ['cursor-agent', 'context-anchor'], vaultZone: 'cursor-agent' }
    )
  );
  result.exported.push('research/README.md');

  fs.writeFileSync(
    path.join(sessionsAgentDir, 'README.md'),
    mergeFrontmatter(
      [
        '# Agent session logs',
        '',
        'End-of-task summaries from **Cursor agent** work — not AI Council panel sessions.',
        '',
        '- Template: [[../templates/session-log|session-log]]',
        '- Council panel transcripts: [[../Council/Council Index|Council → Sessions]]',
        '',
      ].join('\n'),
      { tags: ['cursor-agent', 'session-log'], vaultZone: 'cursor-agent' }
    )
  );
  result.exported.push('sessions/README.md');

  for (const doc of REPO_RESEARCH_MIRROR) {
    if (!fs.existsSync(doc.src)) continue;
    const body = fs.readFileSync(doc.src, 'utf8');
    const merged = mergeFrontmatter(body, {
      tags: ['web-research', 'cursor-agent', 'workout-app'],
      vaultZone: 'cursor-agent',
      extra: { synced_from: path.relative(ROOT, doc.src).replace(/\\/g, '/'), title: doc.title },
    });
    fs.writeFileSync(path.join(researchDir, doc.destName), merged, 'utf8');
    result.exported.push(`research/${doc.destName}`);
  }

  const researchFiles = [];
  if (fs.existsSync(COUNCIL_SESSIONS)) {
    for (const file of fs.readdirSync(COUNCIL_SESSIONS).filter((f) => f.endsWith('.json') && f !== 'latest.json')) {
      try {
        const session = JSON.parse(fs.readFileSync(path.join(COUNCIL_SESSIONS, file), 'utf8'));
        if (!session.topic || !RESEARCH_TOPIC_RE.test(session.topic)) continue;
        const date = (session.createdAt ?? '').slice(0, 10) || 'unknown';
        const shortTitle = researchTitleFromSession(session);
        const destName = `${date} ${shortTitle} — council research.md`;
        fs.writeFileSync(path.join(researchDir, destName), buildCouncilResearchNote(session), 'utf8');
        researchFiles.push({ destName, date, title: shortTitle, id: session.id });
        result.exported.push(`research/${destName}`);
      } catch {
        /* skip bad json */
      }
    }
  }

  researchFiles.sort((a, b) => b.date.localeCompare(a.date));
  const mirrorLines = REPO_RESEARCH_MIRROR.filter((d) => fs.existsSync(d.src)).map(
    (d) => `- [[${d.destName.replace(/\.md$/, '')}|${d.title}]] — from \`${path.relative(ROOT, d.src).replace(/\\/g, '/')}\``
  );

  fs.writeFileSync(
    path.join(researchDir, 'Research index.md'),
    mergeFrontmatter(
      [
        '# Research index',
        '',
        '_Auto-generated on **npm run vault:sync**_',
        '',
        '## Council research (distilled)',
        '',
        ...(researchFiles.length
          ? researchFiles.map(
              (f) =>
                `- [[${f.destName.replace(/\.md$/, '')}|${f.date} — ${f.title}]] → [[../Council/Sessions/${f.id}|transcript]]`
            )
          : ['_No council research sessions yet._']),
        '',
        '## Repo research (mirrored)',
        '',
        ...(mirrorLines.length ? mirrorLines : ['_None mirrored._']),
        '',
        '## Add your own',
        '',
        '1. Duplicate [[../templates/research-log|research-log]] into this folder',
        '2. Tag `#web-research`',
        '3. Re-run **npm run vault:sync** — this index updates automatically',
        '',
      ].join('\n'),
      { tags: ['cursor-agent', 'web-research', 'context-anchor'], vaultZone: 'cursor-agent' }
    )
  );
  result.exported.push('research/Research index.md');
}

function patchAgentsIndexResearchLink() {
  const indexPath = path.join(VAULT_AGENTS, 'Cursor agents Index.md');
  if (!fs.existsSync(indexPath)) return false;
  let text = fs.readFileSync(indexPath, 'utf8');
  const marker = '[[research/Research index|Research index]]';
  if (text.includes(marker)) return false;
  const block = [
    '',
    '## Research',
    '',
    '- [[research/Research index|Research index]] — council lookups + repo mirrors',
    '- [[research/README|What goes in research/]] vs [[../Council/Council Index|Council sessions]]',
    '',
  ].join('\n');
  if (text.includes('## Living notes')) {
    text = text.replace('## Living notes', `${block}## Living notes`);
    fs.writeFileSync(indexPath, text, 'utf8');
    return true;
  }
  return false;
}

export function syncCursorAgentsToVault() {
  const result = { ok: true, vault: VAULT_AGENTS, exported: [] };
  if (!fs.existsSync(path.join(ROOT, 'Vault'))) {
    result.skipped = 'Vault/ folder not found — create it and open in Obsidian, then re-run';
    return result;
  }
  if (!fs.existsSync(REPO_AGENTS)) {
    result.skipped = 'docs/cursor-agents/ not found';
    return result;
  }

  const skillsVault = path.join(VAULT_AGENTS, 'skills');
  const researchDir = path.join(VAULT_AGENTS, 'research');
  const sessionsDir = path.join(VAULT_AGENTS, 'sessions');
  const templatesDir = path.join(VAULT_AGENTS, 'templates');
  ensureDir(skillsVault);
  ensureDir(researchDir);
  ensureDir(sessionsDir);
  ensureDir(templatesDir);

  // Index
  const indexSrc = path.join(REPO_AGENTS, 'index.md');
  if (fs.existsSync(indexSrc)) {
    const indexBody = fs.readFileSync(indexSrc, 'utf8');
    const vaultIndex = mergeFrontmatter(
      indexBody.replace(/^#\s*Cursor agents — knowledge hub/m, '# Cursor agents (Obsidian)'),
      { tags: ['cursor-agent', 'context-anchor', 'smite2app'], vaultZone: 'cursor-agent' }
    );
    fs.writeFileSync(path.join(VAULT_AGENTS, 'Cursor agents Index.md'), vaultIndex, 'utf8');
    result.exported.push('Cursor agents Index.md');
  }

  // context-snapshot from template if missing
  const snapshotDest = path.join(VAULT_AGENTS, 'context-snapshot.md');
  const snapshotTpl = path.join(REPO_AGENTS, 'context-snapshot.template.md');
  if (!fs.existsSync(snapshotDest) && fs.existsSync(snapshotTpl)) {
    fs.copyFileSync(snapshotTpl, snapshotDest);
    result.exported.push('context-snapshot.md (new)');
  }

  // Skills — always sync from repo (canonical), including subfolders (marketing/, stop-slop/, …)
  const skillsRepo = path.join(REPO_AGENTS, 'skills');
  function syncSkillsDir(srcDir, destDir, rel = 'skills') {
    if (!fs.existsSync(srcDir)) return;
    ensureDir(destDir);
    for (const name of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, name);
      const dest = path.join(destDir, name);
      const st = fs.statSync(src);
      if (st.isDirectory()) {
        syncSkillsDir(src, dest, `${rel}/${name}`);
      } else if (name.endsWith('.md')) {
        fs.copyFileSync(src, dest);
        result.exported.push(`${rel}/${name}`);
      }
    }
  }
  syncSkillsDir(skillsRepo, skillsVault);

  // Product marketing context (sibling of skills/)
  const pmSrc = path.join(REPO_AGENTS, 'product-marketing.md');
  if (fs.existsSync(pmSrc)) {
    fs.copyFileSync(pmSrc, path.join(VAULT_AGENTS, 'product-marketing.md'));
    result.exported.push('product-marketing.md');
  }

  // DESIGN.md full body into smite2-design.md (or willow-design fallback)
  if (fs.existsSync(DESIGN_DOC)) {
    const body = fs.readFileSync(DESIGN_DOC, 'utf8');
    const syncedFrom = path.basename(DESIGN_DOC);
    const merged = mergeFrontmatter(body, {
      tags: ['cursor-agent', 'design-system', 'smite2app'],
      vaultZone: 'cursor-agent',
      extra: { synced_from: `docs/${syncedFrom}` },
    });
    fs.writeFileSync(path.join(skillsVault, DESIGN_SKILL), merged, 'utf8');
    result.exported.push(`skills/${DESIGN_SKILL} (from ${syncedFrom})`);
  }

  // Templates
  const tplRepo = path.join(REPO_AGENTS, 'templates');
  if (fs.existsSync(tplRepo)) {
    for (const file of fs.readdirSync(tplRepo).filter((f) => f.endsWith('.md'))) {
      const dest = path.join(templatesDir, file);
      fs.copyFileSync(path.join(tplRepo, file), dest);
      result.exported.push(`templates/${file}`);
    }
  }

  // README in vault root
  const readmeSrc = path.join(REPO_AGENTS, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    copyFileWithMeta(readmeSrc, path.join(VAULT_AGENTS, 'README.md'), {
      tags: ['cursor-agent'],
      vaultZone: 'cursor-agent',
    });
    result.exported.push('README.md');
  }

  syncAgentResearchNotes(researchDir, sessionsDir, result);

  const snippet = installObsidianSnippet();
  if (snippet) result.snippet = snippet;
  patchVaultColorsSnippet();
  patchColorLegend();
  patchStartHere();
  patchDashboard();
  patchAgentsIndexResearchLink();

  return result;
}

if (process.argv[1]?.includes('cursor-agent-vault-sync')) {
  console.log(JSON.stringify(syncCursorAgentsToVault(), null, 2));
}
