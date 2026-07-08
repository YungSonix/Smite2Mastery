import { BUILD_STAT_DISPLAY_NAMES, getBuildStatColor } from './buildStats';

/** Game localization keys → display labels (item store / descriptors). */
export const ITEM_TAG_LABELS = {
  Protection: 'Protection',
  Dash: 'Dash',
  Cooldown: 'Cooldown',
  Cost: 'Cost',
  'ItemStoreFilter.HealingReduction': 'Anti-Heal',
  'ItemStoreFilter.ActiveItem': 'Active',
  Damage: 'Damage',
  'ItemStoreFilter.PassiveItem': 'Passive',
  Descriptor_Utility: 'Utility',
  Descriptor_Sustain: 'Sustain',
  Descriptor_Pressure: 'Pressure',
  Descriptor_Lockdown: 'Lockdown',
  Descriptor_ConstantDamage: 'Constant Damage',
  Descriptor_AreaControl: 'Area Control',
  Descriptor_CrowdControl: 'Crowd Control',
  Descriptor_Mobility: 'Mobility',
  Descriptor_BurstDamage: 'Burst Damage',
  Descriptor_Ranged: 'Ranged',
  Descriptor_Melee: 'Melee',
  Range: 'Range',
  Radius: 'Radius',
  ChannelTime: 'Channel Time',
  Movement: 'Movement',
  'Descriptor.Healing': 'Healing',
  ConeAngle: 'Cone Angle',
  Buff: 'Buff',
  Debuff: 'Debuff',
  Heal: 'Heal',
  Scaling: 'Scaling',
  PhysicalDamage: 'Physical Damage',
  MagicalDamage: 'Magical Damage',
  Cripple: 'CRIPPLED',
  Intoxicate: 'INTOXICATED',
  Blind: 'BLINDED',
  Slow: 'SLOWED',
  Polymorph: 'POLYMORPHED',
  Disarm: 'DISARMED',
  Feared: 'FEARED',
  Silence: 'SILENCED',
  Knockback: 'Knockback',
  Rooted: 'ROOTED',
  Stun: 'STUNNED',
  CCImmunity: 'CC Immunity',
  CustomName: 'Custom Name',
  Taunt: 'TAUNTED',
  Shield: 'Shield',
  'ItemStoreFilter.HealingReduction.Short': 'Anti-Heal',
  'ItemStoreFilter.ActiveItem.Short': 'Active',
  'ItemStoreFilter.PassiveItem.Short': 'Passive',
  Vortex: 'VORTEX',
  'ItemStoreFilter.AllItems': 'All Items',
  Mesmerize: 'MESMERIZED',
  FlatPenetration: 'Flat Penetration',
  'ItemStoreFilter.Consumables': 'Consumables',
  Consumables: 'Consumables',
  'ItemStoreFilter.Starter': 'Starter',
  'ItemStoreRole.Popular': 'Popular',
  Tremble: 'TREMBLED',
  MagicalGod: 'Magical',
  PhysicalGod: 'Physical',
  ScalingINT: 'INT Scaling',
  ScalingSTR: 'STR Scaling',
  ScalingHybrid: 'Hybrid Scaling',
  'Archetype.Guardian': 'Guardian',
  'Archetype.Warrior': 'Warrior',
  'Archetype.Hunter': 'Hunter',
  'Archetype.Mage': 'Mage',
  'Archetype.Assassin': 'Assassin',
  'Archetype.Brawler': 'Brawler',
  'Archetype.Nuker': 'Nuker',
  'Archetype.Sharpshooter': 'Sharpshooter',
  'Archetype.Slayer': 'Slayer',
  'Archetype.Tank': 'Tank',
  Descriptor_Mobile: 'Mobile',
  Descriptor_Global: 'Global',
  Descriptor_Shielding: 'Shielding',
  Descriptor_Stealth: 'Stealth',
  Descriptor_Execute: 'Execute',
  Descriptor_Buffs: 'Buffs',
  Descriptor_Sniper: 'Sniper',
  GoodNPE: 'Great For New Players!',
  FreeRotation: 'Free God Rotation',
  'Sort.Alphabetical': 'Alphabetical',
  'Sort.Mastery': 'Mastery',
  'Sort.ClosestRank': 'Closest to Rank',
  'Sort.Owned': 'Ownership',
  Recommended: 'Recommended',
  'Sort.OnRotation': 'On Rotation',
  'Sort.Favorites': 'Favorites',
  'Sort.DateModified': 'Date Modified',
  'Sort.DateCreated': 'Date Created',
  Descriptor_Promoted: 'Official Build',
  'Descriptor.Aspect': 'Aspect',
  'ItemStoreFilter.NewItem': 'New Items',
  Descriptor_New: 'New',
  Banish: 'BANISHED',
  Descriptor_Adaptive: 'Adaptive',
  Descriptor_PhysicalProtect: 'Physical Protect',
  Descriptor_OnHeal: 'On Heal',
  Desciptor_AntiCrit: 'Anti-Critical',
  Descriptor_AntiShield: 'Anti-Shield',
  Descriptor_Omni: 'Omni-Protect',
  Descriptor_AntiTank: 'Anti-Tank',
  Descriptor_Attack: 'Attack',
  Descriptor_Farm: 'Farm',
  Descriptor_AtkSpd: 'Attack Speed',
  Descriptor_MagProtection: 'Magical Protect',
  Descriptor_Speedup: 'Speed Up',
  Descriptor_bomb: 'Bomb',
  Mana: 'Mana',
  Ability: 'Ability',
  Critical: 'Critical',
  Teleport: 'Teleport',
  OmniPower: 'Omni-Power',
  Health: 'Health',
  AntiLifesteal: 'Anti-Lifesteal',
  Vision: 'Vision',
  'Immune.Slow': 'Slow Immune',
  Recovery: 'Recovery',
  Summon: 'Summon',
  Resurrect: 'Resurrect',
  Aura: 'Aura',
  Lifesteal: 'Lifesteal',
  CC: 'Crowd Control',
  ItemSlow: 'Slow',
  AntiCC: 'Anti-CC',
  Attack: 'Attack',
  Farm: 'Farm',
  Damage: 'Damage',
  Recovery: 'Recovery',
  Vision: 'Vision',
  Buff: 'Buff',
  Teleport: 'Teleport',
  Immune: 'Immune',
  Dash: 'Dash',
  Mitigation: 'Mitigation',
  Hybrid: 'Hybrid',
  Descriptor_Immune: 'Immune',
  Madness: 'MADNESS',
  Echo: 'Echo',
  Plating: 'Plating',
  Dampening: 'Dampening',
  Pathfinding: 'Pathfinding',
  Tenacity: 'Tenacity',
  True: 'True Damage',
  Hysteria: 'Hysteria',
  Active: 'Active',
  Passive: 'Passive',
  Consumable: 'Consumables',
  Consumables: 'Consumables',
  Starter: 'Starter',
  Relic: 'Relic',
  Utility: 'Utility',
  Offensive: 'Offensive',
  Defensive: 'Defensive',
  Mobility: 'Mobility',
  Healing: 'Healing',
  Adaptive: 'Adaptive',
  Tank: 'Tank',
  Defense: 'Defense',
  Shielding: 'Shielding',
  Strength: 'Strength',
  Intelligence: 'Intelligence',
  Penetration: 'Penetration',
  'Attack Speed': 'Attack Speed',
  'Basic Attack Damage': 'Attack Damage',
  'Movement Speed': 'Movement Speed',
  'Cooldown Rate': 'Cooldown Rate',
  'Magical Protection': 'Magical Protection',
  'Physical Protection': 'Physical Protection',
  'Mana Regen': 'Mana Regen',
  'Health Regen': 'Health Regen',
  Jungle: 'Jungle',
  Solo: 'Solo',
  Support: 'Support',
  Carry: 'Carry',
  Mid: 'Mid',
};

