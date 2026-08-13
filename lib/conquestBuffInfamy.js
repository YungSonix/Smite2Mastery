import { getHelpTip } from './conquestMapHelpText';

/** Camp buff tier unlocks — 3 tiers (.1–.3). Curve time 4 (910 Infamy) is in-game level 3. */
export const CONQUEST_INFAMY_THRESHOLDS = [
  { level: 1, renown: 0 },
  { level: 2, renown: 140 },
  { level: 3, renown: 910 },
];

const BUFF_TIER_KEY_RE = /^(Primal|Blight|InspirationV2?|Pathfinder|Trinkets)\.\d+\.Description$/;

export function isBuffTierHelpKey(key) {
  return Boolean(key && BUFF_TIER_KEY_RE.test(key));
}

/** Ordered tier keys (Primal.1, Primal.2, …) from a POI helpTipKeys list. */
export function getBuffTierHelpKeys(helpTipKeys) {
  return (helpTipKeys || [])
    .filter(isBuffTierHelpKey)
    .sort((a, b) => {
      const tierA = Number(a.match(/\.(\d+)\./)?.[1] || 0);
      const tierB = Number(b.match(/\.(\d+)\./)?.[1] || 0);
      return tierA - tierB;
    });
}

/** Tier-1 buff description key for minimal / hover previews. */
export function getPrimaryBuffHelpKey(helpTipKeys) {
  const tiers = getBuffTierHelpKeys(helpTipKeys);
  return tiers.find((k) => /\.1\.Description$/.test(k)) || tiers[0] || null;
}

export function getPrimaryBuffHelpText(helpTipKeys) {
  const key = getPrimaryBuffHelpKey(helpTipKeys);
  return key ? getHelpTip(key) : '';
}

/** Buff description for Infamy camp level 1–3. */
export function getBuffHelpTextForLevel(helpTipKeys, level = 1) {
  const tiers = getBuffTierHelpKeys(helpTipKeys);
  if (!tiers.length) return '';
  const idx = Math.max(0, Math.min(tiers.length - 1, Number(level) - 1));
  return getHelpTip(tiers[idx]) || '';
}

function formatRenownLabel(renown) {
  if (!renown) return 'Base camp (0 team Infamy)';
  return `${renown.toLocaleString()} team Infamy`;
}

/**
 * Descriptive tooltip block: Infamy intro + each buff tier with renown gate.
 * @param {string[]} helpTipKeys
 */
export function formatBuffInfamyLevelsBlock(helpTipKeys) {
  const tierKeys = getBuffTierHelpKeys(helpTipKeys);
  if (!tierKeys.length) return '';

  const parts = [];
  const infamyIntro = getHelpTip('Infamy.1.Description');
  if (infamyIntro) parts.push(infamyIntro);

  const tierLines = tierKeys.map((key, idx) => {
    const tier = idx + 1;
    const threshold = CONQUEST_INFAMY_THRESHOLDS[tier - 1];
    const renown = threshold?.renown ?? 0;
    const body = getHelpTip(key);
    if (!body) return '';
    return `Buff level ${tier} — ${formatRenownLabel(renown)}\n${body}`;
  });

  parts.push(tierLines.filter(Boolean).join('\n\n'));

  return parts.filter(Boolean).join('\n\n');
}

/** Non-tier help keys (boss rewards, tower tips, etc.). */
export function getNonBuffHelpKeys(helpTipKeys) {
  return (helpTipKeys || []).filter((k) => !isBuffTierHelpKey(k) && !k.startsWith('Infamy'));
}
