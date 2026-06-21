/**
 * Rich Obsidian god page body — card art, ability icons, app-matched colors.
 * Requires CSS snippet vault-god-pages + cssclasses: smite-god-page.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  colorizeAbilityDesc,
  colorizeScales,
  formatScalesReadable,
  powerTypeClass,
  scalesClass,
  statSpan,
  stanceCalloutType,
} from './vault-god-colors.mjs';

const IMAGE_EXT = /\.(webp|png|jpe?g|gif)$/i;
const CDN_MASTER = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master';
const CDN_MAIN_IMG = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info';

export function buildIconIndex(root) {
  const iconsRoot = path.join(root, 'app', 'data', 'Icons');
  const index = new Map();
  if (!fs.existsSync(iconsRoot)) return index;

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (IMAGE_EXT.test(ent.name)) {
        const rel = path.relative(path.join(root, 'app'), full).replace(/\\/g, '/');
        const repoPath = `app/data/${rel.startsWith('data/') ? rel.slice(5) : rel}`;
        const key = ent.name.toLowerCase();
        const existing = index.get(key);
        const isItemIcon = repoPath.includes('Item Icons');
        if (!existing || (isItemIcon && !existing.includes('Item Icons'))) {
          index.set(key, repoPath);
        }
        // Also index lowerCamel / PascalCase aliases (agilityGreaves ↔ AgilityGreaves)
        const dot = ent.name.lastIndexOf('.');
        const stem = dot > 0 ? ent.name.slice(0, dot) : ent.name;
        const ext = dot > 0 ? ent.name.slice(dot) : '';
        const aliasKeys = new Set([ent.name, key]);
        if (/^[A-Z]/.test(stem) && stem.length > 1) {
          aliasKeys.add(stem.charAt(0).toLowerCase() + stem.slice(1) + ext);
        }
        if (/^[a-z]/.test(stem) && /[A-Z]/.test(stem.slice(1))) {
          aliasKeys.add(stem.charAt(0).toUpperCase() + stem.slice(1) + ext);
        }
        for (const alias of aliasKeys) {
          const aliasLower = alias.toLowerCase();
          const ex = index.get(aliasLower);
          if (!ex || (isItemIcon && !ex.includes('Item Icons'))) {
            index.set(aliasLower, repoPath);
          }
        }
      }
    }
  }
  walk(iconsRoot);
  return index;
}

export function embedPrefixForNote(vaultRelNote) {
  const depth = vaultRelNote.replace(/\\/g, '/').split('/').length - 1;
  return `${'../'.repeat(depth)}_repo/`;
}

/** Same case variants as app `buildItemIconFilenameCandidates` (for vault icon index lookup). */
function itemIconBasenameKeys(basename) {
  const keys = new Set();
  if (!basename) return keys;
  keys.add(basename.toLowerCase());
  const dot = basename.lastIndexOf('.');
  const stem = dot > 0 ? basename.slice(0, dot) : basename;
  const ext = dot > 0 ? basename.slice(dot) : '';
  keys.add((stem + ext).toLowerCase());
  if (/^[A-Z]/.test(stem) && stem.length > 1) {
    keys.add((stem.charAt(0).toLowerCase() + stem.slice(1) + ext).toLowerCase());
  }
  if (/^[a-z]/.test(stem) && /[A-Z]/.test(stem.slice(1))) {
    keys.add((stem.charAt(0).toUpperCase() + stem.slice(1) + ext).toLowerCase());
  }
  return keys;
}

function resolveRepoPath(iconPath, iconIndex) {
  if (!iconPath) return null;
  const raw = String(iconPath).trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(raw)) return null;

  const normalized = raw.replace(/^\/+/, '');
  if (normalized.toLowerCase().startsWith('icons/wallpapers/')) {
    return `app/data/Icons/Wallpapers/${path.basename(normalized)}`;
  }
  const basename = path.basename(normalized);
  const lookupKeys =
    normalized.toLowerCase().startsWith('icons/') || !normalized.includes('/')
      ? itemIconBasenameKeys(basename)
      : new Set([basename.toLowerCase()]);
  for (const key of lookupKeys) {
    const hit = iconIndex.get(key);
    if (hit) return hit;
  }
  return null;
}

function cdnFallbackUrl(iconPath) {
  if (!iconPath) return null;
  const raw = String(iconPath).trim().replace(/\\/g, '/');
  if (raw.toLowerCase().includes('wallpapers')) {
    return `${CDN_MASTER}/app/data/Icons/Wallpapers/${path.basename(raw)}`;
  }
  return `${CDN_MAIN_IMG}/${encodeURIComponent(path.basename(raw.replace(/^\/+/, '')))}`;
}