/** builds.json raw tag → localization key (when different). */
const ITEM_TAG_ALIASES = {
  LifeSteal: 'Lifesteal',
  HealthRegen: 'Health Regen',
  ManaRegen: 'Mana Regen',
  CooldownReduction: 'Cooldown Rate',
  'Critical Strike': 'Critical',
  'Critical Strike Chance': 'Critical',
  'Physical Power': 'Damage',
  MagicalProtection: 'Magical Protection',
  PhysicalProtection: 'Physical Protection',
  MagicalPenetration: 'FlatPenetration',
  PhysicalPenetration: 'FlatPenetration',
  Magical: 'MagicalGod',
  Physical: 'PhysicalGod',
  INT: 'ScalingINT',
  STR: 'ScalingSTR',
  MovementSpeed: 'Movement Speed',
  Healing: 'Descriptor.Healing',
  Shielding: 'Descriptor_Shielding',
  Mobility: 'Descriptor_Mobility',
  Adaptive: 'Descriptor_Adaptive',
  Tank: 'Archetype.Tank',
  Defense: 'Protection',
  Consumable: 'ItemStoreFilter.Consumables',
};

/** Tier 1 base components — primary store descriptor (Bow → Attack Speed, etc.). */
export const TIER1_COMPONENT_TAG_KEYS = {
  Bow: 'Descriptor_AtkSpd',
  Circlet: 'Mana',
  Medallion: 'Health',
  Rune: 'Descriptor_MagProtection',
  Shield: 'Descriptor_PhysicalProtect',
  Reliquary: 'Mana Regen',
  Sash: 'Heal',
  Ring: 'Cooldown',
  Axe: 'Strength',
  Gem: 'Intelligence',
  Scythe: 'Lifesteal',
  Sabre: 'Critical',
};

