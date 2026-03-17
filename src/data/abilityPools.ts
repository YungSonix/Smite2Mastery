type PoolClass = 'Guardian' | 'Warrior' | 'Assassin' | 'Mage' | 'Hunter';

type AbilityDef = {
  name: string;
  cost: number;
  description: string;
};

type UltimateDef = {
  name: string;
  pips: number;
  description: string;
};

type GodAssignment = {
  keyword: string;
  abilityId: `A${number}`;
  ultimateId: `U${number}`;
  abilityIconSource: string;
  ultimateIconSource: string;
};

type TrapCardDef = {
  name: string;
  iconSource: string;
  rarity: 'uncommon' | 'rare' | 'epic' | 'legendary';
  cost: number;
  trigger: string;
  description: string;
};

type SpellCardDef = {
  name: string;
  iconSource: string;
  rarity: 'uncommon' | 'rare' | 'epic' | 'legendary';
  cost: number;
  description: string;
};

export const ABILITY_POOLS: Record<
  PoolClass,
  {
    abilities: Record<`A${number}`, AbilityDef>;
    ultimates: Record<`U${number}`, UltimateDef>;
  }
> = {
  Guardian: {
    abilities: {
      A1: { name: 'Stone Wall', cost: 1, description: 'Block the next attack against any ally' },
      A2: { name: 'War Cry', cost: 1, description: 'All allies gain +3 Attack this turn' },
      A3: { name: 'Iron Grip', cost: 1, description: 'Stun one enemy for 1 turn' },
      A4: { name: 'Earthen Shield', cost: 1, description: 'Give one ally a 50 HP shield until broken' },
      A5: { name: 'Ground Slam', cost: 2, description: 'Deal 15 damage to all front row enemies' },
      A6: { name: 'Fortify', cost: 1, description: 'Gain Armor 20 until your next turn' },
      A7: { name: 'Rallying Banner', cost: 2, description: 'All allies heal 10 HP' },
      A8: { name: 'Crushing Blow', cost: 2, description: 'Deal 20 damage to one enemy, reduce their Attack by 3 for 2 turns' },
    },
    ultimates: {
      U1: { name: 'Seismic Slam', pips: 3, description: 'Deal 20 damage to all enemies, knock front row to back row' },
      U2: { name: 'Impenetrable Wall', pips: 3, description: 'Block all damage to all allies for 1 turn' },
      U3: { name: 'Divine Judgment', pips: 3, description: 'Pull all enemy units to front row, deal 15 damage each' },
      U4: { name: 'Eternal Fortress', pips: 4, description: 'All allies gain Armor 30 and heal 10 HP per turn for 2 turns' },
    },
  },
  Warrior: {
    abilities: {
      A1: { name: 'Power Strike', cost: 1, description: 'Deal 20 damage to one enemy, gain +2 Attack until end of round' },
      A2: { name: 'Whirlwind Slash', cost: 2, description: 'Deal 12 damage to all front row enemies' },
      A3: { name: 'Battle Cry', cost: 1, description: 'All allied Warriors gain +4 Attack this turn' },
      A4: { name: 'Reckless Charge', cost: 1, description: 'Deal 30 damage to one enemy, take 10 damage yourself' },
      A5: { name: 'Shield Slam', cost: 1, description: 'Deal 18 damage and Slow target for 1 turn' },
      A6: { name: 'Berserk', cost: 1, description: 'Below 50% HP deal +8 bonus damage this turn' },
      A7: { name: 'Combat Roll', cost: 1, description: 'Dodge next incoming attack, counter for 15 damage' },
      A8: { name: 'War Shout', cost: 2, description: 'All allied Warriors heal 15 HP' },
    },
    ultimates: {
      U1: { name: 'Last Stand', pips: 3, description: 'Deal 40 damage, if this kills target heal 30 HP' },
      U2: { name: "Warlord's Fury", pips: 3, description: 'Attack every enemy unit once for 15 damage each' },
      U3: { name: 'Battle Stance', pips: 3, description: 'Untargetable for 1 turn, next attack deals +80% damage' },
      U4: { name: 'Rally the Line', pips: 4, description: 'All allies gain +5 Attack and 30 HP shield for 2 turns' },
    },
  },
  Assassin: {
    abilities: {
      A1: { name: 'Backstab', cost: 1, description: 'Deal 25 damage to one enemy ignoring Taunt' },
      A2: { name: 'Vanish', cost: 1, description: 'Become untargetable until next turn' },
      A3: { name: 'Crippling Blow', cost: 2, description: 'Deal 20 damage and Silence target for 1 turn' },
      A4: { name: 'Marked Target', cost: 1, description: 'All attacks against marked target deal +8 bonus damage this round' },
      A5: { name: 'Shadow Step', cost: 1, description: 'Move to back row, next attack deals +50% damage' },
      A6: { name: 'Poison Strike', cost: 1, description: 'Deal 15 damage and apply Bleed 6 for 3 turns' },
      A7: { name: 'Cheap Shot', cost: 1, description: 'Deal 10 damage to any back row target bypassing front row' },
      A8: { name: 'Death Mark', cost: 1, description: 'Target enemy cannot be healed this turn' },
    },
    ultimates: {
      U1: { name: 'Execute', pips: 3, description: 'Instantly destroy any unit at 25% HP or below' },
      U2: { name: 'Killing Spree', pips: 3, description: 'Deal 15 damage to all enemies, apply Bleed 5 to each' },
      U3: { name: 'Shadow Realm', pips: 3, description: 'Become untargetable for 2 turns, reposition to any empty slot' },
      U4: { name: 'Assassination', pips: 4, description: 'Destroy one enemy instantly, become untargetable for 1 turn' },
    },
  },
  Mage: {
    abilities: {
      A1: { name: 'Chain Blast', cost: 1, description: 'Deal 20 damage to one enemy, arc 10 damage to a second' },
      A2: { name: 'Fume Cloud', cost: 2, description: 'Place Fumes on target, next ability detonates for 25 damage and Stun' },
      A3: { name: 'Tidal Push', cost: 1, description: 'Deal 18 damage and push target to back row' },
      A4: { name: 'Solar Beam', cost: 2, description: 'Deal 30 damage to one target in a line' },
      A5: { name: 'Chaos Orb', cost: 1, description: 'Deal 20 damage, bounces to a second enemy for 10 damage' },
      A6: { name: 'Whirlwind', cost: 2, description: 'Deal 15 damage to all enemies' },
      A7: { name: 'Force of Will', cost: 2, description: 'Hit one enemy to Root it, hit two to force them to attack each other' },
      A8: { name: 'Voodoo Curse', cost: 2, description: 'Deal 15 damage to up to 4 enemies in an X shape' },
    },
    ultimates: {
      U1: { name: 'Storm Call', pips: 3, description: 'Deal 25 damage to all enemies, enemies with 3 charges are Stunned' },
      U2: { name: 'Meteor Rain', pips: 3, description: 'Fire 3 meteors each dealing 20 damage to separate targets' },
      U3: { name: "Kraken's Wrath", pips: 4, description: 'Deal 35 damage to one target, 15 damage and Slow all others' },
      U4: { name: 'Serpent Wind', pips: 4, description: 'Deal 25 damage to all enemies, reduce enemy Leader max HP by 15%' },
    },
  },
  Hunter: {
    abilities: {
      A1: { name: "Hunter's Mark", cost: 1, description: 'Mark one enemy, deal +5 damage to that target permanently this match' },
      A2: { name: 'Explosive Shot', cost: 1, description: 'Next 3 basic attacks deal splash damage to adjacent enemies' },
      A3: { name: 'Piercing Arrow', cost: 1, description: 'Next 3 basic attacks pierce and apply Slow' },
      A4: { name: 'Poison Volley', cost: 2, description: 'Apply Bleed 6 to all enemies in front row' },
      A5: { name: 'Rapid Fire', cost: 1, description: 'Gain Frenzy this turn - attack twice' },
      A6: { name: 'Scatter Shot', cost: 2, description: 'Deal 12 damage to all enemies in one row' },
      A7: { name: 'Evasive Maneuver', cost: 1, description: 'Dodge next incoming attack, reposition to any row' },
      A8: { name: 'Crippling Shot', cost: 1, description: 'Deal 15 damage and Root target for 1 turn' },
    },
    ultimates: {
      U1: { name: 'Rain of Arrows', pips: 3, description: 'Deal 30 damage to target and Stun for 1 turn' },
      U2: { name: 'Arrow Barrage', pips: 3, description: 'Fire 5 arrows each dealing 15 damage, split between targets freely' },
      U3: { name: 'Blackout', pips: 4, description: "Reduce ALL enemy units' Attack by 5 for 2 turns" },
      U4: { name: 'Air Raid', pips: 3, description: 'Deal 25 damage to every enemy in one target row' },
    },
  },
};