export function formatImage(iconPath, iconIndex, embedPrefix, width = 120) {
  const repoPath = resolveRepoPath(iconPath, iconIndex);
  if (repoPath) {
    return `![[${`${embedPrefix}${repoPath}`.replace(/\\/g, '/')}|${width}]]`;
  }
  const url = cdnFallbackUrl(iconPath);
  return url ? `![](${url})` : '';
}

function cleanDesc(text) {
  if (!text) return '';
  return String(text).replace(/\r/g, '').replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function formatStatValueHtml(v) {
  if (v == null) return '—';
  if (typeof v === 'object' && (v['1'] != null || v[1] != null)) {
    const lv1 = v['1'] ?? v[1];
    const lv20 = v['20'] ?? v[20];
    const rate = v.rate != null && v.rate !== 0 ? ` <span class="smite-stat-cooldown">(+${v.rate}/lvl)</span>` : '';
    return `Lv1 <span class="smite-stat-value">${lv1}</span> → Lv20 <span class="smite-stat-value">${lv20}</span>${rate}`;
  }
  if (Array.isArray(v)) return `<span class="smite-stat-value">${v.join(' · ')}</span>`;
  return `<span class="smite-stat-value">${v}</span>`;
}

const STAT_KEY_LABELS = {
  RangeCheat: 'Range',
  RadiusCheat: 'Radius',
};

function statLabel(key) {
  return STAT_KEY_LABELS[key] ?? key;
}

function shouldIncludeValueKey(key, value) {
  if (/radiuscheat/i.test(key)) return false;
  if (key === 'Damage') {
    const n = Array.isArray(value) ? value[0] : value;
    if (n === 0 || n === '0') return false;
  }
  return true;
}

function valueKeyTable(valueKeys, limit = 8) {
  if (!valueKeys || typeof valueKeys !== 'object') return [];
  const keys = Object.keys(valueKeys).filter((k) => shouldIncludeValueKey(k, valueKeys[k])).slice(0, limit);
  if (!keys.length) return [];

  const rows = keys
    .map((k) => {
      const v = valueKeys[k];
      let cell;
      if (Array.isArray(v)) {
        const display = k === 'RangeCheat' ? `${v[0]}m` : v.join(' · ');
        cell = `<span class="smite-stat-value">${display}</span>`;
      } else {
        cell = formatStatValueHtml(v);
      }
      return `<tr><td>${statSpan(statLabel(k))}</td><td>${cell}</td></tr>`;
    })
    .join('\n');

  return [
    '',
    '<table class="smite-stats">',
    '<thead><tr><th>Stat</th><th>Values</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '',
  ];
}

function isStanceAbility(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  if (!keys.length) return false;
  return (
    keys.every((k) => {
      const v = obj[k];
      return v && typeof v === 'object' && (v.name || v.icon || v.shortDesc);
    }) &&
    !obj.name &&
    !obj.shortDesc
  );
}

function abilityCallout(ability, title, calloutType, iconIndex, embedPrefix, opts = {}) {
  if (!ability?.name && !ability?.shortDesc) return [];
  const iconPath = String(ability.icon ?? '');
  const useGenericIcon = opts.allowGenericIcon === true;
  const icon =
    !useGenericIcon && /basicattack\.webp/i.test(iconPath)
      ? ''
      : formatImage(ability.icon, iconIndex, embedPrefix, 72);
  const scales = ability.scales ? colorizeScales(ability.scales) : '';
  let desc = cleanDesc(ability.shortDesc ?? ability.description ?? '');
  const scalingText = formatScalesReadable(ability.scales);
  if (scalingText && desc && !/\[[^\]]+\]/.test(desc) && /deals\s+(Physical|Magical)\s+Damage/i.test(desc)) {
    desc = desc.replace(/deals\s+(Physical|Magical)\s+Damage/i, `deals [${scalingText}] $1 Damage`);
  }
  const body = desc ? colorizeAbilityDesc(desc) : '';

  const lines = [`> [!${calloutType}]+ ${title}`, '>'];
  if (icon) lines.push(`> ${icon}`, '>');
  if (scales && !opts.scalesInDesc) lines.push(`> ${scales}`, '>');
  if (body) lines.push(`> ${body}`, '');
  lines.push(...valueKeyTable(ability.valueKeys));
  return lines;
}