const HIDDEN_ITEM_TAGS = new Set([
  'Tier1',
  'Tier2',
  'Tier3',
  'ItemTier.Tier1',
  'ItemTier.Tier2',
  'ItemTier.Tier3',
  'Component',
  'StartingLoadout',
  'NoResaleValue',
  'Role',
  'Ratatoskr',
  'Passive',
  'Relic',
  'Consumable',
  'ItemStoreFilter.Consumables',
  'Physical',
  'Physical Power',
  'Magical',
  'INT',
  'STR',
  'ScalingINT',
  'ScalingSTR',
  'ScalingHybrid',
]);

const ROLE_LANE_BASES = new Set(['Jungle', 'Solo', 'Support', 'Carry', 'Mid', 'ADC']);

/** Store/sort meta — not player-facing item traits. */
const HIDDEN_META_TAGS = new Set([
  'Recommended',
  'ItemStoreRole.Popular',
  'GoodNPE',
  'FreeRotation',
  'Descriptor_Promoted',
  'Descriptor_New',
  'ItemStoreFilter.NewItem',
  'ItemStoreFilter.AllItems',
]);

const TAG_SORT_WEIGHT = {
  Active: 0,
  Passive: 1,
  Consumable: 2,
  Consumables: 2,
  Starter: 3,
  Relic: 4,
};

