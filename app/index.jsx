import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense, startTransition } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Linking,
  Alert,
  Share,
} from 'react-native';
import CryptoJS from 'crypto-js';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { getRoleIcon } from './localIcons';
// Lazy load page components to reduce initial bundle size
const HomePage = lazy(() => import('./home'));
const DataPage = lazy(() => import('./data'));
const CustomBuildPage = lazy(() => import('./custombuild'));
const PlayerProfilesPage = lazy(() => import('./playerprofiles'));
const PatchHubPage = lazy(() => import('./patchhub'));
const MorePage = lazy(() => import('./more'));
const WordlePage = lazy(() => import('./wordle'));
const MyBuildsPage = lazy(() => import('./mybuilds'));
const TierlistPage = lazy(() => import('./tierlist'));
// Lazy load the large JSON to prevent startup crash
let localBuilds = null;

const IS_WEB = Platform.OS === 'web';
import { getLocalItemIcon, getLocalGodAsset } from './localIcons';

// Import supabase lazily to avoid module load errors on mobile
let supabase = null;
let supabaseInitialized = false;

const getSupabase = () => {
  if (supabaseInitialized) {
    return supabase;
  }
  
  try {
    supabase = require('../config/supabase').supabase;
    supabaseInitialized = true;
    return supabase;
  } catch (e) {
    console.warn('Failed to load Supabase config, using mock:', e.message);
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
    };
    supabaseInitialized = true;
    return supabase;
  }
};

// Build category helpers
// Featured: your own curated builds (primary authors)
// Contributors: trusted content creators / allowed authors
// Community: everyone else
const FEATURED_AUTHORS = ['mytharria', 'mendar'];
const CONTRIBUTORS_AUTHORS = [''];

const getBuildCategory = (build) => {
  const authorRaw = (build?.author || '').toString().trim();
  if (!authorRaw) return 'community';
  const author = authorRaw.toLowerCase();
  if (FEATURED_AUTHORS.includes(author)) return 'featured';
  if (CONTRIBUTORS_AUTHORS.includes(author)) return 'contributors';
  return 'community';
};

// God icon URL for contributor PFPs (matches profile.jsx)
const getGodIconUrl = (godName) => {
  if (!godName) return null;
  const normalizedName = godName.toString().toLowerCase().trim();
  const encodedName = encodeURIComponent(normalizedName);
  return `https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Icons/${encodedName}.png`;
};

