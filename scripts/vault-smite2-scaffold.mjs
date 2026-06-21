/**
 * Smite 2 Companion vault scaffold — WorkOutApp-parity notes, tags, boards.
 * Imported by sync-vault-index.mjs on npm run vault:sync.
 */
import fs from 'node:fs';
import path from 'node:path';

export const SMITE2_FEATURES = [
  {
    id: 'Home',
    tags: ['code', 'home'],
    kanban: '#builds',
    files: ['app/home.jsx'],
    paths: ['News, version, guides entry'],
  },
  {
    id: 'Database',
    tags: ['code', 'builds', 'data'],
    kanban: '#builds',
    files: ['app/data.jsx'],
    paths: ['Gods, items, mechanics, skins, kit tooltips'],
  },
  {
    id: 'Builds',
    tags: ['code', 'builds'],
    kanban: '#builds',
    files: ['app/index.jsx', 'app/custombuild.jsx', 'app/mybuilds.jsx', 'app/tierlist.jsx'],
    paths: ['Browse builds, custom builder, tierlists, randomizer, guides hub'],
  },
  {
    id: 'Patch Hub',
    tags: ['code', 'patch', 'data'],
    kanban: '#patch',
    files: ['app/patchhub.jsx'],
    paths: ['Simple summary, catch-up, archive'],
  },
  {
    id: 'More',
    tags: ['code', 'shop'],
    kanban: '#shop',
    files: ['app/more.jsx'],
    paths: ['Minigames, profile, shop, tools hub'],
  },
  {
    id: 'Shop',
    tags: ['code', 'shop'],
    kanban: '#shop',
    files: ['app/shop.jsx', 'lib/shopData.js', 'lib/shopChallenges.js', 'lib/shopSupabase.js'],
    paths: ['Gold, daily rotation, cosmetics, challenges'],
  },
  {
    id: 'Profile',
    tags: ['code', 'shop'],
    kanban: '#shop',
    files: ['app/profile.jsx'],
    paths: ['Display name, banners, fonts, titles, gold'],
  },
  {
    id: 'Prophecy',
    tags: ['code', 'prophecy'],
    kanban: '#prophecy',
    files: ['app/prophecy.jsx', 'lib/prophecyData.js', 'lib/prophecyDeck.js', 'lib/prophecyAudio.js'],
    paths: ['Smite Wars TCG — battle, deck builder, collection, store'],
  },
  {
    id: 'Minigames',
    tags: ['code', 'prophecy'],
    kanban: '#prophecy',
    files: ['app/wordle.jsx', 'app/ability.jsx'],
    paths: ['God Wordle, Guess the Ability — gold rewards'],
  },
  {
    id: 'Guides',
    tags: ['code', 'builds', 'guides'],
    kanban: '#guides',
    files: ['lib/guidesPage.jsx', 'lib/guidesSupabase.js'],
    paths: ['Featured + community guides (Supabase)'],
  },
  {
    id: 'Conquest Map',
    tags: ['code', 'builds'],
    kanban: '#builds',
    files: ['app/ConquestMap.jsx', 'lib/conquestMapHtml.js'],
    paths: ['Conquest map from Data → Game Modes'],
  },
  {
    id: 'Discord draft',
    tags: ['code', 'builds', 'platform'],
    kanban: '#platform',
    files: ['app/discord-build/[token].jsx', 'lib/discordBotSharedBuildSupabase.js'],
    paths: ['Bot shared build drafts — secret link route'],
  },
];

export const SMITE2_LIB = [
  {
    id: 'Build math',
    tags: ['code', 'builds'],
    files: ['lib/customBuildItemPassives.js', 'lib/basicAttackScaling.js', 'lib/normalizeBuildsGod.js', 'lib/godSpecializations.js'],
  },
  {
    id: 'Icons and media',
    tags: ['code', 'data'],
    files: ['lib/imageGrabber.js', 'app/localIcons.js', 'lib/skinShowcaseHelpers.js'],
  },
  {
    id: 'Supabase helpers',
    tags: ['code', 'platform'],
    files: ['config/supabase.js', 'lib/guidesSupabase.js', 'lib/shopSupabase.js'],
  },
];

