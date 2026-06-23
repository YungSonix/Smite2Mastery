/**
 * Vault-only god encyclopedia — one Obsidian page per god, grouped by pantheon.
 * Items stay on a single Items index (not split per god). Runs on npm run vault:sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeVaultNote } from './vault-smite2-scaffold.mjs';
import { buildIconIndex, buildRichGodPage, formatImage } from './vault-god-page.mjs';
import { installVaultGodPagesSnippet } from './vault-god-colors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function slugify(name) {
  return String(name).replace(/[^\w.-]+/g, '-');
}

function loadSmite2GodsMap(root) {
  const p = path.join(root, 'app', 'data', 'Smite2Gods.json');
  if (!fs.existsSync(p)) return new Map();
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  const map = new Map();
  for (const row of rows) {
    if (row?.godName) map.set(row.godName, row);
  }
  return map;
}

async function loadFlattenedGods(root) {
  const mod = await import(pathToFileURL(path.join(root, 'lib', 'normalizeBuildsGod.js')).href);
  const builds = JSON.parse(fs.readFileSync(path.join(root, 'app/data/God Information/Builds/builds.json'), 'utf8'));
  return mod.flattenBuildsGods(builds.gods ?? []);
}

function removeOrphanGodFiles(godsDir, keepRelPaths) {
  const keep = new Set(keepRelPaths);
  function walk(dir, rel = '') {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${ent.name}` : ent.name;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'Pantheons') continue;
        walk(full, relPath);
        try {
          if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
        } catch {
          /* ignore */
        }
      } else if (ent.name.endsWith('.md') && ent.name !== 'Index.md' && !keep.has(relPath.replace(/\\/g, '/'))) {
        fs.unlinkSync(full);
      }
    }
  }
  walk(godsDir);
}

/** @param {string} vault @param {string} root */
export async function syncVaultGods(vault, root) {
  const godsDir = path.join(vault, 'Data', 'Gods');
  const pantheonDir = path.join(godsDir, 'Pantheons');
  fs.mkdirSync(pantheonDir, { recursive: true });

  const iconIndex = buildIconIndex(root);
  const gods = await loadFlattenedGods(root);
  const metaMap = loadSmite2GodsMap(root);
  const byPantheon = new Map();

  for (const god of gods) {
    const name = god.name ?? god.internalName;
    if (!name) continue;
    const meta = metaMap.get(name);
    const pantheon = god.pantheon ?? meta?.pantheon ?? 'Unknown';
    if (!byPantheon.has(pantheon)) byPantheon.set(pantheon, []);
    byPantheon.get(pantheon).push({ god, meta, name });
  }

  for (const list of byPantheon.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const pantheonNames = [...byPantheon.keys()].sort((a, b) => a.localeCompare(b));
  const keepPaths = [];

  for (const pantheon of pantheonNames) {
    const list = byPantheon.get(pantheon);
    const pantheonFolder = path.join(godsDir, pantheon);
    fs.mkdirSync(pantheonFolder, { recursive: true });

    const godLinks = [];
    for (const { god, meta, name } of list) {
      const fileName = `${name}.md`;
      const relPath = `${pantheon}/${fileName}`;
      keepPaths.push(relPath);
      const vaultRelNote = `Data/Gods/${pantheon}/${fileName}`;

      writeVaultNote(
        path.join(pantheonFolder, fileName),
        name,
        buildRichGodPage(god, meta, pantheon, { iconIndex, vaultRelNote }),
        {
          tags: ['god', 'data', `pantheon/${slugify(pantheon).toLowerCase()}`, 'builds'],
          cssclasses: ['smite-god-page'],
        }
      );

      const role = Array.isArray(god.roles) ? god.roles[0] : meta?.Role ?? '';
      const thumbPrefix = '../'.repeat(3) + '_repo/';
      const thumb = formatImage(god.icon, iconIndex, thumbPrefix, 48);
      godLinks.push(`- ${thumb ? `${thumb} ` : ''}[[${pantheon}/${name}|${name}]]${role ? ` · ${role}` : ''}`);
    }

    writeVaultNote(
      path.join(pantheonDir, `${pantheon}.md`),
      pantheon,
      [
        `${list.length} god${list.length === 1 ? '' : 's'} in **${pantheon}**. Cyan-themed god pages match the in-app Database. Items: [[../Items|Items]].`,
        '',
        '## Gods',
        '',
        ...godLinks,
        '',
        '← [[../Index|All gods]]',
      ],
      { tags: ['pantheon', 'data', 'builds'], cssclasses: ['smite-god-page'] }
    );
  }

  const totalGods = gods.length;
  const pantheonRows = pantheonNames.map(
    (p) => `| [[Pantheons/${p}|${p}]] | ${byPantheon.get(p).length} |`
  );

  writeVaultNote(
    path.join(godsDir, 'Index.md'),
    'Gods',
    [
      `**${totalGods}** gods — card art, colored ability tooltips, and stat labels match **Database** in the app. Enable snippet **vault-god-pages** if colors look plain. Regenerate: \`npm run vault:sync\`.`,
      '',
      '## Pantheons',
      '',
      '| Pantheon | Gods |',
      '|----------|------|',
      ...pantheonRows,
      '',
      '## Quick links',
      '',
      '- [[../../Assets/Game data|Game data assets]]',
      '- [[../../Code/Features/Database|Database feature]]',
      '- [[../../Data/Items/Index|Items encyclopedia]]',
    ],
    { tags: ['data', 'god', 'builds'], cssclasses: ['smite-god-page'] }
  );

  removeOrphanGodFiles(godsDir, keepPaths);
  const snippet = installVaultGodPagesSnippet(vault, root);

  return { ok: true, gods: totalGods, pantheons: pantheonNames.length, iconsIndexed: iconIndex.size, snippet };
}

if (process.argv[1]?.includes('vault-sync-gods')) {
  const root = path.resolve(__dirname, '..');
  const vault = path.join(root, 'Vault');
  syncVaultGods(vault, root).then((r) => {
    console.log(JSON.stringify(r, null, 2));
  });
}
