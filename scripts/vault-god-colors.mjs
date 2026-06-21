/**
 * Stat / damage colors aligned with app/data.jsx (Database + kit tooltips).
 */
import fs from 'node:fs';
import path from 'node:path';

const HEALTH_STATS = ['MaxHealth', 'Health', 'HP5', 'Health Regen', 'HealthPerTime', 'HealthPerSecond'];
const ATTACK_STATS = [
  'AttackSpeed',
  'AttackSpeedPercent',
  'BaseAttackSpeed',
  'Critical Chance',
  'CriticalChance',
  'Critical Damage',
  'Attack Speed',
  'Basic Attack Damage',
  'Basic Damage',
  'BasicDamage',
];
const PHYSICAL_STATS = ['PhysicalProtection', 'Penetration', 'Physical Protection'];
const MAGICAL_PROT_STATS = ['MagicalProtection', 'Magical Protection'];
const MANA_STATS = ['MaxMana', 'MP5', 'Mana Regen', 'Mana', 'Mana Regeneration', 'ManaPerTime', 'ManaPerSecond'];

export function statColorClass(statKey) {
  const k = String(statKey ?? '');
  if (HEALTH_STATS.some((s) => k === s || k.includes(s))) return 'smite-stat-health';
  if (ATTACK_STATS.some((s) => k === s || k.includes(s))) return 'smite-stat-attack';
  if (PHYSICAL_STATS.some((s) => k === s || k.includes(s))) return 'smite-stat-physical';
  if (k === 'Intelligence' || k === 'MagicalPower') return 'smite-stat-int';
  if (k === 'Strength') return 'smite-stat-str';
  if (k === 'Cooldown Rate' || k === 'Cooldown') return 'smite-stat-cooldown';
  if (MAGICAL_PROT_STATS.some((s) => k === s)) return 'smite-stat-magical';
  if (k === 'Lifesteal') return 'smite-stat-lifesteal';
  if (MANA_STATS.some((s) => k === s || k.includes(s))) return 'smite-stat-mana';
  if (k === 'MovementSpeed' || k === 'Movement Speed') return 'smite-stat-move';
  return 'smite-stat-default';
}

export function statSpan(statKey) {
  const cls = statColorClass(statKey);
  return `<span class="${cls}">${escapeHtml(statKey)}</span>`;
}

export function powerTypeClass(power) {
  const p = String(power ?? '').toLowerCase();
  if (p.includes('physical')) return 'smite-power-physical';
  if (p.includes('magical')) return 'smite-power-magical';
  return '';
}

export function stanceCalloutType(stance) {
  const s = String(stance ?? '').toLowerCase();
  if (s === 'fire') return 'smite-fire';
  if (s === 'ice') return 'smite-ice';
  if (s === 'arcane') return 'smite-arcane';
  return 'smite-ability';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Bracket scaling + damage type highlights (like in-app tooltips). */
export function colorizeAbilityDesc(text) {
  if (!text) return '';
  let out = escapeHtml(text);

  out = out.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const low = inner.toLowerCase();
    let cls = 'smite-scale';
    if (/\bint\b/.test(low) && !/\bstr\b/.test(low)) cls = 'smite-scale-int';
    else if (/\bstr\b/.test(low) && /\bint\b/.test(low)) cls = 'smite-scale-mixed';
    return `<span class="${cls}">[${inner}]</span>`;
  });

  out = out.replace(/\bPhysical Damage\b/gi, '<span class="smite-dmg-physical">Physical Damage</span>');
  out = out.replace(/\bMagical Damage\b/gi, '<span class="smite-dmg-magical">Magical Damage</span>');
  out = out.replace(/\bTrue Damage\b/gi, '<span class="smite-dmg-true">True Damage</span>');

  out = out.replace(/\n/g, '<br>\n');
  out = out.replace(/•/g, '<span style="color:#7dd3fc">•</span>');

  return `<span class="smite-body">${out}</span>`;
}

function coeffToPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n > 0 && n <= 1) return `${Math.round(n * 100)}%`;
  return `${n}%`;
}

/** Human-readable scales — never dump JSON into Obsidian. */
export function formatScalesReadable(scales) {
  if (!scales) return '';
  if (typeof scales === 'string') return scales.trim();

  if (typeof scales === 'object' && Array.isArray(scales.Damage_Scaling)) {
    const parts = [];
    for (const entry of scales.Damage_Scaling) {
      const stat = entry?.stat;
      const raw = Array.isArray(entry?.values) && entry.values.length ? entry.values[0] : entry?.values;
      const pct = coeffToPercent(raw);
      if (stat === 'PhysicalPower' || stat === 'InhandPower') parts.push(`${pct} STR`);
      else if (stat === 'MagicalPower') parts.push(`${pct} INT`);
      else if (stat) parts.push(`${stat} ${pct}`);
    }
    return parts.join(' + ');
  }

  if (typeof scales === 'object') {
    return Object.entries(scales)
      .map(([k, v]) => {
        if (typeof v === 'string') return v.includes('%') ? v : `${k}: ${v}`;
        if (Array.isArray(v)) return `${k}: ${v.join(' · ')}`;
        if (typeof v === 'object' && v !== null) return null;
        return `${k}: ${v}`;
      })
      .filter(Boolean)
      .join(' · ');
  }

  return String(scales);
}

function scalesHtmlColored(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  let cls = 'smite-scale';
  if (/\bint\b/.test(low) && !/\bstr\b/.test(low)) cls = 'smite-scale-int';
  else if (/\bstr\b/.test(low) && /\bint\b/.test(low)) cls = 'smite-scale-mixed';

  const colored = raw
    .split(/\s+\+\s+/)
    .map((part) => {
      const p = part.trim();
      if (/\bint\b/i.test(p) && !/\bstr\b/i.test(p)) {
        return `<span class="smite-scale-int">${escapeHtml(p)}</span>`;
      }
      if (/\bstr\b/i.test(p)) return `<span class="smite-scale">${escapeHtml(p)}</span>`;
      return escapeHtml(p);
    })
    .join(' <span class="smite-muted">+</span> ');

  return `<span class="smite-label">Scales</span> <span class="${cls}">${colored}</span>`;
}

export function colorizeScales(scales) {
  const raw = formatScalesReadable(scales);
  if (!raw) return '';
  return scalesHtmlColored(raw);
}

export function scalesClass(scales) {
  const low = String(scales ?? '').toLowerCase();
  if (/\bint\b/.test(low) && !/\bstr\b/.test(low)) return 'smite-scale-int';
  if (/\bstr\b/.test(low) && /\bint\b/.test(low)) return 'smite-scale-mixed';
  return 'smite-scale';
}

export function installVaultGodPagesSnippet(vault, root) {
  const src = path.join(root, 'docs', 'vault', 'vault-god-pages.css');
  if (!fs.existsSync(src)) return { ok: false, error: 'missing docs/vault/vault-god-pages.css' };
  const dest = path.join(vault, '.obsidian', 'snippets', 'vault-god-pages.css');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return { ok: true, path: dest };
}