export const TRAP_CARDS: Record<`T${number}`, TrapCardDef> = {
  T1: {
    name: 'Ice Wall',
    iconSource: 'Ymir_IceWall',
    rarity: 'uncommon',
    cost: 2,
    trigger: 'Enemy attacks any ally',
    description: 'Block that attack entirely',
  },
  T2: {
    name: 'Shifting Sands',
    iconSource: 'Anhur_ShiftingSands',
    rarity: 'uncommon',
    cost: 2,
    trigger: 'Enemy enters front row',
    description: 'Apply Slow, target attacks last next turn',
  },
  T3: {
    name: 'Portal Trap',
    iconSource: 'Janus_Portal',
    rarity: 'rare',
    cost: 2,
    trigger: 'Enemy deploys',
    description: 'Send that unit to back row, deal 10 damage',
  },
  T4: {
    name: 'Shield Counter',
    iconSource: 'Bellona_ShieldBash',
    rarity: 'uncommon',
    cost: 2,
    trigger: 'Enemy attacks your Leader',
    description: 'Block that attack, deal 15 damage back to attacker',
  },
  T5: {
    name: 'Venom Trap',
    iconSource: 'Jorm_VenomHaze',
    rarity: 'uncommon',
    cost: 1,
    trigger: 'Enemy attacks',
    description: 'Apply Bleed 5 for 2 turns to the attacker',
  },
  T6: {
    name: 'Soul Cage',
    iconSource: 'Cerberus_SpiritOfDeath',
    rarity: 'rare',
    cost: 2,
    trigger: 'Enemy is healed',
    description: 'Cancel that heal, deal 10 damage to that unit instead',
  },
  T7: {
    name: 'Vine Snare',
    iconSource: 'Artio_EntanglingVines',
    rarity: 'rare',
    cost: 2,
    trigger: 'Enemy uses ability',
    description: 'Reduce that ability damage by 50%',
  },
  T8: {
    name: 'Impale',
    iconSource: 'Anhur_Impale',
    rarity: 'epic',
    cost: 3,
    trigger: 'Enemy moves to front row',
    description: 'Deal 25 damage and Stun for 1 turn',
  },
  T9: {
    name: 'Counterstrike',
    iconSource: 'Bellona_MasterOfWar',
    rarity: 'rare',
    cost: 2,
    trigger: 'Enemy attacks any of your units',
    description: 'That unit immediately counter attacks for full damage before taking the hit',
  },
  T10: {
    name: 'Divine Snare',
    iconSource: 'Artemis_TransgressorsFate',
    rarity: 'epic',
    cost: 3,
    trigger: 'Enemy deploys a god',
    description: 'Root that god for 2 turns, it cannot attack or use abilities',
  },
};