export const SMITE2_AREAS = [
  {
    id: 'Builds and custom builder',
    tags: ['area', 'builds'],
    links: ['[[../Code/Features/Builds]]', '[[../Code/Features/Guides]]', '[[../Kanban/Dev tasks board]]'],
    body: 'Featured/community builds, custom builder, tierlists, randomizer.',
  },
  {
    id: 'Database and items',
    tags: ['area', 'builds', 'data'],
    links: ['[[../Code/Features/Database]]', '[[../Assets/Game data]]', '[[../Data/Gods/Index|Gods (vault)]]', '[[../Data/Items/Index|Items encyclopedia]]'],
    body: 'Gods, items, mechanics, skins, baseStats.',
  },
  {
    id: 'Patch Hub and data',
    tags: ['area', 'patch', 'data'],
    links: ['[[../Code/Features/Patch Hub]]', '[[../Kanban/Content backlog board]]'],
    body: 'Patch notes, builds.json sync, icon/wallpaper pipelines.',
  },
  {
    id: 'Shop and profile',
    tags: ['area', 'shop'],
    links: ['[[../Code/Features/Shop]]', '[[../Code/Features/Profile]]'],
    body: 'Gold economy, cosmetics, challenges, Supabase sync.',
  },
  {
    id: 'Prophecy and minigames',
    tags: ['area', 'prophecy'],
    links: ['[[../Code/Features/Prophecy]]', '[[../Code/Features/Minigames]]'],
    body: 'Smite Wars TCG, Wordle, Ability guess — gold hooks.',
  },
  {
    id: 'Platform agents and council',
    tags: ['area', 'platform', 'council'],
    links: ['[[../3-Resources/Cursor agents/Cursor agents Index]]', '[[../3-Resources/Council/Council Index]]'],
    body: 'Vault sync, Cursor agent skills, AI Council panel, Expo/web.',
  },
];

export const SMITE2_ASSETS = [
  {
    id: 'Icons and roles',
    tags: ['assets', 'data'],
    paths: ['app/data/Icons/', 'app/localIcons.js', 'lib/imageGrabber.js'],
  },
  {
    id: 'Skins and wallpapers',
    tags: ['assets', 'data'],
    paths: ['app/data/Icons/Wallpapers/', 'npm run import-wallpapers'],
  },
  {
    id: 'Game data',
    tags: ['assets', 'data'],
    paths: ['app/data/God Information/Builds/builds.json', 'Smite2Gods.json', 'Patch Notes/'],
  },
  {
    id: 'Prophecy card art',
    tags: ['assets', 'prophecy'],
    paths: ['lib/prophecyData.js', 'bundled pack icons in imageGrabber'],
  },
];

export const CONTENT_BACKLOG_SEED = [
  { title: 'Normalize patch notes folder naming and references', tags: ['#data', '#patch'] },
  { title: 'Validate every god in Smite2Gods.json exists in builds.json', tags: ['#data', '#builds'] },
  { title: 'Verify local icon paths (npm run verify-icons)', tags: ['#data'] },
  { title: 'import-wallpapers dry-run + write for new skins', tags: ['#data'] },
  { title: '.scripts/update-builds.js — tier columns + god merge', tags: ['#data', '#patch'] },
  { title: 'Voice audio gaps (check-voice-audio.js)', tags: ['#data'] },
];

function countExistingFiles(root, relPaths) {
  return relPaths.filter((f) => fs.existsSync(path.join(root, f))).length;
}

