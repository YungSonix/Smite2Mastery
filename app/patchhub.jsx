import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Linking,
  ActivityIndicator,
  InteractionManager,
  Modal,
  Pressable,
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

export default function PatchHubPage({ subTab = 'simple' }) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  const [selectedLastPatch, setSelectedLastPatch] = useState(25); // Default to OB25 (latest)
  const [catchUpData, setCatchUpData] = useState(null);
  const [catchUpLoading, setCatchUpLoading] = useState(false);
  const [showPatchPicker, setShowPatchPicker] = useState(false);
  const patchPickerScrollRef = React.useRef(null);
  const [patchData, setPatchData] = useState(null);
  const [buildsData, setBuildsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failedItemIcons, setFailedItemIcons] = useState({}); // Track which item icons failed to load
  
  // Track which sections are expanded (for Simple Summary)
  const [expandedSections, setExpandedSections] = useState({
    newGods: true,
    godsBuffed: true,
    newAspects: true,
    godsNerfed: true,
    godsShifted: true,
    itemsBuffed: true,
    itemsNew: true,
    itemsNerfed: true,
    itemsChanged: true,
    gameModes: true,
  });
  
  // Track which catch up sections are expanded
  const [catchUpExpandedSections, setCatchUpExpandedSections] = useState({
    catchUpNewGods: true,
    catchUpGodsBuffed: true,
    catchUpNewAspects: true,
    catchUpGodsNerfed: true,
    catchUpGodsShifted: true,
    catchUpItems: true,
    catchUpItemsNew: true,
    catchUpGameModes: true,
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const toggleCatchUpSection = (section) => {
    setCatchUpExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const [tooltipData, setTooltipData] = useState(null);
  const [catchUpTooltip, setCatchUpTooltip] = useState(null); // For catch up icon tooltips
  const [expandedAbilities, setExpandedAbilities] = useState({}); // Track expanded abilities in tooltip

  // Transform new format (array of god objects with changes array) to grouped format
  const transformPatchData = (rawData) => {
    if (!rawData || !rawData.gods || !Array.isArray(rawData.gods)) {
      return rawData; // Return as-is if already in old format or invalid
    }
    
    // Group gods by name and changeType
    const grouped = {
      summary: rawData.summary || '',
      gods: {
        new: [],
        newAspects: [],
        buffedAspects: [],
        nerfedAspects: [],
        buffed: [],
        buffedAspects: [],
        nerfed: [],
        nerfedAspects: [],
        shifted: []
      },
      items: {
        buffed: [],
        new: [],
        nerfed: [],
        changed: []
      },
      gameModes: rawData.gameModes || [],
      newFeatures: rawData.newFeatures || [],
      metaShifts: rawData.metaShifts || []
    };
    
    // Process gods - each god entry has changeType and changes array
    rawData.gods.forEach(godEntry => {
      if (!godEntry.name || !godEntry.changeType || !Array.isArray(godEntry.changes)) return;
      
      const godName = godEntry.name;
      const changeType = godEntry.changeType.toLowerCase();
      
      // Map changeType to our format (handle combined types like "fix/buff", "shift/buff")
      let category = 'shifted';
      if (changeType === 'new') category = 'new';
      else if (changeType === 'newAspects' || changeType.includes('newAspects')) category = 'newAspects';
      else if (changeType === 'buffAspects') category = 'buffedAspects';
      else if (changeType === 'nerfAspects') category = 'nerfedAspects';
      else if (changeType.includes('buff') && !changeType.includes('nerf')) category = 'buffed';
      else if (changeType.includes('nerf')) category = 'nerfed';
      else if (changeType.includes('shift') || changeType.includes('fix') || changeType.includes('revert')) category = 'shifted';
      
      // Convert changes array to changes format for display
      const changes = [];
      
      godEntry.changes.forEach(change => {

        if (change.section === 'General' || change.section === 'New Aspect') {
          // General section - combine all descriptions into one entry
          if (Array.isArray(change.description)) {
            changes.push({
              ability: 'General',
              details: change.description.join(' | ')
            });
          } else if (typeof change.description === 'string') {
            changes.push({
              ability: 'General',
              details: change.description
            });
          }
        } else if (change.section === 'Passive' && change.abilityName) {
          // Passive ability
          const abilityText = change.abilityNumber 
            ? `${change.abilityName} ${change.abilityNumber}`
            : change.abilityName;
          
          if (Array.isArray(change.description)) {
            changes.push({
              ability: abilityText,
              details: change.description.join(' | ')
            });
          } else if (typeof change.description === 'string') {
            changes.push({
              ability: abilityText,
              details: change.description
            });
          }
        } else if (change.section === 'Ability' && change.abilityName) {
          // Regular ability
          const abilityText = change.abilityNumber 
            ? `${change.abilityName} ${change.abilityNumber}`
            : change.abilityName;
          
          // Handle stances (for gods like Artio)
          if (change.stances && typeof change.stances === 'object') {
            const stanceDescriptions = Object.entries(change.stances)
              .map(([stance, desc]) => `${stance}: ${desc}`)
              .join(' | ');
            changes.push({
              ability: abilityText,
              details: stanceDescriptions
            });
          } else if (Array.isArray(change.description)) {
            changes.push({
              ability: abilityText,
              details: change.description.join(' | ')
            });
          } else if (typeof change.description === 'string') {
            changes.push({
              ability: abilityText,
              details: change.description
            });
          }
        }
      });
      
      if (changes.length > 0) {
        grouped.gods[category].push({
          name: godName,
          changes: changes,
          summary: changes.map(c => `${c.ability}: ${c.details}`).join(' | ')
        });
      }
    });
    
    // Process items - each item entry has changeType and changes array
    if (Array.isArray(rawData.items)) {
      rawData.items.forEach(itemEntry => {
        if (!itemEntry.name || !itemEntry.changeType || !Array.isArray(itemEntry.changes)) return;
        
        const itemName = itemEntry.name;
        const changeType = itemEntry.changeType.toLowerCase();
        
        // Combine all item change descriptions
        const descriptions = [];
        itemEntry.changes.forEach(change => {
          if (change.description) {
            if (Array.isArray(change.description)) {
              descriptions.push(...change.description);
            } else {
              descriptions.push(change.description);
            }
          }
        });
        
        const itemObj = {
          name: itemName,
          summary: descriptions.join(' | '),
          changes: descriptions.join(' | '),
          changeType: itemEntry.changeType // Preserve original changeType
        };
        
        // Map changeType to category
        if (changeType.includes('buff')) {
          grouped.items.buffed.push(itemObj);
        } else if (changeType.includes('nerf')) {
          grouped.items.nerfed.push(itemObj);
        } else if (changeType.includes('new')) {
          grouped.items.new.push(itemObj);
        } else if (changeType.includes('fix') || changeType.includes('shift')) {
          grouped.items.changed.push(itemObj);
        }
      });
    }
    
    return grouped;
  };

  // Static patch file mapping (required for React Native bundle)
  const patchFiles = {
    25: require('../Patch Notes/patchnotesob25.json'),
    24: require('../Patch Notes/patchnotesob24.json'),
    23: require('../Patch Notes/patchnotesob23.json'),    
    22: require('../Patch Notes/patchnotesob22.json'),
    21: require('../Patch Notes/patchnotesob21.json'),
    20: require('../Patch Notes/patchnotesob20.json'),
    
      // Add more patches as needed: 22, 21, 20, etc.
  };

  // Function to load a patch file
  const loadPatchFile = (patchNumber) => {
    try {
      return patchFiles[patchNumber] || null;
    } catch (err) {
      console.error(`Error loading patch OB${patchNumber}:`, err);
      return null;
    }
  };

  // Function to aggregate changes across all patches from lastPatchNumber to latest
  const generateCatchUp = (lastPatchNumber) => {
    if (lastPatchNumber >= 25) {
      setCatchUpData({
        summary: "You're already on the latest patch! No changes to catch up on.",
        gods: { new: [], buffed: [], nerfed: [], shifted: [] },
        items: { buffed: [], new: [], nerfed: [], changed: [] },
        gameModes: []
      });
      return;
    }
    
    setCatchUpLoading(true);
    
    try {
      // Aggregate all patches from lastPatchNumber + 1 to 24
      const result = {
        summary: '',
        gods: { new: [], buffed: [], nerfed: [], shifted: [] },
        items: { buffed: [], new: [], nerfed: [], changed: [] },
        gameModes: []
      };
      
      // Track all gods/items we've seen to avoid duplicates
      const seenGods = new Set();
      const seenItems = new Set();
      const seenItemsNew = new Set();
      const seenGameModes = new Set();
      
      // Load and process each patch from lastPatchNumber + 1 to 24
      for (let patchNum = lastPatchNumber + 1; patchNum <= 25; patchNum++) {
        const patch = loadPatchFile(patchNum);
        if (!patch) continue; // Skip if patch file doesn't exist
        
        // Process gods
        if (patch.gods && Array.isArray(patch.gods)) {
          patch.gods.forEach(god => {
            const godKey = god.name.toLowerCase();
            const changeType = (god.changeType || '').toLowerCase();
            
            // Only add if we haven't seen this god yet (new gods) or if change type changed
            if ((changeType === 'new' || changeType === 'newAspects') && !seenGods.has(godKey)) {
              if (changeType === 'newAspects') {
                result.gods.newAspects.push(god);
              } else {
                result.gods.new.push(god);
              }
              seenGods.add(godKey);
            } else if ((changeType === 'buff' || changeType === 'buffAspects') && !seenGods.has(`buff-${godKey}`)) {
              // Check if already added, if so update it
              const existing = result.gods.buffed.find(g => g.name.toLowerCase() === godKey);
              if (existing) {
                // Merge changes
                if (god.changes && Array.isArray(god.changes)) {
                  if (!existing.changes) existing.changes = [];
                  existing.changes.push(...god.changes);
                }
              } else {
                result.gods.buffed.push(god);
                seenGods.add(`buff-${godKey}`);
              }
            } else if ((changeType === 'nerf' || changeType === 'nerfAspects') && !seenGods.has(`nerf-${godKey}`)) {
              const existing = result.gods.nerfed.find(g => g.name.toLowerCase() === godKey);
              if (existing) {
                if (god.changes && Array.isArray(god.changes)) {
                  if (!existing.changes) existing.changes = [];
                  existing.changes.push(...god.changes);
                }
              } else {
                result.gods.nerfed.push(god);
                seenGods.add(`nerf-${godKey}`);
              }
            } else if ((changeType === 'shift' || changeType === 'shiftAspects') && !seenGods.has(`shift-${godKey}`)) {
              const existing = result.gods.shifted.find(g => g.name.toLowerCase() === godKey);
              if (existing) {
                if (god.changes && Array.isArray(god.changes)) {
                  if (!existing.changes) existing.changes = [];
                  existing.changes.push(...god.changes);
                }
              } else {
                result.gods.shifted.push(god);
                seenGods.add(`shift-${godKey}`);
              }
            }
          });
        }
        
        // Process items
        if (patch.items && Array.isArray(patch.items)) {
          patch.items.forEach(item => {
            const itemKey = item.name.toLowerCase();
            const changeType = (item.changeType || '').toLowerCase();
            
            if (changeType === 'buff' && !seenItems.has(`buff-${itemKey}`)) {
              result.items.buffed.push(item);
              seenItems.add(`buff-${itemKey}`);
            } else if (changeType === 'nerf' && !seenItems.has(`nerf-${itemKey}`)) {
              result.items.nerfed.push(item);
              seenItems.add(`nerf-${itemKey}`);
            } else if (changeType === 'new' && !seenItems.has(`new-${itemKey}`)) {
              result.items.new.push(item);
              seenItems.add(`new-${itemKey}`);
            } else if (
              (changeType === 'change' || changeType === 'shift' || changeType === 'fix') &&
              !seenItems.has(`change-${itemKey}`)
            ) {
              // Treat "new" items as "changed" so they appear in the Items Changed section
              result.items.changed.push(item);
              seenItems.add(`change-${itemKey}`);
            }
          });
        }
        
        // Process game modes
        if (patch.gameModes && Array.isArray(patch.gameModes)) {
          patch.gameModes.forEach(mode => {
            const modeKey = mode.name.toLowerCase();
            if (!seenGameModes.has(modeKey)) {
              result.gameModes.push(mode);
              seenGameModes.add(modeKey);
            } else {
              // Merge changes if mode already exists
              const existing = result.gameModes.find(m => m.name.toLowerCase() === modeKey);
              if (existing && mode.changes && Array.isArray(mode.changes)) {
                if (!existing.changes) existing.changes = [];
                existing.changes.push(...mode.changes);
              }
            }
          });
        }
      }
      
      // Generate summary
      const godCounts = {
        new: result.gods.new.length,
        buffed: result.gods.buffed.length,
        nerfed: result.gods.nerfed.length,
        shifted: result.gods.shifted.length,
      };

      const itemCount =
        result.items.buffed.length + result.items.new.length + result.items.nerfed.length + result.items.changed.length;
      const modeCount = result.gameModes.length;

      // Count how many gods received Aspect-specific changes
      const allGodEntries = [
        ...result.gods.new,
        ...result.gods.buffed,
        ...result.gods.nerfed,
        ...result.gods.shifted,
      ];
      const aspectGodCount = allGodEntries.filter((g) =>
        Array.isArray(g.changes) && g.changes.some((c) => c.section === 'Aspect')
      ).length;

      // Count how many items are brand-new
      const newItemCount = result.items.new.filter(
        (it) => (it.changeType || '').toLowerCase() === 'new'
      ).length;

      result.summary =
        `Since OB${lastPatchNumber}, there have been ` +
        `${godCounts.new} new god${godCounts.new !== 1 ? 's' : ''}, ` +
        `${godCounts.newAspects} new Aspect${godCounts.newAspects !== 1 ? 's' : ''}, ` +
        `${godCounts.buffed} god${godCounts.buffed !== 1 ? 's' : ''} buffed, ` +
        `${godCounts.buffedAspects} Aspect${godCounts.buffedAspects !== 1 ? 's' : ''} buffed, ` +
        `${godCounts.nerfed} god${godCounts.nerfed !== 1 ? 's' : ''} nerfed` +
        `${godCounts.nerfedAspects} Aspect${godCounts.nerfedAspects !== 1 ? 's' : ''} nerfed, ` +
        `${godCounts.shifted > 0 ? `, ${godCounts.shifted} god${godCounts.shifted !== 1 ? 's' : ''} shifted` : ''}` +
        `, ${itemCount} item${itemCount !== 1 ? 's' : ''} changed` +
        `${newItemCount > 0 ? ` (${newItemCount} new)` : ''}` +
        `, and ${modeCount} game mode${modeCount !== 1 ? 's' : ''} updated.`;
      
      setCatchUpData(result);
    } catch (err) {
      console.error('Error generating catch up:', err);
      setCatchUpData({
        summary: `Error generating catch up: ${err.message}`,
        gods: { new: [], newAspects: [], buffed: [], buffedAspects: [], nerfed: [], nerfedAspects: [], shifted: [] },
        items: { buffed: [], nerfed: [], changed: [] },
        gameModes: []
      });
    }
    
    setCatchUpLoading(false);
  };

  // Function to compare two patch files and return differences
  const comparePatches = (oldPatch,  newPatch) => {
    const result = {
      summary: '',
      gods: { new: [], newAspects: [], buffed: [], buffedAspects: [], nerfed: [], nerfedAspects: [], shifted: [] },
      items: { buffed: [], nerfed: [], changed: [] },
      gameModes: []
    };
    
    const oldGods = {};
    const newGods = {};
    
    if (oldPatch.gods && Array.isArray(oldPatch.gods)) {
      oldPatch.gods.forEach(god => {
        oldGods[god.name.toLowerCase()] = god;
      });
    }
    
    if (newPatch.gods && Array.isArray(newPatch.gods)) {
      newPatch.gods.forEach(god => {
        newGods[god.name.toLowerCase()] = god;
      });
    }
    
    // Find new gods (in new but not in old)
    Object.keys(newGods).forEach(godName => {
      if (!oldGods[godName] && (newGods[godName].changeType === 'new' || newGods[godName].changeType === 'newAspects')) {
        result.gods.new.push(newGods[godName]);
      }
    });
    
    // Find gods that changed (including Aspect-only buffs/nerfs/shifts)
    Object.keys(newGods).forEach(godName => {
      const newGod = newGods[godName];
      const changeType = (newGod.changeType || '').toLowerCase();

      // We already handled pure "new" gods above; here we care about balance changes
      if (changeType === 'buff' || changeType === 'buffAspects') {
        result.gods.buffed.push(newGod);
      } else if (changeType === 'nerf') {
        result.gods.nerfed.push(newGod);
      } else if (changeType === 'shift' || changeType === 'shiftAspects') {
        result.gods.shifted.push(newGod);
      }
    });
    
    // Compare items
    const oldItems = {};
    const newItems = {};
    if (oldPatch.items && Array.isArray(oldPatch.items)) {
      oldPatch.items.forEach(item => {
        oldItems[item.name.toLowerCase()] = item;
      });
    }
    
    if (newPatch.items && Array.isArray(newPatch.items)) {
      newPatch.items.forEach(item => {
        newItems[item.name.toLowerCase()] = item;
        const oldItem = oldItems[item.name.toLowerCase()];
        if (!oldItem || oldItem.changeType !== item.changeType) {
          if (item.changeType === 'buff' || item.changeType === 'buffAspects') {
            result.items.buffed.push(item);
          } else if (item.changeType === 'nerf') {
            result.items.nerfed.push(item);
          } else {
            result.items.changed.push(item);
          }
        }
      });
    }
    
    // Compare game modes
    const oldModes = {};
    const newModes = {};
    
    if (oldPatch.gameModes && Array.isArray(oldPatch.gameModes)) {
      oldPatch.gameModes.forEach(mode => {
        oldModes[mode.name.toLowerCase()] = mode;
      });
    }
    
    if (newPatch.gameModes && Array.isArray(newPatch.gameModes)) {
      newPatch.gameModes.forEach(mode => {
        newModes[mode.name.toLowerCase()] = mode;
        // If mode exists in new but not old, or has changes, add it
        if (!oldModes[mode.name.toLowerCase()] || JSON.stringify(oldModes[mode.name.toLowerCase()]) !== JSON.stringify(mode)) {
          result.gameModes.push(mode);
        }
      });
    }
    
    // Generate summary
    const godCounts = {
      new: result.gods.new.length,
      buffed: result.gods.buffed.length,
      nerfed: result.gods.nerfed.length,
      shifted: result.gods.shifted.length
    };
    
    const itemCount = result.items.buffed.length + result.items.new.length + result.items.nerfed.length + result.items.changed.length;
    const newItemCount = result.items.changed.filter(
      (it) => (it.changeType || '').toLowerCase() === 'new'
    ).length;
    const modeCount = result.gameModes.length;
    
    const oldPatchNum = oldPatch.patchName?.match(/OB\s*(\d+)/i)?.[1] || '?';
    result.summary = `Since OB${oldPatchNum}, there have been ` +
      `${godCounts.new} new god${godCounts.new !== 1 ? 's' : ''}, ` +
      `${godCounts.newAspects} new Aspect${godCounts.newAspects !== 1 ? 's' : ''}, ` +
      `${godCounts.buffed} god${godCounts.buffed !== 1 ? 's' : ''} buffed, ` +
      `${godCounts.buffedAspects} Aspect${godCounts.buffedAspects !== 1 ? 's' : ''} buffed, ` +
      `${godCounts.nerfed} god${godCounts.nerfed !== 1 ? 's' : ''} nerfed` +
      `${godCounts.nerfedAspects} Aspect${godCounts.nerfedAspects !== 1 ? 's' : ''} nerfed, ` +
      `${godCounts.shifted > 0 ? `, ${godCounts.shifted} god${godCounts.shifted !== 1 ? 's' : ''} shifted` : ''}, ` +
      `${itemCount} item${itemCount !== 1 ? 's' : ''} changed (${newItemCount} new)` +
      `${newItemCount > 0 ? ` (${newItemCount} new)` : ''}, ` +
      `and ${modeCount} game mode${modeCount !== 1 ? 's' : ''} updated.`;
    
    return result;
  };

  // Load patch notes JSON and builds.json
  useEffect(() => {
    let isMounted = true;
    
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        try {
          const patchNotes = require('../Patch Notes/patchnotesob25.json');
          const builds = require('./data/builds.json');
          
          if (isMounted) {
            const transformedData = transformPatchData(patchNotes);
            setPatchData(transformedData);
            setBuildsData(builds);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error loading patch data:', err);
          if (isMounted) {
            setLoading(false);
          }
        }
      }, 100);
    });
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard navigation for patch picker on web
  useEffect(() => {
    if (!IS_WEB || !showPatchPicker) return;

    const handleKeyDown = (e) => {
      if (!showPatchPicker) return;
      
      const patches = Array.from({ length: 24 }, (_, i) => 24 - i);
      const currentIndex = patches.indexOf(selectedLastPatch);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < patches.length - 1) {
          const nextPatch = patches[currentIndex + 1];
          setSelectedLastPatch(nextPatch);
          // Scroll to selected item
          setTimeout(() => {
            if (patchPickerScrollRef.current) {
              const optionHeight = 30; // Approximate height of each option
              const scrollPosition = (currentIndex + 1) * optionHeight;
              patchPickerScrollRef.current.scrollTo({ y: scrollPosition, animated: true });
            }
          }, 0);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          const prevPatch = patches[currentIndex - 1];
          setSelectedLastPatch(prevPatch);
          // Scroll to selected item
          setTimeout(() => {
            if (patchPickerScrollRef.current) {
              const optionHeight = 30;
              const scrollPosition = (currentIndex - 1) * optionHeight;
              patchPickerScrollRef.current.scrollTo({ y: scrollPosition, animated: true });
            }
          }, 0);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        generateCatchUp(selectedLastPatch);
        setShowPatchPicker(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPatchPicker(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPatchPicker, selectedLastPatch]);

  // Add custom scrollbar styles for web patch picker
  useEffect(() => {
    if (!IS_WEB) return;
    
    const style = document.createElement('style');
    style.textContent = `
      /* Custom scrollbar for patch picker */
      [data-patch-picker-scroll]::-webkit-scrollbar {
        width: 8px;
      }
      [data-patch-picker-scroll]::-webkit-scrollbar-track {
        background: #0b1226;
        border-radius: 4px;
      }
      [data-patch-picker-scroll]::-webkit-scrollbar-thumb {
        background: #1e90ff;
        border-radius: 4px;
      }
      [data-patch-picker-scroll]::-webkit-scrollbar-thumb:hover {
        background: #3ba3ff;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Name mapping for gods
  const godNameMap = {
    'mulan': 'hua mulan',
  };

  // Helper to find god by name
  const findGodByName = useMemo(() => {
    if (!buildsData) return () => null;
    
    const flattenAny = (a) => {
      if (!a) return [];
      if (!Array.isArray(a)) return [a];
      return a.flat(Infinity).filter(Boolean);
    };
    
    const gods = flattenAny(buildsData.gods);
    const godMap = new Map();
    
    gods.forEach(god => {
      const name = god.name || god.GodName || god.title || god.displayName;
      if (name) {
        godMap.set(name.toLowerCase(), god);
        // Also map common variations
        if (name.toLowerCase() === 'hua mulan' || name.toLowerCase() === 'huamulan') {
          godMap.set('mulan', god);
          godMap.set('hua mulan', god);
        }
      }
    });
    
    return (name) => {
      const normalized = name.toLowerCase();
      const mappedName = godNameMap[normalized] || normalized;
      return godMap.get(mappedName) || null;
    };
  }, [buildsData]);

  // Helper to find item by name
  const findItemByName = useMemo(() => {
    if (!buildsData) return () => null;
    
    const flattenAny = (a) => {
      if (!a) return [];
      if (!Array.isArray(a)) return [a];
      return a.flat(Infinity).filter(Boolean);
    };
    
    const items = flattenAny(buildsData.items);
    const itemMap = new Map();
    
    items.forEach(item => {
      // Map both name and internalName (case-insensitive)
      const name = item.name;
      const internalName = item.internalName;
      
      if (name) {
        itemMap.set(name.toLowerCase().trim(), item);
        // Also add normalized version (no spaces, special chars)
        const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized && normalized !== name.toLowerCase()) {
          itemMap.set(normalized, item);
        }
      }
      
      if (internalName) {
        itemMap.set(internalName.toLowerCase().trim(), item);
        // Also add normalized version
        const normalized = internalName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized && normalized !== internalName.toLowerCase()) {
          itemMap.set(normalized, item);
        }
      }
    });
    
    return (name) => {
      const normalized = name.toLowerCase().trim();
      // Try exact match first
      let item = itemMap.get(normalized);
      if (item) return item;
      
      // Try normalized match (no spaces, special chars)
      const normalizedKey = normalized.replace(/[^a-z0-9]/g, '');
      item = itemMap.get(normalizedKey);
      if (item) return item;
      
      // Try word-by-word matching for multi-word items like "Talisman of Purification"
      const words = normalized.split(/\s+/).filter(w => w.length > 0);
      if (words.length > 1) {
        for (const [key, value] of itemMap.entries()) {
          const keyWords = key.split(/\s+/).filter(w => w.length > 0);
          if (words.every(w => keyWords.some(kw => kw.includes(w) || w.includes(kw)))) {
            return value;
          }
        }
      }
      
      return null;
    };
  }, [buildsData]);

  // Helper to find ability by name in god
  const findAbilityByName = (god, abilityName) => {
    if (!god || !god.abilities || !abilityName) return null;
    
    // Clean ability name - remove "(1)", "(P)", etc.
    const cleanName = abilityName.toLowerCase().replace(/\s*\([^)]+\)\s*$/, '').trim();
    
    for (const [key, ability] of Object.entries(god.abilities)) {
      const abName = (ability.name || ability.key || key || '').toLowerCase();
      if (abName.includes(cleanName) || cleanName.includes(abName)) {
        return ability;
      }
    }
    return null;
  };

  // Parse summary to extract ability changes with icons
  const renderSummaryWithAbilityIcons = (summary, god) => {
    if (!summary) return null;
    
    // Split by | to get individual change lines
    const parts = summary.split('|').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 0) return null;
    
    const elements = [];
    
    parts.forEach((part, index) => {
      // Check if this part mentions an ability (format: "AbilityName (1): change")
      const abilityMatch = part.match(/^([A-Za-z\s]+)\s*\(([\dP]+)\)\s*:\s*(.+)$/);
      
      if (abilityMatch && god && god.abilities) {
        const [, abilityName, abilityNum, changeText] = abilityMatch;
        const ability = findAbilityByName(god, abilityName.trim());
        const abilityIcon = ability && ability.icon ? getLocalGodAsset(ability.icon) : null;
        
        elements.push(
          <View key={index} style={styles.abilityChangeRow}>
            {abilityIcon ? (
              <Image 
                source={abilityIcon} 
                style={styles.abilityIcon} 
                contentFit="cover"
                accessibilityLabel={`${abilityName.trim()} ability icon`}
              />
            ) : (
              <View style={styles.abilityIconFallback}>
                <Text style={styles.abilityIconFallbackText}>{abilityName.trim().charAt(0)}</Text>
              </View>
            )}
            <View style={styles.abilityChangeText}>
              <Text style={styles.abilityName}>{abilityName.trim()} ({abilityNum})</Text>
              <Text style={styles.changeSummaryText} numberOfLines={0}>{changeText.trim()}</Text>
            </View>
          </View>
        );
      } else {
        // Regular text change - format better
        elements.push(
          <View key={index} style={styles.summaryLine}>
            <Text style={styles.changeSummaryText}>{part}</Text>
          </View>
        );
      }
    });
    
    return <View style={styles.summaryContainer}>{elements}</View>;
  };

  // Render god card with icon
  const renderGodCard = (godEntry, changeType) => {
    const godName = typeof godEntry === 'string' ? godEntry : godEntry.name;
    const changes = typeof godEntry === 'object' && godEntry.changes ? godEntry.changes : [];
    const summary = typeof godEntry === 'object' && !godEntry.changes ? godEntry.summary : '';
    const god = findGodByName(godName);
    
    // Check if this is Artio (for special web layout)
    const isArtio = godName.toLowerCase() === 'artio';
    
    const icon = god && (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon));
    const localIcon = icon ? getLocalGodAsset(icon) : null;
    
    const badgeColors = {
      buffed: '#10b981',
      nerfed: '#ef4444',
      shifted: '#f59e0b',
      new: '#8b5cf6',
    };
    
    const badgeColor = badgeColors[changeType] || '#64748b';
    const cardBgColor = changeType === 'new' 
      ? 'rgba(16, 185, 129, 0.15)' 
      : 'rgba(30, 58, 95, 0.4)';
    const borderColor = changeType === 'new' 
      ? 'rgba(16, 185, 129, 0.5)' 
      : 'rgba(234, 179, 8, 0.3)';
    
    // Parse summary into changes array if changes array doesn't exist
    let parsedChanges = changes;
    if (!parsedChanges || parsedChanges.length === 0) {
      if (summary) {
        parsedChanges = parseSummaryToChanges(summary);
      }
    }
    
    return (
      <View key={godName} style={[
        styles.changeCard, 
        { backgroundColor: cardBgColor, borderColor: borderColor },
        IS_WEB && isArtio && styles.changeCardArtioWeb,
        IS_WEB && screenDimensions.width < 1024 && screenDimensions.width >= 768 && {
          flexBasis: 'calc(50% - 8px)',
          minWidth: '200px',
          maxWidth: '300px',
        },
        IS_WEB && screenDimensions.width < 768 && screenDimensions.width >= 500 && {
          flexBasis: 'calc(50% - 8px)',
          minWidth: '160px',
          maxWidth: '250px',
        },
        IS_WEB && screenDimensions.width < 500 && {
          flexBasis: 'calc(100% - 0px)',
          minWidth: '100%',
          maxWidth: '100%',
        }
      ]}>
        <View style={styles.changeCardHeader}>
          {localIcon ? (
            <Image
              source={localIcon}
              style={styles.changeIcon}
              contentFit="cover"
              accessibilityLabel={`${godName} icon`}
            />
          ) : (
            <View style={[styles.changeIconFallback, { backgroundColor: badgeColor + '30' }]}>
              <Text style={[styles.changeIconFallbackText, { color: badgeColor }]}>
                {godName.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.changeCardTitleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.changeCardTitle, changeType === 'new' && { color: '#10b981' }]}>
                {godName}
              </Text>
              {/* Badge next to name */}
              {changeType === 'new' && (
                <View style={[styles.patchBadge, styles.patchBadgeNew]}>
                  <Text style={styles.patchBadgeText}>NEW</Text>
                </View>
              )}
              {changeType === 'buffed' && (
                <View style={[styles.patchBadge, styles.patchBadgeBuffed]}>
                  <Text style={styles.patchBadgeText}>BUFFED</Text>
                </View>
              )}
              {changeType === 'nerfed' && (
                <View style={[styles.patchBadge, styles.patchBadgeNerfed]}>
                  <Text style={styles.patchBadgeText}>NERFED</Text>
                </View>
              )}
              {changeType === 'shifted' && (
                <View style={[styles.patchBadge, styles.patchBadgeShifted]}>
                  <Text style={styles.patchBadgeText}>SHIFTED</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {parsedChanges && parsedChanges.length > 0 && (
          <View style={[
            styles.changesList, 
            IS_WEB && isArtio && styles.changesListArtioWeb
          ]}>
            {(() => {
              // Group changes by ability name and sort by ability number
              const groupedChanges = {};
              parsedChanges.forEach((change) => {
                const abilityName = change.ability || '';
                const details = change.details || '';
                if (!groupedChanges[abilityName]) {
                  groupedChanges[abilityName] = [];
                }
                groupedChanges[abilityName].push(details);
              });
              
              // Extract ability number for sorting (P, 1, 2, 3, 4)
              const getAbilitySortKey = (abilityName) => {
                const match = abilityName.match(/\(([\dP]+)\)/);
                if (match) {
                  const num = match[1];
                  if (num === 'P') return 0; // Passive first
                  return parseInt(num, 10);
                }
                // General comes first
                if (abilityName.toLowerCase().includes('general')) return -1;
                return 999; // Unknown abilities last
              };
              
              // Sort abilities: General, Passive, then 1-4
              const sortedAbilities = Object.entries(groupedChanges).sort((a, b) => {
                return getAbilitySortKey(a[0]) - getAbilitySortKey(b[0]);
              });
              
              // Render grouped changes
              return sortedAbilities.map(([abilityName, detailsList], idx) => {
                // Extract clean ability name for icon lookup
                const cleanAbilityName = abilityName.replace(/\s*\([\dP]+\)\s*$/, '').trim();
                const abilityMatch = abilityName.match(/\(([\dP]+)\)/);
                const abilityNumber = abilityMatch ? abilityMatch[1] : '';
                
                // Try to find ability icon - check multiple ways
                let ability = null;
                let abilityIcon = null;
                
                // Don't try to find icon for General section
                const isGeneral = cleanAbilityName.toLowerCase().includes('general') || abilityName.toLowerCase().includes('general');
                
                if (!isGeneral && god) {
                  // Check for passive first (passive is stored separately, not in abilities)
                  if (abilityNumber === 'P' && god.passive) {
                    ability = god.passive;
                  } else if (god.abilities) {
                    // Try direct name match first
                    ability = findAbilityByName(god, cleanAbilityName);
                    
                    // If not found, try matching by ability number (1, 2, 3, 4)
                    if (!ability && abilityNumber && abilityNumber !== 'P') {
                      const keyMap = { 
                        '1': ['A01', 'a01', 'Ability1', 'ability1'], 
                        '2': ['A02', 'a02', 'Ability2', 'ability2'], 
                        '3': ['A03', 'a03', 'Ability3', 'ability3'], 
                        '4': ['A04', 'a04', 'Ability4', 'ability4', 'Ultimate', 'ultimate']
                      };
                      const possibleKeys = keyMap[abilityNumber] || [];
                      
                      // Try each possible key
                      for (const key of possibleKeys) {
                        if (god.abilities[key]) {
                          ability = god.abilities[key];
                          break;
                        }
                      }
                      
                      // If still not found, try to find by partial name match in ability values
                      if (!ability) {
                        for (const [key, ab] of Object.entries(god.abilities)) {
                          if (ab && typeof ab === 'object') {
                            const abName = (ab.name || ab.key || key || '').toLowerCase();
                            if (abName.includes(cleanAbilityName.toLowerCase()) || cleanAbilityName.toLowerCase().includes(abName)) {
                              ability = ab;
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                  
                  if (ability && typeof ability === 'object' && ability.icon) {
                    abilityIcon = getLocalGodAsset(ability.icon);
                  }
                }
                
                const allDetails = detailsList.join(' | ');
                
                // Only show icons for abilities, not general
                const showIcon = !isGeneral;
                
                return (
                  <View key={idx} style={[
                    styles.changeItem, 
                    IS_WEB && isArtio && styles.changeItemArtioWeb
                  ]}>
                    {showIcon && (
                      abilityIcon ? (
                        <Image
                          source={abilityIcon}
                          style={[styles.changeAbilityIcon, IS_WEB && isArtio && styles.changeAbilityIconArtioWeb]}
                          contentFit="cover"
                          accessibilityLabel={`${abilityName} ability icon`}
                        />
                      ) : (
                        <View style={[styles.changeAbilityIconFallback, IS_WEB && isArtio && styles.changeAbilityIconArtioWeb]}>
                          <Text style={styles.changeAbilityIconFallbackText}>
                            {abilityNumber || cleanAbilityName.charAt(0)}
                          </Text>
                        </View>
                      )
                    )}
                    <View style={styles.changeItemContent}>
                      <Text style={[
                        styles.changeAbilityName,
                        IS_WEB && isArtio && styles.changeAbilityNameArtioWeb
                      ]}>{abilityName}</Text>
                      <Text style={[
                        styles.changeDetails,
                        IS_WEB && isArtio && styles.changeDetailsArtioWeb
                      ]}>{allDetails}</Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        )}
        {(!parsedChanges || parsedChanges.length === 0) && summary && (
          <View style={styles.summarySection}>
            <Text style={styles.changeSummaryText}>{summary}</Text>
          </View>
        )}
      </View>
    );
  };
  
  // Parse summary string into changes array format
  const parseSummaryToChanges = (summary) => {
    if (!summary) return [];
    const changes = [];
    const parts = summary.split('|').map(p => p.trim()).filter(p => p.length > 0);
    
    parts.forEach(part => {
      // Match format: "AbilityName (1): change details" or "AbilityName (P): change details"
      const match = part.match(/^([A-Za-z\s]+)\s*\(([\dP]+)\)\s*:\s*(.+)$/);
      if (match) {
        changes.push({
          ability: `${match[1].trim()} (${match[2]})`,
          details: match[3].trim()
        });
      } else if (part.includes(':')) {
        // Format like "Base Health: 525 -> 546"
        const colonIndex = part.indexOf(':');
        changes.push({
          ability: part.substring(0, colonIndex).trim(),
          details: part.substring(colonIndex + 1).trim()
        });
      }
    });
    
    return changes;
  };

  // Render item card with icon
  const renderItemCard = (itemEntry, changeType) => {
    const itemName = typeof itemEntry === 'string' ? itemEntry : itemEntry.name;
    const changes = typeof itemEntry === 'object' && itemEntry.changes ? itemEntry.changes : '';
    const summary = typeof itemEntry === 'object' && !itemEntry.changes ? itemEntry.summary : '';
    const item = findItemByName(itemName);
    
    const itemIcon = item && item.icon;
    const localItemIcon = itemIcon ? getLocalItemIcon(itemIcon) : null;
    const newAspects = itemEntry.changeType === 'newAspects';
    const badgeColors = {
      buffed: '#10b981',
      newAspects: '#8b5cf6',
      nerfed: '#ef4444',
      changed: '#f59e0b',
      new: '#8b5cf6',
    };
    
    const badgeColor = badgeColors[changeType] || '#64748b';
    const changeText = changes || summary;
    
    return (
      <View key={itemName} style={[
        styles.changeCard,
        IS_WEB && screenDimensions.width < 1024 && screenDimensions.width >= 768 && {
          flexBasis: 'calc(50% - 8px)',
          minWidth: '200px',
          maxWidth: '300px',
        },
        IS_WEB && screenDimensions.width < 768 && screenDimensions.width >= 500 && {
          flexBasis: 'calc(50% - 8px)',
          minWidth: '160px',
          maxWidth: '250px',
        },
        IS_WEB && screenDimensions.width < 500 && {
          flexBasis: 'calc(100% - 0px)',
          minWidth: '100%',
          maxWidth: '100%',
        }
      ]}>
        <View style={styles.changeCardHeader}>
          {localItemIcon ? (() => {
            // Handle both single URI and primary/fallback object (same pattern as data.jsx)
            const imageSource = localItemIcon.primary || localItemIcon;
            const fallbackSource = localItemIcon.fallback;
            const itemKey = `patch-item-${itemName}`;
            const useFallback = failedItemIcons[itemKey];
            
            if (fallbackSource && !useFallback) {
              // Has fallback - try primary first, then fallback on error
              return (
                <Image
                  source={imageSource}
                  style={styles.changeIcon}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
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
                  style={styles.changeIcon}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              );
            }
            
            // Single URI - use directly
            return (
              <Image
                source={imageSource}
                style={styles.changeIcon}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            );
          })() : (
            <View style={[styles.changeIconFallback, { backgroundColor: badgeColor + '30' }]}>
              <Text style={[styles.changeIconFallbackText, { color: badgeColor }]}>
                {itemName.charAt(0)}
              </Text>
            </View>
          )}
          {changeType === 'newAspects' && (
            <View style={[styles.patchBadge, styles.patchBadgeNew]}>
              <Text style={styles.patchBadgeText}>NEW ASPECT</Text>
            </View>
          )}
          <View style={styles.changeCardTitleContainer}>
            <Text style={styles.changeCardTitle}>{itemName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {changeType === 'buff' && (
                <View style={[styles.patchBadge, styles.patchBadgeBuffed]}>
                  <Text style={styles.patchBadgeText}>BUFFED</Text>
                </View>
              )}
              {changeType === 'nerf' && (
                <View style={[styles.patchBadge, styles.patchBadgeNerfed]}>
                  <Text style={styles.patchBadgeText}>NERFED</Text>
                </View>
              )}
              {changeType === 'changed' && (
                <View style={[styles.patchBadge, { backgroundColor: '#64748b' }]}>
                  <Text style={styles.patchBadgeText}>CHANGED</Text>
                </View>
              )}
              {changeType === 'fix' && (
                <View style={[styles.patchBadge, { backgroundColor: '#64748b' }]}>
                  <Text style={styles.patchBadgeText}>FIXED</Text>
                </View>
              )}
              {changeType === 'shift' && (
                <View style={[styles.patchBadge, styles.patchBadgeShifted]}>
                  <Text style={styles.patchBadgeText}>SHIFTED</Text>
                </View>
              )}
              {changeType === 'new' && (
                <View style={[styles.patchBadge, styles.patchBadgeNew]}>
                  <Text style={styles.patchBadgeText}>NEW</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {changeText && (
          <View style={styles.summarySection}>
            <Text style={styles.changeSummaryText} numberOfLines={0}>{changeText}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render game mode card
  const renderGameModeCard = (modeEntry) => {
    const modeName = typeof modeEntry === 'string' ? modeEntry : modeEntry.name;
    const changes = typeof modeEntry === 'object' && modeEntry.changes ? modeEntry.changes : [];
    
    return (
      <View key={modeName} style={styles.changeCard}>
        <View style={styles.changeCardHeader}>
          <View style={[styles.changeIconFallback, { backgroundColor: '#1e90ff30' }]}>
            <Text style={[styles.changeIconFallbackText, { color: '#1e90ff' }]}>
              {modeName.charAt(0)}
            </Text>
          </View>
          <View style={styles.changeCardTitleContainer}>
            <Text style={styles.changeCardTitle}>{modeName}</Text>
          </View>
        </View>
        {changes && changes.length > 0 && (
          <View style={styles.summarySection}>
            {changes.map((change, idx) => (
              <View key={idx} style={{ marginBottom: idx < changes.length - 1 ? 12 : 0 }}>
                <Text style={[styles.changeAbilityName, { fontSize: 16, marginBottom: 6 }]}>
                  {change.category}
                </Text>
                {change.details && Array.isArray(change.details) ? (
                  // Handle healer tiers with structured details
                  <View style={{ marginLeft: 8 }}>
                    {typeof change.description === 'string' && change.description && (
                      <Text style={[styles.changeSummaryText, { marginBottom: 8, fontStyle: 'italic' }]}>
                        {change.description}
                      </Text>
                    )}
                    {change.details.map((detail, detailIdx) => (
                      <View key={detailIdx} style={{ marginBottom: 8 }}>
                        <Text style={[styles.changeAbilityName, { fontSize: 14, marginBottom: 4 }]}>
                          {detail.tier}: {detail.description}
                        </Text>
                        {detail.gods && Array.isArray(detail.gods) && (
                          <Text style={styles.changeSummaryText}>
                            {detail.gods.join(', ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.changeSummaryText}>
                    {typeof change.description === 'string' ? change.description : 
                     Array.isArray(change.description) ? change.description.join(' | ') : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Loading patch data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {subTab === 'simple' && (
          <View style={styles.content}>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>BALANCE CHANGES</Text>
              <Text style={styles.pageSubtitle}>
                {patchData?.summary ? patchData.summary.split('\n')[0] : 'Patch Summary'}
              </Text>
            </View>

            {patchData && (
              <>

                {/* New Gods - At the top */}
                {patchData.gods?.new && patchData.gods.new.length > 0 && (
                  <View style={styles.expandableSection}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection('newGods')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.patchBadge, styles.patchBadgeNew]}>
                          <Text style={styles.patchBadgeText}>NEW</Text>
                        </View>
                        <Text style={styles.sectionTitle}>NEW GOD ({patchData.gods.new.length})</Text>
                      </View>
                      <Text style={styles.expandIcon}>{expandedSections.newGods ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedSections.newGods && (
                      <View style={styles.sectionContent}>
                        {patchData.gods.new.map(god => renderGodCard(god, 'new'))}
                      </View>
                    )}
                  </View>
                )}
{/* New Aspects */}
{patchData.gods?.newAspects && patchData.gods.newAspects.length > 0 && (
  <View style={styles.expandableSection}>
    <TouchableOpacity
      style={styles.sectionHeaderNewAspects}
      onPress={() => toggleSection('newAspects')}
      activeOpacity={0.7}
    >
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }]}>
        <View style={[styles.patchBadge, styles.patchBadgeNewAspects]}>
          <Text style={styles.patchBadgeText}>NEW ASPECT</Text>
        </View>
        <Text style={styles.sectionTitle}>NEW ASPECT ({patchData.gods.newAspects.length})</Text>
      </View>
      <Text style={styles.expandIcon}>{expandedSections.newAspects ? '▼' : '▶'}</Text>
    </TouchableOpacity>
    {expandedSections.newAspects && (
      <View style={styles.sectionContent}>
        {patchData.gods.newAspects.map(aspect => renderGodCard(aspect, 'new'))}
      </View>
    )}
  </View>
)}
                {/* Gods Buffed */}
                {patchData.gods?.buffed && patchData.gods.buffed.length > 0 && (
                  <View style={styles.expandableSection}>
                    <TouchableOpacity
                      style={[styles.sectionHeader, styles.sectionHeaderBuffed]}
                      onPress={() => toggleSection('godsBuffed')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.patchBadge, styles.patchBadgeBuffed]}>
                          <Text style={styles.patchBadgeText}>BUFFED</Text>
                        </View>
                        <Text style={styles.sectionTitle}>GOD BUFFS ({patchData.gods.buffed.length})</Text>
                      </View>
                      <Text style={styles.expandIcon}>{expandedSections.godsBuffed ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedSections.godsBuffed && (
                      <View style={styles.sectionContent}>
                        {patchData.gods.buffed.map(god => renderGodCard(god, 'buffed'))}
                      </View>
                    )}
                  </View>
                )}

                {/* Gods Nerfed */}
                {patchData.gods?.nerfed && patchData.gods.nerfed.length > 0 && (
                  <View style={styles.expandableSection}>
                    <TouchableOpacity
                      style={[styles.sectionHeader, styles.sectionHeaderNerfed]}
                      onPress={() => toggleSection('godsNerfed')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.patchBadge, styles.patchBadgeNerfed]}>
                          <Text style={styles.patchBadgeText}>NERFED</Text>
                        </View>
                        <Text style={styles.sectionTitle}>GOD NERFS ({patchData.gods.nerfed.length})</Text>
                      </View>
                      <Text style={styles.expandIcon}>{expandedSections.godsNerfed ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedSections.godsNerfed && (
                      <View style={styles.sectionContent}>
                        {patchData.gods.nerfed.map(god => renderGodCard(god, 'nerfed'))}
                      </View>
                    )}
                  </View>
                )}

                {/* Gods Shifted */}
                {patchData.gods?.shifted && patchData.gods.shifted.length > 0 && (
                  <View style={styles.expandableSection}>
                    <TouchableOpacity
                      style={[styles.sectionHeader, styles.sectionHeaderShifted]}
                      onPress={() => toggleSection('godsShifted')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.patchBadge, styles.patchBadgeShifted]}>
                          <Text style={styles.patchBadgeText}>SHIFTED</Text>
                        </View>
                        <Text style={styles.sectionTitle}>GOD SHIFTS ({patchData.gods.shifted.length})</Text>
                      </View>
                      <Text style={styles.expandIcon}>{expandedSections.godsShifted ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedSections.godsShifted && (
                      <View style={styles.sectionContent}>
                        {patchData.gods.shifted.map(god => renderGodCard(god, 'shifted'))}
                      </View>
                    )}
                  </View>
                )}

                {/* Item Changes - Consolidated */}
                {((patchData.items?.buffed && patchData.items.buffed.length > 0) || 
                  (patchData.items?.nerfed && patchData.items.nerfed.length > 0) || 
                  (patchData.items?.new && patchData.items.new.length > 0) ||
                  (patchData.items?.changed && patchData.items.changed.length > 0)) && (
                  <View style={styles.expandableSection}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection('itemsBuffed')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={styles.sectionTitle}>ITEM CHANGES ({(patchData.items.buffed?.length || 0) + (patchData.items.new?.length || 0) + (patchData.items.nerfed?.length || 0) + (patchData.items.changed?.length || 0)})</Text>
                      </View>
                      <Text style={styles.expandIcon}>{expandedSections.itemsBuffed ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedSections.itemsBuffed && (
                      <View style={styles.sectionContent}>
                        {patchData.items.buffed && patchData.items.buffed.map(item => {
                          const changeType = item.changeType || 'buff';
                          return renderItemCard(item, changeType === 'buff' ? 'buff' : changeType);
                        })}
                        {patchData.items.nerfed && patchData.items.nerfed.map(item => {
                          const changeType = item.changeType || 'nerf';
                          return renderItemCard(item, changeType === 'nerf' ? 'nerf' : changeType);
                        })}
                        {patchData.items.changed && patchData.items.changed.map(item => {
                          const changeType = (item.changeType || 'changed').toLowerCase();
                          return renderItemCard(item, changeType === 'fix' ? 'fix' : changeType === 'shift' ? 'shift' : 'changed');
                        })}
                        {patchData.items.new && patchData.items.new.map(item => {
                          const changeType = item.changeType || 'new';
                          return renderItemCard(item, changeType === 'new' ? 'new' : changeType);
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* Game Modes */}
                {patchData.gameModes && patchData.gameModes.length > 0 && (
                  <View style={styles.expandableSection}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection('gameModes')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={styles.sectionTitle}>GAME MODES ({patchData.gameModes.length})</Text>
                      </View>
                      <Text style={styles.expandIcon}>{expandedSections.gameModes ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedSections.gameModes && (
                      <View style={styles.sectionContent}>
                        {patchData.gameModes.map(mode => renderGameModeCard(mode))}
                      </View>
                    )}
                  </View>
                )}

                {/* New Features */}
                {patchData.newFeatures && patchData.newFeatures.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>New Features</Text>
                    {patchData.newFeatures.map((feature, index) => (
                      <View key={index} style={styles.featureCard}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureContent}>{feature.content?.substring(0, 300)}...</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {subTab === 'catchup' && (
          <View style={styles.content}>
            <Text style={styles.title}>Catch Me Up ⭐</Text>
            <Text style={styles.description}>
              Select the last patch you played. We'll show you everything that changed since then.
            </Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last Patch Played: OB</Text>
              <View style={styles.patchSelectorWrapper}>
                <TouchableOpacity 
                  style={styles.patchSelector}
                  onPress={() => setShowPatchPicker(!showPatchPicker)}
                >
                  <Text style={styles.patchSelectorText}>{selectedLastPatch}</Text>
                  <Text style={styles.patchSelectorArrow}>▼</Text>
                </TouchableOpacity>
                
                {showPatchPicker && (
                  <View style={styles.patchPickerContainer}>
                    <ScrollView 
                      ref={patchPickerScrollRef}
                      style={styles.patchPickerScroll} 
                      nestedScrollEnabled
                      {...(IS_WEB && { 'data-patch-picker-scroll': true })}
                    >
                      {Array.from({ length: 24 }, (_, i) => 24 - i).map(patchNum => (
                        <TouchableOpacity
                          key={patchNum}
                          style={[
                            styles.patchPickerOption,
                            selectedLastPatch === patchNum && styles.patchPickerOptionSelected
                          ]}
                          onPress={() => {
                            setSelectedLastPatch(patchNum);
                            setShowPatchPicker(false);
                            generateCatchUp(patchNum);
                          }}
                        >
                          <Text style={[
                            styles.patchPickerOptionText,
                            selectedLastPatch === patchNum && styles.patchPickerOptionTextSelected
                          ]}>
                            OB{patchNum}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {catchUpLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#1e90ff" />
                  <Text style={styles.loadingText}>Generating changelog...</Text>
                </View>
              )}
              
              {catchUpData && (
                <ScrollView style={styles.catchUpResults} nestedScrollEnabled>
                  <Text style={styles.catchUpSummary}>
                    {catchUpData.summary}
                  </Text>
                  
                  {/* New Gods */}
                  {catchUpData.gods?.new && catchUpData.gods.new.length > 0 && (
                    <View style={styles.catchUpSection}>
                      <TouchableOpacity
                        style={styles.catchUpSectionHeader}
                        onPress={() => toggleCatchUpSection('catchUpNewGods')}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.patchBadge, styles.patchBadgeNew]}>
                            <Text style={styles.patchBadgeText}>NEW</Text>
                          </View>
                          <Text style={styles.catchUpSectionTitle}>New Gods ({catchUpData.gods.new.length})</Text>
                        </View>
                        <Text style={styles.expandIcon}>{catchUpExpandedSections.catchUpNewGods ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      {catchUpExpandedSections.catchUpNewGods && (
                        <View style={styles.catchUpIconsGrid}>
                          {catchUpData.gods.new.map((godEntry, idx) => {
                            const godName = typeof godEntry === 'string' ? godEntry : godEntry.name;
                            const changes = typeof godEntry === 'object' && godEntry.changes ? godEntry.changes : [];
                            const god = findGodByName(godName);
                            const icon = god && (god.icon || god.GodIcon);
                            const localIcon = icon ? getLocalGodAsset(icon) : null;
                            return (
                              <TouchableOpacity 
                                key={idx} 
                                style={[styles.catchUpIconContainer, !IS_WEB && screenDimensions.width < 375 && { flexBasis: '32%', minWidth: '32%', maxWidth: '32%' }]}
                                onPress={() => setCatchUpTooltip({
                                  name: godName,
                                  type: 'god',
                                  changeType: 'new',
                                  changes: changes,
                                })}
                                activeOpacity={0.7}
                              >
                                {localIcon ? (
                                  <Image 
                                    source={localIcon} 
                                    style={styles.catchUpGodIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${godName} icon`}
                                  />
                                ) : (
                                  <View style={[styles.catchUpIconFallback, { backgroundColor: '#8b5cf640' }]}>
                                    <Text style={styles.catchUpIconFallbackText}>{godName.charAt(0)}</Text>
                                  </View>
                                )}
                                <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{godName}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Gods Buffed */}
                  {catchUpData.gods?.buffed && catchUpData.gods.buffed.length > 0 && (
                    <View style={styles.catchUpSection}>
                      <TouchableOpacity
                        style={styles.catchUpSectionHeader}
                        onPress={() => toggleCatchUpSection('catchUpGodsBuffed')}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.patchBadge, styles.patchBadgeBuffed]}>
                            <Text style={styles.patchBadgeText}>BUFFED</Text>
                          </View>
                          <Text style={styles.catchUpSectionTitle}>Gods Buffed ({catchUpData.gods.buffed.length})</Text>
                        </View>
                        <Text style={styles.expandIcon}>{catchUpExpandedSections.catchUpGodsBuffed ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      {catchUpExpandedSections.catchUpGodsBuffed && (
                        <View style={styles.catchUpIconsGrid}>
                        {catchUpData.gods.buffed.map((godEntry, idx) => {
                          const godName = typeof godEntry === 'string' ? godEntry : godEntry.name;
                          const changes = typeof godEntry === 'object' && godEntry.changes ? godEntry.changes : [];
                          const god = findGodByName(godName);
                          const icon = god && (god.icon || god.GodIcon);
                          const localIcon = icon ? getLocalGodAsset(icon) : null;
                          
                          // Extract ability icons from changes
                          const abilityIcons = [];
                          if (Array.isArray(changes)) {
                            changes.forEach(change => {
                              // Handle new format: { section, abilityName, abilityNumber, description }
                              const abilityName = change.abilityName || change.ability;
                              
                              if (!god) return;
                              
                              // Skip General section
                              if (change.section === 'General') return;
                              
                              if (abilityName && god.abilities) {
                                const ability = findAbilityByName(god, abilityName);
                                if (ability && ability.icon) {
                                  const abIcon = getLocalGodAsset(ability.icon);
                                  if (abIcon && !abilityIcons.find(a => a.icon === abIcon)) {
                                    abilityIcons.push({ icon: abIcon, name: abilityName });
                                  }
                                } else if (change.section === 'Passive' && god.passive && god.passive.icon) {
                                  // Handle passive separately
                                  const abIcon = getLocalGodAsset(god.passive.icon);
                                  if (abIcon && !abilityIcons.find(a => a.icon === abIcon)) {
                                    abilityIcons.push({ icon: abIcon, name: 'Passive' });
                                  }
                                }
                              }
                              
                              // Aspect changes – use god.aspect icon when present
                              if (change.section === 'Aspect' && god.aspect && god.aspect.icon) {
                                const aspectIcon = getLocalGodAsset(god.aspect.icon);
                                if (aspectIcon && !abilityIcons.find(a => a.icon === aspectIcon)) {
                                  abilityIcons.push({ icon: aspectIcon, name: change.aspectName || 'Aspect' });
                                }
                              }
                            });
                          }
                          
                          return (
                            <TouchableOpacity 
                              key={idx} 
                              style={styles.catchUpGodWithAbilities}
                              onPress={() => setCatchUpTooltip({
                                name: godName,
                                type: 'god',
                                changeType: 'buffed',
                                changes: changes,
                              })}
                              activeOpacity={0.7}
                            >
                              <View style={styles.catchUpIconContainer}>
                                {localIcon ? (
                                  <Image 
                                    source={localIcon} 
                                    style={styles.catchUpGodIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${godName} icon`}
                                  />
                                ) : (
                                  <View style={[styles.catchUpIconFallback, { backgroundColor: '#10b98140' }]}>
                                    <Text style={styles.catchUpIconFallbackText}>{godName.charAt(0)}</Text>
                                  </View>
                                )}
                                <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{godName}</Text>
                              </View>
                              {abilityIcons.length > 0 && (
                                <View style={styles.catchUpAbilityIcons}>
                                  {abilityIcons.slice(0, 4).map((ab, abIdx) => (
                                    <Image key={abIdx} source={ab.icon} style={styles.catchUpAbilityIcon} contentFit="cover" />
                                  ))}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Gods Nerfed */}
                  {catchUpData.gods?.nerfed && catchUpData.gods.nerfed.length > 0 && (
                    <View style={styles.catchUpSection}>
                      <TouchableOpacity
                        style={styles.catchUpSectionHeader}
                        onPress={() => toggleCatchUpSection('catchUpGodsNerfed')}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.patchBadge, styles.patchBadgeNerfed]}>
                            <Text style={styles.patchBadgeText}>NERFED</Text>
                          </View>
                          <Text style={styles.catchUpSectionTitle}>Gods Nerfed ({catchUpData.gods.nerfed.length})</Text>
                        </View>
                        <Text style={styles.expandIcon}>{catchUpExpandedSections.catchUpGodsNerfed ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      {catchUpExpandedSections.catchUpGodsNerfed && (
                        <View style={styles.catchUpIconsGrid}>
                        {catchUpData.gods.nerfed.map((godEntry, idx) => {
                          const godName = typeof godEntry === 'string' ? godEntry : godEntry.name;
                          const changes = typeof godEntry === 'object' && godEntry.changes ? godEntry.changes : [];
                          const god = findGodByName(godName);
                          const icon = god && (god.icon || god.GodIcon);
                          const localIcon = icon ? getLocalGodAsset(icon) : null;
                          
                          // Extract ability icons from changes
                          const abilityIcons = [];
                          if (Array.isArray(changes)) {
                            changes.forEach(change => {
                              const abilityName = change.abilityName || change.ability;
                              
                              if (!god) return;
                              
                              if (change.section === 'General') return;
                              
                              if (abilityName && god.abilities) {
                                const ability = findAbilityByName(god, abilityName);
                                if (ability && ability.icon) {
                                  const abIcon = getLocalGodAsset(ability.icon);
                                  if (abIcon && !abilityIcons.find(a => a.icon === abIcon)) {
                                    abilityIcons.push({ icon: abIcon, name: abilityName });
                                  }
                                } else if (change.section === 'Passive' && god.passive && god.passive.icon) {
                                  const abIcon = getLocalGodAsset(god.passive.icon);
                                  if (abIcon && !abilityIcons.find(a => a.icon === abIcon)) {
                                    abilityIcons.push({ icon: abIcon, name: 'Passive' });
                                  }
                                }
                              }
                              
                              if (change.section === 'Aspect' && god.aspect && god.aspect.icon) {
                                const aspectIcon = getLocalGodAsset(god.aspect.icon);
                                if (aspectIcon && !abilityIcons.find(a => a.icon === aspectIcon)) {
                                  abilityIcons.push({ icon: aspectIcon, name: change.aspectName || 'Aspect' });
                                }
                              }
                            });
                          }
                          
                          return (
                            <TouchableOpacity 
                              key={idx} 
                              style={styles.catchUpGodWithAbilities}
                              onPress={() => setCatchUpTooltip({
                                name: godName,
                                type: 'god',
                                changeType: 'nerfed',
                                changes: changes,
                              })}
                              activeOpacity={0.7}
                            >
                              <View style={styles.catchUpIconContainer}>
                                {localIcon ? (
                                  <Image 
                                    source={localIcon} 
                                    style={styles.catchUpGodIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${godName} icon`}
                                  />
                                ) : (
                                  <View style={[styles.catchUpIconFallback, { backgroundColor: '#ef444440' }]}>
                                    <Text style={styles.catchUpIconFallbackText}>{godName.charAt(0)}</Text>
                                  </View>
                                )}
                                <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{godName}</Text>
                              </View>
                              {abilityIcons.length > 0 && (
                                <View style={styles.catchUpAbilityIcons}>
                                  {abilityIcons.slice(0, 4).map((ab, abIdx) => (
                                    <Image key={abIdx} source={ab.icon} style={styles.catchUpAbilityIcon} contentFit="cover" />
                                  ))}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Gods Shifted */}
                  {catchUpData.gods?.shifted && catchUpData.gods.shifted.length > 0 && (
                    <View style={styles.catchUpSection}>
                      <TouchableOpacity
                        style={styles.catchUpSectionHeader}
                        onPress={() => toggleCatchUpSection('catchUpGodsShifted')}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.patchBadge, styles.patchBadgeShifted]}>
                            <Text style={styles.patchBadgeText}>SHIFTED</Text>
                          </View>
                          <Text style={styles.catchUpSectionTitle}>Gods Shifted ({catchUpData.gods.shifted.length})</Text>
                        </View>
                        <Text style={styles.expandIcon}>{catchUpExpandedSections.catchUpGodsShifted ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      {catchUpExpandedSections.catchUpGodsShifted && (
                        <View style={styles.catchUpIconsGrid}>
                        {catchUpData.gods.shifted.map((godEntry, idx) => {
                          const godName = typeof godEntry === 'string' ? godEntry : godEntry.name;
                          const changes = typeof godEntry === 'object' && godEntry.changes ? godEntry.changes : [];
                          const god = findGodByName(godName);
                          const icon = god && (god.icon || god.GodIcon);
                          const localIcon = icon ? getLocalGodAsset(icon) : null;
                          
                          // Extract ability icons from changes
                          const abilityIcons = [];
                          if (Array.isArray(changes)) {
                            changes.forEach(change => {
                              const abilityName = change.abilityName || change.ability;
                              
                              if (!god) return;
                              
                              if (change.section === 'General') return;
                              
                              if (abilityName && god.abilities) {
                                const ability = findAbilityByName(god, abilityName);
                                if (ability && ability.icon) {
                                  const abIcon = getLocalGodAsset(ability.icon);
                                  if (abIcon && !abilityIcons.find(a => a.icon === abIcon)) {
                                    abilityIcons.push({ icon: abIcon, name: abilityName });
                                  }
                                } else if (change.section === 'Passive' && god.passive && god.passive.icon) {
                                  const abIcon = getLocalGodAsset(god.passive.icon);
                                  if (abIcon && !abilityIcons.find(a => a.icon === abIcon)) {
                                    abilityIcons.push({ icon: abIcon, name: 'Passive' });
                                  }
                                }
                              }
                              
                              if (change.section === 'Aspect' && god.aspect && god.aspect.icon) {
                                const aspectIcon = getLocalGodAsset(god.aspect.icon);
                                if (aspectIcon && !abilityIcons.find(a => a.icon === aspectIcon)) {
                                  abilityIcons.push({ icon: aspectIcon, name: change.aspectName || 'Aspect' });
                                }
                              }
                            });
                          }
                          
                          return (
                            <TouchableOpacity 
                              key={idx} 
                              style={styles.catchUpGodWithAbilities}
                              onPress={() => setCatchUpTooltip({
                                name: godName,
                                type: 'god',
                                changeType: 'shifted',
                                changes: changes,
                              })}
                              activeOpacity={0.7}
                            >
                              <View style={styles.catchUpIconContainer}>
                                {localIcon ? (
                                  <Image 
                                    source={localIcon} 
                                    style={styles.catchUpGodIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${godName} icon`}
                                  />
                                ) : (
                                  <View style={[styles.catchUpIconFallback, { backgroundColor: '#fbbf2440' }]}>
                                    <Text style={styles.catchUpIconFallbackText}>{godName.charAt(0)}</Text>
                                  </View>
                                )}
                                <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{godName}</Text>
                              </View>
                              {abilityIcons.length > 0 && (
                                <View style={styles.catchUpAbilityIcons}>
                                  {abilityIcons.slice(0, 4).map((ab, abIdx) => (
                                    <Image key={abIdx} source={ab.icon} style={styles.catchUpAbilityIcon} contentFit="cover" />
                                  ))}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Items Changed */}
                  {catchUpData.items && (catchUpData.items.buffed?.length > 0 || catchUpData.items.nerfed?.length > 0 || catchUpData.items.changed?.length > 0) && (
                    <View style={styles.catchUpSection}>
                      <TouchableOpacity
                        style={styles.catchUpSectionHeader}
                        onPress={() => toggleCatchUpSection('catchUpItems')}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <Text style={styles.catchUpSectionTitle}>Items Changed ({(catchUpData.items.buffed?.length || 0) + (catchUpData.items.nerfed?.length || 0) + (catchUpData.items.changed?.length || 0)})</Text>
                        </View>
                        <Text style={styles.expandIcon}>{catchUpExpandedSections.catchUpItems ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      {catchUpExpandedSections.catchUpItems && (
                        <View style={styles.catchUpIconsGrid}>
                        {catchUpData.items.buffed?.map((itemEntry, idx) => {
                          const itemName = typeof itemEntry === 'string' ? itemEntry : itemEntry.name;
                          const changes = typeof itemEntry === 'object' && itemEntry.changes ? itemEntry.changes : [];
                          const summary = typeof itemEntry === 'object' && itemEntry.summary ? itemEntry.summary : '';
                          const item = findItemByName(itemName);
                          const itemIcon = item && (item.icon || item.internalName || itemName);
                          const localItemIcon = itemIcon ? getLocalItemIcon(itemIcon) : null;
                          const imageSource = localItemIcon?.primary || localItemIcon;
                          const fallbackSource = localItemIcon?.fallback;
                          const itemKey = `catchup-item-buff-${itemName}`;
                          const useFallback = failedItemIcons[itemKey];
                          
                          return (
                            <TouchableOpacity 
                              key={`buff-${idx}`} 
                              style={styles.catchUpIconContainer}
                              onPress={() => setCatchUpTooltip({
                                name: itemName,
                                type: 'item',
                                changeType: 'buff',
                                changes: changes || summary,
                              })}
                              activeOpacity={0.7}
                            >
                              {imageSource ? (
                                fallbackSource && !useFallback ? (
                                  <Image 
                                    source={imageSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                    onError={() => {
                                      setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                    }}
                                  />
                                ) : fallbackSource && useFallback ? (
                                  <Image 
                                    source={fallbackSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                  />
                                ) : (
                                  <Image 
                                    source={imageSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                  />
                                )
                              ) : (
                                <View style={[styles.catchUpIconFallback, { backgroundColor: '#10b98140' }]}>
                                  <Text style={styles.catchUpIconFallbackText}>{itemName.charAt(0)}</Text>
                                </View>
                              )}
                              <View style={[styles.patchBadge, styles.patchBadgeBuffed, { marginTop: 4 }]}>
                                <Text style={styles.patchBadgeText}>BUFF</Text>
                              </View>
                              <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{itemName}</Text>
                            </TouchableOpacity>
                          );
                        })}
                        {catchUpData.items.nerfed?.map((itemEntry, idx) => {
                          const itemName = typeof itemEntry === 'string' ? itemEntry : itemEntry.name;
                          const changes = typeof itemEntry === 'object' && itemEntry.changes ? itemEntry.changes : [];
                          const summary = typeof itemEntry === 'object' && itemEntry.summary ? itemEntry.summary : '';
                          const item = findItemByName(itemName);
                          const itemIcon = item && (item.icon || item.internalName || itemName);
                          const localItemIcon = itemIcon ? getLocalItemIcon(itemIcon) : null;
                          const imageSource = localItemIcon?.primary || localItemIcon;
                          const fallbackSource = localItemIcon?.fallback;
                          const itemKey = `catchup-item-nerf-${itemName}`;
                          const useFallback = failedItemIcons[itemKey];
                          
                          return (
                            <TouchableOpacity 
                              key={`nerf-${idx}`} 
                              style={styles.catchUpIconContainer}
                              onPress={() => setCatchUpTooltip({
                                name: itemName,
                                type: 'item',
                                changeType: 'nerf',
                                changes: changes || summary,
                              })}
                              activeOpacity={0.7}
                            >
                              {imageSource ? (
                                fallbackSource && !useFallback ? (
                                  <Image 
                                    source={imageSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                    onError={() => {
                                      setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                    }}
                                  />
                                ) : fallbackSource && useFallback ? (
                                  <Image 
                                    source={fallbackSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                  />
                                ) : (
                                  <Image 
                                    source={imageSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                  />
                                )
                              ) : (
                                <View style={[styles.catchUpIconFallback, { backgroundColor: '#ef444440' }]}>
                                  <Text style={styles.catchUpIconFallbackText}>{itemName.charAt(0)}</Text>
                                </View>
                              )}
                              <View style={[styles.patchBadge, styles.patchBadgeNerfed, { marginTop: 4 }]}>
                                <Text style={styles.patchBadgeText}>NERF</Text>
                              </View>
                              <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{itemName}</Text>
                            </TouchableOpacity>
                          );
                        })}
                        {catchUpData.items.changed?.map((itemEntry, idx) => {
                          const itemName = typeof itemEntry === 'string' ? itemEntry : itemEntry.name;
                          const changeType = typeof itemEntry === 'object' ? ((itemEntry.changeType || '').toLowerCase()) : '';
                          const item = findItemByName(itemName);
                          const itemIcon = item && (item.icon || item.internalName || itemName);
                          const localItemIcon = itemIcon ? getLocalItemIcon(itemIcon) : null;
                          const imageSource = localItemIcon?.primary || localItemIcon;
                          const fallbackSource = localItemIcon?.fallback;
                          const itemKey = `catchup-item-change-${itemName}`;
                          const useFallback = failedItemIcons[itemKey];
                          
                          // Determine if this is a shift, fix, or general change
                          const isShift = changeType === 'shift';
                          const isFix = changeType === 'fix';
                          
                          return (
                            <View key={`change-${idx}`} style={styles.catchUpIconContainer}>
                              {imageSource ? (
                                fallbackSource && !useFallback ? (
                                  <Image 
                                    source={imageSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                    onError={() => {
                                      setFailedItemIcons(prev => ({ ...prev, [itemKey]: true }));
                                    }}
                                  />
                                ) : fallbackSource && useFallback ? (
                                  <Image 
                                    source={fallbackSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                  />
                                ) : (
                                  <Image 
                                    source={imageSource} 
                                    style={styles.catchUpItemIcon} 
                                    contentFit="cover"
                                    accessibilityLabel={`${itemName} item icon`}
                                  />
                                )
                              ) : (
                                <View style={[styles.catchUpIconFallback, { backgroundColor: isShift ? '#fbbf2440' : '#f59e0b40' }]}>
                                  <Text style={styles.catchUpIconFallbackText}>{itemName.charAt(0)}</Text>
                                </View>
                              )}
                              {isShift && (
                                <View style={[styles.patchBadge, styles.patchBadgeShifted, { marginTop: 4 }]}>
                                  <Text style={styles.patchBadgeText}>SHIFT</Text>
                                </View>
                              )}
                              {isFix && (
                                <View style={[styles.patchBadge, { backgroundColor: '#64748b', marginTop: 4 }]}>
                                  <Text style={styles.patchBadgeText}>FIXED</Text>
                                </View>
                              )}
                              <Text style={styles.catchUpIconLabel} numberOfLines={1} ellipsizeMode="tail">{itemName}</Text>
                            </View>
                          );
                        })}
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Game Modes */}
                  {catchUpData.gameModes && catchUpData.gameModes.length > 0 && (
                    <View style={styles.catchUpSection}>
                      <TouchableOpacity
                        style={styles.catchUpSectionHeader}
                        onPress={() => toggleCatchUpSection('catchUpGameModes')}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <Text style={styles.catchUpSectionTitle}>Game Modes Updated ({catchUpData.gameModes.length})</Text>
                        </View>
                        <Text style={styles.expandIcon}>{catchUpExpandedSections.catchUpGameModes ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      {catchUpExpandedSections.catchUpGameModes && (
                        <View style={styles.catchUpGameModesList}>
                        {catchUpData.gameModes.map((mode, idx) => (
                          <View key={idx} style={styles.catchUpGameModeItem}>
                            <Text style={styles.catchUpGameModeName}>{mode.name}</Text>
                            {mode.changes && mode.changes.length > 0 && (
                              <Text style={styles.catchUpGameModeCategories}>
                                {mode.changes.map(c => c.category).filter(Boolean).join(', ')}
                              </Text>
                            )}
                          </View>
                        ))}
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              )}
              
              <Text style={styles.infoText}>
                Select the patch number you last played (OB25 is the latest). 
                We'll show you all changes from that patch to the current one.
              </Text>
            </View>
          </View>
        )}

        {subTab === 'archive' && (
          <View style={styles.content}>
            <Text style={styles.title}>Patch Archive</Text>
            <Text style={styles.description}>
              Browse all previous patches and search by god/item to see change history.
            </Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Timeline View</Text>
              <Text style={styles.cardText}>
                Timeline and archive functionality coming soon.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

        {/* Catch Up Tooltip Modal */}
        <Modal
          visible={catchUpTooltip !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setCatchUpTooltip(null);
            setExpandedAbilities({});
          }}
        >
          <Pressable
            style={styles.catchUpTooltipOverlay}
            onPress={() => {
              setCatchUpTooltip(null);
              setExpandedAbilities({});
            }}
          >
            <Pressable
              style={[
                styles.catchUpTooltipContent,
                IS_WEB && screenDimensions.width < 768 && {
                  width: screenDimensions.width < 500 ? '92%' : '90%',
                  maxWidth: screenDimensions.width < 500 ? '92%' : '90%',
                  maxHeight: screenDimensions.width < 500 ? '75vh' : '70vh',
                  padding: screenDimensions.width < 500 ? 12 : 14,
                },
                !IS_WEB && {
                  width: screenDimensions.width < 500 ? '98%' : screenDimensions.width < 768 ? '95%' : '90%',
                  maxWidth: screenDimensions.width < 500 ? '98%' : screenDimensions.width < 768 ? '95%' : '90%',
                  maxHeight: screenDimensions.width < 500 ? '80%' : screenDimensions.width < 768 ? '75%' : '70%',
                  padding: screenDimensions.width < 500 ? 10 : 12,
                }
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {catchUpTooltip && (
                <View style={{ 
                  width: '100%', 
                  ...(!IS_WEB && { 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: 0,
                    maxHeight: screenDimensions.width < 500 ? screenDimensions.height * 0.8 : screenDimensions.width < 768 ? screenDimensions.height * 0.75 : screenDimensions.height * 0.7,
                  }),
                  ...(IS_WEB && screenDimensions.width < 768 && {
                    maxHeight: screenDimensions.width < 500 ? '75vh' : '70vh',
                  })
                }}>
                  <View style={styles.catchUpTooltipHeader}>
                    <Text style={[
                      styles.catchUpTooltipTitle,
                      IS_WEB && screenDimensions.width < 768 && {
                        fontSize: screenDimensions.width < 500 ? 16 : 18,
                      }
                    ]}>{catchUpTooltip.name}</Text>
                    <TouchableOpacity
                      style={styles.catchUpTooltipClose}
                      onPress={() => {
              setCatchUpTooltip(null);
              setExpandedAbilities({});
            }}
                    >
                      <Text style={styles.catchUpTooltipCloseText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    style={[
                      styles.catchUpTooltipBody,
                      IS_WEB && screenDimensions.width < 768 && {
                        maxHeight: screenDimensions.width < 500 ? 350 : 400,
                      }
                    ]} 
                    contentContainerStyle={styles.catchUpTooltipBodyContent}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="white"
                    bounces={true}
                    scrollEnabled={true}
                    alwaysBounceVertical={false}
                    removeClippedSubviews={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {catchUpTooltip.type === 'god' && Array.isArray(catchUpTooltip.changes) && catchUpTooltip.changes.length > 0 && (() => {
                      const god = findGodByName(catchUpTooltip.name);
                      return (
                        <>
                          {catchUpTooltip.changes.map((change, idx) => {
                            const abilityName = change.ability || change.abilityName || 'General';
                            const details = change.details || change.description || (typeof change === 'string' ? change : '');
                            const isExpanded = expandedAbilities[idx] || false;
                            
                            // Find ability icon
                            let abilityIcon = null;
                            if (god && abilityName !== 'General') {
                              const ability = findAbilityByName(god, abilityName);
                              if (ability && ability.icon) {
                                abilityIcon = getLocalGodAsset(ability.icon);
                              } else if (change.section === 'Passive' && god.passive && god.passive.icon) {
                                abilityIcon = getLocalGodAsset(god.passive.icon);
                              }
                            }
                            
                            return (
                              <View key={idx} style={styles.catchUpTooltipChangeItem}>
                                <TouchableOpacity
                                  style={styles.catchUpTooltipAbilityHeader}
                                  onPress={() => setExpandedAbilities(prev => ({
                                    ...prev,
                                    [idx]: !prev[idx]
                                  }))}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.catchUpTooltipAbilityHeaderContent}>
                                    {abilityIcon && (
                                      <Image 
                                        source={abilityIcon} 
                                        style={styles.catchUpTooltipAbilityIcon} 
                                        contentFit="cover"
                                        accessibilityLabel={`${abilityName} ability icon`}
                                      />
                                    )}
                                    <Text style={[
                                      styles.catchUpTooltipChangeAbility,
                                      IS_WEB && screenDimensions.width < 768 && {
                                        fontSize: screenDimensions.width < 500 ? 12 : 13,
                                      }
                                    ]} selectable>
                                      {abilityName}
                                    </Text>
                                  </View>
                                  <Text style={styles.catchUpTooltipExpandIcon}>
                                    {isExpanded ? '▼' : '▶'}
                                  </Text>
                                </TouchableOpacity>
                                {isExpanded && (
                                  <Text style={[
                                    styles.catchUpTooltipChangeDetails,
                                    IS_WEB && screenDimensions.width < 768 && {
                                      fontSize: screenDimensions.width < 500 ? 11 : 12,
                                      lineHeight: screenDimensions.width < 500 ? 15 : 16,
                                    }
                                  ]} selectable>
                                    {typeof details === 'string' ? details : Array.isArray(details) ? details.join(' | ') : ''}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                    {catchUpTooltip.type === 'item' && (
                      <Text style={[
                        styles.catchUpTooltipChangeDetails,
                        IS_WEB && screenDimensions.width < 768 && {
                          fontSize: screenDimensions.width < 500 ? 11 : 12,
                          lineHeight: screenDimensions.width < 500 ? 15 : 16,
                        }
                      ]} pointerEvents="none">
                        {typeof catchUpTooltip.changes === 'string' 
                          ? catchUpTooltip.changes 
                          : Array.isArray(catchUpTooltip.changes) 
                            ? catchUpTooltip.changes.join(' | ')
                            : 'No details available'}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071024',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginTop: 12,
  },
  pageHeader: {
    marginBottom: 32,
    alignItems: 'center',
    width: '100%',
  },
  pageTitle: {
    color: '#fbbf24',
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
    ...(IS_WEB ? {} : {
      fontSize: 32,
    }),
  },
  pageSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  title: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  expandableSection: {
    marginBottom: 20,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingRight: 20, // Extra padding for expand icon
    backgroundColor: '#0f1724',
  },
  sectionHeaderNewAspects: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  sectionHeaderBuffed: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  sectionHeaderNerfed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  sectionHeaderShifted: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  expandIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    flexShrink: 0,
  },
  sectionContent: {
    padding: 16,
    backgroundColor: '#0b1226',
    ...(IS_WEB ? {
      background: 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.8), rgba(30, 58, 95, 0.4))',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    } : {
      flexDirection: 'column',
    }),
  },
  card: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fbbf24',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardText: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
  },
  changeCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    marginBottom: IS_WEB ? 0 : 12,
    ...(IS_WEB ? {
      flexBasis: 'calc(33.333% - 11px)',
      minWidth: '300px',
      maxWidth: '400px',
      flexGrow: 0,
      flexShrink: 0,
    } : {
      width: '100%',
    }),
  },
  changeCardArtioWeb: {
    width: '100%',
    maxWidth: '100%',
    flexBasis: '100%',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: '100%',
    marginBottom: 16,
  },
  changeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  changeIconFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeIconFallbackText: {
    fontSize: 20,
    fontWeight: '700',
  },
  changeCardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeCardTitle: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  patchPinButton: {
    padding: 4,
    borderRadius: 4,
  },
  patchPinButtonText: {
    fontSize: 16,
  },
  changeSummary: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  summarySection: {
    marginTop: 12,
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryLine: {
    marginBottom: 6,
  },
  changeSummaryText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  abilityChangeText: {
    flex: 1,
    flexShrink: 1,
  },
  abilityChangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginTop: 4,
  },
  abilityIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
  },
  abilityIconFallback: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  abilityIconFallbackText: {
    color: '#e6eef8',
    fontSize: 12,
    fontWeight: '600',
  },
  abilityChangeText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  abilityName: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  changesList: {
    marginTop: 12,
    flexDirection: 'column',
  },
  changesListArtioWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'stretch',
    width: '100%',
    justifyContent: 'flex-start',
  },
  changeItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  changeItemArtioWeb: {
    flexDirection: 'column',
    marginBottom: 12,
    flex: '0 0 calc(33.333% - 8px)',
    width: 'calc(33.333% - 8px)',
    minWidth: '220px',
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    display: 'flex',
    minHeight: '160px',
    justifyContent: 'flex-start',
  },
  changeAbilityIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  changeAbilityIconArtioWeb: {
    width: 32,
    height: 32,
    marginRight: 0,
    marginBottom: 8,
    alignSelf: 'center',
  },
  changeAbilityIconFallback: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  changeAbilityIconFallbackText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '700',
  },
  changeItemContent: {
    flex: 1,
  },
  changeAbilityName: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  changeAbilityNameArtioWeb: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 5,
    flexWrap: 'wrap',
    fontWeight: '600',
  },
  changeDetails: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  changeDetailsArtioWeb: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  newBadgeIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  featureCard: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  featureTitle: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  featureContent: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  dateInput: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    color: '#e6eef8',
    fontSize: 14,
    marginBottom: 12,
  },
  patchSelectorWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 16,
    zIndex: 10,
  },
  patchSelector: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 80,
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 36,
    }),
  },
  patchSelectorText: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '600',
  },
  patchSelectorArrow: {
    color: '#94a3b8',
    fontSize: 12,
  },
  patchPickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0b1226',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    maxHeight: 240,
    zIndex: 1000,
    minWidth: 100,
    width: '100%',
    ...(IS_WEB && {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '240px',
    }),
  },
  patchPickerScroll: {
    maxHeight: 240,
    ...(IS_WEB && {
      overflowY: 'auto',
      overflowX: 'hidden',
      height: '240px',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'thin',
      scrollbarColor: '#1e90ff #0b1226',
    }),
  },
  patchPickerOption: {
    padding: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  patchPickerOptionSelected: {
    backgroundColor: '#1e90ff',
    borderBottomColor: '#1e90ff',
  },
  patchPickerOptionText: {
    color: '#e6eef8',
    fontSize: 14,
  },
  patchPickerOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  catchUpResults: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  catchUpSummary: {
    color: '#e6eef8',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '600',
  },
  catchUpSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  catchUpSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  catchUpSectionTitle: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
  },
  catchUpIconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    ...(IS_WEB && {
      justifyContent: 'flex-start',
      display: 'flex',
      alignItems: 'flex-start',
    }),
  },
  catchUpIconContainer: {
    alignItems: 'center',
    ...(IS_WEB ? {
      width: 'calc(33.333% - 8px)',
      flexBasis: 'calc(33.333% - 8px)',
      minWidth: 'calc(33.333% - 8px)',
      maxWidth: 'calc(33.333% - 8px)',
      justifyContent: 'flex-start',
      paddingTop: 0,
      boxSizing: 'border-box',
    } : {
      flexBasis: '30%',
      minWidth: '30%',
      maxWidth: '30%',
    }),
  },
  catchUpGodIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    marginBottom: 6,
    ...(IS_WEB && {
      cursor: 'pointer',
      marginTop: 0,
    }),
  },
  catchUpItemIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    marginBottom: 6,
    ...(IS_WEB && {
      cursor: 'pointer',
      marginTop: 0,
    }),
  },
  catchUpIconFallback: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...(IS_WEB && {
      cursor: 'pointer',
      marginTop: 0,
    }),
  },
  catchUpIconFallbackText: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
  },
  catchUpIconLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
    ...(IS_WEB && {
      maxWidth: '100%',
      overflow: 'hidden',
    }),
  },
  catchUpGodWithAbilities: {
    alignItems: 'center',
    ...(IS_WEB ? {
      flexBasis: 'calc(33.333% - 8px)',
      minWidth: 'calc(33.333% - 8px)',
      maxWidth: 'calc(33.333% - 8px)',
    } : {
      flexBasis: '30%',
      minWidth: '30%',
      maxWidth: '30%',
    }),
  },
  catchUpAbilityIcons: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  catchUpAbilityIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  catchUpTooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(IS_WEB ? {} : {
      padding: 20,
    }),
    ...(IS_WEB && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  },
  catchUpTooltipContent: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: IS_WEB ? 20 : 12,
    width: IS_WEB ? 600 : '95%',
    maxWidth: IS_WEB ? 600 : '95%',
    maxHeight: IS_WEB ? '85vh' : '75%',
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
    }),
    ...(!IS_WEB && {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '75%',
    }),
    // Mobile web (iPhone Chrome) - smaller sizing
    ...(IS_WEB && {
      '@media (max-width: 767px)': {
        width: '90%',
        maxWidth: '90%',
        maxHeight: '70vh',
        padding: 14,
      },
      '@media (max-width: 500px)': {
        width: '92%',
        maxWidth: '92%',
        maxHeight: '75vh',
        padding: 12,
      },
    }),
  },
  catchUpTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
    ...(!IS_WEB && {
      flexShrink: 0,
    }),
  },
  catchUpTooltipTitle: {
    color: '#fbbf24',
    fontSize: IS_WEB ? 20 : 18,
    fontWeight: '700',
    flex: 1,
  },
  catchUpTooltipClose: {
    padding: 4,
    marginLeft: 12,
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  catchUpTooltipCloseText: {
    color: '#cbd5e1',
    fontSize: 24,
    fontWeight: '700',
  },
  catchUpTooltipBody: {
    ...(IS_WEB ? {
      maxHeight: 500,
    } : {
      flex: 1,
      minHeight: 0,
      width: '100%',
    }),
  },
  catchUpTooltipBodyContent: {
    paddingBottom: 8,
    ...(!IS_WEB && {
      flexGrow: 1,
      paddingBottom: 20,
    }),
  },
  catchUpTooltipChangeItem: {
    marginBottom: IS_WEB ? 12 : 10,
    paddingBottom: IS_WEB ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  catchUpTooltipAbilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    ...(IS_WEB && {
      cursor: 'pointer',
    }),
  },
  catchUpTooltipAbilityHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  catchUpTooltipAbilityIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  catchUpTooltipExpandIcon: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 8,
  },
  catchUpTooltipChangeAbility: {
    color: '#7dd3fc',
    fontSize: IS_WEB ? 14 : 13,
    fontWeight: '600',
  },
  catchUpTooltipChangeDetails: {
    color: '#cbd5e1',
    fontSize: IS_WEB ? 13 : 12,
    lineHeight: IS_WEB ? 18 : 16,
  },
  catchUpGameModesList: {
    gap: 12,
  },
  catchUpGameModeItem: {
    padding: 12,
    backgroundColor: 'rgba(30, 58, 95, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  catchUpGameModeName: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  catchUpGameModeCategories: {
    color: '#94a3b8',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  patchBadge: {
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
  patchBadgeNewAspects: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  patchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  changeCardBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    zIndex: 10,
  },
});