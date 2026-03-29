import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import {
  SHOP_RARITIES,
  CHALLENGES,
  SHOP_ITEM_POOL,
  DAILY_GOLD_AMOUNT,
} from '../lib/shopData';
import { fetchUserShopData, updateUserShopData, fetchLeaderboard } from '../lib/shopSupabase';
import { GOLD_ICON } from '../lib/imageGrabber';

const IS_WEB = Platform.OS === 'web';

const NAME_FX_ITEMS = SHOP_ITEM_POOL.filter((i) => i.type === 'name_fx');
const TITLE_ITEMS = SHOP_ITEM_POOL.filter((i) => i.type === 'title');
const FONT_ITEMS = SHOP_ITEM_POOL.filter((i) => i.type === 'font');

const DAILY_NAME_FX_COUNT = 18;  // 3 rows x 6 columns
const DAILY_TITLE_COUNT = 18;
const DAILY_FONT_COUNT = 18;

// Deterministic shuffle from date string so shop rotates every 24h (same date = same shop)
function seededShuffle(pool, dateString) {
  const arr = [...pool];
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) seed = (seed * 31 + dateString.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDailyShopItems(dateString) {
  return {
    nameFx: seededShuffle(NAME_FX_ITEMS, dateString).slice(0, DAILY_NAME_FX_COUNT),
    titles: seededShuffle(TITLE_ITEMS, dateString).slice(0, DAILY_TITLE_COUNT),
    fonts: seededShuffle(FONT_ITEMS, dateString).slice(0, DAILY_FONT_COUNT),
  };
}

// Font key -> fontFamily for shop card preview (matches profile PROFILE_FONT_FAMILY_MAP)
const SHOP_FONT_FAMILY_MAP = {
  serif: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  rounded: Platform.OS === 'web' ? '"Segoe UI", system-ui, sans-serif' : 'System',
  condensed: Platform.OS === 'web' ? '"Arial Narrow", Arial, sans-serif' : 'System',
  comic: Platform.OS === 'web' ? 'Comic Sans MS, cursive' : 'System',
  elegant: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'Georgia',
  royal: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  strong: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  narrow: Platform.OS === 'web' ? 'Arial Narrow, Arial, sans-serif' : 'System',
  wide: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  mono: Platform.OS === 'web' ? 'monospace' : 'System',
  mythic: Platform.OS === 'web' ? 'Georgia, "Palatino Linotype", serif' : 'Georgia',
  mystic: Platform.OS === 'web' ? 'Georgia, cursive, serif' : 'Georgia',
  oracle: Platform.OS === 'web' ? '"Times New Roman", Times, serif' : 'System',
  rune: Platform.OS === 'web' ? 'monospace, serif' : 'System',
  titan: Platform.OS === 'web' ? 'Arial Black, Impact, sans-serif' : 'System',
  celestial: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'Georgia',
  shadow: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  ancient: Platform.OS === 'web' ? '"Times New Roman", Times, serif' : 'System',
  gothic: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  script: Platform.OS === 'web' ? 'cursive, "Comic Sans MS"' : 'System',
  bold: Platform.OS === 'web' ? 'Arial Black, sans-serif' : 'System',
  light: Platform.OS === 'web' ? 'Arial, sans-serif' : 'System',
  stencil: Platform.OS === 'web' ? 'Impact, Arial Black, sans-serif' : 'System',
  retro: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  tech: Platform.OS === 'web' ? 'monospace, "Courier New"' : 'System',
  cosmic: Platform.OS === 'web' ? 'Georgia, sans-serif' : 'Georgia',
  dragon: Platform.OS === 'web' ? 'Arial Black, Impact, sans-serif' : 'System',
  phoenix: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : 'Georgia',
  olympian: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia',
  egyptian: Platform.OS === 'web' ? '"Times New Roman", serif' : 'System',
  norse: Platform.OS === 'web' ? 'Georgia, monospace, serif' : 'Georgia',
  graffiti: Platform.OS === 'web' ? '"Comic Sans MS", "Marker Felt", cursive' : 'System',
  glitch: Platform.OS === 'web' ? '"Courier New", monospace' : 'System',
  slime: Platform.OS === 'web' ? '"Comic Sans MS", cursive' : 'System',
  toxic: Platform.OS === 'web' ? '"Segoe UI", system-ui, sans-serif' : 'System',
  arcade: Platform.OS === 'web' ? '"Press Start 2P", "Courier New", monospace' : 'System',
  pixel: Platform.OS === 'web' ? '"Courier New", monospace' : 'System',
  spooky: Platform.OS === 'web' ? '"Times New Roman", "Creepster", serif' : 'System',
  agency_fb: Platform.OS === 'web' ? '"Agency FB", sans-serif' : 'System',
  algerian: Platform.OS === 'web' ? 'Algerian, serif' : 'System',
  bahnschrift: Platform.OS === 'web' ? 'Bahnschrift, system-ui, sans-serif' : 'System',
  baskerville_old: Platform.OS === 'web' ? '"Baskerville Old Face", serif' : 'Georgia',
  bauhaus: Platform.OS === 'web' ? '"Bauhaus 93", cursive' : 'System',
  bell_mt: Platform.OS === 'web' ? '"Bell MT", serif' : 'Georgia',
  berlin_sans: Platform.OS === 'web' ? '"Berlin Sans FB", sans-serif' : 'System',
  bernard: Platform.OS === 'web' ? '"Bernard MT Condensed", serif' : 'System',
  blackadder: Platform.OS === 'web' ? '"Blackadder ITC", cursive' : 'System',
  bodoni_mt: Platform.OS === 'web' ? '"Bodoni MT", serif' : 'Georgia',
  book_antiqua: Platform.OS === 'web' ? '"Book Antiqua", Palatino, serif' : 'Georgia',
  bookman_old: Platform.OS === 'web' ? '"Bookman Old Style", serif' : 'Georgia',
  bradley_hand: Platform.OS === 'web' ? '"Bradley Hand ITC", cursive' : 'System',
  britannic: Platform.OS === 'web' ? '"Britannic Bold", sans-serif' : 'System',
  broadway: Platform.OS === 'web' ? 'Broadway, serif' : 'System',
  brush_script: Platform.OS === 'web' ? '"Brush Script MT", cursive' : 'System',
  calibri: Platform.OS === 'web' ? 'Calibri, system-ui, sans-serif' : 'System',
  cambria: Platform.OS === 'web' ? 'Cambria, "Times New Roman", serif' : 'Georgia',
  castellar: Platform.OS === 'web' ? 'Castellar, serif' : 'System',
  niagara_engraved: Platform.OS === 'web' ? '"Niagara Engraved", serif' : 'System',
  niagara_solid: Platform.OS === 'web' ? '"Niagara Solid", serif' : 'System',
  old_english: Platform.OS === 'web' ? '"Old English Text MT", serif' : 'System',
  onyx: Platform.OS === 'web' ? 'Onyx, serif' : 'System',
  palace_script: Platform.OS === 'web' ? '"Palace Script MT", cursive' : 'System',
  palatino: Platform.OS === 'web' ? '"Palatino Linotype", Palatino, serif' : 'Georgia',
  papyrus: Platform.OS === 'web' ? 'Papyrus, fantasy' : 'System',
  parchment: Platform.OS === 'web' ? 'Parchment, cursive' : 'System',
  perpetua: Platform.OS === 'web' ? 'Perpetua, serif' : 'Georgia',
  playbill: Platform.OS === 'web' ? 'Playbill, serif' : 'System',
  edwardian: Platform.OS === 'web' ? '"Edwardian Script ITC", cursive' : 'System',
  elephant: Platform.OS === 'web' ? 'Elephant, serif' : 'System',
  engravers: Platform.OS === 'web' ? '"Engravers MT", serif' : 'System',
  felix: Platform.OS === 'web' ? '"Felix Titling MT", serif' : 'System',
  forte: Platform.OS === 'web' ? 'Forte, cursive' : 'System',
  franklin_book: Platform.OS === 'web' ? '"Franklin Gothic Book", sans-serif' : 'System',
  freestyle: Platform.OS === 'web' ? '"Freestyle Script", cursive' : 'System',
  french_script: Platform.OS === 'web' ? '"French Script MT", cursive' : 'System',
  gabriola: Platform.OS === 'web' ? 'Gabriola, cursive' : 'System',
  gadugi: Platform.OS === 'web' ? 'Gadugi, system-ui, sans-serif' : 'System',
  garamond: Platform.OS === 'web' ? 'Garamond, "Times New Roman", serif' : 'Georgia',
  gigi: Platform.OS === 'web' ? 'Gigi, cursive' : 'System',
  sylfaen: Platform.OS === 'web' ? 'Sylfaen, serif' : 'System',
  tempus: Platform.OS === 'web' ? '"Tempus Sans ITC", sans-serif' : 'System',
  times_new: Platform.OS === 'web' ? '"Times New Roman", serif' : 'Georgia',
  trajan: Platform.OS === 'web' ? '"Trajan Pro", serif' : 'System',
  trebuchet: Platform.OS === 'web' ? '"Trebuchet MS", sans-serif' : 'System',
  tw_cen: Platform.OS === 'web' ? '"Tw Cen MT", sans-serif' : 'System',
  verdana: Platform.OS === 'web' ? 'Verdana, Geneva, sans-serif' : 'System',
  viner: Platform.OS === 'web' ? '"Viner Hand ITC", cursive' : 'System',
  vivaldi: Platform.OS === 'web' ? 'Vivaldi, cursive' : 'System',
  vladimir: Platform.OS === 'web' ? '"Vladimir Script", cursive' : 'System',
  wide_latin: Platform.OS === 'web' ? '"Wide Latin", serif' : 'System',
};

let AnimatedProfileName = null;
function getAnimatedProfileName() {
  if (!AnimatedProfileName) {
    try {
      AnimatedProfileName = require('./profile').AnimatedProfileName;
    } catch (_) {}
  }
  return AnimatedProfileName;
}

const storage = {
  async getItem(key) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Shop storage setItem error:', e);
    }
  },
};