export function writeVaultNote(dest, title, bodyLines, meta = {}) {
  ensureDir(path.dirname(dest));
  const lines = ['---'];
  if (meta.tags?.length) {
    lines.push('tags:');
    for (const t of meta.tags) lines.push(`  - ${String(t).replace(/^#/, '')}`);
  }
  if (meta.vaultZone) lines.push(`vault-zone: ${meta.vaultZone}`);
  if (meta.cssclasses?.length) {
    lines.push('cssclasses:');
    for (const c of meta.cssclasses) lines.push(`  - ${c}`);
  }
  lines.push('---', '', `# ${title}`, '', ...bodyLines, '');
  fs.writeFileSync(dest, lines.join('\n'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function syncFeatureNotes(vault, root) {
  const dir = path.join(vault, 'Code', 'Features');
  ensureDir(dir);
  for (const f of SMITE2_FEATURES) {
    const n = countExistingFiles(root, f.files);
    writeVaultNote(
      path.join(dir, `${f.id}.md`),
      f.id,
      [
        f.paths?.length ? f.paths.join(' · ') : '_Feature surface._',
        '',
        '| Path |',
        '|------|',
        ...f.files.map((p) => `| \`${p}\` |`),
        '',
        `**Files present:** ${n}/${f.files.length}`,
        '',
        'Browse: `_repo/app/` · `_repo/lib/`',
        '',
        '← [[../Index|Code Index]] · Area: [[../../2-Areas/Index]]',
      ],
      { tags: f.tags, vaultZone: 'code' }
    );
  }
}

export function syncLibNotes(vault, root) {
  const dir = path.join(vault, 'Code', 'Lib');
  ensureDir(dir);
  for (const lib of SMITE2_LIB) {
    const n = countExistingFiles(root, lib.files);
    writeVaultNote(
      path.join(dir, `${lib.id}.md`),
      lib.id,
      [
        '| Module |',
        '|--------|',
        ...lib.files.map((p) => `| \`${p}\` |`),
        '',
        `**Files present:** ${n}/${lib.files.length}`,
        '',
        '← [[../Index|Code Index]]',
      ],
      { tags: lib.tags, vaultZone: 'code' }
    );
  }
}

export function syncAreaNotes(vault) {
  const dir = path.join(vault, '2-Areas');
  ensureDir(dir);
  for (const area of SMITE2_AREAS) {
    writeVaultNote(
      path.join(dir, `${area.id}.md`),
      area.id,
      [area.body, '', '## Links', '', ...area.links.map((l) => `- ${l}`), '', '← [[Index|Areas Index]]'],
      { tags: area.tags, vaultZone: 'area' }
    );
  }
}

export function syncAssetNotes(vault) {
  const dir = path.join(vault, 'Assets');
  ensureDir(dir);
  for (const asset of SMITE2_ASSETS) {
    writeVaultNote(
      path.join(dir, `${asset.id}.md`),
      asset.id,
      [
        '| Path / command |',
        '|----------------|',
        ...asset.paths.map((p) => `| \`${p}\` |`),
        '',
        '← [[Index|Assets Index]]',
      ],
      { tags: asset.tags, vaultZone: 'assets' }
    );
  }
  writeVaultNote(
    path.join(dir, 'Index.md'),
    'Assets — index',
    [
      'Binary and JSON assets stay in the repo — these notes index what exists.',
      '',
      '| Note | Contents |',
      '|------|----------|',
      ...SMITE2_ASSETS.map((a) => `| [[Assets/${a.id}]] | ${a.paths[0]} |`),
      '',
      'Live browse: `_repo/app/data/`',
    ],
    { tags: ['assets', 'context-anchor'], vaultZone: 'assets' }
  );
}

export function buildCodeIndexFull() {
  const featRows = SMITE2_FEATURES.map(
    (f) => `| ${f.id} | [[Code/Features/${f.id}]] | ${f.files.slice(0, 2).map((p) => `\`${path.basename(p)}\``).join(', ')} |`
  );
  const libRows = SMITE2_LIB.map((l) => `| ${l.id} | [[Code/Lib/${l.id}]] | ${l.files.length} modules |`);
  return [
    '# Code — source map',
    '',
    '_Auto-generated — **npm run vault:sync**_',
    '',
    'Paths relative to repo root. Live browse: [[Project Explorer]].',
    '',
    '## App surfaces (routes & flows)',
    '',
    '| Surface | Note | Key files |',
    '|---------|------|-----------|',
    ...featRows,
    '',
    '## Lib groupings',
    '',
    '| Group | Note | |',
    '|-------|------|---|',
    ...libRows,
    '',
    '## Stack folders',
    '',
    '| Area | Note | Path |',
    '|------|------|------|',
    '| App routes | [[Code/App]] | `app/` |',
    '| Shared lib | [[Code/Lib]] | `lib/` |',
    '| Hooks | [[Code/Hooks]] | `hooks/` |',
    '| Config | [[Code/Config]] | `config/` |',
    '| Game data | [[Code/Data]] | `app/data/` |',
    '',
    'Stats: ![[_generated/feature-stats]]',
    '',
  ].join('\n');
}

export function buildFeatureStats(root) {
  const rows = SMITE2_FEATURES.map((f) => {
    const n = countExistingFiles(root, f.files);
    return `| ${f.id} | ${n} | [[Code/Features/${f.id}]] | ${f.kanban ?? '#dev'} |`;
  });
  const libRows = SMITE2_LIB.map((l) => {
    const n = countExistingFiles(root, l.files);
    return `| ${l.id} | ${n} | [[Code/Lib/${l.id}]] | #code |`;
  });
  return [
    '# Feature file counts',
    '',
    '_Auto-generated — **npm run vault:sync**_',
    '',
    '## App surfaces',
    '',
    '| Surface | Files found | Vault note | Tag |',
    '|---------|-------------|--------------|-----|',
    ...rows,
    '',
    '## Lib',
    '',
    '| Group | Files found | Vault note | Tag |',
    '|-------|-------------|--------------|-----|',
    ...libRows,
    '',
  ].join('\n');
}

