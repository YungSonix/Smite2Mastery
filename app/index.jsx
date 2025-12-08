import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
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
  InteractionManager,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import HomePage from './home';
// Lazy load the large JSON to prevent startup crash
let localBuilds = null;
import DataPage from './data';
import CustomBuildPage from './custombuild';
import PlayerProfilesPage from './playerprofiles';
import { getLocalItemIcon, getLocalGodAsset } from './localIcons';

// Role icons
const roleIcons = {
  'ADC': require('./data/Icons/Role Icons/T_GodRole_Carry_Small.png'),
  'Solo': require('./data/Icons/Role Icons/T_GodRole_Solo_Small.png'),
  'Support': require('./data/Icons/Role Icons/T_GodRole_Support.png'),
  'Mid': require('./data/Icons/Role Icons/T_GodRole_Mid_Small.png'),
  'Jungle': require('./data/Icons/Role Icons/T_GodRole_Jungle.png'),
};

const getRoleIcon = (role) => {
  return roleIcons[role] || null;
};

function BuildsPage({ onGodIconPress }) {
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

  // Lazy load the builds data after the UI has rendered to prevent startup crash
  useEffect(() => {
    let isMounted = true;
    
    // Wait for interactions to complete before loading heavy data
    InteractionManager.runAfterInteractions(() => {
      // Use setTimeout to give the JS thread a breather
      setTimeout(() => {
        try {
          // Dynamic import to load the JSON after app starts
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
      }, 100);
    });
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search query to prevent rapid filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [query]);

  // Reset build indices when role filter changes
  useEffect(() => {
    setSelectedBuildIndex({});
  }, [selectedRole]);

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

  // Memoize pairs to avoid recalculating on every render
  const pairs = useMemo(() => {
    if (!builds) return [];
    return pairGodsAndBuilds(builds);
  }, [builds]);

  // Memoize filtered results using debounced query and role filter
  const filtered = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    
    let result = pairs;
    
    // Filter by role if selected
    if (selectedRole) {
      result = result.filter(({ god, builds: godBuilds }) => {
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
            return buildText.includes('adc') || buildText.includes('carry');
          }
          
          // Handle "Mid" and "Middle" as the same
          if (selectedRoleLower === 'mid') {
            return buildText.includes('mid') || buildText.includes('middle');
          }
          
          // Handle "Support"
          if (selectedRoleLower === 'support') {
            return buildText.includes('support');
          }
          
          // Handle "Jungle"
          if (selectedRoleLower === 'jungle') {
            return buildText.includes('jungle');
          }
          
          // Handle "Solo" - check for solo, bruiser solo, solo bruiser, bruiser solo-lane, etc.
          if (selectedRoleLower === 'solo') {
            const soloPatterns = [
              /\bsolo\b/i,
              /\bbruiser\s+solo/i,
              /\bsolo\s+bruiser/i,
              /\bbruiser\s+solo[\s-]lane/i,
              /\bsolo[\s-]lane/i,
            ];
            
            for (const pattern of soloPatterns) {
              if (pattern.test(buildText)) {
                return true;
              }
            }
            
            const hasBruiser = buildText.includes('bruiser');
            const hasSolo = buildText.includes('solo');
            if (hasBruiser && hasSolo) {
              return true;
            }
            
            return false;
          }
          
          return buildText.includes(selectedRoleLower);
        });
      });
    }
    
    // Filter by search query
    if (lowerQuery.length > 0) {
      result = result.filter(({ god }) => {
        if (!god) return false;
        const name = (god.name || god.GodName || god.title || god.displayName || '').toString().toLowerCase();
        return name.includes(lowerQuery);
      });
    } else if (!selectedRole) {
      // If no search query and no role filter, only show first N gods for performance
      result = result.slice(0, initialDisplayLimit);
    }
    
    return result;
  }, [pairs, debouncedQuery, selectedRole, initialDisplayLimit]);

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
        <Text style={styles.headerSub}>Curated Builds (Made by the Mentor Team) </Text>
        
      </View>

      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          placeholder="Search gods (Zeus...)"
          placeholderTextColor="#cbd5e1"
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.roleFilters}>
          <TouchableOpacity
            style={[styles.roleFilterButton, selectedRole === 'ADC' && styles.roleFilterButtonActive]}
            onPress={() => {
              const newRole = selectedRole === 'ADC' ? null : 'ADC';
              setSelectedRole(newRole);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.roleFilterButtonContent}>
              {getRoleIcon('ADC') && (
                <Image source={getRoleIcon('ADC')} style={styles.roleFilterIcon} contentFit="contain" cachePolicy="memory-disk" />
              )}
              <Text style={[styles.roleFilterText, selectedRole === 'ADC' && styles.roleFilterTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>ADC</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleFilterButton, selectedRole === 'Solo' && styles.roleFilterButtonActive]}
            onPress={() => {
              const newRole = selectedRole === 'Solo' ? null : 'Solo';
              setSelectedRole(newRole);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.roleFilterButtonContent}>
              {getRoleIcon('Solo') && (
                <Image source={getRoleIcon('Solo')} style={styles.roleFilterIcon} contentFit="contain" cachePolicy="memory-disk" />
              )}
              <Text style={[styles.roleFilterText, selectedRole === 'Solo' && styles.roleFilterTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Solo</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleFilterButton, selectedRole === 'Support' && styles.roleFilterButtonActive]}
            onPress={() => {
              const newRole = selectedRole === 'Support' ? null : 'Support';
              setSelectedRole(newRole);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.roleFilterButtonContent}>
              {getRoleIcon('Support') && (
                <Image source={getRoleIcon('Support')} style={styles.roleFilterIcon} contentFit="contain" cachePolicy="memory-disk" />
              )}
              <Text style={[styles.roleFilterText, selectedRole === 'Support' && styles.roleFilterTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Support</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleFilterButton, selectedRole === 'Mid' && styles.roleFilterButtonActive]}
            onPress={() => {
              const newRole = selectedRole === 'Mid' ? null : 'Mid';
              setSelectedRole(newRole);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.roleFilterButtonContent}>
              {getRoleIcon('Mid') && (
                <Image source={getRoleIcon('Mid')} style={styles.roleFilterIcon} contentFit="contain" cachePolicy="memory-disk" />
              )}
              <Text style={[styles.roleFilterText, selectedRole === 'Mid' && styles.roleFilterTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Mid</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleFilterButton, selectedRole === 'Jungle' && styles.roleFilterButtonActive]}
            onPress={() => {
              const newRole = selectedRole === 'Jungle' ? null : 'Jungle';
              setSelectedRole(newRole);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.roleFilterButtonContent}>
              {getRoleIcon('Jungle') && (
                <Image source={getRoleIcon('Jungle')} style={styles.roleFilterIcon} contentFit="contain" cachePolicy="memory-disk" />
              )}
              <Text style={[styles.roleFilterText, selectedRole === 'Jungle' && styles.roleFilterTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Jungle</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.main}>
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
          ) : (
          <ScrollView contentContainerStyle={styles.cardGrid}>
            {filtered.map(({ god, builds: godBuilds }, idx) => {
              if (!god) return null;
              
              const title = (god.name || god.GodName || god.title || god.displayName) || 'Unknown';
              const role = (god.role || god.class || god.type) || '';
              
              // Get all builds for this god (default to empty array)
              let allBuilds = Array.isArray(godBuilds) ? godBuilds : [];
              
              // Filter builds by selected role if a role is selected
              if (selectedRole) {
                const selectedRoleLower = selectedRole.toLowerCase();
                
                const filteredBuilds = allBuilds.filter((build) => {
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
                    return buildText.includes('adc') || buildText.includes('carry');
                  }
                  
                  // Handle "Mid" and "Middle" as the same
                  if (selectedRoleLower === 'mid') {
                    return buildText.includes('mid') || buildText.includes('middle');
                  }
                  
                  // Handle "Support"
                  if (selectedRoleLower === 'support') {
                    return buildText.includes('support');
                  }
                  
                  // Handle "Jungle"
                  if (selectedRoleLower === 'jungle') {
                    return buildText.includes('jungle');
                  }
                  
                  // Handle "Solo" - check for solo, bruiser solo, solo bruiser, bruiser solo-lane, etc.
                  if (selectedRoleLower === 'solo') {
                    // Check for various solo patterns: "solo", "bruiser solo", "solo bruiser", "solo-lane", "solo lane", "bruiser solo-lane", etc.
                    const soloPatterns = [
                      /\bsolo\b/i,                    // "solo" as a word
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
                    
                    // Also check if build text contains both "bruiser" and "solo" (in any order)
                    const hasBruiser = buildText.includes('bruiser');
                    const hasSolo = buildText.includes('solo');
                    if (hasBruiser && hasSolo) {
                      return true;
                    }
                    
                    return false;
                  }
                  
                  return buildText.includes(selectedRoleLower);
                });
                
                // Only show builds that match the selected role - no fallback to all builds
                if (filteredBuilds.length > 0) {
                  allBuilds = filteredBuilds;
                } else {
                  // No matching builds - skip rendering this god entirely
                  allBuilds = [];
                }
              }
              
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
              
              // Extract starter items
              const starter = currentBuild && currentBuild.starting 
                ? currentBuild.starting 
                : (currentBuild && currentBuild.buildsFromT1 ? currentBuild.buildsFromT1 : null);
              
              // Extract final items - prefer `full_build` when present
              const finalItemsRaw = currentBuild && (currentBuild.full_build || currentBuild.fullBuild || currentBuild.components || currentBuild.final || currentBuild.items)
                ? (currentBuild.full_build || currentBuild.fullBuild || currentBuild.components || currentBuild.final || currentBuild.items)
                : null;

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

              // Extract leveling order from tips
              let levelingOrder = null;
              let startOrder = null;
              if (god && god.tips && Array.isArray(god.tips)) {
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
                : { bg: '#0b1226', border: '#1e3a5f', accent: '#7dd3fc' };
              
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
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setExpandedIndex(isExpanded ? null : idx)}>
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
                                      transition={200}
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
                            {isExpanded ? (
                              <Text style={styles.expandIndicator}>▼</Text>
                            ) : (
                              <Text style={styles.expandIndicator}>▶</Text>
                            )}
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
                                  setSelectedBuildIndex(prev => ({ ...prev, [idx]: buildIdx }));
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
                    </View>

                    {isExpanded && (
                      <View style={styles.cardExpandedContent}>

                        {startAbilities && startAbilities.length > 0 && (
                          <View style={styles.levelingOrderContainer} key={`start-order-${idx}-${currentBuildIdx}`}>
                            <Text style={styles.levelingOrderLabel}>Start Order:</Text>
                            <View style={styles.levelingOrderIcons}>
                              {startAbilities.slice(0, 4).map(({ key, ability }, ai) => {
                                const aIconPath = ability && ability.icon ? ability.icon : null;
                                const abilityName = ability.name || ability.key || key;
                                const isLast = ai === startAbilities.slice(0, 4).length - 1;
                                const isFirst = ai === 0;
                                return (
                                  <React.Fragment key={`${idx}-${currentBuildIdx}-start-${ai}-${key}`}>
                                    <TouchableOpacity
                                      style={styles.levelingOrderIconWrapper}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        if (ability && typeof ability === 'object') {
                                          setSelectedAbility({ godIndex: idx, abilityKey: key, ability: ability, abilityName });
                                        }
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      {aIconPath ? (() => {
                                        const localIcon = getLocalGodAsset(aIconPath);
                                        if (localIcon) {
                                          return (
                                        <Image 
                                              source={localIcon} 
                                          style={styles.levelingOrderIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                        />
                                          );
                                        }
                                        // Fallback to text if local icon not found
                                        return (
                                          <View style={styles.levelingOrderIconFallback}>
                                            <Text style={styles.levelingOrderIconFallbackText}>
                                              {abilityName.charAt(0) || key.charAt(key.length - 1)}
                                            </Text>
                                          </View>
                                        );
                                      })() : (
                                        <View style={styles.levelingOrderIconFallback}>
                                          <Text style={styles.levelingOrderIconFallbackText}>
                                            {abilityName.charAt(0) || key.charAt(key.length - 1)}
                                          </Text>
                                        </View>
                                      )}
                                      {isFirst && (
                                        <View style={styles.levelingOrderFirstBadge}>
                                          <Text style={styles.levelingOrderFirstBadgeText}>1st</Text>
                                        </View>
                                      )}
                                      {!isFirst && (
                                        <Text style={styles.levelingOrderNumber}>{ai + 1}</Text>
                                      )}
                                    </TouchableOpacity>
                                    {!isLast && (
                                      <Text style={styles.levelingOrderArrow}>→</Text>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {levelingAbilities && levelingAbilities.length > 0 && (
                          <View style={styles.levelingOrderContainer} key={`max-order-${idx}-${currentBuildIdx}`}>
                            <Text style={styles.levelingOrderLabel}>Max Order:</Text>
                            <View style={styles.levelingOrderIcons}>
                              {levelingAbilities.slice(0, 4).map(({ key, ability }, ai) => {
                                const aIconPath = ability && ability.icon ? ability.icon : null;
                                const abilityName = ability.name || ability.key || key;
                                const isLast = ai === levelingAbilities.slice(0, 4).length - 1;
                                const isFirst = ai === 0;
                                return (
                                  <React.Fragment key={`${idx}-${currentBuildIdx}-leveling-${ai}-${key}`}>
                                    <TouchableOpacity
                                      style={styles.levelingOrderIconWrapper}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        if (ability && typeof ability === 'object') {
                                          setSelectedAbility({ godIndex: idx, abilityKey: key, ability: ability, abilityName });
                                        }
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      {aIconPath ? (() => {
                                        const localIcon = getLocalGodAsset(aIconPath);
                                        if (localIcon) {
                                          return (
                                        <Image 
                                              source={localIcon} 
                                          style={styles.levelingOrderIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                        />
                                          );
                                        }
                                        // Fallback to text if local icon not found
                                        return (
                                          <View style={styles.levelingOrderIconFallback}>
                                            <Text style={styles.levelingOrderIconFallbackText}>
                                              {abilityName.charAt(0) || key.charAt(key.length - 1)}
                                            </Text>
                                          </View>
                                        );
                                      })() : (
                                        <View style={styles.levelingOrderIconFallback}>
                                          <Text style={styles.levelingOrderIconFallbackText}>
                                            {abilityName.charAt(0) || key.charAt(key.length - 1)}
                                          </Text>
                                        </View>
                                      )}
                                      {isFirst && (
                                        <View style={styles.levelingOrderFirstBadge}>
                                          <Text style={styles.levelingOrderFirstBadgeText}>1st</Text>
                                        </View>
                                      )}
                                      {!isFirst && (
                                        <Text style={styles.levelingOrderNumber}>{ai + 1}</Text>
                                      )}
                                    </TouchableOpacity>
                                    {!isLast && (
                                      <Text style={styles.levelingOrderArrow}>→</Text>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {showAspect && aspect && (
                          <View style={styles.aspectContainer}>
                            <TouchableOpacity
                              style={styles.aspectRow}
                              onPress={(e) => {
                                e.stopPropagation();
                                const aspectName = aspect.name ? aspect.name.replace(/\*\*__|__\*\*/g, '') : 'Aspect';
                                setSelectedAbility({ godIndex: idx, abilityKey: 'aspect', ability: aspect, abilityName: aspectName });
                              }}
                            >
                              {aspect.icon ? (() => {
                                const localIcon = getLocalGodAsset(aspect.icon);
                                if (localIcon) {
                                  return (
                                    <Image 
                                      source={localIcon} 
                                      style={styles.aspectIcon}
                                      contentFit="cover"
                                      cachePolicy="memory-disk"
                                      transition={200}
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
                              </View>
                            </TouchableOpacity>
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
                                      setSelectedItem({ item: meta, itemName: s });
                                    }}
                                  >
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
                                                  transition={200}
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
                                                  transition={200}
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
                                                transition={200}
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
                                    setSelectedItem({ item: meta, itemName: f });
                                  }}
                                >
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
                                            transition={200}
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
                                            transition={200}
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
                                          transition={200}
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
                                </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                        {god && god.tips && Array.isArray(god.tips) && (
                          <View style={styles.expand}>
                            <Text style={styles.expandTitle}>Tips</Text>
                            {(() => {
                              const filteredTips = god.tips.filter(tip => tip && tip.title && !tip.title.toLowerCase().includes('leveling'));
                              return filteredTips.length > 0 ? (
                                <View style={styles.tipButtonsContainer}>
                                  {filteredTips.map((tip, tipIdx) => (
                                    <TouchableOpacity
                                      key={tipIdx}
                                      style={styles.tipButton}
                                      onPress={() => setSelectedTip({ tip, tipIndex: tipIdx + 1, godIndex: idx })}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.tipButtonText}>{tipIdx + 1}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              ) : (
                                <Text style={styles.noTipsText}>No tips available</Text>
                              );
                            })()}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          )}
        </View>
      </View>

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
    marginTop: 4,
  },
  controls: {
    marginBottom: 12,
  },
  search: {
    backgroundColor: '#06202f',
    color: '#e6eef8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleFilters: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
  roleFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#06202f',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  roleFilterButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  roleFilterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flexShrink: 1,
  },
  roleFilterIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    flexShrink: 0,
  },
  roleFilterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  roleFilterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
  content: { flex: 1, marginTop: 8 },
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
    color: '#7dd3fc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0f1724',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1e90ff',
    lineHeight: 20,
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
    padding: 20,
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
});

// Main App Component with Navigation
export default function App() {
  const [currentPage, setCurrentPage] = useState('homepage');
  const [godFromBuilds, setGodFromBuilds] = useState(null);
  const [expandAbilities, setExpandAbilities] = useState(false);
  const [dataPageKey, setDataPageKey] = useState(0);

  // Disable browser inspection on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Disable right-click context menu
      const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable keyboard shortcuts for dev tools
      const handleKeyDown = (e) => {
        // Disable F12
        if (e.keyCode === 123) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+I (Chrome DevTools)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+J (Chrome Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+C (Chrome Element Inspector)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+P (Print)
        if (e.ctrlKey && e.keyCode === 80) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+K (Firefox Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 75) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+E (Firefox Network Monitor)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 69) {
          e.preventDefault();
          return false;
        }
      };

      // Disable text selection (but allow in input fields)
      const handleSelectStart = (e) => {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          return false;
        }
      };

      // Disable drag
      const handleDragStart = (e) => {
        e.preventDefault();
        return false;
      };

      // Disable copy (but allow in input fields)
      const handleCopy = (e) => {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          return false;
        }
      };

      // Disable cut (but allow in input fields)
      const handleCut = (e) => {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          return false;
        }
      };

      // Disable paste (but allow in input fields)
      const handlePaste = (e) => {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          return false;
        }
      };

      // Add event listeners
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('selectstart', handleSelectStart);
      document.addEventListener('dragstart', handleDragStart);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);
      document.addEventListener('paste', handlePaste);

      // Disable console methods first
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
      console.clear = noop;

      // Disable dev tools detection
      let devtools = { open: false };
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: function() {
          devtools.open = true;
          // Optionally redirect or show warning
          // window.location.href = 'about:blank';
        }
      });

      // Check for dev tools periodically
      const checkDevTools = setInterval(() => {
        devtools.open = false;
        // Use original console for detection
        originalConsole.log(element);
        originalConsole.clear();
        if (devtools.open) {
          // Dev tools detected - you can add custom handling here
          // For example: window.location.href = 'about:blank';
        }
      }, 1000);

      // Cleanup function
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('selectstart', handleSelectStart);
        document.removeEventListener('dragstart', handleDragStart);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCut);
        document.removeEventListener('paste', handlePaste);
        clearInterval(checkDevTools);
        // Restore console
        Object.assign(console, originalConsole);
      };
    }
  }, []);

  return (
    <View style={navStyles.container}>
      <View style={navStyles.navBar}>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'playerprofiles' && navStyles.navButtonActive]}
          onPress={() => setCurrentPage('playerprofiles')}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'playerprofiles' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            Player Profiles
          </Text>
        </TouchableOpacity>
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
            Database
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'homepage' && navStyles.navButtonActive]}
          onPress={() => setCurrentPage('homepage')}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'homepage' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'builds' && navStyles.navButtonActive]}
          onPress={() => setCurrentPage('builds')}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'builds' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
Builds
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[navStyles.navButton, currentPage === 'custombuild' && navStyles.navButtonActive]}
          onPress={() => setCurrentPage('custombuild')}
        >
          <Text style={[navStyles.navButtonText, currentPage === 'custombuild' && navStyles.navButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            Custom Build
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Keep BuildsPage always mounted to preserve state, but hide when not active */}
      <View style={currentPage === 'builds' ? navStyles.pageVisible : navStyles.pageHidden} pointerEvents={currentPage === 'builds' ? 'auto' : 'none'}>
        <BuildsPage 
          key="builds-page" 
          onGodIconPress={(god, shouldExpandAbilities = false) => { 
            setGodFromBuilds(god); 
            setExpandAbilities(shouldExpandAbilities);
            setCurrentPage('data');
            setDataPageKey(prev => prev + 1);
          }} 
        />
      </View>
      
      {/* Render other pages conditionally */}
      {currentPage === 'playerprofiles' && <PlayerProfilesPage />}
      {currentPage === 'homepage' && <HomePage />}
      {currentPage === 'custombuild' && <CustomBuildPage />}
      {currentPage === 'data' && (
        <DataPage 
          key={`data-page-${dataPageKey}`}
          initialSelectedGod={godFromBuilds} 
          initialExpandAbilities={expandAbilities}
          onBackToBuilds={() => { 
            setGodFromBuilds(null); 
            setExpandAbilities(false);
            setCurrentPage('builds'); 
          }} 
        />
      )}
    </View>
  );
}

const navStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071024',
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
  },
  navButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  navButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
