/**
 * Classroom avatar catalog — badges, god portraits, skin icons.
 * Regenerate: node scripts/gen-classroom-avatars-manifest.mjs
 */

const { badgeUrl, pickBadgeFileForDiscordKey, badgeLabelFromFile } = require('./classroomBadges');

const catalog = require('./classroomAvatars.generated.json');

const ASSETS_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets';
const GOD_INFO_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info';

const ENTRIES = catalog.entries || [];

function assetsUrl(repoPath) {
  const raw = String(repoPath || '').trim().replace(/^\/+/, '');
  const full = raw.startsWith('app/data/') ? raw : `app/data/${raw}`;
  return `${ASSETS_BASE}/${full.split('/').map(encodeURIComponent).join('/')}`;
}

function godFallbackUrl(godName) {
  const base = String(godName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!base) return null;
  return `${GOD_INFO_BASE}/${encodeURIComponent(`${base}Image.webp`)}`;
}

function parseAvatarFields(profile) {
  const kind = String(profile?.avatar_kind || '').trim() || (profile?.avatar_badge ? 'badge' : '');
  const ref =
    String(profile?.avatar_ref || '').trim() ||
    String(profile?.avatar_badge || '').trim() ||
    '';
  return { kind: kind || 'badge', ref };
}

function resolveAvatarUrl(kind, ref) {
  const k = String(kind || 'badge').trim();
  const r = String(ref || '').trim();
  if (!r) return null;

  if (k === 'badge') return badgeUrl(r);
  if (k === 'god') {
    const hit = ENTRIES.find((e) => e.kind === 'god' && e.ref === r);
    if (hit?.url) return hit.url;
    return godFallbackUrl(r);
  }
  if (k === 'skin') {
    const hit = ENTRIES.find((e) => e.kind === 'skin' && e.ref === r);
    if (hit?.url) return hit.url;
    return assetsUrl(r);
  }
  return badgeUrl(r);
}

function resolveAvatarLabel(kind, ref) {
  const k = String(kind || 'badge').trim();
  const r = String(ref || '').trim();
  if (!r) return 'Avatar';

  const hit = ENTRIES.find((e) => e.kind === k && e.ref === r);
  if (hit?.label) return hit.label;
  if (k === 'badge') return badgeLabelFromFile(r);
  if (k === 'god') return r;
  const parts = r.split('/').pop() || r;
  return parts.replace(/\.(png|webp|jpg)$/i, '').replace(/[_-]+/g, ' ');
}

function defaultAvatarForDiscordKey(discordKey) {
  const file = pickBadgeFileForDiscordKey(discordKey);
  return {
    kind: 'badge',
    ref: file,
    url: badgeUrl(file),
    label: badgeLabelFromFile(file),
  };
}

function resolveProfileAvatar(profile, discordKey) {
  const { kind, ref } = parseAvatarFields(profile);
  if (ref) {
    return {
      kind,
      ref,
      url: resolveAvatarUrl(kind, ref),
      label: resolveAvatarLabel(kind, ref),
    };
  }
  return defaultAvatarForDiscordKey(discordKey);
}

function isValidAvatarSelection(kind, ref) {
  const k = String(kind || '').trim();
  const r = String(ref || '').trim();
  if (!r || r.length > 512) return false;
  if (!['badge', 'god', 'skin'].includes(k)) return false;
  if (k === 'badge') return ENTRIES.some((e) => e.kind === 'badge' && e.ref === r);
  if (k === 'god') return ENTRIES.some((e) => e.kind === 'god' && e.ref === r);
  if (k === 'skin') return ENTRIES.some((e) => e.kind === 'skin' && e.ref === r);
  return false;
}

function avatarDbFields(kind, ref) {
  const k = String(kind || 'badge').trim();
  const r = String(ref || '').trim();
  const out = { avatar_kind: k, avatar_ref: r };
  if (k === 'badge') out.avatar_badge = r;
  return out;
}

module.exports = {
  AVATAR_CATALOG: catalog,
  AVATAR_ENTRIES: ENTRIES,
  parseAvatarFields,
  resolveAvatarUrl,
  resolveAvatarLabel,
  resolveProfileAvatar,
  defaultAvatarForDiscordKey,
  isValidAvatarSelection,
  avatarDbFields,
};
