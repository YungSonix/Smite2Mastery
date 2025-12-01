import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import localBuilds from './data/builds.json';
import { getLocalItemIcon, getLocalGodAsset } from './localIcons';

export default function CustomBuildPage() {
  const [selectedGod, setSelectedGod] = useState(null);
  const [godLevel, setGodLevel] = useState(20);
  const [selectedItems, setSelectedItems] = useState(Array(7).fill(null));
  const [abilityRanks, setAbilityRanks] = useState({ A01: 0, A02: 0, A03: 0, A04: 0, A05: 0 });
  const [showGodPicker, setShowGodPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(null); // Index of item slot
  const [godSearchQuery, setGodSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [sliderWidth, setSliderWidth] = useState(300);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStat, setSelectedStat] = useState(null);
  const [roleDropdownVisible, setRoleDropdownVisible] = useState(false);
  const [statDropdownVisible, setStatDropdownVisible] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState(null); // { abilityKey, ability, abilityName }
  const [selectedItem, setSelectedItem] = useState(null); // { item, itemName }
  const [abilitySectionsExpanded, setAbilitySectionsExpanded] = useState({
    scales: false,
    description: false,
    stats: false,
  });
  const [aspectEnabled, setAspectEnabled] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState(null);

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
    let result = gods;
    
    // Apply role filter
    if (selectedRole) {
      result = result.filter((god) => {
        if (!god) return false;
        const roles = god.roles || god.role || [];
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.some(r => {
          const roleStr = String(r).toLowerCase();
          const selectedRoleLower = selectedRole.toLowerCase();
          // Handle "ADC" and "Carry" as the same
          if (selectedRoleLower === 'adc') {
            return roleStr === 'adc' || roleStr === 'carry';
          }
          return roleStr === selectedRoleLower;
        });
      });
    }
    
    // Apply search filter
    if (godSearchQuery) {
      const query = godSearchQuery.toLowerCase();
      result = result.filter((god) => {
        const name = (god.name || god.GodName || god.title || god.displayName || '').toString().toLowerCase();
        return name.includes(query);
      });
    } else {
      // Show only first 20 when no search (but still respect role filter)
      result = result.slice(0, 20);
    }
    
    return result;
  }, [gods, godSearchQuery, selectedRole]);

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
    
    // Apply search filter
    if (itemSearchQuery) {
      const query = itemSearchQuery.toLowerCase();
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        const name = (item.name || '').toString().toLowerCase();
        const internalName = (item.internalName || '').toString().toLowerCase();
        return name.includes(query) || internalName.includes(query);
      });
    } else {
      // Show only first 20 when no search (but still respect stat filter)
      result = result.slice(0, 20);
    }
    
    return result;
  }, [items, itemSearchQuery, selectedStat]);

  // Calculate base stats at current level
  const baseStatsAtLevel = useMemo(() => {
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
        }
      });
    }
    
    return stats;
  }, [selectedGod, godLevel]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    const stats = { ...baseStatsAtLevel };
    
    // Add item stats
    selectedItems.forEach((item) => {
      if (item && item.stats) {
        Object.keys(item.stats).forEach((key) => {
          stats[key] = (stats[key] || 0) + (item.stats[key] || 0);
        });
      }
    });
    
    // Round all stats up to whole numbers
    Object.keys(stats).forEach((key) => {
      stats[key] = Math.ceil(stats[key]);
    });
    
    return stats;
  }, [baseStatsAtLevel, selectedItems]);

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
  };


  const updateAbilityRank = (abilityKey, rank) => {
    setAbilityRanks(prev => ({
      ...prev,
      [abilityKey]: rank
    }));
  };

  const godName = selectedGod ? (selectedGod.name || selectedGod.GodName || selectedGod.title || selectedGod.displayName || 'Unknown') : 'Select God';
  const godIcon = selectedGod && (selectedGod.icon || selectedGod.GodIcon || (selectedGod.abilities && selectedGod.abilities.A01 && selectedGod.abilities.A01.icon));

  // TEST MODE: Set to true to use WebView, false to use original custom build
  const USE_WEBVIEW = true;

  return (
    <View style={styles.container}>
      {USE_WEBVIEW ? (
        <>
          <WebView
            source={{ uri: 'https://www.smitecalculator.pro' }}
            style={styles.webview}
            startInLoadingState={true}
            scalesPageToFit={true}
            injectedJavaScript={`
            (function() {
              const meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=0.75, maximum-scale=1.0, user-scalable=yes';
              document.getElementsByTagName('head')[0].appendChild(meta);
              
              // Zoom out and center the body
              document.body.style.zoom = '0.75';
              document.body.style.transform = 'scale(0.75)';
              document.body.style.transformOrigin = 'center center';
              document.body.style.margin = '0 auto';
              document.body.style.display = 'flex';
              document.body.style.flexDirection = 'column';
              document.body.style.alignItems = 'center';
              document.body.style.justifyContent = 'center';
              document.body.style.minHeight = '100vh';
              
              // Center the main container if it exists
              const mainContainer = document.querySelector('main') || document.querySelector('.container') || document.body.firstElementChild;
              if (mainContainer) {
                mainContainer.style.margin = '0 auto';
                mainContainer.style.maxWidth = '100%';
              }
              
              // Darken buttons
              const style = document.createElement('style');
              style.textContent = \`
                button, 
                .btn, 
                [role="button"],
                input[type="button"],
                input[type="submit"],
                a.button {
                  background-color: #1a1f2e !important;
                  color: #e2e8f0 !important;
                  border-color: #3a4a4a !important;
                }
                button:hover, 
                .btn:hover, 
                [role="button"]:hover,
                input[type="button"]:hover,
                input[type="submit"]:hover,
                a.button:hover {
                  background-color:rgb(213, 214, 218) !important;
                  border-color: #15803d !important;
                }
                button:active, 
                .btn:active, 
                [role="button"]:active,
                input[type="button"]:active,
                input[type="submit"]:active,
                a.button:active {
                  background-color:rgb(203, 206, 216) !important;
                }
              \`;
              document.head.appendChild(style);
            })();
            true;
          `}
          onMessage={() => {}}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#B8FF12" />
            </View>
          )}
        />
        <View style={styles.linkContainer}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://www.smitecalculator.pro')}
          >
            <Text style={styles.linkText}>Open in Browser: smitecalculator.pro</Text>
          </TouchableOpacity>
        </View>
        </>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Character Overview Section */}
        <View style={styles.characterSection}>
          <View style={styles.characterHeader}>
            <Text style={styles.characterTitle}>{godName}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setSelectedGod(null);
                setSelectedItems(Array(7).fill(null));
                setAbilityRanks({ A01: 0, A02: 0, A03: 0, A04: 0, A05: 0 });
                setGodLevel(20);
                setAspectEnabled(false);
                setSelectedAbility(null);
                setSelectedItem(null);
              }}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.characterPortraitContainer}>
            {godIcon ? (
              <TouchableOpacity
                onPress={() => setShowGodPicker(true)}
                activeOpacity={0.7}
              >
                {(() => {
                  const localIcon = getLocalGodAsset(godIcon);
                  if (localIcon) {
                    return (
                      <Image
                        source={localIcon}
                        style={styles.characterPortrait}
                        resizeMode="cover"
                      />
                    );
                  }
                  return (
                    <View style={styles.characterPortraitPlaceholder}>
                      <Text style={styles.characterPortraitText}>?</Text>
                    </View>
                  );
                })()}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.characterPortraitPlaceholder}
                onPress={() => setShowGodPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.characterPortraitText}>?</Text>
              </TouchableOpacity>
            )}
            {selectedGod && selectedGod.aspect && (
              <TouchableOpacity
                style={[styles.aspectIconButton, aspectEnabled && styles.aspectIconButtonEnabled]}
                onPress={() => setAspectEnabled(!aspectEnabled)}
                onLongPress={() => setSelectedAspect(selectedGod.aspect)}
              >
                {selectedGod.aspect.icon ? (() => {
                  const localIcon = getLocalGodAsset(selectedGod.aspect.icon);
                  if (localIcon) {
                    return (
                      <Image
                        source={localIcon}
                        style={styles.aspectIcon}
                        resizeMode="cover"
                      />
                    );
                  }
                  return (
                    <View style={styles.aspectIconPlaceholder}>
                      <Text style={styles.aspectIconText}>A</Text>
                    </View>
                  );
                })() : (
                  <View style={styles.aspectIconPlaceholder}>
                    <Text style={styles.aspectIconText}>A</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.levelContainer}>
            <View style={styles.sliderContainer}>
              <Pressable
                style={styles.sliderTrack}
                onLayout={(e) => {
                  setSliderWidth(e.nativeEvent.layout.width);
                }}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                  const newLevel = Math.round(1 + percentage * 19);
                  setGodLevel(newLevel);
                }}
              >
                <View style={[styles.sliderFill, { width: `${((godLevel - 1) / 19) * 100}%` }]} />
                <View style={[styles.sliderThumb, { left: `${((godLevel - 1) / 19) * 100}%` }]} />
              </Pressable>
              <View style={styles.levelButtons}>
                <TouchableOpacity
                  style={styles.levelButton}
                  onPress={() => setGodLevel(Math.max(1, godLevel - 1))}
                >
                  <Text style={styles.levelButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.levelText}>God Level: {godLevel}</Text>
                <TouchableOpacity
                  style={styles.levelButton}
                  onPress={() => setGodLevel(Math.min(20, godLevel + 1))}
                >
                  <Text style={styles.levelButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ITEMS Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ITEMS</Text>
            <View style={styles.goldContainer}>
              <Text style={styles.goldIcon}>🪙</Text>
              <Text style={styles.goldText}>{totalGold.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.itemsGrid}>
            {selectedItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.itemSlot}
                onPress={() => {
                  if (item) {
                    setSelectedItem({ item, itemName: item.name || item.internalName });
                  } else {
                    setShowItemPicker(index);
                  }
                }}
                onLongPress={() => {
                  if (item) {
                    removeItem(index);
                  } else {
                    setShowItemPicker(index);
                  }
                }}
              >
                {item ? (
                  <>
                    {item.icon ? (
                      (() => {
                        const localIcon = getLocalItemIcon(item.icon);
                        if (localIcon) {
                          return (
                            <Image
                              source={localIcon}
                              style={styles.itemIcon}
                              resizeMode="cover"
                            />
                          );
                        }
                        return (
                          <View style={styles.itemIconPlaceholder}>
                            <Text style={styles.itemIconText}>{item.name ? item.name.charAt(0) : '?'}</Text>
                          </View>
                        );
                      })()
                    ) : (
                      <View style={styles.itemIconPlaceholder}>
                        <Text style={styles.itemIconText}>{item.name ? item.name.charAt(0) : '?'}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotText}>+</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>


        {/* ABILITIES Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABILITIES</Text>
          {selectedGod && selectedGod.abilities ? (
            <View style={styles.abilitiesRow}>
              {Object.keys(selectedGod.abilities).slice(0, 5).map((abilityKey) => {
                const ability = selectedGod.abilities[abilityKey];
                const rank = abilityRanks[abilityKey] || 0;
                return (
                  <View key={abilityKey} style={styles.abilityContainer}>
                    <TouchableOpacity
                      style={styles.abilityIconButton}
                      onPress={() => {
                        const abilityName = ability.name || abilityKey;
                        setSelectedAbility({ abilityKey, ability, abilityName });
                      }}
                      onLongPress={() => {
                        const newRank = rank >= 5 ? 0 : rank + 1;
                        updateAbilityRank(abilityKey, newRank);
                      }}
                    >
                      {ability && ability.icon ? (() => {
                        const localIcon = getLocalGodAsset(ability.icon);
                        if (localIcon) {
                          return (
                            <Image
                              source={localIcon}
                              style={styles.abilityIcon}
                              resizeMode="cover"
                            />
                          );
                        }
                        return (
                          <View style={styles.abilityIconPlaceholder}>
                            <Text style={styles.abilityIconText}>{abilityKey}</Text>
                          </View>
                        );
                      })() : (
                        <View style={styles.abilityIconPlaceholder}>
                          <Text style={styles.abilityIconText}>{abilityKey}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {rank > 0 && (
                      <View style={styles.rankContainer}>
                        <Text style={styles.rankText}>Rank: {rank}</Text>
                        <View style={styles.rankIndicator} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.instructionText}>Select a god to view abilities</Text>
          )}
          <Text style={styles.instructionText}>Click ability icons to add them to damage rotation.</Text>
        </View>

        {/* STATS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STATS</Text>
          {selectedGod && selectedGod.baseStats && Object.keys(baseStatsAtLevel).length > 0 && (
            <View style={styles.baseStatsContainer}>
              <Text style={styles.baseStatsTitle}>Base Stats (Level {godLevel}):</Text>
              {Object.keys(baseStatsAtLevel).map((statKey) => {
                const statValue = baseStatsAtLevel[statKey];
                // Round up to whole number
                const formattedValue = typeof statValue === 'number' 
                  ? Math.ceil(statValue).toString()
                  : statValue;
                return (
                  <View key={statKey} style={styles.statRow}>
                    <Text style={styles.statLabel}>{statKey}:</Text>
                    <Text style={styles.statValue}>{formattedValue}</Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.statsContainer}>
            <Text style={styles.totalStatsTitle}>Total Stats (with Items):</Text>
            {Object.keys(totalStats).length > 0 ? (
              Object.keys(totalStats).map((statKey) => {
                const statValue = totalStats[statKey];
                // Already rounded in useMemo, just convert to string
                const formattedValue = typeof statValue === 'number' 
                  ? statValue.toString()
                  : statValue;
                return (
                  <View key={statKey} style={styles.statRow}>
                    <Text style={styles.statLabel}>{statKey}:</Text>
                    <Text style={styles.statValue}>{formattedValue}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noStatsText}>No stats calculated. Select a god and add items to see stats.</Text>
            )}
          </View>
        </View>
      </ScrollView>

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
        <Pressable style={styles.modalOverlay} onPress={() => {
          setShowGodPicker(false);
          setGodSearchQuery('');
        }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select God</Text>
              <TouchableOpacity onPress={() => {
                setShowGodPicker(false);
                setGodSearchQuery('');
                setSelectedRole(null);
              }}>
                <Text style={styles.modalCloseButton}>×</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Only first 20 gods shown. Search for more..."
              placeholderTextColor="#94a3b8"
              value={godSearchQuery}
              onChangeText={setGodSearchQuery}
            />
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setRoleDropdownVisible(!roleDropdownVisible)}
              >
                <Text style={styles.filterButtonText}>
                  {selectedRole ? `Role: ${selectedRole}` : 'Filter by Role'}
                </Text>
                <Text style={styles.filterButtonArrow}>{roleDropdownVisible ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {roleDropdownVisible && (
                <View style={styles.filterDropdown}>
                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedRole(null);
                      setRoleDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>All Roles</Text>
                  </TouchableOpacity>
                  {['ADC', 'Solo', 'Support', 'Mid', 'Jungle'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={styles.filterOption}
                      onPress={() => {
                        setSelectedRole(role);
                        setRoleDropdownVisible(false);
                      }}
                    >
                      <Text style={[styles.filterOptionText, selectedRole === role && styles.filterOptionTextActive]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <ScrollView style={styles.pickerList}>
              {filteredGods.map((god, index) => {
                const name = (god.name || god.GodName || god.title || god.displayName || 'Unknown');
                const icon = (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon));
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedGod(god);
                      setShowGodPicker(false);
                      setGodSearchQuery('');
                      // Reset ability ranks when changing god
                      setAbilityRanks({ A01: 0, A02: 0, A03: 0, A04: 0, A05: 0 });
                      setAspectEnabled(false);
                      setSelectedAbility(null);
                      setSelectedItem(null);
                    }}
                  >
                    {icon ? (() => {
                      const localIcon = getLocalGodAsset(icon);
                      if (localIcon) {
                        return (
                          <Image
                            source={localIcon}
                            style={styles.pickerIcon}
                            resizeMode="cover"
                          />
                        );
                      }
                      return (
                        <View style={styles.pickerIconPlaceholder}>
                          <Text style={styles.pickerIconText}>{name.charAt(0)}</Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.pickerIconPlaceholder}>
                        <Text style={styles.pickerIconText}>{name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.pickerText}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
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
        <Pressable style={styles.modalOverlay} onPress={() => {
          setShowItemPicker(null);
          setItemSearchQuery('');
        }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity onPress={() => {
                setShowItemPicker(null);
                setItemSearchQuery('');
                setSelectedStat(null);
              }}>
                <Text style={styles.modalCloseButton}>×</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Only first 20 items shown. Search for more..."
              placeholderTextColor="#94a3b8"
              value={itemSearchQuery}
              onChangeText={setItemSearchQuery}
            />
            <View style={styles.filterButtonContainer}>
              <TouchableOpacity
                style={[styles.filterButton, selectedStat && styles.filterButtonActive]}
                onPress={() => setStatDropdownVisible(!statDropdownVisible)}
              >
                <Text style={styles.filterButtonText}>
                  {selectedStat ? selectedStat : 'Filter'}
                </Text>
                <Text style={styles.filterButtonIcon}>
                  {statDropdownVisible ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              {statDropdownVisible && (
                <View style={styles.pantheonDropdown}>
                  <ScrollView style={styles.pantheonDropdownScroll} nestedScrollEnabled={true}>
                    <TouchableOpacity
                      style={[styles.pantheonOption, !selectedStat && styles.pantheonOptionActive]}
                      onPress={() => {
                        setSelectedStat(null);
                        setStatDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.pantheonOptionText}>All Stats</Text>
                    </TouchableOpacity>
                    {availableStats.map((stat) => (
                      <TouchableOpacity
                        key={stat}
                        style={[styles.pantheonOption, selectedStat === stat && styles.pantheonOptionActive]}
                        onPress={() => {
                          setSelectedStat(stat);
                          setStatDropdownVisible(false);
                        }}
                      >
                        <Text style={styles.pantheonOptionText}>{stat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <ScrollView style={styles.pickerList}>
              {filteredItems.map((item, index) => {
                const name = item.name || item.internalName || 'Unknown';
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => selectItem(item, showItemPicker)}
                  >
                    {item.icon ? (() => {
                      const localIcon = getLocalItemIcon(item.icon);
                      if (localIcon) {
                        return (
                          <Image
                            source={localIcon}
                            style={styles.pickerIcon}
                            resizeMode="cover"
                          />
                        );
                      }
                      return (
                        <View style={styles.pickerIconPlaceholder}>
                          <Text style={styles.pickerIconText}>{name.charAt(0)}</Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.pickerIconPlaceholder}>
                        <Text style={styles.pickerIconText}>{name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={styles.pickerItemInfo}>
                      <Text style={styles.pickerText}>{name}</Text>
                      {item.totalCost && (
                        <Text style={styles.pickerSubtext}>{item.totalCost} Gold</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Ability Tooltip Modal */}
      <Modal
        visible={selectedAbility !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectedAbility(null);
          setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setSelectedAbility(null);
            setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
          }}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedAbility && selectedAbility.ability && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {selectedAbility.ability.icon ? (() => {
                      const localIcon = getLocalGodAsset(selectedAbility.ability.icon);
                      if (localIcon) {
                        return (
                          <Image 
                            source={localIcon} 
                            style={styles.modalAbilityIcon} 
                          />
                        );
                      }
                      return (
                        <View style={styles.modalAbilityIconFallback}>
                          <Text style={styles.modalAbilityIconFallbackText}>
                            {(selectedAbility.abilityName || 'A').charAt(0)}
                          </Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.modalAbilityIconFallback}>
                        <Text style={styles.modalAbilityIconFallbackText}>
                          {(selectedAbility.abilityName || 'A').charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>{selectedAbility.abilityName || 'Ability'}</Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setSelectedAbility(null);
                      setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
                    }}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {selectedAbility.ability.scales && (
                    <View style={styles.abilityTooltipSection}>
                      <TouchableOpacity
                        style={styles.abilityTooltipSectionHeader}
                        onPress={() => setAbilitySectionsExpanded({
                          ...abilitySectionsExpanded,
                          scales: !abilitySectionsExpanded.scales
                        })}
                      >
                        <Text style={styles.abilityTooltipSectionTitle}>Scales</Text>
                        <Text style={styles.abilityTooltipSectionToggle}>
                          {abilitySectionsExpanded.scales ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {abilitySectionsExpanded.scales && (
                        <ScrollView 
                          style={styles.abilityTooltipScrollContent}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          scrollEnabled={true}
                          pointerEvents="auto"
                        >
                          <Text style={styles.abilityTooltipScales}>
                            {String(selectedAbility.ability.scales)}
                          </Text>
                        </ScrollView>
                      )}
                    </View>
                  )}
                  
                  {(selectedAbility.ability.shortDesc || selectedAbility.ability.description) && (
                    <View style={styles.abilityTooltipSection}>
                      <TouchableOpacity
                        style={styles.abilityTooltipSectionHeader}
                        onPress={() => setAbilitySectionsExpanded({
                          ...abilitySectionsExpanded,
                          description: !abilitySectionsExpanded.description
                        })}
                      >
                        <Text style={styles.abilityTooltipSectionTitle}>Description</Text>
                        <Text style={styles.abilityTooltipSectionToggle}>
                          {abilitySectionsExpanded.description ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {abilitySectionsExpanded.description && (
                        <ScrollView 
                          style={styles.abilityTooltipScrollContent}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          scrollEnabled={true}
                          pointerEvents="auto"
                        >
                          <Text style={styles.abilityTooltipDescription}>
                            {selectedAbility.ability.shortDesc 
                              ? String(selectedAbility.ability.shortDesc)
                              : String(selectedAbility.ability.description)}
                          </Text>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {selectedAbility.ability.valueKeys && typeof selectedAbility.ability.valueKeys === 'object' && Object.keys(selectedAbility.ability.valueKeys).length > 0 && (
                    <View style={styles.abilityTooltipSection}>
                      <TouchableOpacity
                        style={styles.abilityTooltipSectionHeader}
                        onPress={() => setAbilitySectionsExpanded({
                          ...abilitySectionsExpanded,
                          stats: !abilitySectionsExpanded.stats
                        })}
                      >
                        <Text style={styles.abilityTooltipSectionTitle}>Stats</Text>
                        <Text style={styles.abilityTooltipSectionToggle}>
                          {abilitySectionsExpanded.stats ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {abilitySectionsExpanded.stats && (
                        <ScrollView 
                          style={styles.abilityTooltipScrollContent}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          scrollEnabled={true}
                          pointerEvents="auto"
                        >
                          <View style={styles.abilityTooltipStats}>
                            {Object.keys(selectedAbility.ability.valueKeys).map((statKey) => {
                              try {
                                const statValue = selectedAbility.ability.valueKeys[statKey];
                                if (!statValue || (Array.isArray(statValue) && statValue.length === 0)) return null;
                                return (
                                  <View key={statKey} style={styles.abilityTooltipStatRow}>
                                    <Text style={styles.abilityTooltipStatLabel}>{String(statKey)}:</Text>
                                    <Text style={styles.abilityTooltipStatValue}>
                                      {Array.isArray(statValue) ? statValue.join(', ') : String(statValue)}
                                    </Text>
                                  </View>
                                );
                              } catch (e) {
                                return null;
                              }
                            })}
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}
                </ScrollView>
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
            {selectedItem && selectedItem.item && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {selectedItem.item.icon ? (() => {
                      const localIcon = getLocalItemIcon(selectedItem.item.icon);
                      if (localIcon) {
                        return (
                          <Image 
                            source={localIcon} 
                            style={styles.modalItemIcon} 
                          />
                        );
                      }
                      return (
                        <View style={styles.modalItemIconFallback}>
                          <Text style={styles.modalItemIconFallbackText}>
                            {(selectedItem.item.name || selectedItem.itemName || 'U').charAt(0)}
                          </Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.modalItemIconFallback}>
                        <Text style={styles.modalItemIconFallbackText}>
                          {(selectedItem.item.name || selectedItem.itemName || 'U').charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>
                    {selectedItem.item.name || selectedItem.itemName || 'Unknown Item'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedItem(null)}>
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {selectedItem.item.tier && (
                    <Text style={styles.modalInfo}>Tier: {selectedItem.item.tier}</Text>
                  )}
                  {selectedItem.item.totalCost && (
                    <Text style={styles.modalInfo}>Cost: {selectedItem.item.totalCost} Gold</Text>
                  )}
                  {selectedItem.item.stepCost && !selectedItem.item.totalCost && (
                    <Text style={styles.modalInfo}>Cost: {selectedItem.item.stepCost} Gold</Text>
                  )}
                  {selectedItem.item.active && (
                    <Text style={styles.modalInfo}>Type: Active/Consumable</Text>
                  )}
                  {selectedItem.item.stats && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Stats</Text>
                      {Object.keys(selectedItem.item.stats).map((statKey) => (
                        <Text key={statKey} style={styles.modalText}>
                          {statKey}: {selectedItem.item.stats[statKey]}
                        </Text>
                      ))}
                    </View>
                  )}
                  {selectedItem.item.passive && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Passive</Text>
                      <Text style={styles.modalText}>{selectedItem.item.passive}</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Aspect Tooltip Modal */}
      <Modal
        visible={selectedAspect !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAspect(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedAspect(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedAspect && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {selectedAspect.icon ? (() => {
                      const localIcon = getLocalGodAsset(selectedAspect.icon);
                      if (localIcon) {
                        return (
                          <Image 
                            source={localIcon} 
                            style={styles.modalAbilityIcon} 
                          />
                        );
                      }
                      return (
                        <View style={styles.modalAbilityIconFallback}>
                          <Text style={styles.modalAbilityIconFallbackText}>A</Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.modalAbilityIconFallback}>
                        <Text style={styles.modalAbilityIconFallbackText}>A</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>
                    {selectedAspect.name ? selectedAspect.name.replace(/\*\*__|__\*\*/g, '') : 'Aspect'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedAspect(null)}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {selectedAspect.description && (
                    <Text style={styles.modalText}>{selectedAspect.description}</Text>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
        </>
      )}

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
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  characterSection: {
    backgroundColor: '#1a1f2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#B8FF12',
    shadowColor: '#B8FF12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    backgroundColor: '#252a3a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a4a4a',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  characterTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#e2e8f0',
    fontSize: 24,
    fontWeight: '700',
  },
  characterPortraitContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  aspectIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#252a3a',
    borderWidth: 3,
    borderColor: '#3a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  aspectIconButtonEnabled: {
    borderColor: '#15803d',
    backgroundColor: '#2a3a3a',
    shadowOpacity: 0.6,
  },
  aspectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  aspectIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectIconText: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '700',
  },
  characterPortrait: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  characterPortraitPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#15803d',
    borderStyle: 'dashed',
  },
  characterPortraitText: {
    color: '#22c55e',
    fontSize: 48,
    fontWeight: '700',
  },
  levelContainer: {
    marginTop: 16,
  },
  sliderContainer: {
    width: '100%',
  },
  sliderTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#2a2f3f',
    borderRadius: 5,
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a4a4a',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#B8FF12',
    borderRadius: 5,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#22c55e',
    position: 'absolute',
    top: -8,
    marginLeft: -13,
    borderWidth: 3,
    borderColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  levelButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#15803d',
  },
  levelButtonText: {
    color: '#22c55e',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  levelText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#1a1f2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#B8FF12',
    shadowColor: '#B8FF12',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#252a3a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a4a4a',
  },
  goldIcon: {
    fontSize: 18,
  },
  goldText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  itemSlot: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#252a3a',
    borderWidth: 2,
    borderColor: '#15803d',
  },
  itemIcon: {
    width: '100%',
    height: '100%',
  },
  itemIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySlot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#15803d',
  },
  emptySlotText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '300',
  },
  buffsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  buffSlot: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#071024',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buffIcon: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buffText: {
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyBuffText: {
    color: '#64748b',
    fontSize: 32,
    fontWeight: '300',
  },
  abilitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  abilityContainer: {
    alignItems: 'center',
    flex: 1,
  },
  abilityIconButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#252a3a',
    borderWidth: 2,
    borderColor: '#15803d',
    marginBottom: 8,
  },
  abilityIcon: {
    width: '100%',
    height: '100%',
  },
  abilityIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityIconText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
  },
  rankContainer: {
    alignItems: 'center',
  },
  rankText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '600',
  },
  rankIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#15803d',
    marginTop: 2,
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  baseStatsContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#3a4a4a',
  },
  baseStatsTitle: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsContainer: {
    marginTop: 8,
  },
  totalStatsTitle: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a4a4a',
    backgroundColor: '#252a3a',
    marginBottom: 4,
    borderRadius: 6,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  noStatsText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  filterButtonContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252a3a',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3a4a4a',
    minWidth: 120,
  },
  filterButtonActive: {
    backgroundColor: '#15803d',
    borderColor: '#22c55e',
  },
  filterButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  filterButtonIcon: {
    color: '#e2e8f0',
    fontSize: 12,
    marginLeft: 8,
  },
  pantheonDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1f2e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#15803d',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  pantheonDropdownScroll: {
    maxHeight: 200,
  },
  pantheonOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a4a4a',
  },
  pantheonOptionActive: {
    backgroundColor: '#252a3a',
  },
  pantheonOptionText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1f2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#3a4a4a',
  },
  modalTitle: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    color: '#e6eef8',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 28,
  },
  searchInput: {
    backgroundColor: '#252a3a',
    color: '#e2e8f0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#3a4a4a',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#252a3a',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#3a4a4a',
  },
  pickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  pickerIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerIconText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
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
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAbilityIconFallbackText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 24,
  },
  modalItemIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  modalItemIconFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemIconFallbackText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 24,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a4a4a',
  },
  modalCloseButtonText: {
    color: '#e2e8f0',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  modalBodyContent: {
    paddingBottom: 8,
  },
  modalInfo: {
    color: '#22c55e',
    fontSize: 14,
    marginBottom: 8,
  },
  modalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#3a4a4a',
  },
  modalSectionTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  abilityTooltipSection: {
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#3a4a4a',
    paddingBottom: 8,
  },
  abilityTooltipSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  abilityTooltipSectionTitle: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
  },
  abilityTooltipSectionToggle: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  abilityTooltipScrollContent: {
    maxHeight: 200,
    paddingVertical: 8,
  },
  abilityTooltipScales: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
  },
  abilityTooltipDescription: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
  },
  abilityTooltipStats: {
    marginTop: 8,
  },
  abilityTooltipStatRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a4a4a',
  },
  abilityTooltipStatLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 100,
  },
  abilityTooltipStatValue: {
    color: '#e2e8f0',
    fontSize: 12,
    flex: 1,
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
  webview: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e1a',
  },
  linkContainer: {
    padding: 16,
    backgroundColor: '#1a1f2e',
    borderTopWidth: 2,
    borderTopColor: '#15803d',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#252a3a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#15803d',
  },
  linkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

