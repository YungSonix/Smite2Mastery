/**
 * Smite 2 Prophecy data model.
 * The game stays in Smite 2 canon and uses Smite 2 role naming.
 */
import { enrichGodCardsWithAbilityPools, TRAP_CARDS, SPELL_CARDS } from '../src/data/abilityPools';

export const CARD_TYPE = {
  GOD: 'god',
  SPELL: 'spell',
  TRAP: 'trap',
  ITEM: 'item',
  LEADER: 'leader',
};

export const PROPHECY_PANTHEONS = [
  'Olympian',
  'Asgardian',
  'Eastern',
  'Roman',
  'Underworld',
  'Mayan',
  'Egyptian',
  'Hindu',
  'Celtic',
  'Japanese',
  'Arthurian',
  'Voodoo',
  'Tales of Arabia',
  'Polynesian',
  'Korean',
  'Yoruba',
];

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const GOLD_PER_RARITY = { common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8 };

export const CARD_VISUAL_STYLE = {
  STANDARD: 'STANDARD',
  SCULPTED_STONE: 'SCULPTED_STONE',
  ILLUMINATED: 'ILLUMINATED',
  DIVINE_GOLD: 'DIVINE_GOLD',
  CONSTELLATION: 'CONSTELLATION',
  BATTLE_WORN: 'BATTLE_WORN',
  UNDERWORLD: 'UNDERWORLD',
  DYNASTY: 'DYNASTY',
  SACRED_SCROLL: 'SACRED_SCROLL',
};

export const CARD_FOIL_TIER = {
  NONE: 'NONE',
  DIVINE_FOIL: 'DIVINE_FOIL',
  PANTHEON_HOLO: 'PANTHEON_HOLO',
  FULL_ART: 'FULL_ART',
  MYTHIC: 'MYTHIC',
  PRISMATIC: 'PRISMATIC',
};

const PANTHEON_VISUAL_PROFILES = {
  Olympian: { key: 'Olympian', style: CARD_VISUAL_STYLE.SCULPTED_STONE, auraColor: '#9ca3af', accentColor: '#e5e7eb', particle: 'storm clouds', cardBackId: 'back_olympian' },
  Greek: { key: 'Olympian', style: CARD_VISUAL_STYLE.SCULPTED_STONE, auraColor: '#9ca3af', accentColor: '#e5e7eb', particle: 'storm clouds', cardBackId: 'back_olympian' },
  Asgardian: { key: 'Asgardian', style: CARD_VISUAL_STYLE.CONSTELLATION, auraColor: '#60a5fa', accentColor: '#7dd3fc', particle: 'aurora ribbons', cardBackId: 'back_asgardian' },
  Norse: { key: 'Asgardian', style: CARD_VISUAL_STYLE.CONSTELLATION, auraColor: '#60a5fa', accentColor: '#7dd3fc', particle: 'aurora ribbons', cardBackId: 'back_asgardian' },
  Eastern: { key: 'Eastern', style: CARD_VISUAL_STYLE.DYNASTY, auraColor: '#f87171', accentColor: '#fbbf24', particle: 'ink embers', cardBackId: 'back_eastern' },
  Chinese: { key: 'Eastern', style: CARD_VISUAL_STYLE.DYNASTY, auraColor: '#f87171', accentColor: '#fbbf24', particle: 'ink embers', cardBackId: 'back_eastern' },
  Roman: { key: 'Roman', style: CARD_VISUAL_STYLE.DIVINE_GOLD, auraColor: '#f59e0b', accentColor: '#fde68a', particle: 'laurel sparks', cardBackId: 'back_roman' },
  Underworld: { key: 'Underworld', style: CARD_VISUAL_STYLE.UNDERWORLD, auraColor: '#a78bfa', accentColor: '#ddd6fe', particle: 'soul wisps', cardBackId: 'back_underworld' },
  Mayan: { key: 'Mayan', style: CARD_VISUAL_STYLE.BATTLE_WORN, auraColor: '#34d399', accentColor: '#86efac', particle: 'jade dust', cardBackId: 'back_mayan' },
  Egyptian: { key: 'Egyptian', style: CARD_VISUAL_STYLE.SACRED_SCROLL, auraColor: '#eab308', accentColor: '#fde68a', particle: 'golden sand', cardBackId: 'back_egyptian' },
  Hindu: { key: 'Hindu', style: CARD_VISUAL_STYLE.ILLUMINATED, auraColor: '#fb923c', accentColor: '#fdba74', particle: 'lotus embers', cardBackId: 'back_hindu' },
  Celtic: { key: 'Celtic', style: CARD_VISUAL_STYLE.ILLUMINATED, auraColor: '#22c55e', accentColor: '#86efac', particle: 'verdant runes', cardBackId: 'back_celtic' },
  Japanese: { key: 'Japanese', style: CARD_VISUAL_STYLE.DYNASTY, auraColor: '#f472b6', accentColor: '#f9a8d4', particle: 'sakura petals', cardBackId: 'back_japanese' },
  Arthurian: { key: 'Arthurian', style: CARD_VISUAL_STYLE.ILLUMINATED, auraColor: '#60a5fa', accentColor: '#93c5fd', particle: 'arcane sigils', cardBackId: 'back_arthurian' },
  Voodoo: { key: 'Voodoo', style: CARD_VISUAL_STYLE.UNDERWORLD, auraColor: '#c084fc', accentColor: '#d8b4fe', particle: 'hex motes', cardBackId: 'back_voodoo' },
  'Tales of Arabia': { key: 'Tales of Arabia', style: CARD_VISUAL_STYLE.SACRED_SCROLL, auraColor: '#f59e0b', accentColor: '#fcd34d', particle: 'desert mirage dust', cardBackId: 'back_tales_of_arabia' },
  Polynesian: { key: 'Polynesian', style: CARD_VISUAL_STYLE.BATTLE_WORN, auraColor: '#2dd4bf', accentColor: '#67e8f9', particle: 'tidal spray', cardBackId: 'back_polynesian' },
  Korean: { key: 'Korean', style: CARD_VISUAL_STYLE.DYNASTY, auraColor: '#38bdf8', accentColor: '#bae6fd', particle: 'moon ink', cardBackId: 'back_korean' },
  Yoruba: { key: 'Yoruba', style: CARD_VISUAL_STYLE.DIVINE_GOLD, auraColor: '#f97316', accentColor: '#fdba74', particle: 'sunfire embers', cardBackId: 'back_yoruba' },
};

const DEFAULT_VISUAL_PROFILE = {
  key: 'Neutral',
  style: CARD_VISUAL_STYLE.STANDARD,
  auraColor: '#9ca3af',
  accentColor: '#d1d5db',
  particle: 'arcane dust',
  cardBackId: 'back_prophecy_default',
};