export function parseGoalsOpen(md) {
  const start = md.indexOf('## Current goals');
  if (start === -1) return [];
  const end = md.indexOf('\n## ', start + 5);
  const block = end === -1 ? md.slice(start) : md.slice(start, end);
  const items = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^(\s*)- \[ \] (.+)$/);
    if (!m) continue;
    const text = m[2].replace(/\*\*/g, '').trim();
    if (!text || text.startsWith('_')) continue;
    items.push(text);
  }
  return items.slice(0, 25);
}

export function parseImprovementsOpen(md) {
  const idx = md.indexOf('## Pending');
  if (idx === -1) return [];
  const end = md.indexOf('\n## ', idx + 5);
  const block = end === -1 ? md.slice(idx) : md.slice(idx, end);
  const items = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^- \[ \] \*\*(.+?)\*\*/);
    if (m) items.push(m[1].trim());
    else {
      const m2 = line.match(/^- \[ \] (.+)$/);
      if (m2 && !m2[1].startsWith('_')) items.push(m2[1].trim());
    }
  }
  return items.slice(0, 20);
}

export function buildColorLegend() {
  return [
    '# Color legend',
    '',
    'Enable snippets: **Settings → Appearance → CSS snippets**',
    '',
    '| Snippet | Purpose |',
    '|---------|---------|',
    '| **`vault-colors`** | Folder dots, tab tints, tags, Kanban stripes, callout types |',
    '| **`vault-god-pages`** | God pages — cyan shell, stat colors, ability callouts (match app) |',
    '| **`vault-3d`** | Depth, lift-on-hover, canvas shadows |',
    '| **`cursor-agents-vault`** | Cursor agent tags (merged into vault-colors) |',
    '',
    'All three turn **ON** on **npm run vault:sync**.',
    '',
    '| Dot / color | Folder / meaning |',
    '|-------------|------------------|',
    '| 🟢 `#7ec89a` **Code** | `Code/` — routes, lib, features |',
    '| 🔵 `#6eb5d9` **Assets** | `Assets/` — icons, JSON, wallpapers |',
    '| 🟠 `#e8a756` **Tasks** | `Kanban/`, `Master Task List`, `#todo` `#dev` |',
    '| 🟣 `#a892e8` **Infra** | `Scripts/`, `Config/` |',
    '| 🔴 `#e07a7a` **Live repo** | `_repo/` junctions |',
    '| 🟡 `#d4c76a` **Auto-sync** | `_generated/` |',
    '| ⚪ `#8a9bb0` **PARA** | `1-Projects/`, `2-Areas/`, `4-Archives/` |',
    '| 🩵 `#79c9b8` **Docs** | `Docs/`, `3-Resources/` |',
    '| 🟪 `#b892e8` **Council** | `3-Resources/Council/` |',
    '| 🩵 `#4db8e8` **Cursor agents** | `3-Resources/Cursor agents/` |',
    '',
    '## Smite 2 Kanban tags',
    '',
    '| Tag | Use |',
    '|-----|-----|',
    '| `#builds` | Gods, items, custom builder, database |',
    '| `#shop` | Gold, profile cosmetics |',
    '| `#prophecy` | Smite Wars, Wordle, Ability |',
    '| `#guides` | Community guides |',
    '| `#patch` | Patch Hub, patch notes |',
    '| `#data` | builds.json, icons, wallpapers pipeline |',
    '| `#platform` | Vault, Expo, Council infra |',
    '| `#goal` | Open items from GOALS.md |',
    '| `#improvement` | IMPROVEMENTS.md backlog |',
    '',
    'Full palette: [[Kanban/Tag legend]] · Graph: [[3D Graph setup]]',
    '',
  ].join('\n');
}

