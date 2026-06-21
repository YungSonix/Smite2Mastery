#!/usr/bin/env node
/**
 * Smite 2 vault sync — reads vault.config.json at repo root.
 * PARA + Kanban + Council + Cursor agents mirror (same model as WorkOutApp).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncCouncilToVault } from './council-vault-sync.mjs';
import { syncCursorAgentsToVault } from './cursor-agent-vault-sync.mjs';
import { writeCouncilPaths } from './council-paths.mjs';
import { syncVaultGods } from './vault-sync-gods.mjs';
import { syncVaultItems } from './vault-sync-items.mjs';
import {
  buildArchivesTasksReadme,
  buildCodeIndexFull,
  buildColorLegend,
  buildDailyReadme,
  buildDashboard,
  buildFeatureStats as buildSmiteFeatureStats,
  buildProjectMapCanvas,
  buildStartHere,
  CONTENT_BACKLOG_SEED,
  parseGoalsOpen,
  parseImprovementsOpen,
  patchVaultColorsSmiteTags,
  syncAreaNotes,
  syncAssetNotes,
  syncFeatureNotes,
  syncLibNotes,
} from './vault-smite2-scaffold.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = path.join(ROOT, 'Vault');
const GEN = path.join(VAULT, '_generated');
const CONFIG_PATH = path.join(ROOT, 'vault.config.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { projectName: 'Smite 2 Companion', stack: 'expo', repoJunctions: ['app', 'lib', 'docs'] };
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function countFiles(dir, ext = /\.(tsx?|jsx?)$/) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ext.test(ent.name)) n++;
    }
  }
  walk(dir);
  return n;
}

function walkDir(dir, base = dir, maxDepth = 3, depth = 0) {
  const lines = [];
  if (!fs.existsSync(dir) || depth > maxDepth) return lines;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
    if (ent.isDirectory()) {
      lines.push(`${'  '.repeat(depth)}- **${ent.name}/**`);
      lines.push(...walkDir(path.join(dir, ent.name), base, maxDepth, depth + 1));
    } else if (depth <= 2) {
      lines.push(`${'  '.repeat(depth)}- \`${ent.name}\``);
    }
  }
  return lines;
}

function parseOpenCheckboxes(md, sections = ['## Open', '## Investigating']) {
  const items = [];
  for (const section of sections) {
    const idx = md.indexOf(section);
    if (idx === -1) continue;
    const rest = md.slice(idx);
    const end = rest.search(/\n## (?!#)/);
    const block = end === -1 ? rest : rest.slice(0, end);
    for (const line of block.split('\n')) {
      const m = line.match(/^- \[ \] \*\*(.+?)\*\*/);
      if (m) items.push(m[1].trim());
    }
  }
  return items;
}

function dedupeTags(tags) {
  return [...new Set(tags)];
}

function inferDevTaskTags(title) {
  const t = title.toLowerCase();
  const tags = [];
  if (/build|god|item|patch|tier|database|data\.jsx/.test(t)) tags.push('#builds');
  if (/shop|gold|profile|font|banner/.test(t)) tags.push('#shop');
  if (/prophecy|wordle|ability|minigame|tcg/.test(t)) tags.push('#prophecy');
  if (/council|nala|london|fasa|chair/.test(t)) tags.push('#council');
  if (/vault|obsidian|cursor|agent|expo|platform|discord|reorganiz|file structure/.test(t)) tags.push('#platform');
  if (/guide|community guide/.test(t)) tags.push('#guides');
  if (/conquest|map/.test(t)) tags.push('#builds');
  if (/wallpaper|icon|builds\.json|data sync|patch note|voice|skin/.test(t)) tags.push('#data');
  if (/patch hub|patch note|catch.?up/.test(t)) tags.push('#patch');
  if (/clean|currency|improve/.test(t)) tags.push('#improvement');
  return tags.length ? tags : ['#dev'];
}

