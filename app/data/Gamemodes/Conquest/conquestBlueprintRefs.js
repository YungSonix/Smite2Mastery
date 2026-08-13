/**
 * Conquest map metadata distilled from Hemingway Blueprints exports
 * (NPE help tips, role strings, pickup blueprints).
 *
 * Source: Content/Blueprints under Hemingway export.
 * Rescan hints: node scripts/scan-conquest-blueprints.js
 */
export const CONQUEST_BLUEPRINT_META = {
  camp_blue: {
    buff: 'Primal',
    colorLabel: 'Blue',
    npcFamily: 'Centaur',
    blueprint: 'NPE_HelpTip_JungleCamp_Centaur',
    roleNote: 'Primal Camp (Blue) — Solo lane priority (Fire Giant side).',
  },
  camp_red: {
    buff: 'Blight',
    colorLabel: 'Red',
    npcFamily: 'Chimera',
    blueprint: 'NPE_HelpTip_JungleCamp_Chimaera',
    roleNote: 'Blight buff camp (Chimera family).',
  },
  camp_purple: {
    buff: 'Inspiration',
    colorLabel: 'Purple',
    npcFamily: 'Manticore',
    blueprint: 'NPE_HelpTip_JungleCamp_Manticore',
    roleNote: 'Inspiration Camp (Purple) — Duo lane priority (Fury side).',
    uncertain: 'No Manticore CT in NPC export; values assumed same as Blue camp.',
  },
  camp_speed: {
    buff: 'Pathfinder',
    colorLabel: 'Yellow',
    npcFamily: 'Satyr',
    blueprint: 'NPE_HelpTip_JungleCamp_Satyr',
    roleNote: 'Pathfinder Camp (Yellow) — common jungler first clear.',
    uncertain: 'No Satyr CT in NPC export; values assumed same as Blue camp.',
  },
  camp_trinket: {
    buff: 'Trinkets',
    npcFamily: 'Harpy',
    blueprint: 'NPE_HelpTip_JungleCamp_Harpy',
  },
  camp_cyclops: {
    npcFamily: 'Cyclops Warrior',
  },
  camp_scorpion: {
    npcFamily: 'Scorpion',
    blueprint: 'NPE_HelpTip_JungleCamp_Scorpion',
  },
  camp_rogues: {
    npcFamily: 'Cyclops Rogue',
  },
  camp_random: {
    buff: 'Rotating',
    roleNote: 'Random buff camp — drops a rotating jungle buff.',
    uncertain: 'Exact NPC family not in Blueprints export; stats use Alpha Chimera placeholder.',
  },
  camp_gold: {
    title: 'The Heliokrater',
    pickup: true,
    blueprint: 'NPE_HelpTip_GoldPickupV2',
    description:
      'Grants +5% Gold Gain, plus Protections and Tenacity per charge.\n\n' +
      'Charges increase during the day. Gain extra charges from kills and assists.\n\n' +
      'Return it to the Oracle Nexus during Moonlight to unlock a Team Reward.',
    uncertain: 'Pickup objective — no jungle NPC combat stats.',
  },
  oracle: {
    title: 'Oracles Camp',
    reward: 'Eyes of the Jungle',
  },
  ritual_site: {
    title: 'Ritual Site',
    objective: true,
    blueprint: 'Moonlight capture point',
    description:
      'Moonlight phase capture point. Control it when the phase ends to secure team gold. ' +
      'Reward scales each Moonlight phase (up to 150 team gold).',
    uncertain: 'Not a standard jungle NPC — no CT combat profile.',
  },
  crystal: {
    title: 'Moonlight Crystal',
    objective: true,
    description:
      'Collect Moonlight Shards during the Moonlight phase. Team shard totals decide phase winners and lane pusher rewards.',
    uncertain: 'Shard pickup — no NPC CT in export.',
  },
  moonlight_queen: {
    title: 'Moonlight Queen',
    blueprint: 'CT_Jungle_Naga_Moonlight_Stats',
  },
  gold_fury: {
    title: 'Gold Fury',
    blueprint: 'CT_Jungle_GoldFury_Stats',
  },
  fire_giant: {
    title: 'Fire Giant',
    blueprint: 'CT_Jungle_FireGiant_Stats',
  },
};

/** Extra help-tip keys from Blueprints beyond map POI defaults */
export const CONQUEST_BLUEPRINT_HELP_KEYS = {
  camp_blue: ['Primal.1.Description'],
  camp_red: ['Blight.1.Description'],
  camp_purple: ['InspirationV2.1.Description'],
  camp_speed: ['Pathfinder.1.Description'],
  camp_trinket: ['Trinkets.1.Description'],
  oracle: ['EyesOfTheJungle.Description'],
  gold_fury: ['GoldFury.Reward.Description', 'GoldFury.Reward.StatBuff.NoFormatting'],
  fire_giant: ['FireGiant.1.Description'],
  ritual_site: ['Moonlight.Ritual.AlreadyOwned'],
};

export function getBlueprintMetaForStatsKey(statsKey) {
  return statsKey ? CONQUEST_BLUEPRINT_META[statsKey] || null : null;
}
