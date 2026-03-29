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
  InteractionManager,
  Platform,
  Pressable,
  Alert,
  PanResponder,
} from 'react-native';
import CryptoJS from 'crypto-js';
import { Image } from 'expo-image';
import { getLocalItemIcon, getLocalGodAsset, getRoleIcon } from './localIcons';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { flattenBuildsGods } from '../lib/normalizeBuildsGod';
import { computeItemPassiveBonuses } from '../lib/customBuildItemPassives';
import { getBasicAttackPowerCoefficients } from '../lib/basicAttackScaling';
import {
  getDiscordBotSharedBuildPayload,
  saveDiscordBotSharedBuildPayload,
} from '../lib/discordBotSharedBuildSupabase';
import { GOLD_ICON } from '../lib/imageGrabber';

const IS_WEB = Platform.OS === 'web';

const BUILDER_ROLE_OPTIONS = ['Mid', 'Solo', 'ADC', 'Support', 'Jungle'];

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

function normItemKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Merge saved slot refs with full `builds.json` items so stats/passives resolve. */
function resolveEquipRef(ref, catalog) {
  if (!ref || typeof ref !== 'object') return null;
  if (ref.stats && typeof ref.stats === 'object') return ref;
  const a = String(ref.internalName || '').toLowerCase().trim();
  const b = String(ref.name || '').toLowerCase().trim();
  const an = normItemKey(ref.internalName);
  const bn = normItemKey(ref.name);
  for (const it of catalog) {
    const i = String(it.internalName || '').toLowerCase().trim();
    const n = String(it.name || '').toLowerCase().trim();
    if (a && i === a) return it;
    if (b && n === b) return it;
    if (an && normItemKey(it.internalName) === an) return it;
    if (bn && normItemKey(it.name) === bn) return it;
  }
  return ref;
}