function formatBasicAttack(basic, iconIndex, embedPrefix) {
  if (!basic?.shortDesc && !basic?.scales) return [];
  return abilityCallout(
    basic,
    'Basic attack',
    'smite-basic',
    iconIndex,
    embedPrefix,
    { scalesInDesc: true, allowGenericIcon: false }
  );
}

function formatSingleAbility(ability, label, iconIndex, embedPrefix, calloutType = 'smite-ability') {
  const name = ability.name ?? label;
  const title = name !== label ? `${label} — ${name}` : label;
  return abilityCallout(ability, title, calloutType, iconIndex, embedPrefix);
}

function formatAbilitySlot(slotKey, slotData, god, iconIndex, embedPrefix) {
  if (!slotData || typeof slotData !== 'object') return [];

  if (isStanceAbility(slotData)) {
    const stances = god.stances?.length ? god.stances : Object.keys(slotData);
    const lines = [`## ${slotKey}`, ''];
    for (const stance of stances) {
      const ab = slotData[stance];
      if (!ab) continue;
      const stanceLabel = `${stance.charAt(0).toUpperCase()}${stance.slice(1)}`;
      lines.push(
        ...formatSingleAbility(ab, `${slotKey} · ${stanceLabel}`, iconIndex, embedPrefix, stanceCalloutType(stance))
      );
    }
    return lines;
  }

  if (Object.keys(slotData).length === 0) return [];
  return [`## ${slotKey}`, '', ...formatSingleAbility(slotData, slotKey, iconIndex, embedPrefix)];
}

function buildCardArtSection(god, iconIndex, embedPrefix) {
  const lines = ['## Card art', '', '<div class="smite-card-wrap">', ''];
  const skins = god.skins && typeof god.skins === 'object' ? Object.values(god.skins) : [];
  const defaultWall =
    skins.find((s) => s?.type?.toLowerCase?.().includes('base'))?.skin ?? skins[0]?.skin ?? null;

  if (defaultWall) {
    const hero = formatImage(defaultWall, iconIndex, embedPrefix, 360);
    if (hero) lines.push(hero, '');
  }

  const portrait = formatImage(god.icon, iconIndex, embedPrefix, 140);
  if (portrait) {
    const epithet = god.subText ? `<span class="smite-epithet">${god.subText}</span>` : '';
    lines.push('| Portrait | |', '|----------|--|', `| ${portrait} | ${epithet} |`, '');
  }

  if (skins.length > 1) {
    lines.push('### Skins & wallpapers', '');
    for (const skin of skins) {
      const img = skin?.skin ? formatImage(skin.skin, iconIndex, embedPrefix, 220) : '';
      const label = skin?.name ?? 'Skin';
      if (img) lines.push(img, `<span class="smite-skin-label">${label}</span>`, '');
    }
  }

  lines.push('</div>', '');
  return lines;
}

function buildAbilitiesSection(god, iconIndex, embedPrefix) {
  const lines = ['## Abilities', ''];

  if (god.passive?.name || god.passive?.shortDesc) {
    lines.push(...formatSingleAbility(god.passive, 'Passive', iconIndex, embedPrefix, 'smite-passive'));
  }
  if (god.basic?.name || god.basic?.shortDesc) {
    lines.push(...formatBasicAttack(god.basic, iconIndex, embedPrefix));
  }

  const abilities = god.abilities;
  if (abilities && typeof abilities === 'object') {
    for (const key of ['A01', 'A02', 'A03', 'A04']) {
      if (abilities[key]) lines.push(...formatAbilitySlot(key, abilities[key], god, iconIndex, embedPrefix));
    }
    if (abilities.Passive && !god.passive) {
      lines.push(...formatAbilitySlot('Passive', abilities.Passive, god, iconIndex, embedPrefix));
    }
  }

  if (god.aspect?.abilities || god.aspect?.name) {
    lines.push('## Aspect', '');
    if (god.aspect.name) lines.push(`<span class="smite-epithet">${god.aspect.name}</span>`, '');
    const aspAb = god.aspect.abilities;
    if (aspAb && typeof aspAb === 'object') {
      for (const key of ['A01', 'A02', 'A03', 'A04', 'Passive']) {
        if (aspAb[key]) lines.push(...formatAbilitySlot(key, aspAb[key], god, iconIndex, embedPrefix));
      }
    }
  }

  if (lines.length <= 2) lines.push('_No ability kit in builds.json._', '');
  return lines;
}