export const SPELL_CARDS: Record<`S${number}`, SpellCardDef> = {
  S1: {
    name: 'Detonate',
    iconSource: 'Zeus_DetonateCharge',
    rarity: 'legendary',
    cost: 5,
    description: 'Deal 15 damage to every enemy on the field simultaneously',
  },
  S2: {
    name: 'Vortex Blast',
    iconSource: 'Janus_UnstableVortex',
    rarity: 'rare',
    cost: 3,
    description: 'Deal 25 damage to all enemies in one row',
  },
  S3: {
    name: 'Mirror Strike',
    iconSource: 'Amaterasu_HeavenlyReflection',
    rarity: 'epic',
    cost: 3,
    description: 'The next damage dealt to any ally is reflected back to the attacker in full',
  },
  S4: {
    name: 'Monkey Bounce',
    iconSource: 'HunBatz_SacredMonkey',
    rarity: 'uncommon',
    cost: 2,
    description: 'Deal 10 damage bouncing between 3 random enemies',
  },
  S5: {
    name: 'Thunder Drop',
    iconSource: 'Chaac_ThunderStrike',
    rarity: 'uncommon',
    cost: 2,
    description: 'Deal 20 damage to one target, 10 damage to all adjacent enemies',
  },
  S6: {
    name: 'Searing Light',
    iconSource: 'Ra_SearingPain',
    rarity: 'rare',
    cost: 3,
    description: 'Deal 20 damage plus 10% of target max HP as bonus damage',
  },
  S7: {
    name: 'Undying Flame',
    iconSource: 'Pele_EverlastingFlame',
    rarity: 'epic',
    cost: 4,
    description: 'One ally cannot be destroyed this turn, heals to 50% HP instead',
  },
  S8: {
    name: 'Backfire',
    iconSource: 'Vulcan_Backfire',
    rarity: 'rare',
    cost: 3,
    description: 'Deal 30 damage to one enemy and push them to back row',
  },
  S9: {
    name: 'Tidal Wave',
    iconSource: 'Poseidon_TidalSurge',
    rarity: 'uncommon',
    cost: 2,
    description: 'Push all front row enemies to back row, deal 10 damage each',
  },
  S10: {
    name: 'Solar Flare',
    iconSource: 'Ra_DivinLight',
    rarity: 'rare',
    cost: 3,
    description: 'Blind all enemies - their next attack deals 0 damage',
  },
  S11: {
    name: 'Phantom Rush',
    iconSource: 'Izanami_FadeAway',
    rarity: 'uncommon',
    cost: 2,
    description: 'One friendly unit dodges the next attack made against it this turn',
  },
  S12: {
    name: 'Chaos Apple',
    iconSource: 'Discordia_GoldenApple',
    rarity: 'epic',
    cost: 4,
    description: 'Force two random enemy units to attack each other immediately',
  },
  S13: {
    name: 'Death Toll',
    iconSource: 'Thanatos_DeathScent',
    rarity: 'rare',
    cost: 3,
    description: 'Destroy the lowest HP unit on the field regardless of side',
  },
  S14: {
    name: 'Flame Wave',
    iconSource: 'Agni_FlameWave',
    rarity: 'uncommon',
    cost: 2,
    description: 'Deal 20 damage to all enemies in front row, apply Bleed 5 for 1 turn',
  },
  S15: {
    name: 'Shards of Ice',
    iconSource: 'Ymir_ShardsOfIce',
    rarity: 'epic',
    cost: 4,
    description: 'Freeze all front row enemies for 1 turn, deal 15 damage to each',
  },
};

