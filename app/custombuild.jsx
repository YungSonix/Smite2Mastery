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
  const [godLevel, setGodLevel] = useState(20);
  const [selectedItems, setSelectedItems] = useState(Array(7).fill(null));
  const [selectedRelic, setSelectedRelic] = useState(null);
  const [aspectActive, setAspectActive] = useState(false);
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
    
    // Apply stat filter
    if (selectedStat) {
      result = result.filter((item) => {
        if (!item || typeof item !== 'object' || !item.stats) return false;
        return item.stats.hasOwnProperty(selectedStat);
      });
    }
    
    // Apply tier filter
    if (selectedTier) {
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
  }, [items, itemSearchQuery, selectedStat, selectedTier]);

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

  // Calculate base stats at current level
  const baseStats = useMemo(() => {
    const stats = {};
    
    if (selectedGod && selectedGod.baseStats) {
      Object.keys(selectedGod.baseStats).forEach((statKey) => {
        const statData = selectedGod.baseStats[statKey];
        if (statData && typeof statData === 'object') {
          const level1 = statData['1'] || 0;
          const level20 = statData['20'] || 0;
          // Linear interpolation between level 1 and 20
          const levelProgress = (godLevel - 1) / 19; // 0 at level 1, 1 at level 20
          const statValue = level1 + (level20 - level1) * levelProgress;
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
    const newItems = [...selectedItems];
    newItems[index] = item;
    setSelectedItems(newItems);
    setShowItemPicker(null);
    setItemSearchQuery('');
  };

  const removeItem = (index) => {
    const newItems = [...selectedItems];
    newItems[index] = null;
    setSelectedItems(newItems);
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

        {/* Level Slider */}
        {selectedGod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Player Level</Text>
            <View style={styles.levelContainer}>
              <View style={styles.levelSliderContainer}>
                <TouchableOpacity
                  style={[styles.levelSliderButton, godLevel === 1 && styles.levelSliderButtonDisabled]}
                  onPress={() => setGodLevel(Math.max(1, godLevel - 1))}
                  disabled={godLevel === 1}
                >
                  <Text style={styles.levelSliderButtonText}>-</Text>
                </TouchableOpacity>
                <View
                  ref={sliderTrackRef}
                  style={styles.levelSliderTrack}
                  onLayout={(e) => {
                    const { width, x } = e.nativeEvent.layout;
                    setSliderTrackWidth(width);
                    setSliderTrackLayout({ x, y: e.nativeEvent.layout.y, width });
                  }}
                  onMouseDown={(e) => {
                    if (IS_WEB && sliderTrackRef.current && sliderTrackWidth > 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                      handleSliderMove({ nativeEvent: { clientX: e.clientX, pageX: e.pageX } });
                    }
                  }}
                  onTouchStart={(e) => {
                    if (sliderTrackRef.current && sliderTrackWidth > 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                      let touchX = 0;
                      if (IS_WEB) {
                        const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0];
                        if (touch && sliderTrackRef.current) {
                          const rect = sliderTrackRef.current.getBoundingClientRect?.();
                          if (rect) {
                            touchX = touch.clientX - rect.left;
                          } else {
                            touchX = touch.pageX - (sliderTrackLayout.x || 0);
                          }
                        }
                      } else {
                        const touch = e.nativeEvent.touches[0];
                        if (touch && sliderTrackRef.current) {
                          sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                            touchX = touch.pageX - px;
                            handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                          });
                          return;
                        }
                      }
                      if (touchX > 0 || !IS_WEB) {
                        const touch = IS_WEB ? (e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0]) : e.nativeEvent.touches[0];
                        handleSliderMove({ nativeEvent: { locationX: touchX, touches: touch ? [touch] : [] } });
                      }
                    }
                  }}
                  onTouchMove={(e) => {
                    if (sliderTrackRef.current && sliderTrackWidth > 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                      let touchX = 0;
                      if (IS_WEB) {
                        const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0];
                        if (touch && sliderTrackRef.current) {
                          try {
                            const rect = sliderTrackRef.current.getBoundingClientRect?.();
                            if (rect) {
                              touchX = touch.clientX - rect.left;
                            } else if (touch.pageX && sliderTrackLayout.x > 0) {
                              touchX = touch.pageX - sliderTrackLayout.x;
                            } else {
                              touchX = touch.clientX || 0;
                            }
                          } catch (err) {
                            touchX = (touch.pageX || touch.clientX || 0) - (sliderTrackLayout.x || 0);
                          }
                        }
                      } else {
                        const touch = e.nativeEvent.touches[0];
                        if (touch && sliderTrackRef.current) {
                          sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                            touchX = touch.pageX - px;
                            handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                          });
                          return;
                        }
                      }
                      if (touchX >= 0 || !IS_WEB) {
                        const touch = IS_WEB ? (e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0]) : e.nativeEvent.touches[0];
                        handleSliderMove({ nativeEvent: { locationX: touchX, touches: touch ? [touch] : [], clientX: touch?.clientX, pageX: touch?.pageX } });
                      }
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                >
                  <View 
                    style={[
                      styles.levelSliderFill,
                      isDragging && styles.levelSliderFillActive,
                      { width: `${((godLevel - 1) / 19) * 100}%` }
                    ]} 
                    pointerEvents="none"
                  />
                  <View 
                    style={[
                      styles.levelSliderThumb,
                      isDragging && styles.levelSliderThumbDragging,
                      { left: `${((godLevel - 1) / 19) * 100}%` }
                    ]}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(event) => {
                      if (!IS_WEB) {
                        event.preventDefault();
                        setIsDragging(true);
                        handleSliderMove(event);
                      }
                    }}
                    onResponderMove={(event) => {
                      if (!IS_WEB) {
                        event.preventDefault();
                        setIsDragging(true);
                        handleSliderMove(event);
                      }
                    }}
                    onResponderRelease={() => {
                      if (!IS_WEB) {
                        setIsDragging(false);
                      }
                    }}
                    onResponderTerminationRequest={() => false}
                    onMouseDown={(e) => {
                      if (IS_WEB && sliderTrackRef.current && sliderTrackWidth > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                        handleSliderMove({ nativeEvent: { clientX: e.clientX, pageX: e.pageX } });
                      }
                    }}
                    onTouchStart={(e) => {
                      if (sliderTrackRef.current && sliderTrackWidth > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                        let touchX = 0;
                        if (IS_WEB) {
                          const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0];
                          if (touch && sliderTrackRef.current) {
                            const rect = sliderTrackRef.current.getBoundingClientRect?.();
                            if (rect) {
                              touchX = touch.clientX - rect.left;
                            } else {
                              touchX = touch.pageX - (sliderTrackLayout.x || 0);
                            }
                          }
                        } else {
                          const touch = e.nativeEvent.touches[0];
                          if (touch && sliderTrackRef.current) {
                            sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                              touchX = touch.pageX - px;
                              handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                            });
                            return;
                          }
                        }
                        if (touchX > 0 || !IS_WEB) {
                          const touch = IS_WEB ? (e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0]) : e.nativeEvent.touches[0];
                          handleSliderMove({ nativeEvent: { locationX: touchX, touches: touch ? [touch] : [] } });
                        }
                      }
                    }}
                    onTouchMove={(e) => {
                      if (sliderTrackRef.current && sliderTrackWidth > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                        let touchX = 0;
                        if (IS_WEB) {
                          const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0];
                          if (touch && sliderTrackRef.current) {
                            try {
                              const rect = sliderTrackRef.current.getBoundingClientRect?.();
                              if (rect) {
                                touchX = touch.clientX - rect.left;
                              } else if (touch.pageX && sliderTrackLayout.x > 0) {
                                touchX = touch.pageX - sliderTrackLayout.x;
                              } else {
                                touchX = touch.clientX || 0;
                              }
                            } catch (err) {
                              touchX = (touch.pageX || touch.clientX || 0) - (sliderTrackLayout.x || 0);
                            }
                          }
                        } else {
                          const touch = e.nativeEvent.touches[0];
                          if (touch && sliderTrackRef.current) {
                            sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                              touchX = touch.pageX - px;
                              handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                            });
                            return;
                          }
                        }
                        if (touchX >= 0 || !IS_WEB) {
                          const touch = IS_WEB ? (e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0]) : e.nativeEvent.touches[0];
                          handleSliderMove({ nativeEvent: { locationX: touchX, touches: touch ? [touch] : [], clientX: touch?.clientX, pageX: touch?.pageX } });
                        }
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.levelSliderButton, godLevel === 20 && styles.levelSliderButtonDisabled]}
                  onPress={() => setGodLevel(Math.min(20, godLevel + 1))}
                  disabled={godLevel === 20}
                >
                  <Text style={styles.levelSliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.levelSliderLabel}>Level: {godLevel}</Text>
            </View>
          </View>
        )}

        {/* Item Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Build Items</Text>
          <View style={styles.itemSlotsContainer}>
            {selectedItems.map((item, index) => (
              <View key={index} style={styles.itemSlot}>
                <TouchableOpacity
                  style={styles.itemSlotButton}
                  onPress={() => {
                    if (item) {
                      showItemInfo(item, index);
                    } else {
                      setShowItemPicker(index);
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
              <Text style={styles.modalTitle}>Select Item (Slot {showItemPicker !== null ? showItemPicker + 1 : ''})</Text>
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
                      selectItem(item, showItemPicker);
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
                    
                    // Prepare build data for community
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
                      notes: communityBuildName.trim(),
                      gamemodes: gamemodesToSave,
                      createdAt: new Date().toISOString(),
                    };

                    // Post to community builds table
                    const { data, error } = await supabase
                      .from('community_builds')
                      .insert({
                        username: currentUser,
                        build_name: communityBuildName.trim(),
                        god_name: buildData.god,
                        god_internal_name: buildData.godInternalName,
                        items: buildData.items,
                        relic: buildData.relic,
                        god_level: godLevel,
                        aspect_active: buildData.aspectActive,
                        notes: communityBuildName.trim(),
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
    marginBottom: 24,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
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
    padding: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: 100,
    flex: 1,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  godIcon: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 20,
    flexShrink: 0,
  },
  godIconPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    flexShrink: 0,
  },
  godIconPlaceholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '700',
  },
  godNameText: {
    color: '#e6eef8',
    fontSize: 20,
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
  itemSlotsContainer: {
    flexDirection: 'row',
    flexWrap: IS_WEB ? 'nowrap' : 'wrap',
    gap: IS_WEB ? 4 : 0,
    justifyContent: IS_WEB ? 'space-between' : 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  itemSlot: {
    width: IS_WEB ? '13%' : '18%',
    maxWidth: IS_WEB ? 90 : undefined,
    minWidth: IS_WEB ? 70 : undefined,
    flexShrink: 0,
    flexGrow: 0,
    marginBottom: IS_WEB ? 0 : 4,
    ...(IS_WEB ? {} : {
      // On mobile: 4 items per row (23.5% * 4 = 94%, leaving 6% for 3 gaps of 2% each)
      marginRight: '2%',
    }),
  },
  itemSlotButton: {
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: IS_WEB ? 6 : 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_WEB ? 6 : 3,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
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
    width: '100%',
    height: IS_WEB ? '70%' : '65%',
    borderRadius: 4,
    maxWidth: '100%',
    maxHeight: '100%',
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
});
