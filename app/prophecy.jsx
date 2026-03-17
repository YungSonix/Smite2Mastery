import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  useWindowDimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { getWallpaperByGodName, getRemoteGodIconByName, getLocalItemIcon, getSkinImage, getGodAbilityIcon } from './localIcons';
import buildsData from './data/builds.json';
import { playVOX } from '../lib/prophecyAudio';
import { getClassPoolKey, getPooledAbility, getPooledUltimate } from '../src/data/abilityPools';
import {
  CARD_TYPE,
  CARD_FOIL_TIER,
  PROPHECY_LEADERS,
  PROPHECY_UNITS,
  PROPHECY_ITEM_CARDS,
  PROPHECY_TRAP_CARDS,
  PROPHECY_SPELL_CARDS,
  RARITY_ORDER,
  GOLD_PER_RARITY,
  getDefaultCardVisuals,
  getPantheonVisualProfile,
  getCardsByRarity,
  getUnitsByRarity,
  rollCardVisuals,
} from '../lib/prophecyData';
import {
  buildSmartStarterDeck,
  computeDeckAvgCost,
  deriveDeckArchetype,
  getDeckCostCurve,
  validateDeck,
} from '../lib/prophecyDeck';
import { GOD_ABILITY_REFERENCE } from '../lib/godAbilities';
let supabase;
try {
  supabase = require('../config/supabase').supabase;
} catch (e) {
  const mockError = { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' };
  const q = {
    eq: () => q,
    order: () => q,
    limit: () => q,
    select: async () => ({ data: [], error: mockError }),
    single: async () => ({ data: null, error: mockError }),
    maybeSingle: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: mockError }),
    insert: async () => ({ data: null, error: mockError }),
    update: async () => ({ data: null, error: mockError }),
  };
  supabase = {
    from: () => q,
    rpc: async () => ({ data: null, error: mockError }),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: null, error: mockError }),
      signUp: async () => ({ data: null, error: mockError }),
      signOut: async () => ({ error: null }),
    },
  };
}
let profileHelpers = null;
try {
  profileHelpers = require('./profile').profileHelpers;
} catch (_) {
  profileHelpers = { getCurrentUser: async () => null };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GOLD = '#c8922a';
const GOLD_L = '#f0c060';
const MUTED = '#7a6a50';
const BG = '#0a0a12';
const BGC = '#1a1828';
const BGC2 = '#221f35';
const RARITY_COLORS = { common: '#889090', uncommon: '#3a9a30', rare: '#2060c0', epic: '#8020c0', legendary: '#c05010' };
const PANTHEON_COLORS = {
  Olympian: '#9ca3af',
  Greek: '#9ca3af',
  Asgardian: '#93c5fd',
  Norse: '#93c5fd',
  Eastern: '#f87171',
  Roman: '#fbbf24',
  Underworld: '#a78bfa',
  Mayan: '#34d399',
  Egyptian: '#fcd34d',
  Hindu: '#fb923c',
  Celtic: '#4ade80',
  Japanese: '#f472b6',
  Arthurian: '#60a5fa',
  Voodoo: '#c084fc',
  'Tales of Arabia': '#eab308',
  Polynesian: '#2dd4bf',
  Korean: '#38bdf8',
  Yoruba: '#fb923c',
  Chinese: '#f87171',
};
const CLASS_COLORS = {
  warrior: '#f97316',
  guardian: '#60a5fa',
  mage: '#a78bfa',
  hunter: '#22d3ee',
  assassin: '#f43f5e',
};
function getPantheonColor(pantheon) {
  if (!pantheon) return '#b8b8c0';
  return PANTHEON_COLORS[pantheon] || '#b8b8c0';
}
function getRarityLetter(rarity) {
  const r = String(rarity || 'common').toLowerCase();
  if (r === 'uncommon') return 'U';
  if (r === 'legendary') return 'L';
  return (r.charAt(0) || 'C').toUpperCase();
}
function getRarityWord(rarity) {
  const r = String(rarity || 'common').toLowerCase();
  const words = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
  return words[r] || 'Common';
}
function getRarityColor(rarity) {
  return RARITY_COLORS[String(rarity || 'common').toLowerCase()] || RARITY_COLORS.common;
}
const RARITY_ICONS_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Icons/Rarity%20Icons';
const RARITY_ICON_FILES = { common: 'Common.png', uncommon: 'Uncommon.png', rare: 'Rare.png', epic: 'Epic.png', legendary: 'Legendary.png', free: 'Free.png' };
function getRarityIconUri(rarity) {
  const file = RARITY_ICON_FILES[String(rarity || 'common').toLowerCase()] || RARITY_ICON_FILES.common;
  return `${RARITY_ICONS_BASE}/${file}`;
}
function getCardDisplayName(card) {
  if (card?.name) return card.name;
  const id = String(card?.id || '').replace(/^(item_|trap_)/i, '').trim();
  if (!id) return 'Card';
  return id.charAt(0).toUpperCase() + id.slice(1).toLowerCase().replace(/_([a-z])/gi, (_, c) => ' ' + c.toUpperCase());
}
function getFoilLabel(foil) {
  if (foil === CARD_FOIL_TIER.DIVINE_FOIL) return 'Relic Gleam';
  if (foil === CARD_FOIL_TIER.PANTHEON_HOLO) return 'Pantheon Blessing';
  if (foil === CARD_FOIL_TIER.FULL_ART) return 'Ascended Full Art';
  if (foil === CARD_FOIL_TIER.MYTHIC) return 'Godforged';
  if (foil === CARD_FOIL_TIER.PRISMATIC) return 'Ascendant Prism';
  return 'Standard';
}
function getPackRevealCue(rarity) {
  const r = String(rarity || 'common').toLowerCase();
  if (r === 'legendary') return 'Legendary pull: Olympus forge surge, rune flare, impact shake.';
  if (r === 'epic') return 'Epic pull: celestial implosion, battlefield hush, divine slam.';
  if (r === 'rare') return 'Rare pull: pantheon sigils ignite around the card.';
  if (r === 'uncommon') return 'Uncommon pull: relic glint passes over the frame.';
  return 'Common pull: clean flip reveal.';
}
function getCardVisuals(card) {
  if (card?.visuals) return card.visuals;
  const base = getDefaultCardVisuals(card);
  if (card?.isFoilCard) {
    const forced = getGuaranteedFoilByRarity(card?.rarity);
    return {
      ...base,
      foil: forced,
      foil_accent: forced === CARD_FOIL_TIER.MYTHIC ? CARD_FOIL_TIER.PRISMATIC : base.foil_accent,
      variant_type: card?.isAlternativeCard ? 'foil_alternative_card' : 'foil_card',
      variant_name: card?.isAlternativeCard
        ? `Foil ${card?.altVariantName || card?.name || 'Alternative'}`
        : `Foil ${card?.name || 'Card'}`,
      skin_path: card?.altSkinPath || null,
    };
  }
  return base;
}
function getVisualFinishLabels(visuals) {
  const v = visuals || {};
  const primary = getFoilLabel(v.foil);
  const accent = getFoilLabel(v.foil_accent);
  if (!accent || accent === 'Standard' || accent === primary) return [primary];
  return [primary, accent];
}
function getFoilScore(foil) {
  if (foil === CARD_FOIL_TIER.PRISMATIC) return 6;
  if (foil === CARD_FOIL_TIER.MYTHIC) return 5;
  if (foil === CARD_FOIL_TIER.FULL_ART) return 4;
  if (foil === CARD_FOIL_TIER.PANTHEON_HOLO) return 3;
  if (foil === CARD_FOIL_TIER.DIVINE_FOIL) return 2;
  return 1;
}
function getFoilVisualTheme(visuals, pantheonVisual) {
  const foil = visuals?.foil;
  if (!foil || foil === CARD_FOIL_TIER.NONE) return null;
  const accent = pantheonVisual?.accentColor || '#d6b36b';
  if (foil === CARD_FOIL_TIER.DIVINE_FOIL) {
    return {
      frameBorder: '#f0c060',
      frameGlow: 'rgba(240,192,96,0.38)',
      artTint: 'rgba(240,192,96,0.14)',
      shinePrimary: 'rgba(255,235,184,0.6)',
      shineSecondary: 'rgba(141,180,255,0.2)',
      sparkle: 'rgba(255,223,145,0.34)',
      chipBg: 'rgba(200,146,42,0.32)',
      chipBorder: 'rgba(240,192,96,0.78)',
    };
  }
  if (foil === CARD_FOIL_TIER.PANTHEON_HOLO) {
    return {
      frameBorder: accent,
      frameGlow: 'rgba(93,146,255,0.36)',
      artTint: 'rgba(86,126,214,0.16)',
      shinePrimary: 'rgba(229,241,255,0.58)',
      shineSecondary: 'rgba(200,146,42,0.22)',
      sparkle: 'rgba(171,205,255,0.36)',
      chipBg: 'rgba(66,88,142,0.34)',
      chipBorder: 'rgba(156,188,255,0.74)',
    };
  }
  if (foil === CARD_FOIL_TIER.FULL_ART) {
    return {
      frameBorder: '#f0c060',
      frameGlow: 'rgba(240,192,96,0.48)',
      artTint: 'rgba(200,146,42,0.2)',
      shinePrimary: 'rgba(255,236,195,0.62)',
      shineSecondary: 'rgba(109,145,219,0.24)',
      sparkle: 'rgba(246,201,114,0.44)',
      chipBg: 'rgba(200,146,42,0.34)',
      chipBorder: 'rgba(245,214,150,0.78)',
    };
  }
  if (foil === CARD_FOIL_TIER.MYTHIC) {
    return {
      frameBorder: '#c8922a',
      frameGlow: 'rgba(200,146,42,0.55)',
      artTint: 'rgba(71,86,138,0.22)',
      shinePrimary: 'rgba(255,241,206,0.64)',
      shineSecondary: 'rgba(104,159,255,0.28)',
      sparkle: 'rgba(255,215,122,0.46)',
      chipBg: 'rgba(80,95,150,0.38)',
      chipBorder: 'rgba(240,192,96,0.82)',
    };
  }
  return {
    frameBorder: '#f0c060',
    frameGlow: 'rgba(200,146,42,0.56)',
    artTint: 'rgba(86,112,190,0.2)',
    shinePrimary: 'rgba(255,238,198,0.64)',
    shineSecondary: 'rgba(113,164,255,0.3)',
    sparkle: 'rgba(255,220,140,0.42)',
    chipBg: 'rgba(73,97,165,0.38)',
    chipBorder: 'rgba(240,192,96,0.84)',
  };
}
function getGuaranteedFoilByRarity(rarity) {
  const r = String(rarity || 'common').toLowerCase();
  if (r === 'legendary') return CARD_FOIL_TIER.MYTHIC;
  if (r === 'epic') return CARD_FOIL_TIER.FULL_ART;
  if (r === 'rare') return CARD_FOIL_TIER.PANTHEON_HOLO;
  return CARD_FOIL_TIER.DIVINE_FOIL;
}
const SMITE_WARS_MUSIC_URL =
  "https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Audio%20Files/SMITE's%20Top%205%20Plays%20Theme%20Music_%20Choirs%20of%20War%20(Part%202).mp3";
const STAT_ICONS_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Icons/Stat%20Icons';
const STAT_ICONS = {
  strength: `${STAT_ICONS_BASE}/T_StatIcon_Strength.png`,
  health: `${STAT_ICONS_BASE}/T_StatIcon_Health.png`,
  physicalProt: `${STAT_ICONS_BASE}/T_StatIcon_PhysicalProt.png`,
};
const STAT_ATK_TINT = '#e06060';
const STAT_HP_TINT = '#22c055';
const STAT_DEF_TINT = '#3498db';
const PROFILE_BANNER_BASE_URL = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/Profile%20Banner';
const PROFILE_GOD_ICON_BASE_URL = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Icons';
const SMITE_SCROLL_LOGO = require('../assets/icon.png');

function cloneObj(o) {
  return JSON.parse(JSON.stringify(o));
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function uid() {
  return '_' + Math.random().toString(36).slice(2);
}
const MAX_FIELD = 4;
const HAND_SIZE_START = 5;
const MANA_START = 3;
const ROW_FRONT = 'front';
const ROW_BACK = 'back';
const ITEM_CARDS = PROPHECY_ITEM_CARDS;
const TRAP_CARDS = PROPHECY_TRAP_CARDS;
const SPELL_CARDS = PROPHECY_SPELL_CARDS;
function normalizeFieldRow(rowValue) {
  return rowValue === ROW_BACK ? ROW_BACK : ROW_FRONT;
}
const PANTHEON_ICONS = {
  Greek: require('./data/Icons/Pantheon Icons/Greek.png'),
  Roman: require('./data/Icons/Pantheon Icons/Roman.png'),
  Egyptian: require('./data/Icons/Pantheon Icons/Egyptian.png'),
  Norse: require('./data/Icons/Pantheon Icons/Norse.png'),
  Chinese: require('./data/Icons/Pantheon Icons/Chinese.png'),
  'Tales of Arabia': require('./data/Icons/Pantheon Icons/Tales of Arabia.png'),
  Korean: require('./data/Icons/Pantheon Icons/Korean.png'),
  Hindu: require('./data/Icons/Pantheon Icons/Hindu.png'),
  Mayan: require('./data/Icons/Pantheon Icons/Maya.png'),
  Celtic: require('./data/Icons/Pantheon Icons/Celtic.png'),
  Japanese: require('./data/Icons/Pantheon Icons/Japanese.png'),
  Voodoo: require('./data/Icons/Pantheon Icons/Voodoo.png'),
  Yoruba: require('./data/Icons/Pantheon Icons/Yoruba.png'),
  Polynesian: require('./data/Icons/Pantheon Icons/Polynesian.png'),
  Arthurian: require('./data/Icons/Pantheon Icons/Arthurian.png'),
  Olympian: require('./data/Icons/Pantheon Icons/Greek.png'),
  Asgardian: require('./data/Icons/Pantheon Icons/Norse.png'),
  Eastern: require('./data/Icons/Pantheon Icons/Chinese.png'),
  Underworld: require('./data/Icons/Pantheon Icons/Greek.png'),
};
const CARD_PACKS = [
  { id: 'daily', name: 'Daily Pack', costGold: 0, cards: 3, desc: 'Free once per run: 2 Common + 1 Uncommon', guarantee: ['common', 'common', 'uncommon'] },
  { id: 'warrior', name: 'Warrior Pack', costGold: 500, cards: 5, desc: '3 Common, 1 Uncommon, 1 Random up to Rare', guarantee: ['common', 'common', 'common', 'uncommon', 'rare_or_less'] },
  { id: 'divine', name: 'Divine Pack', costGold: 1200, cards: 5, desc: '2 Uncommon guaranteed, higher power mix', guarantee: ['uncommon', 'uncommon', 'rare_or_higher', 'rare_or_higher', 'epic_or_higher'] },
  { id: 'prophecy', name: 'Prophecy Pack', costGold: 2200, cards: 8, desc: '3 Rare guaranteed, 1 Epic+', guarantee: ['rare', 'rare', 'rare', 'epic_or_higher'] },
];
const SMITE_WARS_SYSTEM = {
  STARTING_HAND_SIZE: 5,
  BRAWLER_BONUS_DAMAGE: 3,
  BACKSTAB_MULTIPLIER: 2,
  SPELL_SURGE_MANA_REDUCTION: 1,
  EMPOWERED_DAMAGE_MULTIPLIER: 1.5,
  MISMATCHED_ITEM_SCALAR: 0.5,
  MAX_ITEM_SLOTS_PER_UNIT: 3,
  MAX_TRAPS_ACTIVE: 4,
  STATUS_DEFAULT_BURN: 8,
  STATUS_DEFAULT_POISON: 6,
};
const RANK_MULTIPLIER = { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75, 5: 3 };
const DECK_SLOT_COUNT = 6;
const DECK_SLOT_STORAGE_KEY = 'smitewars_deck_slots_v1';
const TUTORIAL_STATUS_STORAGE_PREFIX = 'smitewars_tutorial_status_';
const TUTORIAL_REWARD_GOLD = 500;
const TUTORIAL_REWARD_PACK = {
  id: 'tutorial_reward',
  name: 'Tutorial Reward Pack',
  costGold: 0,
  cards: 5,
  desc: 'Reward for completing tutorial',
  guarantee: ['common', 'uncommon', 'rare_or_less'],
};
const AUTH_PROFILE_XP_PER_LEVEL = 100;
const GUARANTEE_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  rare_or_less: 'Rare or lower',
  rare_or_higher: 'Rare+',
  epic_or_higher: 'Epic+',
};
function toDbCardType(cardType) {
  const t = String(cardType || CARD_TYPE.GOD).toUpperCase();
  if (t === 'ITEM' || t === 'TRAP' || t === 'SPELL' || t === 'LEADER' || t === 'GOD') return t;
  return 'GOD';
}
function toDbRarity(rarity) {
  return String(rarity || 'common').toUpperCase();
}
const STORY_CHAPTERS = [
  { id: 'ch1', title: 'Chapter 1: First Omen', enemyLeaderId: 'Hades', rewardGold: 180, desc: 'Learn tempo and trade into an Underworld opener.' },
  { id: 'ch2', title: 'Chapter 2: Broken Spear', enemyLeaderId: 'Thor', rewardGold: 260, desc: 'Face bruiser pressure and stabilize with smart blocks.' },
  { id: 'ch3', title: 'Chapter 3: Storm Court', enemyLeaderId: 'Zeus', rewardGold: 340, desc: 'Out-value a spell-heavy enemy with tighter mana usage.' },
];

function normalizeClass(cls) {
  const raw = String(cls || '').toLowerCase();
  if (raw === 'tank' || raw === 'guardian') return 'guardian';
  if (raw === 'fighter' || raw === 'warrior') return 'warrior';
  if (raw === 'assassin') return 'assassin';
  if (raw === 'mage') return 'mage';
  if (raw === 'hunter') return 'hunter';
  return raw;
}
function getClassColor(cls) {
  return CLASS_COLORS[normalizeClass(cls)] || '#b090e0';
}
function toPoolClassName(cls) {
  const poolClass = getClassPoolKey(cls);
  return poolClass || 'Warrior';
}
function classKeywordFor(unit) {
  const explicit = String(unit?.keyword || '').trim().toUpperCase();
  if (explicit === 'TAUNT' || explicit === 'BRAWLER' || explicit === 'BACKSTAB' || explicit === 'SPELL_SURGE' || explicit === 'RANGED') {
    return explicit;
  }
  const c = normalizeClass(unit?.cls);
  if (c === 'guardian') return 'TAUNT';
  if (c === 'warrior') return 'BRAWLER';
  if (c === 'assassin' && explicit === 'CHARGE') return 'BACKSTAB';
  if (c === 'assassin') return 'BACKSTAB';
  if (c === 'mage') return 'SPELL_SURGE';
  if (c === 'hunter') return 'RANGED';
  return null;
}
function hasKeyword(unit, keyword) {
  return classKeywordFor(unit) === keyword;
}
function getRankMultiplier(rank) {
  return RANK_MULTIPLIER[Math.max(1, Math.min(5, Number(rank || 1)))] || 1;
}
function getItemStatType(item) {
  return 'HYBRID';
}
function getItemScalar(unit, item) {
  return 1;
}
function sumItemAttackBonus(unit) {
  const slots = Array.isArray(unit?.item_slots) ? unit.item_slots : [];
  return Math.round(slots.reduce((sum, item) => sum + (Number(item?.atkBoost || 0) * getItemScalar(unit, item)), 0));
}
function computeUnitAttack(unit) {
  const base = Number(unit?.atk || 0);
  const withItems = base + sumItemAttackBonus(unit);
  const brawler = hasKeyword(unit, 'BRAWLER') && Number(unit?.hp || 0) < Number(unit?.maxHp || 0) * 0.5;
  return withItems + (brawler ? SMITE_WARS_SYSTEM.BRAWLER_BONUS_DAMAGE : 0);
}
function hasStatus(unit, statusType) {
  return Array.isArray(unit?.status_effects) && unit.status_effects.some((s) => String(s?.type || '').toUpperCase() === statusType);
}
function findTauntUnits(units) {
  return (units || []).filter((u) => hasKeyword(u, 'TAUNT'));
}
function getAbilityMechanicsTemplate(unit) {
  const cls = normalizeClass(unit?.cls);
  if (cls === 'guardian') return { name: 'Shield Wall', icon: '🛡', baseCost: 2, type: 'guardian_heal', valueA: 20 };
  if (cls === 'warrior') return { name: 'Battle Cry', icon: '⚔', baseCost: 2, type: 'warrior_empower', valueA: 1 };
  if (cls === 'assassin') return { name: 'Shadow Strike', icon: '🗡', baseCost: 2, type: 'assassin_execute', valueA: 14 };
  if (cls === 'mage') return { name: 'Arcane Burst', icon: '✨', baseCost: 3, type: 'mage_burst', valueA: 10 };
  if (cls === 'hunter') return { name: 'Piercing Volley', icon: '🏹', baseCost: 1, type: 'hunter_volley', valueA: 9 };
  return { name: 'Battle Instinct', icon: '✦', baseCost: 2, type: 'warrior_empower', valueA: 1 };
}
function getAbilityDisplay(unit) {
  const mechanics = getAbilityMechanicsTemplate(unit);
  const pooled = getPooledAbility(toPoolClassName(unit?.cls), unit?.abilityId);
  const slotIcon = getGodAbilityIcon(unit?.name, '1');
  return {
    name: pooled?.name || unit?.ability?.name || mechanics.name,
    cost: Number(pooled?.cost ?? unit?.ability?.mana_cost ?? mechanics.baseCost ?? 2),
    description: pooled?.description || '',
    iconSource: unit?.abilityIconSource || `${unit?.name || 'God'}_Ability1`,
    iconUri: slotIcon,
    mechanics,
  };
}
function getUltimateDisplay(unit) {
  const pooled = getPooledUltimate(toPoolClassName(unit?.cls), unit?.ultimateId);
  return {
    name: pooled?.name || 'Ultimate',
    pips: Number(pooled?.pips || 0),
    description: pooled?.description || '',
    iconSource: unit?.ultimateIconSource || `${unit?.name || 'God'}_Ultimate`,
    iconUri: getGodAbilityIcon(unit?.name, '4'),
  };
}
function getAbilityCost(unit) {
  const display = getAbilityDisplay(unit);
  const base = Number(display.cost);
  const surgeReduction = hasKeyword(unit, 'SPELL_SURGE') ? SMITE_WARS_SYSTEM.SPELL_SURGE_MANA_REDUCTION : 0;
  return Math.max(0, base - surgeReduction);
}
function getAbilityTheme(unit) {
  const cls = normalizeClass(unit?.cls);
  if (cls === 'guardian') return { bg: 'rgba(70,120,180,0.58)', border: 'rgba(160,210,255,0.45)', text: '#d8ecff' };
  if (cls === 'warrior') return { bg: 'rgba(160,92,42,0.6)', border: 'rgba(255,185,118,0.45)', text: '#ffe3c8' };
  if (cls === 'assassin') return { bg: 'rgba(116,58,132,0.6)', border: 'rgba(220,150,255,0.5)', text: '#f0d8ff' };
  if (cls === 'mage') return { bg: 'rgba(60,84,168,0.62)', border: 'rgba(147,186,255,0.5)', text: '#dfe8ff' };
  if (cls === 'hunter') return { bg: 'rgba(44,132,94,0.6)', border: 'rgba(130,230,180,0.48)', text: '#dcfff0' };
  return { bg: 'rgba(36,90,146,0.58)', border: 'rgba(132,186,255,0.45)', text: '#d4e8ff' };
}
function normalizeStatusEffects(effects) {
  if (!Array.isArray(effects)) return [];
  return effects
    .map((s) => {
      const type = String(s?.type || '').toUpperCase();
      const duration = Number(s?.duration_turns ?? 0);
      if (!type || !Number.isFinite(duration)) return null;
      return { ...s, type, duration_turns: duration };
    })
    .filter(Boolean);
}

const SKIN_NOISE_WORDS = new Set([
  'card', 'cards', 'skincard', 'splash', 'wallpaper', 'wallpapers', 'social', 'default',
  'smite2', 'f2p', 'ob1', 'notag', 'prism', 'prisms',
]);
const BLOCKED_SKIN_FILENAMES = new Set([
  'mercury_010.webp',
]);
function toTitleWords(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word.toUpperCase() : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`))
    .join(' ');
}
function getCleanSkinTitle(raw) {
  const decoded = (() => {
    try {
      return decodeURIComponent(String(raw || ''));
    } catch (_) {
      return String(raw || '');
    }
  })();
  const base = decoded
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return '';
  const kept = base
    .split(/\s+/)
    .filter((part) => {
      const p = String(part || '').trim();
      if (!p) return false;
      if (/^\d+$/.test(p)) return false;
      if (SKIN_NOISE_WORDS.has(p.toLowerCase())) return false;
      return true;
    })
    .join(' ')
    .trim();
  return toTitleWords(kept || base);
}
function buildVariantName(godName, skinName, skinPath, skinKey) {
  const god = String(godName || '').trim();
  if (!god) return 'Unknown Skin';
  const fromFilename = String(skinPath || '').split('/').pop() || '';
  const candidateRaw =
    String(skinName || '').trim() ||
    String(skinKey || '').trim() ||
    fromFilename;
  let skinTitle = getCleanSkinTitle(candidateRaw);
  if (!skinTitle || /^base$/i.test(skinTitle)) {
    skinTitle = getCleanSkinTitle(fromFilename);
  }
  if (!skinTitle || /^base$/i.test(skinTitle)) {
    return god;
  }
  const godLower = god.toLowerCase();
  if (skinTitle.toLowerCase().includes(godLower)) {
    return skinTitle;
  }
  return `${skinTitle} ${god}`;
}
function isBlockedSkinPath(skinPath) {
  const filename = String(skinPath || '').split('/').pop() || '';
  return BLOCKED_SKIN_FILENAMES.has(filename.toLowerCase());
}
function encodeDeckShare(payload) {
  const json = JSON.stringify(payload);
  try {
    if (globalThis?.Buffer?.from) return globalThis.Buffer.from(json, 'utf8').toString('base64');
  } catch (_) {}
  try {
    if (typeof globalThis?.btoa === 'function') return globalThis.btoa(unescape(encodeURIComponent(json)));
  } catch (_) {}
  return `plain:${encodeURIComponent(json)}`;
}
function decodeDeckShare(code) {
  if (!code) return null;
  const text = String(code).trim();
  if (!text) return null;
  try {
    if (text.startsWith('plain:')) return JSON.parse(decodeURIComponent(text.slice(6)));
    if (globalThis?.Buffer?.from) return JSON.parse(globalThis.Buffer.from(text, 'base64').toString('utf8'));
  } catch (_) {}
  try {
    if (typeof globalThis?.atob === 'function') return JSON.parse(decodeURIComponent(escape(globalThis.atob(text))));
  } catch (_) {}
  return null;
}
async function storageGetItem(key) {
  if (!key) return null;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (_) {
    return null;
  }
}
async function storageSetItem(key, value) {
  if (!key) return;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, String(value ?? ''));
      return;
    }
    await AsyncStorage.setItem(key, String(value ?? ''));
  } catch (_) {}
}
async function storageRemoveItem(key) {
  if (!key) return;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (_) {}
}
function hashPassword(rawPassword) {
  return CryptoJS.SHA256(String(rawPassword || '')).toString();
}

function AttackAnimWrap({ children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lunge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.22, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lunge, { toValue: -8, duration: 120, useNativeDriver: true }),
        Animated.timing(lunge, { toValue: 0, duration: 190, useNativeDriver: true }),
      ]),
    ]).start();
  }, [lunge, scale]);
  return <Animated.View style={{ transform: [{ scale }, { translateY: lunge }] }}>{children}</Animated.View>;
}

function DeployAnimWrap({ children }) {
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0.62)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 70 }),
      ]),
      Animated.timing(opacity, { toValue: 1, duration: 210, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);
  return <Animated.View style={{ transform: [{ scale }], opacity }}>{children}</Animated.View>;
}

function FloatCombatText({ text, kind = 'damage' }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: -22, duration: 560, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 560, useNativeDriver: true }),
    ]).start();
  }, [opacity, y]);
  const color = kind === 'death' ? '#ffb3b3' : '#ffd9d9';
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', opacity, transform: [{ translateY: y }] }}>
      <Text style={[styles.floatCombatText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

export default function ProphecyPage({ onBack, gameTitle = 'Smite Wars' }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(4, insets.top);
  const safeBottom = Math.max(4, insets.bottom);
  const isTinyPhone = screenH <= 760;
  const isSmallPhone = screenH <= 840;
  const boardGap = isTinyPhone ? 4 : screenW > 420 ? 10 : 8;
  const boardCardW = Math.max(isTinyPhone ? 38 : 44, Math.min(isTinyPhone ? 50 : 58, Math.floor(screenW * (isTinyPhone ? 0.135 : 0.155))));
  const boardCardH = Math.round(boardCardW * 0.74);
  const handCardW = Math.max(isTinyPhone ? 56 : 68, Math.min(isTinyPhone ? 74 : 92, Math.floor(screenW * (isTinyPhone ? 0.2 : 0.245))));
  const handArtW = Math.max(isTinyPhone ? 38 : 48, Math.min(isTinyPhone ? 52 : 62, Math.floor(screenW * (isTinyPhone ? 0.125 : 0.16))));
  const handArtH = Math.round(handArtW * 0.72);
  const leaderIconSize = isTinyPhone ? 20 : 24;
  const playerLeaderIconSize = isTinyPhone ? 20 : 24;
  const battleScale = isTinyPhone ? 0.82 : isSmallPhone ? 0.9 : 1;
  const collectionGridGap = 6;
  const collectionCardWidth = Math.floor((screenW - 12 - collectionGridGap) / 2); // 2 cards per row, 1 gap, root padding 6*2
  const collectionGridWidth = screenW - 12; // full content width for grid container
  const [screen, setScreen] = useState('start'); // start | leader | battle | gameover
  const [accountLoading, setAccountLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileBannerUseJpg, setProfileBannerUseJpg] = useState(false);
  const [profileIconUseFallback, setProfileIconUseFallback] = useState(false);
  const [tutorialStatus, setTutorialStatus] = useState({ completed: false, skipped: false, rewarded: false });
  const [savedDeckRows, setSavedDeckRows] = useState([]);
  const [selLeader, setSelLeader] = useState(null);
  const [G, setG] = useState(null);
  const [htpVisible, setHtpVisible] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [deckBuilderVisible, setDeckBuilderVisible] = useState(false);
  const [leaderInfoVisible, setLeaderInfoVisible] = useState(false);
  const [inspectCard, setInspectCard] = useState(null);
  const [inspectShowBack, setInspectShowBack] = useState(false);
  const [attackAnimating, setAttackAnimating] = useState(null);
  const [hubTab, setHubTab] = useState('home');
  const [metaGold, setMetaGold] = useState(2500);
  const [ownedCards, setOwnedCards] = useState({});
  const [dbOwnedCards, setDbOwnedCards] = useState({});
  const [devOwnershipView, setDevOwnershipView] = useState('dev'); // dev | standard
  const [packOpenCards, setPackOpenCards] = useState([]);
  const [packOpenVisible, setPackOpenVisible] = useState(false);
  const [packRevealCue, setPackRevealCue] = useState('');
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [battleTip, setBattleTip] = useState('');
  const [showBattleTip, setShowBattleTip] = useState(false);
  const [itemTargetCard, setItemTargetCard] = useState(null);
  const [itemTargetIid, setItemTargetIid] = useState(null);
  const [collectionQuery, setCollectionQuery] = useState('');
  const [collectionPantheon, setCollectionPantheon] = useState('all');
  const [collectionCost, setCollectionCost] = useState('all');
  const [collectionClass, setCollectionClass] = useState('all');
  const [collectionType, setCollectionType] = useState('all');
  const [collectionRarity, setCollectionRarity] = useState('all');
  const [collectionFoil, setCollectionFoil] = useState('all');
  const [collectionMode, setCollectionMode] = useState('cards'); // 'cards' | 'leaders'
  const [openCollectionFilter, setOpenCollectionFilter] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [failedItemIcons, setFailedItemIcons] = useState({});
  const [failedSkinArts, setFailedSkinArts] = useState({});
  const [ownedVisualOverrides, setOwnedVisualOverrides] = useState({});
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hitFx, setHitFx] = useState(null);
  const [damageFx, setDamageFx] = useState(null);
  const [deathFx, setDeathFx] = useState(null);
  const [deployFxIid, setDeployFxIid] = useState(null);
  const [playPreviewCard, setPlayPreviewCard] = useState(null);
  const tipTimeoutRef = useRef(null);
  const combatFxTimersRef = useRef({ hit: null, damage: null, death: null, deploy: null, preview: null });
  const inspectTiltX = useRef(new Animated.Value(0)).current;
  const inspectTiltY = useRef(new Animated.Value(0)).current;
  const inspectTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const inspectSpinBaseRef = useRef(0);
  const inspectSpinRef = useRef(0);
  const inspectFaceBackRef = useRef(false);
  const inspectDraggingRef = useRef(false);
  const lowHpPlayedRef = useRef({ p: false, e: false });
  const [musicUnlocked, setMusicUnlocked] = useState(false);
  const musicPlayer = useAudioPlayer(SMITE_WARS_MUSIC_URL, { downloadFirst: true });
  useEffect(() => {
    if (musicPlayer) musicPlayer.loop = true;
  }, [musicPlayer]);
  const [customDeck, setCustomDeck] = useState(() => buildSmartStarterDeck());
  const [deckSlots, setDeckSlots] = useState(() => Array.from({ length: DECK_SLOT_COUNT }, () => null));
  const [deckShareCodeInput, setDeckShareCodeInput] = useState('');
  const [deckShareNotice, setDeckShareNotice] = useState('');
  const triggerHitFx = useCallback((targetKey) => {
    if (!targetKey) return;
    if (combatFxTimersRef.current.hit) clearTimeout(combatFxTimersRef.current.hit);
    const next = { targetKey, key: `${targetKey}_${Date.now()}` };
    setHitFx(next);
    combatFxTimersRef.current.hit = setTimeout(() => setHitFx((prev) => (prev?.key === next.key ? null : prev)), 360);
  }, []);
  const triggerDamageFx = useCallback((targetKey, amount) => {
    if (!targetKey || !Number.isFinite(amount) || amount <= 0) return;
    if (combatFxTimersRef.current.damage) clearTimeout(combatFxTimersRef.current.damage);
    const next = { targetKey, amount, key: `${targetKey}_dmg_${Date.now()}` };
    setDamageFx(next);
    combatFxTimersRef.current.damage = setTimeout(() => setDamageFx((prev) => (prev?.key === next.key ? null : prev)), 620);
  }, []);
  const triggerDeathFx = useCallback((targetKey, label = 'Defeated') => {
    if (!targetKey) return;
    if (combatFxTimersRef.current.death) clearTimeout(combatFxTimersRef.current.death);
    const next = { targetKey, label, key: `${targetKey}_death_${Date.now()}` };
    setDeathFx(next);
    combatFxTimersRef.current.death = setTimeout(() => setDeathFx((prev) => (prev?.key === next.key ? null : prev)), 700);
  }, []);
  const triggerDeployFx = useCallback((iid) => {
    if (!iid) return;
    if (combatFxTimersRef.current.deploy) clearTimeout(combatFxTimersRef.current.deploy);
    setDeployFxIid(iid);
    combatFxTimersRef.current.deploy = setTimeout(() => setDeployFxIid((prev) => (prev === iid ? null : prev)), 520);
  }, []);
  const triggerPlayPreview = useCallback((card) => {
    if (!card) return;
    if (combatFxTimersRef.current.preview) clearTimeout(combatFxTimersRef.current.preview);
    setPlayPreviewCard(card);
    combatFxTimersRef.current.preview = setTimeout(() => setPlayPreviewCard(null), 1400);
  }, []);
  const inspectCardWidth = Math.min(300, Math.max(220, Math.floor(screenW * 0.62)));
  const inspectCardHeight = 372;
  const inspectRotateX = inspectTiltX.interpolate({
    inputRange: [-18, 18],
    outputRange: ['-18deg', '18deg'],
  });
  const inspectRotateY = inspectTiltY.interpolate({
    inputRange: [-1440, 1440],
    outputRange: ['-1440deg', '1440deg'],
  });
  const resetInspectTilt = useCallback(() => {
    Animated.parallel([
      Animated.spring(inspectTiltX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }),
      Animated.spring(inspectTranslate.x, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }),
      Animated.spring(inspectTranslate.y, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }),
    ]).start();
  }, [inspectTiltX, inspectTranslate.x, inspectTranslate.y]);
  const updateInspectFace = useCallback((angle, force = false) => {
    if (inspectDraggingRef.current && !force) {
      if (inspectFaceBackRef.current) {
        inspectFaceBackRef.current = false;
        setInspectShowBack(false);
      }
      return;
    }
    const normalized360 = ((angle % 360) + 360) % 360;
    const prevBack = inspectFaceBackRef.current;
    let nextBack = prevBack;
    if (force) {
      nextBack = normalized360 > 90 && normalized360 < 270;
    } else if (prevBack) {
      // Hysteresis: once on the back, require more rotation to return to front.
      if (normalized360 <= 75 || normalized360 >= 285) nextBack = false;
    } else {
      // Hysteresis: once on the front, require more rotation to flip to back.
      if (normalized360 >= 105 && normalized360 <= 255) nextBack = true;
    }
    if (nextBack !== prevBack) {
      inspectFaceBackRef.current = nextBack;
      setInspectShowBack(nextBack);
    }
  }, []);
  const settleInspectSpin = useCallback(() => {
    inspectDraggingRef.current = false;
    const current = inspectSpinRef.current || 0;
    const snapped = Math.round(current / 180) * 180;
    let normalized = ((snapped % 360) + 360) % 360;
    if (normalized > 180) normalized -= 360;
    inspectSpinRef.current = normalized;
    inspectSpinBaseRef.current = normalized;
    Animated.parallel([
      Animated.spring(inspectTiltY, { toValue: normalized, useNativeDriver: true, friction: 8, tension: 75 }),
      Animated.spring(inspectTiltX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }),
      Animated.spring(inspectTranslate.x, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }),
      Animated.spring(inspectTranslate.y, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }),
    ]).start();
    updateInspectFace(normalized, true);
  }, [inspectTiltX, inspectTiltY, inspectTranslate.x, inspectTranslate.y, updateInspectFace]);
  const inspectPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          inspectDraggingRef.current = true;
          inspectFaceBackRef.current = false;
          setInspectShowBack(false);
          inspectSpinBaseRef.current = inspectSpinRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextTiltX = Math.max(-18, Math.min(18, -gestureState.dy / 8));
          const nextTiltY = inspectSpinBaseRef.current + (gestureState.dx * 1.5);
          const nextTranslateX = Math.max(-28, Math.min(28, gestureState.dx / 4));
          const nextTranslateY = Math.max(-24, Math.min(24, gestureState.dy / 4));
          inspectTiltX.setValue(nextTiltX);
          inspectTiltY.setValue(nextTiltY);
          inspectSpinRef.current = nextTiltY;
          inspectTranslate.setValue({ x: nextTranslateX, y: nextTranslateY });
          updateInspectFace(nextTiltY);
        },
        onPanResponderRelease: settleInspectSpin,
        onPanResponderTerminate: settleInspectSpin,
      }),
    [inspectTiltX, inspectTiltY, inspectTranslate, settleInspectSpin, updateInspectFace]
  );
  const tutorialRequired = !tutorialStatus.completed && !tutorialStatus.skipped;
  const deckValidation = useMemo(() => validateDeck(customDeck, selLeader?.id), [customDeck, selLeader?.id]);
  const draftDeckValidation = useMemo(() => validateDeck(customDeck, 'draft'), [customDeck]);
  const deckAvgCost = useMemo(() => computeDeckAvgCost(customDeck), [customDeck]);
  const deckArchetype = useMemo(() => deriveDeckArchetype(customDeck), [customDeck]);
  const deckCurve = useMemo(() => getDeckCostCurve(customDeck), [customDeck]);
  const starterPool = useMemo(() => {
    const basePool = [...PROPHECY_UNITS, ...ITEM_CARDS, ...TRAP_CARDS, ...SPELL_CARDS];
    const gods = Array.isArray(buildsData?.gods) ? buildsData.gods.flat(Infinity).filter(Boolean) : [];
    const godCardByName = {};
    PROPHECY_UNITS.forEach((card) => {
      if ((card?.cardType || CARD_TYPE.GOD) !== CARD_TYPE.GOD) return;
      const key = String(card?.name || '').trim().toLowerCase();
      if (!key || godCardByName[key]) return;
      godCardByName[key] = card;
    });
    const godDataByName = {};
    gods.forEach((god) => {
      const name = String(god?.name || '').trim().toLowerCase();
      if (name) godDataByName[name] = god;
    });

    const altCards = [];
    PROPHECY_UNITS.forEach((baseCard) => {
      if ((baseCard?.cardType || CARD_TYPE.GOD) !== CARD_TYPE.GOD) return;
      const godName = String(baseCard?.name || '').trim();
      if (!godName) return;
      const godData = godDataByName[godName.toLowerCase()] || null;
      const skinsObj = godData?.skins && typeof godData.skins === 'object' ? godData.skins : null;
      let pickedSkin = null;
      if (skinsObj) {
        const skinEntries = Object.entries(skinsObj)
          .map(([key, value]) => ({ key, value }))
          .filter((entry) => {
            const skinName = String(entry?.value?.name || entry?.key || '').toLowerCase();
            const skinPath = entry?.value?.skin;
            return !!skinPath && !skinName.includes('base') && !isBlockedSkinPath(skinPath);
          });
        if (skinEntries.length) pickedSkin = skinEntries[0];
      }
      if (!pickedSkin) return;
      const variantName = buildVariantName(
        godName,
        pickedSkin?.value?.name || '',
        pickedSkin?.value?.skin || '',
        pickedSkin?.key || ''
      );
      const altId = `alt_${baseCard.id}_variant`;
      altCards.push({
        ...baseCard,
        id: altId,
        name: variantName,
        baseGodId: baseCard.id,
        baseGodName: baseCard.name,
        isAlternativeCard: true,
        altSkinPath: pickedSkin?.value?.skin ? String(pickedSkin.value.skin) : null,
        altVariantName: variantName,
      });
    });

    const allCards = [...basePool, ...altCards];
    const foilCards = allCards.map((card) => ({
      ...card,
      id: `foil_${card.id}`,
      name: `${card.name} [Foil]`,
      isFoilCard: true,
      foilBaseId: card.id,
    }));
    return [...allCards, ...foilCards];
  }, []);
  const isDevAccount = !!profileData?.is_dev;
  const effectiveOwnedCards = useMemo(() => {
    if (isDevAccount && devOwnershipView === 'standard') return dbOwnedCards;
    return ownedCards;
  }, [dbOwnedCards, devOwnershipView, isDevAccount, ownedCards]);
  const ownedTotalCount = useMemo(
    () => Object.values(effectiveOwnedCards).reduce((sum, n) => sum + Number(n || 0), 0),
    [effectiveOwnedCards]
  );
  const accountTypeLabel = isDevAccount
    ? (devOwnershipView === 'standard' ? 'Dev (Standard Preview)' : 'Dev')
    : 'Standard';
  const starterById = useMemo(() => {
    const out = {};
    starterPool.forEach((c) => {
      out[c.id] = c;
    });
    return out;
  }, [starterPool]);
  const rarityIndex = useMemo(() => {
    const out = {};
    RARITY_ORDER.forEach((r, idx) => {
      out[r] = idx;
    });
    return out;
  }, []);
  const getOwnedMapFromRows = useCallback((rows) => {
    const out = {};
    (rows || []).forEach((row) => {
      const cid = row?.card_id;
      if (!cid) return;
      out[cid] = (out[cid] || 0) + 1;
    });
    return out;
  }, []);
  const getDevOwnedMap = useCallback(() => {
    const out = {};
    starterPool.forEach((card) => {
      out[card.id] = 1;
    });
    return out;
  }, [starterPool]);
  const levelProgress = useMemo(() => {
    const xp = Math.max(0, Number(profileData?.xp || 0));
    const level = Math.max(1, Number(profileData?.level || 1));
    const need = Math.max(1, level * AUTH_PROFILE_XP_PER_LEVEL);
    const ratio = Math.max(0, Math.min(1, xp / need));
    return { xp, level, need, ratio };
  }, [profileData?.xp, profileData?.level]);
  const profileStats = useMemo(() => {
    const totalCardsOwned = ownedTotalCount;
    const totalDecksCreated = savedDeckRows.length;
    const wins = savedDeckRows.reduce((sum, d) => sum + Number(d?.wins || 0), 0);
    const losses = savedDeckRows.reduce((sum, d) => sum + Number(d?.losses || 0), 0);
    return { totalCardsOwned, totalDecksCreated, wins, losses };
  }, [ownedTotalCount, savedDeckRows]);
  const profileGodIconSource = useMemo(() => {
    const godName = profileData?.profile_god_icon;
    if (!godName) return null;
    if (/^https?:\/\//i.test(String(godName))) return { uri: String(godName) };
    if (profileIconUseFallback) {
      const normalizedName = String(godName).toLowerCase().trim();
      return { uri: `${PROFILE_GOD_ICON_BASE_URL}/${encodeURIComponent(normalizedName)}.png` };
    }
    return getRemoteGodIconByName(godName) || { uri: `${PROFILE_GOD_ICON_BASE_URL}/${encodeURIComponent(String(godName).toLowerCase().trim())}.png` };
  }, [profileData?.profile_god_icon, profileIconUseFallback]);
  const profileBannerUri = useMemo(() => {
    const banner = String(profileData?.profile_banner || '').trim();
    if (!banner || banner === 'none') return null;
    if (/^https?:\/\//i.test(banner)) return banner;
    const safeKey = banner.toLowerCase();
    const ext = profileBannerUseJpg ? 'jpg' : 'webp';
    return `${PROFILE_BANNER_BASE_URL}/${safeKey}.${ext}`;
  }, [profileData?.profile_banner, profileBannerUseJpg]);
  const skinPoolByGod = useMemo(() => {
    const out = {};
    const gods = Array.isArray(buildsData?.gods) ? buildsData.gods.flat(Infinity).filter(Boolean) : [];
    gods.forEach((god) => {
      const godName = String(god?.name || '').trim();
      if (!godName) return;
      const skinsObj = god?.skins;
      if (!skinsObj || typeof skinsObj !== 'object') return;
      const list = Object.entries(skinsObj)
        .map(([k, v]) => {
          const skinPath = v?.skin;
          const skinName = v?.name || k;
          if (!skinPath) return null;
          if (isBlockedSkinPath(skinPath)) return null;
          const normalized = String(skinName || '').toLowerCase();
          if (normalized.includes('base')) return null;
          return {
            key: String(k),
            name: buildVariantName(godName, skinName, skinPath, k),
            path: String(skinPath),
          };
        })
        .filter(Boolean);
      if (list.length) out[godName] = list;
    });
    return out;
  }, []);
  useEffect(() => {
    setProfileBannerUseJpg(false);
  }, [profileData?.profile_banner]);
  useEffect(() => {
    setProfileIconUseFallback(false);
  }, [profileData?.profile_god_icon]);
  const getTutorialStatusKey = useCallback((username) => `${TUTORIAL_STATUS_STORAGE_PREFIX}${username || 'guest'}`, []);
  const saveTutorialStatus = useCallback(async (status, username = currentUser) => {
    const key = getTutorialStatusKey(username);
    const raw = JSON.stringify(status || { completed: false, skipped: false, rewarded: false });
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, raw);
      } else {
        await AsyncStorage.setItem(key, raw);
      }
    } catch (_) {}
  }, [currentUser, getTutorialStatusKey]);
  const loadTutorialStatus = useCallback(async (username = currentUser) => {
    const key = getTutorialStatusKey(username);
    try {
      let raw = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(key);
      } else {
        raw = await AsyncStorage.getItem(key);
      }
      if (!raw) return { completed: false, skipped: false, rewarded: false };
      const parsed = JSON.parse(raw);
      return {
        completed: !!parsed?.completed,
        skipped: !!parsed?.skipped,
        rewarded: !!parsed?.rewarded,
      };
    } catch (_) {
      return { completed: false, skipped: false, rewarded: false };
    }
  }, [currentUser, getTutorialStatusKey]);
  const loadProfileAndCollection = useCallback(async (username) => {
    if (!username) return;
    try {
      await supabase.rpc('set_current_user', { username_param: username });
    } catch (_) {}
    let { data: profileRow } = await supabase.from('user_data').select('*').eq('username', username).maybeSingle();
    if (!profileRow) {
      const { data: inserted } = await supabase
        .from('user_data')
        .upsert([{ username, display_name: username }], { onConflict: 'username', ignoreDuplicates: false })
        .select('*')
        .maybeSingle();
      profileRow = inserted || null;
    }
    if (profileRow) {
      setProfileData(profileRow);
      setMetaGold(Number(profileRow.gold ?? 500));
    } else {
      setProfileData(null);
    }
    const { data: cardsRows } = await supabase.from('user_cards').select('card_id').eq('user_id', username);
    const dbOwned = Array.isArray(cardsRows) ? getOwnedMapFromRows(cardsRows) : {};
    setDbOwnedCards(dbOwned);
    if (profileRow?.is_dev) {
      // Dev accounts start with full ownership baseline, but duplicate pulls still add counts.
      const baseline = getDevOwnedMap();
      const merged = { ...baseline };
      Object.entries(dbOwned).forEach(([cardId, count]) => {
        merged[cardId] = Number(merged[cardId] || 0) + Number(count || 0);
      });
      setOwnedCards(merged);
    } else {
      setOwnedCards(dbOwned);
    }
    const { data: dbDecks } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', username)
      .order('updated_at', { ascending: false })
      .limit(24);
    if (Array.isArray(dbDecks)) {
      setSavedDeckRows(dbDecks);
      const normalized = Array.from({ length: DECK_SLOT_COUNT }, (_, idx) => {
        const d = dbDecks[idx];
        if (!d) return null;
        const cardIds = Array.isArray(d.card_ids) ? d.card_ids : [];
        return {
          id: d.id,
          name: d.name,
          leaderId: d.leader_id || null,
          cardIds,
          shareCode: encodeDeckShare({ v: 1, leaderId: d.leader_id || null, cards: cardIds }),
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
          wins: Number(d.wins || 0),
          losses: Number(d.losses || 0),
        };
      });
      setDeckSlots(normalized);
    }
  }, [getDevOwnedMap, getOwnedMapFromRows]);
  const refreshCurrentUser = useCallback(async () => {
    setAccountLoading(true);
    try {
      const user = await (profileHelpers?.getCurrentUser?.() || Promise.resolve(null));
      setCurrentUser(user || null);
      if (user) {
        await loadProfileAndCollection(user);
        const status = await loadTutorialStatus(user);
        setTutorialStatus(status);
      } else {
        setProfileData(null);
        setSavedDeckRows([]);
        setOwnedCards({});
        setDbOwnedCards({});
        setTutorialStatus({ completed: false, skipped: false, rewarded: false });
      }
    } finally {
      setAccountLoading(false);
    }
  }, [loadProfileAndCollection, loadTutorialStatus]);
  const handleProphecyLogin = useCallback(async () => {
    const username = String(authUsername || '').trim();
    const password = String(authPassword || '').trim();
    if (!username || !password) {
      setAuthError('Please enter both username and password.');
      return;
    }
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const passwordHash = hashPassword(password);
      let didLogin = false;
      const { data, error } = await supabase
        .from('app_users')
        .select('username, password_hash')
        .eq('username', username)
        .single();
      if (data?.password_hash && data.password_hash === passwordHash) {
        didLogin = true;
      } else if (error || !data) {
        const localRaw = await storageGetItem(`user_${username}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (parsed?.password_hash === passwordHash) didLogin = true;
        }
      }
      if (!didLogin) {
        setAuthError('Invalid username or password.');
        return;
      }
      await storageSetItem('currentUser', username);
      setCurrentUser(username);
      await loadProfileAndCollection(username);
      const status = await loadTutorialStatus(username);
      setTutorialStatus(status);
      setAuthUsername('');
      setAuthPassword('');
      setAuthError('');
    } catch (err) {
      setAuthError(`Login failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoggingIn(false);
    }
  }, [authPassword, authUsername, loadProfileAndCollection, loadTutorialStatus]);
  const handleProphecyLogout = useCallback(async () => {
    try {
      await storageRemoveItem('currentUser');
      try {
        await supabase.auth.signOut();
      } catch (_) {}
      setCurrentUser(null);
      setProfileData(null);
      setSavedDeckRows([]);
      setOwnedCards({});
      setAuthUsername('');
      setAuthPassword('');
      setAuthError('');
      setTutorialStatus({ completed: false, skipped: false, rewarded: false });
    } catch (_) {}
  }, []);
  useEffect(() => {
    refreshCurrentUser();
  }, [refreshCurrentUser]);
  useEffect(() => {
    if (screen === 'start') refreshCurrentUser();
  }, [screen, refreshCurrentUser]);
  const generateRandomCard = useCallback((turn = 1) => {
    const maxR = Math.min(Math.floor(turn / 2), RARITY_ORDER.length - 1);
    const pool = getCardsByRarity(maxR);
    const card = cloneObj(pool[Math.floor(Math.random() * pool.length)]);
    if (!card.cardType) card.cardType = CARD_TYPE.GOD;
    return card;
  }, []);

  const buildStarterDeck = useCallback(() => {
    const deck = customDeck.length === 30 ? customDeck.map((c) => cloneObj(c)) : buildSmartStarterDeck();
    shuffle(deck);
    return deck;
  }, [customDeck]);

  const unlockMusic = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (!musicPlayer) return;

    // If we've already unlocked once, just ensure it's playing.
    if (musicUnlocked) {
      try {
        musicPlayer.loop = true;
        musicPlayer.volume = 0.35;
        musicPlayer.play();
      } catch (e) {
        console.warn('Failed to re-play Smite Wars music', e);
      }
      return;
    }

    setMusicUnlocked(true);
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
        });
        musicPlayer.loop = true;
        musicPlayer.volume = 0.35;
        await musicPlayer.play();
      } catch (e) {
        console.warn('Failed to start Smite Wars music', e);
      }
    })();
  }, [musicUnlocked, musicPlayer]);

  // Try to auto-start music on entering Smite Wars start screen (best effort).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (screen === 'start' && !musicUnlocked) {
      unlockMusic();
    }
  }, [screen, musicUnlocked, unlockMusic]);

  const newGame = useCallback((leader, options = {}) => {
    const enemyList = PROPHECY_LEADERS.filter((l) => l.id !== leader.id);
    const forcedEnemy = options?.enemyLeaderId ? enemyList.find((l) => l.id === options.enemyLeaderId) : null;
    const el = forcedEnemy || enemyList[Math.floor(Math.random() * enemyList.length)];
    const pHp = leader.id === 'Athena' ? leader.hp + 30 : leader.hp;
    const deck = buildStarterDeck();
    const hand = [];
    for (let j = 0; j < HAND_SIZE_START; j++) {
      if (deck.length) {
        const c = deck.pop();
        c.iid = uid();
        if (!c.cardType) c.cardType = CARD_TYPE.GOD;
        hand.push(c);
      }
    }
    const ep = PROPHECY_UNITS.filter((u) => u.rarity === 'common');
    const firstEnemy = cloneObj(ep[Math.floor(Math.random() * ep.length)]);
    firstEnemy.rank = 1;
    firstEnemy.iid = 'e' + uid();
    firstEnemy.hp = firstEnemy.bHp;
    firstEnemy.maxHp = firstEnemy.bHp;
    firstEnemy.atk = firstEnemy.bAtk;
    firstEnemy.item_slots = [];
    firstEnemy.status_effects = [];
    firstEnemy.row = ROW_FRONT;

    setG({
      pl: leader,
      el: el,
      pHp,
      pMaxHp: pHp,
      eHp: el.hp,
      eMaxHp: el.hp,
      pField: [],
      eField: [firstEnemy],
      hand,
      deck,
      turn: 1,
      mana: MANA_START,
      maxMana: MANA_START,
      gold: 10,
      atker: null,
      attackedIds: {},
      abilityUsedIds: {},
      log: ['Battle begins! Defeat ' + el.name + '!', 'Front row blocks back-row attacks unless your unit has BACKSTAB.'],
      mode: options?.mode || 'normal',
      storyChapterId: options?.storyChapterId || null,
      storyRewardGold: options?.storyRewardGold || 0,
      tutorialStep: options?.tutorialStep || 0,
      storyRewardGranted: false,
      shop: [],
      heraBonus: 0,
      susanoCombo: 0,
      pGrave: [],
      eGrave: [],
      pTraps: [],
    });
    setScreen('battle');
    setTimeout(() => {
      playVOX(leader.name, 'intro');
      setTimeout(() => playVOX(el.name, 'intro'), 650);
    }, 200);
  }, [buildStarterDeck]);

  const startTutorialBattle = useCallback(() => {
    const leader = PROPHECY_LEADERS.find((l) => l.id === 'Athena') || PROPHECY_LEADERS[0];
    setSelLeader(leader);
    newGame(leader, { mode: 'tutorial', tutorialStep: 1, enemyLeaderId: 'Hades' });
  }, [newGame]);

  useEffect(() => {
    if (accountLoading) return;
    if (screen !== 'start') return;
    if (!currentUser) return;
    if (!tutorialRequired) return;
    const t = setTimeout(() => {
      startTutorialBattle();
    }, 350);
    return () => clearTimeout(t);
  }, [accountLoading, screen, currentUser, tutorialRequired, startTutorialBattle]);

  const startStoryChapter = useCallback((chapter) => {
    if (!chapter) return;
    const leader = PROPHECY_LEADERS.find((l) => l.id === 'Zeus') || PROPHECY_LEADERS[0];
    setSelLeader(leader);
    newGame(leader, {
      mode: 'story',
      storyChapterId: chapter.id,
      storyRewardGold: chapter.rewardGold || 0,
      enemyLeaderId: chapter.enemyLeaderId,
    });
  }, [newGame]);

  const deploy = useCallback((iid, itemTargetIidArg = null) => {
    let deployedIid = null;
    let deployedCardPreview = null;
    let introVoiceName = null;
    setG((prev) => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex((c) => c.iid === iid);
      if (idx < 0) return prev;
      const c = prev.hand[idx];
      const isMageDiscount = prev.pl.id === 'Merlin' && normalizeClass(c.cls) === 'mage';
      const cost = Math.max(1, (c.cost ?? 1) - (isMageDiscount ? 1 : 0));
      if (prev.mana < cost) return prev;
      const cardType = c.cardType || CARD_TYPE.GOD;
      const hand = prev.hand.filter((_, i) => i !== idx);

      if (cardType === CARD_TYPE.ITEM) {
        if (!prev.pField.length) {
          return { ...prev, log: [...prev.log, 'Play a god unit first to use items.'] };
        }
        const target = prev.pField.find((u) => u.iid === itemTargetIidArg) || [...prev.pField].sort((a, b) => b.atk - a.atk)[0];
        if ((target.item_slots || []).length >= SMITE_WARS_SYSTEM.MAX_ITEM_SLOTS_PER_UNIT) {
          return { ...prev, log: [...prev.log, `${target.name} already has max items.`] };
        }
        const pField = prev.pField.map((u) => {
          if (u.iid !== target.iid) return u;
          const scalar = getItemScalar(u, c);
          const hpBonus = Math.round((c.hpBoost ?? 0) * scalar);
          const newMaxHp = u.maxHp + hpBonus;
          return {
            ...u,
            maxHp: newMaxHp,
            hp: Math.min(newMaxHp, u.hp),
            item_slots: [...(u.item_slots || []), { ...c, statType: getItemStatType(c) }],
          };
        });
        deployedCardPreview = cloneObj(c);
        return {
          ...prev,
          hand,
          mana: prev.mana - cost,
          pField,
          log: [...prev.log, `${c.name} boosted ${target.name}!`],
        };
      }
      if (cardType === CARD_TYPE.SPELL) {
        introVoiceName = c.baseGodName || null;
        deployedCardPreview = cloneObj(c);
        return {
          ...prev,
          hand,
          mana: prev.mana - cost,
          log: [...prev.log, `${c.name} cast: ${c.description || 'Spell resolves.'}`],
        };
      }

      if (cardType === CARD_TYPE.TRAP) {
        if ((prev.pTraps || []).length >= SMITE_WARS_SYSTEM.MAX_TRAPS_ACTIVE) {
          return { ...prev, log: [...prev.log, `You can only have ${SMITE_WARS_SYSTEM.MAX_TRAPS_ACTIVE} active traps.`] };
        }
        introVoiceName = c.baseGodName || null;
        deployedCardPreview = { ...c, row: ROW_BACK };
        return {
          ...prev,
          hand,
          mana: prev.mana - cost,
          pTraps: [...(prev.pTraps || []), { ...c, iid: uid(), row: ROW_BACK }],
          log: [...prev.log, `${c.name} set in your spell/trap row.`],
        };
      }

      if (prev.pField.length >= MAX_FIELD) return prev;
      let hp = c.bHp,
        atk = c.bAtk;
      if (prev.pl.id === 'Odin') hp = Math.round(hp * 1.1);
      if (prev.pl.id === 'Bellona' && normalizeClass(c.cls) === 'warrior') atk += 2;
      const u = cloneObj(c);
      u.iid = uid();
      u.rank = 1;
      u.hp = hp;
      u.maxHp = hp;
      u.atk = atk;
      u.item_slots = [];
      u.status_effects = [];
      u.row = ROW_FRONT;
      introVoiceName = u.name || c.baseGodName || null;
      deployedIid = u.iid;
      deployedCardPreview = cloneObj(u);
      return {
        ...prev,
        hand,
        mana: prev.mana - cost,
        pField: [...prev.pField, u],
      };
    });
    if (deployedIid) triggerDeployFx(deployedIid);
    if (deployedCardPreview) triggerPlayPreview(deployedCardPreview);
    if (introVoiceName) playVOX(introVoiceName, 'intro');
  }, [triggerDeployFx, triggerPlayPreview]);

  const selectAtk = useCallback((iid) => {
    setG((prev) => (prev ? { ...prev, atker: iid } : prev));
  }, []);

  const castAbility = useCallback((iid) => {
    let casterName = null;
    setG((prev) => {
      if (!prev) return prev;
      const caster = prev.pField.find((u) => u.iid === iid);
      if (!caster) return prev;
      if (hasStatus(caster, 'STUNNED')) return { ...prev, log: [...prev.log, `${caster.name} is stunned and cannot cast.`] };
      if (prev.abilityUsedIds?.[iid]) return { ...prev, log: [...prev.log, `${caster.name} already used an ability this turn.`] };

      const abilityDisplay = getAbilityDisplay(caster);
      const tpl = abilityDisplay.mechanics;
      const abilityName = abilityDisplay.name;
      const cost = getAbilityCost(caster);
      if (prev.mana < cost) return { ...prev, log: [...prev.log, `Not enough mana for ${abilityName}.`] };

      casterName = caster.name;
      let pField = [...prev.pField];
      let eField = [...prev.eField];
      let eHp = prev.eHp;
      let pHp = prev.pHp;
      let eGrave = [...(prev.eGrave || [])];
      let pGrave = [...(prev.pGrave || [])];
      let gold = prev.gold;
      const log = [...prev.log, `${caster.name} casts ${tpl.icon || ''} ${abilityName}.`];

      const killEnemy = (unit, nextHp) => {
        eField = eField.filter((u) => u.iid !== unit.iid);
        eGrave.push({ ...unit, hp: 0, diedTurn: prev.turn });
        gold += GOLD_PER_RARITY[unit.rarity] ?? 1;
        log.push(`${unit.name} is destroyed by ${abilityName}.`);
      };

      if (tpl.type === 'guardian_heal') {
        pField = pField.map((u) => {
          if (u.iid !== iid) return u;
          return { ...u, hp: Math.min(u.maxHp, u.hp + Number(tpl.valueA || 20)) };
        });
      } else if (tpl.type === 'warrior_empower') {
        pField = pField.map((u) => {
          if (u.iid !== iid) return u;
          const effects = normalizeStatusEffects(u.status_effects).filter((s) => s.type !== 'EMPOWERED');
          return { ...u, status_effects: [...effects, { type: 'EMPOWERED', value: 0, duration_turns: 1 }] };
        });
      } else if (tpl.type === 'assassin_execute') {
        const target = [...eField].sort((a, b) => a.hp - b.hp)[0];
        if (target) {
          const damage = Number(tpl.valueA || 14);
          const nextHp = target.hp - damage;
          eField = eField.map((u) => (u.iid === target.iid ? { ...u, hp: nextHp } : u));
          log.push(`${target.name} takes ${damage} from ${abilityName}.`);
          if (nextHp <= 0) killEnemy(target, nextHp);
        } else {
          const damage = Math.max(8, Number(tpl.valueA || 14) - 2);
          eHp = Math.max(0, eHp - damage);
          log.push(`${prev.el.name} takes ${damage} from ${abilityName}.`);
        }
      } else if (tpl.type === 'mage_burst') {
        if (eField.length) {
          const damage = Number(tpl.valueA || 10);
          const nextEnemies = [];
          eField.forEach((enemy) => {
            const nextHp = enemy.hp - damage;
            if (nextHp <= 0) {
              killEnemy(enemy, nextHp);
            } else {
              nextEnemies.push({ ...enemy, hp: nextHp });
            }
          });
          eField = nextEnemies;
          log.push(`Arcane damage hits all enemy units for ${damage}.`);
        } else {
          const damage = Number(tpl.valueA || 10);
          eHp = Math.max(0, eHp - damage);
          log.push(`${prev.el.name} takes ${damage} from ${abilityName}.`);
        }
      } else if (tpl.type === 'hunter_volley') {
        const target = eField[0];
        if (target) {
          const damage = Number(tpl.valueA || 9);
          const nextHp = target.hp - damage;
          eField = eField.map((u) => (u.iid === target.iid ? { ...u, hp: nextHp } : u));
          log.push(`${target.name} takes ${damage} from ${abilityName}.`);
          if (nextHp <= 0) killEnemy(target, nextHp);
        } else {
          const damage = Math.max(6, Number(tpl.valueA || 9) - 2);
          eHp = Math.max(0, eHp - damage);
          log.push(`${prev.el.name} takes ${damage} from ${abilityName}.`);
        }
      }

      // Passive support for Thanatos identity.
      if (prev.pl.id === 'Thanatos') {
        pHp = Math.min(prev.pMaxHp, pHp + 4);
      }

      return {
        ...prev,
        mana: prev.mana - cost,
        pField,
        eField,
        eHp,
        pHp,
        gold,
        pGrave,
        eGrave,
        abilityUsedIds: { ...(prev.abilityUsedIds || {}), [iid]: true },
        log,
      };
    });
    if (casterName) playVOX(casterName, 'intro');
  }, []);

  const doAttack = useCallback((targetIid, isLeader) => {
    let attackerIid = null;
    let attackerName = null;
    let enemyLeaderName = null;
    let enemyLeaderHit = false;
    let enemyLeaderKilledByAttack = false;
    let enemyUnitKilled = null;
    let attackerDied = null;
    let hitTargetKey = null;
    let damageTargetKey = null;
    let damageAmount = 0;
    let deathTargetKey = null;
    let deathLabel = '';
    let counterTargetKey = null;
    let counterAmount = 0;
    let counterDeathTargetKey = null;
    let counterDeathLabel = '';
    setG((prev) => {
      if (!prev) return prev;
      const att = prev.pField.find((u) => u.iid === prev.atker);
      if (!att) return { ...prev, atker: null };
      if (hasStatus(att, 'STUNNED')) {
        return { ...prev, atker: null, log: [...prev.log, `${att.name} is stunned and cannot attack.`] };
      }
      attackerIid = prev.atker;
      attackerName = att.name;
      enemyLeaderName = prev.el?.name;
      const firstAttackThisTurn = !prev.attackedIds?.[att.iid];
      const backstabActive = hasKeyword(att, 'BACKSTAB') && firstAttackThisTurn;

      let eHp = prev.eHp;
      let eField = [...prev.eField];
      let pField = [...prev.pField];
      let gold = prev.gold;
      let log = [...prev.log];
      let pGrave = [...(prev.pGrave || [])];
      let eGrave = [...(prev.eGrave || [])];
      const tauntEnemies = findTauntUnits(eField);
      const enemyFrontUnits = eField.filter((u) => normalizeFieldRow(u.row) === ROW_FRONT);

      if (isLeader && enemyFrontUnits.length) {
        return { ...prev, atker: null, log: [...prev.log, 'Front row units protect the enemy Leader. Clear front row first.'] };
      }
      if (!isLeader && tauntEnemies.length && !backstabActive) {
        const targetIsTaunt = tauntEnemies.some((u) => u.iid === targetIid);
        if (!targetIsTaunt) {
          return { ...prev, atker: null, log: [...prev.log, 'A Taunt unit blocks your attack target.'] };
        }
      }
      if (!isLeader && enemyFrontUnits.length && !backstabActive) {
        const targetUnit = eField.find((u) => u.iid === targetIid);
        const targetInBackRow = targetUnit && normalizeFieldRow(targetUnit.row) === ROW_BACK;
        if (targetInBackRow) {
          return { ...prev, atker: null, log: [...prev.log, 'Front row blocks attacks on back row units.'] };
        }
      }

      let dmg = computeUnitAttack(att) + (prev.heraBonus || 0);
      if (hasStatus(att, 'EMPOWERED')) dmg = Math.round(dmg * SMITE_WARS_SYSTEM.EMPOWERED_DAMAGE_MULTIPLIER);
      if (backstabActive) dmg = Math.round(dmg * SMITE_WARS_SYSTEM.BACKSTAB_MULTIPLIER);
      if (prev.pl.id === 'Thor' && normalizeClass(att.cls) === 'warrior') dmg = Math.round(dmg * 1.2);
      const susanoCombo = prev.susanoCombo + 1;
      if (prev.pl.id === 'Susano') dmg += susanoCombo * 5;

      if (isLeader) {
        eHp = Math.max(0, prev.eHp - dmg);
        hitTargetKey = 'enemy_leader';
        damageTargetKey = 'enemy_leader';
        damageAmount = dmg;
        enemyLeaderHit = true;
        enemyLeaderKilledByAttack = eHp <= 0;
        log.push(`${att.name} hits ${prev.el.name} for ${dmg}!`);
      } else {
        const tgt = eField.find((u) => u.iid === targetIid);
        if (!tgt) return { ...prev, atker: null };
        const tgtNewHp = tgt.hp - dmg;
        hitTargetKey = `enemy_${targetIid}`;
        damageTargetKey = `enemy_${targetIid}`;
        damageAmount = dmg;
        eField = eField.map((u) => (u.iid === targetIid ? { ...u, hp: tgtNewHp } : u));
        log.push(`${att.name} deals ${dmg} to ${tgt.name}.`);

        const targetDied = tgtNewHp <= 0;
        if (targetDied) {
          eField = eField.filter((u) => u.iid !== tgt.iid);
          eGrave.push({ ...tgt, diedTurn: prev.turn, hp: 0 });
          enemyUnitKilled = tgt.name;
          deathTargetKey = `enemy_${targetIid}`;
          deathLabel = tgt.name;
          gold += GOLD_PER_RARITY[tgt.rarity] ?? 1;
          log.push(`${tgt.name} defeated! +${GOLD_PER_RARITY[tgt.rarity] ?? 1} gold`);
        }

        // Counter attack unless attacker has RANGED.
        if (!targetDied && !hasKeyword(att, 'RANGED')) {
          const liveTarget = eField.find((u) => u.iid === targetIid);
          const counterDamage = liveTarget ? computeUnitAttack(liveTarget) : 0;
          if (counterDamage > 0) {
            pField = pField.map((u) => (u.iid === prev.atker ? { ...u, hp: u.hp - counterDamage } : u));
            counterTargetKey = `player_${prev.atker}`;
            counterAmount = counterDamage;
            log.push(`${tgt.name} counters for ${counterDamage}.`);
          }
        }

        const attNew = pField.find((u) => u.iid === prev.atker);
        if (attNew && attNew.hp <= 0) {
          pField = pField.filter((u) => u.iid !== prev.atker);
          attackerDied = attNew.name;
          counterDeathTargetKey = `player_${prev.atker}`;
          counterDeathLabel = attNew.name;
          pGrave.push({ ...attNew, diedTurn: prev.turn, hp: 0 });
        }
      }

      const attackedIds = { ...prev.attackedIds, [prev.atker]: true };
      return {
        ...prev,
        eHp,
        eField,
        pField,
        gold,
        heraBonus: prev.heraBonus ?? 0,
        susanoCombo: prev.pl?.id === 'Susano' ? susanoCombo : 0,
        log,
        atker: null,
        attackedIds,
        pGrave,
        eGrave,
      };
    });
    if (attackerIid) {
      setAttackAnimating(attackerIid);
      setTimeout(() => setAttackAnimating(null), 450);
      if (attackerName) playVOX(attackerName, 'gruntAttack');
      if (enemyLeaderHit) playVOX(enemyLeaderName || '', 'grunthit');
      if (enemyUnitKilled) playVOX(attackerName || '', 'kill');
      if (attackerDied) playVOX(attackerDied, 'grunthit');
      if (enemyLeaderKilledByAttack) playVOX(attackerName || '', 'victory');
    }
    if (hitTargetKey) triggerHitFx(hitTargetKey);
    if (damageTargetKey && damageAmount > 0) triggerDamageFx(damageTargetKey, damageAmount);
    if (deathTargetKey) triggerDeathFx(deathTargetKey, deathLabel || 'Defeated');
    if (counterTargetKey && counterAmount > 0) triggerDamageFx(counterTargetKey, counterAmount);
    if (counterDeathTargetKey) triggerDeathFx(counterDeathTargetKey, counterDeathLabel || 'Defeated');
  }, [triggerDamageFx, triggerDeathFx, triggerHitFx]);

  const endTurn = useCallback(() => {
    setG((prev) => {
      if (!prev) return prev;
      let eField = [...prev.eField];
      let eHp = prev.eHp;
      let eGrave = [...(prev.eGrave || [])];
      if (prev.pl.id === 'Zeus') {
        const d = 15;
        if (eField.length) {
          const t = eField[Math.floor(Math.random() * eField.length)];
          t.hp -= d;
          if (t.hp <= 0) {
            eField = eField.filter((u) => u.iid !== t.iid);
            eGrave.push({ ...t, diedTurn: prev.turn });
          }
        } else eHp = Math.max(0, eHp - d);
      }
      if (prev.pl.id === 'Poseidon' && prev.turn === 3) {
        eField = eField.map((u) => ({ ...u, hp: u.hp - 10 }));
        const dead = eField.filter((u) => u.hp <= 0);
        if (dead.length) eGrave = [...eGrave, ...dead.map((u) => ({ ...u, diedTurn: prev.turn }))];
        eField = eField.filter((u) => u.hp > 0);
        eHp = Math.max(0, eHp - 10);
      }
      return { ...prev, atker: null, eField, eHp, eGrave };
    });
    setTimeout(() => {
      setG((prev) => {
        if (!prev) return prev;
        let eField = [...prev.eField];
        let pField = [...prev.pField];
        let pHp = prev.pHp;
        let eHp = prev.eHp;
        let gold = prev.gold;
        let log = [...prev.log];
        let pTraps = [...(prev.pTraps || [])];
        let pGrave = [...(prev.pGrave || [])];
        let eGrave = [...(prev.eGrave || [])];
        const actingEnemies = [...eField];
        actingEnemies.forEach((enemyBase) => {
          const eu = eField.find((x) => x.iid === enemyBase.iid);
          if (!eu || hasStatus(eu, 'STUNNED')) return;
          playVOX(eu.name, 'gruntAttack');
          if (pField.length) {
            const tauntTargets = findTauntUnits(pField);
            const backstabActive = hasKeyword(eu, 'BACKSTAB');
            const playerFrontUnits = pField.filter((u) => normalizeFieldRow(u.row) === ROW_FRONT);
            let target = null;
            if (tauntTargets.length && !backstabActive) {
              const frontTaunts = tauntTargets.filter((u) => normalizeFieldRow(u.row) === ROW_FRONT);
              target = frontTaunts[0] || tauntTargets[0];
            } else if (backstabActive) {
              target = pField.find((u) => normalizeClass(u.cls) === 'mage' || normalizeClass(u.cls) === 'hunter') || pField[0];
            } else if (playerFrontUnits.length) {
              target = playerFrontUnits[0];
            } else {
              target = pField[0];
            }
            if (!target) return;

            let damage = computeUnitAttack(eu);
            if (backstabActive) damage = Math.round(damage * SMITE_WARS_SYSTEM.BACKSTAB_MULTIPLIER);

            const targetNextHp = target.hp - damage;
            pField = pField.map((u) => (u.iid === target.iid ? { ...u, hp: targetNextHp } : u));
            log.push(`${eu.name} hits ${target.name} for ${damage}.`);
            playVOX(target.name, 'grunthit');

            let targetDied = false;
            if (targetNextHp <= 0) {
              targetDied = true;
              pField = pField.filter((u) => u.iid !== target.iid);
              pGrave.push({ ...target, hp: 0, diedTurn: prev.turn });
              playVOX(eu.name, 'kill');
            }

            // Player unit counters unless enemy unit has RANGED.
            if (!targetDied && !hasKeyword(eu, 'RANGED')) {
              const liveTarget = pField.find((u) => u.iid === target.iid);
              const counter = liveTarget ? computeUnitAttack(liveTarget) : 0;
              if (counter > 0) {
                const enemyNextHp = eu.hp - counter;
                eField = eField.map((u) => (u.iid === eu.iid ? { ...u, hp: enemyNextHp } : u));
                log.push(`${target.name} counters ${eu.name} for ${counter}.`);
                if (enemyNextHp <= 0) {
                  eField = eField.filter((u) => u.iid !== eu.iid);
                  eGrave.push({ ...eu, hp: 0, diedTurn: prev.turn });
                  gold += GOLD_PER_RARITY[eu.rarity] ?? 1;
                  playVOX(prev.pl.name, 'kill');
                }
              }
            }
          } else {
            if (pTraps.length) {
              const [trap, ...restTraps] = pTraps;
              pTraps = restTraps;
              triggerPlayPreview(cloneObj(trap));
              const reflected = trap.damage ?? 16;
              const target = eField.find((u) => u.iid === eu.iid);
              if (target) {
                const nextHp = target.hp - reflected;
                eField = eField.map((u) => (u.iid === eu.iid ? { ...u, hp: nextHp } : u));
                log.push(`${trap.name} triggers! ${eu.name} takes ${reflected}.`);
                playVOX(eu.name, 'grunthit');
                if (nextHp <= 0) {
                  eField = eField.filter((u) => u.iid !== eu.iid);
                  eGrave.push({ ...target, hp: 0, diedTurn: prev.turn });
                  gold += GOLD_PER_RARITY[target.rarity] ?? 1;
                  playVOX(prev.pl.name, 'kill');
                }
              }
              return;
            }
            const d2 = computeUnitAttack(eu);
            pHp = Math.max(0, pHp - d2);
            log.push(`${eu.name} hits you for ${d2}!`);
            playVOX(prev.pl.name, 'grunthit');
          }
        });
        if (!eField.length && !pField.length) {
          const ld = Math.max(1, Math.round(prev.el.atk * 0.55));
          pHp = Math.max(0, pHp - ld);
          log.push(prev.el.name + ' attacks you for ' + ld + '!');
          playVOX(prev.el.name, 'gruntAttack');
          playVOX(prev.pl.name, 'grunthit');
        }
        if (prev.turn % 2 === 0 && eField.length < MAX_FIELD) {
          const maxR = Math.min(Math.floor(prev.turn / 3), RARITY_ORDER.length - 2);
          const pool = getUnitsByRarity(maxR);
          const u = cloneObj(pool[Math.floor(Math.random() * pool.length)]);
          u.rank = 1;
          u.iid = 'e' + uid();
          u.hp = u.bHp;
          u.maxHp = u.bHp;
          u.atk = u.bAtk;
          u.item_slots = [];
          u.status_effects = [];
          u.row = ROW_FRONT;
          eField.push(u);
          log.push(prev.el.name + ' summons a unit!');
        }
        const turn = prev.turn + 1;
        const maxMana = Math.min(10, turn + 2);
        const deck = [...prev.deck];
        let hand = [...prev.hand];
        if (deck.length) {
          const c = deck.pop();
          c.iid = uid();
          if (!c.cardType) c.cardType = CARD_TYPE.GOD;
          hand.push(c);
        } else {
          for (let i = 0; i < 4; i++) deck.push(generateRandomCard(turn));
          shuffle(deck);
          const c = deck.pop();
          c.iid = uid();
          if (!c.cardType) c.cardType = CARD_TYPE.GOD;
          hand.push(c);
        }

        // Phase 6: status effects tick at end of round.
        const tickStatuses = (units, ownerTag) => {
          const survivors = [];
          const dead = [];
          units.forEach((unit) => {
            const effects = normalizeStatusEffects(unit.status_effects);
            let hp = unit.hp;
            effects.forEach((effect) => {
              if (effect.type === 'BURNING') {
                const damage = Number(effect.value || SMITE_WARS_SYSTEM.STATUS_DEFAULT_BURN);
                hp -= damage;
                log.push(`${unit.name} takes ${damage} burn damage.`);
              } else if (effect.type === 'POISONED') {
                const damage = Number(effect.value || SMITE_WARS_SYSTEM.STATUS_DEFAULT_POISON);
                hp -= damage;
                log.push(`${unit.name} takes ${damage} poison damage.`);
              }
            });
            const nextEffects = effects
              .map((e) => ({ ...e, duration_turns: Number(e.duration_turns || 0) - 1 }))
              .filter((e) => e.duration_turns > 0);
            const nextUnit = { ...unit, hp, status_effects: nextEffects };
            if (hp <= 0) dead.push(nextUnit);
            else survivors.push(nextUnit);
          });
          if (dead.length) {
            log.push(`${ownerTag}: ${dead.map((u) => u.name).join(', ')} expired from status effects.`);
          }
          return { survivors, dead };
        };

        const playerStatus = tickStatuses(pField, 'Allies');
        pField = playerStatus.survivors;
        if (playerStatus.dead.length) {
          pGrave = [...pGrave, ...playerStatus.dead.map((u) => ({ ...u, hp: 0, diedTurn: turn }))];
        }

        const enemyStatus = tickStatuses(eField, 'Enemies');
        eField = enemyStatus.survivors;
        if (enemyStatus.dead.length) {
          eGrave = [...eGrave, ...enemyStatus.dead.map((u) => ({ ...u, hp: 0, diedTurn: turn }))];
          gold += enemyStatus.dead.reduce((sum, u) => sum + (GOLD_PER_RARITY[u.rarity] ?? 1), 0);
        }

        return {
          ...prev,
          eField,
          pField,
          pHp,
          eHp,
          turn,
          maxMana,
          mana: maxMana,
          deck,
          hand,
          gold,
          log,
          attackedIds: {},
          abilityUsedIds: {},
          susanoCombo: 0,
          pTraps,
          pGrave,
          eGrave,
        };
      });
    }, 400);
  }, [generateRandomCard, triggerPlayPreview]);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    if (G.eHp <= 0) setScreen('gameover');
    else if (G.pHp <= 0) setScreen('gameover');
  }, [G?.eHp, G?.pHp, screen, G]);

  const refreshShop = useCallback(() => {
    setG((prev) => {
      if (!prev) return prev;
      const maxR = Math.min(Math.floor(prev.turn / 2), RARITY_ORDER.length - 1);
      const avail = getUnitsByRarity(maxR).map((u) => ({ ...u, cardType: CARD_TYPE.GOD }));
      const sh = [...avail, ...ITEM_CARDS, ...TRAP_CARDS, ...SPELL_CARDS].sort(() => Math.random() - 0.5);
      return { ...prev, shop: sh.slice(0, 6) };
    });
  }, []);

  const buyCard = useCallback((id) => {
    setG((prev) => {
      if (!prev) return prev;
      const u = prev.shop.find((x) => x.id === id);
      if (!u) return prev;
      const cost = u.cost * 2;
      if (prev.gold < cost) return prev;
      if ((u.cardType || CARD_TYPE.GOD) !== CARD_TYPE.GOD) {
        const c = cloneObj(u);
        c.iid = uid();
        return {
          ...prev,
          gold: prev.gold - cost,
          deck: [...prev.deck, c],
          log: [...prev.log, `${u.name} added to deck!`],
        };
      }
      const exist = prev.pField.find((x) => x.id === id && x.rank < 5);
      if (exist) {
        const pField = prev.pField.map((x) => {
          if (x.iid !== exist.iid) return x;
          const rank = x.rank + 1;
          const m = getRankMultiplier(rank);
          return {
            ...x,
            rank,
            maxHp: Math.round(u.bHp * m),
            hp: Math.min(Math.round(u.bHp * m), Math.max(1, Math.round(x.hp * (m / getRankMultiplier(x.rank || 1))))),
            atk: Math.round(u.bAtk * m),
          };
        });
        return { ...prev, gold: prev.gold - cost, pField, log: [...prev.log, u.name + ' ranked up!'] };
      }
      const c = cloneObj(u);
      c.iid = uid();
      return {
        ...prev,
        gold: prev.gold - cost,
        deck: [...prev.deck, c],
        log: [...prev.log, u.name + ' added to deck!'],
      };
    });
    setShopVisible(false);
  }, []);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    if (G.eHp <= 0 || G.pHp <= 0) setScreen('gameover');
  }, [G?.eHp, G?.pHp, screen, G]);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    const pLow = G.pHp <= G.pMaxHp * 0.25;
    const eLow = G.eHp <= G.eMaxHp * 0.25;
    if (pLow && !lowHpPlayedRef.current.p) {
      playVOX(G.pl.name, 'health_low');
      lowHpPlayedRef.current.p = true;
    }
    if (eLow && !lowHpPlayedRef.current.e) {
      playVOX(G.el.name, 'health_low');
      lowHpPlayedRef.current.e = true;
    }
    if (!pLow) lowHpPlayedRef.current.p = false;
    if (!eLow) lowHpPlayedRef.current.e = false;
  }, [G?.pHp, G?.eHp, G?.pMaxHp, G?.eMaxHp, G?.pl?.name, G?.el?.name, screen, G]);

  useEffect(() => {
    if (!G || screen !== 'gameover') return;
    if (G.eHp <= 0) {
      playVOX(G.pl.name, 'victory');
      playVOX(G.el.name, 'defeat');
    } else if (G.pHp <= 0) {
      playVOX(G.el.name, 'victory');
      playVOX(G.pl.name, 'defeat');
    }
  }, [screen, G]);
  useEffect(() => {
    if (!G || screen !== 'gameover') return;
    if (G.mode !== 'tutorial') return;
    if (G.eHp > 0) return; // must complete tutorial (win) for rewards
    if (tutorialStatus.rewarded) return;

    let nextGold = null;
    setMetaGold((prev) => {
      nextGold = prev + TUTORIAL_REWARD_GOLD;
      return nextGold;
    });
    setProfileData((prev) => (prev ? { ...prev, gold: (Number(prev.gold || 0) + TUTORIAL_REWARD_GOLD) } : prev));
    openPack(TUTORIAL_REWARD_PACK);

    const nextStatus = { completed: true, skipped: false, rewarded: true };
    setTutorialStatus(nextStatus);
    saveTutorialStatus(nextStatus);

    if (currentUser) {
      (async () => {
        try {
          await supabase.rpc('set_current_user', { username_param: currentUser });
        } catch (_) {}
        if (nextGold != null) {
          await supabase.from('user_data').update({ gold: nextGold }).eq('username', currentUser);
        }
      })();
    }
  }, [G, screen, tutorialStatus.rewarded, openPack, saveTutorialStatus, currentUser]);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    if (G.mode !== 'tutorial') return;
    setG((prev) => {
      if (!prev || prev.mode !== 'tutorial') return prev;
      let nextStep = prev.tutorialStep || 1;
      if (nextStep === 1 && prev.pField.length >= 1) nextStep = 2;
      if (nextStep === 2 && Object.keys(prev.attackedIds || {}).length >= 1) nextStep = 3;
      if (nextStep === 3 && prev.turn >= 3) nextStep = 4;
      if (nextStep === prev.tutorialStep) return prev;
      return { ...prev, tutorialStep: nextStep };
    });
  }, [G?.mode, G?.tutorialStep, G?.pField?.length, G?.turn, G?.attackedIds, screen, G]);

  useEffect(() => {
    if (!G || screen !== 'gameover') return;
    if (G.mode !== 'story' || G.storyRewardGranted || G.eHp > 0) return;
    const reward = Number(G.storyRewardGold || 0);
    if (reward > 0) setMetaGold((prev) => prev + reward);
    setStoryProgress((prev) => {
      const chapterIdx = STORY_CHAPTERS.findIndex((c) => c.id === G.storyChapterId);
      if (chapterIdx < 0) return prev;
      return Math.max(prev, chapterIdx + 1);
    });
    setG((prev) => (prev ? { ...prev, storyRewardGranted: true } : prev));
  }, [G?.mode, G?.storyRewardGold, G?.storyChapterId, G?.storyRewardGranted, G?.eHp, screen, G]);

  useEffect(() => {
    return () => {
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
      if (combatFxTimersRef.current.hit) clearTimeout(combatFxTimersRef.current.hit);
      if (combatFxTimersRef.current.damage) clearTimeout(combatFxTimersRef.current.damage);
      if (combatFxTimersRef.current.death) clearTimeout(combatFxTimersRef.current.death);
      if (combatFxTimersRef.current.deploy) clearTimeout(combatFxTimersRef.current.deploy);
      if (combatFxTimersRef.current.preview) clearTimeout(combatFxTimersRef.current.preview);
    };
  }, []);

  const markSkinArtFailed = useCallback((artKey) => {
    if (!artKey) return;
    setFailedSkinArts((prev) => (prev[artKey] ? prev : { ...prev, [artKey]: true }));
  }, []);

  // Card art from Wallpapers/skins with fallback handling.
  const getCardArtSource = useCallback((card, artKey) => {
    const rawGodName = card?.baseGodName || card?.name || '';
    const godName = String(rawGodName)
      .replace(/\s*\[foil\]\s*$/i, '')
      .trim();
    const skinPath = card?.visuals?.skin_path || card?.altSkinPath || null;
    if (skinPath) {
      const skinImage = getSkinImage(skinPath);
      if (skinImage?.primary || skinImage?.fallback) {
        const primarySource = skinImage?.primary || skinImage;
        const fallbackSource = skinImage?.fallback || null;
        if (failedSkinArts[artKey] && fallbackSource) return fallbackSource;
        return primarySource;
      }
      if (skinImage?.uri) return skinImage;
    }
    const wallpaper = getWallpaperByGodName(godName);
    if (wallpaper?.uri) return wallpaper;
    const icon = getRemoteGodIconByName(godName);
    return icon?.uri ? { uri: icon.uri } : icon;
  }, [failedSkinArts]);

  // Full card art: fillContainer = true for collection (art fills frame, no empty space)
  const renderCardArt = (card, width, height, rounded = 4, fillContainer = false, artKey = null) => {
    const src = getCardArtSource(card, artKey || String(card?.id || card?.name || 'card'));
    if (fillContainer) {
      const fillStyle = { width: '100%', height: '100%', borderRadius: rounded };
      if (!src || !src.uri) return <View style={[styles.cardArtPlaceholder, fillStyle]}><Text style={styles.godIconPlaceholderText}>?</Text></View>;
      return <Image source={src} style={fillStyle} contentFit="cover" onError={() => markSkinArtFailed(artKey)} />;
    }
    if (!src || !src.uri) return <View style={[styles.cardArtPlaceholder, { width, height }]}><Text style={styles.godIconPlaceholderText}>?</Text></View>;
    return <Image source={src} style={{ width, height, borderRadius: rounded }} contentFit="contain" onError={() => markSkinArtFailed(artKey)} />;
  };

  // Leaders use god icons (circular), not card art
  const renderLeaderIcon = (godName, size = 44) => {
    const src = getRemoteGodIconByName(godName);
    if (!src || !src.uri) return <View style={[styles.godIconPlaceholder, { width: size, height: size }]}><Text style={styles.godIconPlaceholderText}>?</Text></View>;
    return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  };

  const getCardTypeLabel = (card) => {
    const t = card?.cardType || CARD_TYPE.GOD;
    if (t === CARD_TYPE.ITEM) return 'ITEM';
    if (t === CARD_TYPE.TRAP) return 'TRAP';
    if (t === CARD_TYPE.SPELL) return 'SPELL';
    return 'GOD';
  };
  const getCardClassLabel = useCallback((card) => {
    if (card?.cls) return card.cls;
    const t = card?.cardType || CARD_TYPE.GOD;
    if (t === CARD_TYPE.GOD) return 'Unclassified';
    if (t === CARD_TYPE.ITEM) return 'Item';
    if (t === CARD_TYPE.TRAP) return 'Trap';
    if (t === CARD_TYPE.SPELL) return 'Spell';
    return 'Other';
  }, []);
  const getCardTypeStyle = (card) => {
    const t = card?.cardType || CARD_TYPE.GOD;
    if (t === CARD_TYPE.ITEM) return styles.typeItem;
    if (t === CARD_TYPE.TRAP) return styles.typeTrap;
    if (t === CARD_TYPE.SPELL) return styles.typeSpell;
    return styles.typeGod;
  };

  const getItemIconForKey = useCallback((iconPath, iconKey) => {
    const iconData = getLocalItemIcon(iconPath || 'Gem.webp');
    if (!iconData) return null;
    const fallbackSource = iconData?.fallback || null;
    const primarySource = iconData?.primary || iconData;
    return failedItemIcons[iconKey] && fallbackSource ? fallbackSource : primarySource;
  }, [failedItemIcons]);

  const getGodAbilityIconFromSource = useCallback((iconSource) => {
    const raw = String(iconSource || '').trim();
    if (!raw.includes('_')) return null;
    const [godTokenRaw, ...abilityParts] = raw.split('_');
    const abilityTokenRaw = abilityParts.join('_');
    if (!godTokenRaw || !abilityTokenRaw) return null;

    const normalizeToken = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const godAliases = {
      jw: 'Jing Wei',
      pos: 'Poseidon',
      disc: 'Discordia',
      hunbatz: 'Hun Batz',
      daji: 'Da Ji',
      hebo: 'He Bo',
      nuwa: 'Nu Wa',
      art: 'Artemis',
      thana: 'Thanatos',
      jorm: 'Jormungandr',
    };

    const godToken = normalizeToken(godTokenRaw);
    const resolvedGodName =
      godAliases[godToken] ||
      GOD_ABILITY_REFERENCE.find((entry) => normalizeToken(entry?.id) === godToken)?.id ||
      GOD_ABILITY_REFERENCE.find((entry) => {
        const id = normalizeToken(entry?.id);
        return id.includes(godToken) || godToken.includes(id);
      })?.id ||
      godTokenRaw;

    const entry = GOD_ABILITY_REFERENCE.find((e) => String(e?.id || '').toLowerCase() === String(resolvedGodName).toLowerCase());
    if (!entry) return getGodAbilityIcon(resolvedGodName, '1');

    const abilityToken = normalizeToken(abilityTokenRaw);
    const slots = [
      { key: '1', name: normalizeToken(entry?.ability1?.name) },
      { key: '2', name: normalizeToken(entry?.ability2?.name) },
      { key: '3', name: normalizeToken(entry?.ability3?.name) },
      { key: '4', name: normalizeToken(entry?.ultimate?.name) },
      { key: 'P', name: normalizeToken(entry?.passive?.name) },
    ];

    const explicitSlotBySource = {
      ymiricewall: '1',
      anhurshiftingsands: '2',
      janusportal: '1',
      bellonashieldbash: '3',
      jormvenomhaze: '1',
      cerberusspiritofdeath: '2',
      artioentanglingvines: '2',
      anhurimpale: '1',
      bellonamasterofwar: '4',
      artemistransgressorsfate: '1',
      zeusdetonatecharge: '3',
      janusunstablevortex: '2',
      amaterasuheavenlyreflection: '2',
      hunbatzsacredmonkey: '2',
      chaacthunderstrike: '1',
      rasearingpain: '4',
      peleeverlastingflame: '3',
      vulcanbackfire: '2',
      poseidontidalsurge: '1',
      radivinlight: '2',
      izanamifadeaway: '3',
      discordiagoldenapple: '4',
      thanatosdeathscent: '2',
      agniflamewave: '2',
      ymirshardsofice: '4',
    };
    const sourceKey = normalizeToken(godTokenRaw + abilityTokenRaw);
    const explicit = explicitSlotBySource[sourceKey];
    if (explicit) {
      const mapped = getGodAbilityIcon(resolvedGodName, explicit);
      if (mapped?.uri) return mapped;
    }

    const match = slots.find((s) => s.name && (s.name.includes(abilityToken) || abilityToken.includes(s.name)));
    return getGodAbilityIcon(resolvedGodName, match?.key || '1');
  }, []);

  const getSpecialCardIconForKey = useCallback((card, iconKey) => {
    const byAbilitySource = getGodAbilityIconFromSource(card?.iconSource);
    if (byAbilitySource?.uri) return byAbilitySource;
    return getItemIconForKey(card?.iconPath, iconKey);
  }, [getGodAbilityIconFromSource, getItemIconForKey]);

  const markItemIconFailed = useCallback((iconKey) => {
    setFailedItemIcons((prev) => (prev[iconKey] ? prev : { ...prev, [iconKey]: true }));
  }, []);

  const renderHandCardFace = (card) => {
    const t = card?.cardType || CARD_TYPE.GOD;
    if (t === CARD_TYPE.GOD) return <View style={styles.handCardArt}>{renderCardArt(card, handArtW, handArtH, 4, false, `hand_${card?.iid || card?.id || card?.name}`)}</View>;
    const iconKey = `hand_${card?.iid || card?.id || 'unknown'}`;
    const icon = getSpecialCardIconForKey(card, iconKey);
    return (
      <View style={[styles.handCardArt, styles.specialCardFace, { width: handArtW, height: handArtH }]}>
        {icon ? (
          <Image
            source={icon}
            style={styles.specialCardItemIcon}
            contentFit="cover"
            onError={() => markItemIconFailed(iconKey)}
          />
        ) : (
          <Text style={styles.specialCardIcon}>✦</Text>
        )}
        <Text style={styles.specialCardName} numberOfLines={1}>{getCardDisplayName(card)}</Text>
      </View>
    );
  };

  const renderShowcaseCard = useCallback((card, key, ownedCount = 0, cardWidth = null, options = null) => {
    const compactView = !!options?.compactView;
    const cardType = card?.cardType || CARD_TYPE.GOD;
    const pantheonIcon = PANTHEON_ICONS[card?.pantheon] || null;
    const isGod = cardType === CARD_TYPE.GOD;
    const atkValue = isGod ? card.bAtk : card.atkBoost || card.damage || 0;
    const defValue = isGod ? Math.round((card.bHp || 0) / 120) : Math.max(1, Math.round((card.cost || 1) / 2));
    const visuals = getCardVisuals(card);
    const pantheonVisual = getPantheonVisualProfile(card?.pantheon);
    const finishLabels = getVisualFinishLabels(visuals);
    const foilLabel = finishLabels[0] || 'Standard';
    const foilAccentLabel = finishLabels[1] || null;
    const showFoilChip = visuals.foil && visuals.foil !== CARD_FOIL_TIER.NONE;
    const foilTheme = getFoilVisualTheme(visuals, pantheonVisual);
    const frameTintStyle = {
      borderColor: foilTheme?.frameBorder || pantheonVisual.accentColor,
      backgroundColor: 'rgba(18,14,24,0.98)',
    };
    const fullArtMode = visuals.has_full_art || visuals.foil === CARD_FOIL_TIER.FULL_ART;
    const isLegendary = String(card?.rarity || '').toLowerCase() === 'legendary';

    return (
      <TouchableOpacity
        key={key}
        style={[styles.showcaseCardWrap, cardWidth != null && { width: cardWidth }]}
        onPress={() => {
          if (isGod && card?.name) playVOX(card.name, 'intro');
          inspectSpinBaseRef.current = 0;
          inspectSpinRef.current = 0;
          inspectFaceBackRef.current = false;
          inspectTiltY.setValue(0);
          setInspectShowBack(false);
          setInspectCard(card);
          resetInspectTilt();
        }}
        activeOpacity={0.95}
      >
        {showFoilChip && foilTheme ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.showcaseOuterFoilHalo,
              { backgroundColor: foilTheme.frameGlow, opacity: 0.34 },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.showcaseFrame,
            frameTintStyle,
            showFoilChip && styles.showcaseFrameFoil,
            showFoilChip && foilTheme ? { shadowColor: foilTheme.frameGlow } : null,
            isLegendary && styles.showcaseFrameLegendary,
            fullArtMode && styles.showcaseFrameFullArt,
          ]}
        >
          <View style={styles.showcaseBanner}>
            <View style={styles.showcaseBannerLeft}>
              {pantheonIcon ? (
                <Image source={pantheonIcon} style={styles.showcasePantheonIcon} contentFit="contain" />
              ) : (
                <View style={styles.showcasePantheonDot} />
              )}
              <Text style={[styles.showcaseBannerText, { color: getPantheonColor(card.pantheon) }]} numberOfLines={1}>
                {`${card.pantheon || 'Neutral'} · ${card.cls || cardType.toUpperCase()}`}
              </Text>
            </View>
            <View style={styles.showcaseBannerRight}>
              <Image source={{ uri: getRarityIconUri(card.rarity) }} style={styles.showcaseRarityIcon} contentFit="contain" />
              <Text style={styles.showcaseCostTag}>{`Cost ${card.cost || 0}`}</Text>
            </View>
          </View>

          <View style={styles.showcaseArt}>
            <View style={[styles.showcasePantheonAura, { backgroundColor: pantheonVisual.auraColor }]} />
            {isGod ? (
              <View style={styles.showcaseArtInner}>
                {renderCardArt(card, 0, 0, 0, true, `showcase_${card.id}_${key}`)}
              </View>
            ) : (
              <View style={styles.showcaseSpecialArt}>
                {(() => {
                  const iconKey = `showcase_${card.id}_${key}`;
                  const iconSource = getSpecialCardIconForKey(card, iconKey);
                  return iconSource ? (
                    <Image
                      source={iconSource}
                      style={styles.showcaseSpecialIcon}
                      contentFit="contain"
                      onError={() => markItemIconFailed(iconKey)}
                    />
                  ) : (
                    <Text style={styles.showcaseSpecialFallback}>✦</Text>
                  );
                })()}
              </View>
            )}
            {showFoilChip && foilTheme ? (
              <>
                <View style={[styles.showcaseFoilColorWash, { backgroundColor: foilTheme.artTint }]} />
                <View style={[styles.showcaseFoilEdgeGlow, { borderColor: foilTheme.frameBorder }]} />
              </>
            ) : null}
            {showFoilChip ? (
              <View
                style={[
                  styles.showcaseFoilSweep,
                  foilTheme ? { backgroundColor: foilTheme.chipBg, borderColor: foilTheme.chipBorder } : null,
                ]}
              >
                <Text style={styles.showcaseFoilSweepText}>{foilLabel}</Text>
              </View>
            ) : null}
            {foilAccentLabel ? (
              <View style={styles.showcasePrismaticTag}>
                <Text style={styles.showcasePrismaticTagText}>{`+ ${foilAccentLabel}`}</Text>
              </View>
            ) : null}
            <View style={styles.showcaseNameOverlay}>
              <Text style={[styles.showcaseName, { color: getPantheonColor(card.pantheon) }]}>{getCardDisplayName(card)}</Text>
              <Text style={[styles.showcaseEpithet, { color: getRarityColor(card.rarity), fontWeight: '700', fontStyle: 'normal' }]}>{getRarityWord(card.rarity)}</Text>
            </View>
          </View>

          <View style={styles.showcaseDivider} />

          <View style={styles.showcaseTextSection}>
            <Text style={styles.showcaseAbilityName}>
              {isGod ? (() => {
                const ability = getAbilityDisplay(card);
                const ultimate = getUltimateDisplay(card);
                return `${ability.name} · ${ultimate.name}`;
              })() : (card.ability?.name || getCardTypeLabel(card))}
            </Text>
            <Text style={styles.showcaseAbilityBody} numberOfLines={3}>
              {isGod
                ? (() => {
                  const ability = getAbilityDisplay(card);
                  const ultimate = getUltimateDisplay(card);
                  const abilityLine = `${ability.name} (${ability.cost}): ${ability.description}`;
                  const ultimateLine = `${ultimate.name}${ultimate.pips ? ` (${ultimate.pips} pips)` : ''}: ${ultimate.description}`;
                  return `${abilityLine}\n${ultimateLine}`;
                })()
                : (card.description || card.ability?.description || card.passive?.description || `Use this ${getCardTypeLabel(card).toLowerCase()} to swing tempo instantly.`)}
            </Text>
            <Text style={styles.showcaseFlavor} numberOfLines={2}>
              {card.flavor || card.description || `"${card.name} enters the war and bends destiny."`}
            </Text>
          </View>

          <View style={styles.showcaseStatsFooter}>
            <View style={styles.showcaseStatCol}>
              <Text style={styles.showcaseStatLabel}>ATK</Text>
              <View style={styles.showcaseStatGem}>
                <Image source={{ uri: STAT_ICONS.strength }} style={[styles.showcaseStatIcon, { tintColor: STAT_ATK_TINT }]} contentFit="contain" />
                <Text style={styles.showcaseGemText}>{atkValue}</Text>
              </View>
            </View>
            <View style={[styles.showcaseStatCol, styles.showcaseCenterStat]}>
              <Text style={styles.showcaseStatLabel}>HP</Text>
              <View style={styles.showcaseStatGem}>
                <Image source={{ uri: STAT_ICONS.health }} style={[styles.showcaseStatIconSmall, { tintColor: STAT_HP_TINT }]} contentFit="contain" />
                <Text style={styles.showcaseGemText}>{isGod ? card.bHp : card.cost || 0}</Text>
              </View>
            </View>
            <View style={styles.showcaseStatCol}>
              <Text style={styles.showcaseStatLabel}>DEF</Text>
              <View style={styles.showcaseStatGem}>
                <Image source={{ uri: STAT_ICONS.physicalProt }} style={[styles.showcaseStatIcon, { tintColor: STAT_DEF_TINT }]} contentFit="contain" />
                <Text style={styles.showcaseGemText}>{defValue}</Text>
              </View>
            </View>
          </View>
        </View>
        {!compactView ? (
          <>
            <View style={styles.showcaseCollector}>
              <Text style={styles.showcaseCollectorText}>
                <Text style={{ color: getPantheonColor(card.pantheon) }}>{getCardDisplayName(card)}</Text>
                <Text style={{ color: getRarityColor(card.rarity), fontWeight: '700' }}>{` · ${getRarityWord(card.rarity)}`}</Text>
              </Text>
              <Text style={styles.showcaseCollectorText}>{`OWNED x${ownedCount}`}</Text>
            </View>
            <View style={styles.showcaseCollectorSub}>
              <Text style={styles.showcaseCollectorSubText} numberOfLines={1}>
                {`Finish: ${finishLabels.join(' + ')}`}
              </Text>
              {visuals.variant_name ? (
                <Text style={styles.showcaseCollectorSubTextAlt} numberOfLines={1}>
                  {`Variant: ${visuals.variant_name}`}
                </Text>
              ) : (
                <Text style={styles.showcaseCollectorSubTextAlt} numberOfLines={1}>
                  {card?.isAlternativeCard && card?.altVariantName ? `Variant: ${card.altVariantName}` : card?.isFoilCard ? 'Variant: Foil' : 'Variant: Base'}
                </Text>
              )}
            </View>
          </>
        ) : null}
      </TouchableOpacity>
    );
  }, [getCardTypeLabel, renderCardArt, getSpecialCardIconForKey, markItemIconFailed, playVOX, resetInspectTilt]);

  const showTip = useCallback((text) => {
    if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    setBattleTip(text);
    setShowBattleTip(true);
    tipTimeoutRef.current = setTimeout(() => {
      setShowBattleTip(false);
    }, 2600);
  }, []);
  const openCardInspect = useCallback((card, zoneLabel = '') => {
    if (!card) return;
    const cardType = getCardTypeLabel(card);
    const rowText = card?.row ? ` • ${String(card.row).toUpperCase()} ROW` : '';
    const zoneText = zoneLabel ? ` • ${zoneLabel}` : '';
    showTip(`${getCardDisplayName(card)} • ${cardType}${rowText}${zoneText}`);
    triggerPlayPreview(cloneObj(card));
    setInspectCard(cloneObj(card));
  }, [showTip, triggerPlayPreview]);

  useEffect(() => {
    if (currentUser) return;
    setOwnedCards((prev) => {
      if (Object.keys(prev).length) return prev;
      const seeded = {};
      customDeck.forEach((card) => {
        seeded[card.id] = (seeded[card.id] || 0) + 1;
      });
      return seeded;
    });
    setDbOwnedCards((prev) => (Object.keys(prev).length ? prev : {}));
  }, [customDeck, currentUser]);

  const getCardsByBucket = useCallback(
    (bucket) => {
      const all = starterPool;
      if (bucket === 'rare_or_less') return all.filter((c) => (rarityIndex[c.rarity] ?? 0) <= (rarityIndex.rare ?? 2));
      if (bucket === 'rare_or_higher') return all.filter((c) => (rarityIndex[c.rarity] ?? 0) >= (rarityIndex.rare ?? 2));
      if (bucket === 'epic_or_higher') return all.filter((c) => (rarityIndex[c.rarity] ?? 0) >= (rarityIndex.epic ?? 3));
      return all.filter((c) => c.rarity === bucket);
    },
    [starterPool, rarityIndex]
  );

  const pullRandomFrom = useCallback((bucket) => {
    const pool = getCardsByBucket(bucket);
    if (!pool.length) return null;
    return cloneObj(pool[Math.floor(Math.random() * pool.length)]);
  }, [getCardsByBucket]);
  const getSkinVariantChance = useCallback((rarity) => {
    const r = String(rarity || 'common').toLowerCase();
    if (r === 'legendary') return 0.45;
    if (r === 'epic') return 0.3;
    if (r === 'rare') return 0.18;
    return 0.08;
  }, []);
  const applyPulledCosmetics = useCallback((card) => {
    const visuals = rollCardVisuals(card);
    const nextVisuals = { ...visuals };
    if (card?.isFoilCard) {
      nextVisuals.foil = getGuaranteedFoilByRarity(card?.rarity);
      if (nextVisuals.foil === CARD_FOIL_TIER.MYTHIC) nextVisuals.foil_accent = CARD_FOIL_TIER.PRISMATIC;
      nextVisuals.variant_type = card?.isAlternativeCard ? 'foil_alternative_card' : 'foil_card';
      nextVisuals.variant_name = card?.isAlternativeCard
        ? `Foil ${card?.altVariantName || card?.name || 'Alternative'}`
        : `Foil ${card?.name || 'Card'}`;
      nextVisuals.skin_path = card?.altSkinPath || nextVisuals.skin_path || null;
      return { ...card, visuals: nextVisuals };
    }
    if (card?.isAlternativeCard) {
      nextVisuals.variant_type = 'alternative_card';
      nextVisuals.variant_name = card?.altVariantName || card?.name || 'Alternative';
      nextVisuals.skin_path = card?.altSkinPath || null;
      return { ...card, visuals: nextVisuals };
    }
    if ((card?.cardType || CARD_TYPE.GOD) === CARD_TYPE.GOD) {
      const skinPool = skinPoolByGod[card.name] || [];
      if (skinPool.length && Math.random() < getSkinVariantChance(card?.rarity)) {
        const pick = skinPool[Math.floor(Math.random() * skinPool.length)];
        nextVisuals.variant_type = 'alternative_card';
        nextVisuals.variant_name = pick?.name || 'Alt Skin';
        nextVisuals.skin_path = pick?.path || null;
      }
    }
    return { ...card, visuals: nextVisuals };
  }, [getSkinVariantChance, skinPoolByGod]);

  const openPack = useCallback((pack) => {
    if (!pack) return;
    if (pack.id === 'daily' && dailyClaimed) return;
    if (pack.costGold > metaGold) return;

    const cards = [];
    const guarantee = Array.isArray(pack.guarantee) ? pack.guarantee : [];
    guarantee.forEach((bucket) => {
      const card = pullRandomFrom(bucket);
      if (card) cards.push(card);
    });
    while (cards.length < pack.cards) {
      const roll = Math.random();
      const bucket = roll < 0.55 ? 'common' : roll < 0.8 ? 'uncommon' : roll < 0.94 ? 'rare' : roll < 0.995 ? 'epic' : 'legendary';
      const card = pullRandomFrom(bucket);
      if (card) cards.push(card);
    }

    let nextGoldComputed = null;
    setMetaGold((prev) => {
      nextGoldComputed = prev - pack.costGold;
      return nextGoldComputed;
    });
    if (pack.id === 'daily') setDailyClaimed(true);
    setOwnedCards((prev) => {
      const next = { ...prev };
      cards.forEach((c) => {
        next[c.id] = (next[c.id] || 0) + 1;
      });
      return next;
    });
    setDbOwnedCards((prev) => {
      const next = { ...prev };
      cards.forEach((c) => {
        next[c.id] = (next[c.id] || 0) + 1;
      });
      return next;
    });
    const visualCards = cards.map((card) => applyPulledCosmetics(card));
    const topRarity = visualCards.reduce((best, card) => {
      const score = rarityIndex[card?.rarity] ?? 0;
      if (!best || score > best.score) return { score, rarity: card?.rarity };
      return best;
    }, null);
    setOwnedVisualOverrides((prev) => {
      const next = { ...prev };
      visualCards.forEach((card) => {
        const incoming = card?.visuals;
        if (!incoming) return;
        const current = next[card.id];
        const inScore = getFoilScore(incoming.foil) + ((incoming.variant_type === 'alternative_card' || incoming.variant_type === 'foil_alternative_card') ? 0.5 : 0);
        const curScore = current ? (getFoilScore(current.foil) + ((current.variant_type === 'alternative_card' || current.variant_type === 'foil_alternative_card') ? 0.5 : 0)) : 0;
        if (!current || inScore >= curScore) next[card.id] = incoming;
      });
      return next;
    });
    setPackRevealCue(getPackRevealCue(topRarity?.rarity || 'common'));
    setPackOpenCards(visualCards);
    setPackOpenVisible(true);
    if (currentUser) {
      const spent = Number(pack.costGold || 0);
      const nextGold = Math.max(0, Number(nextGoldComputed ?? metaGold ?? 0));
      setProfileData((prev) => (prev ? { ...prev, gold: nextGold } : prev));
      (async () => {
        try {
          await supabase.rpc('set_current_user', { username_param: currentUser });
        } catch (_) {}
        const nowIso = new Date().toISOString();
        const userCardRows = visualCards.map((card) => ({
          user_id: currentUser,
          card_id: card.id,
          card_type: toDbCardType(card.cardType),
          rarity: toDbRarity(card.rarity),
          rank: 1,
          is_foil: !!(card?.visuals?.foil && card.visuals.foil !== CARD_FOIL_TIER.NONE),
          source: pack.id === 'daily' ? 'starter_pack' : 'pack_purchase',
          acquired_at: nowIso,
        }));
        await supabase.from('user_cards').insert(userCardRows);
        await supabase.from('user_data').update({ gold: nextGold }).eq('username', currentUser);
        await supabase.from('pack_purchases').insert([{
          user_id: currentUser,
          pack_type: pack.id,
          cost_type: 'GOLD',
          cost_amount: spent,
          cards_received: visualCards.map((c) => c.id),
          purchased_at: nowIso,
        }]);
      })();
    }
  }, [dailyClaimed, metaGold, pullRandomFrom, currentUser, rarityIndex, applyPulledCosmetics]);

  const countById = useMemo(() => {
    const out = {};
    customDeck.forEach((card) => {
      out[card.id] = (out[card.id] || 0) + 1;
    });
    return out;
  }, [customDeck]);

  const addDeckCard = useCallback((card) => {
    setCustomDeck((prev) => {
      if (prev.length >= 30) return prev;
      const copies = prev.filter((c) => c.id === card.id).length;
      const owned = effectiveOwnedCards[card.id] || 0;
      const maxCopies = card.rarity === 'legendary' ? 1 : 2;
      if (copies >= owned) return prev;
      if (copies >= maxCopies) return prev;
      return [...prev, cloneObj(card)];
    });
  }, [effectiveOwnedCards]);

  const removeDeckCard = useCallback((idx) => {
    setCustomDeck((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const autoFillDeck = useCallback(() => {
    setCustomDeck(buildSmartStarterDeck());
  }, []);

  const addRandomDeckCard = useCallback(() => {
    if (!starterPool.length) return;
    const pick = starterPool[Math.floor(Math.random() * starterPool.length)];
    addDeckCard(pick);
  }, [starterPool, addDeckCard]);

  const persistDeckSlots = useCallback(async (nextSlots) => {
    if (currentUser) return;
    try {
      const raw = JSON.stringify(nextSlots);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DECK_SLOT_STORAGE_KEY, raw);
      } else {
        await AsyncStorage.setItem(DECK_SLOT_STORAGE_KEY, raw);
      }
    } catch (_) {}
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) return;
    let alive = true;
    const loadDeckSlots = async () => {
      try {
        let raw = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          raw = window.localStorage.getItem(DECK_SLOT_STORAGE_KEY);
        } else {
          raw = await AsyncStorage.getItem(DECK_SLOT_STORAGE_KEY);
        }
        if (!raw || !alive) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const normalized = Array.from({ length: DECK_SLOT_COUNT }, (_, idx) => parsed[idx] || null);
        setDeckSlots(normalized);
      } catch (_) {}
    };
    loadDeckSlots();
    return () => {
      alive = false;
    };
  }, [currentUser]);

  const buildDeckShareCode = useCallback((cards, leaderId) => {
    const payload = {
      v: 1,
      leaderId: leaderId || null,
      cards: (cards || []).map((c) => c.id),
    };
    return encodeDeckShare(payload);
  }, []);

  const materializeDeckFromIds = useCallback((cardIds) => {
    if (!Array.isArray(cardIds)) return [];
    return cardIds
      .map((id) => starterById[id])
      .filter(Boolean)
      .map((card) => cloneObj(card));
  }, [starterById]);

  const saveDeckSlot = useCallback((idx) => {
    if (idx < 0 || idx >= DECK_SLOT_COUNT) return;
    const cardIds = customDeck.map((c) => c.id);
    const avgCost = Number(computeDeckAvgCost(customDeck) || 0);
    const isValid = validateDeck(customDeck, selLeader?.id).isValid;
    const slot = {
      name: `Deck Slot ${idx + 1}`,
      leaderId: selLeader?.id || null,
      cardIds,
      shareCode: buildDeckShareCode(customDeck, selLeader?.id),
      updatedAt: Date.now(),
    };
    setDeckSlots((prev) => {
      const next = [...prev];
      next[idx] = slot;
      persistDeckSlots(next);
      return next;
    });
    if (currentUser) {
      const currentSlotId = deckSlots[idx]?.id || null;
      (async () => {
        try {
          await supabase.rpc('set_current_user', { username_param: currentUser });
        } catch (_) {}
        const payload = {
          id: currentSlotId || undefined,
          user_id: currentUser,
          name: slot.name.slice(0, 20),
          leader_id: slot.leaderId,
          card_ids: cardIds.slice(0, 30),
          avg_cost: avgCost,
          is_valid: isValid,
          updated_at: new Date().toISOString(),
        };
        const { data: upserted } = await supabase
          .from('decks')
          .upsert([payload], { onConflict: 'id' })
          .select('*');
        if (Array.isArray(upserted) && upserted[0]) {
          const row = upserted[0];
          setSavedDeckRows((prevRows) => {
            const existing = prevRows.findIndex((r) => r.id === row.id);
            if (existing === -1) return [row, ...prevRows].slice(0, 24);
            const nextRows = [...prevRows];
            nextRows[existing] = row;
            return nextRows;
          });
          setDeckSlots((prev) => {
            const next = [...prev];
            next[idx] = { ...slot, id: row.id };
            return next;
          });
        }
      })();
    }
    setDeckShareNotice(`Saved to slot ${idx + 1}.`);
  }, [buildDeckShareCode, customDeck, deckSlots, persistDeckSlots, selLeader?.id, currentUser]);

  const loadDeckSlot = useCallback((idx) => {
    const slot = deckSlots[idx];
    if (!slot?.cardIds?.length) {
      setDeckShareNotice(`Slot ${idx + 1} is empty.`);
      return;
    }
    const nextDeck = materializeDeckFromIds(slot.cardIds);
    if (nextDeck.length) setCustomDeck(nextDeck);
    if (slot.leaderId) {
      const maybeLeader = PROPHECY_LEADERS.find((l) => l.id === slot.leaderId);
      if (maybeLeader) setSelLeader(maybeLeader);
    }
    setDeckShareCodeInput(slot.shareCode || buildDeckShareCode(nextDeck, slot.leaderId));
    setDeckShareNotice(`Loaded slot ${idx + 1}.`);
  }, [buildDeckShareCode, deckSlots, materializeDeckFromIds]);

  const exportDeckShare = useCallback(() => {
    const share = buildDeckShareCode(customDeck, selLeader?.id);
    setDeckShareCodeInput(share);
    setDeckShareNotice('Share code generated.');
  }, [buildDeckShareCode, customDeck, selLeader?.id]);

  const importDeckShare = useCallback(() => {
    const payload = decodeDeckShare(deckShareCodeInput);
    if (!payload || !Array.isArray(payload.cards)) {
      setDeckShareNotice('Invalid share code.');
      return;
    }
    const imported = materializeDeckFromIds(payload.cards);
    if (!imported.length) {
      setDeckShareNotice('No valid cards found in this code.');
      return;
    }
    setCustomDeck(imported.slice(0, 30));
    if (payload.leaderId) {
      const maybeLeader = PROPHECY_LEADERS.find((l) => l.id === payload.leaderId);
      if (maybeLeader) setSelLeader(maybeLeader);
    }
    setDeckShareNotice('Deck imported from share code.');
  }, [deckShareCodeInput, materializeDeckFromIds]);

  const curveMax = Math.max(1, ...Object.values(deckCurve));

  // —— Start screen
  if (screen === 'start') {
    if (accountLoading) {
      return (
        <View style={[styles.container, styles.authRoot, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
          <ActivityIndicator size="large" color={GOLD_L} />
          <Text style={styles.authLoadingText}>Loading account...</Text>
        </View>
      );
    }
    if (!currentUser) {
      return (
        <View style={[styles.container, styles.authRoot, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
          <Text style={styles.authTitle}>Smite Wars Account</Text>
        <Text style={styles.authSubTitle}>Sign in here using the same username and password as Profile.</Text>
        {authError ? <Text style={styles.authErrorText}>{authError}</Text> : null}
        <TextInput
          style={styles.authInput}
          value={authUsername}
          onChangeText={setAuthUsername}
          placeholder="Username"
          placeholderTextColor="#8d7b58"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.authInput}
          value={authPassword}
          onChangeText={setAuthPassword}
          placeholder="Password"
          placeholderTextColor="#8d7b58"
          secureTextEntry
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.authSubmitBtn, isLoggingIn && styles.authSubmitBtnDisabled]} disabled={isLoggingIn} onPress={handleProphecyLogin}>
          <Text style={styles.authSubmitText}>{isLoggingIn ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { marginTop: 8 }]} onPress={refreshCurrentUser}>
          <Text style={styles.btnOutlineText}>Refresh Account</Text>
          </TouchableOpacity>
        <Text style={[styles.authSubTitle, { marginTop: 10, marginBottom: 0 }]}>Create/reset account in Profile if needed.</Text>
        </View>
      );
    }
    const sortedCards = [...starterPool].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );
    const cardsForCollection = sortedCards.map((card) => {
      const override = ownedVisualOverrides[card.id];
      return override ? { ...card, visuals: override } : card;
    });
    const collectionPantheonOptions = ['all', ...Array.from(new Set(cardsForCollection.map((c) => c.pantheon || 'Neutral'))).sort((a, b) => a.localeCompare(b))];
    const collectionCostOptions = ['all', ...Array.from(new Set(cardsForCollection.map((c) => String(c.cost ?? 0)))).sort((a, b) => Number(a) - Number(b))];
    const collectionClassOptions = ['all', ...Array.from(new Set(cardsForCollection.map((c) => getCardClassLabel(c)))).sort((a, b) => a.localeCompare(b))];
    const collectionTypeOptions = ['all', 'God', 'Trap', 'Spell', 'Item'];
    const collectionRarityOptions = ['all', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const collectionVariantOptions = ['all', 'Base Cards', 'Alternative Cards', 'Foil Cards', 'Standard', 'Relic Gleam', 'Pantheon Blessing', 'Ascended Full Art', 'Godforged', 'Ascendant Prism'];
    const query = collectionQuery.trim().toLowerCase();
    const filteredCards = cardsForCollection.filter((card) => {
      if (query && !String(card.name || '').toLowerCase().includes(query)) return false;
      if (collectionPantheon !== 'all' && (card.pantheon || 'Neutral') !== collectionPantheon) return false;
      if (collectionCost !== 'all' && String(card.cost ?? 0) !== collectionCost) return false;
      if (collectionClass !== 'all' && getCardClassLabel(card) !== collectionClass) return false;
      if (collectionType !== 'all') {
        const ct = (card.cardType || CARD_TYPE.GOD).toLowerCase();
        const want = collectionType.toLowerCase();
        if (ct !== want) return false;
      }
      if (collectionRarity !== 'all' && (card.rarity || 'common').toLowerCase() !== collectionRarity.toLowerCase()) return false;
      if (collectionFoil !== 'all') {
        if (collectionFoil === 'Base Cards' && (card?.isAlternativeCard || card?.isFoilCard)) return false;
        if (collectionFoil === 'Alternative Cards' && !card?.isAlternativeCard) return false;
        if (collectionFoil === 'Foil Cards' && !card?.isFoilCard) return false;
        if (collectionFoil === 'Base Cards' || collectionFoil === 'Alternative Cards' || collectionFoil === 'Foil Cards') return true;
        const labels = getVisualFinishLabels(getCardVisuals(card));
        if (!labels.includes(collectionFoil)) return false;
      }
      return true;
    });
    const filteredLeaders = PROPHECY_LEADERS.filter((leader) => {
      const name = String(leader.name || '').toLowerCase();
      if (query && !name.includes(query)) return false;
      if (collectionPantheon !== 'all' && (leader.pantheon || 'Neutral') !== collectionPantheon) return false;
      if (collectionClass !== 'all' && (leader.cls || '').toLowerCase() !== collectionClass.toLowerCase() && collectionClass !== 'all') return false;
      return true;
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const affordablePacks = CARD_PACKS.filter((pack) => pack.id === 'daily' ? !dailyClaimed : metaGold >= pack.costGold).length;
    return (
      <View style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <View style={styles.startNavRow}>
          <View style={styles.startNavTabsCenter}>
            <View style={styles.startTopTabs}>
              {[
                ...(onBack ? [{ id: 'exit', label: 'Exit' }] : []),
                { id: 'home', label: 'Play' },
                { id: 'story', label: 'Story' },
                { id: 'collection', label: 'Collection' },
                { id: 'profile', label: 'Profile' },
                { id: 'packshop', label: 'Store' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.startTabBtn, hubTab === tab.id && styles.startTabBtnActive]}
                  onPress={() => {
                    if (tab.id === 'exit') {
                      onBack?.();
                      return;
                    }
                    unlockMusic();
                    setHubTab(tab.id);
                  }}
                >
                  <Text style={[styles.startTabText, hubTab === tab.id && styles.startTabTextActive]} numberOfLines={1}>
                    {String(tab.label || tab.id || '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        {hubTab === 'home' && (
          <View style={styles.startRoot}>
            <View style={styles.startHeroCard}>
              <View style={styles.emblem}>
                <Text style={styles.emblemText}>⚡</Text>
              </View>
              <Text style={styles.titleMain}>Smite 2</Text>
              <Text style={styles.titleSub}>Smite Wars</Text>
              <View style={styles.divider} />
              <Text style={styles.startDesc}>Command the gods. Build your army. Win the Smite Wars.</Text>
              <View style={styles.startFeatureRow}>
                <View style={styles.startFeaturePill}><Text style={styles.startFeaturePillText}>{`Cards ${starterPool.length}`}</Text></View>
                <View style={styles.startFeaturePill}><Text style={styles.startFeaturePillText}>{`Owned ${ownedTotalCount}`}</Text></View>
                <View style={styles.startFeaturePill}><Text style={styles.startFeaturePillText}>{`Gold ${metaGold}`}</Text></View>
              </View>
              <Text style={styles.startFutureText}>More features coming soon: ranked, quests, and events.</Text>
            </View>
            <TouchableOpacity style={styles.btnGold} onPress={() => { unlockMusic(); setSelLeader(null); setScreen('leader'); }} activeOpacity={0.9}>
              <Text style={styles.btnGoldText}>Begin Battle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => { unlockMusic(); setHtpVisible(true); }} activeOpacity={0.9}>
              <Text style={styles.btnOutlineText}>How to Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { marginTop: 8 }]} onPress={() => { unlockMusic(); setDeckBuilderVisible(true); }} activeOpacity={0.9}>
              <Text style={styles.btnOutlineText}>Deck Builder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { marginTop: 8 }]} onPress={() => { unlockMusic(); startTutorialBattle(); }} activeOpacity={0.9}>
              <Text style={styles.btnOutlineText}>Tutorial</Text>
            </TouchableOpacity>
          </View>
        )}
        {hubTab === 'story' && (
          <View style={styles.collectionRoot}>
            <Text style={styles.collectionTitle}>Story Mode</Text>
            <Text style={styles.collectionSub}>Progress through chapters and earn bonus gold rewards.</Text>
            <ScrollView contentContainerStyle={styles.storyList} showsVerticalScrollIndicator={false}>
              {STORY_CHAPTERS.map((chapter, idx) => {
                const unlocked = idx <= storyProgress;
                return (
                  <View key={chapter.id} style={[styles.storyCard, !unlocked && styles.storyCardLocked]}>
                    <Text style={styles.storyTitle}>{chapter.title}</Text>
                    <Text style={styles.storyDesc}>{chapter.desc}</Text>
                    <Text style={styles.storyMeta}>{`Enemy: ${chapter.enemyLeaderId} • Reward: ${chapter.rewardGold} gold`}</Text>
                    <TouchableOpacity
                      style={[styles.storyPlayBtn, !unlocked && styles.storyPlayBtnLocked]}
                      disabled={!unlocked}
                      onPress={() => {
                        unlockMusic();
                        startStoryChapter(chapter);
                      }}
                    >
                      <Text style={styles.storyPlayText}>{unlocked ? 'Play Chapter' : 'Locked'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
        {hubTab === 'collection' && (
          <View style={styles.collectionRoot}>
            <Text style={styles.collectionTitle}>Smite Wars Collection</Text>
            <Text style={styles.collectionSub}>
              {collectionMode === 'cards'
                ? `Showing ${filteredCards.length} of ${cardsForCollection.length} cards`
                : `Showing ${filteredLeaders.length} of ${PROPHECY_LEADERS.length} leaders`}
            </Text>
            <View style={styles.collectionModeToggle}>
              <TouchableOpacity
                style={[styles.modeToggleBtn, collectionMode === 'cards' && styles.modeToggleBtnActive]}
                onPress={() => setCollectionMode('cards')}
              >
                <Text style={[styles.modeToggleText, collectionMode === 'cards' && styles.modeToggleTextActive]}>Cards</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleBtn, collectionMode === 'leaders' && styles.modeToggleBtnActive]}
                onPress={() => setCollectionMode('leaders')}
              >
                <Text style={[styles.modeToggleText, collectionMode === 'leaders' && styles.modeToggleTextActive]}>Leaders</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.collectionSearchWrap}>
              <TextInput
                style={styles.collectionSearchInput}
                value={collectionQuery}
                onChangeText={setCollectionQuery}
                placeholder="Search cards..."
                placeholderTextColor="#8d7b58"
              />
            </View>

            <View style={styles.collectionFilterBlock}>
              <View style={styles.filterButtonRow}>
                <TouchableOpacity style={[styles.filterButton, (openCollectionFilter === 'pantheon' || collectionPantheon !== 'all') && styles.filterButtonActive]} onPress={() => setOpenCollectionFilter((prev) => (prev === 'pantheon' ? null : 'pantheon'))}>
                  <Text style={[styles.filterButtonText, (openCollectionFilter === 'pantheon' || collectionPantheon !== 'all') && styles.filterButtonTextActive]} numberOfLines={1}>Pantheon</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, (openCollectionFilter === 'cost' || collectionCost !== 'all') && styles.filterButtonActive]} onPress={() => setOpenCollectionFilter((prev) => (prev === 'cost' ? null : 'cost'))}>
                  <Text style={[styles.filterButtonText, (openCollectionFilter === 'cost' || collectionCost !== 'all') && styles.filterButtonTextActive]} numberOfLines={1}>Cost</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, (openCollectionFilter === 'class' || collectionClass !== 'all') && styles.filterButtonActive]} onPress={() => setOpenCollectionFilter((prev) => (prev === 'class' ? null : 'class'))}>
                  <Text style={[styles.filterButtonText, (openCollectionFilter === 'class' || collectionClass !== 'all') && styles.filterButtonTextActive]} numberOfLines={1}>Class</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, (openCollectionFilter === 'type' || collectionType !== 'all') && styles.filterButtonActive]} onPress={() => setOpenCollectionFilter((prev) => (prev === 'type' ? null : 'type'))}>
                  <Text style={[styles.filterButtonText, (openCollectionFilter === 'type' || collectionType !== 'all') && styles.filterButtonTextActive]} numberOfLines={1}>Type</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, (openCollectionFilter === 'rarity' || collectionRarity !== 'all') && styles.filterButtonActive]} onPress={() => setOpenCollectionFilter((prev) => (prev === 'rarity' ? null : 'rarity'))}>
                  <Text style={[styles.filterButtonText, (openCollectionFilter === 'rarity' || collectionRarity !== 'all') && styles.filterButtonTextActive]} numberOfLines={1}>Rarity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, (openCollectionFilter === 'foil' || collectionFoil !== 'all') && styles.filterButtonActive]} onPress={() => setOpenCollectionFilter((prev) => (prev === 'foil' ? null : 'foil'))}>
                  <Text style={[styles.filterButtonText, (openCollectionFilter === 'foil' || collectionFoil !== 'all') && styles.filterButtonTextActive]} numberOfLines={1}>Variant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => {
                    setCollectionPantheon('all');
                    setCollectionCost('all');
                    setCollectionClass('all');
                    setCollectionType('all');
                    setCollectionRarity('all');
                    setCollectionFoil('all');
                    setOpenCollectionFilter(null);
                  }}
                >
                  <Text style={styles.filterButtonText} numberOfLines={1}>Reset</Text>
                </TouchableOpacity>
              </View>
              {openCollectionFilter === 'pantheon' && (
                <View style={styles.filterOptionsBox}>
                  <ScrollView style={styles.filterDropdownScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterDropdownList}>
                    {collectionPantheonOptions.map((opt) => (
                      <TouchableOpacity
                        key={`pantheon_${opt}`}
                        style={[styles.filterDropdownOption, collectionPantheon === opt && styles.filterDropdownOptionActive]}
                        onPress={() => {
                          setCollectionPantheon(opt);
                          setOpenCollectionFilter(null);
                        }}
                      >
                        <Text style={[styles.filterDropdownOptionText, collectionPantheon === opt && styles.filterDropdownOptionTextActive]}>{opt === 'all' ? 'All Pantheons' : opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {openCollectionFilter === 'cost' && (
                <View style={styles.filterOptionsBox}>
                  <ScrollView style={styles.filterDropdownScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterDropdownList}>
                    {collectionCostOptions.map((opt) => (
                      <TouchableOpacity
                        key={`cost_${opt}`}
                        style={[styles.filterDropdownOption, collectionCost === opt && styles.filterDropdownOptionActive]}
                        onPress={() => {
                          setCollectionCost(opt);
                          setOpenCollectionFilter(null);
                        }}
                      >
                        <Text style={[styles.filterDropdownOptionText, collectionCost === opt && styles.filterDropdownOptionTextActive]}>{opt === 'all' ? 'All Costs' : `Cost ${opt}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {openCollectionFilter === 'class' && (
                <View style={styles.filterOptionsBox}>
                  <ScrollView style={styles.filterDropdownScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterDropdownList}>
                    {collectionClassOptions.map((opt) => (
                      <TouchableOpacity
                        key={`cls_${opt}`}
                        style={[styles.filterDropdownOption, collectionClass === opt && styles.filterDropdownOptionActive]}
                        onPress={() => {
                          setCollectionClass(opt);
                          setOpenCollectionFilter(null);
                        }}
                      >
                        <Text style={[styles.filterDropdownOptionText, collectionClass === opt && styles.filterDropdownOptionTextActive]}>{opt === 'all' ? 'All Classes' : opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {openCollectionFilter === 'type' && (
                <View style={styles.filterOptionsBox}>
                  <ScrollView style={styles.filterDropdownScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterDropdownList}>
                    {collectionTypeOptions.map((opt) => (
                      <TouchableOpacity
                        key={`type_${opt}`}
                        style={[styles.filterDropdownOption, collectionType === opt && styles.filterDropdownOptionActive]}
                        onPress={() => {
                          setCollectionType(opt);
                          setOpenCollectionFilter(null);
                        }}
                      >
                        <Text style={[styles.filterDropdownOptionText, collectionType === opt && styles.filterDropdownOptionTextActive]}>{opt === 'all' ? 'All Types' : opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {openCollectionFilter === 'rarity' && (
                <View style={styles.filterOptionsBox}>
                  <ScrollView style={styles.filterDropdownScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterDropdownList}>
                    {collectionRarityOptions.map((opt) => (
                      <TouchableOpacity
                        key={`rarity_${opt}`}
                        style={[styles.filterDropdownOption, collectionRarity === opt && styles.filterDropdownOptionActive]}
                        onPress={() => {
                          setCollectionRarity(opt);
                          setOpenCollectionFilter(null);
                        }}
                      >
                        <Text style={[styles.filterDropdownOptionText, collectionRarity === opt && styles.filterDropdownOptionTextActive]}>{opt === 'all' ? 'All Rarities' : opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {openCollectionFilter === 'foil' && (
                <View style={styles.filterOptionsBox}>
                  <ScrollView style={styles.filterDropdownScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterDropdownList}>
                    {collectionVariantOptions.map((opt) => (
                      <TouchableOpacity
                        key={`foil_${opt}`}
                        style={[styles.filterDropdownOption, collectionFoil === opt && styles.filterDropdownOptionActive]}
                        onPress={() => {
                          setCollectionFoil(opt);
                          setOpenCollectionFilter(null);
                        }}
                      >
                        <Text style={[styles.filterDropdownOptionText, collectionFoil === opt && styles.filterDropdownOptionTextActive]}>{opt === 'all' ? 'All Variants' : opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            {collectionMode === 'cards' ? (
              <FlatList
                data={filteredCards}
                key="collection_cards"
                keyExtractor={(item, index) => `${item.id}_${index}`}
                numColumns={2}
                removeClippedSubviews={Platform.OS !== 'web'}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                updateCellsBatchingPeriod={32}
                columnWrapperStyle={{ gap: collectionGridGap }}
                contentContainerStyle={[styles.collectionGrid, { width: collectionGridWidth, gap: collectionGridGap }]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => renderShowcaseCard(item, `${item.id}_${index}`, effectiveOwnedCards[item.id] || 0, collectionCardWidth)}
              />
            ) : (
              <FlatList
                data={filteredLeaders}
                key="collection_leaders"
                keyExtractor={(item) => item.id}
                numColumns={2}
                removeClippedSubviews={Platform.OS !== 'web'}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={7}
                updateCellsBatchingPeriod={32}
                columnWrapperStyle={{ gap: collectionGridGap }}
                contentContainerStyle={[styles.collectionGrid, { width: collectionGridWidth, gap: collectionGridGap }]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: leader }) => (
                  <View style={[styles.showcaseCardWrap, { width: collectionCardWidth }]}>
                    <View style={styles.showcaseFrame}>
                      <View style={styles.showcaseBanner}>
                        <View style={styles.showcaseBannerLeft}>
                          <Text style={[styles.showcaseBannerText, { color: getPantheonColor(leader.pantheon) }]} numberOfLines={1}>
                            {`${leader.pantheon || 'Neutral'} · ${leader.cls || 'Leader'}`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.showcaseArt}>
                        <View style={styles.showcaseArtInner}>
                          {renderLeaderIcon(leader.name, 100)}
                        </View>
                        <View style={styles.showcaseNameOverlay}>
                          <Text style={[styles.showcaseName, { color: getPantheonColor(leader.pantheon) }]}>{leader.name}</Text>
                          <Text style={styles.showcaseEpithet} numberOfLines={1}>{leader.ability || 'Leader ability coming soon.'}</Text>
                        </View>
                      </View>
                      <View style={styles.showcaseDivider} />
                      <View style={styles.showcaseTextSection}>
                        <Text style={styles.showcaseAbilityName}>Leader</Text>
                        <Text style={styles.showcaseAbilityBody} numberOfLines={3}>{leader.ability || '—'}</Text>
                      </View>
                      <View style={styles.showcaseStatsFooter}>
                        <View style={styles.showcaseStatCol}>
                          <Text style={styles.showcaseStatLabel}>ATK</Text>
                          <View style={styles.showcaseStatGem}>
                            <Image source={{ uri: STAT_ICONS.strength }} style={[styles.showcaseStatIcon, { tintColor: STAT_ATK_TINT }]} contentFit="contain" />
                            <Text style={styles.showcaseGemText}>{leader.atk}</Text>
                          </View>
                        </View>
                        <View style={[styles.showcaseStatCol, styles.showcaseCenterStat]}>
                          <Text style={styles.showcaseStatLabel}>HP</Text>
                          <View style={styles.showcaseStatGem}>
                            <Image source={{ uri: STAT_ICONS.health }} style={[styles.showcaseStatIconSmall, { tintColor: STAT_HP_TINT }]} contentFit="contain" />
                            <Text style={styles.showcaseGemText}>{leader.hp}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}
        {hubTab === 'profile' && (
          <View style={styles.collectionRoot}>
            <Text style={styles.collectionTitle}>Profile</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileBanner}>
                {profileBannerUri ? (
                  <Image
                    source={{ uri: profileBannerUri }}
                    style={styles.profileBannerImage}
                    contentFit="cover"
                    onError={() => {
                      if (!profileBannerUseJpg) setProfileBannerUseJpg(true);
                    }}
                  />
                ) : (
                  <View style={styles.profileBannerFallback} />
                )}
                <TouchableOpacity style={styles.profileRefreshBtn} onPress={refreshCurrentUser}>
                  <Text style={styles.profileRefreshText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileSignOutBtn} onPress={handleProphecyLogout}>
                  <Text style={styles.profileSignOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.profileMainRow}>
                <View style={styles.profileAvatar}>
                  {profileGodIconSource || profileData?.avatar_url ? (
                    <Image
                      source={profileGodIconSource || { uri: profileData?.avatar_url }}
                      style={styles.profileAvatarImage}
                      contentFit="contain"
                      onError={() => {
                        if (!profileIconUseFallback) setProfileIconUseFallback(true);
                      }}
                    />
                  ) : (
                    <Text style={styles.profileAvatarFallback}>👤</Text>
                  )}
                </View>
                <View style={styles.profileIdentityCol}>
                  <Text style={styles.profileName}>{profileData?.display_name || profileData?.username || currentUser || 'Player'}</Text>
                  <Text style={styles.profileMeta}>{profileData?.profile_title || 'Stormcaller'}</Text>
                  <View style={styles.accountTypeBadge}>
                    <Text style={styles.accountTypeBadgeText}>{`Account: ${accountTypeLabel}`}</Text>
                  </View>
                  <View style={styles.accountTypeToggleRow}>
                    <TouchableOpacity
                      style={[styles.accountTypeToggleBtn, devOwnershipView === 'standard' && styles.accountTypeToggleBtnActive]}
                      onPress={() => setDevOwnershipView('standard')}
                    >
                      <Text style={[styles.accountTypeToggleText, devOwnershipView === 'standard' && styles.accountTypeToggleTextActive]}>Standard View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.accountTypeToggleBtn,
                        devOwnershipView === 'dev' && styles.accountTypeToggleBtnActive,
                        !isDevAccount && styles.accountTypeToggleBtnDisabled,
                      ]}
                      disabled={!isDevAccount}
                      onPress={() => setDevOwnershipView('dev')}
                    >
                      <Text
                        style={[
                          styles.accountTypeToggleText,
                          devOwnershipView === 'dev' && styles.accountTypeToggleTextActive,
                          !isDevAccount && styles.accountTypeToggleTextDisabled,
                        ]}
                      >
                        Dev View
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.accountTypeNote}>
                    {isDevAccount
                      ? 'Toggle between full dev ownership and standard-account preview.'
                      : 'Dev View is disabled because this account is not marked as dev.'}
                  </Text>
                  <View style={styles.profileXpBarBg}>
                    <View style={[styles.profileXpBarFill, { width: `${Math.round(levelProgress.ratio * 100)}%` }]} />
                  </View>
                  <Text style={styles.profileMeta}>{`Level ${levelProgress.level} · ${levelProgress.xp}/${levelProgress.need} XP`}</Text>
                </View>
              </View>
              <View style={styles.profileStatGrid}>
                <View style={styles.profileStatItem}><Text style={styles.profileStatLabel}>Gold</Text><Text style={styles.profileStatValue}>{Number(profileData?.gold ?? metaGold)}</Text></View>
                <View style={styles.profileStatItem}><Text style={styles.profileStatLabel}>Gems</Text><Text style={styles.profileStatValue}>{Number(profileData?.gems || 0)}</Text></View>
                <View style={styles.profileStatItem}><Text style={styles.profileStatLabel}>Cards</Text><Text style={styles.profileStatValue}>{profileStats.totalCardsOwned}</Text></View>
                <View style={styles.profileStatItem}><Text style={styles.profileStatLabel}>Decks</Text><Text style={styles.profileStatValue}>{profileStats.totalDecksCreated}</Text></View>
                <View style={styles.profileStatItem}><Text style={styles.profileStatLabel}>Wins</Text><Text style={styles.profileStatValue}>{profileStats.wins}</Text></View>
                <View style={styles.profileStatItem}><Text style={styles.profileStatLabel}>Losses</Text><Text style={styles.profileStatValue}>{profileStats.losses}</Text></View>
              </View>
            </View>
          </View>
        )}
        {hubTab === 'packshop' && (
          <View style={styles.collectionRoot}>
            <Text style={styles.collectionTitle}>Card Pack Shop</Text>
            <View style={styles.shopHeroCard}>
              <Text style={styles.shopHeroTitle}>{`Gold Balance: ${metaGold}`}</Text>
              <Text style={styles.shopHeroSub}>{`${affordablePacks} pack option(s) available right now`}</Text>
            </View>
            <ScrollView style={styles.packList} contentContainerStyle={styles.packListContent} showsVerticalScrollIndicator={false}>
              {CARD_PACKS.map((pack) => {
                const blocked = pack.id === 'daily' ? dailyClaimed : metaGold < pack.costGold;
                const costLabel = pack.costGold === 0 ? 'Free' : `${pack.costGold} Gold`;
                return (
                  <View key={pack.id} style={[styles.packCard, blocked && styles.packCardBlocked]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packName}>{pack.name}</Text>
                      <Text style={styles.packDesc}>{pack.desc}</Text>
                      <View style={styles.packChipRow}>
                        <View style={styles.packCostChip}><Text style={styles.packCostChipText}>{costLabel}</Text></View>
                        <View style={styles.packCountChip}><Text style={styles.packCountChipText}>{`${pack.cards} cards`}</Text></View>
                      </View>
                      <View style={styles.packGuaranteeRow}>
                        {(pack.guarantee || []).slice(0, 3).map((bucket, idx) => (
                          <View key={`${pack.id}_g_${idx}`} style={styles.packGuaranteeChip}>
                            <Text style={styles.packGuaranteeText}>{GUARANTEE_LABELS[bucket] || bucket}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.packStatusText}>{blocked ? (pack.id === 'daily' ? 'Daily pack already claimed.' : 'Not enough gold yet.') : 'Ready to open.'}</Text>
                    </View>
                    <TouchableOpacity style={[styles.packOpenBtn, blocked && styles.packOpenBtnBlocked]} disabled={blocked} onPress={() => openPack(pack)}>
                      <Text style={styles.packOpenText}>{pack.id === 'daily' && dailyClaimed ? 'Claimed' : 'Open'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
        <Modal visible={packOpenVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPackOpenVisible(false)}>
            <View style={styles.packRevealPanel}>
              <Text style={styles.shopPanelTitle}>Pack Opened</Text>
              <Text style={styles.packRevealCue}>{packRevealCue || 'Cards acquired.'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packRevealRow}>
                {packOpenCards.map((card, idx) => renderShowcaseCard(card, `opened_${idx}`, effectiveOwnedCards[card.id] || 0))}
              </ScrollView>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setPackOpenVisible(false)}>
                <Text style={styles.btnOutlineText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        <Modal visible={!!inspectCard} transparent animationType="fade" onRequestClose={() => setInspectCard(null)}>
          <TouchableOpacity style={styles.inspectOverlay} activeOpacity={1} onPress={() => setInspectCard(null)}>
            <TouchableOpacity style={styles.inspectPanel} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.inspectTitle}>{inspectCard ? getCardDisplayName(inspectCard) : 'Card Viewer'}</Text>
              <Text style={styles.inspectHint}>Drag left/right for 360 spin, up/down to tilt</Text>
              {(() => {
                const visuals = getCardVisuals(inspectCard);
                const pantheonVisual = getPantheonVisualProfile(inspectCard?.pantheon);
                const foilTheme = getFoilVisualTheme(visuals, pantheonVisual);
                const isFoil = visuals?.foil && visuals.foil !== CARD_FOIL_TIER.NONE;
                return isFoil && foilTheme ? (
                  <>
                    <View style={[styles.inspectFoilAuraPrimary, { backgroundColor: foilTheme.frameGlow, opacity: 0.3 }]} />
                  </>
                ) : null;
              })()}
              <Animated.View
                style={[
                  styles.inspectCardWrap,
                  {
                    transform: [
                      { perspective: 900 },
                      { translateX: inspectTranslate.x },
                      { translateY: inspectTranslate.y },
                      { rotateX: inspectRotateX },
                      { rotateY: inspectRotateY },
                      { scale: 1.02 },
                    ],
                  },
                ]}
                {...inspectPanResponder.panHandlers}
              >
                <View style={[styles.inspectCardStage, { width: inspectCardWidth, height: inspectCardHeight }]}>
                  {inspectShowBack ? (
                    <View pointerEvents="none" style={styles.inspectFaceSingle}>
                      <View style={[styles.inspectBackCard, { width: inspectCardWidth }]}>
                        <View style={styles.inspectBackHaloOuter}>
                          <View style={styles.inspectBackHaloInner}>
                            <Image source={SMITE_SCROLL_LOGO} style={styles.inspectBackLogo} contentFit="contain" />
                          </View>
                        </View>
                        <Text style={styles.inspectBackTitle}>SMITE WARS</Text>
                        <Text style={styles.inspectBackSub}>CARD BACK</Text>
                        <View style={styles.inspectBackDivider} />
                        <Text style={styles.inspectBackText}>
                          {inspectCard ? `Forged for ${inspectCard.pantheon || 'Neutral'} · ${getCardVisuals(inspectCard).card_back_id}` : 'Forged by gods. Carried by champions.'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View pointerEvents="none" style={styles.inspectFaceSingle}>
                      {inspectCard ? renderShowcaseCard(inspectCard, `inspect_${inspectCard.id}`, effectiveOwnedCards[inspectCard.id] || 0, inspectCardWidth, { compactView: true }) : null}
                    </View>
                  )}
                </View>
              </Animated.View>
              <TouchableOpacity style={[styles.btnOutline, { marginTop: 14, marginBottom: 4 }]} onPress={() => setInspectCard(null)}>
                <Text style={styles.btnOutlineText}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        <Modal visible={htpVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHtpVisible(false)}>
            <View style={styles.htpPanel}>
              <Text style={styles.htpTitle}>{`${gameTitle} — Quick Rules`}</Text>
              <ScrollView style={styles.htpScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.htpSection}>Summary</Text>
                <Text style={styles.htpBody}>1v1 turn-based battle. Each side has a Smite 2 Leader and units. Reduce the enemy Leader HP to 0 to win.</Text>
                <Text style={styles.htpSection}>Order of Play</Text>
                <Text style={styles.htpBody}>• Start of game: both players begin with 5 cards and 3 mana.</Text>
                <Text style={styles.htpBody}>• Main phase: deploy units, set traps, equip items, cast one ability per unit, and attack once per unit.</Text>
                <Text style={styles.htpBody}>• Combat follows class keywords: Taunt, Brawler, Backstab, Spell Surge, and Ranged.</Text>
                <Text style={styles.htpBody}>• End of round: burn/poison status effects tick down and deal damage before expiring.</Text>
                <Text style={styles.htpSection}>Collection & Filters</Text>
                <Text style={styles.htpBody}>Use Collection search plus dropdown filters for Pantheon, Cost, Class, Type, Rarity, and Variant. Filters open in a dropdown container and apply instantly.</Text>
                <Text style={styles.htpSection}>Deck Builder & Share</Text>
                <Text style={styles.htpBody}>Decks must be 30 cards. Save up to 6 deck slots, generate share codes, and import codes from other players.</Text>
                <Text style={styles.htpSection}>Modes</Text>
                <Text style={styles.htpBody}>• Tutorial teaches deploy, attack flow, and ability timing.</Text>
                <Text style={styles.htpBody}>• Story Mode has chapters with fixed enemies and gold rewards.</Text>
                <Text style={styles.htpSection}>Collection Growth</Text>
                <Text style={styles.htpBody}>Open packs in Pack Shop, earn story rewards, and refine your deck with new gods, items, and traps.</Text>
              </ScrollView>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setHtpVisible(false)}><Text style={styles.btnOutlineText}>Got It!</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        <Modal visible={deckBuilderVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeckBuilderVisible(false)}>
            <View style={styles.deckPanel}>
              <View style={styles.shopHandle} />
              <Text style={styles.shopPanelTitle}>Deck Builder (Smite Wars)</Text>
              <Text style={styles.deckMetaText}>
                {`${customDeck.length}/30 • Avg ${deckAvgCost} • ${deckArchetype}`}
              </Text>
              <View style={styles.deckMetaRow}>
                <View style={styles.deckStatChip}><Text style={styles.deckStatText}>Gods {deckValidation.stats.gods}</Text></View>
                <View style={styles.deckStatChip}><Text style={styles.deckStatText}>Items {deckValidation.stats.items}</Text></View>
                <View style={styles.deckStatChip}><Text style={styles.deckStatText}>Traps {deckValidation.stats.traps}</Text></View>
              </View>
              <View style={styles.curveWrap}>
                {Object.entries(deckCurve).map(([cost, count]) => (
                  <View key={cost} style={styles.curveBarSlot}>
                    <View style={[styles.curveBar, { height: Math.max(2, Math.round((count / curveMax) * 34)) }]} />
                    <Text style={styles.curveLabel}>{cost}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.deckSectionTitle}>Saved Deck Slots</Text>
              <View style={styles.deckSlotGrid}>
                {Array.from({ length: DECK_SLOT_COUNT }).map((_, idx) => {
                  const slot = deckSlots[idx];
                  return (
                    <View key={`slot_${idx}`} style={styles.deckSlotCard}>
                      <Text style={styles.deckSlotTitle}>{`Slot ${idx + 1}`}</Text>
                      <Text style={styles.deckSlotMeta} numberOfLines={1}>
                        {slot?.cardIds?.length ? `${slot.cardIds.length} cards` : 'Empty'}
                      </Text>
                      <View style={styles.deckSlotActions}>
                        <TouchableOpacity style={styles.deckSlotBtn} onPress={() => saveDeckSlot(idx)}>
                          <Text style={styles.deckSlotBtnText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.deckSlotBtn, !slot && styles.deckSlotBtnDisabled]} onPress={() => loadDeckSlot(idx)} disabled={!slot}>
                          <Text style={styles.deckSlotBtnText}>Load</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.deckSectionTitle}>Deck Share Code</Text>
              <TextInput
                style={styles.deckShareInput}
                multiline
                value={deckShareCodeInput}
                onChangeText={setDeckShareCodeInput}
                placeholder="Generate or paste a deck share code"
                placeholderTextColor="#8d7b58"
              />
              <View style={styles.deckShareActions}>
                <TouchableOpacity style={styles.deckActionBtn} onPress={exportDeckShare}>
                  <Text style={styles.deckActionText}>Generate Code</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deckActionBtn} onPress={importDeckShare}>
                  <Text style={styles.deckActionText}>Import Code</Text>
                </TouchableOpacity>
              </View>
              {!!deckShareNotice && <Text style={styles.deckShareNotice}>{deckShareNotice}</Text>}
              {!!draftDeckValidation.errors.length && (
                <Text style={styles.deckErrorText} numberOfLines={2}>
                  {draftDeckValidation.errors[0]}
                </Text>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckPoolRow}>
                {[...starterPool].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).map((card) => {
                  const copies = countById[card.id] || 0;
                  const owned = effectiveOwnedCards[card.id] || 0;
                  return (
                    <TouchableOpacity key={card.id} style={styles.deckPoolCard} onPress={() => addDeckCard(card)}>
                      <Text style={[styles.deckPoolCardName, { color: getPantheonColor(card.pantheon) }]} numberOfLines={1}>{getCardDisplayName(card)}</Text>
                      <Text style={styles.deckPoolCardMeta}>{`${card.cardType} • ${card.cost}`}</Text>
                      <Text style={styles.deckPoolCardMeta}>{`Deck x${copies} / Owned x${owned}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <ScrollView style={styles.deckListScroll} contentContainerStyle={styles.deckListWrap}>
                {customDeck.map((card, idx) => (
                  <TouchableOpacity key={`${card.id}_${idx}`} style={styles.deckListItem} onPress={() => removeDeckCard(idx)}>
                    <Text style={[styles.deckListName, { color: getPantheonColor(card.pantheon) }]} numberOfLines={1}>{card.name}</Text>
                    <Text style={styles.deckListMeta}>{`${card.cardType} • ${card.cost}`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.deckActions}>
                <TouchableOpacity style={styles.deckActionBtn} onPress={addRandomDeckCard}><Text style={styles.deckActionText}>+ Random</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deckActionBtn} onPress={autoFillDeck}><Text style={styles.deckActionText}>Auto Build</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deckActionBtn} onPress={() => setCustomDeck([])}><Text style={styles.deckActionText}>Clear</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setDeckBuilderVisible(false)}><Text style={styles.btnOutlineText}>Close Deck Builder</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // —— Leader select
  if (screen === 'leader') {
    const leaders = PROPHECY_LEADERS;
    return (
      <View style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <View style={styles.topbar}>
          <Text style={styles.topbarLogo}>{gameTitle}</Text>
          <TouchableOpacity onPress={() => { if (onBack) onBack(); else setScreen('start'); }} style={[styles.topbarBack, styles.topbarBackExit]}>
            <Text style={[styles.topbarBackText, styles.topbarBackExitText]}>Exit Game</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.leaderHeader}>
          <Text style={styles.leaderHeaderTitle}>Choose Your Leader</Text>
          <Text style={styles.leaderHeaderSub}>Your god commands the battlefield</Text>
          <Text style={styles.leaderHeaderHint}>Tap leader icon for details</Text>
        </View>
        <ScrollView style={styles.leaderScroll} contentContainerStyle={styles.leaderGrid} showsVerticalScrollIndicator={false}>
          {leaders.map((l) => (
            <View key={l.id} style={styles.leaderCardWrap}>
              <TouchableOpacity
                style={[styles.leaderCard, selLeader?.id === l.id && styles.leaderCardSel]}
                onPress={() => {
                  playVOX(l.name, 'select');
                  setSelLeader(l);
                }}
                activeOpacity={0.9}
              >
                <TouchableOpacity
                  style={styles.leaderCardIcon}
                  activeOpacity={0.85}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    setSelLeader(l);
                    setLeaderInfoVisible(true);
                  }}
                >
                  {renderLeaderIcon(l.name, 44)}
                </TouchableOpacity>
                <Text style={styles.leaderCardName}>{l.name}</Text>
                <Text style={styles.leaderCardClass}>{l.cls}</Text>
                <View style={styles.leaderCardPills}>
                  <View style={styles.pillStatCol}>
                    <Text style={styles.pillStatLabel}>HP</Text>
                    <View style={styles.pillStatBadge}>
                      <Image source={{ uri: STAT_ICONS.health }} style={[styles.pillStatBadgeImg, { tintColor: STAT_HP_TINT }]} contentFit="contain" />
                      <Text style={styles.pillStatBadgeText}>{l.hp}</Text>
                    </View>
                  </View>
                  <View style={styles.pillStatCol}>
                    <Text style={styles.pillStatLabel}>ATK</Text>
                    <View style={styles.pillStatBadge}>
                      <Image source={{ uri: STAT_ICONS.strength }} style={[styles.pillStatBadgeImg, { tintColor: STAT_ATK_TINT }]} contentFit="contain" />
                      <Text style={styles.pillStatBadgeText}>{l.atk}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <Modal
          visible={leaderInfoVisible && !!selLeader}
          transparent
          animationType="fade"
          onRequestClose={() => setLeaderInfoVisible(false)}
        >
          <TouchableOpacity style={styles.leaderInfoOverlay} activeOpacity={1} onPress={() => setLeaderInfoVisible(false)}>
            <TouchableOpacity style={styles.leaderInfoPanel} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.leaderInfoHeader}>
                <View style={styles.leaderInfoTitleWrap}>
                  <View style={styles.leaderInfoIconWrap}>
                    {renderLeaderIcon(selLeader?.name, 38)}
                  </View>
                  <Text style={styles.leaderInfoTitle}>
                    {`${selLeader?.name || 'Leader'} \u2022 ${selLeader?.cls || 'Leader'}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setLeaderInfoVisible(false)} style={styles.leaderInfoCloseBtn}>
                  <Text style={styles.leaderInfoCloseText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.leaderInfoAbility}>
                {selLeader?.ability || 'Leader ability coming soon.'}
              </Text>
              <Text style={styles.leaderInfoMeta}>
                {`${customDeck.length}/30 cards • Avg ${computeDeckAvgCost(customDeck)} • ${deriveDeckArchetype(customDeck)}`}
              </Text>
              <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => setLeaderInfoVisible(false)}>
                <Text style={styles.btnOutlineText}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        <View style={styles.confirmWrap}>
          <TouchableOpacity
            style={[styles.btnGold, styles.confirmBtn]}
            onPress={() => {
              if (!selLeader) return;
              const check = validateDeck(customDeck, selLeader.id);
              if (!check.isValid) {
                setDeckBuilderVisible(true);
                return;
              }
              newGame(selLeader);
            }}
            disabled={!selLeader}
          >
            <Text style={styles.btnGoldText}>Confirm Leader</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { marginTop: 8 }]} onPress={() => setScreen('start')}>
            <Text style={styles.btnOutlineText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // —— Battle
  if (screen === 'battle' && G) {
    const shopList = G.shop?.length ? G.shop : (() => {
      const maxR = Math.min(Math.floor(G.turn / 2), RARITY_ORDER.length - 1);
      const avail = getUnitsByRarity(maxR).map((u) => ({ ...u, cardType: CARD_TYPE.GOD }));
      return [...avail, ...ITEM_CARDS, ...TRAP_CARDS].sort(() => Math.random() - 0.5).slice(0, 6);
    })();
    const enemyFrontUnits = G.eField.filter((u) => normalizeFieldRow(u.row) === ROW_FRONT);
    const playerFrontUnits = G.pField.filter((u) => normalizeFieldRow(u.row) === ROW_FRONT);

    return (
      <View style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        {onBack && (
          <TouchableOpacity
            style={[
              styles.battleBackBtn,
              { top: safeTop + 4 },
              isTinyPhone && { top: safeTop + 2, left: 6, paddingVertical: 4, paddingHorizontal: 6 },
            ]}
            onPress={onBack}
          >
            <Text style={styles.battleBackBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.battleScaleShell}>
        <View style={[styles.battleScaleRoot, { transform: [{ scale: battleScale }] }]}>
          <View style={[styles.topbar, isSmallPhone && { paddingVertical: 4, paddingHorizontal: 8 }]}>
            <Text style={[styles.topbarTurn, isTinyPhone && { fontSize: 9 }]}>Turn {G.turn}</Text>
            <View style={[styles.resRow, isTinyPhone && { gap: 4 }]}>
              <View style={styles.rpill}><Text style={styles.rpillLabel}>💎</Text><Text style={styles.rpillVal}>{G.gold}</Text></View>
              <View style={styles.rpill}><Text style={styles.rpillLabel}>🔮</Text><Text style={styles.rpillVal}>{G.mana}/{G.maxMana}</Text></View>
              <View style={styles.rpill}><Text style={styles.rpillLabel}>☠</Text><Text style={styles.rpillVal}>{(G.pGrave?.length || 0)}/{(G.eGrave?.length || 0)}</Text></View>
            </View>
          </View>
          {playPreviewCard && (
            <View pointerEvents="none" style={styles.playPreviewWrap}>
              {renderShowcaseCard(playPreviewCard, `play_preview_${playPreviewCard.iid || playPreviewCard.id}`, 1, 166, { compactView: true })}
            </View>
          )}
          <View style={[styles.battleBoard, isSmallPhone && { paddingVertical: 2, paddingHorizontal: 4 }]}>
          <Text style={[styles.zoneLabel, isTinyPhone && { marginTop: 2, marginBottom: 2 }]}>⚔ Enemy</Text>
          <TouchableOpacity
            style={[
              styles.leaderDisplay,
              isSmallPhone && { padding: 4 },
              hitFx?.targetKey === 'enemy_leader' && styles.hitFlashBorder,
            ]}
            onPress={() => (G.atker ? doAttack('leader', true) : playVOX(G.el.name, 'intro'))}
            onLongPress={() => openCardInspect(G.el, 'Enemy Leader')}
            delayLongPress={180}
            activeOpacity={1}
          >
            <TouchableOpacity style={styles.infoBtnLeader} onPress={() => openCardInspect(G.el, 'Enemy Leader')}>
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
            <View style={styles.leaderDisplayIcon}>{renderLeaderIcon(G.el.name, leaderIconSize)}</View>
            <View style={styles.leaderDisplayInfo}>
              <Text style={[styles.leaderDisplayName, isTinyPhone && { fontSize: 9 }]}>{G.el.name}  <Text style={styles.leaderTag}>LDR</Text></Text>
              <View style={[styles.leaderHpBadge, isTinyPhone && { minWidth: 34, height: 16, borderRadius: 8 }]}>
                <Image source={{ uri: STAT_ICONS.health }} style={styles.leaderHpBadgeImg} contentFit="cover" />
                <Text style={[styles.fieldStatBadgeText, isTinyPhone && styles.fieldStatBadgeTextTiny, G.eHp <= G.eMaxHp * 0.25 && styles.leaderHpCritical]}>
                  {`${Math.max(0, G.eHp)}/${G.eMaxHp}`}
                </Text>
              </View>
            </View>
            {damageFx?.targetKey === 'enemy_leader' && <FloatCombatText key={damageFx.key} text={`-${damageFx.amount}`} />}
            {deathFx?.targetKey === 'enemy_leader' && <FloatCombatText key={deathFx.key} text={deathFx.label || 'Defeated'} kind="death" />}
          </TouchableOpacity>
          <Text style={[styles.rowLabel, styles.rowLabelEnemy]}>Enemy Front Row</Text>
          <View style={[styles.fieldRow, { gap: boardGap }, isSmallPhone && { paddingVertical: 1, minHeight: isTinyPhone ? 46 : 52 }]}>
            {Array.from({ length: MAX_FIELD }).map((_, idx) => {
              const u = enemyFrontUnits[idx];
              if (!u) {
                return (
                  <View key={`enemy_front_empty_${idx}`} style={[styles.slotOutline, { width: boardCardW + (isTinyPhone ? 2 : 6), height: boardCardH + 24 }]}>
                    <Text style={styles.slotWatermark}>⚔</Text>
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  key={u.iid}
                  style={[
                    styles.fieldUnit,
                    { width: boardCardW + (isTinyPhone ? 2 : 6), padding: isTinyPhone ? 2 : 3 },
                    styles.fieldUnitEnemy,
                    hitFx?.targetKey === `enemy_${u.iid}` && styles.hitFlashBorder,
                  ]}
                  onPress={() => (G.atker ? doAttack(u.iid, false) : playVOX(u.name, 'intro'))}
                  onLongPress={() => openCardInspect(u, `Enemy Front Slot ${idx + 1}`)}
                  delayLongPress={180}
                  activeOpacity={0.9}
                >
                  <TouchableOpacity style={styles.infoBtn} onPress={() => openCardInspect(u, `Enemy Front Slot ${idx + 1}`)}>
                    <Text style={styles.infoBtnText}>i</Text>
                  </TouchableOpacity>
                  <View style={styles.rarityIconWrap}>
                    <Image source={{ uri: getRarityIconUri(u.rarity || 'common') }} style={styles.rarityIconImg} contentFit="contain" />
                  </View>
                  <View style={styles.fieldUnitCardArt}>{renderCardArt(u, boardCardW, boardCardH, 4, false, `field_enemy_front_${u.iid || u.id}`)}</View>
                  <Text style={[styles.fieldUnitName, isTinyPhone && { fontSize: 7 }, { color: getPantheonColor(u.pantheon) }]} numberOfLines={1}>{u.name}</Text>
                  <View style={styles.fieldUnitStats}>
                    <View style={[styles.fieldStatBadge, isTinyPhone && styles.fieldStatBadgeTiny]}>
                      <Image source={{ uri: STAT_ICONS.health }} style={[styles.fieldStatBadgeImg, isTinyPhone && styles.fieldStatBadgeImgTiny, { tintColor: STAT_HP_TINT }]} contentFit="contain" />
                      <Text style={[styles.fieldStatBadgeText, isTinyPhone && styles.fieldStatBadgeTextTiny]}>{u.hp}</Text>
                    </View>
                    <View style={[styles.fieldStatBadge, isTinyPhone && styles.fieldStatBadgeTiny]}>
                      <Image source={{ uri: STAT_ICONS.strength }} style={[styles.fieldStatBadgeImg, isTinyPhone && styles.fieldStatBadgeImgTiny, { tintColor: STAT_ATK_TINT }]} contentFit="contain" />
                      <Text style={[styles.fieldStatBadgeText, isTinyPhone && styles.fieldStatBadgeTextTiny]}>{computeUnitAttack(u)}</Text>
                    </View>
                  </View>
                  {damageFx?.targetKey === `enemy_${u.iid}` && <FloatCombatText key={damageFx.key} text={`-${damageFx.amount}`} />}
                  {deathFx?.targetKey === `enemy_${u.iid}` && <FloatCombatText key={deathFx.key} text={deathFx.label || 'Defeated'} kind="death" />}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelEnemy]}>Enemy Spell/Trap Row</Text>
          <View style={[styles.fieldRow, { gap: boardGap }, isSmallPhone && { paddingVertical: 1, minHeight: isTinyPhone ? 44 : 50 }]}>
            {Array.from({ length: SMITE_WARS_SYSTEM.MAX_TRAPS_ACTIVE }).map((_, idx) => (
              <View key={`enemy_back_slot_${idx}`} style={[styles.slotOutline, styles.slotOutlineSpell, { width: boardCardW + (isTinyPhone ? 2 : 6), height: boardCardH + 16 }]}>
                <Text style={styles.slotWatermark}>✦</Text>
              </View>
            ))}
          </View>
          <View style={styles.midInfoRow}>
            <Text style={[styles.synergyLine, isTinyPhone && { fontSize: 7 }]}>
              {`Turn ${G.turn} • Synergy: ${G.pl.pantheon} ${G.pl.cls} • Deck ${G.deck?.length || 0}`}
            </Text>
          </View>
          <View style={styles.classDotRow}>
            {[...new Set(G.pField.map((u) => u.cls))].map((cls) => (
              <View key={`synergy_${cls}`} style={styles.classDotItem}>
                <View style={[styles.classDot, { backgroundColor: getClassColor(cls) }]} />
                <Text style={styles.classDotText}>{`${cls} x${G.pField.filter((u) => u.cls === cls).length}`}</Text>
              </View>
            ))}
            <Text style={styles.classDotText}>{`Traps ${(G.pTraps?.length || 0)}`}</Text>
          </View>
          {G.mode === 'tutorial' && (
            <View style={styles.tutorialHintBox}>
              <Text style={styles.tutorialHintText}>
                {G.tutorialStep === 1
                  ? 'Tutorial: Deploy at least one unit from your hand.'
                  : G.tutorialStep === 2
                    ? 'Tutorial: Select your unit, then attack a valid enemy target.'
                    : G.tutorialStep === 3
                      ? 'Tutorial: Use your class ability, then press End Turn.'
                      : 'Tutorial: Great work. Finish the enemy leader to complete training.'}
              </Text>
              <TouchableOpacity
                style={styles.tutorialSkipBtn}
                onPress={async () => {
                  const nextStatus = { completed: false, skipped: true, rewarded: tutorialStatus.rewarded };
                  setTutorialStatus(nextStatus);
                  await saveTutorialStatus(nextStatus);
                  setG(null);
                  setScreen('start');
                }}
              >
                <Text style={styles.tutorialSkipText}>Skip Tutorial</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.logIconBtn} onPress={() => showTip(G.log.slice(-3).join('\n'))}>
            <Text style={styles.logIconText}>📜</Text>
          </TouchableOpacity>
          <Text style={[styles.rowLabel, styles.rowLabelAlly]}>Allied Front Row</Text>
          <View style={[styles.fieldRow, { gap: boardGap, marginTop: isTinyPhone ? 1 : 3 }, isSmallPhone && { paddingVertical: 1, minHeight: isTinyPhone ? 46 : 52 }]}>
            {Array.from({ length: MAX_FIELD }).map((_, idx) => {
              const u = playerFrontUnits[idx];
              if (!u) {
                return (
                  <View key={`player_front_empty_${idx}`} style={[styles.slotOutline, { width: boardCardW + (isTinyPhone ? 2 : 6), height: boardCardH + 24 }]}>
                    <Text style={styles.slotWatermark}>⚔</Text>
                  </View>
                );
              }
              const isAttacking = attackAnimating === u.iid;
              const card = (
                <TouchableOpacity
                  key={u.iid}
                  style={[
                    styles.fieldUnit,
                    { width: boardCardW + (isTinyPhone ? 2 : 6), padding: isTinyPhone ? 2 : 3 },
                    G.atker === u.iid && styles.fieldUnitSel,
                    hitFx?.targetKey === `player_${u.iid}` && styles.hitFlashBorder,
                  ]}
                  onPress={() => {
                    if (G.atker === u.iid) {
                      selectAtk(null);
                    } else if (!G.attackedIds[u.iid]) {
                      selectAtk(u.iid);
                    } else {
                      playVOX(u.name, 'intro');
                    }
                  }}
                  onLongPress={() => openCardInspect(u, `Allied Front Slot ${idx + 1}`)}
                  delayLongPress={180}
                  activeOpacity={0.9}
                >
                  <TouchableOpacity style={styles.infoBtn} onPress={() => openCardInspect(u, `Allied Front Slot ${idx + 1}`)}>
                    <Text style={styles.infoBtnText}>i</Text>
                  </TouchableOpacity>
                  <View style={styles.rarityIconWrap}>
                    <Image source={{ uri: getRarityIconUri(u.rarity) }} style={styles.rarityIconImg} contentFit="contain" />
                  </View>
                  <View style={styles.fieldUnitCardArt}>{renderCardArt(u, boardCardW, boardCardH, 4, false, `field_player_front_${u.iid || u.id}`)}</View>
                  <Text style={[styles.fieldUnitName, isTinyPhone && { fontSize: 7 }, { color: getPantheonColor(u.pantheon) }]} numberOfLines={1}>{u.name}</Text>
                  <View style={styles.fieldUnitStats}>
                    <View style={[styles.fieldStatBadge, isTinyPhone && styles.fieldStatBadgeTiny]}>
                      <Image source={{ uri: STAT_ICONS.health }} style={[styles.fieldStatBadgeImg, isTinyPhone && styles.fieldStatBadgeImgTiny, { tintColor: STAT_HP_TINT }]} contentFit="contain" />
                      <Text style={[styles.fieldStatBadgeText, isTinyPhone && styles.fieldStatBadgeTextTiny]}>{u.hp}</Text>
                    </View>
                    <View style={[styles.fieldStatBadge, isTinyPhone && styles.fieldStatBadgeTiny]}>
                      <Image source={{ uri: STAT_ICONS.strength }} style={[styles.fieldStatBadgeImg, isTinyPhone && styles.fieldStatBadgeImgTiny, { tintColor: STAT_ATK_TINT }]} contentFit="contain" />
                      <Text style={[styles.fieldStatBadgeText, isTinyPhone && styles.fieldStatBadgeTextTiny]}>{computeUnitAttack(u)}</Text>
                    </View>
                  </View>
                  {u.rank > 1 && <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{u.rank}</Text></View>}
                  {damageFx?.targetKey === `player_${u.iid}` && <FloatCombatText key={damageFx.key} text={`-${damageFx.amount}`} />}
                  {deathFx?.targetKey === `player_${u.iid}` && <FloatCombatText key={deathFx.key} text={deathFx.label || 'Defeated'} kind="death" />}
                </TouchableOpacity>
              );
              if (deployFxIid === u.iid) return <DeployAnimWrap key={u.iid}>{card}</DeployAnimWrap>;
              if (isAttacking) return <AttackAnimWrap key={u.iid}>{card}</AttackAnimWrap>;
              return card;
            })}
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelAlly]}>Allied Spell/Trap Row</Text>
          <View style={[styles.fieldRow, { gap: boardGap }, isSmallPhone && { paddingVertical: 1, minHeight: isTinyPhone ? 44 : 50 }]}>
            {Array.from({ length: SMITE_WARS_SYSTEM.MAX_TRAPS_ACTIVE }).map((_, idx) => {
              const trap = (G.pTraps || [])[idx];
              if (!trap) {
                return (
                  <View key={`player_back_slot_${idx}`} style={[styles.slotOutline, styles.slotOutlineSpell, { width: boardCardW + (isTinyPhone ? 2 : 6), height: boardCardH + 16 }]}>
                    <Text style={styles.slotWatermark}>✦</Text>
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  key={trap.iid || `trap_${idx}`}
                  style={[styles.slotOutline, styles.slotFilled, styles.slotOutlineSpell, { width: boardCardW + (isTinyPhone ? 2 : 6), height: boardCardH + 16 }]}
                  onLongPress={() => openCardInspect(trap, `Allied Spell/Trap Slot ${idx + 1}`)}
                  delayLongPress={180}
                  activeOpacity={0.9}
                >
                  <TouchableOpacity style={styles.infoBtn} onPress={() => openCardInspect(trap, `Allied Spell/Trap Slot ${idx + 1}`)}>
                    <Text style={styles.infoBtnText}>i</Text>
                  </TouchableOpacity>
                  <View style={styles.trapFaceDownCard}>
                    <Image source={SMITE_SCROLL_LOGO} style={styles.trapFaceDownLogo} contentFit="contain" />
                    <Text style={styles.trapFaceDownText}>SET</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          </View>
          <View style={styles.battleBottomHud}>
          <TouchableOpacity
            style={[styles.leaderDisplay, styles.leaderDisplayAlly, isSmallPhone && { padding: 4 }]}
            onPress={() => playVOX(G.pl.name, 'intro')}
            onLongPress={() => openCardInspect(G.pl, 'Allied Leader')}
            delayLongPress={180}
            activeOpacity={1}
          >
            <TouchableOpacity style={styles.infoBtnLeader} onPress={() => openCardInspect(G.pl, 'Allied Leader')}>
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
            <View style={styles.leaderDisplayIcon}>{renderLeaderIcon(G.pl.name, playerLeaderIconSize)}</View>
            <View style={styles.leaderDisplayInfo}>
              <Text style={[styles.leaderDisplayName, isTinyPhone && { fontSize: 9 }]}>{G.pl.name}  <Text style={styles.leaderTag}>LDR</Text></Text>
              <View style={[styles.leaderHpBadge, isTinyPhone && { minWidth: 34, height: 16, borderRadius: 8 }]}>
                <Image source={{ uri: STAT_ICONS.health }} style={styles.leaderHpBadgeImg} contentFit="cover" />
                <Text style={[styles.fieldStatBadgeText, isTinyPhone && styles.fieldStatBadgeTextTiny, G.pHp <= G.pMaxHp * 0.25 && styles.leaderHpCritical]}>
                  {`${Math.max(0, G.pHp)}/${G.pMaxHp}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.handWrap, isSmallPhone && { paddingVertical: 3, paddingHorizontal: 4 }]}>
            <View style={styles.handHeaderRow}>
              <Text style={[styles.handLabel, isTinyPhone && { fontSize: 7, marginBottom: 2 }]}>Your Hand — Tap to Play • Hold to Inspect</Text>
              <Text style={styles.handDeckCount}>{`Deck ${G.deck?.length || 0}`}</Text>
            </View>
            <Text style={styles.handRuleText}>God cards summon in front row slots. Trap cards set into 4 back-row slots. Spells cast instantly. Items let you pick an allied god to buff.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.handScroll, isTinyPhone && { gap: 4, paddingBottom: 2 }]}>
            {G.hand.map((c) => {
              const canAfford = G.mana >= c.cost;
              const isItemCard = (c.cardType || CARD_TYPE.GOD) === CARD_TYPE.ITEM;
              const needsGodTarget = isItemCard && !G.pField.length;
              const can = canAfford && !needsGodTarget;
              return (
                <TouchableOpacity
                  key={c.iid}
                  style={[styles.handCard, { width: handCardW }, can && styles.handCardPlay]}
                  onPress={() => {
                    if (!canAfford) return;
                    if (needsGodTarget) {
                      showTip('Items can only be played when you have at least one god on the field.');
                      return;
                    }
                    if ((c.cardType || CARD_TYPE.GOD) === CARD_TYPE.ITEM) {
                      setItemTargetCard(c);
                      setItemTargetIid(c.iid);
                      return;
                    }
                    deploy(c.iid);
                  }}
                  onLongPress={() => openCardInspect(c, 'Hand')}
                  delayLongPress={180}
                  activeOpacity={0.9}
                >
                  <TouchableOpacity style={styles.infoBtn} onPress={() => openCardInspect(c, 'Hand')}>
                    <Text style={styles.infoBtnText}>i</Text>
                  </TouchableOpacity>
                  <View style={[styles.rarityIconWrap, { height: 10, marginBottom: 1 }]}>
                    <Image source={{ uri: getRarityIconUri(c.rarity) }} style={styles.rarityIconImgSmall} contentFit="contain" />
                  </View>
                  <View style={styles.handCardCost}><Text style={styles.handCardCostText}>{c.cost}</Text></View>
                  <View style={[styles.cardTypeBadge, getCardTypeStyle(c)]}>
                    <Text style={styles.cardTypeText}>{getCardTypeLabel(c)}</Text>
                  </View>
                  {renderHandCardFace(c)}
                  <Text style={[styles.handCardName, isTinyPhone && { fontSize: 7 }, { color: getPantheonColor(c.pantheon) }]} numberOfLines={1}>{getCardDisplayName(c)}</Text>
                  <View style={styles.handCardStats}>
                    {c.cardType === CARD_TYPE.GOD ? (
                      <>
                        <View style={[styles.fieldStatBadge, styles.fieldStatBadgeTiny]}>
                          <Image source={{ uri: STAT_ICONS.health }} style={[styles.fieldStatBadgeImg, styles.fieldStatBadgeImgTiny, { tintColor: STAT_HP_TINT }]} contentFit="contain" />
                          <Text style={[styles.fieldStatBadgeText, styles.fieldStatBadgeTextTiny]}>{c.bHp}</Text>
                        </View>
                        <View style={[styles.fieldStatBadge, styles.fieldStatBadgeTiny]}>
                          <Image source={{ uri: STAT_ICONS.strength }} style={[styles.fieldStatBadgeImg, styles.fieldStatBadgeImgTiny, { tintColor: STAT_ATK_TINT }]} contentFit="contain" />
                          <Text style={[styles.fieldStatBadgeText, styles.fieldStatBadgeTextTiny]}>{c.bAtk}</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.handEffectText} numberOfLines={1}>
                        {c.cardType === CARD_TYPE.ITEM
                          ? `+${c.atkBoost || 0} ATK`
                          : c.cardType === CARD_TYPE.TRAP
                            ? 'TRAP'
                            : c.cardType === CARD_TYPE.SPELL
                              ? 'SPELL'
                              : `${c.damage || 0} DMG`}
                      </Text>
                    )}
                  </View>
                  {needsGodTarget && <Text style={styles.handConstraintText}>Need allied god</Text>}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </View>
          <View style={[styles.actionBar, isSmallPhone && { padding: 4, gap: 3 }]}>
            <View style={styles.manaRow}>
              {Array.from({ length: Math.min(G.maxMana, 10) }).map((_, i) => (
                <View key={i} style={[styles.manaDot, i < G.mana && styles.manaDotFull]} />
              ))}
              <Text style={styles.manaCountText}>{`${G.mana}/${G.maxMana}`}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.abilityBtn,
                (() => {
                  const unit = G.pField.find((u) => u.iid === G.atker);
                  const theme = getAbilityTheme(unit);
                  return { backgroundColor: theme.bg, borderColor: theme.border };
                })(),
                !(G.atker && !G.abilityUsedIds?.[G.atker]) && styles.abilityBtnDisabled,
              ]}
              onPress={() => G.atker && castAbility(G.atker)}
              disabled={!(G.atker && !G.abilityUsedIds?.[G.atker])}
            >
              {(() => {
                const unit = G.pField.find((u) => u.iid === G.atker);
                const display = unit ? getAbilityDisplay(unit) : null;
                const theme = getAbilityTheme(unit);
                return (
                  <View style={styles.abilityBtnRow}>
                    {!!display?.iconUri && <Image source={display.iconUri} style={styles.abilityBtnIcon} contentFit="cover" />}
                    <Text style={[styles.abilityBtnText, { color: theme.text }]}>
                      {unit ? `${display.name} (${getAbilityCost(unit)})` : 'Select God Ability'}
                    </Text>
                  </View>
                );
              })()}
            </TouchableOpacity>
            <TouchableOpacity style={styles.shopBtn} onPress={() => { refreshShop(); setShopVisible(true); }}>
              <Text style={styles.shopBtnText}>⚗ Shop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtn} onPress={endTurn}>
              <Text style={styles.endBtnText}>End Turn ›</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>
        </View>
        {showBattleTip && !!battleTip && (
          <View style={styles.battleTipWrap} pointerEvents="none">
            <View style={styles.battleTipBubble}>
              <Text style={styles.battleTipText}>{battleTip}</Text>
            </View>
        </View>
        )}
        <Modal
          visible={!!itemTargetIid && !!itemTargetCard}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setItemTargetCard(null);
            setItemTargetIid(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setItemTargetCard(null);
              setItemTargetIid(null);
            }}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.itemTargetPanel}>
              <Text style={styles.shopPanelTitle}>Choose God To Buff</Text>
              <Text style={styles.itemTargetSubtitle}>{itemTargetCard ? getCardDisplayName(itemTargetCard) : 'Item'}</Text>
              <ScrollView style={styles.itemTargetList} contentContainerStyle={{ gap: 6 }}>
                {(G.pField || []).map((u) => (
                  <TouchableOpacity
                    key={u.iid}
                    style={styles.itemTargetRow}
                    onPress={() => {
                      deploy(itemTargetIid, u.iid);
                      setItemTargetCard(null);
                      setItemTargetIid(null);
                    }}
                  >
                    {renderLeaderIcon(u.name, 24)}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTargetName}>{u.name}</Text>
                      <Text style={styles.itemTargetMeta}>{`HP ${u.hp}/${u.maxHp} • ATK ${computeUnitAttack(u)}`}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => { setItemTargetCard(null); setItemTargetIid(null); }}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        <Modal visible={shopVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShopVisible(false)}>
            <View style={styles.shopPanel}>
              <View style={styles.shopHandle} />
              <Text style={styles.shopPanelTitle}>⚗ Divine Market</Text>
              <View style={styles.shopGrid}>
                {shopList.map((u) => {
                  const cost = u.cost * 2;
                  const can = G.gold >= cost;
                  const iconKey = `shop_${u.id}`;
                  const shopItemIconSource = getSpecialCardIconForKey(u, iconKey);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.shopUnit, !can && styles.shopUnitCant]}
                      onPress={() => can && buyCard(u.id)}
                      disabled={!can}
                    >
                      <View style={[styles.rarityIconWrap, { height: 10, marginBottom: 1 }]}>
                        <Image source={{ uri: getRarityIconUri(u.rarity) }} style={styles.rarityIconImgSmall} contentFit="contain" />
                      </View>
                      <View style={styles.shopUnitArt}>
                        {(u.cardType || CARD_TYPE.GOD) === CARD_TYPE.GOD ? (
                          renderCardArt(u, 44, 32, 4, false, `shop_${u.id}`)
                        ) : shopItemIconSource ? (
                          <Image
                            source={shopItemIconSource}
                            style={styles.shopSpecialIcon}
                            contentFit="cover"
                            onError={() => markItemIconFailed(iconKey)}
                          />
                        ) : (
                          <View style={styles.cardArtPlaceholder}><Text style={styles.godIconPlaceholderText}>?</Text></View>
                        )}
                      </View>
                      <Text style={[styles.shopUnitName, { color: getPantheonColor(u.pantheon) }]} numberOfLines={1}>{getCardDisplayName(u)}</Text>
                      <Text style={styles.shopUnitCost}>💎{cost}</Text>
                      {(u.cardType || CARD_TYPE.GOD) === CARD_TYPE.GOD ? (
                        <Text style={styles.shopUnitStats}>❤{u.bHp} ⚔{u.bAtk}</Text>
                      ) : (
                        <Text style={styles.shopUnitStats}>
                          {u.cardType === CARD_TYPE.ITEM
                            ? `+${u.atkBoost || 0} ATK`
                            : u.cardType === CARD_TYPE.TRAP
                              ? 'TRAP'
                              : u.cardType === CARD_TYPE.SPELL
                                ? 'SPELL'
                                : `${u.damage || 0} DMG`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setShopVisible(false)}><Text style={styles.btnOutlineText}>Close Market</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // —— Game over
  if (screen === 'gameover' && G) {
    const won = G.eHp <= 0;
    return (
      <View style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <View style={styles.goRoot}>
          <Text style={styles.goIcon}>{won ? '🏆' : '💀'}</Text>
          <Text style={styles.goTitle}>{won ? 'VICTORY!' : 'DEFEATED'}</Text>
          <Text style={styles.goSub}>{won ? 'You defeated ' + G.el.name + '!' : G.el.name + ' was victorious.'}</Text>
          <Text style={styles.goStats}>Turn {G.turn} • {G.pField?.length ?? 0} units alive</Text>
          {G.mode === 'story' && won && (
            <Text style={styles.goStats}>{`Story reward earned: +${G.storyRewardGold || 0} gold`}</Text>
          )}
          {G.mode === 'tutorial' && (
            <Text style={styles.goStats}>
              {won
                ? `Tutorial complete. Rewards: +${TUTORIAL_REWARD_GOLD} gold + Tutorial Reward Pack.`
                : 'Retry tutorial to practice core mechanics.'}
            </Text>
          )}
          <TouchableOpacity style={styles.btnGold} onPress={() => newGame(G.pl)}><Text style={styles.btnGoldText}>Play Again</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => { setG(null); setScreen('start'); }}><Text style={styles.btnOutlineText}>Main Menu</Text></TouchableOpacity>
          {onBack && <TouchableOpacity style={styles.btnOutline} onPress={onBack}><Text style={styles.btnOutlineText}>← Back</Text></TouchableOpacity>}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  startRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingTop: 20 },
  startHeroCard: { width: '100%', maxWidth: 420, alignItems: 'center', backgroundColor: 'rgba(23,20,35,0.82)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.26)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 16, marginBottom: 10 },
  emblem: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emblemText: { fontSize: 28 },
  titleMain: { fontSize: 22, fontWeight: '700', color: GOLD_L, letterSpacing: 2 },
  titleSub: { fontSize: 9, letterSpacing: 4, color: MUTED, marginTop: 4, textTransform: 'uppercase' },
  divider: { width: 140, height: 1, backgroundColor: GOLD, marginVertical: 12, opacity: 0.6 },
  startDesc: { fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginBottom: 12 },
  startFeatureRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 },
  startFeaturePill: { backgroundColor: 'rgba(200,146,42,0.12)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.32)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  startFeaturePillText: { color: GOLD_L, fontSize: 10, letterSpacing: 0.2 },
  startFutureText: { color: '#a48b5f', fontSize: 10, textAlign: 'center' },
  btnGold: { backgroundColor: GOLD, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4, borderWidth: 1, borderColor: GOLD_L, minWidth: 200, alignItems: 'center', marginBottom: 8 },
  btnGoldText: { color: '#060606', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#7a5510', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 4, minWidth: 200, alignItems: 'center' },
  btnOutlineText: { color: '#f4d089', fontSize: 12, letterSpacing: 0.4, fontWeight: '700' },
  backBtn: { position: 'absolute', left: 10, zIndex: 50, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: 'rgba(18,17,30,0.9)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', elevation: 4 },
  backBtnText: { color: MUTED, fontSize: 11 },
  startNavRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6 },
  startNavTabsCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  startTopTabs: { flexDirection: 'row', flexWrap: 'nowrap', gap: 2, width: '100%', justifyContent: 'center', alignItems: 'center' },
  startTabBtn: { flexShrink: 1, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', backgroundColor: 'rgba(18,17,30,0.8)', minWidth: 0, alignItems: 'center' },
  startTabBtnActive: { borderColor: GOLD, backgroundColor: 'rgba(200,146,42,0.14)' },
  startTabText: { color: MUTED, fontSize: 10, lineHeight: 13, letterSpacing: 0.1, fontWeight: '600', includeFontPadding: false },
  startTabTextActive: { color: GOLD_L, fontWeight: '700' },
  authRoot: { justifyContent: 'center', paddingHorizontal: 16 },
  authTitle: { color: GOLD_L, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  authSubTitle: { color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 6, marginBottom: 12 },
  authLoadingText: { color: MUTED, fontSize: 12, marginTop: 10, textAlign: 'center' },
  authInput: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', backgroundColor: 'rgba(18,17,30,0.95)', color: '#efe3cc', paddingHorizontal: 12, fontSize: 12, marginBottom: 8 },
  authSubmitBtn: { marginTop: 2, borderRadius: 10, borderWidth: 1, borderColor: GOLD_L, backgroundColor: GOLD, paddingVertical: 10, alignItems: 'center' },
  authSubmitBtnDisabled: { opacity: 0.6 },
  authSubmitText: { color: '#070707', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  authErrorText: { color: '#f87171', fontSize: 10, marginBottom: 8, textAlign: 'center' },
  collectionRoot: { flex: 1, paddingHorizontal: 6, paddingBottom: 6 },
  collectionTitle: { color: GOLD_L, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 4, letterSpacing: 1 },
  collectionSub: { color: MUTED, fontSize: 10, textAlign: 'center', marginBottom: 8 },
  profileCard: { marginTop: 8, borderRadius: 16, borderWidth: 2, borderColor: '#1391ff', backgroundColor: 'rgba(5,16,48,0.92)', overflow: 'hidden' },
  profileBanner: { height: 112, width: '100%', position: 'relative', borderBottomWidth: 1, borderBottomColor: 'rgba(19,145,255,0.4)' },
  profileBannerImage: { width: '100%', height: '100%' },
  profileBannerFallback: { flex: 1, backgroundColor: 'rgba(35,64,125,0.42)' },
  profileRefreshBtn: { position: 'absolute', right: 10, top: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(6,15,38,0.72)', paddingVertical: 5, paddingHorizontal: 10 },
  profileRefreshText: { color: '#dbeafe', fontSize: 10, fontWeight: '700' },
  profileSignOutBtn: { position: 'absolute', left: 10, top: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,169,169,0.55)', backgroundColor: 'rgba(45,10,16,0.74)', paddingVertical: 5, paddingHorizontal: 10 },
  profileSignOutText: { color: '#fecaca', fontSize: 10, fontWeight: '700' },
  profileMainRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 12, alignItems: 'center' },
  profileAvatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#1391ff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(40,34,22,0.75)' },
  profileAvatarImage: { width: '100%', height: '100%' },
  profileAvatarFallback: { fontSize: 30 },
  profileIdentityCol: { flex: 1 },
  profileName: { color: '#f7c14f', fontSize: 22, fontWeight: '900' },
  profileMeta: { color: '#c9d5f7', fontSize: 12, marginTop: 2 },
  accountTypeBadge: { marginTop: 6, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(148,204,255,0.45)', backgroundColor: 'rgba(19,56,110,0.35)', paddingHorizontal: 8, paddingVertical: 3 },
  accountTypeBadgeText: { color: '#dbeafe', fontSize: 9, fontWeight: '700' },
  accountTypeToggleRow: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 2 },
  accountTypeToggleBtn: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(19,145,255,0.35)', backgroundColor: 'rgba(8,20,52,0.9)', paddingVertical: 4, paddingHorizontal: 8 },
  accountTypeToggleBtnActive: { borderColor: 'rgba(240,192,96,0.6)', backgroundColor: 'rgba(200,146,42,0.2)' },
  accountTypeToggleBtnDisabled: { opacity: 0.45 },
  accountTypeToggleText: { color: '#c9d5f7', fontSize: 9, fontWeight: '700' },
  accountTypeToggleTextActive: { color: '#f0c060' },
  accountTypeToggleTextDisabled: { color: 'rgba(201,213,247,0.68)' },
  accountTypeNote: { marginTop: 2, color: '#95a5d6', fontSize: 9 },
  profileXpBarBg: { marginTop: 8, width: '100%', height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  profileXpBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#22c055' },
  profileStatGrid: { marginTop: 2, width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12 },
  profileStatItem: { width: '31%', minWidth: 90, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(19,145,255,0.45)', backgroundColor: 'rgba(8,20,52,0.98)', paddingVertical: 8, paddingHorizontal: 8 },
  profileStatLabel: { color: '#95a5d6', fontSize: 10 },
  profileStatValue: { color: '#eaf2ff', fontSize: 13, fontWeight: '800', marginTop: 2 },
  collectionSearchWrap: { marginBottom: 8 },
  collectionSearchInput: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,146,42,0.24)', backgroundColor: 'rgba(18,17,30,0.9)', color: '#efe3cc', paddingHorizontal: 12, fontSize: 12 },
  collectionModeToggle: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4, marginBottom: 4 },
  modeToggleBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', backgroundColor: 'rgba(18,17,30,0.8)' },
  modeToggleBtnActive: { backgroundColor: 'rgba(200,146,42,0.18)', borderColor: 'rgba(200,146,42,0.7)' },
  modeToggleText: { fontSize: 11, lineHeight: 14, color: '#fff6db', fontWeight: '700' },
  modeToggleTextActive: { color: GOLD },
  collectionFilterBlock: { marginBottom: 6, backgroundColor: 'rgba(18,17,30,0.75)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.18)', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 6 },
  filterButtonRow: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: 3 },
  filterButton: { backgroundColor: 'rgba(30,28,44,0.95)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 5 },
  filterButtonActive: { backgroundColor: 'rgba(200,146,42,0.18)', borderColor: 'rgba(200,146,42,0.58)' },
  filterButtonText: { color: '#fff6db', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  filterButtonTextActive: { color: GOLD_L, fontWeight: '700' },
  filterOptionsBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.16)', paddingTop: 7 },
  filterDropdownScroll: { maxHeight: 170 },
  filterDropdownList: { gap: 6, paddingHorizontal: 4, paddingBottom: 6 },
  filterDropdownOption: { borderWidth: 1, borderColor: 'rgba(200,146,42,0.24)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(33,31,46,0.92)' },
  filterDropdownOptionActive: { borderColor: 'rgba(200,146,42,0.58)', backgroundColor: 'rgba(200,146,42,0.16)' },
  filterDropdownOptionText: { color: '#cbb592', fontSize: 10 },
  filterDropdownOptionTextActive: { color: GOLD_L, fontWeight: '700' },
  filterChipRow: { paddingHorizontal: 8, paddingBottom: 7, gap: 6 },
  filterChip: { backgroundColor: 'rgba(36,32,48,0.95)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  filterChipActive: { backgroundColor: 'rgba(200,146,42,0.18)', borderColor: 'rgba(200,146,42,0.58)' },
  filterChipText: { color: MUTED, fontSize: 10 },
  filterChipTextActive: { color: GOLD_L, fontWeight: '700' },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignSelf: 'stretch', gap: 6, paddingBottom: 12 },
  shopHeroCard: { backgroundColor: 'rgba(22,20,34,0.86)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.28)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10, marginBottom: 8 },
  shopHeroTitle: { color: GOLD_L, fontSize: 12, fontWeight: '700' },
  shopHeroSub: { color: MUTED, fontSize: 10, marginTop: 3 },
  packList: { flex: 1 },
  packListContent: { gap: 8, paddingHorizontal: 2, paddingBottom: 14 },
  packCard: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(23,21,36,0.95)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', borderRadius: 10, padding: 10 },
  packCardBlocked: { opacity: 0.5 },
  packName: { color: GOLD_L, fontSize: 12, fontWeight: '700' },
  packDesc: { color: MUTED, fontSize: 10, marginTop: 2 },
  packChipRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  packCostChip: { backgroundColor: 'rgba(36,74,165,0.2)', borderWidth: 1, borderColor: 'rgba(126,170,255,0.45)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  packCostChipText: { color: '#abd0ff', fontSize: 9, fontWeight: '700' },
  packCountChip: { backgroundColor: 'rgba(200,146,42,0.16)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.45)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  packCountChipText: { color: '#f0d8a0', fontSize: 9, fontWeight: '700' },
  packGuaranteeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  packGuaranteeChip: { backgroundColor: 'rgba(58,154,48,0.16)', borderWidth: 1, borderColor: 'rgba(84,190,72,0.34)', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },
  packGuaranteeText: { color: '#a4dda2', fontSize: 8 },
  packStatusText: { color: '#97856a', fontSize: 9, marginTop: 6 },
  packOpenBtn: { backgroundColor: GOLD, borderColor: GOLD_L, borderWidth: 1, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 12 },
  packOpenBtnBlocked: { backgroundColor: '#444', borderColor: '#666' },
  packOpenText: { color: '#060606', fontWeight: '700', fontSize: 10, letterSpacing: 0.4 },
  packRevealPanel: { backgroundColor: BGC, width: '100%', maxWidth: 460, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 12, paddingBottom: 18, maxHeight: '86%' },
  packRevealCue: { color: '#b9cbff', fontSize: 10, textAlign: 'center', marginTop: -4, marginBottom: 8 },
  packRevealRow: { gap: 10, paddingBottom: 10 },
  showcaseCardWrap: { width: 108, alignItems: 'center', overflow: 'visible', position: 'relative' },
  showcaseOuterFoilHalo: { position: 'absolute', top: 4, left: -6, right: -6, bottom: 26, borderRadius: 14 },
  showcaseFrame: { marginTop: 8, width: '100%', borderRadius: 10, backgroundColor: '#3c2a0c', borderWidth: 1, borderColor: '#7a5818', overflow: 'hidden' },
  showcaseFrameFoil: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 13, elevation: 10 },
  showcaseFrameLegendary: { borderWidth: 2, borderColor: '#f2be58' },
  showcaseFrameFullArt: { borderWidth: 1, borderColor: '#d6b36b' },
  showcaseBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f0c04', borderBottomWidth: 1, borderBottomColor: 'rgba(160,110,20,0.5)', paddingHorizontal: 6, paddingVertical: 4 },
  showcaseBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 2 },
  showcaseBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  showcasePantheonIcon: { width: 14, height: 14 },
  showcasePantheonDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9a7020' },
  showcaseBannerText: { color: 'rgba(220,175,90,0.8)', fontSize: 10, letterSpacing: 0.3, flex: 1, fontWeight: '700' },
  showcaseRarityPip: { width: 8, height: 8, borderRadius: 4 },
  showcaseRarityIcon: { width: 18, height: 18 },
  showcaseRarityGem: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: 'rgba(0,0,0,0.5)' },
  showcaseRarityGemIcon: { width: 22, height: 22, position: 'absolute', left: 0, top: 0, borderRadius: 11 },
  showcaseRarityGemText: { fontSize: 10, fontWeight: '800', zIndex: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  showcaseCostTag: { color: '#d8e6ff', fontSize: 9, fontWeight: '700', backgroundColor: '#274aa5', borderWidth: 1, borderColor: '#8bb0ff', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  showcaseArt: { height: 220, backgroundColor: '#0e0b06', position: 'relative', overflow: 'hidden' },
  showcasePantheonAura: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.14 },
  showcaseFoilColorWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 },
  showcaseFoilEdgeGlow: { position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderWidth: 1, borderRadius: 8, opacity: 0.74 },
  showcaseArtInner: { flex: 1, width: '100%', position: 'relative' },
  showcaseSpecialArt: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141014' },
  showcaseSpecialIcon: { width: 96, height: 96 },
  showcaseSpecialFallback: { color: GOLD, fontSize: 16 },
  showcaseFoilSweep: { position: 'absolute', right: 4, top: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 1 },
  showcaseFoilSweepText: { color: '#f8f7ff', fontSize: 7, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  showcasePrismaticTag: { position: 'absolute', left: 4, top: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(125,255,237,0.6)', backgroundColor: 'rgba(41,133,171,0.35)', paddingHorizontal: 6, paddingVertical: 1 },
  showcasePrismaticTagText: { color: '#d5feff', fontSize: 7, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  showcaseNameOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingBottom: 5, backgroundColor: 'rgba(0,0,0,0.75)' },
  showcaseName: { color: '#f0d058', textAlign: 'center', fontSize: 13, fontWeight: '900', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  showcaseEpithet: { color: 'rgba(190,150,55,0.95)', textAlign: 'center', fontSize: 9, marginTop: 0, fontWeight: '800', fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  showcaseDivider: { height: 1, marginHorizontal: 5, backgroundColor: 'rgba(180,130,30,0.55)' },
  showcaseTextSection: { paddingHorizontal: 6, paddingTop: 5, paddingBottom: 5, backgroundColor: '#110d07', height: 74, overflow: 'hidden' },
  showcaseAbilityName: { color: 'rgba(210,175,70,0.95)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  showcaseAbilityBody: { color: 'rgba(185,155,90,0.9)', fontSize: 9, lineHeight: 12, marginTop: 0 },
  showcaseFlavor: { color: 'rgba(155,120,70,0.8)', fontSize: 8, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  showcaseStatsFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 4, paddingBottom: 5, backgroundColor: '#100b05', borderTopWidth: 1, borderTopColor: 'rgba(120,80,20,0.35)' },
  showcaseStatCol: { alignItems: 'center', justifyContent: 'flex-end' },
  showcaseStatLabel: { fontSize: 7, fontWeight: '700', color: 'rgba(200,170,100,0.85)', letterSpacing: 0.3, marginBottom: 0, textTransform: 'uppercase' },
  showcaseStatGem: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  showcaseStatIcon: { width: 22, height: 22, position: 'absolute', left: 0, top: 0, borderRadius: 11 },
  showcaseStatIconSmall: { width: 22, height: 22, position: 'absolute', left: 0, top: 0, borderRadius: 11 },
  showcaseGemText: { color: '#fff', fontSize: 9, fontWeight: '800', zIndex: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  showcaseCenterStat: { flex: 1 },
  showcaseCenterStatValue: { color: '#d4a83a', fontSize: 11, fontWeight: '800' },
  showcaseCenterStatLabel: { color: 'rgba(180,130,40,0.75)', fontSize: 7, letterSpacing: 0.5 },
  showcaseCollector: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, paddingVertical: 3, backgroundColor: '#050403' },
  showcaseCollectorText: { color: 'rgba(170,130,60,0.6)', fontSize: 7, fontWeight: '700' },
  showcaseCollectorSub: { width: '100%', paddingHorizontal: 5, paddingBottom: 3, backgroundColor: '#050403' },
  showcaseCollectorSubText: { color: 'rgba(190,170,130,0.68)', fontSize: 7, fontWeight: '700' },
  showcaseCollectorSubTextAlt: { color: 'rgba(148,140,130,0.78)', fontSize: 7, fontWeight: '700', marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center' },
  inspectOverlay: { flex: 1, backgroundColor: 'rgba(2,3,8,0.88)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  inspectPanel: { width: '100%', maxWidth: 430, alignItems: 'center', backgroundColor: 'rgba(12,14,28,0.92)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, overflow: 'hidden' },
  inspectTitle: { color: GOLD_L, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  inspectHint: { color: MUTED, fontSize: 10, marginTop: 3, marginBottom: 8, textAlign: 'center' },
  inspectFoilAuraPrimary: { position: 'absolute', top: 64, left: 20, right: 20, height: 360, borderRadius: 24 },
  inspectCardWrap: { alignItems: 'center', justifyContent: 'center' },
  inspectCardStage: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  inspectFaceSingle: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },
  inspectBackCard: { marginTop: 8, height: 336, borderRadius: 10, borderWidth: 1, borderColor: '#8b6422', backgroundColor: '#0d0b08', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  inspectBackHaloOuter: { width: 118, height: 118, borderRadius: 59, borderWidth: 1, borderColor: 'rgba(200,146,42,0.42)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,146,42,0.09)' },
  inspectBackHaloInner: { width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(200,146,42,0.55)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,18,30,0.92)' },
  inspectBackLogo: { width: 70, height: 70 },
  inspectBackTitle: { marginTop: 10, color: GOLD_L, fontSize: 15, fontWeight: '900', letterSpacing: 1.3 },
  inspectBackSub: { marginTop: 2, color: 'rgba(190,160,95,0.88)', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  inspectBackDivider: { marginTop: 10, marginBottom: 10, width: '72%', height: 1, backgroundColor: 'rgba(200,146,42,0.35)' },
  inspectBackText: { color: 'rgba(210,175,90,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' },
  htpPanel: { backgroundColor: BGC, width: '100%', maxWidth: 430, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 14, paddingBottom: 20, maxHeight: '78%' },
  htpTitle: { fontSize: 14, color: GOLD, letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  htpSection: { fontSize: 12, color: GOLD_L, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  htpScroll: { marginBottom: 12 },
  htpBody: { fontSize: 11, color: MUTED, lineHeight: 20, marginBottom: 8 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(10,10,18,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(200,146,42,0.2)' },
  topbarLogo: { fontSize: 12, color: GOLD, letterSpacing: 1 },
  topbarTurn: { fontSize: 10, color: MUTED },
  topbarBack: { borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3 },
  topbarBackText: { color: MUTED, fontSize: 9 },
  topbarBackExit: { backgroundColor: '#7a1d1d', borderColor: '#e07878' },
  topbarBackExitText: { color: '#ffe9e9', fontWeight: '700', letterSpacing: 0.3 },
  resRow: { flexDirection: 'row', gap: 6 },
  rpill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(200,146,42,0.1)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  rpillLabel: { fontSize: 10 },
  rpillVal: { color: GOLD_L, fontWeight: '600', fontSize: 10 },
  leaderHeader: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  leaderHeaderTitle: { fontSize: 13, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' },
  leaderHeaderSub: { fontSize: 10, color: MUTED, marginTop: 2 },
  leaderHeaderHint: { fontSize: 9, color: 'rgba(200,170,100,0.85)', marginTop: 3 },
  leaderScroll: { flex: 1 },
  leaderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, paddingBottom: 12 },
  leaderCardWrap: { width: (SCREEN_WIDTH - 10 * 2 - 6) / 2 },
  leaderCard: { width: '100%', backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', borderRadius: 6, padding: 8, alignItems: 'center' },
  leaderInfoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  leaderInfoPanel: { backgroundColor: '#07153a', width: '100%', maxWidth: 430, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(98,160,255,0.45)', padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
  leaderInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  leaderInfoTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  leaderInfoIconWrap: { marginRight: 8 },
  leaderInfoTitle: { color: GOLD, fontSize: 13, fontWeight: '700', flex: 1 },
  leaderInfoCloseBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)', alignItems: 'center', justifyContent: 'center' },
  leaderInfoCloseText: { color: GOLD_L, fontSize: 18, lineHeight: 20, fontWeight: '700' },
  leaderInfoAbility: { fontSize: 11, color: MUTED, lineHeight: 18 },
  leaderInfoMeta: { fontSize: 10, color: 'rgba(215,182,117,0.95)', marginTop: 8, lineHeight: 15 },
  leaderCardSel: { borderColor: GOLD, backgroundColor: BGC2, shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  leaderCardIcon: { marginBottom: 4 },
  leaderCardName: { fontSize: 11, color: '#f0e8d0', fontWeight: '600' },
  leaderCardClass: { fontSize: 9, color: MUTED, marginTop: 1 },
  leaderCardPills: { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'flex-end' },
  pillStatCol: { alignItems: 'center' },
  pillStatLabel: { fontSize: 6, fontWeight: '700', color: 'rgba(200,170,100,0.85)', letterSpacing: 0.3, marginBottom: 1, textTransform: 'uppercase' },
  pillStatBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pillStatBadgeImg: { width: 20, height: 20, position: 'absolute', left: 0, top: 0, borderRadius: 10 },
  pillStatBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff', zIndex: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  pillHp: {},
  pillAtk: {},
  pillWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pillStatIcon: { width: 12, height: 12 },
  pillText: { fontSize: 8 },
  fieldUnitStatRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fieldStatBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  fieldStatBadgeTiny: { width: 18, height: 18, borderRadius: 9 },
  fieldStatBadgeImg: { width: 24, height: 24, position: 'absolute', left: 0, top: 0, borderRadius: 12 },
  fieldStatBadgeImgTiny: { width: 18, height: 18, position: 'absolute', left: 0, top: 0, borderRadius: 9 },
  fieldStatBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff', zIndex: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1, includeFontPadding: false, textAlignVertical: 'center' },
  fieldStatBadgeTextTiny: { fontSize: 6 },
  fieldStatIcon: { width: 12, height: 12 },
  fieldStatIconTiny: { width: 10, height: 10 },
  leaderHpIcon: { width: 14, height: 14 },
  leaderHpBadge: { minWidth: 42, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginTop: 2, alignSelf: 'flex-start' },
  leaderHpBadgeImg: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', borderRadius: 9 },
  confirmWrap: { padding: 10 },
  confirmBtn: { maxWidth: '100%' },
  battleBoard: { flex: 1, width: '100%', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4 },
  zoneLabel: { fontSize: 8, letterSpacing: 1, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  rowLabel: { fontSize: 8, marginTop: 1, marginBottom: 1, letterSpacing: 0.4, fontWeight: '700' },
  rowLabelEnemy: { color: '#ff9ca7' },
  rowLabelAlly: { color: '#f4d089' },
  playPreviewWrap: { position: 'absolute', left: 0, right: 0, top: '34%', alignItems: 'center', zIndex: 22, opacity: 0.98 },
  slotOutline: { borderWidth: 1, borderColor: 'rgba(200,146,42,0.4)', borderRadius: 6, borderStyle: 'dashed', backgroundColor: 'rgba(18,17,30,0.35)' },
  slotOutlineSpell: { borderColor: 'rgba(130,170,255,0.5)' },
  slotFilled: { borderStyle: 'solid', backgroundColor: BGC, padding: 4, alignItems: 'center', justifyContent: 'center' },
  slotIndexText: { color: '#8ea8d6', fontSize: 6, marginTop: 2, marginBottom: 2, textAlign: 'center' },
  slotWatermark: { color: 'rgba(132,154,195,0.28)', fontSize: 13, textAlign: 'center', marginTop: 4 },
  trapFaceDownCard: { flex: 1, width: '100%', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(140,170,255,0.55)', backgroundColor: 'rgba(10,14,32,0.92)', alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  trapFaceDownLogo: { width: 14, height: 14, opacity: 0.9 },
  trapFaceDownText: { marginTop: 2, fontSize: 6, color: '#a8c7ff', letterSpacing: 0.5, fontWeight: '700' },
  leaderDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(18,17,30,0.9)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 7, paddingVertical: 4, paddingHorizontal: 7, width: '96%' },
  leaderDisplayAlly: { borderColor: 'rgba(96,158,255,0.42)', backgroundColor: 'rgba(12,19,36,0.92)' },
  leaderDisplayIcon: {},
  leaderDisplayInfo: { flex: 1 },
  leaderDisplayName: { fontSize: 9, color: GOLD },
  leaderTag: { fontSize: 8, color: '#9dc7ff', fontWeight: '700' },
  leaderHpSimple: { fontSize: 10, color: '#f8caca', marginTop: 2, backgroundColor: 'rgba(192,48,48,0.2)', borderWidth: 1, borderColor: 'rgba(240,96,96,0.45)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, alignSelf: 'flex-start' },
  leaderHpSimpleCompact: { fontSize: 9 },
  leaderHpCritical: { color: '#ffd0d0', shadowColor: '#ff4d4d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6 },
  hpBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hpBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  hpBarFill: { height: '100%', backgroundColor: STAT_HP_TINT, borderRadius: 2 },
  hpBarText: { fontSize: 9, color: '#f7d7d7', minWidth: 42, textAlign: 'right', includeFontPadding: false, textAlignVertical: 'center' },
  hpBarFillAlly: { backgroundColor: '#58a6ff' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, minHeight: 56, paddingVertical: 2, justifyContent: 'center', alignSelf: 'center', width: '96%' },
  fieldUnit: { width: 58, backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', borderRadius: 6, padding: 3, alignItems: 'center', position: 'relative' },
  fieldUnitEnemy: { borderColor: 'rgba(192,48,48,0.3)' },
  fieldUnitSel: { borderColor: GOLD, shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  fieldUnitTgt: { borderColor: '#c03030', shadowColor: '#c03030', shadowOpacity: 0.4, shadowRadius: 6 },
  hitFlashBorder: { borderColor: '#ff7f7f', shadowColor: '#ff7f7f', shadowOpacity: 0.5, shadowRadius: 8 },
  infoBtn: { position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(25,45,88,0.95)', borderWidth: 1, borderColor: '#9cc4ff', alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  infoBtnLeader: { position: 'absolute', top: -6, right: -6, width: 17, height: 17, borderRadius: 8.5, backgroundColor: 'rgba(25,45,88,0.95)', borderWidth: 1, borderColor: '#9cc4ff', alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  infoBtnText: { color: '#e8f2ff', fontSize: 9, fontWeight: '700', lineHeight: 10 },
  rarityBar: { height: 2, borderRadius: 1, marginBottom: 2, width: '100%' },
  rarityIconWrap: { height: 14, marginBottom: 2, width: '100%', alignItems: 'center', justifyContent: 'center' },
  rarityIconImg: { width: '100%', height: 14 },
  rarityIconImgSmall: { width: '100%', height: 10 },
  fieldUnitCardArt: { marginBottom: 2, overflow: 'hidden', borderRadius: 4 },
  fieldUnitName: { fontSize: 8, color: '#f0e8d0', maxWidth: 52, textAlign: 'center' },
  fieldUnitStats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 2 },
  fieldUnitHp: { fontSize: 9, color: '#f06060' },
  fieldUnitAtk: { fontSize: 9, color: GOLD_L },
  rankBadge: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontSize: 8, fontWeight: '700', color: '#060606' },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginVertical: 2, justifyContent: 'center' },
  traitPill: { backgroundColor: 'rgba(74,56,112,0.4)', borderWidth: 1, borderColor: 'rgba(122,95,170,0.3)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  traitPillText: { fontSize: 8, color: '#b090e0' },
  synergyLine: { fontSize: 9, color: '#c9d8ff', marginVertical: 1, textAlign: 'center', paddingHorizontal: 4 },
  logBox: { width: '96%', backgroundColor: 'rgba(18,17,30,0.8)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.1)', borderRadius: 4, padding: 4, maxHeight: 36 },
  logLine: { fontSize: 8, color: MUTED, lineHeight: 14 },
  handWrap: { paddingVertical: 5, paddingHorizontal: 6, backgroundColor: 'rgba(10,10,18,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.15)', minHeight: 74 },
  handHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handLabel: { fontSize: 8, letterSpacing: 1, color: MUTED, textAlign: 'left', marginBottom: 2 },
  handDeckCount: { color: '#9dc7ff', fontSize: 8, fontWeight: '700' },
  handRuleText: { fontSize: 7, color: '#b8c6ff', textAlign: 'center', marginBottom: 3 },
  handScroll: { flexDirection: 'row', gap: 8, paddingBottom: 4, paddingHorizontal: 6, justifyContent: 'flex-start', flexGrow: 1, alignItems: 'flex-start' },
  handCard: { width: 54, backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.4)', borderRadius: 6, padding: 3, alignItems: 'center', opacity: 0.7 },
  handCardPlay: { opacity: 1 },
  handCardCost: { position: 'absolute', top: -6, left: -4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#24479a', borderWidth: 1, borderColor: '#9fc5ff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, zIndex: 1 },
  handCardCostText: { fontSize: 10, fontWeight: '700', color: '#e5f2ff' },
  cardTypeBadge: { position: 'absolute', top: -5, right: -3, minWidth: 24, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 1 },
  typeGod: { backgroundColor: '#7a5a2a', borderWidth: 1, borderColor: '#f0c060' },
  typeItem: { backgroundColor: '#1f6b6e', borderWidth: 1, borderColor: '#67e8f9' },
  typeTrap: { backgroundColor: '#7a2331', borderWidth: 1, borderColor: '#fda4af' },
  typeSpell: { backgroundColor: '#5b2d8a', borderWidth: 1, borderColor: '#d8b4fe' },
  cardTypeText: { fontSize: 7, fontWeight: '700', color: '#f8f4ec' },
  handCardArt: { marginTop: 2, marginBottom: 2, overflow: 'hidden', borderRadius: 4 },
  specialCardFace: { width: 48, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,24,40,0.95)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)' },
  specialCardItemIcon: { width: 18, height: 18, borderRadius: 3, marginBottom: 1 },
  specialCardIcon: { fontSize: 13, color: GOLD_L, marginBottom: 1 },
  specialCardName: { fontSize: 7, color: MUTED, textAlign: 'center', paddingHorizontal: 2 },
  handCardName: { fontSize: 9, color: MUTED, maxWidth: 74, textAlign: 'center' },
  handCardStats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 2 },
  handEffectText: { fontSize: 8, color: '#b8c6ff', width: '100%', textAlign: 'center' },
  handConstraintText: { marginTop: 2, fontSize: 7, color: '#ffd3d3', textAlign: 'center' },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 5, backgroundColor: 'rgba(10,10,18,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.1)' },
  abilityBtn: { backgroundColor: 'rgba(36,90,146,0.58)', borderWidth: 1, borderColor: 'rgba(132,186,255,0.45)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4, maxWidth: 160 },
  abilityBtnDisabled: { opacity: 0.45 },
  abilityBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  abilityBtnIcon: { width: 14, height: 14, borderRadius: 3 },
  abilityBtnText: { color: '#d4e8ff', fontSize: 9 },
  battleScaleShell: { flex: 1, width: '100%', alignItems: 'center' },
  battleScaleRoot: { flex: 1, width: '100%', transformOrigin: 'top' },
  battleBottomHud: { width: '100%', flexShrink: 0, minHeight: 114, backgroundColor: 'rgba(10,10,18,0.93)' },
  battleBackBtn: { position: 'absolute', top: 8, left: 8, zIndex: 20, backgroundColor: '#1d7a4b', borderWidth: 1, borderColor: '#65d18e', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 9, shadowColor: '#65d18e', shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  battleBackBtnText: { color: '#effff5', fontSize: 10, letterSpacing: 0.4, fontWeight: '700' },
  midInfoRow: { width: '96%', alignItems: 'center', marginTop: 1, marginBottom: 0 },
  classDotRow: { width: '96%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 1 },
  classDotItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  classDot: { width: 6, height: 6, borderRadius: 3 },
  classDotText: { color: '#c0c9df', fontSize: 8 },
  logIconBtn: { alignSelf: 'center', marginTop: 1, marginBottom: 1, width: 26, height: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,17,30,0.8)' },
  logIconText: { fontSize: 11, color: '#b8a180' },
  battleTipWrap: { position: 'absolute', left: 0, right: 0, top: '34%', alignItems: 'center', paddingHorizontal: 18, zIndex: 25 },
  battleTipBubble: { backgroundColor: 'rgba(9,8,16,0.95)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.38)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, maxWidth: 360 },
  battleTipText: { color: '#efe3cc', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  floatCombatText: { fontSize: 8, fontWeight: '800', paddingVertical: 2, paddingHorizontal: 6, backgroundColor: 'rgba(9,8,16,0.82)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,160,160,0.75)', overflow: 'hidden' },
  manaRow: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  manaDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: 'rgba(30,70,200,0.2)', borderWidth: 1, borderColor: 'rgba(30,70,200,0.4)' },
  manaDotFull: { backgroundColor: '#4488ff', borderColor: '#88aaff' },
  manaCountText: { color: '#a9c8ff', fontSize: 9, marginLeft: 4, fontWeight: '700' },
  itemTargetPanel: { backgroundColor: BGC, width: '94%', maxWidth: 360, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)', padding: 12, maxHeight: '78%' },
  itemTargetSubtitle: { color: '#9dc7ff', fontSize: 10, textAlign: 'center', marginTop: -6, marginBottom: 10 },
  itemTargetList: { maxHeight: 260 },
  itemTargetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(132,186,255,0.28)', backgroundColor: 'rgba(20,25,44,0.82)' },
  itemTargetName: { color: '#f0e8d0', fontSize: 10, fontWeight: '700' },
  itemTargetMeta: { color: '#b8c6ff', fontSize: 9, marginTop: 1 },
  shopBtn: { backgroundColor: 'rgba(74,56,112,0.6)', borderWidth: 1, borderColor: 'rgba(122,95,170,0.4)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  shopBtnText: { color: '#b090e0', fontSize: 10 },
  endBtn: { flex: 1, backgroundColor: GOLD, borderWidth: 1, borderColor: GOLD_L, paddingVertical: 6, borderRadius: 4, alignItems: 'center' },
  endBtnText: { color: '#060606', fontSize: 11, fontWeight: '700' },
  playerLeaderBar: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, backgroundColor: 'rgba(18,17,30,0.85)', borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.15)' },
  playerLeaderSimple: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingTop: 2, paddingBottom: 2 },
  playerLeaderSimpleName: { color: GOLD, fontSize: 10, fontWeight: '600' },
  playerLeaderSimpleHp: { color: '#f8caca', fontSize: 10, marginLeft: 2 },
  godIconPlaceholder: { backgroundColor: BGC2, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  godIconPlaceholderText: { color: MUTED, fontSize: 16 },
  cardArtPlaceholder: { backgroundColor: BGC2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  shopPanel: { backgroundColor: BGC, width: '100%', maxWidth: 430, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 12, paddingBottom: 18 },
  shopHandle: { width: 28, height: 3, backgroundColor: 'rgba(200,146,42,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  shopPanelTitle: { fontSize: 13, color: GOLD, letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  shopUnit: { width: '31%', backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 5, padding: 5, alignItems: 'center' },
  shopUnitCant: { opacity: 0.5 },
  shopUnitArt: { marginBottom: 2, overflow: 'hidden', borderRadius: 4 },
  shopSpecialIcon: { width: 36, height: 36, borderRadius: 4 },
  shopUnitName: { fontSize: 7, color: MUTED, marginBottom: 2 },
  shopUnitCost: { fontSize: 8, color: '#88aaff', marginBottom: 1 },
  shopUnitStats: { fontSize: 7, color: MUTED },
  deckPanel: { backgroundColor: BGC, width: '100%', maxWidth: 460, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 12, paddingBottom: 18, maxHeight: '86%' },
  deckMetaText: { color: GOLD_L, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  deckMetaRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
  deckStatChip: { backgroundColor: 'rgba(200,146,42,0.12)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  deckStatText: { color: MUTED, fontSize: 10 },
  curveWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8, paddingHorizontal: 6 },
  curveBarSlot: { alignItems: 'center', width: 22 },
  curveBar: { width: 10, borderRadius: 4, backgroundColor: GOLD },
  curveLabel: { color: MUTED, fontSize: 8, marginTop: 2 },
  deckErrorText: { color: '#ff9b9b', fontSize: 10, marginBottom: 8, textAlign: 'center' },
  deckSectionTitle: { color: GOLD_L, fontSize: 10, marginBottom: 5, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  deckSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  deckSlotCard: { width: '31%', minWidth: 92, backgroundColor: BGC2, borderWidth: 1, borderColor: 'rgba(200,146,42,0.24)', borderRadius: 6, padding: 6 },
  deckSlotTitle: { color: '#f0e8d0', fontSize: 9, fontWeight: '700' },
  deckSlotMeta: { color: MUTED, fontSize: 8, marginTop: 2 },
  deckSlotActions: { flexDirection: 'row', gap: 4, marginTop: 5 },
  deckSlotBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(200,146,42,0.14)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)' },
  deckSlotBtnDisabled: { opacity: 0.45 },
  deckSlotBtnText: { color: GOLD, fontSize: 8, letterSpacing: 0.3 },
  deckShareInput: { minHeight: 56, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(200,146,42,0.24)', backgroundColor: 'rgba(12,11,20,0.95)', color: '#efe3cc', fontSize: 10, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6 },
  deckShareActions: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  deckShareNotice: { color: '#a7d2ff', fontSize: 9, textAlign: 'center', marginBottom: 6 },
  tutorialCard: { backgroundColor: 'rgba(22,20,34,0.88)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.28)', borderRadius: 12, padding: 12 },
  tutorialTitle: { color: GOLD_L, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tutorialBody: { color: MUTED, fontSize: 10, lineHeight: 16, marginBottom: 4 },
  tutorialBtn: { marginTop: 10, marginBottom: 0, alignSelf: 'center' },
  storyList: { gap: 8, paddingBottom: 16 },
  storyCard: { backgroundColor: 'rgba(22,20,34,0.9)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.28)', borderRadius: 12, padding: 10 },
  storyCardLocked: { opacity: 0.55 },
  storyTitle: { color: GOLD_L, fontSize: 12, fontWeight: '700' },
  storyDesc: { color: MUTED, fontSize: 10, marginTop: 3, lineHeight: 15 },
  storyMeta: { color: '#9dc7ff', fontSize: 9, marginTop: 4 },
  storyPlayBtn: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: 'rgba(200,146,42,0.18)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.45)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  storyPlayBtnLocked: { borderColor: 'rgba(120,120,120,0.35)', backgroundColor: 'rgba(80,80,80,0.2)' },
  storyPlayText: { color: GOLD, fontSize: 10, fontWeight: '700' },
  tutorialHintBox: { width: '96%', borderWidth: 1, borderColor: 'rgba(132,186,255,0.45)', backgroundColor: 'rgba(25,38,65,0.85)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginTop: 2, marginBottom: 2 },
  tutorialHintText: { color: '#d7ebff', fontSize: 9, textAlign: 'center' },
  tutorialSkipBtn: { marginTop: 6, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(12,19,36,0.75)' },
  tutorialSkipText: { color: '#ffe6be', fontSize: 9, fontWeight: '700' },
  deckPoolRow: { gap: 6, paddingHorizontal: 2, paddingBottom: 6 },
  deckPoolCard: { width: 102, backgroundColor: BGC2, borderWidth: 1, borderColor: 'rgba(200,146,42,0.24)', borderRadius: 6, padding: 6 },
  deckPoolCardName: { color: '#f0e8d0', fontSize: 10 },
  deckPoolCardMeta: { color: MUTED, fontSize: 9, marginTop: 2 },
  deckListScroll: { maxHeight: 180, marginBottom: 8 },
  deckListWrap: { gap: 4, paddingBottom: 8 },
  deckListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BGC2, borderWidth: 1, borderColor: 'rgba(200,146,42,0.18)', borderRadius: 5, paddingVertical: 5, paddingHorizontal: 8 },
  deckListName: { color: '#f0e8d0', fontSize: 10, maxWidth: '62%' },
  deckListMeta: { color: MUTED, fontSize: 9 },
  deckActions: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  deckActionBtn: { flex: 1, backgroundColor: 'rgba(200,146,42,0.14)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)', borderRadius: 4, paddingVertical: 7, alignItems: 'center' },
  deckActionText: { color: GOLD, fontSize: 10, letterSpacing: 0.4 },
  goRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  goIcon: { fontSize: 44 },
  goTitle: { fontSize: 20, fontWeight: '700', color: GOLD_L, letterSpacing: 1 },
  goSub: { fontSize: 12, color: MUTED },
  goStats: { fontSize: 11, color: MUTED },
});