const RARITY_VISUAL_RULES = {
  common: { foil: CARD_FOIL_TIER.NONE, isAnimated: false, hasTiltEffect: false },
  uncommon: { foil: CARD_FOIL_TIER.DIVINE_FOIL, isAnimated: false, hasTiltEffect: false },
  rare: { foil: CARD_FOIL_TIER.PANTHEON_HOLO, isAnimated: false, hasTiltEffect: false },
  epic: { foil: CARD_FOIL_TIER.PANTHEON_HOLO, isAnimated: false, hasTiltEffect: false },
  legendary: { foil: CARD_FOIL_TIER.MYTHIC, isAnimated: true, hasTiltEffect: true },
};

export function getPantheonVisualProfile(pantheon) {
  return PANTHEON_VISUAL_PROFILES[pantheon] || DEFAULT_VISUAL_PROFILE;
}

export function getDefaultCardVisuals(card) {
  const rarity = String(card?.rarity || 'common').toLowerCase();
  const pantheonProfile = getPantheonVisualProfile(card?.pantheon);
  const rarityRule = RARITY_VISUAL_RULES[rarity] || RARITY_VISUAL_RULES.common;
  const hasFullArt = rarity === 'epic';
  return {
    style: pantheonProfile.style,
    foil: rarityRule.foil,
    foil_accent: CARD_FOIL_TIER.NONE,
    is_animated: !!rarityRule.isAnimated,
    has_tilt_effect: !!rarityRule.hasTiltEffect,
    creator_signature: null,
    card_back_id: pantheonProfile.cardBackId,
    pantheon_fx: pantheonProfile.particle,
    has_full_art: hasFullArt,
    variant_type: 'base',
    variant_name: null,
    skin_path: null,
  };
}

export function rollCardVisuals(card, rng = Math.random) {
  const rarity = String(card?.rarity || 'common').toLowerCase();
  const base = getDefaultCardVisuals(card);
  if (rarity === 'common') return base;
  if (rarity === 'uncommon') {
    if (rng() < 0.55) return { ...base, foil: CARD_FOIL_TIER.NONE, foil_accent: CARD_FOIL_TIER.NONE };
    return { ...base, foil_accent: CARD_FOIL_TIER.NONE };
  }
  if (rarity === 'rare') {
    return {
      ...base,
      foil: CARD_FOIL_TIER.PANTHEON_HOLO,
      foil_accent: rng() < 0.35 ? CARD_FOIL_TIER.DIVINE_FOIL : CARD_FOIL_TIER.NONE,
    };
  }
  if (rarity === 'epic') {
    const foil = rng() < 0.45 ? CARD_FOIL_TIER.FULL_ART : CARD_FOIL_TIER.PANTHEON_HOLO;
    return {
      ...base,
      foil,
      foil_accent: rng() < 0.4 ? CARD_FOIL_TIER.DIVINE_FOIL : CARD_FOIL_TIER.NONE,
      has_full_art: foil === CARD_FOIL_TIER.FULL_ART,
    };
  }
  if (rarity === 'legendary') {
    const foil = CARD_FOIL_TIER.MYTHIC;
    const foilAccent = rng() < 0.2 ? CARD_FOIL_TIER.PRISMATIC : CARD_FOIL_TIER.PANTHEON_HOLO;
    return { ...base, foil, foil_accent: foilAccent, has_tilt_effect: true, is_animated: true, has_full_art: false };
  }
  return base;
}

export const PROPHECY_LEADERS = [
  { id: 'Zeus', name: 'Zeus', cardType: CARD_TYPE.LEADER, pantheon: 'Olympian', cls: 'Mage', hp: 120, atk: 18, ability: '' },
  { id: 'Thor', name: 'Thor', cardType: CARD_TYPE.LEADER, pantheon: 'Asgardian', cls: 'Fighter', hp: 160, atk: 25, ability: '' },
  { id: 'Athena', name: 'Athena', cardType: CARD_TYPE.LEADER, pantheon: 'Olympian', cls: 'Tank', hp: 200, atk: 15, ability: '' },
  { id: 'Loki', name: 'Loki', cardType: CARD_TYPE.LEADER, pantheon: 'Asgardian', cls: 'Assassin', hp: 130, atk: 30, ability: '' },
  { id: 'Poseidon', name: 'Poseidon', cardType: CARD_TYPE.LEADER, pantheon: 'Olympian', cls: 'Mage', hp: 140, atk: 16, ability: '' },
  { id: 'Hera', name: 'Hera', cardType: CARD_TYPE.LEADER, pantheon: 'Olympian', cls: 'Mage', hp: 135, atk: 20, ability: '' },
  { id: 'Odin', name: 'Odin', cardType: CARD_TYPE.LEADER, pantheon: 'Asgardian', cls: 'Fighter', hp: 170, atk: 22, ability: '' },
  { id: 'Susano', name: 'Susano', cardType: CARD_TYPE.LEADER, pantheon: 'Eastern', cls: 'Assassin', hp: 140, atk: 28, ability: '' },
  { id: 'Thanatos', name: 'Thanatos', cardType: CARD_TYPE.LEADER, pantheon: 'Underworld', cls: 'Assassin', hp: 135, atk: 32, ability: '' },
  { id: 'Bellona', name: 'Bellona', cardType: CARD_TYPE.LEADER, pantheon: 'Roman', cls: 'Fighter', hp: 165, atk: 24, ability: '' },
];

/**
 * God cards (playable units).
 * Fields stay compatible with current minigame runtime (`cost`, `bHp`, `bAtk`, `cls`),
 * while also adding GDD-ready metadata.
 */