const CLASS_KEYWORDS: Record<PoolClass, string> = {
  Guardian: 'Taunt',
  Warrior: 'Brawler',
  Assassin: 'Charge',
  Mage: 'Ranged',
  Hunter: 'Ranged',
};

const EXPLICIT_GOD_ASSIGNMENTS: Record<string, GodAssignment> = {
  Ymir: { keyword: 'Taunt', abilityId: 'A1', ultimateId: 'U2', abilityIconSource: 'Ymir_IceWall', ultimateIconSource: 'Ymir_ShardsOfIce' },
  Artio: { keyword: 'Taunt', abilityId: 'A6', ultimateId: 'U4', abilityIconSource: 'Artio_FerocRoar', ultimateIconSource: 'Artio_Shapeshift' },
  Ares: { keyword: 'Taunt', abilityId: 'A3', ultimateId: 'U1', abilityIconSource: 'Ares_BoldsOfAgony', ultimateIconSource: 'Ares_NoEscape' },
  Khepri: { keyword: 'Taunt', abilityId: 'A4', ultimateId: 'U3', abilityIconSource: 'Khepri_AbductIcon', ultimateIconSource: 'Khepri_Scarab' },
  Geb: { keyword: 'Taunt', abilityId: 'A7', ultimateId: 'U4', abilityIconSource: 'Geb_StoneShield', ultimateIconSource: 'Geb_Cataclysm' },
  Sobek: { keyword: 'Taunt', abilityId: 'A5', ultimateId: 'U1', abilityIconSource: 'Sobek_Pluck', ultimateIconSource: 'Sobek_Lurking' },
  Cerberus: { keyword: 'Taunt', abilityId: 'A8', ultimateId: 'U3', abilityIconSource: 'Cerberus_ParalyzSpit', ultimateIconSource: 'Cerberus_StygTorment' },
  Cabrakan: { keyword: 'Taunt', abilityId: 'A2', ultimateId: 'U1', abilityIconSource: 'Cabrakan_SeismicCrush', ultimateIconSource: 'Cabrakan_TectonicShift' },
  Jormungandr: { keyword: 'Armor', abilityId: 'A8', ultimateId: 'U4', abilityIconSource: 'Jorm_VenomHaze', ultimateIconSource: 'Jorm_ConsBellow' },
  Yemoja: { keyword: 'Taunt', abilityId: 'A7', ultimateId: 'U2', abilityIconSource: 'Yemoja_MendingWaters', ultimateIconSource: 'Yemoja_RiversRebuke' },
  Achilles: { keyword: 'Brawler', abilityId: 'A1', ultimateId: 'U1', abilityIconSource: 'Achilles_CombatDodge', ultimateIconSource: 'Achilles_FatalStrike' },
  Bellona: { keyword: 'Brawler', abilityId: 'A2', ultimateId: 'U2', abilityIconSource: 'Bellona_Bludgeon', ultimateIconSource: 'Bellona_EaglesRally' },
  Chaac: { keyword: 'Brawler', abilityId: 'A8', ultimateId: 'U4', abilityIconSource: 'Chaac_RainDance', ultimateIconSource: 'Chaac_StormCall' },
  Hercules: { keyword: 'Brawler', abilityId: 'A4', ultimateId: 'U1', abilityIconSource: 'Herc_Excavate', ultimateIconSource: 'Herc_SkyCleave' },
  'Sun Wukong': { keyword: 'Brawler', abilityId: 'A7', ultimateId: 'U3', abilityIconSource: 'Wukong_72Trans', ultimateIconSource: 'Wukong_MythicPillar' },
  'Guan Yu': { keyword: 'Brawler', abilityId: 'A5', ultimateId: 'U4', abilityIconSource: 'GuanYu_Conviction', ultimateIconSource: 'GuanYu_RighteousCharge' },
  Osiris: { keyword: 'Brawler', abilityId: 'A3', ultimateId: 'U2', abilityIconSource: 'Osiris_SpiritFlail', ultimateIconSource: 'Osiris_LordAfterlife' },
  'Hua Mulan': { keyword: 'Brawler', abilityId: 'A6', ultimateId: 'U3', abilityIconSource: 'Mulan_CrossStrike', ultimateIconSource: 'Mulan_DivineMastery' },
  'King Arthur': { keyword: 'Brawler', abilityId: 'A1', ultimateId: 'U2', abilityIconSource: 'KArt_OhSlash', ultimateIconSource: 'KArt_Excalibur' },
  Mordred: { keyword: 'Brawler', abilityId: 'A4', ultimateId: 'U1', abilityIconSource: 'Mordred_Ability2', ultimateIconSource: 'Mordred_Ultimate' },
  Mulan: { keyword: 'Brawler', abilityId: 'A2', ultimateId: 'U4', abilityIconSource: 'Mulan_SpearThrust', ultimateIconSource: 'Mulan_DivineMastery' },
  Loki: { keyword: 'Charge', abilityId: 'A2', ultimateId: 'U4', abilityIconSource: 'Loki_Vanish', ultimateIconSource: 'Loki_Assassinate' },
  Thanatos: { keyword: 'Charge', abilityId: 'A3', ultimateId: 'U1', abilityIconSource: 'Thana_Silence', ultimateIconSource: 'Thana_KillingSpree' },
  'Da Ji': { keyword: 'Charge', abilityId: 'A6', ultimateId: 'U2', abilityIconSource: 'DaJi_HorribleBurns', ultimateIconSource: 'DaJi_108Pains' },
  Bakasura: { keyword: 'Charge', abilityId: 'A1', ultimateId: 'U1', abilityIconSource: 'Baka_EatMinion', ultimateIconSource: 'Baka_AbsorbAndPurge' },
  Kali: { keyword: 'Charge', abilityId: 'A8', ultimateId: 'U2', abilityIconSource: 'Kali_Frenzy', ultimateIconSource: 'Kali_ManiacsStrength' },
  Arachne: { keyword: 'Charge', abilityId: 'A4', ultimateId: 'U3', abilityIconSource: 'Arach_WebSpin', ultimateIconSource: 'Arach_CocoonStrike' },
  Aladdin: { keyword: 'Charge', abilityId: 'A7', ultimateId: 'U4', abilityIconSource: 'Alad_AgilRun', ultimateIconSource: 'Alad_IntoLamp' },
  Mercury: { keyword: 'Charge', abilityId: 'A5', ultimateId: 'U3', abilityIconSource: 'Merc_MaxVelocity', ultimateIconSource: 'Merc_WingedFlight' },
  Fenrir: { keyword: 'Charge', abilityId: 'A1', ultimateId: 'U1', abilityIconSource: 'Fenrir_Unchained', ultimateIconSource: 'Fenrir_Ragnarok' },
  Pele: { keyword: 'Charge', abilityId: 'A6', ultimateId: 'U2', abilityIconSource: 'Pele_Pyroclast', ultimateIconSource: 'Pele_VolcLightning' },
  'Hun Batz': { keyword: 'Charge', abilityId: 'A3', ultimateId: 'U2', abilityIconSource: 'HunBatz_Somersault', ultimateIconSource: 'HunBatz_FearNoEvil' },
  Tsukuyomi: { keyword: 'Charge', abilityId: 'A5', ultimateId: 'U4', abilityIconSource: 'Tsuku_Kusarigama', ultimateIconSource: 'Tsuku_EternalDark' },
  Zeus: { keyword: 'Ranged', abilityId: 'A1', ultimateId: 'U1', abilityIconSource: 'Zeus_ChainLightning', ultimateIconSource: 'Zeus_LightningStorm' },
  Agni: { keyword: 'Ranged', abilityId: 'A2', ultimateId: 'U2', abilityIconSource: 'Agni_NoxiousFumes', ultimateIconSource: 'Agni_RainFire' },
  Poseidon: { keyword: 'Ranged', abilityId: 'A3', ultimateId: 'U3', abilityIconSource: 'Pos_TidalSurge', ultimateIconSource: 'Pos_ReleaseKraken' },
  Ra: { keyword: 'Ranged', abilityId: 'A4', ultimateId: 'U1', abilityIconSource: 'Ra_CelestialBeam', ultimateIconSource: 'Ra_SearingPain' },
  Kukulkan: { keyword: 'Ranged', abilityId: 'A6', ultimateId: 'U4', abilityIconSource: 'Kuku_SpiralOut', ultimateIconSource: 'Kuku_SpiritWind' },
  Hades: { keyword: 'Ranged', abilityId: 'A5', ultimateId: 'U2', abilityIconSource: 'Hades_ClutchOfDeath', ultimateIconSource: 'Hades_CatatrophicCrash' },
  'He Bo': { keyword: 'Ranged', abilityId: 'A3', ultimateId: 'U3', abilityIconSource: 'HeBo_WaterIllusion', ultimateIconSource: 'HeBo_OceanicProvidence' },
  Discordia: { keyword: 'Ranged', abilityId: 'A7', ultimateId: 'U1', abilityIconSource: 'Disc_Strife', ultimateIconSource: 'Disc_GoldenApple' },
  Merlin: { keyword: 'Ranged', abilityId: 'A5', ultimateId: 'U3', abilityIconSource: 'Merl_Elemental', ultimateIconSource: 'Merl_ArcaneSingularity' },
  Scylla: { keyword: 'Ranged', abilityId: 'A1', ultimateId: 'U2', abilityIconSource: 'Scylla_IHaveThePower', ultimateIconSource: 'Scylla_MonstrosityWoken' },
  'Nu Wa': { keyword: 'Ranged', abilityId: 'A8', ultimateId: 'U4', abilityIconSource: 'NuWa_GuardedCelestas', ultimateIconSource: 'NuWa_FireShards' },
  'Baron Samedi': { keyword: 'Ranged', abilityId: 'A8', ultimateId: 'U1', abilityIconSource: 'Baron_VividGaze', ultimateIconSource: 'Baron_LifeOfParty' },
  'Ah Puch': { keyword: 'Ranged', abilityId: 'A6', ultimateId: 'U2', abilityIconSource: 'AhPuch_DecayingFume', ultimateIconSource: 'AhPuch_SubmergeInFear' },
  Sol: { keyword: 'Ranged', abilityId: 'A4', ultimateId: 'U3', abilityIconSource: 'Sol_Radiance', ultimateIconSource: 'Sol_SuperNova' },
  'The Morrigan': { keyword: 'Ranged', abilityId: 'A7', ultimateId: 'U4', abilityIconSource: 'Morr_Confusion', ultimateIconSource: 'Morr_Changeling' },
  Hecate: { keyword: 'Ranged', abilityId: 'A2', ultimateId: 'U1', abilityIconSource: 'Hec_Witchcraft', ultimateIconSource: 'Hec_Repulse' },
  Freya: { keyword: 'Ranged', abilityId: 'A3', ultimateId: 'U2', abilityIconSource: 'Freya_InnervateAttack', ultimateIconSource: 'Freya_ValhallaAwaits' },
  Vulcan: { keyword: 'Ranged', abilityId: 'A5', ultimateId: 'U4', abilityIconSource: 'Vulc_InfernoCannon', ultimateIconSource: 'Vulc_Earthshaker' },
  Anubis: { keyword: 'Ranged', abilityId: 'A8', ultimateId: 'U2', abilityIconSource: 'Anubis_LocustSwarm', ultimateIconSource: 'Anubis_DeathGaze' },
  Artemis: { keyword: 'Ranged', abilityId: 'A1', ultimateId: 'U1', abilityIconSource: 'Art_TransgressorFate', ultimateIconSource: 'Art_CalydBoar' },
  Rama: { keyword: 'Ranged', abilityId: 'A3', ultimateId: 'U2', abilityIconSource: 'Rama_AstralStrike', ultimateIconSource: 'Rama_AstralBarrage' },
  'Jing Wei': { keyword: 'Ranged', abilityId: 'A2', ultimateId: 'U4', abilityIconSource: 'JW_ExplosiveBolts', ultimateIconSource: 'JW_AirStrike' },
  Xbalanque: { keyword: 'Ranged', abilityId: 'A4', ultimateId: 'U3', abilityIconSource: 'Xbal_PoisonDarts', ultimateIconSource: 'Xbal_DarkestNights' },
  Hachiman: { keyword: 'Ranged', abilityId: 'A5', ultimateId: 'U1', abilityIconSource: 'Hach_EightBanners', ultimateIconSource: 'Hach_Iaijutsu' },
  Izanami: { keyword: 'Ranged', abilityId: 'A6', ultimateId: 'U3', abilityIconSource: 'Iza_SickleStorm', ultimateIconSource: 'Iza_FadeAway' },
  Cernunnos: { keyword: 'Ranged', abilityId: 'A7', ultimateId: 'U2', abilityIconSource: 'Cern_HornCharge', ultimateIconSource: 'Cern_WildHunt' },
  Danzaburou: { keyword: 'Ranged', abilityId: 'A8', ultimateId: 'U4', abilityIconSource: 'Danz_FeaturePoint', ultimateIconSource: 'Danz_UltimateReality' },
  Neith: { keyword: 'Ranged', abilityId: 'A8', ultimateId: 'U1', abilityIconSource: 'Neith_BackFlip', ultimateIconSource: 'Neith_WorldWeaver' },
  Medusa: { keyword: 'Ranged', abilityId: 'A3', ultimateId: 'U2', abilityIconSource: 'Med_CripplingVenom', ultimateIconSource: 'Med_Petrify' },
  'Hou Yi': { keyword: 'Ranged', abilityId: 'A2', ultimateId: 'U4', abilityIconSource: 'HouYi_Ricochet', ultimateIconSource: 'HouYi_Sunbreaker' },
  'Princess Bari': { keyword: 'Ranged', abilityId: 'A6', ultimateId: 'U3', abilityIconSource: 'Bari_SacredBell', ultimateIconSource: 'Bari_SpiritsCadence' },
};