export function buildDashboard(config, vaultPath, now) {
  const name = config.projectName || 'Smite 2 Companion';
  const features = SMITE2_FEATURES.slice(0, 6)
    .map((f) => `[[Code/Features/${f.id}]]`)
    .join(' · ');
  return `# Dashboard — ${name}

**Vault:** ${vaultPath} · **Last sync:** ${now}

> [!tip] Colors & depth
> [[Color legend]] — folder **●** dots + **vault-colors** + **vault-3d** (enabled on sync).

---

## Visual home

> [!vault-code] Code & map
> [[Project Map]] · [[Project Explorer]] · [[Code/Index]]

> [!vault-tasks] Live dashboards
> [[Dataview Dashboard]] · [[Task Dashboard]] · [[Master Task List]]

> [!vault-sync] Guide
> [[START_HERE]] · [[Color legend]] · [[3D Graph setup]]

---

## Kanban

> [!vault-tasks] Boards
> [[Kanban/Dev tasks board]] · [[Kanban/Bugs board]] · [[Kanban/Goals board]] · [[Kanban/Improvements board]] · [[Kanban/Content backlog board]] · [[Kanban/Test plan board]] · [[Kanban/Tag legend]]

---

## Quick links

| | |
|---|---|
| [[decisions-log]] | Architecture decisions |
| [[Master Task List]] | GTD capture (#todo) |
| [[Task Dashboard]] | Boards + live sync |
| [[Boards/Index]] | TASKS, BUGS, GOALS, IMPROVEMENTS |
| [[1-Projects/Smite-2-Companion-smitescroll]] | Active project |

> [!vault-sync] Weekly
> **Archive:** check off [[Master Task List]], then **npm run vault:archive** → [[4-Archives/Tasks/README]] · **Plugins:** [[PLUGINS]]

---

## Auto-synced data

![[_generated/last-sync]]

![[_generated/feature-stats]]

---

## Code map

> [!vault-code] Features
> ${features} · [[Code/Lib/Build math]] · [[Code/Lib/Icons and media]]

---

## Assets & data

> [!vault-assets] Assets
> [[Assets/Index]] · [[Assets/Game data]] · [[Data/Gods/Index|Gods]] · [[Data/Items/Index|Items]] · [[Assets/Skins and wallpapers]] · [[Assets/Prophecy card art]]

---

## Scripts & infra

> [!vault-infra] Infra
> [[Scripts/Index]] · [[Config/Index]] · [[Docs/Index]] · [SMITE2_DESIGN](../docs/SMITE2_DESIGN.md)

> [!vault-council] AI Council
> [[3-Resources/Council/Council Index]] · **npm run council:ui** → http://localhost:3939 · [[3-Resources/Council/Chair Setup]]

> [!vault-cursor-agent] Cursor agents
> [[3-Resources/Cursor agents/Cursor agents Index]] · [[3-Resources/Cursor agents/skills/00 Read first|00 Read first]]

> [!vault-repo] Live repo
> [[Project Explorer]] — _repo/app, _repo/lib, _repo/docs

---

## Areas (ongoing)

- [[2-Areas/Builds and custom builder]]
- [[2-Areas/Database and items]]
- [[2-Areas/Patch Hub and data]]
- [[2-Areas/Shop and profile]]
- [[2-Areas/Prophecy and minigames]]
- [[2-Areas/Platform agents and council]]

---

## Status snapshot

- **Open bugs:** [BUGS.md](../BUGS.md) · ![[_generated/open-bugs]]
- **Pending tasks:** [TASKS.md](../TASKS.md) → ![[_generated/pending-tasks]]
- **Goals:** [GOALS.md](../GOALS.md) → [[Kanban/Goals board]]
- **Full guide:** [[START_HERE#Task systems]]
`;
}

