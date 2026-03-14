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
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import CryptoJS from 'crypto-js';
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

export default function MyBuildsPage({ onEditBuild = null }) {
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [communityBuilds, setCommunityBuilds] = useState([]);
  const [contributorBuilds, setContributorBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildsData, setBuildsData] = useState(null);
  const [failedItemIcons, setFailedItemIcons] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loadBuilds = async () => {
    try {
      const data = require('./data/builds.json');
      setBuildsData(data);
      const user = await storage.getItem('currentUser');
      setCurrentUser(user);
      if (user) {
        const savedBuildsData = await storage.getItem(`savedBuilds_${user}`);
        if (savedBuildsData) {
          setSavedBuilds(JSON.parse(savedBuildsData));
        }
        try {
          const { supabase } = require('../config/supabase');
          const { data: communityData, error: communityError } = await supabase
            .from('community_builds')
            .select('*')
            .eq('username', user)
            .order('created_at', { ascending: false });
          if (communityError) {
            setCommunityBuilds([]);
          } else {
            setCommunityBuilds((communityData ?? []).map(build => ({
              ...build,
              databaseId: build.id,
              databaseTable: 'community_builds',
              fromDatabase: true,
            })));
          }
          const { data: contributorData, error: contributorError } = await supabase
            .from('contributor_builds')
            .select('*')
            .eq('username', user)
            .order('created_at', { ascending: false });
          if (contributorError) {
            setContributorBuilds([]);
          } else {
            setContributorBuilds((contributorData ?? []).map(build => ({
              ...build,
              databaseId: build.id,
              databaseTable: 'contributor_builds',
              fromDatabase: true,
            })));
          }
        } catch (supabaseError) {
          console.error('Error loading builds from Supabase:', supabaseError);
        }
      }
    } catch (error) {
      console.error('Error loading builds:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuilds();
  }, []);

  const deleteBuild = async (build, index) => {
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
              if (build.fromDatabase) {
                // Delete from Supabase
                const { supabase } = require('../config/supabase');
                const table = build.databaseTable || (build.type === 'contributor' ? 'contributor_builds' : 'community_builds');
                const { error } = await supabase
                  .from(table)
                  .delete()
                  .eq('id', build.databaseId || build.id)
                  .eq('username', currentUser);
                
                if (error) {
                  Alert.alert('Error', 'Failed to delete build.');
                } else {
                  loadBuilds(); // Reload builds
                }
              } else {
                // Delete local build
                const user = await storage.getItem('currentUser');
                const updated = savedBuilds.filter((_, i) => i !== index);
                await storage.setItem(`savedBuilds_${user}`, JSON.stringify(updated));
                setSavedBuilds(updated);
              }
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

  // Categorize builds
  const localBuildsList = savedBuilds.map(b => ({ ...b, type: 'local' }));
  const communityBuildsList = communityBuilds.map(b => ({ ...b, type: 'community' }));
  const contributorBuildsList = contributorBuilds.map(b => ({ ...b, type: 'contributor' }));

  const allUserBuilds = [
    ...localBuildsList,
    ...communityBuildsList,
    ...contributorBuildsList,
  ];

  if (allUserBuilds.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Builds</Text>
            <Text style={styles.emptyText}>
              {currentUser 
                ? 'Your saved builds and posted builds will appear here.'
                : 'Please log in to see your builds.'}
            </Text>
            {!currentUser && (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => setShowLoginModal(true)}
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

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
                              setCurrentUser(loginUsername.trim());
                              setShowLoginModal(false);
                              setLoginUsername('');
                              setLoginPassword('');
                              Alert.alert('Success', 'Logged in successfully!');
                              setIsLoggingIn(false);
                              loadBuilds(); // Reload builds after login
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
                          loadBuilds(); // Reload builds after login
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
                            setCurrentUser(loginUsername.trim());
                            setShowLoginModal(false);
                            setLoginUsername('');
                            setLoginPassword('');
                            Alert.alert('Success', 'Logged in successfully!');
                            setIsLoggingIn(false);
                            loadBuilds(); // Reload builds after login
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Local Builds Section */}
        {localBuildsList.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Local Builds</Text>
            {localBuildsList.map((build, index) => {
              const buildIndex = index; // Index within local builds
              return renderBuildCard(build, buildIndex, 'local');
            })}
          </>
        )}

        {/* Community Builds Section */}
        {communityBuildsList.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Community Builds</Text>
            {communityBuildsList.map((build, index) => {
              const buildIndex = index; // Index within community builds
              return renderBuildCard(build, buildIndex, 'community');
            })}
          </>
        )}

        {/* Contributor Builds Section */}
        {contributorBuildsList.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Contributor Builds</Text>
            {contributorBuildsList.map((build, index) => {
              const buildIndex = index; // Index within contributor builds
              return renderBuildCard(build, buildIndex, 'contributor');
            })}
          </>
        )}
      </ScrollView>
    </View>
  );

  function renderBuildCard(build, index, categoryType) {
    // Get god name and icon
    const godName = build.god_name || build.god || 'Unknown';
    const godInternalName = build.god_internal_name || build.godInternalName;
    const godIcon = build.godIcon || (buildsData && (() => {
      const gods = flattenAny(buildsData.gods);
      const god = gods.find(g => 
        (g.name || g.GodName || '').toLowerCase() === godName.toLowerCase() ||
        (g.internalName || g.GodName || '').toLowerCase() === (godInternalName || '').toLowerCase()
      );
      return god && (god.icon || god.GodIcon);
    })());
    const localGodIcon = godIcon ? getLocalGodAsset(godIcon) : null;
    
    // Get build name
    const buildName = build.build_name || build.name || 'Unnamed Build';
    
    // Get items (handle both database format and local format)
    const items = build.items || [];
    
    // Get build type badge
    const buildType = build.type || (build.fromDatabase ? (build.databaseTable === 'contributor_builds' ? 'contributor' : 'community') : 'local');

    return (
      <View key={`${categoryType}-${index}`} style={styles.buildCard}>
        <View style={styles.buildHeader}>
          <View style={styles.buildHeaderLeft}>
            {localGodIcon ? (
              <Image
                source={localGodIcon}
                style={styles.godIcon}
                contentFit="cover"
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
                {buildType && (
                  <View style={[styles.buildTypeBadge, buildType === 'contributor' && styles.buildTypeBadgeContributor]}>
                    <Text style={styles.buildTypeText}>
                      {buildType === 'contributor' ? 'Contributor' : buildType === 'community' ? 'Community' : 'Local'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.buildGod}>{godName}</Text>
              <Text style={styles.buildLevel}>Level {build.god_level || build.godLevel || 20}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteBuild(build, index)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsContainer}>
          {items && items.length > 0 ? (
            items.map((itemData, itemIndex) => {
              const itemName = itemData.name || itemData.internalName;
              const item = findItemByName(itemName);
              const icon = item?.icon || itemData.icon;
              const localItemIcon = icon ? getLocalItemIcon(icon) : null;
              const iconKey = `${categoryType}-${index}-${itemIndex}`;
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
                        {itemName ? itemName.charAt(0) : '?'}
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
        {build.fromDatabase && onEditBuild && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              // Transform database build to format expected by CustomBuildPage
              const editBuild = {
                title: build.build_name || build.name,
                notes: build.notes || build.build_name || build.name,
                author: build.username || build.author,
                items: build.items || [],
                startingItems: build.starting_items || [],
                relic: build.relic || null,
                godLevel: build.god_level || build.godLevel || 20,
                aspectActive: build.aspect_active || build.aspectActive || false,
                gamemodes: build.gamemodes || [],
                abilityLevelingOrder: build.ability_leveling_order || [],
                startingAbilityOrder: build.starting_ability_order || [],
                itemSwaps: build.item_swaps || [],
                roles: build.roles || [],
                tips: build.tips || '',
                god: buildsData ? (() => {
                  const gods = flattenAny(buildsData.gods);
                  return gods.find(g => 
                    (g.name || g.GodName || '').toLowerCase() === godName.toLowerCase() ||
                    (g.internalName || g.GodName || '').toLowerCase() === (godInternalName || '').toLowerCase()
                  );
                })() : null,
                databaseId: build.databaseId || build.id,
                databaseTable: build.databaseTable || (buildType === 'contributor' ? 'contributor_builds' : 'community_builds'),
                fromDatabase: true,
                databaseCategory: buildType === 'contributor' ? 'contributor' : 'community',
              };
              onEditBuild(editBuild);
            }}
          >
            <Text style={styles.editButtonText}>✏️ Edit Build</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
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
  buildNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  buildName: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
  },
  buildTypeBadge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a4a6a',
  },
  buildTypeBadgeContributor: {
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
  sectionHeader: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  editButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginTop: 16,
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
  // Login Modal Styles (matching profile.jsx for consistency)
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
  modalContainer: {
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

