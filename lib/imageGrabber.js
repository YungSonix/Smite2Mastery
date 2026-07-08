/**
 * Central bundled image requires for `app/data/Icons` (and shared UI like gold).
 * Paths must be string literals — Metro does not resolve dynamic require().
 */

export const GOLD_ICON = require('../app/data/Icons/Stat Icons/goldIcon.png');

export const STAT_ICONS = {
  BasicAttackPower: require('../app/data/Icons/Stat Icons/HUD_Stats_Icon_BasicAttackPower.png'),
  Active: require('../app/data/Icons/Stat Icons/T_StatIcon_Active.png'),
  AttackSpeed: require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  'Attack Speed': require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  AttackSpeedEffective: require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  AttackDamage: require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  BasicDamage: require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  'Attack Damage': require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  'Basic Damage': require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  Consumable: require('../app/data/Icons/Stat Icons/T_StatIcon_Consumable.png'),
  'Cooldown Rate': require('../app/data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  Cooldown: require('../app/data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  CooldownReduction: require('../app/data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  'Cooldown Reduction': require('../app/data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  Dampening: require('../app/data/Icons/Stat Icons/T_StatIcon_Dampening.png'),
  Echo: require('../app/data/Icons/Stat Icons/T_StatIcon_Echo.png'),
  HealReduction: require('../app/data/Icons/Stat Icons/T_StatIcon_HealReduction.png'),
  'Heal Reduction': require('../app/data/Icons/Stat Icons/T_StatIcon_HealReduction.png'),
  Health: require('../app/data/Icons/Stat Icons/T_StatIcon_Health.png'),
  MaxHealth: require('../app/data/Icons/Stat Icons/T_StatIcon_Health.png'),
  HP5: require('../app/data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  HealthPerSecond: require('../app/data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  'Health Regen': require('../app/data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  Intelligence: require('../app/data/Icons/Stat Icons/T_StatIcon_Intelligence.png'),
  Lifesteal: require('../app/data/Icons/Stat Icons/T_StatIcon_Lifesteal.png'),
  MagicalProtection: require('../app/data/Icons/Stat Icons/T_StatIcon_MagicalProt.png'),
  'Magical Protection': require('../app/data/Icons/Stat Icons/T_StatIcon_MagicalProt.png'),
  Mana: require('../app/data/Icons/Stat Icons/T_StatIcon_Mana.png'),
  MaxMana: require('../app/data/Icons/Stat Icons/T_StatIcon_Mana.png'),
  MP5: require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  ManaPerSecond: require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'Mana Regen': require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'Mana Regeneration': require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  MovementSpeed: require('../app/data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  'Movement Speed': require('../app/data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  Pathfinding: require('../app/data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  Passive: require('../app/data/Icons/Stat Icons/T_StatIcon_Passive.png'),
  Penetration: require('../app/data/Icons/Stat Icons/T_StatIcon_Pen.png'),
  PercentMagicalPenetration: require('../app/data/Icons/Stat Icons/T_StatIcon_Pen.png'),
  PercentPhysicalPenetration: require('../app/data/Icons/Stat Icons/T_StatIcon_Pen.png'),
  PhysicalProtection: require('../app/data/Icons/Stat Icons/T_StatIcon_PhysicalProt.png'),
  'Physical Protection': require('../app/data/Icons/Stat Icons/T_StatIcon_PhysicalProt.png'),
  Plating: require('../app/data/Icons/Stat Icons/T_StatIcon_Plating.png'),
  Starter: require('../app/data/Icons/Stat Icons/T_StatIcon_Starter.png'),
  Strength: require('../app/data/Icons/Stat Icons/T_StatIcon_Strength.png'),
  Tenacity: require('../app/data/Icons/Stat Icons/T_StatIcon_Tenacity.png'),
  'Critical Chance': require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  CriticalChance: require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  CritChance: require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Criticial Chance': require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Critical Damage': require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Basic Attack Damage': require('../app/data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
};

/** Resolve bundled stat icon for build UI / tooltips. */
export function getStatIcon(statKey, displayName) {
  const key = String(statKey || '').trim();
  const label = String(displayName || '').trim();
  const lower = label.toLowerCase();
  const keyLower = key.toLowerCase();

  if (STAT_ICONS[key]) return STAT_ICONS[key];
  if (STAT_ICONS[label]) return STAT_ICONS[label];

  if (keyLower.includes('pathfinding') || lower.includes('pathfinding')) {
    return STAT_ICONS.Pathfinding;
  }
  if (keyLower.includes('dampening') || lower.includes('dampening')) {
    return STAT_ICONS.Dampening;
  }
  if (keyLower.includes('tenacity') || lower.includes('tenacity')) {
    return STAT_ICONS.Tenacity;
  }
  if (keyLower.includes('plating') || lower.includes('plating')) {
    return STAT_ICONS.Plating;
  }
  if (keyLower.includes('echo') || lower.includes('echo')) {
    return STAT_ICONS.Echo;
  }
  if (
    keyLower.includes('basicdamage') ||
    keyLower.includes('attackdamage') ||
    lower.includes('attack damage') ||
    lower.includes('basic damage') ||
    lower.includes('basic attack')
  ) {
    return STAT_ICONS.AttackSpeed;
  }
  if (keyLower.includes('attackspeed') || lower.includes('attack speed')) {
    return STAT_ICONS.AttackSpeed;
  }
  if (keyLower.includes('movementspeed') || lower.includes('movement speed')) {
    return STAT_ICONS.MovementSpeed;
  }
  if (keyLower.includes('cooldown') || lower.includes('cooldown')) {
    return STAT_ICONS.CooldownReduction;
  }
  if (keyLower.includes('lifesteal') || lower.includes('lifesteal')) {
    return STAT_ICONS.Lifesteal;
  }
  if (keyLower.includes('penetration') || lower.includes('penetration')) {
    return STAT_ICONS.Penetration;
  }
  if (
    (keyLower.includes('health') || lower.includes('health')) &&
    !keyLower.includes('magical') &&
    !lower.includes('magical')
  ) {
    return keyLower.includes('regen') || lower.includes('regen') || key === 'HP5'
      ? STAT_ICONS.HP5
      : STAT_ICONS.MaxHealth;
  }
  if (keyLower.includes('mana') || lower.includes('mana')) {
    return keyLower.includes('regen') || lower.includes('regen') || key === 'MP5'
      ? STAT_ICONS.MP5
      : STAT_ICONS.MaxMana;
  }
  if (keyLower.includes('physicalprotection') || lower.includes('physical protection')) {
    return STAT_ICONS.PhysicalProtection;
  }
  if (keyLower.includes('magicalprotection') || lower.includes('magical protection')) {
    return STAT_ICONS.MagicalProtection;
  }
  if (keyLower.includes('strength') || lower === 'strength') {
    return STAT_ICONS.Strength;
  }
  if (keyLower.includes('intelligence') || lower === 'intelligence') {
    return STAT_ICONS.Intelligence;
  }
  if (keyLower.includes('crit') || lower.includes('critical')) {
    return STAT_ICONS.CriticalChance;
  }

  return null;
}

export function itemHasActiveEffect(item) {
  if (!item) return false;
  if (item.active === true) return true;
  const passive = String(item.passive || '');
  if (/\bActive:/i.test(passive)) return true;
  const tags = item.tags || [];
  return tags.some((t) => String(t).toLowerCase() === 'active');
}

export const GAME_MODE_ICONS = {
  conquest: require('../app/data/Icons/Game Modes/Conquest/conquestmap.webp'),
  arena: require('../app/data/Icons/Game Modes/Arena/ArenaCA1Update.webp'),
  joust: require('../app/data/Icons/Game Modes/Joust/Joust_Minimap_F2P.webp'),
  duel: require('../app/data/Icons/Game Modes/Duel/Duel_Minimap_F2P.webp'),
  assault: require('../app/data/Icons/Game Modes/Assault/t_Assault_F2P.webp'),
};

export const BUFF_ICONS = {
  Caustic: require('../app/data/Icons/Game Modes/Conquest/CausticBuff.webp'),
  Primal: require('../app/data/Icons/Game Modes/Conquest/PrimalBuff.webp'),
  Inspiration: require('../app/data/Icons/Game Modes/Conquest/InspirationBuff.webp'),
  Pathfinder: require('../app/data/Icons/Game Modes/Conquest/PathfinderBuff.webp'),
};

export const TOWER_ICONS = {
  Tower: require('../app/data/Icons/Game Modes/Conquest/Towers.webp'),
};

export const PHOENIX_ICONS = {
  Phoenix: require('../app/data/Icons/Game Modes/Conquest/Phoenix.webp'),
};

export const TITAN_ICONS = {
  Titan: require('../app/data/Icons/Game Modes/Conquest/Titan.webp'),
};

export const CONSUMABLE_ICONS = {
  "Baron's Brew": require('../app/data/Icons/Consumables/Consumable_Barons_Brew.png'),
  'Eyes of the Jungle': require('../app/data/Icons/Consumables/Consumable_Eyes_of_the_Jungle.png'),
  'Obsidian Dagger': require('../app/data/Icons/Consumables/Consumable_Obsidian_Dagger.png'),
  'Vision Ward': require('../app/data/Icons/Consumables/Consumable_Vision_Ward.png'),
  'Sentry Ward': require('../app/data/Icons/Consumables/Consumable_Sentry_Ward.png'),
  'Warding Chalice': require('../app/data/Icons/Consumables/Consumable_Warding_Chalice.png'),
  'Elixir of Strength': require('../app/data/Icons/Consumables/Consumable_Elixir_of_Strength.png'),
  'Elixir of Intelligence': require('../app/data/Icons/Consumables/Consumable_Elixir_of_Intelligence.png'),
};

export const VULCAN_MOD_ICONS = {
  'Alternator Mod (Set One - Requires Level 1)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Alternator_Mod.png'),
  'Dual Mod (Set One - Requires Level 1)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Dual_Mod.png'),
  'Effeciency Mod (Set One - Requires Level 1)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Efficiency_Mod.png'),
  'Resonator Mod (Set Two - Requires Level 7)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Resonator_Mod.png'),
  'Thermal Mod (Set Two - Requires Level 7)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Thermal_Mod.png'),
  'Shrapnel Mod (Set Two - Requires Level 7)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Shrapnel_Mod.png'),
  'Masterwork Mod (Set Three  - Requires Level 14)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Masterwork_Mod.png'),
  'Surplus Mod (Set Three  - Requires Level 14)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Surplus_Mod.png'),
  'Seismic Mod (Set Three  - Requires Level 14)': require('../app/data/Icons/Vulcan Mods/GodSpecific_Vulcan_Seismic_Mod.png'),
};

