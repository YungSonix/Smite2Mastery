import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
  AppState,
  Image,
  Linking,
  Share,
  Animated,
} from 'react-native';
// Import supabase with fallback for missing config
let supabase;
try {
  supabase = require('../config/supabase').supabase;
} catch (e) {
  // Fallback mock supabase if config file is missing
  const mockQuery = {
    eq: () => ({
      single: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      update: () => ({
        eq: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      }),
    }),
    single: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
    upsert: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
  };
  supabase = {
    from: () => ({
      select: () => mockQuery,
      insert: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      upsert: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      update: () => mockQuery,
    }),
    rpc: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
    auth: {
      signIn: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      signUp: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      signOut: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
import CryptoJS from 'crypto-js';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { getLocalItemIcon, getLocalGodAsset } from './localIcons';
import ColorPicker from 'react-native-wheel-color-picker';

// Calculate dynamic font size based on text length and optional screen width (for responsive layout)
const getProfileNameFontSize = (text, screenWidth) => {
  if (!text) return 28;
  const length = text.length;
  const isMobile = Platform.OS !== 'web';
  // Scale down on narrow screens so the full name fits (e.g. mobile app) — slightly bigger base on mobile
  const narrow = screenWidth != null && screenWidth < 420;
  let baseSize = isMobile ? 26 : 28;  // a bit bigger on mobile (was 24)
  let minSize = isMobile ? 14 : 16;
  let threshold = isMobile ? 8 : 12;
  if (narrow) {
    baseSize = Math.min(baseSize, 23);  // a bit bigger on narrow (was 20)
    minSize = Math.min(minSize, 13);    // slightly higher floor (was 11)
    threshold = 6;
  }
  
  if (length <= threshold) {
    return baseSize;
  }
  
  const reductionPerChar = isMobile ? 0.9 : 0.7;  // slightly gentler shrink on mobile
  const reduction = (length - threshold) * reductionPerChar;
  const calculatedSize = baseSize - reduction;
  
  return Math.max(minSize, calculatedSize);
};

// Preferred roles metadata (used for selection & display)
const ROLE_ICON_BASE_URL = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Icons/Role%20Icons';
const ROLE_ICON_URLS = {
  ADC: `${ROLE_ICON_BASE_URL}/T_GodRole_Carry_Small.png`,
  Jungle: `${ROLE_ICON_BASE_URL}/T_GodRole_Jungle.png`,
  Mid: `${ROLE_ICON_BASE_URL}/T_GodRole_Mid_Small.png`,
  Solo: `${ROLE_ICON_BASE_URL}/T_GodRole_Solo_Small.png`,
  Support: `${ROLE_ICON_BASE_URL}/T_GodRole_Support.png`,
};
const PREFERRED_ROLE_META = {
  Support: {
    key: 'Support',
    label: 'Support',
    color: '#22c55e', // Green
    background: 'rgba(34, 197, 94, 0.16)',
    icon: ROLE_ICON_URLS.Support,
  },
  ADC: {
    key: 'ADC',
    label: 'ADC',
    color: '#a855f7', // Purple
    background: 'rgba(168, 85, 247, 0.16)',
    icon: ROLE_ICON_URLS.ADC,
  },
  Mid: {
    key: 'Mid',
    label: 'Mid',
    color: '#ef4444', // Red
    background: 'rgba(239, 68, 68, 0.16)',
    icon: ROLE_ICON_URLS.Mid,
  },
  Solo: {
    key: 'Solo',
    label: 'Solo',
    color: '#3b82f6', // Blue
    background: 'rgba(59, 130, 246, 0.16)',
    icon: ROLE_ICON_URLS.Solo,
  },
  Jungle: {
    key: 'Jungle',
    label: 'Jungle',
    color: '#f97316', // Orange
    background: 'rgba(249, 115, 22, 0.16)',
    icon: ROLE_ICON_URLS.Jungle,
  },
};

const PREFERRED_ROLE_ORDER = ['ADC', 'Solo', 'Support', 'Mid', 'Jungle'];

// Profile color/gradient presets (saved to Supabase so others see the same)
const PROFILE_COLOR_PRESETS = [
  { label: 'Blue', color: '#1e90ff' },
  { label: 'Purple', color: '#a855f7' },
  { label: 'Green', color: '#22c55e' },
  { label: 'Red', color: '#ef4444' },
  { label: 'Orange', color: '#f97316' },
  { label: 'Teal', color: '#14b8a6' },
  { label: 'Pink', color: '#ec4899' },
  { label: 'Cyan', color: '#06b6d4' },
  { label: 'Indigo', color: '#6366f1' },
  { label: 'Emerald', color: '#10b981' },
  { label: 'Rose', color: '#f43f5e' },
  { label: 'Gold', color: '#f59e0b' },
  { label: 'Lime', color: '#84cc16' },
  { label: 'Sky', color: '#0ea5e9' },
  { label: 'Slate', color: '#64748b' },
  { label: 'Crimson', color: '#dc2626' },
];
const CUSTOM_COLOR_SWATCHES = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#E11D48',
  '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A',
];

const PROFILE_BANNER_BASE_URL = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/Profile%20Banner';
const PROFILE_BANNER_PRESETS = [
  { key: 'none', label: 'None', image: null },
  { key: 'achilles', label: 'Achilles', image: `${PROFILE_BANNER_BASE_URL}/achilles.webp` },
  { key: 'agni', label: 'Agni', image: `${PROFILE_BANNER_BASE_URL}/agni.webp` },
  { key: 'aladdin', label: 'Aladdin', image: `${PROFILE_BANNER_BASE_URL}/aladdin.webp` },
  { key: 'amaterasu', label: 'Amaterasu', image: `${PROFILE_BANNER_BASE_URL}/amaterasu.webp` },
  { key: 'anhur', label: 'Anhur', image: `${PROFILE_BANNER_BASE_URL}/anhur.jpg` },
  { key: 'anubis', label: 'Anubis', image: `${PROFILE_BANNER_BASE_URL}/anubis.webp` },
  { key: 'aphrodite', label: 'Aphrodite', image: `${PROFILE_BANNER_BASE_URL}/aphrodite.webp` },
  { key: 'apollo', label: 'Apollo', image: `${PROFILE_BANNER_BASE_URL}/apollo.webp` },
  { key: 'ares', label: 'Ares', image: `${PROFILE_BANNER_BASE_URL}/ares.webp` },
  { key: 'artemis', label: 'Artemis', image: `${PROFILE_BANNER_BASE_URL}/artemis.webp` },
  { key: 'artio', label: 'Artio', image: `${PROFILE_BANNER_BASE_URL}/artio.webp` },
  { key: 'athena', label: 'Athena', image: `${PROFILE_BANNER_BASE_URL}/athena.webp` },
  { key: 'awilix', label: 'Awilix', image: `${PROFILE_BANNER_BASE_URL}/awilix.webp` },
  { key: 'bacchus', label: 'Bacchus', image: `${PROFILE_BANNER_BASE_URL}/bacchus.webp` },
  { key: 'baron-samedi', label: 'Baron Samedi', image: `${PROFILE_BANNER_BASE_URL}/baron-samedi.webp` },
  { key: 'bellona', label: 'Bellona', image: `${PROFILE_BANNER_BASE_URL}/bellona.webp` },
  { key: 'cabrakan', label: 'Cabrakan', image: `${PROFILE_BANNER_BASE_URL}/cabrakan.webp` },
  { key: 'cerberus', label: 'Cerberus', image: `${PROFILE_BANNER_BASE_URL}/cerberus.webp` },
  { key: 'cernunnos', label: 'Cernunnos', image: `${PROFILE_BANNER_BASE_URL}/cernunnos.jpg` },
  { key: 'chaac', label: 'Chaac', image: `${PROFILE_BANNER_BASE_URL}/chaac.webp` },
  { key: 'chiron', label: 'Chiron', image: `${PROFILE_BANNER_BASE_URL}/chiron.jpg` },
  { key: 'cupid', label: 'Cupid', image: `${PROFILE_BANNER_BASE_URL}/cupid.jpg` },
  { key: 'da-ji', label: 'Da Ji', image: `${PROFILE_BANNER_BASE_URL}/da-ji.webp` },
  { key: 'the-morrigan', label: 'The Morrigan', image: `${PROFILE_BANNER_BASE_URL}/the-morrigan.jpg` },
];

const BADGE_BASE_URL = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/Badges';
const BADGES_API_URL = 'https://api.github.com/repos/YungSonix/Smite2Mastery/contents/img/Badges';
const PROFILE_BADGE_FILES = [
  '60px-Achilles-MasteryBadge.png',
  '60px-Agni-MasteryBadge.png',
  '60px-Aladdin-MasteryBadge.png',
  '60px-Amaterasu-MasteryBadge.png',
  '60px-Anhur-MasteryBadge.png',
  '60px-Anubis-MasteryBadge.png',
  '60px-Aphrodite-MasteryBadge.png',
  '60px-Apollo-MasteryBadge.png',
  '60px-Ares-MasteryBadge.png',
  '60px-Artemis-MasteryBadge.png',
  '60px-Athena-MasteryBadge.png',
  '60px-Awillix-MasteryBadge.png',
  '60px-Bacchus-MasteryBadge.png',
  '60px-Badge-AngryFace(OB5).png',
  '60px-Badge-BabeCastle.png',
  '60px-Badge-BadAssSKull(OB3).png',
  '60px-Badge-CarnivalKiss(OB8).png',
  '60px-Badge-Chef.png',
  '60px-Badge-CosmicWitchCat(OB3).png',
  '60px-Badge-CuteCat(OB7).png',
  '60px-Badge-InsanityFace(OB7).png',
  '60px-Badge-IziDuster(OB7).png',
  '60px-Badge-KrakenDemon(OB3).png',
  '60px-Badge-MinionPeep(OB7).png',
  '60px-Badge-MoonStar(OB12).png',
  '60px-Badge-OblivionSeer(OB7).png',
  '60px-Badge-RaMerica(OB12).png',
  '60px-Badge-SharkTooth(OB10).png',
  '60px-Badge-SilentStrikel(OB3).png',
  '60px-Badge-SobekBunny(OB7).png',
  '60px-Badge-StumbleBlade(OB5).png',
  '60px-Badge-SweetHoney(OB9).png',
  '60px-Bari-MasteryBadge.png',
  '60px-BaronSamedi-MasteryBadge.png',
  '60px-Bellona-MasteryBadge.png',
  '60px-Cabrakan-MasteryBadge.png',
  '60px-Cerberus-MasteryBadge.png',
  '60px-Cernunnos-MasteryBadge.png',
  '60px-Chaac-MasteryBadge.png',
  '60px-ClosedBetaPlayerBadge.png',
  '60px-ClosedBetaSWCBadge.png',
  '60px-Cupid-MasteryBadge.png',
  '60px-Cutesy-AndroidHera.png',
  '60px-Cutesy-AnhurDeathPanther.png',
  '60px-Cutesy-Ares.png',
  '60px-Cutesy-BabaYaga.png',
  '60px-Cutesy-BadassKuku.png',
  '60px-Cutesy-Baron.png',
  '60px-Cutesy-CamelotDragon.png',
  '60px-Cutesy-Cerberus.png',
  '60px-Cutesy-Charybdis.png',
  '60px-Cutesy-CupidElf.png',
  '60px-Cutesy-Discordia.png',
  '60px-Cutesy-DiscordiaCelestialSyn.png',
  '60px-Cutesy-FatSeal.png',
  '60px-Cutesy-Fireball.png',
  '60px-Cutesy-Fishbowl.png',
  '60px-Cutesy-FluffyRabbit.png',
  '60px-Cutesy-Foxy.png',
  '60px-Cutesy-Freya.png',
  '60px-Cutesy-FrogSamurai.png',
  '60px-Cutesy-Hera.png',
  '60px-Cutesy-Kali.png',
  '60px-Cutesy-MerchantChange.png',
  '60px-Cutesy-Mewo.png',
  '60px-Cutesy-Panda.png',
  '60px-Cutesy-Pele.png',
  '60px-Cutesy-Senpai.png',
  '60px-Cutesy-TheMorrigan.png',
  '60px-Cutesy-ZhongKuiCat.png',
  '60px-Danzaburou-MasteryBadge.png',
  '60px-Event-OB11Fantasy01.png',
  '60px-Event-OB11Fantasy02.png',
  '60px-Event-OB11Fantasy03.png',
  '60px-Event-OB9MothersDayTiamat.png',
  '60px-Event001Badge01.png',
  '60px-Event001Badge02.png',
  '60px-EventSWCVegasBadge01.png',
  '60px-Fenrir-MasteryBadge.png',
  '60px-FoundersEditionBadge.png',
  '60px-Ganesha-MasteryBadge.png',
  '60px-Geb-MasteryBadge.png',
  '60px-GodChampBadge.png',
  '60px-GuanYu-MasteryBadge.png',
  '60px-Hades-MasteryBadge.png',
  '60px-Hecate-MasteryBadge.png',
  '60px-Hercules-MasteryBadge.png',
  '60px-Hunbatz-MasteryBadge.png',
  '60px-Izanami-MasteryBadge.png',
  '60px-JingWei-MasteryBadge.png',
  '60px-Kali-MasteryBadge.png',
  '60px-Khepri-MasteryBadge.png',
  '60px-Kukulkan-MasteryBadge.png',
  '60px-LaunchTournamentBadge.png',
  '60px-Loki-MasteryBadge.png',
  '60px-Medusa-MasteryBadge.png',
  '60px-Mercury-MasteryBadge.png',
  '60px-Merlin-MasteryBadge.png',
  '60px-Mordred-MasteryBadge.png',
  '60px-Mulan-MasteryBadge.png',
  '60px-Neith-MasteryBadge.png',
  '60px-Nemesis-MasteryBadge.png',
  '60px-NuWa-MasteryBadge.png',
  '60px-Odin-MasteryBadge.png',
  '60px-OpenBetaPS4Badge.png',
  '60px-OpenBetaPlayerBadge.png',
  '60px-OpenBetaSWCBadge.png',
  '60px-Pele-MasteryBadge.png',
  '60px-Poseidon-MasteryBadge.png',
  '60px-Ra-MasteryBadge.png',
  '60px-Rama-MasteryBadge.png',
  '60px-RankedTesterAdvancedBadge.png',
  '60px-RankedTesterBeginnerBadge.png',
  '60px-RankedTesterIntermediateBadge.png',
  '60px-Scylla-MasteryBadge.png',
  '60px-Sobek-MasteryBadge.png',
  '60px-Sol-MasteryBadge.png',
  '60px-SunWukong-MasteryBadge.png',
  '60px-Susano-MasteryBadge.png',
  '60px-T5Skin-Aphrodite.png',
  '60px-T5Skin-AresGodSlayer.png',
  '60px-T5Skin-BaronSam.png',
  '60px-T5Skin-Bellona.png',
  '60px-T5Skin-Chaac.png',
  '60px-T5Skin-Cthulhu.png',
  '60px-T5Skin-DemonicAnubus.png',
  '60px-T5Skin-EclipseSummonerHell.png',
  '60px-T5Skin-Fenrir.png',
  '60px-T5Skin-Hades.png',
  '60px-T5Skin-Izanami.png',
  '60px-T5Skin-Medusa.png',
  '60px-T5Skin-Poolseidon.png',
  '60px-T5Skin-Thanatos.png',
  '60px-T5Skin-TotemHouyYi.png',
  '60px-T5Skin-Ullr.png',
  '60px-T5Skin-Zeus.png',
  '60px-T_RankedTesterBeginner_Badge_256.png',
  '60px-Thanatos-MasteryBadge.png',
  '60px-TheMorrigan-MasteryBadge.png',
  '60px-Thor-MasteryBadge.png',
  '60px-Ullr-MasteryBadge.png',
  '60px-UltimateFoundersBadge.png',
  '60px-Vulcan-MasteryBadge.png',
  '60px-XboxKrackenBadge.png',
  '60px-Yemoja-MasteryBadge.png',
];
const getBadgeLabelFromFile = (filename) => {
  const base = String(filename || '')
    .replace(/^60px-/i, '')
    .replace(/\.png$/i, '')
    .replace(/-MasteryBadge$/i, '')
    .replace(/^Badge-/i, '')
    .replace(/^Cutesy-/i, '')
    .replace(/^T5Skin-/i, '')
    .replace(/^Event-/i, '')
    .replace(/^Event\d+/i, '')
    .replace(/(ClosedBeta|OpenBeta|LaunchTournament|RankedTester|Ultimate|FoundersEdition|Founders|SWC|Player|Badge|OB\d+)/gi, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\-_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = base.split(' ').filter(Boolean);
  const shortened = words.slice(0, 2).join(' ');
  return shortened || 'Badge';
};
const simplifyBadgeLabel = (label) => {
  const cleaned = String(label || '')
    .replace(/\(OB\d+\)/gi, '')
    .replace(/\bMastery\b/gi, '')
    .replace(/\bBadge\b/gi, '')
    .replace(/\bPlayer\b/gi, '')
    .replace(/\bEdition\b/gi, '')
    .replace(/\bTournament\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Badge';
  if (cleaned.length <= 18) return cleaned;
  const shortTwoWords = cleaned.split(' ').slice(0, 2).join(' ');
  return shortTwoWords.length <= 18 ? shortTwoWords : `${shortTwoWords.slice(0, 17)}…`;
};
const getBadgeIconUrl = (filename) => filename ? `${BADGE_BASE_URL}/${encodeURIComponent(filename)}` : null;
const mapBadgeFileToMeta = (file) => ({
  id: file,
  file,
  label: getBadgeLabelFromFile(file),
  icon: getBadgeIconUrl(file),
});
const PROFILE_BADGES = PROFILE_BADGE_FILES.map(mapBadgeFileToMeta);
const MAX_BADGES = 3;

// Titles and fonts come from the Shop only (earn in Challenges, buy in Shop)
let SHOP_TITLE_OPTIONS = [];
let SHOP_FONT_OPTIONS = [];
try {
  const shopData = require('../lib/shopData');
  SHOP_TITLE_OPTIONS = (shopData.SHOP_ITEM_POOL || []).filter((i) => i.type === 'title');
  SHOP_FONT_OPTIONS = (shopData.SHOP_ITEM_POOL || []).filter((i) => i.type === 'font');
} catch (_) {
  SHOP_TITLE_OPTIONS = [];
  SHOP_FONT_OPTIONS = [];
}

// Map shop font key to platform fontFamily (system/standard fonts for compatibility)
const PROFILE_FONT_FAMILY_MAP = {
  default: undefined,
  serif: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  rounded: Platform.OS === 'web' ? '"Segoe UI", system-ui, sans-serif' : 'System',
  condensed: Platform.OS === 'web' ? '"Arial Narrow", Arial, sans-serif' : 'System',
  comic: Platform.OS === 'web' ? 'Comic Sans MS, cursive' : 'System',
  elegant: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'Georgia',
  royal: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  strong: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  narrow: Platform.OS === 'web' ? 'Arial Narrow, Arial, sans-serif' : 'System',
  wide: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  mono: Platform.OS === 'web' ? 'monospace' : 'System',
  mythic: Platform.OS === 'web' ? 'Georgia, "Palatino Linotype", serif' : 'Georgia',
  mystic: Platform.OS === 'web' ? 'Georgia, cursive, serif' : 'Georgia',
  oracle: Platform.OS === 'web' ? '"Times New Roman", Times, serif' : 'System',
  rune: Platform.OS === 'web' ? 'monospace, serif' : 'System',
  titan: Platform.OS === 'web' ? 'Arial Black, Impact, sans-serif' : 'System',
  celestial: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'Georgia',
  shadow: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  ancient: Platform.OS === 'web' ? '"Times New Roman", Times, serif' : 'System',
  gothic: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  script: Platform.OS === 'web' ? 'cursive, "Comic Sans MS"' : 'System',
  bold: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  light: Platform.OS === 'web' ? 'Arial, sans-serif' : 'System',
  stencil: Platform.OS === 'web' ? 'Impact, Arial Black, sans-serif' : 'System',
  retro: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  tech: Platform.OS === 'web' ? 'monospace, "Courier New"' : 'System',
  cosmic: Platform.OS === 'web' ? 'Georgia, sans-serif' : 'Georgia',
  dragon: Platform.OS === 'web' ? 'Arial Black, Impact, sans-serif' : 'System',
  phoenix: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'Georgia',
  olympian: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  egyptian: Platform.OS === 'web' ? '"Times New Roman", serif' : 'System',
  norse: Platform.OS === 'web' ? 'Georgia, monospace, serif' : 'Georgia',
  graffiti: Platform.OS === 'web' ? '"Comic Sans MS", "Marker Felt", cursive' : 'System',
  glitch: Platform.OS === 'web' ? '"Courier New", monospace' : 'System',
  slime: Platform.OS === 'web' ? '"Comic Sans MS", cursive' : 'System',
  toxic: Platform.OS === 'web' ? '"Segoe UI", system-ui, sans-serif' : 'System',
  arcade: Platform.OS === 'web' ? '"Press Start 2P", "Courier New", monospace' : 'System',
  pixel: Platform.OS === 'web' ? '"Courier New", monospace' : 'System',
  spooky: Platform.OS === 'web' ? '"Times New Roman", "Creepster", serif' : 'System',
  agency_fb: Platform.OS === 'web' ? '"Agency FB", sans-serif' : 'System',
  algerian: Platform.OS === 'web' ? 'Algerian, serif' : 'System',
  bahnschrift: Platform.OS === 'web' ? 'Bahnschrift, system-ui, sans-serif' : 'System',
  baskerville_old: Platform.OS === 'web' ? '"Baskerville Old Face", serif' : 'Georgia',
  bauhaus: Platform.OS === 'web' ? '"Bauhaus 93", cursive' : 'System',
  bell_mt: Platform.OS === 'web' ? '"Bell MT", serif' : 'Georgia',
  berlin_sans: Platform.OS === 'web' ? '"Berlin Sans FB", sans-serif' : 'System',
  bernard: Platform.OS === 'web' ? '"Bernard MT Condensed", serif' : 'System',
  blackadder: Platform.OS === 'web' ? '"Blackadder ITC", cursive' : 'System',
  bodoni_mt: Platform.OS === 'web' ? '"Bodoni MT", serif' : 'Georgia',
  book_antiqua: Platform.OS === 'web' ? '"Book Antiqua", Palatino, serif' : 'Georgia',
  bookman_old: Platform.OS === 'web' ? '"Bookman Old Style", serif' : 'Georgia',
  bradley_hand: Platform.OS === 'web' ? '"Bradley Hand ITC", cursive' : 'System',
  britannic: Platform.OS === 'web' ? '"Britannic Bold", sans-serif' : 'System',
  broadway: Platform.OS === 'web' ? 'Broadway, serif' : 'System',
  brush_script: Platform.OS === 'web' ? '"Brush Script MT", cursive' : 'System',
  calibri: Platform.OS === 'web' ? 'Calibri, system-ui, sans-serif' : 'System',
  cambria: Platform.OS === 'web' ? 'Cambria, "Times New Roman", serif' : 'Georgia',
  castellar: Platform.OS === 'web' ? 'Castellar, serif' : 'System',
  niagara_engraved: Platform.OS === 'web' ? '"Niagara Engraved", serif' : 'System',
  niagara_solid: Platform.OS === 'web' ? '"Niagara Solid", serif' : 'System',
  old_english: Platform.OS === 'web' ? '"Old English Text MT", serif' : 'System',
  onyx: Platform.OS === 'web' ? 'Onyx, serif' : 'System',
  palace_script: Platform.OS === 'web' ? '"Palace Script MT", cursive' : 'System',
  palatino: Platform.OS === 'web' ? '"Palatino Linotype", Palatino, serif' : 'Georgia',
  papyrus: Platform.OS === 'web' ? 'Papyrus, fantasy' : 'System',
  parchment: Platform.OS === 'web' ? 'Parchment, cursive' : 'System',
  perpetua: Platform.OS === 'web' ? 'Perpetua, serif' : 'Georgia',
  playbill: Platform.OS === 'web' ? 'Playbill, serif' : 'System',
  edwardian: Platform.OS === 'web' ? '"Edwardian Script ITC", cursive' : 'System',
  elephant: Platform.OS === 'web' ? 'Elephant, serif' : 'System',
  engravers: Platform.OS === 'web' ? '"Engravers MT", serif' : 'System',
  felix: Platform.OS === 'web' ? '"Felix Titling MT", serif' : 'System',
  forte: Platform.OS === 'web' ? 'Forte, cursive' : 'System',
  franklin_book: Platform.OS === 'web' ? '"Franklin Gothic Book", sans-serif' : 'System',
  freestyle: Platform.OS === 'web' ? '"Freestyle Script", cursive' : 'System',
  french_script: Platform.OS === 'web' ? '"French Script MT", cursive' : 'System',
  gabriola: Platform.OS === 'web' ? 'Gabriola, cursive' : 'System',
  gadugi: Platform.OS === 'web' ? 'Gadugi, system-ui, sans-serif' : 'System',
  garamond: Platform.OS === 'web' ? 'Garamond, "Times New Roman", serif' : 'Georgia',
  gigi: Platform.OS === 'web' ? 'Gigi, cursive' : 'System',
  sylfaen: Platform.OS === 'web' ? 'Sylfaen, serif' : 'System',
  tempus: Platform.OS === 'web' ? '"Tempus Sans ITC", sans-serif' : 'System',
  times_new: Platform.OS === 'web' ? '"Times New Roman", serif' : 'Georgia',
  trajan: Platform.OS === 'web' ? '"Trajan Pro", serif' : 'System',
  trebuchet: Platform.OS === 'web' ? '"Trebuchet MS", sans-serif' : 'System',
  tw_cen: Platform.OS === 'web' ? '"Tw Cen MT", sans-serif' : 'System',
  verdana: Platform.OS === 'web' ? 'Verdana, Geneva, sans-serif' : 'System',
  viner: Platform.OS === 'web' ? '"Viner Hand ITC", cursive' : 'System',
  vivaldi: Platform.OS === 'web' ? 'Vivaldi, cursive' : 'System',
  vladimir: Platform.OS === 'web' ? '"Vladimir Script", cursive' : 'System',
  wide_latin: Platform.OS === 'web' ? '"Wide Latin", serif' : 'System',
};

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const normalizeHex = (value) => {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  const withHash = v.startsWith('#') ? v : `#${v}`;
  return HEX_COLOR_REGEX.test(withHash) ? withHash.toUpperCase() : null;
};
const normalizeGradientStops = (input) => {
  const raw = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',').map((s) => s.trim())
      : [];
  const parsed = raw.map(normalizeHex).filter(Boolean);
  if (parsed.length < 2) return null;
  return parsed.slice(0, 5);
};
const getStatNumber = (obj, candidates = []) => {
  const parseNumericLike = (input) => {
    if (input == null) return null;
    if (typeof input === 'number') return Number.isFinite(input) ? input : null;
    if (typeof input === 'string') {
      const cleaned = input.replace(/,/g, '').replace(/%/g, '').trim();
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };
  for (const key of candidates) {
    const candidate = obj?.[key];
    if (candidate == null) continue;
    const direct = parseNumericLike(candidate);
    if (direct != null) return direct;
    if (typeof candidate === 'object' && candidate !== null) {
      const valueN = parseNumericLike(candidate.value);
      if (valueN != null) return valueN;
      const displayN = parseNumericLike(candidate.displayValue);
      if (displayN != null) return displayN;
    }
  }
  return null;
};
const getStatText = (obj, candidates = []) => {
  for (const key of candidates) {
    const candidate = obj?.[key];
    if (candidate == null) continue;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (typeof candidate === 'number') return `${candidate}`;
    if (typeof candidate === 'object' && candidate !== null) {
      if (typeof candidate.displayValue === 'string' && candidate.displayValue.trim()) return candidate.displayValue.trim();
      if (typeof candidate.value === 'string' && candidate.value.trim()) return candidate.value.trim();
      if (typeof candidate.displayValue === 'number') return `${candidate.displayValue}`;
      if (typeof candidate.value === 'number') return `${candidate.value}`;
    }
  }
  return '';
};
// Name animation options (including flame, Cool Text–style, and variety)
const NAME_ANIMATION_OPTIONS = [
  { key: 'none', label: 'None' },
  { key: 'gradient', label: 'Olympian Flux' },
  { key: 'flame', label: 'Flame' },
  { key: 'inferno', label: 'Inferno' },
  { key: 'ember', label: 'Ember' },
  { key: 'pulse', label: 'Godspark Pulse' },
  { key: 'shimmer', label: 'Aegis Glint' },
  { key: 'divine', label: 'Celestial Wrath' },
  { key: 'storm', label: 'Stormforged Arc' },
  { key: 'void', label: 'Void' },
  { key: 'arcane', label: 'Arcane' },
  { key: 'neon', label: 'Neon' },
  { key: 'comic', label: 'Comic' },
  { key: 'metallic', label: 'Metallic' },
  { key: 'ice', label: 'Ice' },
  { key: 'glow', label: 'Dark Magic' },
  { key: 'lava', label: 'Lava' },
  { key: 'shadow_dance', label: 'Dancing Shadow' },
  { key: 'glow_breath', label: 'Breathing Glow' },
  { key: 'outline_pulse', label: 'Outline Pulse' },
  { key: 'frost', label: 'Frost' },
  { key: 'pantheon_greek', label: 'Pantheon: Greek' },
  { key: 'pantheon_norse', label: 'Pantheon: Norse' },
  { key: 'pantheon_egyptian', label: 'Pantheon: Egyptian' },
];

// Animated profile name effects used for both own and viewed profiles
function AnimatedProfileName({ name, animationType, accentColor, style, numberOfLines = 1, ellipsizeMode = 'tail' }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;
  const infernoAnim = useRef(new Animated.Value(0)).current;
  const emberAnim = useRef(new Animated.Value(0)).current;
  const voidAnim = useRef(new Animated.Value(0)).current;
  const arcaneAnim = useRef(new Animated.Value(0)).current;
  const divineAnim = useRef(new Animated.Value(0)).current;
  const stormAnim = useRef(new Animated.Value(0)).current;
  const pantheonAnim = useRef(new Animated.Value(0)).current;
  const neonAnim = useRef(new Animated.Value(0)).current;
  const comicAnim = useRef(new Animated.Value(0)).current;
  const metallicAnim = useRef(new Animated.Value(0)).current;
  const iceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const lavaAnim = useRef(new Animated.Value(0)).current;
  const shadowDanceAnim = useRef(new Animated.Value(0)).current;
  const glowBreathAnim = useRef(new Animated.Value(0)).current;
  const outlinePulseAnim = useRef(new Animated.Value(0)).current;
  const frostAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop;
    if (animationType === 'pulse') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.72, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'shimmer') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'gradient') {
      loop = Animated.loop(
        Animated.timing(gradientAnim, { toValue: 1, duration: 1500, useNativeDriver: false })
      );
      gradientAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'flame') {
      loop = Animated.loop(
        Animated.timing(flameAnim, { toValue: 1, duration: 1200, useNativeDriver: false })
      );
      flameAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'inferno') {
      loop = Animated.loop(
        Animated.timing(infernoAnim, { toValue: 1, duration: 1000, useNativeDriver: false })
      );
      infernoAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'ember') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(emberAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
          Animated.timing(emberAnim, { toValue: 0, duration: 1400, useNativeDriver: false }),
        ])
      );
      emberAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'void') {
      loop = Animated.loop(
        Animated.timing(voidAnim, { toValue: 1, duration: 1800, useNativeDriver: false })
      );
      voidAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'arcane') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(arcaneAnim, { toValue: 1, duration: 1600, useNativeDriver: false }),
          Animated.timing(arcaneAnim, { toValue: 0, duration: 1600, useNativeDriver: false }),
        ])
      );
      arcaneAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'divine') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(divineAnim, { toValue: 1, duration: 1700, useNativeDriver: false }),
          Animated.timing(divineAnim, { toValue: 0, duration: 1700, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'storm') {
      loop = Animated.loop(
        Animated.timing(stormAnim, { toValue: 1, duration: 1500, useNativeDriver: false })
      );
      stormAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'pantheon_greek' || animationType === 'pantheon_norse' || animationType === 'pantheon_egyptian') {
      loop = Animated.loop(
        Animated.timing(pantheonAnim, { toValue: 1, duration: 1700, useNativeDriver: false })
      );
      pantheonAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'neon') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(neonAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(neonAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      );
      neonAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'comic') {
      loop = Animated.loop(
        Animated.timing(comicAnim, { toValue: 1, duration: 1200, useNativeDriver: false })
      );
      comicAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'metallic') {
      loop = Animated.loop(
        Animated.timing(metallicAnim, { toValue: 1, duration: 2000, useNativeDriver: false })
      );
      metallicAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'ice') {
      loop = Animated.loop(
        Animated.timing(iceAnim, { toValue: 1, duration: 1600, useNativeDriver: false })
      );
      iceAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'glow') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: false }),
        ])
      );
      glowAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'lava') {
      loop = Animated.loop(
        Animated.timing(lavaAnim, { toValue: 1, duration: 1100, useNativeDriver: false })
      );
      lavaAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'shadow_dance') {
      loop = Animated.loop(
        Animated.timing(shadowDanceAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      );
      shadowDanceAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'glow_breath') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowBreathAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowBreathAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      );
      glowBreathAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'outline_pulse') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(outlinePulseAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(outlinePulseAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      );
      outlinePulseAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    if (animationType === 'frost') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(frostAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
          Animated.timing(frostAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
        ])
      );
      frostAnim.setValue(0);
      loop.start();
      return () => loop.stop();
    }
    return () => {};
  }, [animationType, pulseAnim, shimmerAnim, gradientAnim, flameAnim, infernoAnim, emberAnim, voidAnim, arcaneAnim, divineAnim, stormAnim, pantheonAnim, neonAnim, comicAnim, metallicAnim, iceAnim, glowAnim, lavaAnim, shadowDanceAnim, glowBreathAnim, outlinePulseAnim, frostAnim]);

  const accent = accentColor || '#7dd3fc';
  const textStyle = [style, (animationType === 'none') && { color: accent }];
  if (animationType === 'pulse') {
    const scale = pulseAnim.interpolate({ inputRange: [0.72, 1], outputRange: [0.97, 1] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[textStyle, { opacity: pulseAnim, transform: [{ scale }] }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'shimmer') {
    const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
    const scale = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[textStyle, { opacity, transform: [{ scale }], textShadowColor: accent, textShadowRadius: 8 }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'gradient') {
    const animatedColor = gradientAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [accent, '#ffffff', accent],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: accent, textShadowRadius: 6 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'flame') {
    const animatedColor = flameAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['#dc2626', '#ea580c', '#fbbf24', '#f97316', '#dc2626'],
    });
    const shadowRadius = flameAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [6, 12, 6],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: '#f97316', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'inferno') {
    const animatedColor = infernoAnim.interpolate({
      inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
      outputRange: ['#7f1d1d', '#b91c1c', '#fef3c7', '#fcd34d', '#b91c1c', '#7f1d1d'],
    });
    const shadowRadius = infernoAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [8, 14, 8],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: '#fbbf24', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'ember') {
    const animatedColor = emberAnim.interpolate({
      inputRange: [0, 0.35, 0.65, 1],
      outputRange: ['#9a3412', '#ea580c', '#fcd34d', '#9a3412'],
    });
    const shadowRadius = emberAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [6, 10, 6],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: '#ea580c', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'void') {
    const animatedColor = voidAnim.interpolate({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange: ['#1e1b4b', '#4c1d95', '#7c3aed', '#1e1b4b'],
    });
    const shadowRadius = voidAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [6, 11, 6],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: '#7c3aed', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'arcane') {
    const animatedColor = arcaneAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['#5b21b6', '#a78bfa', '#c4b5fd', '#a78bfa', '#5b21b6'],
    });
    const shadowRadius = arcaneAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [6, 12, 6],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: '#a78bfa', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'divine') {
    const animatedColor = divineAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['#e2b93b', '#fff5d6', '#e2b93b'],
    });
    const shadowRadius = divineAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [6, 14, 6],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: '#facc15', textShadowRadius: shadowRadius, letterSpacing: 0.35 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'storm') {
    const animatedColor = stormAnim.interpolate({
      inputRange: [0, 0.35, 0.7, 1],
      outputRange: [accent, '#c4b5fd', '#93c5fd', accent],
    });
    const translateY = stormAnim.interpolate({
      inputRange: [0, 0.25, 0.6, 1],
      outputRange: [0, -1.5, 0.5, 0],
    });
    const opacity = stormAnim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0.95, 1, 0.96, 0.95],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, opacity, transform: [{ translateY }], textShadowColor: '#60a5fa', textShadowRadius: 8 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'pantheon_greek' || animationType === 'pantheon_norse' || animationType === 'pantheon_egyptian') {
    const palette = animationType === 'pantheon_greek'
      ? ['#e2e8f0', '#c084fc', '#f8fafc']
      : animationType === 'pantheon_norse'
        ? ['#93c5fd', '#e0f2fe', '#60a5fa']
        : ['#f59e0b', '#fde68a', '#f97316'];
    const animatedColor = pantheonAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [palette[0], palette[1], palette[2]],
    });
    const shadowColor = animationType === 'pantheon_greek'
      ? '#a855f7'
      : animationType === 'pantheon_norse'
        ? '#38bdf8'
        : '#f59e0b';
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: animatedColor, textShadowColor: shadowColor, textShadowRadius: 9 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'neon') {
    const animatedColor = neonAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['#06b6d4', '#22d3ee', '#06b6d4'],
    });
    const shadowRadius = neonAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [4, 14, 4] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color: animatedColor, textShadowColor: '#22d3ee', textShadowRadius: shadowRadius }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'comic') {
    const animatedColor = comicAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['#ea580c', '#fbbf24', '#ea580c'],
    });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color: animatedColor, textShadowColor: '#1e293b', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'metallic') {
    const animatedColor = metallicAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['#94a3b8', '#e2e8f0', '#64748b', '#e2e8f0', '#94a3b8'],
    });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color: animatedColor, textShadowColor: '#cbd5e1', textShadowRadius: 4 }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'ice') {
    const animatedColor = iceAnim.interpolate({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#e0f2fe'],
    });
    const shadowRadius = iceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, 12, 6] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color: animatedColor, textShadowColor: '#7dd3fc', textShadowRadius: shadowRadius }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'glow') {
    const animatedColor = glowAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['#6d28d9', '#a78bfa', '#6d28d9'],
    });
    const shadowRadius = glowAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [8, 16, 8] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color: animatedColor, textShadowColor: '#a78bfa', textShadowRadius: shadowRadius }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'lava') {
    const animatedColor = lavaAnim.interpolate({
      inputRange: [0, 0.2, 0.5, 0.8, 1],
      outputRange: ['#431407', '#c2410c', '#fdba74', '#c2410c', '#431407'],
    });
    const shadowRadius = lavaAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, 12, 6] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color: animatedColor, textShadowColor: '#ea580c', textShadowRadius: shadowRadius }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'shadow_dance') {
    const translateX = shadowDanceAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, 2, 0, -2, 0],
    });
    const translateY = shadowDanceAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1.5, 0, -1.5, 0, 1.5],
    });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#e2e8f0', textShadowColor: '#64748b', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6, transform: [{ translateX }, { translateY }] }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'glow_breath') {
    const shadowRadius = glowBreathAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [4, 18, 4] });
    const opacity = glowBreathAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1, 0.92] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#c4b5fd', opacity, textShadowColor: '#a78bfa', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'outline_pulse') {
    const shadowRadius = outlinePulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, 14, 6] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: '#0f172a', textShadowColor: accent || '#38bdf8', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'frost') {
    const opacity = frostAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.88, 1, 0.88] });
    const shadowRadius = frostAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [8, 14, 8] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: '#e0f2fe', opacity, textShadowColor: '#7dd3fc', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  return <Text style={textStyle} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>{name || 'Profile'}</Text>;
}

