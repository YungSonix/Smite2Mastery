import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
// Lazy load builds.json to prevent startup crash
let localBuilds = null;
import { getLocalItemIcon, getLocalGodAsset } from './localIcons';
import ConquestMap from './ConquestMap';


// Import game mode icons
const gameModeIcons = {
  'conquest': require('./data/Icons/Game Modes/Conquest/conquestmap.webp'),
  'arena': require('./data/Icons/Game Modes/Arena/ArenaCA1Update.webp'),
  'joust': require('./data/Icons/Game Modes/Joust/Joust_Minimap_F2P.webp'),
  'duel': require('./data/Icons/Game Modes/Duel/Duel_Minimap_F2P.webp'),
  'assault': require('./data/Icons/Game Modes/Assault/t_Assault_F2P.webp'),
};

// Import buff icons
const buffIcons = {
  'Caustic': require('./data/Icons/Game Modes/Conquest/CausticBuff.webp'),
  'Primal': require('./data/Icons/Game Modes/Conquest/PrimalBuff.webp'),
  'Inspiration': require('./data/Icons/Game Modes/Conquest/InspirationBuff.webp'),
  'Pathfinder': require('./data/Icons/Game Modes/Conquest/PathfinderBuff.webp'),
};

// Buff colors
const buffColors = {
  'Caustic': '#ef4444', // Red
  'Primal': '#3b82f6', // Blue
  'Inspiration': '#a855f7', // Purple
  'Pathfinder': '#eab308', // Yellow
};
const towerIcons = {
  'Tower': require('./data/Icons/Game Modes/Conquest/Towers.webp'),
};
const phoenixIcons = {
  'Phoenix': require('./data/Icons/Game Modes/Conquest/Phoenix.webp'),
};
const titanIcons = {
  'Titan': require('./data/Icons/Game Modes/Conquest/Titan.webp'),
};
// Import consumable icons
const consumableIcons = {
  'Baron\'s Brew': require('./data/Icons/Consumables/Consumable_Barons_Brew.png'),
  'Eyes of the Jungle': require('./data/Icons/Consumables/Consumable_Eyes_of_the_Jungle.png'),
  'Obsidian Dagger': require('./data/Icons/Consumables/Consumable_Obsidian_Dagger.png'),
  'Vision Ward': require('./data/Icons/Consumables/Consumable_Vision_Ward.png'),
  'Sentry Ward': require('./data/Icons/Consumables/Consumable_Sentry_Ward.png'),
  'Warding Chalice': require('./data/Icons/Consumables/Consumable_Warding_Chalice.png'),
  'Elixir of Strength': require('./data/Icons/Consumables/Consumable_Elixir_of_Strength.png'),
  'Elixir of Intelligence': require('./data/Icons/Consumables/Consumable_Elixir_of_Intelligence.png'),
};

// Import Vulcan mod icons for items
const vulcanModItemIcons = {
  'Alternator Mod (Set One - Requires Level 1)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Alternator_Mod.png'),
  'Dual Mod (Set One - Requires Level 1)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Dual_Mod.png'),
  'Effeciency Mod (Set One - Requires Level 1)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Efficiency_Mod.png'),
  'Resonator Mod (Set Two - Requires Level 7)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Resonator_Mod.png'),
  'Thermal Mod (Set Two - Requires Level 7)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Thermal_Mod.png'),
  'Shrapnel Mod (Set Two - Requires Level 7)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Shrapnel_Mod.png'),
  'Masterwork Mod (Set Three  - Requires Level 14)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Masterwork_Mod.png'),
  'Surplus Mod (Set Three  - Requires Level 14)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Surplus_Mod.png'),
  'Seismic Mod (Set Three  - Requires Level 14)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Seismic_Mod.png'),
};

// Import stat icons
const statIcons = {
  'BasicAttackPower': require('./data/Icons/Stat Icons/HUD_Stats_Icon_BasicAttackPower.png'),
  'Active': require('./data/Icons/Stat Icons/T_StatIcon_Active.png'),
  'AttackSpeed': require('./data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  'Attack Speed': require('./data/Icons/Stat Icons/T_StatIcon_AttackSpeed.png'),
  'Consumable': require('./data/Icons/Stat Icons/T_StatIcon_Consumable.png'),
  'Cooldown Rate': require('./data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  'Cooldown': require('./data/Icons/Stat Icons/T_StatIcon_Cooldown.png'),
  'HealReduction': require('./data/Icons/Stat Icons/T_StatIcon_HealReduction.png'),
  'Health': require('./data/Icons/Stat Icons/T_StatIcon_Health.png'),
  'MaxHealth': require('./data/Icons/Stat Icons/T_StatIcon_Health.png'),
  'HP5': require('./data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  'Health Regen': require('./data/Icons/Stat Icons/T_StatIcon_HealthRegen.png'),
  'Intelligence': require('./data/Icons/Stat Icons/T_StatIcon_Intelligence.png'),
  'Lifesteal': require('./data/Icons/Stat Icons/T_StatIcon_Lifesteal.png'),
  'MagicalProtection': require('./data/Icons/Stat Icons/T_StatIcon_MagicalProt.png'),
  'Magical Protection': require('./data/Icons/Stat Icons/T_StatIcon_MagicalProt.png'),
  'Mana': require('./data/Icons/Stat Icons/T_StatIcon_Mana.png'),
  'MaxMana': require('./data/Icons/Stat Icons/T_StatIcon_Mana.png'),
  'MP5': require('./data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'Mana Regen': require('./data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'Mana Regeneration': require('./data/Icons/Stat Icons/T_StatIcon_ManaRegen.png'),
  'MovementSpeed': require('./data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  'Movement Speed': require('./data/Icons/Stat Icons/T_StatIcon_MovementSpeed.png'),
  'Passive': require('./data/Icons/Stat Icons/T_StatIcon_Passive.png'),
  'Penetration': require('./data/Icons/Stat Icons/T_StatIcon_Pen.png'),
  'PhysicalProtection': require('./data/Icons/Stat Icons/T_StatIcon_PhysicalProt.png'),
  'Physical Protection': require('./data/Icons/Stat Icons/T_StatIcon_PhysicalProt.png'),
  'Starter': require('./data/Icons/Stat Icons/T_StatIcon_Starter.png'),
  'Strength': require('./data/Icons/Stat Icons/T_StatIcon_Strength.png'),
  'Critical Chance': require('./data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'CriticalChance': require('./data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Criticial Chance': require('./data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Critical Damage': require('./data/Icons/Stat Icons/T_StatIcon_Crit.png'),
  'Basic Attack Damage': require('./data/Icons/Stat Icons/HUD_Stats_Icon_BasicAttackPower.png'),
  'Basic Damage': require('./data/Icons/Stat Icons/HUD_Stats_Icon_BasicAttackPower.png'),
};

// Pantheon icon mapping (local files)
  const pantheonIcons = {
  'Greek': require('./data/Icons/Pantheon Icons/Greek.png'),
  'Roman': require('./data/Icons/Pantheon Icons/Roman.png'),
  'Egyptian': require('./data/Icons/Pantheon Icons/Egyptian.png'),
  'Norse': require('./data/Icons/Pantheon Icons/Norse.png'),  
  'Chinese': require('./data/Icons/Pantheon Icons/Chinese.png'),
  'Tales of Arabia': require('./data/Icons/Pantheon Icons/Tales of Arabia.png'),
  'Korean': require('./data/Icons/Pantheon Icons/Korean.png'),
  'Hindu': require('./data/Icons/Pantheon Icons/Hindu.png'),
  'Mayan': require('./data/Icons/Pantheon Icons/Maya.png'), // File is "Maya.png" but pantheon name is "Mayan"
  'Celtic': require('./data/Icons/Pantheon Icons/Celtic.png'),
  'Japanese': require('./data/Icons/Pantheon Icons/Japanese.png'),
  'Voodoo': require('./data/Icons/Pantheon Icons/Voodoo.png'),
  'Yoruba': require('./data/Icons/Pantheon Icons/Yoruba.png'),
  'Polynesian': require('./data/Icons/Pantheon Icons/Polynesian.png'),
  'Arthurian': require('./data/Icons/Pantheon Icons/Arthurian.png'),
  // Note: Slavic, Babalonian, and Great Old Ones don't have corresponding files
  // They will fall back to null and won't display an icon
};

// Import Vulcan mod icons
let vulcanModIcons = {};
try {
  vulcanModIcons = {
    'Alternator Mod (Set One - Requires Level 1)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Alternator_Mod.png'),
    'Dual Mod (Set One - Requires Level 1)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Dual_Mod.png'),
    'Effeciency Mod (Set One - Requires Level 1)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Efficiency_Mod.png'),
    'Resonator Mod (Set Two - Requires Level 7)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Resonator_Mod.png'),
    'Thermal Mod (Set Two - Requires Level 7)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Thermal_Mod.png'),
    'Shrapnel Mod (Set Two - Requires Level 7)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Shrapnel_Mod.png'),
    'Masterwork Mod (Set Three  - Requires Level 14)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Masterwork_Mod.png'),
    'Surplus Mod (Set Three  - Requires Level 14)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Surplus_Mod.png'),
    'Seismic Mod (Set Three  - Requires Level 14)': require('./data/Icons/Vulcan Mods/GodSpecific_Vulcan_Seismic_Mod.png'),
  };
        } catch (error) {
  console.warn('Could not load Vulcan mod icons:', error);
  vulcanModIcons = {};
}

// Game modes data
const gameModes = [
  {
    id: 'conquest',
    name: 'Conquest',
    players: '5v5',
    map: 'Conquest',
    objective: 'Destroy the enemy Titan',
    averageLength: '25~45 Min.',
    description: 'The premier 5v5 battleground of the gods.',
    quote: '"The battleground awaits. Victory demands strategy, strength, and the will to conquer." — Zeus',
    fullDescription: 'Conquest is the definitive SMITE 2 experience, a strategic 5v5 game mode set on a grand three-lane map. Two teams clash with the ultimate goal of vanquishing the colossal Titan that guards the heart of the enemy\'s base. Victory is achieved not by mere strength, but by teamwork, strategy, and control over powerful objectives.',
  },
  {
    id: 'arena',
    name: 'Arena',
    players: '5v5',
    map: 'Arena',
    objective: 'Reduce enemy tickets to 0',
    averageLength: '15~20 Min.',
    description: '5v5 mode with 500 tickets per team. Reduce enemy tickets to 0.',
  },
  {
    id: 'joust',
    name: 'Joust',
    players: '3v3',
    map: 'Joust',
    objective: 'Destroy the enemy Titan',
    averageLength: '15~25 Min.',
    description: '3v3 mode on a single lane map. Destroy the enemy Titan.',
  },
  {
    id: 'duel',
    name: 'Duel',
    players: '1v1',
    map: 'Joust',
    objective: 'Destroy the enemy Titan',
    averageLength: '10~20 Min.',
    description: '1v1 variant of Joust. Test your skills in solo combat.',
  },
  {
    id: 'assault',
    name: 'Assault',
    players: '5v5',
    map: 'Assault',
    objective: 'Destroy the enemy Titan',
    averageLength: '15~25 Min.',
    description: '5v5 single lane mode with random god selection.',
  },
];

