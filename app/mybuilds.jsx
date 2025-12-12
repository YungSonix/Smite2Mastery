import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
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

export default function MyBuildsPage() {
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildsData, setBuildsData] = useState(null);
  const [failedItemIcons, setFailedItemIcons] = useState({});

  useEffect(() => {
    loadSavedBuilds();
  }, []);

  const loadSavedBuilds = async () => {
    try {
      const data = require('./data/builds.json');
      setBuildsData(data);
      
      const currentUser = await storage.getItem('currentUser');
      if (currentUser) {
        const savedBuildsData = await storage.getItem(`savedBuilds_${currentUser}`);
        if (savedBuildsData) {
          setSavedBuilds(JSON.parse(savedBuildsData));
        }
      }
    } catch (error) {
      console.error('Error loading saved builds:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBuild = async (index) => {
    Alert.alert(
      'Delete Build',
      'Are you sure you want to delete this build?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = await storage.getItem('currentUser');
              const updated = savedBuilds.filter((_, i) => i !== index);
              await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(updated));
              setSavedBuilds(updated);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete build.');
            }
          },
        },
      ]
    );
  };

  function flattenAny(a) {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
  }

  const allItems = buildsData ? flattenAny(buildsData.items) : [];

  const findItemByName = (itemName) => {
    return allItems.find(item => {
      const name = item.name || item.internalName || '';
      const internalName = item.internalName || '';
      return name.toLowerCase() === itemName.toLowerCase() ||
             internalName.toLowerCase() === itemName.toLowerCase();
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  }

  if (savedBuilds.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Saved Builds</Text>
            <Text style={styles.emptyText}>Your saved builds will appear here.</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {savedBuilds.map((build, index) => {
          const godIcon = build.godIcon || (buildsData && (() => {
            const gods = flattenAny(buildsData.gods);
            const god = gods.find(g => 
              (g.name || g.GodName || '').toLowerCase() === (build.god || '').toLowerCase() ||
              (g.internalName || g.GodName || '').toLowerCase() === (build.godInternalName || '').toLowerCase()
            );
            return god && (god.icon || god.GodIcon);
          })());
          const localGodIcon = godIcon ? getLocalGodAsset(godIcon) : null;

          return (
            <View key={index} style={styles.buildCard}>
              <View style={styles.buildHeader}>
                <View style={styles.buildHeaderLeft}>
                  {localGodIcon ? (
                    <Image
                      source={localGodIcon}
                      style={styles.godIcon}
                      contentFit="cover"
                      accessibilityLabel={`${build.god || 'God'} icon`}
                    />
                  ) : (
                    <View style={styles.godIconFallback}>
                      <Text style={styles.godIconFallbackText}>
                        {(build.god || '?').charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.buildInfo}>
                    <Text style={styles.buildName}>{build.name || 'Unnamed Build'}</Text>
                    <Text style={styles.buildGod}>{build.god}</Text>
                    <Text style={styles.buildLevel}>Level {build.godLevel || 20}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteBuild(index)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemsContainer}>
                {build.items && build.items.length > 0 ? (
                  build.items.map((itemData, itemIndex) => {
                    const item = findItemByName(itemData.name || itemData.internalName);
                    const icon = item?.icon || itemData.icon;
                    const itemName = item?.name || itemData.name || itemData.internalName;
                    const localItemIcon = icon ? getLocalItemIcon(icon) : null;
                    const iconKey = `mybuild-${index}-${itemIndex}`;
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
                              {itemName.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noItemsText}>No items</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071024',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
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
  buildName: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
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
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
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
  noItemsText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