function getShopPrefix(username) {
  return `shop_${username || 'guest'}_`;
}

function getTodayDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function ShopPage({ currentUsername = null, onNavigateToProfile, onNavigateToWordle, onNavigateToAbility }) {
  const { width: screenWidth } = useScreenDimensions();
  const prefix = getShopPrefix(currentUsername);

  const [shopTab, setShopTab] = useState('shop'); // 'shop' | 'challenges' | 'leaderboard'
  const [shopSection, setShopSection] = useState('name_fx'); // 'name_fx' | 'fonts' | 'titles'
  const [gold, setGold] = useState(0);
  const [lastDailyClaim, setLastDailyClaim] = useState(null);
  const [ownedIds, setOwnedIds] = useState([]);
  const [challengeProgress, setChallengeProgress] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);

  const loadPersisted = useCallback(async () => {
    const fromSupabase = currentUsername ? await fetchUserShopData(currentUsername) : null;
    const [savedGold, savedLastDaily, savedOwned, savedChallenges] = await Promise.all([
      storage.getItem(prefix + 'gold'),
      storage.getItem(prefix + 'last_daily_claim'),
      storage.getItem(prefix + 'owned'),
      storage.getItem(prefix + 'challenges'),
    ]);

    const localGold = parseInt(savedGold || '0', 10);
    const localOwned = savedOwned ? JSON.parse(savedOwned) : [];
    if (fromSupabase != null) {
      setGold(fromSupabase.gold);
      setOwnedIds(Array.isArray(fromSupabase.shop_owned) ? fromSupabase.shop_owned : []);
      await storage.setItem(prefix + 'gold', String(fromSupabase.gold));
      await storage.setItem(prefix + 'owned', JSON.stringify(fromSupabase.shop_owned));
    } else {
      setGold(localGold);
      setOwnedIds(localOwned);
    }
    setLastDailyClaim(savedLastDaily || null);
    setChallengeProgress(savedChallenges ? JSON.parse(savedChallenges) : {});

    const top = await fetchLeaderboard(10);
    setLeaderboard(top);
  }, [prefix, currentUsername]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadPersisted();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [loadPersisted]);

  const persistGold = async (value) => {
    setGold(value);
    await storage.setItem(prefix + 'gold', String(value));
    if (currentUsername) await updateUserShopData(currentUsername, { newGold: value });
  };
  const persistOwned = async (ids) => {
    setOwnedIds(ids);
    await storage.setItem(prefix + 'owned', JSON.stringify(ids));
    if (currentUsername) await updateUserShopData(currentUsername, { newOwned: ids });
  };
  const persistChallenges = async (obj) => {
    setChallengeProgress(obj);
    await storage.setItem(prefix + 'challenges', JSON.stringify(obj));
  };

  const today = getTodayDateString();
  const dailyShop = getDailyShopItems(today);
  const canClaimDaily = lastDailyClaim !== today;
  const dailyGoldAmount = DAILY_GOLD_AMOUNT;
  const AnimatedName = getAnimatedProfileName();

  const handleDailyClaim = async () => {
    if (!canClaimDaily || claimingDaily) return;
    setClaimingDaily(true);
    const newGold = gold + dailyGoldAmount;
    setGold(newGold);
    await storage.setItem(prefix + 'gold', String(newGold));
    await storage.setItem(prefix + 'last_daily_claim', today);
    if (currentUsername) await updateUserShopData(currentUsername, { addGold: dailyGoldAmount, addTotalEarned: dailyGoldAmount });
    setLastDailyClaim(today);
    const newProgress = { ...challengeProgress, daily_login: today };
    await persistChallenges(newProgress);
    setClaimingDaily(false);
  };

  const handleBuy = async (item) => {
    if (ownedIds.includes(item.id)) {
      Alert.alert('Already owned', `You already own ${item.name}.`);
      return;
    }
    if (gold < item.cost) {
      Alert.alert('Not enough Gold', `You need ${item.cost} Gold. You have ${gold}.`);
      return;
    }
    const newGold = gold - item.cost;
    const newOwned = [...ownedIds, item.id];
    setGold(newGold);
    setOwnedIds(newOwned);
    await storage.setItem(prefix + 'gold', String(newGold));
    await storage.setItem(prefix + 'owned', JSON.stringify(newOwned));
    if (currentUsername) {
      const ok = await updateUserShopData(currentUsername, { newGold, newOwned });
      if (!ok) {
        // If Supabase sync fails, keep the purchase locally and log for debugging.
        console.warn('Shop purchase sync with Supabase failed; kept local state only.');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPersisted();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading shop...</Text>
      </View>
    );
  }

  const contentPadding = 16;
  const gridGap = 6;
  const isNarrow = screenWidth < 600;
  const numColumns = isNarrow ? 3 : 6;
  const rawCardWidth = Math.floor((screenWidth - contentPadding * 2 - gridGap * (numColumns - 1)) / numColumns);
  const cardWidth = isNarrow ? Math.min(rawCardWidth, 160) : Math.min(rawCardWidth, 140);
  const cardPadding = isNarrow ? 6 : 10;

  const renderItemCard = (item, isNew) => {
    const rarity = SHOP_RARITIES[item.rarity] || SHOP_RARITIES.common;
    const owned = ownedIds.includes(item.id);
    const canBuy = !owned && gold >= item.cost;
    const isNameFx = item.type === 'name_fx' && item.value;
    const NameComponent = isNameFx ? AnimatedName : null;
    return (
      <View key={item.id} style={[styles.shopCard, { width: cardWidth, maxWidth: cardWidth, borderColor: rarity.borderColor }]}>
        {isNew && (
          <View style={styles.newTag}>
            <Text style={styles.newTagText}>New</Text>
          </View>
        )}
        <View style={[styles.shopCardInner, { padding: cardPadding }, rarity.bgGlow && { backgroundColor: rarity.bgGlow }]}>
          <View style={[styles.shopCardRarityBar, isNarrow && { marginBottom: 4 }]}><Text style={[styles.shopCardRarityText, { color: rarity.color }, isNarrow && { fontSize: 9 }]}>{rarity.label}</Text></View>
          {item.type === 'font' ? (
            <Text
              style={[
                styles.shopCardName,
                isNarrow && { fontSize: 11 },
                SHOP_FONT_FAMILY_MAP[item.value] && { fontFamily: SHOP_FONT_FAMILY_MAP[item.value] }
              ]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
          ) : NameComponent ? (
            <View style={[styles.shopCardNameWrap, isNarrow && { minHeight: 28 }]}>
              <NameComponent
                name={item.name}
                animationType={item.value}
                accentColor={rarity.color}
                style={[styles.shopCardNameAnimated, isNarrow && { fontSize: 11 }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              />
            </View>
          ) : (
            <Text style={[styles.shopCardName, isNarrow && { fontSize: 11 }]} numberOfLines={2}>{item.name}</Text>
          )}
          <Text style={[styles.shopCardDesc, isNarrow && { fontSize: 10, marginBottom: 4 }]} numberOfLines={2}>{item.description}</Text>
          <View style={styles.shopCardCostRow}>
            <Text style={[styles.shopCardCost, isNarrow && { fontSize: 11 }]}>{item.cost} G</Text>
            {owned ? (
              <View style={styles.ownedBadge}><Text style={styles.ownedBadgeText}>Owned</Text></View>
            ) : (
              <TouchableOpacity
                style={[styles.buyButton, !canBuy && styles.buyButtonDisabled]}
                onPress={() => handleBuy(item)}
                disabled={!canBuy}
                activeOpacity={0.8}
              >
                <Text style={styles.buyButtonText}>Buy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const totalOwnedCosmetics = ownedIds.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        IS_WEB && { maxWidth: 900, alignSelf: 'center', width: '100%' },
        (shopTab === 'shop' || shopTab === 'leaderboard') && { paddingBottom: 320 },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      showsVerticalScrollIndicator={true}
    >
      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Temple Bazaar</Text>
        <Text style={styles.pageSubtitle}>
          Trade your hard‑earned favor for divine cosmetics and titles.
        </Text>
      </View>

      {/* Gold display + Tabs */}
      <View style={styles.goldRow}>
        <View style={styles.goldBadge}>
          <Image
            source={GOLD_ICON}
            style={styles.goldIcon}
            contentFit="contain"
          />
          <View style={styles.goldBadgeTextWrap}>
            <Text style={styles.goldLabel}>Gold</Text>
            <Text style={styles.goldValue}>{gold}</Text>
          </View>
        </View>
        <View style={styles.goldStats}>
          <Text style={styles.goldStatsText}>
            Owned cosmetics: <Text style={styles.goldStatsValue}>{totalOwnedCosmetics}</Text>
          </Text>
          <Text style={styles.goldStatsHint}>Earn more Gold from minigames and challenges.</Text>
        </View>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, shopTab === 'shop' && styles.tabButtonActive]}
            onPress={() => setShopTab('shop')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, shopTab === 'shop' && styles.tabButtonTextActive]}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, shopTab === 'challenges' && styles.tabButtonActive]}
            onPress={() => setShopTab('challenges')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, shopTab === 'challenges' && styles.tabButtonTextActive]}>Challenges</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, shopTab === 'leaderboard' && styles.tabButtonActive]}
            onPress={() => setShopTab('leaderboard')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, shopTab === 'leaderboard' && styles.tabButtonTextActive]}>Leaderboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {shopTab === 'leaderboard' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10 — Most Gold Earned (All Time)</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>Ranked by total gold earned, not current balance.</Text>
          <View style={styles.leaderboardList}>
            {leaderboard.length === 0 && (
              <Text style={styles.leaderboardEmpty}>No one on the board yet. Earn gold from challenges and daily login!</Text>
            )}
            {leaderboard.map((entry, index) => (
              <View key={entry.username || index} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardRank}>#{index + 1}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName} numberOfLines={1}>{entry.display_name || entry.username || '—'}</Text>
                  <Text style={styles.leaderboardUsername} numberOfLines={1}>@{entry.username}</Text>
                </View>
                <Text style={styles.leaderboardGold}>{entry.total_gold_earned.toLocaleString()} earned</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {shopTab === 'challenges' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily login</Text>
          <TouchableOpacity
            style={[styles.dailyButton, !canClaimDaily && styles.dailyButtonDisabled]}
            onPress={handleDailyClaim}
            disabled={!canClaimDaily || claimingDaily}
            activeOpacity={0.8}
          >
            {claimingDaily ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : canClaimDaily ? (
              <>
                <Text style={styles.dailyButtonText}>Claim daily</Text>
                <Text style={styles.dailyButtonSub}>+{dailyGoldAmount} Gold</Text>
              </>
            ) : (
              <Text style={styles.dailyButtonText}>Claimed today</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Challenges</Text>
          <Text style={styles.sectionSubtitle}>Complete challenges to earn Gold</Text>
          <View style={styles.challengeList}>
            {CHALLENGES.map((ch) => (
              <View key={ch.id} style={styles.challengeCard}>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeName}>{ch.name}</Text>
                  <Text style={styles.challengeDesc}>{ch.description}</Text>
                </View>
                <View style={styles.challengeReward}>
                  <Text style={styles.challengeGold}>+{ch.goldReward}</Text>
                  <Text style={styles.challengeGoldLabel}>Gold</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {shopTab === 'shop' && (
        <>
          <Text style={styles.shopRotateHint}>Shop refreshes with new items every 24 hours.</Text>
          <View style={styles.sectionTabsRow}>
            {[
              { key: 'name_fx', label: 'Name effects' },
              { key: 'fonts', label: 'Fonts' },
              { key: 'titles', label: 'Titles' },
            ].map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sectionTabBtn, shopSection === s.key && styles.sectionTabBtnActive]}
                onPress={() => setShopSection(s.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionTabText, shopSection === s.key && styles.sectionTabTextActive]} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.section, { marginBottom: 12 }]}>
            {shopSection === 'name_fx' && (
              <>
                <Text style={styles.sectionSubtitle}>Preview shows the effect. Unlock to use on your profile.</Text>
                <View style={[styles.shopGridFourRows, { gap: gridGap }]}>
                  {dailyShop.nameFx.map((item) => renderItemCard(item, true))}
                </View>
              </>
            )}
            {shopSection === 'fonts' && (
              <>
                <Text style={styles.sectionSubtitle}>Unlock fonts to style your display name.</Text>
                <View style={[styles.shopGridFourRows, { gap: gridGap }]}>
                  {(dailyShop.fonts || []).map((item) => renderItemCard(item, true))}
                </View>
              </>
            )}
            {shopSection === 'titles' && (
              <>
                <Text style={styles.sectionSubtitle}>Unlock titles to show under your name.</Text>
                <View style={[styles.shopGridFourRows, { gap: gridGap }]}>
                  {dailyShop.titles.map((item) => renderItemCard(item, true))}
                </View>
              </>
            )}
          </View>
          {currentUsername && onNavigateToProfile && (
            <TouchableOpacity style={styles.profileLink} onPress={onNavigateToProfile} activeOpacity={0.8}>
              <Text style={styles.profileLinkText}>Equip items in Profile →</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071024',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  pageTitle: {
    color: '#fbbf24',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4,
  },
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
  goldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    minWidth: 100,
    gap: 8,
  },
  goldIcon: {
    width: 28,
    height: 28,
  },
  goldBadgeTextWrap: {
    alignItems: 'center',
  },
  goldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 2,
  },
  goldValue: {
    color: '#f59e0b',
    fontSize: 24,
    fontWeight: '800',
  },
  goldStats: {
    flex: 1,
    minWidth: 160,
  },
  goldStatsText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  goldStatsValue: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  goldStatsHint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabButtonActive: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  tabButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tabButtonTextActive: {
    color: '#f59e0b',
  },
  categoryTitle: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  shopRotateHint: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  sectionTabBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    minWidth: 0,
  },
  sectionTabBtnActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(88, 28, 135, 0.25)',
  },
  sectionTabText: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: '#fbbf24',
  },
  shopGridFourRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  dailyButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#16a34a',
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  dailyButtonDisabled: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  dailyButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  dailyButtonSub: {
    color: '#0f172a',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#f59e0b',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  challengeList: {
    gap: 10,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b1226',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  challengeDesc: {
    color: '#94a3b8',
    fontSize: 12,
  },
  challengeReward: {
    alignItems: 'flex-end',
  },
  challengeGold: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '800',
  },
  challengeGoldLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1226',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    gap: 12,
  },
  leaderboardRank: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 32,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  leaderboardUsername: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardGold: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  leaderboardEmpty: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  shopCard: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#020617',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  newTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  newTagText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shopCardInner: {
    backgroundColor: '#020617',
    padding: 14,
  },
  shopCardRarityBar: {
    marginBottom: 8,
  },
  shopCardRarityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shopCardNameWrap: {
    minHeight: 40,
    marginBottom: 4,
    justifyContent: 'center',
  },
  shopCardNameAnimated: {
    fontSize: 15,
    fontWeight: '700',
  },
  shopCardName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  shopCardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
  },
  shopCardCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopCardCost: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  buyButton: {
    backgroundColor: '#f97316',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ea580c',
    shadowColor: '#f97316',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buyButtonDisabled: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    opacity: 0.8,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  ownedBadge: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  ownedBadgeText: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '600',
  },
  profileLink: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  profileLinkText: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
  },
});