export default function DataPage({ initialSelectedGod = null, initialExpandAbilities = false, onBackToBuilds = null }) {
  const [builds, setBuilds] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('gods'); // 'gods', 'items', or 'gamemodes'
  const [selectedGod, setSelectedGod] = useState(initialSelectedGod);
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [gamemodesDescriptionExpanded, setGamemodesDescriptionExpanded] = useState(false);
  const [conquestSectionsExpanded, setConquestSectionsExpanded] = useState({
    battleground: false,
    threeLanes: false,
    jungle: false,
    objectives: false,
    phases: false,
  });
  const scrollViewRef = useRef(null);
  // Track if we came from builds page (only true if initialSelectedGod was set on mount)
  const [cameFromBuilds] = useState(!!initialSelectedGod && !!onBackToBuilds);
  
  // Lazy load the builds data after the UI has rendered
  useEffect(() => {
    let isMounted = true;
    
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        try {
          const data = require('./data/builds.json');
          if (isMounted) {
            setBuilds(data);
            setDataLoading(false);
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
  
  // If initialSelectedGod changes, update selectedGod
  useEffect(() => {
    if (initialSelectedGod) {
      setSelectedGod(initialSelectedGod);
      // If expandAbilities is true, expand the abilities section
      if (initialExpandAbilities) {
        setAbilitiesExpanded(true);
      }
    }
  }, [initialSelectedGod, initialExpandAbilities]);

  // Scroll to top when game mode is selected
  useEffect(() => {
    if (selectedGameMode && selectedTab === 'gamemodes') {
      // Use multiple timeouts to ensure scroll happens after content is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 200);
    }
  }, [selectedGameMode, selectedTab]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAbility, setSelectedAbility] = useState(null); // { abilityKey, ability, abilityName }
  const [skinsExpanded, setSkinsExpanded] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(null);
  const [loreExpanded, setLoreExpanded] = useState(false);
  const [abilitiesExpanded, setAbilitiesExpanded] = useState(false);
  const [aspectExpanded, setAspectExpanded] = useState(false);
  const [passiveExpanded, setPassiveExpanded] = useState(false);
  const [selectedPantheon, setSelectedPantheon] = useState(null);
  const [pantheonDropdownVisible, setPantheonDropdownVisible] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  const [statDropdownVisible, setStatDropdownVisible] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [tierDropdownVisible, setTierDropdownVisible] = useState(false);
  const [abilitySectionsExpanded, setAbilitySectionsExpanded] = useState({
    scales: false,
    description: false,
    stats: false,
  });
  
  function flattenAny(a) {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
  }

  const gods = builds ? flattenAny(builds.gods) : [];
  const allItems = builds ? flattenAny(builds.items) : [];
  
  // Extract unique pantheons
  const pantheons = useMemo(() => {
    const pantheonSet = new Set();
    gods.forEach((god) => {
      if (god.pantheon) {
        pantheonSet.add(god.pantheon);
      }
    });
    return Array.from(pantheonSet).sort();
  }, [gods]);
  
  // Filter to only actual item objects (must have name or internalName)
  // Include all items including consumables (they have active, stepCost, etc.)
  // Sort items alphabetically by name
  const items = useMemo(() => {
    const filtered = allItems.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      // Include items that have name, internalName, active property, or consumable property
      return (item.name || item.internalName || item.active === true || item.consumable === true);
    });
    
    // Sort alphabetically by name
    return filtered.sort((a, b) => {
      const nameA = (a.name || a.internalName || '').toString().toLowerCase();
      const nameB = (b.name || b.internalName || '').toString().toLowerCase();
      return nameA.localeCompare(nameB);
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

  // Filter gods
  const filteredGods = useMemo(() => {
    let result = gods;
    
    // Apply pantheon filter
    if (selectedPantheon) {
      result = result.filter((god) => god.pantheon === selectedPantheon);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((god) => {
        const name = (god.name || god.GodName || god.title || god.displayName || '').toString().toLowerCase();
        return name.includes(query);
      });
    } else {
      // Show only first 20 when no search (but still respect pantheon filter)
      result = result.slice(0, 20);
    }
    
    return result;
  }, [gods, searchQuery, selectedPantheon]);

  // Filter items
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
          // Check if item is a starter (usually has starter property or is in starter category)
          return item.starter === true || (item.name && item.name.toLowerCase().includes('starter'));
        } else if (selectedTier === 'Active') {
          // Active items are permanent items with active abilities
          // They have active: true AND (tier OR totalCost OR stats) AND are NOT consumables (no stepCost or has tier)
          return item.active === true && 
                 (item.tier || item.totalCost || (item.stats && Object.keys(item.stats).length > 0)) &&
                 (!item.stepCost || item.tier);
        } else if (selectedTier === 'Relic') {
          // Relics are items with relic property set to true
          return item.relic === true;
        } else if (selectedTier === 'Consumable') {
          // Consumables are one-time use items (have consumable: true, or active: true with stepCost, typically no tier)
          return item.consumable === true || 
                 (item.active === true && item.stepCost && !item.tier) ||
                 (item.name && item.name.toLowerCase().includes('consumable'));
        } else if (selectedTier === 'God Specific') {
          // God Specific items: Genie Lamp, Baron's Brew, and Vulcan mods
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
          // Check tier number
          const tierNum = selectedTier === 'Tier 1' ? 1 : selectedTier === 'Tier 2' ? 2 : 3;
          return item.tier === tierNum;
        }
        return true;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        const name = (item.name || '').toString().toLowerCase();
        const internalName = (item.internalName || '').toString().toLowerCase();
        return name.includes(query) || internalName.includes(query);
      });
    } else {
      // Show only first 20 when no search (but still respect stat and tier filters)
      result = result.slice(0, 20);
    }
    
    return result;
  }, [items, searchQuery, selectedStat, selectedTier]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>SMITE 2 Database</Text>
        <Text style={styles.headerSub}>All gameplay information about Smite 2 will be located here.</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'gods' && styles.tabActive]}
            onPress={() => {
              setSelectedTab('gods');
              setSelectedPantheon(null);
              setPantheonDropdownVisible(false);
              // Close any open detail pages
              setSelectedGod(null);
              setSelectedItem(null);
              setSkinsExpanded(false);
              setSelectedSkin(null);
              setLoreExpanded(false);
              setAbilitiesExpanded(false);
              setAspectExpanded(false);
              setPassiveExpanded(false);
              setSelectedAbility(null);
              setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
              setSelectedGameMode(null);
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'gods' && styles.tabTextActive]}>
              Gods ({gods.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'items' && styles.tabActive]}
            onPress={() => {
              setSelectedTab('items');
              setSelectedPantheon(null);
              setPantheonDropdownVisible(false);
              setSelectedStat(null);
              setStatDropdownVisible(false);
              setSelectedTier(null);
              setTierDropdownVisible(false);
              // Close any open detail pages
              setSelectedGod(null);
              setSelectedItem(null);
              setSkinsExpanded(false);
              setSelectedSkin(null);
              setLoreExpanded(false);
              setAbilitiesExpanded(false);
              setAspectExpanded(false);
              setPassiveExpanded(false);
              setSelectedAbility(null);
              setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
              setSelectedGameMode(null);
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'items' && styles.tabTextActive]}>
              Items ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'gamemodes' && styles.tabActive]}
            onPress={() => {
              setSelectedTab('gamemodes');
              setSelectedPantheon(null);
              setPantheonDropdownVisible(false);
              setSelectedStat(null);
              setStatDropdownVisible(false);
              setSelectedTier(null);
              setTierDropdownVisible(false);
              // Close any open detail pages
              setSelectedGod(null);
              setSelectedItem(null);
              setSkinsExpanded(false);
              setSelectedSkin(null);
              setLoreExpanded(false);
              setAbilitiesExpanded(false);
              setAspectExpanded(false);
              setPassiveExpanded(false);
              setSelectedAbility(null);
              setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
              setSelectedGameMode(null);
              setGamemodesDescriptionExpanded(false);
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'gamemodes' && styles.tabTextActive]}>
              Gamemodes ({gameModes.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          {selectedTab === 'gods' && (
            <View style={styles.filterButtonContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, selectedPantheon && styles.filterButtonActive]}
                  onPress={() => setPantheonDropdownVisible(!pantheonDropdownVisible)}
                >
                  <Text style={styles.filterButtonText}>
                    {selectedPantheon ? selectedPantheon : 'Filter'}
                  </Text>
                  <Text style={styles.filterButtonIcon}>
                    {pantheonDropdownVisible ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {pantheonDropdownVisible && (
                  <View style={styles.pantheonDropdown}>
                    <ScrollView style={styles.pantheonDropdownScroll} nestedScrollEnabled={true}>
                      <TouchableOpacity
                        style={[styles.pantheonOption, !selectedPantheon && styles.pantheonOptionActive]}
                        onPress={() => {
                          setSelectedPantheon(null);
                          setPantheonDropdownVisible(false);
                        }}
                      >
                        <Text style={styles.pantheonOptionText}>All Pantheons</Text>
                      </TouchableOpacity>
                      {pantheons.map((pantheon) => {
                        const pantheonIcon = pantheonIcons[pantheon];
                        return (
                          <TouchableOpacity
                            key={pantheon}
                            style={[styles.pantheonOption, selectedPantheon === pantheon && styles.pantheonOptionActive]}
                            onPress={() => {
                              setSelectedPantheon(pantheon);
                              setPantheonDropdownVisible(false);
                            }}
                          >
                            {pantheonIcon && (
                              <Image 
                                source={pantheonIcon} 
                                style={styles.pantheonOptionIcon}
                                resizeMode="contain"
                              />
                            )}
                            <Text style={[styles.pantheonOptionText, { marginLeft: pantheonIcon ? 10 : 0 }]}>{pantheon}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
          )}
          {selectedTab === 'items' && (
            <>
            <View style={styles.filterButtonContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, selectedStat && styles.filterButtonActive]}
                    onPress={() => {
                      setStatDropdownVisible(!statDropdownVisible);
                      setTierDropdownVisible(false);
                    }}
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
                        {availableStats.map((stat) => {
                          const statIcon = statIcons[stat];
                          return (
                        <TouchableOpacity
                          key={stat}
                          style={[styles.pantheonOption, selectedStat === stat && styles.pantheonOptionActive]}
                          onPress={() => {
                            setSelectedStat(stat);
                            setStatDropdownVisible(false);
                          }}
                        >
                              {statIcon && (
                                <Image 
                                  source={statIcon} 
                                  style={styles.statOptionIcon}
                                  resizeMode="contain"
                                />
                              )}
                              <Text style={[styles.pantheonOptionText, { marginLeft: statIcon ? 10 : 0 }]}>{stat}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              <TextInput
                style={styles.search}
                placeholder={searchQuery ? `Search ${selectedTab}...` : `Showing first 20 ${selectedTab}. Search to see more...`}
                placeholderTextColor="#cbd5e1"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.filterButtonContainer}>
                  <TouchableOpacity
                    style={[styles.filterButton, selectedTier && styles.filterButtonActive]}
                    onPress={() => {
                      setTierDropdownVisible(!tierDropdownVisible);
                      setStatDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.filterButtonText}>
                      {selectedTier ? selectedTier : 'Tier'}
                    </Text>
                    <Text style={styles.filterButtonIcon}>
                      {tierDropdownVisible ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {tierDropdownVisible && (
                    <View style={[styles.pantheonDropdown, styles.tierDropdown]}>
                      <ScrollView style={styles.pantheonDropdownScroll} nestedScrollEnabled={true}>
                        <TouchableOpacity
                          style={[styles.pantheonOption, !selectedTier && styles.pantheonOptionActive]}
                          onPress={() => {
                            setSelectedTier(null);
                            setTierDropdownVisible(false);
                          }}
                        >
                          <Text style={styles.pantheonOptionText}>All Tiers</Text>
                        </TouchableOpacity>
                        {['Tier 1', 'Tier 2', 'Tier 3', 'Starter', 'Active', 'Relic', 'Consumable', 'God Specific'].map((tier) => (
                          <TouchableOpacity
                            key={tier}
                            style={[styles.pantheonOption, selectedTier === tier && styles.pantheonOptionActive]}
                            onPress={() => {
                              setSelectedTier(tier);
                              setTierDropdownVisible(false);
                            }}
                          >
                            <Text style={styles.pantheonOptionText}>{tier}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </>
          )}
          {selectedTab === 'gods' && (
          <TextInput
            style={styles.search}
            placeholder={searchQuery ? `Search ${selectedTab}...` : `Showing first 20 ${selectedTab}. Search to see more...`}
            placeholderTextColor="#cbd5e1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          )}
        </View>
      </View>

      {/* Show Item Detail Page if selected, otherwise show God Detail Page or grid */}
      {selectedItem ? (() => {
        // Helper function to find item by name/internalName (robust matching)
        const findItemByName = (itemName) => {
          if (!itemName || !allItems) return null;
          const searchName = String(itemName).toLowerCase().trim();
          const searchNormalized = searchName.replace(/[^a-z0-9]/g, '');
          const searchNoSpaces = searchName.replace(/\s+/g, '');
          
          // Collect all potential matches, then prioritize exact matches
          const allMatches = [];
          
          const searchRecursive = (arr) => {
            if (!arr || !Array.isArray(arr)) return;
            for (const it of arr) {
              if (!it || typeof it !== 'object') continue;
              
              // Check if this is an item object
              if (!it.internalName && !it.name && it.active !== true) {
                // Recursively search nested arrays
                for (const key in it) {
                  if (Array.isArray(it[key])) {
                    searchRecursive(it[key]);
                  }
                }
                continue;
              }
              
              const itInternal = it.internalName ? it.internalName.toString().toLowerCase().trim() : '';
              const itName = it.name ? it.name.toString().toLowerCase().trim() : '';
              const itInternalNorm = itInternal.replace(/[^a-z0-9]/g, '');
              const itNameNorm = itName.replace(/[^a-z0-9]/g, '');
              const itInternalNoSpaces = itInternal.replace(/\s+/g, '');
              const itNameNoSpaces = itName.replace(/\s+/g, '');
              
              let matchType = null;
              
              // Exact match (highest priority)
              if (itInternal === searchName || itName === searchName) {
                matchType = 'exact';
              }
              // Normalized match (no special chars)
              else if (itInternalNorm === searchNormalized || itNameNorm === searchNormalized) {
                matchType = 'normalized';
              }
              // No spaces match (handles "KillingStone" vs "Killing Stone")
              else if (itInternalNoSpaces === searchNoSpaces || itNameNoSpaces === searchNoSpaces) {
                matchType = 'nospaces';
              }
              
              if (matchType) {
                allMatches.push({ item: it, type: matchType });
              }
              
              // Recursively search nested arrays
              for (const key in it) {
                if (Array.isArray(it[key])) {
                  searchRecursive(it[key]);
                }
              }
            }
          };
          
          searchRecursive(allItems);
          
          // Return exact match first, then normalized, then no-spaces
          const exactMatch = allMatches.find(m => m.type === 'exact');
          if (exactMatch) return exactMatch.item;
          
          const normalizedMatch = allMatches.find(m => m.type === 'normalized');
          if (normalizedMatch) return normalizedMatch.item;
          
          const noSpacesMatch = allMatches.find(m => m.type === 'nospaces');
          if (noSpacesMatch) return noSpacesMatch.item;
          
          return null;
        };

        // Get components for recipe tree
        const components = selectedItem.components || [];
        const componentItems = components.map(compName => {
          const found = findItemByName(compName);
          if (!found) {
            console.log(`Component not found: ${compName}`);
          }
          return found;
        }).filter(Boolean);
        
        // Get T1 items that T2 components build from (ONLY use buildsFromT1, not components)
        const t1ItemsMap = {};
        componentItems.forEach((compItem, idx) => {
          // Only look for T1 items if this is a T2 item with buildsFromT1
          if (compItem && compItem.buildsFromT1 && Array.isArray(compItem.buildsFromT1)) {
            t1ItemsMap[idx] = compItem.buildsFromT1.map(t1Name => {
              const found = findItemByName(t1Name);
              if (!found) {
                console.log(`T1 item not found: ${t1Name} (for ${compItem.name || compItem.internalName})`);
              }
              return found;
            }).filter(Boolean);
          }
        });
        
        // Show recipe tree if tier 2 or tier 3 and has components (even if some aren't found)
        const hasRecipe = (selectedItem.tier === 2 || selectedItem.tier === 3) && components.length > 0;
        const isTier2Recipe = selectedItem.tier === 2;
        
        return (
          <View style={styles.itemPageContainer}>
            <View style={styles.itemPageHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <View style={styles.itemPageTitleContainer}>
                <View style={[styles.modalIconContainer, { borderColor: '#1e90ff' + '60', borderWidth: 2, borderRadius: 12 }]}>
                  {selectedItem.icon ? (() => {
                    const localIcon = getLocalItemIcon(selectedItem.icon);
                    if (localIcon) {
                      return (
                        <Image 
                          source={localIcon} 
                          style={styles.modalItemIcon} 
                        />
                      );
                    }
                    return (
                      <View style={[styles.modalItemIconFallback, { backgroundColor: '#1e90ff' + '30' }]}>
                        <Text style={[styles.modalItemIconFallbackText, { color: '#1e90ff' }]}>
                          {(selectedItem.name || selectedItem.internalName || 'U').charAt(0)}
                        </Text>
                      </View>
                    );
                  })() : (
                    <View style={[styles.modalItemIconFallback, { backgroundColor: '#1e90ff' + '30' }]}>
                      <Text style={[styles.modalItemIconFallbackText, { color: '#1e90ff' }]}>
                        {(selectedItem.name || selectedItem.internalName || 'U').charAt(0)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemPageTitleWrapper}>
                  <Text style={[styles.itemPageTitle, { color: '#1e90ff' }]}>
                    {selectedItem.name || selectedItem.internalName || 'Unknown Item'}
                  </Text>
                  {selectedItem.tier && (
                    <Text style={[styles.itemPageSubtext, { color: '#94a3b8' }]}>
                      Tier {selectedItem.tier} Item
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <ScrollView style={styles.itemPageBody}>
              {/* Recipe Tree Section */}
                {hasRecipe && componentItems.length > 0 && (
                <View style={styles.recipeTreeContainer}>
                  <Text style={styles.recipeTreeTitle}>Recipe</Text>
                  {componentItems.length < components.length && (
                    <Text style={styles.recipeTreeWarning}>
                      Note: {components.length - componentItems.length} component(s) not found in database
                    </Text>
                  )}
                  <View style={styles.recipeTree}>
                    {/* Tier 2/3 Item - Top with glow */}
                    <View style={styles.recipeTier3Item}>
                      <View style={[styles.recipeTier3Glow, isTier2Recipe && {
                        borderColor: '#22c55e',
                        shadowColor: '#22c55e'
                      }]}>
                        {selectedItem.icon ? (() => {
                          const localIcon = getLocalItemIcon(selectedItem.icon);
                          if (localIcon) {
                            return (
                              <Image 
                                source={localIcon} 
                                style={styles.recipeTier3Icon} 
                              />
                            );
                          }
                          return (
                            <View style={styles.recipeTier3IconFallback}>
                              <Text style={[styles.recipeTier3IconFallbackText, isTier2Recipe && { color: '#22c55e' }]}>
                                {(selectedItem.name || selectedItem.internalName || 'U').charAt(0)}
                              </Text>
                            </View>
                          );
                        })() : (
                          <View style={styles.recipeTier3IconFallback}>
                            <Text style={[styles.recipeTier3IconFallbackText, isTier2Recipe && { color: '#22c55e' }]}>
                              {(selectedItem.name || selectedItem.internalName || 'U').charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {/* Arrows pointing down to Tier 2 (for T3) or Tier 1 (for T2) */}
                    {isTier2Recipe ? (
                      // Tier 2 recipe: Show arrows to Tier 1 components
                      <View style={styles.recipeT1ArrowContainer}>
                        {componentItems.map((_, idx) => (
                          <Text key={idx} style={styles.recipeT1Arrow}>↓</Text>
                        ))}
                      </View>
                    ) : (
                      // Tier 3 recipe: Show arrows to Tier 2 components
                      <View style={styles.recipeT2ArrowContainer}>
                        {componentItems.map((_, idx) => (
                          <Text key={idx} style={styles.recipeT2Arrow}>↓</Text>
                        ))}
                      </View>
                    )}
                    {/* For Tier 2: Show Tier 1 components directly. For Tier 3: Show Tier 2 components */}
                    {isTier2Recipe ? (
                      // Tier 2 recipe: Display Tier 1 components
                      <View style={styles.recipeT1Container}>
                        {componentItems.map((compItem, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.recipeT1Item}
                            onPress={() => setSelectedItem(compItem)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.recipeT1Glow, {
                              shadowColor: '#3b82f6',
                              borderColor: '#3b82f6' + '80'
                            }]}>
                              {compItem.icon ? (() => {
                                const localIcon = getLocalItemIcon(compItem.icon);
                                if (localIcon) {
                                  return (
                                    <Image 
                                      source={localIcon} 
                                      style={styles.recipeT1Icon} 
                                    />
                                  );
                                }
                                return (
                                  <View style={styles.recipeT1IconFallback}>
                                    <Text style={styles.recipeT1IconFallbackText}>
                                      {(compItem.name || compItem.internalName || 'U').charAt(0)}
                                    </Text>
                                  </View>
                                );
                              })() : (
                                <View style={styles.recipeT1IconFallback}>
                                  <Text style={styles.recipeT1IconFallbackText}>
                                    {(compItem.name || compItem.internalName || 'U').charAt(0)}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.recipeT1Name} numberOfLines={1}>
                              {compItem.name || compItem.internalName || 'Unknown'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      // Tier 3 recipe: Show Tier 2 components (existing logic)
                      <View style={styles.recipeComponentsContainer}>
                        {componentItems.map((compItem, idx) => {
                          const t1Items = t1ItemsMap[idx] || [];
                          const hasT1Items = t1Items.length > 0;
                          return (
                            <View key={idx} style={styles.recipeTier2Wrapper}>
                              <TouchableOpacity
                                style={styles.recipeComponentItem}
                                onPress={() => setSelectedItem(compItem)}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.recipeComponentGlow, { 
                                  shadowColor: idx === 0 ? '#f97316' : '#22c55e',
                                  borderColor: idx === 0 ? '#f97316' + '80' : '#22c55e' + '80'
                                }]}>
                                  {compItem.icon ? (() => {
                                    const localIcon = getLocalItemIcon(compItem.icon);
                                    if (localIcon) {
                                      return (
                                        <Image 
                                          source={localIcon} 
                                          style={styles.recipeComponentIcon} 
                                        />
                                      );
                                    }
                                    return (
                                      <View style={styles.recipeComponentIconFallback}>
                                        <Text style={styles.recipeComponentIconFallbackText}>
                                          {(compItem.name || compItem.internalName || 'U').charAt(0)}
                                        </Text>
                                      </View>
                                    );
                                  })() : (
                                    <View style={styles.recipeComponentIconFallback}>
                                      <Text style={styles.recipeComponentIconFallbackText}>
                                        {(compItem.name || compItem.internalName || 'U').charAt(0)}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.recipeComponentName} numberOfLines={2}>
                                  {compItem.name || compItem.internalName || 'Unknown'}
                                </Text>
                              </TouchableOpacity>
                              {/* T1 items below T2 */}
                              {hasT1Items && (
                                <>
                                  <View style={styles.recipeT1ArrowContainer}>
                                    {t1Items.map((_, t1Idx) => (
                                      <Text key={t1Idx} style={styles.recipeT1Arrow}>↓</Text>
                                    ))}
                                  </View>
                                  <View style={styles.recipeT1Container}>
                                    {t1Items.map((t1Item, t1Idx) => (
                                      <TouchableOpacity
                                        key={t1Idx}
                                        style={styles.recipeT1Item}
                                        onPress={() => setSelectedItem(t1Item)}
                                        activeOpacity={0.7}
                                      >
                                        <View style={[styles.recipeT1Glow, {
                                          shadowColor: '#3b82f6',
                                          borderColor: '#3b82f6' + '80'
                                        }]}>
                                          {t1Item.icon ? (() => {
                                            const localIcon = getLocalItemIcon(t1Item.icon);
                                            if (localIcon) {
                                              return (
                                                <Image 
                                                  source={localIcon} 
                                                  style={styles.recipeT1Icon} 
                                                />
                                              );
                                            }
                                            return (
                                              <View style={styles.recipeT1IconFallback}>
                                                <Text style={styles.recipeT1IconFallbackText}>
                                                  {(t1Item.name || t1Item.internalName || 'U').charAt(0)}
                                                </Text>
                                              </View>
                                            );
                                          })() : (
                                            <View style={styles.recipeT1IconFallback}>
                                              <Text style={styles.recipeT1IconFallbackText}>
                                                {(t1Item.name || t1Item.internalName || 'U').charAt(0)}
                                              </Text>
                                            </View>
                                          )}
                                        </View>
                                        <Text style={styles.recipeT1Name} numberOfLines={1}>
                                          {t1Item.name || t1Item.internalName || 'Unknown'}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Item Info Sections */}
              {selectedItem.totalCost && (
                <View style={styles.itemInfoSection}>
                  <Text style={styles.itemInfoLabel}>Cost:</Text>
                  <Text style={[styles.itemInfoValue, { color: '#fbbf24', fontWeight: '700' }]}>
                    {selectedItem.totalCost} Gold
                  </Text>
                </View>
              )}
              {selectedItem.stepCost && !selectedItem.totalCost && (
                <View style={styles.itemInfoSection}>
                  <Text style={styles.itemInfoLabel}>Cost:</Text>
                  <Text style={[styles.itemInfoValue, { color: '#fbbf24', fontWeight: '700' }]}>
                    {selectedItem.stepCost} Gold
                  </Text>
                </View>
              )}
              {selectedItem.active && (
                <View style={styles.itemInfoSection}>
                  <Text style={styles.itemInfoLabel}>Type:</Text>
                  <Text style={styles.itemInfoValue}>Active/Consumable</Text>
                </View>
              )}
              {selectedItem.stats && (
                <View style={styles.itemInfoSection}>
                  <Text style={styles.itemInfoSectionTitle}>Stats</Text>
                  {Object.keys(selectedItem.stats).map((statKey) => {
                    const statValue = selectedItem.stats[statKey];
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
                      <View key={statKey} style={styles.itemStatRow}>
                        <Text style={[styles.itemStatLabel, { color: statColor }]}>{statKey}:</Text>
                        <Text style={styles.itemStatValue}>{statValue}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {selectedItem.passive && (
                <View style={styles.itemInfoSection}>
                  <Text style={styles.itemInfoSectionTitle}>Passive</Text>
                  <Text style={styles.itemInfoText}>{selectedItem.passive}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        );
      })() : selectedGod ? (() => {
        // Get unique styling based on pantheon
        const pantheon = selectedGod.pantheon || 'Unknown';
        const godType = selectedGod.Type || '';
        
        // Get builds for this god and extract unique roles
        const godBuilds = selectedGod.builds || [];
        const roleSet = new Set();
        
        // First, add roles from the god's own roles property
        const godRoles = selectedGod.roles || selectedGod.role || [];
        const godRolesArray = Array.isArray(godRoles) ? godRoles : [godRoles];
        godRolesArray.forEach((role) => {
          if (!role) return;
          const roleStr = String(role).trim();
          if (roleStr) {
            // Normalize role names (Middle -> Mid)
            const normalized = roleStr.toLowerCase();
            if (normalized.includes('adc') || normalized.includes('carry')) {
              roleSet.add('ADC');
            } else if (normalized.includes('solo')) {
              roleSet.add('Solo');
            } else if (normalized.includes('support')) {
              roleSet.add('Support');
            } else if (normalized.includes('mid') || normalized.includes('middle')) {
              roleSet.add('Mid');
            } else if (normalized.includes('jungle')) {
              roleSet.add('Jungle');
            } else {
              // If it doesn't match any pattern, add as-is (capitalize first letter)
              roleSet.add(roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase());
            }
          }
        });
        
        // Then, extract roles from builds
        if (Array.isArray(godBuilds)) {
          godBuilds.forEach((build) => {
            if (!build) return;
            // Check build.role, build.lane, and build.notes for role information
            const buildText = [
              build.role,
              build.lane,
              build.notes,
              build.title,
              build.name
            ].filter(Boolean).join(' ').toLowerCase();
            
            // Extract roles from build text
            const rolePatterns = {
              'ADC': /\b(adc|carry)\b/i,
              'Solo': /\b(solo|solo lane)\b/i,
              'Support': /\b(support)\b/i,
              'Mid': /\b(mid|middle)\b/i,
              'Jungle': /\b(jungle)\b/i,
            };
            
            Object.keys(rolePatterns).forEach((role) => {
              if (rolePatterns[role].test(buildText)) {
                roleSet.add(role);
              }
            });
            
            // Also check if build has a direct role property
            if (build.role) {
              const roleStr = String(build.role).trim();
              if (roleStr) {
                // Normalize role names
                const normalized = roleStr.toLowerCase();
                if (normalized.includes('adc') || normalized.includes('carry')) {
                  roleSet.add('ADC');
                } else if (normalized.includes('solo')) {
                  roleSet.add('Solo');
                } else if (normalized.includes('support')) {
                  roleSet.add('Support');
                } else if (normalized.includes('mid') || normalized.includes('middle')) {
                  roleSet.add('Mid');
                } else if (normalized.includes('jungle')) {
                  roleSet.add('Jungle');
                }
              }
            }
          });
        }
        // Sort roles: prioritize standard order (ADC, Solo, Support, Mid, Jungle), then others
        const roleOrder = ['ADC', 'Solo', 'Support', 'Mid', 'Jungle'];
        const possibleRoles = Array.from(roleSet).sort((a, b) => {
          const aIndex = roleOrder.indexOf(a);
          const bIndex = roleOrder.indexOf(b);
          // If both are in the standard order, sort by that order
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only one is in standard order, prioritize it
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          // Otherwise, alphabetical
          return a.localeCompare(b);
        });
        
        const pantheonColors = {
          'Greek': { primary: '#4a90e2', secondary: '#357abd', accent: '#5ba3f5' },
          'Roman': { primary: '#d4af37', secondary: '#b8941f', accent: '#f0c850' },
          'Egyptian': { primary: '#e67e22', secondary: '#d35400', accent: '#f39c12' },
          'Norse': { primary: '#8b4513', secondary: '#654321', accent: '#a0522d' },
          'Chinese': { primary: '#e74c3c', secondary: '#c0392b', accent: '#ec7063' },
          'Korean': { primary: '#e74c3c', secondary: '#c0392b', accent: '#ec7063' },
          'Hindu': { primary: '#9b59b6', secondary: '#8e44ad', accent: '#bb8fce' },
          'Mayan': { primary: '#16a085', secondary: '#138d75', accent: '#1abc9c' },
          'Celtic': { primary: '#27ae60', secondary: '#229954', accent: '#2ecc71' },
          'Japanese': { primary: '#c0392b', secondary: '#a93226', accent: '#e74c3c' },
          'Voodoo': { primary: '#8e44ad', secondary: '#7d3c98', accent: '#a569bd' },
          'Slavic': { primary: '#34495e', secondary: '#2c3e50', accent: '#5d6d7e' },
          'Yoruba': { primary: '#f39c12', secondary: '#e67e22', accent: '#f5b041' },
          'Polynesian': { primary: '#1abc9c', secondary: '#16a085', accent: '#48c9b0' },
          'Babalonian': { primary: '#d68910', secondary: '#b9770e', accent: '#f4d03f' },
          'Arthurian': { primary: '#5dade2', secondary: '#3498db', accent: '#85c1e9' },
          'Great Old Ones': { primary: '#5f27cd', secondary: '#4834d4', accent: '#706fd3' },
          'Unknown': { primary: '#7f8c8d', secondary: '#5d6d7e', accent: '#95a5a6' },
        };
        
        const pantheonIcon = pantheonIcons[pantheon] || null;
        const colors = pantheonColors[pantheon] || pantheonColors['Unknown'];
        
        return (
          <View style={[styles.godPageContainer, { backgroundColor: colors.secondary + '15' }]}>
            <View style={[styles.godPageHeader, { backgroundColor: colors.primary + '20', borderBottomColor: colors.accent + '40' }]}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  // Only go back to builds if we came from builds page
                  if (cameFromBuilds && onBackToBuilds) {
                    onBackToBuilds();
                  } else {
                    // Otherwise, just clear the selected god and stay on data page
                    setSelectedGod(null);
                    setSkinsExpanded(false);
                    setSelectedSkin(null);
                    setLoreExpanded(false);
                    setAbilitiesExpanded(false);
                    setAspectExpanded(false);
                    setPassiveExpanded(false);
                    setSelectedAbility(null);
                    setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
                  }
                }}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <View style={styles.godPageTitleContainer}>
                <View style={[styles.modalIconContainer, { borderColor: colors.accent + '60', borderWidth: 2, borderRadius: 12 }]}>
                  {(() => {
                    const godIcon = selectedGod.icon || selectedGod.GodIcon || (selectedGod.abilities && selectedGod.abilities.A01 && selectedGod.abilities.A01.icon);
                    const localIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                    if (localIcon) {
                      return (
                      <Image 
                          source={localIcon} 
                        style={styles.modalGodIcon} 
                      />
                      );
                    }
                    // No remote fallback here: if there's no local asset configured yet,
                    // show the letter fallback instead of loading from smitecalculator.
                    return (
                      <View style={[styles.modalGodIconFallback, { backgroundColor: colors.primary + '30' }]}>
                        <Text style={[styles.modalGodIconFallbackText, { color: colors.accent }]}>
                          {(selectedGod.name || selectedGod.GodName || selectedGod.title || 'U').charAt(0)}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <View style={styles.godPageTitleWrapper}>
                  <Text style={[styles.godPageTitle, { color: colors.accent }]}>
                    {selectedGod.name || selectedGod.GodName || selectedGod.title || 'Unknown God'}
                  </Text>
                  {selectedGod.subText && (
                    <Text style={[styles.godPageSubtext, { color: colors.accent + 'CC' }]}>
                      {selectedGod.subText}
                    </Text>
                  )}
                  {(pantheon || godType) && (
                    <View style={styles.godPageMetaInfo}>
                  {pantheon && (
                        <>
                      {pantheonIcon && (
                        <Image 
                          source={pantheonIcon} 
                              style={styles.godPageMetaIcon}
                          resizeMode="contain"
                        />
                      )}
                          <Text style={[styles.godPageMetaText, { color: colors.accent + 'AA' }]}>
                            {pantheon}
                          </Text>
                        </>
                      )}
                      {pantheon && godType && (
                        <Text style={[styles.godPageMetaText, { color: colors.accent + 'AA' }]}> • </Text>
                  )}
                  {godType && (
                        <Text style={[styles.godPageMetaText, { color: colors.accent + 'AA' }]}>
                          {godType}
                        </Text>
                      )}
                    </View>
                  )}
                  {possibleRoles.length > 0 && (
                    <View style={styles.godPageRolesContainer}>
                      <Text style={[styles.godPageRolesLabel, { color: colors.accent + 'AA' }]}>
                        Possible Roles:
                      </Text>
                      <View style={styles.godPageRolesList}>
                        {possibleRoles.map((role, idx) => (
                          <React.Fragment key={role}>
                            <Text style={[styles.godPageRoleText, { color: colors.accent + 'AA' }]}>
                              {role}
                            </Text>
                            {idx < possibleRoles.length - 1 && (
                              <Text style={[styles.godPageRoleText, { color: colors.accent + 'AA' }]}> • </Text>
                            )}
                          </React.Fragment>
                        ))}
                </View>
              </View>
                  )}
                </View>
                </View>
            </View>
          <ScrollView style={styles.godPageBody}>
            {/* Skins Section */}
            {selectedGod.skins && typeof selectedGod.skins === 'object' && Object.keys(selectedGod.skins).length > 0 && (
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.skinsHeader}
                  onPress={() => {
                    setSkinsExpanded(!skinsExpanded);
                    if (skinsExpanded) {
                      setSelectedSkin(null);
                    }
                  }}
                >
                  <Text style={styles.modalSectionTitle}>Skins</Text>
                  <Text style={styles.skinsToggleText}>
                    {skinsExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {skinsExpanded && (
                  <View style={styles.skinsContainer}>
                    {Object.keys(selectedGod.skins).map((skinKey) => {
                      const skin = selectedGod.skins[skinKey];
                      const skinName = skin.name || skinKey;
                      return (
                        <TouchableOpacity
                          key={skinKey}
                          style={[
                            styles.skinButton,
                            selectedSkin === skinKey && styles.skinButtonActive
                          ]}
                          onPress={() => setSelectedSkin(selectedSkin === skinKey ? null : skinKey)}
                        >
                          <Text style={styles.skinButtonText}>{skinName}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {skinsExpanded && selectedSkin && selectedGod.skins[selectedSkin] && (
                  <View style={styles.selectedSkinContainer}>
                    <Text style={styles.selectedSkinName}>
                      {selectedGod.skins[selectedSkin].name || selectedSkin}
                    </Text>
                    {selectedGod.skins[selectedSkin].skin && (() => {
                      const skinPath = selectedGod.skins[selectedSkin].skin;
                      const localIcon = getLocalGodAsset(skinPath);
                      if (localIcon) {
                        return (
                      <Image
                            source={localIcon}
                        style={styles.selectedSkinImage}
                        resizeMode="contain"
                      />
                        );
                      }
                      return (
                        <Image
                          source={{ uri: `https://www.smitecalculator.pro${skinPath}` }}
                          style={styles.selectedSkinImage}
                          resizeMode="contain"
                        />
                      );
                    })()}
                    {selectedGod.skins[selectedSkin].type && (
                      <Text style={styles.selectedSkinType}>
                        Type: {selectedGod.skins[selectedSkin].type}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
            {selectedGod.loreShort && (
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.skinsHeader}
                  onPress={() => setLoreExpanded(!loreExpanded)}
                >
                  <Text style={styles.modalSectionTitle}>Lore</Text>
                  <Text style={styles.skinsToggleText}>
                    {loreExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {loreExpanded && (
                  <Text style={styles.modalText}>{selectedGod.loreShort}</Text>
                )}
              </View>
            )}
            {selectedGod.abilities && (
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.skinsHeader}
                  onPress={() => setAbilitiesExpanded(!abilitiesExpanded)}
                >
                  <Text style={styles.modalSectionTitle}>Abilities</Text>
                  <Text style={styles.skinsToggleText}>
                    {abilitiesExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {abilitiesExpanded && (
                  <View style={styles.abilityIconsRow} pointerEvents="box-none">
                    {Object.keys(selectedGod.abilities).map((key) => {
                      const ability = selectedGod.abilities[key];
                      const abilityIconPath = ability && ability.icon ? ability.icon : null;
                      const abilityName = ability.name || ability.key || key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.abilityIconButton}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (ability && typeof ability === 'object') {
                              setTimeout(() => {
                                setSelectedAbility({ abilityKey: key, ability: ability, abilityName });
                                setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
                              }, 50);
                            }
                          }}
                        >
                          {abilityIconPath ? (() => {
                            const localIcon = getLocalGodAsset(abilityIconPath);
                            if (localIcon) {
                              return <Image source={localIcon} style={styles.abilityIconCompact} />;
                            }
                            return (
                              <View style={styles.abilityIconFallbackCompact}>
                                <Text style={styles.abilityIconFallbackTextCompact}>{abilityName.charAt(0)}</Text>
                              </View>
                            );
                          })() : (
                            <View style={styles.abilityIconFallbackCompact}>
                              <Text style={styles.abilityIconFallbackTextCompact}>{abilityName.charAt(0)}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            {selectedGod.aspect && (
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.skinsHeader}
                  onPress={() => setAspectExpanded(!aspectExpanded)}
                >
                  <Text style={styles.modalSectionTitle}>Aspect</Text>
                  <Text style={styles.skinsToggleText}>
                    {aspectExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {aspectExpanded && (
                  <View style={styles.aspectContainer}>
                    <View style={styles.aspectRow}>
                      {selectedGod.aspect.icon ? (() => {
                        const iconPath = selectedGod.aspect.icon;
                        const localIcon = getLocalGodAsset(iconPath);
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
                          {selectedGod.aspect.name ? selectedGod.aspect.name.replace(/\*\*__|__\*\*/g, '') : 'Aspect'}
                        </Text>
                        {selectedGod.aspect.description && (
                          <Text style={styles.modalText}>{selectedGod.aspect.description}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
            {selectedGod.passive && (
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.skinsHeader}
                  onPress={() => setPassiveExpanded(!passiveExpanded)}
                >
                  <Text style={styles.modalSectionTitle}>Passive</Text>
                  <Text style={styles.skinsToggleText}>
                    {passiveExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {passiveExpanded && selectedGod.passive && (
                  <View style={styles.passiveContainer}>
                    {selectedGod.passive.icon && (() => {
                      const iconPath = selectedGod.passive.icon;
                      const localIcon = getLocalGodAsset(iconPath);
                      if (localIcon) {
                        return (
                          <View style={styles.passiveIconContainer}>
                            <Image 
                              source={localIcon} 
                              style={styles.passiveIcon}
                              resizeMode="cover"
                            />
                          </View>
                        );
                      }
                      return (
                        <View style={styles.passiveIconContainer}>
                          <View style={styles.passiveIconFallback}>
                            <Text style={styles.passiveIconFallbackText}>P</Text>
                          </View>
                        </View>
                      );
                    })()}
                    {selectedGod.passive.name && (
                      <Text style={styles.passiveName}>
                        {selectedGod.passive.name}
                      </Text>
                    )}
                    {selectedGod.passive.shortDesc && (
                      <Text style={styles.modalText}>{String(selectedGod.passive.shortDesc)}</Text>
                    )}
                    {selectedGod.passive.shortDescAspect && (
                      <Text style={[styles.modalText, { marginTop: 8, fontStyle: 'italic' }]}>
                        {String(selectedGod.passive.shortDescAspect)}
                      </Text>
                    )}
                    {/* Vulcan Mods Display */}
                    {selectedGod.passive && selectedGod.passive.valueKeys && typeof selectedGod.passive.valueKeys === 'object' && 
                     Object.keys(selectedGod.passive.valueKeys).some(key => key && key.includes('Mod')) && (
                      <View style={styles.vulcanModsContainer}>
                        <Text style={styles.vulcanModsTitle}>Mods</Text>
                        {/* Set One Mods */}
                        {Object.keys(selectedGod.passive.valueKeys || {}).filter(key => key && key.includes('Set One')).map((modKey) => {
                          try {
                            const modValue = selectedGod.passive.valueKeys[modKey];
                            const modIcon = vulcanModIcons[modKey];
                            return (
                              <View key={modKey} style={styles.vulcanModItem}>
                                {modIcon && (
                                  <Image 
                                    source={modIcon} 
                                    style={styles.vulcanModIcon}
                                    resizeMode="contain"
                                    onError={() => {}}
                                  />
                                )}
                                <View style={styles.vulcanModInfo}>
                                  <Text style={styles.vulcanModName}>{modKey || 'Unknown Mod'}</Text>
                                  {Array.isArray(modValue) && modValue[0] && typeof modValue[0] === 'string' && (
                                    <Text style={styles.modalText}>{modValue[0].trim()}</Text>
                                  )}
                                  {Array.isArray(modValue) && modValue[0] && typeof modValue[0] !== 'string' && (
                                    <Text style={styles.modalText}>{String(modValue[0])}</Text>
                                  )}
                                </View>
                              </View>
                            );
                          } catch (error) {
                            console.log('Error rendering mod:', modKey, error);
                            return null;
                          }
                        })}
                        {/* Set Two Mods */}
                        {Object.keys(selectedGod.passive.valueKeys || {}).filter(key => key && key.includes('Set Two')).map((modKey) => {
                          try {
                            const modValue = selectedGod.passive.valueKeys[modKey];
                            const modIcon = vulcanModIcons[modKey];
                            return (
                              <View key={modKey} style={styles.vulcanModItem}>
                                {modIcon && (
                                  <Image 
                                    source={modIcon} 
                                    style={styles.vulcanModIcon}
                                    resizeMode="contain"
                                    onError={() => {}}
                                  />
                                )}
                                <View style={styles.vulcanModInfo}>
                                  <Text style={styles.vulcanModName}>{modKey || 'Unknown Mod'}</Text>
                                  {Array.isArray(modValue) && modValue[0] && typeof modValue[0] === 'string' && (
                                    <Text style={styles.modalText}>{modValue[0].trim()}</Text>
                                  )}
                                  {Array.isArray(modValue) && modValue[0] && typeof modValue[0] !== 'string' && (
                                    <Text style={styles.modalText}>{String(modValue[0])}</Text>
                                  )}
                                </View>
                              </View>
                            );
                          } catch (error) {
                            console.log('Error rendering mod:', modKey, error);
                            return null;
                          }
                        })}
                        {/* Set Three Mods */}
                        {Object.keys(selectedGod.passive.valueKeys || {}).filter(key => key && key.includes('Set Three')).map((modKey) => {
                          try {
                            const modValue = selectedGod.passive.valueKeys[modKey];
                            const modIcon = vulcanModIcons[modKey];
                            return (
                              <View key={modKey} style={styles.vulcanModItem}>
                                {modIcon && (
                                  <Image 
                                    source={modIcon} 
                                    style={styles.vulcanModIcon}
                                    resizeMode="contain"
                                    onError={() => {}}
                                  />
                                )}
                                <View style={styles.vulcanModInfo}>
                                  <Text style={styles.vulcanModName}>{modKey || 'Unknown Mod'}</Text>
                                  {Array.isArray(modValue) && modValue[0] && typeof modValue[0] === 'string' && (
                                    <Text style={styles.modalText}>{modValue[0].trim()}</Text>
                                  )}
                                  {Array.isArray(modValue) && modValue[0] && typeof modValue[0] !== 'string' && (
                                    <Text style={styles.modalText}>{String(modValue[0])}</Text>
                                  )}
                                </View>
                              </View>
                            );
                          } catch (error) {
                            console.log('Error rendering mod:', modKey, error);
                            return null;
                          }
                        })}
                      </View>
                    )}
                    {/* Other valueKeys (non-mods) */}
                    {selectedGod.passive && selectedGod.passive.valueKeys && typeof selectedGod.passive.valueKeys === 'object' && 
                     Object.keys(selectedGod.passive.valueKeys).filter(key => key && !key.includes('Mod')).length > 0 && (
                      <View style={styles.passiveStatsContainer}>
                        {Object.keys(selectedGod.passive.valueKeys).filter(key => key && !key.includes('Mod')).map((statKey) => {
                          try {
                            const statValue = selectedGod.passive.valueKeys[statKey];
                            if (!statValue || (Array.isArray(statValue) && statValue.length === 0)) return null;
                            return (
                              <View key={statKey} style={styles.passiveStatRow}>
                                <Text style={styles.passiveStatLabel}>{String(statKey)}:</Text>
                                <Text style={styles.passiveStatValue}>
                                  {Array.isArray(statValue) ? statValue.join(', ') : String(statValue)}
                                </Text>
                              </View>
                            );
                          } catch (error) {
                            console.log('Error rendering stat:', statKey, error);
                            return null;
                          }
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Ability Detail Page - appears as overlay when ability is selected */}
          {selectedAbility && selectedAbility.ability && (
            <View style={styles.abilityPageOverlay}>
              <View style={styles.abilityPageContainer}>
                <View style={styles.abilityPageHeader}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => {
                      setSelectedAbility(null);
                      setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
                    }}
                  >
                    <Text style={styles.backButtonText}>← Back</Text>
                  </TouchableOpacity>
                  <View style={styles.abilityPageTitleContainer}>
                    <View style={styles.abilityTooltipIconContainer}>
                      {selectedAbility.ability.icon ? (() => {
                        const iconPath = selectedAbility.ability.icon;
                        const localIcon = getLocalGodAsset(iconPath);
                        if (localIcon) {
                          return (
                        <Image 
                              source={localIcon} 
                          style={styles.abilityTooltipIcon}
                            />
                          );
                        }
                        return (
                          <View style={styles.abilityTooltipIconFallback}>
                            <Text style={styles.abilityTooltipIconFallbackText}>
                              {(selectedAbility.abilityName || 'A').charAt(0)}
                            </Text>
                          </View>
                        );
                      })() : (
                        <View style={styles.abilityTooltipIconFallback}>
                          <Text style={styles.abilityTooltipIconFallbackText}>
                            {(selectedAbility.abilityName || 'A').charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.abilityPageTitle}>{selectedAbility.abilityName || 'Ability'}</Text>
                  </View>
                </View>
                <ScrollView style={styles.abilityPageBody}>
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
              </View>
            </View>
          )}
        </View>
        );
      })() : selectedGameMode && selectedTab === 'gamemodes' ? (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
        >
          <View style={styles.detailContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedGameMode(null)}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedGameMode.name}</Text>
              {selectedGameMode.quote && (
                <Text style={styles.detailQuote}>{selectedGameMode.quote}</Text>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Overview</Text>
              <View style={styles.detailInfoRow}>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Players</Text>
                  <Text style={styles.detailInfoValue}>{selectedGameMode.players}</Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Map</Text>
                  <Text style={styles.detailInfoValue}>{selectedGameMode.map}</Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Objective</Text>
                  <Text style={styles.detailInfoValue}>{selectedGameMode.objective}</Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Average Length</Text>
                  <Text style={styles.detailInfoValue}>{selectedGameMode.averageLength}</Text>
                </View>
              </View>
              <Text style={styles.detailDescription}>{selectedGameMode.description}</Text>
              {selectedGameMode.fullDescription && (
                <Text style={styles.detailDescription}>{selectedGameMode.fullDescription}</Text>
              )}
            </View>

            {/* Conquest-specific content */}
            {selectedGameMode.id === 'conquest' && (
              <>
                
                <View style={styles.detailSection}>
                  <TouchableOpacity
                    style={styles.detailSectionHeader}
                    onPress={() => setConquestSectionsExpanded({
                      ...conquestSectionsExpanded,
                      threeLanes: !conquestSectionsExpanded.threeLanes
                    })}
                  >
                    <Text style={styles.detailSectionTitle}>The Three Lanes</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.threeLanes ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.threeLanes && (
                    <>
                      <Text style={styles.detailBodyText}>
                        Each lane presents a direct path to the enemy base and has a designated role.
                      </Text>
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Duo Lane</Text>
                        <Text style={styles.detailBodyText}>
                          The longer of the side lanes, located next to the Gold Fury. Traditionally home to the team's ADC/Carry and Support.
                        </Text>
                      </View>
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Mid Lane</Text>
                        <Text style={styles.detailBodyText}>
                          The shortest path between bases, offering quick access to the entire map. The domain of the team's Mid player.
                        </Text>
                      </View>
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Solo Lane</Text>
                        <Text style={styles.detailBodyText}>
                          The shorter side lane, located near the Fire Giant. A proving ground for the team's Solo player or other self-sufficient gods.
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <TouchableOpacity
                    style={styles.detailSectionHeader}
                    onPress={() => setConquestSectionsExpanded({
                      ...conquestSectionsExpanded,
                      jungle: !conquestSectionsExpanded.jungle
                    })}
                  >
                    <Text style={styles.detailSectionTitle}>The Jungle</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.jungle ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.jungle && (
                    <Text style={styles.detailBodyText}>
                      The vast wilderness between the lanes. The Jungle is filled with neutral monster camps that provide Gold, Experience, and unique buffs. The team's Jungler roams this territory, ambushing enemies and securing objectives. Defeating specific jungle camps (Red Buff, Yellow Buff, etc) will level up that specific type of jungle camp. By defeating them on either side of the jungle, you increase the power of your own jungle camps.
                    </Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <TouchableOpacity
                    style={styles.detailSectionHeader}
                    onPress={() => setConquestSectionsExpanded({
                      ...conquestSectionsExpanded,
                      objectives: !conquestSectionsExpanded.objectives
                    })}
                  >
                    <Text style={styles.detailSectionTitle}>Objectives</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.objectives ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.objectives && (
                    <>
                  
                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Structures: The Path to Destruction</Text>
                    <Text style={styles.detailBodyText}>
                      These are the primary fortifications you must overcome to reach the enemy Titan.
                    </Text>
                    <View style={styles.detailList}>
                      <View style={styles.detailListItem}>
                        <Image source={towerIcons['Tower']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={styles.detailListBold}>Towers:</Text> Each lane is protected by two formidable towers that provide vision and attack the player if they are in range.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={phoenixIcons['Phoenix']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={styles.detailListBold}>Phoenixes:</Text> The final bastion of defense in each lane. Destroying a Phoenix supercharges your lane's minions into a fiery onslaught and is required before the Titan can be harmed.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={titanIcons['Titan']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={styles.detailListBold}>The Titan:</Text> The heart of the base. A powerful boss in its own right, it will defend itself fiercely. The first team to destroy the enemy Titan claims victory.</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Jungle Buffs: Gain the advantage</Text>
                    <View style={styles.detailList}>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Caustic']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Caustic'] }]}>Red Buff (Caustic):</Text>Attacks and abilities apply poison that deals 2.5% of Max Health over 3 seconds.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Primal']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Primal'] }]}>Blue Buff (Primal):</Text> Gain +5 Mana Regeneration.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Inspiration']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Inspiration'] }]}>Purple Buff (Inspiration):</Text> Gain +4 Strength and Intelligence, once per ability hit or basic attack hit. Max 5 stacks.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Pathfinder']} style={styles.detailListItemIcon} />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Pathfinder'] }]}>Yellow Buff (Pathfinder):</Text>Gain +10% Movement Speed. Recover 10% of the monster's health as healing and restore 25 mana.</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Jungle Bosses: Turning the Tides</Text>
                    <Text style={styles.detailBodyText}>
                      Controlling these epic monsters can swing the momentum of the entire game. These Jungle Bosses are Gold Fury, Ancient Fury and Fire Giant.
                    </Text>
                    <View style={styles.detailTable}>
                      <View style={styles.detailTableRow}>
                        <Text style={[styles.detailTableHeader, { flex: 1 }]}>Objective</Text>
                        <Text style={[styles.detailTableHeader, { flex: 1 }]}>Location</Text>
                        <Text style={[styles.detailTableHeader, { flex: 2 }]}>Reward</Text>
                      </View>
                      <View style={styles.detailTableRow}>
                        <Text style={[styles.detailTableCell, { flex: 1 }]}>Gold Fury</Text>
                        <Text style={[styles.detailTableCell, { flex: 1 }]}>Duo Lane side</Text>
                        <Text style={[styles.detailTableCell, { flex: 2 }]}>Grants a large sum of Gold to the entire team. First Defeat: Speed boost out of fountain is permanently doubled. Second Defeat: Nearby friendly minions take reduced damage and deal more damage. Third Defeat: Deal +25% bonus true damage to Structures and Gain +50 Protections when near an enemy Structure. After three defeats, it is replaced by the Ancient Fury.</Text>
                      </View>
                      <View style={styles.detailTableRow}>
                        <Text style={[styles.detailTableCell, { flex: 1 }]}>Ancient Fury</Text>
                        <Text style={[styles.detailTableCell, { flex: 1 }]}>Duo Lane side</Text>
                        <Text style={[styles.detailTableCell, { flex: 2 }]}>Temporarily disables the enemy's Towers and Phoenixes, opening a window for a major assault.</Text>
                      </View>
                      <View style={styles.detailTableRow}>
                        <Text style={[styles.detailTableCell, { flex: 1 }]}>Fire Giant</Text>
                        <Text style={[styles.detailTableCell, { flex: 1 }]}>Solo Lane side</Text>
                        <Text style={[styles.detailTableCell, { flex: 2 }]}>Grants the "Might of the Fire Giant" buff to the entire team, massively increasing damage and protections, and improving structure damage. The key to ending the game.</Text>
                      </View>
                    </View>
                  </View>
                    </>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <TouchableOpacity
                    style={styles.detailSectionHeader}
                    onPress={() => setConquestSectionsExpanded({
                      ...conquestSectionsExpanded,
                      phases: !conquestSectionsExpanded.phases
                    })}
                  >
                    <Text style={styles.detailSectionTitle}>The Flow of Battle: Phases of the Game</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.phases ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.phases && (
                    <>
                      <Text style={styles.detailBodyText}>
                        A game of Conquest evolves over time, with team priorities shifting as gods become more powerful.
                      </Text>
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Early Game (Laning Phase)</Text>
                        <Text style={styles.detailBodyText}>
                          Focus on farming minions in your lane for Gold and XP. Be wary of ganks from the enemy Jungler and look for opportunities to get an early kill.
                        </Text>
                      </View>
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Mid Game (Objective Focus)</Text>
                        <Text style={styles.detailBodyText}>
                          Teams begin to group up to contest major objectives like the Gold Fury and Towers. Map control and vision become critical.
                        </Text>
                      </View>
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Late Game (Team Fights & Sieges)</Text>
                        <Text style={styles.detailBodyText}>
                          With gods at full power, massive 5v5 team fights decide the game. A single victorious fight can lead to securing the Fire Giant and making the final push to destroy the enemy Titan.
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Interactive Map</Text>
                  <Text style={styles.detailBodyText}>
                    Explore the Conquest map with this interactive tool. Click on structures, objectives, and jungle camps to learn more about them.
                  </Text>
                  <ConquestMap />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          {selectedTab === 'gods' ? (
            <View style={styles.grid}>
              {filteredGods.map((god, idx) => {
                const name = (god.name || god.GodName || god.title || god.displayName || 'Unknown').toString();
                const godIcon = (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon)) || null;
                const uniqueKey = name + (god.GodName || god.name || idx);
                
                return (
                  <TouchableOpacity
                    key={uniqueKey}
                    style={styles.card}
                    onPress={() => {
                      setSelectedGod(god);
                      setSkinsExpanded(false);
                      setSelectedSkin(null);
                      setLoreExpanded(false);
                      setAbilitiesExpanded(false);
                      setAspectExpanded(false);
                      setPassiveExpanded(false);
                      setSelectedAbility(null);
                      setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
                    }}
                  >
                    {godIcon ? (() => {
                      const localIcon = getLocalGodAsset(godIcon);
                      if (localIcon) {
                        return (
                          <Image 
                            source={localIcon} 
                            style={styles.cardIcon}
                          />
                        );
                      }
                      return (
                        <View style={styles.cardIconFallback}>
                          <Text style={styles.cardIconFallbackText}>{name.charAt(0)}</Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.cardIconFallback}>
                        <Text style={styles.cardIconFallbackText}>{name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.cardText} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : selectedTab === 'items' ? (
            <View style={styles.grid}>
              {filteredItems.map((item, idx) => {
                if (!item || typeof item !== 'object') return null;
                const name = (item.name || item.internalName || 'Unknown').toString();
                const itemIcon = item.icon || null;
                const consumableIcon = consumableIcons[name] || null;
                const localItemIcon = getLocalItemIcon(itemIcon);
                const modIcon = vulcanModItemIcons[name] || null;
                const uniqueKey = (item.internalName || item.name || name) + idx;
                
                return (
                  <TouchableOpacity
                    key={uniqueKey}
                    style={styles.card}
                    onPress={() => setSelectedItem(item)}
                  >
                    {modIcon ? (
                      <Image 
                        source={modIcon} 
                        style={styles.cardIcon}
                      />
                    ) : localItemIcon ? (
                      <Image 
                        source={localItemIcon} 
                        style={styles.cardIcon}
                      />
                    ) : consumableIcon ? (
                      <Image 
                        source={consumableIcon} 
                        style={styles.cardIcon}
                      />
                    ) : itemIcon ? (
                      <Image 
                        source={{ uri: `https://www.smitecalculator.pro${itemIcon}` }} 
                        style={styles.cardIcon}
                      />
                    ) : (
                      <View style={styles.cardIconFallback}>
                        <Text style={styles.cardIconFallbackText}>{name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.cardText} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View>
              <View style={styles.gamemodesIntro}>
                <Text style={styles.gamemodesIntroTitle}>Game Modes</Text>
                <Text style={styles.gamemodesIntroText}>
                  Each of the Game Modes in SMITE 2 has its own play style, rules and objectives.{' '}
                  <Text style={styles.gamemodesIntroTextRed}>
                    All data collected from ingame and official sources like Smite Wiki 2.
                  </Text>
                </Text>
                <TouchableOpacity
                  style={styles.gamemodesDescriptionHeader}
                  onPress={() => setGamemodesDescriptionExpanded(!gamemodesDescriptionExpanded)}
                >
                  <Text style={styles.gamemodesIntroSubtitle}>Description</Text>
                  <Text style={styles.gamemodesExpandIcon}>
                    {gamemodesDescriptionExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {gamemodesDescriptionExpanded && (
                  <View>
                    <Text style={styles.gamemodesIntroText}>
                      Players can choose to be placed in a queue for one of the following Game Modes:
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      <Text style={styles.gamemodesIntroBold}>Conquest:</Text> This is a traditional 5 vs 5 mode with two bases at opposite sides of the map connected by three lanes. Each lane is protected by two towers and a Phoenix. The objective is to destroy the Titan at the middle of the enemy team's base.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      <Text style={styles.gamemodesIntroBold}>Arena:</Text> This is a 5 vs 5 in a small, oval shaped map with two bases at opposite ends. Each team has 500 tickets, the objective is to reduce the enemy team's tickets to 0 by either defeating enemy gods, hitting enemy minions, or escorting friendly minions into the enemy team's portal.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      <Text style={styles.gamemodesIntroBold}>Joust:</Text> This is a 3 vs 3 mode featuring a small map with two bases at opposite ends, connected by one lane that's protected by towers and phoenixes. The objective is to destroy the Titan inside the enemy's base.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      <Text style={styles.gamemodesIntroBold}>Duel:</Text> This is a 1 vs 1 variant of Joust, where players must rely on their own skill to defeat their opponent.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      <Text style={styles.gamemodesIntroBold}>Assault:</Text> This is a 5 vs 5 mode featuring two bases connected by a single lane protected by towers and phoenixes. The objective is to destroy the Titan at the middle of the enemy team's base. Unlike other modes, the game picks a random God for each player.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      There is also a <Text style={styles.gamemodesIntroBold}>Ranked</Text> version of Conquest, a more competitive version which requires players to reach Account level 15 before they are allowed to queue in.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      In addition, the game features <Text style={styles.gamemodesIntroBold}>VS AI</Text> variants of Conquest, Arena and Joust to play vs computer controlled enemies, and basic Tutorial courses that teach the general basic mechanics of the different game modes. Besides this, there is also a <Text style={styles.gamemodesIntroBold}>Practice</Text> mode, where any god can be selected and tested even if not unlocked.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      Smite 2 also has a <Text style={styles.gamemodesIntroBold}>Quickplay</Text> version of Arena and Joust. These modes feature a shorter 10-minute-match length, roguelike building system and computer-controlled enemies.
                    </Text>
                    <Text style={styles.gamemodesIntroText}>
                      Players are also able to create <Text style={styles.gamemodesIntroBold}>Custom</Text> matches with several different settings. These Custom matches can hosted privately or publically.
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.grid}>
                {gameModes.map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    style={styles.card}
                    onPress={() => {
                      setSelectedGameMode(mode);
                      // Scroll to top after a short delay to ensure content is rendered
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                      }, 100);
                    }}
                  >
                    {gameModeIcons[mode.id] ? (
                      <Image source={gameModeIcons[mode.id]} style={styles.cardIcon} />
                    ) : (
                      <View style={styles.cardIconFallback}>
                        <Text style={styles.cardIconFallbackText}>{mode.name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.cardText} numberOfLines={1}>{mode.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
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
    backgroundColor: '#071024',
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#031320',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#06202f',
  },
  tabActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterButtonContainer: {
    position: 'relative',
    zIndex: 10,
  },
  filterButton: {
    backgroundColor: '#06202f',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 80,
  },
  filterButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  filterButtonText: {
    color: '#e6eef8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  filterButtonIcon: {
    color: '#e6eef8',
    fontSize: 10,
  },
  statOptionIcon: {
    width: 20,
    height: 20,
  },
  pantheonDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: '#0b1226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 180,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tierDropdown: {
    right: 0,
    left: 'auto',
  },
  pantheonDropdownScroll: {
    maxHeight: 200,
  },
  pantheonOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pantheonOptionActive: {
    backgroundColor: '#1e90ff',
  },
  pantheonOptionText: {
    color: '#e6eef8',
    fontSize: 14,
  },
  search: {
    backgroundColor: '#06202f',
    color: '#e6eef8',
    padding: 10,
    borderRadius: 8,
    flex: 1,
  },
  searchWithFilter: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    width: '30%',
    backgroundColor: '#0b1226',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginBottom: 6,
  },
  cardIconFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 20,
  },
  cardText: {
    color: '#e6eef8',
    fontSize: 11,
    textAlign: 'center',
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
  modalTitle: {
    flex: 1,
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    color: '#e6eef8',
    fontSize: 28,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  modalCloseButtonContainer: {
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
  modalIconContainer: {
    marginRight: 12,
  },
  modalGodIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  modalGodIconFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGodIconFallbackText: {
    color: '#e6eef8',
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
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 24,
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
  modalScales: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
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
  modalBody: {
    maxHeight: 500,
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
  modalInfo: {
    color: '#7dd3fc',
    fontSize: 14,
    marginBottom: 8,
  },
  modalSection: {
    marginTop: 16,
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  modalSectionTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  abilityItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  abilityName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  abilityDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  aspectName: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  aspectContainer: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#061028',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  aspectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aspectIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  aspectIconFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  aspectIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 24,
  },
  aspectInfo: {
    flex: 1,
  },
  passiveContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  passiveIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  passiveIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  passiveName: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  passiveStatsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  passiveStatRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  passiveStatLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 120,
  },
  passiveStatValue: {
    color: '#e6eef8',
    fontSize: 12,
    flex: 1,
  },
  vulcanModsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  vulcanModsTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  vulcanModItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  vulcanModIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  vulcanModInfo: {
    flex: 1,
  },
  vulcanModName: {
    color: '#e6eef8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  abilityTooltipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  abilityTooltipBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  abilityTooltip: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    width: '85%',
    maxWidth: 350,
    maxHeight: '75%',
    borderWidth: 2,
    borderColor: '#1e90ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    flexShrink: 1,
    overflow: 'hidden',
    zIndex: 2,
    position: 'relative',
  },
  abilityTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  abilityTooltipIconContainer: {
    marginRight: 10,
  },
  abilityTooltipIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  abilityTooltipIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityTooltipIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 20,
  },
  abilityTooltipTitle: {
    flex: 1,
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
  },
  abilityTooltipClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityTooltipCloseText: {
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  abilityTooltipBody: {
    maxHeight: 500,
    flexShrink: 1,
  },
  abilityTooltipSection: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 8,
  },
  abilityTooltipSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  abilityTooltipSectionTitle: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
  },
  abilityTooltipSectionToggle: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
  },
  abilityTooltipScrollContent: {
    maxHeight: 200,
    marginTop: 8,
  },
  abilityTooltipScales: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  abilityTooltipDescription: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  abilityTooltipStats: {
    marginTop: 8,
  },
  abilityTooltipStatRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  abilityTooltipStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 100,
  },
  abilityTooltipStatValue: {
    color: '#e6eef8',
    fontSize: 11,
    flex: 1,
  },
  skinsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skinsToggleText: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
  },
  skinsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  skinButton: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  skinButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  skinButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedSkinContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  selectedSkinName: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  selectedSkinImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSkinType: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
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
  // Full-page god detail styles
  godPageContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  godPageHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    backgroundColor: '#0b1226',
  },
  backButton: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
  },
  godPageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  godPageTitleWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  godPageTitle: {
    color: '#e6eef8',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  godPageSubtext: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  godPageMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  godPageMetaIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },
  godPageMetaText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  godPageRolesContainer: {
    marginTop: 8,
  },
  godPageRolesLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  godPageRolesList: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  godPageRoleText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  pantheonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    marginRight: 8,
  },
  pantheonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pantheonIcon: {
    width: 20,
    height: 20,
  },
  godInfoPantheonIcon: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
  pantheonOptionIcon: {
    width: 24,
    height: 24,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  godInfoBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  godInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  godInfoLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
    minWidth: 80,
  },
  godInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  godPageBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Item page styles
  itemPageContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  itemPageHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    backgroundColor: '#0b1226',
  },
  itemPageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  itemPageTitleWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  itemPageTitle: {
    color: '#e6eef8',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemPageSubtext: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  itemPageBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  recipeTreeContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  recipeTreeTitle: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  recipeTreeWarning: {
    color: '#fbbf24',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  recipeTree: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 20,
  },
  recipeTier3Item: {
    marginBottom: 20,
    zIndex: 2,
  },
  recipeTier3Glow: {
    width: 96,
    height: 96,
    borderRadius: 12,
    padding: 4,
    backgroundColor: '#0f1724',
    borderWidth: 3,
    borderColor: '#facc15',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTier3Icon: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  recipeTier3IconFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTier3IconFallbackText: {
    color: '#facc15',
    fontWeight: '700',
    fontSize: 36,
  },
  recipeT2ArrowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 12,
    marginBottom: 12,
    minHeight: 30,
  },
  recipeT2Arrow: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
  },
  recipeComponentsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    flexWrap: 'wrap',
    zIndex: 2,
  },
  recipeTier2Wrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recipeComponentItem: {
    alignItems: 'center',
    width: 90,
  },
  recipeComponentGlow: {
    width: 72,
    height: 72,
    borderRadius: 10,
    padding: 3,
    backgroundColor: '#0f1724',
    borderWidth: 2,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeComponentIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
  recipeComponentIconFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeComponentIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 28,
  },
  recipeComponentName: {
    color: '#cbd5e1',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  recipeT1ArrowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    minHeight: 20,
  },
  recipeT1Arrow: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
  },
  recipeT1Container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  recipeT1Item: {
    alignItems: 'center',
    width: 70,
  },
  recipeT1Glow: {
    width: 56,
    height: 56,
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#0f1724',
    borderWidth: 2,
    marginBottom: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeT1Icon: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  recipeT1IconFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeT1IconFallbackText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 20,
  },
  recipeT1Name: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  itemInfoSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  itemInfoLabel: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemInfoValue: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '600',
  },
  itemInfoSectionTitle: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  itemStatRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  itemStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 140,
  },
  itemStatValue: {
    color: '#e6eef8',
    fontSize: 14,
    flex: 1,
  },
  itemInfoText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  // Ability page overlay styles
  abilityPageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#071024',
    zIndex: 1000,
  },
  abilityPageContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  abilityPageHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    backgroundColor: '#0b1226',
  },
  abilityPageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  abilityPageTitle: {
    flex: 1,
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  abilityPageBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Gamemodes styles
  gamemodesIntro: {
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  gamemodesIntroTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  gamemodesIntroSubtitle: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  gamemodesDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 8,
  },
  gamemodesExpandIcon: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '700',
  },
  gamemodesIntroTextRed: {
    color: '#ef4444',
  },
  gamemodesIntroText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  gamemodesIntroBold: {
    fontWeight: '700',
    color: '#7dd3fc',
  },
  detailContainer: {
    padding: 20,
  },
  detailHeader: {
    marginBottom: 24,
  },
  detailTitle: {
    color: '#7dd3fc',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailQuote: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  detailSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailSectionTitle: {
    color: '#1e90ff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  detailSectionToggle: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  detailSubsection: {
    marginTop: 16,
    marginBottom: 12,
  },
  detailSubsectionTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailBodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  detailInfoItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: '#061028',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  detailInfoLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailInfoValue: {
    color: '#e6eef8',
    fontSize: 14,
    fontWeight: '700',
  },
  detailList: {
    marginTop: 8,
  },
detailListItem: {
  marginBottom: 8,
  paddingLeft: 8,
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'nowrap',
},
detailListItemText: {
  color: '#cbd5e1',
  fontSize: 14,
  lineHeight: 20,
  flex: 1,
  flexShrink: 1,
},
  detailListItemIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 6,
    marginLeft: 0,
    flexShrink: 0,
  },
  detailListBold: {
    fontWeight: '700',
    color: '#7dd3fc',
  },
  detailTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    padding: 12,
  },
  detailTableHeader: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    padding: 8,
  },
  detailTableCell: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
    padding: 8,
  },
});

