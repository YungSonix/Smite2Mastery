import catalog from '@repo-lib/classroomAvatars.generated.json';
import {
  badgeUrl,
  badgeLabelFromFile,
  pickBadgeFileForDiscordKey,
} from './classroomBadges';

export const AVATAR_ENTRIES = catalog.entries || [];

const KIND_LABELS = {
  all: 'All',
  badge: 'Badges',
  god: 'Gods',
  skin: 'Skins',
};

export { KIND_LABELS };

export function normAvatarSearch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchAvatarCatalog({ query = '', kind = 'all', limit = 72 } = {}) {
  const q = normAvatarSearch(query);
  const tokens = q ? q.split(' ').filter(Boolean) : [];

  let list = AVATAR_ENTRIES;
  if (kind && kind !== 'all') {
    list = list.filter((e) => e.kind === kind);
  }

  if (tokens.length) {
    list = list.filter((e) => {
      const hay = e.search || normAvatarSearch(e.label);
      return tokens.every((t) => hay.includes(t));
    });
  }

  if (!tokens.length && kind === 'all') {
    list = [...list].sort((a, b) => {
      const rank = (k) => (k === 'god' ? 0 : k === 'skin' ? 1 : 2);
      return rank(a.kind) - rank(b.kind) || a.label.localeCompare(b.label);
    });
  }

  return list.slice(0, limit);
}

export function resolveAvatarFromProfile(profile, discordKey) {
  const kind = profile?.avatar_kind || (profile?.avatar_badge ? 'badge' : 'badge');
  const ref = profile?.avatar_ref || profile?.avatar_badge || '';
  if (ref) {
    const hit = AVATAR_ENTRIES.find((e) => e.kind === kind && e.ref === ref);
    let url = hit?.url || null;
    if (!url && kind === 'badge') url = badgeUrl(ref);
    if (!url && kind === 'god') {
      // Catalog may still hold stale God Icons paths; prefer NewGodSkins Default.
      const folder = String(ref).replace(/[^a-zA-Z0-9]/g, '');
      const special = {
        'Guan Yu': 'Guan_Yu',
        'Hou Yi': 'Hou_Yi',
        'Hun Batz': 'Hun_Batz',
        'Ne Zha': 'Ne_Zha',
        'Sun Wukong': 'Sun_Wukong',
        'Da Ji': 'DaJi',
        'Hua Mulan': 'Mulan',
        'Princess Bari': 'Bari',
      };
      const f = special[ref] || folder;
      if (ref === 'Chronos') {
        url =
          'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info/chronosImage.webp';
      } else if (ref === 'Da Ji') {
        url = `https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data/NewGodSkins/DaJi/Default/t_GodPortrait_Daji.png`;
      } else if (f) {
        url = `https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data/NewGodSkins/${f}/Default/t_GodPortrait_${f}.png`;
      }
    }
    return {
      kind,
      ref,
      url,
      label: hit?.label || (kind === 'badge' ? badgeLabelFromFile(ref) : ref),
    };
  }
  const file = pickBadgeFileForDiscordKey(discordKey);
  return {
    kind: 'badge',
    ref: file,
    url: badgeUrl(file),
    label: badgeLabelFromFile(file),
  };
}