export const ROLE_ICONS = {
  ADC: require('../app/data/Icons/Role Icons/T_GodRole_Carry_Small.png'),
  Solo: require('../app/data/Icons/Role Icons/T_GodRole_Solo_Small.png'),
  Support: require('../app/data/Icons/Role Icons/T_GodRole_Support.png'),
  Mid: require('../app/data/Icons/Role Icons/T_GodRole_Mid_Small.png'),
  Jungle: require('../app/data/Icons/Role Icons/T_GodRole_Jungle.png'),
};

const PANTHEON_ICON_FILES = {
  Arthurian: require('../app/data/Icons/Pantheon Icons/Arthurian - 931725.png'),
  Babylonian: require('../app/data/Icons/Pantheon Icons/Babylonian - 5939DD.png'),
  Celtic: require('../app/data/Icons/Pantheon Icons/Celtic - 32A92C.png'),
  Chinese: require('../app/data/Icons/Pantheon Icons/Chinese - FF2100.png'),
  Egyptian: require('../app/data/Icons/Pantheon Icons/Egyptian - DE981E.png'),
  'Great Old Ones': require('../app/data/Icons/Pantheon Icons/Great Old Ones - 0C0A0E.png'),
  Greek: require('../app/data/Icons/Pantheon Icons/Greek - 0FA7F5.png'),
  Hindu: require('../app/data/Icons/Pantheon Icons/Hindu - CC2380.png'),
  Japanese: require('../app/data/Icons/Pantheon Icons/Japanese - FFABCD.png'),
  Korean: require('../app/data/Icons/Pantheon Icons/Korean - 0047A0.png'),
  Maya: require('../app/data/Icons/Pantheon Icons/Maya - 739A32.png'),
  Norse: require('../app/data/Icons/Pantheon Icons/Norse - 6DB8E4.png'),
  Polynesian: require('../app/data/Icons/Pantheon Icons/Polynesian - 00FFFC.png'),
  Roman: require('../app/data/Icons/Pantheon Icons/Roman - EAD650.png'),
  Slavic: require('../app/data/Icons/Pantheon Icons/Slavic - E7EFF0.png'),
  'Tales of Arabia': require('../app/data/Icons/Pantheon Icons/Tales of Arabia - 46287C.png'),
  Voodoo: require('../app/data/Icons/Pantheon Icons/Voodoo - 742BA0.png'),
  Yoruba: require('../app/data/Icons/Pantheon Icons/Yoruba - FF8625.png'),
};