function parsePendingTasks(md) {
  const items = [];
  const pendingIdx = md.indexOf('## Pending');
  if (pendingIdx === -1) return items;
  const completedIdx = md.indexOf('\n## Completed', pendingIdx);
  const block = completedIdx === -1 ? md.slice(pendingIdx) : md.slice(pendingIdx, completedIdx);
  for (const line of block.split('\n')) {
    const m = line.match(/^- \[ \] \*\*(.+?)\*\*(.*)$/);
    if (!m) continue;
    const title = m[1].trim();
    const rest = m[2] ?? '';
    const explicit = [...rest.matchAll(/#([\w-]+)/g)].map((x) => `#${x[1]}`);
    const tags = explicit.length ? explicit : inferDevTaskTags(title);
    items.push({ title, tags: dedupeTags(['#dev', ...tags]) });
  }
  return items.slice(0, 25);
}

function kanbanCardLine(item, defaultTags = []) {
  const title = typeof item === 'string' ? item : item.title;
  const tags =
    typeof item === 'string' ? dedupeTags(defaultTags) : dedupeTags(item.tags?.length ? item.tags : defaultTags);
  return tags.length ? `- [ ] ${title} ${tags.join(' ')}` : `- [ ] ${title}`;
}

const KANBAN_TAG_COLORS = [
  { tag: '#dev', color: '#9ee0b8', backgroundColor: 'rgba(126, 200, 154, 0.35)' },
  { tag: '#builds', color: '#9ed0f0', backgroundColor: 'rgba(110, 181, 217, 0.35)' },
  { tag: '#shop', color: '#f0c078', backgroundColor: 'rgba(232, 167, 86, 0.35)' },
  { tag: '#prophecy', color: '#d4b8f0', backgroundColor: 'rgba(184, 146, 232, 0.35)' },
  { tag: '#guides', color: '#7dd3fc', backgroundColor: 'rgba(125, 211, 252, 0.35)' },
  { tag: '#patch', color: '#cbd5e1', backgroundColor: 'rgba(148, 163, 184, 0.35)' },
  { tag: '#data', color: '#e8e0a8', backgroundColor: 'rgba(212, 199, 106, 0.35)' },
  { tag: '#platform', color: '#c4b4f0', backgroundColor: 'rgba(168, 146, 232, 0.28)' },
  { tag: '#council', color: '#b892e8', backgroundColor: 'rgba(184, 146, 232, 0.28)' },
  { tag: '#goal', color: '#9ee0b8', backgroundColor: 'rgba(126, 200, 154, 0.22)' },
  { tag: '#improvement', color: '#c4b4f0', backgroundColor: 'rgba(168, 146, 232, 0.22)' },
  { tag: '#bug', color: '#f0a0a0', backgroundColor: 'rgba(224, 122, 122, 0.35)' },
  { tag: '#test', color: '#b0bec8', backgroundColor: 'rgba(138, 155, 176, 0.28)' },
  { tag: '#cursor-agent', color: '#7ed4f5', backgroundColor: 'rgba(77, 184, 232, 0.25)' },
  { tag: '#design-system', color: '#a3d4b8', backgroundColor: 'rgba(95, 160, 133, 0.25)' },
];

function extractKanbanSettings(md) {
  const match = md.match(/%% kanban:settings\s*\n```\s*\n?([\s\S]*?)\n```\s*\n%%/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function mergeKanbanSettings(existing) {
  const base = existing ? { ...existing } : { 'kanban-plugin': 'board' };
  const have = new Set((base['tag-colors'] ?? []).map((t) => t.tag));
  const merged = [...(base['tag-colors'] ?? [])];
  for (const def of KANBAN_TAG_COLORS) {
    if (!have.has(def.tag)) merged.push(def);
  }
  base['tag-colors'] = merged;
  if (base['move-tags'] === undefined) base['move-tags'] = true;
  if (base['tag-action'] === undefined) base['tag-action'] = 'kanban';
  return base;
}

function appendKanbanSettings(body, settings) {
  return `${body.trimEnd()}\n\n%% kanban:settings\n\`\`\`\n${JSON.stringify(settings, null, 2)}\n\`\`\`\n%%\n`;
}

function parseKanbanLanes(md) {
  const lanes = {};
  let current = null;
  for (const line of md.split('\n')) {
    if (line.startsWith('%% kanban:settings')) break;
    const h = line.match(/^## (.+)$/);
    if (h) {
      current = h[1];
      lanes[current] = [];
      continue;
    }
    if (current && /^- \[[ x]\]/.test(line)) lanes[current].push(line);
  }
  return lanes;
}

function buildKanbanFromItems(columns, items, defaultTags = [], existingLanes = {}) {
  const lines = ['---', '', 'kanban-plugin: basic', '', '---', ''];
  for (const col of columns) {
    lines.push(`## ${col.name}`, '');
    if (col.key === 'backlog') {
      for (const item of items) {
        lines.push(kanbanCardLine(item, defaultTags));
      }
    } else {
      for (const line of existingLanes[col.name] ?? []) {
        lines.push(line);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function writeKanbanBoard(filePath, columns, items, defaultTags = []) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const settings = mergeKanbanSettings(extractKanbanSettings(existing));
  const existingLanes = parseKanbanLanes(existing);
  const body = buildKanbanFromItems(columns, items, defaultTags, existingLanes);
  fs.writeFileSync(filePath, appendKanbanSettings(body, settings), 'utf8');
}

function buildFeatureStats() {
  return buildSmiteFeatureStats(ROOT);
}

function buildScriptIndex() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const scripts = Object.entries(pkg.scripts || {}).sort(([a], [b]) => a.localeCompare(b));
  return [
    '# npm scripts',
    '',
    '_Auto-generated — **npm run vault:sync**_',
    '',
    '| Script | Command |',
    '|--------|---------|',
    ...scripts.map(([k, v]) => `| **${k}** | ${v} |`),
  ].join('\n');
}

function buildRepoTree(config) {
  const tops = [...new Set([...(config.repoJunctions || []), 'Vault'])];
  const lines = [
    '# Repo folder tree',
    '',
    '_Auto-generated — browse live folders in [[Project Explorer]] (`_repo/` junctions)_',
    '',
  ];
  for (const top of tops) {
    const dir = path.join(ROOT, top);
    if (!fs.existsSync(dir)) continue;
    lines.push(`## ${top}/`, '');
    lines.push(...walkDir(dir, dir, top === 'app' ? 2 : 1));
    lines.push('');
  }
  return lines.join('\n');
}

function buildDocsList() {
  const docsDir = path.join(ROOT, 'docs');
  const councilDir = path.join(ROOT, 'docs', 'council');
  const files = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort()
    : [];
  const councilFiles = fs.existsSync(councilDir)
    ? fs.readdirSync(councilDir).filter((f) => f.endsWith('.md')).sort()
    : [];
  return [
    '# Repo docs index',
    '',
    '_Auto-generated_',
    '',
    '## App docs (`docs/`)',
    '',
    ...files.map((f) => `- [${f.replace('.md', '')}](../docs/${f})`),
    '',
    '## AI Council (`docs/council/`)',
    '',
    'Vault mirror: [[3-Resources/Council/Council Index]]',
    '',
    ...councilFiles.map((f) => `- [${f.replace('.md', '')}](../docs/council/${f})`),
    '',
    '## Cursor agents (`docs/cursor-agents/`)',
    '',
    'Vault mirror: [[3-Resources/Cursor agents/Cursor agents Index]]',
    '',
    '- [SMITE2_DESIGN](../docs/SMITE2_DESIGN.md) — agent design contract',
    '- [cursor-agents README](../docs/cursor-agents/README.md)',
    '- Skills: Karpathy, Open Design, Voltagent, Tailwind-thinking — see vault `skills/`',
  ].join('\n');
}

function buildKanbanTagLegend() {
  return [
    '# Kanban — tags & colors',
    '',
    'Cards support **#tags** (colored pills + left stripe). Tags auto-assigned on **npm run vault:sync** from repo boards.',
    '',
    '## Dev & product tags',
    '',
    '| Tag | Color | Source |',
    '|-----|-------|--------|',
    '| `#dev` | Green | TASKS.md pending |',
    '| `#builds` | Cyan | Gods, items, custom builder, database |',
    '| `#shop` | Orange | Shop, gold, profile |',
    '| `#prophecy` | Purple | Smite Wars, Wordle, Ability |',
    '| `#guides` | Sky | Community guides |',
    '| `#patch` | Gray | Patch Hub, patch notes |',
    '| `#data` | Gold | builds.json, icons, wallpapers |',
    '| `#platform` | Lavender | Vault, Expo, Discord draft |',
    '| `#council` | Purple | Council convenes |',
    '| `#goal` | Green | GOALS.md current goals |',
    '| `#improvement` | Lavender | IMPROVEMENTS.md |',
    '| `#bug` | Red | BUGS.md |',
    '| `#test` | Gray | Test plan board |',
    '',
    '## Agent / vault tags',
    '',
    '| `#cursor-agent` | Steel blue | Cursor agent notes |',
    '| `#design-system` | Sage | SMITE2_DESIGN.md |',
    '| `#todo` `#waiting` `#backburner` | GTD | Master Task List |',
    '',
    '## Add your own',
    '',
    '1. Append ` #mytag` on a Kanban card title line',
    '2. Or in TASKS.md: `- [ ] **Title** #builds #shop`',
    '3. Board gear → **Tags** → set pill colors',
    '',
    '## Sync note',
    '',
    '**Backlog** columns rebuild from repo on vault:sync. **In progress / Done** are kept. Move cards before editing backlog in Obsidian only.',
    '',
  ].join('\n');
}

function ensureObsidianIgnore() {
  const ignorePath = path.join(VAULT, '.obsidianignore');
  const content = `# Hide dependency trees
_repo/**/node_modules/**

# Ephemeral live-typing drafts (panel only)
_repo/docs/council/ui/drafts/**

`;
  fs.writeFileSync(ignorePath, content, 'utf8');
}

function ensureRepoJunctions(links) {
  ensureDir(path.join(VAULT, '_repo'));
  for (const name of links) {
    const target = path.join(ROOT, name);
    const linkPath = path.join(VAULT, '_repo', name);
    if (!fs.existsSync(target) || fs.existsSync(linkPath)) continue;
    try {
      fs.symlinkSync(target, linkPath, 'junction');
    } catch {
      try {
        fs.symlinkSync(target, linkPath, 'dir');
      } catch {
        /* manual mklink — see Project Explorer */
      }
    }
  }
}

function installVault3dSnippet() {
  const src = path.join(ROOT, 'docs', 'cursor-agents', 'vault-3d.css');
  if (!fs.existsSync(src)) return;
  const dest = path.join(VAULT, '.obsidian', 'snippets', 'vault-3d.css');
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function ensureAppearanceSnippets() {
  const appearancePath = path.join(VAULT, '.obsidian', 'appearance.json');
  if (!fs.existsSync(appearancePath)) return;
  const appearance = JSON.parse(fs.readFileSync(appearancePath, 'utf8'));
  const want = ['vault-colors', 'vault-3d', 'cursor-agents-vault', 'vault-god-pages'];
  const enabled = new Set(appearance.enabledCssSnippets ?? []);
  for (const s of want) enabled.add(s);
  appearance.enabledCssSnippets = [...enabled];
  if (!appearance.accentColor) appearance.accentColor = '#7dd3fc';
  fs.writeFileSync(appearancePath, `${JSON.stringify(appearance, null, 2)}\n`);
}

function ensureGraphColorGroups() {
  const graphPath = path.join(VAULT, '.obsidian', 'graph.json');
  if (!fs.existsSync(graphPath)) return;
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const groups = graph.colorGroups ?? [];
  const hasCursor = groups.some((g) => String(g.query).includes('Cursor agents'));
  if (!hasCursor) {
    const cursorGroup = {
      query: 'path:"3-Resources/Cursor agents" OR tag:#cursor-agent',
      color: { a: 1, rgb: 5093608 },
    };
    const genericIdx = groups.findIndex((g) => String(g.query).includes('path:Docs OR path:3-Resources'));
    if (genericIdx >= 0) groups.splice(genericIdx, 0, cursorGroup);
    else groups.push(cursorGroup);
  }
  graph.colorGroups = groups;
  graph.showOrphans = false;
  fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
}

function ensureProjectMapCanvas(projectName) {
  const canvasPath = path.join(VAULT, 'Project Map.canvas');
  const canvas = buildProjectMapCanvas(projectName);
  fs.writeFileSync(canvasPath, `${JSON.stringify(canvas, null, '\t')}\n`);
}

function writeDashboard(config, now) {
  fs.writeFileSync(
    path.join(VAULT, 'Dashboard.md'),
    buildDashboard(config, path.join(ROOT, 'Vault'), now)
  );
}

function ensureNew3dGraphSettings() {
  const pluginDir = path.join(VAULT, '.obsidian', 'plugins', 'new-3d-graph');
  const templatePath = path.join(ROOT, 'docs', 'cursor-agents', 'new-3d-graph-willow.json');
  const dataPath = path.join(pluginDir, 'data.json');
  if (!fs.existsSync(templatePath) || !fs.existsSync(pluginDir)) return null;
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  let current = {};
  if (fs.existsSync(dataPath)) {
    try {
      current = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch {
      current = {};
    }
  }
  const merged = { ...current, ...template, groups: template.groups, useThemeColors: false };
  fs.writeFileSync(dataPath, `${JSON.stringify(merged, null, 2)}\n`);
  return dataPath;
}

function updateDashboardTimestamp(iso) {
  /* replaced by writeDashboard — kept for callers */
}

const CODE_AREA_DETAILS = {
  app: {
    label: 'App routes',
    body: `Expo Router screens under \`app/\`. Only files with a default export become routes; put helpers in \`lib/\`.

| Screen | File |
|--------|------|
| Shell / nav | \`index.jsx\` |
| Home | \`home.jsx\` |
| Database | \`data.jsx\` |
| Custom / My / Tier | \`custombuild.jsx\`, \`mybuilds.jsx\`, \`tierlist.jsx\` |
| Patch Hub | \`patchhub.jsx\` |
| More | \`more.jsx\` |
| Prophecy | \`prophecy.jsx\` |
| Minigames | \`wordle.jsx\`, \`ability.jsx\` |
| Discord draft | \`discord-build/[token].jsx\` |

Browse live: \`_repo/app/\``,
  },
  lib: {
    label: 'Shared lib',
    body: `Non-route modules — shop, Prophecy, guides, Supabase helpers, build math, icons.

| Module | Role |
|--------|------|
| \`shopData.js\`, \`shopChallenges.js\` | Gold + shop catalog |
| \`prophecyData.js\`, \`prophecyDeck.js\` | Smite Wars TCG |
| \`guidesPage.jsx\`, \`guidesSupabase.js\` | Community guides |
| \`customBuildItemPassives.js\`, \`basicAttackScaling.js\` | Custom builder stats |
| \`imageGrabber.js\`, \`localIcons.js\` (via app) | Bundled icons |
| \`normalizeBuildsGod.js\` | God kit normalization |

Browse live: \`_repo/lib/\``,
  },
  hooks: {
    label: 'Hooks',
    body: `React hooks shared across screens.

| Hook | File |
|------|------|
| Responsive layout | \`useScreenDimensions.js\` |
| Guide contributor access | \`useGuideContributorAccess.js\` |

Browse live: \`_repo/hooks/\``,
  },
  config: {
    label: 'Config',
    body: `App configuration — Expo, Supabase, theme, routes.

| File | Role |
|------|------|
| \`supabase.js\` | Supabase client (guard when missing) |
| \`appConfig.ts\`, \`themeConfig.ts\` | App + theme tokens |
| \`routesConfig.ts\`, \`storageConfig.ts\` | Routing + storage keys |
| \`networkConfig.ts\` | Network helpers |

Also: \`app.config.js\`, \`vault.config.json\`, \`ENV_SETUP.md\`.

Browse live: \`_repo/config/\``,
  },
  data: {
    label: 'Game data',
    body: `Static game content and bundled assets.

| Asset | Path |
|-------|------|
| Gods, items, builds | \`app/data/God Information/Builds/builds.json\` |
| Wordle god list | \`Smite2Gods.json\` (repo root) |
| Icons / wallpapers | \`app/data/Icons/\` |
| Patch notes | \`Patch Notes/\` |

Browse live: \`_repo/app/data/\``,
  },
};

function buildCodeIndex(config) {
  return buildCodeIndexFull();
}

function buildCodeAreaNote(area) {
  const id = area.id;
  const detail = CODE_AREA_DETAILS[id] ?? { label: area.label, body: `\`${area.path}/\` — see [[Code/Index]].` };
  const noteName = area.note?.split('/').pop() ?? area.id;
  return [`# ${detail.label}`, '', detail.body, '', '← [[Code/Index]]', ''].join('\n');
}

function buildScriptsIndex() {
  const scriptsDir = path.join(ROOT, 'scripts');
  const entries = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((f) => !f.startsWith('.')).sort()
    : [];
  const rows = entries.map((f) => {
    const p = path.join(scriptsDir, f);
    const isDir = fs.statSync(p).isDirectory();
    return isDir ? `- **${f}/**` : `- \`${f}\``;
  });
  return [
    '# Scripts — npm & tooling',
    '',
    '_Auto-generated — **npm run vault:sync**_',
    '',
    '## npm scripts',
    '',
    '![[_generated/npm-scripts]]',
    '',
    '## Files in `scripts/`',
    '',
    ...rows,
    '',
    'Browse live: `_repo/scripts/`',
    '',
  ].join('\n');
}

function buildConfigIndex() {
  return [
    '# Config — Expo, env, Supabase',
    '',
    '_Auto-generated — **npm run vault:sync**_',
    '',
    '| File | Purpose |',
    '|------|---------|',
    '| `app.config.js` | Expo app config + version |',
    '| `vault.config.json` | Obsidian vault sync areas + junctions |',
    '| `ENV_SETUP.md` | Environment variables |',
    '| `config/supabase.js` | Supabase client |',
    '| `docs/council/council.config.json` | AI Council RAG + models |',
    '',
    'Code note: [[Code/Config]]',
    '',
    'Browse: `_repo/config/` · `_repo/supabase/`',
    '',
  ].join('\n');
}

function buildDocsIndex() {
  return [
    '# Docs — repo documentation',
    '',
    '_Auto-generated — **npm run vault:sync**_',
    '',
    '![[_generated/docs-list]]',
    '',
    'Design contract: [SMITE2_DESIGN.md](../docs/SMITE2_DESIGN.md)',
    '',
    'Browse live: `_repo/docs/`',
    '',
  ].join('\n');
}

function buildProjectExplorer(config) {
  const junctions = config.repoJunctions ?? ['app', 'lib', 'scripts', 'docs'];
  const rows = junctions.map((j) => `| \`_repo/${j}\` | \`${j}/\` |`);
  return [
    '# Project Explorer',
    '',
    '`_repo/` junctions point at live repo folders. Run **npm run vault:sync** to create missing links.',
    '',
    '| Junction | Target |',
    '|----------|--------|',
    ...rows,
    '',
    'Tree snapshot: ![[_generated/repo-tree]]',
    '',
    '← [[Dashboard]] · [[Code/Index]]',
    '',
  ].join('\n');
}

function buildAreasIndex() {
  return [
    '# Areas — ongoing product surfaces',
    '',
    'PARA **Areas** — long-lived parts of Smite 2 Companion.',
    '',
    '| Area | Note | Tags |',
    '|------|------|------|',
    '| Builds | [[Builds and custom builder]] | #builds |',
    '| Database | [[Database and items]] | #builds #data |',
    '| Patch / data | [[Patch Hub and data]] | #patch #data |',
    '| Shop | [[Shop and profile]] | #shop |',
    '| Prophecy | [[Prophecy and minigames]] | #prophecy |',
    '| Platform | [[Platform agents and council]] | #platform #council |',
    '',
    'Tasks: [[Boards/Index]] · [[Task Dashboard]]',
    '',
  ].join('\n');
}

function buildBoardsIndex() {
  return [
    '# Boards — Smite 2 Companion',
    '',
    '| Board | Source | Vault Kanban | Live sync |',
    '|-------|--------|--------------|-----------|',
    '| [TASKS.md](../TASKS.md) | Dev features | [[Kanban/Dev tasks board]] | ![[_generated/pending-tasks]] |',
    '| [BUGS.md](../BUGS.md) | Open bugs | [[Kanban/Bugs board]] | ![[_generated/open-bugs]] |',
    '| [GOALS.md](../GOALS.md) | Product direction | [[Kanban/Goals board]] | ![[_generated/open-goals]] |',
    '| [IMPROVEMENTS.md](../IMPROVEMENTS.md) | QoL / refactors | [[Kanban/Improvements board]] | ![[_generated/pending-improvements]] |',
    '| Data pipeline | GOALS + scripts | [[Kanban/Content backlog board]] | — |',
    '| Release smoke tests | Manual | [[Kanban/Test plan board]] | — |',
    '',
    'GTD: [[Master Task List]] · Dashboard: [[Task Dashboard]] · Tags: [[Kanban/Tag legend]]',
    '',
  ].join('\n');
}

function buildTaskDashboard() {
  return [
    '# Task Dashboard',
    '',
    'Same workflow as WorkOutApp — repo boards sync into Kanban + `_generated/`.',
    '',
    '## Kanban boards',
    '',
    '- [[Kanban/Dev tasks board]] ← TASKS.md',
    '- [[Kanban/Bugs board]] ← BUGS.md',
    '- [[Kanban/Goals board]] ← GOALS.md',
    '- [[Kanban/Improvements board]] ← IMPROVEMENTS.md',
    '- [[Kanban/Content backlog board]] — data/icons/patch pipeline',
    '- [[Kanban/Test plan board]] — release smoke tests',
    '- [[Kanban/Tag legend]] — tag colors',
    '',
    '## Live sync embeds',
    '',
    '![[_generated/pending-tasks]]',
    '',
    '![[_generated/open-bugs]]',
    '',
    '![[_generated/open-goals]]',
    '',
    '![[_generated/pending-improvements]]',
    '',
    '## Dataview',
    '',
    '[[Dataview Dashboard]]',
    '',
    '## GTD',
    '',
    '[[Master Task List]] · **npm run vault:archive** → [[4-Archives/Tasks/README]]',
    '',
  ].join('\n');
}

function buildDataviewDashboard() {
  return [
    '# Live Dataview dashboard',
    '',
    'Requires **Dataview** + **Tasks** plugins (enable after install).',
    '',
    '**Auto-sync:** run **npm run vault:sync** — refreshes `_generated/` from repo boards.',
    '',
    '> [!note] Dataview quirk',
    '> Avoid backticks around text with **:** (e.g. vault:sync) — Dataview tries to parse them as inline queries.',
    '',
    '---',
    '',
    '## GTD tasks (#todo)',
    '',
    '```dataview',
    'TASK',
    'FROM "Master Task List" OR "Daily"',
    'WHERE !completed AND contains(tags, "#todo")',
    'GROUP BY file.link',
    'LIMIT 20',
    '```',
    '',
    '---',
    '',
    '## Open bugs (from BUGS.md sync)',
    '',
    '```dataview',
    'TASK',
    'FROM "_generated/open-bugs"',
    'WHERE !completed',
    '```',
    '',
    'Or read: ![[_generated/open-bugs]]',
    '',
    '---',
    '',
    '## Pending dev tasks (from TASKS.md sync)',
    '',
    '```dataview',
    'TASK',
    'FROM "_generated/pending-tasks"',
    'WHERE !completed',
    'LIMIT 15',
    '```',
    '',
    '---',
    '',
    '## Open goals (from GOALS.md sync)',
    '',
    '```dataview',
    'TASK',
    'FROM "_generated/open-goals"',
    'WHERE !completed',
    'LIMIT 15',
    '```',
    '',
    'Or: ![[_generated/open-goals]]',
    '',
    '---',
    '',
    '## Improvements (from IMPROVEMENTS.md sync)',
    '',
    '```dataview',
    'TASK',
    'FROM "_generated/pending-improvements"',
    'WHERE !completed',
    'LIMIT 10',
    '```',
    '',
    '---',
    '',
    '## All vault notes by zone (tag)',
    '',
    '```dataview',
    'TABLE vault-zone AS Zone, tags',
    'FROM "Code" OR "Assets" OR "2-Areas"',
    'WHERE vault-zone',
    'SORT vault-zone ASC',
    'LIMIT 30',
    '```',
    '',
    '---',
    '',
    '## Bug investigation notes',
    '',
    '```dataview',
    'TABLE status, reported AS "Reported"',
    'FROM "3-Resources/Bugs"',
    'WHERE contains(tags, "bug")',
    'SORT reported DESC',
    '```',
    '',
    '---',
    '',
    '## Feature file counts',
    '',
    '![[_generated/feature-stats]]',
    '',
    '---',
    '',
    '## Last sync',
    '',
    '![[_generated/last-sync]]',
    '',
    '---',
    '',
    '## Kanban boards',
    '',
    '- [[Kanban/Dev tasks board]]',
    '- [[Kanban/Bugs board]]',
    '- [[Kanban/Goals board]]',
    '- [[Kanban/Improvements board]]',
    '- [[Kanban/Content backlog board]]',
    '- [[Kanban/Test plan board]]',
    '',
  ].join('\n');
}

async function ensureVaultScaffold(config) {
  const dirs = [
    'Code',
    'Scripts',
    'Config',
    'Assets',
    'Data',
    'Boards',
    'Docs',
    'Kanban',
    '1-Projects',
    '2-Areas',
    '3-Resources/Bugs',
    '4-Archives/Tasks',
    'Daily',
    'Templates',
    '_generated',
    '_repo',
  ];
  for (const d of dirs) ensureDir(path.join(VAULT, d));

  syncFeatureNotes(VAULT, ROOT);
  syncLibNotes(VAULT, ROOT);
  syncAreaNotes(VAULT);
  syncAssetNotes(VAULT);
  await syncVaultGods(VAULT, ROOT);
  await syncVaultItems(VAULT, ROOT);

  fs.writeFileSync(path.join(VAULT, 'Code', 'Index.md'), buildCodeIndex(config));
  for (const area of config.codeAreas ?? []) {
    const noteName = (area.note ?? `Code/${area.id}`).split('/').pop();
    fs.writeFileSync(path.join(VAULT, 'Code', `${noteName}.md`), buildCodeAreaNote(area));
  }

  fs.writeFileSync(path.join(VAULT, 'Scripts', 'Index.md'), buildScriptsIndex());
  fs.writeFileSync(path.join(VAULT, 'Config', 'Index.md'), buildConfigIndex());
  fs.writeFileSync(path.join(VAULT, 'Docs', 'Index.md'), buildDocsIndex());
  fs.writeFileSync(path.join(VAULT, 'Project Explorer.md'), buildProjectExplorer(config));
  fs.writeFileSync(path.join(VAULT, '2-Areas', 'Index.md'), buildAreasIndex());
  fs.writeFileSync(path.join(VAULT, 'Boards', 'Index.md'), buildBoardsIndex());
  fs.writeFileSync(path.join(VAULT, 'Task Dashboard.md'), buildTaskDashboard());
  fs.writeFileSync(path.join(VAULT, 'Dataview Dashboard.md'), buildDataviewDashboard());
  fs.writeFileSync(path.join(VAULT, 'Color legend.md'), buildColorLegend());
  fs.writeFileSync(path.join(VAULT, 'START_HERE.md'), buildStartHere(config, path.join(ROOT, 'Vault')));
  fs.writeFileSync(path.join(VAULT, 'Daily', 'README.md'), buildDailyReadme());
  fs.writeFileSync(path.join(VAULT, '4-Archives', 'Tasks', 'README.md'), buildArchivesTasksReadme());

  const bugsReadme = path.join(VAULT, '3-Resources', 'Bugs', 'README.md');
  fs.writeFileSync(
    bugsReadme,
    [
      '---',
      'tags: [bug, context-anchor]',
      'vault-zone: bugs',
      '---',
      '',
      '# Bug investigations',
      '',
      'Use [[../../Templates/Bug investigation|Bug investigation]] template.',
      '',
      '- Board: [[../../Kanban/Bugs board]]',
      '- Repo: [BUGS.md](../../../BUGS.md)',
      '- Live: ![[../../_generated/open-bugs]]',
      '',
    ].join('\n')
  );
}

function main() {
  if (!fs.existsSync(VAULT)) {
    console.error('Vault/ missing — run bootstrap first.');
    process.exit(1);
  }
  runMain().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

async function runMain() {
  const config = readConfig();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  ensureDir(GEN);

  fs.writeFileSync(path.join(GEN, 'feature-stats.md'), buildFeatureStats());
  fs.writeFileSync(path.join(GEN, 'npm-scripts.md'), buildScriptIndex());
  fs.writeFileSync(path.join(GEN, 'repo-tree.md'), buildRepoTree(config));
  fs.writeFileSync(path.join(GEN, 'docs-list.md'), buildDocsList());
  fs.writeFileSync(
    path.join(GEN, 'last-sync.md'),
    `# Last vault sync\n\n**When:** ${now}\n\n**Project:** ${config.projectName}\n\n**Command:** npm run vault:sync\n`
  );

  const bugs = fs.existsSync(path.join(ROOT, 'BUGS.md'))
    ? parseOpenCheckboxes(fs.readFileSync(path.join(ROOT, 'BUGS.md'), 'utf8'))
    : [];
  fs.writeFileSync(
    path.join(GEN, 'open-bugs.md'),
    [
      '# Open bugs',
      '',
      '_From ../BUGS.md — auto-generated_',
      '',
      ...bugs.map((b) => `- [ ] ${b} #bug`),
      bugs.length ? '' : '_No open checkbox bugs found._',
    ].join('\n')
  );

  const tasks = fs.existsSync(path.join(ROOT, 'TASKS.md'))
    ? parsePendingTasks(fs.readFileSync(path.join(ROOT, 'TASKS.md'), 'utf8'))
    : [];
  fs.writeFileSync(
    path.join(GEN, 'pending-tasks.md'),
    [
      '# Pending dev tasks',
      '',
      '_From ../TASKS.md (Pending) — auto-generated_',
      '',
      ...tasks.map((t) => kanbanCardLine(t)),
      tasks.length ? '' : '_No unchecked pending tasks._',
    ].join('\n')
  );

  const goals = fs.existsSync(path.join(ROOT, 'GOALS.md'))
    ? parseGoalsOpen(fs.readFileSync(path.join(ROOT, 'GOALS.md'), 'utf8'))
    : [];
  fs.writeFileSync(
    path.join(GEN, 'open-goals.md'),
    [
      '# Open goals',
      '',
      '_From ../GOALS.md (Current goals) — auto-generated_',
      '',
      ...goals.map((g) => `- [ ] ${g} #goal`),
      goals.length ? '' : '_No open goals in Current goals section._',
    ].join('\n')
  );

  const improvements = fs.existsSync(path.join(ROOT, 'IMPROVEMENTS.md'))
    ? parseImprovementsOpen(fs.readFileSync(path.join(ROOT, 'IMPROVEMENTS.md'), 'utf8'))
    : [];
  fs.writeFileSync(
    path.join(GEN, 'pending-improvements.md'),
    [
      '# Pending improvements',
      '',
      '_From ../IMPROVEMENTS.md — auto-generated_',
      '',
      ...improvements.map((i) => `- [ ] ${i} #improvement`),
      improvements.length ? '' : '_No pending improvements._',
    ].join('\n')
  );

  const kanbanDir = path.join(VAULT, 'Kanban');
  ensureDir(kanbanDir);
  writeKanbanBoard(
    path.join(kanbanDir, 'Dev tasks board.md'),
    [
      { name: 'Backlog', key: 'backlog' },
      { name: 'In progress', key: 'ip' },
      { name: 'Done', key: 'done' },
    ],
    tasks
  );
  writeKanbanBoard(
    path.join(kanbanDir, 'Bugs board.md'),
    [
      { name: 'Open', key: 'backlog' },
      { name: 'Investigating', key: 'ip' },
      { name: 'Fixed', key: 'done' },
    ],
    bugs.map((b) => ({ title: b, tags: ['#bug'] }))
  );

  writeKanbanBoard(
    path.join(kanbanDir, 'Goals board.md'),
    [
      { name: 'Backlog', key: 'backlog' },
      { name: 'In progress', key: 'ip' },
      { name: 'Done', key: 'done' },
    ],
    goals.map((g) => ({ title: g, tags: ['#goal'] }))
  );

  writeKanbanBoard(
    path.join(kanbanDir, 'Improvements board.md'),
    [
      { name: 'Backlog', key: 'backlog' },
      { name: 'In progress', key: 'ip' },
      { name: 'Done', key: 'done' },
    ],
    improvements.map((i) => ({ title: i, tags: ['#improvement'] }))
  );

  if (!fs.existsSync(path.join(kanbanDir, 'Content backlog board.md'))) {
    writeKanbanBoard(
      path.join(kanbanDir, 'Content backlog board.md'),
      [
        { name: 'Backlog', key: 'backlog' },
        { name: 'In progress', key: 'ip' },
        { name: 'Done', key: 'done' },
      ],
      CONTENT_BACKLOG_SEED
    );
  }

  const testItems = [
    'Walk every main tab — no crash on empty Supabase',
    'Custom builder — save/load build',
    'Wordle + Ability minigames award gold',
    'Prophecy deck builder save + battle loop',
    'Web layout — maxWidth + font stacks',
  ];
  if (!fs.existsSync(path.join(kanbanDir, 'Test plan board.md'))) {
    writeKanbanBoard(
      path.join(kanbanDir, 'Test plan board.md'),
      [
        { name: 'Todo', key: 'backlog' },
        { name: 'Testing', key: 'ip' },
        { name: 'Pass', key: 'done' },
      ],
      testItems.map((t) => ({ title: t, tags: ['#test'] }))
    );
  }

  fs.writeFileSync(path.join(kanbanDir, 'Tag legend.md'), buildKanbanTagLegend(), 'utf8');

  ensureObsidianIgnore();
  await ensureVaultScaffold(config);
  ensureRepoJunctions(config.repoJunctions || ['app', 'lib', 'scripts', 'docs', 'supabase']);
  installVault3dSnippet();
  ensureAppearanceSnippets();
  ensureGraphColorGroups();
  ensureProjectMapCanvas(config.projectName || 'Smite 2 Companion');
  patchVaultColorsSmiteTags(VAULT);
  writeCouncilPaths(ROOT);
  writeDashboard(config, now);

  const graph3d = ensureNew3dGraphSettings();
  const council = syncCouncilToVault();
  const agents = syncCursorAgentsToVault();

  console.log(`Vault sync OK @ ${now}`);
  console.log(`  → ${GEN}`);
  if (council.exported) console.log(`  Council: ${council.exported.length} files`);
  if (agents.exported) console.log(`  Cursor agents: ${agents.exported.length} files`);
  if (graph3d) console.log(`  New 3D Graph: ${graph3d}`);
}

main();
