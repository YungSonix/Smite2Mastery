import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Pressable,
  Alert,
  PanResponder,
} from 'react-native';
import CryptoJS from 'crypto-js';
import { finalizeAppLogin, ensureAppWriteSession } from '../../lib/appAuth';
import { Image } from 'expo-image';
import { getLocalItemIcon, getLocalGodAsset, getRoleIcon } from '../localIcons';
import { useScreenDimensions } from '../../hooks/useScreenDimensions';
import { WEB_CONTENT_MAX_WIDTH, useWebLayout } from '../../lib/webLayout';
import { flattenBuildsGods } from '../../lib/normalizeBuildsGod';
import { resolveBuildCatalogItem, resolveBuildCatalogRelic } from '../../lib/buildCatalog';
import { parseItemGoldCost, formatItemGoldCost, getItemGoldCostParts, getBuildStatDisplayRows, getBaseStatsForGodAtLevel, computeTotalBuildStats } from '../../lib/buildStats';
import { getGodStanceOptions } from '../../lib/customBuildGodPassives';
import {
  getDiscordBotSharedBuildPayload,
  saveDiscordBotSharedBuildPayload,
} from '../../lib/discordBotSharedBuildSupabase';
import { GOLD_ICON, getStatIcon, itemHasActiveEffect, STAT_ICONS } from '../../lib/imageGrabber';
import ItemNameMeta from '../../lib/ItemNameMeta';
import ItemTooltipBody, { ItemTooltipCost } from '../../lib/ItemTooltipBody';
import TooltipDetailToggle from '../../lib/TooltipDetailToggle';
import { useItemTooltipDetail } from '../../hooks/useItemTooltipDetail';
import { useEphemeralTooltipDetail } from '../../hooks/useEphemeralTooltipDetail';
import {
  uiDropdownStyles,
} from '../../lib/uiDropdownStyles';
import { BeginnerHintBar } from '../../lib/BeginnerHintBar';
import { BuildStatChartModal } from '../../lib/BuildStatChart';
import { resolveChartIconUri } from '../../lib/buildStatChartConfig';
import { computeBuildProgressionSeries, optimizeItemOrder } from '../../lib/buildStatProgression';
import { loadBuildsGodsData, loadBuildsItemsData, getBuildsDataSync } from '../../lib/loadBuildsData';
import { getLiveDisplayName } from '../../lib/profileDisplayNameLive';

const IS_WEB = Platform.OS === 'web';

const BUILDER_ROLE_OPTIONS = ['Mid', 'Solo', 'ADC', 'Support', 'Jungle'];

function buildDefaultCommunityName(god, roles) {
  const godName = String(god?.name || god?.GodName || god?.title || 'God').trim();
  const rolePart = roles?.length > 0 ? ` — ${roles.slice(0, 4).join('/')}` : '';
  return `${godName}${rolePart} Build`;
}

/** Avoid repeating certification success logs when `checkCertificationStatus` runs on an interval */
const certifiedStatusLogOnce = new Set();

// Storage helper
const storage = {
  async getItem(key) {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async setItem(key, value) {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Ignore
    }
  },
  async removeItem(key) {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  },
};

const CUSTOM_BUILDER_PRESET_KEY = 'customBuilderPreset';

/** @deprecated local alias — prefer `resolveBuildCatalogItem` */
function resolveEquipRef(ref, catalog) {
  return resolveBuildCatalogItem(ref, catalog);
}

function resolveRelicRef(ref, relicCatalog) {
  return resolveBuildCatalogRelic(ref, relicCatalog);
}