function baseStatLines(baseStats) {
  if (!baseStats || typeof baseStats !== 'object') return [];
  const keys = Object.keys(baseStats);
  if (!keys.length) return [];

  const rows = keys.map((k) => `<tr><td>${statSpan(k)}</td><td>${formatStatValueHtml(baseStats[k])}</td></tr>`).join('\n');
  return [
    '## Base stats',
    '',
    '<table class="smite-stats">',
    '<thead><tr><th>Stat</th><th>Lv1 → Lv20</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '',
  ];
}

function metaTable(god, meta, pantheon, roles, attack, power, scales, builds, skinCount, stances) {
  const pantheonLink = `[[Pantheons/${pantheon}|${pantheon}]]`;
  const powerCls = powerTypeClass(power);
  const powerCell = powerCls ? `<span class="${powerCls}">${power}</span>` : power;
  const roleCell = `<span class="smite-role">${roles}</span>${
    stances ? `<span class="smite-stance-tag"> · Stances: ${stances}</span>` : ''
  }`;

  return [
    `<span class="smite-tagline">${god.shortRole ?? god.subText ?? 'No tagline in data.'}</span>`,
    '',
    '<table class="smite-meta">',
    `<tr><td>Pantheon</td><td>${pantheonLink}</td></tr>`,
    `<tr><td>Role</td><td>${roleCell}</td></tr>`,
    `<tr><td>Attack</td><td>${attack}</td></tr>`,
    `<tr><td>Power</td><td>${powerCell}</td></tr>`,
    `<tr><td>Scales</td><td><span class="${scalesClass(scales)}">${scales}</span></td></tr>`,
    `<tr><td>Type</td><td>${meta?.Type ?? god.Type ?? '—'}</td></tr>`,
    `<tr><td>Builds in app</td><td>${builds}</td></tr>`,
    `<tr><td>Skins</td><td>${skinCount}</td></tr>`,
    '</table>',
    '',
  ];
}

function loreSection(god) {
  const short = god.loreShort ?? god.lore?.short;
  const long = god.loreLong ?? god.lore?.long;
  if (!short && !long) return [];
  const lines = ['## Lore', ''];
  if (short) lines.push(`<span class="smite-body">${short}</span>`, '');
  if (long && long !== short) {
    lines.push('> [!quote]- Full lore', '>');
    for (const para of long.split('\n\n')) {
      lines.push(`> <span class="smite-body">${para.replace(/\n/g, ' ')}</span>`, '>');
    }
    lines.push('');
  }
  return lines;
}

function tipsSection(god) {
  const tips = god.tips;
  if (!Array.isArray(tips) || !tips.length) return [];
  return tips.flatMap((t) => [
    `> [!tip]+ ${t.title ?? 'Tip'}`,
    '>',
    `> <span class="smite-body">${t.value ?? ''}</span>`,
    '',
  ]);
}

export function buildRichGodPage(god, meta, pantheon, { iconIndex, vaultRelNote }) {
  const embedPrefix = embedPrefixForNote(vaultRelNote);
  const roles = Array.isArray(god.roles) ? god.roles.join(', ') : meta?.Role ?? '—';
  const attack = meta?.['Attack Type'] ?? god.range ?? '—';
  const power = meta?.['Power Type'] ?? (Array.isArray(god.scaling) ? god.scaling.join('/') : god.scaling) ?? '—';
  const scales = meta?.['Scales with'] ?? (Array.isArray(god.scaling) ? god.scaling.join('/') : '—');
  const builds = god.builds?.length ?? 0;
  const skinCount = god.skins ? Object.keys(god.skins).length : 0;
  const stances = god.isStanceSwitcher && god.stances?.length ? god.stances.join(', ') : '';
  const pantheonLink = `[[Pantheons/${pantheon}|${pantheon}]]`;

  return [
    ...metaTable(god, meta, pantheon, roles, attack, power, scales, builds, skinCount, stances),
    ...buildCardArtSection(god, iconIndex, embedPrefix),
    ...buildAbilitiesSection(god, iconIndex, embedPrefix),
    ...baseStatLines(god.baseStats),
    ...loreSection(god),
    ...tipsSection(god),
    '## App & repo',
    '',
    '- In-app: **Database → Gods** · **Builds** · **Custom Builder**',
    '- Data: `_repo/app/data/God Information/Builds/builds.json`',
    '',
    `← ${pantheonLink} · [[../Index|All gods]] · [[../../Items|Items (shared index)]]`,
  ];
}