export function buildStartHere(config, vaultPath) {
  const name = config.projectName || 'Smite 2 Companion';
  return `# START HERE — ${name}

> **Local only** — \`Vault/\` is **gitignored**. Regenerate with **npm run vault:sync**.

**Open:** Obsidian → *Open folder as vault* → ${vaultPath}

**Visual home:** [[Dashboard]] · [[Project Map]] · [[Color legend]]

---

## Vault layout

| Folder | What's inside |
|--------|----------------|
| [[Code/Index]] | App routes + **[[Code/Features/Home|Features]]** (one note per surface) |
| [[Assets/Index]] | Icons, wallpapers, builds.json |
| [[Data/Gods/Index]] | One Obsidian page per god (by pantheon) |
| [[Data/Items/Index]] | One page per item (Starters, Tier 1–3, Consumables, Other) |
| [[Scripts/Index]] | npm scripts |
| [[Docs/Index]] | Repo \`docs/\` |
| [[Config/Index]] | Expo, env, Supabase |
| [[Boards/Index]] | TASKS, BUGS, GOALS, IMPROVEMENTS |
| \`2-Areas/\` | [[2-Areas/Index]] — ongoing product areas |
| [[3-Resources/Council/Council Index]] | AI Council |
| [[3-Resources/Cursor agents/Cursor agents Index]] | Cursor agent skills |
| \`4-Archives/\` | Completed notes |

Notes link to live code via \`_repo/\` junctions (not copied).

---

## Project context

**Smite 2 companion (smitescroll)** — builds, database, Patch Hub, shop, Prophecy, minigames. Expo Router + Supabase.

**Stack:** Expo 54 · RN · React · Supabase · Vercel (web)

---

## Task systems

| System | Location | Vault mirror |
|--------|----------|--------------|
| Bugs | \`../BUGS.md\` | [[Kanban/Bugs board]] · ![[_generated/open-bugs]] |
| Dev tasks | \`../TASKS.md\` | [[Kanban/Dev tasks board]] · ![[_generated/pending-tasks]] |
| Goals | \`../GOALS.md\` | [[Kanban/Goals board]] · ![[_generated/open-goals]] |
| Improvements | \`../IMPROVEMENTS.md\` | [[Kanban/Improvements board]] |
| GTD capture | [[Master Task List]] | #todo inbox |
| Data pipeline | [[Kanban/Content backlog board]] | builds.json, icons, patch notes |

Ship user-visible work → update TASKS + changelog. Max **5 tasks/day** in planning.

---

## GTD rhythm

- **Daily:** [[Daily/README]] — open today's note
- **Capture:** [[Master Task List]] (#todo)
- **Weekly:** process inbox → TASKS.md · **npm run vault:archive**
- **Dashboard:** [[Task Dashboard]] · [[Dataview Dashboard]]

---

## Agent read order

1. This file · 2. [[decisions-log]] · 3. [[Dashboard]] · 4. \`../BUGS.md\` · 5. \`../TASKS.md\` · 6. \`../IMPROVEMENTS.md\` · 7. \`../GOALS.md\`

Design: [SMITE2_DESIGN.md](../docs/SMITE2_DESIGN.md) · Rules: \`.cursor/rules/smite2app-project.mdc\`

---

## Commands

\`\`\`bash
npm run vault:sync      # boards + feature notes + council/agents mirror
npm run vault:archive   # archive completed #todo from Master Task List
npm run council:ui      # http://localhost:3939
\`\`\`

[[Boards/Index]] · [[Project Explorer]]
`;
}