export { PANTHEON_ICON_FILES };

/** Pantheon header backdrops (`app/data/Icons/Backdrop/t_*_BG.png`). Metro requires static paths. */
export const PANTHEON_BACKDROP_FILES = {
  Arthurian: require('../app/data/Icons/Backdrop/t_Arthurian_BG.png'),
  Babylonian: require('../app/data/Icons/Backdrop/t_Babylon_BG.png'),
  Chinese: require('../app/data/Icons/Backdrop/t_Chinese_BG.png'),
  Egyptian: require('../app/data/Icons/Backdrop/t_Egyptian_BG.png'),
  'Great Old Ones': require('../app/data/Icons/Backdrop/t_GreatOldOnes_BG.png'),
  Greek: require('../app/data/Icons/Backdrop/t_Greek_BG.png'),
  Hindu: require('../app/data/Icons/Backdrop/t_Hindu_BG.png'),
  Japanese: require('../app/data/Icons/Backdrop/t_Japanese_BG.png'),
  Maya: require('../app/data/Icons/Backdrop/t_Maya_BG.png'),
  Norse: require('../app/data/Icons/Backdrop/t_Norse_BG.png'),
  Roman: require('../app/data/Icons/Backdrop/t_Roman_BG.png'),
  'Tales of Arabia': require('../app/data/Icons/Backdrop/t_TalesofArabia_BG.png'),
  Voodoo: require('../app/data/Icons/Backdrop/t_Voodoo_BG.png'),
  Yoruba: require('../app/data/Icons/Backdrop/t_Yoruba_BG.png'),
};

export const PROPHECY_PACK_MYSTERY = require('../app/data/Icons/Prophecy/pack_mystery.png');