const BASE_PROPHECY_GOD_CARDS = [
  { id: 'Anhur', name: 'Anhur', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Egyptian', cls: 'Fighter', cost: 1, bHp: 80, bAtk: 12 },
  { id: 'Bakasura', name: 'Bakasura', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Hindu', cls: 'Assassin', cost: 1, bHp: 74, bAtk: 14 },
  { id: 'Chaac', name: 'Chaac', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Mayan', cls: 'Fighter', cost: 1, bHp: 110, bAtk: 9 },
  { id: 'Hades', name: 'Hades', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Underworld', cls: 'Mage', cost: 1, bHp: 75, bAtk: 11 },
  { id: 'He Bo', name: 'He Bo', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Eastern', cls: 'Mage', cost: 1, bHp: 72, bAtk: 12 },
  { id: 'Ymir', name: 'Ymir', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Asgardian', cls: 'Tank', cost: 1, bHp: 130, bAtk: 7 },
  { id: 'Anubis', name: 'Anubis', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Egyptian', cls: 'Mage', cost: 1, bHp: 74, bAtk: 12 },
  { id: 'Ares', name: 'Ares', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Greek', cls: 'Tank', cost: 1, bHp: 124, bAtk: 8 },
  { id: 'Neith', name: 'Neith', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Egyptian', cls: 'Hunter', cost: 1, bHp: 82, bAtk: 11 },
  { id: 'Ra', name: 'Ra', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Egyptian', cls: 'Mage', cost: 1, bHp: 78, bAtk: 10 },
  { id: 'Artio', name: 'Artio', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Celtic', cls: 'Tank', cost: 1, bHp: 95, bAtk: 8 },
  { id: 'Awilix', name: 'Awilix', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Mayan', cls: 'Assassin', cost: 1, bHp: 76, bAtk: 14 },
  { id: 'Khepri', name: 'Khepri', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Egyptian', cls: 'Tank', cost: 1, bHp: 100, bAtk: 7 },
  { id: 'Nut', name: 'Nut', cardType: CARD_TYPE.GOD, rarity: 'common', pantheon: 'Egyptian', cls: 'Mage', cost: 1, bHp: 72, bAtk: 11 },

  { id: 'Apollo', name: 'Apollo', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Olympian', cls: 'Hunter', cost: 2, bHp: 85, bAtk: 15 },
  { id: 'Hachiman', name: 'Hachiman', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Japanese', cls: 'Hunter', cost: 2, bHp: 90, bAtk: 16 },
  { id: 'Jing Wei', name: 'Jing Wei', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Eastern', cls: 'Hunter', cost: 2, bHp: 84, bAtk: 16 },
  { id: 'Kali', name: 'Kali', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Hindu', cls: 'Assassin', cost: 2, bHp: 78, bAtk: 18 },
  { id: 'Sobek', name: 'Sobek', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Egyptian', cls: 'Tank', cost: 2, bHp: 140, bAtk: 10 },
  { id: 'Sun Wukong', name: 'Sun Wukong', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Eastern', cls: 'Fighter', cost: 2, bHp: 100, bAtk: 14 },
  { id: 'Athena', name: 'Athena', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Greek', cls: 'Tank', cost: 2, bHp: 136, bAtk: 11 },
  { id: 'Bacchus', name: 'Bacchus', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Roman', cls: 'Tank', cost: 2, bHp: 142, bAtk: 10 },
  { id: 'Bellona', name: 'Bellona', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Roman', cls: 'Fighter', cost: 2, bHp: 106, bAtk: 15 },
  { id: 'Fenrir', name: 'Fenrir', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Norse', cls: 'Assassin', cost: 2, bHp: 82, bAtk: 17 },
  { id: 'Freya', name: 'Freya', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Norse', cls: 'Mage', cost: 2, bHp: 88, bAtk: 15 },
  { id: 'Janus', name: 'Janus', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Roman', cls: 'Mage', cost: 2, bHp: 86, bAtk: 15 },
  { id: 'Medusa', name: 'Medusa', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Greek', cls: 'Hunter', cost: 2, bHp: 89, bAtk: 16 },
  { id: 'Odin', name: 'Odin', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Norse', cls: 'Fighter', cost: 2, bHp: 108, bAtk: 15 },
  { id: 'Aphrodite', name: 'Aphrodite', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Olympian', cls: 'Mage', cost: 2, bHp: 82, bAtk: 14 },
  { id: 'Eset', name: 'Eset', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Egyptian', cls: 'Mage', cost: 2, bHp: 80, bAtk: 14 },
  { id: 'Geb', name: 'Geb', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Egyptian', cls: 'Tank', cost: 2, bHp: 132, bAtk: 9 },
  { id: 'Hun Batz', name: 'Hun Batz', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Mayan', cls: 'Assassin', cost: 2, bHp: 80, bAtk: 17 },
  { id: 'Mercury', name: 'Mercury', cardType: CARD_TYPE.GOD, rarity: 'uncommon', pantheon: 'Roman', cls: 'Assassin', cost: 2, bHp: 78, bAtk: 18 },

  { id: 'Ah Puch', name: 'Ah Puch', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Mayan', cls: 'Mage', cost: 3, bHp: 94, bAtk: 21 },
  { id: 'Da Ji', name: 'Da Ji', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Eastern', cls: 'Assassin', cost: 3, bHp: 90, bAtk: 24 },
  { id: 'Izanami', name: 'Izanami', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Japanese', cls: 'Hunter', cost: 3, bHp: 98, bAtk: 21 },
  { id: 'Sol', name: 'Sol', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Asgardian', cls: 'Mage', cost: 3, bHp: 96, bAtk: 22 },
  { id: 'Ullr', name: 'Ullr', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Asgardian', cls: 'Hunter', cost: 3, bHp: 104, bAtk: 20 },
  { id: 'Baron Samedi', name: 'Baron Samedi', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Voodoo', cls: 'Mage', cost: 3, bHp: 102, bAtk: 21 },
  { id: 'Cernunnos', name: 'Cernunnos', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Celtic', cls: 'Hunter', cost: 3, bHp: 100, bAtk: 22 },
  { id: 'Hercules', name: 'Hercules', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Greek', cls: 'Fighter', cost: 3, bHp: 122, bAtk: 19 },
  { id: 'Hou Yi', name: 'Hou Yi', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Eastern', cls: 'Hunter', cost: 3, bHp: 99, bAtk: 22 },
  { id: 'Loki', name: 'Loki', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Norse', cls: 'Assassin', cost: 3, bHp: 86, bAtk: 25 },
  { id: 'Poseidon', name: 'Poseidon', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Greek', cls: 'Mage', cost: 3, bHp: 96, bAtk: 23 },
  { id: 'Rama', name: 'Rama', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Hindu', cls: 'Hunter', cost: 3, bHp: 102, bAtk: 21 },
  { id: 'Thor', name: 'Thor', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Norse', cls: 'Fighter', cost: 3, bHp: 115, bAtk: 20 },
  { id: 'Aladdin', name: 'Aladdin', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Tales of Arabia', cls: 'Assassin', cost: 3, bHp: 88, bAtk: 23 },
  { id: 'Danzaburou', name: 'Danzaburou', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Japanese', cls: 'Hunter', cost: 3, bHp: 92, bAtk: 20 },
  { id: 'Ganesha', name: 'Ganesha', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Hindu', cls: 'Tank', cost: 3, bHp: 128, bAtk: 12 },
  { id: 'Nemesis', name: 'Nemesis', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Olympian', cls: 'Assassin', cost: 3, bHp: 90, bAtk: 24 },
  { id: 'Osiris', name: 'Osiris', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Egyptian', cls: 'Fighter', cost: 3, bHp: 118, bAtk: 18 },
  { id: 'Sylvanus', name: 'Sylvanus', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Roman', cls: 'Tank', cost: 3, bHp: 138, bAtk: 11 },
  { id: 'The Morrigan', name: 'The Morrigan', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Celtic', cls: 'Mage', cost: 3, bHp: 94, bAtk: 22 },
  { id: 'Xbalanque', name: 'Xbalanque', cardType: CARD_TYPE.GOD, rarity: 'rare', pantheon: 'Mayan', cls: 'Hunter', cost: 3, bHp: 98, bAtk: 21 },

  { id: 'Achilles', name: 'Achilles', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Olympian', cls: 'Fighter', cost: 4, bHp: 140, bAtk: 28 },
  { id: 'Amaterasu', name: 'Amaterasu', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Japanese', cls: 'Fighter', cost: 4, bHp: 145, bAtk: 26 },
  { id: 'Artemis', name: 'Artemis', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Olympian', cls: 'Hunter', cost: 4, bHp: 125, bAtk: 30 },
  { id: 'Discordia', name: 'Discordia', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Roman', cls: 'Mage', cost: 4, bHp: 112, bAtk: 33 },
  { id: 'Merlin', name: 'Merlin', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Arthurian', cls: 'Mage', cost: 4, bHp: 118, bAtk: 34 },
  { id: 'Cabrakan', name: 'Cabrakan', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Mayan', cls: 'Tank', cost: 4, bHp: 176, bAtk: 22 },
  { id: 'Scylla', name: 'Scylla', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Greek', cls: 'Mage', cost: 4, bHp: 112, bAtk: 34 },
  { id: 'Thanatos', name: 'Thanatos', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Underworld', cls: 'Assassin', cost: 4, bHp: 110, bAtk: 35 },
  { id: 'Zeus', name: 'Zeus', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Greek', cls: 'Mage', cost: 4, bHp: 118, bAtk: 33 },
  { id: 'Hecate', name: 'Hecate', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Olympian', cls: 'Mage', cost: 4, bHp: 108, bAtk: 32 },
  { id: 'Mordred', name: 'Mordred', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Arthurian', cls: 'Fighter', cost: 4, bHp: 132, bAtk: 28 },
  { id: 'Nu Wa', name: 'Nu Wa', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Eastern', cls: 'Mage', cost: 4, bHp: 110, bAtk: 31 },
  { id: 'Pele', name: 'Pele', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Polynesian', cls: 'Assassin', cost: 4, bHp: 115, bAtk: 30 },
  { id: 'Princess Bari', name: 'Princess Bari', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Korean', cls: 'Hunter', cost: 4, bHp: 120, bAtk: 28 },
  { id: 'Tsukuyomi', name: 'Tsukuyomi', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Japanese', cls: 'Assassin', cost: 4, bHp: 105, bAtk: 32 },
  { id: 'Vulcan', name: 'Vulcan', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Roman', cls: 'Mage', cost: 4, bHp: 114, bAtk: 31 },
  { id: 'Yemoja', name: 'Yemoja', cardType: CARD_TYPE.GOD, rarity: 'epic', pantheon: 'Yoruba', cls: 'Tank', cost: 4, bHp: 142, bAtk: 18 },

  { id: 'Agni', name: 'Agni', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Hindu', cls: 'Mage', cost: 5, bHp: 160, bAtk: 40 },
  { id: 'Cerberus', name: 'Cerberus', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Underworld', cls: 'Tank', cost: 5, bHp: 220, bAtk: 28 },
  { id: 'Guan Yu', name: 'Guan Yu', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Eastern', cls: 'Fighter', cost: 5, bHp: 200, bAtk: 36 },
  { id: 'King Arthur', name: 'King Arthur', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Arthurian', cls: 'Fighter', cost: 5, bHp: 192, bAtk: 38 },
  { id: 'Kukulkan', name: 'Kukulkan', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Mayan', cls: 'Mage', cost: 5, bHp: 155, bAtk: 44 },
  { id: 'Jormungandr', name: 'Jormungandr', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Norse', cls: 'Tank', cost: 5, bHp: 230, bAtk: 29 },
  { id: 'Mulan', name: 'Mulan', cardType: CARD_TYPE.GOD, rarity: 'legendary', pantheon: 'Chinese', cls: 'Fighter', cost: 5, bHp: 198, bAtk: 37 },
];

export const PROPHECY_GOD_CARDS = enrichGodCardsWithAbilityPools(BASE_PROPHECY_GOD_CARDS);

export const PROPHECY_ITEM_CARDS = [
  // Tier 1 (existing)
  { id: 'item_battle_axe', name: 'Battle Axe', iconPath: 'BattleAxe.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_conduit_gem', name: 'Conduit Gem', iconPath: 'ConduitGem.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_deaths_toll', name: "Death's Toll", iconPath: 'DeathsToll.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },
  // Tier 1 (from list)
  { id: 'item_aegis_acceleration', name: 'Aegis Of Acceleration', iconPath: 'AegisOfAcceleration.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_agility_relic', name: 'Agility Relic', iconPath: 'AgilityRelic.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_aladdins_lamp', name: "Aladdin's Lamp", iconPath: 'AladdinsLamp.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },
  { id: 'item_axe', name: 'Axe', iconPath: 'Axe.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_blink_rune', name: 'Blink Rune', iconPath: 'BlinkRune.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_bluestone_pendant', name: 'Bluestone Pendant', iconPath: 'BluestonePendant.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_bow', name: 'Bow', iconPath: 'Bow.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_bumbas_cudgel', name: "Bumba's Cudgel", iconPath: 'BumbasCudgel.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },
  { id: 'item_bumbas_golden_dagger', name: "Bumba's Golden Dagger", iconPath: 'BumbasGoldenDagger.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },
  { id: 'item_circlet', name: 'Circlet', iconPath: 'Circlet.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_gem', name: 'Gem', iconPath: 'Gem.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_gilded_arrow', name: 'Gilded Arrow', iconPath: 'GildedArrow.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_health_chalice', name: 'Health Chalice', iconPath: 'HealthChalice.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 0, hpBoost: 40, goldCost: 150 },
  { id: 'item_leather_cowl', name: 'Leather Cowl', iconPath: 'LeatherCowl.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_medallion', name: 'Medallion', iconPath: 'Medallion.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_phantom_shell', name: 'Phantom Shell', iconPath: 'PhantomShell.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 0, hpBoost: 30, goldCost: 150 },
  { id: 'item_purification_beads', name: 'Purification Beads', iconPath: 'PurificationBeads.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_reliquary', name: 'Reliquary', iconPath: 'Reliquary.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_ring', name: 'Ring', iconPath: 'Ring.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_rune', name: 'Rune', iconPath: 'Rune.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_runic_bomb', name: 'Runic Bomb', iconPath: 'RunicBomb.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_sabre', name: 'Sabre', iconPath: 'Sabre.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_sands_of_time', name: 'Sands Of Time', iconPath: 'SandsOfTime.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_sash', name: 'Sash', iconPath: 'Sash.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },
  { id: 'item_scythe', name: 'Scythe', iconPath: 'Scythe.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_selflessness', name: 'Selflessness', iconPath: 'Selflessness.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 0, hpBoost: 40, goldCost: 150 },
  { id: 'item_shield', name: 'Shield', iconPath: 'Shield.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 0, hpBoost: 30, goldCost: 150 },
  { id: 'item_sundering_arc', name: 'Sundering Arc', iconPath: 'SunderingArc.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_vampiric_shroud', name: 'Vampiric Shroud', iconPath: 'VampiricShroud.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 0, goldCost: 150 },
  { id: 'item_war_flag', name: 'War Flag', iconPath: 'WarFlag.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },
  { id: 'item_warriors_axe', name: "Warrior's Axe", iconPath: 'WarriorsAxe.webp', cardType: CARD_TYPE.ITEM, rarity: 'common', tier: 'TIER_1', cost: 1, atkBoost: 2, hpBoost: 20, goldCost: 150 },

  // Tier 2 (existing)
  { id: 'item_bancrofts_talon', name: "Bancroft's Talon", iconPath: 'BancroftsTalon.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 120, goldCost: 600 },
  { id: 'item_war_banner', name: 'War Banner', iconPath: 'WarBanner.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 50, goldCost: 600 },
  { id: 'item_divine_ruin', name: 'Divine Ruin', iconPath: 'DivineRuin.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 60, goldCost: 600 },
  { id: 'item_aegis', name: 'Aegis Charm', iconPath: 'AegisOfAcceleration.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 120, goldCost: 600 },
  { id: 'item_genjis_guard', name: "Genji's Guard", iconPath: 'GenjisGuard.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 120, goldCost: 600 },
  // Tier 2 (from list)
  { id: 'item_adamantine_sickle', name: 'Adamantine Sickle', iconPath: 'AdamantineSickle.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 60, goldCost: 600 },
  { id: 'item_adroit_ring', name: 'Adroit Ring', iconPath: 'AdroitRing.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 40, goldCost: 600 },
  { id: 'item_archmages_gem', name: "Archmage's Gem", iconPath: 'ArchmagesGem.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 80, goldCost: 600 },
  { id: 'item_blood_soaked_shroud', name: 'Blood-Soaked Shroud', iconPath: 'BloodSoakedShroud.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 100, goldCost: 600 },
  { id: 'item_bluestone_brooch', name: 'Bluestone Brooch', iconPath: 'BluestoneBrooch.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 60, goldCost: 600 },
  { id: 'item_bumbas_hammer', name: "Bumba's Hammer", iconPath: 'BumbasHammer.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 80, goldCost: 600 },
  { id: 'item_bumbas_spear', name: "Bumba's Spear", iconPath: 'BumbasSpear.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 60, goldCost: 600 },
  { id: 'item_caestus', name: 'Caestus', iconPath: 'Caestus.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 60, goldCost: 600 },
  { id: 'item_captains_ring', name: "Captain's Ring", iconPath: 'CaptainsRing.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_circle_of_protection', name: 'Circle of Protection', iconPath: 'CircleOfProtection.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 0, hpBoost: 140, goldCost: 600 },
  { id: 'item_cursed_sickle', name: 'Cursed Sickle', iconPath: 'CursedSickle.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_deaths_embrace', name: "Death's Embrace", iconPath: 'DeathsEmbrace.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 80, goldCost: 600 },
  { id: 'item_enchanted_bracelet', name: 'Enchanted Bracelet', iconPath: 'EnchantedBracelet.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_engraved_guard', name: 'Engraved Guard', iconPath: 'EngravedGuard.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 0, hpBoost: 120, goldCost: 600 },
  { id: 'item_evil_eye', name: 'Evil Eye', iconPath: 'EvilEye.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 60, goldCost: 600 },
  { id: 'item_flaming_pearl', name: 'Flaming Pearl', iconPath: 'FlamingPearl.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_heroism', name: 'Heroism', iconPath: 'Heroism.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 0, hpBoost: 150, goldCost: 600 },
  { id: 'item_hooked_sword', name: 'Hooked Sword', iconPath: 'HookedSword.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_hunters_bow', name: "Hunter's Bow", iconPath: 'HuntersBow.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 0, goldCost: 600 },
  { id: 'item_hunters_cowl', name: "Hunter's Cowl", iconPath: 'HuntersCowl.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 60, goldCost: 600 },
  { id: 'item_infused_axe', name: 'Infused Axe', iconPath: 'InfusedAxe.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_killing_stone', name: 'Killing Stone', iconPath: 'KillingStone.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_kopesh', name: 'Kopesh', iconPath: 'Kopesh.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_legionnaire_armor', name: 'Legionnaire Armor', iconPath: 'LegionnaireArmor.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 0, hpBoost: 130, goldCost: 600 },
  { id: 'item_lucerne_hammer', name: 'Lucerne Hammer', iconPath: 'LucerneHammer.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 50, goldCost: 600 },
  { id: 'item_mana_tome', name: 'Mana Tome', iconPath: 'ManaTome.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_manchu_bow', name: 'Manchu Bow', iconPath: 'ManchuBow.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_medal_of_defense', name: 'Medal of Defense', iconPath: 'MedalOfDefense.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 0, hpBoost: 120, goldCost: 600 },
  { id: 'item_medal_of_disruption', name: 'Medal of Disruption', iconPath: 'MedalOfDisruption.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_mote_of_chaos', name: 'Mote of Chaos', iconPath: 'MoteOfChaos.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 60, goldCost: 600 },
  { id: 'item_odigba', name: 'Odigba', iconPath: 'Odigba.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 100, goldCost: 600 },
  { id: 'item_olmec_blue', name: 'Olmec Blue', iconPath: 'OlmecBlue.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_oracle_staff', name: 'Oracle Staff', iconPath: 'OracleStaff.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 60, goldCost: 600 },
  { id: 'item_pendulum_of_ages', name: 'Pendulum Of The Ages', iconPath: 'PendulumOfTheAges.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 60, goldCost: 600 },
  { id: 'item_ring_of_dispel', name: 'Ring of Dispel', iconPath: 'RingOfDispel.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },
  { id: 'item_sages_ring', name: "Sage's Ring", iconPath: 'SagesRing.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_sharpshooters_arrow', name: "Sharpshooter's Arrow", iconPath: 'SharpshootersArrow.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_skeggox', name: 'Skeggox', iconPath: 'Skeggox.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 50, goldCost: 600 },
  { id: 'item_soul_reliquary', name: 'Soul Reliquary', iconPath: 'SoulReliquary.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 100, goldCost: 600 },
  { id: 'item_stalwart_sigil', name: 'Stalwart Sigil', iconPath: 'StalwartSigil.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 0, hpBoost: 140, goldCost: 600 },
  { id: 'item_sundering_axe', name: 'Sundering Axe', iconPath: 'SunderingAxe.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 60, goldCost: 600 },
  { id: 'item_survivors_sash', name: "Survivor's Sash", iconPath: 'SurvivorsSash.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 2, hpBoost: 120, goldCost: 600 },
  { id: 'item_veve_charm', name: 'Veve Charm', iconPath: 'VeveCharm.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 100, goldCost: 600 },
  { id: 'item_void_shard', name: 'Void Shard', iconPath: 'VoidShard.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 4, hpBoost: 40, goldCost: 600 },
  { id: 'item_zither', name: 'Zither', iconPath: 'Zither.webp', cardType: CARD_TYPE.ITEM, rarity: 'uncommon', tier: 'TIER_2', cost: 2, atkBoost: 3, hpBoost: 80, goldCost: 600 },

  // Tier 3 (existing)
  { id: 'item_bloodforge', name: 'Bloodforge', iconPath: 'BloodForge.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 0, goldCost: 2000 },
  { id: 'item_heartseeker', name: 'Heartseeker', iconPath: 'Heartseeker.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 40, goldCost: 2000 },
  { id: 'item_deathbringer', name: 'Deathbringer', iconPath: 'Deathbringer.webp', cardType: CARD_TYPE.ITEM, rarity: 'legendary', tier: 'TIER_3', cost: 3, atkBoost: 8, hpBoost: 0, goldCost: 2000 },
  { id: 'item_tahuti', name: 'Rod of Tahuti', iconPath: 'RodOfTahuti.webp', cardType: CARD_TYPE.ITEM, rarity: 'legendary', tier: 'TIER_3', cost: 3, atkBoost: 8, hpBoost: 40, goldCost: 2000 },
  { id: 'item_mantle', name: 'Mantle of Discord', iconPath: 'MantleOfDiscord.webp', cardType: CARD_TYPE.ITEM, rarity: 'legendary', tier: 'TIER_3', cost: 3, atkBoost: 5, hpBoost: 220, goldCost: 2000 },
  // Tier 3 (from list - selection; full set would be 126 more)
  { id: 'item_agility_greaves', name: 'Agility Greaves', iconPath: 'AgilityGreaves.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 5, hpBoost: 80, goldCost: 2000 },
  { id: 'item_amanita_charm', name: 'Amanita Charm', iconPath: 'AmanitaCharm.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 5, hpBoost: 100, goldCost: 2000 },
  { id: 'item_ancient_signet', name: 'Ancient Signet', iconPath: 'AncientSignet.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 60, goldCost: 2000 },
  { id: 'item_ancile', name: 'Ancile', iconPath: 'Ancile.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 140, goldCost: 2000 },
  { id: 'item_arondight', name: 'Arondight', iconPath: 'Arondight.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 40, goldCost: 2000 },
  { id: 'item_avatars_parashu', name: "Avatar's Parashu", iconPath: 'AvatarsParashu.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 80, goldCost: 2000 },
  { id: 'item_avenging_blade', name: 'Avenging Blade', iconPath: 'AvengingBlade.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 60, goldCost: 2000 },
  { id: 'item_barbed_carver', name: 'Barbed Carver', iconPath: 'BarbedCarver.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 60, goldCost: 2000 },
  { id: 'item_berserkers_shield', name: "Berserker's Shield", iconPath: 'BerserkersShield.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 160, goldCost: 2000 },
  { id: 'item_blinking_abyss', name: 'Blinking Abyss', iconPath: 'BlinkingAbyss.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 0, goldCost: 2000 },
  { id: 'item_blood_bound_book', name: 'Blood-Bound Book', iconPath: 'BloodBoundBook.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 80, goldCost: 2000 },
  { id: 'item_book_of_thoth', name: 'Book of Thoth', iconPath: 'BookOfThoth.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 80, goldCost: 2000 },
  { id: 'item_bracer_of_abyss', name: 'Bracer of The Abyss', iconPath: 'BracerOfTheAbyss.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 60, goldCost: 2000 },
  { id: 'item_bragis_harp', name: "Bragi's Harp", iconPath: 'BragisHarp.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 80, goldCost: 2000 },
  { id: 'item_brawlers_beat_stick', name: "Brawler's Beat Stick", iconPath: 'BrawlersBeatStick.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 60, goldCost: 2000 },
  { id: 'item_breastplate_of_valor', name: 'Breastplate of Valor', iconPath: 'BreastplateOfValor.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 180, goldCost: 2000 },
  { id: 'item_chronos_pendant', name: "Chronos' Pendant", iconPath: 'ChronosPendant.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 80, goldCost: 2000 },
  { id: 'item_circes_hexstone', name: "Circe's Hexstone", iconPath: 'CircesHexstone.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 5, hpBoost: 120, goldCost: 2000 },
  { id: 'item_contagion', name: 'Contagion', iconPath: 'Contagion.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 160, goldCost: 2000 },
  { id: 'item_dagger_of_frenzy', name: 'Dagger of Frenzy', iconPath: 'DaggerOfFrenzy.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 40, goldCost: 2000 },
  { id: 'item_doom_orb', name: 'Doom Orb', iconPath: 'DoomOrb.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 60, goldCost: 2000 },
  { id: 'item_eros_bow', name: "Eros' Bow", iconPath: 'ErosBow.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 60, goldCost: 2000 },
  { id: 'item_evolved_book_of_thoth', name: 'Evolved Book of Thoth', iconPath: 'EvolvedBookOfThoth.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 8, hpBoost: 100, goldCost: 2000 },
  { id: 'item_evolved_gauntlet_of_thebes', name: 'Evolved Gauntlet of Thebes', iconPath: 'EvolvedGauntletOfThebes.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 2, hpBoost: 220, goldCost: 2000 },
  { id: 'item_evolved_prophetic_cloak', name: 'Evolved Prophetic Cloak', iconPath: 'EvolvedPropheticCloak.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 180, goldCost: 2000 },
  { id: 'item_evolved_rage', name: 'Evolved Rage', iconPath: 'EvolvedRage.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 8, hpBoost: 40, goldCost: 2000 },
  { id: 'item_freyas_tears', name: "Freya's Tears", iconPath: 'FreyasTears.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 160, goldCost: 2000 },
  { id: 'item_gem_of_focus', name: 'Gem of Focus', iconPath: 'GemOfFocus.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 80, goldCost: 2000 },
  { id: 'item_gladiators_shield', name: "Gladiator's Shield", iconPath: 'GladiatorsShield.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 160, goldCost: 2000 },
  { id: 'item_glorious_pridwen', name: "Glorious Pridwen", iconPath: 'GloriousPridwen.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 200, goldCost: 2000 },
  { id: 'item_hydras_lament', name: "Hydra's Lament", iconPath: 'HydrasLament.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 60, goldCost: 2000 },
  { id: 'item_hide_of_nemean_lion', name: 'Hide of the Nemean Lion', iconPath: 'HideOfTheNemeanLion.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 2, hpBoost: 200, goldCost: 2000 },
  { id: 'item_jotunns_revenge', name: "Jotunn's Revenge", iconPath: 'JotunnsRevenge.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 80, goldCost: 2000 },
  { id: 'item_lernaean_bow', name: 'Lernaean Bow', iconPath: 'LernaeanBow.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 40, goldCost: 2000 },
  { id: 'item_lifebinder', name: 'Lifebinder', iconPath: 'Lifebinder.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 180, goldCost: 2000 },
  { id: 'item_magis_cloak', name: "Magi's Cloak", iconPath: 'MagisCloak.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 160, goldCost: 2000 },
  { id: 'item_obsidian_shard', name: 'Obsidian Shard', iconPath: 'ObsidianShard.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 60, goldCost: 2000 },
  { id: 'item_polynomicon', name: 'Polynomicon', iconPath: 'Polynomicon.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 80, goldCost: 2000 },
  { id: 'item_sanguine_lash', name: 'Sanguine Lash', iconPath: 'SanguineLash.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 80, goldCost: 2000 },
  { id: 'item_shell_of_rebuke', name: 'Shell of Rebuke', iconPath: 'ShellOfRebuke.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 2, hpBoost: 200, goldCost: 2000 },
  { id: 'item_soul_gem', name: 'Soul Gem', iconPath: 'SoulGem.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 80, goldCost: 2000 },
  { id: 'item_soul_reaver', name: 'Soul Reaver', iconPath: 'SoulReaver.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 100, goldCost: 2000 },
  { id: 'item_spear_of_desolation', name: 'Spear of Desolation', iconPath: 'SpearOfDesolation.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 8, hpBoost: 60, goldCost: 2000 },
  { id: 'item_spectral_armor', name: 'Spectral Armor', iconPath: 'SpectralArmor.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 180, goldCost: 2000 },
  { id: 'item_spirit_robe', name: 'Spirit Robe', iconPath: 'SpiritRobe.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 180, goldCost: 2000 },
  { id: 'item_stampede', name: 'Stampede', iconPath: 'Stampede.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 4, hpBoost: 140, goldCost: 2000 },
  { id: 'item_the_crusher', name: 'The Crusher', iconPath: 'TheCrusher.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 60, goldCost: 2000 },
  { id: 'item_the_reaper', name: 'The Reaper', iconPath: 'TheReaper.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 80, goldCost: 2000 },
  { id: 'item_titans_bane', name: "Titan's Bane", iconPath: 'TitansBane.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 40, goldCost: 2000 },
  { id: 'item_riptalon', name: 'Riptalon', iconPath: 'Riptalon.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 0, goldCost: 2000 },
  { id: 'item_regrowth_striders', name: 'Regrowth Striders', iconPath: 'RegrowthStriders.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 3, hpBoost: 160, goldCost: 2000 },
  { id: 'item_oath_sworn_spear', name: 'Oath-Sworn Spear', iconPath: 'OathSwornSpear.webp', cardType: CARD_TYPE.ITEM, rarity: 'epic', tier: 'TIER_3', cost: 3, atkBoost: 7, hpBoost: 60, goldCost: 2000 },
  { id: 'item_nimble_ring', name: 'Nimble Ring', iconPath: 'NimbleRing.webp', cardType: CARD_TYPE.ITEM, rarity: 'rare', tier: 'TIER_3', cost: 3, atkBoost: 6, hpBoost: 80, goldCost: 2000 },
];

export const PROPHECY_TRAP_CARDS = [
  { id: 'trap_ice_wall', cardType: CARD_TYPE.TRAP, trapId: 'T1', name: TRAP_CARDS.T1.name, description: TRAP_CARDS.T1.description, trigger: TRAP_CARDS.T1.trigger, iconSource: TRAP_CARDS.T1.iconSource, rarity: TRAP_CARDS.T1.rarity, cost: TRAP_CARDS.T1.cost },
  { id: 'trap_shifting_sands', cardType: CARD_TYPE.TRAP, trapId: 'T2', name: TRAP_CARDS.T2.name, description: TRAP_CARDS.T2.description, trigger: TRAP_CARDS.T2.trigger, iconSource: TRAP_CARDS.T2.iconSource, rarity: TRAP_CARDS.T2.rarity, cost: TRAP_CARDS.T2.cost },
  { id: 'trap_portal', cardType: CARD_TYPE.TRAP, trapId: 'T3', name: TRAP_CARDS.T3.name, description: TRAP_CARDS.T3.description, trigger: TRAP_CARDS.T3.trigger, iconSource: TRAP_CARDS.T3.iconSource, rarity: TRAP_CARDS.T3.rarity, cost: TRAP_CARDS.T3.cost },
  { id: 'trap_shield_counter', cardType: CARD_TYPE.TRAP, trapId: 'T4', name: TRAP_CARDS.T4.name, description: TRAP_CARDS.T4.description, trigger: TRAP_CARDS.T4.trigger, iconSource: TRAP_CARDS.T4.iconSource, rarity: TRAP_CARDS.T4.rarity, cost: TRAP_CARDS.T4.cost },
  { id: 'trap_venom', cardType: CARD_TYPE.TRAP, trapId: 'T5', name: TRAP_CARDS.T5.name, description: TRAP_CARDS.T5.description, trigger: TRAP_CARDS.T5.trigger, iconSource: TRAP_CARDS.T5.iconSource, rarity: TRAP_CARDS.T5.rarity, cost: TRAP_CARDS.T5.cost },
  { id: 'trap_soul_cage', cardType: CARD_TYPE.TRAP, trapId: 'T6', name: TRAP_CARDS.T6.name, description: TRAP_CARDS.T6.description, trigger: TRAP_CARDS.T6.trigger, iconSource: TRAP_CARDS.T6.iconSource, rarity: TRAP_CARDS.T6.rarity, cost: TRAP_CARDS.T6.cost },
  { id: 'trap_vine_snare', cardType: CARD_TYPE.TRAP, trapId: 'T7', name: TRAP_CARDS.T7.name, description: TRAP_CARDS.T7.description, trigger: TRAP_CARDS.T7.trigger, iconSource: TRAP_CARDS.T7.iconSource, rarity: TRAP_CARDS.T7.rarity, cost: TRAP_CARDS.T7.cost },
  { id: 'trap_impale', cardType: CARD_TYPE.TRAP, trapId: 'T8', name: TRAP_CARDS.T8.name, description: TRAP_CARDS.T8.description, trigger: TRAP_CARDS.T8.trigger, iconSource: TRAP_CARDS.T8.iconSource, rarity: TRAP_CARDS.T8.rarity, cost: TRAP_CARDS.T8.cost },
  { id: 'trap_counterstrike', cardType: CARD_TYPE.TRAP, trapId: 'T9', name: TRAP_CARDS.T9.name, description: TRAP_CARDS.T9.description, trigger: TRAP_CARDS.T9.trigger, iconSource: TRAP_CARDS.T9.iconSource, rarity: TRAP_CARDS.T9.rarity, cost: TRAP_CARDS.T9.cost },
  { id: 'trap_divine_snare', cardType: CARD_TYPE.TRAP, trapId: 'T10', name: TRAP_CARDS.T10.name, description: TRAP_CARDS.T10.description, trigger: TRAP_CARDS.T10.trigger, iconSource: TRAP_CARDS.T10.iconSource, rarity: TRAP_CARDS.T10.rarity, cost: TRAP_CARDS.T10.cost },
];

export const PROPHECY_SPELL_CARDS = [
  { id: 'spell_detonate', cardType: CARD_TYPE.SPELL, spellId: 'S1', name: SPELL_CARDS.S1.name, description: SPELL_CARDS.S1.description, iconSource: SPELL_CARDS.S1.iconSource, rarity: SPELL_CARDS.S1.rarity, cost: SPELL_CARDS.S1.cost },
  { id: 'spell_vortex_blast', cardType: CARD_TYPE.SPELL, spellId: 'S2', name: SPELL_CARDS.S2.name, description: SPELL_CARDS.S2.description, iconSource: SPELL_CARDS.S2.iconSource, rarity: SPELL_CARDS.S2.rarity, cost: SPELL_CARDS.S2.cost },
  { id: 'spell_mirror_strike', cardType: CARD_TYPE.SPELL, spellId: 'S3', name: SPELL_CARDS.S3.name, description: SPELL_CARDS.S3.description, iconSource: SPELL_CARDS.S3.iconSource, rarity: SPELL_CARDS.S3.rarity, cost: SPELL_CARDS.S3.cost },
  { id: 'spell_monkey_bounce', cardType: CARD_TYPE.SPELL, spellId: 'S4', name: SPELL_CARDS.S4.name, description: SPELL_CARDS.S4.description, iconSource: SPELL_CARDS.S4.iconSource, rarity: SPELL_CARDS.S4.rarity, cost: SPELL_CARDS.S4.cost },
  { id: 'spell_thunder_drop', cardType: CARD_TYPE.SPELL, spellId: 'S5', name: SPELL_CARDS.S5.name, description: SPELL_CARDS.S5.description, iconSource: SPELL_CARDS.S5.iconSource, rarity: SPELL_CARDS.S5.rarity, cost: SPELL_CARDS.S5.cost },
  { id: 'spell_searing_light', cardType: CARD_TYPE.SPELL, spellId: 'S6', name: SPELL_CARDS.S6.name, description: SPELL_CARDS.S6.description, iconSource: SPELL_CARDS.S6.iconSource, rarity: SPELL_CARDS.S6.rarity, cost: SPELL_CARDS.S6.cost },
  { id: 'spell_undying_flame', cardType: CARD_TYPE.SPELL, spellId: 'S7', name: SPELL_CARDS.S7.name, description: SPELL_CARDS.S7.description, iconSource: SPELL_CARDS.S7.iconSource, rarity: SPELL_CARDS.S7.rarity, cost: SPELL_CARDS.S7.cost },
  { id: 'spell_backfire', cardType: CARD_TYPE.SPELL, spellId: 'S8', name: SPELL_CARDS.S8.name, description: SPELL_CARDS.S8.description, iconSource: SPELL_CARDS.S8.iconSource, rarity: SPELL_CARDS.S8.rarity, cost: SPELL_CARDS.S8.cost },
  { id: 'spell_tidal_wave', cardType: CARD_TYPE.SPELL, spellId: 'S9', name: SPELL_CARDS.S9.name, description: SPELL_CARDS.S9.description, iconSource: SPELL_CARDS.S9.iconSource, rarity: SPELL_CARDS.S9.rarity, cost: SPELL_CARDS.S9.cost },
  { id: 'spell_solar_flare', cardType: CARD_TYPE.SPELL, spellId: 'S10', name: SPELL_CARDS.S10.name, description: SPELL_CARDS.S10.description, iconSource: SPELL_CARDS.S10.iconSource, rarity: SPELL_CARDS.S10.rarity, cost: SPELL_CARDS.S10.cost },
  { id: 'spell_phantom_rush', cardType: CARD_TYPE.SPELL, spellId: 'S11', name: SPELL_CARDS.S11.name, description: SPELL_CARDS.S11.description, iconSource: SPELL_CARDS.S11.iconSource, rarity: SPELL_CARDS.S11.rarity, cost: SPELL_CARDS.S11.cost },
  { id: 'spell_chaos_apple', cardType: CARD_TYPE.SPELL, spellId: 'S12', name: SPELL_CARDS.S12.name, description: SPELL_CARDS.S12.description, iconSource: SPELL_CARDS.S12.iconSource, rarity: SPELL_CARDS.S12.rarity, cost: SPELL_CARDS.S12.cost },
  { id: 'spell_death_toll', cardType: CARD_TYPE.SPELL, spellId: 'S13', name: SPELL_CARDS.S13.name, description: SPELL_CARDS.S13.description, iconSource: SPELL_CARDS.S13.iconSource, rarity: SPELL_CARDS.S13.rarity, cost: SPELL_CARDS.S13.cost },
  { id: 'spell_flame_wave', cardType: CARD_TYPE.SPELL, spellId: 'S14', name: SPELL_CARDS.S14.name, description: SPELL_CARDS.S14.description, iconSource: SPELL_CARDS.S14.iconSource, rarity: SPELL_CARDS.S14.rarity, cost: SPELL_CARDS.S14.cost },
  { id: 'spell_shards_of_ice', cardType: CARD_TYPE.SPELL, spellId: 'S15', name: SPELL_CARDS.S15.name, description: SPELL_CARDS.S15.description, iconSource: SPELL_CARDS.S15.iconSource, rarity: SPELL_CARDS.S15.rarity, cost: SPELL_CARDS.S15.cost },
];

export const PROPHECY_UNITS = PROPHECY_GOD_CARDS;
export const PROPHECY_ALL_CARDS = [...PROPHECY_GOD_CARDS, ...PROPHECY_ITEM_CARDS, ...PROPHECY_TRAP_CARDS, ...PROPHECY_SPELL_CARDS];

export function getUnitsByRarity(maxRarityIndex) {
  const r = RARITY_ORDER.slice(0, (maxRarityIndex ?? 4) + 1);
  return PROPHECY_UNITS.filter((u) => r.includes(u.rarity));
}

export function getCardsByRarity(maxRarityIndex) {
  const r = RARITY_ORDER.slice(0, (maxRarityIndex ?? 4) + 1);
  return PROPHECY_ALL_CARDS.filter((u) => r.includes(u.rarity));
}

export function getLeadersForSelect() {
  return PROPHECY_LEADERS;
}