export function buildDailyReadme() {
  return [
    '# Daily notes',
    '',
    'One note per day: **`Daily/YYYY-MM-DD.md`**',
    '',
    '## Create today\'s note',
    '',
    '1. **Ribbon** — calendar / daily note icon',
    '2. **Command palette** — `Daily notes: Open today\'s daily note`',
    '3. **Hotkey** — bind e.g. **Ctrl+Alt+D**',
    '',
    'Template: [[../Templates/Daily note]]',
    '',
    '## Sections',
    '',
    '- **Priorities** — 3–5 for the day',
    '- **Capture** — quick thoughts (#todo → [[../Master Task List]])',
    '- **Dev notes** — what you shipped',
    '',
    'Archive completed tasks: **npm run vault:archive** → [[../4-Archives/Tasks/README]]',
    '',
  ].join('\n');
}

export function buildArchivesTasksReadme() {
  return [
    '# Completed tasks archive',
    '',
    'Completed `#todo` items land here when you run:',
    '',
    '```bash',
    'npm run vault:archive',
    '```',
    '',
    '**Weekly:** check off done items in [[../Master Task List]], then run the command.',
    '',
    'Files: **`YYYY-Www-completed.md`** (ISO week).',
    '',
    '- [[../Master Task List]]',
    '- [[../Dashboard]]',
    '',
  ].join('\n');
}

export function buildProjectMapCanvas(projectName) {
  return {
    nodes: [
      { id: 'grp-generated', type: 'group', label: 'Auto-sync', x: -240, y: -360, width: 320, height: 150, color: '3' },
      { id: 'grp-code', type: 'group', label: 'Code', x: -660, y: -320, width: 280, height: 230, color: '4' },
      { id: 'grp-assets', type: 'group', label: 'Assets', x: 180, y: -320, width: 280, height: 230, color: '5' },
      { id: 'grp-tasks', type: 'group', label: 'Tasks & boards', x: 180, y: 60, width: 280, height: 210, color: '2' },
      { id: 'grp-agents', type: 'group', label: 'Cursor agents', x: 500, y: -200, width: 280, height: 200, color: '5' },
      { id: 'grp-council', type: 'group', label: 'AI Council', x: 500, y: 40, width: 280, height: 200, color: '6' },
      {
        id: 'center',
        type: 'text',
        text: `# ${projectName}\n\n[[Dashboard]] · [[Dataview Dashboard]]\n\n\`npm run vault:sync\``,
        x: -200,
        y: -60,
        width: 320,
        height: 130,
        color: '4',
      },
      {
        id: 'code',
        type: 'text',
        text: '## Code\n\n[[Code/Index]]\n\n[[Code/Features/Builds]]\n[[Code/Features/Database]]\n[[Code/Features/Prophecy]]\n[[Code/Features/Shop]]',
        x: -640,
        y: -280,
        width: 240,
        height: 200,
        color: '4',
      },
      {
        id: 'assets',
        type: 'text',
        text: '## Assets\n\n[[Assets/Index]]\n\n[[Assets/Game data]]\n[[Assets/Skins and wallpapers]]',
        x: 200,
        y: -280,
        width: 240,
        height: 160,
        color: '5',
      },
      {
        id: 'tasks',
        type: 'text',
        text: '## Tasks\n\n[[Master Task List]]\n[[Task Dashboard]]\n[[Kanban/Dev tasks board]]\n[[Kanban/Bugs board]]\n[[Kanban/Goals board]]',
        x: 200,
        y: 90,
        width: 240,
        height: 160,
        color: '2',
      },
      {
        id: 'generated',
        type: 'text',
        text: '## Auto-sync\n\n![[_generated/last-sync]]\n\n![[_generated/feature-stats]]',
        x: -180,
        y: -330,
        width: 260,
        height: 100,
        color: '3',
      },
      {
        id: 'cursor-agents',
        type: 'text',
        text: '## Cursor agents\n\n[[3-Resources/Cursor agents/Cursor agents Index]]\n\n[[3-Resources/Cursor agents/skills/00 Read first|00 Read first]]\n[[3-Resources/Cursor agents/skills/smite2-design|DESIGN]]',
        x: 520,
        y: -170,
        width: 240,
        height: 160,
        color: '5',
      },
      {
        id: 'council',
        type: 'text',
        text: '## AI Council\n\n[[3-Resources/Council/Council Index]]\n\n[[3-Resources/Council/Chair Setup]]\n\n`npm run council:ui`',
        x: 520,
        y: 70,
        width: 240,
        height: 150,
        color: '6',
      },
    ],
    edges: [
      { id: 'e1', fromNode: 'center', fromSide: 'left', toNode: 'code', toSide: 'right', color: '4' },
      { id: 'e2', fromNode: 'center', fromSide: 'right', toNode: 'assets', toSide: 'left', color: '5' },
      { id: 'e3', fromNode: 'center', fromSide: 'right', toNode: 'tasks', toSide: 'left', color: '2' },
      { id: 'e4', fromNode: 'center', fromSide: 'top', toNode: 'generated', toSide: 'bottom', color: '3' },
      { id: 'e5', fromNode: 'center', fromSide: 'right', toNode: 'cursor-agents', toSide: 'left', color: '5' },
      { id: 'e6', fromNode: 'center', fromSide: 'right', toNode: 'council', toSide: 'left', color: '6' },
    ],
  };
}