async function persistCustomBuilderPresetObject(obj) {
  try {
    await storage.setItem(CUSTOM_BUILDER_PRESET_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('persist custom builder preset', e);
  }
}

/** Bump when default Morgan items change so stored presets can migrate. */
const CUSTOM_BUILDER_PRESET_VERSION = 2;

/** Lightweight refs — `applyBuildSnapshot` resolves to full items from `builds.json`. */
const DEFAULT_MORGAN_PRESET_ITEM_REFS = [
  { internalName: 'PendulumOfTheAges', name: 'Pendulum Of The Ages' },
  { internalName: 'EldritchOrb', name: 'Rod of Tahuti' },
  { internalName: 'EvolvedBookOfThoth', name: 'Evolved Book of Thoth' },
  { internalName: 'GemOfFocus', name: 'Gem of Focus' },
  { internalName: 'BalorsEye', name: 'Obsidian Shard' },
  { internalName: 'SoulDevourer', name: 'Soul Reaver' },
  { internalName: 'DivineRuin', name: 'Divine Ruin' },
];

/** First-open / empty preset: Morgan + sample full build (same internalNames as data). */
const DEFAULT_CUSTOM_BUILDER_PRESET = {
  _presetVersion: CUSTOM_BUILDER_PRESET_VERSION,
  godInternalName: 'MorganLeFay_Item',
  god: 'Morgan Le Fay',
  godLevel: 20,
  items: DEFAULT_MORGAN_PRESET_ITEM_REFS,
  startingItems: [],
};

function stripInternalItemSuffix(s) {
  return String(s || '').replace(/_item$/i, '');
}

function isMorganPresetGod(savedBuild) {
  if (!savedBuild) return false;
  const g = String(savedBuild.godInternalName || '').toLowerCase();
  if (stripInternalItemSuffix(g).replace(/[^a-z0-9]/g, '').includes('morganlefay')) return true;
  const n = String(savedBuild.god || '').toLowerCase();
  return n.includes('morgan') && n.includes('fay');
}

function countSnapshotItems(savedBuild) {
  if (!savedBuild?.items || !Array.isArray(savedBuild.items)) return 0;
  return savedBuild.items.filter(Boolean).length;
}

/** Older stored Morgan presets (god only) get default items; stamps `_presetVersion`. */
function maybeUpgradeMorganPresetItems(savedBuild) {
  if (!savedBuild) return { build: savedBuild, persist: false };
  const ver = Number(savedBuild._presetVersion) || 0;
  if (ver >= CUSTOM_BUILDER_PRESET_VERSION) {
    return { build: savedBuild, persist: false };
  }
  if (!isMorganPresetGod(savedBuild)) {
    return { build: savedBuild, persist: false };
  }
  const nItems = countSnapshotItems(savedBuild);
  if (nItems > 0) {
    return {
      build: { ...savedBuild, _presetVersion: CUSTOM_BUILDER_PRESET_VERSION },
      persist: true,
    };
  }
  return {
    build: {
      ...savedBuild,
      items: DEFAULT_MORGAN_PRESET_ITEM_REFS,
      _presetVersion: CUSTOM_BUILDER_PRESET_VERSION,
    },
    persist: true,
  };
}

function resolveGodFromSnapshot(godList, savedBuild) {
  if (!savedBuild || !Array.isArray(godList) || !godList.length) return null;
  const want = String(savedBuild.godInternalName || '').toLowerCase().trim();
  const wantName = String(savedBuild.god || '').toLowerCase().trim();
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (want) {
    let g = godList.find((x) => (x.internalName || '').toLowerCase() === want);
    if (g) return g;
    const w = stripInternalItemSuffix(want);
    g = godList.find((x) => stripInternalItemSuffix((x.internalName || '').toLowerCase()) === w);
    if (g) return g;
  }
  if (wantName) {
    return (
      godList.find((x) => {
        const n = (x.name || x.GodName || x.title || '').toString().toLowerCase().trim();
        return n === wantName || norm(n) === norm(wantName);
      }) || null
    );
  }
  return null;
}

export default function CustomBuildPage({
  onNavigateToGod,
  buildToEdit = null,
  onEditComplete = null,
  /** UUID from `/discord-build/[token]` — Supabase table `discord_bot_shared_builds` */
  botSharedDraftToken = null,
}) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  const { isWebDesktop, isWeb, width } = useWebLayout();
  /** Tablet + desktop web: multi-column builder (not mobile stack). */
  const isWebBuilderLayout = isWeb && width >= 768;
  /** Full desktop: build guide sits beside build panel. */
  const isWebBuilderSideGuide = isWebDesktop;
  /** Compact mobile slots — fit 3 per row on narrow screens. */
  const mobileBuildSlotLayout = useMemo(() => {
    if (isWebBuilderLayout) return null;
    const w = screenDimensions.width;
    const horizontalPad = IS_WEB ? 48 : 24;
    const gap = IS_WEB ? 14 : 6;
    const slot = Math.max(52, Math.min(72, Math.floor((w - horizontalPad - gap * 2) / 3)));
    const icon = Math.max(36, Math.min(44, Math.round(slot * 0.61)));
    return {
      slot: { width: slot, minWidth: slot, maxWidth: slot },
      btn: {
        aspectRatio: undefined,
        height: slot,
        minHeight: slot,
        maxHeight: slot,
        paddingTop: 4,
        paddingBottom: Math.max(12, slot - icon - 8),
        paddingHorizontal: 3,
        justifyContent: 'flex-start',
      },
      icon: { width: icon, height: icon },
      row3: { width: slot * 3 + gap * 2, maxWidth: '100%' },
      row2: { width: slot * 2 + gap, maxWidth: '100%' },
      gap,
    };
  }, [screenDimensions.width, isWebBuilderLayout]);
  const buildSlotButtonStyle = useMemo(
    () => [
      styles.compactSlotButton,
      IS_WEB ? styles.webBuildSlotButton : styles.nativeBuildSlotButton,
      mobileBuildSlotLayout?.btn,
    ],
    [mobileBuildSlotLayout]
  );
  const buildSlotWrapStyle = useMemo(
    () => [mobileBuildSlotLayout?.slot].filter(Boolean),
    [mobileBuildSlotLayout]
  );
  const itemInfoModalMaxHeight = Math.round(screenDimensions.height * 0.65);
  const [selectedItemInfo, setSelectedItemInfo] = useState(null); // { item, index } for info modal
  const [itemTooltipPreference] = useItemTooltipDetail();
  const itemInfoResetKey =
    selectedItemInfo?.item?.internalName ||
    selectedItemInfo?.item?.name ||
    selectedItemInfo?.index;
  const [itemTooltipDetail, setItemTooltipDetail] = useEphemeralTooltipDetail(
    selectedItemInfo !== null,
    itemTooltipPreference,
    itemInfoResetKey
  );
  const layoutGodRoleInline = isWebBuilderLayout || screenDimensions.width >= 640;
  const [localBuilds, setLocalBuilds] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedGod, setSelectedGod] = useState(null);
  const [godLevel, setGodLevel] = useState(20);
  const [godStance, setGodStance] = useState(null);
  const [selectedItems, setSelectedItems] = useState(Array(7).fill(null));
  const [startingItems, setStartingItems] = useState(Array(5).fill(null)); // 5 starting item slots
  const [startingRelic, setStartingRelic] = useState(null);
  const [finalRelic, setFinalRelic] = useState(null);
  /** 'starting' | 'final' | null — which relic slot the picker is for */
  const [relicPickerTarget, setRelicPickerTarget] = useState(null);
  const [aspectActive, setAspectActive] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]); // Array of selected roles (max 4)
  const [roleDropdownVisible, setRoleDropdownVisible] = useState(false);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  /** 'final' (required) | 'starting' (optional) — single build panel at a time */
  const [buildItemsView, setBuildItemsView] = useState('final');
  const [buildGuideExpanded, setBuildGuideExpanded] = useState(true);
  const [builderHintDismissed, setBuilderHintDismissed] = useState(false);
  const [showGodPicker, setShowGodPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(null); // Index of item slot
  const [selectedItemTooltip, setSelectedItemTooltip] = useState(null); // { item, itemName } for tooltip modal
  const [godSearchQuery, setGodSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [failedItemIcons, setFailedItemIcons] = useState({});
  const [selectedStat, setSelectedStat] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [statDropdownVisible, setStatDropdownVisible] = useState(false);
  const [tierDropdownVisible, setTierDropdownVisible] = useState(false);
  const [showSaveBuildModal, setShowSaveBuildModal] = useState(false);
  const [showLoadBuildModal, setShowLoadBuildModal] = useState(false);
  const [showPostToCommunityModal, setShowPostToCommunityModal] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [buildName, setBuildName] = useState('');
  const [communityBuildName, setCommunityBuildName] = useState('');
  const [isPostingToCommunity, setIsPostingToCommunity] = useState(false);
  const [selectedGamemodes, setSelectedGamemodes] = useState(['All Modes']); // Default to "All Modes"
  const [abilityLevelingOrder, setAbilityLevelingOrder] = useState([]); // Array of ability keys like ['A01', 'A02', 'A03']
  const [startingAbilityOrder, setStartingAbilityOrder] = useState(Array(5).fill(null)); // Array of 5 ability keys for first 5 levels
  /** 'starting' | 'max' — single section tabs for ability level UI */
  const [abilityOrderTab, setAbilityOrderTab] = useState('starting');
  /** 'tips' | 'swaps' — Build Tips & Notes sub-section */
  const [buildNotesTab, setBuildNotesTab] = useState('tips');
  /** Expandable total stats under Select God */
  const [godStatsExpanded, setGodStatsExpanded] = useState(false);
  const [buildTips, setBuildTips] = useState(['']); // Tips/notes array - allow multiple tips
  const [itemSwaps, setItemSwaps] = useState([]); // Array of { item: {name, icon}, reasoning: string }
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [currentSwapIndex, setCurrentSwapIndex] = useState(null); // For editing swaps
  const [swapItem, setSwapItem] = useState(null);
  const [swapReasoning, setSwapReasoning] = useState('');
  const [isUserCertified, setIsUserCertified] = useState(false); // Track if user is certified
  const [postAsDisplayName, setPostAsDisplayName] = useState('');
  const [showStartingAbilityPicker, setShowStartingAbilityPicker] = useState(false);
  const [currentStartingAbilityLevel, setCurrentStartingAbilityLevel] = useState(0); // 0-4 for levels 1-5
  const [showPostToCertifiedModal, setShowPostToCertifiedModal] = useState(false);
  const [certifiedBuildName, setCertifiedBuildName] = useState('');
  const [isPostingToCertified, setIsPostingToCertified] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStatChartModal, setShowStatChartModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [botDraftHydrating, setBotDraftHydrating] = useState(() => !!botSharedDraftToken);
  const [botDraftSavePending, setBotDraftSavePending] = useState(false);

  useEffect(() => {
    if (!IS_WEB || typeof window === 'undefined') return;
    setBuilderHintDismissed(window.localStorage.getItem('hint_custom_builder') === '1');
  }, []);

  useEffect(() => {
    if (isWebBuilderLayout) setGodStatsExpanded(true);
  }, [isWebBuilderLayout]);

  useEffect(() => {
    const opts = getGodStanceOptions(selectedGod);
    if (!opts) {
      setGodStance(null);
      return;
    }
    setGodStance((prev) =>
      prev && opts.stances.some((s) => s.id === prev) ? prev : opts.defaultStance
    );
  }, [selectedGod]);

  // Check certification status on mount and periodically
  useEffect(() => {
    if (botSharedDraftToken) return undefined;
    const checkCertificationStatus = async () => {
      try {
        const currentUser = await storage.getItem('currentUser');
        if (!currentUser) {
          setIsUserCertified(false);
          return;
        }
        
        // Check from Supabase
        try {
          const { supabase } = require('../../config/supabase');
          
          // First, check if user has any approved request (once approved, always approved)
          const { data: approvedData, error: approvedError } = await supabase
            .from('certification_requests')
            .select('status')
            .eq('username', currentUser)
            .eq('status', 'approved')
            .limit(1);
          
          // If user has an approved request, they're approved regardless of newer pending requests
          // Supabase returns an array, so check if array has items
          const hasApprovedRequest = !approvedError && approvedData && (
            (Array.isArray(approvedData) && approvedData.length > 0) || 
            (approvedData && approvedData.status === 'approved')
          );
          
          if (hasApprovedRequest) {
            setIsUserCertified(true);
            await storage.setItem(`certificationStatus_${currentUser}`, 'approved');
            if (!certifiedStatusLogOnce.has(currentUser)) {
              certifiedStatusLogOnce.add(currentUser);
              console.log('✅ User is certified (has approved request):', currentUser, 'data:', approvedData);
            }
            return;
          }
          
          // Otherwise, check the most recent request
          const { data, error } = await supabase
            .from('certification_requests')
            .select('status')
            .eq('username', currentUser)
            .order('requested_at', { ascending: false })
            .limit(1);
          
          // Handle both single() and array results
          let status = null;
          if (!error && data) {
            if (Array.isArray(data) && data.length > 0) {
              status = data[0].status;
            } else if (data && data.status) {
              status = data.status;
            }
          }
          
          if (status === 'approved') {
            setIsUserCertified(true);
            // Also save to local storage
            await storage.setItem(`certificationStatus_${currentUser}`, 'approved');
            if (!certifiedStatusLogOnce.has(currentUser)) {
              certifiedStatusLogOnce.add(currentUser);
              console.log('✅ User is certified:', currentUser);
            }
          } else {
            setIsUserCertified(false);
            // Update local storage with current status
            if (status) {
              await storage.setItem(`certificationStatus_${currentUser}`, status);
            }
            // Check local storage as fallback
            const cachedStatus = await storage.getItem(`certificationStatus_${currentUser}`);
            if (cachedStatus === 'approved') {
              setIsUserCertified(true);
            }
          }
        } catch (err) {
          console.error('Error checking certification in custombuild:', err);
          // Check local storage as fallback
          const cachedStatus = await storage.getItem(`certificationStatus_${currentUser}`);
          if (cachedStatus === 'approved') {
            setIsUserCertified(true);
          } else {
            setIsUserCertified(false);
          }
        }
      } catch (error) {
        console.error('Error checking certification status:', error);
      }
    };
    
    checkCertificationStatus();
    
    // Refresh certification status every 10 seconds (more frequent for faster updates)
    const interval = setInterval(checkCertificationStatus, 10000);

    return () => clearInterval(interval);
  }, [botSharedDraftToken]);
  
  // Randomizer state
  const [godRerolls, setGodRerolls] = useState(3);
  const [itemRerolls, setItemRerolls] = useState(3);
  
  // Slider state
  const [sliderTrackWidth, setSliderTrackWidth] = useState(300);
  const [sliderTrackLayout, setSliderTrackLayout] = useState({ x: 0, y: 0, width: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef(null);

  const itemsCatalogSyncedRef = useRef(false);
  const relicsCatalogSyncedRef = useRef(false);

  // Lazy load builds (items chunk first — small — then gods).
  useEffect(() => {
    let cancelled = false;
    const sync = getBuildsDataSync();
    if (sync?.gods && sync?.items) {
      setLocalBuilds(sync);
      setDataLoading(false);
      return undefined;
    }

    const mergeLocal = (part) => {
      setLocalBuilds((prev) => ({
        gods: part?.gods ?? prev?.gods ?? null,
        tierlist: part?.tierlist ?? prev?.tierlist ?? [],
        items: part?.items ?? prev?.items ?? null,
      }));
    };

    if (sync) {
      mergeLocal(sync);
      if (sync.gods && sync.items) {
        setDataLoading(false);
        return undefined;
      }
    }

    Promise.all([loadBuildsItemsData(), loadBuildsGodsData()])
      .then(([itemsPart, godsPart]) => {
        if (cancelled) return;
        mergeLocal({ ...godsPart, ...itemsPart });
        setDataLoading(false);
      })
      .catch(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load build data when editing
  useEffect(() => {
    if (buildToEdit && localBuilds) {
      // Find the god
      const allGods = flattenBuildsGods(localBuilds.gods);
      const godInternalName = buildToEdit.god?.internalName || buildToEdit.god?.GodName || buildToEdit.god?.name;
      if (godInternalName) {
        const god = allGods.find(g => {
          const gInternalName = (g.internalName || g.GodName || '').toLowerCase();
          return gInternalName === godInternalName.toLowerCase();
        });
        if (god) {
          setSelectedGod(god);
        }
      }

      // Load items
      if (buildToEdit.items && Array.isArray(buildToEdit.items)) {
        const itemsArray = [...buildToEdit.items];
        while (itemsArray.length < 7) {
          itemsArray.push(null);
        }
        setSelectedItems(itemsArray.slice(0, 7));
      }

      // Load starting items
      if (buildToEdit.startingItems && Array.isArray(buildToEdit.startingItems)) {
        const startingItemsArray = [...buildToEdit.startingItems];
        while (startingItemsArray.length < 5) {
          startingItemsArray.push(null);
        }
        setStartingItems(startingItemsArray.slice(0, 5));
      }

      const sr = buildToEdit.starting_relic || buildToEdit.startingRelic;
      const fr = buildToEdit.final_relic || buildToEdit.finalRelic;
      setStartingRelic(sr || null);
      setFinalRelic(fr || buildToEdit.relic || null);

      // Load roles
      if (buildToEdit.roles && Array.isArray(buildToEdit.roles)) {
        setSelectedRoles(buildToEdit.roles);
      }

      // Load ability leveling order
      if (buildToEdit.abilityLevelingOrder && Array.isArray(buildToEdit.abilityLevelingOrder)) {
        setAbilityLevelingOrder(buildToEdit.abilityLevelingOrder);
      }

      // Load starting ability order
      if (buildToEdit.startingAbilityOrder && Array.isArray(buildToEdit.startingAbilityOrder)) {
        const orderArray = [...buildToEdit.startingAbilityOrder];
        while (orderArray.length < 5) {
          orderArray.push(null);
        }
        setStartingAbilityOrder(orderArray.slice(0, 5));
      }

      // Load tips
      if (buildToEdit.tips) {
        const tipsArray = typeof buildToEdit.tips === 'string' 
          ? buildToEdit.tips.split('\n').filter(t => t.trim())
          : buildToEdit.tips;
        setBuildTips(tipsArray.length > 0 ? tipsArray : ['']);
      }

      // Load item swaps
      if (buildToEdit.itemSwaps && Array.isArray(buildToEdit.itemSwaps)) {
        setItemSwaps(buildToEdit.itemSwaps);
      }

      // Load gamemodes
      if (buildToEdit.gamemodes && Array.isArray(buildToEdit.gamemodes)) {
        setSelectedGamemodes(buildToEdit.gamemodes);
      }

      // Load god level and aspect
      if (buildToEdit.godLevel) {
        setGodLevel(buildToEdit.godLevel);
      }
      if (buildToEdit.aspectActive !== undefined) {
        setAspectActive(buildToEdit.aspectActive);
      }

      // Set build names - check multiple possible fields
      const buildName = buildToEdit.title || buildToEdit.build_name || buildToEdit.name || buildToEdit.notes || '';
      if (buildName) {
        if (buildToEdit.databaseCategory === 'contributor') {
          setCertifiedBuildName(buildName);
        } else if (buildToEdit.databaseCategory === 'community') {
          setCommunityBuildName(buildName);
        } else {
          // If no category specified, check databaseTable
          if (buildToEdit.databaseTable === 'contributor_builds') {
            setCertifiedBuildName(buildName);
          } else if (buildToEdit.databaseTable === 'community_builds') {
            setCommunityBuildName(buildName);
          }
        }
      }
    }
  }, [buildToEdit, localBuilds]);

  function flattenAny(a) {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
  }

  const gods = useMemo(
    () => (localBuilds ? flattenBuildsGods(localBuilds.gods) : []),
    [localBuilds]
  );
  const allItems = useMemo(
    () => (localBuilds ? flattenAny(localBuilds.items) : []),
    [localBuilds]
  );

  // Filter to only actual item objects
  const items = useMemo(() => {
    return allItems.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return (item.name || item.internalName || item.active === true);
    });
  }, [allItems]);

  // Filter relics
  const relics = useMemo(() => {
    return allItems.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return item.relic === true;
    });
  }, [allItems]);

  // One-time catalog sync when builds.json first becomes available.
  useEffect(() => {
    if (!items.length || itemsCatalogSyncedRef.current) return;
    itemsCatalogSyncedRef.current = true;
    setSelectedItems((prev) => prev.map((it) => (it ? resolveBuildCatalogItem(it, items) : null)));
    setStartingItems((prev) => prev.map((it) => (it ? resolveBuildCatalogItem(it, items) : null)));
  }, [items]);

  useEffect(() => {
    if (!relics.length || relicsCatalogSyncedRef.current) return;
    relicsCatalogSyncedRef.current = true;
    setStartingRelic((prev) => (prev ? resolveBuildCatalogRelic(prev, relics) : null));
    setFinalRelic((prev) => (prev ? resolveBuildCatalogRelic(prev, relics) : null));
  }, [relics]);

  const applyBuildSnapshot = useCallback(
    (savedBuild) => {
      if (!savedBuild || !localBuilds) return;
      const godList = flattenBuildsGods(localBuilds.gods);
      const god = resolveGodFromSnapshot(godList, savedBuild);
      if (god) setSelectedGod(god);
      if (savedBuild.items && Array.isArray(savedBuild.items)) {
        const itemsArray = savedBuild.items.map((r) => resolveEquipRef(r, items));
        while (itemsArray.length < 7) itemsArray.push(null);
        setSelectedItems(itemsArray.slice(0, 7));
      }
      if (savedBuild.startingItems && Array.isArray(savedBuild.startingItems)) {
        const startingItemsArray = savedBuild.startingItems.map((r) => resolveEquipRef(r, items));
        while (startingItemsArray.length < 5) startingItemsArray.push(null);
        setStartingItems(startingItemsArray.slice(0, 5));
      }
      if (savedBuild.roles && Array.isArray(savedBuild.roles)) {
        setSelectedRoles(savedBuild.roles);
      }
      if (savedBuild.abilityLevelingOrder && Array.isArray(savedBuild.abilityLevelingOrder)) {
        setAbilityLevelingOrder(savedBuild.abilityLevelingOrder);
      }
      if (savedBuild.startingAbilityOrder && Array.isArray(savedBuild.startingAbilityOrder)) {
        const orderArray = [...savedBuild.startingAbilityOrder];
        while (orderArray.length < 5) orderArray.push(null);
        setStartingAbilityOrder(orderArray.slice(0, 5));
      }
      if (savedBuild.godLevel != null && savedBuild.godLevel !== '') {
        const gl = Number(savedBuild.godLevel);
        if (Number.isFinite(gl)) setGodLevel(Math.min(20, Math.max(1, Math.round(gl))));
      }
      if (savedBuild.aspectActive !== undefined) {
        setAspectActive(savedBuild.aspectActive);
      }
      const sr = savedBuild.startingRelic || savedBuild.starting_relic;
      const fr = savedBuild.finalRelic || savedBuild.final_relic || savedBuild.relic;
      setStartingRelic(sr ? resolveRelicRef(sr, relics) : null);
      setFinalRelic(fr ? resolveRelicRef(fr, relics) : null);
      if (savedBuild.gamemodes && Array.isArray(savedBuild.gamemodes)) {
        setSelectedGamemodes(savedBuild.gamemodes);
      }
      if (savedBuild.tips !== undefined) {
        const tipsArray =
          typeof savedBuild.tips === 'string'
            ? savedBuild.tips.split('\n').filter((t) => t.trim())
            : savedBuild.tips;
        if (Array.isArray(tipsArray)) {
          setBuildTips(tipsArray.length > 0 ? tipsArray : ['']);
        }
      }
      if (savedBuild.itemSwaps && Array.isArray(savedBuild.itemSwaps)) {
        setItemSwaps(savedBuild.itemSwaps);
      }
    },
    [localBuilds, items, relics]
  );

  const customBuilderPresetHydratedRef = useRef(false);

  useEffect(() => {
    if (!localBuilds || buildToEdit) return;
    if (botSharedDraftToken) return;
    if (customBuilderPresetHydratedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const loadOneStr =
          IS_WEB && typeof window !== 'undefined' && window.localStorage
            ? window.localStorage.getItem('loadSavedBuild')
            : await storage.getItem('loadSavedBuild');
        let presetStr = null;
        if (!loadOneStr) {
          presetStr =
            IS_WEB && typeof window !== 'undefined' && window.localStorage
              ? window.localStorage.getItem(CUSTOM_BUILDER_PRESET_KEY)
              : await storage.getItem(CUSTOM_BUILDER_PRESET_KEY);
        }
        const rawStr = loadOneStr || presetStr;
        let savedBuild;
        let seededDefault = false;
        let presetMigrated = false;
        if (rawStr) {
          savedBuild = JSON.parse(rawStr);
          const up = maybeUpgradeMorganPresetItems(savedBuild);
          savedBuild = up.build;
          presetMigrated = up.persist;
        } else {
          savedBuild = {
            ...DEFAULT_CUSTOM_BUILDER_PRESET,
            items: DEFAULT_MORGAN_PRESET_ITEM_REFS.map((r) => ({ ...r })),
          };
          seededDefault = true;
        }
        if (cancelled) return;
        applyBuildSnapshot(savedBuild);
        if (!cancelled) {
          customBuilderPresetHydratedRef.current = true;
        }
        if (loadOneStr) {
          await persistCustomBuilderPresetObject(savedBuild);
          if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('loadSavedBuild');
          } else {
            await storage.removeItem('loadSavedBuild');
          }
        } else if (seededDefault || presetMigrated) {
          await persistCustomBuilderPresetObject(savedBuild);
        }
      } catch (e) {
        console.error('Error restoring custom builder preset:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localBuilds, buildToEdit, applyBuildSnapshot, botSharedDraftToken]);

  useEffect(() => {
    if (!botSharedDraftToken || !localBuilds || buildToEdit) return undefined;
    let cancelled = false;
    (async () => {
      setBotDraftHydrating(true);
      try {
        const { data, error } = await getDiscordBotSharedBuildPayload(botSharedDraftToken);
        if (cancelled) return;
        if (error) {
          console.warn('Discord bot draft fetch:', error?.message || error);
        } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          applyBuildSnapshot(data);
        }
      } catch (e) {
        if (!cancelled) console.warn('Discord bot draft fetch exception:', e);
      } finally {
        if (!cancelled) {
          customBuilderPresetHydratedRef.current = true;
          setBotDraftHydrating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [botSharedDraftToken, localBuilds, buildToEdit, applyBuildSnapshot]);

  useEffect(() => {
    if (buildToEdit) {
      customBuilderPresetHydratedRef.current = false;
    }
  }, [buildToEdit]);

  // Extract unique stats from items
  const availableStats = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    const statSet = new Set();
    items.forEach((item) => {
      if (item && item.stats && typeof item.stats === 'object') {
        Object.keys(item.stats).forEach((stat) => {
          if (stat === 'N/A' || stat === 'NA') return;
          statSet.add(stat);
        });
      }
    });
    return Array.from(statSet).sort();
  }, [items]);

  // Filter gods for picker
  const filteredGods = useMemo(() => {
    if (!godSearchQuery.trim()) return gods.slice(0, 50); // Limit initial display
    const query = godSearchQuery.toLowerCase();
    return gods.filter((god) => {
      const name = (god.name || god.GodName || god.title || god.displayName || '').toString().toLowerCase();
      return name.includes(query);
    });
  }, [gods, godSearchQuery]);

  // Filter items for picker
  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    let result = items;
    
    // Auto-filter for starter slots - only show starter items
    // Starter slot in build items (index 0) - only starter items
    if (showItemPicker === 0) {
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        return item.starter === true || (item.name && item.name.toLowerCase().includes('starter'));
      });
    }
    
    // Auto-filter by tier for starting items
    // If selecting for starter slot (index 100), only show starter items
    // If selecting for other starting slots (index 101-104), show tier 1 and tier 2 items
    if (showItemPicker !== null && showItemPicker >= 100 && showItemPicker < 105) {
      if (showItemPicker === 100) {
        // Starter slot in starting items - only starter items
        result = result.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          return item.starter === true || (item.name && item.name.toLowerCase().includes('starter'));
        });
      } else {
        // Other starting slots (101-104) - tier 1 and tier 2 items
        result = result.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          return item.tier === 1 || item.tier === 2;
        });
      }
    }
    
    // Apply stat filter
    if (selectedStat) {
      result = result.filter((item) => {
        if (!item || typeof item !== 'object' || !item.stats) return false;
        return item.stats.hasOwnProperty(selectedStat);
      });
    }
    
    // Apply tier filter (only if not already filtered by starting items)
    if (selectedTier && (showItemPicker === null || showItemPicker < 100 || showItemPicker >= 105)) {
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        
        if (selectedTier === 'Starter') {
          return item.starter === true || (item.name && item.name.toLowerCase().includes('starter'));
        } else if (selectedTier === 'Active') {
          return item.active === true && 
                 (item.tier || item.totalCost || (item.stats && Object.keys(item.stats).length > 0)) &&
                 (!item.stepCost || item.tier);
        } else if (selectedTier === 'Relic') {
          return item.relic === true;
        } else if (selectedTier === 'Consumable') {
          return item.consumable === true || 
                 (item.active === true && item.stepCost && !item.tier) ||
                 (item.name && item.name.toLowerCase().includes('consumable'));
        } else if (selectedTier === 'God Specific') {
          return item.godSpecific === true ||
                 (item.name && (
                   item.name.toLowerCase().includes('aladdinslamp') || 
                   item.name.toLowerCase().includes('baron') ||
                   item.name.toLowerCase().includes('alternator mod') ||
                   item.name.toLowerCase().includes('dual mod') ||
                   item.name.toLowerCase().includes('effeciency mod') ||
                   item.name.toLowerCase().includes('resonator mod') ||
                   item.name.toLowerCase().includes('thermal mod') ||
                   item.name.toLowerCase().includes('shrapnel mod') ||
                   item.name.toLowerCase().includes('masterwork mod') ||
                   item.name.toLowerCase().includes('surplus mod') ||
                   item.name.toLowerCase().includes('seismic mod')
                 ));
        } else if (selectedTier === 'Tier 1' || selectedTier === 'Tier 2' || selectedTier === 'Tier 3') {
          const tierNum = selectedTier === 'Tier 1' ? 1 : selectedTier === 'Tier 2' ? 2 : 3;
          return item.tier === tierNum;
        }
        return true;
      });
    }
    
    // Apply search filter
    if (itemSearchQuery && itemSearchQuery.trim().length > 0) {
      const query = itemSearchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        const name = (item.name || item.internalName || '').toString().toLowerCase();
        return name.includes(query);
      });
    } else {
      // Limit initial display when no search
      result = result.slice(0, 100);
    }
    
    return result;
  }, [items, itemSearchQuery, selectedStat, selectedTier, showItemPicker]);

  // Handle slider movement for both web and mobile
  const handleSliderMove = useCallback((event) => {
    const nativeEvent = event.nativeEvent;
    if (sliderTrackWidth > 0 && sliderTrackRef.current) {
      let locationX;
      if (IS_WEB) {
        locationX = nativeEvent?.locationX;
        if (locationX === undefined || locationX === null || locationX < 0 || locationX > sliderTrackWidth) {
          const clientX = nativeEvent?.clientX ?? nativeEvent?.touches?.[0]?.clientX ?? nativeEvent?.changedTouches?.[0]?.clientX ?? nativeEvent?.pageX ?? 0;
          try {
            const element = sliderTrackRef.current;
            if (element && typeof element.getBoundingClientRect === 'function') {
              const rect = element.getBoundingClientRect();
              locationX = clientX - rect.left;
            } else if (sliderTrackLayout.x > 0) {
              locationX = clientX - sliderTrackLayout.x;
            } else {
              const pageX = nativeEvent?.pageX ?? nativeEvent?.touches?.[0]?.pageX ?? nativeEvent?.changedTouches?.[0]?.pageX ?? 0;
              locationX = pageX - (sliderTrackLayout.x || 0);
            }
          } catch (e) {
            const pageX = nativeEvent?.pageX ?? nativeEvent?.touches?.[0]?.pageX ?? nativeEvent?.changedTouches?.[0]?.pageX ?? 0;
            locationX = pageX - (sliderTrackLayout.x || 0);
          }
        }
        locationX = Math.max(0, Math.min(sliderTrackWidth, locationX));
      } else {
        if (nativeEvent?.locationX !== undefined && nativeEvent?.locationX !== null && nativeEvent.locationX >= 0) {
          locationX = nativeEvent.locationX;
        } else if (nativeEvent?.touches && nativeEvent.touches.length > 0) {
          const touch = nativeEvent.touches[0];
          if (touch && sliderTrackRef.current) {
            try {
              if (sliderTrackLayout.x > 0) {
                locationX = touch.pageX - sliderTrackLayout.x;
              } else {
                locationX = nativeEvent?.locationX ?? (touch.pageX % sliderTrackWidth);
              }
            } catch (e) {
              locationX = nativeEvent?.locationX ?? 0;
            }
          } else {
            locationX = nativeEvent?.locationX ?? 0;
          }
        } else {
          locationX = nativeEvent?.locationX ?? 0;
        }
        locationX = Math.max(0, Math.min(sliderTrackWidth, locationX));
      }
      const percentage = Math.max(0, Math.min(1, locationX / sliderTrackWidth));
      const newLevel = 1 + percentage * 19;
      setGodLevel(Math.max(1, Math.min(20, newLevel)));
    }
  }, [sliderTrackWidth, sliderTrackLayout, IS_WEB]);

  const applyGodLevelFromWebClientX = useCallback(
    (clientX) => {
      if (!sliderTrackRef.current || sliderTrackWidth <= 0) return;
      try {
        const el = sliderTrackRef.current;
        const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
        if (!rect) return;
        const x = Math.max(0, Math.min(sliderTrackWidth, clientX - rect.left));
        const pct = Math.max(0, Math.min(1, x / sliderTrackWidth));
        setGodLevel(Math.max(1, Math.min(20, 1 + pct * 19)));
      } catch (_) {
        /* ignore */
      }
    },
    [sliderTrackWidth]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !IS_WEB) return;
      e.preventDefault();
      e.stopPropagation();
      applyGodLevelFromWebClientX(e.clientX);
    },
    [isDragging, IS_WEB, applyGodLevelFromWebClientX]
  );

  const handleMouseUp = useCallback(() => {
    if (IS_WEB && isDragging) {
      setIsDragging(false);
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    }
  }, [isDragging, IS_WEB, handleMouseMove]);

  useEffect(() => {
    if (IS_WEB && isDragging) {
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }
  }, [isDragging, IS_WEB, handleMouseMove, handleMouseUp]);

  const baseStats = useMemo(() => {
    if (!selectedGod) return {};
    return getBaseStatsForGodAtLevel(selectedGod, godLevel);
  }, [selectedGod, godLevel]);

  /** Final slots resolved against `builds.json` — stats never use stale embedded item copies. */
  const resolvedFinalItems = useMemo(
    () => selectedItems.map((it) => (it ? resolveBuildCatalogItem(it, items) : null)),
    [selectedItems, items]
  );

  const resolvedStartingItems = useMemo(
    () => startingItems.map((it) => (it ? resolveBuildCatalogItem(it, items) : null)),
    [startingItems, items]
  );

  /** Starters + final relic (e.g. Bumba's, Aladdin's Lamp) stay in stat totals. */
  const equippedItemsForStats = useMemo(() => {
    const list = [...resolvedStartingItems, ...resolvedFinalItems].filter(Boolean);
    const relic = finalRelic ? resolveBuildCatalogRelic(finalRelic, relics) : null;
    if (relic) list.push(relic);
    return list;
  }, [resolvedStartingItems, resolvedFinalItems, finalRelic, relics]);

  const godStanceOptions = useMemo(() => getGodStanceOptions(selectedGod), [selectedGod]);

  const buildStatsResult = useMemo(() => {
    if (!selectedGod) return { totalStats: {} };
    return computeTotalBuildStats(selectedGod, godLevel, equippedItemsForStats, { godStance });
  }, [selectedGod, godLevel, equippedItemsForStats, godStance]);

  const totalStats = buildStatsResult.totalStats;

  const statProgression = useMemo(() => {
    if (!selectedGod) return [];
    return computeBuildProgressionSeries(
      selectedGod,
      godLevel,
      resolvedFinalItems.filter(Boolean),
      resolvedStartingItems.filter(Boolean),
      { godStance }
    );
  }, [selectedGod, godLevel, resolvedFinalItems, resolvedStartingItems, godStance]);

  // Build header gold: final slots + relics only (starting items are free for display)
  const totalGold = useMemo(() => {
    let sum = 0;
    selectedItems.forEach((item) => {
      sum += parseItemGoldCost(item);
    });
    sum += parseItemGoldCost(startingRelic);
    sum += parseItemGoldCost(finalRelic);
    return sum;
  }, [selectedItems, startingRelic, finalRelic]);

  const selectItem = (item, index) => {
    // Check if this is for a swap (index 999)
    if (index === 999) {
      setSwapItem(resolveBuildCatalogItem(item, items));
      setShowItemPicker(null);
      setItemSearchQuery('');
      setSelectedStat(null);
      setSelectedTier(null);
      // Keep swap modal open
      return;
    }
    // Check if this is a starting item (index >= 100)
    if (index >= 100) {
      const startingIndex = index - 100;
      const newStartingItems = [...startingItems];
      newStartingItems[startingIndex] = resolveBuildCatalogItem(item, items);
      setStartingItems(newStartingItems);
    } else {
      const newItems = [...selectedItems];
      newItems[index] = resolveBuildCatalogItem(item, items);
      setSelectedItems(newItems);
    }
    setShowItemPicker(null);
    setItemSearchQuery('');
  };

  const removeItem = (index) => {
    // Check if this is a starting item (index >= 100)
    if (index >= 100) {
      const startingIndex = index - 100;
      const newStartingItems = [...startingItems];
      newStartingItems[startingIndex] = null;
      setStartingItems(newStartingItems);
    } else {
      const newItems = [...selectedItems];
      newItems[index] = null;
      setSelectedItems(newItems);
    }
    setSelectedItemInfo(null);
  };

  const clearAllBuildItemsAndRelics = useCallback(() => {
    setStartingItems(Array(5).fill(null));
    setSelectedItems(Array(7).fill(null));
    setStartingRelic(null);
    setFinalRelic(null);
    setSelectedItemInfo(null);
  }, []);

  const updateGodLevelFromTrackX = useCallback(
    (locationX) => {
      const w = sliderTrackWidth;
      if (!w || w <= 0) return;
      const pct = Math.max(0, Math.min(1, locationX / w));
      setGodLevel(Math.max(1, Math.min(20, 1 + pct * 19)));
    },
    [sliderTrackWidth]
  );

  const godLevelTrackPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          updateGodLevelFromTrackX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateGodLevelFromTrackX(evt.nativeEvent.locationX);
        },
      }),
    [updateGodLevelFromTrackX]
  );

  const showItemInfo = (item, index) => {
    setSelectedItemInfo({ item, index });
  };

  const changeItem = () => {
    if (selectedItemInfo) {
      setShowItemPicker(selectedItemInfo.index);
      setSelectedItemInfo(null);
    }
  };

  const godName = selectedGod ? (selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName || 'Unknown') : 'Select God';
  const godIcon = selectedGod && (selectedGod.icon || selectedGod.GodIcon || (selectedGod.abilities && selectedGod.abilities.A01 && selectedGod.abilities.A01.icon));

  const godPortraitUri = useMemo(() => {
    if (!godIcon) return null;
    return resolveChartIconUri(getLocalGodAsset(godIcon));
  }, [godIcon]);

  const getStepIconUri = useCallback((step) => {
    if (!step?.itemIcon && !step?.itemInternalName) return null;
    return resolveChartIconUri(
      getLocalItemIcon(step.itemIcon, { internalName: step.itemInternalName })
    );
  }, []);

  const applyOptimizedItemOrder = useCallback((orderedEquipped) => {
    if (!Array.isArray(orderedEquipped)) return;
    let orderIdx = 0;
    setSelectedItems((prev) =>
      prev.map((slot, index) => {
        // Starter slot (S row) stays fixed — first curve step after Base.
        if (index === 0) {
          if (slot) orderIdx = 1;
          return slot;
        }
        if (!slot) return null;
        const next = orderedEquipped[orderIdx];
        orderIdx += 1;
        return next ?? slot;
      })
    );
  }, []);

  /** Shared item icon for build slots (full-size or compact side-by-side layout). */
  const renderItemIconOnly = (item, iconKey, compact, relicCompactSlot = false) => {
    if (!item) return null;
    const useRelicMobile = relicCompactSlot && compact && !IS_WEB;
    const useFixedBuildIcon = compact;
    const mobileIconOverride =
      useFixedBuildIcon && mobileBuildSlotLayout?.icon ? mobileBuildSlotLayout.icon : null;
    const iconStyle = compact
      ? useRelicMobile
        ? styles.compactRelicSlotIcon
        : useFixedBuildIcon
          ? [styles.buildSlotIcon, mobileIconOverride]
          : styles.compactItemIcon
      : styles.itemIcon;
    const phStyle = compact
      ? useRelicMobile
        ? styles.compactRelicSlotPh
        : useFixedBuildIcon
          ? [styles.buildSlotIconPh, mobileIconOverride]
          : styles.compactItemPh
      : styles.itemIconPlaceholder;
    const phTextStyle = compact ? styles.compactItemPhText : styles.itemIconPlaceholderText;
    const localIcon = getLocalItemIcon(item.icon || item.internalName);
    if (!localIcon) {
      return (
        <View style={phStyle}>
          <Text style={phTextStyle}>?</Text>
        </View>
      );
    }
    const imageSource = localIcon.primary || localIcon;
    const fallbackSource = localIcon.fallback;
    const useFallback = failedItemIcons[iconKey];
    if (fallbackSource && !useFallback) {
      return (
        <Image
          source={imageSource}
          style={iconStyle}
          resizeMode={useFixedBuildIcon ? 'contain' : 'cover'}
          onError={() => {
            setFailedItemIcons((prev) => ({ ...prev, [iconKey]: true }));
          }}
        />
      );
    }
    if (fallbackSource && useFallback) {
      return (
        <Image
          source={fallbackSource}
          style={iconStyle}
          resizeMode={useFixedBuildIcon ? 'contain' : 'cover'}
        />
      );
    }
    return (
      <Image
        source={imageSource}
        style={iconStyle}
        resizeMode={useFixedBuildIcon ? 'contain' : 'cover'}
      />
    );
  };

  const relicToPayload = (r) =>
    r ? { name: r.name || r.internalName, internalName: r.internalName, icon: r.icon } : null;

  // Stat display names
  const statDisplayNames = {
    BasicDamage: 'Attack Damage',
    health: 'Health',
    mana: 'Mana',
    physicalProtection: 'Physical Protection',
    magicalProtection: 'Magical Protection',
    physicalPower: 'Physical Power',
    magicalPower: 'Magical Power',
    attackSpeed: 'Attack Speed',
    AttackSpeedEffective: 'Attack Speed',
    movementSpeed: 'Movement Speed',
    healthRegen: 'HP5',
    manaRegen: 'MP5',
    penetration: 'Penetration',
    Penetration: 'Penetration',
    'Flat Penetration': 'Penetration',
    lifesteal: 'Lifesteal',
    cooldownReduction: 'Cooldown Reduction',
    critChance: 'Critical Strike Chance',
    PercentMagicalPenetration: '% Magical Penetration',
    PercentPhysicalPenetration: '% Physical Penetration',
    Pathfinding: 'Pathfinding',
    Plating: 'Plating',
    Dampening: 'Dampening',
    Tenacity: 'Tenacity',
    Echo: 'Echo',
  };

  const renderStatIcon = (statKey, displayName, style) => {
    const src = getStatIcon(statKey, displayName);
    if (!src) return null;
    return (
      <Image
        source={src}
        style={style || styles.statRowIcon}
        contentFit="contain"
        accessibilityLabel={displayName || statKey}
      />
    );
  };

  const renderGoldCostRow = (item, textStyle, iconStyle) => {
    const goldParts = getItemGoldCostParts(item);
    return (
      <View style={styles.itemGoldCostRow}>
        {!goldParts.isFree ? (
          <Image
            source={GOLD_ICON}
            style={iconStyle || styles.itemGoldCostIcon}
            contentFit="contain"
            accessibilityLabel="Gold"
          />
        ) : null}
        <Text style={textStyle}>
          {goldParts.isFree ? goldParts.label : `${goldParts.label} Gold`}
        </Text>
      </View>
    );
  };

  const renderItemEffectIcon = (item) => {
    if (itemHasActiveEffect(item)) {
      return (
        <Image
          source={STAT_ICONS.Active}
          style={styles.itemPickerActiveIcon}
          contentFit="contain"
          accessibilityLabel="Active item"
        />
      );
    }
    if (item?.passive) {
      return (
        <Image
          source={STAT_ICONS.Passive}
          style={styles.itemPickerActiveIcon}
          contentFit="contain"
          accessibilityLabel="Passive item"
        />
      );
    }
    return null;
  };

  const renderTotalStatsGrid = () =>
    getBuildStatDisplayRows(totalStats, baseStats).map((row) => (
      <View key={row.key} style={[styles.statItem, isWebBuilderLayout && styles.statItemDesktop]}>
        <View style={styles.statLabelRow}>
          {renderStatIcon(row.key.replace(/^__.*__$/, 'Penetration'), row.label)}
          <Text
            style={[styles.statLabel, isWebBuilderLayout && styles.statLabelDesktop, { color: row.color }]}
            numberOfLines={isWebBuilderLayout ? 2 : 1}
          >
            {row.label}
          </Text>
        </View>
        <Text style={[styles.statValue, isWebBuilderLayout && styles.statValueDesktop, { color: row.color }]}>
          {row.value}
        </Text>
      </View>
    ));

  const renderGodRoleSection = () => (
    <>
      <View style={styles.godRoleSectionHeader}>
        <View style={styles.godRoleSectionHeaderText}>
          <Text style={[styles.sectionTitle, isWebBuilderLayout && styles.sectionTitleCompact, styles.godRoleSectionTitle]}>
            Select God / Role
          </Text>
          {selectedGod ? (
            <Text style={styles.godRoleSubtitle} numberOfLines={2}>
              Select up to 4 roles this build can be played in
            </Text>
          ) : null}
        </View>
        {selectedGod && !botSharedDraftToken ? renderPostActionsMenu() : null}
      </View>
      <View style={styles.godRoleBlock}>
        <View
          style={[
            styles.godSelectorContainer,
            selectedGod && layoutGodRoleInline && styles.godSelectorContainerInline,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.godSelector,
              selectedGod && layoutGodRoleInline && styles.godSelectorWhenInline,
            ]}
            onPress={() => setShowGodPicker(true)}
            activeOpacity={0.7}
          >
            {godIcon ? (
              <Image
                source={getLocalGodAsset(godIcon)}
                style={styles.godIcon}
                resizeMode="cover"
                accessibilityLabel={selectedGod ? `${selectedGod.name || selectedGod.GodName || 'God'} icon` : 'God icon'}
              />
            ) : (
              <View style={styles.godIconPlaceholder}>
                <Text style={styles.godIconPlaceholderText}>?</Text>
              </View>
            )}
            <Text style={styles.godNameText}>{godName}</Text>
          </TouchableOpacity>
          {selectedGod && selectedGod.aspect && (
            <TouchableOpacity
              style={[
                styles.aspectSlotButton,
                aspectActive && styles.aspectSlotButtonActive,
              ]}
              onPress={() => setAspectActive(!aspectActive)}
              activeOpacity={0.7}
            >
              {(() => {
                const aspectIcon = selectedGod.aspect.icon;
                if (aspectIcon) {
                  const localIcon = getLocalGodAsset(aspectIcon);
                  if (localIcon) {
                    return (
                      <Image
                        source={localIcon}
                        style={styles.aspectSlotIcon}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    );
                  }
                }
        return (
                  <View style={styles.aspectSlotIconPlaceholder}>
                    <Text style={styles.aspectSlotIconPlaceholderText}>A</Text>
                  </View>
                );
              })()}
              <Text style={styles.aspectSlotLabel}>Aspect</Text>
              {aspectActive && (
                <View style={styles.aspectActiveIndicatorSmall}>
                  <Text style={styles.aspectActiveTextSmall}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
        {selectedGod ? renderRoleDropdown() : null}
      </View>
    </>
  );

  const renderLevelSlider = () => (
    <View style={[styles.statsEmbedLevelBlock, isWebBuilderLayout && styles.statsEmbedLevelBlockDesktop]}>
      <Text style={[styles.statsEmbedLevelHeading, isWebBuilderLayout && styles.statsEmbedLevelHeadingDesktop]}>
        Base level (1-20) — drag track or use +/−
            </Text>
      <View style={styles.statsEmbedLevelRow}>
        <TouchableOpacity
          style={[
            styles.statsEmbedLevelBtn,
            Math.round(godLevel) <= 1 && styles.statsEmbedLevelBtnDisabled,
          ]}
          onPress={() => setGodLevel((g) => Math.max(1, Math.round(g) - 1))}
          disabled={Math.round(godLevel) <= 1}
          activeOpacity={0.7}
        >
          <Text style={styles.statsEmbedLevelBtnText}>−</Text>
        </TouchableOpacity>
        <View
          ref={sliderTrackRef}
          style={styles.statsEmbedSliderHit}
          onLayout={(e) => setSliderTrackWidth(e.nativeEvent.layout.width)}
          {...(!IS_WEB ? godLevelTrackPan.panHandlers : {})}
          {...(IS_WEB
            ? {
                onMouseDown: (e) => {
                  e.preventDefault?.();
                  applyGodLevelFromWebClientX(e.clientX);
                  setIsDragging(true);
                },
              }
            : {})}
        >
          <View style={styles.statsEmbedSliderRail} pointerEvents="none">
            <View
              style={[
                styles.statsEmbedSliderFill,
                { width: `${((godLevel - 1) / 19) * 100}%` },
              ]}
            />
            <View
              style={[
                styles.statsEmbedSliderThumb,
                { left: `${((godLevel - 1) / 19) * 100}%` },
              ]}
            />
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.statsEmbedLevelBtn,
            Math.round(godLevel) >= 20 && styles.statsEmbedLevelBtnDisabled,
          ]}
          onPress={() => setGodLevel((g) => Math.min(20, Math.round(g) + 1))}
          disabled={Math.round(godLevel) >= 20}
          activeOpacity={0.7}
        >
          <Text style={styles.statsEmbedLevelBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatChartGraphButton = (disabled = false) => {
    const canOpen = !disabled && statProgression.length >= 2;
    return (
      <TouchableOpacity
        style={[styles.statChartGraphBtn, !canOpen && styles.statChartGraphBtnDisabled]}
        onPress={() => canOpen && setShowStatChartModal(true)}
        disabled={!canOpen}
        activeOpacity={0.85}
        accessibilityLabel="Open stat chart"
        accessibilityRole="button"
      >
        <View style={styles.statChartGraphIcon} pointerEvents="none">
          <View style={[styles.statChartGraphBar, { height: 5 }]} />
          <View style={[styles.statChartGraphBar, { height: 9 }]} />
          <View style={[styles.statChartGraphBar, { height: 12 }]} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderStanceSwitcher = () => {
    if (!godStanceOptions || godStanceOptions.stances.length < 2) return null;
    return (
      <View style={[styles.stanceSwitcherBlock, isWebBuilderLayout && styles.stanceSwitcherBlockDesktop]}>
        <Text style={styles.stanceSwitcherLabel}>Stance</Text>
        <View style={styles.stanceSwitcherRow}>
          {godStanceOptions.stances.map((stance) => {
            const active = godStance === stance.id;
            return (
              <TouchableOpacity
                key={stance.id}
                style={[styles.stanceSwitcherBtn, active && styles.stanceSwitcherBtnActive]}
                onPress={() => setGodStance(stance.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.stanceSwitcherBtnText, active && styles.stanceSwitcherBtnTextActive]}>
                  {stance.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStatsSection = () => {
    if (!selectedGod) {
      if (isWebBuilderLayout) {
        return (
          <View style={styles.desktopStatsPlaceholder}>
            <Text style={styles.desktopStatsPlaceholderTitle}>Total stats</Text>
            <Text style={styles.desktopStatsPlaceholderText}>Pick a god to preview level 20 stats here.</Text>
          </View>
        );
      }
      return null;
    }

    if (isWebBuilderLayout) {
        return (
        <View style={[styles.godStatsExpandableWrap, styles.desktopStatsPanel]}>
          <View style={styles.desktopStatsHeaderRow}>
            <Text style={styles.godStatsExpandHeaderTitle}>Total stats</Text>
            {renderStatChartGraphButton()}
            <Text style={styles.godStatsExpandHeaderMeta}>Lv {Math.round(godLevel)}</Text>
          </View>
          {renderLevelSlider()}
          {renderStanceSwitcher()}
          <View style={[styles.statsGrid, styles.statsGridDesktop]}>{renderTotalStatsGrid()}</View>
          </View>
        );
      }

      return (
      <View style={styles.godStatsExpandableWrap}>
        <TouchableOpacity
          style={styles.godStatsExpandHeader}
          onPress={() => setGodStatsExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.godStatsExpandHeaderTitleWrap}>
            <Text style={styles.godStatsExpandHeaderTitle}>Total stats</Text>
            {renderStatChartGraphButton()}
            <Text style={styles.godStatsExpandHeaderMeta}> Lv {Math.round(godLevel)}</Text>
          </View>
          <Text style={styles.godStatsExpandChevron}>{godStatsExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {godStatsExpanded ? (
          <View style={styles.statsExpandedBody}>
            {renderLevelSlider()}
            {renderStanceSwitcher()}
            <View style={styles.statsGrid}>{renderTotalStatsGrid()}</View>
          </View>
        ) : null}
        </View>
      );
  };

  const renderBuildGuideSection = () => (
    <>
      <TouchableOpacity
        style={[styles.godStatsExpandHeader, isWebBuilderLayout && styles.buildGuideHeaderCompact]}
        onPress={() => setBuildGuideExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.godStatsExpandHeaderTitleWrap}>
          <Text style={[styles.godStatsExpandHeaderTitle, isWebBuilderLayout && styles.godStatsExpandHeaderTitleCompact]}>
            Build guide (optional)
          </Text>
          {!isWebBuilderLayout ? (
            <Text style={styles.buildGuideHeaderHint}>
              Ability order, tips, and item swaps
            </Text>
          ) : null}
        </View>
        <Text style={styles.godStatsExpandChevron}>{buildGuideExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {buildGuideExpanded ? (
        <View style={[styles.buildGuideBody, isWebBuilderLayout && styles.buildGuideBodyDesktop]}>
      {selectedGod.abilities ? (
        <>
            <Text style={[styles.buildGuideSubTitle, isWebBuilderLayout && styles.buildGuideSubTitleDesktop]}>Ability leveling</Text>
            <View style={[styles.abilityOrderTabRow, isWebBuilderLayout && styles.abilityOrderTabRowDesktop]}>
        <TouchableOpacity
                style={[styles.abilityOrderTab, isWebBuilderLayout && styles.abilityOrderTabDesktop, abilityOrderTab === 'starting' && styles.abilityOrderTabActive]}
          onPress={() => setAbilityOrderTab('starting')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.abilityOrderTabText,
              abilityOrderTab === 'starting' && styles.abilityOrderTabTextActive,
            ]}
          >
            Starting (1-5)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
                style={[styles.abilityOrderTab, isWebBuilderLayout && styles.abilityOrderTabDesktop, abilityOrderTab === 'max' && styles.abilityOrderTabActive]}
          onPress={() => setAbilityOrderTab('max')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.abilityOrderTabText,
              abilityOrderTab === 'max' && styles.abilityOrderTabTextActive,
            ]}
          >
            Max order
          </Text>
        </TouchableOpacity>
      </View>
      {abilityOrderTab === 'starting' ? (
        <>
          {!isWebBuilderLayout ? (
          <Text style={[styles.sectionSubtitle, isWebBuilderLayout && styles.sectionSubtitleDesktop]}>
            Select which ability to level at each of the first 5 levels
          </Text>
          ) : null}
                <View style={[styles.startingAbilityOrderContainer, isWebBuilderLayout && styles.startingAbilityOrderContainerDesktop]}>
            {[1, 2, 3, 4, 5].map((level) => {
              const abilityKey = startingAbilityOrder[level - 1];
              const ability = abilityKey ? selectedGod.abilities[abilityKey] : null;
              return (
                      <View key={level} style={[styles.startingAbilityLevelSlot, isWebBuilderLayout && styles.startingAbilityLevelSlotDesktop]}>
                  <Text style={[styles.startingAbilityLevelLabel, isWebBuilderLayout && styles.startingAbilityLevelLabelDesktop]}>Level {level}</Text>
                  <TouchableOpacity
                    style={[
                      styles.startingAbilitySlotButton,
                      isWebBuilderLayout && styles.startingAbilitySlotButtonDesktop,
                      ability && styles.startingAbilitySlotButtonSelected,
                    ]}
                    onPress={() => {
                      setCurrentStartingAbilityLevel(level - 1);
                      setShowStartingAbilityPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    {ability ? (
                      <>
                        {ability.icon && (
                          <Image
                            source={getLocalGodAsset(ability.icon)}
                            style={[styles.startingAbilityIcon, isWebBuilderLayout && styles.startingAbilityIconDesktop]}
                            resizeMode="cover"
                          />
                        )}
                        <Text style={styles.startingAbilityName} numberOfLines={1}>
                          {!isWebBuilderLayout ? (ability.name || abilityKey) : null}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={[styles.startingAbilityIconPlaceholder, isWebBuilderLayout && styles.startingAbilityIconPlaceholderDesktop]}>
                          <Text style={styles.startingAbilityIconPlaceholderText}>?</Text>
                        </View>
                        <Text style={[styles.startingAbilityPlaceholderText, isWebBuilderLayout && styles.startingAbilityPlaceholderTextDesktop]}>Select</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          {startingAbilityOrder.some((a) => a !== null) && (
            <TouchableOpacity
              style={[styles.clearAbilityOrderButton, isWebBuilderLayout && styles.clearAbilityOrderButtonDesktop]}
              onPress={() => setStartingAbilityOrder(Array(5).fill(null))}
            >
              <Text style={[styles.clearAbilityOrderText, isWebBuilderLayout && styles.clearAbilityOrderTextDesktop]}>Clear Order</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          {!isWebBuilderLayout ? (
          <Text style={[styles.sectionSubtitle, isWebBuilderLayout && styles.sectionSubtitleDesktop]}>
            Tap abilities in the order you want to level them
          </Text>
          ) : null}
          <View style={[styles.abilityLevelingContainerSingleRow, isWebBuilderLayout && styles.abilityLevelingContainerSingleRowDesktop]}>
            {Object.keys(selectedGod.abilities).map((abilityKey) => {
              const ability = selectedGod.abilities[abilityKey];
              const orderIndex = abilityLevelingOrder.indexOf(abilityKey);
              const isSelected = orderIndex !== -1;
              return (
                <TouchableOpacity
                  key={abilityKey}
                  style={[
                    styles.abilityLevelingButtonSmall,
                    isWebBuilderLayout && styles.abilityLevelingButtonSmallDesktop,
                    isSelected && styles.abilityLevelingButtonSelected,
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setAbilityLevelingOrder((prev) => prev.filter((k) => k !== abilityKey));
                    } else {
                      setAbilityLevelingOrder((prev) => [...prev, abilityKey]);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {ability.icon && (
                    <Image
                      source={getLocalGodAsset(ability.icon)}
                      style={[styles.abilityLevelingIconSmall, isWebBuilderLayout && styles.abilityLevelingIconSmallDesktop]}
                      resizeMode="cover"
                    />
                  )}
                  {isSelected && (
                    <View style={styles.abilityLevelingOrderBadgeSmall}>
                      <Text style={styles.abilityLevelingOrderTextSmall}>{orderIndex + 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {abilityLevelingOrder.length > 0 && (
            <TouchableOpacity
              style={[styles.clearAbilityOrderButton, isWebBuilderLayout && styles.clearAbilityOrderButtonDesktop]}
              onPress={() => setAbilityLevelingOrder([])}
            >
              <Text style={[styles.clearAbilityOrderText, isWebBuilderLayout && styles.clearAbilityOrderTextDesktop]}>Clear Order</Text>
            </TouchableOpacity>
          )}
        </>
      )}
        </>
      ) : null}
            <Text style={[styles.buildGuideSubTitle, isWebBuilderLayout && styles.buildGuideSubTitleDesktop]}>Tips & notes</Text>
            <View style={[styles.abilityOrderTabRow, isWebBuilderLayout && styles.abilityOrderTabRowDesktop]}>
        <TouchableOpacity
          style={[styles.abilityOrderTab, isWebBuilderLayout && styles.abilityOrderTabDesktop, buildNotesTab === 'tips' && styles.abilityOrderTabActive]}
          onPress={() => setBuildNotesTab('tips')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.abilityOrderTabText,
              buildNotesTab === 'tips' && styles.abilityOrderTabTextActive,
            ]}
          >
            Tips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abilityOrderTab, isWebBuilderLayout && styles.abilityOrderTabDesktop, buildNotesTab === 'swaps' && styles.abilityOrderTabActive]}
          onPress={() => setBuildNotesTab('swaps')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.abilityOrderTabText,
              buildNotesTab === 'swaps' && styles.abilityOrderTabTextActive,
            ]}
          >
            Item swaps
          </Text>
        </TouchableOpacity>
      </View>
      {buildNotesTab === 'tips' ? (
        <>
          {!isWebBuilderLayout ? (
          <Text style={styles.sectionSubtitle}>
            Strategy, lane notes, or general build advice
          </Text>
          ) : null}
          <View style={[styles.tipsHeader, isWebBuilderLayout && styles.tipsHeaderDesktop]}>
            <TouchableOpacity
              style={[styles.addTipButton, isWebBuilderLayout && styles.addTipButtonDesktop]}
              onPress={() => setBuildTips([...buildTips, ''])}
              activeOpacity={0.7}
            >
              <Text style={[styles.addTipButtonText, isWebBuilderLayout && styles.addTipButtonTextDesktop]}>+ Add Tip</Text>
            </TouchableOpacity>
          </View>
          {buildTips.map((tip, tipIndex) => (
            <View key={tipIndex} style={[styles.tipInputContainer, isWebBuilderLayout && styles.tipInputContainerDesktop]}>
              <View style={styles.tipInputHeader}>
                <Text style={styles.tipNumber}>Tip {tipIndex + 1}</Text>
                {buildTips.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeTipButton}
                    onPress={() => {
                      const newTips = buildTips.filter((_, i) => i !== tipIndex);
                      setBuildTips(newTips);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeTipButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.buildTipsInput, isWebBuilderLayout && styles.buildTipsInputDesktop]}
                placeholder={`Tip ${tipIndex + 1}: Add tip, strategy, or note...`}
                placeholderTextColor="#64748b"
                value={tip}
                onChangeText={(text) => {
                  const newTips = [...buildTips];
                  newTips[tipIndex] = text;
                  setBuildTips(newTips);
                }}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionSubtitle}>
            Add alternative items and explain when to use them
          </Text>
          {itemSwaps.map((swap, index) => (
            <View key={index} style={styles.swapItem}>
              {swap.item && (
                <Image
                  source={getLocalItemIcon(swap.item.icon || swap.item.internalName)}
                  style={styles.swapItemIcon}
                  resizeMode="cover"
                />
              )}
              <View style={styles.swapItemContent}>
                <Text style={styles.swapItemName}>
                  {swap.item ? (swap.item.name || swap.item.internalName) : 'No item selected'}
                </Text>
                {swap.reasoning && (
                  <Text style={styles.swapItemReasoning}>{swap.reasoning}</Text>
                )}
              </View>
              <View style={styles.swapItemActions}>
                <TouchableOpacity
                  style={styles.editSwapButton}
                  onPress={() => {
                    setCurrentSwapIndex(index);
                    setSwapItem(swap.item);
                    setSwapReasoning(swap.reasoning || '');
                    setShowSwapModal(true);
                  }}
                >
                  <Text style={styles.editSwapButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteSwapButton}
                  onPress={() => {
                    setItemSwaps((prev) => prev.filter((_, i) => i !== index));
                  }}
                >
                  <Text style={styles.deleteSwapButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addSwapButton}
            onPress={() => {
              setCurrentSwapIndex(null);
              setSwapItem(null);
              setSwapReasoning('');
              setShowSwapModal(true);
            }}
          >
            <Text style={styles.addSwapButtonText}>+ Add Swap</Text>
          </TouchableOpacity>
        </>
      )}
        </View>
      ) : null}
    </>
  );

  // Load saved builds
  useEffect(() => {
    const loadSavedBuilds = async () => {
      try {
        const currentUser = await storage.getItem('currentUser');
        if (currentUser) {
          const savedBuildsData = await storage.getItem(`savedBuilds_${currentUser}`);
          if (savedBuildsData) {
            const builds = JSON.parse(savedBuildsData);
            setSavedBuilds(builds);
          }
        }
      } catch (e) {
        console.error('Error loading saved builds:', e);
      }
    };
    loadSavedBuilds();
  }, []);

  const renderRoleDropdown = () => (
    <View style={styles.rolePickerWrap}>
      <View
        style={[
          uiDropdownStyles.selectShell,
          roleDropdownVisible && uiDropdownStyles.selectShellOpen,
        ]}
      >
        <TouchableOpacity
          style={uiDropdownStyles.selectTrigger}
          onPress={() => {
            setPostMenuVisible(false);
            setRoleDropdownVisible((v) => !v);
          }}
          activeOpacity={0.7}
          accessibilityLabel="Select roles for this build"
        >
          <View style={styles.roleDropdownTriggerContent}>
            {selectedRoles.length === 0 ? (
              <Text style={styles.roleDropdownPlaceholder}>Select roles (up to 4)</Text>
            ) : (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roleDropdownSelectedRow}
              >
                {selectedRoles.map((role) => {
                  const iconSrc = getRoleIcon(role);
                  return (
                    <View key={role} style={styles.roleDropdownSelectedChip}>
                      {iconSrc ? (
                        <Image source={iconSrc} style={styles.roleDropdownChipIcon} contentFit="contain" />
                      ) : null}
                      <Text style={styles.roleDropdownChipText}>{role}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
          <Text
            style={[
              uiDropdownStyles.selectCaret,
              roleDropdownVisible && uiDropdownStyles.selectCaretOpen,
            ]}
          >
            ▼
          </Text>
        </TouchableOpacity>
        {roleDropdownVisible ? (
          <>
            <View style={uiDropdownStyles.selectDivider} />
            <View style={styles.rolePickerPanel}>
              <View style={styles.rolePickerRow}>
                {BUILDER_ROLE_OPTIONS.map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  const isDisabled = !isSelected && selectedRoles.length >= 4;
                  const iconSrc = getRoleIcon(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.rolePickerBox,
                        isSelected && styles.rolePickerBoxSelected,
                        isDisabled && styles.rolePickerBoxDisabled,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedRoles((prev) => prev.filter((r) => r !== role));
                        } else if (!isDisabled) {
                          setSelectedRoles((prev) => [...prev, role]);
                        }
                      }}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                      accessibilityLabel={`${role} role${isSelected ? ', selected' : ''}`}
                      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                    >
                      {iconSrc ? (
                        <Image source={iconSrc} style={styles.rolePickerBoxIcon} contentFit="contain" />
                      ) : null}
                      <Text
                        style={[
                          styles.rolePickerBoxText,
                          isSelected && styles.rolePickerBoxTextSelected,
                          isDisabled && styles.rolePickerBoxTextDisabled,
                        ]}
                        numberOfLines={1}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );

  const submitCommunityBuild = async (nameOverride) => {
    const resolvedName = (
      nameOverride ||
      communityBuildName ||
      buildDefaultCommunityName(selectedGod, selectedRoles)
    ).trim();
    if (!selectedGod || !resolvedName) return false;

    const currentUser = await storage.getItem('currentUser');
    if (!currentUser) {
      setShowLoginModal(true);
      return false;
    }

    setIsPostingToCommunity(true);
    try {
      const { supabase } = require('../../config/supabase');
      const authSession = await ensureAppWriteSession(currentUser);
      if (!authSession.ready) {
        Alert.alert('Sign in required', 'Sign out and sign in again to post community builds.');
        return false;
      }
      const gamemodesToSave = selectedGamemodes.includes('All Modes')
        ? ['Joust', 'Duel', 'Arena', 'Conquest', 'Assault']
        : selectedGamemodes;

      const buildData = {
        name: resolvedName,
        god: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
        godInternalName: selectedGod.internalName || selectedGod.GodName,
        godIcon: selectedGod.icon || selectedGod.GodIcon,
        items: selectedItems.filter(Boolean).map((item) => ({
          name: item.name || item.internalName,
          internalName: item.internalName,
          icon: item.icon,
        })),
        relic: relicToPayload(finalRelic),
        starting_relic: relicToPayload(startingRelic),
        final_relic: relicToPayload(finalRelic),
        godLevel: Math.round(godLevel),
        aspectActive: aspectActive && selectedGod.aspect ? true : false,
        author: currentUser,
        notes: buildTips.filter((t) => t && t.trim()).join('\n') || resolvedName,
        tips: buildTips.filter((t) => t && t.trim()).join('\n') || null,
        startingItems: startingItems.filter(Boolean).map((item) => ({
          name: item.name || item.internalName,
          internalName: item.internalName,
          icon: item.icon,
        })),
        abilityLevelingOrder,
        startingAbilityOrder,
        itemSwaps: itemSwaps.map((swap) => ({
          item: swap.item,
          reasoning: swap.reasoning,
        })),
        roles: selectedRoles,
        gamemodes: gamemodesToSave,
        createdAt: new Date().toISOString(),
      };

      const isEditing =
        buildToEdit && buildToEdit.databaseId && buildToEdit.databaseTable === 'community_builds';
      const updateData = {
        build_name: resolvedName,
        god_name: buildData.god,
        god_internal_name: buildData.godInternalName,
        items: buildData.items,
        starting_items: buildData.startingItems,
        relic: buildData.relic,
        starting_relic: buildData.starting_relic,
        final_relic: buildData.final_relic,
        god_level: Math.round(godLevel),
        aspect_active: buildData.aspectActive,
        notes: buildData.notes || buildData.tips || resolvedName,
        tips: (buildData.tips && buildData.tips.trim()) || null,
        ability_leveling_order: buildData.abilityLevelingOrder,
        starting_ability_order: buildData.startingAbilityOrder,
        item_swaps: buildData.itemSwaps,
        roles: buildData.roles,
        gamemodes: gamemodesToSave,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (isEditing) {
        const result = await supabase
          .from('community_builds')
          .update(updateData)
          .eq('id', buildToEdit.databaseId)
          .eq('username', currentUser);
        error = result.error;
      } else {
        const result = await supabase.from('community_builds').insert({
          username: currentUser,
          ...updateData,
          created_at: new Date().toISOString(),
        });
        error = result.error;
      }

      if (error) {
        if (error.code === 'MISSING_CONFIG') {
          Alert.alert(
            'Development Mode',
            'Supabase is not configured in development. In production, your builds will be saved properly.'
          );
          setShowPostToCommunityModal(false);
          setCommunityBuildName('');
          setSelectedGamemodes(['All Modes']);
          Alert.alert('Success (Dev Mode)', 'Build posted! In production, this will be saved to the database.');
          return true;
        }
        Alert.alert('Error', `Failed to post build: ${error.message || 'Please try again.'}`);
        return false;
      }

      // Partners: new posts also go to the partner (contributor) listing
      let partnerPostFailed = false;
      if (!isEditing && isUserCertified) {
        const partnerResult = await supabase.from('contributor_builds').insert({
          username: currentUser,
          ...updateData,
          created_at: new Date().toISOString(),
        });
        if (partnerResult.error && partnerResult.error.code !== 'MISSING_CONFIG') {
          console.error('Error posting to partner builds:', partnerResult.error);
          partnerPostFailed = true;
        }
      }

      setShowPostToCommunityModal(false);
      setCommunityBuildName('');
      setSelectedGamemodes(['All Modes']);
      if (isEditing && onEditComplete) onEditComplete();
      if (isEditing) {
        Alert.alert('Success', 'Your community build has been updated!');
      } else if (isUserCertified) {
        Alert.alert(
          'Success',
          partnerPostFailed
            ? 'Posted to Community builds! Partner listing failed — try again later.'
            : 'Your build has been posted to Community and Partner builds!'
        );
      } else {
        Alert.alert('Success', 'Your build has been posted to Community builds!');
      }
      return true;
    } catch (error) {
      console.error('Exception posting to community:', error);
      Alert.alert('Error', 'An error occurred while posting. Please try again.');
      return false;
    } finally {
      setIsPostingToCommunity(false);
    }
  };

  const resolvePostDisplayName = async (currentUser) => {
    try {
      const live = getLiveDisplayName(currentUser);
      if (live && live.trim()) return live.trim();
    } catch {}
    try {
      const cached = await storage.getItem(`displayName_${currentUser}`);
      if (cached && cached.trim()) return cached.trim();
    } catch {}
    return currentUser || '';
  };

  const promptQuickCommunityPost = (displayName) => {
    const defaultName = buildDefaultCommunityName(selectedGod, selectedRoles);
    const destination = isUserCertified ? 'Community and Partner builds' : 'Community builds';
    const asName = displayName ? ` as ${displayName}` : '';
    Alert.alert(
      'Post build?',
      `Post "${defaultName}"${asName} to ${destination} for All Modes. Tap Customize to change the name or modes first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Customize',
          onPress: () => {
            setCommunityBuildName(defaultName);
            setSelectedGamemodes(['All Modes']);
            setShowPostToCommunityModal(true);
          },
        },
        {
          text: 'Post now',
          onPress: async () => {
            setCommunityBuildName(defaultName);
            setSelectedGamemodes(['All Modes']);
            await submitCommunityBuild(defaultName);
          },
        },
      ]
    );
  };

  const requireLoggedInUser = async () => {
    const currentUser = await storage.getItem('currentUser');
    if (!currentUser) {
      setShowLoginModal(true);
      return null;
    }
    return currentUser;
  };

  const requireBuildHasItems = () => {
    const hasItems = selectedItems.filter(Boolean).length > 0;
    if (!hasItems) {
      Alert.alert('Incomplete Build', 'Add at least one final build item first.');
      return false;
    }
    return true;
  };

  const handleSaveBuildToProfile = async () => {
    setPostMenuVisible(false);
    const currentUser = await storage.getItem('currentUser');
    if (!currentUser) {
      Alert.alert('Not Logged In', 'Please log in to your profile to save builds.');
      return;
    }
    setBuildName(selectedGod.name || selectedGod.GodName || 'My Build');
    setShowSaveBuildModal(true);
  };

  const handleQuickPostCommunity = async () => {
    setPostMenuVisible(false);
    const currentUser = await requireLoggedInUser();
    if (!currentUser) return;
    if (!requireBuildHasItems()) return;
    const displayName = await resolvePostDisplayName(currentUser);
    setPostAsDisplayName(displayName);
    promptQuickCommunityPost(displayName);
  };

  const handleCustomizePost = async () => {
    setPostMenuVisible(false);
    const currentUser = await requireLoggedInUser();
    if (!currentUser) return;
    if (!requireBuildHasItems()) return;
    setPostAsDisplayName(await resolvePostDisplayName(currentUser));
    setCommunityBuildName(buildDefaultCommunityName(selectedGod, selectedRoles));
    setSelectedGamemodes(['All Modes']);
    setShowPostToCommunityModal(true);
  };

  const handleUpdateContributorBuild = async () => {
    setPostMenuVisible(false);
    if (!(await requireLoggedInUser())) return;
    if (!requireBuildHasItems()) return;
    try {
      const currentUser = await storage.getItem('currentUser');
      const { supabase } = require('../../config/supabase');
      const authSession = await ensureAppWriteSession(currentUser);
      if (!authSession.ready) {
        Alert.alert('Sign in required', 'Sign out and sign in again to update contributor builds.');
        return;
      }
      const gamemodesToSave =
        buildToEdit.gamemodes && Array.isArray(buildToEdit.gamemodes) && buildToEdit.gamemodes.length > 0
          ? buildToEdit.gamemodes
          : ['Joust', 'Duel', 'Arena', 'Conquest', 'Assault'];
      const nameToSave =
        (buildToEdit.build_name || buildToEdit.name || certifiedBuildName || buildName || '').trim() ||
        'My Build';
      const updatePayload = {
        build_name: nameToSave,
        god_name: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
        god_internal_name: selectedGod.internalName || selectedGod.GodName,
        items: selectedItems
          .filter(Boolean)
          .map((item) => ({
            name: item.name || item.internalName,
            internalName: item.internalName,
            icon: item.icon,
          })),
        starting_items: startingItems
          .filter(Boolean)
          .map((item) => ({
            name: item.name || item.internalName,
            internalName: item.internalName,
            icon: item.icon,
          })),
        relic: relicToPayload(finalRelic),
        starting_relic: relicToPayload(startingRelic),
        final_relic: relicToPayload(finalRelic),
        god_level: Math.round(godLevel),
        aspect_active: aspectActive && selectedGod.aspect ? true : false,
        notes: (buildTips.filter((t) => t && t.trim()).join('\n') || nameToSave).trim(),
        tips: (buildTips.filter((t) => t && t.trim()).join('\n') || '').trim() || null,
        ability_leveling_order: abilityLevelingOrder,
        starting_ability_order: startingAbilityOrder,
        item_swaps: itemSwaps.map((swap) => ({ item: swap.item, reasoning: swap.reasoning })),
        roles: selectedRoles,
        gamemodes: gamemodesToSave,
        updated_at: new Date().toISOString(),
      };
      const result = await supabase.rpc('update_contributor_build', {
        build_id: String(buildToEdit.databaseId),
        request_username: currentUser,
        payload: updatePayload,
      });
      if (result.error) {
        console.error('Contributor build update error:', result.error.code, result.error.message, result.error.details);
        Alert.alert(
          'Update failed',
          result.error.message || 'Could not save to server. Run supabase_update_contributor_build_rpc.sql in Supabase SQL Editor if you use custom login.'
        );
        return;
      }
      const updated = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!updated) {
        Alert.alert(
          'Update failed',
          'No rows were updated. Run the SQL in supabase_update_contributor_build_rpc.sql in your Supabase project.'
        );
        return;
      }
      if (onEditComplete) onEditComplete();
      Alert.alert('Success', 'Your contributor build has been updated.');
    } catch (err) {
      console.error('Exception updating contributor build:', err);
      Alert.alert('Error', err?.message || 'An error occurred. Please try again.');
    }
  };

  const handleOpenContributorPost = async () => {
    setPostMenuVisible(false);
    if (!(await requireLoggedInUser())) return;
    if (!requireBuildHasItems()) return;
    if (buildToEdit?.databaseTable === 'contributor_builds') {
      setCertifiedBuildName(buildToEdit.build_name || buildToEdit.name || '');
      setSelectedGamemodes(
        Array.isArray(buildToEdit.gamemodes) && buildToEdit.gamemodes.length > 0
          ? buildToEdit.gamemodes
          : ['All Modes']
      );
    } else {
      setCertifiedBuildName(buildDefaultCommunityName(selectedGod, selectedRoles));
      setSelectedGamemodes(['All Modes']);
    }
    setShowPostToCertifiedModal(true);
  };

  const getPostMenuItems = useCallback(() => {
    const showContributorUpdate =
      isUserCertified && buildToEdit?.databaseTable === 'contributor_builds' && buildToEdit?.databaseId;

    const menuItems = [
      {
        key: 'save',
        title: 'Save to Profile',
        hint: 'My Builds on your account',
        onPress: handleSaveBuildToProfile,
      },
      {
        key: 'quick',
        title: 'Post',
        hint: isUserCertified ? 'Community + Partner builds' : 'Post to community builds',
        onPress: handleQuickPostCommunity,
      },
      {
        key: 'custom',
        title: 'Customize Post',
        hint: 'Name, modes, and notes',
        onPress: handleCustomizePost,
      },
    ];
    if (showContributorUpdate) {
      menuItems.push({
        key: 'contrib-update',
        title: 'Update partner build',
        hint: 'Save edits to partner listing',
        onPress: handleUpdateContributorBuild,
      });
    }
    return menuItems;
  }, [isUserCertified, buildToEdit]);

  const renderPostMenuItemRows = (menuItems) =>
    menuItems.map((item, idx) => (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.postMenuItem,
          idx === menuItems.length - 1 && uiDropdownStyles.menuItemLast,
        ]}
        onPress={item.onPress}
        activeOpacity={0.85}
      >
        <View style={styles.postMenuItemTextCol}>
          <Text style={styles.postMenuItemTitle}>{item.title}</Text>
          <Text style={styles.postMenuItemHint}>{item.hint}</Text>
        </View>
      </TouchableOpacity>
    ));

  const renderPostActionsMenu = () => {
    const menuItems = getPostMenuItems();

    return (
      <View style={styles.postMenuWrap}>
        <TouchableOpacity
          style={[styles.postMenuBtn, postMenuVisible && styles.postMenuBtnOpen]}
          onPress={() => {
            setRoleDropdownVisible(false);
            setPostMenuVisible((v) => !v);
          }}
          activeOpacity={0.85}
          accessibilityLabel="Post build menu"
        >
          <Text style={styles.postMenuBtnText}>Post</Text>
          <Text style={styles.postMenuCaret}>{postMenuVisible ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {IS_WEB && postMenuVisible ? (
          <View style={styles.postMenuDropdown}>{renderPostMenuItemRows(menuItems)}</View>
        ) : null}
      </View>
    );
  };

  const renderPostMenuModal = () => (
    <Modal
      visible={postMenuVisible && !IS_WEB}
      transparent
      animationType="fade"
      onRequestClose={() => setPostMenuVisible(false)}
    >
      <Pressable style={styles.postMenuOverlay} onPress={() => setPostMenuVisible(false)}>
        <Pressable style={styles.postMenuSheet} onPress={(e) => e?.stopPropagation?.()}>
          <Text style={styles.postMenuSheetTitle}>Post build</Text>
          {renderPostMenuItemRows(getPostMenuItems())}
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (dataLoading || (botSharedDraftToken && botDraftHydrating)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => {
          setPostMenuVisible(false);
          setRoleDropdownVisible(false);
        }}
      >
        {!builderHintDismissed && !botSharedDraftToken ? (
          <BeginnerHintBar
            compact={screenDimensions.width < 560}
            text="1) Pick a god and lane role. 2) Fill seven item slots + relic. 3) Expand Total stats to preview damage and survivability at level 20."
            onDismiss={() => {
              setBuilderHintDismissed(true);
              if (IS_WEB && typeof window !== 'undefined') {
                window.localStorage.setItem('hint_custom_builder', '1');
              }
            }}
          />
        ) : null}
        {botSharedDraftToken ? (
          <View style={styles.section}>
            <View style={styles.botDraftBanner}>
              <Text style={styles.botDraftBannerTitle}>Discord bot draft</Text>
              <Text style={styles.botDraftBannerText}>
                This page is only for people with the link. Edits are not posted to community builds — use Save to
                sync JSON for your bot to read from Supabase.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Load Saved Build Button */}
        {!botSharedDraftToken ? (
          !isWebBuilderLayout ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.loadBuildButton}
              onPress={() => setShowLoadBuildModal(true)}
            >
              <Text style={styles.loadBuildButtonText}>Load Saved Build</Text>
            </TouchableOpacity>
          </View>
          ) : null
        ) : null}

        <View style={isWebBuilderLayout ? styles.desktopBuilderColumns : undefined}>
        {/* Left: stats on desktop · god + stats stacked on mobile */}
        <View style={[
          styles.section,
          isWebBuilderLayout && styles.desktopBuilderLeft,
          isWebBuilderLayout && !isWebBuilderSideGuide && styles.tabletBuilderLeft,
        ]}>
          {!isWebBuilderLayout ? renderGodRoleSection() : null}
          {renderStatsSection()}
        </View>

        {/* Right: god + build (+ guide column on desktop) */}
        <View style={[
          isWebBuilderLayout ? styles.desktopBuilderRightWrap : styles.mobileBuilderRightWrap,
          isWebBuilderLayout && !isWebBuilderSideGuide && styles.tabletBuilderRightWrap,
        ]}>
        <View style={[
          styles.section,
          isWebBuilderLayout && styles.desktopBuilderBuildPanel,
          isWebBuilderLayout && !isWebBuilderSideGuide && styles.tabletBuilderBuildPanel,
        ]}>
          {isWebBuilderLayout ? (
            <View style={styles.desktopGodRoleInBuild}>{renderGodRoleSection()}</View>
          ) : null}
          <View style={styles.buildSectionToolbar}>
            <TouchableOpacity
              style={styles.buildClearAllBtnInline}
              onPress={clearAllBuildItemsAndRelics}
              activeOpacity={0.7}
              accessibilityLabel="Clear all starting items, final build items, and relics"
            >
              {IS_WEB ? (
                <Text style={styles.buildClearAllBtnLabelWeb}>Clear all</Text>
              ) : (
                <Text style={styles.buildClearAllBtnEmoji}>🗑</Text>
              )}
            </TouchableOpacity>
            {isWebBuilderLayout && !botSharedDraftToken ? (
              <TouchableOpacity
                style={styles.desktopToolbarLoadBtn}
                onPress={() => setShowLoadBuildModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.desktopToolbarLoadBtnText}>Load build</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.buildItemsHeaderRow}>
            <Text style={styles.buildItemsHeaderTitle}>Build</Text>
            <View style={styles.buildItemsHeaderActions}>
              {selectedGod && !isWebBuilderLayout ? (
                <TouchableOpacity
                  style={styles.buildViewSwapBtn}
                  onPress={() =>
                    setBuildItemsView((v) => (v === 'final' ? 'starting' : 'final'))
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.buildViewSwapBtnText}>
                    {buildItemsView === 'final'
                      ? 'Swap to Starting Items'
                      : 'Swap to Final Build'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.buildItemsHeaderGold}>
                <Image source={GOLD_ICON} style={styles.buildItemsHeaderGoldIcon} contentFit="contain" />
                <Text style={styles.buildItemsHeaderGoldText}>
                  {totalGold.toLocaleString()} gold
                </Text>
              </View>
            </View>
          </View>
          {!selectedGod ? (
            <>
              <Text style={styles.sectionTitle}>Final build</Text>
              <View style={styles.starterItemRow}>
                <View style={styles.itemSlot}>
                  <Text style={styles.starterItemLabel}>S</Text>
                  <TouchableOpacity
                    style={styles.itemSlotButton}
                    onPress={() => {
                      if (selectedItems[0]) showItemInfo(selectedItems[0], 0);
                      else setShowItemPicker(0);
                    }}
                    activeOpacity={0.7}
                  >
                    {selectedItems[0] ? (
                      <>
                        {renderItemIconOnly(
                          selectedItems[0],
                          `item-${selectedItems[0].internalName || selectedItems[0].name}-0`,
                          false
                        )}
                        <Text style={styles.itemName} numberOfLines={2}>
                          {selectedItems[0].name || selectedItems[0].internalName}
                        </Text>
                      </>
                    ) : (
                      <View style={styles.itemSlotPlaceholder}>
                        <Text style={styles.itemSlotPlaceholderText}>+</Text>
                        <Text style={styles.itemSlotNumber}>S</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.itemSlotsContainer}>
                {selectedItems.slice(1).map((item, index) => (
                  <View key={index + 1} style={styles.itemSlot}>
                    <TouchableOpacity
                      style={styles.itemSlotButton}
                      onPress={() => {
                        if (item) showItemInfo(item, index + 1);
                        else setShowItemPicker(index + 1);
                      }}
                      activeOpacity={0.7}
                    >
                      {item ? (
                        <>
                          {renderItemIconOnly(item, `item-${item.internalName || item.name}-${index}`, false)}
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.name || item.internalName}
                          </Text>
                        </>
                      ) : (
                        <View style={styles.itemSlotPlaceholder}>
                          <Text style={styles.itemSlotPlaceholderText}>+</Text>
                          <Text style={styles.itemSlotNumber}>{index + 1}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
            {isWebBuilderLayout ? (
            <View style={[styles.itemsBuildTwoColumn, styles.desktopItemsBuildTwoColumn]}>
              <View style={[styles.itemsBuildColumnFinal, styles.desktopBuildColumn]}>
                <Text style={styles.sectionTitleInline}>
                  Final build <Text style={styles.buildRequiredMark}>*</Text>
                </Text>
                <View style={styles.desktopFinalBuildStack}>
                  <View style={styles.starterRelicRow}>
                    <View style={styles.buildSlotColumn}>
                      <View style={styles.buildSlotLabelSpacer} />
                      <View style={styles.desktopFinalSlot}>
                        <TouchableOpacity
                          style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                          onPress={() => {
                            const item0 = selectedItems[0];
                            if (item0) showItemInfo(item0, 0);
                            else setShowItemPicker(0);
                          }}
                          activeOpacity={0.7}
                        >
                          {selectedItems[0] ? (
                            <>
                              {renderItemIconOnly(
                                selectedItems[0],
                                `item-${selectedItems[0].internalName || selectedItems[0].name}-0`,
                                true
                              )}
                              <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                {selectedItems[0].name || selectedItems[0].internalName}
                              </Text>
                            </>
                          ) : (
                            <View style={styles.compactSlotPlaceholder}>
                              <Text style={styles.compactSlotPlus}>+</Text>
                              <Text style={styles.compactSlotHint}>S</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.starterRelicDivider} />
                    <View style={styles.buildSlotColumn}>
                      <Text style={styles.relicInlineLabel}>Relic</Text>
                      <View style={styles.desktopFinalSlot}>
                        <TouchableOpacity
                          style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                          onPress={() => setRelicPickerTarget('final')}
                          activeOpacity={0.7}
                        >
                          {finalRelic ? (
                            <>
                              {renderItemIconOnly(
                                finalRelic,
                                `final-relic-${finalRelic.internalName || finalRelic.name}`,
                                true
                              )}
                              <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                {finalRelic.name || finalRelic.internalName}
                              </Text>
                              <TouchableOpacity
                                style={styles.compactRelicRemoveOverlay}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setFinalRelic(null);
                                }}
                              >
                                <Text style={styles.removeRelicButtonText}>✕</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View style={styles.compactSlotPlaceholder}>
                              <Text style={styles.compactSlotPlus}>+</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.desktopFinalItemRow}>
                    {selectedItems.slice(1, 4).map((item, i) => {
                      const index = i + 1;
                      return (
                        <View key={`df-r2-${index}`} style={styles.desktopFinalSlot}>
                          <TouchableOpacity
                            style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                            onPress={() => {
                              if (item) showItemInfo(item, index);
                              else setShowItemPicker(index);
                            }}
                            activeOpacity={0.7}
                          >
                            {item ? (
                              <>
                                {renderItemIconOnly(
                                  item,
                                  `item-${item.internalName || item.name}-${index}`,
                                  true
                                )}
                                <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                  {item.name || item.internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>{index}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.desktopFinalItemRow}>
                    {selectedItems.slice(4, 7).map((item, i) => {
                      const index = i + 4;
                      return (
                        <View key={`df-r3-${index}`} style={styles.desktopFinalSlot}>
                          <TouchableOpacity
                            style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                            onPress={() => {
                              if (item) showItemInfo(item, index);
                              else setShowItemPicker(index);
                            }}
                            activeOpacity={0.7}
                          >
                            {item ? (
                              <>
                                {renderItemIconOnly(
                                  item,
                                  `item-${item.internalName || item.name}-${index}`,
                                  true
                                )}
                                <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                  {item.name || item.internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>{index}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View style={styles.itemsBuildDivider} />
              <View style={[styles.itemsBuildColumnStart, styles.desktopBuildColumn]}>
                <Text style={styles.sectionTitleInline}>Starting items (optional)</Text>
                <View style={styles.desktopFinalBuildStack}>
                  <View style={styles.starterRelicRow}>
                    <View style={styles.buildSlotColumn}>
                      <View style={styles.buildSlotLabelSpacer} />
                      <View style={styles.desktopFinalSlot}>
                        <TouchableOpacity
                          style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                          onPress={() => {
                            const item0 = startingItems[0];
                            if (item0) showItemInfo(item0, 100);
                            else setShowItemPicker(100);
                          }}
                          activeOpacity={0.7}
                        >
                          {startingItems[0] ? (
                            <>
                              {renderItemIconOnly(
                                startingItems[0],
                                `starting-item-${startingItems[0].internalName || startingItems[0].name}-0`,
                                true
                              )}
                              <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                {startingItems[0].name || startingItems[0].internalName}
                              </Text>
                            </>
                          ) : (
                            <View style={styles.compactSlotPlaceholder}>
                              <Text style={styles.compactSlotPlus}>+</Text>
                              <Text style={styles.compactSlotHint}>S</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.starterRelicDivider} />
                    <View style={styles.buildSlotColumn}>
                      <Text style={styles.relicInlineLabel}>Relic</Text>
                      <View style={styles.desktopFinalSlot}>
                        <TouchableOpacity
                          style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                          onPress={() => setRelicPickerTarget('starting')}
                          activeOpacity={0.7}
                        >
                          {startingRelic ? (
                            <>
                              {renderItemIconOnly(
                                startingRelic,
                                `starting-relic-${startingRelic.internalName || startingRelic.name}`,
                                true
                              )}
                              <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                {startingRelic.name || startingRelic.internalName}
                              </Text>
                              <TouchableOpacity
                                style={styles.compactRelicRemoveOverlay}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setStartingRelic(null);
                                }}
                              >
                                <Text style={styles.removeRelicButtonText}>✕</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View style={styles.compactSlotPlaceholder}>
                              <Text style={styles.compactSlotPlus}>+</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.desktopFinalItemRow}>
                    {startingItems.slice(1, 3).map((item, i) => {
                      const index = i + 1;
                      return (
                        <View key={`ds-${index}`} style={styles.desktopFinalSlot}>
                          <TouchableOpacity
                            style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                            onPress={() => {
                              if (item) showItemInfo(item, 100 + index);
                              else setShowItemPicker(100 + index);
                            }}
                            activeOpacity={0.7}
                          >
                            {item ? (
                              <>
                                {renderItemIconOnly(
                                  item,
                                  `starting-item-${item.internalName || item.name}-${index}`,
                                  true
                                )}
                                <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                  {item.name || item.internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>{index}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.desktopFinalItemRow}>
                    {startingItems.slice(3, 5).map((item, i) => {
                      const index = i + 3;
                      return (
                        <View key={`ds-${index}`} style={styles.desktopFinalSlot}>
                          <TouchableOpacity
                            style={[styles.compactSlotButton, styles.desktopBuildSlotButton]}
                            onPress={() => {
                              if (item) showItemInfo(item, 100 + index);
                              else setShowItemPicker(100 + index);
                            }}
                            activeOpacity={0.7}
                          >
                            {item ? (
                              <>
                                {renderItemIconOnly(
                                  item,
                                  `starting-item-${item.internalName || item.name}-${index}`,
                                  true
                                )}
                                <Text style={styles.desktopBuildItemName} numberOfLines={2}>
                                  {item.name || item.internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>{index}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
            ) : (
            <View style={styles.buildItemsSingleColumn}>
              {buildItemsView === 'final' ? (
              <View style={styles.itemsBuildColumnFinal}>
                <Text style={[styles.sectionTitleInline, IS_WEB && styles.sectionTitleInlineCenterWeb]}>
                  Final build <Text style={styles.buildRequiredMark}>*</Text>
                </Text>
                {IS_WEB ? (
                  <View style={styles.compactFinalBuildWeb}>
                    <View style={styles.starterRelicRow}>
                      <View style={styles.buildSlotColumn}>
                        <View style={styles.buildSlotLabelSpacer} />
                        <View style={[styles.compactFinalSlotWeb, ...buildSlotWrapStyle]}>
                          <TouchableOpacity
                            style={buildSlotButtonStyle}
                            onPress={() => {
                              const item0 = selectedItems[0];
                              if (item0) showItemInfo(item0, 0);
                              else setShowItemPicker(0);
                            }}
                            activeOpacity={0.7}
                          >
                            {selectedItems[0] ? (
                              <>
                                {renderItemIconOnly(
                                  selectedItems[0],
                                  `item-${selectedItems[0].internalName || selectedItems[0].name}-0`,
                                  true
                                )}
                                <Text style={styles.compactItemName} numberOfLines={1}>
                                  {selectedItems[0].name || selectedItems[0].internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>S</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.starterRelicDivider} />
                      <View style={styles.buildSlotColumn}>
                        <Text style={styles.relicInlineLabel}>Relic</Text>
                        <View style={[styles.compactFinalSlotWeb, ...buildSlotWrapStyle]}>
                          <TouchableOpacity
                            style={buildSlotButtonStyle}
                            onPress={() => setRelicPickerTarget('final')}
                            activeOpacity={0.7}
                          >
                            {finalRelic ? (
                              <>
                                {renderItemIconOnly(
                                  finalRelic,
                                  `final-relic-${finalRelic.internalName || finalRelic.name}`,
                                  true
                                )}
                                <Text style={styles.compactItemName} numberOfLines={1}>
                                  {finalRelic.name || finalRelic.internalName}
                                </Text>
                                <TouchableOpacity
                                  style={styles.compactRelicRemoveOverlay}
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    setFinalRelic(null);
                                  }}
                                >
                                  <Text style={styles.removeRelicButtonText}>✕</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.compactFinalGridWeb, mobileBuildSlotLayout?.row3]}>
                      {selectedItems.slice(1, 4).map((item, i) => {
                        const index = i + 1;
                        return (
                          <View key={`fiw-r2-${index}`} style={[styles.compactFinalSlotWeb, ...buildSlotWrapStyle]}>
                            <TouchableOpacity
                              style={buildSlotButtonStyle}
                              onPress={() => {
                                if (item) showItemInfo(item, index);
                                else setShowItemPicker(index);
                              }}
                              activeOpacity={0.7}
                            >
                              {item ? (
                                <>
                                  {renderItemIconOnly(
                                    item,
                                    `item-${item.internalName || item.name}-${index}`,
                                    true
                                  )}
                                  <Text style={styles.compactItemName} numberOfLines={1}>
                                    {item.name || item.internalName}
                                  </Text>
                                </>
                              ) : (
                                <View style={styles.compactSlotPlaceholder}>
                                  <Text style={styles.compactSlotPlus}>+</Text>
                                  <Text style={styles.compactSlotHint}>{index}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                    <View style={[styles.compactFinalGridWeb, mobileBuildSlotLayout?.row3]}>
                      {selectedItems.slice(4, 7).map((item, i) => {
                        const index = i + 4;
                        return (
                          <View key={`fiw-r3-${index}`} style={[styles.compactFinalSlotWeb, ...buildSlotWrapStyle]}>
                            <TouchableOpacity
                              style={buildSlotButtonStyle}
                              onPress={() => {
                                if (item) showItemInfo(item, index);
                                else setShowItemPicker(index);
                              }}
                              activeOpacity={0.7}
                            >
                              {item ? (
                                <>
                                  {renderItemIconOnly(
                                    item,
                                    `item-${item.internalName || item.name}-${index}`,
                                    true
                                  )}
                                  <Text style={styles.compactItemName} numberOfLines={1}>
                                    {item.name || item.internalName}
                                  </Text>
                                </>
                              ) : (
                                <View style={styles.compactSlotPlaceholder}>
                                  <Text style={styles.compactSlotPlus}>+</Text>
                                  <Text style={styles.compactSlotHint}>{index}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.starterRelicRow}>
                      <View style={styles.buildSlotColumn}>
                        <View style={styles.buildSlotLabelSpacer} />
                        <View style={[styles.compactStarterSlotWrap, ...buildSlotWrapStyle]}>
                          <TouchableOpacity
                            style={buildSlotButtonStyle}
                            onPress={() => {
                              const item = selectedItems[0];
                              if (item) showItemInfo(item, 0);
                              else setShowItemPicker(0);
                            }}
                            activeOpacity={0.7}
                          >
                            {selectedItems[0] ? (
                              <>
                                {renderItemIconOnly(
                                  selectedItems[0],
                                  `item-${selectedItems[0].internalName || selectedItems[0].name}-0`,
                                  true
                                )}
                                <Text style={styles.compactItemName} numberOfLines={1}>
                                  {selectedItems[0].name || selectedItems[0].internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>S</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.starterRelicDivider} />
                      <View style={styles.buildSlotColumn}>
                        <Text style={styles.relicInlineLabel}>Relic</Text>
                        <View style={[styles.compactStarterSlotWrap, ...buildSlotWrapStyle]}>
                          <TouchableOpacity
                            style={buildSlotButtonStyle}
                            onPress={() => setRelicPickerTarget('final')}
                            activeOpacity={0.7}
                          >
                            {finalRelic ? (
                              <>
                                {renderItemIconOnly(
                                  finalRelic,
                                  `final-relic-${finalRelic.internalName || finalRelic.name}`,
                                  true
                                )}
                                <Text style={styles.compactItemName} numberOfLines={1}>
                                  {finalRelic.name || finalRelic.internalName}
                                </Text>
                                <TouchableOpacity
                                  style={styles.compactRelicRemoveOverlay}
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    setFinalRelic(null);
                                  }}
                                >
                                  <Text style={styles.removeRelicButtonText}>✕</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <View style={styles.compactFinalGridMobileRow}>
                      {selectedItems.slice(1, 4).map((item, i) => {
                        const index = i + 1;
                        return (
                          <View key={`fi-r2-${index}`} style={styles.compactFinalSlot}>
                            <TouchableOpacity
                              style={buildSlotButtonStyle}
                              onPress={() => {
                                if (item) showItemInfo(item, index);
                                else setShowItemPicker(index);
                              }}
                              activeOpacity={0.7}
                            >
                              {item ? (
                                <>
                                  {renderItemIconOnly(item, `item-${item.internalName || item.name}-${index}`, true)}
                                  <Text style={styles.compactItemName} numberOfLines={1}>
                                    {item.name || item.internalName}
                                  </Text>
                                </>
                              ) : (
                                <View style={styles.compactSlotPlaceholder}>
                                  <Text style={styles.compactSlotPlus}>+</Text>
                                  <Text style={styles.compactSlotHint}>{index}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.compactFinalGridMobileRow}>
                      {selectedItems.slice(4, 7).map((item, i) => {
                        const index = i + 4;
                        return (
                          <View key={`fi-r3-${index}`} style={styles.compactFinalSlot}>
                            <TouchableOpacity
                              style={buildSlotButtonStyle}
                              onPress={() => {
                                if (item) showItemInfo(item, index);
                                else setShowItemPicker(index);
                              }}
                              activeOpacity={0.7}
                            >
                              {item ? (
                                <>
                                  {renderItemIconOnly(item, `item-${item.internalName || item.name}-${index}`, true)}
                                  <Text style={styles.compactItemName} numberOfLines={1}>
                                    {item.name || item.internalName}
                                  </Text>
                                </>
                              ) : (
                                <View style={styles.compactSlotPlaceholder}>
                                  <Text style={styles.compactSlotPlus}>+</Text>
                                  <Text style={styles.compactSlotHint}>{index}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
              ) : (
              <View style={styles.itemsBuildColumnStart}>
                <Text style={[styles.sectionTitleInline, IS_WEB && styles.sectionTitleInlineCenterWeb]}>
                  Starting items (optional)
                </Text>
                <View style={styles.starterRelicRow}>
                  <View style={styles.buildSlotColumn}>
                    <View style={styles.buildSlotLabelSpacer} />
                    <View style={[styles.compactStarterSlotWrap, ...buildSlotWrapStyle]}>
                      <TouchableOpacity
                        style={buildSlotButtonStyle}
                        onPress={() => {
                          const item = startingItems[0];
                          if (item) showItemInfo(item, 100);
                          else setShowItemPicker(100);
                        }}
                        activeOpacity={0.7}
                      >
                        {startingItems[0] ? (
                          <>
                            {renderItemIconOnly(
                              startingItems[0],
                              `starting-item-${startingItems[0].internalName || startingItems[0].name}-0`,
                              true
                            )}
                            <Text style={styles.compactItemName} numberOfLines={1}>
                              {startingItems[0].name || startingItems[0].internalName}
                            </Text>
                          </>
                        ) : (
                          <View style={styles.compactSlotPlaceholder}>
                            <Text style={styles.compactSlotPlus}>+</Text>
                            <Text style={styles.compactSlotHint}>S</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.starterRelicDivider} />
                  <View style={styles.buildSlotColumn}>
                    <Text style={styles.relicInlineLabel}>Relic</Text>
                    <View style={[styles.compactStarterSlotWrap, ...buildSlotWrapStyle]}>
                      <TouchableOpacity
                        style={buildSlotButtonStyle}
                        onPress={() => setRelicPickerTarget('starting')}
                        activeOpacity={0.7}
                      >
                        {startingRelic ? (
                          <>
                            {renderItemIconOnly(
                              startingRelic,
                              `starting-relic-${startingRelic.internalName || startingRelic.name}`,
                              true
                            )}
                            <Text style={styles.compactItemName} numberOfLines={1}>
                              {startingRelic.name || startingRelic.internalName}
                            </Text>
                            <TouchableOpacity
                              style={styles.compactRelicRemoveOverlay}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                setStartingRelic(null);
                              }}
                            >
                              <Text style={styles.removeRelicButtonText}>✕</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.compactSlotPlaceholder}>
                            <Text style={styles.compactSlotPlus}>+</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={styles.compactStartingRows}>
                  <View style={[styles.compactStartingRow, mobileBuildSlotLayout?.row2]}>
                    {startingItems.slice(1, 3).map((item, i) => {
                      const index = i + 1;
                      return (
                        <View key={`st-${index}`} style={styles.compactStartingSlot}>
                          <TouchableOpacity
                            style={buildSlotButtonStyle}
                            onPress={() => {
                              if (item) showItemInfo(item, 100 + index);
                              else setShowItemPicker(100 + index);
                            }}
                            activeOpacity={0.7}
                          >
                            {item ? (
                              <>
                                {renderItemIconOnly(
                                  item,
                                  `starting-item-${item.internalName || item.name}-${index}`,
                                  true
                                )}
                                <Text style={styles.compactItemName} numberOfLines={1}>
                                  {item.name || item.internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>{index}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                  <View style={[styles.compactStartingRow, mobileBuildSlotLayout?.row2]}>
                    {startingItems.slice(3, 5).map((item, i) => {
                      const index = i + 3;
                      return (
                        <View key={`st-${index}`} style={styles.compactStartingSlot}>
                          <TouchableOpacity
                            style={buildSlotButtonStyle}
                            onPress={() => {
                              if (item) showItemInfo(item, 100 + index);
                              else setShowItemPicker(100 + index);
                            }}
                            activeOpacity={0.7}
                          >
                            {item ? (
                              <>
                                {renderItemIconOnly(
                                  item,
                                  `starting-item-${item.internalName || item.name}-${index}`,
                                  true
                                )}
                                <Text style={styles.compactItemName} numberOfLines={1}>
                                  {item.name || item.internalName}
                                </Text>
                              </>
                            ) : (
                              <View style={styles.compactSlotPlaceholder}>
                                <Text style={styles.compactSlotPlus}>+</Text>
                                <Text style={styles.compactSlotHint}>{index}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              )}
            </View>
            )}
                            </>
                          )}
                      </View>
        {isWebBuilderSideGuide && selectedGod ? (
          <View style={[styles.section, styles.desktopBuilderGuidePanel]}>
            {renderBuildGuideSection()}
                </View>
        ) : null}
        {isWebBuilderLayout && !isWebBuilderSideGuide && selectedGod ? (
          <View style={[styles.section, styles.tabletBuilderGuidePanel]}>
            {renderBuildGuideSection()}
                          </View>
            ) : null}
            </View>
                </View>

        {selectedGod && !isWebBuilderLayout ? (
          <View style={styles.section}>
            {renderBuildGuideSection()}
              </View>
            ) : null}


        {/* Save Build Button — profile / community (hidden on bot draft link page) */}
        {selectedGod && botSharedDraftToken ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.postToCommunityButton,
                { backgroundColor: '#059669', borderColor: '#34d399' },
                botDraftSavePending && styles.saveBuildModalButtonDisabled,
              ]}
              disabled={botDraftSavePending}
              onPress={async () => {
                const hasItems = selectedItems.filter(Boolean).length > 0;
                if (!hasItems) {
                  Alert.alert('Incomplete build', 'Add at least one final item before saving.');
                  return;
                }
                setBotDraftSavePending(true);
                try {
                  const tipsJoined = buildTips.filter((t) => t && t.trim()).join('\n');
                  const payload = {
                    name: (buildName || '').trim() || selectedGod.name || selectedGod.GodName || 'Draft build',
                    god: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
                    godInternalName: selectedGod.internalName || selectedGod.GodName,
                    godIcon: selectedGod.icon || selectedGod.GodIcon,
                    items: selectedItems.filter(Boolean).map((item) => ({
                      name: item.name || item.internalName,
                      internalName: item.internalName,
                      icon: item.icon,
                    })),
                    startingItems: startingItems.filter(Boolean).map((item) => ({
                      name: item.name || item.internalName,
                      internalName: item.internalName,
                      icon: item.icon,
                    })),
                    roles: selectedRoles,
                    abilityLevelingOrder,
                    startingAbilityOrder,
                    godLevel: Math.round(godLevel),
                    aspectActive: aspectActive && selectedGod.aspect ? true : false,
                    updatedAt: new Date().toISOString(),
                    relic: relicToPayload(finalRelic),
                    startingRelic: relicToPayload(startingRelic),
                    finalRelic: relicToPayload(finalRelic),
                    starting_relic: relicToPayload(startingRelic),
                    final_relic: relicToPayload(finalRelic),
                    gamemodes: selectedGamemodes,
                    tips: tipsJoined || null,
                    itemSwaps: itemSwaps.map((swap) => ({
                      item: swap.item,
                      reasoning: swap.reasoning,
                    })),
                  };
                  const { data: ok, error } = await saveDiscordBotSharedBuildPayload(
                    botSharedDraftToken,
                    payload
                  );
                  if (error) {
                    Alert.alert('Save failed', error.message || String(error));
                    return;
                  }
                  if (!ok) {
                    Alert.alert(
                      'Save failed',
                      'No row for this link. Create the draft in Supabase first (bot INSERT with this token), then try again.'
                    );
                    return;
                  }
                  Alert.alert('Saved', 'Draft stored for your Discord bot to pull from Supabase.');
                } catch (e) {
                  Alert.alert('Save failed', e?.message || String(e));
                } finally {
                  setBotDraftSavePending(false);
                }
              }}
            >
              <Text style={styles.postToCommunityButtonText}>
                {botDraftSavePending ? 'Saving…' : 'Save to bot draft (Supabase)'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Item Info Modal */}
      <Modal
        visible={selectedItemInfo !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedItemInfo(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedItemInfo(null)}
        >
          <Pressable 
            style={[styles.itemInfoModal, { maxHeight: itemInfoModalMaxHeight }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedItemInfo && selectedItemInfo.item && (
              <>
                <View style={styles.itemInfoHeader}>
                  <View style={styles.itemInfoHeaderText}>
                    <ItemNameMeta
                      item={selectedItemInfo.item}
                      titleStyle={styles.itemInfoTitle}
                      wrapStyle={styles.itemInfoNameWrap}
                      hideSubtitle
                    />
                    <TooltipDetailToggle
                      detailLevel={itemTooltipDetail}
                      onChange={setItemTooltipDetail}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedItemInfo(null)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.itemInfoScroll}
                  contentContainerStyle={styles.itemInfoScrollContent}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                {(() => {
                  const localIcon = getLocalItemIcon(selectedItemInfo.item.icon || selectedItemInfo.item.internalName);
                  if (localIcon) {
                    const imageSource = localIcon.primary || localIcon;
                    const fallbackSource = localIcon.fallback;
                    const iconKey = `info-${selectedItemInfo.item.internalName || selectedItemInfo.item.name}`;
                    const useFallback = failedItemIcons[iconKey];
                    
                    return (
                      <View style={styles.itemInfoIconContainer}>
                        {fallbackSource && !useFallback ? (
                          <Image
                            source={imageSource}
                            style={styles.itemInfoIcon}
                            resizeMode="cover"
                            onError={() => {
                              setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                            }}
                          />
                        ) : fallbackSource && useFallback ? (
                          <Image
                            source={fallbackSource}
                            style={styles.itemInfoIcon}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={imageSource}
                            style={styles.itemInfoIcon}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    );
                  }
                  return null;
                })()}

                <ItemTooltipBody
                  item={selectedItemInfo.item}
                  detailLevel={itemTooltipDetail}
                  hideCost
                />
                </ScrollView>

                <ItemTooltipCost item={selectedItemInfo.item} style={styles.itemInfoCostPinned} />

                <View style={styles.itemInfoButtons}>
                  <TouchableOpacity
                    style={styles.changeItemButton}
                    onPress={changeItem}
                  >
                    <Text style={styles.changeItemButtonText}>Change Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeItemButtonLarge}
                    onPress={() => removeItem(selectedItemInfo.index)}
                  >
                    <Text style={styles.removeItemButtonTextLarge}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* God Picker Modal */}
      <Modal
        visible={showGodPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowGodPicker(false);
          setGodSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select God</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowGodPicker(false);
                  setGodSearchQuery('');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search gods..."
              placeholderTextColor="#64748b"
              value={godSearchQuery}
              onChangeText={setGodSearchQuery}
            />
            <ScrollView style={styles.modalContent}>
              {filteredGods.map((god, index) => {
                const name = god.name || god.GodName || god.title || god.displayName || 'Unknown';
                const icon = god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon);
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.godPickerItem}
                    onPress={() => {
                      setSelectedGod(god);
                      setShowGodPicker(false);
                      setGodSearchQuery('');
                    }}
                  >
                    {icon && (
                      <Image
                        source={getLocalGodAsset(icon)}
                        style={styles.godPickerIcon}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={styles.godPickerName}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Item Picker Modal */}
      <Modal
        visible={showItemPicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowItemPicker(null);
          setItemSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showItemPicker === 999
                  ? 'Select Item for Swap'
                  : showItemPicker === 0
                  ? 'Select Final Build (S)'
                  : showItemPicker === 100
                  ? 'Select Starting (S)'
                  : showItemPicker >= 101 && showItemPicker < 105
                  ? `Select Starting Item (${showItemPicker - 100})`
                  : showItemPicker !== null && showItemPicker >= 1 && showItemPicker <= 6
                  ? `Select Item (${showItemPicker})`
                  : showItemPicker !== null
                  ? `Select Item (Slot ${showItemPicker + 1})`
                  : 'Select Item'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowItemPicker(null);
                  setItemSearchQuery('');
                  setSelectedStat(null);
                  setSelectedTier(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterContainer}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterButton, selectedStat && styles.filterButtonActive]}
                  onPress={() => {
                    setStatDropdownVisible(!statDropdownVisible);
                    setTierDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, selectedStat && styles.filterButtonTextActive]}>
                    Stat: {selectedStat || 'All'}
                  </Text>
                  <Text style={styles.filterButtonArrow}>{statDropdownVisible ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, selectedTier && styles.filterButtonActive]}
                  onPress={() => {
                    setTierDropdownVisible(!tierDropdownVisible);
                    setStatDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, selectedTier && styles.filterButtonTextActive]}>
                    Tier: {selectedTier || 'All'}
                  </Text>
                  <Text style={styles.filterButtonArrow}>{tierDropdownVisible ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {(selectedStat || selectedTier) && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => {
                      setSelectedStat(null);
                      setSelectedTier(null);
                    }}
                  >
                    <Text style={styles.clearFilterButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              {statDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[styles.dropdownItem, !selectedStat && styles.dropdownItemActive]}
                      onPress={() => {
                        setSelectedStat(null);
                        setStatDropdownVisible(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !selectedStat && styles.dropdownItemTextActive]}>All</Text>
                    </TouchableOpacity>
                    {availableStats.map((stat) => (
                      <TouchableOpacity
                        key={stat}
                        style={[styles.dropdownItem, selectedStat === stat && styles.dropdownItemActive]}
                        onPress={() => {
                          setSelectedStat(stat);
                          setStatDropdownVisible(false);
                        }}
                      >
                        <View style={styles.dropdownItemLabelRow}>
                          {renderStatIcon(stat, statDisplayNames[stat] || stat, styles.dropdownTierIcon)}
                          <Text style={[styles.dropdownItemText, selectedStat === stat && styles.dropdownItemTextActive]}>
                            {statDisplayNames[stat] || stat}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {tierDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {['All', 'Starter', 'Tier 1', 'Tier 2', 'Tier 3', 'Active', 'Relic', 'Consumable', 'God Specific'].map((tier) => (
                      <TouchableOpacity
                        key={tier}
                        style={[styles.dropdownItem, selectedTier === tier && styles.dropdownItemActive]}
                        onPress={() => {
                          setSelectedTier(tier === 'All' ? null : tier);
                          setTierDropdownVisible(false);
                        }}
                      >
                        <View style={styles.dropdownItemLabelRow}>
                          {tier === 'Active' ? (
                            <Image
                              source={STAT_ICONS.Active}
                              style={styles.dropdownTierIcon}
                              contentFit="contain"
                            />
                          ) : null}
                          <Text style={[styles.dropdownItemText, selectedTier === tier && styles.dropdownItemTextActive]}>{tier}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor="#64748b"
              value={itemSearchQuery}
              onChangeText={setItemSearchQuery}
            />
            <View style={styles.modalContentScrollWrapper}>
              <ScrollView style={styles.modalContentScroll} contentContainerStyle={styles.modalContentScrollContent}>
              {filteredItems.map((item, index) => {
                const name = item.name || item.internalName || 'Unknown';
                const icon = item.icon || item.internalName;
                const localIcon = getLocalItemIcon(icon);
                const iconKey = `picker-${item.internalName || item.name}-${index}`;
                const useFallback = failedItemIcons[iconKey];
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemPickerItem}
                    onPress={() => {
                      // Check if we're selecting for a swap (index 999)
                      if (showItemPicker === 999) {
                        // This is for a swap - set the item and reopen swap modal
                        setSwapItem(resolveBuildCatalogItem(item, items));
                        setShowItemPicker(null);
                        setItemSearchQuery('');
                        setSelectedStat(null);
                        setSelectedTier(null);
                        // Reopen swap modal after a brief delay
                        setTimeout(() => {
                          setShowSwapModal(true);
                        }, 100);
                      } else {
                        selectItem(item, showItemPicker);
                      }
                    }}
                  >
                    {localIcon && (
                      <>
                        {localIcon.fallback && !useFallback ? (
                          <Image
                            source={localIcon.primary || localIcon}
                            style={styles.itemPickerIcon}
                            resizeMode="cover"
                            onError={() => {
                              setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                            }}
                          />
                        ) : localIcon.fallback && useFallback ? (
                          <Image
                            source={localIcon.fallback}
                            style={styles.itemPickerIcon}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={localIcon.primary || localIcon}
                            style={styles.itemPickerIcon}
                            resizeMode="cover"
                          />
                        )}
                      </>
                    )}
                    <View style={styles.itemPickerInfo}>
                      <View style={styles.itemPickerNameRow}>
                        {renderItemEffectIcon(item)}
                        <Text style={styles.itemPickerName}>{name}</Text>
                      </View>
                      {renderGoldCostRow(item, styles.itemPickerCost, styles.itemPickerGoldIcon)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Load Saved Build Modal */}
      <Modal
        visible={showLoadBuildModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLoadBuildModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Load Saved Build</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLoadBuildModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {savedBuilds.length === 0 ? (
                <Text style={styles.noSavedBuildsText}>No saved builds found.</Text>
              ) : (
                savedBuilds.map((build, index) => (
                  <TouchableOpacity
                    key={build.id || index}
                    style={styles.savedBuildItem}
                    onPress={async () => {
                      try {
                        applyBuildSnapshot(build);
                        await persistCustomBuilderPresetObject(build);
                        setShowLoadBuildModal(false);
                      } catch (e) {
                        console.error('Error loading build:', e);
                        Alert.alert('Error', 'Failed to load build. Please try again.');
                      }
                    }}
                  >
                    <View style={styles.savedBuildInfo}>
                      <Text style={styles.savedBuildName}>{build.name || 'Unnamed Build'}</Text>
                      <Text style={styles.savedBuildGod}>{build.god || 'Unknown God'}</Text>
                      {build.createdAt && (
                        <Text style={styles.savedBuildDate}>
                          {new Date(build.createdAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Save Build Modal */}
      <Modal
        visible={showSaveBuildModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveBuildModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSaveBuildModal(false)}
        >
          <Pressable 
            style={styles.saveBuildModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.saveBuildModalHeader}>
              <Text style={styles.saveBuildModalTitle}>Save Build</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSaveBuildModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.saveBuildModalLabel}>Build Name:</Text>
            <TextInput
              style={styles.saveBuildModalInput}
              placeholder="Enter build name..."
              placeholderTextColor="#64748b"
              value={buildName}
              onChangeText={setBuildName}
              autoFocus={true}
            />
            
            <View style={styles.saveBuildModalButtons}>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonCancel]}
                onPress={() => setShowSaveBuildModal(false)}
              >
                <Text style={styles.saveBuildModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonSave]}
                onPress={async () => {
                  if (!buildName.trim()) {
                    Alert.alert('Error', 'Please enter a build name.');
                    return;
                  }

                  const currentUser = await storage.getItem('currentUser');
                  const buildData = {
                    name: buildName.trim(),
                    god: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
                    godInternalName: selectedGod.internalName || selectedGod.GodName,
                    godIcon: selectedGod.icon || selectedGod.GodIcon,
                    items: selectedItems.filter(Boolean).map(item => ({
                      name: item.name || item.internalName,
                      internalName: item.internalName,
                      icon: item.icon,
                    })),
                    startingItems: startingItems.filter(Boolean).map(item => ({
                      name: item.name || item.internalName,
                      internalName: item.internalName,
                      icon: item.icon,
                    })),
                    roles: selectedRoles,
                    abilityLevelingOrder: abilityLevelingOrder,
                    startingAbilityOrder: startingAbilityOrder,
                    godLevel: Math.round(godLevel),
                    aspectActive: aspectActive && selectedGod.aspect ? true : false,
                    createdAt: new Date().toISOString(),
                    relic: relicToPayload(finalRelic),
                    startingRelic: relicToPayload(startingRelic),
                    finalRelic: relicToPayload(finalRelic),
                    starting_relic: relicToPayload(startingRelic),
                    final_relic: relicToPayload(finalRelic),
                  };

                  try {
                    // Import supabase
                    const { supabase } = require('../../config/supabase');
                    
                    // Save to local storage first (CRITICAL - this is the source of truth)
                    const savedBuildsData = await storage.getItem(`savedBuilds_${currentUser}`);
                    const savedBuilds = savedBuildsData ? JSON.parse(savedBuildsData) : [];
                    const newBuild = { ...buildData, id: Date.now(), savedAt: Date.now() };
                    savedBuilds.push(newBuild);
                    
                    // Save to local storage FIRST and wait for it to complete
                    await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(savedBuilds));
                    console.log('✅ Build saved to local storage:', newBuild.name);
                    
                    // Verify it was saved
                    const verifyData = await storage.getItem(`savedBuilds_${currentUser}`);
                    const verifyBuilds = verifyData ? JSON.parse(verifyData) : [];
                    console.log('✅ Verified local storage has', verifyBuilds.length, 'builds');
                    
                    // Also save to Supabase (async, don't block)
                    try {
                      const { error } = await supabase
                        .from('user_data')
                        .upsert({
                          username: currentUser,
                          saved_builds: savedBuilds,
                          updated_at: new Date().toISOString(),
                        }, {
                          onConflict: 'username'
                        });
                      
                      if (error && error.code !== 'MISSING_CONFIG') {
                        console.error('Error saving to Supabase:', error);
                      } else if (!error) {
                        console.log('✅ Build saved to Supabase');
                      }
                    } catch (supabaseError) {
                      console.error('Supabase save error:', supabaseError);
                      // Continue anyway, local storage is saved
                    }
                    
                    setShowSaveBuildModal(false);
                    setBuildName('');
                    await persistCustomBuilderPresetObject(buildData);
                    Alert.alert('Success', 'Build saved to your profile!');
                  } catch (error) {
                    console.error('❌ Error saving build:', error);
                    Alert.alert('Error', 'Failed to save build. Please try again.');
                  }
                }}
              >
                <Text style={styles.saveBuildModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Relic Picker Modal */}
      <Modal
        visible={relicPickerTarget !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setRelicPickerTarget(null);
          setItemSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {relicPickerTarget === 'starting' ? 'Select Starting Relic' : 'Select Final Relic'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setRelicPickerTarget(null);
                  setItemSearchQuery('');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search relics..."
              placeholderTextColor="#64748b"
              value={itemSearchQuery}
              onChangeText={setItemSearchQuery}
            />
            <ScrollView style={styles.modalContent}>
              {relics
                .filter((relic) => {
                  if (!itemSearchQuery.trim()) return true;
                  const query = itemSearchQuery.toLowerCase();
                  const name = (relic.name || relic.internalName || '').toString().toLowerCase();
                  return name.includes(query);
                })
                .map((relic, index) => {
                  const name = relic.name || relic.internalName || 'Unknown';
                  const icon = relic.icon || relic.internalName;
                  const localIcon = getLocalItemIcon(icon);
                  const iconKey = `relic-picker-${relic.internalName || relic.name || index}`;
                  const useFallback = failedItemIcons[iconKey];
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.itemPickerItem}
                      onPress={() => {
                        if (relicPickerTarget === 'starting') setStartingRelic(relic);
                        else if (relicPickerTarget === 'final') setFinalRelic(relic);
                        setRelicPickerTarget(null);
                        setItemSearchQuery('');
                      }}
                    >
                      {localIcon ? (() => {
                        const imageSource = localIcon.primary || localIcon;
                        const fallbackSource = localIcon.fallback;
                        
                        if (fallbackSource && !useFallback) {
                          return (
                            <Image
                              source={imageSource}
                              style={styles.itemPickerIcon}
                              resizeMode="cover"
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
                              style={styles.itemPickerIcon}
                              resizeMode="cover"
                            />
                          );
                        }
                        
                        return (
                          <Image
                            source={imageSource}
                            style={styles.itemPickerIcon}
                            resizeMode="cover"
                          />
                        );
                      })() : null}
                      <View style={styles.itemPickerInfo}>
                        <View style={styles.itemPickerNameRow}>
                          {renderItemEffectIcon(relic)}
                          <Text style={styles.itemPickerName}>{name}</Text>
                        </View>
                        {renderGoldCostRow(relic, styles.itemPickerCost, styles.itemPickerGoldIcon)}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Item Swap Modal */}
      <Modal
        visible={showSwapModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSwapModal(false);
          setSwapItem(null);
          setSwapReasoning('');
          setItemSearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowSwapModal(false);
            setSwapItem(null);
            setSwapReasoning('');
            setItemSearchQuery('');
          }}
        >
          <Pressable
            style={styles.saveBuildModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.saveBuildModalHeader}>
              <Text style={styles.saveBuildModalTitle}>
                {currentSwapIndex !== null ? 'Edit Swap' : 'Add Item Swap'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowSwapModal(false);
                  setSwapItem(null);
                  setSwapReasoning('');
                  setItemSearchQuery('');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.saveBuildModalLabel}>Item:</Text>
            <TouchableOpacity
              style={styles.swapItemSelector}
              onPress={() => {
                // Temporarily close swap modal and open item picker
                // We'll reopen swap modal after item selection
                setShowSwapModal(false);
                setShowItemPicker(999); // Special index for swap item selection
              }}
            >
              {swapItem ? (
                <View style={styles.swapItemSelectorContent}>
                  {(() => {
                    const iconName = swapItem.icon || swapItem.internalName;
                    const localIcon = getLocalItemIcon(iconName);
                    if (localIcon) {
                      const imageSource = localIcon.primary || localIcon;
                      const fallbackSource = localIcon.fallback;
                      const iconKey = `swap-item-${swapItem.internalName || swapItem.name}`;
                      const useFallback = failedItemIcons[iconKey];
                      
                      if (fallbackSource && !useFallback) {
                        return (
                          <Image
                            source={imageSource}
                            style={styles.swapItemSelectorIcon}
                            resizeMode="cover"
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
                            style={styles.swapItemSelectorIcon}
                            resizeMode="cover"
                          />
                        );
                      }
                      
                      return (
                        <Image
                          source={imageSource}
                          style={styles.swapItemSelectorIcon}
                          resizeMode="cover"
                        />
                      );
                    }
                    return null;
                  })()}
                  <Text style={styles.swapItemSelectorText}>
                    {swapItem.name || swapItem.internalName}
                  </Text>
                </View>
              ) : (
                <View style={styles.swapItemSelectorPlaceholder}>
                  <Text style={styles.swapItemSelectorPlaceholderText}>+ Tap to select item</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.saveBuildModalLabel}>Reasoning:</Text>
            <TextInput
              style={[styles.saveBuildModalInput, styles.swapReasoningInput]}
              placeholder="Explain when to use this swap..."
              placeholderTextColor="#64748b"
              value={swapReasoning}
              onChangeText={setSwapReasoning}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.saveBuildModalButtons}>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonCancel]}
                onPress={() => {
                  setShowSwapModal(false);
                  setSwapItem(null);
                  setSwapReasoning('');
                  setItemSearchQuery('');
                }}
              >
                <Text style={styles.saveBuildModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonSave]}
                onPress={() => {
                  if (!swapItem) {
                    Alert.alert('Error', 'Please select an item for the swap.');
                    return;
                  }
                  if (!swapReasoning.trim()) {
                    Alert.alert('Error', 'Please provide reasoning for this swap.');
                    return;
                  }
                  
                  if (currentSwapIndex !== null) {
                    // Edit existing swap
                    setItemSwaps(prev => {
                      const newSwaps = [...prev];
                      newSwaps[currentSwapIndex] = { item: swapItem, reasoning: swapReasoning.trim() };
                      return newSwaps;
                    });
                  } else {
                    // Add new swap
                    setItemSwaps(prev => [...prev, { item: swapItem, reasoning: swapReasoning.trim() }]);
                  }
                  
                  setShowSwapModal(false);
                  setSwapItem(null);
                  setSwapReasoning('');
                  setItemSearchQuery('');
                }}
              >
                <Text style={styles.saveBuildModalButtonText}>
                  {currentSwapIndex !== null ? 'Save' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Starting Ability Picker Modal */}
      <Modal
        visible={showStartingAbilityPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowStartingAbilityPicker(false);
          setCurrentStartingAbilityLevel(0);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowStartingAbilityPicker(false);
            setCurrentStartingAbilityLevel(0);
          }}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Ability for Level {currentStartingAbilityLevel + 1}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowStartingAbilityPicker(false);
                  setCurrentStartingAbilityLevel(0);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedGod && selectedGod.abilities && Object.keys(selectedGod.abilities).map((abilityKey) => {
                const ability = selectedGod.abilities[abilityKey];
                const isSelected = startingAbilityOrder[currentStartingAbilityLevel] === abilityKey;
                return (
                  <TouchableOpacity
                    key={abilityKey}
                    style={[
                      styles.itemPickerItem,
                      isSelected && { backgroundColor: '#1e3a5f' }
                    ]}
                    onPress={() => {
                      const newStartingOrder = [...startingAbilityOrder];
                      newStartingOrder[currentStartingAbilityLevel] = abilityKey;
                      setStartingAbilityOrder(newStartingOrder);
                      setShowStartingAbilityPicker(false);
                      setCurrentStartingAbilityLevel(0);
                    }}
                  >
                    {ability.icon && (
                      <Image
                        source={getLocalGodAsset(ability.icon)}
                        style={styles.itemPickerIcon}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.itemPickerInfo}>
                      <Text style={styles.itemPickerName}>
                        {ability.name || abilityKey} {isSelected && '✓'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Post to Contributor Builds Modal */}
      <Modal
        visible={showPostToCertifiedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPostToCertifiedModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowPostToCertifiedModal(false)}
        >
          <Pressable 
            style={styles.saveBuildModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.saveBuildModalHeader}>
              <Text style={styles.saveBuildModalTitle}>Post to Contributor Builds</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPostToCertifiedModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.saveBuildModalLabel}>Build Name:</Text>
            <TextInput
              style={styles.saveBuildModalInput}
              placeholder="Enter build name (e.g., 'Full-Damage STR Jungle Build')"
              placeholderTextColor="#64748b"
              value={certifiedBuildName}
              onChangeText={setCertifiedBuildName}
              autoFocus={true}
            />
            
            <Text style={styles.saveBuildModalLabel}>Gamemodes:</Text>
            <View style={styles.gamemodeTagsContainer}>
              {['All Modes', 'Joust', 'Duel', 'Arena', 'Conquest', 'Assault'].map((mode) => {
                const isSelected = selectedGamemodes.includes(mode);
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.gamemodeTag,
                      isSelected && styles.gamemodeTagSelected
                    ]}
                    onPress={() => {
                      if (mode === 'All Modes') {
                        setSelectedGamemodes(['All Modes']);
                      } else {
                        let newModes = selectedGamemodes.filter(m => m !== 'All Modes');
                        if (isSelected) {
                          newModes = newModes.filter(m => m !== mode);
                          if (newModes.length === 0) {
                            newModes = ['All Modes'];
                          }
                        } else {
                          newModes.push(mode);
                        }
                        setSelectedGamemodes(newModes);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.gamemodeTagText,
                      isSelected && styles.gamemodeTagTextSelected
                    ]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.saveBuildModalButtons}>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonCancel]}
                onPress={() => {
                  setShowPostToCertifiedModal(false);
                  setCertifiedBuildName('');
                  setSelectedGamemodes(['All Modes']);
                }}
              >
                <Text style={styles.saveBuildModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonSave, isPostingToCertified && styles.saveBuildModalButtonDisabled]}
                onPress={async () => {
                  if (!certifiedBuildName.trim()) {
                    Alert.alert('Error', 'Please enter a build name.');
                    return;
                  }

                  const currentUser = await storage.getItem('currentUser');
                  if (!currentUser) {
                    setShowPostToCertifiedModal(false);
                    setShowLoginModal(true);
                    return;
                  }

                  setIsPostingToCertified(true);
                  
                  try {
                    const { supabase } = require('../../config/supabase');
                    const authSession = await ensureAppWriteSession(currentUser);
                    if (!authSession.ready) {
                      Alert.alert('Sign in required', 'Sign out and sign in again to post contributor builds.');
                      setIsPostingToCertified(false);
                      return;
                    }
                    
                    const gamemodesToSave = selectedGamemodes.includes('All Modes')
                      ? ['Joust', 'Duel', 'Arena', 'Conquest', 'Assault']
                      : selectedGamemodes;
                    
                    const buildData = {
                      name: certifiedBuildName.trim(),
                      god: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
                      godInternalName: selectedGod.internalName || selectedGod.GodName,
                      godIcon: selectedGod.icon || selectedGod.GodIcon,
                      items: selectedItems.filter(Boolean).map(item => ({
                        name: item.name || item.internalName,
                        internalName: item.internalName,
                        icon: item.icon,
                      })),
                      startingItems: startingItems.filter(Boolean).map(item => ({
                        name: item.name || item.internalName,
                        internalName: item.internalName,
                        icon: item.icon,
                      })),
                      relic: relicToPayload(finalRelic),
                      starting_relic: relicToPayload(startingRelic),
                      final_relic: relicToPayload(finalRelic),
                      godLevel,
                      aspectActive: aspectActive && selectedGod.aspect ? true : false,
                      author: currentUser,
                      notes: buildTips.filter(t => t && t.trim()).join('\n') || certifiedBuildName.trim(),
                      tips: buildTips.filter(t => t && t.trim()).join('\n') || null,
                      abilityLevelingOrder: abilityLevelingOrder,
                      startingAbilityOrder: startingAbilityOrder,
                      itemSwaps: itemSwaps.map(swap => ({
                        item: swap.item,
                        reasoning: swap.reasoning,
                      })),
                      roles: selectedRoles,
                      gamemodes: gamemodesToSave,
                      createdAt: new Date().toISOString(),
                      isCertified: true,
                    };

                    // Check if we're editing an existing build
                    const isEditing = buildToEdit && buildToEdit.databaseId && buildToEdit.databaseTable === 'contributor_builds';
                    
                    const updateData = {
                      build_name: certifiedBuildName.trim(),
                      god_name: buildData.god,
                      god_internal_name: buildData.godInternalName,
                      items: buildData.items,
                      starting_items: buildData.startingItems,
                      relic: buildData.relic,
                      starting_relic: buildData.starting_relic,
                      final_relic: buildData.final_relic,
                      god_level: Math.round(godLevel),
                      aspect_active: buildData.aspectActive,
                      notes: buildData.notes || buildData.tips || certifiedBuildName.trim(),
                      tips: (buildData.tips && buildData.tips.trim()) || null,
                      ability_leveling_order: buildData.abilityLevelingOrder,
                      starting_ability_order: buildData.startingAbilityOrder,
                      item_swaps: buildData.itemSwaps,
                      roles: buildData.roles,
                      gamemodes: gamemodesToSave,
                      updated_at: new Date().toISOString(),
                    };

                    let data, error;
                    if (isEditing) {
                      // Use RPC so update works when RLS blocks direct UPDATE (e.g. custom login)
                      const result = await supabase.rpc('update_contributor_build', {
                        build_id: String(buildToEdit.databaseId),
                        request_username: currentUser,
                        payload: updateData,
                      });
                      error = result.error;
                      const rpcRows = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
                      data = rpcRows[0] ?? null;
                    } else {
                      // Insert new build
                      const result = await supabase
                        .from('contributor_builds')
                        .insert({
                          username: currentUser,
                          ...updateData,
                          created_at: new Date().toISOString(),
                        });
                      data = result.data;
                      error = result.error;
                    }

                    if (error) {
                      console.error('Error posting to contributor builds:', error.code, error.message, error.details);
                      if (error.code === 'MISSING_CONFIG') {
                        Alert.alert(
                          'Development Mode', 
                          'Supabase is not configured in development. In production, your builds will be saved properly.'
                        );
                        setShowPostToCertifiedModal(false);
                        setCertifiedBuildName('');
                        setSelectedGamemodes(['All Modes']);
                        setIsPostingToCertified(false);
                        Alert.alert('Success (Dev Mode)', 'Build posted! In production, this will be saved to the database.');
                      } else {
                        Alert.alert('Update failed', error.message || 'Could not save to server. Check console for details.');
                      }
                      setIsPostingToCertified(false);
                      return;
                    }
                    if (isEditing && data == null) {
                      console.error('Contributor build update: no row returned. Run supabase_update_contributor_build_rpc.sql in Supabase SQL Editor.');
                      Alert.alert('Update failed', 'No rows were updated. Run the SQL in supabase_update_contributor_build_rpc.sql in your Supabase project.');
                      setIsPostingToCertified(false);
                      return;
                    }

                    setShowPostToCertifiedModal(false);
                    setCertifiedBuildName('');
                    setSelectedGamemodes(['All Modes']);
                    setIsPostingToCertified(false);
                    
                    if (onEditComplete) onEditComplete();
                    
                    Alert.alert('Success', `Your contributor build has been ${isEditing ? 'updated' : 'posted'}!`);
                  } catch (error) {
                    console.error('Exception posting to contributor builds:', error);
                    Alert.alert('Error', 'An error occurred. Please try again.');
                    setIsPostingToCertified(false);
                  }
                }}
                disabled={isPostingToCertified}
              >
                {isPostingToCertified ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBuildModalButtonText}>
                    {buildToEdit && buildToEdit.databaseId && buildToEdit.databaseTable === 'contributor_builds' ? 'Update Build' : 'Post Build'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Post to Community Builds Modal */}
      <Modal
        visible={showPostToCommunityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPostToCommunityModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowPostToCommunityModal(false)}
        >
          <Pressable 
            style={styles.saveBuildModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.saveBuildModalHeader}>
              <Text style={styles.saveBuildModalTitle}>
                {buildToEdit && buildToEdit.databaseTable === 'community_builds' ? 'Edit Community Build' : 'Post Build'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPostToCommunityModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {postAsDisplayName ? (
              <Text style={styles.saveBuildModalPostingAs}>
                Posting as <Text style={styles.saveBuildModalPostingAsName}>{postAsDisplayName}</Text>
                {isUserCertified && !(buildToEdit && buildToEdit.databaseTable === 'community_builds')
                  ? ' · Community + Partner builds'
                  : ''}
              </Text>
            ) : null}
            <Text style={styles.saveBuildModalHint}>
              Name defaults to your god and roles. Gamemodes default to All Modes.
            </Text>
            <Text style={styles.saveBuildModalLabel}>Build Name:</Text>
            <TextInput
              style={styles.saveBuildModalInput}
              placeholder="Enter build name (e.g., 'Full-Damage STR Jungle Build')"
              placeholderTextColor="#64748b"
              value={communityBuildName}
              onChangeText={setCommunityBuildName}
              autoFocus={true}
            />
            
            <Text style={styles.saveBuildModalLabel}>Gamemodes:</Text>
            <View style={styles.gamemodeTagsContainer}>
              {['All Modes', 'Joust', 'Duel', 'Arena', 'Conquest', 'Assault'].map((mode) => {
                const isSelected = selectedGamemodes.includes(mode);
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.gamemodeTag,
                      isSelected && styles.gamemodeTagSelected
                    ]}
                    onPress={() => {
                      if (mode === 'All Modes') {
                        // If "All Modes" is selected, clear other selections
                        setSelectedGamemodes(['All Modes']);
                      } else {
                        // Remove "All Modes" if it's selected, and toggle this mode
                        let newModes = selectedGamemodes.filter(m => m !== 'All Modes');
                        if (isSelected) {
                          // Deselect this mode
                          newModes = newModes.filter(m => m !== mode);
                          // If no modes selected, default to "All Modes"
                          if (newModes.length === 0) {
                            newModes = ['All Modes'];
                          }
                        } else {
                          // Select this mode
                          newModes.push(mode);
                        }
                        setSelectedGamemodes(newModes);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.gamemodeTagText,
                      isSelected && styles.gamemodeTagTextSelected
                    ]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.saveBuildModalButtons}>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonCancel]}
                onPress={() => {
                  setShowPostToCommunityModal(false);
                  setCommunityBuildName('');
                  setSelectedGamemodes(['All Modes']);
                }}
              >
                <Text style={styles.saveBuildModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBuildModalButton, styles.saveBuildModalButtonSave, isPostingToCommunity && styles.saveBuildModalButtonDisabled]}
                onPress={() => submitCommunityBuild()}
                disabled={isPostingToCommunity}
              >
                {isPostingToCommunity ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBuildModalButtonText}>
                    {buildToEdit && buildToEdit.databaseId && buildToEdit.databaseTable === 'community_builds' ? 'Update Build' : 'Post Build'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType={IS_WEB ? "fade" : "slide"}
        onRequestClose={() => {
          setShowLoginModal(false);
          setLoginUsername('');
          setLoginPassword('');
        }}
      >
        <Pressable
          style={styles.loginModalOverlay}
          onPress={() => {
            setShowLoginModal(false);
            setLoginUsername('');
            setLoginPassword('');
          }}
        >
          <Pressable style={styles.loginModalContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.loginModalTitle}>Sign In</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#64748b"
              value={loginUsername}
              onChangeText={setLoginUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={loginPassword}
              onChangeText={setLoginPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowLoginModal(false);
                  setLoginUsername('');
                  setLoginPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isLoggingIn && styles.confirmButtonDisabled]}
                onPress={async () => {
                  if (!loginUsername.trim() || !loginPassword.trim()) {
                    Alert.alert('Error', 'Please enter both username and password');
                    return;
                  }
                  
                  setIsLoggingIn(true);
                  try {
                    const hashPassword = (password) => {
                      return CryptoJS.SHA256(password).toString();
                    };
                    
                    const passwordHash = hashPassword(loginPassword);
                    
                    // Try Supabase first
                    try {
                      const { supabase } = require('../../config/supabase');
                      const { data, error } = await supabase
                        .from('app_users')
                        .select('username, password_hash')
                        .eq('username', loginUsername.trim())
                        .single();
                      
                      if (error || !data) {
                        // Try local storage as fallback
                        const localUser = await storage.getItem(`user_${loginUsername.trim()}`);
                        if (localUser) {
                          const userData = JSON.parse(localUser);
                          if (userData.password_hash === passwordHash) {
                            await finalizeAppLogin(loginUsername.trim(), loginPassword, storage);
                            setShowLoginModal(false);
                            setLoginUsername('');
                            setLoginPassword('');
                            Alert.alert('Success', 'Logged in successfully!');
                            setIsLoggingIn(false);
                            if (IS_WEB && typeof window !== 'undefined') {
                              window.location.reload();
                            }
                            return;
                          }
                        }
                        Alert.alert('Error', 'Invalid username or password');
                      } else if (data && data.password_hash === passwordHash) {
                        await finalizeAppLogin(loginUsername.trim(), loginPassword, storage);
                        setShowLoginModal(false);
                        setLoginUsername('');
                        setLoginPassword('');
                        Alert.alert('Success', 'Logged in successfully!');
                        setIsLoggingIn(false);
                        if (IS_WEB && typeof window !== 'undefined') {
                          window.location.reload();
                        }
                        return;
                      } else {
                        Alert.alert('Error', 'Invalid username or password');
                      }
                    } catch (supabaseError) {
                      // Try local storage as fallback
                      const localUser = await storage.getItem(`user_${loginUsername.trim()}`);
                      if (localUser) {
                        const userData = JSON.parse(localUser);
                        if (userData.password_hash === passwordHash) {
                          await finalizeAppLogin(loginUsername.trim(), loginPassword, storage);
                          setShowLoginModal(false);
                          setLoginUsername('');
                          setLoginPassword('');
                          Alert.alert('Success', 'Logged in successfully!');
                          setIsLoggingIn(false);
                          if (IS_WEB && typeof window !== 'undefined') {
                            window.location.reload();
                          }
                          return;
                        }
                      }
                      Alert.alert('Error', 'Invalid username or password');
                    }
                  } catch (error) {
                    console.error('Login error:', error);
                    Alert.alert('Error', 'An error occurred during login. Please try again.');
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
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
              style={styles.loginRegisterLink}
              onPress={() => {
                Alert.alert(
                  'Create Account',
                  'To create an account, please go to the Profile page in the More section.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.loginRegisterText}>Don't have an account? Create one in Profile</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {renderPostMenuModal()}

      <BuildStatChartModal
        visible={showStatChartModal}
        onClose={() => setShowStatChartModal(false)}
        data={statProgression}
        godPortraitUri={godPortraitUri}
        getStepIconUri={getStepIconUri}
        god={selectedGod}
        godLevel={godLevel}
        finalItems={resolvedFinalItems}
        onApplyOptimizedOrder={applyOptimizedItemOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071024',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: IS_WEB ? 16 : 12,
    ...(IS_WEB && {
      maxWidth: WEB_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 24,
    }),
  },
  desktopBuilderColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    width: '100%',
    marginBottom: 20,
  },
  desktopBuilderLeft: {
    flex: 0.38,
    minWidth: 280,
    maxWidth: 400,
    marginBottom: 0,
    alignSelf: 'flex-start',
  },
  tabletBuilderLeft: {
    flex: 0.42,
    minWidth: 240,
    maxWidth: 420,
  },
  mobileBuilderRightWrap: {
    width: '100%',
  },
  desktopBuilderRightWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tabletBuilderRightWrap: {
    flexDirection: 'column',
    gap: 10,
  },
  desktopBuilderBuildPanel: {
    flex: 1,
    minWidth: 420,
    marginBottom: 0,
    padding: 12,
  },
  tabletBuilderBuildPanel: {
    minWidth: 0,
    width: '100%',
    padding: 10,
  },
  desktopBuilderGuidePanel: {
    width: 280,
    minWidth: 260,
    maxWidth: 300,
    flexShrink: 0,
    flexGrow: 0,
    marginBottom: 0,
    padding: 10,
    alignSelf: 'flex-start',
  },
  tabletBuilderGuidePanel: {
    width: '100%',
    maxWidth: '100%',
    marginBottom: 0,
    padding: 10,
  },
  desktopGodRoleInBuild: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    overflow: 'visible',
    zIndex: 50,
  },
  sectionTitleCompact: {
    fontSize: 15,
    marginBottom: 6,
  },
  desktopStatsPanel: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  desktopStatsSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  desktopStatsSplitStacked: {
    flexDirection: 'column',
  },
  desktopStatsGridCol: {
    flex: 1,
    minWidth: 0,
  },
  desktopStatsChartCol: {
    flex: 1.1,
    minWidth: 240,
  },
  desktopStatsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statChartGraphBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.45)',
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statChartGraphBtnDisabled: {
    opacity: 0.35,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1220',
  },
  statChartGraphIcon: {
    width: 16,
    height: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
  },
  statChartGraphBar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: '#c9a227',
  },
  desktopStatsPlaceholder: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  desktopStatsPlaceholderTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  desktopStatsPlaceholderText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  desktopItemsBuildTwoColumn: {
    gap: 10,
    alignItems: 'stretch',
  },
  desktopBuildColumn: {
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  desktopFinalBuildStack: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  starterRelicRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
    gap: 10,
    marginBottom: IS_WEB ? 6 : 4,
  },
  buildSlotColumn: {
    alignItems: 'center',
    flexShrink: 0,
  },
  buildSlotLabelSpacer: {
    height: 14,
    marginBottom: 4,
  },
  starterRelicDivider: {
    width: 1,
    alignSelf: 'stretch',
    minHeight: 72,
    backgroundColor: 'rgba(125, 211, 252, 0.28)',
    marginHorizontal: 2,
    marginBottom: 0,
  },
  relicInlineLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  desktopFinalItemRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  desktopFinalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 8,
    width: '100%',
  },
  desktopFinalSlot: {
    width: 72,
    minWidth: 72,
    maxWidth: 72,
    flexGrow: 0,
    flexShrink: 0,
  },
  desktopBuildSlotButton: {
    aspectRatio: undefined,
    width: '100%',
    height: 72,
    minHeight: 72,
    maxHeight: 72,
    paddingTop: 4,
    paddingBottom: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    justifyContent: 'flex-start',
  },
  desktopBuildItemName: {
    color: '#94a3b8',
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 11,
    width: '100%',
    position: 'absolute',
    bottom: 3,
    left: 2,
    right: 2,
  },
  desktopRelicRow: {
    flexDirection: 'row',
    width: '100%',
  },
  desktopRelicSlotWrap: {
    width: 72,
  },
  desktopRelicSlotButton: {},
  buildGuideBodyDesktop: {
    marginTop: 6,
    gap: 8,
  },
  buildGuideSubTitleDesktop: {
    fontSize: 12,
    marginBottom: 4,
  },
  abilityOrderTabRowDesktop: {
    gap: 4,
    marginBottom: 4,
  },
  abilityOrderTabDesktop: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  sectionSubtitleDesktop: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 13,
  },
  startingAbilityOrderContainerDesktop: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginBottom: 4,
    justifyContent: 'space-between',
    width: '100%',
  },
  startingAbilityLevelSlotDesktop: {
    flex: 1,
    minWidth: 0,
    maxWidth: 52,
    width: '18%',
  },
  startingAbilityLevelLabelDesktop: {
    fontSize: 8,
    marginBottom: 2,
  },
  startingAbilitySlotButtonDesktop: {
    aspectRatio: undefined,
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    padding: 2,
    borderRadius: 6,
  },
  startingAbilityIconDesktop: {
    width: 26,
    height: 26,
    marginBottom: 1,
  },
  startingAbilityIconPlaceholderDesktop: {
    width: 26,
    height: 26,
    marginBottom: 1,
  },
  startingAbilityPlaceholderTextDesktop: {
    fontSize: 7,
    marginTop: 0,
  },
  buildGuideHeaderCompact: {
    paddingVertical: 8,
    marginBottom: 0,
  },
  abilityLevelingContainerSingleRowDesktop: {
    gap: 6,
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  abilityLevelingButtonSmallDesktop: {
    width: 44,
    height: 44,
    padding: 2,
  },
  abilityLevelingIconSmallDesktop: {
    width: 36,
    height: 36,
  },
  clearAbilityOrderButtonDesktop: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  clearAbilityOrderTextDesktop: {
    fontSize: 11,
  },
  tipsHeaderDesktop: {
    marginBottom: 4,
  },
  addTipButtonDesktop: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addTipButtonTextDesktop: {
    fontSize: 11,
  },
  tipInputContainerDesktop: {
    marginBottom: 6,
  },
  buildTipsInputDesktop: {
    padding: 8,
    fontSize: 12,
    minHeight: 56,
    maxHeight: 100,
  },
  desktopToolbarLoadBtn: {
    marginLeft: 'auto',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  desktopToolbarLoadBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071024',
  },
  loadingText: {
    color: '#cbd5e1',
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: IS_WEB ? 20 : 12,
    backgroundColor: '#0b1226',
    borderRadius: IS_WEB ? 10 : 8,
    padding: IS_WEB ? 14 : 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 18 : 15,
    fontWeight: '700',
    marginBottom: IS_WEB ? 10 : 6,
  },
  sectionTitleInline: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 15 : 13,
    fontWeight: '700',
    marginBottom: IS_WEB ? 8 : 6,
  },
  sectionTitleInlineCenterWeb: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  itemsBuildTwoColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: IS_WEB ? 12 : 8,
    width: '100%',
  },
  itemsBuildDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#1e3a5f',
    marginVertical: 2,
    opacity: 0.9,
    flexShrink: 0,
  },
  itemsBuildColumnStart: {
    flex: 1,
    minWidth: 0,
    ...(IS_WEB && { alignItems: 'center' }),
  },
  itemsBuildColumnFinal: {
    flex: 1,
    minWidth: 0,
    ...(IS_WEB && { alignItems: 'center' }),
  },
  relicSectionLabel: {
    width: '100%',
    textAlign: 'center',
  },
  relicBlockInColumn: {
    marginTop: IS_WEB ? 10 : 8,
    width: '100%',
    alignItems: 'center',
  },
  compactStarterRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: IS_WEB ? 6 : 4,
  },
  compactStarterSlotWrap: {
    ...(IS_WEB
      ? { width: 72, minWidth: 72, maxWidth: 72, flexShrink: 0 }
      : { flex: 1, minWidth: 0, maxWidth: '42%', flexShrink: 1 }),
  },
  compactStartingRows: {
    width: '100%',
    alignItems: 'center',
    gap: IS_WEB ? 8 : 6,
  },
  compactStartingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: IS_WEB ? 8 : 6,
    width: IS_WEB ? 72 * 2 + 8 : '100%',
    maxWidth: '100%',
  },
  compactFinalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 6 : 4,
    justifyContent: IS_WEB ? 'center' : 'flex-start',
  },
  compactFinalGridMobileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: 6,
    marginBottom: 6,
  },
  /** Web: Final build stack — row of 1 (starter S) + row of 3 + row of 3. */
  compactFinalBuildWeb: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    flexDirection: 'column',
    gap: 14,
    marginBottom: IS_WEB ? 10 : 4,
  },
  compactFinalGridWebRowSingle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  compactFinalGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'center',
    width: IS_WEB ? 72 * 3 + 14 * 2 : '100%',
    maxWidth: '100%',
    columnGap: 14,
    rowGap: 14,
  },
  compactFinalSlotWeb: {
    ...(IS_WEB && {
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      flexGrow: 0,
      flexShrink: 0,
    }),
  },
  compactStartingSlot: {
    width: '48%',
    minWidth: 56,
    maxWidth: 72,
    ...(IS_WEB && {
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      flexGrow: 0,
      flexShrink: 0,
    }),
  },
  compactFinalSlot: {
    flex: 1,
    minWidth: 0,
    maxWidth: '33.333%',
  },
  webBuildSlotButton: IS_WEB
    ? {
        aspectRatio: undefined,
        width: '100%',
        height: 72,
        minHeight: 72,
        maxHeight: 72,
        paddingTop: 4,
        paddingBottom: 16,
        paddingHorizontal: 3,
        justifyContent: 'flex-start',
      }
    : {},
  nativeBuildSlotButton: {
    aspectRatio: undefined,
    width: '100%',
    minHeight: 68,
    maxHeight: 80,
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 3,
    justifyContent: 'flex-start',
  },
  buildSlotIcon: {
    width: 44,
    height: 44,
    borderRadius: 3,
    alignSelf: 'center',
  },
  buildSlotIconPh: {
    width: 44,
    height: 44,
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactSlotButton: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 4 : 2,
    width: '100%',
    overflow: 'hidden',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  compactItemIcon: {
    width: '86%',
    height: '52%',
    borderRadius: 3,
    alignSelf: 'center',
  },
  compactItemPh: {
    width: '86%',
    height: '52%',
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Compact relic tiles — extra small on native so art fits with label. */
  compactRelicSlotIcon: {
    width: IS_WEB ? '64%' : '46%',
    height: IS_WEB ? '38%' : '24%',
    borderRadius: 3,
    alignSelf: 'center',
  },
  compactRelicSlotPh: {
    width: IS_WEB ? '64%' : '46%',
    height: IS_WEB ? '38%' : '24%',
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactItemPhText: {
    color: '#64748b',
    fontSize: IS_WEB ? 13 : 10,
    fontWeight: '700',
  },
  compactItemName: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 8 : 7,
    textAlign: 'center',
    lineHeight: IS_WEB ? 10 : 9,
    width: '100%',
    paddingHorizontal: 1,
    position: 'absolute',
    bottom: 3,
    left: 2,
    right: 2,
    marginTop: 0,
  },
  compactSlotPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 28,
    ...(IS_WEB ? { height: 44 } : { height: 40 }),
  },
  compactSlotPlus: {
    color: '#475569',
    fontSize: IS_WEB ? 20 : 17,
    fontWeight: '300',
  },
  compactSlotHint: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 1,
    fontWeight: '700',
  },
  godStatsExpandableWrap: {
    marginTop: IS_WEB ? 12 : 10,
    paddingTop: IS_WEB ? 12 : 10,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  godStatsExpandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: IS_WEB ? 4 : 2,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  godStatsExpandHeaderTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  godStatsExpandHeaderTitle: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '700',
  },
  godStatsExpandHeaderTitleCompact: {
    fontSize: 14,
  },
  godStatsExpandHeaderMeta: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 13 : 12,
    fontWeight: '600',
  },
  godStatsExpandChevron: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '700',
  },
  statsExpandedBody: {
    marginTop: IS_WEB ? 8 : 6,
  },
  statsEmbedLevelBlock: {
    marginBottom: IS_WEB ? 10 : 8,
    paddingBottom: IS_WEB ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  statsEmbedLevelBlockDesktop: {
    marginBottom: 6,
    paddingBottom: 6,
  },
  stanceSwitcherBlock: {
    marginBottom: IS_WEB ? 10 : 8,
    paddingBottom: IS_WEB ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  stanceSwitcherBlockDesktop: {
    marginBottom: 6,
    paddingBottom: 6,
  },
  stanceSwitcherLabel: {
    color: '#64748b',
    fontSize: IS_WEB ? 11 : 10,
    fontWeight: '600',
    marginBottom: IS_WEB ? 6 : 5,
  },
  stanceSwitcherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stanceSwitcherBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  stanceSwitcherBtnActive: {
    borderColor: '#7dd3fc',
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
  },
  stanceSwitcherBtnText: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 12 : 11,
    fontWeight: '700',
  },
  stanceSwitcherBtnTextActive: {
    color: '#7dd3fc',
  },
  statsEmbedLevelHeading: {
    color: '#64748b',
    fontSize: IS_WEB ? 11 : 10,
    fontWeight: '600',
    marginBottom: IS_WEB ? 6 : 5,
  },
  statsEmbedLevelHeadingDesktop: {
    fontSize: 9,
    marginBottom: 4,
  },
  statsEmbedLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_WEB ? 6 : 5,
  },
  statsEmbedLevelBtn: {
    width: IS_WEB ? 28 : 26,
    height: IS_WEB ? 28 : 26,
    borderRadius: IS_WEB ? 14 : 13,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsEmbedLevelBtnDisabled: {
    opacity: 0.35,
  },
  statsEmbedLevelBtnText: {
    color: '#facc15',
    fontSize: IS_WEB ? 16 : 15,
    fontWeight: '700',
    lineHeight: IS_WEB ? 16 : 15,
  },
  statsEmbedSliderHit: {
    flex: 1,
    minHeight: IS_WEB ? 40 : 44,
    justifyContent: 'center',
    ...(IS_WEB && { cursor: 'pointer', touchAction: 'none' }),
  },
  statsEmbedSliderRail: {
    height: IS_WEB ? 6 : 5,
    borderRadius: 3,
    backgroundColor: '#1e293b',
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  statsEmbedSliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#facc15',
    borderRadius: 3,
  },
  statsEmbedSliderThumb: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: IS_WEB ? 15 : 14,
    height: IS_WEB ? 15 : 14,
    borderRadius: IS_WEB ? 8 : 7,
    marginTop: IS_WEB ? -7.5 : -7,
    marginLeft: IS_WEB ? -7.5 : -7,
    backgroundColor: '#facc15',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  compactRelicRemoveOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: 'rgba(15, 23, 36, 0.85)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  abilityOrderTabRow: {
    flexDirection: 'row',
    gap: IS_WEB ? 8 : 6,
    marginBottom: IS_WEB ? 10 : 8,
  },
  abilityOrderTab: {
    flex: 1,
    paddingVertical: IS_WEB ? 10 : 8,
    paddingHorizontal: IS_WEB ? 12 : 8,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  abilityOrderTabActive: {
    backgroundColor: '#0c2d4a',
    borderColor: '#38bdf8',
  },
  abilityOrderTabText: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  abilityOrderTabTextActive: {
    color: '#7dd3fc',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 14 : 12,
    marginBottom: 12,
  },
  // God Selection + compact role chips
  godRoleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginBottom: IS_WEB ? 4 : 2,
    position: 'relative',
    zIndex: 50,
  },
  godRoleSectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  godRoleSectionTitle: {
    marginBottom: IS_WEB ? 4 : 2,
  },
  postMenuWrap: {
    position: 'relative',
    flexShrink: 0,
    zIndex: 100,
  },
  postMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(8, 12, 22, 0.98)',
  },
  postMenuBtnOpen: {
    borderColor: '#7dd3fc',
    backgroundColor: 'rgba(30, 58, 95, 0.55)',
  },
  postMenuBtnText: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  postMenuCaret: {
    color: '#7dd3fc',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  postMenuDropdown: {
    position: 'absolute',
    minWidth: 240,
    right: 0,
    top: '100%',
    marginTop: 6,
    backgroundColor: '#0b1220',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    zIndex: 10000,
    elevation: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  postMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  postMenuItemTextCol: {
    gap: 2,
  },
  postMenuItemTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  postMenuItemHint: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  postMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  postMenuSheet: {
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderBottomWidth: 0,
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 12,
    maxHeight: '70%',
  },
  postMenuSheetTitle: {
    color: '#7dd3fc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  godRoleBlock: {
    width: '100%',
    gap: IS_WEB ? 8 : 6,
    overflow: 'visible',
  },
  godRoleSubtitle: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 12 : 11,
    fontWeight: '500',
    marginTop: -2,
    marginBottom: IS_WEB ? 8 : 6,
    lineHeight: IS_WEB ? 16 : 15,
  },
  rolePickerWrap: {
    width: '100%',
    marginTop: IS_WEB ? 4 : 2,
  },
  roleDropdownTriggerContent: {
    flex: 1,
    minWidth: 0,
  },
  roleDropdownPlaceholder: {
    color: '#64748b',
    fontSize: IS_WEB ? 14 : 13,
    fontWeight: '600',
  },
  roleDropdownSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  roleDropdownSelectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#0c2d4a',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  roleDropdownChipIcon: {
    width: 16,
    height: 16,
  },
  roleDropdownChipText: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
  },
  rolePickerPanel: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rolePickerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: IS_WEB ? 6 : 4,
    width: '100%',
  },
  rolePickerBox: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: IS_WEB ? 7 : 6,
    paddingHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0f1724',
    gap: 3,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  rolePickerBoxSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2d4a',
  },
  rolePickerBoxDisabled: {
    opacity: 0.4,
  },
  rolePickerBoxIcon: {
    width: IS_WEB ? 18 : 16,
    height: IS_WEB ? 18 : 16,
  },
  rolePickerBoxText: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 10 : 9,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  rolePickerBoxTextSelected: {
    color: '#7dd3fc',
  },
  rolePickerBoxTextDisabled: {
    color: '#64748b',
  },
  buildGuideBody: {
    marginTop: 12,
    gap: 16,
  },
  buildGuideSubTitle: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 16 : 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  buildGuideHeaderHint: {
    color: '#64748b',
    fontSize: IS_WEB ? 12 : 11,
    marginTop: 2,
  },
  godSelectorContainer: {
    flexDirection: 'row',
    gap: IS_WEB ? 8 : 6,
    alignItems: 'center',
    width: '100%',
  },
  godSelectorContainerInline: {
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  godSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: IS_WEB ? 8 : 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: IS_WEB ? 52 : 46,
    flex: 1,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  godSelectorWhenInline: {
    flex: 1,
    minWidth: 96,
    minHeight: IS_WEB ? 52 : 46,
  },
  inlineRoleCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 5 : 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignContent: 'center',
  },
  inlineRoleScroll: {
    width: '100%',
    flexGrow: 0,
  },
  inlineRoleScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_WEB ? 6 : 5,
    paddingVertical: 2,
    paddingRight: 2,
  },
  inlineRoleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: IS_WEB ? 5 : 4,
    paddingHorizontal: IS_WEB ? 8 : 6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0f1724',
    flexShrink: 0,
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  inlineRoleChipSelected: {
    backgroundColor: '#0c4a6e',
    borderColor: '#38bdf8',
  },
  inlineRoleChipDisabled: {
    opacity: 0.45,
  },
  inlineRoleChipIcon: {
    width: IS_WEB ? 15 : 14,
    height: IS_WEB ? 15 : 14,
  },
  inlineRoleChipText: {
    color: '#e2e8f0',
    fontSize: IS_WEB ? 11 : 10,
    fontWeight: '600',
  },
  inlineRoleChipTextSelected: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  inlineRoleChipTextDisabled: {
    color: '#64748b',
  },
  godIcon: {
    width: IS_WEB ? 38 : 34,
    height: IS_WEB ? 38 : 34,
    borderRadius: 6,
    marginRight: IS_WEB ? 8 : 6,
    flexShrink: 0,
  },
  godIconPlaceholder: {
    width: IS_WEB ? 38 : 34,
    height: IS_WEB ? 38 : 34,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: IS_WEB ? 8 : 6,
    flexShrink: 0,
  },
  godIconPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 17 : 15,
    fontWeight: '700',
  },
  godNameText: {
    color: '#e6eef8',
    fontSize: IS_WEB ? 14 : 13,
    fontWeight: '600',
    flex: 1,
    paddingRight: 6,
  },
  buildSectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: IS_WEB ? 8 : 6,
    width: '100%',
    ...(IS_WEB && {
      alignSelf: 'stretch',
      justifyContent: 'flex-start',
    }),
  },
  buildItemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: IS_WEB ? 12 : 10,
    paddingHorizontal: IS_WEB ? 2 : 0,
    gap: 12,
  },
  buildItemsHeaderTitle: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 20 : 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buildItemsHeaderGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_WEB ? 8 : 6,
    flexShrink: 0,
  },
  buildItemsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_WEB ? 10 : 8,
    flexShrink: 1,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  buildViewSwapBtn: {
    paddingVertical: IS_WEB ? 8 : 6,
    paddingHorizontal: IS_WEB ? 12 : 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
    backgroundColor: '#0c2d4a',
    ...(IS_WEB && { cursor: 'pointer' }),
  },
  buildViewSwapBtnText: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 12 : 11,
    fontWeight: '700',
  },
  buildItemsSingleColumn: {
    width: '100%',
  },
  buildRequiredMark: {
    color: '#f87171',
    fontWeight: '800',
  },
  buildItemsHeaderGoldIcon: {
    width: IS_WEB ? 22 : 20,
    height: IS_WEB ? 22 : 20,
  },
  buildItemsHeaderGoldText: {
    color: '#fbbf24',
    fontSize: IS_WEB ? 16 : 15,
    fontWeight: '700',
  },
  buildClearAllBtnInline: {
    paddingVertical: IS_WEB ? 8 : 5,
    paddingHorizontal: IS_WEB ? 14 : 7,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 36, 0.96)',
    borderWidth: 1,
    borderColor: '#334155',
    ...(IS_WEB && {
      cursor: 'pointer',
      backgroundColor: '#0f172a',
      borderColor: '#7dd3fc',
      borderWidth: 1,
      minWidth: 88,
      alignItems: 'center',
      justifyContent: 'center',
    }),
  },
  buildClearAllBtnLabelWeb: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buildClearAllBtnEmoji: {
    fontSize: IS_WEB ? 17 : 15,
    lineHeight: IS_WEB ? 19 : 17,
  },
  // Item Slots
  starterItemRow: {
    marginBottom: IS_WEB ? 12 : 10,
    alignItems: 'center',
  },
  starterItemLabel: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 14 : 12,
    fontWeight: '700',
    marginBottom: IS_WEB ? 8 : 6,
    textAlign: 'center',
  },
  itemSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 8 : 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  itemSlot: {
    width: IS_WEB ? '30%' : '30%',
    maxWidth: IS_WEB ? 120 : undefined,
    minWidth: IS_WEB ? 80 : 70,
    flexShrink: 0,
    flexGrow: 0,
    marginBottom: IS_WEB ? 8 : 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  itemSlotButton: {
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: IS_WEB ? 6 : 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 8 : 3,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    display: 'flex',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      flexDirection: 'column',
    }),
  },
  itemSlotButtonActive: {
    borderColor: '#facc15',
    borderWidth: 2,
    backgroundColor: '#1a1a0a',
  },
  aspectActiveIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectActiveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  // Aspect Slot in God Selector
  aspectSlotButton: {
    width: IS_WEB ? 72 : 64,
    aspectRatio: 1,
    flexShrink: 0,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 6 : 5,
    position: 'relative',
    overflow: 'hidden',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  aspectSlotButtonActive: {
    borderColor: '#facc15',
    borderWidth: 2,
    backgroundColor: '#1a1a0a',
  },
  aspectSlotIcon: {
    width: '70%',
    height: '70%',
    borderRadius: 4,
  },
  aspectSlotIconPlaceholder: {
    width: '70%',
    height: '70%',
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectSlotIconPlaceholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '700',
  },
  aspectSlotLabel: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 10 : 8,
    textAlign: 'center',
    marginTop: 2,
  },
  aspectActiveIndicatorSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectActiveTextSmall: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  itemIcon: {
    width: IS_WEB ? '90%' : '100%',
    height: IS_WEB ? '75%' : '65%',
    borderRadius: 4,
    maxWidth: '100%',
    maxHeight: '100%',
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...(IS_WEB && {
      objectFit: 'contain',
    }),
  },
  itemIconPlaceholder: {
    width: '100%',
    height: IS_WEB ? '70%' : '65%',
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIconPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 18 : 14,
    fontWeight: '700',
  },
  itemName: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 8 : 6,
    textAlign: 'center',
    marginTop: IS_WEB ? 2 : 1,
    lineHeight: IS_WEB ? 10 : 8,
  },
  itemSlotPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemSlotPlaceholderText: {
    color: '#64748b',
    fontSize: 32,
    fontWeight: '300',
  },
  itemSlotNumber: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsGridDesktop: {
    gap: 6,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statItemDesktop: {
    minWidth: '47%',
    flexBasis: '47%',
    flexGrow: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  statLabelDesktop: {
    fontSize: 10,
    marginBottom: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statRowIcon: {
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statValueDesktop: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Gold
  goldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  goldLabel: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '600',
  },
  goldValue: {
    color: '#fbbf24',
    fontSize: 24,
    fontWeight: '700',
  },
  saveBuildButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBuildButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  postToCommunityButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postToCommunityQuickButton: {
    backgroundColor: '#059669',
    borderColor: '#34d399',
    marginTop: 16,
  },
  postToCommunityButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  postToCertifiedButton: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  saveBuildModalButtonDisabled: {
    opacity: 0.6,
  },
  botDraftBanner: {
    backgroundColor: '#0c2d4a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    padding: IS_WEB ? 12 : 10,
  },
  botDraftBannerTitle: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 16 : 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  botDraftBannerText: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 13 : 12,
    lineHeight: IS_WEB ? 18 : 17,
  },
  loadBuildButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadBuildButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  savedBuildItem: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  savedBuildInfo: {
    flex: 1,
  },
  savedBuildName: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  savedBuildGod: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  savedBuildDate: {
    color: '#64748b',
    fontSize: 12,
  },
  noSavedBuildsText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    padding: 40,
  },
  // Item Info Modal
  itemInfoModal: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 14,
    maxWidth: 320,
    width: '90%',
    maxHeight: '65%',
    flexDirection: 'column',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1e90ff',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  itemInfoScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  itemInfoScrollContent: {
    paddingBottom: 8,
  },
  itemInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  itemInfoHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  itemInfoNameWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  itemInfoTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 0,
  },
  itemInfoIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  itemInfoIcon: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  itemInfoStats: {
    marginBottom: 16,
  },
  itemInfoStatsTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemInfoStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  itemInfoStatRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemInfoStatLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  itemInfoStatIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  itemInfoPassiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemInfoActiveIcon: {
    width: 20,
    height: 20,
  },
  itemInfoStatLabel: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  itemInfoStatValue: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
  },
  itemInfoPassive: {
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  itemInfoPassiveText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
  },
  itemInfoCost: {
    flexShrink: 0,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    alignItems: 'center',
    gap: 6,
  },
  itemInfoCostPinned: {
    flexShrink: 0,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    alignItems: 'flex-start',
  },
  itemInfoCostLabel: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
  },
  itemInfoCostText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  itemInfoCostGoldIcon: {
    width: 20,
    height: 20,
  },
  itemGoldCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemGoldCostIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  itemInfoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  changeItemButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeItemButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  removeItemButtonLarge: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeItemButtonTextLarge: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#0b1226',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '95%',
    maxWidth: 800,
    maxHeight: IS_WEB ? '85%' : '75%', // Shorter on mobile so container isn't too long
    ...(!IS_WEB && { height: '75%' }), // Fixed height on mobile so content scrolls inside
    borderWidth: 1,
    borderColor: '#1e3a5f',
    ...(IS_WEB && {
      maxWidth: 900,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  modalTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#0f1724',
    borderWidth: 2,
    borderColor: '#1e90ff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginHorizontal: 16,
    color: '#e6eef8',
    fontSize: 18,
    minHeight: 56,
  },
  modalContent: {
    padding: 16,
  },
  modalContentScroll: {
    flex: 1,
    minHeight: 0,
    padding: 16,
  },
  modalContentScrollWrapper: {
    flex: 1,
    minHeight: 0,
  },
  modalContentScrollContent: {
    paddingBottom: 24,
  },
  godPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: 70,
  },
  godPickerIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  godPickerName: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '600',
  },
  itemPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  itemPickerIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemPickerInfo: {
    flex: 1,
  },
  itemPickerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemPickerActiveIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  dropdownItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTierIcon: {
    width: 16,
    height: 16,
  },
  itemPickerName: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  itemPickerCost: {
    color: '#fbbf24',
    fontSize: 14,
  },
  itemPickerGoldIcon: {
    width: 14,
    height: 14,
    flexShrink: 0,
  },
  saveBuildModal: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  saveBuildModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBuildModalTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
  },
  saveBuildModalLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 8,
  },
  saveBuildModalHint: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  saveBuildModalPostingAs: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  saveBuildModalPostingAsName: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  saveBuildModalInput: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    color: '#e6eef8',
    fontSize: 16,
    marginBottom: 20,
  },
  saveBuildModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBuildModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBuildModalButtonCancel: {
    backgroundColor: '#64748b',
  },
  saveBuildModalButtonSave: {
    backgroundColor: '#1e90ff',
  },
  saveBuildModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  gamemodeTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  gamemodeTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  gamemodeTagSelected: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  gamemodeTagText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  gamemodeTagTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 10,
  },
  filterButtonActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#1e90ff',
  },
  filterButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#7dd3fc',
  },
  filterButtonArrow: {
    color: '#64748b',
    fontSize: 10,
    marginLeft: 8,
  },
  clearFilterButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  clearFilterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownContainer: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  dropdownItemActive: {
    backgroundColor: '#1e3a5f',
  },
  dropdownItemText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  // Relic Styles
  relicSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: IS_WEB ? 16 : 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: IS_WEB ? 80 : 70,
  },
  relicIcon: {
    width: IS_WEB ? 56 : 48,
    height: IS_WEB ? 56 : 48,
    borderRadius: 6,
    marginRight: 12,
  },
  relicIconPlaceholder: {
    width: IS_WEB ? 56 : 48,
    height: IS_WEB ? 56 : 48,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  relicName: {
    color: '#e6eef8',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '600',
    flex: 1,
  },
  relicPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 14 : 12,
  },
  removeRelicButton: {
    width: IS_WEB ? 32 : 28,
    height: IS_WEB ? 32 : 28,
    borderRadius: IS_WEB ? 16 : 14,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeRelicButtonText: {
    color: '#ffffff',
    fontSize: IS_WEB ? 18 : 16,
    fontWeight: '700',
  },
  // Ability Leveling Styles - Single Row
  abilityLevelingContainerSingleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: IS_WEB ? 16 : 6,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  abilityLevelingButtonSmall: {
    width: IS_WEB ? 80 : 50,
    height: IS_WEB ? 80 : 50,
    backgroundColor: '#0f1724',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 6 : 3,
    position: 'relative',
    display: 'flex',
  },
  abilityLevelingButtonSelected: {
    borderColor: '#1e90ff',
    borderWidth: 2,
    backgroundColor: '#0a1a2e',
  },
  abilityLevelingIconSmall: {
    width: IS_WEB ? 68 : 40,
    height: IS_WEB ? 68 : 40,
    borderRadius: 4,
    alignSelf: 'center',
    ...(IS_WEB && {
      marginLeft: 'auto',
      marginRight: 'auto',
    }),
  },
  abilityLevelingOrderBadgeSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: IS_WEB ? 18 : 16,
    height: IS_WEB ? 18 : 16,
    borderRadius: IS_WEB ? 9 : 8,
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0b1226',
  },
  abilityLevelingOrderTextSmall: {
    color: '#ffffff',
    fontSize: IS_WEB ? 10 : 8,
    fontWeight: '700',
  },
  clearAbilityOrderButton: {
    backgroundColor: '#ef4444',
    paddingVertical: IS_WEB ? 10 : 8,
    paddingHorizontal: IS_WEB ? 16 : 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  clearAbilityOrderText: {
    color: '#ffffff',
    fontSize: IS_WEB ? 14 : 12,
    fontWeight: '600',
  },
  // Build Tips Styles
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  addTipButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  addTipButtonText: {
    color: '#ffffff',
    fontSize: IS_WEB ? 13 : 12,
    fontWeight: '600',
  },
  tipInputContainer: {
    marginBottom: 12,
  },
  tipInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipNumber: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 13 : 12,
    fontWeight: '600',
  },
  removeTipButton: {
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  removeTipButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buildTipsInput: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: IS_WEB ? 12 : 10,
    color: '#e6eef8',
    fontSize: IS_WEB ? 14 : 13,
    minHeight: IS_WEB ? 100 : 80,
    maxHeight: IS_WEB ? 200 : 150,
    textAlignVertical: 'top',
  },
  // Item Swaps Styles
  swapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: IS_WEB ? 12 : 10,
    marginBottom: IS_WEB ? 12 : 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  swapItemIcon: {
    width: IS_WEB ? 48 : 40,
    height: IS_WEB ? 48 : 40,
    borderRadius: 6,
    marginRight: IS_WEB ? 12 : 10,
  },
  swapItemContent: {
    flex: 1,
  },
  swapItemName: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  swapItemReasoning: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 14 : 12,
    lineHeight: IS_WEB ? 20 : 18,
  },
  swapItemActions: {
    flexDirection: 'row',
    gap: IS_WEB ? 8 : 6,
  },
  editSwapButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: IS_WEB ? 8 : 6,
    paddingHorizontal: IS_WEB ? 12 : 10,
    borderRadius: 6,
  },
  editSwapButtonText: {
    color: '#ffffff',
    fontSize: IS_WEB ? 12 : 10,
    fontWeight: '600',
  },
  deleteSwapButton: {
    backgroundColor: '#ef4444',
    width: IS_WEB ? 32 : 28,
    height: IS_WEB ? 32 : 28,
    borderRadius: IS_WEB ? 16 : 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSwapButtonText: {
    color: '#ffffff',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '700',
  },
  addSwapButton: {
    backgroundColor: '#10b981',
    paddingVertical: IS_WEB ? 12 : 10,
    paddingHorizontal: IS_WEB ? 16 : 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
  addSwapButtonText: {
    color: '#ffffff',
    fontSize: IS_WEB ? 14 : 12,
    fontWeight: '700',
  },
  swapItemSelector: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
    padding: IS_WEB ? 16 : 14,
    marginBottom: 12,
    minHeight: IS_WEB ? 70 : 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapItemSelectorText: {
    color: '#e6eef8',
    fontSize: IS_WEB ? 14 : 13,
    flex: 1,
  },
  swapItemSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  swapItemSelectorIcon: {
    width: IS_WEB ? 40 : 36,
    height: IS_WEB ? 40 : 36,
    borderRadius: 4,
    marginRight: 12,
  },
  swapItemSelectorPlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapItemSelectorPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 14 : 12,
    fontStyle: 'italic',
  },
  swapReasoningInput: {
    minHeight: IS_WEB ? 80 : 70,
    maxHeight: IS_WEB ? 150 : 120,
  },
  // Starting Ability Order Styles
  startingAbilityOrderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 10 : 8,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  startingAbilityLevelSlot: {
    width: IS_WEB ? '18%' : '18%',
    minWidth: IS_WEB ? 70 : 65,
    maxWidth: IS_WEB ? 90 : 85,
  },
  startingAbilityLevelLabel: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 12 : 10,
    fontWeight: '700',
    marginBottom: IS_WEB ? 6 : 4,
    textAlign: 'center',
  },
  startingAbilitySlotButton: {
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 6 : 4,
    position: 'relative',
  },
  startingAbilitySlotButtonSelected: {
    borderColor: '#1e90ff',
    borderWidth: 2,
    backgroundColor: '#0a1a2e',
  },
  startingAbilityIcon: {
    width: IS_WEB ? 48 : 40,
    height: IS_WEB ? 48 : 40,
    borderRadius: 4,
    marginBottom: 4,
  },
  startingAbilityIconPlaceholder: {
    width: IS_WEB ? 48 : 40,
    height: IS_WEB ? 48 : 40,
    borderRadius: 4,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  startingAbilityIconPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 20 : 18,
    fontWeight: '700',
  },
  startingAbilityName: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 9 : 8,
    textAlign: 'center',
    marginTop: 2,
  },
  startingAbilityPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 10 : 9,
    textAlign: 'center',
  },
  // Starting Items Styles
  starterStartingItemRow: {
    marginBottom: IS_WEB ? 12 : 10,
    alignItems: 'center',
  },
  startingItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: IS_WEB ? 8 : 6,
    justifyContent: 'center',
    width: '100%',
  },
  startingItemSlot: {
    width: IS_WEB ? '23%' : '23%',
    minWidth: IS_WEB ? 70 : 60,
    maxWidth: IS_WEB ? 90 : 80,
  },
  startingItemSlotButton: {
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 8 : 6,
    position: 'relative',
    width: '100%',
    display: 'flex',
    ...(IS_WEB && {
      flexDirection: 'column',
    }),
  },
  startingItemIcon: {
    width: IS_WEB ? '85%' : '100%',
    height: IS_WEB ? '70%' : '65%',
    borderRadius: 4,
    maxWidth: '100%',
    maxHeight: '100%',
    alignSelf: 'center',
    ...(IS_WEB && {
      marginLeft: 'auto',
      marginRight: 'auto',
      objectFit: 'contain',
    }),
  },
  startingItemIconPlaceholder: {
    width: '100%',
    height: IS_WEB ? '70%' : '65%',
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startingItemIconPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 18 : 14,
    fontWeight: '700',
  },
  startingItemName: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 8 : 6,
    textAlign: 'center',
    marginTop: IS_WEB ? 2 : 1,
    lineHeight: IS_WEB ? 10 : 8,
  },
  startingItemSlotPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  startingItemSlotPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 32 : 28,
    fontWeight: '300',
  },
  // Login Modal Styles (matching profile.jsx for consistency) - unique names so they don't override picker modals
  loginModalOverlay: {
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
      zIndex: 1000,
    }),
  },
  loginModalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    }),
  },
  loginModalTitle: {
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
  loginRegisterLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginRegisterText: {
    color: '#1e90ff',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