function humanizeTag(tag) {
  return String(tag)
    .replace(/^ItemStoreFilter\./, '')
    .replace(/^Descriptor[._]/, '')
    .replace(/^Archetype\./, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .trim();
}

function resolveTagLabel(rawTag) {
  const tag = String(rawTag || '').trim();
  if (!tag) return null;

  if (ITEM_TAG_LABELS[tag]) {
    return { id: tag, key: tag, label: ITEM_TAG_LABELS[tag] };
  }

  const aliasKey = ITEM_TAG_ALIASES[tag];
  if (aliasKey && ITEM_TAG_LABELS[aliasKey]) {
    return { id: aliasKey, key: aliasKey, label: ITEM_TAG_LABELS[aliasKey] };
  }

  const dot = tag.indexOf('.');
  if (dot > 0) {
    const base = tag.slice(0, dot);
    const suffix = tag.slice(dot + 1);
    if (ROLE_LANE_BASES.has(base)) return null;
    if (suffix === 'INT' && ITEM_TAG_LABELS.ScalingINT) {
      return { id: 'ScalingINT', key: 'ScalingINT', label: ITEM_TAG_LABELS.ScalingINT };
    }
    if (suffix === 'STR' && ITEM_TAG_LABELS.ScalingSTR) {
      return { id: 'ScalingSTR', key: 'ScalingSTR', label: ITEM_TAG_LABELS.ScalingSTR };
    }
    if (suffix === 'Hybrid' && ITEM_TAG_LABELS.ScalingHybrid) {
      return { id: 'ScalingHybrid', key: 'ScalingHybrid', label: ITEM_TAG_LABELS.ScalingHybrid };
    }
  }

  const human = humanizeTag(tag);
  if (human) {
    return { id: tag, key: tag, label: human };
  }
  return null;
}

export function getItemTagColor(tagKey, label) {
  const statColor = getBuildStatColor(tagKey, label);
  if (statColor !== '#94a3b8') return statColor;

  const lower = String(label || '').toLowerCase();
  const keyLower = String(tagKey || '').toLowerCase();

  if (lower === 'active' || keyLower.includes('activeitem')) return '#fbbf24';
  if (lower === 'passive' || keyLower.includes('passiveitem')) return '#c4b5fd';
  if (lower === 'consumable' || lower === 'starter' || lower === 'relic') return '#7dd3fc';

  if (/anti-?heal|heal reduction/.test(lower)) return '#f43f5e';
  if (/heal|sustain|recovery|lifesteal|on heal/.test(lower)) return '#22c55e';
  if (/mana/.test(lower) && !/magical/.test(lower)) return '#3b82f6';

  if (/stun|slow|silence|root|fear|cripple|disarm|taunt|mesmer|banish|madness|hysteria|crowd control|cc/.test(lower)) {
    return '#fb7185';
  }
  if (/anti-?cc|cc immunity|immune/.test(lower)) return '#34d399';

  if (/jungle|solo|support|carry|mid|guardian|mage|hunter|assassin|warrior|brawler|nuker|tank|slayer/.test(lower)) {
    return '#2dd4bf';
  }
  if (/utility|mobility|dash|teleport|vision|buff|aura|summon/.test(lower)) return '#22d3ee';
  if (/offensive|burst|damage|attack|critical|physical damage|magical damage|true damage|farm|pressure/.test(lower)) {
    return '#f97316';
  }
  if (/defensive|protection|mitigation|shield|defense|dampening|plating|tenacity/.test(lower)) {
    return '#ef4444';
  }
  if (/magical|int scaling|intelligence/.test(lower)) return '#a855f7';
  if (/physical|str scaling|strength/.test(lower)) return '#facc15';
  if (/hybrid|adaptive|echo|pathfinding|omni/.test(lower)) return '#e879f9';
  if (/recommended|new|popular|official/.test(lower)) return '#fde047';

  return '#94a3b8';
}

function tagSortWeight(tag) {
  const label = tag.label || '';
  const w = TAG_SORT_WEIGHT[label];
  if (w != null) return w;
  if (/scaling/i.test(label)) return 55;
  return 100;
}

/** Hide store lane filters (Mid.INT) — not standalone Jungle/Support item descriptors. */
function isRoleLaneTag(rawTag) {
  const tag = String(rawTag || '').trim();
  if (!tag) return false;
  if (HIDDEN_META_TAGS.has(tag)) return true;
  if (tag.startsWith('ItemStoreRole.')) return true;
  const dot = tag.indexOf('.');
  if (dot <= 0) return false;
  const base = tag.slice(0, dot);
  return ROLE_LANE_BASES.has(base);
}

function normTagToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Skip stat/lane chips when the same info is already on the item row or stats block. */
function isDuplicateItemStatTag(rawTag, tag, item) {
  const labelNorm = normTagToken(tag.label);
  const keyNorm = normTagToken(tag.key);
  const rawNorm = normTagToken(rawTag);

  if (item?.stats && typeof item.stats === 'object') {
    for (const statKey of Object.keys(item.stats)) {
      const statNorm = normTagToken(statKey);
      const displayNorm = normTagToken(BUILD_STAT_DISPLAY_NAMES[statKey] || statKey);
      if (
        labelNorm === statNorm ||
        labelNorm === displayNorm ||
        keyNorm === statNorm ||
        rawNorm === statNorm
      ) {
        return true;
      }
    }
  }

  return false;
}

/** Player-facing tags — store descriptors + type (Active), not build metadata or stat duplicates. */
export function getItemDisplayTags(item) {
  if (!item) return [];

  const tier1Key =
    item?.tier === 1 && item?.internalName
      ? TIER1_COMPONENT_TAG_KEYS[item.internalName]
      : null;

  if (tier1Key) {
    const primary = resolveTagLabel(tier1Key);
    if (primary) {
      return [
        {
          ...primary,
          color: getItemTagColor(primary.key, primary.label),
        },
      ];
    }
  }

  const raw = Array.isArray(item.tags) ? item.tags : [];
  const seen = new Set();
  const resolved = [];

  raw.forEach((rawTag) => {
    const key = String(rawTag || '').trim();
    if (!key || HIDDEN_ITEM_TAGS.has(key)) return;
    if (HIDDEN_META_TAGS.has(key)) return;
    if (isRoleLaneTag(key)) return;

    const tag = resolveTagLabel(key);
    if (!tag || seen.has(tag.id)) return;
    if (HIDDEN_META_TAGS.has(tag.id)) return;
    if (HIDDEN_ITEM_TAGS.has(tag.id)) return;
    if (isDuplicateItemStatTag(key, tag, item)) return;
    seen.add(tag.id);

    const color = getItemTagColor(tag.key, tag.label);
    resolved.push({ ...tag, color });
  });

  if (item?.starter && !seen.has('Starter')) {
    const label = ITEM_TAG_LABELS.Starter;
    resolved.push({
      id: 'Starter',
      key: 'Starter',
      label,
      color: getItemTagColor('Starter', label),
    });
  }

  return resolved.sort((a, b) => {
    const wa = tagSortWeight(a);
    const wb = tagSortWeight(b);
    if (wa !== wb) return wa - wb;
    return a.label.localeCompare(b.label);
  });
}
