/**
 * Classroom avatar badges — same catalog as profile badges (GitHub img/Badges).
 * Manifest extracted from PROFILE_BADGE_FILES in app/_screens/profile.jsx.
 * Regenerate: node scripts/gen-classroom-badges-manifest.mjs
 */

const BADGE_BASE_URL =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/Badges';

/** @type {string[]} */
const files = require('./classroomBadges.generated.json');

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function badgeUrl(filename) {
  if (!filename) return null;
  return `${BADGE_BASE_URL}/${encodeURIComponent(filename)}`;
}

function badgeLabelFromFile(filename) {
  const base = String(filename || '')
    .replace(/^60px-/i, '')
    .replace(/\.png$/i, '')
    .replace(/-MasteryBadge$/i, '')
    .replace(/^Badge-/i, '')
    .replace(/^Cutesy-/i, '')
    .replace(/^T5Skin-/i, '')
    .replace(/^Event-/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\-_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = base.split(' ').filter(Boolean);
  return words.slice(0, 2).join(' ') || 'Badge';
}

/** Stable random badge per Discord identity (same player = same avatar forever). */
function pickBadgeFileForDiscordKey(discordKey, list = files) {
  const key = String(discordKey || '').trim().toLowerCase();
  if (!key || !list?.length) return list?.[0] || null;
  return list[fnv1a(key) % list.length];
}

function pickBadgeForDiscordKey(discordKey) {
  const file = pickBadgeFileForDiscordKey(discordKey);
  if (!file) return null;
  return {
    file,
    url: badgeUrl(file),
    label: badgeLabelFromFile(file),
  };
}

module.exports = {
  CLASSROOM_BADGE_FILES: files,
  BADGE_BASE_URL,
  badgeUrl,
  badgeLabelFromFile,
  pickBadgeFileForDiscordKey,
  pickBadgeForDiscordKey,
  fnv1a,
};