const ABILITY_IDS: Array<`A${number}`> = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'];
const ULTIMATE_IDS: Array<`U${number}`> = ['U1', 'U2', 'U3', 'U4'];

function pickLeastUsed<T extends string>(ids: T[], usage: Record<T, number>): T {
  let winner = ids[0];
  let lowest = Number.POSITIVE_INFINITY;
  for (const id of ids) {
    const count = usage[id] ?? 0;
    if (count < lowest) {
      lowest = count;
      winner = id;
    }
  }
  usage[winner] = (usage[winner] ?? 0) + 1;
  return winner;
}

export function getClassPoolKey(cls: unknown): PoolClass | null {
  const normalized = String(cls || '').trim().toLowerCase();
  if (normalized === 'guardian' || normalized === 'tank') return 'Guardian';
  if (normalized === 'warrior' || normalized === 'fighter') return 'Warrior';
  if (normalized === 'assassin') return 'Assassin';
  if (normalized === 'mage') return 'Mage';
  if (normalized === 'hunter') return 'Hunter';
  return null;
}

export function getClassKeyword(cls: unknown): string {
  const key = getClassPoolKey(cls);
  return key ? CLASS_KEYWORDS[key] : 'Ranged';
}

export function getPooledAbility(cls: unknown, abilityId: unknown) {
  const poolKey = getClassPoolKey(cls);
  const id = String(abilityId || '') as `A${number}`;
  if (!poolKey) return null;
  return ABILITY_POOLS[poolKey]?.abilities?.[id] || null;
}

