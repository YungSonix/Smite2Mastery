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
} from 'react-native';
import { Image } from 'expo-image';
import { getLocalItemIcon, getLocalGodAsset } from './localIcons';
import { useScreenDimensions } from '../hooks/useScreenDimensions';

const IS_WEB = Platform.OS === 'web';

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

export default function CustomBuildPage({ onNavigateToGod }) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  const [localBuilds, setLocalBuilds] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedGod, setSelectedGod] = useState(null);
  const [godLevel, setGodLevel] = useState(20); // Keep for backward compatibility but don't show UI
  const [selectedItems, setSelectedItems] = useState(Array(7).fill(null));
  const [startingItems, setStartingItems] = useState(Array(5).fill(null)); // 5 starting item slots
  const [selectedRelic, setSelectedRelic] = useState(null);
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
  const [showRelicPicker, setShowRelicPicker] = useState(false);
  const [abilityLevelingOrder, setAbilityLevelingOrder] = useState([]); // Array of ability keys like ['A01', 'A02', 'A03']
  const [startingAbilityOrder, setStartingAbilityOrder] = useState(Array(5).fill(null)); // Array of 5 ability keys for first 5 levels
  const [buildTips, setBuildTips] = useState(''); // Tips/notes text
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
  
  // Check certification status on mount and periodically
  useEffect(() => {
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
            console.log('✅ User is certified:', currentUser);
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
  }, []);
  
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
            
            // Check if we need to load a saved build
            try {
              const savedBuildStr = IS_WEB && typeof window !== 'undefined' && window.localStorage
                ? window.localStorage.getItem('loadSavedBuild')
                : await storage.getItem('loadSavedBuild');
              
              if (savedBuildStr) {
                const savedBuild = JSON.parse(savedBuildStr);
                if (savedBuild.godInternalName) {
                  const allGods = flattenAny(data.gods);
                  const god = allGods.find(g => (g.internalName || '').toLowerCase() === (savedBuild.godInternalName || '').toLowerCase());
                  if (god) {
                    setSelectedGod(god);
                  }
                }
                if (savedBuild.items && Array.isArray(savedBuild.items)) {
                  // Ensure we have 7 slots
                  const itemsArray = [...savedBuild.items];
                  while (itemsArray.length < 7) {
                    itemsArray.push(null);
                  }
                  setSelectedItems(itemsArray.slice(0, 7));
                }
                if (savedBuild.startingItems && Array.isArray(savedBuild.startingItems)) {
                  // Ensure we have 5 slots
                  const startingItemsArray = [...savedBuild.startingItems];
                  while (startingItemsArray.length < 5) {
                    startingItemsArray.push(null);
                  }
                  setStartingItems(startingItemsArray.slice(0, 5));
                }
                if (savedBuild.roles && Array.isArray(savedBuild.roles)) {
                  setSelectedRoles(savedBuild.roles);
                }
                if (savedBuild.abilityLevelingOrder && Array.isArray(savedBuild.abilityLevelingOrder)) {
                  setAbilityLevelingOrder(savedBuild.abilityLevelingOrder);
                }
                if (savedBuild.startingAbilityOrder && Array.isArray(savedBuild.startingAbilityOrder)) {
                  // Ensure we have exactly 5 slots
                  const orderArray = [...savedBuild.startingAbilityOrder];
                  while (orderArray.length < 5) {
                    orderArray.push(null);
                  }
                  setStartingAbilityOrder(orderArray.slice(0, 5));
                }
                if (savedBuild.godLevel) {
                  setGodLevel(savedBuild.godLevel);
                }
                if (savedBuild.aspectActive !== undefined) {
                  setAspectActive(savedBuild.aspectActive);
                }
                
                // Clear the saved build flag
                if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.removeItem('loadSavedBuild');
                } else {
                  await storage.removeItem('loadSavedBuild');
                }
              }
            } catch (e) {
              console.error('Error loading saved build:', e);
            }
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

  function flattenAny(a) {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
  }

  const gods = localBuilds ? flattenAny(localBuilds.gods) : [];
  const allItems = localBuilds ? flattenAny(localBuilds.items) : [];

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
      const newLevel = Math.round(1 + percentage * 19);
      setGodLevel(Math.max(1, Math.min(20, newLevel)));
    }
  }, [sliderTrackWidth, sliderTrackLayout, IS_WEB]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !IS_WEB) return;
    e.preventDefault();
    e.stopPropagation();
    if (sliderTrackRef.current && sliderTrackWidth > 0) {
      try {
        const element = sliderTrackRef.current;
        if (element && typeof element.getBoundingClientRect === 'function') {
          const rect = element.getBoundingClientRect();
          const clientX = e.clientX;
          const locationX = Math.max(0, Math.min(sliderTrackWidth, clientX - rect.left));
          const percentage = Math.max(0, Math.min(1, locationX / sliderTrackWidth));
          const newLevel = Math.round(1 + percentage * 19);
          setGodLevel(Math.max(1, Math.min(20, newLevel)));
        }
      } catch (err) {
        // Ignore errors
      }
    }
  }, [isDragging, sliderTrackWidth, IS_WEB]);

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

  // Calculate base stats at max level (always level 20)
  const baseStats = useMemo(() => {
    const stats = {};
    
    if (selectedGod && selectedGod.baseStats) {
      Object.keys(selectedGod.baseStats).forEach((statKey) => {
        const statData = selectedGod.baseStats[statKey];
        if (statData && typeof statData === 'object') {
          // Always use level 20 stats (max level)
          const statValue = statData['20'] || 0;
          // Keep decimal precision for key combat stats like protections, attack speed, and basic damage.
          // Other stats can be rounded to whole numbers for readability.
          if (
            statKey === 'PhysicalProtection' ||
            statKey === 'MagicalProtection' ||
            statKey === 'BaseAttackSpeed' ||
            statKey === 'BasicDamage' ||
            statKey === 'AttackSpeedPercent'
          ) {
            stats[statKey] = statValue;
          } else {
            stats[statKey] = Math.round(statValue);
          }
        } else if (statData !== null && statData !== undefined) {
          // If it's a direct value (not an object), use it as is
          stats[statKey] = statData;
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
      // Strength remains its own stat; we also add it into BasicDamage separately
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
    
    // Add item stats with normalized keys
    selectedItems.forEach((item) => {
      if (item && item.stats) {
        Object.keys(item.stats).forEach((itemKey) => {
          const normalizedKey = normalizeStatKey(itemKey);
          stats[normalizedKey] = (stats[normalizedKey] || 0) + (item.stats[itemKey] || 0);
        });
      }
    });

    // Let Strength also contribute directly to Basic Attack Damage.
    // This keeps Strength visible as its own stat while ensuring BasicDamage reflects STR from items.
    const totalStrength = stats.Strength || 0;
    if (totalStrength) {
      stats.BasicDamage = (stats.BasicDamage || 0) + totalStrength;
    }
    
    // Round stats for display where appropriate, but keep key combat stats as decimals
    Object.keys(stats).forEach((key) => {
      if (
        key === 'PhysicalProtection' ||
        key === 'MagicalProtection' ||
        key === 'BaseAttackSpeed' ||
        key === 'BasicDamage' ||
        key === 'AttackSpeedPercent'
      ) {
        // Keep these with decimal precision for accurate comparison (attack speed, basic damage, protections)
        stats[key] = stats[key] || 0;
      } else {
        stats[key] = Math.round(stats[key] || 0);
      }
    });

    // Combine base attack speed and total attack speed percent into a single effective Attack Speed stat.
    const baseAS = stats.BaseAttackSpeed || 0;
    const bonusASPercent = stats.AttackSpeedPercent || 0; // already in % units, e.g. 29.12
    if (baseAS) {
      const effectiveAS = baseAS * (1 + bonusASPercent / 100);
      stats.AttackSpeedEffective = effectiveAS;
    }

    // We keep AttackSpeedPercent internally for possible future use, but we don't need to
    // show it as a separate stat in the UI, so remove it from the stats map.
    delete stats.AttackSpeedPercent;
    // Do not show raw BaseAttackSpeed in the UI either; we only surface the combined Attack Speed.
    delete stats.BaseAttackSpeed;
    
    return stats;
  }, [baseStats, selectedItems]);

  // Calculate Effective Health Points
  // Using the formula from smitecalculator:
  // EHP = Health * (1 + (1 - ((100 * 100) / (Protection + 100) / 100)))
  // Note: Order of operations matters - division is left-to-right
  const effectiveHealth = useMemo(() => {
    // Get HP - check multiple possible keys
    const hp = totalStats.MaxHealth || totalStats.Health || 0;
    
    // Get Physical Protection - use the exact value from totalStats (may be decimal)
    const physicalProtection = totalStats.PhysicalProtection || 0;
    
    // Get Magical Protection - use the exact value from totalStats (may be decimal)
    const magicalProtection = totalStats.MagicalProtection || 0;
    
    // Physical Effective Health using smitecalculator formula
    // EHP = Health * (1 + (1 - ((100 * 100) / (Protection + 100) / 100)))
    // Division is left-to-right: (100*100) / (prot+100) / 100
    const phpInner = (100 * 100) / (physicalProtection + 100) / 100;
    const php = hp * (1 + (1 - phpInner));
    
    // Magical Effective Health using smitecalculator formula
    // EHP = Health * (1 + (1 - ((100 * 100) / (Protection + 100) / 100)))
    // Division is left-to-right: (100*100) / (prot+100) / 100
    const ehpInner = (100 * 100) / (magicalProtection + 100) / 100;
    const ehp = hp * (1 + (1 - ehpInner));
    
    // Debug logging to help diagnose the 5-number difference
    // Check if there's any difference in how protections are being used
    if (__DEV__) {
      console.log('EHP Calculation Debug:', {
        hp,
        physicalProtection,
        magicalProtection,
        phpInner,
        ehpInner,
        php: Math.round(php),
        ehp: Math.round(ehp),
        phpRaw: php,
        ehpRaw: ehp,
        phpFormula: `HP * (1 + (1 - ((100*100)/(${physicalProtection}+100)/100)))`,
        ehpFormula: `HP * (1 + (1 - ((100*100)/(${magicalProtection}+100)/100)))`,
      });
    }
    
    return {
      PHP: Math.round(php),
      EHP: Math.round(ehp),
    };
  }, [totalStats]);

  // Calculate total gold cost
  const totalGold = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      return sum + (item && item.totalCost ? item.totalCost : 0);
    }, 0);
  }, [selectedItems]);

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

  // Stat display names
  const statDisplayNames = {
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

  if (dataLoading) {
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
        {/* Load Saved Build Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.loadBuildButton}
            onPress={() => setShowLoadBuildModal(true)}
          >
            <Text style={styles.loadBuildButtonText}>Load Saved Build</Text>
          </TouchableOpacity>
        </View>

        {/* God Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select God</Text>
          <View style={styles.godSelectorContainer}>
            <TouchableOpacity
              style={styles.godSelector}
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
            {/* Aspect Slot */}
            {selectedGod && selectedGod.aspect && (
              <TouchableOpacity
                style={[
                  styles.aspectSlotButton,
                  aspectActive && styles.aspectSlotButtonActive
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
        </View>

        {/* Starting Items */}
        {selectedGod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starting Items</Text>
            {/* Starter item on its own row */}
            <View style={styles.starterStartingItemRow}>
              <View style={styles.startingItemSlot}>
                <Text style={styles.starterItemLabel}>Starter</Text>
                <TouchableOpacity
                  style={styles.startingItemSlotButton}
                  onPress={() => {
                    if (startingItems[0]) {
                      showItemInfo(startingItems[0], 100);
                    } else {
                      setShowItemPicker(100);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {startingItems[0] ? (
                    <>
                      {(() => {
                        const localIcon = getLocalItemIcon(startingItems[0].icon || startingItems[0].internalName);
                        if (!localIcon) {
                          return (
                            <View style={styles.startingItemIconPlaceholder}>
                              <Text style={styles.startingItemIconPlaceholderText}>?</Text>
                            </View>
                          );
                        }
                        
                        const imageSource = localIcon.primary || localIcon;
                        const fallbackSource = localIcon.fallback;
                        const iconKey = `starting-item-${startingItems[0].internalName || startingItems[0].name}-0`;
                        const useFallback = failedItemIcons[iconKey];
                        
                        if (fallbackSource && !useFallback) {
                          return (
                            <Image
                              source={imageSource}
                              style={styles.startingItemIcon}
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
                              style={styles.startingItemIcon}
                              resizeMode="cover"
                            />
                          );
                        }
                        
                        return (
                          <Image
                            source={imageSource}
                            style={styles.startingItemIcon}
                            resizeMode="cover"
                          />
                        );
                      })()}
                      <Text style={styles.startingItemName} numberOfLines={2}>
                        {startingItems[0].name || startingItems[0].internalName}
                      </Text>
                    </>
                  ) : (
                    <View style={styles.startingItemSlotPlaceholder}>
                      <Text style={styles.startingItemSlotPlaceholderText}>+</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {/* Rest of starting items (4 on one row) */}
            <View style={styles.startingItemsContainer}>
              {startingItems.slice(1).map((item, index) => (
                <View key={index + 1} style={styles.startingItemSlot}>
                  <TouchableOpacity
                    style={styles.startingItemSlotButton}
                    onPress={() => {
                      if (item) {
                        showItemInfo(item, index + 101); // Use offset to distinguish from regular items (101-104)
                      } else {
                        setShowItemPicker(index + 101); // Use offset for starting items (101-104)
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
                              <View style={styles.startingItemIconPlaceholder}>
                                <Text style={styles.startingItemIconPlaceholderText}>?</Text>
                              </View>
                            );
                          }
                          
                          const imageSource = localIcon.primary || localIcon;
                          const fallbackSource = localIcon.fallback;
                          const iconKey = `starting-item-${item.internalName || item.name}-${index}`;
                          const useFallback = failedItemIcons[iconKey];
                          
                          if (fallbackSource && !useFallback) {
                            return (
                              <Image
                                source={imageSource}
                                style={styles.startingItemIcon}
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
                                style={styles.startingItemIcon}
                                resizeMode="cover"
                              />
                            );
                          }
                          
                          return (
                            <Image
                              source={imageSource}
                              style={styles.startingItemIcon}
                              resizeMode="cover"
                            />
                          );
                        })()}
                        <Text style={styles.startingItemName} numberOfLines={2}>
                          {item.name || item.internalName}
                        </Text>
                      </>
                    ) : (
                      <View style={styles.startingItemSlotPlaceholder}>
                        <Text style={styles.startingItemSlotPlaceholderText}>+</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Item Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Build Items</Text>
          {/* Starter Item - First item on its own row */}
          <View style={styles.starterItemRow}>
            <View style={styles.itemSlot}>
              <Text style={styles.starterItemLabel}>Starter</Text>
              <TouchableOpacity
                style={styles.itemSlotButton}
                onPress={() => {
                  if (selectedItems[0]) {
                    showItemInfo(selectedItems[0], 0);
                  } else {
                    setShowItemPicker(0);
                  }
                }}
                activeOpacity={0.7}
              >
                {selectedItems[0] ? (
                  <>
                    {(() => {
                      const localIcon = getLocalItemIcon(selectedItems[0].icon || selectedItems[0].internalName);
                      if (!localIcon) {
                        return (
                          <View style={styles.itemIconPlaceholder}>
                            <Text style={styles.itemIconPlaceholderText}>?</Text>
                          </View>
                        );
                      }
                      
                      const imageSource = localIcon.primary || localIcon;
                      const fallbackSource = localIcon.fallback;
                      const iconKey = `item-${selectedItems[0].internalName || selectedItems[0].name}-0`;
                      const useFallback = failedItemIcons[iconKey];
                      
                      if (fallbackSource && !useFallback) {
                        return (
                          <Image
                            source={imageSource}
                            style={styles.itemIcon}
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
                            style={styles.itemIcon}
                            resizeMode="cover"
                          />
                        );
                      }
                      
                      return (
                        <Image
                          source={imageSource}
                          style={styles.itemIcon}
                          resizeMode="cover"
                        />
                      );
                    })()}
                    <Text style={styles.itemName} numberOfLines={2}>
                      {selectedItems[0].name || selectedItems[0].internalName}
                    </Text>
                  </>
                ) : (
                  <View style={styles.itemSlotPlaceholder}>
                    <Text style={styles.itemSlotPlaceholderText}>+</Text>
                    <Text style={styles.itemSlotNumber}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* Rest of the items */}
          <View style={styles.itemSlotsContainer}>
            {selectedItems.slice(1).map((item, index) => (
              <View key={index + 1} style={styles.itemSlot}>
                <TouchableOpacity
                  style={styles.itemSlotButton}
                  onPress={() => {
                    if (item) {
                      showItemInfo(item, index + 1);
                    } else {
                      setShowItemPicker(index + 1);
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
                            <View style={styles.itemIconPlaceholder}>
                              <Text style={styles.itemIconPlaceholderText}>?</Text>
                            </View>
                          );
                        }
                        
                        const imageSource = localIcon.primary || localIcon;
                        const fallbackSource = localIcon.fallback;
                        const iconKey = `item-${item.internalName || item.name}-${index}`;
                        const useFallback = failedItemIcons[iconKey];
                        
                        if (fallbackSource && !useFallback) {
                          return (
                            <Image
                              source={imageSource}
                              style={styles.itemIcon}
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
                              style={styles.itemIcon}
                              resizeMode="cover"
                            />
                          );
                        }
                        
                        return (
                          <Image
                            source={imageSource}
                            style={styles.itemIcon}
                            resizeMode="cover"
                          />
                        );
                      })()}
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
        </View>

        {/* Relic Selection */}
        {selectedGod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Relic</Text>
            <TouchableOpacity
              style={styles.relicSlot}
              onPress={() => setShowRelicPicker(true)}
              activeOpacity={0.7}
            >
              {selectedRelic ? (
                <>
                  {(() => {
                    const localIcon = getLocalItemIcon(selectedRelic.icon || selectedRelic.internalName);
                    if (!localIcon) {
                      return (
                        <View style={styles.relicIconPlaceholder}>
                          <Text style={styles.relicIconPlaceholderText}>?</Text>
                        </View>
                      );
                    }
                    
                    const imageSource = localIcon.primary || localIcon;
                    const fallbackSource = localIcon.fallback;
                    const iconKey = `relic-${selectedRelic.internalName || selectedRelic.name}`;
                    const useFallback = failedItemIcons[iconKey];
                    
                    if (fallbackSource && !useFallback) {
                      return (
                        <Image
                          source={imageSource}
                          style={styles.relicIcon}
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
                          style={styles.relicIcon}
                          resizeMode="cover"
                        />
                      );
                    }
                    
                    return (
                      <Image
                        source={imageSource}
                        style={styles.relicIcon}
                        resizeMode="cover"
                      />
                    );
                  })()}
                  <Text style={styles.relicName}>{selectedRelic.name || selectedRelic.internalName}</Text>
                  <TouchableOpacity
                    style={styles.removeRelicButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedRelic(null);
                    }}
                  >
                    <Text style={styles.removeRelicButtonText}>✕</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.relicIconPlaceholder}>
                    <Text style={styles.relicIconPlaceholderText}>+</Text>
                  </View>
                  <Text style={styles.relicPlaceholderText}>Select Relic</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Starting Ability Order (First 5 Levels) */}
        {selectedGod && selectedGod.abilities && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starting Ability Order (Levels 1-5)</Text>
            <Text style={styles.sectionSubtitle}>Select which ability to level at each of the first 5 levels</Text>
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
                        ability && styles.startingAbilitySlotButtonSelected
                      ]}
                      onPress={() => {
                        // Set which level we're editing and show ability picker modal
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
            {startingAbilityOrder.some(ability => ability !== null) && (
              <TouchableOpacity
                style={styles.clearAbilityOrderButton}
                onPress={() => setStartingAbilityOrder(Array(5).fill(null))}
              >
                <Text style={styles.clearAbilityOrderText}>Clear Order</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Max Ability Leveling Order */}
        {selectedGod && selectedGod.abilities && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Max Ability Leveling Order</Text>
            <Text style={styles.sectionSubtitle}>Tap abilities in the order you want to level them</Text>
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
                      isSelected && styles.abilityLevelingButtonSelected
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        // Remove from order
                        setAbilityLevelingOrder(prev => prev.filter(k => k !== abilityKey));
                      } else {
                        // Add to order
                        setAbilityLevelingOrder(prev => [...prev, abilityKey]);
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
          </View>
        )}

        {/* Build Tips */}
        {selectedGod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Build Tips & Notes</Text>
            <TextInput
              style={styles.buildTipsInput}
              placeholder="Add tips, strategies, or notes for this build..."
              placeholderTextColor="#64748b"
              value={buildTips}
              onChangeText={setBuildTips}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Item Swaps */}
        {selectedGod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Item Swaps</Text>
            <Text style={styles.sectionSubtitle}>Add alternative items and explain when to use them</Text>
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
                      setItemSwaps(prev => prev.filter((_, i) => i !== index));
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
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Stats</Text>
          <View style={styles.statsGrid}>
            {(() => {
              // Define the order we want stats to appear
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
              
              // Get all stats and filter, but hide internal-only keys like BaseAttackSpeed
              const allStats = Object.keys(totalStats)
                .filter(key => (totalStats[key] !== 0 || baseStats[key]) && key !== 'BaseAttackSpeed');
              
              // Separate ordered stats and remaining stats
              const orderedStats = statOrder.filter(key => allStats.includes(key));
              const remainingStats = allStats
                .filter(key => !statOrder.includes(key))
                .sort();
              
              // Build the final stat list with EHP inserted after protections
              const finalStats = [];
              
              orderedStats.forEach((statKey) => {
                finalStats.push(statKey);
                
                // Insert Physical EHP right after PhysicalProtection
                if (statKey === 'PhysicalProtection' && (totalStats.MaxHealth || totalStats.Health)) {
                  finalStats.push('__PhysicalEHP__');
                }
                
                // Insert Magical EHP right after MagicalProtection
                if (statKey === 'MagicalProtection' && (totalStats.MaxHealth || totalStats.Health)) {
                  finalStats.push('__MagicalEHP__');
                }
              });
              
              // Add remaining stats
              finalStats.push(...remainingStats);
              
              return finalStats.map((statKey) => {
                // Handle EHP placeholders
                if (statKey === '__PhysicalEHP__') {
                  return (
                    <View key="PhysicalEHP" style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: '#ef4444' }]}>
                        Physical EHP
                      </Text>
                      <Text style={[styles.statValue, { color: '#ef4444' }]}>
                        {effectiveHealth.PHP.toLocaleString()}
                      </Text>
                    </View>
                  );
                }
                
                if (statKey === '__MagicalEHP__') {
                  return (
                    <View key="MagicalEHP" style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: '#a855f7' }]}>
                        Magical EHP
                      </Text>
                      <Text style={[styles.statValue, { color: '#a855f7' }]}>
                        {effectiveHealth.EHP.toLocaleString()}
                      </Text>
                    </View>
                  );
                }
                
                // Regular stat
                // Color code stat labels based on stat type
                let statColor = '#94a3b8'; // default gray
                const statName = (statDisplayNames[statKey] || statKey).toLowerCase();
                const statKeyLower = statKey.toLowerCase();
                
                if (statName.includes('health') || statKeyLower.includes('health') || statName.includes('hp5') || statKeyLower.includes('healthper')) {
                  statColor = '#22c55e'; // green
                } else if (statName.includes('mana') || statKeyLower.includes('mana') || statName.includes('mp5') || statKeyLower.includes('manaper')) {
                  statColor = '#3b82f6'; // blue
                } else if (statName.includes('physical protection') || statKeyLower.includes('physicalprotection')) {
                  statColor = '#ef4444'; // red
                } else if (statName.includes('magical protection') || statKeyLower.includes('magicalprotection')) {
                  statColor = '#a855f7'; // purple
                } else if (statName.includes('physical power') || statKeyLower.includes('basicdamage')) {
                  statColor = '#f97316'; // orange
                } else if (statName.includes('magical power') || statKeyLower.includes('magicalpower')) {
                  statColor = '#ec4899'; // pink
                } else if (statName.includes('attack speed') || statKeyLower.includes('attackspeed') || statKeyLower.includes('baseattackspeed')) {
                  statColor = '#f97316'; // orange
                } else if (statName.includes('movement speed') || statKeyLower.includes('movementspeed')) {
                  statColor = '#10b981'; // emerald
                } else if (statName.includes('penetration') || statKeyLower.includes('penetration')) {
                  statColor = '#ef4444'; // red
                } else if (statName.includes('lifesteal') || statKeyLower.includes('lifesteal')) {
                  statColor = '#84cc16'; // lime
                } else if (statName.includes('cooldown') || statKeyLower.includes('cooldown')) {
                  statColor = '#0ea5e9'; // sky blue
                } else if (statName.includes('critical') || statKeyLower.includes('critical') || statName.includes('crit')) {
                  statColor = '#f97316'; // orange
                } else if (statName.includes('strength') || statKeyLower.includes('strength')) {
                  statColor = '#facc15'; // yellow
                } else if (statName.includes('intelligence') || statKeyLower.includes('intelligence')) {
                  statColor = '#a855f7'; // purple
                }
                
                // Display rounded value for protections, but keep decimals for attack speed and basic damage
                let displayValue = totalStats[statKey];
                if (statKey === 'PhysicalProtection' || statKey === 'MagicalProtection') {
                  displayValue = Math.round(displayValue);
                } else if (
                  statKey === 'BaseAttackSpeed' ||
                  statKey === 'AttackSpeedEffective' ||
                  statKey === 'BasicDamage'
                ) {
                  // Show up to 3 decimal places for these key stats
                  displayValue = Number(displayValue.toFixed(3));
                }
                
                return (
                  <View key={statKey} style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: statColor }]}>
                      {statDisplayNames[statKey] || statKey}
                    </Text>
                    <Text style={[styles.statValue, { color: statColor }]}>{displayValue}</Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>

        {/* Gold Cost */}
        <View style={styles.section}>
          <View style={styles.goldContainer}>
            <Text style={styles.goldLabel}>Total Gold Cost:</Text>
            <Text style={styles.goldValue}>{totalGold.toLocaleString()}</Text>
          </View>
        </View>

        {/* Save Build Button */}
        {selectedGod && (
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
            
            {/* Post to Certified Builds Button - Only show if user is certified */}
            {isUserCertified && (
              <TouchableOpacity
                style={[styles.postToCommunityButton, styles.postToCertifiedButton]}
                onPress={async () => {
                  const currentUser = await storage.getItem('currentUser');
                  if (!currentUser) {
                    Alert.alert('Not Logged In', 'Please log in to post certified builds.');
                    return;
                  }
                  
                  // Check if build is complete
                  const hasItems = selectedItems.filter(Boolean).length > 0;
                  if (!hasItems) {
                    Alert.alert('Incomplete Build', 'Please add items to your build before posting.');
                    return;
                  }
                  
                  setCertifiedBuildName('');
                  setShowPostToCertifiedModal(true);
                }}
              >
                <Text style={styles.postToCommunityButtonText}>Post to Certified Builds</Text>
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
        )}
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
                  ? 'Select Starter Item'
                  : showItemPicker === 100
                  ? 'Select Starter Item'
                  : showItemPicker >= 101 && showItemPicker < 105
                  ? `Select Starting Item (Slot ${showItemPicker - 100 + 1}) `
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
            <ScrollView style={styles.modalContent}>
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
                        // Load the build data
                        if (build.godInternalName) {
                          const allGods = flattenAny(localBuilds.gods);
                          const god = allGods.find(g => (g.internalName || '').toLowerCase() === (build.godInternalName || '').toLowerCase());
                          if (god) {
                            setSelectedGod(god);
                          }
                        }
                        if (build.items && Array.isArray(build.items)) {
                          const itemsArray = [...build.items];
                          while (itemsArray.length < 7) {
                            itemsArray.push(null);
                          }
                          setSelectedItems(itemsArray.slice(0, 7));
                        }
                        if (build.godLevel) {
                          setGodLevel(build.godLevel);
                        }
                        if (build.aspectActive !== undefined) {
                          setAspectActive(build.aspectActive);
                        }
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
                    godLevel,
                    aspectActive: aspectActive && selectedGod.aspect ? true : false,
                    createdAt: new Date().toISOString(),
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
        visible={showRelicPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowRelicPicker(false);
          setItemSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Relic</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowRelicPicker(false);
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
                        setSelectedRelic(relic);
                        setShowRelicPicker(false);
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

      {/* Post to Certified Builds Modal */}
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
              <Text style={styles.saveBuildModalTitle}>Post to Certified Builds</Text>
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
              {['All Modes', 'Joust', 'Dual', 'Arena', 'Conquest', 'Assault'].map((mode) => {
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
                    Alert.alert('Not Logged In', 'Please log in to post certified builds.');
                    setShowPostToCertifiedModal(false);
                    return;
                  }

                  setIsPostingToCertified(true);
                  
                  try {
                    const { supabase } = require('../config/supabase');
                    
                    const gamemodesToSave = selectedGamemodes.includes('All Modes')
                      ? ['Joust', 'Dual', 'Arena', 'Conquest', 'Assault']
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
                      relic: selectedRelic ? {
                        name: selectedRelic.name || selectedRelic.internalName,
                        internalName: selectedRelic.internalName,
                        icon: selectedRelic.icon,
                      } : null,
                      godLevel,
                      aspectActive: aspectActive && selectedGod.aspect ? true : false,
                      author: currentUser,
                      notes: buildTips.trim() || certifiedBuildName.trim(),
                      tips: buildTips.trim() || null,
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

                    const { data, error } = await supabase
                      .from('certified_builds')
                      .insert({
                        username: currentUser,
                        build_name: certifiedBuildName.trim(),
                        god_name: buildData.god,
                        god_internal_name: buildData.godInternalName,
                        items: buildData.items,
                        starting_items: buildData.startingItems,
                        relic: buildData.relic,
                        god_level: godLevel,
                        aspect_active: buildData.aspectActive,
                        notes: buildData.notes || buildData.tips || certifiedBuildName.trim(),
                        tips: (buildData.tips && buildData.tips.trim()) || null,
                        ability_leveling_order: buildData.abilityLevelingOrder,
                        starting_ability_order: buildData.startingAbilityOrder,
                        item_swaps: buildData.itemSwaps,
                        roles: buildData.roles,
                        gamemodes: gamemodesToSave,
                        created_at: new Date().toISOString(),
                      });

                    if (error) {
                      console.error('Error posting to certified builds:', error);
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
                        Alert.alert('Error', `Failed to post build: ${error.message || 'Please try again.'}`);
                      }
                      setIsPostingToCertified(false);
                      return;
                    }

                    setShowPostToCertifiedModal(false);
                    setCertifiedBuildName('');
                    setSelectedGamemodes(['All Modes']);
                    setIsPostingToCertified(false);
                    Alert.alert('Success', 'Your certified build has been posted!');
                  } catch (error) {
                    console.error('Exception posting to certified builds:', error);
                    Alert.alert('Error', 'An error occurred. Please try again.');
                    setIsPostingToCertified(false);
                  }
                }}
                disabled={isPostingToCertified}
              >
                {isPostingToCertified ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBuildModalButtonText}>Post Build</Text>
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
              <Text style={styles.saveBuildModalTitle}>Post to Community Builds</Text>
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
              {['All Modes', 'Joust', 'Dual', 'Arena', 'Conquest', 'Assault'].map((mode) => {
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
                    Alert.alert('Not Logged In', 'Please log in to post builds to the community.');
                    setShowPostToCommunityModal(false);
                    return;
                  }

                  setIsPostingToCommunity(true);
                  
                  try {
                    // Import supabase
                    const { supabase } = require('../config/supabase');
                    
                    // Prepare gamemodes - if "All Modes" is selected, store all modes, otherwise store selected modes
                    const gamemodesToSave = selectedGamemodes.includes('All Modes')
                      ? ['Joust', 'Dual', 'Arena', 'Conquest', 'Assault']
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
                      relic: selectedRelic ? {
                        name: selectedRelic.name || selectedRelic.internalName,
                        internalName: selectedRelic.internalName,
                        icon: selectedRelic.icon,
                      } : null,
                      godLevel,
                      aspectActive: aspectActive && selectedGod.aspect ? true : false,
                      author: currentUser,
                      notes: buildTips.trim() || communityBuildName.trim(),
                      tips: buildTips.trim() || null,
                      abilityLevelingOrder: abilityLevelingOrder,
                      itemSwaps: itemSwaps.map(swap => ({
                        item: swap.item,
                        reasoning: swap.reasoning,
                      })),
                      gamemodes: gamemodesToSave,
                      createdAt: new Date().toISOString(),
                      isCertified: isCertified,
                    };

                    // For now, all builds go to community_builds
                    // Certified builds will be filtered by author in index.jsx
                    // In the future, you can create a separate certified_builds table
                    // Post to community builds table with additional metadata
                    const { data, error } = await supabase
                      .from('community_builds')
                      .insert({
                        username: currentUser,
                        build_name: communityBuildName.trim(),
                        god_name: buildData.god,
                        god_internal_name: buildData.godInternalName,
                        items: buildData.items,
                        starting_items: buildData.startingItems,
                        relic: buildData.relic,
                        god_level: godLevel,
                        aspect_active: buildData.aspectActive,
                        notes: buildData.notes || buildData.tips || communityBuildName.trim(),
                        tips: (buildData.tips && buildData.tips.trim()) || null,
                        ability_leveling_order: buildData.abilityLevelingOrder,
                        starting_ability_order: buildData.startingAbilityOrder,
                        item_swaps: buildData.itemSwaps,
                        roles: buildData.roles,
                        gamemodes: gamemodesToSave,
                        created_at: new Date().toISOString(),
                      });

                    if (error) {
                      console.error('Error posting to community:', error);
                      if (error.code === 'MISSING_CONFIG') {
                        Alert.alert(
                          'Development Mode', 
                          'Supabase is not configured in development. In production, your builds will be saved properly. This is normal for Expo development.'
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
                    Alert.alert('Success', 'Build posted to community builds!');
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
                  <Text style={styles.saveBuildModalButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
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
    padding: 16,
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
    marginBottom: IS_WEB ? 24 : 16,
    backgroundColor: '#0b1226',
    borderRadius: IS_WEB ? 12 : 8,
    padding: IS_WEB ? 16 : 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 20 : 16,
    fontWeight: '700',
    marginBottom: IS_WEB ? 12 : 8,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 14 : 12,
    marginBottom: 12,
  },
  // God Selection
  godSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  godSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: IS_WEB ? 12 : 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: IS_WEB ? 70 : 60,
    flex: 1,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  godIcon: {
    width: IS_WEB ? 50 : 45,
    height: IS_WEB ? 50 : 45,
    borderRadius: 6,
    marginRight: IS_WEB ? 12 : 10,
    flexShrink: 0,
  },
  godIconPlaceholder: {
    width: IS_WEB ? 50 : 45,
    height: IS_WEB ? 50 : 45,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: IS_WEB ? 12 : 10,
    flexShrink: 0,
  },
  godIconPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 20 : 18,
    fontWeight: '700',
  },
  godNameText: {
    color: '#e6eef8',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  // Level Slider
  levelContainer: {
    marginTop: 8,
  },
  levelSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  levelSliderTrack: {
    flex: 1,
    height: IS_WEB ? 12 : 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    position: 'relative',
    cursor: IS_WEB ? 'pointer' : 'default',
  },
  levelSliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#facc15',
    borderRadius: 4,
  },
  levelSliderFillActive: {
    backgroundColor: '#fbbf24',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  levelSliderThumb: {
    position: 'absolute',
    top: IS_WEB ? -10 : -8,
    width: IS_WEB ? 28 : 24,
    height: IS_WEB ? 28 : 24,
    borderRadius: IS_WEB ? 14 : 12,
    backgroundColor: '#facc15',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: IS_WEB ? -14 : -12,
  },
  levelSliderThumbDragging: {
    transform: [{ translateX: IS_WEB ? -17 : -14 }, { scale: 1.3 }],
    backgroundColor: '#fbbf24',
    borderColor: '#ffffff',
    borderWidth: 3,
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  levelSliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelSliderButtonDisabled: {
    opacity: 0.4,
    borderColor: '#1e3a5f',
  },
  levelSliderButtonText: {
    color: '#facc15',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  levelSliderLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
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
    width: IS_WEB ? 100 : 80,
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
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
    maxHeight: '85%',
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
  relicIconPlaceholderText: {
    color: '#64748b',
    fontSize: IS_WEB ? 24 : 20,
    fontWeight: '700',
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
  // Role Selection Styles
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 10 : 8,
  },
  roleButton: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    paddingVertical: IS_WEB ? 10 : 8,
    paddingHorizontal: IS_WEB ? 16 : 14,
    minWidth: IS_WEB ? 90 : 80,
  },
  roleButtonSelected: {
    backgroundColor: '#1e90ff',
    borderColor: '#0ea5e9',
    borderWidth: 2,
  },
  roleButtonDisabled: {
    opacity: 0.5,
  },
  roleButtonText: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  roleButtonTextDisabled: {
    color: '#64748b',
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
});