// Patch Badge Tooltip Component
function PatchBadgeTooltip({ changeType, version, entityType, badgeStyle, textStyle, overlayStyle, contentStyle, tooltipTextStyle, closeButtonStyle, closeTextStyle }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getChangeTypeText = (type) => {
    const types = {
      'buffed': 'Buffed',
      'nerfed': 'Nerfed',
      'shifted': 'Shifted',
      'new': 'New',
    };
    return types[type] || 'Updated';
  };

  return (
    <>
      <TouchableOpacity
        style={badgeStyle}
        onPress={() => setShowTooltip(true)}
        activeOpacity={0.7}
      >
        <Text style={textStyle}>
          {getChangeTypeText(changeType)}
        </Text>
      </TouchableOpacity>
      
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <Pressable
          style={overlayStyle}
          onPress={() => setShowTooltip(false)}
        >
          <View style={contentStyle}>
            <Text style={tooltipTextStyle}>
              This {entityType} was recently {changeType} this patch ({version}).
            </Text>
            <TouchableOpacity
              style={closeButtonStyle}
              onPress={() => setShowTooltip(false)}
            >
              <Text style={closeTextStyle}>✕</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
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
};

function BuildsPage({ onGodIconPress, initialTab = 'builds', hideInternalTabs = false, onNavigateToGod = null, onNavigateToCustomBuild = null, initialBuildCategory = 'featured', onNavigateToUserProfile = null }) {
  const [builds, setBuilds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState(null); // 'ADC', 'Solo', 'Support', 'Mid', 'Jungle'
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [initialDisplayLimit] = useState(80); // Only show first 80 gods initially
  const [selectedBuildIndex, setSelectedBuildIndex] = useState({}); // { godIndex: buildIndex }
  const [selectedAbility, setSelectedAbility] = useState(null); // { godIndex, abilityKey, ability }
  const [selectedItem, setSelectedItem] = useState(null); // { item, itemName }
  const [selectedTip, setSelectedTip] = useState(null); // { tip, tipIndex, godIndex }
  const [failedItemIcons, setFailedItemIcons] = useState({}); // Track which item icons failed to load
  const [activeTab, setActiveTab] = useState(initialTab === 'randomizer' ? 'randomizer' : 'builds'); // 'builds' or 'randomizer'
  const [pinnedBuilds, setPinnedBuilds] = useState(new Set()); // Track pinned builds
  const [expandedCardSections, setExpandedCardSections] = useState({}); // { [`${idx}-${buildIdx}-leveling`]: true, ... } app-only collapse
  const [tipsSwapsTab, setTipsSwapsTab] = useState({}); // { [`${idx}-${buildIdx}`]: 'tips' | 'swaps' } for contributor/community
  const [levelingTab, setLevelingTab] = useState({}); // { [`${idx}-${buildIdx}`]: 'start' | 'max' } for contributor/community
  const [buildCategory, setBuildCategory] = useState(initialBuildCategory); // 'featured', 'contributors', 'community', 'all'
  // Community builds from Supabase
  const [communityBuildsFromDB, setCommunityBuildsFromDB] = useState([]);
  const [contributorsBuildsFromDB, setContributorsBuildsFromDB] = useState([]);
  const [loadingCommunityBuilds, setLoadingCommunityBuilds] = useState(false);
  const [loadingContributorsBuilds, setLoadingContributorsBuilds] = useState(false);
  const [contributorsUsers, setContributorsUsers] = useState(new Set()); // Track contributors usernames
  const [contributorsUserData, setContributorsUserData] = useState({}); // username -> { display_name, profile_god_icon }
  // Filter dropdown states
  const [roleDropdownVisible, setRoleDropdownVisible] = useState(false);
  const [authorDropdownVisible, setAuthorDropdownVisible] = useState(false);
  const [godDropdownVisible, setGodDropdownVisible] = useState(false);
  const [gamemodeDropdownVisible, setGamemodeDropdownVisible] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [selectedGod, setSelectedGod] = useState(null);
  const [selectedGamemodes, setSelectedGamemodes] = useState([]); // Array for multiple game mode selection
  // Login and certification states
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRequestingCertification, setIsRequestingCertification] = useState(false);
  const [certificationRequestStatus, setCertificationRequestStatus] = useState(null); // 'pending', 'approved', 'rejected', null
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Randomizer state
  const [randomGod, setRandomGod] = useState(null);
  const [randomItems, setRandomItems] = useState(Array(7).fill(null));
  const [randomRelic, setRandomRelic] = useState(null);
  const [godRerolls, setGodRerolls] = useState(3);
  const [itemRerolls, setItemRerolls] = useState(3);
  const [selectedRandomItem, setSelectedRandomItem] = useState(null); // { item, itemName } for tooltip
  const [aspectActive, setAspectActive] = useState(false); // Track if aspect is active
  
  // Check login status and certification request status
  useEffect(() => {
    const checkLogin = async () => {
      const user = await storage.getItem('currentUser');
      setCurrentUser(user);
      
      // Check if user has a pending certification request
      if (user) {
        try {
          const supabaseClient = getSupabase();
          if (supabaseClient && supabaseClient.from) {
            // First, check if user has any approved request (once approved, always approved)
            const { data: approvedData, error: approvedError } = await supabaseClient
              .from('certification_requests')
              .select('status')
              .eq('username', user)
              .eq('status', 'approved')
              .limit(1);
            
            // If user has an approved request, they're approved regardless of newer pending requests
            // Supabase returns an array, so check if array has items
            console.log('🔍 Checking approved request for user:', user, 'approvedData:', approvedData, 'approvedError:', approvedError);
            const hasApprovedRequest = !approvedError && approvedData && (
              (Array.isArray(approvedData) && approvedData.length > 0) || 
              (approvedData && approvedData.status === 'approved')
            );
            
            console.log('🔍 hasApprovedRequest:', hasApprovedRequest);
            
            if (hasApprovedRequest) {
              setCertificationRequestStatus('approved');
              await storage.setItem(`certificationStatus_${user}`, 'approved');
              console.log('✅ Certification status updated: approved (user has approved request)', 'for user:', user, 'data:', approvedData);
            } else {
              // Otherwise, check the most recent request
              const { data, error } = await supabaseClient
                .from('certification_requests')
                .select('status')
                .eq('username', user)
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
              
              if (status) {
                setCertificationRequestStatus(status); // 'pending', 'approved', 'rejected'
                // Also save to local storage for persistence
                await storage.setItem(`certificationStatus_${user}`, status);
                console.log('✅ Certification status updated:', status, 'for user:', user);
              } else if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows found, which is fine
                // Check local storage as fallback
                const cachedStatus = await storage.getItem(`certificationStatus_${user}`);
                if (cachedStatus) {
                  setCertificationRequestStatus(cachedStatus);
                }
                console.error('Error checking certification status:', error);
              } else {
                // No rows found - check local storage as fallback
                const cachedStatus = await storage.getItem(`certificationStatus_${user}`);
                if (cachedStatus) {
                  setCertificationRequestStatus(cachedStatus);
                }
              }
            }
          }
        } catch (err) {
          console.error('Exception checking certification status:', err);
        }
      }
    };
    checkLogin();
  }, []);
  
  // Load pinned builds from storage
  useEffect(() => {
    const loadPinnedBuilds = async () => {
      const currentUser = await storage.getItem('currentUser');
      if (currentUser) {
        const pinnedBuildsData = await storage.getItem(`pinnedBuilds_${currentUser}`);
        if (pinnedBuildsData) {
          const pinned = JSON.parse(pinnedBuildsData);
          const buildKeys = new Set(pinned.map(b => b.buildKey));
          setPinnedBuilds(buildKeys);
        }
      }
    };
    loadPinnedBuilds();
  }, []);
  
  // Sync activeTab with initialTab when it changes
  useEffect(() => {
    if (initialTab === 'builds') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Lazy load the builds data immediately
  useEffect(() => {
    let isMounted = true;
    
    // Load immediately without delay
    try {
      const data = require('./data/builds.json');
      if (isMounted) {
        setBuilds(data);
        setLoading(false);
      }
    } catch (err) {
      if (isMounted) {
        setError('Failed to load builds data');
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Load community builds from Supabase when Community tab is active
  // Load contributors builds from Supabase when Contributors tab is active
  useEffect(() => {
    // Clear DB builds when switching away from their respective tabs
    if (buildCategory !== 'community') {
      setCommunityBuildsFromDB([]);
    }
    if (buildCategory !== 'contributors') {
      setContributorsBuildsFromDB([]);
    }
    
    if (buildCategory !== 'community' && buildCategory !== 'contributors') {
      return;
    }
    
    let isMounted = true;
    
    const loadBuilds = async () => {
      try {
        const supabaseClient = getSupabase();
        if (!supabaseClient || !supabaseClient.from) {
          console.log('⚠️ Supabase client not available');
          if (isMounted) {
            setLoadingCommunityBuilds(false);
            setLoadingContributorsBuilds(false);
          }
          return;
        }
        
        // Load community builds
        if (buildCategory === 'community') {
          setLoadingCommunityBuilds(true);
          console.log('🔄 Loading community builds from Supabase...');
          const { data, error } = await supabaseClient
            .from('community_builds')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('❌ Error loading community builds:', error);
            if (isMounted) {
              setLoadingCommunityBuilds(false);
            }
            return;
          }
          
          console.log(`✅ Loaded ${data?.length || 0} community builds from database`);
          if (isMounted && data) {
            setCommunityBuildsFromDB(data || []);
            setLoadingCommunityBuilds(false);
          }
        }
        
        // Load contributors builds (from contributor_builds table)
        if (buildCategory === 'contributors') {
          setLoadingContributorsBuilds(true);
          console.log('🔄 Loading contributors builds from Supabase...');
          const { data: contributorsData, error: contributorsError } = await supabaseClient
            .from('contributor_builds')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (contributorsError) {
            console.error('❌ Error loading contributors builds:', contributorsError);
            if (isMounted) {
              setLoadingContributorsBuilds(false);
            }
            return;
          }
          
          console.log(`✅ Loaded ${contributorsData?.length || 0} contributors builds from database`);
          if (contributorsData && contributorsData.length > 0) {
            console.log('📦 Contributors builds data:', contributorsData.map(b => ({ 
              id: b.id, 
              username: b.username, 
              build_name: b.build_name, 
              god_name: b.god_name 
            })));
            // Extract unique usernames from contributors builds
            const usernames = new Set(contributorsData.map(b => b.username).filter(Boolean));
            setContributorsUsers(usernames);
            console.log('✅ Contributors users:', Array.from(usernames));
          }
          if (isMounted && contributorsData) {
            setContributorsBuildsFromDB(contributorsData || []);
            setLoadingContributorsBuilds(false);
          }
        }
      } catch (err) {
        console.error('❌ Exception loading builds:', err);
        if (isMounted) {
          setLoadingCommunityBuilds(false);
          setLoadingContributorsBuilds(false);
        }
      }
    };
    
    loadBuilds();
    
    return () => {
      isMounted = false;
    };
  }, [buildCategory]);

  // Fetch display_name and profile_god_icon for contributors when on Contributors tab
  useEffect(() => {
    if (buildCategory !== 'contributors' || contributorsUsers.size === 0) {
      if (buildCategory !== 'contributors') setContributorsUserData({});
      return;
    }
    let isMounted = true;
    const usernames = Array.from(contributorsUsers).filter(Boolean);
    if (usernames.length === 0) return;
    const supabaseClient = getSupabase();
    if (!supabaseClient?.from) return;
    supabaseClient
      .from('user_data')
      .select('username, display_name, profile_god_icon')
      .in('username', usernames)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Contributors user_data fetch failed:', error);
          return;
        }
        const map = {};
        (data || []).forEach((row) => {
          map[row.username] = {
            display_name: row.display_name || row.username,
            profile_god_icon: row.profile_god_icon || null,
          };
        });
        setContributorsUserData(map);
      });
    return () => { isMounted = false; };
  }, [buildCategory, contributorsUsers]);

  // Debounce search query to prevent rapid filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [query]);

  // Reset build indices when filters change
  useEffect(() => {
    setSelectedBuildIndex({});
  }, [selectedRole, selectedAuthor, selectedGod, selectedGamemodes]);

  // Clear filters when build category changes
  useEffect(() => {
    setSelectedRole(null);
    setSelectedAuthor(null);
    setSelectedGod(null);
    setSelectedGamemodes([]);
    setRoleDropdownVisible(false);
    setAuthorDropdownVisible(false);
    setGodDropdownVisible(false);
    setGamemodeDropdownVisible(false);
  }, [buildCategory]);

  function flattenAny(a) {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
  }

  const gods = builds ? flattenAny(builds.gods) : [];
  const items = builds ? flattenAny(builds.items) : [];

  // Create a fast lookup map for items to avoid expensive recursive searches
  const itemLookupMap = useMemo(() => {
    const map = new Map();
    if (!items || !Array.isArray(items)) return map;

    const addToMap = (item) => {
      if (!item || typeof item !== 'object') return;
      
      // Only process items that have internalName or name (actual item objects)
      if (!item.internalName && !item.name) {
        // Recursively process nested arrays
        for (let key in item) {
          if (Array.isArray(item[key])) {
            item[key].forEach(addToMap);
          }
        }
        return;
      }
      
      const internalName = item.internalName ? item.internalName.toString().toLowerCase().trim() : '';
      const name = item.name ? item.name.toString().toLowerCase().trim() : '';
      const internalNorm = internalName.replace(/[^a-z0-9]/g, '');
      const nameNorm = name.replace(/[^a-z0-9]/g, '');
      
      // Store by multiple keys for fast lookup
      if (internalName) {
        map.set(internalName, item);
        map.set(internalNorm, item);
        // Also add with spaces removed for "HealthPotion" -> "health potion" matching
        const internalNoSpaces = internalName.replace(/\s+/g, '');
        if (internalNoSpaces !== internalName) {
          map.set(internalNoSpaces, item);
        }
      }
      if (name) {
        map.set(name, item);
        map.set(nameNorm, item);
        // Also add with spaces removed for "healthpotion" -> "Health Potion" matching
        const nameNoSpaces = name.replace(/\s+/g, '');
        if (nameNoSpaces !== name) {
          map.set(nameNoSpaces, item);
        }
      }
      
      // Recursively process nested arrays
      for (let key in item) {
        if (Array.isArray(item[key])) {
          item[key].forEach(addToMap);
        }
      }
    };

    items.forEach(addToMap);
    return map;
  }, [items]);

  // pair gods with builds. The JSON structure has gods with a builds array property.
  // Each god object contains its own builds array.
  function pairGodsAndBuilds(b) {
    if (!b) return [];
    const godGroups = b.gods || [];
    const pairs = [];

    // Flatten god groups and extract builds from each god
    const groups = Array.isArray(godGroups) ? godGroups : [];
    for (let gi = 0; gi < groups.length; gi++) {
      const gGroup = Array.isArray(groups[gi]) ? groups[gi] : (gi === 0 && !Array.isArray(groups[0]) ? [groups] : []);
      for (let j = 0; j < gGroup.length; j++) {
        const god = gGroup[j] || null;
        if (god) {
          // Extract builds array from god object
          const godBuilds = (god.builds && Array.isArray(god.builds)) ? god.builds : [];
          pairs.push({ god, builds: godBuilds });
        }
      }
    }
    return pairs;
  }

  // Transform community builds from DB into the same format as JSON builds
  const transformedCommunityBuilds = useMemo(() => {
    if (!builds || communityBuildsFromDB.length === 0) return null;
    
    // Group community builds by god
    const godMap = new Map();
    
    communityBuildsFromDB.forEach((dbBuild) => {
      const godInternalName = dbBuild.god_internal_name || dbBuild.god_name;
      if (!godInternalName) return;
      
      // Find the god in the builds.json data
      const allGods = flattenAny(builds.gods);
      // Normalize god names for matching (remove _Item suffix, handle variations)
      const normalizedDbName = godInternalName.toLowerCase().replace(/_item$/, '');
      let god = allGods.find(g => {
        const gInternalName = (g.internalName || g.GodName || '').toLowerCase();
        const gName = (g.name || '').toLowerCase();
        return gInternalName === normalizedDbName || 
               gInternalName === godInternalName.toLowerCase() ||
               gName === normalizedDbName ||
               gName === (dbBuild.god_name || '').toLowerCase();
      });
      
      // If god not found, create a minimal god object
      if (!god) {
        god = {
          name: dbBuild.god_name,
          GodName: dbBuild.god_name,
          internalName: dbBuild.god_internal_name || dbBuild.god_name,
          icon: null,
        };
      }
      
      // Transform the build to match JSON format
      const transformedBuild = {
        notes: dbBuild.build_name || dbBuild.notes || '',
        title: dbBuild.build_name || '',
        author: dbBuild.username || 'Unknown', // keep username as the internal author id
        authorDisplayName: dbBuild.author_display_name || dbBuild.username || 'Unknown',
        items: dbBuild.items || [],
        startingItems: dbBuild.starting_items || [],
        relic: dbBuild.relic || null,
        godLevel: dbBuild.god_level || 20,
        aspectActive: dbBuild.aspect_active || false,
        gamemodes: dbBuild.gamemodes || [],
        abilityLevelingOrder: dbBuild.ability_leveling_order || [],
        startingAbilityOrder: dbBuild.starting_ability_order || [],
        itemSwaps: dbBuild.item_swaps || [],
        roles: dbBuild.roles || [],
        tips: dbBuild.tips || '',
        createdAt: dbBuild.created_at,
        // Mark as community build from DB
        fromDatabase: true,
        databaseCategory: 'community',
        databaseId: dbBuild.id, // Store the database ID for editing
        databaseTable: 'community_builds', // Store the table name for updates
      };
      
      if (!godMap.has(godInternalName)) {
        godMap.set(godInternalName, {
          god: { ...god },
          builds: []
        });
      }
      
      godMap.get(godInternalName).builds.push(transformedBuild);
    });
    
    return Array.from(godMap.values());
  }, [builds, communityBuildsFromDB]);

  // Transform contributors builds from DB into the same format as JSON builds
  const transformedContributorsBuilds = useMemo(() => {
    console.log('🔄 Transforming contributors builds, count:', contributorsBuildsFromDB.length);
    if (!builds || contributorsBuildsFromDB.length === 0) {
      console.log('⚠️ No contributors builds to transform');
      return null;
    }
    
    // Group contributors builds by god
    const godMap = new Map();
    
    contributorsBuildsFromDB.forEach((dbBuild) => {
      const godInternalName = dbBuild.god_internal_name || dbBuild.god_name;
      if (!godInternalName) return;
      
      // Find the god in the builds.json data
      const allGods = flattenAny(builds.gods);
      // Normalize god names for matching (remove _Item suffix, handle variations)
      const normalizedDbName = godInternalName.toLowerCase().replace(/_item$/, '');
      let god = allGods.find(g => {
        const gInternalName = (g.internalName || g.GodName || '').toLowerCase();
        const gName = (g.name || '').toLowerCase();
        return gInternalName === normalizedDbName || 
               gInternalName === godInternalName.toLowerCase() ||
               gName === normalizedDbName ||
               gName === (dbBuild.god_name || '').toLowerCase();
      });
      
      // If god not found, create a minimal god object
      if (!god) {
        god = {
          name: dbBuild.god_name,
          GodName: dbBuild.god_name,
          internalName: dbBuild.god_internal_name || dbBuild.god_name,
          icon: null,
        };
      }
      
      // Transform the build to match JSON format; use contributorsUserData for current display name
      const transformedBuild = {
        notes: dbBuild.build_name || dbBuild.notes || '',
        title: dbBuild.build_name || '',
        author: dbBuild.username || 'Unknown', // keep username as the internal author id
        authorDisplayName: (contributorsUserData[dbBuild.username]?.display_name) || dbBuild.author_display_name || dbBuild.username || 'Unknown',
        items: dbBuild.items || [],
        startingItems: dbBuild.starting_items || [],
        relic: dbBuild.relic || null,
        godLevel: dbBuild.god_level || 20,
        aspectActive: dbBuild.aspect_active || false,
        gamemodes: dbBuild.gamemodes || [],
        abilityLevelingOrder: dbBuild.ability_leveling_order || [],
        startingAbilityOrder: dbBuild.starting_ability_order || [],
        itemSwaps: dbBuild.item_swaps || [],
        roles: dbBuild.roles || [],
        tips: dbBuild.tips || '',
        createdAt: dbBuild.created_at,
        // Mark as contributors build from DB
        fromDatabase: true,
        databaseCategory: 'contributors',
        databaseId: dbBuild.id, // Store the database ID for editing
        databaseTable: 'community_builds', // Store the table name for updates
      };
      
      if (!godMap.has(godInternalName)) {
        godMap.set(godInternalName, {
          god: { ...god },
          builds: []
        });
      }
      
      godMap.get(godInternalName).builds.push(transformedBuild);
    });
    
    const result = Array.from(godMap.values());
    console.log('✅ Transformed contributors builds into', result.length, 'god pairs');
    if (result.length > 0) {
      console.log('📋 Contributors build pairs:', result.map(p => ({
        god: p.god?.name || p.god?.GodName,
        buildCount: p.builds?.length || 0
      })));
    }
    return result;
  }, [builds, contributorsBuildsFromDB, contributorsUserData]);

  // Memoize pairs to avoid recalculating on every render
  const pairs = useMemo(() => {
    if (!builds) return [];
    const jsonPairs = pairGodsAndBuilds(builds);
    
    // For contributors category, filter JSON pairs to only include contributors builds
    // For other categories, use all JSON pairs
    let filteredJsonPairs = jsonPairs;
    if (buildCategory === 'contributors') {
      filteredJsonPairs = jsonPairs.map(pair => {
        const contributorsBuilds = (pair.builds || []).filter(build => {
          if (!build) return false;
          const category = getBuildCategory(build);
          return category === 'contributors';
        });
        return { ...pair, builds: contributorsBuilds };
      }).filter(pair => pair.builds && pair.builds.length > 0);
    } else if (buildCategory === 'featured') {
      filteredJsonPairs = jsonPairs.map(pair => {
        const featuredBuilds = (pair.builds || []).filter(build => {
          if (!build) return false;
          const category = getBuildCategory(build);
          return category === 'featured';
        });
        return { ...pair, builds: featuredBuilds };
      }).filter(pair => pair.builds && pair.builds.length > 0);
    } else if (buildCategory === 'community') {
      filteredJsonPairs = jsonPairs.map(pair => {
        const communityBuilds = (pair.builds || []).filter(build => {
          if (!build) return false;
          const category = getBuildCategory(build);
          return category === 'community';
        });
        return { ...pair, builds: communityBuilds };
      }).filter(pair => pair.builds && pair.builds.length > 0);
    }
    
    // Merge DB builds based on current category
    let mergedPairs = [...filteredJsonPairs];
    
    // Merge community builds if on community tab
    if (buildCategory === 'community' && transformedCommunityBuilds && transformedCommunityBuilds.length > 0) {
      transformedCommunityBuilds.forEach((dbPair) => {
        const existingIndex = mergedPairs.findIndex(p => {
          const godName = p.god?.internalName || p.god?.GodName || '';
          const dbGodName = dbPair.god?.internalName || dbPair.god?.GodName || '';
          return godName.toLowerCase() === dbGodName.toLowerCase();
        });
        
        if (existingIndex >= 0) {
          // Merge builds for existing god
          mergedPairs[existingIndex].builds = [
            ...dbPair.builds, // DB builds first
            ...mergedPairs[existingIndex].builds.filter(b => !b.fromDatabase || b.databaseCategory !== 'community') // Then other builds
          ];
        } else {
          // Add new god with DB builds
          mergedPairs.push(dbPair);
        }
      });
    }
    
    // Merge contributors builds if on contributors tab
    console.log('🔍 Checking contributors builds merge - buildCategory:', buildCategory, 'transformedContributorsBuilds:', transformedContributorsBuilds?.length || 0);
    if (buildCategory === 'contributors' && transformedContributorsBuilds && transformedContributorsBuilds.length > 0) {
      console.log('✅ Merging', transformedContributorsBuilds.length, 'contributors build pairs');
      console.log('📦 Contributors pairs to merge:', transformedContributorsBuilds.map(p => ({
        god: p.god?.name || p.god?.GodName,
        builds: p.builds?.length || 0
      })));
      transformedContributorsBuilds.forEach((dbPair) => {
        const existingIndex = mergedPairs.findIndex(p => {
          const godName = p.god?.internalName || p.god?.GodName || '';
          const dbGodName = dbPair.god?.internalName || dbPair.god?.GodName || '';
          return godName.toLowerCase() === dbGodName.toLowerCase();
        });
        
        if (existingIndex >= 0) {
          // Merge builds for existing god
          mergedPairs[existingIndex].builds = [
            ...dbPair.builds, // DB builds first
            ...mergedPairs[existingIndex].builds.filter(b => !b.fromDatabase || b.databaseCategory !== 'contributors') // Then other builds
          ];
        } else {
          // Add new god with DB builds
          mergedPairs.push(dbPair);
        }
      });
    }
    
    console.log('📊 Final merged pairs count:', mergedPairs.length, 'for category:', buildCategory);
    if (buildCategory === 'contributors') {
      const contributorsBuildCount = mergedPairs.reduce((sum, p) => sum + (p.builds?.filter(b => b.databaseCategory === 'contributors' || getBuildCategory(b) === 'contributors').length || 0), 0);
      console.log('📊 Total contributors builds in merged pairs:', contributorsBuildCount);
    }
    return mergedPairs;
  }, [builds, buildCategory, transformedCommunityBuilds, transformedContributorsBuilds]);

  // Extract unique authors from builds in current category (display names where available)
  const availableAuthors = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    const authorsSet = new Set();
    pairs.forEach(({ builds: godBuilds }) => {
      if (Array.isArray(godBuilds)) {
        godBuilds.forEach(build => {
          if (build && build.author) {
            const displayAuthor = (build.authorDisplayName || build.author || '').toString().trim();
            if (!displayAuthor) return;
            // For DB builds, check their category
            if (build.fromDatabase) {
              if (build.databaseCategory === 'community' && buildCategory === 'community') {
                authorsSet.add(displayAuthor);
              } else if (build.databaseCategory === 'contributors' && buildCategory === 'contributors') {
                authorsSet.add(displayAuthor);
              }
            } else {
              // JSON builds - use category check
              const category = getBuildCategory(build);
              // Only include authors that have builds in the current category
              if (buildCategory === 'featured' && category === 'featured') {
                authorsSet.add(displayAuthor);
              } else if (buildCategory === 'contributors' && category === 'contributors') {
                authorsSet.add(displayAuthor);
              } else if (buildCategory === 'community' && category === 'community') {
                authorsSet.add(displayAuthor);
              }
            }
          }
        });
      }
    });
    return Array.from(authorsSet).sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [pairs, buildCategory]);

  // Extract unique god names for filtering (only gods with builds in current category)
  const availableGods = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    const godsSet = new Set();
    pairs.forEach(({ god, builds: godBuilds }) => {
      if (god) {
        // Check if this god has any builds in the current category
        const hasBuildsInCategory = Array.isArray(godBuilds) && godBuilds.some(build => {
          // For DB builds, check their category
          if (build.fromDatabase) {
            if (build.databaseCategory === 'community') return buildCategory === 'community';
            if (build.databaseCategory === 'contributors') return buildCategory === 'contributors';
            return false;
          }
          // For JSON builds, use category check
          const category = getBuildCategory(build);
          if (buildCategory === 'featured') return category === 'featured';
          if (buildCategory === 'contributors') return category === 'contributors';
          if (buildCategory === 'community') return category === 'community';
          return false;
        });
        
        if (hasBuildsInCategory) {
          const godName = god.name || god.GodName || god.title || god.displayName;
          if (godName) godsSet.add(godName.toString().trim());
        }
      }
    });
    return Array.from(godsSet).sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [pairs, buildCategory]);

  // Share function for individual builds
  const handleShareBuild = async (build, buildType = null) => {
    // Determine build type from buildCategory if not provided
    const type = buildType || buildCategory || 'community';
    const IS_WEB = Platform.OS === 'web';
    
    const baseUrl = IS_WEB && typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://smite2app.com'; // Replace with your actual domain
    
    const buildId = build.databaseId || build.id || `${build.god_name || build.god || 'build'}-${Date.now()}`;
    const buildUrl = `${baseUrl}/build/${type}/${buildId}`;
    const buildName = build.build_name || build.name || build.notes || 'Unnamed Build';
    const godName = build.god_name || build.god || build.godName || 'Unknown';
    const authorName = build.authorDisplayName || build.username || build.author || 'Unknown';
    
    const message = `Check out ${authorName}'s ${type} build "${buildName}" for ${godName}: ${buildUrl}`;
    
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

  // Memoize filtered results using debounced query and role filter
  const filtered = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    
    // First, filter pairs to only include builds in the current category
    const categoryFilteredPairs = pairs.map(pair => {
      const filteredBuilds = (pair.builds || []).filter(build => {
        if (!build) return false;
          // For DB builds, check their category
          if (build.fromDatabase) {
            if (build.databaseCategory === 'community') return buildCategory === 'community';
            if (build.databaseCategory === 'contributors') return buildCategory === 'contributors';
            return false;
          }
          // For JSON builds, use category check
          const category = getBuildCategory(build);
          if (buildCategory === 'featured') return category === 'featured';
          if (buildCategory === 'contributors') return category === 'contributors';
          if (buildCategory === 'community') return category === 'community';
          return false;
        return false;
      });
      return { ...pair, builds: filteredBuilds };
    }).filter(pair => pair.builds && pair.builds.length > 0); // Remove pairs with no builds in this category
    
    // Store pairs with original indices before filtering/sorting
    let result = categoryFilteredPairs.map((pair, origIdx) => ({ pair, origIdx }));
    
    // Sort pairs to prioritize pinned builds - pinned builds appear first
    result = result.sort((a, b) => {
      const aBuilds = Array.isArray(a.pair.builds) ? a.pair.builds : [];
      const bBuilds = Array.isArray(b.pair.builds) ? b.pair.builds : [];
      
      // Check if any builds in pair a are pinned (using original index)
      const aHasPinned = aBuilds.some((build, buildIdx) => {
        const aTitle = (a.pair.god?.name || a.pair.god?.GodName || 'Unknown');
        const buildKey = `${aTitle}-${a.origIdx}-${buildIdx}`;
        return pinnedBuilds.has(buildKey);
      });
      
      // Check if any builds in pair b are pinned (using original index)
      const bHasPinned = bBuilds.some((build, buildIdx) => {
        const bTitle = (b.pair.god?.name || b.pair.god?.GodName || 'Unknown');
        const buildKey = `${bTitle}-${b.origIdx}-${buildIdx}`;
        return pinnedBuilds.has(buildKey);
      });
      
      // Pinned pairs come first
      if (aHasPinned && !bHasPinned) return -1;
      if (!aHasPinned && bHasPinned) return 1;
      return 0;
    });
    
    // Filter by role if selected
    if (selectedRole) {
      result = result.filter(({ pair }) => {
        const god = pair.god;
        const godBuilds = pair.builds;
        if (!god) return false;
        const selectedRoleLower = selectedRole.toLowerCase();
        
        // First check god's roles property
        const roles = god.roles || god.role || [];
        const roleArray = Array.isArray(roles) ? roles : [roles];
        const godHasRole = roleArray.some(r => {
          const roleStr = String(r).toLowerCase().trim();
          // Handle "ADC" and "Carry" as the same
          if (selectedRoleLower === 'adc') {
            return roleStr === 'adc' || roleStr === 'carry';
          }
          // Handle "Mid" and "Middle" as the same
          if (selectedRoleLower === 'mid') {
            return roleStr === 'mid' || roleStr === 'middle';
          }
          // Also check if role string includes the selected role (for partial matches)
          return roleStr === selectedRoleLower || roleStr.includes(selectedRoleLower) || selectedRoleLower.includes(roleStr);
        });
        
        // If god has the role, include them
        if (godHasRole) return true;
        
        // Otherwise, check if any builds match the selected role
        const allBuilds = Array.isArray(godBuilds) ? godBuilds : [];
        if (allBuilds.length === 0) return false;
        
        // Check if any build matches the selected role
        return allBuilds.some((build) => {
          if (!build) return false;
          const buildText = [
            build.notes,
            build.title,
            build.role,
            build.lane,
            build.name
          ].filter(Boolean).join(' ').toLowerCase();
          
          // Handle "ADC" and "Carry" as the same
          if (selectedRoleLower === 'adc') {
            return buildText.includes('adc') || 
                   buildText.includes('carry') ||
                   buildText.includes('crit-oriented adc') ||
                   buildText.includes('shred/proc-oriented') ||
                   buildText.includes('shred proc-oriented') ||
                   buildText.includes('proc-oriented');
          }
          
          // Handle "Mid" and "Middle" as the same - also check for mage builds
          // IMPORTANT: Exclude jungle builds explicitly
          if (selectedRoleLower === 'mid') {
            // Don't match if it's a jungle build
            if (buildText.includes('jungle')) return false;
            
            return buildText.includes('mid') || 
                   buildText.includes('middle') || 
                   buildText.includes('mage') ||
                   buildText.includes('int oriented burst mage') ||
                   (buildText.includes('int') && (buildText.includes('mage') || buildText.includes('burst') || buildText.includes('oriented')));
          }
          
          // Handle "Support"
          if (selectedRoleLower === 'support') {
            return buildText.includes('support') ||
                   buildText.includes('active item') ||
                   buildText.includes('cooldown-oriented');
          }
          
          // Handle "Jungle"
          if (selectedRoleLower === 'jungle') {
            return buildText.includes('jungle');
          }
          
          // Handle "Solo" - check for solo, bruiser solo, solo bruiser, bruiser solo-lane, bruiser warrior, etc.
          if (selectedRoleLower === 'solo') {
            const soloPatterns = [
              /\bsolo\b/i,
              /\bbruiser\s+solo/i,
              /\bsolo\s+bruiser/i,
              /\bbruiser\s+solo[\s-]lane/i,
              /\bsolo[\s-]lane/i,
              /\bbruiser\s+warrior/i,
              /\bwarrior\s+bruiser/i,
            ];
            
            for (const pattern of soloPatterns) {
              if (pattern.test(buildText)) {
                return true;
              }
            }
            
            const hasBruiser = buildText.includes('bruiser');
            const hasSolo = buildText.includes('solo');
            const hasWarrior = buildText.includes('warrior');
            if ((hasBruiser && hasSolo) || (hasBruiser && hasWarrior)) {
              return true;
            }
            
            return false;
          }
          
          return buildText.includes(selectedRoleLower);
        });
      });
    }
    
    // Filter by selected author
    if (selectedAuthor) {
      result = result.filter(({ pair }) => {
        const godBuilds = pair.builds;
        if (!Array.isArray(godBuilds) || godBuilds.length === 0) return false;
        return godBuilds.some(build => {
          if (!build || !build.author) return false;
          return build.author.toString().trim() === selectedAuthor;
        });
      });
    }
    
    // Filter by selected god
    if (selectedGod) {
      result = result.filter(({ pair }) => {
        const god = pair.god;
        if (!god) return false;
        const godName = (god.name || god.GodName || god.title || god.displayName || '').toString().trim();
        return godName === selectedGod;
      });
    }
    
    // Filter by selected gamemodes (multiple selection)
    if (selectedGamemodes && selectedGamemodes.length > 0) {
      result = result.filter(({ pair }) => {
        const godBuilds = pair.builds;
        if (!Array.isArray(godBuilds) || godBuilds.length === 0) return false;
        return godBuilds.some(build => {
          if (!build) return false;
          
          // For DB builds, check the gamemodes array
          if (build.fromDatabase && build.gamemodes && Array.isArray(build.gamemodes)) {
            // Check if any of the build's gamemodes match any selected gamemode
            return build.gamemodes.some(buildMode => 
              selectedGamemodes.some(selectedMode => 
                buildMode.toLowerCase() === selectedMode.toLowerCase()
              )
            );
          }
          
          // For JSON builds, check build text
          const buildText = [
            build.notes,
            build.title,
            build.gamemode,
            build.mode
          ].filter(Boolean).join(' ').toLowerCase();
          return selectedGamemodes.some(selectedMode => 
            buildText.includes(selectedMode.toLowerCase())
          );
        });
      });
    }
    
    // Filter by search query
    if (lowerQuery) {
      result = result.filter(({ pair }) => {
        const god = pair.god;
        if (!god) return false;
        const name = (god.name || god.GodName || god.title || god.displayName || '').toString().toLowerCase();
        const role = (god.role || god.class || god.type || '').toString().toLowerCase();
        const pantheon = (god.pantheon || '').toString().toLowerCase();
        return name.includes(lowerQuery) || role.includes(lowerQuery) || pantheon.includes(lowerQuery);
      });
    } else if (!selectedRole && !selectedAuthor && !selectedGod && (!selectedGamemodes || selectedGamemodes.length === 0)) {
      // If no search query and no filters, only show first N gods for performance
      result = result.slice(0, initialDisplayLimit);
    }
    
    // Sort alphabetically by god name (case-insensitive)
    result.sort((a, b) => {
      const aTitle = (a.pair.god?.name || a.pair.god?.GodName || a.pair.god?.title || a.pair.god?.displayName || 'Unknown').toString().toLowerCase();
      const bTitle = (b.pair.god?.name || b.pair.god?.GodName || b.pair.god?.title || b.pair.god?.displayName || 'Unknown').toString().toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
    
    // Extract just the pairs after filtering/sorting
    const finalResult = result.map(({ pair }) => pair);
    console.log('🔍 Filtered result count:', finalResult.length, 'for category:', buildCategory);
    if (buildCategory === 'contributors' && finalResult.length > 0) {
      const totalBuilds = finalResult.reduce((sum, p) => sum + (p.builds?.length || 0), 0);
      console.log('📊 Total builds in filtered result:', totalBuilds);
    }
    return finalResult;
  }, [pairs, buildCategory, debouncedQuery, selectedRole, selectedAuthor, selectedGod, selectedGamemodes, initialDisplayLimit, pinnedBuilds]);

  // Fast item lookup function using the pre-built map
  const findItem = useCallback((metaName) => {
    if (!metaName) return null;
    const nameLower = metaName.toString().toLowerCase().trim();
    const nameNormalized = nameLower.replace(/[^a-z0-9]/g, '');
    
    // Try exact matches first
    let found = itemLookupMap.get(nameLower) || itemLookupMap.get(nameNormalized);
    if (found) return found;
    
    // Recursive search function for nested arrays
    const searchRecursive = (arr) => {
      if (!arr || !Array.isArray(arr)) return null;
      
      for (const it of arr) {
        if (!it || typeof it !== 'object') continue;
        
        // Check if this is an item object (including consumables with active: true)
        if (it.internalName || it.name || it.active === true) {
          const itInternal = it.internalName ? it.internalName.toString().toLowerCase().trim() : '';
          const itName = it.name ? it.name.toString().toLowerCase().trim() : '';
          const itInternalNorm = itInternal.replace(/[^a-z0-9]/g, '');
          const itNameNorm = itName.replace(/[^a-z0-9]/g, '');
          
          // Exact match
          if (itInternal === nameLower || itName === nameLower) return it;
          if (itInternalNorm === nameNormalized || itNameNorm === nameNormalized) return it;
          
          // Contains match
          if ((itInternal && (itInternal.includes(nameLower) || nameLower.includes(itInternal))) ||
              (itName && (itName.includes(nameLower) || nameLower.includes(itName)))) {
            return it;
          }
          
          // Word-by-word match for multi-word items
          const searchWords = nameLower.split(/\s+/).filter(w => w.length > 0);
          if (searchWords.length > 0) {
            if (itName) {
              const allWordsMatch = searchWords.every(word => 
                itName.includes(word) || itName.replace(/\s+/g, '').includes(word)
              );
              if (allWordsMatch) return it;
            }
            if (itInternal) {
              const internalNoSpaces = itInternal.replace(/\s+/g, '');
              const allWordsMatch = searchWords.every(word => internalNoSpaces.includes(word));
              if (allWordsMatch) return it;
            }
          }
        }
        
        // Recursively search nested arrays
        for (const key in it) {
          if (Array.isArray(it[key])) {
            const nestedResult = searchRecursive(it[key]);
            if (nestedResult) return nestedResult;
          }
        }
      }
      return null;
    };
    
    // Try recursive search if map lookup failed
    if (items && Array.isArray(items)) {
      found = searchRecursive(items);
    }
    
    return found || null;
  }, [itemLookupMap, items]);

  // Data is loaded from the bundled `localBuilds` by default.

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>SMITE 2</Text>
        
        {/* Tab Toggle Buttons - Hide when using sub-nav */}
        {!hideInternalTabs && (
          <View style={styles.tabButtons}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'builds' && styles.tabButtonActive]}
              onPress={() => setActiveTab('builds')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 'builds' && styles.tabButtonTextActive]}>
                Builds
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'guides' && styles.tabButtonActive]}
              onPress={() => setActiveTab('guides')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 'guides' && styles.tabButtonTextActive]}>
                Guides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'randomizer' && styles.tabButtonActive]}
              onPress={() => setActiveTab('randomizer')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 'randomizer' && styles.tabButtonTextActive]}>
                Randomizer
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {activeTab === 'builds' && (
          <Text style={styles.headerSub}>
            {buildCategory === 'featured' ? 'Curated builds from the mentor team' : 
             buildCategory === 'contributors' ? 'Made from Smite 2 Creators' : 
             buildCategory === 'community' ? 'Made by Community members' : 
             ''}
          </Text>
        )}
        {activeTab === 'randomizer' && (
          <Text style={styles.headerSub}>Random God & Build Generator</Text>
        )}
      </View>

      {activeTab === 'randomizer' ? (
        <ScrollView 
          style={styles.guidesContainer} 
          contentContainerStyle={styles.guidesContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Randomizer Section */}
          <View style={randomizerStyles.randomizerContainer}>
            {/* Main Randomize All Button */}
            <View style={randomizerStyles.randomizerSection}>
              <TouchableOpacity
                style={randomizerStyles.randomizeAllButton}
                onPress={() => {
                  // Randomize God (always randomize, but only decrement rerolls if available)
                  if (gods.length > 0) {
                    const randomGodIndex = Math.floor(Math.random() * gods.length);
                    const newGod = gods[randomGodIndex];
                    setRandomGod(newGod);
                    // Randomly activate aspect if god has one
                    if (newGod && newGod.aspect) {
                      setAspectActive(Math.random() > 0.5); // 50% chance to be active
                    } else {
                      setAspectActive(false);
                    }
                    if (godRerolls > 0) {
                      setGodRerolls(godRerolls - 1);
                    }
                  }
                  
                  // Randomize Items (always randomize, but only decrement rerolls if available)
                  // 1 starter (mandatory) + up to 3 active items + remaining tier 3 items = 7 total
                  if (items.length > 0) {
                    // Filter starter items
                    const starterItems = items.filter(item => {
                      if (!item || typeof item !== 'object') return false;
                      return item.starter === true && (item.name || item.internalName);
                    });
                    
                    // Filter active items (not consumables, have active: true)
                    const activeItems = items.filter(item => {
                      if (!item || typeof item !== 'object') return false;
                      return item.active === true && 
                             !item.relic && 
                             !item.consumable && 
                             !item.starter &&
                             (item.tier || item.totalCost || (item.stats && Object.keys(item.stats).length > 0)) &&
                             (!item.stepCost || item.tier) &&
                             (item.name || item.internalName);
                    });
                    
                    // Filter tier 3 items (not active, not starter, not consumable)
                    const tier3Items = items.filter(item => {
                      if (!item || typeof item !== 'object') return false;
                      return item.tier === 3 && 
                             !item.relic && 
                             !item.consumable && 
                             !item.starter &&
                             item.active !== true &&
                             (item.name || item.internalName);
                    });
                    
                    if (starterItems.length > 0) {
                      const newItems = [];
                      
                      // 1. Add 1 starter item (mandatory)
                      const randomStarterIndex = Math.floor(Math.random() * starterItems.length);
                      newItems.push(starterItems[randomStarterIndex]);
                      
                      // 2. Add up to 3 active items
                      const numActiveItems = Math.min(3, activeItems.length);
                      const selectedActiveItems = [];
                      for (let i = 0; i < numActiveItems; i++) {
                        const randomActiveIndex = Math.floor(Math.random() * activeItems.length);
                        selectedActiveItems.push(activeItems[randomActiveIndex]);
                      }
                      newItems.push(...selectedActiveItems);
                      
                      // 3. Fill remaining slots with tier 3 items (up to 7 total)
                      const remainingSlots = 7 - newItems.length;
                      for (let i = 0; i < remainingSlots && tier3Items.length > 0; i++) {
                        const randomTier3Index = Math.floor(Math.random() * tier3Items.length);
                        newItems.push(tier3Items[randomTier3Index]);
                      }
                      
                      // Ensure we have exactly 7 items (pad with null if needed)
                      while (newItems.length < 7) {
                        newItems.push(null);
                      }
                      
                      setRandomItems(newItems.slice(0, 7));
                      if (itemRerolls > 0) {
                        setItemRerolls(itemRerolls - 1);
                      }
                    }
                  }
                  
                  // Randomize Relic (always available, no reroll limit)
                  const relics = items.filter(item => {
                    if (!item || typeof item !== 'object') return false;
                    return item.relic === true;
                  });
                  
                  if (relics.length > 0) {
                    const randomRelicIndex = Math.floor(Math.random() * relics.length);
                    setRandomRelic(relics[randomRelicIndex]);
                  }
                }}
              >
                <Text style={randomizerStyles.randomizeAllButtonText}>
                   Randomize All
                </Text>
              </TouchableOpacity>
            </View>

            {/* God Randomizer */}
            <View style={randomizerStyles.randomizerSection}>
              <Text style={randomizerStyles.randomizerTitle}>Random God</Text>
              <View style={randomizerStyles.randomizerGodContainer}>
                {randomGod ? (
                  <>
                    <TouchableOpacity
                      style={randomizerStyles.randomizerGodCard}
                      onPress={() => {
                        if (randomGod) {
                          if (onNavigateToGod) {
                            onNavigateToGod(randomGod);
                          } else if (onGodIconPress) {
                            onGodIconPress(randomGod);
                          }
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={getLocalGodAsset(randomGod.icon || randomGod.GodIcon || (randomGod.abilities && randomGod.abilities.A01 && randomGod.abilities.A01.icon))}
                        style={randomizerStyles.randomizerGodIcon}
                        resizeMode="cover"
                      />
                      <Text style={randomizerStyles.randomizerGodName}>
                        {randomGod.name || randomGod.GodName || randomGod.title || randomGod.displayName || 'Unknown'}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Aspect Slot */}
                    {randomGod.aspect && (
                      <View
                        style={[
                          randomizerStyles.randomizerAspectSlot,
                          aspectActive && randomizerStyles.randomizerAspectSlotActive
                        ]}
                      >
                        {randomGod.aspect.icon ? (
                          <Image
                            source={getLocalGodAsset(randomGod.aspect.icon)}
                            style={randomizerStyles.randomizerAspectIcon}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={randomizerStyles.randomizerAspectIconPlaceholder}>
                            <Text style={randomizerStyles.randomizerAspectIconPlaceholderText}>A</Text>
                          </View>
                        )}
                        <Text style={randomizerStyles.randomizerAspectName} numberOfLines={2}>
                          {randomGod.aspect.name || 'Aspect'}
                        </Text>
                        {aspectActive && (
                          <View style={randomizerStyles.randomizerAspectActiveIndicator}>
                            <Text style={randomizerStyles.randomizerAspectActiveText}>✓</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={randomizerStyles.randomizerGodPlaceholder}>
                    <Text style={randomizerStyles.randomizerPlaceholderText}>No God Selected</Text>
                  </View>
                )}
              </View>
              <View style={randomizerStyles.randomizerButtonRow}>
                <TouchableOpacity
                  style={[randomizerStyles.randomizerButton, godRerolls === 0 && randomizerStyles.randomizerButtonDisabled]}
                  onPress={() => {
                    if (godRerolls > 0 && gods.length > 0) {
                      const randomIndex = Math.floor(Math.random() * gods.length);
                      const newGod = gods[randomIndex];
                      setRandomGod(newGod);
                      // Randomly activate aspect if god has one
                      if (newGod && newGod.aspect) {
                        setAspectActive(Math.random() > 0.5); // 50% chance to be active
                      } else {
                        setAspectActive(false);
                      }
                      setGodRerolls(godRerolls - 1);
                    }
                  }}
                  disabled={godRerolls === 0}
                >
                  <Text style={randomizerStyles.randomizerButtonText}>
                    Randomize God {godRerolls > 0 ? `(${godRerolls} left)` : '(No rerolls)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[randomizerStyles.randomizerResetButton]}
                  onPress={() => {
                    setGodRerolls(3);
                    setRandomGod(null);
                    setAspectActive(false);
                  }}
                >
                  <Text style={randomizerStyles.randomizerResetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Items Randomizer */}
            <View style={randomizerStyles.randomizerSection}>
              <Text style={randomizerStyles.randomizerTitle}>Random Build</Text>
              
              {/* Starter Item */}
              <View style={randomizerStyles.randomizerStarterSection}>
                <Text style={randomizerStyles.randomizerSubtitle}>Starter:</Text>
                <View style={randomizerStyles.randomizerStarterContainer}>
                  {randomItems[0] ? (
                    <View style={randomizerStyles.randomizerItemSlotWrapper}>
                      <TouchableOpacity
                        style={randomizerStyles.randomizerItemSlot}
                        onPress={() => {
                          if (randomItems[0]) {
                            setSelectedRandomItem({ item: randomItems[0], itemName: randomItems[0].name || randomItems[0].internalName || 'Unknown' });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                      {(() => {
                        const item = randomItems[0];
                        const localIcon = getLocalItemIcon(item.icon || item.internalName);
                        if (!localIcon) {
                          return (
                            <View style={randomizerStyles.randomizerItemIconPlaceholder}>
                              <Text style={randomizerStyles.randomizerItemIconPlaceholderText}>?</Text>
                            </View>
                          );
                        }
                        const imageSource = localIcon.primary || localIcon;
                        const fallbackSource = localIcon.fallback;
                        const iconKey = `random-starter-${item.internalName || item.name}`;
                        const useFallback = failedItemIcons[iconKey];
                        
                        if (fallbackSource && !useFallback) {
                          return (
                            <Image
                              source={imageSource}
                              style={randomizerStyles.randomizerItemIcon}
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
                              style={randomizerStyles.randomizerItemIcon}
                              resizeMode="cover"
                            />
                          );
                        }
                        return (
                          <Image
                            source={imageSource}
                            style={randomizerStyles.randomizerItemIcon}
                            resizeMode="cover"
                          />
                        );
                      })()}
                      <Text style={randomizerStyles.randomizerItemName} numberOfLines={2}>
                        {randomItems[0].name || randomItems[0].internalName}
                      </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={randomizerStyles.randomizerItemRandomizeButton}
                        onPress={() => {
                          // Randomize just the starter item
                          const starterItems = items.filter(item => {
                            if (!item || typeof item !== 'object') return false;
                            return item.starter === true && (item.name || item.internalName);
                          });
                          
                          if (starterItems.length > 0) {
                            const randomIndex = Math.floor(Math.random() * starterItems.length);
                            const newItems = [...randomItems];
                            newItems[0] = starterItems[randomIndex];
                            setRandomItems(newItems);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={randomizerStyles.randomizerItemRandomizeButtonText}>RR</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={randomizerStyles.randomizerItemPlaceholder}>
                      <Text style={randomizerStyles.randomizerItemPlaceholderText}>+</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Regular Items (6 items) */}
              <View style={randomizerStyles.randomizerItemsSection}>
                <Text style={randomizerStyles.randomizerSubtitle}>Items:</Text>
                <View style={randomizerStyles.randomizerItemsContainer}>
                  {randomItems.slice(1, 7).map((item, index) => (
                    <View key={index + 1} style={randomizerStyles.randomizerItemSlotWrapper}>
                      <TouchableOpacity
                        style={randomizerStyles.randomizerItemSlot}
                        onPress={() => {
                          if (item) {
                            setSelectedRandomItem({ item, itemName: item.name || item.internalName || 'Unknown' });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                      {item ? (
                        <>
                          {(() => {
                            const localIcon = getLocalItemIcon(item.icon || item.internalName);
                            if (!localIcon) {
                              return (
                                <View style={randomizerStyles.randomizerItemIconPlaceholder}>
                                  <Text style={randomizerStyles.randomizerItemIconPlaceholderText}>?</Text>
                                </View>
                              );
                            }
                            const imageSource = localIcon.primary || localIcon;
                            const fallbackSource = localIcon.fallback;
                            const iconKey = `random-item-${item.internalName || item.name}-${index + 1}`;
                            const useFallback = failedItemIcons[iconKey];
                            
                            if (fallbackSource && !useFallback) {
                              return (
                                <Image
                                  source={imageSource}
                                  style={randomizerStyles.randomizerItemIcon}
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
                                  style={randomizerStyles.randomizerItemIcon}
                                  resizeMode="cover"
                                />
                              );
                            }
                            return (
                              <Image
                                source={imageSource}
                                style={randomizerStyles.randomizerItemIcon}
                                resizeMode="cover"
                              />
                            );
                          })()}
                          <Text style={randomizerStyles.randomizerItemName} numberOfLines={2}>
                            {item.name || item.internalName}
                          </Text>
                        </>
                      ) : (
                        <View style={randomizerStyles.randomizerItemPlaceholder}>
                          <Text style={randomizerStyles.randomizerItemPlaceholderText}>+</Text>
                          <Text style={randomizerStyles.randomizerItemNumber}>{index + 2}</Text>
                        </View>
                      )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={randomizerStyles.randomizerItemRandomizeButton}
                        onPress={() => {
                          // Randomize just this single item
                          // Determine which pool to use based on slot position
                          // Slots 1-3 (index 0-2) can be active items, slots 4-6 (index 3-5) are tier 3
                          const slotPosition = index + 1;
                          let itemPool = [];
                          
                          if (slotPosition <= 3) {
                            // First 3 slots can be active items
                            const activeItems = items.filter(item => {
                              if (!item || typeof item !== 'object') return false;
                              return item.active === true && 
                                     !item.relic && 
                                     !item.consumable && 
                                     !item.starter &&
                                     (item.tier || item.totalCost || (item.stats && Object.keys(item.stats).length > 0)) &&
                                     (!item.stepCost || item.tier) &&
                                     (item.name || item.internalName);
                            });
                            
                            // Also include tier 3 items as fallback
                            const tier3Items = items.filter(item => {
                              if (!item || typeof item !== 'object') return false;
                              return item.tier === 3 && 
                                     !item.relic && 
                                     !item.consumable && 
                                     !item.starter &&
                                     item.active !== true &&
                                     (item.name || item.internalName);
                            });
                            
                            itemPool = [...activeItems, ...tier3Items];
                          } else {
                            // Slots 4-6 are tier 3 items only
                            itemPool = items.filter(item => {
                              if (!item || typeof item !== 'object') return false;
                              return item.tier === 3 && 
                                     !item.relic && 
                                     !item.consumable && 
                                     !item.starter &&
                                     item.active !== true &&
                                     (item.name || item.internalName);
                            });
                          }
                          
                          if (itemPool.length > 0) {
                            const randomIndex = Math.floor(Math.random() * itemPool.length);
                            const newItems = [...randomItems];
                            newItems[index + 1] = itemPool[randomIndex];
                            setRandomItems(newItems);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={randomizerStyles.randomizerItemRandomizeButtonText}>RR</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
              <View style={randomizerStyles.randomizerButtonRow}>
                <TouchableOpacity
                  style={[randomizerStyles.randomizerButton, itemRerolls === 0 && randomizerStyles.randomizerButtonDisabled]}
                  onPress={() => {
                    if (itemRerolls > 0 && items.length > 0) {
                      // Filter starter items
                      const starterItems = items.filter(item => {
                        if (!item || typeof item !== 'object') return false;
                        return item.starter === true && (item.name || item.internalName);
                      });
                      
                      // Filter active items (not consumables, have active: true)
                      const activeItems = items.filter(item => {
                        if (!item || typeof item !== 'object') return false;
                        return item.active === true && 
                               !item.relic && 
                               !item.consumable && 
                               !item.starter &&
                               (item.tier || item.totalCost || (item.stats && Object.keys(item.stats).length > 0)) &&
                               (!item.stepCost || item.tier) &&
                               (item.name || item.internalName);
                      });
                      
                      // Filter tier 3 items (not active, not starter, not consumable)
                      const tier3Items = items.filter(item => {
                        if (!item || typeof item !== 'object') return false;
                        return item.tier === 3 && 
                               !item.relic && 
                               !item.consumable && 
                               !item.starter &&
                               item.active !== true &&
                               (item.name || item.internalName);
                      });
                      
                      if (starterItems.length > 0) {
                        const newItems = [];
                        
                        // 1. Add 1 starter item (mandatory)
                        const randomStarterIndex = Math.floor(Math.random() * starterItems.length);
                        newItems.push(starterItems[randomStarterIndex]);
                        
                        // 2. Add up to 3 active items
                        const numActiveItems = Math.min(3, activeItems.length);
                        const selectedActiveItems = [];
                        for (let i = 0; i < numActiveItems; i++) {
                          const randomActiveIndex = Math.floor(Math.random() * activeItems.length);
                          selectedActiveItems.push(activeItems[randomActiveIndex]);
                        }
                        newItems.push(...selectedActiveItems);
                        
                        // 3. Fill remaining slots with tier 3 items (up to 7 total)
                        const remainingSlots = 7 - newItems.length;
                        for (let i = 0; i < remainingSlots && tier3Items.length > 0; i++) {
                          const randomTier3Index = Math.floor(Math.random() * tier3Items.length);
                          newItems.push(tier3Items[randomTier3Index]);
                        }
                        
                        // Ensure we have exactly 7 items (pad with null if needed)
                        while (newItems.length < 7) {
                          newItems.push(null);
                        }
                        
                        setRandomItems(newItems.slice(0, 7));
                        setItemRerolls(itemRerolls - 1);
                      }
                    }
                  }}
                  disabled={itemRerolls === 0}
                >
                  <Text style={randomizerStyles.randomizerButtonText}>
                    Randomize Items {itemRerolls > 0 ? `(${itemRerolls} left)` : '(No rerolls)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[randomizerStyles.randomizerResetButton]}
                  onPress={() => {
                    setItemRerolls(3);
                    setRandomItems(Array(7).fill(null));
                  }}
                >
                  <Text style={randomizerStyles.randomizerResetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Relic Randomizer */}
            <View style={randomizerStyles.randomizerSection}>
              <Text style={randomizerStyles.randomizerTitle}>Random Relic</Text>
              <View style={randomizerStyles.randomizerRelicContainer}>
                {randomRelic ? (
                  <TouchableOpacity
                    style={randomizerStyles.randomizerRelicSlot}
                    onPress={() => {
                      if (randomRelic) {
                        setSelectedRandomItem({ item: randomRelic, itemName: randomRelic.name || randomRelic.internalName || 'Unknown' });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {(() => {
                      const localIcon = getLocalItemIcon(randomRelic.icon || randomRelic.internalName);
                      if (!localIcon) {
                        return (
                          <View style={randomizerStyles.randomizerItemIconPlaceholder}>
                            <Text style={randomizerStyles.randomizerItemIconPlaceholderText}>?</Text>
                          </View>
                        );
                      }
                      const imageSource = localIcon.primary || localIcon;
                      const fallbackSource = localIcon.fallback;
                      const iconKey = `random-relic-${randomRelic.internalName || randomRelic.name}`;
                      const useFallback = failedItemIcons[iconKey];
                      
                      if (fallbackSource && !useFallback) {
                        return (
                          <Image
                            source={imageSource}
                            style={randomizerStyles.randomizerItemIcon}
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
                            style={randomizerStyles.randomizerItemIcon}
                            resizeMode="cover"
                          />
                        );
                      }
                      return (
                        <Image
                          source={imageSource}
                          style={randomizerStyles.randomizerItemIcon}
                          resizeMode="cover"
                        />
                      );
                    })()}
                    <Text style={randomizerStyles.randomizerItemName} numberOfLines={2}>
                      {randomRelic.name || randomRelic.internalName}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={randomizerStyles.randomizerRelicPlaceholder}>
                    <Text style={randomizerStyles.randomizerPlaceholderText}>No Relic Selected</Text>
                  </View>
                )}
              </View>
              <View style={randomizerStyles.randomizerButtonRow}>
                <TouchableOpacity
                  style={randomizerStyles.randomizerButton}
                  onPress={() => {
                    // Filter relics
                    const relics = items.filter(item => {
                      if (!item || typeof item !== 'object') return false;
                      return item.relic === true;
                    });
                    
                    if (relics.length > 0) {
                      const randomIndex = Math.floor(Math.random() * relics.length);
                      setRandomRelic(relics[randomIndex]);
                    }
                  }}
                >
                  <Text style={randomizerStyles.randomizerButtonText}>Randomize Relic</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[randomizerStyles.randomizerResetButton]}
                  onPress={() => {
                    setRandomRelic(null);
                  }}
                >
                  <Text style={randomizerStyles.randomizerResetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          placeholder="Search gods (Zeus...)"
          placeholderTextColor="#cbd5e1"
          value={query}
          onChangeText={setQuery}
        />
       
        {/* Build category filter */}
        <View style={styles.buildCategoryFilters}>
            <TouchableOpacity
              style={[
                styles.buildCategoryButton,
                buildCategory === 'featured' && styles.buildCategoryButtonActive,
              ]}
              onPress={() => setBuildCategory('featured')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buildCategoryText,
                  buildCategory === 'featured' && styles.buildCategoryTextActive,
                ]}
                numberOfLines={1}
              >
                Featured
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buildCategoryButton,
                buildCategory === 'contributors' && styles.buildCategoryButtonActive,
              ]}
              onPress={() => setBuildCategory('contributors')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buildCategoryText,
                  buildCategory === 'contributors' && styles.buildCategoryTextActive,
                ]}
                numberOfLines={1}
              >
                Contributors
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buildCategoryButton,
                buildCategory === 'community' && styles.buildCategoryButtonActive,
              ]}
              onPress={() => setBuildCategory('community')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buildCategoryText,
                  buildCategory === 'community' && styles.buildCategoryTextActive,
                ]}
                numberOfLines={1}
              >
                Community
              </Text>
            </TouchableOpacity>
          </View>
        {/* Filter buttons row */}
        <View style={styles.filterButtonsRow}>
          {/* Role filter dropdown */}
          <View style={styles.filterButtonContainer}>
            <TouchableOpacity
              style={[styles.filterButton, selectedRole && styles.filterButtonActive]}
            onPress={() => {
                setRoleDropdownVisible(!roleDropdownVisible);
                setAuthorDropdownVisible(false);
                setGodDropdownVisible(false);
            }}
            activeOpacity={0.7}
          >
              <Text style={styles.filterButtonText}>
                {selectedRole ? selectedRole : 'Role'}
              </Text>
              <Text style={styles.filterButtonIcon}>
                {roleDropdownVisible ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            {roleDropdownVisible && (
              <View style={styles.filterDropdown}>
                <ScrollView style={styles.filterDropdownScroll} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={[styles.filterOption, !selectedRole && styles.filterOptionActive]}
                    onPress={() => {
                      setSelectedRole(null);
                      setRoleDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>All Roles</Text>
                  </TouchableOpacity>
                  {['ADC', 'Solo', 'Support', 'Mid', 'Jungle'].map((role) => {
                    const roleIcon = getRoleIcon(role);
                    return (
                      <TouchableOpacity
                        key={role}
                        style={[styles.filterOption, selectedRole === role && styles.filterOptionActive]}
                        onPress={() => {
                          setSelectedRole(role);
                          setRoleDropdownVisible(false);
                        }}
                      >
                        {roleIcon && (
                          <Image 
                            source={roleIcon} 
                            style={styles.filterOptionIcon}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            accessibilityLabel={`${role} role icon`}
                          />
                        )}
                        <Text style={[styles.filterOptionText, { marginLeft: roleIcon ? 10 : 0 }]}>{role}</Text>
          </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Author filter dropdown */}
          <View style={styles.filterButtonContainer}>
          <TouchableOpacity
              style={[styles.filterButton, selectedAuthor && styles.filterButtonActive]}
            onPress={() => {
                setAuthorDropdownVisible(!authorDropdownVisible);
                setRoleDropdownVisible(false);
                setGodDropdownVisible(false);
            }}
            activeOpacity={0.7}
          >
              <Text style={styles.filterButtonText}>
                {selectedAuthor ? selectedAuthor : 'Author'}
              </Text>
              <Text style={styles.filterButtonIcon}>
                {authorDropdownVisible ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            {authorDropdownVisible && (
              <View style={styles.filterDropdown}>
                <ScrollView style={styles.filterDropdownScroll} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={[styles.filterOption, !selectedAuthor && styles.filterOptionActive]}
                    onPress={() => {
                      setSelectedAuthor(null);
                      setAuthorDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>All Authors</Text>
                  </TouchableOpacity>
                  {availableAuthors.map((author) => (
                    <TouchableOpacity
                      key={author}
                      style={[styles.filterOption, selectedAuthor === author && styles.filterOptionActive]}
                      onPress={() => {
                        setSelectedAuthor(author);
                        setAuthorDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.filterOptionText}>{author}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            </View>

          {/* God filter dropdown */}
          <View style={styles.filterButtonContainer}>
          <TouchableOpacity
              style={[styles.filterButton, selectedGod && styles.filterButtonActive]}
            onPress={() => {
                setGodDropdownVisible(!godDropdownVisible);
                setRoleDropdownVisible(false);
                setAuthorDropdownVisible(false);
            }}
            activeOpacity={0.7}
          >
              <Text style={styles.filterButtonText}>
                {selectedGod ? selectedGod : 'God'}
              </Text>
              <Text style={styles.filterButtonIcon}>
                {godDropdownVisible ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            {godDropdownVisible && (
              <View style={styles.filterDropdown}>
                <ScrollView style={styles.filterDropdownScroll} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={[styles.filterOption, !selectedGod && styles.filterOptionActive]}
                    onPress={() => {
                      setSelectedGod(null);
                      setGodDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>All Gods</Text>
                  </TouchableOpacity>
                  {availableGods.map((godName) => (
                    <TouchableOpacity
                      key={godName}
                      style={[styles.filterOption, selectedGod === godName && styles.filterOptionActive]}
                      onPress={() => {
                        setSelectedGod(godName);
                        setGodDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.filterOptionText}>{godName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            </View>

          {/* Gamemode filter dropdown */}
          <View style={styles.filterButtonContainer}>
          <TouchableOpacity
              style={[styles.filterButton, selectedGamemodes && selectedGamemodes.length > 0 && styles.filterButtonActive]}
            onPress={() => {
                setGamemodeDropdownVisible(!gamemodeDropdownVisible);
                setRoleDropdownVisible(false);
                setAuthorDropdownVisible(false);
                setGodDropdownVisible(false);
            }}
            activeOpacity={0.7}
          >
              <Text style={styles.filterButtonText}>
                {selectedGamemodes && selectedGamemodes.length > 0 
                  ? selectedGamemodes.length === 1 
                    ? selectedGamemodes[0] 
                    : `${selectedGamemodes.length} Modes`
                  : 'Modes'}
              </Text>
              <Text style={styles.filterButtonIcon}>
                {gamemodeDropdownVisible ? '▼' : '▶'}
              </Text>
          </TouchableOpacity>
            {gamemodeDropdownVisible && (
              <View style={styles.filterDropdown}>
                <ScrollView style={styles.filterDropdownScroll} nestedScrollEnabled={true}>
          <TouchableOpacity
                    style={[styles.filterOption, (!selectedGamemodes || selectedGamemodes.length === 0) && styles.filterOptionActive]}
            onPress={() => {
                      setSelectedGamemodes([]);
                      setGamemodeDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>All Modes</Text>
                  </TouchableOpacity>
                  {['Joust', 'Duel', 'Arena', 'Conquest', 'Assault'].map((mode) => {
                    const isSelected = selectedGamemodes && selectedGamemodes.includes(mode);
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.filterOption, isSelected && styles.filterOptionActive]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedGamemodes(selectedGamemodes.filter(m => m !== mode));
                          } else {
                            setSelectedGamemodes([...selectedGamemodes, mode]);
                          }
                        }}
                      >
                        <Text style={styles.filterOptionText}>
                          {isSelected ? '✓ ' : ''}{mode}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            </View>
        </View>
        
        {/* Post Your Build Button and Refresh - Only show on Certified tab */}
        {buildCategory === 'contributors' && (
          <View style={styles.postYourBuildContainer}>
            <View style={styles.communityButtonsRow}>
              <TouchableOpacity
                style={[styles.postYourBuildButton, styles.communityButton]}
                onPress={() => {
                  if (onNavigateToCustomBuild) {
                    onNavigateToCustomBuild();
                  }
            }}
            activeOpacity={0.7}
          >
                <Text style={styles.postYourBuildButtonText}>Post Your Build</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.refreshCommunityButton, styles.communityButton]}
                onPress={async () => {
                  // Refresh contributor builds and refetch display names so they stay current
                  const supabaseClient = getSupabase();
                  if (supabaseClient && supabaseClient.from) {
                    setLoadingContributorsBuilds(true);
                    try {
                      const { data, error } = await supabaseClient
                        .from('contributor_builds')
                        .select('*')
                        .order('created_at', { ascending: false });
                      
                      if (error) {
                        console.error('❌ Error refreshing contributor builds:', error);
                        Alert.alert('Error', 'Failed to refresh contributor builds.');
                      } else {
                        setContributorsBuildsFromDB(data || []);
                        const usernames = new Set((data || []).map(b => b.username).filter(Boolean));
                        setContributorsUsers(usernames);
                        // Refetch display_name and profile_god_icon so names/icons are up to date
                        if (usernames.size > 0) {
                          const { data: userData, error: userError } = await supabaseClient
                            .from('user_data')
                            .select('username, display_name, profile_god_icon')
                            .in('username', Array.from(usernames));
                          if (!userError && userData) {
                            const map = {};
                            (userData || []).forEach((row) => {
                              map[row.username] = {
                                display_name: row.display_name || row.username,
                                profile_god_icon: row.profile_god_icon || null,
                              };
                            });
                            setContributorsUserData(map);
                          }
                        }
                        Alert.alert('Success', `Loaded ${(data || []).length} contributor builds!`);
                      }
                    } catch (err) {
                      console.error('❌ Exception refreshing contributor builds:', err);
                      Alert.alert('Error', 'Failed to refresh contributor builds.');
                    } finally {
                      setLoadingContributorsBuilds(false);
                    }
                  }
                }}
                activeOpacity={0.7}
                disabled={loadingContributorsBuilds}
              >
                <Text style={styles.refreshCommunityButtonText}>
                  {loadingContributorsBuilds ? 'Loading...' : '🔄 Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Certification Request Button - Only show on Contributors tab */}
        {buildCategory === 'contributors' && (
          <View style={styles.certificationRequestContainer}>
            {certificationRequestStatus === 'pending' ? (
              <View style={styles.certificationStatusContainer}>
                <Text style={styles.certificationStatusText}>
                  ⏳ Your certification request is pending review
                </Text>
                <Text style={styles.certificationStatusSubtext}>
                  You'll be notified once it's reviewed. Please wait for a response before submitting another request.
                </Text>
                <TouchableOpacity
                  style={[styles.certificationRequestButton, { marginTop: 10 }]}
                  onPress={async () => {
                    if (!currentUser) {
                      setShowLoginModal(true);
                      return;
                    }
                    // Manually refresh certification status
                    try {
                      const supabaseClient = getSupabase();
                      if (supabaseClient && supabaseClient.from) {
                        // Check for approved request
                        const { data: approvedData, error: approvedError } = await supabaseClient
                          .from('certification_requests')
                          .select('status')
                          .eq('username', currentUser)
                          .eq('status', 'approved')
                          .limit(1);
                        
                        console.log('🔄 Manual refresh - approvedData:', approvedData, 'error:', approvedError);
                        
                        if (!approvedError && approvedData && (
                          (Array.isArray(approvedData) && approvedData.length > 0) || 
                          (approvedData && approvedData.status === 'approved')
                        )) {
                          setCertificationRequestStatus('approved');
                          await storage.setItem(`certificationStatus_${currentUser}`, 'approved');
                          Alert.alert('Status Updated', 'Your certification has been approved!');
                        } else {
                          // Check most recent
                          const { data, error } = await supabaseClient
                            .from('certification_requests')
                            .select('status')
                            .eq('username', currentUser)
                            .order('requested_at', { ascending: false })
                            .limit(1);
                          
                          let status = null;
                          if (!error && data) {
                            if (Array.isArray(data) && data.length > 0) {
                              status = data[0].status;
                            } else if (data && data.status) {
                              status = data.status;
                            }
                          }
                          
                          if (status) {
                            setCertificationRequestStatus(status);
                            await storage.setItem(`certificationStatus_${currentUser}`, status);
                            if (status === 'approved') {
                              Alert.alert('Status Updated', 'Your certification has been approved!');
                            } else {
                              Alert.alert('Status', `Your certification status: ${status}`);
                            }
                          } else {
                            Alert.alert('No Status', 'Could not retrieve certification status. Please try again later.');
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Error refreshing certification:', err);
                      Alert.alert('Error', 'Failed to refresh certification status.');
                    }
                  }}
                >
                  <Text style={styles.certificationRequestButtonText}>Refresh Status</Text>
                </TouchableOpacity>
            </View>
            ) : certificationRequestStatus === 'approved' ? (
              <View style={styles.certificationStatusContainer}>
                <Text style={styles.certificationStatusText}>
                  ✅ Your certification request has been approved!
                </Text>
              </View>
            ) : certificationRequestStatus === 'rejected' ? (
              <TouchableOpacity
                style={styles.certificationRequestButton}
                onPress={async () => {
                  if (!currentUser) {
                    setShowLoginModal(true);
                    return;
                  }
                  
                  if (isRequestingCertification) return;
                  
                  setIsRequestingCertification(true);
                  try {
                    const supabaseClient = getSupabase();
                    if (!supabaseClient || !supabaseClient.from) {
                      Alert.alert('Error', 'Unable to send certification request. Please try again later.');
                      setIsRequestingCertification(false);
                      return;
                    }
                    
                    // Send notification to admin (you)
                    const { error } = await supabaseClient
                      .from('certification_requests')
                      .insert({
                        username: currentUser,
                        requested_at: new Date().toISOString(),
                        status: 'pending'
                      });
                    
                    if (error) {
                      console.error('Error requesting certification:', error);
                      Alert.alert('Error', 'Failed to send certification request. Please try again.');
                    } else {
                      setCertificationRequestStatus('pending');
                      // Save to local storage for persistence
                      await storage.setItem(`certificationStatus_${currentUser}`, 'pending');
                      Alert.alert('Request Sent', 'Your new certification request has been sent! We will review it and get back to you.');
                    }
                  } catch (error) {
                    console.error('Exception requesting certification:', error);
                    Alert.alert('Error', 'An error occurred. Please try again.');
                  } finally {
                    setIsRequestingCertification(false);
                  }
                }}
                activeOpacity={0.7}
                disabled={isRequestingCertification}
              >
                <Text style={styles.certificationRequestButtonText}>
                  {isRequestingCertification ? 'Requesting...' : 'Request Certification Again'}
                </Text>
          </TouchableOpacity>
            ) : (
          <TouchableOpacity
                style={styles.certificationRequestButton}
                onPress={async () => {
                  if (!currentUser) {
                    setShowLoginModal(true);
                    return;
                  }
                  
                  if (isRequestingCertification) return;
                  
                  // Check if user already has a pending request
                  try {
                    const supabaseClient = getSupabase();
                    if (!supabaseClient || !supabaseClient.from) {
                      Alert.alert('Error', 'Unable to send certification request. Please try again later.');
                      return;
                    }
                    
                    const { data: existingRequest, error: checkError } = await supabaseClient
                      .from('certification_requests')
                      .select('status')
                      .eq('username', currentUser)
                      .order('requested_at', { ascending: false })
                      .limit(1);
                    
                    // Handle both array and object results
                    let existingStatus = null;
                    if (!checkError && existingRequest) {
                      if (Array.isArray(existingRequest) && existingRequest.length > 0) {
                        existingStatus = existingRequest[0].status;
                      } else if (existingRequest && existingRequest.status) {
                        existingStatus = existingRequest.status;
                      }
                    }
                    
                    if (existingStatus) {
                      if (existingStatus === 'pending') {
                        Alert.alert(
                          'Request Already Pending',
                          'You already have a certification request pending review. Please wait for a response before submitting another request.'
                        );
                        setCertificationRequestStatus('pending');
                        // Save to local storage for persistence
                        await storage.setItem(`certificationStatus_${currentUser}`, 'pending');
                        return;
                      } else if (existingStatus === 'approved') {
                        Alert.alert('Already a Contributor', 'Your contributors request has already been approved!');
                        setCertificationRequestStatus('approved');
                        // Save to local storage for persistence
                        await storage.setItem(`certificationStatus_${currentUser}`, 'approved');
                        return;
                      }
                    }
                    
                    setIsRequestingCertification(true);
                    
                    // Send notification to admin (you)
                    const { error } = await supabaseClient
                      .from('certification_requests')
                      .insert({
                        username: currentUser,
                        requested_at: new Date().toISOString(),
                        status: 'pending'
                      });
                    
                    if (error) {
                      console.error('Error requesting certification:', error);
                      Alert.alert('Error', 'Failed to send certification request. Please try again.');
                    } else {
                      setCertificationRequestStatus('pending');
                      // Save to local storage for persistence
                      await storage.setItem(`certificationStatus_${currentUser}`, 'pending');
                      Alert.alert('Request Sent', 'Your certification request has been sent! We will review it and get back to you.');
                    }
                  } catch (error) {
                    console.error('Exception requesting certification:', error);
                    Alert.alert('Error', 'An error occurred. Please try again.');
                  } finally {
                    setIsRequestingCertification(false);
                  }
            }}
            activeOpacity={0.7}
                disabled={isRequestingCertification}
              >
                <Text style={styles.certificationRequestButtonText}>
                  {isRequestingCertification ? 'Requesting...' : 'Request Certification'}
                </Text>
              </TouchableOpacity>
            )}
            </View>
        )}
        
        {/* Post Your Build Button and Refresh - Only show on Community tab */}
        {buildCategory === 'community' && (
          <View style={styles.certificationRequestContainer}>
            <View style={styles.communityButtonsRow}>
              <TouchableOpacity
                style={[styles.postYourBuildButton, styles.communityButton]}
                onPress={() => {
                  if (onNavigateToCustomBuild) {
                    onNavigateToCustomBuild();
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.postYourBuildButtonText}>Post Your Build</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.refreshCommunityButton, styles.communityButton]}
                onPress={async () => {
                  setLoadingCommunityBuilds(true);
                  try {
                    const supabaseClient = getSupabase();
                    if (!supabaseClient || !supabaseClient.from) {
                      Alert.alert('Error', 'Unable to refresh builds. Please try again later.');
                      setLoadingCommunityBuilds(false);
                      return;
                    }
                    
                    const { data, error } = await supabaseClient
                      .from('community_builds')
                      .select('*')
                      .order('created_at', { ascending: false });
                    
                    if (error) {
                      console.error('Error refreshing community builds:', error);
                      Alert.alert('Error', 'Failed to refresh builds. Please try again.');
                    } else {
                      setCommunityBuildsFromDB(data || []);
                      Alert.alert('Success', `Loaded ${data?.length || 0} community builds!`);
                    }
                  } catch (err) {
                    console.error('Exception refreshing community builds:', err);
                    Alert.alert('Error', 'An error occurred while refreshing builds.');
                  } finally {
                    setLoadingCommunityBuilds(false);
                  }
                }}
                activeOpacity={0.7}
                disabled={loadingCommunityBuilds}
              >
                <Text style={styles.refreshCommunityButtonText}>
                  {loadingCommunityBuilds ? 'Loading...' : '🔄 Refresh'}
                </Text>
          </TouchableOpacity>
        </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.main}>
          {/* Meet my Contributors Section - Only show on Contributors tab */}
          {buildCategory === 'contributors' && contributorsUsers.size > 0 && (
            <View style={styles.meetContributorsSection}>
              <Text style={styles.meetContributorsTitle}>Meet my Contributors</Text>
              <View style={styles.contributorsGrid}>
                {Array.from(contributorsUsers).map((username, index) => {
                  const userData = contributorsUserData[username];
                  const displayName = userData?.display_name || username || 'Unknown';
                  const profileGodIcon = userData?.profile_god_icon;
                  const iconUrl = profileGodIcon ? getGodIconUrl(profileGodIcon) : null;
                  return (
                    <View key={username || index} style={styles.contributorCard}>
                      <View style={styles.contributorIconContainer}>
                        {iconUrl ? (
                          <Image
                            source={{ uri: iconUrl }}
                            style={styles.contributorIconImage}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.contributorIconPlaceholder}>
                            <Text style={styles.contributorIconPlaceholderText}>
                              {(username || '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contributorName} numberOfLines={1} ellipsizeMode="tail">
                        {displayName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {loading && <ActivityIndicator size="large" color="#60a5fa" />}
          {error && <Text style={styles.error}>Error: {error}</Text>}

          {!loading && debouncedQuery && filtered.length === 0 && <Text style={styles.muted}>No gods found.</Text>}
          {!loading && !debouncedQuery && pairs.length > initialDisplayLimit && (
            <Text style={styles.muted}>Showing first {initialDisplayLimit} gods. Search to see more.</Text>
          )}
          {query !== debouncedQuery && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1e90ff" />
            </View>
          )}

          {!builds ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1e90ff" />
              <Text style={styles.loadingText}>Loading builds...</Text>
            </View>
          ) : loadingCommunityBuilds && buildCategory === 'community' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1e90ff" />
              <Text style={styles.loadingText}>Loading community builds...</Text>
            </View>
          ) : filtered.length === 0 && buildCategory === 'community' ? (
            <View style={styles.emptyCommunityContainer}>
              <Text style={styles.emptyCommunityText}>No community builds yet</Text>
              <Text style={styles.emptyCommunitySubtext}>Be the first to share a build with the community!</Text>
              <TouchableOpacity
                style={styles.createFirstBuildButton}
                onPress={() => {
                  if (onNavigateToCustomBuild) {
                    onNavigateToCustomBuild();
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.createFirstBuildButtonText}>Create First Build</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <ScrollView 
            contentContainerStyle={styles.cardGrid}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((pair, mapIdx) => {
              // Find original index in pairs array
              const origIdx = pairs.findIndex(p => p === pair);
              const idx = origIdx >= 0 ? origIdx : mapIdx;
              const { god, builds: godBuilds } = pair;
              if (!god) return null;
              
              const title = (god.name || god.GodName || god.title || god.displayName) || 'Unknown';
              const role = (god.role || god.class || god.type) || '';
              
              // Get all builds for this god (default to empty array)
              let allBuilds = Array.isArray(godBuilds) ? godBuilds : [];
              
              // Store original indices before filtering/sorting
              let buildsWithIndices = allBuilds.map((build, origIdx) => ({ build, origIdx }));

              // Filter builds by selected category (Featured / Top / Community)
              buildsWithIndices = buildsWithIndices.filter(({ build }) => {
                if (!build) return false;
                // For DB builds, check their category
                if (build.fromDatabase) {
                  if (build.databaseCategory === 'community') return buildCategory === 'community';
                  if (build.databaseCategory === 'contributors') return buildCategory === 'contributors';
                  return false;
                }
                // For JSON builds, use category check
                const category = getBuildCategory(build);
                if (buildCategory === 'featured') return category === 'featured';
                if (buildCategory === 'contributors') return category === 'contributors';
                if (buildCategory === 'community') return category === 'community';
                return true;
              });

              // Skip rendering this god if no builds in this category
              if (buildsWithIndices.length === 0) {
                return null;
              }
              
              // Filter builds by selected role if a role is selected
              if (selectedRole) {
                const selectedRoleLower = selectedRole.toLowerCase();
                
                const filteredBuilds = buildsWithIndices.filter(({ build }) => {
                  if (!build) return false;
                  // Check build notes, title, role, or lane properties
                  const buildText = [
                    build.notes,
                    build.title,
                    build.role,
                    build.lane,
                    build.name
                  ].filter(Boolean).join(' ').toLowerCase();
                  
                  // Handle "ADC" and "Carry" as the same
                  if (selectedRoleLower === 'adc') {
                    return buildText.includes('adc') || 
                           buildText.includes('carry') ||
                           buildText.includes('crit-oriented adc') ||
                           buildText.includes('shred/proc-oriented') ||
                           buildText.includes('shred proc-oriented') ||
                           buildText.includes('proc-oriented');
                  }
                  
                  // Handle "Mid" and "Middle" as the same - also check for mage builds
                  // IMPORTANT: Exclude jungle builds explicitly
                  if (selectedRoleLower === 'mid') {
                    // Don't match if it's a jungle build
                    if (buildText.includes('jungle')) return false;
                    
                    return buildText.includes('mid') || 
                           buildText.includes('middle') || 
                           buildText.includes('mage') ||
                           buildText.includes('int oriented burst mage') ||
                           (buildText.includes('int') && (buildText.includes('mage') || buildText.includes('burst') || buildText.includes('oriented')));
                  }
                  
                  // Handle "Support"
                  if (selectedRoleLower === 'support') {
                    return buildText.includes('support') ||
                           buildText.includes('active item') ||
                           buildText.includes('cooldown-oriented');
                  }
                  
                  // Handle "Jungle"
                  if (selectedRoleLower === 'jungle') {
                    return buildText.includes('jungle');
                  }
                  
                  // Handle "Solo" - check for solo, bruiser solo, solo bruiser, bruiser solo-lane, bruiser warrior, etc.
                  if (selectedRoleLower === 'solo') {
                    // Check for various solo patterns: "solo", "bruiser solo", "solo bruiser", "solo-lane", "solo lane", "bruiser solo-lane", "bruiser warrior", etc.
                    const soloPatterns = [
                      /\bsolo\b/i,                    // "solo" as a word
                      /\bbruiser\s+warrior/i,        // "bruiser warrior" (fixed pattern)
                      /\bwarrior\s+bruiser/i,        // "warrior bruiser"
                      /\bbruiser\s+solo/i,            // "bruiser solo"
                      /\bsolo\s+bruiser/i,            // "solo bruiser"
                      /\bbruiser\s+solo[\s-]lane/i,   // "bruiser solo-lane" or "bruiser solo lane"
                      /\bsolo[\s-]lane/i,             // "solo-lane" or "solo lane"
                    ];
                    
                    // Check if any pattern matches
                    for (const pattern of soloPatterns) {
                      if (pattern.test(buildText)) {
                        return true;
                      }
                    }
                    
                    // Also check if build text contains both "bruiser" and "solo" or "bruiser" and "warrior" (in any order)
                    const hasBruiser = buildText.includes('bruiser');
                    const hasWarrior = buildText.includes('warrior');
                    const hasSolo = buildText.includes('solo');
                    if ((hasBruiser && hasSolo) || (hasBruiser && hasWarrior)) {
                      return true;
                    }
                    
                    return false;
                  }
                  
                  return buildText.includes(selectedRoleLower);
                });
                
                // Only show builds that match the selected role - no fallback to all builds
                if (filteredBuilds.length > 0) {
                  buildsWithIndices = filteredBuilds;
                } else {
                  // No matching builds - skip rendering this god entirely
                  buildsWithIndices = [];
                }
              }
              
              // Sort builds to prioritize pinned builds within each god (using original indices)
              buildsWithIndices.sort((a, b) => {
                const buildKeyA = `${title}-${idx}-${a.origIdx}`;
                const buildKeyB = `${title}-${idx}-${b.origIdx}`;
                const aIsPinned = pinnedBuilds.has(buildKeyA);
                const bIsPinned = pinnedBuilds.has(buildKeyB);
                
                if (aIsPinned && !bIsPinned) return -1;
                if (!aIsPinned && bIsPinned) return 1;
                return 0;
              });
              
              // Extract just the builds array after sorting
              allBuilds = buildsWithIndices.map(item => item.build);
              
              // Skip rendering if no builds match the filter
              if (selectedRole && allBuilds.length === 0) {
                return null;
              }
              
              // Get the currently selected build index for this god (default to 0)
              // Make sure the index is valid after filtering
              const maxBuildIdx = allBuilds.length > 0 ? allBuilds.length - 1 : 0;
              let currentBuildIdx = selectedBuildIndex[idx] !== undefined 
                ? Math.min(selectedBuildIndex[idx], maxBuildIdx)
                : 0;
              
              // Ensure the index is valid (in case filtering changed the array)
              if (currentBuildIdx >= allBuilds.length) {
                currentBuildIdx = 0;
              }
              
              const currentBuild = allBuilds[currentBuildIdx] || (allBuilds.length > 0 ? allBuilds[0] : null);
              
              // Check if current build has startOrder (don't show if it doesn't exist)
              const currentBuildHasStartOrder = currentBuild && 
                currentBuild.startingAbilityOrder && 
                Array.isArray(currentBuild.startingAbilityOrder) && 
                currentBuild.startingAbilityOrder.length > 0;
              
              // Debug: Log build data for community builds
              if (currentBuild && currentBuild.fromDatabase && currentBuild.databaseCategory === 'community') {
                console.log('🔍 Community Build Data:', {
                  hasStartingItems: !!currentBuild.startingItems,
                  startingItemsLength: currentBuild.startingItems?.length || 0,
                  startingItems: currentBuild.startingItems,
                  hasRoles: !!currentBuild.roles,
                  rolesLength: currentBuild.roles?.length || 0,
                  roles: currentBuild.roles,
                  hasTips: !!currentBuild.tips,
                  tips: currentBuild.tips,
                  hasAbilityLevelingOrder: !!currentBuild.abilityLevelingOrder,
                  abilityLevelingOrder: currentBuild.abilityLevelingOrder,
                  hasStartingAbilityOrder: !!currentBuild.startingAbilityOrder,
                  startingAbilityOrder: currentBuild.startingAbilityOrder,
                });
              }
              
              // Extract starter items
              // DB builds don't have starter items, so only extract for JSON builds
              const starter = currentBuild && !currentBuild.fromDatabase && currentBuild.starting 
                ? currentBuild.starting 
                : (currentBuild && !currentBuild.fromDatabase && currentBuild.buildsFromT1 ? currentBuild.buildsFromT1 : null);
              
              // Extract final items - prefer `full_build` when present
              // For DB builds, items are already in the correct format
              let finalItemsRaw = null;
              if (currentBuild && currentBuild.fromDatabase) {
                // Community build from database - items are already an array
                finalItemsRaw = currentBuild.items && Array.isArray(currentBuild.items) ? currentBuild.items : null;
              } else {
                // JSON build - use existing logic
                finalItemsRaw = currentBuild && (currentBuild.full_build || currentBuild.fullBuild || currentBuild.components || currentBuild.final || currentBuild.items)
                ? (currentBuild.full_build || currentBuild.fullBuild || currentBuild.components || currentBuild.final || currentBuild.items)
                : null;
              }

              // Normalize final items: build entries may be strings or objects
              const finalItems = finalItemsRaw
                ? (Array.isArray(finalItemsRaw)
                    ? finalItemsRaw.map((fi) => (typeof fi === 'string' ? fi : (fi.name || fi.internalName || fi.item || fi.itemName || '')))
                    : typeof finalItemsRaw === 'string'
                      ? [finalItemsRaw]
                      : [])
                : null;

              const godIcon = (god && (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon))) || null;
              
              // Determine role from current build for role-specific start order matching
              // Priority: currentBuild role info > selectedRole > god's general role
              let currentRoleLower = '';
              
              // First, try to extract role from current build
              if (currentBuild) {
                const buildText = [
                  currentBuild.notes,
                  currentBuild.title,
                  currentBuild.role,
                  currentBuild.lane,
                  currentBuild.name
                ].filter(Boolean).join(' ').toLowerCase();
                
                // Use word boundaries to avoid false matches (e.g., "support" in "supportive")
                // Check in order of specificity (more specific first)
                if (buildText.includes('support') && !buildText.includes('supportive')) {
                  currentRoleLower = 'support';
                } else if (buildText.includes('jungle')) {
                  currentRoleLower = 'jungle';
                } else if (buildText.includes('solo')) {
                  currentRoleLower = 'solo';
                } else if (buildText.includes('adc') || buildText.includes('carry')) {
                  currentRoleLower = 'adc';
                } else if (buildText.includes('mid') || buildText.includes('middle')) {
                  currentRoleLower = 'mid';
                }
              }
              
              // Fallback to selectedRole if no role found in build
              if (!currentRoleLower && selectedRole) {
                currentRoleLower = selectedRole.toLowerCase();
              }
              
              // Final fallback to god's general role
              if (!currentRoleLower && role) {
                const roleLower = role.toLowerCase();
                if (roleLower.includes('adc') || roleLower.includes('carry')) currentRoleLower = 'adc';
                else if (roleLower.includes('solo')) currentRoleLower = 'solo';
                else if (roleLower.includes('support')) currentRoleLower = 'support';
                else if (roleLower.includes('mid') || roleLower.includes('middle')) currentRoleLower = 'mid';
                else if (roleLower.includes('jungle')) currentRoleLower = 'jungle';
              }

              // Use build's own data first, then fall back to extracting from god tips
              let levelingOrder = null;
              let startOrder = null;
              
              // Check if build has its own ability leveling order
              if (currentBuild && currentBuild.abilityLevelingOrder && Array.isArray(currentBuild.abilityLevelingOrder) && currentBuild.abilityLevelingOrder.length > 0) {
                // Build has its own leveling order - use it directly
                levelingOrder = currentBuild.abilityLevelingOrder.map(key => {
                  // Convert ability key (A01, A02, etc.) to number (1, 2, etc.)
                  if (typeof key === 'string' && key.startsWith('A0')) {
                    return parseInt(key.substring(2));
                  }
                  return typeof key === 'number' ? key : parseInt(key);
                }).filter(num => !isNaN(num) && num >= 1 && num <= 4);
                
                // Debug log for community builds
                if (currentBuild.fromDatabase && currentBuild.databaseCategory === 'community') {
                  console.log('✅ Using build abilityLevelingOrder:', levelingOrder);
                }
              }
              
              // Check if build has its own starting ability order
              if (currentBuild && currentBuild.startingAbilityOrder && Array.isArray(currentBuild.startingAbilityOrder) && currentBuild.startingAbilityOrder.length > 0) {
                // Build has its own starting order - use it directly
                startOrder = currentBuild.startingAbilityOrder.map(key => {
                  // Convert ability key (A01, A02, etc.) to number (1, 2, etc.)
                  if (typeof key === 'string' && key.startsWith('A0')) {
                    return parseInt(key.substring(2));
                  }
                  return typeof key === 'number' ? key : parseInt(key);
                }).filter(num => !isNaN(num) && num >= 1 && num <= 4);
                
                // Debug log for community builds
                if (currentBuild.fromDatabase && currentBuild.databaseCategory === 'community') {
                  console.log('✅ Using build startingAbilityOrder:', startOrder);
                }
              }
              
              // Only extract from god tips if build doesn't have its own data
              if ((!levelingOrder || !startOrder) && god && god.tips && Array.isArray(god.tips)) {
                // First, try to find a role-specific tip (e.g., "Leveling order (Jungle/Solo)")
                let levelingTip = null;
                if (currentRoleLower) {
                  const roleMap = {
                    'adc': ['adc', 'carry'],
                    'solo': ['solo', 'jungle/solo', 'solo/jungle'],
                    'support': ['support'],
                    'mid': ['mid', 'middle'],
                    'jungle': ['jungle', 'jungle/solo', 'solo/jungle']
                  };
                  const roleVariants = roleMap[currentRoleLower] || [currentRoleLower];
                  
                  // Look for a tip with the role in the title
                  levelingTip = god.tips.find(tip => {
                    if (!tip.title || !tip.value) return false;
                    const titleLower = tip.title.toLowerCase();
                    // Check if title contains "leveling" and one of our role variants
                    if (titleLower.includes('leveling') || titleLower.includes('prioritize')) {
                      for (const roleVariant of roleVariants) {
                        if (titleLower.includes(roleVariant)) {
                          return true;
                        }
                      }
                    }
                    return false;
                  });
                }
                
                // If no role-specific tip found, use the general "Leveling order" tip
                if (!levelingTip) {
                  levelingTip = god.tips.find(tip => 
                    tip.title && tip.title.toLowerCase().includes('leveling') && 
                    (!tip.title.toLowerCase().includes('jungle') && !tip.title.toLowerCase().includes('solo'))
                  );
                }
                
                // Final fallback: any tip with "leveling" or "prioritize"
                if (!levelingTip) {
                  levelingTip = god.tips.find(tip => 
                    tip.title && (tip.title.toLowerCase().includes('leveling') || tip.title.toLowerCase().includes('prioritize'))
                  );
                }
                
                if (levelingTip && levelingTip.value) {
                  const tipValue = levelingTip.value;
                  
                  // Extract start order - look for "Start" patterns
                  // Handle role-specific start orders (e.g., "*Support:* Start 2,1,3" or "**Mid/ADC**: Start 1, 2, 3")
                  
                  // Try to find role-specific start order first
                  let startMatch = null;
                  
                  // First, try to find all role-specific start patterns
                  // Pattern: *Role*: Start or *Role/Role*: Start (single or double asterisk)
                  const roleStartPattern = /\*{1,2}([^*]+?)\*{1,2}\s*:\s*Start[:\s]+(?:your\s+)?([1-4](?:[\s,]+[1-4])*)/gi;
                  const allRoleMatches = [];
                  let roleMatch;
                  while ((roleMatch = roleStartPattern.exec(tipValue)) !== null) {
                    allRoleMatches.push({
                      role: roleMatch[1].toLowerCase().trim(), // lowercase for matching
                      roleOriginal: roleMatch[1].trim(), // original case for regex matching
                      numbers: roleMatch[2],
                      matchIndex: roleMatch.index // position in the string
                    });
                  }
                  
                  // If we have role-specific matches, try to find one that matches the current role
                  if (allRoleMatches.length > 0 && currentRoleLower) {
                    // Map role names for matching, including combined roles
                    const roleMap = {
                      'adc': ['adc', 'carry'],
                      'solo': ['solo', 'jungle/solo', 'solo/jungle'], // Solo can match "Jungle/Solo" in tips
                      'support': ['support'],
                      'mid': ['mid', 'middle'],
                      'jungle': ['jungle', 'jungle/solo', 'solo/jungle', '*Jungle/Solo*'] // Jungle can match "Jungle/Solo" in tips
                    };
                    
                    const roleVariants = roleMap[currentRoleLower] || [currentRoleLower];
                    
                    // Check if any role match contains our role
                    for (const roleMatch of allRoleMatches) {
                      const matchRole = roleMatch.role;
                      // Check if the matched role contains any of our role variants
                      // Handle combined roles like "jungle/solo" matching both "jungle" and "solo"
                      for (const roleVariant of roleVariants) {
                        // Direct match
                        if (matchRole === roleVariant) {
                          startMatch = [roleMatch.numbers, roleMatch.numbers];
                          break;
                        }
                        // Combined role match: "jungle/solo" contains "jungle" or "solo"
                        // Check if matchRole contains roleVariant as a whole word (with / or at boundaries)
                        if (matchRole.includes(roleVariant)) {
                          // Match if roleVariant is at start/end or surrounded by / or spaces
                          if (matchRole === roleVariant || 
                              matchRole.startsWith(roleVariant + '/') ||
                              matchRole.endsWith('/' + roleVariant) ||
                              matchRole.includes('/' + roleVariant + '/')) {
                            startMatch = [roleMatch.numbers, roleMatch.numbers];
                            break;
                          }
                        }
                      }
                      if (startMatch) break;
                    }
                    
                    // If no role match found, use the first role-specific match
                    if (!startMatch && allRoleMatches.length > 0) {
                      startMatch = [allRoleMatches[0].numbers, allRoleMatches[0].numbers];
                    }
                  }
                  
                  // If no role-specific match, try general start pattern
                  if (!startMatch) {
                    const generalStartPattern = /Start[:\s]+(?:your\s+)?([1-4](?:[\s,]+[1-4])*)/i;
                    const generalMatch = tipValue.match(generalStartPattern);
                    if (generalMatch && generalMatch[1]) {
                      startMatch = [generalMatch[0], generalMatch[1]];
                    }
                  }
                  
                  if (startMatch && startMatch[1]) {
                    const startNumbers = startMatch[1].match(/\b[1-4]\b/g);
                    if (startNumbers && startNumbers.length > 0) {
                      startOrder = startNumbers.map(num => parseInt(num));
                    }
                  }
                  
                  // Extract max order numbers from "Maxing" or "Prioritize" patterns
                  // Look for role-specific max orders first, then general
                  let maxingMatch = null;
                  
                  // If we found a role-specific start order, try to find the corresponding max order in the same role block
                  if (startMatch && currentRoleLower && allRoleMatches.length > 0) {
                    // Find the role section that matched our start order (use same logic as start order matching)
                    const matchedRoleSection = allRoleMatches.find(rm => {
                      const matchRole = rm.role;
                      const roleMap = {
                        'adc': ['adc', 'carry'],
                        'solo': ['solo', 'jungle/solo', 'solo/jungle'],
                        'support': ['support'],
                        'mid': ['mid', 'middle'],
                        'jungle': ['jungle', 'jungle/solo', 'solo/jungle']
                      };
                      const roleVariants = roleMap[currentRoleLower] || [currentRoleLower];
                      for (const roleVariant of roleVariants) {
                        // Direct match
                        if (matchRole === roleVariant) {
                          return true;
                        }
                        // Combined role match: "jungle/solo" contains "jungle" or "solo"
                        // Check if matchRole contains roleVariant as a whole word (with / or at boundaries)
                        if (matchRole.includes(roleVariant)) {
                          // Match if roleVariant is at start/end or surrounded by / or spaces
                          if (matchRole === roleVariant || 
                              matchRole.startsWith(roleVariant + '/') ||
                              matchRole.endsWith('/' + roleVariant) ||
                              matchRole.includes('/' + roleVariant + '/')) {
                            return true;
                          }
                        }
                      }
                      return false;
                    });
                    
                    if (matchedRoleSection) {
                      // Use the stored match index to find the exact role marker position
                      // The matchIndex points to the start of "*Role*:" in the tip
                      const roleBlockStart = matchedRoleSection.matchIndex;
                      
                      // Find where this role marker ends (after the colon)
                      const roleMarkerEndPattern = /\*{1,2}[^*]+\*{1,2}\s*:/g;
                      roleMarkerEndPattern.lastIndex = roleBlockStart;
                      const roleMarkerMatch = roleMarkerEndPattern.exec(tipValue);
                      
                      if (roleMarkerMatch) {
                        // Start of the role block content (after "*Role*: ")
                        const roleBlockContentStart = roleMarkerMatch.index + roleMarkerMatch[0].length;
                        
                        // Find the next role marker (if any) to determine where this block ends
                        const nextRoleMarkerPattern = /\*{1,2}[^*]+\*{1,2}\s*:/g;
                        nextRoleMarkerPattern.lastIndex = roleBlockContentStart;
                        const nextRoleMarker = nextRoleMarkerPattern.exec(tipValue);
                        
                        const roleBlockEnd = nextRoleMarker ? nextRoleMarker.index : tipValue.length;
                        const roleBlockText = tipValue.substring(roleBlockContentStart, roleBlockEnd);
                        
                        // Now find "Prioritize Maxing" in this specific role block
                        const maxingPattern = /(?:Prioritize[:\s]+)?(?:Maxing|Max)[:\s]+([1-4](?:[\s,->]+[1-4])*)/i;
                        maxingMatch = roleBlockText.match(maxingPattern);
                      }
                    }
                  }
                  
                  // If no role-specific max order found, try general pattern
                  if (!maxingMatch) {
                    const maxingPattern = /(?:Prioritize[:\s]+)?(?:Maxing|Max)[:\s]+([1-4](?:[\s,->]+[1-4])*)/i;
                    maxingMatch = tipValue.match(maxingPattern);
                  }
                  
                  if (maxingMatch && maxingMatch[1]) {
                    // Extract numbers, handling arrows and commas
                    const numbers = maxingMatch[1].match(/\b[1-4]\b/g);
                    if (numbers && numbers.length > 0) {
                      levelingOrder = numbers.map(num => parseInt(num));
                    }
                  } else {
                    // Fallback: extract all numbers if no "Maxing" pattern found
                    const numbers = tipValue.match(/\b[1-4]\b/g);
                    if (numbers && numbers.length > 0) {
                      levelingOrder = numbers.map(num => parseInt(num));
                    }
                  }
                }
              }

              // Map leveling order numbers to ability keys (1 = A01, 2 = A02, 3 = A03, 4 = A04)
              const levelingAbilities = levelingOrder && god && god.abilities
                ? levelingOrder.map(num => {
                    const abilityKey = `A0${num}`;
                    return god.abilities[abilityKey] ? { key: abilityKey, ability: god.abilities[abilityKey] } : null;
                  }).filter(Boolean)
                : null;
              
              // Map start order numbers to ability keys
              const startAbilities = startOrder && god && god.abilities
                ? startOrder.map(num => {
                    const abilityKey = `A0${num}`;
                    return god.abilities[abilityKey] ? { key: abilityKey, ability: god.abilities[abilityKey] } : null;
                  }).filter(Boolean)
                : null;
              
              // Check if god has an aspect and if it's mentioned in the current build
              const aspect = god && god.aspect ? god.aspect : null;
              let showAspect = false;
              if (aspect && aspect.name && currentBuild && currentBuild.notes) {
                try {
                  const aspectNameClean = String(aspect.name).toLowerCase().replace(/\*\*__|__\*\*/g, '').replace(/aspect of /i, '').trim();
                  const notesLower = String(currentBuild.notes).toLowerCase();
                  showAspect = aspectNameClean && notesLower.includes(aspectNameClean);
                } catch (e) {
                  showAspect = false;
                }
              }

              // show exactly 7 final slots
              const finalSlots = Array.from({ length: 7 }, (_, i) => (finalItems && finalItems[i] ? finalItems[i] : null));

              const isExpanded = expandedIndex === idx;
              const hasMultipleBuilds = allBuilds.length > 1;

              // Color code cards by role for better distinction
              const roleColors = {
                'ADC': { bg: '#2d1a3d', border: '#A855F7', accent: '#A855F7' },
                'Solo': { bg: '#1a2a3d', border: '#3B82F6', accent: '#3B82F6' },
                'Support': { bg: '#1a2d24', border: '#10B981', accent: '#10B981' },
                'Mid': { bg: '#3d1a1a', border: '#EF4444', accent: '#EF4444' },
                'Jungle': { bg: '#2d251a', border: '#FBBF24', accent: '#F59E0B' },
              };
              
              // Determine role for card styling
              let cardRole = selectedRole || '';
              if (!cardRole && role) {
                const roleLower = role.toLowerCase();
                if (roleLower.includes('adc') || roleLower.includes('carry')) cardRole = 'ADC';
                else if (roleLower.includes('solo')) cardRole = 'Solo';
                else if (roleLower.includes('support')) cardRole = 'Support';
                else if (roleLower.includes('mid') || roleLower.includes('Middle')) cardRole = 'Mid';
                else if (roleLower.includes('jungle')) cardRole = 'Jungle';
              }
              
              const cardColors = cardRole && roleColors[cardRole] 
                ? roleColors[cardRole] 
                : { bg: '#0b1226', border: '#1e3a5f', accent: '#ffffff' };
              
              // Alternate card styling for visual variety
              const isEven = idx % 2 === 0;
              const cardStyle = isEven 
                ? { backgroundColor: cardColors.bg, borderColor: cardColors.border }
                : { backgroundColor: cardColors.bg + 'dd', borderColor: cardColors.border + '80' };

              return (
                <View key={idx} style={[
                  styles.card, 
                  cardStyle,
                  { 
                    borderWidth: 2,
                    borderLeftWidth: 5,
                    shadowColor: cardColors.border,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 5,
                  }
                ]}>
                  <View>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => {
                      startTransition(() => {
                        setExpandedIndex(isExpanded ? null : idx);
                      });
                    }}>
                      <View style={styles.cardContent}>
                        <View style={[styles.cardLeft, { borderRightWidth: 2, borderRightColor: cardColors.border + '30', paddingRight: 12, marginRight: 12 }]}>
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              if (onGodIconPress && god) {
                                onGodIconPress(god);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={{ position: 'relative' }}>
                              {godIcon ? (() => {
                                const localIcon = getLocalGodAsset(godIcon);
                                if (localIcon) {
                                  return (
                                    <View style={[styles.godIconContainer, { borderColor: cardColors.border + '60' }]}>
                                      <Image 
                                        source={localIcon} 
                                        style={styles.godIcon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={0}
                                        accessibilityLabel={`${title} icon`}
                                        placeholderContentFit="cover"
                                        recyclingKey={`god-${title}`}
                                      />
                                    </View>
                                  );
                                }
                                // Fallback to text if local icon not found
                                return (
                                  <View style={[styles.godFallback, { borderColor: cardColors.border + '60' }]}>
                                    <Text style={[styles.godFallbackText, { color: cardColors.accent }]}>{title.charAt(0)}</Text>
                                  </View>
                                );
                              })() : (
                                <View style={[styles.godFallback, { borderColor: cardColors.border + '60' }]}>
                                  <Text style={[styles.godFallbackText, { color: cardColors.accent }]}>{title.charAt(0)}</Text>
                                </View>
                              )}
                              {/* Patch indicator badge */}
                              {god && god.latestPatchChange && (
                                <PatchBadgeTooltip
                                  changeType={god.latestPatchChange.type}
                                  version={god.latestPatchChange.version || 'latest'}
                                  entityType="god"
                                  badgeStyle={[styles.patchBadge, styles[`patchBadge${god.latestPatchChange.type.charAt(0).toUpperCase() + god.latestPatchChange.type.slice(1)}`]]}
                                  textStyle={styles.patchBadgeText}
                                  overlayStyle={styles.tooltipOverlay}
                                  contentStyle={styles.tooltipContent}
                                  tooltipTextStyle={styles.tooltipText}
                                  closeButtonStyle={styles.tooltipCloseButton}
                                  closeTextStyle={styles.tooltipCloseText}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.cardBody}>
                          <View style={styles.cardHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.cardTitle, { color: cardColors.accent }]}>{title}</Text>
                              {role && (
                                <View style={[styles.roleBadge, { backgroundColor: cardColors.border + '20', borderColor: cardColors.border + '50', alignSelf: 'flex-start', marginTop: 6 }]}>
                                  <Text style={[styles.roleBadgeText, { color: cardColors.accent }]}>{role}</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <TouchableOpacity
                                onPress={async (e) => {
                                  e.stopPropagation();
                                  const currentUser = await storage.getItem('currentUser');
                                  if (!currentUser) {
                                    setShowLoginModal(true);
                                    return;
                                  }
                                  
                                  const buildKey = `${title}-${idx}-${currentBuildIdx}`;
                                  const isPinned = pinnedBuilds.has(buildKey);
                                  
                                  try {
                                    console.log('🔧 Pin/Unpin build action:', {
                                      buildKey,
                                      godName: title,
                                      isPinned,
                                      currentUser,
                                      hasSupabase: !!getSupabase(),
                                    });
                                    
                                    const pinnedBuildsData = await storage.getItem(`pinnedBuilds_${currentUser}`);
                                    const pinned = pinnedBuildsData ? JSON.parse(pinnedBuildsData) : [];
                                    
                                    console.log('📋 Current pinned builds list:', pinned.length);
                                    
                                    if (isPinned) {
                                      // Unpin
                                      const updated = pinned.filter(b => b.buildKey !== buildKey);
                                      await storage.setItem(`pinnedBuilds_${currentUser}`, JSON.stringify(updated));
                                      setPinnedBuilds(prev => {
                                        const next = new Set(prev);
                                        next.delete(buildKey);
                                        return next;
                                      });
                                      
                                      // Sync to Supabase - get existing data first to preserve other fields
                                      const supabaseClient = getSupabase();
                                      if (!supabaseClient || !supabaseClient.from) {
                                        console.error('❌ Supabase not available, skipping sync');
                                        return;
                                      }
                                      
                                      try {
                                        console.log('🔄 Syncing unpinned build to Supabase...');
                                        const { data: existingData, error: fetchError } = await supabaseClient
                                          .from('user_data')
                                          .select('pinned_builds, pinned_gods, saved_builds')
                                          .eq('username', currentUser)
                                          .single();
                                        
                                        if (fetchError && fetchError.code !== 'PGRST116') {
                                          console.error('❌ Error fetching existing data:', fetchError);
                                        }
                                        
                                        const { error } = await supabaseClient
                                          .from('user_data')
                                          .upsert({
                                            username: currentUser,
                                            pinned_builds: updated,
                                            pinned_gods: existingData?.pinned_gods || [],
                                            saved_builds: existingData?.saved_builds || [],
                                            updated_at: new Date().toISOString(),
                                          }, {
                                            onConflict: 'username'
                                          });
                                        
                                        if (error) {
                                          if (error.code === 'MISSING_CONFIG') {
                                            console.log('⚠️ Supabase not configured, skipping sync');
                                          } else {
                                            console.error('❌ Error syncing unpinned build to Supabase:', error);
                                          }
                                        } else {
                                          console.log('✅ Unpinned build synced to Supabase successfully');
                                        }
                                      } catch (supabaseError) {
                                        console.error('❌ Exception syncing to Supabase:', supabaseError);
                                      }
                                    } else {
                                      // Pin
                                      const newPinnedBuild = {
                                        buildKey,
                                        godName: title,
                                        godInternalName: god?.internalName || god?.GodName,
                                        role: role || 'Unknown',
                                        buildTitle: currentBuild?.notes || currentBuild?.title || `${role || 'Build'} Build`,
                                        build: currentBuild,
                                        pinnedAt: new Date().toISOString(),
                                      };
                                      pinned.push(newPinnedBuild);
                                      await storage.setItem(`pinnedBuilds_${currentUser}`, JSON.stringify(pinned));
                                      setPinnedBuilds(prev => new Set(prev).add(buildKey));
                                      
                                      // Sync to Supabase - get existing data first to preserve other fields
                                      const supabaseClient = getSupabase();
                                      if (!supabaseClient || !supabaseClient.from) {
                                        console.error('❌ Supabase not available, skipping sync');
                                        return;
                                      }
                                      
                                      try {
                                        console.log('🔄 Syncing pinned build to Supabase...', {
                                          buildKey,
                                          godName: title,
                                          totalPinned: pinned.length,
                                        });
                                        const { data: existingData, error: fetchError } = await supabaseClient
                                          .from('user_data')
                                          .select('pinned_builds, pinned_gods, saved_builds')
                                          .eq('username', currentUser)
                                          .single();
                                        
                                        if (fetchError && fetchError.code !== 'PGRST116') {
                                          console.error('❌ Error fetching existing data:', fetchError);
                                        }
                                        
                                        const { error } = await supabaseClient
                                          .from('user_data')
                                          .upsert({
                                            username: currentUser,
                                            pinned_builds: pinned,
                                            pinned_gods: existingData?.pinned_gods || [],
                                            saved_builds: existingData?.saved_builds || [],
                                            updated_at: new Date().toISOString(),
                                          }, {
                                            onConflict: 'username'
                                          });
                                        
                                        if (error) {
                                          if (error.code === 'MISSING_CONFIG') {
                                            console.log('⚠️ Supabase not configured, skipping sync');
                                          } else {
                                            console.error('❌ Error syncing pinned build to Supabase:', error);
                                          }
                                        } else {
                                          console.log('✅ Pinned build synced to Supabase successfully:', pinned.length, 'total builds');
                                        }
                                      } catch (supabaseError) {
                                        console.error('❌ Exception syncing to Supabase:', supabaseError);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error pinning/unpinning build:', error);
                                    Alert.alert('Error', 'Failed to pin/unpin build. Please try again.');
                                  }
                                }}
                                style={styles.pinButton}
                              >
                                <Text style={styles.pinButtonText}>
                                  {pinnedBuilds.has(`${title}-${idx}-${currentBuildIdx}`) ? '📌' : '📍'}
                                </Text>
                              </TouchableOpacity>
                              {isExpanded ? (
                                <Text style={styles.expandIndicator}>▼</Text>
                              ) : (
                                <Text style={styles.expandIndicator}>▶</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Build tabs and title - always visible */}
                    <View style={styles.cardExpandedContent}>
                      {hasMultipleBuilds && (
                        <View style={styles.buildTabs}>
                          {allBuilds.map((build, buildIdx) => {
                            const isActive = buildIdx === currentBuildIdx;
                            return (
                              <TouchableOpacity
                                key={buildIdx}
                                style={[styles.buildTab, isActive && styles.buildTabActive]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  startTransition(() => {
                                    setSelectedBuildIndex(prev => ({ ...prev, [idx]: buildIdx }));
                                  });
                                }}
                              >
                                <Text style={[styles.buildTabText, isActive && styles.buildTabTextActive]}>
                                  {buildIdx + 1}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      {currentBuild && currentBuild.notes && (
                        <Text style={styles.buildTitle}>{currentBuild.notes}</Text>
                      )}
                      {currentBuild && currentBuild.author && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (onNavigateToUserProfile) {
                                onNavigateToUserProfile(currentBuild.author.toString().trim());
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.buildAuthor,
                                (CONTRIBUTORS_AUTHORS.includes((currentBuild.author || '').toString().trim().toLowerCase()) || 
                                 contributorsUsers.has((currentBuild.author || '').toString().trim())) && styles.buildAuthorContributors,
                                { textDecorationLine: 'underline' }
                              ]}
                            >
                              By {currentBuild.authorDisplayName || currentBuild.author}
                            </Text>
                          </TouchableOpacity>
                          {/* Share button - only show for contributor and community builds */}
                          {(buildCategory === 'contributors' || buildCategory === 'community') && (
                            <TouchableOpacity
                              style={styles.buildShareButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleShareBuild(currentBuild);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.buildShareButtonText}>Share</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      {/* Display roles if build has them */}
                      {currentBuild && currentBuild.roles && Array.isArray(currentBuild.roles) && currentBuild.roles.length > 0 && (
                        <View style={styles.buildRolesContainer}>
                          <Text style={styles.buildRolesLabel}>Roles: </Text>
                          <View style={styles.buildRolesTags}>
                            {currentBuild.roles.map((role, roleIdx) => (
                              <View key={roleIdx} style={styles.buildRoleTag}>
                                <Text style={styles.buildRoleTagText}>{role}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>

                    {isExpanded && (
                      <View style={styles.cardExpandedContent}>

                        {/* Contributor/Community: single expandable section with Start Order | Max Order tabs */}
                        {(buildCategory === 'contributors' || buildCategory === 'community') && (() => {
                          const hasStart = startAbilities && startAbilities.length > 0 && startOrder && startOrder.length > 0;
                          const hasMax = levelingAbilities && levelingAbilities.length > 0;
                          if (!hasStart && !hasMax) return null;
                          const sectionKey = `leveling-${idx}-${currentBuildIdx}`;
                          const isOpen = IS_WEB || expandedCardSections[sectionKey] !== false;
                          const tabKey = `leveling-${idx}-${currentBuildIdx}`;
                          const activeTab = levelingTab[tabKey] || (hasStart ? 'start' : 'max');

                          const startContent = hasStart ? (
                            <View style={styles.levelingOrderIcons}>
                              {startAbilities.slice(0, 5).map(({ key, ability }, ai) => {
                                const aIconPath = ability && ability.icon ? ability.icon : null;
                                const abilityName = ability.name || ability.key || key;
                                const isLast = ai === startAbilities.slice(0, 5).length - 1;
                                const isFirst = ai === 0;
                                return (
                                  <React.Fragment key={`${idx}-${currentBuildIdx}-start-${ai}-${key}`}>
                                    <TouchableOpacity style={styles.levelingOrderIconWrapper} onPress={(e) => { e.stopPropagation(); if (ability && typeof ability === 'object') startTransition(() => setSelectedAbility({ godIndex: idx, abilityKey: key, ability, abilityName })); }} activeOpacity={0.7}>
                                      {aIconPath ? (() => {
                                        const localIcon = getLocalGodAsset(aIconPath);
                                        if (localIcon) return <Image source={localIcon} style={styles.levelingOrderIcon} contentFit="cover" cachePolicy="memory-disk" transition={0} accessibilityLabel={`${abilityName} ability icon`} />;
                                        return <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>;
                                      })() : <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>}
                                      {isFirst && <View style={styles.levelingOrderFirstBadge}><Text style={styles.levelingOrderFirstBadgeText}>1st</Text></View>}
                                      {!isFirst && <Text style={styles.levelingOrderNumber}>{ai + 1}</Text>}
                                    </TouchableOpacity>
                                    {!isLast && <Text style={styles.levelingOrderArrow}>→</Text>}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                          ) : null;

                          const maxContent = hasMax ? (
                            <View style={styles.levelingOrderIcons}>
                              {levelingAbilities.slice(0, 4).map(({ key, ability }, ai) => {
                                const aIconPath = ability && ability.icon ? ability.icon : null;
                                const abilityName = ability.name || ability.key || key;
                                const isLast = ai === levelingAbilities.slice(0, 4).length - 1;
                                const isFirst = ai === 0;
                                return (
                                  <React.Fragment key={`${idx}-${currentBuildIdx}-leveling-${ai}-${key}`}>
                                    <TouchableOpacity style={styles.levelingOrderIconWrapper} onPress={(e) => { e.stopPropagation(); if (ability && typeof ability === 'object') startTransition(() => setSelectedAbility({ godIndex: idx, abilityKey: key, ability, abilityName })); }} activeOpacity={0.7}>
                                      {aIconPath ? (() => {
                                        const localIcon = getLocalGodAsset(aIconPath);
                                        if (localIcon) return <Image source={localIcon} style={styles.levelingOrderIcon} contentFit="cover" cachePolicy="memory-disk" transition={0} accessibilityLabel={`${abilityName} ability icon`} />;
                                        return <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>;
                                      })() : <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>}
                                      {isFirst && <View style={styles.levelingOrderFirstBadge}><Text style={styles.levelingOrderFirstBadgeText}>1st</Text></View>}
                                      {!isFirst && <Text style={styles.levelingOrderNumber}>{ai + 1}</Text>}
                                    </TouchableOpacity>
                                    {!isLast && <Text style={styles.levelingOrderArrow}>→</Text>}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                          ) : null;

                          return (
                            <View style={styles.levelingOrderContainer} key={sectionKey}>
                              <TouchableOpacity onPress={() => setExpandedCardSections(prev => ({ ...prev, [sectionKey]: !isOpen }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen ? 8 : 0 }}>
                                <Text style={styles.levelingOrderLabel}>Start Order / Max Order</Text>
                                <Text style={{ color: '#7dd3fc', fontSize: 12 }}>{isOpen ? '▼' : '▶'}</Text>
                              </TouchableOpacity>
                              {isOpen && (
                                <>
                                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    <TouchableOpacity onPress={() => setLevelingTab(prev => ({ ...prev, [tabKey]: 'start' }))} style={[styles.tipsSwapsButton, activeTab === 'start' && styles.tipsSwapsButtonActive]} disabled={!hasStart}>
                                      <Text style={[styles.tipsSwapsButtonText, activeTab === 'start' && styles.tipsSwapsButtonTextActive]}>Start Order</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setLevelingTab(prev => ({ ...prev, [tabKey]: 'max' }))} style={[styles.tipsSwapsButton, activeTab === 'max' && styles.tipsSwapsButtonActive]} disabled={!hasMax}>
                                      <Text style={[styles.tipsSwapsButtonText, activeTab === 'max' && styles.tipsSwapsButtonTextActive]}>Max Order</Text>
                                    </TouchableOpacity>
                                  </View>
                                  {activeTab === 'start' ? startContent : maxContent}
                                </>
                              )}
                            </View>
                          );
                        })()}

                        {/* Non-contributor/community: separate Start Order and Max Order sections */}
                        {(buildCategory !== 'contributors' && buildCategory !== 'community') && startAbilities && startAbilities.length > 0 && startOrder && startOrder.length > 0 && (() => {
                          const sectionKey = `leveling-${idx}-${currentBuildIdx}`;
                          const isSectionOpen = IS_WEB || expandedCardSections[sectionKey] !== false;
                          return (
                          <React.Fragment key={`start-order-${idx}-${currentBuildIdx}`}>
                          <View style={styles.levelingOrderContainer}>
                            {IS_WEB ? <Text style={styles.levelingOrderLabel}>Start Order (First 5 Levels):</Text> : (
                              <TouchableOpacity onPress={() => setExpandedCardSections(prev => ({ ...prev, [sectionKey]: !isSectionOpen }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSectionOpen ? 8 : 0 }}>
                                <Text style={styles.levelingOrderLabel}>Start Order (First 5 Levels):</Text>
                                <Text style={{ color: '#7dd3fc', fontSize: 12 }}>{isSectionOpen ? '▼' : '▶'}</Text>
                              </TouchableOpacity>
                            )}
                            {isSectionOpen ? (
                            <View style={styles.levelingOrderIcons}>
                              {startAbilities.slice(0, 5).map(({ key, ability }, ai) => {
                                const aIconPath = ability && ability.icon ? ability.icon : null;
                                const abilityName = ability.name || ability.key || key;
                                const isLast = ai === startAbilities.slice(0, 5).length - 1;
                                const isFirst = ai === 0;
                                return (
                                  <React.Fragment key={`${idx}-${currentBuildIdx}-start-${ai}-${key}`}>
                                    <TouchableOpacity style={styles.levelingOrderIconWrapper} onPress={(e) => { e.stopPropagation(); if (ability && typeof ability === 'object') startTransition(() => setSelectedAbility({ godIndex: idx, abilityKey: key, ability, abilityName })); }} activeOpacity={0.7}>
                                      {aIconPath ? (() => { const localIcon = getLocalGodAsset(aIconPath); if (localIcon) return <Image source={localIcon} style={styles.levelingOrderIcon} contentFit="cover" cachePolicy="memory-disk" transition={0} accessibilityLabel={`${abilityName} ability icon`} />; return <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>; })() : <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>}
                                      {isFirst && <View style={styles.levelingOrderFirstBadge}><Text style={styles.levelingOrderFirstBadgeText}>1st</Text></View>}
                                      {!isFirst && <Text style={styles.levelingOrderNumber}>{ai + 1}</Text>}
                                    </TouchableOpacity>
                                    {!isLast && <Text style={styles.levelingOrderArrow}>→</Text>}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                            ) : null}
                          </View>
                          </React.Fragment>
                          );
                        })()}
                        {(buildCategory !== 'contributors' && buildCategory !== 'community') && levelingAbilities && levelingAbilities.length > 0 && (() => {
                          const sectionKeyMax = `levelingMax-${idx}-${currentBuildIdx}`;
                          const isSectionOpenMax = IS_WEB || expandedCardSections[sectionKeyMax] !== false;
                          return (
                          <React.Fragment key={`max-order-${idx}-${currentBuildIdx}`}>
                          <View style={styles.levelingOrderContainer}>
                            {IS_WEB ? <Text style={styles.levelingOrderLabel}>Max Order:</Text> : (
                              <TouchableOpacity onPress={() => setExpandedCardSections(prev => ({ ...prev, [sectionKeyMax]: !isSectionOpenMax }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSectionOpenMax ? 8 : 0 }}>
                                <Text style={styles.levelingOrderLabel}>Max Order:</Text>
                                <Text style={{ color: '#7dd3fc', fontSize: 12 }}>{isSectionOpenMax ? '▼' : '▶'}</Text>
                              </TouchableOpacity>
                            )}
                            {isSectionOpenMax ? (
                            <View style={styles.levelingOrderIcons}>
                              {levelingAbilities.slice(0, 4).map(({ key, ability }, ai) => {
                                const aIconPath = ability && ability.icon ? ability.icon : null;
                                const abilityName = ability.name || ability.key || key;
                                const isLast = ai === levelingAbilities.slice(0, 4).length - 1;
                                const isFirst = ai === 0;
                                return (
                                  <React.Fragment key={`${idx}-${currentBuildIdx}-leveling-${ai}-${key}`}>
                                    <TouchableOpacity style={styles.levelingOrderIconWrapper} onPress={(e) => { e.stopPropagation(); if (ability && typeof ability === 'object') startTransition(() => setSelectedAbility({ godIndex: idx, abilityKey: key, ability, abilityName })); }} activeOpacity={0.7}>
                                      {aIconPath ? (() => { const localIcon = getLocalGodAsset(aIconPath); if (localIcon) return <Image source={localIcon} style={styles.levelingOrderIcon} contentFit="cover" cachePolicy="memory-disk" transition={0} accessibilityLabel={`${abilityName} ability icon`} />; return <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>; })() : <View style={styles.levelingOrderIconFallback}><Text style={styles.levelingOrderIconFallbackText}>{abilityName.charAt(0) || key.charAt(key.length - 1)}</Text></View>}
                                      {isFirst && <View style={styles.levelingOrderFirstBadge}><Text style={styles.levelingOrderFirstBadgeText}>1st</Text></View>}
                                      {!isFirst && <Text style={styles.levelingOrderNumber}>{ai + 1}</Text>}
                                    </TouchableOpacity>
                                    {!isLast && <Text style={styles.levelingOrderArrow}>→</Text>}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                            ) : null}
                          </View>
                          </React.Fragment>
                          );
                        })()}

                        {showAspect && aspect && (
                          <View style={styles.aspectContainer}>
                            <TouchableOpacity
                              style={styles.aspectRow}
                              onPress={(e) => {
                                e.stopPropagation();
                                const aspectName = aspect.name ? aspect.name.replace(/\*\*__|__\*\*/g, '') : 'Aspect';
                                startTransition(() => {
                                  setSelectedAbility({ godIndex: idx, abilityKey: 'aspect', ability: aspect, abilityName: aspectName });
                                });
                              }}
                            >
                              {aspect.icon ? (() => {
                                const localIcon = getLocalGodAsset(aspect.icon);
                                const aspectNameForLabel = aspect.name ? aspect.name.replace(/\*\*__|__\*\*/g, '') : 'Aspect';
                                if (localIcon) {
                                  return (
                                    <Image 
                                      source={localIcon} 
                                      style={styles.aspectIcon}
                                      contentFit="cover"
                                      cachePolicy="memory-disk"
                                      transition={200}
                                      accessibilityLabel={`${aspectNameForLabel} icon`}
                                    />
                                  );
                                }
                                return (
                                  <View style={styles.aspectIconFallback}>
                                    <Text style={styles.aspectIconFallbackText}>A</Text>
                                  </View>
                                );
                              })() : (
                                <View style={styles.aspectIconFallback}>
                                  <Text style={styles.aspectIconFallbackText}>A</Text>
                                </View>
                              )}
                              <View style={styles.aspectInfo}>
                                <Text style={styles.aspectName}>
                                  {aspect.name ? aspect.name.replace(/\*\*__|__\*\*/g, '') : 'Aspect'}
                                </Text>
                                {currentBuild && typeof currentBuild.aspectActive === 'boolean' && (
                                  <View style={[styles.aspectActiveBadge, currentBuild.aspectActive && styles.aspectActiveBadgeOn]}>
                                    <Text style={[styles.aspectActiveBadgeText, currentBuild.aspectActive && styles.aspectActiveBadgeTextOn]}>
                                      {currentBuild.aspectActive ? 'Active' : 'Non-Active'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                      {/* Starting Items Section - Show if build has starting items */}
                      {currentBuild && currentBuild.startingItems && Array.isArray(currentBuild.startingItems) && currentBuild.startingItems.length > 0 && (
                        <View style={styles.buildRow}>
                          <Text style={styles.buildLabel}>Starting Items</Text>
                          <View style={styles.buildIcons}>
                            {currentBuild.startingItems.map((item, si) => {
                              // Handle both string (item name) and object (item object) formats
                              const itemName = typeof item === 'string' ? item : (item.name || item.internalName || '');
                              if (!itemName) return null;
                              
                              let meta = null;
                              try {
                                meta = findItem(itemName);
                              } catch (e) {
                                console.log('Error finding starting item:', e);
                              }
                              const localIcon = meta && meta.icon ? getLocalItemIcon(meta.icon) : null;
                              return (
                                <TouchableOpacity
                                  key={si}
                                  style={styles.smallIconSlot}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    startTransition(() => {
                                      setSelectedItem({ item: meta, itemName: itemName });
                                    });
                                  }}
                                >
                                  <View style={styles.iconWithBadgeWrapper}>
                                    {localIcon ? (() => {
                                      const imageSource = localIcon.primary || localIcon;
                                      const fallbackSource = localIcon.fallback;
                                      const itemKey = `starting-${itemName}-${si}`;
                                      const useFallback = failedItemIcons[itemKey];
                                      
                                      if (fallbackSource && !useFallback) {
                                        return (
                                          <View style={styles.iconOuterBorder}>
                                            <View style={styles.iconInnerBorder}>
                                              <Image 
                                                source={imageSource}
                                                style={styles.smallIconImg}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                                accessibilityLabel={`${itemName} item icon`}
                                                onError={() => {
                                                  setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                                }}
                                              />
                                            </View>
                                          </View>
                                        );
                                      }
                                      
                                      if (fallbackSource && useFallback) {
                                        return (
                                          <View style={styles.iconOuterBorder}>
                                            <View style={styles.iconInnerBorder}>
                                              <Image 
                                                source={fallbackSource}
                                                style={styles.smallIconImg}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                                accessibilityLabel={`${itemName} item icon`}
                                              />
                                            </View>
                                          </View>
                                        );
                                      }
                                      
                                      return (
                                        <View style={styles.iconOuterBorder}>
                                          <View style={styles.iconInnerBorder}>
                                            <Image 
                                              source={imageSource}
                                              style={styles.smallIconImg}
                                              contentFit="cover"
                                              cachePolicy="memory-disk"
                                              transition={0}
                                              accessibilityLabel={`${itemName} item icon`}
                                            />
                                          </View>
                                        </View>
                                      );
                                    })() : (
                                      <View style={styles.iconOuterBorder}>
                                        <View style={styles.iconInnerBorder}>
                                          <Text style={styles.smallIconText}>{itemName}</Text>
                                        </View>
                                      </View>
                                    )}
                                    <View style={styles.itemNumberBadge}>
                                      <Text style={styles.itemNumberBadgeText}>{si + 1}</Text>
                                    </View>
                                    {meta && meta.latestPatchChange && (
                                      <PatchBadgeTooltip
                                        changeType={meta.latestPatchChange.type}
                                        version={meta.latestPatchChange.version || 'latest'}
                                        entityType="item"
                                        badgeStyle={[styles.patchBadge, styles.patchBadgeSmall, styles[`patchBadge${meta.latestPatchChange.type.charAt(0).toUpperCase() + meta.latestPatchChange.type.slice(1)}`]]}
                                        textStyle={styles.patchBadgeText}
                                        overlayStyle={styles.tooltipOverlay}
                                        contentStyle={styles.tooltipContent}
                                        tooltipTextStyle={styles.tooltipText}
                                        closeButtonStyle={styles.tooltipCloseButton}
                                        closeTextStyle={styles.tooltipCloseText}
                                      />
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          </View>
                        )}

                      {starter && (
                        <View style={styles.buildRow}>
                          <Text style={styles.buildLabel}>Starter</Text>
                          <View style={styles.buildIcons}>
                              {Array.isArray(starter) && starter.map((s, si) => {
                              let meta = null;
                              try {
                                meta = findItem(s);
                              } catch (e) {
                                console.log('Error finding starter item:', e);
                              }
                              const localIcon = meta && meta.icon ? getLocalItemIcon(meta.icon) : null;
                              return (
                                  <TouchableOpacity
                                    key={si}
                                    style={styles.smallIconSlot}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      startTransition(() => {
                                        setSelectedItem({ item: meta, itemName: s });
                                      });
                                    }}
                                  >
                                      <View style={styles.iconWithBadgeWrapper}>
                                        {localIcon ? (() => {
                                          // Handle both single URI and primary/fallback object
                                          const imageSource = localIcon.primary || localIcon;
                                          const fallbackSource = localIcon.fallback;
                                          const itemKey = `starter-${s}-${si}`;
                                          const useFallback = failedItemIcons[itemKey];
                                          
                                          if (fallbackSource && !useFallback) {
                                            // Has fallback - try primary first, then fallback on error
                                            return (
                                              <View style={styles.iconOuterBorder}>
                                                <View style={styles.iconInnerBorder}>
                                                  <Image 
                                                  source={imageSource}
                                                  style={styles.smallIconImg}
                                                  contentFit="cover"
                                                  cachePolicy="memory-disk"
                                                  transition={0}
                                                  accessibilityLabel={`${s} item icon`}
                                                  onError={() => {
                                                    setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                                  }}
                                                />
                                              </View>
                                            </View>
                                          );
                                        }
                                        
                                        if (fallbackSource && useFallback) {
                                          // Use fallback after primary failed
                                          return (
                                            <View style={styles.iconOuterBorder}>
                                              <View style={styles.iconInnerBorder}>
                                                <Image 
                                                  source={fallbackSource}
                                                  style={styles.smallIconImg}
                                                  contentFit="cover"
                                                  cachePolicy="memory-disk"
                                                  transition={0}
                                                  accessibilityLabel={`${s} item icon`}
                                                />
                                              </View>
                                            </View>
                                          );
                                        }
                                        
                                        // Single URI - use directly
                                        return (
                                          <View style={styles.iconOuterBorder}>
                                            <View style={styles.iconInnerBorder}>
                                              <Image 
                                                source={imageSource}
                                                style={styles.smallIconImg}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                                accessibilityLabel={`${s} item icon`}
                                              />
                                            </View>
                                          </View>
                                        );
                                      })() : (
                                      <View style={styles.iconOuterBorder}>
                                        <View style={styles.iconInnerBorder}>
                                          <Text style={styles.smallIconText}>{s}</Text>
                                        </View>
                                      </View>
                                    )}
                                    <View style={styles.itemNumberBadge}>
                                      <Text style={styles.itemNumberBadgeText}>{si + 1}</Text>
                                    </View>
                                    {/* Patch indicator badge for starter items */}
                                    {meta && meta.latestPatchChange && (
                                      <PatchBadgeTooltip
                                        changeType={meta.latestPatchChange.type}
                                        version={meta.latestPatchChange.version || 'latest'}
                                        entityType="item"
                                        badgeStyle={[styles.patchBadge, styles.patchBadgeSmall, styles[`patchBadge${meta.latestPatchChange.type.charAt(0).toUpperCase() + meta.latestPatchChange.type.slice(1)}`]]}
                                        textStyle={styles.patchBadgeText}
                                        overlayStyle={styles.tooltipOverlay}
                                        contentStyle={styles.tooltipContent}
                                        tooltipTextStyle={styles.tooltipText}
                                        closeButtonStyle={styles.tooltipCloseButton}
                                        closeTextStyle={styles.tooltipCloseText}
                                      />
                                    )}
                                  </View>
                                  </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      <View style={[styles.buildRow, { marginTop: 8 }]}>
                        <Text style={styles.buildLabel}>Final</Text>
                        <View style={styles.buildIcons}>
                          {finalSlots.map((f, fi) => {
                            if (!f) {
                              return <View key={fi} style={styles.emptySlot} />;
                            }
                            let meta = null;
                            try {
                              meta = findItem(f);
                            } catch (e) {
                              console.log('Error finding item:', e);
                            }
                            const localIcon = meta && meta.icon ? getLocalItemIcon(meta.icon) : null;
                            return (
                                <TouchableOpacity
                                  key={fi}
                                  style={styles.iconWrap}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    startTransition(() => {
                                      setSelectedItem({ item: meta, itemName: f });
                                    });
                                  }}
                                >
                                  <View style={styles.iconWithBadgeWrapper}>
                                    {localIcon ? (() => {
                                      // Handle both single URI and primary/fallback object
                                      const imageSource = localIcon.primary || localIcon;
                                      const fallbackSource = localIcon.fallback;
                                      const itemKey = `final-${f}-${fi}`;
                                      const useFallback = failedItemIcons[itemKey];
                                      
                                      if (fallbackSource && !useFallback) {
                                        // Has fallback - try primary first, then fallback on error
                                        return (
                                      <View style={styles.iconOuterBorder}>
                                        <View style={styles.iconInnerBorder}>
                                          <Image 
                                            source={imageSource}
                                            style={styles.iconImg}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={0}
                                            onError={() => {
                                              setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                            }}
                                          />
                                        </View>
                                      </View>
                                    );
                                  }
                                  
                                  if (fallbackSource && useFallback) {
                                    // Use fallback after primary failed
                                    return (
                                      <View style={styles.iconOuterBorder}>
                                        <View style={styles.iconInnerBorder}>
                                          <Image 
                                            source={fallbackSource}
                                            style={styles.iconImg}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={0}
                                            accessibilityLabel={`${f} item icon`}
                                          />
                                        </View>
                                      </View>
                                    );
                                  }
                                  
                                  // Single URI - use directly
                                  return (
                                    <View style={styles.iconOuterBorder}>
                                      <View style={styles.iconInnerBorder}>
                                        <Image 
                                          source={imageSource}
                                          style={styles.iconImg}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={0}
                                          accessibilityLabel={`${f} item icon`}
                                        />
                                      </View>
                                    </View>
                                  );
                                })() : (
                                  <View style={styles.iconOuterBorder}>
                                    <View style={[styles.iconInnerBorder, styles.iconFallback]}>
                                      <Text style={styles.iconFallbackText}>{f}</Text>
                                    </View>
                                  </View>
                                )}
                                <View style={styles.itemNumberBadge}>
                                  <Text style={styles.itemNumberBadgeText}>
                                    {fi === 0 ? 'S' : fi}
                                  </Text>
                                </View>
                                {/* Patch indicator badge for final items */}
                                {meta && meta.latestPatchChange && (
                                  <PatchBadgeTooltip
                                    changeType={meta.latestPatchChange.type}
                                    version={meta.latestPatchChange.version || 'latest'}
                                    entityType="item"
                                    badgeStyle={[styles.patchBadge, styles.patchBadgeSmall, styles[`patchBadge${meta.latestPatchChange.type.charAt(0).toUpperCase() + meta.latestPatchChange.type.slice(1)}`]]}
                                    textStyle={styles.patchBadgeText}
                                    overlayStyle={styles.tooltipOverlay}
                                    contentStyle={styles.tooltipContent}
                                    tooltipTextStyle={styles.tooltipText}
                                    closeButtonStyle={styles.tooltipCloseButton}
                                    closeTextStyle={styles.tooltipCloseText}
                                  />
                                )}
                                  </View>
                                </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Relic Section */}
                      {currentBuild && currentBuild.relic && (
                        <View style={[styles.buildRow, { marginTop: 8 }]}>
                          <Text style={styles.buildLabel}>Relic</Text>
                          <View style={styles.buildIcons}>
                            {(() => {
                              const relic = currentBuild.relic;
                              const relicName = typeof relic === 'string' ? relic : (relic.name || relic.internalName || '');
                              if (!relicName) return null;
                              
                              let meta = null;
                              try {
                                meta = findItem(relicName);
                              } catch (e) {
                                console.log('Error finding relic:', e);
                              }
                              const localIcon = meta && meta.icon ? getLocalItemIcon(meta.icon) : null;
                              
                              return (
                                <TouchableOpacity
                                  style={styles.iconWrap}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    startTransition(() => {
                                      setSelectedItem({ item: meta, itemName: relicName });
                                    });
                                  }}
                                >
                                  <View style={{ position: 'relative' }}>
                                    {localIcon ? (() => {
                                      const imageSource = localIcon.primary || localIcon;
                                      const fallbackSource = localIcon.fallback;
                                      const itemKey = `relic-${relicName}`;
                                      const useFallback = failedItemIcons[itemKey];
                                      
                                      if (fallbackSource && !useFallback) {
                                        return (
                                          <View style={styles.iconOuterBorder}>
                                            <View style={styles.iconInnerBorder}>
                                              <Image 
                                                source={imageSource}
                                                style={styles.smallIconImg}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                                accessibilityLabel={`${relicName} relic icon`}
                                                onError={() => {
                                                  setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                                }}
                                              />
                                            </View>
                                          </View>
                                        );
                                      }
                                      
                                      if (fallbackSource && useFallback) {
                                        return (
                                          <View style={styles.iconOuterBorder}>
                                            <View style={styles.iconInnerBorder}>
                                              <Image 
                                                source={fallbackSource}
                                                style={styles.smallIconImg}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                                accessibilityLabel={`${relicName} relic icon`}
                                              />
                                            </View>
                                          </View>
                                        );
                                      }
                                      
                                      return (
                                        <View style={styles.iconOuterBorder}>
                                          <View style={styles.iconInnerBorder}>
                                            <Image 
                                              source={imageSource}
                                              style={styles.smallIconImg}
                                              contentFit="cover"
                                              cachePolicy="memory-disk"
                                              transition={0}
                                              accessibilityLabel={`${relicName} relic icon`}
                                            />
                                          </View>
                                        </View>
                                      );
                                    })() : (
                                      <View style={styles.iconOuterBorder}>
                                        <View style={[styles.iconInnerBorder, styles.iconFallback]}>
                                          <Text style={styles.iconFallbackText}>{relicName}</Text>
                                        </View>
                                      </View>
                                    )}
                                    {/* Patch indicator badge for relic */}
                                    {meta && meta.latestPatchChange && (
                                      <PatchBadgeTooltip
                                        changeType={meta.latestPatchChange.type}
                                        version={meta.latestPatchChange.version || 'latest'}
                                        entityType="item"
                                        badgeStyle={[styles.patchBadge, styles.patchBadgeSmall, styles[`patchBadge${meta.latestPatchChange.type.charAt(0).toUpperCase() + meta.latestPatchChange.type.slice(1)}`]]}
                                        textStyle={styles.patchBadgeText}
                                        overlayStyle={styles.tooltipOverlay}
                                        contentStyle={styles.tooltipContent}
                                        tooltipTextStyle={styles.tooltipText}
                                        closeButtonStyle={styles.tooltipCloseButton}
                                        closeTextStyle={styles.tooltipCloseText}
                                      />
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })()}
                          </View>
                        </View>
                      )}

                        {/* Contributor/Community: single expandable section with Build Tips | Item Swaps tabs */}
                        {(buildCategory === 'contributors' || buildCategory === 'community') && (() => {
                          const hasTips = currentBuild && currentBuild.tips && String(currentBuild.tips).trim().length > 0;
                          const hasGodTips = god && god.tips && Array.isArray(god.tips) && god.tips.filter(tip => tip && tip.title && !tip.title.toLowerCase().includes('leveling')).length > 0;
                          const hasSwaps = currentBuild && currentBuild.itemSwaps && currentBuild.itemSwaps.length > 0;
                          const showCombined = hasTips || hasGodTips || hasSwaps;
                          if (!showCombined) return null;

                          const sectionKey = `tipsSwaps-${idx}-${currentBuildIdx}`;
                          const isOpen = IS_WEB || expandedCardSections[sectionKey] !== false;
                          const tabKey = `${idx}-${currentBuildIdx}`;
                          const activeTab = tipsSwapsTab[tabKey] || (hasTips || hasGodTips ? 'tips' : 'swaps');

                          const tipLines = hasTips
                            ? String(currentBuild.tips).split(/\n+/).filter(line => line.trim().length > 0)
                            : (hasGodTips ? god.tips.filter(tip => tip && tip.title && !tip.title.toLowerCase().includes('leveling')) : []);
                          const tipsLabel = hasTips ? 'Build Tips' : 'Tips';

                          const tipsContent = tipLines.length > 0 ? (
                            <View style={styles.tipButtonsContainer}>
                              {tipLines.map((tipLine, tipIdx) => {
                                const tipObj = typeof tipLine === 'string'
                                  ? { title: `Tip ${tipIdx + 1}`, value: tipLine.trim() }
                                  : tipLine;
                                return (
                                  <TouchableOpacity
                                    key={tipIdx}
                                    style={styles.tipButton}
                                    onPress={() => startTransition(() => setSelectedTip({ tip: tipObj, tipIndex: tipIdx + 1, godIndex: idx }))}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.tipButtonText}>{tipIdx + 1}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ) : null;

                          const swapsContent = hasSwaps ? (
                            <>
                              {currentBuild.itemSwaps.map((swap, swapIdx) => {
                                const rawItem = typeof swap.item === 'string' ? { name: swap.item } : swap.item;
                                const itemName = rawItem && (rawItem.name || rawItem.internalName);
                                const iconPath = rawItem && (rawItem.icon || rawItem.internalName || rawItem.name);
                                const isUrl = typeof iconPath === 'string' && (iconPath.startsWith('http://') || iconPath.startsWith('https://'));
                                let iconEl = null;
                                if (isUrl && rawItem && rawItem.icon) {
                                  iconEl = <Image source={{ uri: rawItem.icon }} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" />;
                                } else if (itemName) {
                                  try {
                                    const meta = findItem(itemName);
                                    const li = meta && meta.icon ? getLocalItemIcon(meta.icon) : null;
                                    if (li) iconEl = <Image source={li.primary || li} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" />;
                                  } catch (_) {}
                                }
                                if (!iconEl && !isUrl && iconPath) {
                                  const localIcon = getLocalItemIcon(iconPath);
                                  if (localIcon) iconEl = <Image source={localIcon.primary || localIcon} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" />;
                                }
                                if (!iconEl && itemName) {
                                  iconEl = <View style={[styles.levelingOrderIconFallback, { width: 32, height: 32, borderRadius: 4 }]}><Text style={styles.levelingOrderIconFallbackText}>{itemName.charAt(0)}</Text></View>;
                                }
                                return (
                                  <View key={swapIdx} style={styles.tipItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                      {iconEl}
                                      <View style={{ flex: 1 }}>
                                        {itemName && <Text style={styles.tipTitle}>{itemName}</Text>}
                                        {swap.reasoning && <Text style={styles.tipValue}>{swap.reasoning}</Text>}
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </>
                          ) : null;

                          return (
                            <View style={styles.expand}>
                              <TouchableOpacity
                                onPress={() => setExpandedCardSections(prev => ({ ...prev, [sectionKey]: !isOpen }))}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen ? 10 : 0 }}
                              >
                                <Text style={styles.expandTitle}>Build Tips / Item Swaps</Text>
                                <Text style={{ color: '#7dd3fc', fontSize: 14 }}>{isOpen ? '▼' : '▶'}</Text>
                              </TouchableOpacity>
                              {isOpen && (
                                <>
                                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                    <TouchableOpacity
                                      onPress={() => setTipsSwapsTab(prev => ({ ...prev, [tabKey]: 'tips' }))}
                                      style={[styles.tipsSwapsButton, activeTab === 'tips' && styles.tipsSwapsButtonActive]}
                                    >
                                      <Text style={[styles.tipsSwapsButtonText, activeTab === 'tips' && styles.tipsSwapsButtonTextActive]}>{tipsLabel}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => setTipsSwapsTab(prev => ({ ...prev, [tabKey]: 'swaps' }))}
                                      style={[styles.tipsSwapsButton, activeTab === 'swaps' && styles.tipsSwapsButtonActive]}
                                    >
                                      <Text style={[styles.tipsSwapsButtonText, activeTab === 'swaps' && styles.tipsSwapsButtonTextActive]}>Item Swaps</Text>
                                    </TouchableOpacity>
                                  </View>
                                  {activeTab === 'tips' ? tipsContent : swapsContent}
                                </>
                              )}
                            </View>
                          );
                        })()}

                        {/* Non-contributor/community: show Build Tips and Item Swaps as separate sections */}
                        {(buildCategory !== 'contributors' && buildCategory !== 'community') && (() => {
                          const tipsSectionKey = `tips-${idx}-${currentBuildIdx}`;
                          const isTipsOpen = IS_WEB || expandedCardSections[tipsSectionKey] !== false;
                          const renderTipsHeader = (title) => IS_WEB ? <Text style={styles.expandTitle}>{title}</Text> : (
                            <TouchableOpacity onPress={() => setExpandedCardSections(prev => ({ ...prev, [tipsSectionKey]: !isTipsOpen }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isTipsOpen ? 12 : 0 }}>
                              <Text style={styles.expandTitle}>{title}</Text>
                              <Text style={{ color: '#7dd3fc', fontSize: 14 }}>{isTipsOpen ? '▼' : '▶'}</Text>
                            </TouchableOpacity>
                          );
                          const buildTips = currentBuild && currentBuild.tips ? currentBuild.tips : null;
                          if (buildTips && buildTips.trim()) {
                            const tipLines = buildTips.split(/\n+/).filter(line => line.trim().length > 0);
                            if (tipLines.length > 0) {
                              return (
                                <View style={styles.expand}>
                                  {renderTipsHeader('Build Tips')}
                                  {isTipsOpen && (
                                    <View style={styles.tipButtonsContainer}>
                                      {tipLines.map((tipLine, tipIdx) => {
                                        const tipObj = { title: `Tip ${tipIdx + 1}`, value: tipLine.trim() };
                                        return (
                                          <TouchableOpacity key={tipIdx} style={styles.tipButton} onPress={() => startTransition(() => setSelectedTip({ tip: tipObj, tipIndex: tipIdx + 1, godIndex: idx }))} activeOpacity={0.7}>
                                            <Text style={styles.tipButtonText}>{tipIdx + 1}</Text>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>
                              );
                            }
                          }
                          if (god && god.tips && Array.isArray(god.tips)) {
                            const filteredTips = god.tips.filter(tip => tip && tip.title && !tip.title.toLowerCase().includes('leveling'));
                            return filteredTips.length > 0 ? (
                              <View style={styles.expand}>
                                {renderTipsHeader('Tips')}
                                {isTipsOpen && (
                                  <View style={styles.tipButtonsContainer}>
                                    {filteredTips.map((tip, tipIdx) => (
                                      <TouchableOpacity key={tipIdx} style={styles.tipButton} onPress={() => startTransition(() => setSelectedTip({ tip, tipIndex: tipIdx + 1, godIndex: idx }))} activeOpacity={0.7}>
                                        <Text style={styles.tipButtonText}>{tipIdx + 1}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                              </View>
                            ) : null;
                          }
                          return null;
                        })()}
                        {(buildCategory !== 'contributors' && buildCategory !== 'community') && currentBuild && currentBuild.itemSwaps && currentBuild.itemSwaps.length > 0 && (() => {
                          const sectionKey = `itemSwaps-${idx}-${currentBuildIdx}`;
                          const isSectionOpen = IS_WEB || expandedCardSections[sectionKey] !== false;
                          const content = currentBuild.itemSwaps.map((swap, swapIdx) => {
                            const itemName = swap.item && (swap.item.name || swap.item.internalName);
                            const iconPath = swap.item && (swap.item.icon || swap.item.internalName || swap.item.name);
                            const isUrl = typeof iconPath === 'string' && (iconPath.startsWith('http://') || iconPath.startsWith('https://'));
                            const localIcon = !isUrl && iconPath ? getLocalItemIcon(iconPath) : null;
                            let iconEl = null;
                            if (swap.item && (isUrl || localIcon)) {
                              iconEl = isUrl ? <Image source={{ uri: swap.item.icon }} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" /> : <Image source={localIcon.primary || localIcon} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" />;
                            } else if (itemName) {
                              try {
                                const meta = findItem(itemName);
                                const li = meta && meta.icon ? getLocalItemIcon(meta.icon) : null;
                                if (li) iconEl = <Image source={li.primary || li} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" />;
                              } catch (_) {}
                            }
                            return (
                              <View key={swapIdx} style={styles.tipItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                  {iconEl}
                                  <View style={{ flex: 1 }}>
                                    {itemName && <Text style={styles.tipTitle}>{itemName}</Text>}
                                    {swap.reasoning && <Text style={styles.tipValue}>{swap.reasoning}</Text>}
                                  </View>
                                </View>
                              </View>
                            );
                          });
                          return (
                            <View style={styles.expand}>
                              {IS_WEB ? (
                                <>
                                  <Text style={styles.expandTitle}>Item Swaps</Text>
                                  {content}
                                </>
                              ) : (
                                <>
                                  <TouchableOpacity onPress={() => setExpandedCardSections(prev => ({ ...prev, [sectionKey]: !isSectionOpen }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSectionOpen ? 12 : 0 }}>
                                    <Text style={styles.expandTitle}>Item Swaps</Text>
                                    <Text style={{ color: '#7dd3fc', fontSize: 14 }}>{isSectionOpen ? '▼' : '▶'}</Text>
                                  </TouchableOpacity>
                                  {isSectionOpen ? content : null}
                                </>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          )}
          
          {/* YouTube Channels Section - Only show on Community tab */}
          {buildCategory === 'community' && (
            <View style={styles.youtubeChannelsSection}>
              <Text style={styles.youtubeChannelsTitle}>YouTube Guides & Content</Text>
              <ScrollView 
                style={styles.youtubeChannelsContainer}
                contentContainerStyle={styles.youtubeChannelsContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* SMITE Mentors */}
                <View style={styles.channelProfileCard}>
                  <View style={styles.channelProfileContent}>
                    <View style={styles.channelAvatarContainer}>
                      <Image
                        source={{ uri: 'https://yt3.googleusercontent.com/2XgpF5D7qs8oQVMu6Y7pL1zGUrBRtczUH5XmIwm8WnJAEVNIs60DAR1cO-_WT31ZzIz11XpMfPE=s160-c-k-c0x00ffffff-no-rj' }}
                        style={styles.channelAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel="SMITE Mentors channel avatar"
                      />
                    </View>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>SMITE Mentors</Text>
                      <Text style={styles.channelHandle}>@SMITEMentors</Text>
                      <View style={styles.channelStats}>
                        <Text style={styles.channelSubscribers}>29 subscribers</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.openChannelButton}
                    onPress={() => Linking.openURL('https://www.youtube.com/@SMITEMentors/videos')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openChannelButtonText}>Open Channel in YouTube</Text>
                  </TouchableOpacity>
                  <View style={styles.channelDescription}>
                    <Text style={styles.channelDescriptionText}>
                      Watch guides and tutorials from the SMITE Mentors team. Learn from experienced players and improve your gameplay.
                    </Text>
                  </View>
                </View>

                {/* Snaddyyy */}
                <View style={styles.channelProfileCard}>
                  <View style={styles.channelProfileContent}>
                    <View style={styles.channelAvatarContainer}>
                      <Image
                        source={{ uri: 'https://yt3.googleusercontent.com/5M8q1zJMm0dYEXgYbMv8kS2c3OQs65yMNdPQ3AaYBk92dGF9WuqraqrBP4FmvrIDGoINFpx-SQ=s160-c-k-c0x00ffffff-no-rj' }}
                        style={styles.channelAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel="Snaddyyy channel avatar"
                      />
                    </View>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>Snaddyyy</Text>
                      <Text style={styles.channelHandle}>@Snaddyyy</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.openChannelButton}
                    onPress={() => Linking.openURL('https://www.youtube.com/@Snaddyyy/videos')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openChannelButtonText}>Open Channel in YouTube</Text>
                  </TouchableOpacity>
                  <View style={styles.channelDescription}>
                    <Text style={styles.channelDescriptionText}>
                      Some SMITE, playing Poe 2, LoL, Wiz101 among other things!
                    </Text>
                  </View>
                </View>

                {/* Weak3n */}
                <View style={styles.channelProfileCard}>
                  <View style={styles.channelProfileContent}>
                    <View style={styles.channelAvatarContainer}>
                      <Image
                        source={{ uri: 'https://yt3.googleusercontent.com/ytc/AIdro_n7rSS9O_T25aptb33yYjBr7l8e9VPEavnSYK8prhwcl-E=s160-c-k-c0x00ffffff-no-rj' }}
                        style={styles.channelAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel="Weak3n channel avatar"
                      />
                    </View>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>Weak3n</Text>
                      <Text style={styles.channelHandle}>@weak3n</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.openChannelButton}
                    onPress={() => Linking.openURL('https://www.youtube.com/weak3n/videos')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openChannelButtonText}>Open Channel in YouTube</Text>
                  </TouchableOpacity>
                  <View style={styles.channelDescription}>
                    <Text style={styles.channelDescriptionText}>
                      My name is Kurt. I played Smite professionally for 8 years and now I do my best to help you get better and provide you with quality content! I try to create content based on my life and any other games I jump in to!
                    </Text>
                  </View>
                </View>

                {/* Inbowned */}
                <View style={styles.channelProfileCard}>
                  <View style={styles.channelProfileContent}>
                    <View style={styles.channelAvatarContainer}>
                      <Image
                        source={{ uri: 'https://yt3.googleusercontent.com/ytc/AIdro_lalSvCUULC3MJ3WrwqFFY5NjamgZj-gHtrOnzMevI8kw=s160-c-k-c0x00ffffff-no-rj' }}
                        style={styles.channelAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel="Inbowned channel avatar"
                      />
                    </View>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>Inbowned</Text>
                      <Text style={styles.channelHandle}>@inbowned</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.openChannelButton}
                    onPress={() => Linking.openURL('https://www.youtube.com/inbowned/videos')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openChannelButtonText}>Open Channel in YouTube</Text>
                  </TouchableOpacity>
                  <View style={styles.channelDescription}>
                    <Text style={styles.channelDescriptionText}>
                      Ex Smite pro player and caster, current streamer and enjoyer of sports!
                    </Text>
                  </View>
                </View>

                {/* IcyyCold */}
                <View style={styles.channelProfileCard}>
                  <View style={styles.channelProfileContent}>
                    <View style={styles.channelAvatarContainer}>
                      <Image
                        source={{ uri: 'https://yt3.googleusercontent.com/nsJHCAtwZ6dKz0huoaJQm7qzt_T9FSVz9CYRR0sWODUh3mDtX-EcfNmxOOVsoGOAZfvNC-3S=s160-c-k-c0x00ffffff-no-rj' }}
                        style={styles.channelAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel="IcyyCold channel avatar"
                      />
                    </View>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>IcyyCold</Text>
                      <Text style={styles.channelHandle}>@IcyyCold</Text>
                      <Text style={styles.channelDescriptionText}>Smite 2 Top 10 Ranked Deity Jungler making Play-By-Play videos! I stream 12 hours every day on Twitch!</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.openChannelButton}
                    onPress={() => Linking.openURL('https://www.youtube.com/channel/UCdDMqqLAonqVsFBFJqMkDpg/videos')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openChannelButtonText}>Open Channel in YouTube</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
        </>
      )}

      {/* Random Item Tooltip Modal */}
      <Modal
        visible={selectedRandomItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRandomItem(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedRandomItem(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedRandomItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {selectedRandomItem.item && selectedRandomItem.item.icon ? (() => {
                      const localIcon = getLocalItemIcon(selectedRandomItem.item.icon);
                      if (localIcon) {
                        const imageSource = localIcon.primary || localIcon;
                        const fallbackSource = localIcon.fallback;
                        const itemKey = `modal-${selectedRandomItem.itemName}`;
                        const useFallback = failedItemIcons[itemKey];
                        
                        if (fallbackSource && !useFallback) {
                          return (
                            <Image 
                              source={imageSource}
                              style={styles.modalAbilityIcon}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                              onError={() => {
                                setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                              }}
                            />
                          );
                        }
                        if (fallbackSource && useFallback) {
                          return (
                            <Image 
                              source={fallbackSource}
                              style={styles.modalAbilityIcon}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                              accessibilityLabel={`${selectedRandomItem.itemName} item icon`}
                            />
                          );
                        }
                        return (
                          <Image 
                            source={imageSource}
                            style={styles.modalAbilityIcon}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            accessibilityLabel={`${selectedRandomItem.itemName} item icon`}
                          />
                        );
                      }
                      return (
                        <View style={styles.modalAbilityIconFallback}>
                          <Text style={styles.modalAbilityIconFallbackText}>
                            {selectedRandomItem.itemName.charAt(0)}
                          </Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.modalAbilityIconFallback}>
                        <Text style={styles.modalAbilityIconFallbackText}>
                          {selectedRandomItem.itemName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>
                    {selectedRandomItem.item ? (selectedRandomItem.item.name || selectedRandomItem.itemName) : selectedRandomItem.itemName}
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedRandomItem(null)}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {selectedRandomItem.item && selectedRandomItem.item.tier && (
                    <Text style={styles.modalTier}>Tier {selectedRandomItem.item.tier} Item</Text>
                  )}

                  {selectedRandomItem.item && selectedRandomItem.item.totalCost && (
                    <Text style={[styles.modalCost, { color: '#fbbf24', fontWeight: '700' }]}>
                      Cost: {selectedRandomItem.item.totalCost} Gold
                    </Text>
                  )}

                  {selectedRandomItem.item && selectedRandomItem.item.stats && (
                    <View style={styles.modalStats}>
                      <Text style={styles.modalStatsTitle}>Stats:</Text>
                      {Object.keys(selectedRandomItem.item.stats).map((statKey) => {
                        const statValue = selectedRandomItem.item.stats[statKey];
                        let statColor = '#94a3b8';
                        if (["MaxHealth", "Health", "HP5", "Health Regen"].includes(statKey)) statColor = "#22c55e";
                        else if (["AttackSpeed", "Critical Chance", "CriticalChance", "Critical Damage", "Attack Speed","Basic Attack Damage", "Criticial Chance", "Critical Damage", "Basic Damage"].includes(statKey)) statColor = "#f97316";
                        else if (["PhysicalProtection", "Penetration", "Physical Protection"].includes(statKey)) statColor = "#ef4444";
                        else if (statKey === "Intelligence") statColor = "#a855f7";
                        else if (statKey === "Strength") statColor = "#facc15";
                        else if (statKey === "Cooldown Rate") statColor = "#0ea5e9";
                        else if (statKey === "MagicalProtection") statColor = "#a855f7";
                        else if (statKey === "Lifesteal") statColor = "#84cc16";
                        else if (["MaxMana", "MP5", "Mana Regen", "Mana", "Mana Regeneration", "Magical Protection"].includes(statKey)) statColor = "#3b82f6";
                        
                        return (
                          <View key={statKey} style={styles.modalStatRow}>
                            <Text style={[styles.modalStatLabel, { color: statColor }]}>{statKey}:</Text>
                            <Text style={styles.modalStatValue}>
                              {typeof statValue === 'object' ? JSON.stringify(statValue) : statValue}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {selectedRandomItem.item && selectedRandomItem.item.passive && (
                    <View style={styles.modalPassiveContainer}>
                      <Text style={styles.modalPassiveTitle}>Passive:</Text>
                      <Text style={styles.modalDescription}>
                        {selectedRandomItem.item.passive}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Item Tooltip Modal */}
      <Modal
        visible={selectedItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedItem(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {selectedItem.item && selectedItem.item.icon ? (() => {
                      const localIcon = getLocalItemIcon(selectedItem.item.icon);
                      if (localIcon) {
                        // Handle both single URI and primary/fallback object
                        const imageSource = localIcon.primary || localIcon;
                        const fallbackSource = localIcon.fallback;
                        const itemKey = `modal-${selectedItem.itemName}`;
                        const useFallback = failedItemIcons[itemKey];
                        
                        if (fallbackSource && !useFallback) {
                          // Has fallback - try primary first, then fallback on error
                          return (
                            <Image 
                              source={imageSource}
                              style={styles.modalAbilityIcon}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                              onError={() => {
                                setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                              }}
                            />
                          );
                        }
                        
                        if (fallbackSource && useFallback) {
                          // Use fallback after primary failed
                          return (
                            <Image 
                              source={fallbackSource}
                              style={styles.modalAbilityIcon}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                              accessibilityLabel={`${selectedItem.itemName} item icon`}
                            />
                          );
                        }
                        
                        // Single URI - use directly
                        return (
                          <Image 
                            source={imageSource}
                            style={styles.modalAbilityIcon}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            accessibilityLabel={`${selectedItem.itemName} item icon`}
                          />
                        );
                      }
                      return (
                        <View style={styles.modalAbilityIconFallback}>
                          <Text style={styles.modalAbilityIconFallbackText}>
                            {selectedItem.itemName.charAt(0)}
                          </Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.modalAbilityIconFallback}>
                        <Text style={styles.modalAbilityIconFallbackText}>
                          {selectedItem.itemName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>
                    {selectedItem.item ? (selectedItem.item.name || selectedItem.itemName) : selectedItem.itemName}
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedItem(null)}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {selectedItem.item && selectedItem.item.tier && (
                    <Text style={styles.modalTier}>Tier {selectedItem.item.tier} Item</Text>
                  )}

                  {selectedItem.item && selectedItem.item.totalCost && (
                    <Text style={[styles.modalCost, { color: '#fbbf24', fontWeight: '700' }]}>
                      Cost: {selectedItem.item.totalCost} Gold
                    </Text>
                  )}

                  {selectedItem.item && selectedItem.item.stats && (
                    <View style={styles.modalStats}>
                      <Text style={styles.modalStatsTitle}>Stats:</Text>
                      {Object.keys(selectedItem.item.stats).map((statKey) => {
                        const statValue = selectedItem.item.stats[statKey];
                        // Color code stat labels based on stat type
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
                          <View key={statKey} style={styles.modalStatRow}>
                            <Text style={[styles.modalStatLabel, { color: statColor }]}>{statKey}:</Text>
                            <Text style={styles.modalStatValue}>
                              {typeof statValue === 'object' ? JSON.stringify(statValue) : statValue}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {selectedItem.item && selectedItem.item.passive && (
                    <View style={styles.modalPassiveContainer}>
                      <Text style={styles.modalPassiveTitle}>Passive:</Text>
                      <Text style={styles.modalDescription}>
                        {selectedItem.item.passive}
                      </Text>
                    </View>
                  )}

                

  
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Ability Tooltip Modal */}
      <Modal
        visible={selectedAbility !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAbility(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedAbility(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedAbility && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {selectedAbility.ability && selectedAbility.ability.icon ? (() => {
                      const iconPath = selectedAbility.ability.icon;
                      const localIcon = getLocalGodAsset(iconPath);
                      if (localIcon) {
                        return (
                      <Image 
                            source={localIcon} 
                        style={styles.modalAbilityIcon}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        accessibilityLabel={`${selectedAbility.abilityName || 'Ability'} icon`}
                      />
                        );
                      }
                      // Fallback to text if local icon not found
                      return (
                        <View style={styles.modalAbilityIconFallback}>
                          <Text style={styles.modalAbilityIconFallbackText}>
                            {selectedAbility.abilityName.charAt(0)}
                          </Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.modalAbilityIconFallback}>
                        <Text style={styles.modalAbilityIconFallbackText}>
                          {selectedAbility.abilityName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>{selectedAbility.abilityName}</Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedAbility(null)}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  nestedScrollEnabled={true}
                >
                  {selectedAbility.ability && selectedAbility.ability.scales && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Scales</Text>
                      <ScrollView 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={{ maxHeight: 200 }}
                      >
                        <Text style={styles.modalScales}>{String(selectedAbility.ability.scales)}</Text>
                      </ScrollView>
                    </View>
                  )}
                  
                  {(selectedAbility.ability && (selectedAbility.ability.shortDesc || selectedAbility.ability.description)) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Description</Text>
                      <ScrollView 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={{ maxHeight: 300 }}
                      >
                        <Text style={styles.modalDescription}>
                          {selectedAbility.ability.shortDesc || selectedAbility.ability.description}
                        </Text>
                      </ScrollView>
                    </View>
                  )}

                  {selectedAbility.ability && selectedAbility.ability.valueKeys && typeof selectedAbility.ability.valueKeys === 'object' && Object.keys(selectedAbility.ability.valueKeys).length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Stats</Text>
                      <ScrollView 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={{ maxHeight: 200 }}
                      >
                        <View style={styles.modalStats}>
                          {Object.keys(selectedAbility.ability.valueKeys).map((statKey) => {
                            const statValue = selectedAbility.ability.valueKeys[statKey];
                            if (!statValue || (Array.isArray(statValue) && statValue.length === 0)) return null;
                            return (
                              <View key={statKey} style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>{statKey}:</Text>
                                <Text style={styles.modalStatValue}>
                                  {Array.isArray(statValue) ? statValue.join(', ') : String(statValue)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tip Tooltip Modal */}
      <Modal
        visible={selectedTip !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedTip(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedTip(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedTip && selectedTip.tip && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <View style={styles.modalAbilityIconFallback}>
                      <Text style={styles.modalAbilityIconFallbackText}>
                        {selectedTip.tipIndex}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.modalTitle}>
                    {selectedTip.tip.title || `Tip ${selectedTip.tipIndex}`}
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedTip(null)}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  nestedScrollEnabled={true}
                >
                  {selectedTip.tip.value && (
                    <Text style={styles.modalDescription}>
                      {String(selectedTip.tip.value)}
                    </Text>
                  )}
                </ScrollView>
              </>
            )}
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
          style={styles.modalOverlay}
          onPress={() => {
            setShowLoginModal(false);
            setLoginUsername('');
            setLoginPassword('');
          }}
        >
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Sign In</Text>
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
                    const supabaseClient = getSupabase();
                    
                    if (supabaseClient && supabaseClient.from) {
                      const { data, error } = await supabaseClient
                        .from('app_users')
                        .select('username, password_hash')
                        .eq('username', loginUsername.trim())
                        .single();
                      
                      if (error && error.code === 'MISSING_CONFIG') {
                        // Try local storage
                        const localUser = await storage.getItem(`user_${loginUsername.trim()}`);
                        if (localUser) {
                          const userData = JSON.parse(localUser);
                          if (userData.password_hash === passwordHash) {
                            await storage.setItem('currentUser', loginUsername.trim());
                            setCurrentUser(loginUsername.trim());
                            setShowLoginModal(false);
                            setLoginUsername('');
                            setLoginPassword('');
                            Alert.alert('Success', 'Logged in successfully!');
                            setIsLoggingIn(false);
                            // Reload page to refresh state
                            if (IS_WEB && typeof window !== 'undefined') {
                              window.location.reload();
                            }
                            return;
                          }
                        }
                        Alert.alert('Error', 'Invalid username or password');
                      } else if (error || !data) {
                        // Try local storage as fallback
                        const localUser = await storage.getItem(`user_${loginUsername.trim()}`);
                        if (localUser) {
                          const userData = JSON.parse(localUser);
                          if (userData.password_hash === passwordHash) {
                            await storage.setItem('currentUser', loginUsername.trim());
                            setCurrentUser(loginUsername.trim());
                            setShowLoginModal(false);
                            setLoginUsername('');
                            setLoginPassword('');
                            Alert.alert('Success', 'Logged in successfully!');
                            setIsLoggingIn(false);
                            // Reload page to refresh state
                            if (IS_WEB && typeof window !== 'undefined') {
                              window.location.reload();
                            }
                            return;
                          }
                        }
                        Alert.alert('Error', 'Invalid username or password');
                      } else if (data && data.password_hash === passwordHash) {
                        await storage.setItem('currentUser', loginUsername.trim());
                        setCurrentUser(loginUsername.trim());
                        setShowLoginModal(false);
                        setLoginUsername('');
                        setLoginPassword('');
                        Alert.alert('Success', 'Logged in successfully!');
                        setIsLoggingIn(false);
                        // Reload page to refresh state
                        if (IS_WEB && typeof window !== 'undefined') {
                          window.location.reload();
                        }
                        return;
                      } else {
                        Alert.alert('Error', 'Invalid username or password');
                      }
                    } else {
                      Alert.alert('Error', 'Unable to connect. Please try again later.');
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
                  <Text style={styles.loginConfirmButtonText}>Sign In</Text>
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

      {/* Trademark Footer */}
      <View style={styles.trademarkFooter}>
        <Text style={styles.trademarkText}>
          SMITE 2 is a registered trademark of Hi-Rez Studios. Trademarks are the property of their respective owners. Game materials copyright Hi-Rez Studios. Hi-Rez Studios has not endorsed and is not responsible for this site or its content.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#071024',
    padding: 20,
    paddingTop: 36,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 20,
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSub: {
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  tabButtons: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
    justifyContent: 'center',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#0b1226',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 80,
  },
  tabButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  guidesContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  guidesContentContainer: {
    padding: 20,
  },
  channelProfileCard: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  channelProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  channelAvatarContainer: {
    marginRight: 16,
  },
  channelAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a1a2e',
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  channelHandle: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 6,
    opacity: 0.9,
  },
  channelStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelSubscribers: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.8,
  },
  openChannelButton: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  openChannelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  channelDescription: {
    marginTop: 8,
  },
  channelDescriptionText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  youtubeChannelsSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  youtubeChannelsTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  youtubeChannelsContainer: {
    flex: 1,
  },
  youtubeChannelsContentContainer: {
    paddingBottom: 20,
    gap: 16,
  },
  meetContributorsSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  meetContributorsTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  contributorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: IS_WEB ? 20 : 10,
  },
  contributorCard: {
    alignItems: 'center',
    width: IS_WEB ? 100 : 80,
    marginBottom: 12,
  },
  contributorIconContainer: {
    width: IS_WEB ? 80 : 64,
    height: IS_WEB ? 80 : 64,
    marginBottom: 8,
    borderRadius: IS_WEB ? 40 : 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1e90ff',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorIconImage: {
    width: IS_WEB ? 80 : 64,
    height: IS_WEB ? 80 : 64,
  },
  contributorIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorIconPlaceholderText: {
    color: '#60a5fa',
    fontSize: IS_WEB ? 32 : 24,
    fontWeight: '700',
  },
  contributorName: {
    color: '#f8fafc',
    fontSize: IS_WEB ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '100%',
  },
  controls: {
    marginBottom: 12,
    zIndex: 20,
    position: 'relative',
  },
  search: {
    backgroundColor: '#06202f',
    color: '#e6eef8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterButtonContainer: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    minWidth: 80,
    maxWidth: '48%',
  },
  filterButton: {
    backgroundColor: '#06202f',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 80,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  filterButtonText: {
    color: '#e6eef8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
  },
  filterButtonIcon: {
    color: '#e6eef8',
    fontSize: 9,
    width: 10,
    textAlign: 'right',
    marginLeft: 4,
    flexShrink: 0,
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#0b1226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  filterDropdownScroll: {
    maxHeight: 200,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  filterOptionActive: {
    backgroundColor: '#1e90ff',
  },
  filterOptionText: {
    color: '#e6eef8',
    fontSize: 12,
    fontWeight: '500',
  },
  filterOptionIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  buildCategoryFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  buildCategoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#06202f',
    borderWidth: 2,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  buildCategoryButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buildCategoryText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buildCategoryTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  categorySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cred: {
    backgroundColor: '#031320',
    color: '#cbd5e1',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 80,
  },
  btn: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  content: { flex: 1, marginTop: 8, zIndex: 0 },
  side: { width: 0, marginRight: 0 },
  sideTitle: { color: '#cbd5e1', fontWeight: '700', marginBottom: 8 },
  itemList: { display: 'none' },
  itemRow: { display: 'none' },
  main: { flex: 1 },
  muted: { color: '#64748b' },
  error: { color: '#fb7185' },
  cardGrid: { flexDirection: 'column', paddingBottom: 24 },
  card: {
    backgroundColor: '#0b1226',
    width: '100%',
    marginVertical: 10,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: { width: 56, height: 56, backgroundColor: '#0f1724', borderRadius: 6, marginRight: 10 },
  cardBody: { flex: 1 },
  cardExpandedContent: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { 
    color: '#e6eef8', 
    fontWeight: '900', 
    fontSize: 22,
    letterSpacing: 0.5,
    flex: 1,
  },
  pinButton: {
    padding: 4,
    borderRadius: 4,
  },
  pinButtonText: {
    fontSize: 18,
  },
  expandIndicator: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardItems: { color: '#9fb0d8', marginTop: 6, fontSize: 12 },
  buildRow: { 
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  buildLabel: { 
    color: '#7dd3fc', 
    fontWeight: '700', 
    fontSize: 13,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buildIcons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOuterBorder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#2a4a6a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  iconInnerBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#071024',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f1724',
  },
  iconWrap: { 
    marginRight: 8,
  },
  iconImg: { 
    width: 38, 
    height: 38, 
    resizeMode: 'cover' 
  },
  iconFallback: { 
    width: 38,
    height: 38,
    backgroundColor: '#0f1724',
  },
  iconFallbackText: { 
    color: '#9fb0d8', 
    fontSize: 9, 
    textAlign: 'center',
    fontWeight: '600',
  },
  smallIconWrap: { 
    paddingHorizontal: 6, 
    paddingVertical: 4, 
    backgroundColor: '#031320', 
    borderRadius: 6, 
    marginRight: 6 
  },
  smallIconText: { 
    color: '#cbd5e1', 
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallIconSlot: { 
    marginRight: 8,
  },
  iconWithBadgeWrapper: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(250, 204, 21, 0.6)',
    borderRadius: 10,
    padding: 2,
  },
  itemNumberBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberBadgeText: {
    color: '#fefce8',
    fontSize: 10,
    fontWeight: '800',
  },
  smallIconImg: { 
    width: 32, 
    height: 32, 
    resizeMode: 'cover' 
  },
  cardLeft: { 
    width: 90, 
    alignItems: 'center', 
    justifyContent: 'flex-start',
  },
  godIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    padding: 3,
    backgroundColor: '#0f1724',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 8,
  },
  godIcon: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 12,
  },
  godFallback: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#0f1724', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 8,
  },
  godFallbackText: { 
    color: '#e6eef8', 
    fontWeight: '700', 
    fontSize: 24,
  },
  patchBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  patchBadgeBuffed: {
    backgroundColor: '#22c55e',
  },
  patchBadgeNerfed: {
    backgroundColor: '#ef4444',
  },
  patchBadgeShifted: {
    backgroundColor: '#fbbf24',
  },
  patchBadgeNew: {
    backgroundColor: '#8b5cf6',
  },
  patchBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  patchBadgeSmall: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 3,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContent: {
    backgroundColor: '#0b1226',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  tooltipText: {
    color: '#e6eef8',
    fontSize: 14,
    lineHeight: 20,
  },
  tooltipCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipCloseText: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
  },
  expand: { marginTop: 10, backgroundColor: '#061028', padding: 12, borderRadius: 8 },
  expandTitle: { color: '#e6eef8', fontWeight: '800', marginBottom: 12, fontSize: 16 },
  tipItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  tipTitle: {
    color: '#7dd3fc',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  tipValue: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  buildRolesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  buildRolesLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  buildRolesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  buildRoleTag: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buildRoleTagText: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '600',
  },
  buildTipsText: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 14 : 13,
    lineHeight: IS_WEB ? 20 : 18,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  noTipsText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  tipButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tipButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1e90ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b9eff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  tipButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  tipsSwapsButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0f1724',
  },
  tipsSwapsButtonActive: {
    borderColor: '#7dd3fc',
    backgroundColor: '#0c4a6e',
  },
  tipsSwapsButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  tipsSwapsButtonTextActive: {
    color: '#e0f2fe',
  },
  abilityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  abilityIcon: { width: 44, height: 44, borderRadius: 6 },
  abilityIconFallback: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#0f1724', alignItems: 'center', justifyContent: 'center' },
  abilityIconFallbackText: { color: '#e6eef8', fontWeight: '700' },
  abilityName: { color: '#ffffff', fontWeight: '700' },
  abilityDesc: { color: '#e6eef8', fontSize: 12, marginTop: 2 },
  emptySlot: { 
    width: 44, 
    height: 44, 
    marginRight: 8, 
    borderRadius: 8, 
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
  },
  buildTabs: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  buildTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#031320',
    borderWidth: 1,
    borderColor: '#06202f',
  },
  buildTabActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  buildTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  buildTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  buildTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#9b760b',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1e90ff',
    lineHeight: 20,
  },
  buildShareButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buildShareButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  buildAuthor: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 4,
  },
  buildAuthorContributors: {
    color: '#10b981',
    fontWeight: '600',
  },
  certificationRequestContainer: {
    marginTop: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  certificationRequestButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  certificationRequestButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  certificationStatusContainer: {
    backgroundColor: '#0b1226',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  certificationStatusText: {
    color: '#e6eef8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  certificationStatusSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  abilityIconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  abilityIconButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#071024',
  },
  abilityIconCompact: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  abilityIconFallbackCompact: {
    width: 48,
    height: 48,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  abilityIconFallbackTextCompact: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 18,
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
      zIndex: 1000,
    }),
  },
  modalContent: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  modalIconContainer: {
    marginRight: 12,
  },
  modalAbilityIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  modalAbilityIconFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAbilityIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 24,
  },
  modalTitle: {
    flex: 1,
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
  },
  // Login Modal Title (matching profile.jsx)
  loginModalTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#e6eef8',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  modalBody: {
    maxHeight: 500,
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  modalSectionTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalScales: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  modalDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalStats: {
    marginTop: 8,
  },
  modalStatRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  modalStatLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 120,
  },
  modalStatValue: {
    color: '#e6eef8',
    fontSize: 12,
    flex: 1,
  },
  modalTier: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalCost: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalStatsTitle: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  modalPassiveContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  modalPassiveTitle: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalTagsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  modalTagsTitle: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalTag: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalTagText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500',
  },
  modalInternalName: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  aspectContainer: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#061028',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  aspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aspectIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  aspectIconFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aspectIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 18,
  },
  aspectInfo: {
    flex: 1,
  },
  aspectName: {
    color: '#e6eef8',
    fontSize: 14,
    fontWeight: '700',
  },
  aspectActiveBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#64748b',
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  aspectActiveBadgeOn: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  aspectActiveBadgeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  aspectActiveBadgeTextOn: {
    color: '#22c55e',
  },
  levelingOrderContainer: {
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#061028',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  levelingOrderLabel: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  levelingOrderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  levelingOrderArrow: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  levelingOrderIconWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  levelingOrderIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  levelingOrderIconFallback: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelingOrderIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 14,
  },
  levelingOrderNumber: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#64748b',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 16,
    borderWidth: 1,
    borderColor: '#0b1226',
  },
  levelingOrderFirstBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10b981',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0b1226',
  },
  levelingOrderFirstBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  trademarkFooter: {
    padding: 1,
    backgroundColor: '#0b1226',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  trademarkText: {
    color: '#64748b',
    fontSize: 6,
    lineHeight: 8,
    textAlign: 'center',
  },
  // Login Modal Styles (matching profile.jsx for consistency)
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
  loginInput: {
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
  loginModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  loginCancelButton: {
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
  loginCancelButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  loginConfirmButton: {
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
  loginConfirmButtonDisabled: {
    opacity: 0.6,
    ...(IS_WEB && {
      cursor: 'not-allowed',
    }),
  },
  loginConfirmButtonText: {
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
  emptyCommunityContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyCommunityText: {
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCommunitySubtext: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  createFirstBuildButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createFirstBuildButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  postYourBuildButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postYourBuildButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  communityButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  communityButton: {
    flex: 1,
  },
  refreshCommunityButton: {
    backgroundColor: '#64748b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  refreshCommunityButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  communityButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  communityButton: {
    flex: 1,
  },
  refreshCommunityButton: {
    backgroundColor: '#64748b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  refreshCommunityButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#64748b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

// Main App Component with Navigation
export default function App() {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  
  // Web-only effects - hide scrollbars and disable dev tools
  useEffect(() => {
    if (IS_WEB && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  // Disable browser inspection on web
  useEffect(() => {
    if (IS_WEB && typeof document !== 'undefined' && typeof window !== 'undefined') {
      // Disable right-click context menu
      const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable keyboard shortcuts for dev tools (using modern key property)
      const handleKeyDown = (e) => {
        // Disable F12
        if (e.key === 'F12' || e.keyCode === 123) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+I (Chrome DevTools)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
          e.preventDefault();
          return false;
        } 
        // Disable Ctrl+Shift+J (Chrome Console)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
          e.preventDefault();
          return false; 
        }
        // Disable Ctrl+Shift+C (Chrome Element Inspector)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+U (View Source)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83) && !e.shiftKey) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+P (Print)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+K (Firefox Console)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.keyCode === 75)) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+E (Firefox Network Monitor)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e' || e.keyCode === 69)) {
          e.preventDefault();
          return false;
        }
      };

      // Disable text selection
      const handleSelectStart = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable drag
      const handleDragStart = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable copy
      const handleCopy = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable cut
      const handleCut = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable paste
      const handlePaste = (e) => {
        e.preventDefault();
        return false;
      };

      // Add event listeners with capture phase for better blocking
      document.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false });
      document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
      document.addEventListener('selectstart', handleSelectStart, { capture: true, passive: false });
      document.addEventListener('dragstart', handleDragStart, { capture: true, passive: false });
      document.addEventListener('copy', handleCopy, { capture: true, passive: false });
      document.addEventListener('cut', handleCut, { capture: true, passive: false });
      document.addEventListener('paste', handlePaste, { capture: true, passive: false });

      // Disable dev tools detection
      let devtools = { open: false };
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: function() {
          devtools.open = true;
        }
      });

      // Check for dev tools periodically
      const checkDevTools = setInterval(() => {
        devtools.open = false;
        console.log(element);
        console.clear();
        if (devtools.open) {
          // Dev tools detected
          console.clear();
        }
      }, 1000);

      // Disable console methods
      const noop = () => {};
      const originalConsole = { ...console };
      console.log = noop;
      console.warn = noop;
      console.error = noop;
      console.info = noop;
      console.debug = noop;
      console.table = noop;
      console.trace = noop;
      console.group = noop;
      console.groupEnd = noop;
      console.time = noop;
      console.timeEnd = noop;

      // Cleanup function
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
        document.removeEventListener('selectstart', handleSelectStart, { capture: true });
        document.removeEventListener('dragstart', handleDragStart, { capture: true });
        document.removeEventListener('copy', handleCopy, { capture: true });
        document.removeEventListener('cut', handleCut, { capture: true });
        document.removeEventListener('paste', handlePaste, { capture: true });
        clearInterval(checkDevTools);
        // Restore console
        Object.assign(console, originalConsole);
      };
    }
  }, []);


  const [currentPage, setCurrentPage] = useState('homepage');
  const [godFromBuilds, setGodFromBuilds] = useState(null);
  const [expandAbilities, setExpandAbilities] = useState(false);
  const [dataPageKey, setDataPageKey] = useState(0);
  const [buildToEdit, setBuildToEdit] = useState(null); // Build data for editing
  const [mybuildsRefreshKey, setMybuildsRefreshKey] = useState(0); // Increment after contributor edit so My Builds remounts and reloads
  // Sub-navigation states
  const [databaseSubTab, setDatabaseSubTab] = useState('gods'); // 'gods', 'items', 'gamemodes', 'mechanics'
  const [buildsSubTab, setBuildsSubTab] = useState('featured'); // 'featured', 'contributors', 'community', 'all', 'guides', 'custom', 'mybuilds', 'tierlist'
  const [patchHubSubTab, setPatchHubSubTab] = useState('simple'); // 'simple', 'catchup', 'archive'
  const [moreSubTab, setMoreSubTab] = useState('minigames'); // 'minigames', 'profile', 'shop', 'tools'
  const [viewingUserProfile, setViewingUserProfile] = useState(null); // Username of user profile to view
  const [currentUser, setCurrentUser] = useState(null); // Logged-in username for Shop/Profile (read from storage)
  useEffect(() => {
    storage.getItem('currentUser').then((u) => setCurrentUser(u || null));
  }, []);

 

  return (
    <View style={navStyles.outerContainer}>
      <ScrollView 
        style={navStyles.outerScrollView}
        contentContainerStyle={navStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={navStyles.container}>
          <View style={navStyles.navBar}>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'data' && navStyles.navButtonActive]}
          onPress={() => {
            setCurrentPage('data');
            // Force remount of DataPage by changing key
            if (currentPage !== 'data') {
              setDataPageKey(prev => prev + 1);
            }
          }}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'data' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            📚 Database
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'builds' && navStyles.navButtonActive]}
          onPress={() => {
            startTransition(() => {
              setCurrentPage('builds');
            });
          }}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'builds' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            🛠️ Builds
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'homepage' && navStyles.navButtonActive]}
          onPress={() => {
            startTransition(() => {
              setCurrentPage('homepage');
            });
          }}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'homepage' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            🏠 Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'patchhub' && navStyles.navButtonActive]}
          onPress={() => {
            startTransition(() => {
              setCurrentPage('patchhub');
            });
          }}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'patchhub' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            📰 Patch Hub
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'more' && navStyles.navButtonActive]}
          onPress={() => {
            startTransition(() => {
              setCurrentPage('more');
            });
          }}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'more' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            🎮 More
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Sub-navigation bars */}
      {currentPage === 'data' && (
        <View style={navStyles.subNavBar}>
          <TouchableOpacity
            style={[navStyles.subNavButton, databaseSubTab === 'gods' && navStyles.subNavButtonActive]}
            onPress={() => {
              setCurrentPage('data');
              setDatabaseSubTab('gods');
            }}
          >
            <Text style={[navStyles.subNavButtonText, databaseSubTab === 'gods' && navStyles.subNavButtonTextActive]}>
              Gods
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, databaseSubTab === 'items' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setCurrentPage('data');
                setDatabaseSubTab('items');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, databaseSubTab === 'items' && navStyles.subNavButtonTextActive]}>
              Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, databaseSubTab === 'gamemodes' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setCurrentPage('data');
                setDatabaseSubTab('gamemodes');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, databaseSubTab === 'gamemodes' && navStyles.subNavButtonTextActive]}>
              Game Modes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, databaseSubTab === 'mechanics' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setCurrentPage('data');
                setDatabaseSubTab('mechanics');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, databaseSubTab === 'mechanics' && navStyles.subNavButtonTextActive]}>
              Mechanics
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {(currentPage === 'builds' || currentPage === 'custombuild') && (
        <View style={navStyles.subNavBar}>
          <TouchableOpacity
            style={[
              navStyles.subNavButton, 
              (buildsSubTab === 'featured' || buildsSubTab === 'contributors' || buildsSubTab === 'community') && navStyles.subNavButtonActive
            ]}
            onPress={() => {
              startTransition(() => {
                setBuildsSubTab('featured');
                setCurrentPage('builds');
              });
            }}
          >
            <Text style={[
              navStyles.subNavButtonText, 
              (buildsSubTab === 'featured' || buildsSubTab === 'contributors' || buildsSubTab === 'community') && navStyles.subNavButtonTextActive
            ]}>
              Builds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, (buildsSubTab === 'custom' || currentPage === 'custombuild') && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setBuildsSubTab('custom');
                setCurrentPage('custombuild');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, (buildsSubTab === 'custom' || currentPage === 'custombuild') && navStyles.subNavButtonTextActive]}>
              Custom Builder
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, buildsSubTab === 'randomizer' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setBuildsSubTab('randomizer');
                setCurrentPage('builds');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, buildsSubTab === 'randomizer' && navStyles.subNavButtonTextActive]}>
              Randomizer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, buildsSubTab === 'mybuilds' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setBuildsSubTab('mybuilds');
                setCurrentPage('builds');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, buildsSubTab === 'mybuilds' && navStyles.subNavButtonTextActive]}>
              My Builds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, buildsSubTab === 'tierlist' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setBuildsSubTab('tierlist');
                setCurrentPage('builds');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, buildsSubTab === 'tierlist' && navStyles.subNavButtonTextActive]}>
              Tierlist
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {currentPage === 'patchhub' && (
        <View style={navStyles.subNavBar}>
          <TouchableOpacity
            style={[navStyles.subNavButton, patchHubSubTab === 'simple' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setPatchHubSubTab('simple');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, patchHubSubTab === 'simple' && navStyles.subNavButtonTextActive]}>
              Simple Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, patchHubSubTab === 'catchup' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setPatchHubSubTab('catchup');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, patchHubSubTab === 'catchup' && navStyles.subNavButtonTextActive]}>
              Catch Me Up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, patchHubSubTab === 'archive' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setPatchHubSubTab('archive');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, patchHubSubTab === 'archive' && navStyles.subNavButtonTextActive]}>
              Archive
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {currentPage === 'more' && (
        <View style={navStyles.subNavBar}>
          <TouchableOpacity
            style={[navStyles.subNavButton, moreSubTab === 'minigames' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setMoreSubTab('minigames');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, moreSubTab === 'minigames' && navStyles.subNavButtonTextActive]}>
              Mini Games
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, moreSubTab === 'profile' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setMoreSubTab('profile');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, moreSubTab === 'profile' && navStyles.subNavButtonTextActive]}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, moreSubTab === 'shop' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setMoreSubTab('shop');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, moreSubTab === 'shop' && navStyles.subNavButtonTextActive]}>
              Shop
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[navStyles.subNavButton, moreSubTab === 'tools' && navStyles.subNavButtonActive]}
            onPress={() => {
              startTransition(() => {
                setMoreSubTab('tools');
              });
            }}
          >
            <Text style={[navStyles.subNavButtonText, moreSubTab === 'tools' && navStyles.subNavButtonTextActive]}>
              Tools
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Home page */}
      {currentPage === 'homepage' && (
        <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
          <HomePage 
            setCurrentPage={setCurrentPage}
            setPatchHubSubTab={setPatchHubSubTab}
          />
        </Suspense>
      )}
      
      {/* Database page - show based on sub-tab */}
      {currentPage === 'data' && (
        <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
          <DataPage 
            key="data-page"
            initialSelectedGod={godFromBuilds} 
            initialExpandAbilities={expandAbilities}
            initialTab={databaseSubTab}
            onBackToBuilds={() => { 
              setGodFromBuilds(null); 
              setExpandAbilities(false);
              setCurrentPage('builds');
              setBuildsSubTab('community');
            }} 
          />
        </Suspense>
      )}
      
      {/* Builds pages - handle different sub-tabs */}
      {currentPage === 'builds' && (buildsSubTab === 'featured' || buildsSubTab === 'contributors' || buildsSubTab === 'community' || buildsSubTab === 'randomizer') && (
        <View style={navStyles.pageVisible} pointerEvents={currentPage === 'builds' ? 'auto' : 'none'}>
          <BuildsPage 
            key={`builds-page-${buildsSubTab}`}
            initialTab={buildsSubTab === 'randomizer' ? 'randomizer' : 'builds'}
            hideInternalTabs={true}
            initialBuildCategory={buildsSubTab === 'featured' ? 'featured' : buildsSubTab === 'contributors' ? 'contributors' : buildsSubTab === 'community' ? 'community' : 'featured'}
            onGodIconPress={(god, shouldExpandAbilities = false) => { 
              setGodFromBuilds(god); 
              setExpandAbilities(shouldExpandAbilities);
              setCurrentPage('data');
              setDatabaseSubTab('gods');
              setDataPageKey(prev => prev + 1);
            }}
            onNavigateToGod={(god) => {
              setGodFromBuilds(god);
              setCurrentPage('data');
              setDatabaseSubTab('gods');
              setDataPageKey(prev => prev + 1);
            }}
            onNavigateToCustomBuild={() => {
              setCurrentPage('custombuild');
              setBuildsSubTab('custom');
            }}
            onNavigateToUserProfile={(username) => {
              setCurrentPage('more');
              setMoreSubTab('profile');
              setViewingUserProfile(username);
            }}
          />
        </View>
      )}
      
      {currentPage === 'builds' && buildsSubTab === 'mybuilds' && (
        <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
          <MyBuildsPage 
            key={`mybuilds-${mybuildsRefreshKey}`}
            onEditBuild={(build) => {
              setCurrentPage('custombuild');
              setBuildsSubTab('custom');
              setBuildToEdit(build);
            }}
          />
        </Suspense>
      )}
      
      {/* Tierlist page - now part of builds category */}
      {currentPage === 'builds' && buildsSubTab === 'tierlist' && (
        <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
          <TierlistPage />
        </Suspense>
      )}
      
      {/* Custom Build page */}
      {(currentPage === 'custombuild' || (currentPage === 'builds' && buildsSubTab === 'custom')) && (
        <View style={navStyles.pageVisible} pointerEvents={(currentPage === 'custombuild' || (currentPage === 'builds' && buildsSubTab === 'custom')) ? 'auto' : 'none'}>
          <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
            <CustomBuildPage 
              onNavigateToGod={(god) => {
                setGodFromBuilds(god);
                setCurrentPage('data');
                setDatabaseSubTab('gods');
                setDataPageKey(prev => prev + 1);
              }}
              buildToEdit={buildToEdit}
              onEditComplete={() => {
                setBuildToEdit(null);
                setMybuildsRefreshKey(k => k + 1);
                setBuildsSubTab('mybuilds');
                setCurrentPage('builds');
              }}
            />
          </Suspense>
        </View>
      )}
      
      {/* Patch Hub page */}
      {currentPage === 'patchhub' && (
        <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
          <PatchHubPage subTab={patchHubSubTab} />
        </Suspense>
      )}
      
      {/* More page */}
      {currentPage === 'more' && (
        <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
          <MorePage 
            activeTab={moreSubTab}
            currentUsername={currentUser}
            viewUsername={viewingUserProfile}
            onSwitchToProfile={() => setMoreSubTab('profile')}
            onNavigateBack={() => {
              setCurrentPage('builds');
              setViewingUserProfile(null);
            }}
            onNavigateToBuilds={(godInternalName) => {
              // Navigate to builds page
              setCurrentPage('builds');
              setBuildsSubTab('community');
              
              // If a god is specified, try to find and set it
              if (godInternalName) {
                try {
                  const buildsData = require('./data/builds.json');
                  if (buildsData && buildsData.gods) {
                    function flattenAny(a) {
                      if (!a) return [];
                      if (!Array.isArray(a)) return [a];
                      return a.flat(Infinity).filter(Boolean);
                    }
                    const allGods = flattenAny(buildsData.gods);
                    const god = allGods.find(g => (g.internalName || '').toLowerCase() === (godInternalName || '').toLowerCase());
                    if (god) {
                      setGodFromBuilds(god);
                    }
                  }
                } catch (err) {
                  // If require fails, just navigate without setting god
                }
              }
            }}
            onNavigateToGod={(godInternalName) => {
              // Find the god and navigate to database gods page
              if (godInternalName) {
                try {
                  const buildsData = require('./data/builds.json');
                  if (buildsData && buildsData.gods) {
                    function flattenAny(a) {
                      if (!a) return [];
                      if (!Array.isArray(a)) return [a];
                      return a.flat(Infinity).filter(Boolean);
                    }
                    const allGods = flattenAny(buildsData.gods);
                    const god = allGods.find(g => (g.internalName || '').toLowerCase() === (godInternalName || '').toLowerCase());
                    if (god) {
                      setGodFromBuilds(god);
                      setCurrentPage('data');
                      setDatabaseSubTab('gods');
                    }
                  }
                } catch (err) {
                  // If require fails, just navigate without setting god
                  setCurrentPage('data');
                  setDatabaseSubTab('gods');
                }
              } else {
                setCurrentPage('data');
                setDatabaseSubTab('gods');
              }
            }}
            onNavigateToCustomBuild={(build) => {
              // Navigate to custom build page with the build data
              setCurrentPage('custombuild');
              setBuildsSubTab('custom');
            }}
            onNavigateToMyBuilds={() => {
              // Navigate to My Builds tab
              setCurrentPage('builds');
              setBuildsSubTab('mybuilds');
            }}
          />
        </Suspense>
      )}
        </View>
      </ScrollView>
    </View>
  );
}

// Randomizer styles
const randomizerStyles = StyleSheet.create({
  randomizerContainer: {
    padding: 16,
    backgroundColor: '#071024',
  },
  randomizerSection: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  randomizerTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  randomizerGodContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  randomizerGodCard: {
    backgroundColor: '#0f1724',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 200,
    width: '100%',
    maxWidth: 300,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.1s',
      ':hover': {
        borderColor: '#1e90ff',
        transform: 'scale(1.02)',
      },
    }),
  },
  randomizerGodIcon: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  randomizerGodName: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  randomizerGodPlaceholder: {
    backgroundColor: '#0f1724',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
  },
  randomizerPlaceholderText: {
    color: '#64748b',
    fontSize: 16,
  },
  randomizerStarterSection: {
    marginBottom: 20,
  },
  randomizerSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  randomizerStarterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomizerItemsSection: {
    marginBottom: 16,
  },
  randomizerItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 8 : 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...(IS_WEB && {
      maxWidth: '100%',
    }),
  },
  randomizerItemSlotWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomizerItemSlot: {
    width: IS_WEB ? 90 : 80,
    maxWidth: IS_WEB ? 90 : 80,
    minWidth: IS_WEB ? 90 : 80,
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 8 : 6,
    flexShrink: 0,
    flexGrow: 0,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.1s',
    }),
  },
  randomizerItemRandomizeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0b1226',
    zIndex: 10,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, transform 0.1s',
      ':hover': {
        backgroundColor: '#0ea5e9',
        transform: 'scale(1.1)',
      },
    }),
  },
  randomizerItemRandomizeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  randomizerItemIcon: {
    width: '100%',
    height: '70%',
    borderRadius: 6,
  },
  randomizerItemIconPlaceholder: {
    width: '100%',
    height: '70%',
    backgroundColor: '#1e3a5f',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  randomizerItemIconPlaceholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '700',
  },
  randomizerItemName: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 9 : 7,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: IS_WEB ? 11 : 9,
  },
  randomizerItemPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  randomizerItemPlaceholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '300',
  },
  randomizerItemNumber: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  randomizerRelicContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  randomizerRelicSlot: {
    width: 120,
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  randomizerRelicPlaceholder: {
    width: 120,
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  randomizerButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  randomizerButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }),
  },
  randomizerButtonDisabled: {
    backgroundColor: '#64748b',
    opacity: 0.6,
    ...(IS_WEB && {
      cursor: 'not-allowed',
    }),
  },
  randomizerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  randomizerResetButton: {
    backgroundColor: '#0f1724',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 80,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, border-color 0.2s',
    }),
  },
  randomizerResetButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  randomizerAspectSlot: {
    marginTop: 16,
    width: 120,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'border-color 0.2s, background-color 0.2s',
    }),
  },
  randomizerAspectSlotActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#1e90ff',
    borderWidth: 2,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  randomizerAspectIcon: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  randomizerAspectIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0f1724',
  },
  randomizerAspectIconPlaceholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '700',
  },
  randomizerAspectName: {
    color: '#cbd5e1',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },
  randomizerAspectActiveIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0b1226',
    zIndex: 10,
  },
  randomizerAspectActiveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  randomizeAllButton: {
    backgroundColor: '#10b981',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#059669',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, transform 0.1s',
      ':hover': {
        backgroundColor: '#059669',
        transform: 'scale(1.02)',
      },
    }),
  },
  randomizeAllButtonDisabled: {
    backgroundColor: '#64748b',
    borderColor: '#475569',
    opacity: 0.6,
    ...(IS_WEB && {
      cursor: 'not-allowed',
    }),
  },
  randomizeAllButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
});

const navStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  outerScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    minHeight: '100%',
    backgroundColor: '#071024',
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0b1226',
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    gap: 6,
  },
  navButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#031320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#06202f',
    minWidth: 0,
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 44,
      transition: 'background-color 0.2s, border-color 0.2s',
      userSelect: 'none',
    }),
  },
  navButtonActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  navButtonText: {
    color: '#cbd5e1',
    fontSize: Platform.OS === 'web' ? 11 : 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subNavBar: {
    flexDirection: 'row',
    backgroundColor: '#0b1226',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    gap: 4,
  },
  subNavButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#031320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#06202f',
    minWidth: 0,
    flexBasis: 0,
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 40,
      transition: 'background-color 0.2s, border-color 0.2s',
      userSelect: 'none',
    }),
  },
  subNavButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  subNavButtonText: {
    color: '#94a3b8',
    fontSize: Platform.OS === 'web' ? 10 : 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  subNavButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  placeholderContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  placeholderText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
  },
  pageVisible: {
    flex: 1,
  },
  pageHidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
});