function resolveRelicRef(ref, relicCatalog) {
  if (!ref || typeof ref !== 'object') return null;
  if (ref.stats && typeof ref.stats === 'object') return ref;
  const a = String(ref.internalName || '').toLowerCase().trim();
  const b = String(ref.name || '').toLowerCase().trim();
  const an = normItemKey(ref.internalName);
  const bn = normItemKey(ref.name);
  for (const it of relicCatalog) {
    const i = String(it.internalName || '').toLowerCase().trim();
    const n = String(it.name || '').toLowerCase().trim();
    if (a && i === a) return it;
    if (b && n === b) return it;
    if (an && normItemKey(it.internalName) === an) return it;
    if (bn && normItemKey(it.name) === bn) return it;
  }
  return ref;
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
  const layoutGodRoleInline = screenDimensions.width >= 640;
  const [localBuilds, setLocalBuilds] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedGod, setSelectedGod] = useState(null);
  const [godLevel, setGodLevel] = useState(20);
  const [selectedItems, setSelectedItems] = useState(Array(7).fill(null));
  const [startingItems, setStartingItems] = useState(Array(5).fill(null)); // 5 starting item slots
  const [startingRelic, setStartingRelic] = useState(null);
  const [finalRelic, setFinalRelic] = useState(null);
  /** 'starting' | 'final' | null — which relic slot the picker is for */
  const [relicPickerTarget, setRelicPickerTarget] = useState(null);
  const [aspectActive, setAspectActive] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]); // Array of selected roles (max 4)
  const [showGodPicker, setShowGodPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(null); // Index of item slot
  const [selectedItemInfo, setSelectedItemInfo] = useState(null); // { item, index } for info modal
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
  const [showStartingAbilityPicker, setShowStartingAbilityPicker] = useState(false);
  const [currentStartingAbilityLevel, setCurrentStartingAbilityLevel] = useState(0); // 0-4 for levels 1-5
  const [showPostToCertifiedModal, setShowPostToCertifiedModal] = useState(false);
  const [certifiedBuildName, setCertifiedBuildName] = useState('');
  const [isPostingToCertified, setIsPostingToCertified] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [botDraftHydrating, setBotDraftHydrating] = useState(() => !!botSharedDraftToken);
  const [botDraftSavePending, setBotDraftSavePending] = useState(false);

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
          const { supabase } = require('../config/supabase');
          
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

  // Lazy load the builds data
  useEffect(() => {
    let isMounted = true;
    
    InteractionManager.runAfterInteractions(() => {
      setTimeout(async () => {
        try {
          const data = require('./data/builds.json');
          if (isMounted) {
            setLocalBuilds(data);
            setDataLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            setDataLoading(false);
          }
        }
      }, 100);
    });
    
    return () => {
      isMounted = false;
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

  // Base god stats scale with godLevel (fractional 1–20 while dragging) using per-stat data
  const baseStats = useMemo(() => {
    const readNum = (statData, key) => {
      const v = statData[key];
      if (v === undefined || v === null || v === '') return NaN;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    /** Interpolate each stat from its own level keys (1/20 only, or many), else rate+1. */
    const getBaseStatValueForLevel = (statData, level) => {
      const lv = Math.max(1, Math.min(20, Number(level) || 20));
      const levelKeys = Object.keys(statData)
        .filter((k) => /^\d+$/.test(k))
        .map((k) => parseInt(k, 10))
        .filter((n) => n >= 1 && n <= 20)
        .sort((a, b) => a - b);

      if (levelKeys.length >= 2) {
        const first = levelKeys[0];
        const last = levelKeys[levelKeys.length - 1];
        if (lv <= first) return readNum(statData, String(first));
        if (lv >= last) return readNum(statData, String(last));
        let i = 0;
        while (i < levelKeys.length - 1 && levelKeys[i + 1] < lv) {
          i += 1;
        }
        const lo = levelKeys[i];
        const hi = levelKeys[i + 1];
        const vLo = readNum(statData, String(lo));
        const vHi = readNum(statData, String(hi));
        if (Number.isFinite(vLo) && Number.isFinite(vHi)) {
          const t = (lv - lo) / (hi - lo);
          return vLo + t * (vHi - vLo);
        }
      } else if (levelKeys.length === 1) {
        const v = readNum(statData, String(levelKeys[0]));
        if (Number.isFinite(v)) return v;
      }

      const v1 = readNum(statData, '1');
      const rate = readNum(statData, 'rate');
      if (Number.isFinite(v1) && Number.isFinite(rate)) {
        return v1 + (lv - 1) * rate;
      }
      const v20 = readNum(statData, '20');
      if (Number.isFinite(v1) && Number.isFinite(v20)) {
        const t = (lv - 1) / 19;
        return v1 + (v20 - v1) * t;
      }
      return Number.isFinite(v1) ? v1 : 0;
    };

    const stats = {};

    if (selectedGod && selectedGod.baseStats) {
      Object.keys(selectedGod.baseStats).forEach((statKey) => {
        const statData = selectedGod.baseStats[statKey];
        if (statData && typeof statData === 'object') {
          const statValue = getBaseStatValueForLevel(statData, godLevel);
          const n = Number(statValue);
          if (statKey === 'BaseAttackSpeed' || statKey === 'AttackSpeedPercent') {
            stats[statKey] = Number.isFinite(n) ? n : 0;
          } else {
            stats[statKey] = Math.round(n);
          }
        } else if (statData !== null && statData !== undefined) {
          const n = Number(statData);
          stats[statKey] = Number.isFinite(n) ? Math.round(n) : statData;
        }
      });
    }

    return stats;
  }, [selectedGod, godLevel]);

  // Stat key normalization - maps item stat keys to base stat keys
  const normalizeStatKey = (itemKey) => {
    const mapping = {
      'Health': 'MaxHealth',
      'Mana': 'MaxMana',
      'Health Regen': 'HealthPerSecond',
      'HP5': 'HealthPerSecond',
      'Mana Regen': 'ManaPerSecond',
      'MP5': 'ManaPerSecond',
      'Physical Protection': 'PhysicalProtection',
      'Magical Protection': 'MagicalProtection',
      'Physical Power': 'BasicDamage',
      'Magical Power': 'BasicDamage',
      // Rare legacy keys; total Attack Damage still uses STR/INT scaling from god.basic when present
      // Treat item attack speed as percent bonus that applies on top of base
      'Attack Speed': 'AttackSpeedPercent',
      'AttackSpeed': 'AttackSpeedPercent',
      'Attack Speed %': 'AttackSpeedPercent',
      'AttackSpeed %': 'AttackSpeedPercent',
      'Attack Speed Percent': 'AttackSpeedPercent',
      'AttackSpeed Percent': 'AttackSpeedPercent',
    };
    return mapping[itemKey] || itemKey;
  };

  // Calculate total stats
  const totalStats = useMemo(() => {
    const stats = { ...baseStats };
    
    const addItemStats = (item) => {
      if (item && item.stats) {
        Object.keys(item.stats).forEach((itemKey) => {
          const normalizedKey = normalizeStatKey(itemKey);
          stats[normalizedKey] = (stats[normalizedKey] || 0) + (item.stats[itemKey] || 0);
        });
      }
    };
    startingItems.forEach(addItemStats);
    selectedItems.forEach(addItemStats);

    const equippedForPassives = [...startingItems, ...selectedItems].filter(Boolean);
    const passiveBonuses = computeItemPassiveBonuses(equippedForPassives);
    Object.keys(passiveBonuses).forEach((k) => {
      const add = passiveBonuses[k];
      if (typeof add === 'number' && Number.isFinite(add) && add !== 0) {
        stats[k] = (stats[k] || 0) + add;
      }
    });

    Object.keys(stats).forEach((key) => {
      if (key === 'BaseAttackSpeed' || key === 'AttackSpeedPercent') return;
      const v = stats[key];
      if (typeof v === 'number' && Number.isFinite(v)) {
        stats[key] = Math.round(v);
      }
    });

    // Total basic / attack damage: flat (god BasicDamage + item flat bonuses) + STR/INT scaling from god.basic.
    const flatAttack =
      (stats.BasicDamage || 0) +
      (stats['Attack Damage'] || 0) +
      (stats['Basic Damage'] || 0);
    const strPow = stats.Strength || 0;
    const intPow = stats.Intelligence || 0;
    const { strength: strCoeff, intelligence: intCoeff } = getBasicAttackPowerCoefficients(selectedGod);
    if (strCoeff !== 0 || intCoeff !== 0) {
      stats.BasicDamage = Math.round(flatAttack + strPow * strCoeff + intPow * intCoeff);
    } else {
      // No scaling data: preserve prior behavior (Strength adds flat to basics).
      stats.BasicDamage = Math.round(flatAttack + strPow);
    }
    delete stats['Attack Damage'];
    delete stats['Basic Damage'];

    // Combine base attack speed and total attack speed percent into a single effective Attack Speed stat.
    const baseAS = stats.BaseAttackSpeed || 0;
    const bonusASPercent = stats.AttackSpeedPercent || 0; // already in % units, e.g. 29.12
    if (baseAS) {
      const effectiveAS = baseAS * (1 + bonusASPercent / 100);
      stats.AttackSpeedEffective = Number(effectiveAS.toFixed(2));
    }

    // We keep AttackSpeedPercent internally for possible future use, but we don't need to
    // show it as a separate stat in the UI, so remove it from the stats map.
    delete stats.AttackSpeedPercent;
    // Do not show raw BaseAttackSpeed in the UI either; we only surface the combined Attack Speed.
    delete stats.BaseAttackSpeed;
    
    return stats;
  }, [baseStats, selectedItems, startingItems, selectedGod]);

  // Calculate Effective Health Points
  // EHP vs one damage type (no pen): Health * (100 + Prot) / 100 — same as Health / (100/(100+Prot))
  const effectiveHealth = useMemo(() => {
    const hp = totalStats.MaxHealth || totalStats.Health || 0;
    const physicalProtection = totalStats.PhysicalProtection || 0;
    const magicalProtection = totalStats.MagicalProtection || 0;

    const php = Math.round((hp * (physicalProtection + 100)) / 100);
    const ehp = Math.round((hp * (magicalProtection + 100)) / 100);

    return { PHP: php, EHP: ehp };
  }, [totalStats]);

  // Build header gold: final slots + relics only (starting items are free for display)
  const totalGold = useMemo(() => {
    let sum = 0;
    selectedItems.forEach((item) => {
      if (item && item.totalCost) sum += item.totalCost;
    });
    if (startingRelic?.totalCost) sum += startingRelic.totalCost;
    if (finalRelic?.totalCost) sum += finalRelic.totalCost;
    return sum;
  }, [selectedItems, startingRelic, finalRelic]);

  const selectItem = (item, index) => {
    // Check if this is for a swap (index 999)
    if (index === 999) {
      setSwapItem(item);
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
      newStartingItems[startingIndex] = item;
      setStartingItems(newStartingItems);
    } else {
      const newItems = [...selectedItems];
      newItems[index] = item;
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

  /** Shared item icon for build slots (full-size or compact side-by-side layout). */
  const renderItemIconOnly = (item, iconKey, compact, relicCompactSlot = false) => {
    if (!item) return null;
    const useRelicMobile = relicCompactSlot && compact && !IS_WEB;
    const iconStyle = compact
      ? useRelicMobile
        ? styles.compactRelicSlotIcon
        : styles.compactItemIcon
      : styles.itemIcon;
    const phStyle = compact
      ? useRelicMobile
        ? styles.compactRelicSlotPh
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
          resizeMode="cover"
          onError={() => {
            setFailedItemIcons((prev) => ({ ...prev, [iconKey]: true }));
          }}
        />
      );
    }
    if (fallbackSource && useFallback) {
      return <Image source={fallbackSource} style={iconStyle} resizeMode="cover" />;
    }
    return <Image source={imageSource} style={iconStyle} resizeMode="cover" />;
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
    lifesteal: 'Lifesteal',
    cooldownReduction: 'Cooldown Reduction',
    critChance: 'Critical Strike Chance',
    PercentMagicalPenetration: '% Magical Penetration',
    PercentPhysicalPenetration: '% Physical Penetration',
  };

  const renderTotalStatsGrid = () => {
    const statOrder = [
      'AttackSpeedEffective',
      'BasicDamage',
      'MaxHealth',
      'HealthPerSecond',
      'MaxMana',
      'ManaPerSecond',
      'PhysicalProtection',
      'MagicalProtection',
    ];
    const allStats = Object.keys(totalStats).filter(
      (key) => (totalStats[key] !== 0 || baseStats[key]) && key !== 'BaseAttackSpeed'
    );
    const orderedStats = statOrder.filter((key) => allStats.includes(key));
    const remainingStats = allStats.filter((key) => !statOrder.includes(key)).sort();
    const finalStats = [];
    orderedStats.forEach((statKey) => {
      finalStats.push(statKey);
      if (statKey === 'PhysicalProtection' && (totalStats.MaxHealth || totalStats.Health)) {
        finalStats.push('__PhysicalEHP__');
      }
      if (statKey === 'MagicalProtection' && (totalStats.MaxHealth || totalStats.Health)) {
        finalStats.push('__MagicalEHP__');
      }
    });
    finalStats.push(...remainingStats);

    return finalStats.map((statKey) => {
      if (statKey === '__PhysicalEHP__') {
        return (
          <View key="PhysicalEHP" style={styles.statItem}>
            <Text style={[styles.statLabel, { color: '#ef4444' }]}>Physical EHP</Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {effectiveHealth.PHP.toLocaleString()}
            </Text>
          </View>
        );
      }
      if (statKey === '__MagicalEHP__') {
        return (
          <View key="MagicalEHP" style={styles.statItem}>
            <Text style={[styles.statLabel, { color: '#a855f7' }]}>Magical EHP</Text>
            <Text style={[styles.statValue, { color: '#a855f7' }]}>
              {effectiveHealth.EHP.toLocaleString()}
            </Text>
          </View>
        );
      }
      let statColor = '#94a3b8';
      const statName = (statDisplayNames[statKey] || statKey).toLowerCase();
      const statKeyLower = statKey.toLowerCase();
      if (statName.includes('health') || statKeyLower.includes('health') || statName.includes('hp5') || statKeyLower.includes('healthper')) {
        statColor = '#22c55e';
      } else if (statName.includes('mana') || statKeyLower.includes('mana') || statName.includes('mp5') || statKeyLower.includes('manaper')) {
        statColor = '#3b82f6';
      } else if (statName.includes('physical protection') || statKeyLower.includes('physicalprotection')) {
        statColor = '#ef4444';
      } else if (statName.includes('magical protection') || statKeyLower.includes('magicalprotection')) {
        statColor = '#a855f7';
      } else if (statName.includes('physical power') || statKeyLower.includes('basicdamage')) {
        statColor = '#f97316';
      } else if (statName.includes('magical power') || statKeyLower.includes('magicalpower')) {
        statColor = '#ec4899';
      } else if (statName.includes('attack speed') || statKeyLower.includes('attackspeed') || statKeyLower.includes('baseattackspeed')) {
        statColor = '#f97316';
      } else if (statName.includes('movement speed') || statKeyLower.includes('movementspeed')) {
        statColor = '#10b981';
      } else if (statName.includes('penetration') || statKeyLower.includes('penetration')) {
        statColor = '#ef4444';
      } else if (statName.includes('lifesteal') || statKeyLower.includes('lifesteal')) {
        statColor = '#84cc16';
      } else if (statName.includes('cooldown') || statKeyLower.includes('cooldown')) {
        statColor = '#0ea5e9';
      } else if (statName.includes('critical') || statKeyLower.includes('critical') || statName.includes('crit')) {
        statColor = '#f97316';
      } else if (statName.includes('strength') || statKeyLower.includes('strength')) {
        statColor = '#facc15';
      } else if (statName.includes('intelligence') || statKeyLower.includes('intelligence')) {
        statColor = '#a855f7';
      }
      const raw = totalStats[statKey];
      let displayValue = raw;
      if (statKey === 'AttackSpeedEffective') {
        displayValue = typeof raw === 'number' && Number.isFinite(raw) ? raw.toFixed(2) : raw;
      } else if (typeof raw === 'number' && Number.isFinite(raw)) {
        displayValue = Math.round(raw);
      }
      return (
        <View key={statKey} style={styles.statItem}>
          <Text style={[styles.statLabel, { color: statColor }]}>{statDisplayNames[statKey] || statKey}</Text>
          <Text style={[styles.statValue, { color: statColor }]}>{displayValue}</Text>
        </View>
      );
    });
  };

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

  const renderBuilderRoleChips = () =>
    BUILDER_ROLE_OPTIONS.map((role) => {
      const isSelected = selectedRoles.includes(role);
      const isDisabled = !isSelected && selectedRoles.length >= 4;
      const iconSrc = getRoleIcon(role);
      return (
        <TouchableOpacity
          key={role}
          style={[
            styles.inlineRoleChip,
            isSelected && styles.inlineRoleChipSelected,
            isDisabled && styles.inlineRoleChipDisabled,
          ]}
          onPress={() => {
            if (isSelected) {
              setSelectedRoles((prev) => prev.filter((r) => r !== role));
            } else if (!isDisabled) {
              setSelectedRoles((prev) => [...prev, role]);
            }
          }}
          disabled={isDisabled}
          activeOpacity={1}
          accessibilityLabel={`${role} role${isSelected ? ', selected' : ''}`}
        >
          {iconSrc ? (
            <Image source={iconSrc} style={styles.inlineRoleChipIcon} contentFit="contain" />
          ) : null}
          <Text
            style={[
              styles.inlineRoleChipText,
              isSelected && styles.inlineRoleChipTextSelected,
              isDisabled && styles.inlineRoleChipTextDisabled,
            ]}
            numberOfLines={1}
          >
            {role}
          </Text>
        </TouchableOpacity>
      );
    });

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.loadBuildButton}
              onPress={() => setShowLoadBuildModal(true)}
            >
              <Text style={styles.loadBuildButtonText}>Load Saved Build</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* God Selection + roles (roles when a god is selected) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select God / Role</Text>
          {selectedGod ? (
            <Text style={styles.godRoleSubtitle} numberOfLines={2}>
              Select up to 4 roles this build can be played in
            </Text>
          ) : null}
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
              {selectedGod && layoutGodRoleInline ? (
                <View style={styles.inlineRoleCluster}>{renderBuilderRoleChips()}</View>
              ) : null}
              {/* Aspect Slot */}
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
                            resizeMode="cover"
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
            {selectedGod && !layoutGodRoleInline ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.inlineRoleScroll}
                contentContainerStyle={styles.inlineRoleScrollContent}
              >
                {renderBuilderRoleChips()}
              </ScrollView>
            ) : null}
          </View>
          {selectedGod && (
            <View style={styles.godStatsExpandableWrap}>
              <TouchableOpacity
                style={styles.godStatsExpandHeader}
                onPress={() => setGodStatsExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={styles.godStatsExpandHeaderTitleWrap}>
                  <Text style={styles.godStatsExpandHeaderTitle}>Total stats</Text>
                  <Text style={styles.godStatsExpandHeaderMeta}> Lv {Math.round(godLevel)}</Text>
                </View>
                <Text style={styles.godStatsExpandChevron}>{godStatsExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {godStatsExpanded ? (
                <View style={styles.statsExpandedBody}>
                  <View style={styles.statsEmbedLevelBlock}>
                    <Text style={styles.statsEmbedLevelHeading}>Base level (1-20) — drag track or use +/-</Text>
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
                  <View style={styles.statsGrid}>{renderTotalStatsGrid()}</View>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Starting items + Final build (side by side when a god is selected; compact slots) */}
        <View style={styles.section}>
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
          </View>
          <View style={styles.buildItemsHeaderRow}>
            <Text style={styles.buildItemsHeaderTitle}>Build</Text>
            <View style={styles.buildItemsHeaderGold}>
              <Image source={GOLD_ICON} style={styles.buildItemsHeaderGoldIcon} contentFit="contain" />
              <Text style={styles.buildItemsHeaderGoldText}>
                {totalGold.toLocaleString()} gold
              </Text>
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
            <View style={styles.itemsBuildTwoColumn}>
              <View style={styles.itemsBuildColumnStart}>
                <Text style={[styles.sectionTitleInline, IS_WEB && styles.sectionTitleInlineCenterWeb]}>
                  Starting items
                </Text>
                <View style={styles.compactStarterRow}>
                  <View style={styles.compactStarterSlotWrap}>
                    <TouchableOpacity
                      style={styles.compactSlotButton}
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
                <View style={styles.compactStartingGrid}>
                  {startingItems.slice(1).map((item, i) => {
                    const index = i + 1;
                    return (
                      <View key={`st-${index}`} style={styles.compactStartingSlot}>
                        <TouchableOpacity
                          style={styles.compactSlotButton}
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
                              <Text style={styles.compactSlotHint}>{i + 1}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.relicBlockInColumn}>
                  <Text style={[styles.sectionTitleInline, styles.relicSectionLabel]} numberOfLines={1}>
                    Starting relic
                  </Text>
                  <View style={styles.compactStarterRow}>
                    <View style={styles.compactStarterSlotWrap}>
                      <TouchableOpacity
                        style={styles.compactSlotButton}
                        onPress={() => setRelicPickerTarget('starting')}
                        activeOpacity={0.7}
                      >
                        {startingRelic ? (
                          <>
                            {renderItemIconOnly(
                              startingRelic,
                              `starting-relic-${startingRelic.internalName || startingRelic.name}`,
                              true,
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
              </View>
              <View style={styles.itemsBuildDivider} />
              <View style={styles.itemsBuildColumnFinal}>
                <Text style={[styles.sectionTitleInline, IS_WEB && styles.sectionTitleInlineCenterWeb]}>
                  Final build
                </Text>
                {IS_WEB ? (
                  <View style={styles.compactFinalBuildWeb}>
                    <View style={styles.compactFinalGridWebRowSingle}>
                      <View style={styles.compactFinalSlotWeb}>
                        <TouchableOpacity
                          style={styles.compactSlotButton}
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
                    <View style={styles.compactFinalGridWeb}>
                      {selectedItems.slice(1, 4).map((item, i) => {
                        const index = i + 1;
                        return (
                          <View key={`fiw-r2-${index}`} style={styles.compactFinalSlotWeb}>
                            <TouchableOpacity
                              style={styles.compactSlotButton}
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
                    <View style={styles.compactFinalGridWeb}>
                      {selectedItems.slice(4, 7).map((item, i) => {
                        const index = i + 4;
                        return (
                          <View key={`fiw-r3-${index}`} style={styles.compactFinalSlotWeb}>
                            <TouchableOpacity
                              style={styles.compactSlotButton}
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
                    <View style={styles.compactStarterRow}>
                      <View style={styles.compactStarterSlotWrap}>
                        <TouchableOpacity
                          style={styles.compactSlotButton}
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
                    <View style={styles.compactFinalGrid}>
                      {selectedItems.slice(1).map((item, i) => {
                        const index = i + 1;
                        return (
                          <View key={`fi-${index}`} style={styles.compactFinalSlot}>
                            <TouchableOpacity
                              style={styles.compactSlotButton}
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
                                  <Text style={styles.compactSlotHint}>{i + 1}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
                <View style={styles.relicBlockInColumn}>
                  <Text style={[styles.sectionTitleInline, styles.relicSectionLabel]} numberOfLines={1}>
                    Final relic
                  </Text>
                  <View style={styles.compactStarterRow}>
                    <View style={styles.compactStarterSlotWrap}>
                      <TouchableOpacity
                        style={styles.compactSlotButton}
                        onPress={() => setRelicPickerTarget('final')}
                        activeOpacity={0.7}
                      >
                        {finalRelic ? (
                          <>
                            {renderItemIconOnly(
                              finalRelic,
                              `final-relic-${finalRelic.internalName || finalRelic.name}`,
                              true,
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
              </View>
            </View>
            </>
          )}
        </View>

        {selectedGod && selectedGod.abilities && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ability leveling</Text>
            <View style={styles.abilityOrderTabRow}>
              <TouchableOpacity
                style={[styles.abilityOrderTab, abilityOrderTab === 'starting' && styles.abilityOrderTabActive]}
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
                style={[styles.abilityOrderTab, abilityOrderTab === 'max' && styles.abilityOrderTabActive]}
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
                <Text style={styles.sectionSubtitle}>
                  Select which ability to level at each of the first 5 levels
                </Text>
                <View style={styles.startingAbilityOrderContainer}>
                  {[1, 2, 3, 4, 5].map((level) => {
                    const abilityKey = startingAbilityOrder[level - 1];
                    const ability = abilityKey ? selectedGod.abilities[abilityKey] : null;
                    return (
                      <View key={level} style={styles.startingAbilityLevelSlot}>
                        <Text style={styles.startingAbilityLevelLabel}>Level {level}</Text>
                        <TouchableOpacity
                          style={[
                            styles.startingAbilitySlotButton,
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
                                  style={styles.startingAbilityIcon}
                                  resizeMode="cover"
                                />
                              )}
                              <Text style={styles.startingAbilityName} numberOfLines={1}>
                                {ability.name || abilityKey}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View style={styles.startingAbilityIconPlaceholder}>
                                <Text style={styles.startingAbilityIconPlaceholderText}>?</Text>
                              </View>
                              <Text style={styles.startingAbilityPlaceholderText}>Select</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                {startingAbilityOrder.some((a) => a !== null) && (
                  <TouchableOpacity
                    style={styles.clearAbilityOrderButton}
                    onPress={() => setStartingAbilityOrder(Array(5).fill(null))}
                  >
                    <Text style={styles.clearAbilityOrderText}>Clear Order</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionSubtitle}>
                  Tap abilities in the order you want to level them
                </Text>
                <View style={styles.abilityLevelingContainerSingleRow}>
                  {Object.keys(selectedGod.abilities).map((abilityKey) => {
                    const ability = selectedGod.abilities[abilityKey];
                    const orderIndex = abilityLevelingOrder.indexOf(abilityKey);
                    const isSelected = orderIndex !== -1;
                    return (
                      <TouchableOpacity
                        key={abilityKey}
                        style={[
                          styles.abilityLevelingButtonSmall,
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
                            style={styles.abilityLevelingIconSmall}
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
                    style={styles.clearAbilityOrderButton}
                    onPress={() => setAbilityLevelingOrder([])}
                  >
                    <Text style={styles.clearAbilityOrderText}>Clear Order</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Build Tips & Notes + Item Swaps (tabbed, same pattern as Ability leveling) */}
        {selectedGod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Build Tips & Notes</Text>
            <View style={styles.abilityOrderTabRow}>
              <TouchableOpacity
                style={[styles.abilityOrderTab, buildNotesTab === 'tips' && styles.abilityOrderTabActive]}
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
                style={[styles.abilityOrderTab, buildNotesTab === 'swaps' && styles.abilityOrderTabActive]}
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
                <Text style={styles.sectionSubtitle}>
                  Strategy, lane notes, or general build advice
                </Text>
                <View style={styles.tipsHeader}>
                  <TouchableOpacity
                    style={styles.addTipButton}
                    onPress={() => setBuildTips([...buildTips, ''])}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addTipButtonText}>+ Add Tip</Text>
                  </TouchableOpacity>
                </View>
                {buildTips.map((tip, tipIndex) => (
                  <View key={tipIndex} style={styles.tipInputContainer}>
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
                      style={styles.buildTipsInput}
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
        )}

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

        {selectedGod && !botSharedDraftToken ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.saveBuildButton}
              onPress={async () => {
                const currentUser = await storage.getItem('currentUser');
                if (!currentUser) {
                  Alert.alert('Not Logged In', 'Please log in to your profile to save builds.');
                  return;
                }
                setBuildName(selectedGod.name || selectedGod.GodName || 'My Build');
                setShowSaveBuildModal(true);
              }}
            >
              <Text style={styles.saveBuildButtonText}>Save Build to Profile</Text>
            </TouchableOpacity>
            
            {/* Update Build (direct) - when editing a contributor build, one tap saves to Supabase */}
            {isUserCertified && buildToEdit?.databaseTable === 'contributor_builds' && buildToEdit?.databaseId && (
              <TouchableOpacity
                style={[styles.postToCommunityButton, styles.postToCertifiedButton]}
                onPress={async () => {
                  const currentUser = await storage.getItem('currentUser');
                  if (!currentUser) {
                    setShowLoginModal(true);
                    return;
                  }
                  const hasItems = selectedItems.filter(Boolean).length > 0;
                  if (!hasItems) {
                    Alert.alert('Incomplete Build', 'Please add items to your build before updating.');
                    return;
                  }
                  try {
                    const { supabase } = require('../config/supabase');
                    const gamemodesToSave = (buildToEdit.gamemodes && Array.isArray(buildToEdit.gamemodes) && buildToEdit.gamemodes.length > 0)
                      ? buildToEdit.gamemodes
                      : ['Joust', 'Duel', 'Arena', 'Conquest', 'Assault'];
                    const nameToSave = (buildToEdit.build_name || buildToEdit.name || certifiedBuildName || buildName || '').trim() || 'My Build';
                    const updatePayload = {
                      build_name: nameToSave,
                      god_name: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
                      god_internal_name: selectedGod.internalName || selectedGod.GodName,
                      items: selectedItems.filter(Boolean).map(item => ({ name: item.name || item.internalName, internalName: item.internalName, icon: item.icon })),
                      starting_items: startingItems.filter(Boolean).map(item => ({ name: item.name || item.internalName, internalName: item.internalName, icon: item.icon })),
                      relic: relicToPayload(finalRelic),
                      starting_relic: relicToPayload(startingRelic),
                      final_relic: relicToPayload(finalRelic),
                      god_level: Math.round(godLevel),
                      aspect_active: aspectActive && selectedGod.aspect ? true : false,
                      notes: (buildTips.filter(t => t && t.trim()).join('\n') || nameToSave).trim(),
                      tips: (buildTips.filter(t => t && t.trim()).join('\n') || '').trim() || null,
                      ability_leveling_order: abilityLevelingOrder,
                      starting_ability_order: startingAbilityOrder,
                      item_swaps: itemSwaps.map(swap => ({ item: swap.item, reasoning: swap.reasoning })),
                      roles: selectedRoles,
                      gamemodes: gamemodesToSave,
                      updated_at: new Date().toISOString(),
                    };
                    // Use RPC so update works when RLS blocks direct UPDATE (e.g. custom login without Supabase Auth)
                    const result = await supabase.rpc('update_contributor_build', {
                      build_id: String(buildToEdit.databaseId),
                      request_username: currentUser,
                      payload: updatePayload,
                    });
                    if (result.error) {
                      console.error('Contributor build update error:', result.error.code, result.error.message, result.error.details);
                      Alert.alert('Update failed', result.error.message || 'Could not save to server. Run supabase_update_contributor_build_rpc.sql in Supabase SQL Editor if you use custom login.');
                      return;
                    }
                    const updated = Array.isArray(result.data) ? result.data[0] : result.data;
                    if (!updated) {
                      console.error('Contributor build update: no row returned. Run supabase_update_contributor_build_rpc.sql in Supabase SQL Editor.');
                      Alert.alert('Update failed', 'No rows were updated. Run the SQL in supabase_update_contributor_build_rpc.sql in your Supabase project.');
                      return;
                    }
                    if (onEditComplete) onEditComplete();
                    Alert.alert('Success', 'Your contributor build has been updated.');
                  } catch (err) {
                    console.error('Exception updating contributor build:', err);
                    Alert.alert('Error', err?.message || 'An error occurred. Please try again.');
                  }
                }}
              >
                <Text style={styles.postToCommunityButtonText}>Update Build</Text>
              </TouchableOpacity>
            )}
            {/* Post to Contributor Builds Button - Only show if user is certified (or when not editing contributor) */}
            {isUserCertified && !(buildToEdit?.databaseTable === 'contributor_builds' && buildToEdit?.databaseId) && (
              <TouchableOpacity
                style={[styles.postToCommunityButton, styles.postToCertifiedButton]}
                onPress={async () => {
                  const currentUser = await storage.getItem('currentUser');
                  if (!currentUser) {
                    setShowLoginModal(true);
                    return;
                  }
                  
                  // Check if build is complete
                  const hasItems = selectedItems.filter(Boolean).length > 0;
                  if (!hasItems) {
                    Alert.alert('Incomplete Build', 'Please add items to your build before posting.');
                    return;
                  }
                  
                  // Pre-fill when editing existing contributor build
                  if (buildToEdit?.databaseTable === 'contributor_builds') {
                    setCertifiedBuildName(buildToEdit.build_name || buildToEdit.name || '');
                    setSelectedGamemodes(Array.isArray(buildToEdit.gamemodes) && buildToEdit.gamemodes.length > 0 ? buildToEdit.gamemodes : ['All Modes']);
                  } else {
                    setCertifiedBuildName('');
                    setSelectedGamemodes(['All Modes']);
                  }
                  setShowPostToCertifiedModal(true);
                }}
              >
                <Text style={styles.postToCommunityButtonText}>Post to Contributor Builds</Text>
              </TouchableOpacity>
            )}
            
            {/* Post to Community Builds Button */}
            <TouchableOpacity
              style={styles.postToCommunityButton}
              onPress={async () => {
                const currentUser = await storage.getItem('currentUser');
                if (!currentUser) {
                  Alert.alert(
                    'Not Logged In',
                    'Please log in to post builds to the community. You can create an account or sign in from the Profile page.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Go to Profile', onPress: () => {
                        // Navigate to profile - this will be handled by the parent
                        Alert.alert('Info', 'Please go to the Profile tab to sign in or create an account.');
                      }}
                    ]
                  );
                  return;
                }
                
                // Check if build is complete
                const hasItems = selectedItems.filter(Boolean).length > 0;
                if (!hasItems) {
                  Alert.alert('Incomplete Build', 'Please add items to your build before posting to the community.');
                  return;
                }
                
                setBuildName('');
                setShowPostToCommunityModal(true);
              }}
            >
              <Text style={styles.postToCommunityButtonText}>Post to Community Builds</Text>
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
            style={styles.itemInfoModal}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedItemInfo && selectedItemInfo.item && (
              <>
                <View style={styles.itemInfoHeader}>
                  <Text style={styles.itemInfoTitle}>
                    {selectedItemInfo.item.name || selectedItemInfo.item.internalName}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedItemInfo(null)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
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
                
                {selectedItemInfo.item.stats && Object.keys(selectedItemInfo.item.stats).length > 0 && (
                  <View style={styles.itemInfoStats}>
                    <Text style={styles.itemInfoStatsTitle}>Stats:</Text>
                    {Object.keys(selectedItemInfo.item.stats).map((statKey) => {
                      const statValue = selectedItemInfo.item.stats[statKey];
                      // Color code stat labels based on stat type (same as builds section)
                      let statColor = '#94a3b8'; // default
                      if (["MaxHealth", "Health", "HP5", "Health Regen"].includes(statKey)) statColor = "#22c55e"; // green
                      else if (["AttackSpeed", "Critical Chance", "CriticalChance", "Critical Damage", "Attack Speed","Basic Attack Damage", "Criticial Chance", "Critical Damage", "Basic Damage"].includes(statKey)) statColor = "#f97316"; // orange
                      else if (["PhysicalProtection", "Penetration", "Physical Protection"].includes(statKey)) statColor = "#ef4444"; // red
                      else if (statKey === "Intelligence") statColor = "#a855f7"; // purple
                      else if (statKey === "Strength") statColor = "#facc15"; // yellow
                      else if (statKey === "Cooldown Rate") statColor = "#0ea5e9"; // blue
                      else if (statKey === "MagicalProtection") statColor = "#a855f7"; // purple
                      else if (statKey === "Lifesteal") statColor = "#84cc16"; // light yellow green
                      else if (["MaxMana", "MP5", "Mana Regen", "Mana", "Mana Regeneration", "Magical Protection"].includes(statKey)) statColor = "#3b82f6"; // blue
                      
                      return (
                        <View key={statKey} style={styles.itemInfoStatRow}>
                          <Text style={[styles.itemInfoStatLabel, { color: statColor }]}>
                            {statDisplayNames[statKey] || statKey}:
                          </Text>
                          <Text style={styles.itemInfoStatValue}>
                            {statValue}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {selectedItemInfo.item.passive ? (
                  <View style={styles.itemInfoPassive}>
                    <Text style={styles.itemInfoStatsTitle}>Passive</Text>
                    <Text style={styles.itemInfoPassiveText}>{String(selectedItemInfo.item.passive).trim()}</Text>
                  </View>
                ) : null}
                
                {selectedItemInfo.item.totalCost && (
                  <View style={styles.itemInfoCost}>
                    <Text style={styles.itemInfoCostText}>
                      Cost: {selectedItemInfo.item.totalCost.toLocaleString()} Gold
                    </Text>
                  </View>
                )}
                
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
                        <Text style={[styles.dropdownItemText, selectedStat === stat && styles.dropdownItemTextActive]}>{stat}</Text>
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
                        <Text style={[styles.dropdownItemText, selectedTier === tier && styles.dropdownItemTextActive]}>{tier}</Text>
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
                const cost = item.totalCost || 0;
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
                        setSwapItem(item);
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
                      <Text style={styles.itemPickerName}>{name}</Text>
                      {cost > 0 && (
                        <Text style={styles.itemPickerCost}>{cost.toLocaleString()} Gold</Text>
                      )}
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
                    const { supabase } = require('../config/supabase');
                    
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
                      <Text style={styles.itemPickerName}>{name}</Text>
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
                    const { supabase } = require('../config/supabase');
                    
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
                {buildToEdit && buildToEdit.databaseTable === 'community_builds' ? 'Edit Community Build' : 'Post to Community Builds'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPostToCommunityModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
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
                onPress={async () => {
                  if (!communityBuildName.trim()) {
                    Alert.alert('Error', 'Please enter a build name.');
                    return;
                  }

                  const currentUser = await storage.getItem('currentUser');
                  if (!currentUser) {
                    setShowPostToCommunityModal(false);
                    setShowLoginModal(true);
                    return;
                  }

                  setIsPostingToCommunity(true);
                  
                  try {
                    // Import supabase
                    const { supabase } = require('../config/supabase');
                    
                    // Prepare gamemodes - if "All Modes" is selected, store all modes, otherwise store selected modes
                    const gamemodesToSave = selectedGamemodes.includes('All Modes')
                      ? ['Joust', 'Duel', 'Arena', 'Conquest', 'Assault']
                      : selectedGamemodes;
                    
                    // Check if user is certified (for posting to certified builds)
                    let isCertified = false;
                    try {
                      const { data: certData } = await supabase
                        .from('certification_requests')
                        .select('status')
                        .eq('username', currentUser)
                        .eq('status', 'approved')
                        .limit(1)
                        .single();
                      isCertified = !!(certData && certData.status === 'approved');
                    } catch (certErr) {
                      // Not certified, continue as community build
                    }
                    
                    // Prepare build data for community/certified
                    const buildData = {
                      name: communityBuildName.trim(),
                      god: selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName,
                      godInternalName: selectedGod.internalName || selectedGod.GodName,
                      godIcon: selectedGod.icon || selectedGod.GodIcon,
                      items: selectedItems.filter(Boolean).map(item => ({
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
                      notes: buildTips.filter(t => t && t.trim()).join('\n') || communityBuildName.trim(),
                      tips: buildTips.filter(t => t && t.trim()).join('\n') || null,
                      startingItems: startingItems.filter(Boolean).map(item => ({
                        name: item.name || item.internalName,
                        internalName: item.internalName,
                        icon: item.icon,
                      })),
                      abilityLevelingOrder: abilityLevelingOrder,
                      startingAbilityOrder: startingAbilityOrder,
                      itemSwaps: itemSwaps.map(swap => ({
                        item: swap.item,
                        reasoning: swap.reasoning,
                      })),
                      roles: selectedRoles,
                      gamemodes: gamemodesToSave,
                      createdAt: new Date().toISOString(),
                      isCertified: isCertified,
                    };

                    // Check if we're editing an existing build
                    const isEditing = buildToEdit && buildToEdit.databaseId && buildToEdit.databaseTable === 'community_builds';
                    
                    const updateData = {
                      build_name: communityBuildName.trim(),
                      god_name: buildData.god,
                      god_internal_name: buildData.godInternalName,
                      items: buildData.items,
                      starting_items: buildData.startingItems,
                      relic: buildData.relic,
                      starting_relic: buildData.starting_relic,
                      final_relic: buildData.final_relic,
                      god_level: Math.round(godLevel),
                      aspect_active: buildData.aspectActive,
                      notes: buildData.notes || buildData.tips || communityBuildName.trim(),
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
                      // Update existing build
                      const result = await supabase
                        .from('community_builds')
                        .update(updateData)
                        .eq('id', buildToEdit.databaseId)
                        .eq('username', currentUser); // Ensure user owns the build
                      data = result.data;
                      error = result.error;
                    } else {
                      // Insert new build
                      const result = await supabase
                        .from('community_builds')
                        .insert({
                          username: currentUser,
                          ...updateData,
                          created_at: new Date().toISOString(),
                        });
                      data = result.data;
                      error = result.error;
                    }

                    if (error) {
                      console.error('Error posting to community:', error);
                      if (error.code === 'MISSING_CONFIG') {
                        Alert.alert(
                          'Development Mode', 
                          'Supabase is not configured in development. In proaction, your builds will be saved properly. This is normal for Expo development.'
                        );
                        // Still show success in dev mode so user knows the flow works
                        setShowPostToCommunityModal(false);
                        setCommunityBuildName('');
                        setSelectedGamemodes(['All Modes']);
                        setIsPostingToCommunity(false);
                        Alert.alert('Success (Dev Mode)', 'Build posted! In production, this will be saved to the database.');
                      } else {
                        Alert.alert('Error', `Failed to post build: ${error.message || 'Please try again.'}`);
                      }
                      setIsPostingToCommunity(false);
                      return;
                    }

                    setShowPostToCommunityModal(false);
                    setCommunityBuildName('');
                    setSelectedGamemodes(['All Modes']);
                    setIsPostingToCommunity(false);
                    
                    // Clear buildToEdit if we were editing
                    const isEditingCommunity = buildToEdit && buildToEdit.databaseId && buildToEdit.databaseTable === 'community_builds';
                    if (isEditingCommunity && onEditComplete) {
                      onEditComplete();
                    }
                    
                    Alert.alert('Success', `Your community build has been ${isEditingCommunity ? 'updated' : 'posted'}!`);
                  } catch (error) {
                    console.error('Exception posting to community:', error);
                    Alert.alert('Error', 'An error occurred while posting. Please try again.');
                    setIsPostingToCommunity(false);
                  }
                }}
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
                      const { supabase } = require('../config/supabase');
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
                            await storage.setItem('currentUser', loginUsername.trim());
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
                        await storage.setItem('currentUser', loginUsername.trim());
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
                          await storage.setItem('currentUser', loginUsername.trim());
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
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
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
    width: '40%',
    minWidth: 56,
    maxWidth: 96,
    ...(IS_WEB && {
      width: 92,
      minWidth: 92,
      maxWidth: 92,
    }),
  },
  compactStartingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: IS_WEB ? 'center' : 'flex-start',
    ...(IS_WEB
      ? {
          alignSelf: 'center',
          justifyContent: 'center',
          width: 92 * 4 + 10 * 3,
          maxWidth: '100%',
          columnGap: 10,
          rowGap: 10,
        }
      : { gap: 4 }),
  },
  compactFinalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 6 : 4,
    justifyContent: IS_WEB ? 'center' : 'flex-start',
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
    width: IS_WEB ? 112 * 3 + 14 * 2 : '100%',
    maxWidth: '100%',
    columnGap: 14,
    rowGap: 14,
  },
  compactFinalSlotWeb: {
    ...(IS_WEB && {
      width: 112,
      minWidth: 112,
      maxWidth: 112,
      flexGrow: 0,
      flexShrink: 0,
    }),
  },
  compactStartingSlot: {
    width: '23%',
    minWidth: 48,
    maxWidth: 76,
    ...(IS_WEB && {
      width: 92,
      minWidth: 92,
      maxWidth: 92,
      flexGrow: 0,
      flexShrink: 0,
    }),
  },
  compactFinalSlot: {
    width: '30%',
    minWidth: 48,
    maxWidth: 78,
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
    fontSize: IS_WEB ? 7 : 6,
    textAlign: 'center',
    marginTop: 1,
    lineHeight: IS_WEB ? 9 : 8,
    width: '100%',
    paddingHorizontal: 1,
  },
  compactSlotPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 28,
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
  statsEmbedLevelHeading: {
    color: '#64748b',
    fontSize: IS_WEB ? 11 : 10,
    fontWeight: '600',
    marginBottom: IS_WEB ? 6 : 5,
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
  godRoleBlock: {
    width: '100%',
    gap: IS_WEB ? 8 : 6,
  },
  godRoleSubtitle: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 12 : 11,
    fontWeight: '500',
    marginTop: -2,
    marginBottom: IS_WEB ? 8 : 6,
    lineHeight: IS_WEB ? 16 : 15,
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
    ...(IS_WEB && {
      alignSelf: 'stretch',
      width: '100%',
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
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    width: '90%',
    borderWidth: 2,
    borderColor: '#1e90ff',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  itemInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemInfoTitle: {
    color: '#7dd3fc',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  itemInfoIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  itemInfoIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
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
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  itemInfoCostText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
  itemPickerName: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPickerCost: {
    color: '#fbbf24',
    fontSize: 14,
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