export function patchVaultColorsSmiteTags(vault) {
  const colorsPath = path.join(vault, '.obsidian', 'snippets', 'vault-colors.css');
  if (!fs.existsSync(colorsPath)) return;
  const marker = '/* smite2-kanban-tags-sync */';
  if (fs.readFileSync(colorsPath, 'utf8').includes(marker)) return;
  const block = `
${marker}
.kanban-plugin__item-tag[href="#builds"] { --tag-background: rgba(110, 181, 217, 0.35); --tag-color: #9ed0f0; }
.kanban-plugin__item-tag[href="#shop"] { --tag-background: rgba(232, 167, 86, 0.35); --tag-color: #f0c078; }
.kanban-plugin__item-tag[href="#prophecy"] { --tag-background: rgba(184, 146, 232, 0.35); --tag-color: #d4b8f0; }
.kanban-plugin__item-tag[href="#guides"] { --tag-background: rgba(125, 211, 252, 0.3); --tag-color: #7dd3fc; }
.kanban-plugin__item-tag[href="#patch"] { --tag-background: rgba(148, 163, 184, 0.35); --tag-color: #cbd5e1; }
.kanban-plugin__item-tag[href="#data"] { --tag-background: rgba(212, 199, 106, 0.35); --tag-color: #e8e0a8; }
.kanban-plugin__item-tag[href="#goal"] { --tag-background: rgba(126, 200, 154, 0.22); --tag-color: #9ee0b8; }
.kanban-plugin__item-tag[href="#improvement"] { --tag-background: rgba(168, 146, 232, 0.22); --tag-color: #c4b4f0; }
.kanban-plugin__item-content-wrapper:has(.kanban-plugin__item-tag[href="#builds"]) { border-left: 3px solid #6eb5d9; padding-left: 6px; }
.kanban-plugin__item-content-wrapper:has(.kanban-plugin__item-tag[href="#shop"]) { border-left: 3px solid #e8a756; padding-left: 6px; }
.kanban-plugin__item-content-wrapper:has(.kanban-plugin__item-tag[href="#prophecy"]) { border-left: 3px solid #b892e8; padding-left: 6px; }
.kanban-plugin__item-content-wrapper:has(.kanban-plugin__item-tag[href="#data"]) { border-left: 3px solid #d4c76a; padding-left: 6px; }
/* end smite2-kanban-tags-sync */
`;
  fs.appendFileSync(colorsPath, block);
}
