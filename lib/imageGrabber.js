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
  Consumable: require('../app/data/Icons/Stat Icons/T_StatIcon_Consumable.png'),
  'Cooldown Rate': require('../app/data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  Cooldown: require('../app/data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  HealReduction: require('../app/data/Icons/Stat Icons/T_StatIcon_HealReduction.png'),
  Health: require('../app/data/Icons/Stat Icons/T_StatIcon_Health.png'),
  MaxHealth: require('../app/data/Icons/Stat Icons/T_StatIcon_Health.png'),
  HP5: require('../app/data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  'Health Regen': require('../app/data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  Intelligence: require('../app/data/Icons/Stat Icons/T_StatIcon_Intelligence.png'),
  Lifesteal: require('../app/data/Icons/Stat Icons/T_StatIcon_Lifesteal.png'),
  MagicalProtection: require('../app/data/Icons/Stat Icons/T_StatIcon_MagicalProt.png'),
  'Magical Protection': require('../app/data/Icons/Stat Icons/T_StatIcon_MagicalProt.png'),
  Mana: require('../app/data/Icons/Stat Icons/T_StatIcon_Mana.png'),
  MaxMana: require('../app/data/Icons/Stat Icons/T_StatIcon_Mana.png'),
  MP5: require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'Mana Regen': require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'Mana Regeneration': require('../app/data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  MovementSpeed: require('../app/data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  'Movement Speed': require('../app/data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  Passive: require('../app/data/Icons/Stat Icons/T_StatIcon_Passive.png'),
  Penetration: require('../app/data/Icons/Stat Icons/T_StatIcon_Pen.png'),
  PhysicalProtection: require('../app/data/Icons/Stat Icons/T_StatIcon_PhysicalProt.png'),
  'Physical Protection': require('../app/data/Icons/Stat Icons/T_StatIcon_PhysicalProt.png'),
  Starter: require('../app/data/Icons/Stat Icons/T_StatIcon_Starter.png'),
  Strength: require('../app/data/Icons/Stat Icons/T_StatIcon_Strength.png'),
  'Critical Chance': require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  CriticalChance: require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Criticial Chance': require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Critical Damage': require('../app/data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Basic Attack Damage': require('../app/data/Icons/Stat Icons/HUD_Stats_Icon_BasicAttackPower.png'),
  'Basic Damage': require('../app/data/Icons/Stat Icons/HUD_Stats_Icon_BasicAttackPower.png'),
};

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

export const PROPHECY_PACK_MYSTERY = require('../app/data/Icons/Prophecy/pack_mystery.png');
