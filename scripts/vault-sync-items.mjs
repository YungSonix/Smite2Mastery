/**
 * Vault-only item encyclopedia — one page per item, grouped by Database categories.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeVaultNote } from './vault-smite2-scaffold.mjs';
import { installVaultGodPagesSnippet } from './vault-god-colors.mjs';
import {
  compareItemsForList,
  flattenBuildsItems,
  getItemSectionId,
  safeItemFileName,
  sectionForId,
  VAULT_ITEM_SECTIONS,
} from './vault-item-categories.mjs';
import { buildIconIndex, buildItemPathMap, buildRichItemPage } from './vault-item-page.mjs';
import { formatImage } from './vault-god-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeOrphanItemFiles(itemsDir, keepRelPaths) {
  const keep = new Set(keepRelPaths);
  function walk(dir, rel = '') {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${ent.name}` : ent.name;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'Categories') continue;
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
  walk(itemsDir);
}

/** @param {string} vault @param {string} root */
export async function syncVaultItems(vault, root) {
  const itemsDir = path.join(vault, 'Data', 'Items');
  const categoriesDir = path.join(itemsDir, 'Categories');
  fs.mkdirSync(categoriesDir, { recursive: true });

  const builds = JSON.parse(fs.readFileSync(path.join(root, 'app/data/God Information/Builds/builds.json'), 'utf8'));
  const allItems = flattenBuildsItems(builds.items).filter(
    (item) => item && (item.name || item.internalName || item.active === true || item.consumable === true)
  );

  const allByInternal = new Map();
  for (const item of allItems) {
    if (item.internalName) allByInternal.set(item.internalName, item);
  }

  const itemsBySection = new Map(VAULT_ITEM_SECTIONS.map((s) => [s.id, []]));
  for (const item of allItems) {
    const sid = getItemSectionId(item);
    itemsBySection.get(sid)?.push(item);
  }
  for (const list of itemsBySection.values()) {
    list.sort(compareItemsForList);
  }

  const itemPathByInternal = buildItemPathMap(itemsBySection);
  const iconIndex = buildIconIndex(root);
  const keepPaths = [];
  const totalItems = allItems.length;

  for (const section of VAULT_ITEM_SECTIONS) {
    const list = itemsBySection.get(section.id) ?? [];
    const folder = path.join(itemsDir, section.folder);
    fs.mkdirSync(folder, { recursive: true });

    const itemLinks = [];
    for (const item of list) {
      const fileName = `${safeItemFileName(item)}.md`;
      const relPath = `${section.folder}/${fileName}`;
      keepPaths.push(relPath);
      const vaultRelNote = `Data/Items/${section.folder}/${fileName}`;

      writeVaultNote(
        path.join(folder, fileName),
        item.name || item.internalName,
        buildRichItemPage(item, section.id, {
          iconIndex,
          vaultRelNote,
          itemPathByInternal,
          allByInternal,
        }),
        {
          tags: ['item', 'data', section.id, 'builds'],
          cssclasses: ['smite-item-page', 'smite-god-page'],
        }
      );

      const thumbPrefix = '../'.repeat(3) + '_repo/';
      const thumb = item.icon ? formatImage(item.icon, iconIndex, thumbPrefix, 40) : '';
      itemLinks.push(
        `- ${thumb ? `${thumb} ` : ''}[[${section.folder}/${safeItemFileName(item)}|${item.name || item.internalName}]]`
      );
    }

    writeVaultNote(
      path.join(categoriesDir, `${section.folder}.md`),
      section.title,
      [
        `**${list.length}** items — same grouping as **Database → Items** in the app.`,
        '',
        '## Items',
        '',
        ...(itemLinks.length ? itemLinks : ['_No items in this category._']),
        '',
        '← [[../Index|All items]]',
      ],
      { tags: ['item', 'data', section.id, 'builds'], cssclasses: ['smite-item-page', 'smite-god-page'] }
    );

    writeVaultNote(
      path.join(folder, 'Index.md'),
      section.title,
      [
        `[[../Categories/${section.folder}|Category hub]] · **${list.length}** items`,
        '',
        '## Items',
        '',
        ...(itemLinks.length ? itemLinks : ['_Empty._']),
        '',
        '← [[../Index|All items]]',
      ],
      { tags: ['item', 'data', section.id, 'builds'], cssclasses: ['smite-item-page', 'smite-god-page'] }
    );
  }

  const categoryRows = VAULT_ITEM_SECTIONS.map((s) => {
    const n = itemsBySection.get(s.id)?.length ?? 0;
    return `| [[Categories/${s.folder}|${s.title}]] | ${n} |`;
  });

  writeVaultNote(
    path.join(itemsDir, 'Index.md'),
    'Items',
    [
      `**${totalItems}** items — one Obsidian page each, grouped like the in-app **Database → Items** tabs (Starters, Tier 1–3, Consumables, Relics/actives). Enable **vault-god-pages** CSS for colors.`,
      '',
      '## Categories',
      '',
      '| Category | Items |',
      '|----------|-------|',
      ...categoryRows,
      '',
      '## Quick links',
      '',
      '- [[../../Assets/Game data|Game data assets]]',
      '- [[../../Code/Features/Database|Database feature]]',
      '- [[../../Gods/Index|Gods]]',
    ],
    { tags: ['data', 'item', 'builds'], cssclasses: ['smite-item-page', 'smite-god-page'] }
  );

  removeOrphanItemFiles(itemsDir, keepPaths);

  const legacyItems = path.join(vault, 'Data', 'Items.md');
  if (fs.existsSync(legacyItems)) fs.unlinkSync(legacyItems);

  const snippet = installVaultGodPagesSnippet(vault, root);

  return {
    ok: true,
    items: totalItems,
    categories: VAULT_ITEM_SECTIONS.length,
    snippet,
  };
}

if (process.argv[1]?.includes('vault-sync-items')) {
  const root = path.resolve(__dirname, '..');
  const vault = path.join(root, 'Vault');
  syncVaultItems(vault, root).then((r) => {
    console.log(JSON.stringify(r, null, 2));
  });
}
