import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  InteractionManager,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
// Lazy load builds.json to prevent startup crash
let localBuilds = null;
import { getLocalItemIcon, getLocalGodAsset, getSkinImage } from './localIcons';

// Storage helper (same as in index.jsx)
const IS_WEB_STORAGE = Platform.OS === 'web';
const storage = {
  async getItem(key) {
    if (IS_WEB_STORAGE && typeof window !== 'undefined' && window.localStorage) {
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
    if (IS_WEB_STORAGE && typeof window !== 'undefined' && window.localStorage) {
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
// Lazy load ConquestMap since it's only used in gamemodes view
const ConquestMap = React.lazy(() => import('./ConquestMap'));

// Platform check for web
const IS_WEB = Platform.OS === 'web';

// Import reusable screen dimensions hook
import { useScreenDimensions } from '../hooks/useScreenDimensions';

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

// Role icons
const roleIcons = {
  'ADC': require('./data/Icons/Role Icons/T_GodRole_Carry_Small.png'),
  'Solo': require('./data/Icons/Role Icons/T_GodRole_Solo_Small.png'),
  'Support': require('./data/Icons/Role Icons/T_GodRole_Support.png'),
  'Mid': require('./data/Icons/Role Icons/T_GodRole_Mid_Small.png'),
  'Jungle': require('./data/Icons/Role Icons/T_GodRole_Jungle.png'),
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

// Gameplay Mechanics data structure - SMITE 2 specific
const gameplayMechanics = {
  subcategories: [
    { id: 'combat-damage', name: 'Combat & Damage', count: 9 },
    { id: 'statistics', name: 'Statistics', count: 4 },
    { id: 'health-healing', name: 'Health & Healing', count: 6 },
    { id: 'buffs-debuffs', name: 'Buffs & Debuffs', count: 2 },
    { id: 'crowd-control', name: 'Crowd Control', count: 15 },
    { id: 'god-abilities', name: 'God Abilities', count: 12 },
    { id: 'movement', name: 'Movement', count: 1 },
    { id: 'structures', name: 'Structures', count: 4 },
    { id: 'minions', name: 'Minions', count: 1 },
    { id: 'jungle', name: 'Jungle', count: 2 },
    { id: 'ui-interface', name: 'UI & Interface', count: 2 },
    { id: 'economy', name: 'Economy & Progression', count: 6 },
    { id: 'game-modes', name: 'Game Modes', count: 6 },
    { id: 'player-systems', name: 'Player Systems', count: 13 },
    { id: 'cosmetics', name: 'Cosmetics', count: 6 },
    { id: 'terminology', name: 'Terminology', count: 80 },
    { id: 'items-system', name: 'Items System', count: 8 },
  ],
  mechanics: [
    // Mechanics will be added here
  ]
};

// Patch Badge Tooltip Component (defined outside to avoid recreation)
function PatchBadgeTooltip({ changeType, version, entityType, badgeStyle, textStyle, overlayStyle, contentStyle, tooltipTextStyle, closeButtonStyle, closeTextStyle }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getChangeTypeText = (type) => {
    const types = {
      'buffed': 'Buffed',
      'nerfed': 'Nerfed',
      'shifted': 'Shifted',
      'new': 'New',
    };
    return types[type] || 'Updated';
  };

  return (
    <>
      <TouchableOpacity
        style={badgeStyle}
        onPress={() => setShowTooltip(true)}
        activeOpacity={0.7}
      >
        <Text style={textStyle}>
          {getChangeTypeText(changeType)}
        </Text>
      </TouchableOpacity>
      
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <Pressable
          style={overlayStyle}
          onPress={() => setShowTooltip(false)}
        >
          <View style={contentStyle}>
            <Text style={tooltipTextStyle}>
              This {entityType} was recently {changeType} this patch ({version}).
            </Text>
            <TouchableOpacity
              style={closeButtonStyle}
              onPress={() => setShowTooltip(false)}
            >
              <Text style={closeTextStyle}>✕</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function DataPage({ initialSelectedGod = null, initialExpandAbilities = false, onBackToBuilds = null, initialTab = 'gods' }) {
  // Get responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  const SCREEN_WIDTH = screenDimensions.width;
  const [builds, setBuilds] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(initialTab); // 'gods', 'items', 'gamemodes', or 'mechanics'
  const [pinnedGods, setPinnedGods] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  
  // Load pinned gods state
  useEffect(() => {
    const loadPinnedGods = async () => {
      const user = await storage.getItem('currentUser');
      setCurrentUser(user);
      if (user) {
        const pinnedGodsData = await storage.getItem(`pinnedGods_${user}`);
        if (pinnedGodsData) {
          const pinned = JSON.parse(pinnedGodsData);
          const godNames = new Set(pinned.map(g => g.name || g.GodName));
          setPinnedGods(godNames);
        }
      }
    };
    loadPinnedGods();
  }, []);
  
  // Sync selectedTab with initialTab when it changes
  useEffect(() => {
    if (initialTab) {
      setSelectedTab(initialTab);
    }
  }, [initialTab]);
  const [selectedGod, setSelectedGod] = useState(initialSelectedGod);
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedMechanicCategory, setSelectedMechanicCategory] = useState(null);
  const [mechanicCategoryDropdownVisible, setMechanicCategoryDropdownVisible] = useState(false);
  const [gamemodesDescriptionExpanded, setGamemodesDescriptionExpanded] = useState(false);
  const [conquestSectionsExpanded, setConquestSectionsExpanded] = useState({
    battleground: false,
    threeLanes: false,
    jungleCamps: false,
    objectives: false,
    infamy: false,
  });
  const [campLevel, setCampLevel] = useState(0);
  const [expandedCamps, setExpandedCamps] = useState({});
  const [minionLevel, setMinionLevel] = useState(0);
  const [expandedMinions, setExpandedMinions] = useState({});
  const [bossLevel, setBossLevel] = useState(0);
  const [expandedBosses, setExpandedBosses] = useState({});
  const scrollViewRef = useRef(null);
  // Track if we came from builds page (only true if initialSelectedGod was set on mount)
  const [cameFromBuilds] = useState(!!initialSelectedGod && !!onBackToBuilds);
  
  // Hide scrollbars on web
  useEffect(() => {
    if (IS_WEB && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Reset related state when component mounts or when navigating back
  useEffect(() => {
    // Only reset if we're not coming from builds page with a specific god
    // Don't reset selectedTab here - it's handled by initialTab prop and the sync useEffect
    if (!initialSelectedGod) {
      setSelectedGod(null);
      setSelectedItem(null);
      setSelectedGameMode(null);
      setSelectedMechanic(null);
      setSearchQuery('');
      setSelectedPantheon(null);
      setPantheonDropdownVisible(false);
      setSelectedStat(null);
      setStatDropdownVisible(false);
      setSelectedTier(null);
      setTierDropdownVisible(false);
      setSkinsExpanded(false);
      setSelectedSkin(null);
      setLoreExpanded(false);
      setAbilitiesExpanded(false);
      setAspectExpanded(false);
      setPassiveExpanded(false);
      setSelectedAbility(null);
      setAbilitySectionsExpanded({ scales: false, description: false, stats: false });
      setBaseStatsExpanded(false);
      setGodLevel(1);
      setGamemodesDescriptionExpanded(false);
      setSelectedMechanicCategory(null);
      setMechanicCategoryDropdownVisible(false);
      setConquestSectionsExpanded({
        battleground: false,
        threeLanes: false,
        jungleCamps: false,
        objectives: false,
        infamy: false,
      });
      setCampLevel(0);
      setExpandedCamps({});
      setMinionLevel(0);
      setExpandedMinions({});
      setBossLevel(0);
      setExpandedBosses({});
    }
  }, []);

  // Lazy load the builds data after the UI has rendered (only once)
  useEffect(() => {
    // Only load if data isn't already loaded
    if (builds !== null) {
      return;
    }
    
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
  }, []); // Empty deps - only run once on mount
  
  // If initialSelectedGod changes, update selectedGod
  useEffect(() => {
    if (initialSelectedGod) {
      setSelectedGod(initialSelectedGod);
      // If expandAbilities is true, expand the abilities section
      if (initialExpandAbilities) {
        setAbilitiesExpanded(true);
      }
      // Reset level and base stats when god changes
      setGodLevel(1);
      setBaseStatsExpanded(false);
    }
  }, [initialSelectedGod, initialExpandAbilities]);
  
  // Reset level and base stats when selectedGod changes
  useEffect(() => {
    if (selectedGod) {
      setGodLevel(1);
      setBaseStatsExpanded(false);
      // Close all dropdowns when a god is selected
      setPantheonDropdownVisible(false);
      setStatDropdownVisible(false);
      setTierDropdownVisible(false);
      setMechanicCategoryDropdownVisible(false);
    }
  }, [selectedGod]);

  // Scroll to top when game mode is selected
  useEffect(() => {
    if (selectedGameMode && selectedTab === 'gamemodes') {
      // Close all dropdowns when a game mode is selected
      setPantheonDropdownVisible(false);
      setStatDropdownVisible(false);
      setTierDropdownVisible(false);
      setMechanicCategoryDropdownVisible(false);
      // Use multiple timeouts to ensure scroll happens after content is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 200);
    }
  }, [selectedGameMode, selectedTab]);

  // Scroll to top when mechanic is selected
  useEffect(() => {
    if (selectedMechanic && selectedTab === 'mechanics') {
      // Close all dropdowns when a mechanic is selected
      setPantheonDropdownVisible(false);
      setStatDropdownVisible(false);
      setTierDropdownVisible(false);
      setMechanicCategoryDropdownVisible(false);
      // Use multiple timeouts to ensure scroll happens after content is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 200);
    }
  }, [selectedMechanic, selectedTab]);

  // Scroll to top when tab changes
  useEffect(() => {
    // Scroll to top when switching tabs (but not when selecting items/gods/mechanics)
    if (!selectedGod && !selectedItem && !selectedMechanic && !selectedGameMode) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [selectedTab, selectedGod, selectedItem, selectedMechanic, selectedGameMode]);
  const [selectedAbility, setSelectedAbility] = useState(null); // { abilityKey, ability, abilityName }
  const [skinsExpanded, setSkinsExpanded] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(null);
  const [failedItemIcons, setFailedItemIcons] = useState({}); // Track which item icons failed to load (for fallback)
  const [loreExpanded, setLoreExpanded] = useState(false);
  const [abilitiesExpanded, setAbilitiesExpanded] = useState(false);
  const [aspectExpanded, setAspectExpanded] = useState(false);
  const [passiveExpanded, setPassiveExpanded] = useState(false);
  const [baseStatsExpanded, setBaseStatsExpanded] = useState(false);
  const [godLevel, setGodLevel] = useState(1);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(300);
  const [sliderTrackLayout, setSliderTrackLayout] = useState({ x: 0, y: 0, width: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef(null);
  const [selectedPantheon, setSelectedPantheon] = useState(null);
  const [pantheonDropdownVisible, setPantheonDropdownVisible] = useState(false);
  const [showGodSkins, setShowGodSkins] = useState(false); // Toggle between icons and base skins
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
      result = result.slice(0, 80);
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
    if (searchQuery && searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        
        // Get name and internalName, handling various formats
        const name = (item.name || '').toString().toLowerCase().trim();
        const internalName = (item.internalName || '').toString().toLowerCase().trim();
        
        // Check if query matches name or internalName
        if (name.includes(query) || internalName.includes(query)) {
          return true;
        }
        
        // Also check normalized versions (no special chars, no spaces)
        const nameNormalized = name.replace(/[^a-z0-9]/g, '');
        const internalNameNormalized = internalName.replace(/[^a-z0-9]/g, '');
        const queryNormalized = query.replace(/[^a-z0-9]/g, '');
        
        if (nameNormalized.includes(queryNormalized) || internalNameNormalized.includes(queryNormalized)) {
          return true;
        }
        
        // Check without spaces
        const nameNoSpaces = name.replace(/\s+/g, '');
        const internalNameNoSpaces = internalName.replace(/\s+/g, '');
        const queryNoSpaces = query.replace(/\s+/g, '');
        
        if (nameNoSpaces.includes(queryNoSpaces) || internalNameNoSpaces.includes(queryNoSpaces)) {
          return true;
        }
        
        return false;
      });
    } else {
      // Show only first 30 when no search (but still respect stat and tier filters)
      result = result.slice(0, 230);
    }
    
    return result;
  }, [items, searchQuery, selectedStat, selectedTier]);

  // Handle slider movement for both web and mobile
  const handleSliderMove = useCallback((event) => {
    const nativeEvent = event.nativeEvent;
    if (sliderTrackWidth > 0 && sliderTrackRef.current) {
      let locationX;
      if (IS_WEB) {
        // For web, try multiple methods to get the correct position
        // First try locationX (works in some React Native Web versions)
        locationX = nativeEvent?.locationX;
        
        // If locationX is not available or seems wrong, calculate from clientX/pageX
        if (locationX === undefined || locationX === null || locationX < 0 || locationX > sliderTrackWidth) {
          // Try to get clientX from touch events (for mobile web)
          const clientX = nativeEvent?.clientX ?? nativeEvent?.touches?.[0]?.clientX ?? nativeEvent?.changedTouches?.[0]?.clientX ?? nativeEvent?.pageX ?? 0;
          // Always try to get element position for accuracy
          try {
            const element = sliderTrackRef.current;
            if (element && typeof element.getBoundingClientRect === 'function') {
              const rect = element.getBoundingClientRect();
              locationX = clientX - rect.left;
            } else if (sliderTrackLayout.x > 0) {
              locationX = clientX - sliderTrackLayout.x;
            } else {
              // Fallback: try to use pageX if clientX didn't work
              const pageX = nativeEvent?.pageX ?? nativeEvent?.touches?.[0]?.pageX ?? nativeEvent?.changedTouches?.[0]?.pageX ?? 0;
              if (pageX > 0 && sliderTrackLayout.x > 0) {
                locationX = pageX - sliderTrackLayout.x;
              } else {
                locationX = 0;
              }
            }
          } catch (e) {
            // Final fallback
            const pageX = nativeEvent?.pageX ?? nativeEvent?.touches?.[0]?.pageX ?? nativeEvent?.changedTouches?.[0]?.pageX ?? 0;
            locationX = pageX - (sliderTrackLayout.x || 0);
          }
        }
        // Ensure locationX is within bounds
        locationX = Math.max(0, Math.min(sliderTrackWidth, locationX));
      } else {
        // For mobile, try multiple methods to get accurate position
        if (nativeEvent?.locationX !== undefined && nativeEvent?.locationX !== null && nativeEvent.locationX >= 0) {
          // Use locationX if available (most reliable on mobile)
          locationX = nativeEvent.locationX;
        } else if (nativeEvent?.touches && nativeEvent.touches.length > 0) {
          // Calculate from touch position
          const touch = nativeEvent.touches[0];
          if (touch && sliderTrackRef.current) {
            try {
              // Try to get position from layout or measure
              if (sliderTrackLayout.x > 0) {
                locationX = touch.pageX - sliderTrackLayout.x;
              } else {
                // Fallback: try to use pageX relative to screen and estimate
                // This is less accurate but better than nothing
                locationX = nativeEvent?.locationX ?? (touch.pageX % sliderTrackWidth);
              }
            } catch (e) {
              locationX = nativeEvent?.locationX ?? 0;
            }
          } else {
            locationX = nativeEvent?.locationX ?? 0;
          }
        } else if (nativeEvent?.locationX !== undefined && nativeEvent?.locationX !== null) {
          locationX = nativeEvent.locationX;
        } else {
          locationX = 0;
        }
        // Ensure locationX is within bounds
        locationX = Math.max(0, Math.min(sliderTrackWidth, locationX));
      }
      const percentage = Math.max(0, Math.min(1, locationX / sliderTrackWidth));
      const newLevel = Math.round(1 + percentage * 19);
      setGodLevel(Math.max(1, Math.min(20, newLevel)));
    }
  }, [sliderTrackWidth, sliderTrackLayout, IS_WEB]);

  // Handle mouse move for web (for smooth dragging)
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

  // Handle mouse up for web
  const handleMouseUp = useCallback(() => {
    if (IS_WEB && isDragging) {
      setIsDragging(false);
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    }
  }, [isDragging, IS_WEB, handleMouseMove]);

  // Set up mouse event listeners for web when dragging starts
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

  // Calculate base stats at current level (must be at top level, not conditional)
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

  // Filter mechanics
  const filteredMechanics = useMemo(() => {
    let result = gameplayMechanics.mechanics;
    
    // Apply category filter
    if (selectedMechanicCategory) {
      result = result.filter((mechanic) => mechanic.category === selectedMechanicCategory);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((mechanic) => {
        const name = (mechanic.name || '').toString().toLowerCase();
        const description = (mechanic.description || '').toString().toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    } else {
      // Show only first 20 when no search (but still respect category filter)
      result = result.slice(0, 30);
    }
    
    // Sort alphabetically by name
    return result.sort((a, b) => {
      const nameA = (a.name || '').toString().toLowerCase();
      const nameB = (b.name || '').toString().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [searchQuery, selectedMechanicCategory]);

  // Get mechanics by category for subcategory display
  const mechanicsByCategory = useMemo(() => {
    const grouped = {};
    gameplayMechanics.mechanics.forEach((mechanic) => {
      const category = mechanic.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(mechanic);
    });
    return grouped;
  }, []);

  // Check if any detail page is open
  const isDetailPageOpen = selectedGod || selectedItem || selectedGameMode || selectedMechanic;

  return (
    <View style={styles.outerContainer}>
      <ScrollView 
        style={styles.outerScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {!isDetailPageOpen && (
        <View style={styles.header}>
          <Text style={styles.logo}>SMITE 2 Database</Text>
          <Text style={styles.headerSub}>All gameplay information about Smite 2 will be located here.</Text>
        </View>
      )}

      {(selectedTab === 'gods' || selectedTab === 'items' || selectedTab === 'mechanics') && !isDetailPageOpen && (
      <View style={styles.controls}>

        <View style={styles.searchRow}>
          {selectedTab === 'gods' && (
            <View style={styles.filterButtonContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, selectedPantheon && styles.filterButtonActive, selectedGod && styles.filterButtonDisabled]}
                  onPress={() => {
                    if (!selectedGod) {
                      setPantheonDropdownVisible(!pantheonDropdownVisible);
                    }
                  }}
                  disabled={!!selectedGod}
                >
                  <Text style={styles.filterButtonText}>
                    {selectedPantheon ? selectedPantheon : 'Filter'}
                  </Text>
                  <Text style={styles.filterButtonIcon}>
                    {pantheonDropdownVisible ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {pantheonDropdownVisible && !selectedGod && (
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
                                accessibilityLabel={`${pantheon} pantheon icon`}
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
                  style={[styles.filterButton, selectedStat && styles.filterButtonActive, selectedItem && styles.filterButtonDisabled]}
                    onPress={() => {
                      if (!selectedItem) {
                        setStatDropdownVisible(!statDropdownVisible);
                        setTierDropdownVisible(false);
                      }
                    }}
                    disabled={!!selectedItem}
                >
                  <Text style={styles.filterButtonText}>
                    {selectedStat ? selectedStat : 'Filter'}
                  </Text>
                  <Text style={styles.filterButtonIcon}>
                    {statDropdownVisible ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {statDropdownVisible && !selectedItem && (
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
                                  accessibilityLabel={`${stat} stat icon`}
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
                placeholder={searchQuery ? `Search ${selectedTab}...` : `Showing all avaiable items ${selectedTab}. Search to see more...`}
                placeholderTextColor="#cbd5e1"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.filterButtonContainer}>
                  <TouchableOpacity
                    style={[styles.filterButton, selectedTier && styles.filterButtonActive, selectedItem && styles.filterButtonDisabled]}
                    onPress={() => {
                      if (!selectedItem) {
                        setTierDropdownVisible(!tierDropdownVisible);
                        setStatDropdownVisible(false);
                      }
                    }}
                    disabled={!!selectedItem}
                  >
                    <Text style={styles.filterButtonText}>
                      {selectedTier ? selectedTier : 'Tier'}
                    </Text>
                    <Text style={styles.filterButtonIcon}>
                      {tierDropdownVisible ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {tierDropdownVisible && !selectedItem && (
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
          {selectedTab === 'mechanics' && (
            <View style={styles.filterButtonContainer}>
              <TouchableOpacity
                style={[styles.filterButton, selectedMechanicCategory && styles.filterButtonActive]}
                onPress={() => {
                  setMechanicCategoryDropdownVisible(!mechanicCategoryDropdownVisible);
                }}
              >
                <Text style={styles.filterButtonText}>
                  {selectedMechanicCategory ? gameplayMechanics.subcategories.find(c => c.id === selectedMechanicCategory)?.name || selectedMechanicCategory : 'Category'}
                </Text>
                <Text style={styles.filterButtonIcon}>
                  {mechanicCategoryDropdownVisible ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              {mechanicCategoryDropdownVisible && (
                <View style={styles.pantheonDropdown}>
                  <ScrollView style={styles.pantheonDropdownScroll} nestedScrollEnabled={true}>
                    <TouchableOpacity
                      style={[styles.pantheonOption, !selectedMechanicCategory && styles.pantheonOptionActive]}
                      onPress={() => {
                        setSelectedMechanicCategory(null);
                        setMechanicCategoryDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.pantheonOptionText}>All Categories</Text>
                    </TouchableOpacity>
                    {gameplayMechanics.subcategories.map((category) => {
                      const categoryMechanics = mechanicsByCategory[category.id] || [];
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.pantheonOption, selectedMechanicCategory === category.id && styles.pantheonOptionActive]}
                          onPress={() => {
                            setSelectedMechanicCategory(category.id);
                            setMechanicCategoryDropdownVisible(false);
                          }}
                        >
                          <Text style={styles.pantheonOptionText}>
                            {category.name} ({categoryMechanics.length})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
          {(selectedTab === 'gods' || selectedTab === 'mechanics') && (
            <>
              <TextInput
                style={styles.search}
                placeholder={searchQuery ? `Search ${selectedTab}...` : `Showing all available ${selectedTab}. Search to see more...`}
                placeholderTextColor="#cbd5e1"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {selectedTab === 'gods' && (
                <TouchableOpacity
                  style={[styles.filterButton, showGodSkins && styles.filterButtonActive, selectedGod && styles.filterButtonDisabled, { marginLeft: 8 }]}
                  onPress={() => {
                    if (!selectedGod) {
                      setShowGodSkins(!showGodSkins);
                    }
                  }}
                  disabled={!!selectedGod}
                >
                  <Text style={styles.filterButtonText}>
                    {showGodSkins ? 'God Cards' : 'Icons'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
      )}

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
                      const imageSource = localIcon.primary || localIcon;
                      const fallbackSource = localIcon.fallback;
                      const iconKey = `selected-item-icon-${selectedItem.internalName || selectedItem.name}`;
                      const useFallback = failedItemIcons[iconKey];
                      
                      if (fallbackSource && !useFallback) {
                        return (
                          <Image 
                            source={imageSource}
                            style={styles.modalItemIcon}
                            accessibilityLabel={`${selectedItem.name || selectedItem.internalName || 'Item'} icon`}
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
                            style={styles.modalItemIcon}
                            accessibilityLabel={`${selectedItem.name || selectedItem.internalName || 'Item'} icon`}
                          />
                        );
                      }
                      
                      return (
                        <Image 
                          source={imageSource}
                          style={styles.modalItemIcon}
                          accessibilityLabel={`${selectedItem.name || selectedItem.internalName || 'Item'} icon`}
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
                            const imageSource = localIcon.primary || localIcon;
                            const fallbackSource = localIcon.fallback;
                            const iconKey = `recipe-tier3-${selectedItem.internalName || selectedItem.name}`;
                            const useFallback = failedItemIcons[iconKey];
                            
                            if (fallbackSource && !useFallback) {
                              return (
                                <Image 
                                  source={imageSource}
                                  style={styles.recipeTier3Icon}
                                  onError={() => {
                                    setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                  }}
                                />
                              );
                            }
                            
                            return (
                              <Image 
                                source={fallbackSource && useFallback ? fallbackSource : imageSource}
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
                                  const imageSource = localIcon.primary || localIcon;
                                  const fallbackSource = localIcon.fallback;
                                  const iconKey = `recipe-t1-${compItem.internalName || compItem.name}-${idx}`;
                                  const useFallback = failedItemIcons[iconKey];
                                  
                                  if (fallbackSource && !useFallback) {
                                    return (
                                      <Image 
                                        source={imageSource}
                                        style={styles.recipeT1Icon}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                        onError={() => {
                                          setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                        }}
                                      />
                                    );
                                  }
                                  
                                  return (
                                    <Image 
                                      source={fallbackSource && useFallback ? fallbackSource : imageSource}
                                      style={styles.recipeT1Icon}
                                      contentFit="cover"
                                      cachePolicy="memory-disk"
                                      transition={200}
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
                                      const imageSource = localIcon.primary || localIcon;
                                      const fallbackSource = localIcon.fallback;
                                      const iconKey = `recipe-comp-${compItem.internalName || compItem.name}-${idx}`;
                                      const useFallback = failedItemIcons[iconKey];
                                      
                                      if (fallbackSource && !useFallback) {
                                        return (
                                          <Image 
                                            source={imageSource}
                                            style={styles.recipeComponentIcon}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={200}
                                            accessibilityLabel={`${compItem.name || compItem.internalName || 'Component'} icon`}
                                            onError={() => {
                                              setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                            }}
                                          />
                                        );
                                      }
                                      
                                      return (
                                        <Image 
                                          source={fallbackSource && useFallback ? fallbackSource : imageSource}
                                          style={styles.recipeComponentIcon}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={200}
                                          accessibilityLabel={`${compItem.name || compItem.internalName || 'Component'} icon`}
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
                                              const imageSource = localIcon.primary || localIcon;
                                              const fallbackSource = localIcon.fallback;
                                              const iconKey = `recipe-t1-item-${t1Item.internalName || t1Item.name}-${idx}`;
                                              const useFallback = failedItemIcons[iconKey];
                                              
                                              if (fallbackSource && !useFallback) {
                                                return (
                                                  <Image 
                                                    source={imageSource}
                                                    style={styles.recipeT1Icon}
                                                    onError={() => {
                                                      setFailedItemIcons(prev => ({ ...prev, [iconKey]: true }));
                                                    }}
                                                  />
                                                );
                                              }
                                              
                                              return (
                                                <Image 
                                                  source={fallbackSource && useFallback ? fallbackSource : imageSource}
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

        // Extract scaling type from god's scaling property (authoritative source)
        const scalingTypes = [];
        if (selectedGod.scaling && Array.isArray(selectedGod.scaling)) {
          selectedGod.scaling.forEach(scaleType => {
            if (scaleType === 'STR' || scaleType === 'INT') {
              scalingTypes.push(scaleType);
            }
          });
        }
        
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
                <View style={[styles.modalIconContainer, styles.godPageIconContainer, { borderColor: colors.accent + '60', borderWidth: 2, borderRadius: 10 }]}>
                  {(() => {
                    const godIcon = selectedGod.icon || selectedGod.GodIcon || (selectedGod.abilities && selectedGod.abilities.A01 && selectedGod.abilities.A01.icon);
                    const localIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                    if (localIcon) {
                      return (
                      <Image 
                          source={localIcon} 
                        style={styles.godPageIcon}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        accessibilityLabel={`${selectedGod.name || selectedGod.GodName || selectedGod.title || 'God'} icon`}
                      />
                      );
                    }
                    // No remote fallback here: if there's no local asset configured yet,
                    // show the letter fallback instead of loading from smitecalculator.
                    return (
                      <View style={[styles.godPageIconFallback, { backgroundColor: colors.primary + '30' }]}>
                        <Text style={[styles.godPageIconFallbackText, { color: colors.accent }]}>
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
                  {scalingTypes.length > 0 && (
                    <View style={styles.godPageRolesContainer}>
                      <Text style={[styles.godPageRolesLabel, { color: colors.accent + 'AA' }]}>
                        Scaling:
                      </Text>
                      <View style={styles.godPageRolesList}>
                        {scalingTypes.map((scaleType, idx) => {
                          const scaleIcon = scaleType === 'STR' ? statIcons['Strength'] : statIcons['Intelligence'];
                          return (
                            <React.Fragment key={scaleType}>
                              <View style={styles.godPageRoleItem}>
                                {scaleIcon && (
                                  <Image 
                                    source={scaleIcon} 
                                    style={styles.godPageRoleIcon}
                                    resizeMode="contain"
                                    accessibilityLabel={`${scaleType === 'STR' ? 'Strength' : 'Intelligence'} scaling icon`}
                                  />
                                )}
                                <Text style={[styles.godPageRoleText, { color: colors.accent + 'AA' }]}>
                                  {scaleType}
                                </Text>
                              </View>
                              {idx < scalingTypes.length - 1 && (
                                <Text style={[styles.godPageRoleText, { color: colors.accent + 'AA' }]}> • </Text>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  {possibleRoles.length > 0 && (
                    <View style={styles.godPageRolesContainer}>
                      <Text style={[styles.godPageRolesLabel, { color: colors.accent + 'AA' }]}>
                        Possible Roles:
                      </Text>
                      <View style={styles.godPageRolesList}>
                        {possibleRoles.map((role, idx) => {
                          const roleIcon = roleIcons[role];
                          return (
                            <React.Fragment key={role}>
                              <View style={styles.godPageRoleItem}>
                                {roleIcon && (
                                  <Image 
                                    source={roleIcon} 
                                    style={styles.godPageRoleIcon}
                                    resizeMode="contain"
                                    accessibilityLabel={`${role} role icon`}
                                  />
                                )}
                                <Text style={[styles.godPageRoleText, { color: colors.accent + 'AA' }]}>
                                  {role}
                                </Text>
                              </View>
                              {idx < possibleRoles.length - 1 && (
                                <Text style={[styles.godPageRoleText, { color: colors.accent + 'AA' }]}> • </Text>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
                </View>
            </View>
          <ScrollView style={styles.godPageBody} scrollEnabled={!isDragging}>
            {/* Base Stats Section */}
            {selectedGod.baseStats && typeof selectedGod.baseStats === 'object' && Object.keys(selectedGod.baseStats).length > 0 && (
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.skinsHeader}
                  onPress={() => setBaseStatsExpanded(!baseStatsExpanded)}
                >
                  <Text style={styles.modalSectionTitle}>Base Stats</Text>
                  <Text style={styles.skinsToggleText}>
                    {baseStatsExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {baseStatsExpanded && (
                  <View style={styles.baseStatsContent}>
                    {/* Level Slider */}
                    <View style={styles.levelSliderContainer}>
                      <View style={styles.levelSliderRow}>
                        <TouchableOpacity
                          style={[styles.levelSliderButton, godLevel === 1 && styles.levelSliderButtonDisabled]}
                          onPress={() => setGodLevel(Math.max(1, godLevel - 1))}
                          disabled={godLevel === 1}
                        >
                          <Text style={styles.levelSliderButtonText}>−</Text>
                        </TouchableOpacity>
                        <View
                          ref={sliderTrackRef}
                          style={[
                            styles.levelSliderTrack,
                            isDragging && styles.levelSliderTrackActive
                          ]}
                          onLayout={(event) => {
                            const { width, x, y } = event.nativeEvent.layout;
                            setSliderTrackWidth(width);
                            if (IS_WEB) {
                              // For web, we need to measure the element's position on screen
                              // Use a small delay to ensure layout is complete
                              setTimeout(() => {
                                if (sliderTrackRef.current) {
                                  try {
                                    const element = sliderTrackRef.current;
                                    if (element && typeof element.measure === 'function') {
                                      element.measure((fx, fy, fwidth, fheight, px, py) => {
                                        setSliderTrackLayout({ x: px, y: py, width: fwidth });
                                      });
                                    } else if (element && typeof element.getBoundingClientRect === 'function') {
                                      const rect = element.getBoundingClientRect();
                                      setSliderTrackLayout({ x: rect.left, y: rect.top, width: rect.width });
                                    } else {
                                      setSliderTrackLayout({ x, y, width });
                                    }
                                  } catch (e) {
                                    setSliderTrackLayout({ x, y, width });
                                  }
                                }
                              }, 0);
                            } else {
                              setSliderTrackLayout({ x, y, width });
                            }
                          }}
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
                            // Handle touch for both native and web (mobile browsers)
                            if (sliderTrackRef.current && sliderTrackWidth > 0) {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(true);
                              
                              let touchX = 0;
                              if (IS_WEB) {
                                // For web/mobile browsers
                                const touch = e.nativeEvent?.touches?.[0] || (e.nativeEvent?.changedTouches?.[0]);
                                if (touch && sliderTrackRef.current) {
                                  const rect = sliderTrackRef.current.getBoundingClientRect?.();
                                  if (rect) {
                                    touchX = touch.clientX - rect.left;
                                  } else {
                                    touchX = touch.pageX - (sliderTrackLayout.x || 0);
                                  }
                                }
                              } else {
                                // For native React Native
                                const touch = e.nativeEvent.touches[0];
                                if (touch && sliderTrackRef.current) {
                                  sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                                    touchX = touch.pageX - px;
                                    handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                                  });
                                  return; // measure is async
                                }
                              }
                              
                              if (touchX > 0 || !IS_WEB) {
                                const touch = IS_WEB ? (e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0]) : e.nativeEvent.touches[0];
                                handleSliderMove({ nativeEvent: { locationX: touchX, touches: touch ? [touch] : [] } });
                              }
                            }
                          }}
                          onTouchMove={(e) => {
                            // Handle touch for both native and web (mobile browsers)
                            // Don't require isDragging check - allow dragging immediately on move
                            if (sliderTrackRef.current && sliderTrackWidth > 0) {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(true);
                              
                              let touchX = 0;
                              if (IS_WEB) {
                                // For web/mobile browsers
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
                                // For native React Native
                                const touch = e.nativeEvent.touches[0];
                                if (touch && sliderTrackRef.current) {
                                  sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                                    touchX = touch.pageX - px;
                                    handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                                  });
                                  return; // measure is async
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
                              // Handle touch for both native and web (mobile browsers)
                              if (sliderTrackRef.current && sliderTrackWidth > 0) {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(true);
                                
                                let touchX = 0;
                                if (IS_WEB) {
                                  // For web/mobile browsers
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
                                  // For native React Native
                                  const touch = e.nativeEvent.touches[0];
                                  if (touch && sliderTrackRef.current) {
                                    sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                                      touchX = touch.pageX - px;
                                      handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                                    });
                                    return; // measure is async
                                  }
                                }
                                
                                if (touchX > 0 || !IS_WEB) {
                                  const touch = IS_WEB ? (e.nativeEvent?.touches?.[0] || e.nativeEvent?.changedTouches?.[0]) : e.nativeEvent.touches[0];
                                  handleSliderMove({ nativeEvent: { locationX: touchX, touches: touch ? [touch] : [] } });
                                }
                              }
                            }}
                            onTouchMove={(e) => {
                              // Handle touch for both native and web (mobile browsers)
                              // Don't require isDragging check - allow dragging immediately on move
                              if (sliderTrackRef.current && sliderTrackWidth > 0) {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(true);
                                
                                let touchX = 0;
                                if (IS_WEB) {
                                  // For web/mobile browsers
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
                                  // For native React Native
                                  const touch = e.nativeEvent.touches[0];
                                  if (touch && sliderTrackRef.current) {
                                    sliderTrackRef.current.measure((fx, fy, width, height, px, py) => {
                                      touchX = touch.pageX - px;
                                      handleSliderMove({ nativeEvent: { locationX: touchX, touches: [touch] } });
                                    });
                                    return; // measure is async
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
                      <Text style={styles.levelSliderLabel}>God Level: {godLevel}</Text>
                    </View>
                    {/* Stats Display */}
                    <View style={styles.baseStatsGrid}>
                      {Object.keys(baseStatsAtLevel).map((statKey) => {
                        const statValue = baseStatsAtLevel[statKey];
                        // Format stat name for display
                        const displayName = statKey
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .trim();
                        
                        // Get stat color
                        let statColor = '#94a3b8';
                        if (["MaxHealth", "Health", "HP5", "Health Regen", "HealthPerTime"].includes(statKey)) statColor = "#22c55e";
                        else if (["AttackSpeed", "AttackSpeedPercent", "BaseAttackSpeed", "BasicDamage", "Basic Attack Damage", "Basic Damage"].includes(statKey)) statColor = "#f97316";
                        else if (["PhysicalProtection", "Penetration", "Physical Protection"].includes(statKey)) statColor = "#ef4444";
                        else if (statKey === "Intelligence" || statKey === "MagicalPower") statColor = "#a855f7";
                        else if (statKey === "Strength") statColor = "#facc15";
                        else if (statKey === "Cooldown Rate" || statKey === "Cooldown") statColor = "#0ea5e9";
                        else if (statKey === "MagicalProtection" || statKey === "Magical Protection") statColor = "#a855f7";
                        else if (statKey === "Lifesteal") statColor = "#84cc16";
                        else if (["MaxMana", "MP5", "Mana Regen", "Mana", "Mana Regeneration", "Magical Protection", "ManaPerTime"].includes(statKey)) statColor = "#3b82f6";
                        else if (statKey === "MovementSpeed" || statKey === "Movement Speed") statColor = "#8b5cf6";
                        
                        return (
                          <View key={statKey} style={styles.baseStatItem}>
                            <Text style={[styles.baseStatLabel, { color: statColor }]}>
                              {displayName}:
                            </Text>
                            <Text style={styles.baseStatValue}>
                              {statValue}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
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
                      const skinImage = getSkinImage(skinPath);
                      
                      if (skinImage) {
                        // Handle both single URI and primary/fallback object
                        const imageSource = skinImage.primary || skinImage;
                        const fallbackSource = skinImage.fallback;
                        const skinKey = `skin-detail-${selectedSkin}-${skinPath}`;
                        const useFallback = failedItemIcons[skinKey];
                        
                        if (fallbackSource && !useFallback) {
                          // Has fallback - try primary first, then fallback on error
                          return (
                            <Image
                              key={`skin-${selectedSkin}-${skinPath}`}
                              source={imageSource}
                              style={styles.selectedSkinImage}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              transition={200}
                              accessibilityLabel={`${selectedGod.skins[selectedSkin].name || selectedSkin} skin image`}
                              onError={() => {
                                setFailedItemIcons(prev => ({ ...prev, [skinKey]: true }));
                              }}
                            />
                          );
                        }
                        
                        if (fallbackSource && useFallback) {
                          // Use fallback after primary failed
                          return (
                            <Image
                              key={`skin-${selectedSkin}-${skinPath}`}
                              source={fallbackSource}
                              style={styles.selectedSkinImage}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              transition={200}
                              accessibilityLabel={`${selectedGod.skins[selectedSkin].name || selectedSkin} skin image`}
                            />
                          );
                        }
                        
                        // Single URI - use directly
                        return (
                          <Image
                            key={`skin-${selectedSkin}-${skinPath}`}
                            source={imageSource}
                            style={styles.selectedSkinImage}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={200}
                            accessibilityLabel={`${selectedGod.skins[selectedSkin].name || selectedSkin} skin image`}
                          />
                        );
                      }
                      
                      return null;
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
                              return <Image source={localIcon} style={styles.abilityIconCompact} contentFit="cover" cachePolicy="memory-disk" transition={200} accessibilityLabel={`${abilityName} ability icon`} />;
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
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
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
      })() : selectedMechanic && selectedTab === 'mechanics' ? (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
        >
          <View style={styles.detailContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedMechanic(null)}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedMechanic.name}</Text>
              {selectedMechanic.category && (
                <Text style={styles.detailSubtitle}>
                  Category: {gameplayMechanics.subcategories.find(c => c.id === selectedMechanic.category)?.name || selectedMechanic.category}
                </Text>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Description</Text>
              <Text style={styles.detailDescription}>
                {selectedMechanic.description || 'No description available.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : selectedGameMode && selectedTab === 'gamemodes' ? (
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
                      infamy: !conquestSectionsExpanded.infamy
                    })}
                  >
                    <Text style={styles.detailSectionTitle}>Infamy System</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.infamy ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.infamy && (
                    <>
                      <Text style={styles.detailBodyText}>
                        The Infamy System is a new way to track your progress in Conquest. It is a 20-level system that you can gain by completing objectives and killing enemies.
                      </Text>
                      
                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>How Infamy Works</Text>
                        <Text style={styles.detailBodyText}>
                          Each team now gains infamy with every jungle creature they defeat. Fire Giant and Gold Fury are excluded. Gaining Infamy levels up jungle camps on your side of the map, yielding better rewards when killing them. Killing camps on your opponent's side also denies the enemy team of that Infamy.
                        </Text>
                        <Text style={styles.detailBodyText}>
                          Each creature falls into a specific category that rewards different amounts of Infamy. Upon reaching a new Infamy level, the jungle camp will increase in Infamy rank and start granting new rewards.
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Infamy Rewards:</Text>
                        <Text style={styles.detailBodyText}>
                          Large creatures grant 40 Infamy.{'\n'}
                          Small creatures grant 15 Infamy.{'\n'}
                          Very small creatures grant 5 Infamy.
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Current level thresholds are:</Text>
                        <Text style={styles.detailBodyText}>
                          Level 1: 140 Infamy{'\n'}
                          Level 2: 490 Infamy{'\n'}
                          Level 3: 910 Infamy
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
                    <Text style={styles.detailSectionTitle}>Moonlight Phase</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.jungle ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.jungle && (
                    <>
                      <Text style={styles.detailBodyText}>
                        Conquest now alternates between "normal" Conquest and a special phase called the Moonlight Phase at regular intervals during the match.
                      </Text>
                      <Text style={styles.detailBodyText}>
                        The Moonlight Phase features visual changes to the map, plus unique objectives and rewards that only spawn during this phase.
                      </Text>
                      <Text style={styles.detailBodyText}>
                        Matches start in the normal phase until the 6 minute mark when the map transitions to the Moonlight Phase. The Moonlight Phase lasts for 3 minutes before returning to normal. This cycle repeats until the end of the match.
                      </Text>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Moonlight Phase</Text>
                        <Text style={styles.detailBodyText}>
                          During the Moonlight phase, each team competes to gather Moonlight Shards. For every Shard your team collects, each team member gets +1 Gold at the end of the phase.
                        </Text>
                        <Text style={styles.detailBodyText}>
                          If you collect more Shards than the enemy team, you'll also spawn a single wave of Naga lane pushers in all 3 lanes.
                        </Text>
                        <Text style={styles.detailBodyText}>
                          Furthermore, if your team reaches the maximum number of 100 Shards before the phase ends, your team will be rewarded with a consumable item: Ritual of the Full Moon.
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Moonlight Shards</Text>
                        <Text style={styles.detailBodyText}>
                          Each Shard picked up adds +1 to your team's total Moonlight Shard count. Shards can be collected from 3 different sources:
                        </Text>
                        <Text style={styles.detailBodyText}>
                          • By destroying Moonlight Crystals that spawn during the phase{'\n'}
                          {'  '}Drops up to 5 Shards{'\n'}
                          • By slaying enemy Gods{'\n'}
                          {'  '}Grants 5 Shards{'\n'}
                          • By controlling the Moonlight Ritual site at the center of the map{'\n'}
                          {'  '}Drops 1 Shard per second while under your control, or faster with more allied Gods at the site
                        </Text>
                        <Text style={styles.detailBodyText}>
                          On Pickup: Rewards +12 XP and heals for 1.5% Max Health. (Shards picked up from the Ritual site do not grant the healing portion)
                        </Text>
                        <Text style={styles.detailBodyText}>
                          The number of Shards you personally collect is displayed on the buff bar, and determines the strength of the Ritual of the Full Moon's buff effect.
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Moonlight Crystals</Text>
                        <Text style={styles.detailBodyText}>
                          Spawn at various locations across the map at the start of the Moonlight phase. These can be attacked or interacted with to drop up to 5 Shards. Respawn 30 seconds after destroyed.
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Moonlight Ritual Site</Text>
                        <Text style={styles.detailBodyText}>
                          This capture point at the center of the map unlocks 90 seconds into the Moonlight Phase. Gain control over the site by standing in it with no enemy Gods present. While under your control, the Ritual site rains down a constant stream of Moonlight Shards.
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Naga Lane Pushers</Text>
                        <Text style={styles.detailBodyText}>
                          Spawn with the next minion wave at the end of the Moonlight Phase for the team that collected more Moonlight Shards. The minions in this wave are Champion Minions with +10% Damage Mitigation.
                        </Text>
                        <Text style={styles.detailBodyText}>
                          Stats (base + per Level scaling every 3 minutes):{'\n'}
                          Max Health: 2000 (+250){'\n'}
                          Strength: 40 (+8){'\n'}
                          Physical Protection: 30 (+3){'\n'}
                          Magical Protection: 20 (+3){'\n'}
                          XP Reward: 20 (+3){'\n'}
                          Gold Reward: 10 (+1)
                        </Text>
                      </View>

                      <View style={styles.detailSubsection}>
                        <Text style={styles.detailSubsectionTitle}>Ritual of the Full Moon</Text>
                        <Text style={styles.detailBodyText}>
                          This reward pickup spawns at the Ritual Site for the team that reaches 100 Shards. Can be stolen after 10s.
                        </Text>
                        <Text style={styles.detailBodyText}>
                          Picking it up grants you the Ritual of the Full Moon consumable item, which can be used to activate a team Ritual effect for 30s.
                        </Text>
                        <Text style={styles.detailBodyText}>
                          On Consume:{'\n'}
                          • For allies: Convert all Shards personally carried by your teammates into a Movement Speed buff for 30s. Grants +5% Movement Speed plus more for each Shard{'\n'}
                          • Reveal all enemy Gods for 5s and summon a Star Strike at their location{'\n'}
                          • Star Strikes deal 0.75% of Max Health per victim's level as Magical Damage after a 0.5s warm-up{'\n'}
                          • Gods hit by Star Strikes are revealed for an additional 5s
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
                        <Image source={towerIcons['Tower']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={styles.detailListBold}>Towers:</Text> Each lane is protected by two formidable towers that provide vision and attack the player if they are in range.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={phoenixIcons['Phoenix']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={styles.detailListBold}>Phoenixes:</Text> The final bastion of defense in each lane. Destroying a Phoenix supercharges your lane's minions into a fiery onslaught and is required before the Titan can be harmed.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={titanIcons['Titan']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={styles.detailListBold}>The Titan:</Text> The heart of the base. A powerful boss in its own right, it will defend itself fiercely. The first team to destroy the enemy Titan claims victory.</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Minions: Levels Every 3 Minutes</Text>
                    <Text style={styles.detailBodyText}>
                      Minions level up every 3 minutes, increasing their stats and rewards. Adjust the level below to see values at different stages:
                    </Text>
                    
                    <View style={styles.campLevelControls}>
                      <TouchableOpacity
                        style={[styles.campLevelButton, minionLevel === 0 && styles.campLevelButtonDisabled]}
                        onPress={() => setMinionLevel(Math.max(0, minionLevel - 1))}
                        disabled={minionLevel === 0}
                      >
                        <Text style={[styles.campLevelButtonText, minionLevel === 0 && styles.campLevelButtonTextDisabled]}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.campLevelDisplay}>
                        <Text style={styles.campLevelLabel}>Level: {minionLevel}</Text>
                        <Text style={styles.campLevelTime}>{minionLevel * 3}:00</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.campLevelButton, minionLevel === 10 && styles.campLevelButtonDisabled]}
                        onPress={() => setMinionLevel(Math.min(10, minionLevel + 1))}
                        disabled={minionLevel === 10}
                      >
                        <Text style={[styles.campLevelButtonText, minionLevel === 10 && styles.campLevelButtonTextDisabled]}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Melee Minion */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedMinions({
                          ...expandedMinions,
                          'melee': !expandedMinions['melee']
                        })}
                      >
                        <Text style={styles.detailCampName}>Melee Minion</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedMinions['melee'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedMinions['melee'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{48 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(18 + (0.25 * minionLevel)).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{500 + (25 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{14 + (6 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{16 + (2 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Ranged Minion */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedMinions({
                          ...expandedMinions,
                          'ranged': !expandedMinions['ranged']
                        })}
                      >
                        <Text style={styles.detailCampName}>Ranged Minion</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedMinions['ranged'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedMinions['ranged'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{28 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(12 + (0.25 * minionLevel)).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{250 + (25 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{8 + (4 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{34 + (4 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>0.55</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Minotaur */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedMinions({
                          ...expandedMinions,
                          'minotaur': !expandedMinions['minotaur']
                        })}
                      >
                        <Text style={styles.detailCampName}>Minotaur</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedMinions['minotaur'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedMinions['minotaur'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{70 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{66 + (1 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{800 + (100 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{18 + (6 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{120 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Brute */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedMinions({
                          ...expandedMinions,
                          'brute': !expandedMinions['brute']
                        })}
                      >
                        <Text style={styles.detailCampName}>Brute</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedMinions['brute'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedMinions['brute'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{48 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(18 + (0.25 * minionLevel)).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>750</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Fire Melee Minion */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedMinions({
                          ...expandedMinions,
                          'fire-melee': !expandedMinions['fire-melee']
                        })}
                      >
                        <Text style={styles.detailCampName}>Fire Melee Minion</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedMinions['fire-melee'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedMinions['fire-melee'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{50 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(18 + (0.25 * minionLevel)).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{700 + (25 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{28 + (6 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{32 + (4 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Fire Ranged Minion */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedMinions({
                          ...expandedMinions,
                          'fire-ranged': !expandedMinions['fire-ranged']
                        })}
                      >
                        <Text style={styles.detailCampName}>Fire Ranged Minion</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedMinions['fire-ranged'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedMinions['fire-ranged'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{30 + (5 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(12 + (0.25 * minionLevel)).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{500 + (25 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{20 + (4 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{68 + (4 * minionLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>0.55</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Jungle Bosses: Levels Every 3 Minutes</Text>
                    <Text style={styles.detailBodyText}>
                      Jungle bosses level up every 3 minutes, increasing their stats and rewards. Adjust the level below to see values at different stages:
                    </Text>
                    
                    <View style={styles.campLevelControls}>
                      <TouchableOpacity
                        style={[styles.campLevelButton, bossLevel === 0 && styles.campLevelButtonDisabled]}
                        onPress={() => setBossLevel(Math.max(0, bossLevel - 1))}
                        disabled={bossLevel === 0}
                      >
                        <Text style={[styles.campLevelButtonText, bossLevel === 0 && styles.campLevelButtonTextDisabled]}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.campLevelDisplay}>
                        <Text style={styles.campLevelLabel}>Level: {bossLevel}</Text>
                        <Text style={styles.campLevelTime}>{bossLevel * 3}:00</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.campLevelButton, bossLevel === 40 && styles.campLevelButtonDisabled]}
                        onPress={() => setBossLevel(Math.min(40, bossLevel + 1))}
                        disabled={bossLevel === 40}
                      >
                        <Text style={[styles.campLevelButtonText, bossLevel === 40 && styles.campLevelButtonTextDisabled]}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Naga */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedBosses({
                          ...expandedBosses,
                          'naga': !expandedBosses['naga']
                        })}
                      >
                        <Text style={styles.detailCampName}>Naga</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedBosses['naga'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedBosses['naga'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{50 + (5 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{75 + (6 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(2250 + (100 * bossLevel), 10000)} (Cap @ 10000)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(27 + (3 * bossLevel), 100)} (Cap @ 100)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{40 + (8 * bossLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>400</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>40</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Pyromancer */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedBosses({
                          ...expandedBosses,
                          'pyromancer': !expandedBosses['pyromancer']
                        })}
                      >
                        <Text style={styles.detailCampName}>Pyromancer</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedBosses['pyromancer'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedBosses['pyromancer'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{50 + (5 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{75 + (6 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(2250 + (100 * bossLevel), 10000)} (Cap @ 10000)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(27 + (3 * bossLevel), 100)} (Cap @ 100)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{40 + (8 * bossLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>400</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>40</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Gold Fury */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedBosses({
                          ...expandedBosses,
                          'gold-fury': !expandedBosses['gold-fury']
                        })}
                      >
                        <Text style={styles.detailCampName}>Gold Fury</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedBosses['gold-fury'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedBosses['gold-fury'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{60 + (5 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{156 + (6 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(2750 + (100 * bossLevel), 11000)} (Cap @ 11000)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(30 + (3 * bossLevel), 120)} (Cap @ 120)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{67 + (8 * bossLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>450</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>40</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Ancient Fury */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedBosses({
                          ...expandedBosses,
                          'ancient-fury': !expandedBosses['ancient-fury']
                        })}
                      >
                        <Text style={styles.detailCampName}>Ancient Fury</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedBosses['ancient-fury'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedBosses['ancient-fury'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{60 + (5 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{156 + (6 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(3200 + (100 * bossLevel), 12500)} (Cap @ 12500)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(30 + (3 * bossLevel), 120)} (Cap @ 120)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{80 + (8 * bossLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>450</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>40</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Fire Giant */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedBosses({
                          ...expandedBosses,
                          'fire-giant': !expandedBosses['fire-giant']
                        })}
                      >
                        <Text style={styles.detailCampName}>Fire Giant</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedBosses['fire-giant'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedBosses['fire-giant'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{200 + (5 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{180 + (6 * bossLevel)} (Global)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(6300 + (100 * bossLevel), 16500)} (Cap @ 16500)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{Math.min(48 + (4 * bossLevel), 150)} (Cap @ 150)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>120 str, 60 int + (8 per level)</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>0</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>40</Text>
                        </View>
                      </View>
                      )}
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
                      jungleCamps: !conquestSectionsExpanded.jungleCamps
                    })}
                  >
                    <Text style={styles.detailSectionTitle}>Jungle Camps</Text>
                    <Text style={styles.detailSectionToggle}>
                      {conquestSectionsExpanded.jungleCamps ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  {conquestSectionsExpanded.jungleCamps && (
                    <>
                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Jungle Buffs: Gain the Advantage</Text>
                    <View style={styles.detailList}>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Caustic']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Caustic'] }]}>Red Buff (Caustic):</Text> Attacks and abilities apply poison that deals 2.5% of Max Health over 3 seconds.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Primal']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Primal'] }]}>Blue Buff (Primal):</Text> Gain +5 Mana Regeneration.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Inspiration']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Inspiration'] }]}>Purple Buff (Inspiration):</Text> Gain +4 Strength and Intelligence, once per ability hit or basic attack hit. Max 5 stacks.</Text>
                      </View>
                      <View style={styles.detailListItem}>
                        <Image source={buffIcons['Pathfinder']} style={styles.detailListItemIcon} contentFit="contain" cachePolicy="memory-disk" />
                        <Text style={styles.detailListItemText}>• <Text style={[styles.detailListBold, { color: buffColors['Pathfinder'] }]}>Yellow Buff (Pathfinder):</Text> Gain +10% Movement Speed. Recover 10% of the monster's health as healing and restore 25 mana.</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSubsection}>
                    <Text style={styles.detailSubsectionTitle}>Jungle Camps: Levels Every 3 Minutes</Text>
                    <Text style={styles.detailBodyText}>
                      Jungle camps level up every 3 minutes, increasing their stats and rewards. Adjust the level below to see values at different stages:
                    </Text>
                    
                    <View style={styles.campLevelControls}>
                      <TouchableOpacity
                        style={[styles.campLevelButton, campLevel === 0 && styles.campLevelButtonDisabled]}
                        onPress={() => setCampLevel(Math.max(0, campLevel - 1))}
                        disabled={campLevel === 0}
                      >
                        <Text style={[styles.campLevelButtonText, campLevel === 0 && styles.campLevelButtonTextDisabled]}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.campLevelDisplay}>
                        <Text style={styles.campLevelLabel}>Level: {campLevel}</Text>
                        <Text style={styles.campLevelTime}>{campLevel * 3}:00</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.campLevelButton, campLevel === 10 && styles.campLevelButtonDisabled]}
                        onPress={() => setCampLevel(Math.min(10, campLevel + 1))}
                        disabled={campLevel === 10}
                      >
                        <Text style={[styles.campLevelButtonText, campLevel === 10 && styles.campLevelButtonTextDisabled]}>+</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Alpha Monster (Buff Camp) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'alpha-buff': !expandedCamps['alpha-buff']
                        })}
                      >
                        <Text style={styles.detailCampName}>Alpha Monster (Buff Camp)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['alpha-buff'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['alpha-buff'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{86 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(56 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{975 + (133 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{26 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{15 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Small Monster (Buff Camp) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'small-buff': !expandedCamps['small-buff']
                        })}
                      >
                        <Text style={styles.detailCampName}>Small Monster (Buff Camp)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['small-buff'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['small-buff'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{29 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(19.5 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{208 + (60 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{14 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{16 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Alpha Monster (Mid Camp) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'alpha-mid': !expandedCamps['alpha-mid']
                        })}
                      >
                        <Text style={styles.detailCampName}>Alpha Monster (Mid Camp)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['alpha-mid'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['alpha-mid'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{86 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(56 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{675 + (133 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{18 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{15 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Small Monster (Mid Camp) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'small-mid': !expandedCamps['small-mid']
                        })}
                      >
                        <Text style={styles.detailCampName}>Small Monster (Mid Camp)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['small-mid'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['small-mid'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{29 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(19.5 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{160 + (60 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{8 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{8 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Cyclops Warrior */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'cyclops': !expandedCamps['cyclops']
                        })}
                      >
                        <Text style={styles.detailCampName}>Cyclops Warrior</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['cyclops'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['cyclops'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{86 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(56 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{702 + (140 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{19 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{15 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Cyclops Warrior (Small) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'cyclops-small': !expandedCamps['cyclops-small']
                        })}
                      >
                        <Text style={styles.detailCampName}>Cyclops Warrior (Small)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['cyclops-small'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['cyclops-small'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{29 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(19 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{208 + (60 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{12 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{8 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Oracle */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'oracle': !expandedCamps['oracle']
                        })}
                      >
                        <Text style={styles.detailCampName}>Oracle</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['oracle'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['oracle'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{86 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(57 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{675 + (133 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{18 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{15 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Scorpion */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'scorpion': !expandedCamps['scorpion']
                        })}
                      >
                        <Text style={styles.detailCampName}>Scorpion</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['scorpion'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['scorpion'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{146 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(110 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{1350 + (133 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{26 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{45 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Rogue Cyclops */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'rogue-cyclops': !expandedCamps['rogue-cyclops']
                        })}
                      >
                        <Text style={styles.detailCampName}>Rogue Cyclops</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['rogue-cyclops'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['rogue-cyclops'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>0</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{45 + (5 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{702 + (140 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{19 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{12 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Rogue Cyclops (Small) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'rogue-cyclops-small': !expandedCamps['rogue-cyclops-small']
                        })}
                      >
                        <Text style={styles.detailCampName}>Rogue Cyclops (Small)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['rogue-cyclops-small'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['rogue-cyclops-small'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>0</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{7 + (5 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{208 + (60 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{12 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{8 + (3 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Elder Harpy */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'elder-harpy': !expandedCamps['elder-harpy']
                        })}
                      >
                        <Text style={styles.detailCampName}>Elder Harpy</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['elder-harpy'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['elder-harpy'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{72 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(33 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{619 + (75 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{21 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{15 + (2 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Harpy */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'harpy': !expandedCamps['harpy']
                        })}
                      >
                        <Text style={styles.detailCampName}>Harpy</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['harpy'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['harpy'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{12 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(5 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{188 + (45 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{9 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{5 + (2 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Roaming Harpy */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'roaming-harpy': !expandedCamps['roaming-harpy']
                        })}
                      >
                        <Text style={styles.detailCampName}>Roaming Harpy</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['roaming-harpy'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['roaming-harpy'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{50 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(20 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{536 + (75 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{21 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{15 + (2 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Elder Harpy (Side) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'elder-harpy-side': !expandedCamps['elder-harpy-side']
                        })}
                      >
                        <Text style={styles.detailCampName}>Elder Harpy (Side)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['elder-harpy-side'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['elder-harpy-side'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{29 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(10 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{412 + (75 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{14 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{20 + (2 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>

                    {/* Harpy (Side) */}
                    <View style={styles.detailCampCard}>
                      <TouchableOpacity
                        style={styles.detailCampHeader}
                        onPress={() => setExpandedCamps({
                          ...expandedCamps,
                          'harpy-side': !expandedCamps['harpy-side']
                        })}
                      >
                        <Text style={styles.detailCampName}>Harpy (Side)</Text>
                        <Text style={styles.detailCampToggle}>
                          {expandedCamps['harpy-side'] ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      {expandedCamps['harpy-side'] && (
                      <View style={styles.detailCampStats}>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>XP Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{7 + (9 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Gold Reward:</Text>
                          <Text style={styles.detailCampStatValue}>{(2 + (0.5 * campLevel)).toFixed(1)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Health:</Text>
                          <Text style={styles.detailCampStatValue}>{100 + (45 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Protections:</Text>
                          <Text style={styles.detailCampStatValue}>{6 + (1 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Power:</Text>
                          <Text style={styles.detailCampStatValue}>{5 + (2 * campLevel)}</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Movement Speed:</Text>
                          <Text style={styles.detailCampStatValue}>325</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Attack Speed:</Text>
                          <Text style={styles.detailCampStatValue}>1</Text>
                        </View>
                        <View style={styles.detailCampStatRow}>
                          <Text style={styles.detailCampStatLabel}>Max Level:</Text>
                          <Text style={styles.detailCampStatValue}>10</Text>
                        </View>
                      </View>
                      )}
                    </View>
                  </View>
                    </>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Interactive Map</Text>
                  <Text style={styles.detailBodyText}>
                    Explore the Conquest map with this interactive tool. Click on structures, objectives, and jungle camps to learn more about them.
                  </Text>
                  <Suspense fallback={<ActivityIndicator size="large" color="#1e90ff" style={{ margin: 20 }} />}>
                    <ConquestMap />
                  </Suspense>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView ref={scrollViewRef} style={styles.content}>
          {selectedTab === 'gods' ? (
            <View style={styles.grid}>
              {filteredGods.map((god, idx) => {
                const name = (god.name || god.GodName || god.title || god.displayName || 'Unknown').toString();
                const godIcon = (god.icon || god.GodIcon || (god.abilities && god.abilities.A01 && god.abilities.A01.icon)) || null;
                const uniqueKey = name + (god.GodName || god.name || idx);
                
                // Responsive width calculation - works for both web and mobile
                const cardWidthStyle = (() => {
                  if (SCREEN_WIDTH >= 1400) {
                    return IS_WEB 
                      ? { position: 'relative', width: 'calc(16.666% - 8.34px)', minWidth: 140, maxWidth: 160 } // 6 per row
                      : { position: 'relative', width: '16%', minWidth: 140 }; // 6 per row
                  } else if (SCREEN_WIDTH >= 1100) {
                    return IS_WEB
                      ? { position: 'relative', width: 'calc(20% - 8px)', minWidth: 130, maxWidth: 150 } // 5 per row
                      : { position: 'relative', width: '19%', minWidth: 130 }; // 5 per row
                  } else if (SCREEN_WIDTH >= 768) {
                    return IS_WEB
                      ? { position: 'relative', width: 'calc(25% - 7.5px)', minWidth: 120, maxWidth: 140 } // 4 per row
                      : { position: 'relative', width: '24%', minWidth: 120 }; // 4 per row
                  } else {
                    // Mobile: 3 per row for all mobile screens
                    // Calculate width accounting for gap (12px * 2 gaps = 24px) and padding (20px * 2 = 40px)
                    const padding = 40; // 20px on each side
                    const gaps = 24; // 12px gap * 2 gaps for 3 items
                    const availableWidth = SCREEN_WIDTH - padding;
                    const itemWidth = (availableWidth - gaps) / 3;
                    const itemWidthPercent = (itemWidth / SCREEN_WIDTH) * 100;
                    
                    return IS_WEB
                      ? { position: 'relative', width: 'calc(33.333% - 6.67px)', minWidth: 100, maxWidth: 130 } // 3 per row
                      : { position: 'relative', width: `${itemWidthPercent}%`, minWidth: Math.max(itemWidth - 5, 90), flex: 0, maxWidth: itemWidth + 5 }; // 3 per row - calculated width
                  }
                })();
                
                return (
                  <View key={uniqueKey} style={cardWidthStyle}>
                    <TouchableOpacity
                      style={[styles.card, showGodSkins && styles.cardWithSkin]}
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
                      {/* Patch indicator badge */}
                      {god.latestPatchChange && (
                        <PatchBadgeTooltip
                          changeType={god.latestPatchChange.type}
                          version={god.latestPatchChange.version || 'latest'}
                          entityType="god"
                          badgeStyle={[styles.patchBadge, styles[`patchBadge${god.latestPatchChange.type.charAt(0).toUpperCase() + god.latestPatchChange.type.slice(1)}`]]}
                          textStyle={styles.patchBadgeText}
                          overlayStyle={styles.tooltipOverlay}
                          contentStyle={styles.tooltipContent}
                          tooltipTextStyle={styles.tooltipText}
                          closeButtonStyle={styles.tooltipCloseButton}
                          closeTextStyle={styles.tooltipCloseText}
                        />
                      )}
                      {/* Pin button */}
                      <TouchableOpacity
                        style={styles.godPinButton}
                        onPress={async (e) => {
                          e.stopPropagation();
                          if (!currentUser) {
                            Alert.alert('Not Logged In', 'Please log in to your profile to pin gods.');
                            return;
                          }
                          
                          const godName = god.name || god.GodName || god.title || god.displayName;
                          const isPinned = pinnedGods.has(godName);
                          
                          try {
                            const pinnedGodsData = await storage.getItem(`pinnedGods_${currentUser}`);
                            const pinnedGodsList = pinnedGodsData ? JSON.parse(pinnedGodsData) : [];
                            
                            if (isPinned) {
                              const updated = pinnedGodsList.filter(g => (g.name || g.GodName) !== godName);
                              await storage.setItem(`pinnedGods_${currentUser}`, JSON.stringify(updated));
                              setPinnedGods(prev => {
                                const next = new Set(prev);
                                next.delete(godName);
                                return next;
                              });
                            } else {
                              pinnedGodsList.push({
                                name: god.name || god.GodName,
                                GodName: god.GodName,
                                internalName: god.internalName,
                                icon: god.icon || god.GodIcon,
                              });
                              await storage.setItem(`pinnedGods_${currentUser}`, JSON.stringify(pinnedGodsList));
                              setPinnedGods(prev => new Set(prev).add(godName));
                            }
                          } catch (error) {
                            Alert.alert('Error', 'Failed to pin/unpin god. Please try again.');
                          }
                        }}
                      >
                        <Text style={styles.godPinButtonText}>
                          {pinnedGods.has(god.name || god.GodName || god.title || god.displayName) ? '📌' : '📍'}
                        </Text>
                      </TouchableOpacity>
                    {showGodSkins && god.skins && typeof god.skins === 'object' && Object.keys(god.skins).length > 0 ? (() => {
                      // Find base/default skin - look for "default" or "base" type, or use first skin
                      let baseSkin = null;
                      let baseSkinKey = null;
                      
                      // First, try to find a skin with type "default" or "base"
                      for (const [key, skin] of Object.entries(god.skins)) {
                        if (skin.type && (skin.type.toLowerCase() === 'default' || skin.type.toLowerCase() === 'base')) {
                          baseSkin = skin;
                          baseSkinKey = key;
                          break;
                        }
                      }
                      
                      // If no default/base found, use the first skin
                      if (!baseSkin) {
                        const firstKey = Object.keys(god.skins)[0];
                        baseSkin = god.skins[firstKey];
                        baseSkinKey = firstKey;
                      }
                      
                      if (baseSkin && baseSkin.skin) {
                        const skinImage = getSkinImage(baseSkin.skin);
                        if (skinImage) {
                          // Handle both single URI and primary/fallback object
                          const imageSource = skinImage.primary || skinImage;
                          const fallbackSource = skinImage.fallback;
                          const skinKey = `god-card-${name}-${baseSkinKey}`;
                          const useFallback = failedItemIcons[skinKey];
                          
                          if (fallbackSource && !useFallback) {
                            // Has fallback - try primary first, then fallback on error
                            return (
                              <Image 
                                source={imageSource}
                                style={[styles.cardIcon, styles.cardIconSkin]}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                transition={200}
                                onError={() => {
                                  setFailedItemIcons(prev => ({ ...prev, [skinKey]: true }));
                                }}
                              />
                            );
                          }
                          
                          if (fallbackSource && useFallback) {
                            // Use fallback after primary failed
                            return (
                              <Image 
                                source={fallbackSource}
                                style={[styles.cardIcon, styles.cardIconSkin]}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                transition={200}
                              />
                            );
                          }
                          
                          // Single URI - use directly
                          return (
                            <Image 
                              source={imageSource}
                              style={[styles.cardIcon, styles.cardIconSkin]}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              transition={200}
                            />
                          );
                        }
                      }
                      
                      // Fallback to icon if skin not available
                      const localIcon = godIcon ? getLocalGodAsset(godIcon) : null;
                      if (localIcon) {
                        return (
                          <Image 
                            source={localIcon} 
                            style={styles.cardIcon}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            accessibilityLabel={`${name} icon`}
                          />
                        );
                      }
                      return (
                        <View style={styles.cardIconFallback}>
                          <Text style={styles.cardIconFallbackText}>{name.charAt(0)}</Text>
                        </View>
                      );
                    })() : godIcon ? (() => {
                      const localIcon = getLocalGodAsset(godIcon);
                      if (localIcon) {
                        return (
                          <Image 
                            source={localIcon} 
                            style={styles.cardIcon}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            accessibilityLabel={`${name} icon`}
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
                  </View>
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
                
                // Responsive width calculation - works for both web and mobile
                const cardWidthStyle = (() => {
                  if (SCREEN_WIDTH >= 1400) {
                    return IS_WEB 
                      ? { position: 'relative', width: 'calc(16.666% - 8.34px)', minWidth: 140, maxWidth: 160 } // 6 per row
                      : { position: 'relative', width: '16%', minWidth: 140 }; // 6 per row
                  } else if (SCREEN_WIDTH >= 1100) {
                    return IS_WEB
                      ? { position: 'relative', width: 'calc(20% - 8px)', minWidth: 130, maxWidth: 150 } // 5 per row
                      : { position: 'relative', width: '19%', minWidth: 130 }; // 5 per row
                  } else if (SCREEN_WIDTH >= 768) {
                    return IS_WEB
                      ? { position: 'relative', width: 'calc(25% - 7.5px)', minWidth: 120, maxWidth: 140 } // 4 per row
                      : { position: 'relative', width: '24%', minWidth: 120 }; // 4 per row
                  } else {
                    // Mobile: 3 per row for all mobile screens
                    // Calculate width accounting for gap (12px * 2 gaps = 24px) and padding (20px * 2 = 40px)
                    const padding = 40; // 20px on each side
                    const gaps = 24; // 12px gap * 2 gaps for 3 items
                    const availableWidth = SCREEN_WIDTH - padding;
                    const itemWidth = (availableWidth - gaps) / 3;
                    const itemWidthPercent = (itemWidth / SCREEN_WIDTH) * 100;
                    
                    return IS_WEB
                      ? { position: 'relative', width: 'calc(33.333% - 6.67px)', minWidth: 100, maxWidth: 130 } // 3 per row
                      : { position: 'relative', width: `${itemWidthPercent}%`, minWidth: Math.max(itemWidth - 5, 90), flex: 0, maxWidth: itemWidth + 5 }; // 3 per row - calculated width
                  }
                })();
                
                return (
                  <View key={uniqueKey} style={cardWidthStyle}>
                    <TouchableOpacity
                      style={styles.card}
                      onPress={() => setSelectedItem(item)}
                    >
                    {/* Patch indicator badge */}
                    {item.latestPatchChange && (
                      <PatchBadgeTooltip
                        changeType={item.latestPatchChange.type}
                        version={item.latestPatchChange.version || 'latest'}
                        entityType="item"
                        badgeStyle={[styles.patchBadge, styles[`patchBadge${item.latestPatchChange.type.charAt(0).toUpperCase() + item.latestPatchChange.type.slice(1)}`]]}
                        textStyle={styles.patchBadgeText}
                        overlayStyle={styles.tooltipOverlay}
                        contentStyle={styles.tooltipContent}
                        tooltipTextStyle={styles.tooltipText}
                        closeButtonStyle={styles.tooltipCloseButton}
                        closeTextStyle={styles.tooltipCloseText}
                      />
                    )}
                    {modIcon ? (
                      <Image 
                        source={modIcon} 
                        style={styles.cardIcon}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        accessibilityLabel={`${name} mod icon`}
                      />
                    ) : localItemIcon ? (
                      (() => {
                        // Handle both single URI and primary/fallback object
                        const imageSource = localItemIcon.primary || localItemIcon;
                        const fallbackSource = localItemIcon.fallback;
                        const itemKey = `${uniqueKey}-icon`;
                        const useFallback = failedItemIcons[itemKey];
                        
                        if (fallbackSource && !useFallback) {
                          // Has fallback - try primary first, then fallback on error
                          return (
                            <Image 
                              source={imageSource}
                              style={styles.cardIcon}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                              accessibilityLabel={`${name} item icon`}
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
                              style={styles.cardIcon}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                              accessibilityLabel={`${name} item icon`}
                            />
                          );
                        }
                        
                        // Single URI - use directly
                        return (
                          <Image 
                            source={imageSource}
                            style={styles.cardIcon}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            accessibilityLabel={`${name} item icon`}
                          />
                        );
                      })()
                    ) : consumableIcon ? (
                      <Image 
                        source={consumableIcon} 
                        style={styles.cardIcon}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                    ) : itemIcon ? (
                      <Image 
                        source={{ uri: `https://www.smitecalculator.pro${itemIcon}` }} 
                        style={styles.cardIcon}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.cardIconFallback}>
                        <Text style={styles.cardIconFallbackText}>{name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.cardText} numberOfLines={1}>{name}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : selectedTab === 'mechanics' ? (
            <View>
              <View style={styles.gamemodesIntro}>
                <Text style={styles.gamemodesIntroTitle}>Gameplay Mechanics</Text>
                <Text style={styles.gamemodesIntroText}>
                  Comprehensive guide to all gameplay mechanics, systems, and terminology in SMITE 2.{' '}
                  <Text style={styles.gamemodesIntroTextRed}>
                    All data collected from ingame and official sources like Smite 2 Wiki - TBD .
                  </Text>
                </Text>
                <Text style={styles.gamemodesIntroText}>
                  Browse by category or search for specific mechanics to learn more about how the game works.
                </Text>
              </View>
              <View style={styles.grid}>
                {filteredMechanics.map((mechanic) => {
                  const categoryName = gameplayMechanics.subcategories.find(c => c.id === mechanic.category)?.name || 'Other';
                  return (
                    <TouchableOpacity
                      key={mechanic.id}
                      style={styles.card}
                      onPress={() => {
                        setSelectedMechanic(mechanic);
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                        }, 100);
                      }}
                    >
                      <View style={styles.cardIconFallback}>
                        <Text style={styles.cardIconFallbackText}>{mechanic.name.charAt(0)}</Text>
                      </View>
                      <Text style={styles.cardText} numberOfLines={1}>{mechanic.name}</Text>
                      <Text style={[styles.cardText, { fontSize: 10, color: '#94a3b8', marginTop: 2 }]} numberOfLines={1}>
                        {categoryName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.gamemodesIntro}>
                <Text style={styles.gamemodesIntroTitle}>Game Modes</Text>
                <Text style={styles.gamemodesIntroText}>
                  Each of the Game Modes in SMITE 2 has its own play style, rules and objectives.{' '}
                  <Text style={styles.gamemodesIntroTextRed}>
                    All data collected from ingame and official sources like Smite 2 Wiki.
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
                  <View key={mode.id} style={{ width: '30%' }}>
                    <TouchableOpacity
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
                        <Image source={gameModeIcons[mode.id]} style={styles.cardIcon} contentFit="cover" cachePolicy="memory-disk" transition={200} accessibilityLabel={`${mode.name} game mode icon`} />
                      ) : (
                        <View style={styles.cardIconFallback}>
                          <Text style={styles.cardIconFallbackText}>{mode.name.charAt(0)}</Text>
                        </View>
                      )}
                      <Text style={styles.cardText} numberOfLines={1}>{mode.name}</Text>
                    </TouchableOpacity>
                  </View>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  outerScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    minHeight: '100%',
    backgroundColor: '#071024',
    paddingTop: 20,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 20,
    }),
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
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
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
    fontSize: 10,
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
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minWidth: 60,
  },
  filterButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  filterButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#031320',
  },
  filterButtonText: {
    color: '#e6eef8',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  filterButtonIcon: {
    color: '#e6eef8',
    fontSize: 8,
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
    zIndex: 10000,
    elevation: 100,
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
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    ...(IS_WEB && {
      maxWidth: '100%',
      paddingHorizontal: 10,
    }),
  },
  card: {
    width: '100%',
    backgroundColor: '#0b1226',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    position: 'relative',
  },
  cardWithSkin: {
    width: '48%',
    padding: 2,
    minHeight: 360,
    backgroundColor: '#0b1226',
    overflow: 'hidden',
    position: 'relative',
  },
  patchBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  patchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContent: {
    backgroundColor: '#0b1226',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  tooltipText: {
    color: '#e6eef8',
    fontSize: 14,
    lineHeight: 20,
  },
  tooltipCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipCloseText: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginBottom: 6,
  },
  cardIconSkin: {
    width: '100%',
    aspectRatio: 0.6,
    minHeight: 340,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 4,
    backgroundColor: '#0b1226',
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
  godPinButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 11,
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  godPinButtonText: {
    fontSize: 16,
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
  baseStatsContent: {
    marginTop: 12,
  },
  levelSliderContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  levelSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
    marginBottom: 12,
  },
  levelSliderTrack: {
    flex: 1,
    height: IS_WEB ? 12 : 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    position: 'relative',
    cursor: IS_WEB ? 'pointer' : 'default',
    transition: IS_WEB ? 'all 0.2s ease' : undefined,
    marginHorizontal: 4,
    ...(IS_WEB && {
      minHeight: 12,
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
    ...(!IS_WEB && {
      touchAction: 'none',
    }),
  },
  levelSliderTrackActive: {
    backgroundColor: '#e5e7eb',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  levelSliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#facc15',
    borderRadius: 4,
    transition: IS_WEB ? 'all 0.1s linear' : undefined,
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
    transform: [{ translateX: IS_WEB ? -14 : -12 }],
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    transition: IS_WEB ? 'all 0.1s linear' : undefined,
    zIndex: 10,
    ...(IS_WEB && {
      cursor: 'grab',
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
    ...(!IS_WEB && {
      touchAction: 'none',
    }),
  },
  levelSliderThumbDragging: {
    transform: [{ translateX: IS_WEB ? -17 : -14 }, { scale: 1.3 }],
    backgroundColor: '#fbbf24',
    borderColor: '#ffffff',
    borderWidth: 3,
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
    ...(IS_WEB && {
      cursor: 'grabbing',
    }),
  },
  levelSliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    textAlign: 'center',
  },
  baseStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  baseStatItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: '#061028',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  baseStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  baseStatValue: {
    color: '#e6eef8',
    fontSize: 18,
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
  // Full-page god detail styles
  godPageContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  godPageHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    backgroundColor: '#0b1226',
    zIndex: 10,
    elevation: 5,
    width: '100%',
    position: 'relative',
  },
  backButton: {
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#1e90ff',
    fontSize: 14,
    fontWeight: '600',
  },
  godPageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  godPageIconContainer: {
    marginRight: 10,
  },
  godPageIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  godPageIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  godPageIconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 20,
  },
  godPageTitleWrapper: {
    flex: 1,
    marginLeft: 10,
  },
  godPageTitle: {
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  godPageSubtext: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    fontStyle: 'italic',
  },
  godPageMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  godPageMetaIcon: {
    width: 12,
    height: 12,
    marginRight: 3,
  },
  godPageMetaText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  godPageRolesContainer: {
    marginTop: 4,
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
  godPageRoleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  godPageRoleIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
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
  detailCampCard: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  detailCampHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  detailCampToggle: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
  },
  detailCampName: {
    color: '#e6eef8',
    fontSize: 14,
    fontWeight: '700',
  },
  detailCampStats: {
    gap: 6,
  },
  detailCampStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  detailCampStatLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  detailCampStatValue: {
    color: '#e6eef8',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  campLevelControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  campLevelButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#3b5f8f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campLevelButtonDisabled: {
    backgroundColor: '#061028',
    borderColor: '#0f1724',
    opacity: 0.5,
  },
  campLevelButtonText: {
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
  },
  campLevelButtonTextDisabled: {
    color: '#64748b',
  },
  campLevelDisplay: {
    alignItems: 'center',
    minWidth: 100,
  },
  campLevelLabel: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  campLevelTime: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
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

