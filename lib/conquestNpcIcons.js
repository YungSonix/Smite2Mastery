/**
 * NPC portrait icons for Conquest map POIs.
 * Source PNGs copied from Hemingway export:
 * Content/UI/Textures/ArtAssets/NPCs → app/data/Gamemodes/Conquest/NpcIcons/
 * Metro requires string-literal require paths.
 */

const PORTRAITS = {
  centaur: require('../app/data/Gamemodes/Conquest/NpcIcons/T_Centaur_Portrait.png'),
  chimera: require('../app/data/Gamemodes/Conquest/NpcIcons/T_Chimera_Portrait.png'),
  manticore: require('../app/data/Gamemodes/Conquest/NpcIcons/t_Manticore_Portrait.png'),
  satyr: require('../app/data/Gamemodes/Conquest/NpcIcons/T__Satyr_Portrait.png'),
  harpy: require('../app/data/Gamemodes/Conquest/NpcIcons/t_Harpy_Portrait.png'),
  cyclopsWarrior: require('../app/data/Gamemodes/Conquest/NpcIcons/t_CyclopsWarrior_Portrait.png'),
  cyclopsRogue: require('../app/data/Gamemodes/Conquest/NpcIcons/t_Rogue_Cyclops_Portrait.png'),
  scorpion: require('../app/data/Gamemodes/Conquest/NpcIcons/t_ScorpionWarrior_Portrait.png'),
  oracle: require('../app/data/Gamemodes/Conquest/NpcIcons/t_oracle_portrait.png'),
  goldFury: require('../app/data/Gamemodes/Conquest/NpcIcons/t_GoldFury_Portrait.png'),
  ancientGoldFury: require('../app/data/Gamemodes/Conquest/NpcIcons/t_AncientGoldFury_Portrait.png'),
  fireGiant: require('../app/data/Gamemodes/Conquest/NpcIcons/t__FireGiant_Portrait.png'),
  pyromancer: require('../app/data/Gamemodes/Conquest/NpcIcons/t_pyromancer_timer.png'),
  firebrand: require('../app/data/Gamemodes/Conquest/NpcIcons/t_FireBrand_Portrait.png'),
  naga: require('../app/data/Gamemodes/Conquest/NpcIcons/t_Naga_Portrait.png'),
  totem: require('../app/data/Gamemodes/Conquest/NpcIcons/t_TotemofKu_Portrait.png'),
  orderTower: require('../app/data/Gamemodes/Conquest/NpcIcons/t_OrderTower_Portrait.png'),
  chaosTower: require('../app/data/Gamemodes/Conquest/NpcIcons/t_ChaosTower_Portrait.png'),
  orderPhoenix: require('../app/data/Gamemodes/Conquest/NpcIcons/t_OrderPhoenix_Portrait.png'),
  chaosPhoenix: require('../app/data/Gamemodes/Conquest/NpcIcons/t_ChaosPhoenix_Portrait.png'),
  orderTitan: require('../app/data/Gamemodes/Conquest/NpcIcons/t_OrderTitan_Portrait.png'),
  chaosTitan: require('../app/data/Gamemodes/Conquest/NpcIcons/t_ChaosTitan_Portrait.png'),
};

/** statsKey → portrait (side-agnostic POIs) */
const STATS_KEY_PORTRAIT = {
  camp_blue: PORTRAITS.centaur,
  camp_red: PORTRAITS.chimera,
  camp_purple: PORTRAITS.manticore,
  camp_speed: PORTRAITS.satyr,
  camp_trinket: PORTRAITS.harpy,
  camp_cyclops: PORTRAITS.cyclopsWarrior,
  camp_rogues: PORTRAITS.cyclopsRogue,
  camp_scorpion: PORTRAITS.scorpion,
  camp_random: PORTRAITS.chimera,
  oracle: PORTRAITS.oracle,
  pyromancer: PORTRAITS.pyromancer,
  gold_fury: PORTRAITS.ancientGoldFury,
  fire_giant: PORTRAITS.fireGiant,
  totem: PORTRAITS.totem,
  moonlight_queen: PORTRAITS.naga,
};

/**
 * Portrait for a map POI. Towers/Phoenixes/Titans resolve by Order/Chaos side
 * from the POI id; everything else by its stats profile key.
 * Returns null for pickup/objective POIs with no NPC (Heliokrater, crystals…).
 */
export function getConquestPoiPortrait(poiId, statsKey) {
  if (!poiId) return null;
  if (poiId.startsWith('Order_Tower')) return PORTRAITS.orderTower;
  if (poiId.startsWith('Chaos_Tower')) return PORTRAITS.chaosTower;
  if (poiId.startsWith('Order_Phoenix')) return PORTRAITS.orderPhoenix;
  if (poiId.startsWith('Chaos_Phoenix')) return PORTRAITS.chaosPhoenix;
  if (poiId.startsWith('Order_Titan')) return PORTRAITS.orderTitan;
  if (poiId.startsWith('Chaos_Titan')) return PORTRAITS.chaosTitan;
  return statsKey ? STATS_KEY_PORTRAIT[statsKey] || null : null;
}

export const CONQUEST_NPC_PORTRAITS = PORTRAITS;
