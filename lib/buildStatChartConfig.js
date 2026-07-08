/** Stat chart series — grouped like smitecalculator / Recharts legend. */
export const STAT_CHART_GROUPS = [
  {
    id: 'offensive',
    label: 'Offensive',
    series: [
      { key: 'int', label: 'INT', color: '#6366f1', area: true },
      { key: 'strength', label: 'STR', color: '#ef4444' },
      { key: 'attackSpeed', label: 'AS', color: '#ec4899' },
      { key: 'penPct', label: '% PEN', color: '#fdba74' },
    ],
  },
  {
    id: 'damage',
    label: 'Damage',
    series: [
      { key: 'basic', label: 'BASIC', color: '#eab308' },
      { key: 'damage', label: 'DAMAGE', color: '#f97316' },
      { key: 'dps', label: 'DPS', color: '#94a3b8' },
    ],
  },
  {
    id: 'tank',
    label: 'Tank',
    series: [
      { key: 'hp', label: 'HP', color: '#22c55e' },
      { key: 'phys', label: 'PHYS', color: '#64748b' },
      { key: 'mag', label: 'MAG', color: '#475569' },
      { key: 'physEhp', label: 'PHYS EHP', color: '#2dd4bf' },
      { key: 'magEhp', label: 'MAG EHP', color: '#14b8a6' },
    ],
  },
  {
    id: 'utility',
    label: 'Utility',
    series: [
      { key: 'cdr', label: 'CDR', color: '#facc15' },
      { key: 'manaRegen', label: 'MP5', color: '#38bdf8' },
      { key: 'healthRegen', label: 'HP5', color: '#4ade80' },
    ],
  },
];

export const STAT_CHART_ALL_SERIES = STAT_CHART_GROUPS.flatMap((g) => g.series);

export const STAT_CHART_DEFAULT_VISIBLE = {
  int: true,
  basic: true,
  damage: true,
  strength: false,
  attackSpeed: false,
  penPct: false,
  dps: false,
  hp: false,
  phys: false,
  mag: false,
  physEhp: false,
  magEhp: false,
  cdr: false,
  manaRegen: false,
  healthRegen: false,
};

export const STAT_CHART_GOLD = '#c9a227';
export const STAT_CHART_GOLD_DIM = 'rgba(201, 162, 39, 0.35)';

export function resolveChartIconUri(localIcon) {
  if (!localIcon) return null;
  if (typeof localIcon === 'string') return localIcon;
  if (localIcon.primary?.uri) return localIcon.primary.uri;
  if (localIcon.uri) return localIcon.uri;
  if (Array.isArray(localIcon.chain) && localIcon.chain[0]?.uri) return localIcon.chain[0].uri;
  return null;
}
