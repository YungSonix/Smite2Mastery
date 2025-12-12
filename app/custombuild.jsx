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

export default function CustomBuildPage() {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  const [localBuilds, setLocalBuilds] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedGod, setSelectedGod] = useState(null);
  const [godLevel, setGodLevel] = useState(20);
  const [selectedItems, setSelectedItems] = useState(Array(6).fill(null));
  const [showGodPicker, setShowGodPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(null); // Index of item slot
  const [selectedItemInfo, setSelectedItemInfo] = useState(null); // { item, index } for info modal
  const [godSearchQuery, setGodSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [failedItemIcons, setFailedItemIcons] = useState({});
  const [selectedStat, setSelectedStat] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [statDropdownVisible, setStatDropdownVisible] = useState(false);
  const [tierDropdownVisible, setTierDropdownVisible] = useState(false);
  const [showSaveBuildModal, setShowSaveBuildModal] = useState(false);
  const [buildName, setBuildName] = useState('');
  
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
                  setSelectedItems(savedBuild.items);
                }
                if (savedBuild.godLevel) {
                  setGodLevel(savedBuild.godLevel);
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
          // Round up to whole number
          stats[statKey] = Math.ceil(statValue);
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
      'Attack Speed': 'BaseAttackSpeed',
      'AttackSpeed': 'BaseAttackSpeed',
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
    
    // Round all stats to whole numbers
    Object.keys(stats).forEach((key) => {
      stats[key] = Math.round(stats[key] || 0);
    });
    
    return stats;
  }, [baseStats, selectedItems]);

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
    movementSpeed: 'Movement Speed',
    healthRegen: 'HP5',
    manaRegen: 'MP5',
    penetration: 'Penetration',
    lifesteal: 'Lifesteal',
    cooldownReduction: 'Cooldown Reduction',
    critChance: 'Critical Strike Chance',
  };

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
        {/* God Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select God</Text>
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
            {Object.keys(totalStats)
              .filter(key => totalStats[key] !== 0 || baseStats[key])
              .sort()
              .map((statKey) => (
                <View key={statKey} style={styles.statItem}>
                  <Text style={styles.statLabel}>
                    {statDisplayNames[statKey] || statKey}
                  </Text>
                  <Text style={styles.statValue}>{totalStats[statKey]}</Text>
                </View>
              ))}
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
                    createdAt: new Date().toISOString(),
                  };

                  try {
                    const savedBuildsData = await storage.getItem(`savedBuilds_${currentUser}`);
                    const savedBuilds = savedBuildsData ? JSON.parse(savedBuildsData) : [];
                    savedBuilds.push(buildData);
                    await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(savedBuilds));
                    setShowSaveBuildModal(false);
                    setBuildName('');
                    Alert.alert('Success', 'Build saved to your profile!');
                  } catch (error) {
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
    width: '100%',
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
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  itemSlot: {
    width: IS_WEB ? '18%' : '28%',
    minWidth: 110,
    maxWidth: IS_WEB ? 140 : undefined,
  },
  itemSlotButton: {
    aspectRatio: 1,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  itemIcon: {
    width: '100%',
    height: '70%',
    borderRadius: 6,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  itemIconPlaceholder: {
    width: '100%',
    height: '70%',
    backgroundColor: '#1e3a5f',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIconPlaceholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '700',
  },
  itemName: {
    color: '#cbd5e1',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
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
    fontSize: 12,
    marginTop: 4,
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
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#7dd3fc',
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
