/**
 * Rich Obsidian item pages — icons, colored stats, recipe links.
 */
import path from 'node:path';
import { colorizeAbilityDesc, statSpan } from './vault-god-colors.mjs';
import { buildIconIndex, embedPrefixForNote, formatImage } from './vault-god-page.mjs';
import { safeItemFileName, sectionForId } from './vault-item-categories.mjs';

export { buildIconIndex };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function vaultWikiLink(fromVaultRel, targetRelPath) {
  const fromDir = path.dirname(fromVaultRel.replace(/\\/g, '/'));
  const toNoExt = targetRelPath.replace(/\.md$/i, '').replace(/\\/g, '/');
  const rel = path.relative(fromDir, toNoExt).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function itemTypeLabel(item) {
  if (item.relic) return 'Relic';
  if (item.active && item.consumable) return 'Consumable (active)';
  if (item.active) return 'Active';
  if (item.consumable) return 'Consumable';
  if (item.starter) return 'Starter';
  if (item.tier === 3) return 'Tier 3 item';
  if (item.tier === 2) return 'Tier 2 component';
  if (item.tier === 1) return 'Tier 1 component';
  return '—';
}

function goldSpan(text) {
  return `<span class="smite-gold">${escapeHtml(String(text))}</span>`;
}

function statsTable(stats) {
  if (!stats || typeof stats !== 'object') return [];
  const keys = Object.keys(stats).filter((k) => k !== 'N/A' && k !== 'n/a');
  if (!keys.length) return [];

  const rows = keys
    .map((k) => `<tr><td>${statSpan(k)}</td><td><span class="smite-stat-value">${escapeHtml(stats[k])}</span></td></tr>`)
    .join('\n');

  return [
    '## Stats',
    '',
    '<table class="smite-stats">',
    '<thead><tr><th>Stat</th><th>Value</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '',
  ];
}

function recipeCallout(title, entries) {
  if (!entries.length) return [];
  const lines = [`> [!smite-ability]+ ${title}`, '>'];
  for (const { thumb, link, label } of entries) {
    if (thumb) lines.push(`> ${thumb}`, '>');
    if (link) lines.push(`> [[${link}|${label}]]`, '>');
    else lines.push(`> ${label}`, '>');
  }
  lines.push('');
  return lines;
}

function recipeSection(item, ctx) {
  const { iconIndex, embedPrefix, fromVaultRel, itemPathByInternal, allByInternal } = ctx;
  const lines = [];

  const components = Array.isArray(item.components) ? item.components : [];
  if (components.length) {
    const entries = [];
    for (const ref of components) {
      const comp = allByInternal.get(ref) ?? allByInternal.get(String(ref));
      const label = comp?.name || comp?.internalName || ref;
      if (comp && itemPathByInternal.has(comp.internalName || ref)) {
        const target = itemPathByInternal.get(comp.internalName || ref);
        entries.push({
          thumb: comp.icon ? formatImage(comp.icon, iconIndex, embedPrefix, 48) : '',
          link: vaultWikiLink(fromVaultRel, target),
          label,
        });
      } else {
        entries.push({ thumb: '', link: '', label: `${label} _(not in builds.json)_` });
      }
    }
    lines.push(...recipeCallout('Recipe', entries));
  }

  const buildsInto = Array.isArray(item.buildsIntoT3) ? item.buildsIntoT3 : [];
  if (buildsInto.length) {
    const entries = [];
    for (const ref of buildsInto) {
      const target = allByInternal.get(ref);
      const label = target?.name || ref;
      if (target && itemPathByInternal.has(target.internalName || ref)) {
        entries.push({
          thumb: target.icon ? formatImage(target.icon, iconIndex, embedPrefix, 48) : '',
          link: vaultWikiLink(fromVaultRel, itemPathByInternal.get(target.internalName || ref)),
          label,
        });
      } else {
        entries.push({ thumb: '', link: '', label });
      }
    }
    lines.push(...recipeCallout('Builds into', entries));
  }

  return lines;
}

function passiveSection(item) {
  const passive = item.passive;
  if (!passive || typeof passive !== 'string' || !passive.trim()) return [];
  const body = colorizeAbilityDesc(passive.replace(/^Passive:\s*/i, '').trim());
  return [
    '## Passive',
    '',
    '> [!smite-passive]+ Passive',
    '>',
    `> ${body}`,
    '',
  ];
}

function patchSection(item) {
  const pc = item.patchChanges ?? item.latestPatchChange;
  if (!pc) return [];
  const lines = ['## Patch notes', ''];
  if (typeof pc === 'string') {
    lines.push(`<span class="smite-body">${escapeHtml(pc)}</span>`, '');
    return lines;
  }
  if (typeof pc === 'object') {
    for (const [patch, changes] of Object.entries(pc)) {
      const list = Array.isArray(changes) ? changes : [changes];
      lines.push(`**${patch}**`, '', ...list.map((c) => `- ${escapeHtml(String(c))}`), '');
    }
    return lines;
  }
  return [];
}

export function buildRichItemPage(item, sectionId, ctx) {
  const section = sectionForId(sectionId);
  const embedPrefix = embedPrefixForNote(ctx.vaultRelNote);
  const icon = formatImage(item.icon, ctx.iconIndex, embedPrefix, 120);
  const tags = Array.isArray(item.tags) ? item.tags.join(', ') : '—';
  const cost =
    item.totalCost != null
      ? `${item.totalCost} Gold`
      : item.stepCost != null
        ? `${item.stepCost} Gold`
        : '—';
  const sectionLink = `[[../Categories/${section.folder}|${section.title}]]`;

  const metaRows = [
    `<tr><td>Category</td><td>${sectionLink}</td></tr>`,
    `<tr><td>Tier</td><td>${item.tier != null ? `Tier ${item.tier}` : '—'}</td></tr>`,
    `<tr><td>Type</td><td>${itemTypeLabel(item)}</td></tr>`,
    `<tr><td>Cost</td><td>${goldSpan(cost)}</td></tr>`,
    ...(item.stepCost != null && item.totalCost != null
      ? [`<tr><td>Component cost</td><td>${goldSpan(`${item.stepCost} Gold`)}</td></tr>`]
      : []),
    `<tr><td>Tags</td><td><span class="smite-role">${escapeHtml(tags)}</span></td></tr>`,
    ...(item.internalName ? [`<tr><td>Internal</td><td><code>${escapeHtml(item.internalName)}</code></td></tr>`] : []),
  ];

  return [
    ...(icon ? [icon, ''] : []),
    '<table class="smite-meta">',
    ...metaRows,
    '</table>',
    '',
    ...statsTable(item.stats),
    ...passiveSection(item),
    ...recipeSection(item, { ...ctx, embedPrefix, fromVaultRel: ctx.vaultRelNote }),
    ...patchSection(item),
    '## App & repo',
    '',
    '- In-app: **Database → Items** · **Custom Builder**',
    '- Data: `_repo/app/data/God Information/Builds/builds.json`',
    '',
    `← ${sectionLink} · [[../Index|All items]] · [[../../Gods/Index|Gods]]`,
  ];
}

export function buildItemPathMap(itemsBySection) {
  const itemPathByInternal = new Map();
  for (const [sectionId, list] of itemsBySection) {
    const folder = sectionForId(sectionId).folder;
    for (const item of list) {
      const key = item.internalName || safeItemFileName(item);
      itemPathByInternal.set(key, `Data/Items/${folder}/${safeItemFileName(item)}.md`);
    }
  }
  return itemPathByInternal;
}
