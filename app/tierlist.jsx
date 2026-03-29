import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { getLocalGodAsset, getLocalItemIcon } from './localIcons';
import { flattenBuildsGods } from '../lib/normalizeBuildsGod';

const IS_WEB = Platform.OS === 'web';

// Helper function to flatten nested arrays (like data.jsx)
function flattenAny(a) {
  if (!a) return [];
  if (!Array.isArray(a)) return [a];
  return a.flat(Infinity).filter(Boolean);
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

const DEFAULT_TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];

export default function TierlistPage() {
  const [mode, setMode] = useState('gods'); // 'gods' or 'items'
  const [tierlist, setTierlist] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildsData, setBuildsData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      try {
        const data = require('./data/builds.json');
        if (!cancelled) setBuildsData(data);
      } catch (e) {
        console.error('Failed to load builds.json:', e);
        if (!cancelled) setBuildsData(null);
      }
    });
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, []);

  // Load saved tierlist from storage
  useEffect(() => {
    const loadTierlist = async () => {
      try {
        const saved = await storage.getItem(`tierlist_${mode}`);
        if (saved) {
          setTierlist(JSON.parse(saved));
        } else {
          // Initialize empty tierlist
          const initialTierlist = {};
          DEFAULT_TIERS.forEach(tier => {
            initialTierlist[tier] = [];
          });
          setTierlist(initialTierlist);
        }
      } catch (e) {
        console.error('Error loading tierlist:', e);
        const initialTierlist = {};
        DEFAULT_TIERS.forEach(tier => {
          initialTierlist[tier] = [];
        });
        setTierlist(initialTierlist);
      } finally {
        setLoading(false);
      }
    };
    loadTierlist();
  }, [mode]);

  // Save tierlist to storage
  useEffect(() => {
    if (!loading && Object.keys(tierlist).length > 0) {
      storage.setItem(`tierlist_${mode}`, JSON.stringify(tierlist));
    }
  }, [tierlist, mode, loading]);

  // Get available entities (gods or tier 3 items) - load from builds.json like data.jsx
  const availableEntities = useMemo(() => {
    if (mode === 'gods') {
      if (!buildsData) return [];
      const gods = flattenBuildsGods(buildsData.gods);
      return gods;
    }
    if (!buildsData) return [];
    const allItems = flattenAny(buildsData.items);
    return allItems.filter(item => {
      if (!item || typeof item !== 'object') return false;
      return item.tier === 3 || item.Tier === 3;
    });
  }, [mode, buildsData]);

  // Filter entities by search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return availableEntities;
    const query = searchQuery.toLowerCase().trim();
    return availableEntities.filter(entity => {
      const name = mode === 'gods' 
        ? (entity.godName || entity.name || '')
        : (entity.name || entity.internalName || '');
      return name.toLowerCase().includes(query);
    });
  }, [availableEntities, searchQuery, mode]);

  // Get all entities currently in tierlist
  const tierlistedEntities = useMemo(() => {
    const set = new Set();
    Object.values(tierlist).forEach(tierArray => {
      tierArray.forEach(entity => {
        const key = mode === 'gods'
          ? (entity.name || entity.GodName || entity.godName || entity.title || '')
          : (entity.name || entity.internalName || '');
        if (key) set.add(key);
      });
    });
    return set;
  }, [tierlist, mode]);

  // Filter out entities that are already in tierlist
  const unassignedEntities = useMemo(() => {
    return filteredEntities.filter(entity => {
      const key = mode === 'gods'
        ? (entity.godName || entity.name || '')
        : (entity.name || entity.internalName || '');
      return !tierlistedEntities.has(key);
    });
  }, [filteredEntities, tierlistedEntities, mode]);

  // Add entity to tier
  const addToTier = (entity, tier) => {
    setTierlist(prev => {
      const newTierlist = { ...prev };
      if (!newTierlist[tier]) {
        newTierlist[tier] = [];
      }
      // Check if already in this tier
      const key = mode === 'gods'
        ? (entity.godName || entity.name || '')
        : (entity.name || entity.internalName || '');
      const exists = newTierlist[tier].some(e => {
        const eKey = mode === 'gods'
          ? (e.godName || e.name || '')
          : (e.name || e.internalName || '');
        return eKey === key;
      });
      if (!exists) {
        newTierlist[tier] = [...newTierlist[tier], entity];
      }
      return newTierlist;
    });
  };

  // Remove entity from tier
  const removeFromTier = (entity, tier) => {
    setTierlist(prev => {
      const newTierlist = { ...prev };
      if (!newTierlist[tier]) return newTierlist;
      const key = mode === 'gods'
        ? (entity.godName || entity.name || '')
        : (entity.name || entity.internalName || '');
      newTierlist[tier] = newTierlist[tier].filter(e => {
        const eKey = mode === 'gods'
          ? (e.godName || e.name || '')
          : (e.name || e.internalName || '');
        return eKey !== key;
      });
      return newTierlist;
    });
  };

  // Move entity between tiers
  const moveEntity = (entity, fromTier, toTier) => {
    removeFromTier(entity, fromTier);
    addToTier(entity, toTier);
  };

  // Get entity icon (like data.jsx)
  const getEntityIcon = (entity) => {
    if (mode === 'gods') {
      const iconPath = entity.icon || entity.GodIcon || (entity.abilities && entity.abilities.A01 && entity.abilities.A01.icon);
      return getLocalGodAsset(iconPath);
    } else {
      return getLocalItemIcon(entity.icon);
    }
  };

  // Get entity name
  const getEntityName = (entity) => {
    if (mode === 'gods') {
      return entity.name || entity.GodName || entity.godName || entity.title || 'Unknown';
    } else {
      return entity.name || entity.internalName || 'Unknown';
    }
  };

  if (loading || buildsData === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>
          {loading ? 'Loading tierlists...' : 'Loading gods and items...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Personal tierlists</Text>
        
        {/* Mode selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'gods' && styles.modeButtonActive]}
            onPress={() => {
              setMode('gods');
              setSearchQuery('');
              setSelectedTier(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeButtonText, mode === 'gods' && styles.modeButtonTextActive]}>
              Gods
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'items' && styles.modeButtonActive]}
            onPress={() => {
              setMode('items');
              setSearchQuery('');
              setSelectedTier(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeButtonText, mode === 'items' && styles.modeButtonTextActive]}>
              Tier 3 Items
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Tier rows */}
        {DEFAULT_TIERS.map(tier => {
          const tierColor = getTierColor(tier);
          const entitiesInTier = tierlist[tier] || [];
          
          return (
            <View key={tier} style={styles.tierRow}>
              <View style={[styles.tierLabel, { backgroundColor: tierColor }]}>
                <Text style={styles.tierLabelText}>{tier}</Text>
              </View>
              <ScrollView 
                horizontal 
                style={styles.tierContent}
                contentContainerStyle={styles.tierContentContainer}
                showsHorizontalScrollIndicator={false}
              >
                {entitiesInTier.map((entity, idx) => {
                  const icon = getEntityIcon(entity);
                  const name = getEntityName(entity);
                  
                  return (
                    <TouchableOpacity
                      key={`${tier}-${idx}-${name}`}
                      style={styles.entityCard}
                      onPress={() => {
                        if (selectedTier && selectedTier !== tier) {
                          moveEntity(entity, tier, selectedTier);
                          setSelectedTier(null);
                        }
                      }}
                      onLongPress={() => {
                        removeFromTier(entity, tier);
                      }}
                      activeOpacity={0.7}
                    >
                      {icon ? (
                        <Image
                          source={icon.primary || icon}
                          style={styles.entityIcon}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.entityIconPlaceholder}>
                          <Text style={styles.entityIconPlaceholderText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.entityName} numberOfLines={1}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {entitiesInTier.length === 0 && (
                  <View style={styles.emptyTierPlaceholder}>
                    <Text style={styles.emptyTierText}>Drop {mode === 'gods' ? 'gods' : 'items'} here</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}

        {/* Search and unassigned entities */}
        <View style={styles.unassignedSection}>
          <Text style={styles.unassignedTitle}>Available {mode === 'gods' ? 'Gods' : 'Items'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${mode === 'gods' ? 'gods' : 'items'}...`}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          {/* Tier selector for adding */}
          <View style={styles.tierSelector}>
            <Text style={styles.tierSelectorLabel}>Select tier to add to:</Text>
            <View style={styles.tierSelectorButtons}>
              {DEFAULT_TIERS.map(tier => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.tierSelectorButton,
                    selectedTier === tier && styles.tierSelectorButtonActive,
                    { backgroundColor: selectedTier === tier ? getTierColor(tier) : '#0b1226' }
                  ]}
                  onPress={() => setSelectedTier(selectedTier === tier ? null : tier)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tierSelectorButtonText,
                    selectedTier === tier && styles.tierSelectorButtonTextActive
                  ]}>
                    {tier}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Unassigned entities grid */}
          <View style={styles.unassignedGrid}>
            {unassignedEntities.slice(0, 50).map((entity, idx) => {
              const icon = getEntityIcon(entity);
              const name = getEntityName(entity);
              
              return (
                <TouchableOpacity
                  key={`unassigned-${idx}-${name}`}
                  style={styles.unassignedEntityCard}
                  onPress={() => {
                    if (selectedTier) {
                      addToTier(entity, selectedTier);
                    } else {
                      // If no tier selected, show alert or select first tier
                      addToTier(entity, DEFAULT_TIERS[0]);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {icon ? (
                    <Image
                      source={icon.primary || icon}
                      style={styles.unassignedEntityIcon}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.unassignedEntityIconPlaceholder}>
                      <Text style={styles.unassignedEntityIconPlaceholderText}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.unassignedEntityName} numberOfLines={1}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {unassignedEntities.length > 50 && (
            <Text style={styles.moreEntitiesText}>
              +{unassignedEntities.length - 50} more (use search to find specific {mode === 'gods' ? 'gods' : 'items'})
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Get color for tier
function getTierColor(tier) {
  const colors = {
    'S': '#ef4444', // red
    'A': '#f97316', // orange
    'B': '#eab308', // yellow
    'C': '#22c55e', // green
    'D': '#3b82f6', // blue
    'F': '#8b5cf6', // purple
  };
  return colors[tier] || '#64748b';
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071024',
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
    }),
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#0b1226',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  modeButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  modeButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tierRow: {
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 120,
    backgroundColor: '#0b1226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
  },
  tierLabel: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tierLabelText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    transform: [{ rotate: '-90deg' }],
  },
  tierContent: {
    flex: 1,
  },
  tierContentContainer: {
    padding: 12,
    gap: 8,
  },
  entityCard: {
    width: 80,
    alignItems: 'center',
    marginRight: 8,
  },
  entityIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  entityIconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entityIconPlaceholderText: {
    color: '#94a3b8',
    fontSize: 24,
    fontWeight: '700',
  },
  entityName: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyTierPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTierText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  unassignedSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  unassignedTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#0b1226',
    color: '#e6eef8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  tierSelector: {
    marginBottom: 20,
  },
  tierSelectorLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 8,
  },
  tierSelectorButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tierSelectorButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  tierSelectorButtonActive: {
    borderColor: '#ffffff',
  },
  tierSelectorButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  tierSelectorButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  unassignedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unassignedEntityCard: {
    width: 80,
    alignItems: 'center',
    marginBottom: 8,
  },
  unassignedEntityIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  unassignedEntityIconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unassignedEntityIconPlaceholderText: {
    color: '#94a3b8',
    fontSize: 24,
    fontWeight: '700',
  },
  unassignedEntityName: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  moreEntitiesText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