// Helper function to get GitHub URL for god icons
const getGodIconUrl = (godName) => {
  if (!godName) return null;
  const normalizedName = godName.toString().toLowerCase().trim();
  const encodedName = encodeURIComponent(normalizedName);
  return `https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Icons/${encodedName}.png`;
};

const IS_WEB = Platform.OS === 'web';

// Gods will be loaded from builds.json (like data.jsx and tierlist.jsx)

// Storage helper
const storage = {
  async getItem(key) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(key);
        return value;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage setItem error:', e);
      // On web, localStorage might throw if quota exceeded
      if (IS_WEB) {
        if (Platform.OS === 'web') {
          console.error('Unable to save data. Please check your browser storage settings.');
        } else {
          Alert.alert('Storage Error', 'Unable to save data. Please check your browser storage settings.');
        }
      }
    }
  },
  async removeItem(key) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  },
};

export default function ProfilePage({ onNavigateToBuilds, onNavigateToGod, onNavigateToCustomBuild, onNavigateToMyBuilds, viewUsername = null, onNavigateBack = null }) {
  const { width: screenWidth } = useScreenDimensions();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showRecoveryCodeModal, setShowRecoveryCodeModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');
  const [pinnedBuilds, setPinnedBuilds] = useState([]);
  const [pinnedGods, setPinnedGods] = useState([]);
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGodIconPicker, setShowGodIconPicker] = useState(false);
  const [godSearchQuery, setGodSearchQuery] = useState('');
  const [tempSelectedGodIcon, setTempSelectedGodIcon] = useState(null);
  const [profileGodIcon, setProfileGodIcon] = useState(null);
  const [buildsData, setBuildsData] = useState(null);
  const [failedItemIcons, setFailedItemIcons] = useState({});
  const [communityBuilds, setCommunityBuilds] = useState([]);
  const [certifiedBuilds, setCertifiedBuilds] = useState([]);
  // For viewing other users' profiles
  const [viewingUser, setViewingUser] = useState(viewUsername);
  const [viewingUserData, setViewingUserData] = useState(null);
  const [viewingUserCommunityBuilds, setViewingUserCommunityBuilds] = useState([]);
  const [viewingUserCertifiedBuilds, setViewingUserCertifiedBuilds] = useState([]);
  const [viewingUserContributorBuilds, setViewingUserContributorBuilds] = useState([]);
  const [viewingUserTierlist, setViewingUserTierlist] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  // Expandable sections for viewing other users' profiles
  const [expandedContributorBuilds, setExpandedContributorBuilds] = useState(false);
  const [expandedCommunityBuilds, setExpandedCommunityBuilds] = useState(false);
  // Username change state
  const [newUsername, setNewUsername] = useState('');
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  // Display name state
  const [displayName, setDisplayName] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [showChangeDisplayNameModal, setShowChangeDisplayNameModal] = useState(false);
  const [isChangingDisplayName, setIsChangingDisplayName] = useState(false);
  // Cache for display names of other users (for builds, etc.)
  const [displayNameCache, setDisplayNameCache] = useState({});
  // Preferred roles (profile-level, not per-build) - up to 2
  const [preferredRoles, setPreferredRoles] = useState([]);
  const [showPreferredRolesModal, setShowPreferredRolesModal] = useState(false);
  // Profile color and gradient (saved to Supabase; others see when viewing profile)
  const [profileColor, setProfileColor] = useState(null);
  const [profileGradient, setProfileGradient] = useState(null); // [hex, hex] or null
  const [showProfileColorModal, setShowProfileColorModal] = useState(false);
  const [tempProfileColor, setTempProfileColor] = useState(null);
  const [livePickerColor, setLivePickerColor] = useState(null);
  const [tempProfileGradient, setTempProfileGradient] = useState(null);
  const [tempUseGradient, setTempUseGradient] = useState(false);
  const [tempGradientStopsInput, setTempGradientStopsInput] = useState('');
  // Banner, title, badges, animated name (saved to Supabase; others see when viewing)
  const [profileBanner, setProfileBanner] = useState(null); // preset key or null
  const [profileTitle, setProfileTitle] = useState('');
  const [profileFont, setProfileFont] = useState(''); // font key from shop (e.g. serif, comic)
  const [profileBadges, setProfileBadges] = useState([]); // array of badge ids, max 3
  const [nameAnimation, setNameAnimation] = useState('none'); // none | gradient | flame | inferno | ember | pulse | shimmer | divine | storm | void | arcane | pantheon_*
  const [showProfileAppearanceModal, setShowProfileAppearanceModal] = useState(false);
  const [tempProfileBanner, setTempProfileBanner] = useState('none');
  const [tempProfileTitle, setTempProfileTitle] = useState('');
  const [tempProfileFont, setTempProfileFont] = useState('');
  const [tempProfileBadges, setTempProfileBadges] = useState([]);
  const [tempNameAnimation, setTempNameAnimation] = useState('none');
  const [tempBadgeSearch, setTempBadgeSearch] = useState('');
  const [tempTitleSearch, setTempTitleSearch] = useState('');
  const [appearanceSection, setAppearanceSection] = useState('banner'); // 'banner' | 'title' | 'font' | 'badges' | 'animation'
  const [colorSection, setColorSection] = useState('preset'); // 'preset' | 'custom'
  const [remoteBadgeFiles, setRemoteBadgeFiles] = useState([]);
  const [profileGold, setProfileGold] = useState(0); // Gold from Shop (shop_${username}_gold)
  const [ownedShopIds, setOwnedShopIds] = useState([]); // Owned shop item ids for titles
  const livePickerRafRef = useRef(null);
  const livePickerQueuedColorRef = useRef(null);

  const availableBadges = useMemo(() => {
    const merged = [...PROFILE_BADGE_FILES, ...remoteBadgeFiles];
    const uniq = Array.from(new Set(merged.filter((f) => typeof f === 'string' && f.toLowerCase().endsWith('.png'))));
    return uniq.map(mapBadgeFileToMeta).sort((a, b) => a.label.localeCompare(b.label));
  }, [remoteBadgeFiles]);

  useEffect(() => {
    let mounted = true;
    const loadRemoteBadges = async () => {
      try {
        const resp = await fetch(BADGES_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
        if (!resp.ok) return;
        const json = await resp.json();
        const names = Array.isArray(json)
          ? json.map((row) => row && row.name).filter((name) => typeof name === 'string' && name.toLowerCase().endsWith('.png'))
          : [];
        if (mounted && names.length > 0) {
          setRemoteBadgeFiles(names);
        }
      } catch (_) {
        // Keep static list fallback when GitHub API is unavailable.
      }
    };
    loadRemoteBadges();
    return () => { mounted = false; };
  }, []);

  const togglePreferredRole = async (roleKey) => {
    if (!currentUser) return;
    const meta = PREFERRED_ROLE_META[roleKey];
    if (!meta) return;

    setPreferredRoles((prev) => {
      let next;
      if (prev.includes(roleKey)) {
        next = prev.filter((r) => r !== roleKey);
      } else {
        if (prev.length >= 2) {
          Alert.alert('Preferred Roles', 'You can select up to 2 preferred roles.');
          return prev;
        }
        next = [...prev, roleKey];
      }

      // Persist asynchronously (local + Supabase)
      saveUserDataToSupabase(null, null, null, next);
      return next;
    });
  };

  // Helper function to flatten gods array
  const flattenAny = (a) => {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
  };

  // Get all gods from builds.json (like data.jsx and tierlist.jsx)
  const allGods = useMemo(() => {
    if (!buildsData) return [];
    return flattenAny(buildsData.gods);
  }, [buildsData]);

  // Profile icon picker: use profileIconGods.json (all PFPs in repo, including unreleased) then Smite2Gods/builds
  const allGodsForPicker = useMemo(() => {
    try {
      const profileIconList = require('./data/profileIconGods.json');
      if (Array.isArray(profileIconList) && profileIconList.length > 0) {
        return profileIconList.map((name) => ({
          name,
          GodName: name,
          godName: name,
        }));
      }
    } catch (e) {
      // Fallback: try Smite2Gods.json then builds.json
    }
    try {
      const smite2Gods = require('../Smite2Gods.json');
      if (Array.isArray(smite2Gods) && smite2Gods.length > 0) {
        return smite2Gods.map((g) => ({
          ...g,
          name: g.godName || g.name,
          GodName: g.godName || g.GodName,
        }));
      }
    } catch (e2) {
      // ignore
    }
    return allGods;
  }, [allGods]);

  // Filter gods for picker based on search query (all gods shown; search filters the list)
  const filteredGodsForPicker = useMemo(() => {
    if (!godSearchQuery.trim()) {
      return allGodsForPicker;
    }
    const query = godSearchQuery.toLowerCase();
    return allGodsForPicker.filter((god) => {
      const name = (god.name || god.GodName || god.godName || god.title || god.displayName || '').toString().toLowerCase();
      return name.includes(query);
    });
  }, [allGodsForPicker, godSearchQuery]);

  // Load builds data
  useEffect(() => {
    try {
      const data = require('./data/builds.json');
      setBuildsData(data);
    } catch (e) {
      console.error('Failed to load builds.json:', e);
    }
  }, []);

  // Helper functions for builds (like mybuilds.jsx) - use useMemo to wait for buildsData
  const allItems = useMemo(() => {
    return buildsData ? flattenAny(buildsData.items) : [];
  }, [buildsData]);

  const allBuildsGods = useMemo(() => {
    return buildsData ? flattenAny(buildsData.gods) : [];
  }, [buildsData]);

  const findItemByName = (itemName) => {
    return allItems.find(item => {
      const name = item.name || item.internalName || '';
      const internalName = item.internalName || '';
      return name.toLowerCase() === itemName.toLowerCase() ||
             internalName.toLowerCase() === itemName.toLowerCase();
    });
  };

  const findGodForBuild = (godName, godInternalName) => {
    return allBuildsGods.find(g => 
      (g.name || g.GodName || '').toLowerCase() === (godName || '').toLowerCase() ||
      (g.internalName || g.GodName || '').toLowerCase() === (godInternalName || '').toLowerCase()
    );
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  // Reload data when component becomes visible (for native apps)
  // This ensures data is fresh when user navigates to profile tab
  useEffect(() => {
    let isActive = true;
    let intervalId = null;
    
    const reloadData = async () => {
      // Don't reload if we're currently saving (to avoid overwriting changes)
      if (currentUser && isLoggedIn && isActive && !isSaving) {
        console.log('Profile page - reloading user data');
        await loadUserData();
      }
    };
    
    // Reload immediately when component mounts or when user/login changes
    reloadData();
    
    // Set up periodic refresh (every 10 seconds) to catch saves from other components
    // Less frequent to avoid interfering with active saves
    intervalId = setInterval(() => {
      if (currentUser && isLoggedIn && isActive) {
        reloadData();
      }
    }, 4000);
    
    // For web, also listen to visibility changes
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden && currentUser && isLoggedIn && isActive) {
          reloadData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        isActive = false;
        if (intervalId) clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    
    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser, isLoggedIn]);

  const loadProfileShopData = useCallback(async () => {
    if (!currentUser) return { gold: 0, owned: [] };
    const prefix = `shop_${currentUser}_`;
    let shopData = null;
    try {
      const { fetchUserShopData } = require('../lib/shopSupabase');
      shopData = await fetchUserShopData(currentUser);
    } catch (_) {}
    const [g, o, font] = await Promise.all([
      storage.getItem(prefix + 'gold'),
      storage.getItem(prefix + 'owned'),
      storage.getItem(`profile_font_${currentUser}`),
    ]);
    let gold = 0;
    let owned = [];
    if (shopData != null) {
      gold = shopData.gold;
      owned = Array.isArray(shopData.shop_owned) ? shopData.shop_owned : [];
      setProfileGold(gold);
      setOwnedShopIds(owned);
      await storage.setItem(prefix + 'gold', String(gold));
      await storage.setItem(prefix + 'owned', JSON.stringify(owned));
    } else {
      gold = parseInt(g || '0', 10);
      setProfileGold(gold);
      try {
        owned = o ? JSON.parse(o) : [];
        setOwnedShopIds(owned);
      } catch (_) {
        setOwnedShopIds([]);
      }
    }
    if (font && typeof font === 'string') setProfileFont(font);
    return { gold, owned };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setProfileGold(0);
      setOwnedShopIds([]);
      return;
    }
    loadProfileShopData();
  }, [currentUser, loadProfileShopData]);

  useEffect(() => {
    return () => {
      if (livePickerRafRef.current && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(livePickerRafRef.current);
      }
    };
  }, []);

  // Load other user's profile when viewUsername changes
  useEffect(() => {
    if (viewUsername && viewUsername !== currentUser) {
      setViewingUser(viewUsername);
      setUserNotFound(false);
      setViewingUserData(null);
      setViewingUserCommunityBuilds([]);
      setViewingUserCertifiedBuilds([]);
      setViewingUserContributorBuilds([]);
      setViewingUserTierlist(null);
      loadOtherUserProfile(viewUsername);
      checkIfFollowing(viewUsername);
    } else if (!viewUsername && viewingUser) {
      // If viewUsername is cleared, reset viewing state
      setViewingUser(null);
      setUserNotFound(false);
      setViewingUserData(null);
      setViewingUserCommunityBuilds([]);
      setViewingUserCertifiedBuilds([]);
      setViewingUserContributorBuilds([]);
      setViewingUserTierlist(null);
    }
  }, [viewUsername, currentUser]);

  // Load following list
  useEffect(() => {
    if (currentUser && isLoggedIn) {
      loadFollowingList();
    }
  }, [currentUser, isLoggedIn]);

  const loadFollowingList = async () => {
    if (!currentUser) return;
    try {
      const followingData = await storage.getItem(`following_${currentUser}`);
      if (followingData) {
        const following = JSON.parse(followingData);
        setFollowingList(following);
      }
    } catch (e) {
      console.error('Error loading following list:', e);
    }
  };

  // Helper function to get display name for a username
  const getDisplayNameForUsername = async (username) => {
    if (!username) return username;
    
    // Check in-memory cache first
    if (displayNameCache[username]) {
      return displayNameCache[username];
    }
    
    try {
      // Check local storage
      const cachedDisplayName = await storage.getItem(`displayName_${username}`);
      if (cachedDisplayName) {
        setDisplayNameCache(prev => ({ ...prev, [username]: cachedDisplayName }));
        return cachedDisplayName;
      }
      
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('user_data')
        .select('display_name')
        .eq('username', username)
        .single();
      
      if (!error && data) {
        const displayName = data.display_name || username;
        // Cache in memory and local storage
        setDisplayNameCache(prev => ({ ...prev, [username]: displayName }));
        await storage.setItem(`displayName_${username}`, displayName);
        return displayName;
      }
      
      // Fallback to username
      setDisplayNameCache(prev => ({ ...prev, [username]: username }));
      return username;
    } catch (error) {
      console.error('Error fetching display name:', error);
      return username;
    }
  };
  
  // Batch load display names for multiple usernames (for builds)
  const loadDisplayNamesForUsernames = async (usernames) => {
    if (!usernames || usernames.length === 0) return;
    
    const uniqueUsernames = [...new Set(usernames.filter(Boolean))];
    const usernamesToFetch = uniqueUsernames.filter(u => !displayNameCache[u]);
    
    if (usernamesToFetch.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('username, display_name')
        .in('username', usernamesToFetch);
      
      if (!error && data) {
        const newCache = { ...displayNameCache };
        data.forEach(user => {
          newCache[user.username] = user.display_name || user.username;
          storage.setItem(`displayName_${user.username}`, newCache[user.username]);
        });
        // Also cache usernames that weren't found
        usernamesToFetch.forEach(u => {
          if (!newCache[u]) {
            newCache[u] = u;
          }
        });
        setDisplayNameCache(newCache);
      }
    } catch (error) {
      console.error('Error batch loading display names:', error);
    }
  };

  const checkIfFollowing = async (username) => {
    if (!currentUser || !username) {
      setIsFollowing(false);
      return;
    }
    try {
      const followingData = await storage.getItem(`following_${currentUser}`);
      if (followingData) {
        const following = JSON.parse(followingData);
        setIsFollowing(following.includes(username));
      } else {
        setIsFollowing(false);
      }
    } catch (e) {
      console.error('Error checking follow status:', e);
      setIsFollowing(false);
    }
  };

  const loadOtherUserProfile = async (username) => {
    if (!username) return;
    setLoadingUserProfile(true);
    setUserNotFound(false);
    try {
      const { supabase } = require('../config/supabase');
      
      // Load user data (including preferred roles)
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('profile_god_icon, username, display_name, preferred_roles, profile_color, profile_gradient, profile_banner, profile_title, profile_badges, name_animation')
        .eq('username', username)
        .single();
      
      // Check if user exists
      if (userError && userError.code === 'PGRST116') {
        // No rows returned - user doesn't exist
        setUserNotFound(true);
        setLoadingUserProfile(false);
        return;
      }
      
      if (userError && userError.code !== 'MISSING_CONFIG') {
        // Other error - might be network issue, but assume user doesn't exist for now
        console.error('Error loading user data:', userError);
        setUserNotFound(true);
        setLoadingUserProfile(false);
        return;
      }
      
      if (!userError && userData) {
        setViewingUserData(userData);
        setUserNotFound(false);
      } else if (!userData) {
        // No data returned
        setUserNotFound(true);
        setLoadingUserProfile(false);
        return;
      }

      // Load community builds
      const { data: communityData, error: communityError } = await supabase
        .from('community_builds')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });
      
      if (communityError && communityError.code !== 'MISSING_CONFIG') {
        console.error('Error loading community builds:', communityError);
      }
      
      if (!communityError && communityData) {
        console.log(`Loaded ${communityData.length} community builds for ${username}`);
        const builds = communityData.map(build => ({
          ...build,
          databaseId: build.id,
          databaseTable: 'community_builds',
          fromDatabase: true,
          type: 'community',
        }));
        setViewingUserCommunityBuilds(builds);
        // Load display names for authors
        const authors = builds.map(b => b.username).filter(Boolean);
        if (authors.length > 0) {
          loadDisplayNamesForUsernames(authors);
        }
      } else {
        setViewingUserCommunityBuilds([]);
      }

      // Load contributor builds from contributor_builds table (this is what certified/contributor builds are stored as)
      const { data: contributorData, error: contributorError } = await supabase
        .from('contributor_builds')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });
      
      if (contributorError && contributorError.code !== 'MISSING_CONFIG') {
        console.error('Error loading contributor builds:', contributorError);
      }
      
      if (!contributorError && contributorData) {
        console.log(`Loaded ${contributorData.length} contributor builds for ${username}`);
        setViewingUserContributorBuilds(contributorData.map(build => ({
          ...build,
          databaseId: build.id,
          databaseTable: 'contributor_builds',
          fromDatabase: true,
          type: 'contributor',
        })));
      } else {
        setViewingUserContributorBuilds([]);
      }

      // Set certified builds to empty (we use contributor_builds instead)
      setViewingUserCertifiedBuilds([]);

      // Load tierlist (stored in user_data or separate table)
      // For now, we'll check if there's a tierlist in user_data
      const { data: tierlistData } = await supabase
        .from('user_data')
        .select('tierlist_gods, tierlist_items')
        .eq('username', username)
        .single();
      
      if (tierlistData) {
        setViewingUserTierlist({
          gods: tierlistData.tierlist_gods || {},
          items: tierlistData.tierlist_items || {},
        });
      }
      
      // Note: State variables won't be updated here yet, but they will be set above
      console.log('Finished loading profile for', username);
    } catch (error) {
      console.error('Error loading other user profile:', error);
    } finally {
      setLoadingUserProfile(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !viewingUser || currentUser === viewingUser) return;
    
    try {
      const followingData = await storage.getItem(`following_${currentUser}`);
      let following = followingData ? JSON.parse(followingData) : [];
      
      if (isFollowing) {
        // Unfollow
        following = following.filter(u => u !== viewingUser);
        setIsFollowing(false);
      } else {
        // Follow
        if (!following.includes(viewingUser)) {
          following.push(viewingUser);
        }
        setIsFollowing(true);
      }
      
      await storage.setItem(`following_${currentUser}`, JSON.stringify(following));
      setFollowingList(following);
      
      // Also sync to Supabase
      try {
        const { supabase } = require('../config/supabase');
        await supabase
          .from('user_data')
          .upsert({
            username: currentUser,
            following: following,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'username'
          });
      } catch (e) {
        console.error('Error syncing follow to Supabase:', e);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const checkLoginStatus = async () => {
    const loggedInUser = await storage.getItem('currentUser');
    if (loggedInUser) {
      setCurrentUser(loggedInUser);
      setIsLoggedIn(true);
      await loadUserData();
    }
  };

  const loadUserData = async () => {
    if (!currentUser) return;
    
    // ALWAYS load from local storage first (most up-to-date, source of truth)
    const localPinnedBuilds = await storage.getItem(`pinnedBuilds_${currentUser}`);
    const localPinnedGods = await storage.getItem(`pinnedGods_${currentUser}`);
    const localSavedBuilds = await storage.getItem(`savedBuilds_${currentUser}`);
    const localProfileGodIcon = await storage.getItem(`profileGodIcon_${currentUser}`);
    const localDisplayName = await storage.getItem(`displayName_${currentUser}`);
    const localPreferredRoles = await storage.getItem(`preferredRoles_${currentUser}`);
    
    // Set display name from local storage if available
    if (localDisplayName) {
      setDisplayName(localDisplayName);
    }
    
    let pinnedBuilds = localPinnedBuilds ? JSON.parse(localPinnedBuilds) : [];
    let pinnedGods = localPinnedGods ? JSON.parse(localPinnedGods) : [];
    let savedBuilds = localSavedBuilds ? JSON.parse(localSavedBuilds) : [];
    let profileIcon = localProfileGodIcon || null;
    let localPreferredRolesArray = [];
    try {
      localPreferredRolesArray = localPreferredRoles ? JSON.parse(localPreferredRoles) : [];
      if (!Array.isArray(localPreferredRolesArray)) {
        localPreferredRolesArray = [];
      }
    } catch (e) {
      console.error('Error parsing local preferred roles:', e);
      localPreferredRolesArray = [];
    }
    
    console.log('Loaded from local storage:', {
      pinnedBuilds: pinnedBuilds.length,
      pinnedGods: pinnedGods.length,
      savedBuilds: savedBuilds.length,
    });
    
    // Set state immediately with local data (fast, reliable)
    setPinnedBuilds(pinnedBuilds);
    setPinnedGods(pinnedGods);
    setSavedBuilds(savedBuilds);
    setProfileGodIcon(profileIcon);
    setPreferredRoles(localPreferredRolesArray);
    
    // Then try to sync with Supabase in background (merge if Supabase has newer data)
    try {
      // Try to set user context for RLS (don't fail if this doesn't exist)
      try {
        const rpcResult = await supabase.rpc('set_current_user', { username_param: currentUser });
        if (rpcResult && rpcResult.error && rpcResult.error.code === 'MISSING_CONFIG') {
          // Supabase not configured, local storage is already loaded
          return;
        }
      } catch (rpcError) {
        // RPC function might not exist, continue anyway
      }
      
      // Try to load from Supabase
      const { data, error } = await supabase
        .from('user_data')
        .select('pinned_builds, pinned_gods, saved_builds, profile_god_icon, display_name, preferred_roles, profile_color, profile_gradient, profile_banner, profile_title, profile_badges, name_animation, updated_at')
        .eq('username', currentUser)
        .single();
      
      if (error && error.code === 'MISSING_CONFIG') {
        // Supabase not configured, local storage already loaded
        return;
      }
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading user data from Supabase:', error);
        // Local storage already loaded, continue
        return;
      }
      
      if (data) {
        const supabasePinnedBuilds = data.pinned_builds || [];
        const supabasePinnedGods = data.pinned_gods || [];
        const supabaseSavedBuilds = data.saved_builds || [];
        const supabaseProfileGodIcon = data.profile_god_icon || null;
        const supabaseDisplayName = data.display_name || null;
        const supabaseUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
        const supabasePreferredRoles = Array.isArray(data.preferred_roles) ? data.preferred_roles : [];
        const supabaseProfileColor = data.profile_color || null;
        let supabaseProfileGradient = null;
        if (data.profile_gradient) {
          try {
            const parsed = typeof data.profile_gradient === 'string' ? JSON.parse(data.profile_gradient) : data.profile_gradient;
            supabaseProfileGradient = normalizeGradientStops(parsed);
          } catch (_) {}
        }
        if (supabaseProfileColor) setProfileColor(supabaseProfileColor);
        if (supabaseProfileGradient) setProfileGradient(supabaseProfileGradient);
        if (data.profile_banner != null) setProfileBanner(data.profile_banner || null);
        if (data.profile_title != null) setProfileTitle(data.profile_title || '');
        if (data.profile_badges) {
          try {
            const badges = typeof data.profile_badges === 'string' ? JSON.parse(data.profile_badges) : data.profile_badges;
            setProfileBadges(Array.isArray(badges) ? badges.slice(0, MAX_BADGES) : []);
          } catch (_) { setProfileBadges([]); }
        }
        if (data.name_animation && NAME_ANIMATION_OPTIONS.some(o => o.key === data.name_animation)) {
          setNameAnimation(data.name_animation);
        }
        // Set display name from Supabase
        if (supabaseDisplayName) {
          setDisplayName(supabaseDisplayName);
          await storage.setItem(`displayName_${currentUser}`, supabaseDisplayName);
        } else {
          // Fallback to username if no display name
          setDisplayName(null);
        }

        // Merge preferred roles: prefer Supabase if it has data, otherwise keep local
        let finalPreferredRoles = localPreferredRolesArray;
        if (supabasePreferredRoles && supabasePreferredRoles.length > 0) {
          finalPreferredRoles = supabasePreferredRoles;
        }
        // Only keep valid role keys and at most 2
        const validRoles = Array.from(
          new Set(
            (finalPreferredRoles || [])
              .map((r) => (typeof r === 'string' ? r.trim() : ''))
              .filter((r) => !!r && PREFERRED_ROLE_META[r])
          )
        ).slice(0, 2);
        setPreferredRoles(validRoles);
        await storage.setItem(`preferredRoles_${currentUser}`, JSON.stringify(validRoles));
        
        // If local storage is empty but Supabase has data, use Supabase data
        // Otherwise, merge both sources
        let mergedSavedBuilds, mergedPinnedBuilds, mergedPinnedGods;
        
        if (savedBuilds.length === 0 && supabaseSavedBuilds.length > 0) {
          // Local is empty, use Supabase
          mergedSavedBuilds = supabaseSavedBuilds;
        } else {
          // Merge: start with local, add unique items from Supabase
          mergedSavedBuilds = [...savedBuilds];
          supabaseSavedBuilds.forEach(sbBuild => {
            if (!mergedSavedBuilds.find(b => b.id === sbBuild.id)) {
              mergedSavedBuilds.push(sbBuild);
            }
          });
        }
        
        if (pinnedBuilds.length === 0 && supabasePinnedBuilds.length > 0) {
          // Local is empty, use Supabase
          mergedPinnedBuilds = supabasePinnedBuilds;
        } else {
          // Merge: start with local, add unique items from Supabase
          mergedPinnedBuilds = [...pinnedBuilds];
          supabasePinnedBuilds.forEach(sbBuild => {
            const exists = mergedPinnedBuilds.find(b => 
              (b.id && b.id === sbBuild.id) || 
              (b.buildKey && b.buildKey === sbBuild.buildKey) ||
              (sbBuild.id && b.id === sbBuild.id) ||
              (sbBuild.buildKey && b.buildKey === sbBuild.buildKey)
            );
            if (!exists) {
              mergedPinnedBuilds.push(sbBuild);
            }
          });
        }
        
        if (pinnedGods.length === 0 && supabasePinnedGods.length > 0) {
          // Local is empty, use Supabase
          mergedPinnedGods = supabasePinnedGods;
        } else {
          // Merge: start with local, add unique items from Supabase
          mergedPinnedGods = [...pinnedGods];
          supabasePinnedGods.forEach(sbGod => {
            const godName = sbGod.name || sbGod.GodName;
            const exists = mergedPinnedGods.find(g => {
              const gName = g.name || g.GodName;
              return gName === godName;
            });
            if (!exists) {
              mergedPinnedGods.push(sbGod);
            }
          });
        }
        
        // Load community and certified builds from Supabase (like mybuilds.jsx)
        try {
          // Load community builds
          const { data: communityData, error: communityError } = await supabase
            .from('community_builds')
            .select('*')
            .eq('username', currentUser)
            .order('created_at', { ascending: false });
          
          if (!communityError && communityData) {
            const builds = communityData.map(build => ({
              ...build,
              databaseId: build.id,
              databaseTable: 'community_builds',
              fromDatabase: true,
              type: 'community',
            }));
            setCommunityBuilds(builds);
            // Load display names for all authors
            const authors = builds.map(b => b.username).filter(Boolean);
            if (authors.length > 0) {
              loadDisplayNamesForUsernames(authors);
            }
          }

          // Load certified builds
          const { data: certifiedData, error: certifiedError } = await supabase
            .from('certified_builds')
            .select('*')
            .eq('username', currentUser)
            .order('created_at', { ascending: false });
          
          if (!certifiedError && certifiedData) {
            setCertifiedBuilds(certifiedData.map(build => ({
              ...build,
              databaseId: build.id,
              databaseTable: 'certified_builds',
              fromDatabase: true,
              type: 'certified',
            })));
          }
        } catch (buildsError) {
          console.error('Error loading community/certified builds:', buildsError);
        }

        // Handle profile god icon - use Supabase if local is empty, otherwise prefer local
        let mergedProfileGodIcon = profileIcon;
        if (!profileIcon && supabaseProfileGodIcon) {
          mergedProfileGodIcon = supabaseProfileGodIcon;
        }
        
        // Always update if Supabase has data (to ensure sync)
        const hasChanges = 
          mergedSavedBuilds.length !== savedBuilds.length || 
          mergedPinnedBuilds.length !== pinnedBuilds.length ||
          mergedPinnedGods.length !== pinnedGods.length ||
          mergedProfileGodIcon !== profileIcon ||
          JSON.stringify(mergedSavedBuilds) !== JSON.stringify(savedBuilds) ||
          JSON.stringify(mergedPinnedBuilds) !== JSON.stringify(pinnedBuilds) ||
          JSON.stringify(mergedPinnedGods) !== JSON.stringify(pinnedGods);
        
        if (hasChanges) {
          setPinnedBuilds(mergedPinnedBuilds);
          setPinnedGods(mergedPinnedGods);
          setSavedBuilds(mergedSavedBuilds);
          if (mergedProfileGodIcon !== profileIcon) {
            setProfileGodIcon(mergedProfileGodIcon);
            await storage.setItem(`profileGodIcon_${currentUser}`, mergedProfileGodIcon || '');
          }
          
          // Save merged data back to local storage
          await storage.setItem(`pinnedBuilds_${currentUser}`, JSON.stringify(mergedPinnedBuilds));
          await storage.setItem(`pinnedGods_${currentUser}`, JSON.stringify(mergedPinnedGods));
          await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(mergedSavedBuilds));
          
          console.log('✅ Merged with Supabase data:', {
            pinnedBuilds: `${pinnedBuilds.length} → ${mergedPinnedBuilds.length}`,
            pinnedGods: `${pinnedGods.length} → ${mergedPinnedGods.length}`,
            savedBuilds: `${savedBuilds.length} → ${mergedSavedBuilds.length}`,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
      // Local storage already loaded, continue
    }
  };

  const loadUserDataFromLocal = async () => {
    if (!currentUser) return;
    
    try {
      const pinnedBuildsStr = await storage.getItem(`pinnedBuilds_${currentUser}`);
      const pinnedGodsStr = await storage.getItem(`pinnedGods_${currentUser}`);
      const savedBuildsStr = await storage.getItem(`savedBuilds_${currentUser}`);
      
      const pinnedBuilds = pinnedBuildsStr ? JSON.parse(pinnedBuildsStr) : [];
      const pinnedGods = pinnedGodsStr ? JSON.parse(pinnedGodsStr) : [];
      const savedBuilds = savedBuildsStr ? JSON.parse(savedBuildsStr) : [];
      
      setPinnedBuilds(pinnedBuilds);
      setPinnedGods(pinnedGods);
      setSavedBuilds(savedBuilds);
      
      console.log('Loaded from local storage:', {
        pinnedBuilds: pinnedBuilds.length,
        pinnedGods: pinnedGods.length,
        savedBuilds: savedBuilds.length,
      });
    } catch (error) {
      console.error('Error loading from local storage:', error);
      // Initialize empty if local storage also fails
      setPinnedBuilds([]);
      setPinnedGods([]);
      setSavedBuilds([]);
    }
  };

  const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
  };

  // Generate a random recovery code (8 characters, alphanumeric, uppercase)
  const generateRecoveryCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking chars (0, O, I, 1)
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      const errorMsg = 'Please enter both username and password';
      console.error('Login validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    setIsLoggingIn(true);
    console.log('Attempting login for:', username.trim());
    
    try {
      const passwordHash = hashPassword(password);
      
      console.log('Querying Supabase for user...');
      const { data, error } = await supabase
        .from('app_users')
        .select('username, password_hash')
        .eq('username', username.trim())
        .single();
      
      console.log('Supabase response:', { data: !!data, error: error?.code || error?.message });
      
      if (error && error.code === 'MISSING_CONFIG') {
        console.error('Supabase MISSING_CONFIG error');
        // Supabase not configured, try local storage login
        const localUser = await storage.getItem(`user_${username.trim()}`);
        if (localUser) {
          const userData = JSON.parse(localUser);
          if (userData.password_hash === passwordHash) {
            console.log('Login successful via local storage');
            await storage.setItem('currentUser', username.trim());
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setUsername('');
            setPassword('');
            await loadUserDataFromLocal();
            setShowLoginSuccess(true);
            setTimeout(() => setShowLoginSuccess(false), 3000);
            setIsLoggingIn(false);
            return;
          }
        }
        const errorMsg = 'Supabase configuration is missing. Please configure your Supabase credentials.';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsLoggingIn(false);
        return;
      }
      
      if (error) {
        console.error('Supabase query error:', error.code, error.message);
      }
      
      if (error || !data) {
        // Try local storage as fallback
        const localUser = await storage.getItem(`user_${username.trim()}`);
        if (localUser) {
          const userData = JSON.parse(localUser);
          if (userData.password_hash === passwordHash) {
            console.log('Login successful via local storage fallback');
            await storage.setItem('currentUser', username.trim());
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setUsername('');
            setPassword('');
            await loadUserDataFromLocal();
            setShowLoginSuccess(true);
            setTimeout(() => setShowLoginSuccess(false), 3000);
            setIsLoggingIn(false);
            return;
          }
        }
        const errorMsg = 'Invalid username or password';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsLoggingIn(false);
        return;
      }
      
      if (data.password_hash === passwordHash) {
        console.log('Login successful via Supabase');
        await storage.setItem('currentUser', username.trim());
        setCurrentUser(username.trim());
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setUsername('');
        setPassword('');
        await loadUserData();
        if (Platform.OS === 'web') {
          alert('Login successful!');
        }
        setIsLoggingIn(false);
      } else {
        const errorMsg = 'Invalid username or password';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = `Failed to login: ${error.message || 'Unknown error'}`;
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!registerUsername.trim() || !registerPassword.trim() || !confirmPassword.trim()) {
      const errorMsg = 'Please fill in all fields';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (registerPassword !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (registerPassword.length < 4) {
      const errorMsg = 'Password must be at least 4 characters';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (registerUsername.length < 3) {
      const errorMsg = 'Username must be at least 3 characters';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    setIsRegistering(true);
    console.log('Attempting registration for:', registerUsername.trim());

    try {
      const usernameTrimmed = registerUsername.trim();
      const passwordHash = hashPassword(registerPassword);
      const recoveryCodeGenerated = generateRecoveryCode();
      
      // Check if username already exists
      console.log('Checking if username exists...');
      const { data: existingUser, error: checkError } = await supabase
        .from('app_users')
        .select('username')
        .eq('username', usernameTrimmed)
        .single();
      
      console.log('Username check response:', { exists: !!existingUser, error: checkError?.code || checkError?.message });
      
      if (checkError && checkError.code === 'MISSING_CONFIG') {
        const errorMsg = 'Supabase configuration is missing. Please configure your Supabase credentials.';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsRegistering(false);
        return;
      }
      
      if (existingUser) {
        const errorMsg = 'Username already exists';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsRegistering(false);
        return;
      }
      
      // Create user with recovery code
      console.log('Creating user in Supabase...');
      const { error: userError } = await supabase
        .from('app_users')
        .insert({
          username: usernameTrimmed,
          password_hash: passwordHash,
          recovery_code: recoveryCodeGenerated,
        });
      
      console.log('User creation response:', { error: userError?.code || userError?.message || 'Success' });
      
      if (userError) {
        if (userError.code === 'MISSING_CONFIG') {
          const errorMsg = 'Supabase configuration is missing. Please configure your Supabase credentials.';
          console.error(errorMsg);
          if (Platform.OS === 'web') {
            alert(errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        } else if (userError.code === '23505') { // Unique constraint violation
          const errorMsg = 'Username already exists';
          console.error(errorMsg);
          if (Platform.OS === 'web') {
            alert(errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        } else {
          throw userError;
        }
        setIsRegistering(false);
        return;
      }
      
      // Initialize user data
      console.log('Creating user data in Supabase...');
      const { error: dataError } = await supabase
        .from('user_data')
        .insert({
          username: usernameTrimmed,
          pinned_builds: [],
          pinned_gods: [],
          saved_builds: [],
        });
      
      if (dataError && dataError.code !== '23505') {
        console.error('Error creating user data:', dataError);
      }
      
      // Store username temporarily so we can log in after they see the code
      await storage.setItem('pendingRegistrationUsername', usernameTrimmed);
      
      // Show recovery code to user BEFORE logging in
      setGeneratedRecoveryCode(recoveryCodeGenerated);
      setShowRegisterModal(false);
      setRegisterUsername('');
      setRegisterPassword('');
      setConfirmPassword('');
      
      // Set username temporarily for the recovery code modal
      setForgotPasswordUsername(usernameTrimmed);
      
      // Show the recovery code modal - don't log in yet
      setShowRecoveryCodeModal(true);
      setIsRegistering(false);
      console.log('Registration successful!');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = `Failed to create account: ${error.message || 'Unknown error'}`;
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      setIsRegistering(false);
    }
  };

  const handleLogout = async () => {
    await storage.removeItem('currentUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setPinnedBuilds([]);
    setPinnedGods([]);
    setSavedBuilds([]);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordUsername.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    // Check if username exists (but don't reveal this info for security)
    const { data: userData } = await supabase
      .from('app_users')
      .select('username')
      .eq('username', forgotPasswordUsername.trim())
      .single();

    if (!userData) {
      // Don't reveal if username exists, just proceed
      Alert.alert('Info', 'If an account exists with this username, you can reset the password with your recovery code.');
      return;
    }

    // Show recovery code input
    setShowForgotPasswordModal(false);
    setShowRecoveryCodeModal(true);
  };

  const handlePasswordReset = async () => {
    if (!forgotPasswordUsername.trim() || !recoveryCode.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    try {
      // Verify recovery code
      const { data: userData, error: fetchError } = await supabase
        .from('app_users')
        .select('username, recovery_code')
        .eq('username', forgotPasswordUsername.trim())
        .single();

      if (fetchError || !userData) {
        Alert.alert('Error', 'Invalid username or recovery code');
        return;
      }

      if (userData.recovery_code !== recoveryCode.trim().toUpperCase()) {
        Alert.alert('Error', 'Invalid recovery code');
        return;
      }

      // Update password
      const newPasswordHash = hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ password_hash: newPasswordHash })
        .eq('username', forgotPasswordUsername.trim());

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Password reset successfully! You can now sign in.');
      setShowRecoveryCodeModal(false);
      setForgotPasswordUsername('');
      setRecoveryCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowLoginModal(true);
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', `Failed to reset password: ${error.message || 'Unknown error'}`);
    }
  };

  const handleChangeUsername = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to change your username');
      return;
    }

    const trimmedNewUsername = newUsername.trim();

    // Validate username format
    if (!trimmedNewUsername) {
      Alert.alert('Error', 'Please enter a new username');
      return;
    }

    if (trimmedNewUsername.length < 3 || trimmedNewUsername.length > 20) {
      Alert.alert('Error', 'Username must be between 3 and 20 characters');
      return;
    }

    // Validate username contains only letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedNewUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    // Check if new username is the same as current
    if (trimmedNewUsername.toLowerCase() === currentUser.toLowerCase()) {
      Alert.alert('Error', 'New username must be different from your current username');
      return;
    }

    setIsChangingUsername(true);

    try {
      // Check if new username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('app_users')
        .select('username')
        .eq('username', trimmedNewUsername)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is what we want
        throw new Error(`Failed to check username availability: ${checkError.message}`);
      }

      if (existingUser) {
        Alert.alert('Error', 'This username is already taken');
        setIsChangingUsername(false);
        return;
      }

      // Call the update_username RPC function
      const { data: result, error: updateError } = await supabase.rpc('update_username', {
        old_username: currentUser,
        new_username: trimmedNewUsername
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update username');
      }

      // Check the result
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to update username');
      }

      // Update local storage
      await storage.setItem('currentUser', trimmedNewUsername);
      
      // Update any cached data keys that use the old username
      // Note: We don't need to migrate all the data since Supabase handles it
      // But we should update the current user state
      setCurrentUser(trimmedNewUsername);
      
      // Close modal and reset state
      setShowChangeUsernameModal(false);
      setNewUsername('');
      
      Alert.alert('Success', `Username successfully changed to ${trimmedNewUsername}`);
      
      // Reload user data with new username
      await loadUserData();
      
    } catch (error) {
      console.error('Username change error:', error);
      const errorMsg = error.message || 'Failed to update username. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleChangeDisplayName = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to change your display name');
      return;
    }

    const trimmedNewDisplayName = newDisplayName.trim();

    // Validate display name format
    if (!trimmedNewDisplayName) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    if (trimmedNewDisplayName.length < 1 || trimmedNewDisplayName.length > 30) {
      Alert.alert('Error', 'Display name must be between 1 and 30 characters');
      return;
    }

    // Display names can have spaces and more characters than usernames
    // But we'll still validate for safety
    if (trimmedNewDisplayName.length > 30) {
      Alert.alert('Error', 'Display name must be 30 characters or less');
      return;
    }

    setIsChangingDisplayName(true);

    try {
      // Update display name in Supabase
      const { error: updateError } = await supabase
        .from('user_data')
        .update({ 
          display_name: trimmedNewDisplayName,
          updated_at: new Date().toISOString()
        })
        .eq('username', currentUser);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update display name');
      }

      // Update local storage
      await storage.setItem(`displayName_${currentUser}`, trimmedNewDisplayName);
      setDisplayName(trimmedNewDisplayName);
      
      // Close modal and reset state
      setShowChangeDisplayNameModal(false);
      setNewDisplayName('');
      
      Alert.alert('Success', `Display name successfully changed to ${trimmedNewDisplayName}`);
      
    } catch (error) {
      console.error('Display name change error:', error);
      const errorMsg = error.message || 'Failed to update display name. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsChangingDisplayName(false);
    }
  };

  const saveProfileGodIcon = async (godIconPath) => {
    if (!currentUser) return;
    setProfileGodIcon(godIconPath);
    await storage.setItem(`profileGodIcon_${currentUser}`, godIconPath || '');
    
    // Save to Supabase
    try {
      await supabase
        .from('user_data')
        .upsert({
          username: currentUser,
          profile_god_icon: godIconPath || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username'
        });
    } catch (error) {
      console.error('Error saving profile icon to Supabase:', error);
    }
  };

  const saveProfileTheme = async (color, gradient) => {
    if (!currentUser) return;
    const normalizedColor = normalizeHex(color) || color || null;
    const normalizedGradient = normalizeGradientStops(gradient);
    setProfileColor(normalizedColor);
    setProfileGradient(normalizedGradient);
    try {
      await supabase
        .from('user_data')
        .upsert({
          username: currentUser,
          profile_color: normalizedColor,
          profile_gradient: normalizedGradient ? JSON.stringify(normalizedGradient) : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'username' });
    } catch (error) {
      console.error('Error saving profile theme to Supabase:', error);
    }
  };

  const saveProfileAppearance = async (banner, title, font, badges, animation) => {
    if (!currentUser) return;
    setProfileBanner(banner || null);
    setProfileTitle((title || '').trim());
    const fontKey = (font || '').trim() || '';
    setProfileFont(fontKey);
    if (fontKey) await storage.setItem(`profile_font_${currentUser}`, fontKey);
    else await storage.removeItem(`profile_font_${currentUser}`);
    setProfileBadges(Array.isArray(badges) ? badges.slice(0, MAX_BADGES) : []);
    if (animation && NAME_ANIMATION_OPTIONS.some(o => o.key === animation)) setNameAnimation(animation);
    try {
      await supabase
        .from('user_data')
        .upsert({
          username: currentUser,
          profile_banner: banner || null,
          profile_title: (title || '').trim() || null,
          profile_badges: (Array.isArray(badges) ? badges.slice(0, MAX_BADGES) : []).length ? JSON.stringify((Array.isArray(badges) ? badges : []).slice(0, MAX_BADGES)) : null,
          name_animation: animation && animation !== 'none' ? animation : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'username' });
    } catch (error) {
      console.error('Error saving profile appearance to Supabase:', error);
    }
  };

  const shareProfile = async () => {
    if (!currentUser) return;
    
    const baseUrl = IS_WEB && typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://smite2app.com'; // Replace with your actual domain
    
    const profileUrl = `${baseUrl}/profile/${currentUser}`;
    
    const message = `Check out my Smite 2 profile: ${profileUrl}`;
    
    try {
      if (IS_WEB) {
        // Web: Use Web Share API or copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: `${currentUser}'s Smite 2 Profile`,
            text: message,
            url: profileUrl,
          });
        } else {
          // Fallback: Copy to clipboard
          await navigator.clipboard.writeText(profileUrl);
          Alert.alert('Copied!', 'Profile link copied to clipboard');
        }
      } else {
        // Native: Use React Native Share
        await Share.share({
          message: message,
          url: profileUrl,
          title: `${currentUser}'s Smite 2 Profile`,
        });
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      // Fallback: Copy to clipboard on web
      if (IS_WEB && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        Alert.alert('Copied!', 'Profile link copied to clipboard');
      }
    }
  };

  // Share function for viewing other users' profiles
  const handleShareProfile = async () => {
    if (!viewingUser) return;
    
    const baseUrl = IS_WEB && typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://smite2app.com'; // Replace with your actual domain
    
    const profileUrl = `${baseUrl}/profile/${viewingUser}`;
    const message = `Check out ${viewingUser}'s Smite 2 profile: ${profileUrl}`;
    
    try {
      if (IS_WEB) {
        // Web: Use Web Share API or copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: `${viewingUser}'s Smite 2 Profile`,
            text: message,
            url: profileUrl,
          });
        } else {
          // Fallback: Copy to clipboard
          await navigator.clipboard.writeText(profileUrl);
          Alert.alert('Copied!', 'Profile link copied to clipboard');
        }
      } else {
        // Native: Use React Native Share
        await Share.share({
          message: message,
          url: profileUrl,
          title: `${viewingUser}'s Smite 2 Profile`,
        });
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      // Fallback: Copy to clipboard on web
      if (IS_WEB && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        Alert.alert('Copied!', 'Profile link copied to clipboard');
      }
    }
  };

  // Share function for individual builds
  const handleShareBuild = async (build, buildType = 'community') => {
    const baseUrl = IS_WEB && typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://smite2app.com'; // Replace with your actual domain
    
    const buildId = build.databaseId || build.id || `${build.god_name || build.god || 'build'}-${Date.now()}`;
    const buildUrl = `${baseUrl}/build/${buildType}/${buildId}`;
    const buildName = build.build_name || build.name || 'Unnamed Build';
    const godName = build.god_name || build.god || build.godName || 'Unknown';
    const authorUsername = build.username || build.author || viewingUser || 'Unknown';
    const authorDisplayName = displayNameCache[authorUsername] || authorUsername;
    
    const message = `Check out ${authorDisplayName}'s ${buildType} build "${buildName}" for ${godName}: ${buildUrl}`;
    
    try {
      if (IS_WEB) {
        // Web: Use Web Share API or copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: `${buildName} - ${godName} Build`,
            text: message,
            url: buildUrl,
          });
        } else {
          // Fallback: Copy to clipboard
          await navigator.clipboard.writeText(buildUrl);
          Alert.alert('Copied!', 'Build link copied to clipboard');
        }
      } else {
        // Native: Use React Native Share
        await Share.share({
          message: message,
          url: buildUrl,
          title: `${buildName} - ${godName} Build`,
        });
      }
    } catch (error) {
      console.error('Error sharing build:', error);
      // Fallback: Copy to clipboard on web
      if (IS_WEB && navigator.clipboard) {
        await navigator.clipboard.writeText(buildUrl);
        Alert.alert('Copied!', 'Build link copied to clipboard');
      }
    }
  };


  const saveUserDataToSupabase = async (
    newPinnedBuilds = null,
    newPinnedGods = null,
    newSavedBuilds = null,
    newPreferredRoles = null
  ) => {
    if (!currentUser) {
      console.warn('saveUserDataToSupabase: No current user');
      return;
    }
    
    setIsSaving(true);
    
    // Use provided values or fall back to current state
    const buildsToSave = newPinnedBuilds !== null ? newPinnedBuilds : pinnedBuilds;
    const godsToSave = newPinnedGods !== null ? newPinnedGods : pinnedGods;
    const savedToSave = newSavedBuilds !== null ? newSavedBuilds : savedBuilds;
    const rolesToSave = newPreferredRoles !== null ? newPreferredRoles : preferredRoles;
    
      console.log('Saving user data:', {
      user: currentUser,
      pinnedBuilds: buildsToSave.length,
      pinnedGods: godsToSave.length,
      savedBuilds: savedToSave.length,
        preferredRoles: Array.isArray(rolesToSave) ? rolesToSave : [],
      platform: Platform.OS,
      usingProvidedValues: newPinnedBuilds !== null || newPinnedGods !== null || newSavedBuilds !== null,
    });
    
    // Always save to local storage first (fast, reliable)
    try {
      await storage.setItem(`pinnedBuilds_${currentUser}`, JSON.stringify(buildsToSave));
      await storage.setItem(`pinnedGods_${currentUser}`, JSON.stringify(godsToSave));
      await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(savedToSave));
      await storage.setItem(`preferredRoles_${currentUser}`, JSON.stringify(Array.isArray(rolesToSave) ? rolesToSave : []));
      console.log('✅ Saved to local storage');
    } catch (storageError) {
      console.error('❌ Error saving to local storage:', storageError);
      setIsSaving(false);
      // Continue anyway, try Supabase
    }
    
    // Then try to save to Supabase (async, don't block)
    try {
      // Try to set user context for RLS (might not exist yet)
      try {
        const rpcResult = await supabase.rpc('set_current_user', { username_param: currentUser });
        if (rpcResult && rpcResult.error && rpcResult.error.code === 'MISSING_CONFIG') {
          // Supabase not configured, local storage already saved above
          console.log('Supabase not configured, using local storage only');
          return;
        }
      } catch (rpcError) {
        // Continue without RLS context if function doesn't exist
        console.log('RPC set_current_user not available, continuing...');
      }
      
      // Ensure we're sending arrays, not null/undefined
      const buildsToSaveArray = Array.isArray(buildsToSave) ? buildsToSave : [];
      const godsToSaveArray = Array.isArray(godsToSave) ? godsToSave : [];
      const savedToSaveArray = Array.isArray(savedToSave) ? savedToSave : [];
      const preferredRolesArray = Array.isArray(rolesToSave) ? rolesToSave : [];
      
      console.log('Sending to Supabase:', {
        pinned_builds: buildsToSaveArray.length,
        pinned_gods: godsToSaveArray.length,
        saved_builds: savedToSaveArray.length,
        preferred_roles: preferredRolesArray,
        buildsType: Array.isArray(buildsToSave),
        godsType: Array.isArray(godsToSave),
        savedType: Array.isArray(savedToSave),
      });
      
      const { error } = await supabase
        .from('user_data')
        .upsert({
          username: currentUser,
          pinned_builds: buildsToSaveArray,
          pinned_gods: godsToSaveArray,
          saved_builds: savedToSaveArray,
          profile_god_icon: profileGodIcon,
          display_name: displayName,
          preferred_roles: preferredRolesArray,
          profile_color: profileColor || null,
          profile_gradient: normalizeGradientStops(profileGradient) ? JSON.stringify(normalizeGradientStops(profileGradient)) : null,
          profile_banner: profileBanner || null,
          profile_title: (profileTitle || '').trim() || null,
          profile_badges: profileBadges.length ? JSON.stringify(profileBadges.slice(0, MAX_BADGES)) : null,
          name_animation: nameAnimation && nameAnimation !== 'none' ? nameAnimation : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username'
        });
      
      if (!error) {
        console.log('✅ Supabase upsert successful:', {
          pinned_builds: buildsToSaveArray.length,
          pinned_gods: godsToSaveArray.length,
          saved_builds: savedToSaveArray.length,
        });
      } else {
        console.error('❌ Supabase upsert error:', error);
      }
      
      if (error && error.code === 'MISSING_CONFIG') {
        // Supabase not configured, local storage already saved above
        console.log('Supabase MISSING_CONFIG, using local storage only');
        return;
      }
      
      if (error) {
        console.error('❌ Error saving user data to Supabase:', error);
        // Local storage already saved above, so data is safe
      } else {
        console.log('✅ Saved to Supabase successfully');
      }
    } catch (error) {
      console.error('❌ Error saving to Supabase:', error);
      // Local storage already saved above, so data is safe
    } finally {
      setIsSaving(false);
    }
  };

  const pinBuild = async (build) => {
    if (!currentUser) return;
    const newPinned = [...pinnedBuilds, build];
    console.log('Pinning build:', build, 'from', pinnedBuilds.length, 'to', newPinned.length);
    setPinnedBuilds(newPinned);
    // Pass the new array directly to ensure we save the updated data
    await saveUserDataToSupabase(newPinned, null, null);
  };

  const unpinBuild = async (buildIdOrKey) => {
    if (!currentUser) return;
    const newPinned = pinnedBuilds.filter(b => (b.id !== buildIdOrKey && b.buildKey !== buildIdOrKey));
    console.log('Unpinning build:', buildIdOrKey, 'from', pinnedBuilds.length, 'to', newPinned.length);
    setPinnedBuilds(newPinned);
    // Pass the new array directly to ensure we save the updated data
    await saveUserDataToSupabase(newPinned, null, null);
  };

  const pinGod = async (god) => {
    if (!currentUser) return;
    const newPinned = [...pinnedGods, god];
    console.log('Pinning god:', god, 'from', pinnedGods.length, 'to', newPinned.length);
    setPinnedGods(newPinned);
    // Pass the new array directly to ensure we save the updated data
    await saveUserDataToSupabase(null, newPinned, null);
  };

  const unpinGod = async (godName) => {
    if (!currentUser) return;
    const newPinned = pinnedGods.filter(g => (g.name || g.GodName) !== godName);
    console.log('Unpinning god:', godName, 'from', pinnedGods.length, 'to', newPinned.length);
    setPinnedGods(newPinned);
    // Pass the new array directly to ensure we save the updated data
    await saveUserDataToSupabase(null, newPinned, null);
  };

  const saveBuild = async (build) => {
    if (!currentUser) return;
    const newSaved = [...savedBuilds, { ...build, id: Date.now(), savedAt: Date.now() }];
    console.log('Saving build:', build, 'from', savedBuilds.length, 'to', newSaved.length);
    setSavedBuilds(newSaved);
    // Pass the new array directly to ensure we save the updated data
    await saveUserDataToSupabase(null, null, newSaved);
  };

  const deleteSavedBuild = async (buildId) => {
    if (!currentUser) return;
    const newSaved = savedBuilds.filter(b => b.id !== buildId);
    console.log('Deleting saved build:', buildId, 'from', savedBuilds.length, 'to', newSaved.length);
    setSavedBuilds(newSaved);
    // Pass the new array directly to ensure we save the updated data
    await saveUserDataToSupabase(null, null, newSaved);
  };

  // If viewing another user's profile, allow it even when logged out
  if (viewingUser && viewingUser !== currentUser) {
    // Single source of truth for other user's display name (works before viewingUserData loads, e.g. on app)
    const otherUserDisplayName = (viewingUserData?.display_name ?? viewUsername ?? viewingUser ?? 'Profile').trim() || 'Profile';

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header: web = single row (Back | Name | Share); mobile = two rows (Back+Share then Name) */}
          {IS_WEB ? (
            <View style={styles.headerWebWrapper}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => {
                setViewingUser(null);
                if (typeof window !== 'undefined') {
                  window.viewingUserProfile = null;
                }
                if (onNavigateBack) onNavigateBack();
              }} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <View style={styles.headerTitleRow}>
                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                  {otherUserDisplayName}
                </Text>
              </View>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
              {currentUser && (
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={handleFollow}
                >
                  <Text style={styles.followButtonText}>
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            </View>
          ) : (
            <View style={styles.headerWrapper}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                  setViewingUser(null);
                  if (onNavigateBack) onNavigateBack();
                }} style={styles.backButton}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerSpacer} />
                <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
                {currentUser && (
                  <TouchableOpacity
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                    onPress={handleFollow}
                  >
                    <Text style={styles.followButtonText}>
                      {isFollowing ? '✓ Following' : '+ Follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {loadingUserProfile ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1e90ff" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : userNotFound ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>User Not Found</Text>
              <Text style={styles.errorText}>
                The user "{viewingUser}" doesn't exist or their profile is not available.
              </Text>
            </View>
          ) : (
            <>
              {/* Other User's Profile Header - responsive to screen width */}
              {(() => {
                const narrow = screenWidth < 420;
                const headerPadding = narrow ? 12 : 24;
                const iconSize = narrow ? 80 : 130;
                let otherGradient = null;
                if (viewingUserData?.profile_gradient) {
                  try {
                    const parsed = typeof viewingUserData.profile_gradient === 'string'
                      ? JSON.parse(viewingUserData.profile_gradient)
                      : viewingUserData.profile_gradient;
                    otherGradient = normalizeGradientStops(parsed);
                  } catch (_) {}
                }
                let otherBadges = [];
                if (viewingUserData?.profile_badges) {
                  try {
                    const parsed = typeof viewingUserData.profile_badges === 'string'
                      ? JSON.parse(viewingUserData.profile_badges)
                      : viewingUserData.profile_badges;
                    if (Array.isArray(parsed)) otherBadges = parsed.slice(0, MAX_BADGES);
                  } catch (_) {}
                }
                const otherAccentColor = viewingUserData?.profile_color || (otherGradient && otherGradient[0]) || '#1e90ff';
                const otherBannerPreset = PROFILE_BANNER_PRESETS.find((p) => p.key === viewingUserData?.profile_banner);
                const hasOtherBannerImage = !!(otherBannerPreset && otherBannerPreset.key !== 'none' && otherBannerPreset.image);
                const otherGradientStyle = !hasOtherBannerImage && otherGradient && otherGradient.length >= 2
                  ? (IS_WEB
                    ? { backgroundImage: `linear-gradient(120deg, ${otherGradient.join(', ')})` }
                    : { backgroundColor: otherGradient[0] })
                  : null;
                const otherBannerTintStyle = hasOtherBannerImage ? styles.profileBannerTintDark : null;
                const otherTitle = (viewingUserData?.profile_title || '').trim();
                const otherAnimation = NAME_ANIMATION_OPTIONS.some((o) => o.key === viewingUserData?.name_animation)
                  ? viewingUserData?.name_animation
                  : 'none';
                return (
              <View style={[styles.profileHeader, IS_WEB && styles.profileHeaderWeb, { padding: headerPadding, position: 'relative', borderColor: otherAccentColor }, otherGradientStyle]}>
                {otherBannerPreset && otherBannerPreset.key !== 'none' && otherBannerPreset.image && (
                  <Image
                    source={{ uri: otherBannerPreset.image }}
                    style={[styles.profileBannerStrip, IS_WEB && styles.profileBannerStripWeb]}
                    resizeMode="cover"
                  />
                )}
                {otherBannerPreset && otherBannerPreset.key !== 'none' && otherBannerPreset.image && (
                  <View style={[styles.profileBannerTint, IS_WEB && styles.profileBannerTintWeb, otherBannerTintStyle]} />
                )}
                <View style={styles.profileHeaderContent}>
                  <View style={[styles.profileIconContainer, { width: iconSize, height: iconSize, borderRadius: iconSize / 2, borderColor: otherAccentColor, marginRight: narrow ? 12 : (Platform.OS === 'web' ? 20 : 16) }]}>
                    {viewingUserData?.profile_god_icon ? (() => {
                      const godName = viewingUserData.profile_god_icon;
                      const iconUrl = getGodIconUrl(godName);
                      if (iconUrl) {
                        return (
                          <Image 
                            source={{ uri: iconUrl }} 
                            style={styles.profileIcon}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={0}
                            accessibilityLabel={`${viewUsername || viewingUser || 'User'} profile icon`}
                          />
                        );
                      }
                      return null;
                    })() : null}
                    {!viewingUserData?.profile_god_icon && (
                      <View style={styles.profileIconPlaceholder}>
                        <Text style={styles.profileIconPlaceholderText}>
                          {(viewUsername || viewingUser) ? (viewUsername || viewingUser).charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <View style={styles.profileNameRow}>
                      <AnimatedProfileName
                        name={otherUserDisplayName}
                        animationType={otherAnimation}
                        accentColor={otherAccentColor}
                        style={[
                          styles.profileDisplayName,
                          { fontSize: getProfileNameFontSize(otherUserDisplayName, screenWidth) },
                          viewingUserContributorBuilds.length > 0 && styles.profileNameContributor
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      />
                    </View>
                    {otherTitle ? <Text style={styles.profileTitleText} numberOfLines={1}>{otherTitle}</Text> : null}
                    {otherBadges.length > 0 && (
                      <View style={styles.profileBadgesRow}>
                        {otherBadges.map((badgeId) => {
                          const badge = availableBadges.find((b) => b.id === badgeId) || {
                            id: badgeId,
                            label: getBadgeLabelFromFile(badgeId),
                            icon: getBadgeIconUrl(badgeId),
                          };
                          return badge ? (
                            <View key={badge.id} style={styles.profileBadgePill}>
                              {badge.icon ? (
                                <Image
                                  source={{ uri: badge.icon }}
                                  style={styles.profileBadgeIcon}
                                  contentFit="cover"
                                  accessibilityLabel={`${simplifyBadgeLabel(badge.label)} badge`}
                                />
                              ) : null}
                            </View>
                          ) : null;
                        })}
                      </View>
                    )}
                    {/* Viewing user's preferred roles, if any */}
                    {Array.isArray(viewingUserData?.preferred_roles) && viewingUserData.preferred_roles.length > 0 && (
                      <View style={styles.preferredRolesDisplayRow}>
                        <Text style={styles.preferredRolesLabelSmall}>Preferred Roles: </Text>
                        <View style={styles.preferredRolesTagsRow}>
                          {Array.from(
                            new Set(
                              viewingUserData.preferred_roles
                                .map((r) => (typeof r === 'string' ? r.trim() : ''))
                                .filter((r) => !!r && PREFERRED_ROLE_META[r])
                            )
                          )
                            .slice(0, 2)
                            .map((roleKey) => {
                              const meta = PREFERRED_ROLE_META[roleKey];
                              return (
                                <View key={roleKey} style={[styles.roleTag, { borderColor: meta.color, backgroundColor: meta.background }]}>
                                  {meta.icon ? (
                                    <Image source={{ uri: meta.icon }} style={styles.roleTagIconSmall} contentFit="contain" />
                                  ) : (
                                    <View style={[styles.roleColorDotSmall, { backgroundColor: meta.color }]} />
                                  )}
                                  <Text style={[styles.roleTagText, { color: meta.color }]}>{meta.label}</Text>
                                </View>
                              );
                            })}
                        </View>
                      </View>
                    )}
                    <Text style={styles.profileSubtitle}>
                      {viewingUserContributorBuilds.length + viewingUserCommunityBuilds.length + viewingUserCertifiedBuilds.length} Builds
                    </Text>
                  </View>
                </View>
                {viewingUserContributorBuilds.length > 0 && (
                  <View style={styles.contributorBadgeBottomRight}>
                    <View style={styles.contributorBadge}>
                      <Text style={styles.contributorCheckmark}>✓</Text>
                      <Text style={styles.contributorText}>Contributor</Text>
                    </View>
                  </View>
                )}
              </View>
                );
              })()}

              {/* Contributor Builds */}
              {viewingUserContributorBuilds.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity 
                    onPress={() => setExpandedContributorBuilds(!expandedContributorBuilds)}
                    style={styles.sectionHeader}
                  >
                    <Text style={styles.sectionTitle}> Contributor Builds</Text>
                    <Text style={styles.expandIcon}>{expandedContributorBuilds ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedContributorBuilds && viewingUserContributorBuilds.map((build, idx) => {
                    const godName = build.god_name || build.god || build.godName || 'Unknown';
                    const godInternalName = build.god_internal_name || build.godInternalName;
                    const god = findGodForBuild(godName, godInternalName);
                    const godIcon = build.godIcon || (god && (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon)));
                    const localGodIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                    const buildName = build.build_name || build.name || 'Unnamed Build';
                    const items = build.items || [];
                    
                    return (
                      <View key={build.databaseId || `contributor-build-${idx}`} style={styles.buildCard}>
                        <View style={styles.buildHeader}>
                          <View style={styles.buildHeaderLeft}>
                            {localGodIcon ? (
                              <Image
                                source={localGodIcon}
                                style={styles.godIcon}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={0}
                                accessibilityLabel={`${godName} icon`}
                              />
                            ) : (
                              <View style={styles.godIconFallback}>
                                <Text style={styles.godIconFallbackText}>
                                  {godName.charAt(0)}
                                </Text>
                              </View>
                            )}
                            <View style={styles.buildInfo}>
                              <View style={styles.buildNameRow}>
                                <Text style={styles.buildName}>{buildName}</Text>
                                <TouchableOpacity 
                                  style={styles.buildShareButton}
                                  onPress={() => handleShareBuild(build, 'contributor')}
                                >
                                  <Text style={styles.buildShareButtonText}>Share</Text>
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.buildGod}>{godName}</Text>
                              <Text style={styles.buildLevel}>Level {build.god_level || build.godLevel || 20}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.itemsContainer}>
                          {items && items.length > 0 ? (
                            items.map((itemData, itemIndex) => {
                              const itemName = itemData.name || itemData.internalName;
                              const item = findItemByName(itemName);
                              const icon = item?.icon || itemData.icon;
                              const localItemIcon = icon ? getLocalItemIcon(icon) : null;
                              const iconKey = `view-contributor-${idx}-${itemIndex}`;
                              const useFallback = failedItemIcons[iconKey];
                              return (
                                <View key={itemIndex} style={styles.itemSlot}>
                                  {localItemIcon ? (() => {
                                    const imageSource = localItemIcon.primary || localItemIcon;
                                    const fallbackSource = localItemIcon.fallback;
                                    if (fallbackSource && !useFallback) {
                                      return (
                                        <Image
                                          source={imageSource}
                                          style={styles.itemIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                          onError={() => {
                                            setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                          }}
                                        />
                                      );
                                    }
                                    if (fallbackSource && useFallback) {
                                      return (
                                        <Image
                                          source={fallbackSource}
                                          style={styles.itemIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                        />
                                      );
                                    }
                                    return (
                                      <Image
                                        source={imageSource}
                                        style={styles.itemIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                      />
                                    );
                                  })() : (
                                    <View style={styles.itemIconFallback}>
                                      <Text style={styles.itemIconFallbackText}>
                                        {itemName ? itemName.charAt(0) : '?'}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })
                          ) : (
                            <Text style={styles.emptyText}>No items</Text>
                          )}
                        </View>
                        
                        {/* Relic Section */}
                        {build.relic && (() => {
                          const relic = build.relic;
                          const relicName = typeof relic === 'string' ? relic : (relic.name || relic.internalName || '');
                          if (!relicName) return null;
                          
                          const item = findItemByName(relicName);
                          const icon = item?.icon || (typeof relic === 'object' && relic.icon);
                          const localItemIcon = icon ? getLocalItemIcon(icon) : null;
                          const iconKey = `view-contributor-relic-${idx}`;
                          const useFallback = failedItemIcons[iconKey];
                          
                          return (
                            <View style={styles.itemsContainer}>
                              <Text style={styles.sectionSubtitle}>Relic</Text>
                              <View style={styles.itemSlot}>
                                {localItemIcon ? (() => {
                                  const imageSource = localItemIcon.primary || localItemIcon;
                                  const fallbackSource = localItemIcon.fallback;
                                  if (fallbackSource && !useFallback) {
                                    return (
                                      <Image
                                        source={imageSource}
                                        style={styles.itemIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                        onError={() => {
                                          setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                        }}
                                      />
                                    );
                                  }
                                  if (fallbackSource && useFallback) {
                                    return (
                                      <Image
                                        source={fallbackSource}
                                        style={styles.itemIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                      />
                                    );
                                  }
                                  return (
                                    <Image
                                      source={imageSource}
                                      style={styles.itemIcon}
                                      contentFit="cover"
                                      cachePolicy="memory-disk"
                                      transition={200}
                                    />
                                  );
                                })() : (
                                  <View style={styles.itemIconFallback}>
                                    <Text style={styles.itemIconFallbackText}>
                                      {relicName ? relicName.charAt(0) : '?'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })()}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Community Builds */}
              {viewingUserCommunityBuilds.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity 
                    onPress={() => setExpandedCommunityBuilds(!expandedCommunityBuilds)}
                    style={styles.sectionHeader}
                  >
                    <Text style={styles.sectionTitle}> Community Builds</Text>
                    <Text style={styles.expandIcon}>{expandedCommunityBuilds ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedCommunityBuilds && viewingUserCommunityBuilds.map((build, idx) => {
                    const godName = build.god_name || build.god || build.godName || 'Unknown';
                    const godInternalName = build.god_internal_name || build.godInternalName;
                    const god = findGodForBuild(godName, godInternalName);
                    const godIcon = build.godIcon || (god && (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon)));
                    const localGodIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                    const buildName = build.build_name || build.name || 'Unnamed Build';
                    const items = build.items || [];
                    
                    return (
                      <View key={build.databaseId || `community-build-${idx}`} style={styles.buildCard}>
                        <View style={styles.buildHeader}>
                          <View style={styles.buildHeaderLeft}>
                            {localGodIcon ? (
                              <Image
                                source={localGodIcon}
                                style={styles.godIcon}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={0}
                                accessibilityLabel={`${godName} icon`}
                              />
                            ) : (
                              <View style={styles.godIconFallback}>
                                <Text style={styles.godIconFallbackText}>
                                  {godName.charAt(0)}
                                </Text>
                              </View>
                            )}
                            <View style={styles.buildInfo}>
                              <View style={styles.buildNameRow}>
                                <Text style={styles.buildName}>{buildName}</Text>
                                <TouchableOpacity 
                                  style={styles.buildShareButton}
                                  onPress={() => handleShareBuild(build, 'community')}
                                >
                                  <Text style={styles.buildShareButtonText}>Share</Text>
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.buildGod}>{godName}</Text>
                              <Text style={styles.buildLevel}>Level {build.god_level || build.godLevel || 20}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.itemsContainer}>
                          {items && items.length > 0 ? (
                            items.map((itemData, itemIndex) => {
                              const itemName = itemData.name || itemData.internalName;
                              const item = findItemByName(itemName);
                              const icon = item?.icon || itemData.icon;
                              const localItemIcon = icon ? getLocalItemIcon(icon) : null;
                              const iconKey = `view-community-${idx}-${itemIndex}`;
                              const useFallback = failedItemIcons[iconKey];
                              return (
                                <View key={itemIndex} style={styles.itemSlot}>
                                  {localItemIcon ? (() => {
                                    const imageSource = localItemIcon.primary || localItemIcon;
                                    const fallbackSource = localItemIcon.fallback;
                                    if (fallbackSource && !useFallback) {
                                      return (
                                        <Image
                                          source={imageSource}
                                          style={styles.itemIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                          onError={() => {
                                            setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                          }}
                                        />
                                      );
                                    }
                                    if (fallbackSource && useFallback) {
                                      return (
                                        <Image
                                          source={fallbackSource}
                                          style={styles.itemIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                        />
                                      );
                                    }
                                    return (
                                      <Image
                                        source={imageSource}
                                        style={styles.itemIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                      />
                                    );
                                  })() : (
                                    <View style={styles.itemIconFallback}>
                                      <Text style={styles.itemIconFallbackText}>
                                        {itemName ? itemName.charAt(0) : '?'}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })
                          ) : (
                            <Text style={styles.emptyText}>No items</Text>
                          )}
                        </View>
                        
                        {/* Relic Section */}
                        {build.relic && (() => {
                          const relic = build.relic;
                          const relicName = typeof relic === 'string' ? relic : (relic.name || relic.internalName || '');
                          if (!relicName) return null;
                          
                          const item = findItemByName(relicName);
                          const icon = item?.icon || (typeof relic === 'object' && relic.icon);
                          const localItemIcon = icon ? getLocalItemIcon(icon) : null;
                          const iconKey = `view-community-relic-${idx}`;
                          const useFallback = failedItemIcons[iconKey];
                          
                          return (
                            <View style={styles.itemsContainer}>
                              <Text style={styles.sectionSubtitle}>Relic</Text>
                              <View style={styles.itemSlot}>
                                {localItemIcon ? (() => {
                                  const imageSource = localItemIcon.primary || localItemIcon;
                                  const fallbackSource = localItemIcon.fallback;
                                  if (fallbackSource && !useFallback) {
                                    return (
                                      <Image
                                        source={imageSource}
                                        style={styles.itemIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                        onError={() => {
                                          setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                        }}
                                      />
                                    );
                                  }
                                  if (fallbackSource && useFallback) {
                                    return (
                                      <Image
                                        source={fallbackSource}
                                        style={styles.itemIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                      />
                                    );
                                  }
                                  return (
                                    <Image
                                      source={imageSource}
                                      style={styles.itemIcon}
                                      contentFit="cover"
                                      cachePolicy="memory-disk"
                                      transition={200}
                                    />
                                  );
                                })() : (
                                  <View style={styles.itemIconFallback}>
                                    <Text style={styles.itemIconFallbackText}>
                                      {relicName ? relicName.charAt(0) : '?'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })()}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Tierlist Section */}
              {viewingUserTierlist && (viewingUserTierlist.gods || viewingUserTierlist.items) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📊 Tierlist</Text>
                  <Text style={styles.emptyText}>Tierlist feature coming soon</Text>
                </View>
              )}

              {viewingUserContributorBuilds.length === 0 && viewingUserCommunityBuilds.length === 0 && (
                <View style={styles.section}>
                  <Text style={styles.emptyText}>No builds yet</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.loginContainer}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Sign in to save builds, pin gods, and more!</Text>
            
            <TouchableOpacity style={styles.loginButton} onPress={() => setShowLoginModal(true)}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.registerButton} onPress={() => setShowRegisterModal(true)}>
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Login Modal */}
          <Modal 
            visible={showLoginModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowLoginModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowLoginModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Sign In</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowLoginModal(false);
                    setUsername('');
                    setPassword('');
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmButton, isLoggingIn && styles.confirmButtonDisabled]} 
                    onPress={handleLogin}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.forgotPasswordLink}
                  onPress={() => {
                    setShowLoginModal(false);
                    setForgotPasswordUsername('');
                    setShowForgotPasswordModal(true);
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Forgot Password Modal */}
          <Modal 
            visible={showForgotPasswordModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowForgotPasswordModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowForgotPasswordModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Forgot Password</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your username and recovery code to reset your password.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={forgotPasswordUsername}
                  onChangeText={setForgotPasswordUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Recovery Code (8 characters)"
                  placeholderTextColor="#64748b"
                  value={recoveryCode}
                  onChangeText={(text) => setRecoveryCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handlePasswordReset}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordUsername('');
                    setRecoveryCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={handlePasswordReset}>
                    <Text style={styles.confirmButtonText}>Reset Password</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Recovery Code Display Modal (shown after registration) */}
          <Modal 
            visible={showRecoveryCodeModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowRecoveryCodeModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowRecoveryCodeModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>⚠️ Save Your Recovery Code</Text>
                <Text style={styles.modalSubtitle}>
                  This code will allow you to reset your password if you forget it. 
                  Save it in a safe place - you won't be able to see it again!
                </Text>
                <View style={styles.recoveryCodeContainer}>
                  <Text style={styles.recoveryCodeText}>{generatedRecoveryCode}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.confirmButton} 
                  onPress={async () => {
                    // Get the username from storage
                    const pendingUsername = await storage.getItem('pendingRegistrationUsername');
                    
                    // Now log in the user after they've seen the recovery code
                    if (pendingUsername) {
                      await storage.setItem('currentUser', pendingUsername);
                      await storage.removeItem('pendingRegistrationUsername');
                      setCurrentUser(pendingUsername);
                      setIsLoggedIn(true);
                      await loadUserData();
                    } else if (forgotPasswordUsername) {
                      // Fallback if pendingUsername wasn't set
                      await storage.setItem('currentUser', forgotPasswordUsername);
                      setCurrentUser(forgotPasswordUsername);
                      setIsLoggedIn(true);
                      await loadUserData();
                    }
                    
                    setShowRecoveryCodeModal(false);
                    setGeneratedRecoveryCode('');
                    setForgotPasswordUsername('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText} allowFontScaling={true}>
                    I've Saved It
                  </Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Register Modal */}
          <Modal 
            visible={showRegisterModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowRegisterModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowRegisterModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Create Account</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={registerUsername}
                  onChangeText={setRegisterUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleRegister}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowRegisterModal(false);
                    setRegisterUsername('');
                    setRegisterPassword('');
                    setConfirmPassword('');
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmButton, isRegistering && styles.confirmButtonDisabled]} 
                    onPress={handleRegister}
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text 
              style={styles.title}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName || currentUser || 'Profile'}
            </Text>
            {currentUser && (
              <TouchableOpacity
                style={styles.headerEditButton}
                onPress={() => {
                  setNewDisplayName(displayName || '');
                  setShowChangeDisplayNameModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.usernameEditIcon}>✎</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header with Icon - responsive to screen width */}
        {(() => {
          const accentColor = profileColor || (profileGradient && profileGradient[0]) || '#1e90ff';
          const bannerPreset = PROFILE_BANNER_PRESETS.find(p => p.key === profileBanner);
          const hasBannerImage = !!(bannerPreset && bannerPreset.key !== 'none' && bannerPreset.image);
          const profileGradientStyle = !hasBannerImage && profileGradient && profileGradient.length >= 2
            ? (IS_WEB
              ? { backgroundImage: `linear-gradient(120deg, ${profileGradient.join(', ')})` }
              : { backgroundColor: profileGradient[0] })
            : null;
          const profileBannerTintStyle = hasBannerImage ? styles.profileBannerTintDark : null;
          const headerBorderStyle = {
            borderColor: accentColor,
            ...(IS_WEB && profileColor && { boxShadow: `0 4px 20px ${accentColor}40` }),
          };
          return (
        <View style={[styles.profileHeader, IS_WEB && styles.profileHeaderWeb, screenWidth < 420 && { padding: 12 }, headerBorderStyle, profileGradientStyle]}>
          {bannerPreset && bannerPreset.key !== 'none' && bannerPreset.image && (
            <Image
              source={{ uri: bannerPreset.image }}
              style={[styles.profileBannerStrip, IS_WEB && styles.profileBannerStripWeb]}
              resizeMode="cover"
            />
          )}
          {bannerPreset && bannerPreset.key !== 'none' && bannerPreset.image && (
            <View style={[styles.profileBannerTint, IS_WEB && styles.profileBannerTintWeb, profileBannerTintStyle]} />
          )}
          <View style={styles.profileHeaderContent}>
            <View style={[styles.profileIconWrapper, screenWidth < 420 && { marginRight: 12 }]}>
              <TouchableOpacity 
                style={[styles.profileIconContainer, screenWidth < 420 && { width: 80, height: 80, borderRadius: 40, marginRight: 0 }, { borderColor: accentColor }]}
                onPress={() => {
                  setTempSelectedGodIcon(profileGodIcon);
                  setShowGodIconPicker(true);
                }}
                activeOpacity={0.7}
              >
                {profileGodIcon ? (() => {
                  const iconUrl = getGodIconUrl(profileGodIcon);
                  if (iconUrl) {
                    return (
                      <Image 
                        source={{ uri: iconUrl }} 
                        style={styles.profileIcon}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={0}
                        accessibilityLabel={`${currentUser || 'User'} profile icon`}
                      />
                    );
                  }
                  return null;
                })() : null}
                {!profileGodIcon && (
                  <View style={styles.profileIconPlaceholder}>
                    <Text style={styles.profileIconPlaceholderText}>
                      {currentUser ? currentUser.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileIconEditBadge}
                onPress={() => {
                  setTempSelectedGodIcon(profileGodIcon);
                  setShowGodIconPicker(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.profileIconEditText}>✎</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <AnimatedProfileName
                name={displayName || currentUser || 'Profile'}
                animationType={nameAnimation}
                accentColor={accentColor}
                style={[
                  styles.profileDisplayName,
                  { fontSize: getProfileNameFontSize(displayName || currentUser || '', screenWidth) },
                  profileFont && PROFILE_FONT_FAMILY_MAP[profileFont] && { fontFamily: PROFILE_FONT_FAMILY_MAP[profileFont] }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              />
              {profileTitle ? <Text style={styles.profileTitleText} numberOfLines={1}>{profileTitle}</Text> : null}
              {profileBadges.length > 0 && (
                <View style={styles.profileBadgesRow}>
                  {profileBadges.slice(0, MAX_BADGES).map((badgeId) => {
                    const badge = availableBadges.find((b) => b.id === badgeId) || {
                      id: badgeId,
                      label: getBadgeLabelFromFile(badgeId),
                      icon: getBadgeIconUrl(badgeId),
                    };
                    return badge ? (
                      <View key={badge.id} style={styles.profileBadgePill}>
                        {badge.icon ? (
                          <Image
                            source={{ uri: badge.icon }}
                            style={styles.profileBadgeIcon}
                            contentFit="cover"
                            accessibilityLabel={`${simplifyBadgeLabel(badge.label)} badge`}
                          />
                        ) : null}
                      </View>
                    ) : null;
                  })}
                </View>
              )}
              <Text style={styles.profileSubtitle}>
                {savedBuilds.length + communityBuilds.length + certifiedBuilds.length} Total Builds
              </Text>
              {currentUser && !viewingUser && (
                <View style={styles.profileGoldBadge}>
                  <Text style={styles.profileGoldLabel}>Gold</Text>
                  <Text style={styles.profileGoldValue}>{profileGold}</Text>
                </View>
              )}
            </View>
          </View>
          {/* Current user's preferred roles summary (now placed under the profile icon/header) */}
          <View style={styles.preferredRolesSection}>
            <TouchableOpacity
              style={styles.preferredRolesSummaryRow}
              onPress={() => setShowPreferredRolesModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.preferredRolesLabel}>Preferred Roles:</Text>
              <View style={styles.preferredRolesTagsRow}>
                {preferredRoles.length === 0 && (
                  <Text style={styles.preferredRolesEmptyText}>Tap to choose (max 2)</Text>
                )}
                {preferredRoles.map((roleKey) => {
                  const meta = PREFERRED_ROLE_META[roleKey];
                  if (!meta) return null;
                  return (
                    <View key={roleKey} style={[styles.roleTag, { borderColor: meta.color, backgroundColor: meta.background }]}>
                      {meta.icon ? (
                        <Image source={{ uri: meta.icon }} style={styles.roleTagIconSmall} contentFit="contain" />
                      ) : (
                        <View style={[styles.roleColorDotSmall, { backgroundColor: meta.color }]} />
                      )}
                      <Text style={[styles.roleTagText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          </View>
        </View>
          );
        })()}

        {/* Account Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>
          <View style={styles.accountSettingsGrid}>
            <TouchableOpacity
              style={styles.accountSettingCard}
              onPress={() => {
                setNewUsername('');
                setShowChangeUsernameModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.accountSettingIcon}>U</Text>
              <View style={styles.accountSettingContent}>
                <Text style={styles.accountSettingTitle}>Username</Text>
                <Text style={styles.accountSettingDescription}>Update your login name across your account.</Text>
              </View>
              <Text style={styles.accountSettingArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountSettingCard}
              onPress={() => {
                setShowProfileColorModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.accountSettingIcon}>C</Text>
              <View style={styles.accountSettingContent}>
                <Text style={styles.accountSettingTitle}>Profile Background Color</Text>
                <Text style={styles.accountSettingDescription}>Tune your base color and gradient aura.</Text>
              </View>
              <Text style={styles.accountSettingArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountSettingCard}
              onPress={() => {
                setAppearanceSection('banner');
                setShowProfileAppearanceModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.accountSettingIcon}>FX</Text>
              <View style={styles.accountSettingContent}>
                <Text style={styles.accountSettingTitle}>Banner, Badges & FX</Text>
                <Text style={styles.accountSettingDescription}>Set your title, icon badges, and name animation.</Text>
              </View>
              <Text style={styles.accountSettingArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* God Icon Picker Modal - Must be outside ScrollView for proper modal rendering */}
        <Modal
          visible={showGodIconPicker}
          transparent={true}
          animationType={IS_WEB ? "fade" : "slide"}
          onRequestClose={() => {
            setShowGodIconPicker(false);
            setGodSearchQuery('');
            setTempSelectedGodIcon(null);
          }}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => {
              setShowGodIconPicker(false);
              setGodSearchQuery('');
              setTempSelectedGodIcon(null);
            }}
          >
            <Pressable style={styles.godPickerModalContainer} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Choose Profile Icon</Text>
              <TextInput
                style={styles.input}
                placeholder="Search gods..."
                placeholderTextColor="#64748b"
                value={godSearchQuery}
                onChangeText={setGodSearchQuery}
              />
              <ScrollView 
                style={{ maxHeight: 400, marginVertical: 16 }}
                contentContainerStyle={styles.godPickerGrid}
              >
                {filteredGodsForPicker.map((god, index) => {
                  const name = god.name || god.GodName || god.title || 'Unknown';
                  const iconUrl = getGodIconUrl(name);
                  const isSelected = tempSelectedGodIcon === name || (tempSelectedGodIcon === null && profileGodIcon === name);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.godPickerItem, isSelected && styles.godPickerItemSelected]}
                      onPress={() => {
                        // Set temporary selection
                        setTempSelectedGodIcon(name);
                      }}
                      activeOpacity={0.7}
                    >
                      {iconUrl ? (
                        <Image
                          source={{ uri: iconUrl }}
                          style={styles.godPickerIcon}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          transition={0}
                        />
                      ) : (
                        <View style={styles.godPickerIconPlaceholder}>
                          <Text style={styles.godPickerIconPlaceholderText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.godPickerSelectedBadge}>
                          <Text style={styles.godPickerSelectedText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowGodIconPicker(false);
                    setGodSearchQuery('');
                    setTempSelectedGodIcon(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmButton, !tempSelectedGodIcon && styles.confirmButtonDisabled]}
                  onPress={() => {
                    if (tempSelectedGodIcon) {
                      saveProfileGodIcon(tempSelectedGodIcon);
                      setShowGodIconPicker(false);
                      setGodSearchQuery('');
                      setTempSelectedGodIcon(null);
                    }
                  }}
                  disabled={!tempSelectedGodIcon}
                >
                  <Text style={styles.confirmButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Change Username Modal */}
        <Modal
          visible={showChangeUsernameModal}
          transparent={true}
          animationType={IS_WEB ? "fade" : "slide"}
          onRequestClose={() => {
            setShowChangeUsernameModal(false);
            setNewUsername('');
          }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowChangeUsernameModal(false);
              setNewUsername('');
            }}
          >
            <Pressable style={[styles.modalContainer, styles.profileColorModalContainer]} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Change Username</Text>
              <Text style={styles.modalSubtitle}>
                Current username: <Text style={styles.currentUsernameText}>{currentUser}</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="New username"
                placeholderTextColor="#64748b"
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              <Text style={styles.usernameHint}>
                Username must be 3-20 characters and can only contain letters, numbers, and underscores.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowChangeUsernameModal(false);
                    setNewUsername('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, isChangingUsername && styles.confirmButtonDisabled]}
                  onPress={handleChangeUsername}
                  disabled={isChangingUsername}
                >
                  {isChangingUsername ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Change Username</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Change Display Name Modal */}
        <Modal
          visible={showChangeDisplayNameModal}
          transparent={true}
          animationType={IS_WEB ? "fade" : "slide"}
          onRequestClose={() => {
            setShowChangeDisplayNameModal(false);
            setNewDisplayName('');
          }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowChangeDisplayNameModal(false);
              setNewDisplayName('');
            }}
          >
            <Pressable style={[styles.modalContainer, styles.appearanceModalContainer]} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Change Display Name</Text>
              <Text style={styles.modalSubtitle}>
                Current display name: <Text style={styles.currentUsernameText}>{displayName || currentUser || 'Not set'}</Text>
              </Text>
              <Text style={styles.modalSubtitle}>
                Your username (for login): <Text style={styles.currentUsernameText}>{currentUser}</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="New display name"
                placeholderTextColor="#64748b"
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
              />
              <Text style={styles.usernameHint}>
                Display name can be 1-30 characters and can contain spaces. This is what others see instead of your username.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowChangeDisplayNameModal(false);
                    setNewDisplayName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, isChangingDisplayName && styles.confirmButtonDisabled]}
                  onPress={handleChangeDisplayName}
                  disabled={isChangingDisplayName}
                >
                  {isChangingDisplayName ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Change Display Name</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Profile color & gradient modal */}
        <Modal
          visible={showProfileColorModal}
          transparent={true}
          animationType={IS_WEB ? 'fade' : 'slide'}
          onRequestClose={() => setShowProfileColorModal(false)}
          onShow={() => {
            setTempProfileColor(profileColor || PROFILE_COLOR_PRESETS[0].color);
            setLivePickerColor(normalizeHex(profileColor) || PROFILE_COLOR_PRESETS[0].color);
            setTempProfileGradient(profileGradient && profileGradient.length >= 2 ? profileGradient : null);
            setTempUseGradient(!!(profileGradient && profileGradient.length >= 2));
            setColorSection('preset');
            setTempGradientStopsInput(
              profileGradient && profileGradient.length >= 2
                ? profileGradient.join(', ')
                : `${profileColor || PROFILE_COLOR_PRESETS[0].color}, ${PROFILE_COLOR_PRESETS[1].color}`
            );
          }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowProfileColorModal(false)}>
            <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Profile color & gradient</Text>
              <Text style={styles.modalSubtitle}>Others will see this when viewing your profile.</Text>
              <View style={styles.appearanceSectionTabs}>
                {[
                  { key: 'preset', label: 'Presets' },
                  { key: 'custom', label: 'Custom Picker' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setColorSection(s.key)}
                    style={[styles.appearanceSectionTabBtn, colorSection === s.key && styles.appearanceSectionTabBtnActive]}
                    activeOpacity={0.85}
                  >
                    <Text numberOfLines={1} style={[styles.appearanceSectionTabText, colorSection === s.key && styles.appearanceSectionTabTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.preferredRolesLabel, { marginTop: 12 }]}>Color</Text>
              {colorSection === 'preset' ? (
                <View style={styles.colorPresetRow}>
                  {PROFILE_COLOR_PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p.color}
                      onPress={() => {
                        setTempProfileColor(p.color);
                        if (tempUseGradient && tempProfileGradient && tempProfileGradient[0]) {
                          setTempProfileGradient([p.color, tempProfileGradient[1] || p.color]);
                          setTempGradientStopsInput(`${p.color}, ${tempProfileGradient[1] || p.color}`);
                        }
                      }}
                      style={[
                        styles.colorPresetButton,
                        { backgroundColor: p.color },
                        (tempProfileColor === p.color) && styles.colorPresetButtonSelected,
                      ]}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>
              ) : (
                <>
                  {!IS_WEB ? (
                    <View style={styles.nativeColorPickerPanel}>
                      <ColorPicker
                        color={normalizeHex(tempProfileColor) || '#1e90ff'}
                        onColorChangeComplete={(color) => {
                          const v = normalizeHex(color);
                          if (v) {
                            setLivePickerColor(v);
                            setTempProfileColor(v);
                          }
                        }}
                        onColorChange={(color) => {
                          const v = normalizeHex(color);
                          if (!v) return;
                          livePickerQueuedColorRef.current = v;
                          if (livePickerRafRef.current) return;
                          if (typeof requestAnimationFrame === 'function') {
                            livePickerRafRef.current = requestAnimationFrame(() => {
                              livePickerRafRef.current = null;
                              if (livePickerQueuedColorRef.current) {
                                setLivePickerColor(livePickerQueuedColorRef.current);
                              }
                            });
                            return;
                          }
                          setLivePickerColor(v);
                        }}
                        thumbSize={26}
                        sliderSize={24}
                        noSnap
                        row={false}
                        swatches={false}
                        useNativeDriver
                        useNativeLayout
                      />
                    </View>
                  ) : (
                    <View style={styles.customColorSwatchGrid}>
                      {CUSTOM_COLOR_SWATCHES.map((swatch) => (
                        <TouchableOpacity
                          key={swatch}
                          onPress={() => setTempProfileColor(swatch)}
                          style={[
                            styles.customColorSwatch,
                            { backgroundColor: swatch },
                            normalizeHex(tempProfileColor) === swatch && styles.customColorSwatchSelected,
                          ]}
                          activeOpacity={0.8}
                        />
                      ))}
                    </View>
                  )}
                  {IS_WEB ? (
                    <input
                      type="color"
                      value={normalizeHex(tempProfileColor) || '#1e90ff'}
                      onChange={(e) => {
                        const v = normalizeHex(e?.target?.value || '');
                        if (v) setTempProfileColor(v);
                      }}
                      style={{ width: '100%', height: 42, border: 'none', borderRadius: 8, background: '#0f1724' }}
                    />
                  ) : null}
                  <View style={styles.colorLivePreviewRow}>
                    <View
                      style={[
                        styles.colorLivePreviewSwatch,
                        { backgroundColor: normalizeHex(livePickerColor || tempProfileColor) || '#1e90ff' },
                      ]}
                    />
                    <Text style={styles.colorLivePreviewHex}>
                      {normalizeHex(livePickerColor || tempProfileColor) || '#1E90FF'}
                    </Text>
                  </View>
                </>
              )}
              <TextInput
                style={styles.appearanceTextInput}
                placeholder="#1E90FF"
                placeholderTextColor="#64748b"
                value={tempProfileColor || ''}
                onChangeText={setTempProfileColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {IS_WEB ? (
                <View style={styles.webColorPickerRow}>
                  <Text style={styles.preferredRolesHint}>Color picker</Text>
                  <input
                    type="color"
                    value={normalizeHex(tempProfileColor) || '#1e90ff'}
                    onChange={(e) => {
                      const v = normalizeHex(e?.target?.value || '');
                      if (v) setTempProfileColor(v);
                    }}
                    style={{ width: 56, height: 34, border: 'none', background: 'transparent' }}
                  />
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => setTempUseGradient(!tempUseGradient)}
                style={[styles.gradientToggle, tempUseGradient && styles.gradientToggleOn]}
                activeOpacity={0.8}
              >
                <Text style={styles.gradientToggleText}>Use gradient</Text>
              </TouchableOpacity>
              {tempUseGradient && (
                <>
                  <Text style={[styles.preferredRolesLabel, { marginTop: 8 }]}>Second color</Text>
                  <View style={styles.colorPresetRow}>
                    {PROFILE_COLOR_PRESETS.map((p) => (
                      <TouchableOpacity
                        key={`g2-${p.color}`}
                        onPress={() => {
                          const first = tempProfileColor || PROFILE_COLOR_PRESETS[0].color;
                          setTempProfileGradient([first, p.color]);
                          setTempGradientStopsInput(`${first}, ${p.color}`);
                        }}
                        style={[
                          styles.colorPresetButton,
                          { backgroundColor: p.color },
                          tempProfileGradient && tempProfileGradient[1] === p.color && styles.colorPresetButtonSelected,
                        ]}
                        activeOpacity={0.8}
                      />
                    ))}
                  </View>
                  <TextInput
                    style={styles.appearanceTextInput}
                    placeholder="#57C785"
                    placeholderTextColor="#64748b"
                    value={(tempProfileGradient && tempProfileGradient[1]) || ''}
                    onChangeText={(v) => {
                      const first = normalizeHex(tempProfileColor) || PROFILE_COLOR_PRESETS[0].color;
                      setTempProfileGradient([first, v]);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {IS_WEB ? (
                    <View style={styles.webColorPickerRow}>
                      <Text style={styles.preferredRolesHint}>Second stop picker</Text>
                      <input
                        type="color"
                        value={normalizeHex((tempProfileGradient && tempProfileGradient[1]) || '') || '#57c785'}
                        onChange={(e) => {
                          const first = normalizeHex(tempProfileColor) || PROFILE_COLOR_PRESETS[0].color;
                          const second = normalizeHex(e?.target?.value || '');
                          if (second) {
                            setTempProfileGradient([first, second]);
                            setTempGradientStopsInput(`${first}, ${second}`);
                          }
                        }}
                        style={{ width: 56, height: 34, border: 'none', background: 'transparent' }}
                      />
                    </View>
                  ) : null}
                  <Text style={[styles.preferredRolesLabel, { marginTop: 8 }]}>Custom gradient stops (comma separated hex)</Text>
                  <TextInput
                    style={styles.appearanceTextInput}
                    placeholder="#2A7B9B, #57C785, #EDDD53"
                    placeholderTextColor="#64748b"
                    value={tempGradientStopsInput}
                    onChangeText={setTempGradientStopsInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.preferredRolesHint}>Use any hex colors. Minimum 2 stops.</Text>
                </>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowProfileColorModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    const color = normalizeHex(tempProfileColor) || PROFILE_COLOR_PRESETS[0].color;
                    const parsedFromInput = normalizeGradientStops(tempGradientStopsInput);
                    const fallbackGradient = normalizeGradientStops(tempProfileGradient);
                    const gradient = tempUseGradient
                      ? (parsedFromInput || fallbackGradient || [color, PROFILE_COLOR_PRESETS[1].color])
                      : null;
                    saveProfileTheme(color, gradient);
                    setShowProfileColorModal(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Profile banner/title/badges/animation modal */}
        <Modal
          visible={showProfileAppearanceModal}
          transparent={true}
          animationType={IS_WEB ? 'fade' : 'slide'}
          onRequestClose={() => setShowProfileAppearanceModal(false)}
          onShow={async () => {
            const { owned } = await loadProfileShopData();
            const ownedIds = Array.isArray(owned) ? owned : [];
            setTempProfileBanner(profileBanner || 'none');
            const ownedTitleValues = SHOP_TITLE_OPTIONS.filter((i) => ownedIds.includes(i.id)).map((i) => (i.value || '').trim());
            const current = (profileTitle || '').trim();
            setTempProfileTitle(ownedTitleValues.includes(current) ? current : '');
            const ownedFontValues = SHOP_FONT_OPTIONS.filter((i) => ownedIds.includes(i.id) || i.defaultUnlocked).map((i) => (i.value || '').trim());
            setTempProfileFont(ownedFontValues.includes(profileFont || '') ? (profileFont || '') : '');
            setTempProfileBadges(Array.isArray(profileBadges) ? profileBadges.slice(0, MAX_BADGES) : []);
            setTempNameAnimation(nameAnimation || 'none');
            setTempBadgeSearch('');
            setTempTitleSearch('');
            setAppearanceSection('banner');
          }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowProfileAppearanceModal(false)}>
            <Pressable style={[styles.modalContainer, styles.appearanceModalContainer]} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Profile appearance</Text>
              <Text style={styles.modalSubtitle}>Banner, title, badges, and animated display name.</Text>
              {(() => {
                const previewBanner = PROFILE_BANNER_PRESETS.find((p) => p.key === tempProfileBanner);
                const previewName = (displayName || currentUser || 'Profile').trim() || 'Profile';
                const previewAccent = normalizeHex(tempProfileColor) || profileColor || '#1e90ff';
                return (
                  <View style={[styles.appearancePreviewCard, { borderColor: previewAccent }]}>
                    {previewBanner && previewBanner.key !== 'none' && previewBanner.image ? (
                      <>
                        <Image source={{ uri: previewBanner.image }} style={styles.appearancePreviewBanner} resizeMode="cover" />
                        <View style={styles.appearancePreviewBannerTint} />
                      </>
                    ) : null}
                    <View style={styles.appearancePreviewContent}>
                      <AnimatedProfileName
                        name={previewName}
                        animationType={tempNameAnimation || 'none'}
                        accentColor={previewAccent}
                        style={[
                          styles.appearancePreviewName,
                          tempProfileFont && PROFILE_FONT_FAMILY_MAP[tempProfileFont] && { fontFamily: PROFILE_FONT_FAMILY_MAP[tempProfileFont] }
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      />
                      {!!(tempProfileTitle || '').trim() && (
                        <Text style={styles.appearancePreviewTitle} numberOfLines={1}>{(tempProfileTitle || '').trim()}</Text>
                      )}
                      {Array.isArray(tempProfileBadges) && tempProfileBadges.length > 0 && (
                        <View style={styles.appearancePreviewBadgesRow}>
                          {tempProfileBadges.slice(0, MAX_BADGES).map((badgeId) => {
                            const badge = availableBadges.find((b) => b.id === badgeId) || {
                              id: badgeId,
                              icon: getBadgeIconUrl(badgeId),
                            };
                            return (
                              <View key={badge.id} style={styles.appearancePreviewBadgePill}>
                                {badge.icon ? (
                                  <Image source={{ uri: badge.icon }} style={styles.appearancePreviewBadgeIcon} contentFit="cover" />
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

              <View style={styles.appearanceSectionTabs}>
                {[
                  { key: 'banner', label: 'Banner' },
                  { key: 'title', label: 'Title' },
                  { key: 'font', label: 'Font' },
                  { key: 'badges', label: `Badges (${tempProfileBadges.length}/${MAX_BADGES})` },
                  { key: 'animation', label: 'Name FX' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setAppearanceSection(s.key)}
                    style={[styles.appearanceSectionTabBtn, appearanceSection === s.key && styles.appearanceSectionTabBtnActive]}
                    activeOpacity={0.85}
                  >
                    <Text numberOfLines={1} style={[styles.appearanceSectionTabText, appearanceSection === s.key && styles.appearanceSectionTabTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {appearanceSection === 'banner' && (
                <>
                  <Text style={[styles.preferredRolesLabel, { marginTop: 10 }]}>Banner</Text>
                  <ScrollView style={styles.bannerPresetScroll} contentContainerStyle={styles.bannerPresetRow}>
                    {PROFILE_BANNER_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.key}
                        onPress={() => setTempProfileBanner(preset.key)}
                        style={[
                          styles.bannerPresetButton,
                          tempProfileBanner === preset.key && styles.bannerPresetButtonSelected,
                        ]}
                        activeOpacity={0.85}
                      >
                        <View style={[
                          styles.bannerPresetPreview,
                        ]}>
                          {preset.image ? (
                            <Image
                              source={{ uri: preset.image }}
                              style={styles.bannerPresetPreviewImage}
                              resizeMode="cover"
                            />
                          ) : null}
                          {preset.key === 'none' ? <Text style={styles.bannerPresetNoneText}>None</Text> : null}
                        </View>
                        <Text style={styles.bannerPresetLabel} numberOfLines={1}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {appearanceSection === 'title' && (
                <>
                  <Text style={[styles.preferredRolesLabel, { marginTop: 12 }]}>Profile title</Text>
                  <Text style={[styles.sectionNote, { marginBottom: 8 }]}>Titles are earned in the Shop (More → Shop).</Text>
                  <ScrollView style={styles.titlePresetScroll} contentContainerStyle={styles.titlePresetRowCompact}>
                    <TouchableOpacity
                      onPress={() => setTempProfileTitle('')}
                      style={[styles.titlePresetChip, !(tempProfileTitle || '').trim() && styles.titlePresetChipSelected]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.titlePresetChipText, !(tempProfileTitle || '').trim() && styles.titlePresetChipTextSelected]} numberOfLines={1}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {SHOP_TITLE_OPTIONS.filter((item) => ownedShopIds.includes(item.id)).map((item) => {
                      const selected = (tempProfileTitle || '').trim() === (item.value || '').trim();
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setTempProfileTitle(item.value || '')}
                          style={[styles.titlePresetChip, selected && styles.titlePresetChipSelected]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.titlePresetChipText, selected && styles.titlePresetChipTextSelected]} numberOfLines={1}>
                            {item.value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {SHOP_TITLE_OPTIONS.filter((item) => ownedShopIds.includes(item.id)).length === 0 && (
                      <Text style={styles.appearanceUnlockHint}>Unlock titles in the Shop with Gold.</Text>
                    )}
                  </ScrollView>
                </>
              )}

              {appearanceSection === 'font' && (
                <>
                  <Text style={[styles.preferredRolesLabel, { marginTop: 12 }]}>Display name font</Text>
                  <Text style={[styles.sectionNote, { marginBottom: 8 }]}>Fonts are earned in the Shop (More → Shop).</Text>
                  <ScrollView style={styles.titlePresetScroll} contentContainerStyle={styles.titlePresetRowCompact}>
                    <TouchableOpacity
                      onPress={() => setTempProfileFont('')}
                      style={[styles.titlePresetChip, !(tempProfileFont || '').trim() && styles.titlePresetChipSelected]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.titlePresetChipText, !(tempProfileFont || '').trim() && styles.titlePresetChipTextSelected]} numberOfLines={1}>
                        Default
                      </Text>
                    </TouchableOpacity>
                    {SHOP_FONT_OPTIONS.filter((item) => ownedShopIds.includes(item.id) || item.defaultUnlocked).map((item) => {
                      const selected = (tempProfileFont || '').trim() === (item.value || '').trim();
                      const fontFamily = PROFILE_FONT_FAMILY_MAP[item.value];
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setTempProfileFont(item.value || '')}
                          style={[styles.titlePresetChip, selected && styles.titlePresetChipSelected]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.titlePresetChipText, selected && styles.titlePresetChipTextSelected, fontFamily && { fontFamily }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {SHOP_FONT_OPTIONS.filter((item) => ownedShopIds.includes(item.id) || item.defaultUnlocked).length === 0 && (
                      <Text style={styles.appearanceUnlockHint}>Unlock fonts in the Shop with Gold.</Text>
                    )}
                  </ScrollView>
                </>
              )}

              {appearanceSection === 'badges' && (
                <>
                  <View style={styles.badgesHeaderRow}>
                    <Text style={[styles.preferredRolesLabel, { marginTop: 8 }]}>Badges (max {MAX_BADGES})</Text>
                    <TouchableOpacity
                      onPress={() => setTempProfileBadges([])}
                      style={styles.clearBadgesButton}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.clearBadgesButtonText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.appearanceTextInput}
                    placeholder="Search badges"
                    placeholderTextColor="#64748b"
                    value={tempBadgeSearch}
                    onChangeText={setTempBadgeSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <ScrollView style={styles.badgesPickerScroll} contentContainerStyle={styles.badgesPickerRow}>
                {availableBadges.filter((badge) => {
                      const q = tempBadgeSearch.trim().toLowerCase();
                      const badgeLabel = simplifyBadgeLabel(badge.label).toLowerCase();
                      if (!q) return true;
                      return badgeLabel.includes(q) || badge.id.toLowerCase().includes(q);
                    }).map((badge) => {
                      const selected = tempProfileBadges.includes(badge.id);
                      const disabled = !selected && tempProfileBadges.length >= MAX_BADGES;
                      return (
                        <TouchableOpacity
                          key={badge.id}
                          onPress={() => {
                            if (selected) {
                              setTempProfileBadges((prev) => prev.filter((b) => b !== badge.id));
                            } else if (!disabled) {
                              setTempProfileBadges((prev) => [...prev, badge.id].slice(0, MAX_BADGES));
                            }
                          }}
                          style={[
                            styles.badgePickerPill,
                            selected && styles.badgePickerPillSelected,
                            disabled && styles.badgePickerPillDisabled,
                          ]}
                          activeOpacity={0.85}
                        >
                          {badge.icon ? (
                            <Image
                              source={{ uri: badge.icon }}
                              style={styles.badgePickerIcon}
                              contentFit="cover"
                              accessibilityLabel={`${simplifyBadgeLabel(badge.label)} badge`}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {appearanceSection === 'animation' && (
                <>
                  <Text style={[styles.preferredRolesLabel, { marginTop: 10 }]}>Name animation</Text>
                  <Text style={[styles.sectionNote, { marginBottom: 8 }]}>Preview each effect below.</Text>
                  <ScrollView style={styles.animationOptionsScroll} contentContainerStyle={styles.animationOptionsScrollContent}>
                    {NAME_ANIMATION_OPTIONS.map((opt) => {
                      const narrowModal = screenWidth < 380;
                      const optBtnWidth = narrowModal ? Math.floor((screenWidth * 0.9 - 48 - 8) / 2) : 140;
                      return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setTempNameAnimation(opt.key)}
                        style={[
                          styles.animationOptionButtonWithPreview,
                          tempNameAnimation === opt.key && styles.animationOptionButtonSelected,
                          narrowModal && { width: optBtnWidth, minWidth: optBtnWidth, maxWidth: optBtnWidth },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.animationOptionLabel} numberOfLines={1}>{opt.label}</Text>
                        <View style={styles.animationPreviewWrap}>
                          <AnimatedProfileName
                            name="Preview"
                            animationType={opt.key}
                            accentColor={normalizeHex(tempProfileColor) || profileColor || '#7dd3fc'}
                            style={styles.animationPreviewText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          />
                        </View>
                      </TouchableOpacity>
                    ); })}
                  </ScrollView>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowProfileAppearanceModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    saveProfileAppearance(tempProfileBanner, tempProfileTitle, tempProfileFont, tempProfileBadges, tempNameAnimation);
                    setShowProfileAppearanceModal(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Preferred Roles "tooltip" modal */}
        <Modal
          visible={showPreferredRolesModal}
          transparent={true}
          animationType={IS_WEB ? "fade" : "slide"}
          onRequestClose={() => setShowPreferredRolesModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPreferredRolesModal(false)}
          >
            <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Preferred Roles</Text>
              <Text style={styles.modalSubtitle}>
                Choose up to <Text style={styles.currentUsernameText}>2</Text> roles you like to play.
              </Text>
              <View style={styles.preferredRolesChipsRow}>
                {PREFERRED_ROLE_ORDER.map((roleKey) => {
                  const meta = PREFERRED_ROLE_META[roleKey];
                  const isSelected = preferredRoles.includes(roleKey);
                  const isDisabled = !isSelected && preferredRoles.length >= 2;
                  return (
                    <TouchableOpacity
                      key={roleKey}
                      style={[
                        styles.roleChip,
                        {
                          borderColor: meta.color,
                          backgroundColor: isSelected ? meta.background : 'transparent',
                          opacity: isDisabled ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => {
                        if (!isDisabled || isSelected) {
                          togglePreferredRole(roleKey);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {meta.icon ? (
                        <Image source={{ uri: meta.icon }} style={styles.roleChipIcon} contentFit="contain" />
                      ) : (
                        <View style={[styles.roleColorDot, { backgroundColor: meta.color }]} />
                      )}
                      <Text style={[styles.roleChipText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.preferredRolesHint}>Tap a role to toggle it on or off.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => setShowPreferredRolesModal(false)}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </View>
  );
}

// Export helper functions for other components to use
export { AnimatedProfileName };
export const profileHelpers = {
  async getCurrentUser() {
    return await storage.getItem('currentUser');
  },
  async pinBuild(build) {
    const user = await storage.getItem('currentUser');
    if (!user) return false;
    const pinnedBuilds = await storage.getItem(`pinnedBuilds_${user}`);
    const builds = pinnedBuilds ? JSON.parse(pinnedBuilds) : [];
    builds.push({ ...build, id: Date.now() });
    await storage.setItem(`pinnedBuilds_${user}`, JSON.stringify(builds));
    
    // Also sync to Supabase
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({
          username: user,
          pinned_builds: builds,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username'
        });
      if (error && error.code !== 'MISSING_CONFIG') {
        console.error('Error syncing pinned build to Supabase:', error);
      }
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
    }
    
    return true;
  },
  async pinGod(god) {
    const user = await storage.getItem('currentUser');
    if (!user) return false;
    const pinnedGods = await storage.getItem(`pinnedGods_${user}`);
    const gods = pinnedGods ? JSON.parse(pinnedGods) : [];
    gods.push(god);
    await storage.setItem(`pinnedGods_${user}`, JSON.stringify(gods));
    
    // Also sync to Supabase
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({
          username: user,
          pinned_gods: gods,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username'
        });
      if (error && error.code !== 'MISSING_CONFIG') {
        console.error('Error syncing pinned god to Supabase:', error);
      }
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
    }
    
    return true;
  },
  async saveBuild(build) {
    const user = await storage.getItem('currentUser');
    if (!user) return false;
    const savedBuilds = await storage.getItem(`savedBuilds_${user}`);
    const builds = savedBuilds ? JSON.parse(savedBuilds) : [];
    builds.push({ ...build, id: Date.now(), savedAt: Date.now() });
    await storage.setItem(`savedBuilds_${user}`, JSON.stringify(builds));
    
    // Also sync to Supabase
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({
          username: user,
          saved_builds: builds,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username'
        });
      if (error && error.code !== 'MISSING_CONFIG') {
        console.error('Error syncing saved build to Supabase:', error);
      }
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
    }
    
    return true;
  },
};

const styles = StyleSheet.create({
  successTooltip: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
    }),
  },
  successTooltipText: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#071024',
  },
  scrollContent: {
    padding: 20,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  loginContainer: {
    alignItems: 'center',
    padding: 40,
  },
  title: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    flex: 1,
    minWidth: 0, // Allows text to shrink
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 16,
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 48,
    }),
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: '#0b1226',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 48,
      transition: 'background-color 0.2s, border-color 0.2s',
      ':hover': {
        backgroundColor: '#0f1724',
        borderColor: '#0066cc',
      },
    }),
  },
  registerButtonText: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileHeader: {
    backgroundColor: '#0b1226',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      boxShadow: '0 4px 20px rgba(30, 144, 255, 0.3)',
    }),
  },
  profileHeaderWeb: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    minHeight: 250,
    paddingTop: 92,
  },
  profileBannerStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    opacity: 0.9,
  },
  profileBannerStripWeb: {
    height: 132,
  },
  profileBannerTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  profileBannerTintWeb: {
    height: 132,
  },
  profileBannerTintDark: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
  },
  profileDisplayName: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    flexShrink: 1,
    minWidth: 0,
    textShadowColor: 'rgba(2, 6, 23, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  profileTitleText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
    textShadowColor: 'rgba(2, 6, 23, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  profileColorModalContainer: {
    maxHeight: '88%',
  },
  appearanceModalContainer: {
    maxHeight: '88%',
    ...(IS_WEB && {
      width: '94%',
      maxWidth: 860,
      maxHeight: '88vh',
    }),
  },
  webColorPickerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nativeColorPickerPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    backgroundColor: '#111827',
    overflow: 'hidden',
    padding: 10,
    minHeight: 290,
  },
  colorLivePreviewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorLivePreviewSwatch: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#64748b',
  },
  colorLivePreviewHex: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appearancePreviewCard: {
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  appearancePreviewBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  appearancePreviewBannerTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: 'rgba(2, 6, 23, 0.42)',
  },
  appearancePreviewContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 64,
    justifyContent: 'center',
  },
  appearancePreviewName: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(2, 6, 23, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  appearancePreviewTitle: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 1,
    textShadowColor: 'rgba(2, 6, 23, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  appearancePreviewBadgesRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 6,
  },
  appearancePreviewBadgePill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearancePreviewBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  appearanceSectionTabs: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
  },
  appearanceSectionTabBtn: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  appearanceSectionTabBtnActive: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  appearanceSectionTabText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  appearanceSectionTabTextActive: {
    color: '#7dd3fc',
  },
  profileBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  profileBadgePill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileBadgeEmoji: {
    fontSize: 12,
  },
  profileBadgeLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  bannerPresetScroll: {
    marginTop: 6,
    maxHeight: IS_WEB ? 260 : 430,
    alignSelf: 'stretch',
  },
  bannerPresetButton: {
    width: 88,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  bannerPresetButtonSelected: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  bannerPresetPreview: {
    height: IS_WEB ? 22 : 38,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#1e293b',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerPresetPreviewImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  bannerPresetNoneText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  bannerPresetLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  bannerPresetButtonActive: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  bannerPresetButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerPresetButtonTextActive: {
    color: '#7dd3fc',
  },
  appearanceTextInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
    marginTop: 8,
  },
  badgesPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
  },
  badgesPickerScroll: {
    maxHeight: 320,
    marginTop: 8,
  },
  badgesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  clearBadgesButton: {
    borderWidth: 1,
    borderColor: '#64748b',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  clearBadgesButtonText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  badgePickerPill: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  badgePickerPillSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  badgePickerPillDisabled: {
    opacity: 0.45,
  },
  badgePickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  badgePickerChipSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  badgePickerChipDisabled: {
    opacity: 0.45,
  },
  badgePickerEmoji: {
    fontSize: 12,
  },
  badgePickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  animationOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  animationOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  animationOptionsScroll: {
    maxHeight: 280,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  animationOptionsScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  animationOptionButtonWithPreview: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: 6,
    backgroundColor: '#0f172a',
    width: 140,
    minWidth: 140,
    maxWidth: 140,
    alignItems: 'center',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  animationPreviewWrap: {
    marginTop: 6,
    minHeight: 20,
  },
  animationPreviewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appearanceUnlockHint: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  animationOptionButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  animationOptionButtonActive: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  animationOptionButtonSelected: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  animationOptionButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  animationOptionLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  animationOptionButtonTextActive: {
    color: '#7dd3fc',
  },
  titlePresetRow: {
    marginTop: 8,
    maxHeight: 180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    overflow: 'hidden',
  },
  titlePresetRowCompact: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 6,
    justifyContent: 'center',
  },
  titlePresetScroll: {
    maxHeight: 180,
    alignSelf: 'stretch',
  },
  titlePresetChip: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  titlePresetChipSelected: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  titlePresetChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  titlePresetChipTextSelected: {
    color: '#7dd3fc',
  },
  colorPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  customColorSwatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  customColorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  customColorSwatchSelected: {
    borderColor: '#ffffff',
    borderWidth: 2,
  },
  colorPresetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorPresetButtonSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  gradientToggle: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: 'rgba(71, 85, 105, 0.2)',
  },
  gradientToggleOn: {
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
  },
  gradientToggleText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileIconWrapper: {
    position: 'relative',
    marginRight: 20,
  },
  profileIconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#1e90ff',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    marginRight: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    width: '100%',
    height: '100%',
  },
  profileIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconPlaceholderText: {
    color: '#7dd3fc',
    fontSize: 40,
    fontWeight: '700',
  },
  profileIconEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1e90ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0b1226',
    ...(IS_WEB && {
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  profileIconEditText: {
    fontSize: 18,
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0, // Allows flex children to shrink below their content size
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
    flex: 1,
    minWidth: 0, // Allow row to shrink
  },
  profileName: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    minWidth: 0, // Allows text to shrink
    flexShrink: 1, // Allow text to shrink when needed
  },
  usernameEditButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
    backgroundColor: '#1e90ff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, transform 0.2s',
    }),
  },
  usernameEditIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  profileNameContributor: {
    color: '#10b981',
  },
  contributorBadgeBottomRight: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  contributorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 4,
  },
  contributorCheckmark: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  contributorText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  profileSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(2, 6, 23, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  profileGoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  profileGoldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginRight: 6,
  },
  profileGoldValue: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '800',
  },
  trackerStatsCard: {
    marginTop: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  trackerStatsTitle: {
    color: '#bfdbfe',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackerStatsRating: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackerStatsSection: {
    marginTop: 4,
  },
  trackerStatsSectionTitle: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  trackerStatsLine: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  trackerStatsMuted: {
    color: '#94a3b8',
    fontSize: 11,
  },
  trackerStatsError: {
    color: '#fca5a5',
    fontSize: 11,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  headerEditButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1e90ff',
    backgroundColor: '#0b1226',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  preferredRolesSection: {
    marginTop: 4,
    marginBottom: 4,
  },
  preferredRolesSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  preferredRolesLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  preferredRolesLabelSmall: {
    color: '#9ca3af',
    fontSize: 12,
    marginRight: 4,
  },
  preferredRolesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  preferredRolesTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  preferredRolesEmptyText: {
    color: '#6b7280',
    fontSize: 12,
  },
  preferredRolesDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  roleChipIcon: {
    width: 14,
    height: 14,
    marginRight: 5,
  },
  roleColorDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  roleTagIconSmall: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  preferredRolesHint: {
    marginTop: 2,
    fontSize: 10,
    color: '#6b7280',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }),
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerWrapper: {
    marginBottom: 24,
  },
  headerWebWrapper: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSpacer: {
    flex: 1,
    minWidth: 0,
  },
  headerDisplayNameRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  headerDisplayNameText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  followingButton: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    margin: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  expandIcon: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buildCard: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  buildHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buildHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  godIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  godIconFallback: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  godIconFallbackText: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
  },
  buildInfo: {
    flex: 1,
  },
  buildNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  buildShareButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#2a4a6a',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }),
  },
  buildShareButtonText: {
    fontSize: 14,
    color: '#7dd3fc',
  },
  buildName: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  buildTypeBadge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a4a6a',
  },
  buildTypeBadgeCertified: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  buildTypeText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  buildGod: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 2,
  },
  buildLevel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemSlot: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
  },
  itemIcon: {
    width: '100%',
    height: '100%',
  },
  itemIconFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
  },
  itemIconFallbackText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: '600',
  },
  buildSubtitleContainer: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  buildSubtitle: {
    color: '#071024',
    fontSize: 14,
    fontStyle: 'italic',
  },
  buildDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  unpinText: {
    color: '#1e90ff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(IS_WEB && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 1000,
      display: 'flex',
    }),
  },
  modalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '88%',
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    }),
  },
  modalTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#e6eef8',
    fontSize: 16,
    ...(IS_WEB && {
      outline: 'none',
      minHeight: 44,
    }),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 44,
      transition: 'background-color 0.2s',
    }),
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }),
  },
  confirmButtonDisabled: {
    opacity: 0.6,
    ...(IS_WEB && {
      cursor: 'not-allowed',
    }),
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  forgotPasswordLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#7dd3fc',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  modalSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  recoveryCodeContainer: {
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#7dd3fc',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  recoveryCodeText: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  changeUsernameButton: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }),
  },
  changeUsernameButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  currentUsernameText: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  usernameHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  settingDescription: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  accountSettingsGrid: {
    marginTop: 8,
    gap: 10,
  },
  accountSettingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  accountSettingIcon: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginRight: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  accountSettingContent: {
    flex: 1,
  },
  accountSettingTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  accountSettingDescription: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  accountSettingArrow: {
    color: '#60a5fa',
    fontSize: 24,
    marginLeft: 8,
    marginTop: -2,
  },
  godPickerModalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80vh',
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    }),
  },
  godPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  godPickerItem: {
    width: 80,
    height: 80,
    borderRadius: 40,
    margin: 8,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.2s',
    }),
  },
  godPickerItemSelected: {
    borderColor: '#1e90ff',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  godPickerIcon: {
    width: 68,
    height: 68,
  },
  godPickerIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  godPickerIconPlaceholderText: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
  },
  godPickerSelectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#1e90ff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0b1226',
  },
  godPickerSelectedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

