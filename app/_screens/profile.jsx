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
  Animated,
  Switch,
} from 'react-native';
// Import supabase with fallback for missing config
let supabase;
try {
  supabase = require('../../config/supabase').supabase;
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
      signInWithPassword: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      signUp: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      signOut: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
import CryptoJS from 'crypto-js';
import { useScreenDimensions } from '../../hooks/useScreenDimensions';
import { WEB_CONTENT_MAX_WIDTH } from '../../lib/webLayout';
import { flattenBuildsGods } from '../../lib/normalizeBuildsGod';
import { loadBuildsData, getBuildsDataSync } from '../../lib/loadBuildsData';
import { getSmite2Gods } from '../../lib/smite2GodsData';
import { getLocalItemIcon, getLocalGodAsset } from '../localIcons';
import ColorPicker from 'react-native-wheel-color-picker';
import { EXTERNAL_LINKS, ICON_PATHS, REMOTE_BASE_URLS } from '../../config';
import { UI_THEME } from '../../lib/uiTheme';
import { setLiveDisplayName } from '../../lib/profileDisplayNameLive';
import { useAppFonts, FONT_FAMILY_BY_KEY } from '../../lib/appFonts';
import { useAbilityTooltipDetail } from '../../hooks/useAbilityTooltipDetail';
import { useItemTooltipDetail } from '../../hooks/useItemTooltipDetail';
import { TOOLTIP_DETAIL } from '../../lib/tooltipDetail';
import {
  finalizeAppLogin,
  completeAppLogout,
  restoreAppAuthSession,
  ensureAppWriteSession,
} from '../../lib/appAuth';
import { syncLocalAccountToCloud, getAccountSyncStatus } from '../../lib/accountSync';
import { upsertUserProfileFields } from '../../lib/profileCosmeticsSync';
import { GOLD_ICON } from '../../lib/imageGrabber';
import {
  resolveProfileThemeStops,
  ProfileGradientBorderWrap,
} from '../../lib/profileGradient';

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
const ROLE_ICON_BASE_URL = ICON_PATHS.ROLE_ICONS;
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
  { label: 'Blue', color: UI_THEME.accentSky },
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

const PROFILE_BANNER_BASE_URL = ICON_PATHS.PROFILE_BANNERS;
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

const BADGE_BASE_URL = ICON_PATHS.BADGES;
const BADGES_API_URL = EXTERNAL_LINKS.BADGES_API;
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
let SHOP_NAME_FX_OPTIONS = [];
const NAME_FX_ITEM_BY_VALUE = {};
let expandOwnedIds = (ids) => (Array.isArray(ids) ? ids : []);
try {
  const shopData = require('../../lib/shopData');
  SHOP_TITLE_OPTIONS = (shopData.SHOP_ITEM_POOL || []).filter((i) => i.type === 'title');
  SHOP_FONT_OPTIONS = (shopData.SHOP_ITEM_POOL || []).filter((i) => i.type === 'font');
  SHOP_NAME_FX_OPTIONS = (shopData.SHOP_ITEM_POOL || []).filter((i) => i.type === 'name_fx');
  SHOP_NAME_FX_OPTIONS.forEach((i) => { if (i && i.value) NAME_FX_ITEM_BY_VALUE[i.value] = i; });
  if (typeof shopData.expandOwnedIds === 'function') expandOwnedIds = shopData.expandOwnedIds;
} catch (_) {
  SHOP_TITLE_OPTIONS = [];
  SHOP_FONT_OPTIONS = [];
  SHOP_NAME_FX_OPTIONS = [];
}

// A name effect is unlocked if it isn't sold in the shop (basic/free), is a
// free starter (defaultUnlocked), is owned, or is the one currently equipped.
const isNameFxUnlocked = (key, ownedIds, equippedKey) => {
  if (!key || key === 'none') return true;
  if (equippedKey && key === equippedKey) return true;
  const item = NAME_FX_ITEM_BY_VALUE[key];
  if (!item) return true;
  if (item.defaultUnlocked) return true;
  return Array.isArray(ownedIds) && ownedIds.includes(item.id);
};

// Map shop font key to platform fontFamily (system/standard fonts for compatibility)
// Shared cross-platform font map (identical on web + native). See lib/appFonts.js.
const PROFILE_FONT_FAMILY_MAP = { default: undefined, ...FONT_FAMILY_BY_KEY };

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
/** HTML color inputs require lowercase #rrggbb — uppercase hex breaks the picker on web. */
const hexForColorInput = (value, fallback = '#7dd3fc') => {
  const normalized = normalizeHex(value);
  return (normalized || normalizeHex(fallback) || '#7dd3fc').toLowerCase();
};
const hexToRgbTriplet = (hex) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  const parseChannel = (pair) => parseInt(pair, 16);
  if (raw.length === 3) {
    return [parseChannel(raw[0] + raw[0]), parseChannel(raw[1] + raw[1]), parseChannel(raw[2] + raw[2])];
  }
  return [parseChannel(raw.slice(0, 2)), parseChannel(raw.slice(2, 4)), parseChannel(raw.slice(4, 6))];
};
const hexLuminance01 = (hex) => {
  const rgb = hexToRgbTriplet(hex);
  if (!rgb) return 1;
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
};
/** Lift dark effect colors so modal previews stay readable on navy tiles. */
const brightenHexForPreview = (hex, mixTowardWhite = 0.55) => {
  const rgb = hexToRgbTriplet(hex);
  if (!rgb) return hex || '#E2E8F0';
  if (hexLuminance01(hex) >= 0.4) return normalizeHex(hex) || hex;
  const blend = (channel) => Math.round(channel + (255 - channel) * mixTowardWhite);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(blend(rgb[0]))}${toHex(blend(rgb[1]))}${toHex(blend(rgb[2]))}`.toUpperCase();
};
const previewColorStops = (stops) => {
  const list = Array.isArray(stops) ? stops : [stops];
  return list.map((c) => brightenHexForPreview(c));
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
  // —— CSS-inspired flowing color effects (shared fxAnim driver) ——
  { key: 'rainbow', label: 'Rainbow Warrior' },
  { key: 'aurora', label: 'Aurora' },
  { key: 'sunset', label: 'Sunset' },
  { key: 'holographic', label: 'Holographic' },
  { key: 'synthwave', label: 'Synthwave' },
  { key: 'galaxy', label: 'Galaxy' },
  { key: 'electric', label: 'Electric' },
  { key: 'toxic_glow', label: 'Toxic' },
  { key: 'blood', label: 'Blood Oath' },
  { key: 'gold_shine', label: 'Gold Shine' },
  { key: 'matrix', label: 'Matrix' },
  { key: 'emerald', label: 'Emerald' },
  { key: 'ruby', label: 'Ruby' },
  { key: 'sapphire', label: 'Sapphire' },
  { key: 'obsidian', label: 'Obsidian' },
  { key: 'firefly', label: 'Firefly' },
  { key: 'plasma', label: 'Plasma' },
  { key: 'vaporwave', label: 'Vaporwave' },
  { key: 'nebula', label: 'Nebula' },
  { key: 'oil_slick', label: 'Oil Slick' },
  { key: 'magma', label: 'Magma' },
  { key: 'peacock', label: 'Peacock' },
  { key: 'cotton_candy', label: 'Cotton Candy' },
  { key: 'laser', label: 'Laser' },
  { key: 'venom', label: 'Venom' },
  { key: 'ultraviolet', label: 'Ultraviolet' },
  { key: 'royal', label: 'Royal' },
  { key: 'frostbite', label: 'Frostbite' },
  { key: 'sunrise', label: 'Sunrise' },
  { key: 'spectrum', label: 'Spectrum' },
  { key: 'mint', label: 'Mint' },
  { key: 'blossom', label: 'Blossom' },
  { key: 'abyss', label: 'Abyss' },
  { key: 'radioactive', label: 'Radioactive' },
  { key: 'disco', label: 'Disco' },
  // —— Motion / special effects (shared fxAnim driver) ——
  { key: 'sparkle', label: 'Sparkle' },
  { key: 'glitch', label: 'Glitch' },
  { key: 'wave', label: 'Wave' },
  { key: 'heartbeat', label: 'Heartbeat' },
  { key: 'bounce', label: 'Bounce' },
  { key: 'zoom', label: 'Zoom' },
  { key: 'swing', label: 'Swing' },
  { key: 'jitter', label: 'Jitter' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'flash', label: 'Flash' },
  // —— Per-letter effects (multi-color gradients, per-letter colors, letter waves) ——
  { key: 'rainbow_letters', label: 'Rainbow Letters' },
  { key: 'confetti_letters', label: 'Confetti Letters' },
  { key: 'fire_letters', label: 'Fire Letters' },
  { key: 'ocean_letters', label: 'Ocean Letters' },
  { key: 'sunset_letters', label: 'Sunset Letters' },
  { key: 'candy_letters', label: 'Candy Letters' },
  { key: 'toxic_letters', label: 'Toxic Letters' },
  { key: 'gold_letters', label: 'Gold Letters' },
  { key: 'ice_letters', label: 'Ice Letters' },
  { key: 'wave_letters', label: 'Wave Letters' },
  { key: 'wave_rainbow', label: 'Rainbow Wave' },
  { key: 'bounce_letters', label: 'Bounce Letters' },
  { key: 'emerald_letters', label: 'Emerald Letters' },
  { key: 'violet_letters', label: 'Violet Letters' },
  { key: 'blood_letters', label: 'Blood Letters' },
  { key: 'neon_letters', label: 'Neon Letters' },
  // Two-shade dual gradients
  { key: 'fire_ice_letters', label: 'Fire & Ice' },
  { key: 'toxic_void_letters', label: 'Toxic & Void' },
  { key: 'gold_pink_letters', label: 'Gold & Rose' },
  { key: 'ocean_sunset_letters', label: 'Ocean & Sunset' },
  { key: 'cyber_letters', label: 'Cyber Split' },
  { key: 'frost_fire_wave', label: 'Frost & Fire Wave' },
  // Layered text-shadow effects (CSS-tutorial style)
  { key: 'neon_blue', label: 'Neon Blue' },
  { key: 'neon_pink', label: 'Neon Pink' },
  { key: 'neon_green', label: 'Neon Green' },
  { key: 'neon_orange', label: 'Neon Orange' },
  { key: 'fire_glow', label: 'Fire Glow' },
  { key: 'retro_vintage', label: 'Retro Vintage' },
  { key: 'board_game', label: 'Board Game' },
  { key: 'anaglyph_3d', label: 'Anaglyph 3D' },
  { key: 'extrude_3d', label: 'Extrude 3D' },
  { key: 'extrude_gold', label: 'Gold Extrude' },
  { key: 'long_shadow', label: 'Long Shadow' },
  { key: 'outline_cyan', label: 'Cyan Outline' },
  { key: 'outline_gold', label: 'Gold Outline' },
  { key: 'letterpress', label: 'Letterpress' },
  { key: 'rgb_split', label: 'RGB Split' },
  // —— Themed: holidays & seasons ——
  { key: 'halloween', label: 'Halloween' },
  { key: 'halloween_letters', label: 'Halloween Split' },
  { key: 'pumpkin_letters', label: 'Pumpkin' },
  { key: 'spooky_glow', label: 'Spooky Glow' },
  { key: 'christmas', label: 'Christmas' },
  { key: 'mistletoe_letters', label: 'Mistletoe' },
  { key: 'candy_cane', label: 'Candy Cane' },
  { key: 'snow_letters', label: 'Snowfall' },
  { key: 'festive_glow', label: 'Festive Glow' },
  { key: 'valentines', label: 'Valentines' },
  { key: 'heart_letters', label: 'Sweetheart' },
  { key: 'love_glow', label: 'Love Glow' },
  { key: 'winter', label: 'Winter' },
  { key: 'frost_glow', label: 'Frost Glow' },
  { key: 'summer', label: 'Summer' },
  { key: 'beach_letters', label: 'Beach' },
  { key: 'spring', label: 'Spring' },
  { key: 'autumn', label: 'Autumn' },
  { key: 'autumn_letters', label: 'Autumn Leaves' },
  { key: 'thanksgiving', label: 'Thanksgiving' },
  { key: 'st_patrick', label: 'Lucky' },
  { key: 'easter', label: 'Easter' },
  { key: 'new_year', label: 'New Year' },
  { key: 'fireworks', label: 'Fireworks' },
  { key: 'lunar_new_year', label: 'Lunar New Year' },
  { key: 'fourth_july', label: 'Independence' },
  { key: 'diwali', label: 'Diwali' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'eclipse', label: 'Eclipse' },
  // —— Expansion: extra flowing-color variety ——
  { key: 'twilight', label: 'Twilight' },
  { key: 'lagoon', label: 'Lagoon' },
  { key: 'flamingo', label: 'Flamingo' },
  { key: 'glacier', label: 'Glacier' },
  { key: 'solar_flare', label: 'Solar Flare' },
  { key: 'cosmic', label: 'Cosmic' },
  { key: 'jade', label: 'Jade' },
  { key: 'amethyst', label: 'Amethyst' },
  { key: 'citrine', label: 'Citrine' },
  { key: 'crimson_tide', label: 'Crimson Tide' },
  { key: 'bubblegum', label: 'Bubblegum' },
  { key: 'unicorn', label: 'Unicorn' },
  { key: 'midnight', label: 'Midnight' },
  { key: 'rose_gold', label: 'Rose Gold' },
  { key: 'steelforge', label: 'Steelforge' },
  { key: 'lightning', label: 'Lightning' },
  { key: 'deep_sea', label: 'Deep Sea' },
  { key: 'coral_reef', label: 'Coral Reef' },
  { key: 'molten_gold', label: 'Molten Gold' },
  { key: 'poison_ivy', label: 'Poison Ivy' },
  // —— Expansion: extra per-letter variety ——
  { key: 'galaxy_letters', label: 'Galaxy Letters' },
  { key: 'pastel_letters', label: 'Pastel Pop' },
  { key: 'pride_letters', label: 'Pride' },
  { key: 'mono_letters', label: 'Monochrome' },
  { key: 'sunrise_letters', label: 'Sunrise Letters' },
  { key: 'aurora_letters', label: 'Aurora Letters' },
  { key: 'lava_letters', label: 'Lava Letters' },
  // —— Expansion: extra neon / 3D / stroke variety ——
  { key: 'neon_purple', label: 'Neon Purple' },
  { key: 'neon_red', label: 'Neon Red' },
  { key: 'gold_glow', label: 'Gold Glow' },
  { key: 'chrome_3d', label: 'Chrome 3D' },
  { key: 'comic_pop', label: 'Comic Pop' },
  { key: 'toon_outline', label: 'Toon' },
  { key: 'emboss', label: 'Emboss' },
];

// Flowing color effects. Only one effect renders at a time, so a single shared
// Animated.Value drives all of them (0->1 loop, or 0->1->0 ping-pong when seq).
// colors: flowing color stops · shadow: glow · seq: ping-pong · d: cycle ms
// glowPulse: pulse the shadow radius · mono: monospace font
const FX_FLOW_CONFIG = {
  rainbow: { colors: ['#ff3b3b', '#ff8c00', '#ffd500', '#00d26a', '#00b3ff', '#7b5bff', '#ff3b3b'], shadow: '#ffffff', seq: false, d: 3800 },
  spectrum: { colors: ['#ff0040', '#ff8c00', '#ffd500', '#00d26a', '#00b3ff', '#7b5bff', '#ff0040'], shadow: '#ffffff', seq: false, d: 1600 },
  disco: { colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ef4444'], shadow: '#ffffff', seq: false, d: 1300 },
  aurora: { colors: ['#22d3ee', '#34d399', '#a78bfa', '#22d3ee'], shadow: '#34d399', seq: false, d: 3200 },
  sunset: { colors: ['#f97316', '#ec4899', '#8b5cf6', '#f97316'], shadow: '#ec4899', seq: false, d: 3400 },
  sunrise: { colors: ['#f43f5e', '#fb923c', '#fde047', '#fb923c', '#f43f5e'], shadow: '#fb923c', seq: false, d: 2800 },
  holographic: { colors: ['#67e8f9', '#f0abfc', '#fde047', '#67e8f9'], shadow: '#f0abfc', seq: false, d: 2600 },
  synthwave: { colors: ['#f472b6', '#22d3ee', '#a855f7', '#f472b6'], shadow: '#f472b6', seq: false, d: 2800 },
  vaporwave: { colors: ['#ff71ce', '#01cdfe', '#b967ff', '#ff71ce'], shadow: '#01cdfe', seq: false, d: 2600 },
  galaxy: { colors: ['#312e81', '#6366f1', '#db2777', '#6366f1', '#312e81'], shadow: '#818cf8', seq: false, d: 3600 },
  nebula: { colors: ['#7c3aed', '#db2777', '#2563eb', '#7c3aed'], shadow: '#a78bfa', seq: false, d: 3400 },
  abyss: { colors: ['#020617', '#1e3a8a', '#3b82f6', '#0ea5e9', '#1e3a8a'], shadow: '#38bdf8', seq: false, d: 3200 },
  oil_slick: { colors: ['#0f172a', '#8b5cf6', '#22d3ee', '#ec4899', '#0f172a'], shadow: '#a855f7', seq: false, d: 3000 },
  plasma: { colors: ['#ec4899', '#8b5cf6', '#22d3ee', '#ec4899'], shadow: '#a855f7', seq: false, d: 2200 },
  peacock: { colors: ['#0d9488', '#0ea5e9', '#22c55e', '#8b5cf6', '#0d9488'], shadow: '#22d3ee', seq: false, d: 3200 },
  cotton_candy: { colors: ['#f9a8d4', '#a5b4fc', '#93c5fd', '#f9a8d4'], shadow: '#f9a8d4', seq: false, d: 3000 },
  royal: { colors: ['#4c1d95', '#a855f7', '#fbbf24', '#a855f7'], shadow: '#c084fc', seq: false, d: 2400 },
  ultraviolet: { colors: ['#4c1d95', '#7c3aed', '#c084fc', '#e9d5ff', '#7c3aed'], shadow: '#a855f7', seq: true, d: 1400 },
  electric: { colors: ['#3b82f6', '#e0f2fe', '#60a5fa'], shadow: '#60a5fa', seq: true, d: 520 },
  laser: { colors: ['#ff0040', '#ff5c8a', '#ff0040'], shadow: '#ff0040', seq: true, d: 420 },
  toxic_glow: { colors: ['#65a30d', '#bef264', '#22c55e', '#65a30d'], shadow: '#a3e635', seq: true, d: 900 },
  radioactive: { colors: ['#365314', '#84cc16', '#ecfccb', '#84cc16'], shadow: '#a3e635', seq: true, d: 800, glowPulse: true },
  venom: { colors: ['#052e16', '#22c55e', '#a3e635', '#166534'], shadow: '#4ade80', seq: true, d: 1600 },
  mint: { colors: ['#065f46', '#10b981', '#a7f3d0', '#10b981'], shadow: '#34d399', seq: true, d: 1600 },
  emerald: { colors: ['#065f46', '#34d399', '#d1fae5', '#34d399'], shadow: '#34d399', seq: true, d: 1600 },
  blossom: { colors: ['#be123c', '#fb7185', '#fecdd3', '#fb7185'], shadow: '#fb7185', seq: true, d: 1600 },
  ruby: { colors: ['#7f1d1d', '#ef4444', '#fecaca', '#ef4444'], shadow: '#f87171', seq: true, d: 1600 },
  sapphire: { colors: ['#1e3a8a', '#3b82f6', '#dbeafe', '#3b82f6'], shadow: '#60a5fa', seq: true, d: 1600 },
  blood: { colors: ['#7f1d1d', '#dc2626', '#450a0a', '#7f1d1d'], shadow: '#dc2626', seq: false, d: 2400 },
  magma: { colors: ['#450a0a', '#dc2626', '#f59e0b', '#fde047', '#dc2626'], shadow: '#f97316', seq: false, d: 1800 },
  gold_shine: { colors: ['#b45309', '#fde68a', '#f59e0b', '#b45309'], shadow: '#fbbf24', seq: true, d: 1000 },
  frostbite: { colors: ['#bae6fd', '#e0f2fe', '#7dd3fc', '#bae6fd'], shadow: '#7dd3fc', seq: true, d: 1400, glowPulse: true },
  obsidian: { colors: ['#0f172a', '#475569', '#94a3b8', '#334155'], shadow: '#64748b', seq: false, d: 2400 },
  firefly: { colors: ['#f59e0b', '#fef3c7', '#fbbf24', '#f59e0b'], shadow: '#fbbf24', seq: true, d: 1500, glowPulse: true },
  matrix: { colors: ['#052e16', '#22c55e', '#86efac', '#22c55e'], shadow: '#22c55e', seq: true, d: 720, mono: true },
  // —— Themed: holidays & seasons ——
  halloween: { colors: ['#f97316', '#a855f7', '#f97316'], shadow: '#f97316', seq: true, d: 1400, glowPulse: true },
  christmas: { colors: ['#dc2626', '#16a34a', '#f8fafc', '#16a34a', '#dc2626'], shadow: '#ef4444', seq: false, d: 2600 },
  valentines: { colors: ['#be123c', '#fb7185', '#f9a8d4', '#fb7185', '#be123c'], shadow: '#fb7185', seq: false, d: 2400 },
  winter: { colors: ['#e0f2fe', '#7dd3fc', '#bae6fd', '#e0f2fe'], shadow: '#7dd3fc', seq: true, d: 3000, glowPulse: true },
  summer: { colors: ['#f59e0b', '#fde047', '#22d3ee', '#fde047', '#f59e0b'], shadow: '#fde047', seq: false, d: 2600 },
  spring: { colors: ['#f9a8d4', '#a7f3d0', '#fde68a', '#f9a8d4'], shadow: '#a7f3d0', seq: false, d: 3000 },
  autumn: { colors: ['#b45309', '#ea580c', '#f59e0b', '#7c2d12', '#b45309'], shadow: '#ea580c', seq: false, d: 2800 },
  thanksgiving: { colors: ['#7c2d12', '#b45309', '#f59e0b', '#eab308', '#7c2d12'], shadow: '#f59e0b', seq: false, d: 3000 },
  new_year: { colors: ['#fde047', '#f472b6', '#22d3ee', '#a855f7', '#fde047'], shadow: '#ffffff', seq: false, d: 1400, glowPulse: true },
  fireworks: { colors: ['#ff0040', '#ffd500', '#00b3ff', '#a855f7', '#ff0040'], shadow: '#ffffff', seq: true, d: 600, glowPulse: true },
  st_patrick: { colors: ['#166534', '#22c55e', '#86efac', '#22c55e'], shadow: '#4ade80', seq: true, d: 1800 },
  easter: { colors: ['#fbcfe8', '#bfdbfe', '#fef08a', '#bbf7d0', '#fbcfe8'], shadow: '#f0abfc', seq: false, d: 3000 },
  // —— Expansion: extra flowing-color variety ——
  twilight: { colors: ['#0f172a', '#6d28d9', '#db2777', '#6d28d9', '#0f172a'], shadow: '#a78bfa', seq: false, d: 3000 },
  lagoon: { colors: ['#0d9488', '#06b6d4', '#67e8f9', '#0d9488'], shadow: '#22d3ee', seq: true, d: 1800 },
  flamingo: { colors: ['#f43f5e', '#fb7185', '#fda4af', '#fb7185'], shadow: '#fb7185', seq: true, d: 1600 },
  glacier: { colors: ['#bae6fd', '#e0f2fe', '#a5f3fc', '#bae6fd'], shadow: '#67e8f9', seq: true, d: 2600, glowPulse: true },
  solar_flare: { colors: ['#7c2d12', '#ea580c', '#fbbf24', '#fef08a', '#ea580c'], shadow: '#f97316', seq: false, d: 2000, glowPulse: true },
  cosmic: { colors: ['#1e1b4b', '#7c3aed', '#ec4899', '#38bdf8', '#1e1b4b'], shadow: '#a78bfa', seq: false, d: 3400 },
  jade: { colors: ['#064e3b', '#059669', '#6ee7b7', '#059669'], shadow: '#34d399', seq: true, d: 1800 },
  amethyst: { colors: ['#4c1d95', '#9333ea', '#d8b4fe', '#9333ea'], shadow: '#c084fc', seq: true, d: 1800 },
  citrine: { colors: ['#a16207', '#eab308', '#fef08a', '#eab308'], shadow: '#facc15', seq: true, d: 1600 },
  crimson_tide: { colors: ['#450a0a', '#b91c1c', '#ef4444', '#7f1d1d'], shadow: '#ef4444', seq: false, d: 2400 },
  bubblegum: { colors: ['#f472b6', '#38bdf8', '#f472b6'], shadow: '#f9a8d4', seq: false, d: 2000 },
  unicorn: { colors: ['#f9a8d4', '#c4b5fd', '#a5f3fc', '#fef08a', '#f9a8d4'], shadow: '#f0abfc', seq: false, d: 3200 },
  midnight: { colors: ['#020617', '#1e293b', '#475569', '#1e293b'], shadow: '#64748b', seq: false, d: 2800 },
  rose_gold: { colors: ['#9f1239', '#fb7185', '#fecdd3', '#fda4af'], shadow: '#fda4af', seq: true, d: 1800 },
  steelforge: { colors: ['#334155', '#94a3b8', '#e2e8f0', '#94a3b8'], shadow: '#cbd5e1', seq: true, d: 1600 },
  lightning: { colors: ['#1e3a8a', '#e0f2fe', '#fef9c3', '#e0f2fe'], shadow: '#fde047', seq: true, d: 400, glowPulse: true },
  deep_sea: { colors: ['#082f49', '#0e7490', '#22d3ee', '#0e7490'], shadow: '#22d3ee', seq: false, d: 3000 },
  coral_reef: { colors: ['#f97316', '#fb7185', '#2dd4bf', '#f97316'], shadow: '#fb7185', seq: false, d: 2600 },
  molten_gold: { colors: ['#78350f', '#f59e0b', '#fde68a', '#f59e0b'], shadow: '#fbbf24', seq: true, d: 1200, glowPulse: true },
  poison_ivy: { colors: ['#14532d', '#4ade80', '#a3e635', '#22c55e'], shadow: '#4ade80', seq: true, d: 1500 },
  // —— Expansion: extra themed ——
  lunar_new_year: { colors: ['#7f1d1d', '#dc2626', '#fbbf24', '#dc2626'], shadow: '#fbbf24', seq: false, d: 2200, glowPulse: true },
  fourth_july: { colors: ['#dc2626', '#f8fafc', '#2563eb', '#f8fafc', '#dc2626'], shadow: '#ffffff', seq: false, d: 1800 },
  diwali: { colors: ['#7c2d12', '#f59e0b', '#a855f7', '#f59e0b'], shadow: '#fbbf24', seq: false, d: 2200, glowPulse: true },
  birthday: { colors: ['#f472b6', '#38bdf8', '#fde047', '#4ade80', '#f472b6'], shadow: '#ffffff', seq: false, d: 1600, glowPulse: true },
  eclipse: { colors: ['#020617', '#f59e0b', '#fde68a', '#020617'], shadow: '#fbbf24', seq: false, d: 2600, glowPulse: true },
};

// Motion effects driven by the same shared fxAnim value
const FX_MOTION_CONFIG = {
  sparkle: { d: 820, seq: true },
  glitch: { d: 420, seq: false },
  wave: { d: 1500, seq: true },
  heartbeat: { d: 900, seq: true },
  bounce: { d: 1100, seq: true },
  zoom: { d: 900, seq: true },
  swing: { d: 1200, seq: true },
  jitter: { d: 300, seq: false },
  ghost: { d: 1800, seq: true },
  flash: { d: 700, seq: true },
};

// —— Per-letter effects (each letter its own color / motion; works on web + native) ——
// palette: color stops · mode 'gradient' (blend across letters) | 'cycle' (one solid color per letter)
// flow: animate the gradient sliding across letters · motion 'wave' | 'bounce' (staggered per letter)
// shadow: glow · d: cycle ms
const FX_LETTER_CONFIG = {
  rainbow_letters: { palette: ['#ff3b3b', '#ff8c00', '#ffd500', '#00d26a', '#00b3ff', '#7b5bff'], mode: 'gradient', flow: true, shadow: '#ffffff', d: 3000 },
  confetti_letters: { palette: ['#ef4444', '#f59e0b', '#22c55e', '#38bdf8', '#a855f7', '#ec4899'], mode: 'cycle', shadow: '#0f172a', d: 0 },
  fire_letters: { palette: ['#dc2626', '#f97316', '#fde047', '#f97316', '#dc2626'], mode: 'gradient', flow: true, shadow: '#f97316', d: 2200 },
  ocean_letters: { palette: ['#0ea5e9', '#22d3ee', '#2dd4bf', '#3b82f6'], mode: 'gradient', flow: true, shadow: '#22d3ee', d: 3000 },
  sunset_letters: { palette: ['#f97316', '#ec4899', '#8b5cf6', '#f97316'], mode: 'gradient', flow: true, shadow: '#ec4899', d: 3200 },
  candy_letters: { palette: ['#f472b6', '#a855f7', '#22d3ee', '#f472b6'], mode: 'gradient', flow: true, shadow: '#f472b6', d: 2800 },
  toxic_letters: { palette: ['#65a30d', '#a3e635', '#22c55e', '#65a30d'], mode: 'gradient', flow: true, shadow: '#a3e635', d: 2400 },
  gold_letters: { palette: ['#b45309', '#fbbf24', '#fde68a', '#fbbf24'], mode: 'gradient', flow: true, shadow: '#fbbf24', d: 2600 },
  ice_letters: { palette: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#e0f2fe'], mode: 'gradient', flow: true, shadow: '#7dd3fc', d: 2800 },
  wave_letters: { palette: null, mode: 'gradient', motion: 'wave', shadow: null, d: 1600 },
  wave_rainbow: { palette: ['#ff3b3b', '#ff8c00', '#ffd500', '#00d26a', '#00b3ff', '#7b5bff'], mode: 'gradient', flow: true, motion: 'wave', shadow: '#ffffff', d: 2600 },
  bounce_letters: { palette: null, mode: 'gradient', motion: 'bounce', shadow: null, d: 1200 },
  // More per-letter gradients
  emerald_letters: { palette: ['#065f46', '#34d399', '#a7f3d0'], mode: 'gradient', flow: true, shadow: '#34d399', d: 2600 },
  violet_letters: { palette: ['#4c1d95', '#a855f7', '#e9d5ff'], mode: 'gradient', flow: true, shadow: '#c084fc', d: 2600 },
  blood_letters: { palette: ['#450a0a', '#dc2626', '#fca5a5'], mode: 'gradient', flow: true, shadow: '#ef4444', d: 2400 },
  neon_letters: { palette: ['#22d3ee', '#a855f7', '#ec4899', '#22d3ee'], mode: 'gradient', flow: true, shadow: '#22d3ee', d: 2200 },
  // Two distinct gradient shades in one name (dual: [paletteA, paletteB])
  fire_ice_letters: { dual: [['#dc2626', '#f97316', '#fde047'], ['#e0f2fe', '#7dd3fc', '#38bdf8']], shadow: '#f0abfc', d: 0 },
  toxic_void_letters: { dual: [['#65a30d', '#a3e635', '#ecfccb'], ['#4c1d95', '#a855f7', '#e9d5ff']], shadow: '#a3e635', d: 0 },
  gold_pink_letters: { dual: [['#b45309', '#fbbf24', '#fde68a'], ['#be123c', '#fb7185', '#fecdd3']], shadow: '#fbbf24', d: 0 },
  ocean_sunset_letters: { dual: [['#0ea5e9', '#22d3ee', '#a7f3d0'], ['#f97316', '#ec4899', '#8b5cf6']], shadow: '#22d3ee', d: 0 },
  cyber_letters: { dual: [['#22d3ee', '#0ea5e9', '#67e8f9'], ['#ec4899', '#f472b6', '#fbcfe8']], shadow: '#22d3ee', d: 0 },
  frost_fire_wave: { dual: [['#e0f2fe', '#7dd3fc', '#38bdf8'], ['#dc2626', '#f97316', '#fde047']], motion: 'wave', shadow: '#ffffff', d: 1800 },
  // —— Themed per-letter ——
  candy_cane: { palette: ['#dc2626', '#ffffff'], mode: 'cycle', shadow: '#ef4444', d: 0 },
  halloween_letters: { dual: [['#f97316', '#fdba74'], ['#7c3aed', '#c4b5fd']], shadow: '#f97316', d: 0 },
  pumpkin_letters: { palette: ['#7c2d12', '#ea580c', '#fbbf24', '#ea580c'], mode: 'gradient', flow: true, shadow: '#f97316', d: 2400 },
  mistletoe_letters: { dual: [['#16a34a', '#86efac'], ['#dc2626', '#fca5a5']], shadow: '#4ade80', d: 0 },
  snow_letters: { palette: ['#ffffff', '#bae6fd', '#7dd3fc', '#ffffff'], mode: 'gradient', flow: true, motion: 'wave', shadow: '#e0f2fe', d: 2600 },
  heart_letters: { palette: ['#f43f5e', '#fb7185', '#f9a8d4', '#fb7185'], mode: 'gradient', flow: true, motion: 'bounce', shadow: '#fb7185', d: 1400 },
  autumn_letters: { palette: ['#7c2d12', '#b45309', '#ea580c', '#f59e0b', '#eab308'], mode: 'gradient', flow: true, shadow: '#ea580c', d: 2800 },
  beach_letters: { dual: [['#0ea5e9', '#22d3ee', '#a7f3d0'], ['#f59e0b', '#fde047', '#fef9c3']], shadow: '#fde047', d: 0 },
  // —— Expansion: extra per-letter variety ——
  galaxy_letters: { palette: ['#312e81', '#7c3aed', '#db2777', '#38bdf8'], mode: 'gradient', flow: true, shadow: '#a78bfa', d: 3000 },
  pastel_letters: { palette: ['#f9a8d4', '#c4b5fd', '#a5f3fc', '#bbf7d0', '#fef9c3'], mode: 'cycle', shadow: '#0f172a', d: 0 },
  pride_letters: { palette: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'], mode: 'cycle', shadow: '#0f172a', d: 0 },
  mono_letters: { palette: ['#e2e8f0', '#64748b'], mode: 'cycle', shadow: '#0f172a', d: 0 },
  sunrise_letters: { palette: ['#f43f5e', '#fb923c', '#fde047'], mode: 'gradient', flow: true, shadow: '#fb923c', d: 2800 },
  aurora_letters: { palette: ['#22d3ee', '#34d399', '#a78bfa', '#22d3ee'], mode: 'gradient', flow: true, motion: 'wave', shadow: '#34d399', d: 2600 },
  lava_letters: { palette: ['#450a0a', '#dc2626', '#f97316', '#fde047'], mode: 'gradient', flow: true, shadow: '#f97316', d: 2200 },
};

// —— Layered text-shadow effects (CSS-tutorial style). RN native only supports a
// single textShadow, so multi-layer shadows are faked by stacking offset copies
// of the text — identical on web + native. `layers` render behind the base text
// (front-most base last). Each layer: { dx, dy, color, radius?, opacity? }.
// `glow`/`glowRadius` add a soft halo on the base; `flicker` pulses via fxAnim.
const FX_SHADOW_CONFIG = {
  // Neon tubes — bright fill + colored halo, flickering like a sign
  neon_blue: { base: '#e0fbff', glow: '#22d3ee', glowRadius: 16, flicker: true, d: 1700,
    layers: [{ dx: 0, dy: 0, color: '#22d3ee', radius: 22, opacity: 0.55 }] },
  neon_pink: { base: '#ffe4f6', glow: '#ff2fd0', glowRadius: 16, flicker: true, d: 1500,
    layers: [{ dx: 0, dy: 0, color: '#ff2fd0', radius: 22, opacity: 0.55 }] },
  neon_green: { base: '#eaffea', glow: '#39ff14', glowRadius: 16, flicker: true, d: 1900,
    layers: [{ dx: 0, dy: 0, color: '#39ff14', radius: 22, opacity: 0.5 }] },
  neon_orange: { base: '#fff1e0', glow: '#ff7a00', glowRadius: 15, flicker: true, d: 1600,
    layers: [{ dx: 0, dy: 0, color: '#ff7a00', radius: 20, opacity: 0.55 }] },
  // Fire — warm halo drifting upward
  fire_glow: { base: '#fff7d6', glow: '#feec85', glowRadius: 12, flicker: true, d: 1300,
    layers: [
      { dx: 0, dy: -2, color: '#ffae34', radius: 16, opacity: 0.8 },
      { dx: 0, dy: -6, color: '#ec760c', radius: 22, opacity: 0.6 },
      { dx: 0, dy: -10, color: '#cd4606', radius: 28, opacity: 0.4 },
    ] },
  // Retro / vintage — solid offset behind (thin dark drop)
  retro_vintage: { base: '#f4e2b8',
    layers: [
      { dx: 4, dy: 4, color: '#0a0e17' },
      { dx: 6, dy: 6, color: '#8a6d3b' },
    ] },
  // Board game — crisp alternating color offsets, no blur
  board_game: { base: '#ffffff',
    layers: [
      { dx: 3, dy: 3, color: '#ffd217' },
      { dx: 6, dy: 6, color: '#5ac7ff' },
      { dx: 9, dy: 9, color: '#ffd217' },
      { dx: 12, dy: 12, color: '#5ac7ff' },
    ] },
  // Anaglyphic 3D — cyan/magenta split (glitchable)
  anaglyph_3d: { base: '#f8fafc', flicker: true, d: 1400,
    layers: [
      { dx: -3, dy: 0, color: 'rgba(255,0,128,0.7)' },
      { dx: 3, dy: 0, color: 'rgba(0,208,255,0.7)' },
    ] },
  // Extruded 3D — stepped darker copies to the lower-right
  extrude_3d: { base: '#38bdf8',
    layers: [
      { dx: 1, dy: 1, color: '#1d6fa5' },
      { dx: 2, dy: 2, color: '#1a638f' },
      { dx: 3, dy: 3, color: '#155075' },
      { dx: 4, dy: 4, color: '#0f3d5c' },
      { dx: 5, dy: 5, color: '#0a2c44' },
    ] },
  extrude_gold: { base: '#fde68a',
    layers: [
      { dx: 1, dy: 1, color: '#b45309' },
      { dx: 2, dy: 2, color: '#92400e' },
      { dx: 3, dy: 3, color: '#78350f' },
      { dx: 4, dy: 4, color: '#5c290b' },
    ] },
  // Long shadow — flat diagonal
  long_shadow: { base: '#f8fafc',
    layers: [
      { dx: 2, dy: 2, color: 'rgba(2,6,23,0.55)' },
      { dx: 4, dy: 4, color: 'rgba(2,6,23,0.45)' },
      { dx: 6, dy: 6, color: 'rgba(2,6,23,0.35)' },
      { dx: 8, dy: 8, color: 'rgba(2,6,23,0.28)' },
      { dx: 10, dy: 10, color: 'rgba(2,6,23,0.2)' },
    ] },
  // Outline / stroke — copies in 8 directions behind a bright fill
  outline_cyan: { base: '#0a0e17',
    layers: [
      { dx: -1.5, dy: 0, color: '#7dd3fc' }, { dx: 1.5, dy: 0, color: '#7dd3fc' },
      { dx: 0, dy: -1.5, color: '#7dd3fc' }, { dx: 0, dy: 1.5, color: '#7dd3fc' },
      { dx: -1.2, dy: -1.2, color: '#7dd3fc' }, { dx: 1.2, dy: -1.2, color: '#7dd3fc' },
      { dx: -1.2, dy: 1.2, color: '#7dd3fc' }, { dx: 1.2, dy: 1.2, color: '#7dd3fc' },
    ] },
  outline_gold: { base: '#1a1205',
    layers: [
      { dx: -1.5, dy: 0, color: '#fbbf24' }, { dx: 1.5, dy: 0, color: '#fbbf24' },
      { dx: 0, dy: -1.5, color: '#fbbf24' }, { dx: 0, dy: 1.5, color: '#fbbf24' },
      { dx: -1.2, dy: -1.2, color: '#fbbf24' }, { dx: 1.2, dy: -1.2, color: '#fbbf24' },
      { dx: -1.2, dy: 1.2, color: '#fbbf24' }, { dx: 1.2, dy: 1.2, color: '#fbbf24' },
    ] },
  // Letterpress / inset — subtle highlight below
  letterpress: { base: '#94a3b8',
    layers: [{ dx: 0, dy: 1.5, color: 'rgba(255,255,255,0.35)' }, { dx: 0, dy: -1, color: 'rgba(2,6,23,0.6)' }] },
  // RGB split glitch — animated jitter of split copies
  rgb_split: { base: '#f8fafc', flicker: true, d: 900,
    layers: [
      { dx: -2, dy: -1, color: 'rgba(255,0,64,0.75)', flicker: true },
      { dx: 2, dy: 1, color: 'rgba(0,255,238,0.75)', flicker: true },
    ] },
  // —— Themed glow ——
  spooky_glow: { base: '#f97316', glow: '#a855f7', glowRadius: 16, flicker: true, d: 1400,
    layers: [{ dx: 0, dy: 0, color: '#7c3aed', radius: 22, opacity: 0.5 }] },
  frost_glow: { base: '#e0f2fe', glow: '#7dd3fc', glowRadius: 16, flicker: true, d: 2400,
    layers: [{ dx: 0, dy: 0, color: '#38bdf8', radius: 20, opacity: 0.45 }] },
  love_glow: { base: '#fecdd3', glow: '#f472b6', glowRadius: 16, flicker: true, d: 1500,
    layers: [{ dx: 0, dy: 0, color: '#fb7185', radius: 20, opacity: 0.55 }] },
  festive_glow: { base: '#f8fafc', glow: '#22c55e', glowRadius: 14, flicker: true, d: 1600,
    layers: [
      { dx: 0, dy: 0, color: '#dc2626', radius: 18, opacity: 0.5 },
      { dx: 0, dy: 0, color: '#16a34a', radius: 24, opacity: 0.4 },
    ] },
  // —— Expansion: extra neon / 3D / stroke variety ——
  neon_purple: { base: '#f3e8ff', glow: '#a855f7', glowRadius: 16, flicker: true, d: 1600,
    layers: [{ dx: 0, dy: 0, color: '#a855f7', radius: 22, opacity: 0.55 }] },
  neon_red: { base: '#ffe4e6', glow: '#ff2d55', glowRadius: 16, flicker: true, d: 1500,
    layers: [{ dx: 0, dy: 0, color: '#ff2d55', radius: 22, opacity: 0.55 }] },
  gold_glow: { base: '#fef3c7', glow: '#fbbf24', glowRadius: 16, flicker: true, d: 2000,
    layers: [{ dx: 0, dy: 0, color: '#f59e0b', radius: 20, opacity: 0.5 }] },
  chrome_3d: { base: '#e2e8f0',
    layers: [
      { dx: 1, dy: 1, color: '#94a3b8' },
      { dx: 2, dy: 2, color: '#64748b' },
      { dx: 3, dy: 3, color: '#475569' },
      { dx: 4, dy: 4, color: '#334155' },
    ] },
  comic_pop: { base: '#fde047',
    layers: [
      { dx: -1.6, dy: 0, color: '#0a0e17' }, { dx: 1.6, dy: 0, color: '#0a0e17' },
      { dx: 0, dy: -1.6, color: '#0a0e17' }, { dx: 0, dy: 1.6, color: '#0a0e17' },
      { dx: -1.3, dy: -1.3, color: '#0a0e17' }, { dx: 1.3, dy: -1.3, color: '#0a0e17' },
      { dx: -1.3, dy: 1.3, color: '#0a0e17' }, { dx: 1.3, dy: 1.3, color: '#0a0e17' },
      { dx: 5, dy: 5, color: '#ef4444' },
    ] },
  toon_outline: { base: '#f97316',
    layers: [
      { dx: -1.8, dy: 0, color: '#0a0e17' }, { dx: 1.8, dy: 0, color: '#0a0e17' },
      { dx: 0, dy: -1.8, color: '#0a0e17' }, { dx: 0, dy: 1.8, color: '#0a0e17' },
      { dx: -1.4, dy: -1.4, color: '#0a0e17' }, { dx: 1.4, dy: -1.4, color: '#0a0e17' },
      { dx: -1.4, dy: 1.4, color: '#0a0e17' }, { dx: 1.4, dy: 1.4, color: '#0a0e17' },
    ] },
  emboss: { base: '#94a3b8',
    layers: [{ dx: 0, dy: -1, color: 'rgba(255,255,255,0.45)' }, { dx: 0, dy: 1.5, color: 'rgba(2,6,23,0.65)' }] },
};

// JS color interpolation for static per-letter gradients (no Animated needed)
function fxHexToRgb(h) {
  const n = parseInt(String(h).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function fxRgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
}
function fxLerpColor(a, b, t) {
  const A = fxHexToRgb(a);
  const B = fxHexToRgb(b);
  return fxRgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function fxSamplePalette(palette, pos) {
  if (!palette || palette.length === 0) return '#7dd3fc';
  if (palette.length === 1) return palette[0];
  const p = Math.max(0, Math.min(1, pos));
  const seg = p * (palette.length - 1);
  const i = Math.floor(seg);
  if (i >= palette.length - 1) return palette[palette.length - 1];
  return fxLerpColor(palette[i], palette[i + 1], seg - i);
}

// Renders each character separately so we can do multi-color gradients, per-letter
// solid colors, and staggered waves on both native and web.
function LetterFx({ text, cfg, accent, style, numberOfLines, previewMode = false }) {
  const anim = useRef(new Animated.Value(0)).current;
  const animated = !!(cfg.flow || cfg.motion);
  useEffect(() => {
    if (!animated) return undefined;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: cfg.d || 2600, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, animated, cfg.d]);

  const chars = String(text || 'Profile').split('');
  const rawPalette = cfg.palette && cfg.palette.length ? cfg.palette : [accent || '#7dd3fc'];
  const palette = previewMode ? previewColorStops(rawPalette) : rawPalette;
  const single = numberOfLines === 1;
  const half = cfg.dual ? Math.ceil(chars.length / 2) : 0;

  return (
    <View style={[letterFxStyles.row, single && letterFxStyles.rowSingle]}>
      {chars.map((ch, i) => {
        const posBase = chars.length > 1 ? i / (chars.length - 1) : 0;
        let color;
        if (cfg.dual) {
          // Two distinct gradient shades: first half palette A, second half palette B
          const [palA, palB] = cfg.dual;
          if (i < half) {
            color = fxSamplePalette(palA, half > 1 ? i / (half - 1) : 0);
          } else {
            const denom = chars.length - half - 1;
            color = fxSamplePalette(palB, denom > 0 ? (i - half) / denom : 0);
          }
        } else if (cfg.mode === 'cycle') {
          color = palette[i % palette.length];
        } else if (cfg.flow && palette.length > 1) {
          const phase = chars.length > 1 ? i / chars.length : 0;
          const shifted = Animated.modulo(Animated.add(anim, phase), 1);
          const inputRange = palette.map((_, k) => k / (palette.length - 1));
          const outputRange = [...palette];
          color = shifted.interpolate({ inputRange, outputRange });
        } else {
          color = fxSamplePalette(palette, posBase);
        }

        let transform;
        if (cfg.motion) {
          const phase = (i * 0.14) % 1;
          const shifted = Animated.modulo(Animated.add(anim, phase), 1);
          const outputRange =
            cfg.motion === 'bounce' ? [0, -8, 0, -3, 0] : [0, -4, 0, 4, 0];
          const translateY = shifted.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange });
          transform = [{ translateY }];
        }

        const letterStyle = [
          style,
          { color },
          transform ? { transform } : null,
          cfg.shadow ? { textShadowColor: cfg.shadow, textShadowRadius: 6 } : null,
        ];
        return (
          <Animated.Text key={i} style={letterStyle} allowFontScaling={false}>
            {ch === ' ' ? '\u00A0' : ch}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const letterFxStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  rowSingle: { flexWrap: 'nowrap', overflow: 'hidden' },
});

// Renders stacked offset copies of the text to fake CSS multi-layer text-shadows
// (neon, fire, 3D extrude, board-game, outline, RGB split) — same on web + native.
function ShadowFx({ text, cfg, accent, style, numberOfLines, fxAnim, previewMode = false }) {
  const label = text || 'Profile';
  const rawBase = cfg.base || accent || '#e2e8f0';
  const base = previewMode ? brightenHexForPreview(rawBase) : rawBase;
  const layers = cfg.layers || [];
  const flickerOpacity = cfg.flicker
    ? fxAnim.interpolate({
        inputRange: [0, 0.06, 0.1, 0.16, 0.5, 0.56, 0.6, 1],
        outputRange: [1, 0.45, 1, 0.7, 1, 0.5, 1, 1],
      })
    : 1;
  const extra = [
    cfg.letterSpacing != null ? { letterSpacing: cfg.letterSpacing } : null,
    cfg.mono ? { fontFamily: Platform.OS === 'web' ? '"Courier New", monospace' : 'monospace' } : null,
  ];
  return (
    <View style={shadowFxStyles.wrap}>
      {layers.map((ly, i) => (
        <Animated.Text
          key={i}
          numberOfLines={numberOfLines}
          ellipsizeMode="clip"
          allowFontScaling={false}
          style={[
            style,
            ...extra,
            shadowFxStyles.layer,
            {
              color: ly.color,
              transform: [{ translateX: ly.dx || 0 }, { translateY: ly.dy || 0 }],
              textShadowColor: ly.glow || 'transparent',
              textShadowRadius: ly.radius || 0,
              opacity: ly.flicker ? flickerOpacity : ly.opacity != null ? ly.opacity : 1,
            },
          ]}
        >
          {label}
        </Animated.Text>
      ))}
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode="clip"
        allowFontScaling={false}
        style={[
          style,
          ...extra,
          {
            color: base,
            textShadowColor: cfg.glow || 'transparent',
            textShadowRadius: cfg.glowRadius || 0,
            opacity: cfg.flicker ? flickerOpacity : 1,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

const shadowFxStyles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'center' },
  layer: { position: 'absolute', top: 0, left: 0 },
});

// Animated profile name effects used for both own and viewed profiles
function AnimatedProfileName({ name, animationType, accentColor, style, numberOfLines = 1, ellipsizeMode = 'tail', previewMode = false }) {
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
  // Single shared driver for all new CSS-inspired / motion effects (only one active at a time)
  const fxAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop;
    const flowCfg = FX_FLOW_CONFIG[animationType];
    const motionCfg = FX_MOTION_CONFIG[animationType];
    const shadowFxCfg = FX_SHADOW_CONFIG[animationType];
    if (flowCfg || motionCfg || (shadowFxCfg && shadowFxCfg.flicker)) {
      const cfg = flowCfg || motionCfg || shadowFxCfg;
      fxAnim.setValue(0);
      loop = Animated.loop(
        cfg.seq
          ? Animated.sequence([
              Animated.timing(fxAnim, { toValue: 1, duration: cfg.d, useNativeDriver: false }),
              Animated.timing(fxAnim, { toValue: 0, duration: cfg.d, useNativeDriver: false }),
            ])
          : Animated.timing(fxAnim, { toValue: 1, duration: cfg.d || 1600, useNativeDriver: false })
      );
      loop.start();
      return () => loop.stop();
    }
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
  }, [animationType, pulseAnim, shimmerAnim, gradientAnim, flameAnim, infernoAnim, emberAnim, voidAnim, arcaneAnim, divineAnim, stormAnim, pantheonAnim, neonAnim, comicAnim, metallicAnim, iceAnim, glowAnim, lavaAnim, shadowDanceAnim, glowBreathAnim, outlinePulseAnim, frostAnim, fxAnim]);

  const accent = accentColor || '#7dd3fc';
  const pv = (colors) => (previewMode ? previewColorStops(colors) : colors);
  const letterCfg = FX_LETTER_CONFIG[animationType];
  if (letterCfg) {
    return <LetterFx text={name} cfg={letterCfg} accent={accent} style={style} numberOfLines={numberOfLines} previewMode={previewMode} />;
  }
  const shadowCfg = FX_SHADOW_CONFIG[animationType];
  if (shadowCfg) {
    return <ShadowFx text={name} cfg={shadowCfg} accent={accent} style={style} numberOfLines={numberOfLines} fxAnim={fxAnim} previewMode={previewMode} />;
  }
  const textStyle = [style, { color: accent }];
  if (animationType === 'pulse') {
    const scale = pulseAnim.interpolate({ inputRange: [0.72, 1], outputRange: [0.97, 1] });
    const opacity = previewMode
      ? pulseAnim.interpolate({ inputRange: [0.72, 1], outputRange: [0.88, 1] })
      : pulseAnim;
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[textStyle, { opacity, transform: [{ scale }] }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'shimmer') {
    const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: previewMode ? [0.78, 1] : [0.45, 1] });
    const scale = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[textStyle, { opacity, transform: [{ scale }], textShadowColor: accent, textShadowRadius: previewMode ? 10 : 8 }]}>
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
      outputRange: pv(['#7f1d1d', '#b91c1c', '#fef3c7', '#fcd34d', '#b91c1c', '#7f1d1d']),
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
      outputRange: pv(['#9a3412', '#ea580c', '#fcd34d', '#9a3412']),
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
      outputRange: pv(['#1e1b4b', '#4c1d95', '#7c3aed', '#1e1b4b']),
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
      outputRange: pv(['#5b21b6', '#a78bfa', '#c4b5fd', '#a78bfa', '#5b21b6']),
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
      outputRange: pv(['#6d28d9', '#a78bfa', '#6d28d9']),
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
      outputRange: pv(['#431407', '#c2410c', '#fdba74', '#c2410c', '#431407']),
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
    const fillColor = previewMode ? brightenHexForPreview('#0f172a', 0.72) : '#0f172a';
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[textStyle, { color: fillColor, textShadowColor: accent || '#38bdf8', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: shadowRadius }]}
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
  // —— CSS-inspired flowing color effects (shared fxAnim driver) ——
  const flowCfg = FX_FLOW_CONFIG[animationType];
  if (flowCfg) {
    const stops = pv(flowCfg.colors);
    const inputRange = stops.length === 1 ? [0] : stops.map((_, i) => i / (stops.length - 1));
    const animatedColor = fxAnim.interpolate({ inputRange, outputRange: stops });
    const shadowRadius = flowCfg.glowPulse
      ? fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [4, 16, 4] })
      : 9;
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[
          style,
          { color: animatedColor, textShadowColor: flowCfg.shadow, textShadowRadius: shadowRadius },
          flowCfg.mono && { fontFamily: Platform.OS === 'web' ? '"Courier New", monospace' : 'monospace', letterSpacing: 1 },
        ]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'sparkle') {
    const opacity = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1, 0.7] });
    const shadowRadius = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [2, 16, 2] });
    const color = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#fef9c3', '#ffffff', '#fde68a'] });
    return (
      <Animated.Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={[style, { color, opacity, textShadowColor: '#fde047', textShadowRadius: shadowRadius }]}>
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'glitch') {
    const translateX = fxAnim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -2, 2, -1, 1.5, 0] });
    const color = fxAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['#e2e8f0', '#22d3ee', '#f472b6', '#22d3ee', '#e2e8f0'] });
    const shadowX = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-2, 2, -2] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color, transform: [{ translateX }], textShadowColor: '#f472b6', textShadowOffset: { width: shadowX, height: 0 }, textShadowRadius: 1 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'jitter') {
    const translateX = fxAnim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -1.5, 1.5, -1, 1, 0] });
    const translateY = fxAnim.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, 1, -1, 0] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#e2e8f0', transform: [{ translateX }, { translateY }], textShadowColor: accent || '#7dd3fc', textShadowRadius: 4 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'wave') {
    const translateY = fxAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -3, 0, 3, 0] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#7dd3fc', transform: [{ translateY }], textShadowColor: accent || '#7dd3fc', textShadowRadius: 6 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'bounce') {
    const translateY = fxAnim.interpolate({ inputRange: [0, 0.3, 0.5, 0.7, 1], outputRange: [0, -7, 0, -3, 0] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#7dd3fc', transform: [{ translateY }], textShadowColor: accent || '#7dd3fc', textShadowRadius: 6 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'zoom') {
    const scale = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#7dd3fc', transform: [{ scale }], textShadowColor: accent || '#7dd3fc', textShadowRadius: 8 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'swing') {
    const rotate = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-5deg', '5deg', '-5deg'] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#7dd3fc', transform: [{ rotate }], textShadowColor: accent || '#7dd3fc', textShadowRadius: 5 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'heartbeat') {
    const scale = fxAnim.interpolate({ inputRange: [0, 0.12, 0.24, 0.36, 1], outputRange: [1, 1.14, 1, 1.08, 1] });
    const shadowRadius = fxAnim.interpolate({ inputRange: [0, 0.12, 0.24, 1], outputRange: [4, 14, 6, 4] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#f87171', transform: [{ scale }], textShadowColor: '#ef4444', textShadowRadius: shadowRadius }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'ghost') {
    const opacity = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 1, 0.25] });
    const translateY = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -2, 0] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: '#e2e8f0', opacity, transform: [{ translateY }], textShadowColor: '#cbd5e1', textShadowRadius: 8 }]}
      >
        {name || 'Profile'}
      </Animated.Text>
    );
  }
  if (animationType === 'flash') {
    const opacity = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] });
    const shadowRadius = fxAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [10, 2, 10] });
    return (
      <Animated.Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={[style, { color: accent || '#fef08a', opacity, textShadowColor: '#fde047', textShadowRadius: shadowRadius }]}
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
  return `${REMOTE_BASE_URLS.GITHUB_RAW_MAIN_IMG}/God%20Icons/${encodedName}.png`;
};

const IS_WEB = Platform.OS === 'web';
const WEB_COLOR_INPUT_FULL = IS_WEB
  ? { width: '100%', height: 44, borderRadius: 8, border: 'none', background: '#0f1724', cursor: 'pointer' }
  : undefined;
const WEB_COLOR_INPUT_COMPACT = IS_WEB
  ? { width: 48, height: 44, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', flexShrink: 0 }
  : undefined;
const WEB_COLOR_INPUT_OVERLAY = IS_WEB
  ? {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0,
      cursor: 'pointer',
      border: 'none',
      padding: 0,
      margin: 0,
    }
  : undefined;

const stopWebEvent = (e) => {
  e?.stopPropagation?.();
};
function WebColorInput({ value, fallback = '#7dd3fc', onChange, compact = false, overlay = false }) {
  if (!IS_WEB) return null;
  const style = overlay ? WEB_COLOR_INPUT_OVERLAY : compact ? WEB_COLOR_INPUT_COMPACT : WEB_COLOR_INPUT_FULL;
  return (
    <input
      type="color"
      value={hexForColorInput(value, fallback)}
      onChange={(e) => {
        stopWebEvent(e);
        onChange(e?.target?.value || '');
      }}
      onClick={stopWebEvent}
      onMouseDown={stopWebEvent}
      onPointerDown={stopWebEvent}
      style={style}
    />
  );
}

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

export default function ProfilePage({ onNavigateToBuilds, onNavigateToGod, onNavigateToCustomBuild, onNavigateToMyBuilds, viewUsername = null, onNavigateBack = null, currentUsername = null }) {
  useAppFonts();
  const { width: screenWidth } = useScreenDimensions();
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUsername);
  const [currentUser, setCurrentUser] = useState(currentUsername);
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
  const [abilityTooltipDetail, setAbilityTooltipDetail] = useAbilityTooltipDetail();
  const [itemTooltipDetail, setItemTooltipDetail] = useItemTooltipDetail();
  const combinedTooltipDetail = abilityTooltipDetail;
  const setCombinedTooltipDetail = useCallback(
    (level) => {
      setAbilityTooltipDetail(level);
      setItemTooltipDetail(level);
    },
    [setAbilityTooltipDetail, setItemTooltipDetail]
  );
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
  const [showAdvancedGradient, setShowAdvancedGradient] = useState(false);
  const [activeNativePicker, setActiveNativePicker] = useState(null); // 'accent' | 'end'
  const [themePresetTarget, setThemePresetTarget] = useState('accent'); // 'accent' | 'end'
  const [remoteBadgeFiles, setRemoteBadgeFiles] = useState([]);
  const [profileGold, setProfileGold] = useState(0); // Gold from Shop (shop_${username}_gold)
  const [ownedShopIds, setOwnedShopIds] = useState([]); // Owned shop item ids for titles
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const lastCloudSyncUserRef = useRef(null);
  const profileSavedAtRef = useRef(0);
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
    return flattenBuildsGods(buildsData.gods);
  }, [buildsData]);

  // Profile icon picker: use profileIconGods.json (all PFPs in repo, including unreleased) then Smite2Gods/builds
  const allGodsForPicker = useMemo(() => {
    try {
      const profileIconList = require('../data/Profile/profileIconGods.json');
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
      const smite2Gods = getSmite2Gods();
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

  // Load builds data (shared session cache)
  useEffect(() => {
    const sync = getBuildsDataSync();
    if (sync) {
      setBuildsData(sync);
      return undefined;
    }
    let cancelled = false;
    loadBuildsData()
      .then((data) => {
        if (!cancelled) setBuildsData(data);
      })
      .catch((e) => {
        console.error('Failed to load builds.json:', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Helper functions for builds (like mybuilds.jsx) - use useMemo to wait for buildsData
  const allItems = useMemo(() => {
    return buildsData ? flattenAny(buildsData.items) : [];
  }, [buildsData]);

  const allBuildsGods = useMemo(() => {
    return buildsData ? flattenBuildsGods(buildsData.gods) : [];
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
    }, 15000);
    
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
      const { fetchUserShopData } = require('../../lib/shopSupabase');
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
      const rawOwned = Array.isArray(shopData.shop_owned) ? shopData.shop_owned : [];
      owned = expandOwnedIds(rawOwned); // include items granted by owned packs
      setProfileGold(gold);
      setOwnedShopIds(owned);
      await storage.setItem(prefix + 'gold', String(gold));
      await storage.setItem(prefix + 'owned', JSON.stringify(rawOwned));
    } else {
      gold = parseInt(g || '0', 10);
      setProfileGold(gold);
      try {
        owned = expandOwnedIds(o ? JSON.parse(o) : []);
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

  /** Silent background sync — runs after login/register and once per profile session. */
  const runCloudAccountSync = useCallback(async (username) => {
    if (!username) return { ok: false };
    const status = await getAccountSyncStatus(username);
    if (!status.connected) return { ok: false, reason: status.reason };
    const push = await syncLocalAccountToCloud(username, storage);
    const prefix = `shop_${username}_`;
    try {
      const { fetchUserShopData } = require('../../lib/shopSupabase');
      const shopData = await fetchUserShopData(username);
      if (shopData != null) {
        setProfileGold(shopData.gold);
        await storage.setItem(prefix + 'gold', String(shopData.gold));
        await storage.setItem(prefix + 'owned', JSON.stringify(shopData.shop_owned || []));
      }
    } catch (_) {}
    return { ok: push.ok !== false, reason: push.reason };
  }, []);

  useEffect(() => {
    if (!currentUser || !isLoggedIn) {
      lastCloudSyncUserRef.current = null;
      return;
    }
    if (lastCloudSyncUserRef.current === currentUser) return;
    lastCloudSyncUserRef.current = currentUser;
    let cancelled = false;
    (async () => {
      await runCloudAccountSync(currentUser);
      if (!cancelled) await loadUserData();
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isLoggedIn]);

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
      setExpandedContributorBuilds(true);
      setExpandedCommunityBuilds(true);
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
      const { supabase } = require('../../config/supabase');
      
      // Load user data (including preferred roles)
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('profile_god_icon, username, display_name, preferred_roles, profile_color, profile_gradient, profile_banner, profile_title, profile_badges, name_animation, profile_font')
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
        const { supabase } = require('../../config/supabase');
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
    try {
      const restored = await restoreAppAuthSession();
      const loggedInUser = restored || (await storage.getItem('currentUser'));
      if (loggedInUser) {
        if (restored) await storage.setItem('currentUser', restored);
        setCurrentUser(loggedInUser);
        setIsLoggedIn(true);
        await loadUserData();
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    } finally {
      setAuthChecked(true);
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
      setLiveDisplayName(currentUser, localDisplayName);
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
      const authSession = await ensureAppWriteSession(currentUser);
      if (!authSession.ready) {
        return;
      }
      
      // Try to load from Supabase
      const { data, error } = await supabase
        .from('user_data')
        .select('pinned_builds, pinned_gods, saved_builds, profile_god_icon, display_name, preferred_roles, profile_color, profile_gradient, profile_banner, profile_title, profile_badges, profile_font, name_animation, updated_at')
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
        const skipAppearancePull = Date.now() - profileSavedAtRef.current < 15000;
        if (!skipAppearancePull) {
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
          if (data.profile_font != null) {
            const fontKey = data.profile_font || '';
            setProfileFont(fontKey);
            if (fontKey) await storage.setItem(`profile_font_${currentUser}`, fontKey);
            else await storage.removeItem(`profile_font_${currentUser}`);
          }
        }
        // Set display name from Supabase
        if (supabaseDisplayName) {
          setDisplayName(supabaseDisplayName);
          await storage.setItem(`displayName_${currentUser}`, supabaseDisplayName);
          setLiveDisplayName(currentUser, supabaseDisplayName);
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
            await finalizeAppLogin(username.trim(), password, storage);
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setUsername('');
            setPassword('');
            await loadUserData();
            await runCloudAccountSync(username.trim());
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
            await finalizeAppLogin(username.trim(), password, storage);
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setUsername('');
            setPassword('');
            await loadUserData();
            await runCloudAccountSync(username.trim());
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
        await finalizeAppLogin(username.trim(), password, storage);
        setCurrentUser(username.trim());
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setUsername('');
        setPassword('');
        await loadUserData();
        await runCloudAccountSync(username.trim());
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

      await finalizeAppLogin(usernameTrimmed, registerPassword, storage);

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
    await completeAppLogout(storage);
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
      setLiveDisplayName(currentUser, trimmedNewDisplayName);
      
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
    const result = await upsertUserProfileFields(currentUser, {
      profile_god_icon: godIconPath || null,
    });
    if (!result.ok) {
      console.warn('Profile icon saved locally only:', result.reason);
    }
  };

  const saveProfileTheme = async (color, gradient) => {
    if (!currentUser) return;
    const normalizedColor = normalizeHex(color) || color || null;
    const normalizedGradient = normalizeGradientStops(gradient);
    setProfileColor(normalizedColor);
    setProfileGradient(normalizedGradient);
    profileSavedAtRef.current = Date.now();
    const result = await upsertUserProfileFields(currentUser, {
      profile_color: normalizedColor,
      profile_gradient: normalizedGradient ? JSON.stringify(normalizedGradient) : null,
    });
    if (!result.ok) {
      Alert.alert('Saved on this device', 'Sign out and sign in with your password to sync profile color to the cloud.');
    }
  };

  const applyAccentColor = useCallback((raw) => {
    setTempProfileColor(raw);
    const normalized = normalizeHex(raw);
    if (normalized) setLivePickerColor(normalized);
    if (tempUseGradient) {
      const first = normalized || normalizeHex(tempProfileColor) || PROFILE_COLOR_PRESETS[0].color;
      const second = normalizeHex(tempProfileGradient?.[1]) || PROFILE_COLOR_PRESETS[1].color;
      setTempProfileGradient([first, second]);
      setTempGradientStopsInput(`${first}, ${second}`);
    }
  }, [tempUseGradient, tempProfileGradient, tempProfileColor]);

  const applyEndColor = useCallback((raw) => {
    const first = normalizeHex(tempProfileColor) || PROFILE_COLOR_PRESETS[0].color;
    const second = normalizeHex(raw) || raw;
    setTempProfileGradient([first, second]);
    setTempGradientStopsInput(`${first}, ${second}`);
  }, [tempProfileColor]);

  const saveProfileAppearance = async (banner, title, font, badges, animation) => {
    if (!currentUser) return { ok: false, reason: 'not_logged_in' };
    const fontKey = (font || '').trim();
    const titleTrimmed = (title || '').trim();
    const badgeList = Array.isArray(badges) ? badges.slice(0, MAX_BADGES) : [];
    const animationKey =
      animation && NAME_ANIMATION_OPTIONS.some((o) => o.key === animation) ? animation : 'none';

    setProfileBanner(banner || null);
    setProfileTitle(titleTrimmed);
    setProfileFont(fontKey);
    setProfileBadges(badgeList);
    if (animationKey !== 'none') setNameAnimation(animationKey);

    if (fontKey) await storage.setItem(`profile_font_${currentUser}`, fontKey);
    else await storage.removeItem(`profile_font_${currentUser}`);

    profileSavedAtRef.current = Date.now();

    const result = await upsertUserProfileFields(currentUser, {
      profile_banner: banner || null,
      profile_title: titleTrimmed || null,
      profile_font: fontKey || null,
      profile_badges: badgeList.length ? JSON.stringify(badgeList) : null,
      name_animation: animationKey !== 'none' ? animationKey : null,
    });
    return result;
  };

  const handleSaveProfileAppearance = async () => {
    if (!currentUser || isSavingAppearance) return;
    setIsSavingAppearance(true);
    try {
      const result = await saveProfileAppearance(
        tempProfileBanner,
        tempProfileTitle,
        tempProfileFont,
        tempProfileBadges,
        tempNameAnimation
      );
      if (result.ok) {
        setShowProfileAppearanceModal(false);
      } else {
        Alert.alert(
          'Saved on this device only',
          'Sign out and sign in again to sync across devices.'
        );
      }
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Could not save profile appearance.');
    } finally {
      setIsSavingAppearance(false);
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
      const authSession = await ensureAppWriteSession(currentUser);
      if (!authSession.ready) {
        console.log('Supabase auth session not ready; local storage saved only');
        return;
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

  // Shared icon renderer for viewed-profile build rows (items and relics)
  const renderViewedBuildIcon = (entry, iconKey) => {
    const entryName = typeof entry === 'string' ? entry : (entry?.name || entry?.internalName || '');
    if (!entryName) return null;
    const item = findItemByName(entryName);
    const icon = item?.icon || (typeof entry === 'object' && entry?.icon) || null;
    const localItemIcon = icon ? getLocalItemIcon(icon) : null;
    const useFallback = failedItemIcons[iconKey];
    return (
      <View key={iconKey} style={styles.itemSlot}>
        {localItemIcon ? (
          <Image
            source={
              localItemIcon.fallback && useFallback
                ? localItemIcon.fallback
                : (localItemIcon.primary || localItemIcon)
            }
            style={styles.itemIcon}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={() => {
              if (localItemIcon.fallback && !useFallback) {
                setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
              }
            }}
          />
        ) : (
          <View style={styles.itemIconFallback}>
            <Text style={styles.itemIconFallbackText}>{entryName.charAt(0)}</Text>
          </View>
        )}
      </View>
    );
  };

  // Starter row (starting items + starter relic) and Final row (items + final relic), always visible
  const renderViewedBuildRows = (build, keyPrefix) => {
    const relicName = (relic) =>
      typeof relic === 'string' ? relic : (relic?.name || relic?.internalName || '');
    const finalItems = Array.isArray(build.items) ? build.items.filter(Boolean) : [];
    const starterItems = Array.isArray(build.starting_items || build.startingItems)
      ? (build.starting_items || build.startingItems).filter(Boolean)
      : [];
    const starterRelic = build.starting_relic || build.startingRelic || null;
    const finalRelic = build.final_relic || build.finalRelic || build.relic || null;
    const hasStarterRelic = !!relicName(starterRelic);
    const hasFinalRelic = !!relicName(finalRelic);

    const renderRow = (label, itemsArr, relic, hasRelic, rowKey) => {
      if (itemsArr.length === 0 && !hasRelic) return null;
      return (
        <View style={styles.buildItemsRow} key={rowKey}>
          <Text style={styles.buildItemsRowLabel}>{label}</Text>
          <View style={styles.buildItemsRowIcons}>
            {itemsArr.map((it, i) => renderViewedBuildIcon(it, `${rowKey}-item-${i}`))}
            {hasRelic ? (
              <>
                <View style={styles.buildRelicDivider} />
                {renderViewedBuildIcon(relic, `${rowKey}-relic`)}
              </>
            ) : null}
          </View>
        </View>
      );
    };

    if (finalItems.length === 0 && starterItems.length === 0 && !hasStarterRelic && !hasFinalRelic) {
      return <Text style={styles.emptyText}>No items</Text>;
    }
    return (
      <>
        {renderRow('STARTER', starterItems, starterRelic, hasStarterRelic, `${keyPrefix}-starter`)}
        {renderRow('FINAL', finalItems, finalRelic, hasFinalRelic, `${keyPrefix}-final`)}
      </>
    );
  };

  // If viewing another user's profile, allow it even when logged out
  if (viewingUser && viewingUser !== currentUser) {
    // Single source of truth for other user's display name (works before viewingUserData loads, e.g. on app)
    const otherUserDisplayName = (viewingUserData?.display_name ?? viewUsername ?? viewingUser ?? 'Profile').trim() || 'Profile';

    return (
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          {/* Header: web = single row (Back | Name); mobile = two rows */}
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
              <ActivityIndicator size="large" color={UI_THEME.accentSky} />
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
                const otherAccentColor = viewingUserData?.profile_color || (otherGradient && otherGradient[0]) || UI_THEME.accentSky;
                const otherBannerPreset = PROFILE_BANNER_PRESETS.find((p) => p.key === viewingUserData?.profile_banner);
                const hasOtherBannerImage = !!(otherBannerPreset && otherBannerPreset.key !== 'none' && otherBannerPreset.image);
                const otherGradientStops = resolveProfileThemeStops(
                  viewingUserData?.profile_color,
                  otherGradient
                );
                const hasOtherThemeChrome = !!otherGradientStops;
                const otherBannerTintStyle = hasOtherBannerImage ? styles.profileBannerTintDark : null;
                const otherIconBorderColor = otherGradientStops ? otherGradientStops[0] : otherAccentColor;
                const otherTitle = (viewingUserData?.profile_title || '').trim();
                const otherAnimation = NAME_ANIMATION_OPTIONS.some((o) => o.key === viewingUserData?.name_animation)
                  ? viewingUserData?.name_animation
                  : 'none';
                const otherFontKey = viewingUserData?.profile_font;
                const otherProfileCard = (
              <View style={[
                styles.profileHeader,
                IS_WEB && styles.profileHeaderWeb,
                { padding: headerPadding, position: 'relative' },
                hasOtherThemeChrome && styles.profileHeaderGradientInner,
                !hasOtherThemeChrome && { borderColor: otherAccentColor },
              ]}>
                {otherBannerPreset && otherBannerPreset.key !== 'none' && otherBannerPreset.image && (
                  <Image
                    source={{ uri: otherBannerPreset.image }}
                    style={[styles.profileBannerStrip, IS_WEB && styles.profileBannerStripWeb]}
                    resizeMode="cover"
                  />
                )}
                {hasOtherBannerImage ? (
                  <View style={[styles.profileBannerTint, IS_WEB && styles.profileBannerTintWeb, otherBannerTintStyle]} />
                ) : null}
                <View style={styles.profileHeaderContent}>
                  <View style={[styles.profileIconContainer, { width: iconSize, height: iconSize, borderRadius: iconSize / 2, borderColor: otherIconBorderColor, marginRight: narrow ? 12 : (Platform.OS === 'web' ? 20 : 16) }]}>
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
                          viewingUserContributorBuilds.length > 0 && styles.profileNameContributor,
                          otherFontKey && PROFILE_FONT_FAMILY_MAP[otherFontKey] && { fontFamily: PROFILE_FONT_FAMILY_MAP[otherFontKey] },
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
                      <Text style={styles.contributorText}>Partner</Text>
                    </View>
                  </View>
                )}
              </View>
                );
                return (
                  <ProfileGradientBorderWrap gradient={hasOtherThemeChrome ? otherGradientStops : null}>
                    {otherProfileCard}
                  </ProfileGradientBorderWrap>
                );
              })()}

              {/* Contributor Builds */}
              {viewingUserContributorBuilds.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity 
                    onPress={() => setExpandedContributorBuilds(!expandedContributorBuilds)}
                    style={styles.sectionHeader}
                  >
                    <Text style={styles.sectionTitle}>Partner Builds</Text>
                    <Text style={styles.expandIcon}>{expandedContributorBuilds ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedContributorBuilds && viewingUserContributorBuilds.map((build, idx) => {
                    const godName = build.god_name || build.god || build.godName || 'Unknown';
                    const godInternalName = build.god_internal_name || build.godInternalName;
                    const god = findGodForBuild(godName, godInternalName);
                    const godIcon = build.godIcon || (god && (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon)));
                    const localGodIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                    const buildName = build.build_name || build.name || 'Unnamed Build';
                    
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
                              </View>
                              <Text style={styles.buildGod}>{godName}</Text>
                              <Text style={styles.buildLevel}>Level {build.god_level || build.godLevel || 20}</Text>
                            </View>
                          </View>
                        </View>
                        {renderViewedBuildRows(build, `view-contributor-${idx}`)}
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
                    <Text style={styles.sectionTitle}>Community Builds</Text>
                    <Text style={styles.expandIcon}>{expandedCommunityBuilds ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedCommunityBuilds && viewingUserCommunityBuilds.map((build, idx) => {
                    const godName = build.god_name || build.god || build.godName || 'Unknown';
                    const godInternalName = build.god_internal_name || build.godInternalName;
                    const god = findGodForBuild(godName, godInternalName);
                    const godIcon = build.godIcon || (god && (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon)));
                    const localGodIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                    const buildName = build.build_name || build.name || 'Unnamed Build';
                    
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
                              </View>
                              <Text style={styles.buildGod}>{godName}</Text>
                              <Text style={styles.buildLevel}>Level {build.god_level || build.godLevel || 20}</Text>
                            </View>
                          </View>
                        </View>
                        {renderViewedBuildRows(build, `view-community-${idx}`)}
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
        </View>
      </View>
    );
  }

  if (!viewingUser && !authChecked) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={UI_THEME.accentSky} />
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
                      await runCloudAccountSync(pendingUsername);
                    } else if (forgotPasswordUsername) {
                      await storage.setItem('currentUser', forgotPasswordUsername);
                      setCurrentUser(forgotPasswordUsername);
                      setIsLoggedIn(true);
                      await loadUserData();
                      await runCloudAccountSync(forgotPasswordUsername);
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
      <View style={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        {currentUser && !viewingUser ? (
          <View style={styles.accountIdentityRow}>
            <Text style={styles.accountIdentityLabel}>Account</Text>
            <Text style={styles.accountIdentityValue}>{currentUser}</Text>
          </View>
        ) : null}
        {(() => {
          const accentColor = profileColor || (profileGradient && profileGradient[0]) || UI_THEME.accentSky;
          const bannerPreset = PROFILE_BANNER_PRESETS.find(p => p.key === profileBanner);
          const hasBannerImage = !!(bannerPreset && bannerPreset.key !== 'none' && bannerPreset.image);
          const gradientStops = resolveProfileThemeStops(profileColor, profileGradient);
          const hasThemeChrome = !!gradientStops;
          const profileBannerTintStyle = hasBannerImage ? styles.profileBannerTintDark : null;
          const iconBorderColor = gradientStops ? gradientStops[0] : accentColor;
          const profileCard = (
        <View style={[
          styles.profileHeader,
          IS_WEB && styles.profileHeaderWeb,
          screenWidth < 420 && { padding: 12 },
          hasThemeChrome && styles.profileHeaderGradientInner,
          !hasThemeChrome && {
            borderColor: accentColor,
            ...(IS_WEB && profileColor && { boxShadow: `0 4px 20px ${accentColor}40` }),
          },
        ]}>
          {bannerPreset && bannerPreset.key !== 'none' && bannerPreset.image && (
            <Image
              source={{ uri: bannerPreset.image }}
              style={[styles.profileBannerStrip, IS_WEB && styles.profileBannerStripWeb]}
              resizeMode="cover"
            />
          )}
          {hasBannerImage ? (
            <View style={[styles.profileBannerTint, IS_WEB && styles.profileBannerTintWeb, profileBannerTintStyle]} />
          ) : null}
          <View style={styles.profileHeaderContent}>
            <View style={[styles.profileIconWrapper, screenWidth < 420 && { marginRight: 12 }]}>
              <TouchableOpacity 
                style={[styles.profileIconContainer, screenWidth < 420 && { width: 80, height: 80, borderRadius: 40, marginRight: 0 }, { borderColor: iconBorderColor }]}
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
              {currentUser && !viewingUser ? (
                <View style={styles.profileMetaRow}>
                  <View style={[styles.profileStatChip, styles.profileGoldStatChip]}>
                    <Image source={GOLD_ICON} style={styles.profileGoldCoinIcon} resizeMode="contain" />
                    <View style={styles.profileGoldStatTextCol}>
                      <Text style={styles.profileStatLabel}>Gold</Text>
                      <Text style={styles.profileGoldStatValue}>{profileGold.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.profileStatChip}>
                    <Text style={styles.profileStatLabel}>Builds</Text>
                    <Text style={styles.profileStatValue}>
                      {savedBuilds.length + communityBuilds.length + certifiedBuilds.length}
                    </Text>
                  </View>
                </View>
              ) : null}
              {currentUser && !viewingUser ? (
                <TouchableOpacity
                  style={styles.profileCustomizeBtn}
                  onPress={() => {
                    setAppearanceSection('banner');
                    setShowProfileAppearanceModal(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.profileCustomizeBtnText}>Customize profile</Text>
                </TouchableOpacity>
              ) : null}
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
          {currentUser && !viewingUser ? (
            <View style={styles.appPrefsSection}>
              <Text style={styles.preferredRolesLabel}>Tooltips</Text>
              <View style={styles.abilityDetailToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.abilityDetailChip,
                    combinedTooltipDetail === TOOLTIP_DETAIL.MINIMAL &&
                      styles.abilityDetailChipActive,
                  ]}
                  onPress={() => setCombinedTooltipDetail(TOOLTIP_DETAIL.MINIMAL)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.abilityDetailChipText,
                      combinedTooltipDetail === TOOLTIP_DETAIL.MINIMAL &&
                        styles.abilityDetailChipTextActive,
                    ]}
                  >
                    Minimal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.abilityDetailChip,
                    combinedTooltipDetail === TOOLTIP_DETAIL.DESCRIPTIVE &&
                      styles.abilityDetailChipActive,
                  ]}
                  onPress={() => setCombinedTooltipDetail(TOOLTIP_DETAIL.DESCRIPTIVE)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.abilityDetailChipText,
                      combinedTooltipDetail === TOOLTIP_DETAIL.DESCRIPTIVE &&
                        styles.abilityDetailChipTextActive,
                    ]}
                  >
                    Descriptive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
          );
          return (
            <ProfileGradientBorderWrap gradient={hasThemeChrome ? gradientStops : null}>
              {profileCard}
            </ProfileGradientBorderWrap>
          );
        })()}

        {/* Profile & account settings */}
        {currentUser && !viewingUser ? (
          <>
            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupLabel}>Profile</Text>
              <View style={styles.settingsList}>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => {
                    setTempSelectedGodIcon(profileGodIcon);
                    setShowGodIconPicker(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitle}>Profile icon</Text>
                  <Text style={styles.settingsRowMeta} numberOfLines={1}>{profileGodIcon || 'Default'}</Text>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => {
                    setNewDisplayName(displayName || '');
                    setShowChangeDisplayNameModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitle}>Display name</Text>
                  <Text style={styles.settingsRowMeta} numberOfLines={1}>{displayName || currentUser}</Text>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => setShowProfileColorModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitle}>Theme color</Text>
                  <View style={styles.settingsRowSwatchWrap}>
                    {profileGradient && profileGradient.length >= 2 ? (
                      <View style={[styles.settingsRowSwatch, styles.settingsRowSwatchGradient]}>
                        <View style={[styles.settingsRowSwatchHalf, { backgroundColor: profileGradient[0] }]} />
                        <View style={[styles.settingsRowSwatchHalf, { backgroundColor: profileGradient[1] }]} />
                      </View>
                    ) : (
                      <View style={[styles.settingsRowSwatch, { backgroundColor: profileColor || UI_THEME.accentSky }]} />
                    )}
                  </View>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => {
                    setAppearanceSection('banner');
                    setShowProfileAppearanceModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitle}>Banner, badges & FX</Text>
                  <Text style={styles.settingsRowMeta} numberOfLines={1}>
                    {profileBanner !== 'none' ? 'Banner on' : 'Default'} · {profileBadges.length} badge{profileBadges.length === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsRow, styles.settingsRowLast]}
                  onPress={() => setShowPreferredRolesModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitle}>Preferred roles</Text>
                  <Text style={styles.settingsRowMeta} numberOfLines={1}>
                    {preferredRoles.length ? preferredRoles.join(', ') : 'Not set'}
                  </Text>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupLabel}>Account</Text>
              <View style={styles.settingsList}>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => {
                    setNewUsername('');
                    setShowChangeUsernameModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitle}>Username</Text>
                  <Text style={styles.settingsRowMeta} numberOfLines={1}>{currentUser}</Text>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsRow, styles.settingsRowLast, styles.settingsRowDestructive]}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsRowTitleDestructive}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}


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

        {/* Profile theme color modal */}
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
            setShowAdvancedGradient(false);
            setActiveNativePicker(null);
            setThemePresetTarget('accent');
            setTempGradientStopsInput(
              profileGradient && profileGradient.length >= 2
                ? profileGradient.join(', ')
                : `${profileColor || PROFILE_COLOR_PRESETS[0].color}, ${PROFILE_COLOR_PRESETS[1].color}`
            );
          }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowProfileColorModal(false)}>
            <Pressable
              style={[styles.modalContainer, styles.appearanceModalContainer, styles.profileColorModalContainer]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitleCompact}>Theme color</Text>

              {(() => {
                const previewColor = normalizeHex(livePickerColor || tempProfileColor) || UI_THEME.accentSky;
                const previewGradient = tempUseGradient
                  ? (normalizeGradientStops(tempGradientStopsInput)
                    || normalizeGradientStops(tempProfileGradient)
                    || [previewColor, PROFILE_COLOR_PRESETS[1].color])
                  : null;
                const previewStyle = previewGradient && previewGradient.length >= 2
                  ? (IS_WEB
                    ? { backgroundImage: `linear-gradient(120deg, ${previewGradient.join(', ')})` }
                    : { backgroundColor: previewGradient[0] })
                  : { backgroundColor: previewColor };
                return (
                  <View style={[styles.themePreviewStrip, previewStyle]}>
                    <Text style={styles.themePreviewHex} numberOfLines={1}>
                      {previewGradient ? previewGradient.join(' → ') : previewColor}
                    </Text>
                  </View>
                );
              })()}

              <ScrollView
                style={styles.themeColorModalScroll}
                contentContainerStyle={styles.themeColorModalScrollContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {tempUseGradient ? (
                  <View style={styles.themePresetTargetRow}>
                    {[
                      { key: 'accent', label: 'Start' },
                      { key: 'end', label: 'End' },
                    ].map((t) => (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.themePresetTargetBtn,
                          themePresetTarget === t.key && styles.themePresetTargetBtnActive,
                        ]}
                        onPress={() => setThemePresetTarget(t.key)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.themePresetTargetText,
                            themePresetTarget === t.key && styles.themePresetTargetTextActive,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <View style={styles.colorPresetRowCompact}>
                  {PROFILE_COLOR_PRESETS.map((p) => {
                    const accentSelected = normalizeHex(tempProfileColor) === p.color;
                    const endSelected = tempUseGradient && normalizeHex(tempProfileGradient?.[1]) === p.color;
                    const selected = tempUseGradient
                      ? (themePresetTarget === 'end' ? endSelected : accentSelected)
                      : accentSelected;
                    return (
                      <TouchableOpacity
                        key={p.color}
                        onPress={() => {
                          if (tempUseGradient && themePresetTarget === 'end') applyEndColor(p.color);
                          else applyAccentColor(p.color);
                        }}
                        style={[
                          styles.colorPresetButtonCompact,
                          { backgroundColor: p.color },
                          selected && styles.colorPresetButtonSelected,
                        ]}
                        activeOpacity={0.8}
                        accessibilityLabel={p.label}
                      />
                    );
                  })}
                </View>

                <View style={tempUseGradient ? styles.themeDualCustomRow : null}>
                  <View style={styles.colorCustomRowCompact}>
                    {tempUseGradient ? (
                      <Text style={styles.colorCustomRowMiniLabel}>Start</Text>
                    ) : null}
                    <View style={styles.colorCustomSwatchWrapCompact}>
                      <View
                        style={[
                          styles.colorCustomSwatch,
                          { backgroundColor: normalizeHex(tempProfileColor) || UI_THEME.accentSky },
                        ]}
                      />
                      {IS_WEB ? (
                        <WebColorInput
                          overlay
                          value={tempProfileColor}
                          fallback={UI_THEME.accentSky}
                          onChange={(raw) => {
                            const v = normalizeHex(raw);
                            if (v) applyAccentColor(v);
                          }}
                        />
                      ) : (
                        <TouchableOpacity
                          style={styles.colorCustomSwatchHit}
                          onPress={() => setActiveNativePicker((k) => (k === 'accent' ? null : 'accent'))}
                          activeOpacity={0.9}
                          accessibilityLabel="Open color picker"
                        />
                      )}
                    </View>
                    <TextInput
                      style={styles.colorCustomHexInputCompact}
                      placeholder="#7dd3fc"
                      placeholderTextColor="#64748b"
                      value={tempProfileColor || ''}
                      onChangeText={applyAccentColor}
                      onFocus={() => {
                        setThemePresetTarget('accent');
                        if (!IS_WEB) setActiveNativePicker('accent');
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {tempUseGradient ? (
                    <View style={styles.colorCustomRowCompact}>
                      <Text style={styles.colorCustomRowMiniLabel}>End</Text>
                      <View style={styles.colorCustomSwatchWrapCompact}>
                        <View
                          style={[
                            styles.colorCustomSwatch,
                            {
                              backgroundColor:
                                normalizeHex(tempProfileGradient?.[1]) || PROFILE_COLOR_PRESETS[1].color,
                            },
                          ]}
                        />
                        {IS_WEB ? (
                          <WebColorInput
                            overlay
                            value={(tempProfileGradient && tempProfileGradient[1]) || ''}
                            fallback="#22c55e"
                            onChange={(raw) => {
                              const v = normalizeHex(raw);
                              if (v) applyEndColor(v);
                            }}
                          />
                        ) : (
                          <TouchableOpacity
                            style={styles.colorCustomSwatchHit}
                            onPress={() => setActiveNativePicker((k) => (k === 'end' ? null : 'end'))}
                            activeOpacity={0.9}
                            accessibilityLabel="Open end color picker"
                          />
                        )}
                      </View>
                      <TextInput
                        style={styles.colorCustomHexInputCompact}
                        placeholder="#22c55e"
                        placeholderTextColor="#64748b"
                        value={(tempProfileGradient && tempProfileGradient[1]) || ''}
                        onChangeText={applyEndColor}
                        onFocus={() => {
                          setThemePresetTarget('end');
                          if (!IS_WEB) setActiveNativePicker('end');
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  ) : null}
                </View>

                {!IS_WEB && activeNativePicker === 'accent' ? (
                  <View style={styles.nativeColorPickerPanelCompact}>
                    <ColorPicker
                      color={normalizeHex(tempProfileColor) || UI_THEME.accentSky}
                      onColorChangeComplete={(color) => {
                        const v = normalizeHex(color);
                        if (v) applyAccentColor(v);
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
                      thumbSize={20}
                      sliderSize={18}
                      noSnap
                      row={false}
                      swatches={false}
                      useNativeDriver
                      useNativeLayout
                    />
                  </View>
                ) : null}
                {!IS_WEB && activeNativePicker === 'end' ? (
                  <View style={styles.nativeColorPickerPanelCompact}>
                    <ColorPicker
                      color={normalizeHex(tempProfileGradient?.[1]) || PROFILE_COLOR_PRESETS[1].color}
                      onColorChangeComplete={(color) => {
                        const v = normalizeHex(color);
                        if (v) applyEndColor(v);
                      }}
                      onColorChange={(color) => {
                        const v = normalizeHex(color);
                        if (v) applyEndColor(v);
                      }}
                      thumbSize={20}
                      sliderSize={18}
                      noSnap
                      row={false}
                      swatches={false}
                      useNativeDriver
                      useNativeLayout
                    />
                  </View>
                ) : null}

                <View style={styles.settingsToggleRowCompact}>
                  <Text style={styles.settingsToggleTitle}>Gradient</Text>
                  <Switch
                    value={tempUseGradient}
                    onValueChange={(enabled) => {
                      setTempUseGradient(enabled);
                      if (enabled && (!tempProfileGradient || tempProfileGradient.length < 2)) {
                        const first = normalizeHex(tempProfileColor) || PROFILE_COLOR_PRESETS[0].color;
                        const second = PROFILE_COLOR_PRESETS[1].color;
                        setTempProfileGradient([first, second]);
                        setTempGradientStopsInput(`${first}, ${second}`);
                      }
                      if (!enabled) setThemePresetTarget('accent');
                    }}
                    trackColor={{ false: '#334155', true: 'rgba(125, 211, 252, 0.45)' }}
                    thumbColor={tempUseGradient ? UI_THEME.accentSky : '#94a3b8'}
                  />
                </View>

                {tempUseGradient ? (
                  <>
                    <TouchableOpacity
                      style={styles.advancedToggleRowCompact}
                      onPress={() => setShowAdvancedGradient((v) => !v)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.advancedToggleText}>
                        {showAdvancedGradient ? '▾' : '▸'} More stops
                      </Text>
                    </TouchableOpacity>
                    {showAdvancedGradient ? (
                      <>
                        <TextInput
                          style={styles.appearanceTextInputCompact}
                          placeholder="#7dd3fc, #22c55e"
                          placeholderTextColor="#64748b"
                          value={tempGradientStopsInput}
                          onChangeText={setTempGradientStopsInput}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}
              </ScrollView>

              <View style={styles.themeColorModalFooter}>
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
            const ownedTitleValues = SHOP_TITLE_OPTIONS.filter((i) => ownedIds.includes(i.id) || i.defaultUnlocked).map((i) => (i.value || '').trim());
            const current = (profileTitle || '').trim();
            setTempProfileTitle(ownedTitleValues.includes(current) ? current : current);
            setTempProfileFont(profileFont || '');
            setTempProfileBadges(Array.isArray(profileBadges) ? profileBadges.slice(0, MAX_BADGES) : []);
            setTempNameAnimation(nameAnimation || 'none');
            setTempBadgeSearch('');
            setTempTitleSearch('');
            setAppearanceSection('banner');
          }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowProfileAppearanceModal(false)}>
            <View style={[styles.modalContainer, styles.appearanceModalContainer]}>
              <Text style={styles.modalTitleCompact}>Profile appearance</Text>
              <Text style={[styles.modalSubtitle, styles.modalSubtitleLeft]}>Banner, title, font, badges, and name animation.</Text>
              <ScrollView
                style={styles.appearanceModalScroll}
                contentContainerStyle={styles.appearanceModalScrollContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
              {(() => {
                const previewBanner = PROFILE_BANNER_PRESETS.find((p) => p.key === tempProfileBanner);
                const previewName = (displayName || currentUser || 'Profile').trim() || 'Profile';
                const previewAccent = normalizeHex(tempProfileColor) || profileColor || UI_THEME.accentSky;
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

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appearanceSectionTabsScroll} contentContainerStyle={styles.appearanceSectionTabs}>
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
              </ScrollView>

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
                    {SHOP_TITLE_OPTIONS.filter((item) => ownedShopIds.includes(item.id) || item.defaultUnlocked).map((item) => {
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
                    {SHOP_TITLE_OPTIONS.filter((item) => ownedShopIds.includes(item.id) || item.defaultUnlocked).length === 0 && (
                      <Text style={styles.appearanceUnlockHint}>Unlock titles in the Shop with Gold.</Text>
                    )}
                  </ScrollView>
                </>
              )}

              {appearanceSection === 'font' && (
                <>
                  <Text style={styles.appearanceSectionLabel}>Display name font</Text>
                  <Text style={styles.sectionNote}>Pick a font you own from the Shop. Preview uses your display name.</Text>
                  <View style={styles.fontPresetGrid}>
                    <TouchableOpacity
                      onPress={() => setTempProfileFont('')}
                      style={[styles.fontPresetCard, !(tempProfileFont || '').trim() && styles.fontPresetCardSelected]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.fontPresetSample, !(tempProfileFont || '').trim() && styles.fontPresetSampleSelected]}>Aa</Text>
                      <Text style={[styles.fontPresetName, !(tempProfileFont || '').trim() && styles.fontPresetNameSelected]}>Default</Text>
                    </TouchableOpacity>
                    {SHOP_FONT_OPTIONS.filter((item) => ownedShopIds.includes(item.id) || item.defaultUnlocked).map((item) => {
                      const selected = (tempProfileFont || '').trim() === (item.value || '').trim();
                      const fontFamily = PROFILE_FONT_FAMILY_MAP[item.value];
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setTempProfileFont(item.value || '')}
                          style={[styles.fontPresetCard, selected && styles.fontPresetCardSelected]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.fontPresetSample, selected && styles.fontPresetSampleSelected, fontFamily && { fontFamily }]}>Aa</Text>
                          <Text style={[styles.fontPresetName, selected && styles.fontPresetNameSelected, fontFamily && { fontFamily }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {SHOP_FONT_OPTIONS.filter((item) => ownedShopIds.includes(item.id) || item.defaultUnlocked).length === 0 && (
                    <Text style={styles.appearanceUnlockHint}>Unlock fonts in the Shop with Gold.</Text>
                  )}
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
                      const unlocked = isNameFxUnlocked(opt.key, ownedShopIds, nameAnimation);
                      return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => { if (unlocked) setTempNameAnimation(opt.key); }}
                        style={[
                          styles.animationOptionButtonWithPreview,
                          tempNameAnimation === opt.key && styles.animationOptionButtonSelected,
                          !unlocked && styles.animationOptionButtonLocked,
                          narrowModal && { width: optBtnWidth, minWidth: optBtnWidth, maxWidth: optBtnWidth },
                        ]}
                        activeOpacity={unlocked ? 0.85 : 1}
                      >
                        <View style={styles.animationOptionLabelRow}>
                          <Text style={styles.animationOptionLabel} numberOfLines={1}>{opt.label}</Text>
                          {!unlocked && <Text style={styles.animationOptionLockIcon}>🔒</Text>}
                        </View>
                        <View style={styles.animationPreviewWrap}>
                          <AnimatedProfileName
                            name="Preview"
                            animationType={opt.key}
                            accentColor={normalizeHex(tempProfileColor) || profileColor || '#7dd3fc'}
                            style={styles.animationPreviewText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            previewMode
                          />
                        </View>
                        {!unlocked && <Text style={styles.animationOptionLockHint} numberOfLines={1}>Buy in Shop</Text>}
                      </TouchableOpacity>
                    ); })}
                  </ScrollView>
                </>
              )}

              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowProfileAppearanceModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, isSavingAppearance && styles.confirmButtonDisabled]}
                  onPress={handleSaveProfileAppearance}
                  disabled={isSavingAppearance}
                >
                  <Text style={styles.confirmButtonText}>{isSavingAppearance ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
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
      </View>
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
    backgroundColor: '#071024',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    ...(IS_WEB && {
      maxWidth: WEB_CONTENT_MAX_WIDTH,
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
    backgroundColor: UI_THEME.accentSky,
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
    backgroundColor: UI_THEME.panelBgSection,
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: UI_THEME.accentSky,
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
    color: UI_THEME.accentSky,
    fontSize: 18,
    fontWeight: '700',
  },
  profileHeader: {
    backgroundColor: UI_THEME.panelBgSection,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: UI_THEME.accentSky,
    overflow: 'hidden',
    position: 'relative',
    ...(IS_WEB && {
      boxShadow: '0 4px 20px rgba(30, 144, 255, 0.3)',
    }),
  },
  profileHeaderGradientInner: {
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: UI_THEME.panelBgSection,
    ...(IS_WEB && {
      boxShadow: 'none',
    }),
  },
  profileHeaderWeb: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
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
    maxHeight: '90%',
    padding: 14,
    ...(IS_WEB && {
      maxWidth: 440,
      maxHeight: '86vh',
    }),
  },
  modalTitleCompact: {
    color: UI_THEME.accentSky,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left',
  },
  themePreviewStrip: {
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  themePreviewLabel: {
    color: 'rgba(248, 250, 252, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  themePreviewHex: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  themeColorModalScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    maxHeight: IS_WEB ? 360 : 300,
  },
  themeColorModalScrollContent: {
    paddingBottom: 4,
  },
  themeColorModalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexShrink: 0,
  },
  themePresetTargetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  themePresetTargetBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  themePresetTargetBtnActive: {
    borderColor: UI_THEME.borderCyan,
    backgroundColor: UI_THEME.borderCyanFill10,
  },
  themePresetTargetText: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  themePresetTargetTextActive: {
    color: UI_THEME.accentSky,
  },
  themeDualCustomRow: {
    flexDirection: IS_WEB ? 'row' : 'column',
    gap: 8,
    marginTop: 8,
  },
  colorPresetRowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorPresetButtonCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  colorCustomRowCompact: {
    flex: IS_WEB ? 1 : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.panelBgAlt,
    minWidth: 0,
  },
  colorCustomRowMiniLabel: {
    color: UI_THEME.textMuted,
    fontSize: 10,
    fontWeight: '700',
    width: 28,
  },
  colorCustomSwatchWrapCompact: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexShrink: 0,
  },
  colorCustomHexInputCompact: {
    flex: 1,
    minWidth: 0,
    backgroundColor: UI_THEME.mediaBg,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: UI_THEME.textBright,
    fontSize: 12,
    fontWeight: '600',
    ...(IS_WEB && { outlineStyle: 'none', minHeight: 32 }),
  },
  settingsToggleRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  advancedToggleRowCompact: {
    marginTop: 6,
    paddingVertical: 4,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  appearanceTextInputCompact: {
    backgroundColor: UI_THEME.mediaBg,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: UI_THEME.textBright,
    fontSize: 12,
    marginTop: 4,
    ...(IS_WEB && { outlineStyle: 'none', minHeight: 36 }),
  },
  themeColorSection: {
    marginBottom: 4,
  },
  themeColorSectionHint: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    marginTop: -2,
  },
  themeColorDivider: {
    height: 1,
    backgroundColor: UI_THEME.panelBorder,
    marginVertical: 14,
    opacity: 0.85,
  },
  colorCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  colorCustomSwatchWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  colorCustomSwatch: {
    width: '100%',
    height: '100%',
  },
  colorCustomSwatchHit: {
    ...StyleSheet.absoluteFillObject,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  colorCustomHexInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: UI_THEME.mediaBg,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: UI_THEME.textBright,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    ...(IS_WEB && { outlineStyle: 'none', minHeight: 40 }),
  },
  colorCustomRowLabel: {
    color: UI_THEME.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: 2,
  },
  nativeColorPickerPanelCompact: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: 8,
    backgroundColor: UI_THEME.mediaBg,
    overflow: 'hidden',
    padding: 6,
    minHeight: 160,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
    padding: 3,
    marginBottom: 12,
  },
  segmentedControlBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  segmentedControlBtnActive: {
    backgroundColor: UI_THEME.borderCyanFill12,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
  },
  segmentedControlText: {
    color: UI_THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentedControlTextActive: {
    color: UI_THEME.accentSky,
  },
  colorHexChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  colorHexChipSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#64748b',
  },
  colorHexChipText: {
    color: UI_THEME.textBody,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  colorHexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorHexInputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  settingsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  settingsToggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  settingsToggleTitle: {
    color: UI_THEME.textBright,
    fontSize: 14,
    fontWeight: '700',
  },
  settingsToggleHint: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  advancedToggleRow: {
    marginTop: 10,
    paddingVertical: 8,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  advancedToggleText: {
    color: UI_THEME.labelSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  pageTitle: {
    color: UI_THEME.accentSky,
    fontSize: 22,
    fontWeight: '700',
  },
  profileStatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.borderCyanFill08,
    minWidth: 72,
  },
  profileStatLabel: {
    color: UI_THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  profileStatValue: {
    color: UI_THEME.textBright,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  profileGoldStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: 'rgba(245, 158, 11, 0.55)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  profileGoldCoinIcon: {
    width: 24,
    height: 24,
  },
  profileGoldStatTextCol: {
    minWidth: 0,
  },
  profileGoldStatValue: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  profileCustomizeBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: UI_THEME.borderCyanFill10,
    minHeight: 44,
    justifyContent: 'center',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  profileCustomizeBtnText: {
    color: UI_THEME.accentSky,
    fontSize: 14,
    fontWeight: '700',
  },
  settingsGroup: {
    marginTop: 20,
    marginBottom: 4,
  },
  settingsGroupLabel: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorder,
    gap: 8,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowTitle: {
    color: UI_THEME.textBright,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  settingsRowMeta: {
    color: UI_THEME.textMuted,
    fontSize: 13,
    maxWidth: '42%',
    textAlign: 'right',
  },
  settingsRowChevron: {
    color: UI_THEME.labelSoft,
    fontSize: 20,
    lineHeight: 22,
    marginLeft: 2,
  },
  settingsRowSwatchWrap: {
    marginRight: 2,
  },
  settingsRowSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  settingsRowSwatchGradient: {
    flexDirection: 'row',
  },
  settingsRowSwatchHalf: {
    flex: 1,
    height: '100%',
  },
  settingsRowDestructive: {
    justifyContent: 'center',
  },
  settingsRowTitleDestructive: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  appearanceModalContainer: {
    maxHeight: '92%',
    borderColor: UI_THEME.borderCyan,
    borderWidth: 1,
    backgroundColor: UI_THEME.cardBg,
    ...(IS_WEB && {
      width: '94%',
      maxWidth: 860,
      maxHeight: '88vh',
    }),
  },
  appearanceModalScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: IS_WEB ? 520 : 440,
  },
  appearanceModalScrollContent: {
    paddingBottom: 8,
  },
  appearanceSectionTabsScroll: {
    marginTop: 4,
    marginBottom: 12,
  },
  appearanceSectionLabel: {
    color: UI_THEME.textBright,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  sectionNote: {
    color: UI_THEME.textBody,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  fontPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fontPresetCard: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
    alignItems: 'center',
  },
  fontPresetCardSelected: {
    borderColor: UI_THEME.borderCyan,
    backgroundColor: UI_THEME.borderCyanFill12,
  },
  fontPresetSample: {
    color: UI_THEME.textBright,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  fontPresetSampleSelected: {
    color: UI_THEME.accentSky,
  },
  fontPresetName: {
    color: UI_THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  fontPresetNameSelected: {
    color: UI_THEME.accentSky,
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
    borderColor: UI_THEME.accentSky,
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
    borderColor: UI_THEME.accentSky,
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
    borderColor: UI_THEME.accentSky,
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
    minHeight: 26,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  animationPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_THEME.textBody,
  },
  appearanceUnlockHint: {
    color: UI_THEME.textBody,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 18,
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
    borderColor: UI_THEME.accentSky,
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  animationOptionButtonSelected: {
    borderColor: UI_THEME.accentSky,
    backgroundColor: 'rgba(30, 144, 255, 0.16)',
  },
  animationOptionButtonLocked: {
    borderColor: 'rgba(51, 65, 85, 0.7)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  animationOptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  animationOptionLockIcon: {
    fontSize: 11,
  },
  animationOptionLockHint: {
    marginTop: 4,
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    borderColor: UI_THEME.accentSky,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  colorPresetButtonSelected: {
    borderColor: '#f8fafc',
    borderWidth: 2,
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
    borderColor: UI_THEME.accentSky,
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
    zIndex: 2,
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
    borderColor: UI_THEME.accentSky,
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
    backgroundColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.accentSky,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: UI_THEME.panelBgSection,
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
    backgroundColor: UI_THEME.accentSky,
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
  accountIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  accountIdentityLabel: {
    color: UI_THEME.textHint,
    fontSize: 12,
    fontWeight: '600',
  },
  accountIdentityValue: {
    color: UI_THEME.accentSky,
    fontSize: 14,
    fontWeight: '700',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
    borderColor: UI_THEME.accentSky,
    backgroundColor: UI_THEME.panelBgSection,
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
  appPrefsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  appPrefsSubLabel: {
    marginTop: 14,
  },
  abilityDetailToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  abilityDetailChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1220',
  },
  abilityDetailChipActive: {
    borderColor: 'rgba(125, 211, 252, 0.55)',
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
  },
  abilityDetailChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  abilityDetailChipTextActive: {
    color: '#7dd3fc',
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
    backgroundColor: UI_THEME.accentSky,
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
    backgroundColor: UI_THEME.panelBgSection,
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
    backgroundColor: UI_THEME.panelBgSection,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBgSection,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBorder,
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
  buildItemsRow: {
    marginTop: 10,
  },
  buildItemsRowLabel: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  buildItemsRowIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  buildRelicDivider: {
    width: 1,
    height: 44,
    backgroundColor: UI_THEME.panelBorder,
    marginHorizontal: 4,
  },
  itemSlot: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBorder,
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
    color: UI_THEME.accentSky,
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
    backgroundColor: UI_THEME.panelBgSection,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '88%',
    borderWidth: 2,
    borderColor: UI_THEME.accentSky,
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
    borderColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.accentSky,
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
  modalSubtitleLeft: {
    textAlign: 'left',
    marginBottom: 12,
    color: UI_THEME.textMuted,
  },
  recoveryCodeContainer: {
    backgroundColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.accentSky,
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
    borderColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.panelBgSection,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80vh',
    borderWidth: 2,
    borderColor: UI_THEME.accentSky,
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
    borderColor: UI_THEME.panelBorder,
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
    borderColor: UI_THEME.accentSky,
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
    backgroundColor: UI_THEME.panelBorder,
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
    backgroundColor: UI_THEME.accentSky,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: UI_THEME.panelBgSection,
  },
  godPickerSelectedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