export function getPooledUltimate(cls: unknown, ultimateId: unknown) {
  const poolKey = getClassPoolKey(cls);
  const id = String(ultimateId || '') as `U${number}`;
  if (!poolKey) return null;
  return ABILITY_POOLS[poolKey]?.ultimates?.[id] || null;
}

export function enrichGodCardsWithAbilityPools<T extends { id?: string; cls?: string }>(cards: T[]): Array<T & GodAssignment> {
  const abilityUsageByClass: Record<PoolClass, Record<`A${number}`, number>> = {
    Guardian: { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0, A7: 0, A8: 0 },
    Warrior: { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0, A7: 0, A8: 0 },
    Assassin: { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0, A7: 0, A8: 0 },
    Mage: { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0, A7: 0, A8: 0 },
    Hunter: { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0, A7: 0, A8: 0 },
  };
  const ultimateUsageByClass: Record<PoolClass, Record<`U${number}`, number>> = {
    Guardian: { U1: 0, U2: 0, U3: 0, U4: 0 },
    Warrior: { U1: 0, U2: 0, U3: 0, U4: 0 },
    Assassin: { U1: 0, U2: 0, U3: 0, U4: 0 },
    Mage: { U1: 0, U2: 0, U3: 0, U4: 0 },
    Hunter: { U1: 0, U2: 0, U3: 0, U4: 0 },
  };

  // Seed usage with explicit assignments to preserve requested balance as much as possible.
  cards.forEach((card) => {
    const poolKey = getClassPoolKey(card?.cls);
    const explicit = card?.id ? EXPLICIT_GOD_ASSIGNMENTS[card.id] : null;
    if (!poolKey || !explicit) return;
    abilityUsageByClass[poolKey][explicit.abilityId] += 1;
    ultimateUsageByClass[poolKey][explicit.ultimateId] += 1;
  });

  return cards.map((card) => {
    const poolKey = getClassPoolKey(card?.cls);
    const explicit = card?.id ? EXPLICIT_GOD_ASSIGNMENTS[card.id] : null;
    if (!poolKey) {
      return {
        ...card,
        keyword: 'Ranged',
        abilityId: 'A1',
        ultimateId: 'U1',
        abilityIconSource: `${card?.id || 'Unknown'}_Ability1`,
        ultimateIconSource: `${card?.id || 'Unknown'}_Ultimate`,
        description: (card as { description?: string })?.description || `${card?.id || 'Unknown'} brings pressure and tempo to the battlefield.`,
      } as T & GodAssignment;
    }
    if (explicit) {
      return {
        ...card,
        ...explicit,
        description: (card as { description?: string })?.description || `${card?.id || 'Unknown'} channels ${explicit.keyword.toLowerCase()} power and anchors your frontline strategy.`,
      };
    }

    const abilityId = pickLeastUsed(ABILITY_IDS, abilityUsageByClass[poolKey]);
    const ultimateId = pickLeastUsed(ULTIMATE_IDS, ultimateUsageByClass[poolKey]);
    return {
      ...card,
      keyword: CLASS_KEYWORDS[poolKey],
      abilityId,
      ultimateId,
      abilityIconSource: `${card.id || 'Unknown'}_Ability1`,
      ultimateIconSource: `${card.id || 'Unknown'}_Ultimate`,
      description: (card as { description?: string })?.description || `${card?.id || 'Unknown'} channels ${CLASS_KEYWORDS[poolKey].toLowerCase()} power and anchors your frontline strategy.`,
    } as T & GodAssignment;
  });
}
