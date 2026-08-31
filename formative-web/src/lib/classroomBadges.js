import badgeFiles from '@repo-lib/classroomBadges.generated.json';
import { resolveAvatarFromProfile } from './classroomAvatars';

export const BADGE_BASE_URL =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/Badges';

export const CLASSROOM_BADGE_FILES = badgeFiles;

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function badgeUrl(filename) {
  if (!filename) return null;
  return `${BADGE_BASE_URL}/${encodeURIComponent(filename)}`;
}

export function badgeLabelFromFile(filename) {
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

export function pickBadgeFileForDiscordKey(discordKey, list = CLASSROOM_BADGE_FILES) {
  const key = String(discordKey || '').trim().toLowerCase();
  if (!key || !list?.length) return list?.[0] || null;
  return list[fnv1a(key) % list.length];
}

export function pickBadgeForDiscordKey(discordKey) {
  const file = pickBadgeFileForDiscordKey(discordKey);
  if (!file) return null;
  return { file, url: badgeUrl(file), label: badgeLabelFromFile(file) };
}

/** ClassDojo-style points from trivia stats. */
export function classroomPointsFromStats({ triviasDone = 0, passCount = 0, totalScore = 0 } = {}) {
  return triviasDone * 15 + passCount * 10 + Math.round(totalScore / 5);
}

export function mergeClassroomStudent(player, profileRow) {
  const avatar = resolveAvatarFromProfile(profileRow, player.discordKey);
  const classroomAutoPoints =
    profileRow?.classroom_points != null
      ? Number(profileRow.classroom_points)
      : classroomPointsFromStats({
          triviasDone: player.triviasDone,
          passCount: player.passCount,
          totalScore: player.totalScore,
        });
  const classroomBonus = Number(profileRow?.classroom_bonus) || 0;
  return {
    ...player,
    avatarKind: avatar.kind,
    avatarRef: avatar.ref,
    avatarBadge: avatar.kind === 'badge' ? avatar.ref : profileRow?.avatar_badge || null,
    avatarUrl: avatar.url,
    badgeLabel: avatar.label,
    classroomAutoPoints,
    classroomBonus,
    classroomPoints: classroomAutoPoints + classroomBonus,
    isRegular: player.triviasDone >= 2,
    notes: profileRow?.notes || '',
    giveawayEligible: profileRow?.giveaway_eligible !== false,
  };
}
