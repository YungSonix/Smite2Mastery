import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../../hooks/useScreenDimensions';
import {
  SHOP_RARITIES,
  CHALLENGES,
  SHOP_ITEM_POOL,
  SHOP_PACKS,
  expandOwnedIds,
  DAILY_GOLD_AMOUNT,
} from '../../lib/shopData';
import { fetchUserShopData, claimDailyShopGold, purchaseShopItem, fetchLeaderboard } from '../../lib/shopSupabase';
import { GOLD_ICON } from '../../lib/imageGrabber';
import { useAppFonts, FONT_FAMILY_BY_KEY } from '../../lib/appFonts';

const IS_WEB = Platform.OS === 'web';

const NAME_FX_ITEMS = SHOP_ITEM_POOL.filter((i) => i.type === 'name_fx');
const TITLE_ITEMS = SHOP_ITEM_POOL.filter((i) => i.type === 'title');
const FONT_ITEMS = SHOP_ITEM_POOL.filter((i) => i.type === 'font');
const ITEM_COST_BY_ID = SHOP_ITEM_POOL.reduce((acc, i) => {
  acc[i.id] = i.cost;
  return acc;
}, {});
const ITEM_NAME_BY_ID = SHOP_ITEM_POOL.reduce((acc, i) => {
  acc[i.id] = (i.name || '').replace(/^Title:\s*/, '');
  return acc;
}, {});

const DAILY_NAME_FX_COUNT = 30;
const DAILY_TITLE_COUNT = 30;
const DAILY_FONT_COUNT = 30;

// Animated pack container: a soft pulsing glow border + a shimmer sweep that
// gives bundles a premium, "unwrap me" feel. Purely presentational.
function PackCard({ rarity, width, children, compact = false }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const s = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2600, delay: 400, easing: Easing.linear, useNativeDriver: true })
    );
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    s.start();
    g.start();
    return () => { s.stop(); g.stop(); };
  }, [shimmer, glow]);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.5, width * 1.1] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.7] });
  return (
    <View style={[styles.packCard, compact && styles.packCardCompact, styles.packCardClip, { width, borderColor: rarity.color, backgroundColor: rarity.bgGlow }]}>
      <Animated.View pointerEvents="none" style={[styles.packGlow, { borderColor: rarity.color, opacity: glowOpacity }]} />
      <Animated.View pointerEvents="none" style={[styles.packShimmer, { transform: [{ translateX }, { rotate: '18deg' }] }]} />
      {children}
    </View>
  );
}

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

// Font key -> loaded fontFamily for shop card preview (identical on web + native).
const SHOP_FONT_FAMILY_MAP = FONT_FAMILY_BY_KEY;

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
  useAppFonts();
  const { width: screenWidth } = useScreenDimensions();
  const prefix = getShopPrefix(currentUsername);

  const [shopTab, setShopTab] = useState('shop'); // 'shop' | 'challenges' | 'leaderboard'
  const [shopSection, setShopSection] = useState('packs'); // 'packs' | 'name_fx' | 'fonts' | 'titles'
  const [search, setSearch] = useState('');
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
  };
  const persistOwned = async (ids) => {
    setOwnedIds(ids);
    await storage.setItem(prefix + 'owned', JSON.stringify(ids));
  };
  const persistChallenges = async (obj) => {
    setChallengeProgress(obj);
    await storage.setItem(prefix + 'challenges', JSON.stringify(obj));
  };

  const today = getTodayDateString();
  const dailyShop = getDailyShopItems(today);
  const searchLc = search.trim().toLowerCase();
  const FULL_POOLS = { name_fx: NAME_FX_ITEMS, fonts: FONT_ITEMS, titles: TITLE_ITEMS };
  const itemsForSection = (key) => {
    if (searchLc) {
      return (FULL_POOLS[key] || []).filter(
        (i) =>
          (i.name || '').toLowerCase().includes(searchLc) ||
          String(i.value || '').toLowerCase().includes(searchLc) ||
          (i.description || '').toLowerCase().includes(searchLc)
      );
    }
    return key === 'name_fx' ? dailyShop.nameFx : key === 'fonts' ? dailyShop.fonts : dailyShop.titles;
  };
  const hoursUntilRefresh = (() => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 3600000));
  })();
  const canClaimDaily = lastDailyClaim !== today;
  const dailyGoldAmount = DAILY_GOLD_AMOUNT;
  const AnimatedName = getAnimatedProfileName();

  const handleDailyClaim = async () => {
    if (!canClaimDaily || claimingDaily) return;
    setClaimingDaily(true);
    try {
      if (currentUsername) {
        const rpc = await claimDailyShopGold(currentUsername);
        if (rpc.claimed) {
          const added = rpc.gold ?? dailyGoldAmount;
          const balance = rpc.balance ?? gold + added;
          setGold(balance);
          await storage.setItem(prefix + 'gold', String(balance));
          await storage.setItem(prefix + 'last_daily_claim', today);
          const newProgress = { ...challengeProgress, daily_login: today };
          await persistChallenges(newProgress);
          setLastDailyClaim(today);
          return;
        }
      }
      const newGold = gold + dailyGoldAmount;
      setGold(newGold);
      await storage.setItem(prefix + 'gold', String(newGold));
      await storage.setItem(prefix + 'last_daily_claim', today);
      const newProgress = { ...challengeProgress, daily_login: today };
      await persistChallenges(newProgress);
      setLastDailyClaim(today);
    } finally {
      setClaimingDaily(false);
    }
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
    if (currentUsername) {
      const rpc = await purchaseShopItem(currentUsername, item.id);
      if (rpc.purchased) {
        const balance = rpc.balance ?? gold - item.cost;
        const owned = Array.isArray(rpc.shop_owned)
          ? rpc.shop_owned
          : [...ownedIds, item.id];
        setGold(balance);
        setOwnedIds(owned);
        await storage.setItem(prefix + 'gold', String(balance));
        await storage.setItem(prefix + 'owned', JSON.stringify(owned));
        return;
      }
      if (rpc.reason === 'already_owned') {
        Alert.alert('Already owned', `You already own ${item.name}.`);
        return;
      }
      if (rpc.reason === 'insufficient_gold') {
        Alert.alert('Not enough Gold', `You need ${item.cost} Gold.`);
        return;
      }
    }
    const newGold = gold - item.cost;
    const newOwned = [...ownedIds, item.id];
    setGold(newGold);
    setOwnedIds(newOwned);
    await storage.setItem(prefix + 'gold', String(newGold));
    await storage.setItem(prefix + 'owned', JSON.stringify(newOwned));
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
  const gridGap = 8;
  const isNarrow = screenWidth < 600;
  const maxContent = IS_WEB ? Math.min(screenWidth, 1060) : screenWidth;
  const numColumns = isNarrow ? 3 : maxContent < 900 ? 4 : 5;
  const rawCardWidth = Math.floor((maxContent - contentPadding * 2 - gridGap * (numColumns - 1)) / numColumns);
  const cardWidth = Math.max(102, rawCardWidth);
  const packCols = IS_WEB ? 4 : 3;
  const packCompact = !IS_WEB;
  const packCardWidth = Math.floor((maxContent - contentPadding * 2 - gridGap * (packCols - 1)) / packCols);
  const previewName = currentUsername || 'Your Name';
  // Items granted by an owned pack count as owned too
  const ownedSet = new Set(expandOwnedIds(ownedIds));

  const renderItemCard = (item) => {
    const rarity = SHOP_RARITIES[item.rarity] || SHOP_RARITIES.common;
    const isFree = !!item.defaultUnlocked && !ownedSet.has(item.id);
    const owned = ownedSet.has(item.id) || item.defaultUnlocked;
    const canBuy = !owned && gold >= item.cost;
    const isNameFx = item.type === 'name_fx' && item.value;
    const NameComponent = isNameFx ? AnimatedName : null;
    // Title label: strip the "Title: " prefix for a cleaner preview
    const titleText = item.type === 'title' ? String(item.value || item.name) : item.name;
    return (
      <View key={item.id} style={[styles.card, owned && styles.cardOwned, { width: cardWidth, maxWidth: cardWidth }]}>
        {/* Preview — shows the player's own name so they can feel the effect */}
        <View style={styles.cardPreview}>
          {item.type === 'font' ? (
            <Text
              style={[styles.previewText, SHOP_FONT_FAMILY_MAP[item.value] && { fontFamily: SHOP_FONT_FAMILY_MAP[item.value] }]}
              numberOfLines={1}
            >
              {previewName}
            </Text>
          ) : NameComponent ? (
            <NameComponent
              name={previewName}
              animationType={item.value}
              accentColor={rarity.color}
              style={styles.previewText}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          ) : (
            <Text style={styles.previewTextTitle} numberOfLines={2}>{titleText}</Text>
          )}
        </View>

        {/* Rarity box + item name */}
        <View style={[styles.rarityChip, { borderColor: rarity.color, backgroundColor: rarity.bgGlow }]}>
          <Text style={[styles.rarityChipText, { color: rarity.color }]} numberOfLines={1}>{rarity.label}</Text>
        </View>
        {item.type !== 'title' && (
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        )}

        {/* Price + action */}
        <View style={styles.cardFooter}>
          <View style={styles.priceWrap}>
            <Image source={GOLD_ICON} style={styles.priceIcon} contentFit="contain" />
            <Text style={styles.priceText}>{item.cost.toLocaleString()}</Text>
          </View>
          {owned ? (
            <View style={[styles.ownedChip, isFree && styles.freeChip]}>
              <Text style={[styles.ownedChipText, isFree && styles.freeChipText]}>{isFree ? 'Free' : 'Owned'}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.buyBtn, !canBuy && styles.buyBtnDisabled]}
              onPress={() => handleBuy(item)}
              disabled={!canBuy}
              activeOpacity={0.85}
            >
              <Text style={[styles.buyBtnText, !canBuy && styles.buyBtnTextDisabled]}>{canBuy ? 'Buy' : 'Locked'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const mysteryTypeLabel = (id) =>
    id.startsWith('name_fx_') ? 'Mystery Name Effect'
      : id.startsWith('font_') ? 'Mystery Font'
      : id.startsWith('title_') ? 'Mystery Title'
      : 'Mystery Reward';

  const renderPackCard = (pack) => {
    const rarity = SHOP_RARITIES[pack.rarity] || SHOP_RARITIES.epic;
    const owned = ownedIds.includes(pack.id);
    const canBuy = !owned && gold >= pack.cost;
    const fullPrice = (pack.itemIds || []).reduce((sum, id) => sum + (ITEM_COST_BY_ID[id] || 0), 0);
    const savings = Math.max(0, fullPrice - pack.cost);
    // Mystery packs hide their contents (and value) until unlocked.
    const hidden = !!pack.mystery && !owned;
    const showValue = savings > 0 && !hidden;
    return (
      <PackCard key={pack.id} rarity={rarity} width={packCardWidth} compact={packCompact}>
        <View style={[styles.packHeader, packCompact && styles.packHeaderCompact]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.packName, packCompact && styles.packNameCompact]} numberOfLines={1}>{pack.name}</Text>
            <Text style={[styles.packDesc, packCompact && styles.packDescCompact]} numberOfLines={1}>{pack.description}</Text>
          </View>
          {hidden ? (
            <View style={[styles.packSaveChip, packCompact && styles.packSaveChipCompact, { borderColor: rarity.color }]}>
              <Text style={[styles.packSaveText, packCompact && styles.packSaveTextCompact, { color: rarity.color }]}>MYSTERY</Text>
            </View>
          ) : showValue ? (
            <View style={[styles.packSaveChip, packCompact && styles.packSaveChipCompact, { borderColor: rarity.color }]}>
              <Text style={[styles.packSaveText, packCompact && styles.packSaveTextCompact, { color: rarity.color }]}>SAVE {savings}</Text>
            </View>
          ) : null}
        </View>

        {/* Animated teaser using the player's own name (masked for mystery packs) */}
        <View style={[styles.packPreview, packCompact && styles.packPreviewCompact, { borderColor: rarity.color }]}>
          {AnimatedName ? (
            <AnimatedName
              name={hidden ? '??????' : previewName}
              animationType={pack.previewFx}
              accentColor={pack.accent || rarity.color}
              style={[styles.packPreviewText, packCompact && styles.packPreviewTextCompact]}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          ) : (
            <Text style={[styles.packPreviewText, packCompact && styles.packPreviewTextCompact]} numberOfLines={1}>{hidden ? '??????' : previewName}</Text>
          )}
        </View>

        {/* Contents list */}
        <View style={[styles.packContents, packCompact && styles.packContentsCompact]}>
          {(pack.itemIds || []).map((id) => (
            <View key={id} style={styles.packContentRow}>
              <Text style={[styles.packBullet, { color: rarity.color }]}>{hidden ? '?' : '◆'}</Text>
              <Text style={[styles.packContentText, packCompact && styles.packContentTextCompact, hidden && styles.packMysteryText]} numberOfLines={1}>
                {hidden ? mysteryTypeLabel(id) : (ITEM_NAME_BY_ID[id] || id)}
              </Text>
              {!hidden && ownedSet.has(id) && !owned && <Text style={styles.packHaveText}>have</Text>}
            </View>
          ))}
        </View>

        {/* Price + action */}
        <View style={styles.packFooter}>
          <View style={styles.packPriceWrap}>
            <Image source={GOLD_ICON} style={[styles.priceIcon, packCompact && styles.priceIconCompact]} contentFit="contain" />
            <Text style={[styles.priceText, packCompact && styles.priceTextCompact]}>{pack.cost.toLocaleString()}</Text>
            {showValue && <Text style={[styles.packFullPrice, packCompact && styles.packFullPriceCompact]}>{fullPrice.toLocaleString()}</Text>}
          </View>
          {owned ? (
            <View style={styles.ownedChip}><Text style={styles.ownedChipText}>Owned</Text></View>
          ) : (
            <TouchableOpacity
              style={[styles.buyBtn, styles.packBuyBtn, packCompact && styles.packBuyBtnCompact, !canBuy && styles.buyBtnDisabled]}
              onPress={() => handleBuy({ id: pack.id, name: pack.name, cost: pack.cost })}
              disabled={!canBuy}
              activeOpacity={0.85}
            >
              <Text style={[styles.buyBtnText, packCompact && styles.buyBtnTextCompact, !canBuy && styles.buyBtnTextDisabled]}>{canBuy ? 'Buy Pack' : 'Locked'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </PackCard>
    );
  };

  const totalOwnedCosmetics = ownedIds.length;

  return (
    <ScrollView
      style={[styles.container, IS_WEB && { maxWidth: maxContent, alignSelf: 'center', width: '100%' }]}
      contentContainerStyle={[
        styles.content,
        IS_WEB && { maxWidth: maxContent, alignSelf: 'center', width: '100%' },
        (shopTab === 'shop' || shopTab === 'leaderboard') && { paddingBottom: 320 },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      showsVerticalScrollIndicator={true}
    >
      {/* Top bar: title + balance */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Shop</Text>
          <Text style={styles.pageSubtitle}>{totalOwnedCosmetics} owned · earn Gold in Challenges</Text>
        </View>
        <View style={styles.balanceChip}>
          <Image source={GOLD_ICON} style={styles.balanceIcon} contentFit="contain" />
          <Text style={styles.balanceValue}>{gold.toLocaleString()}</Text>
        </View>
      </View>

      {/* Primary tabs (segmented) */}
      <View style={styles.segment}>
        {[
          { key: 'shop', label: 'Shop' },
          { key: 'challenges', label: 'Challenges' },
          { key: 'leaderboard', label: 'Leaderboard' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.segmentBtn, shopTab === t.key && styles.segmentBtnActive]}
            onPress={() => setShopTab(t.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, shopTab === t.key && styles.segmentTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
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
          {/* Section selector */}
          <View style={styles.sectionTabsRow}>
            {[
              { key: 'packs', label: 'Packs' },
              { key: 'name_fx', label: 'Name Effects' },
              { key: 'fonts', label: 'Fonts' },
              { key: 'titles', label: 'Titles' },
            ].map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sectionTabBtn, shopSection === s.key && styles.sectionTabBtnActive]}
                onPress={() => setShopSection(s.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.sectionTabText, shopSection === s.key && styles.sectionTabTextActive]} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search (hidden on Packs — the list is short) */}
          {shopSection !== 'packs' && (
            <View style={styles.searchWrap}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search all items…"
                placeholderTextColor="#64748b"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear} activeOpacity={0.7}>
                  <Text style={styles.searchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          {shopSection === 'packs' ? (
            <>
              <Text style={styles.resultLine}>Bundles · save vs buying separately</Text>
              <View style={[styles.packGrid, IS_WEB && styles.packGridWeb]}>
                {SHOP_PACKS.map((pack) => renderPackCard(pack))}
              </View>
            </>
          ) : (
            (() => {
              const items = itemsForSection(shopSection);
              return (
                <>
                  <Text style={styles.resultLine}>
                    {searchLc
                      ? `${items.length} result${items.length === 1 ? '' : 's'}`
                      : `Featured today · refreshes in ${hoursUntilRefresh}h`}
                  </Text>
                  {items.length === 0 ? (
                    <Text style={styles.emptyResults}>No items match “{search}”.</Text>
                  ) : (
                    <View style={[styles.grid, { gap: gridGap }]}>
                      {items.map((item) => renderItemCard(item))}
                    </View>
                  )}
                </>
              );
            })()
          )}

          {currentUsername && onNavigateToProfile && (
            <TouchableOpacity style={styles.profileLink} onPress={onNavigateToProfile} activeOpacity={0.85}>
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
    backgroundColor: '#0a0e17',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  // —— Top bar ——
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    color: '#64748b',
    fontSize: 12.5,
    marginTop: 2,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#0f1523',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
  },
  balanceIcon: { width: 20, height: 20 },
  balanceValue: { color: '#fbbf24', fontSize: 17, fontWeight: '800' },
  // —— Primary segmented tabs ——
  segment: {
    flexDirection: 'row',
    backgroundColor: '#0f1523',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.10)',
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(125, 211, 252, 0.14)',
  },
  segmentText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#7dd3fc',
  },
  // —— Section tabs ——
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1523',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 9,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
  },
  searchClear: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  searchClearText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  resultLine: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 12,
  },
  emptyResults: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  // —— Item card (compact, ~5 per row) ——
  card: {
    backgroundColor: '#0f1523',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.10)',
    padding: 9,
  },
  cardOwned: {
    borderColor: 'rgba(125, 211, 252, 0.28)',
    backgroundColor: 'rgba(125, 211, 252, 0.05)',
  },
  cardPreview: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  previewText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  previewTextTitle: {
    color: '#f1f5f9',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  rarityChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  rarityChipText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 9,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  priceIcon: { width: 13, height: 13 },
  priceText: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
  buyBtn: {
    backgroundColor: 'rgba(125, 211, 252, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.5)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  buyBtnDisabled: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  buyBtnText: { color: '#7dd3fc', fontSize: 11, fontWeight: '800' },
  buyBtnTextDisabled: { color: '#64748b' },
  ownedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: 'rgba(125, 211, 252, 0.10)',
  },
  ownedChipText: { color: '#7dd3fc', fontSize: 11, fontWeight: '700' },
  freeChip: { backgroundColor: 'rgba(74, 222, 128, 0.12)' },
  freeChipText: { color: '#4ade80' },
  // —— Packs (bundles) ——
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'stretch',
  },
  packGridWeb: {
    justifyContent: 'center',
  },
  packCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  packCardCompact: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  packCardClip: {
    overflow: 'hidden',
    position: 'relative',
  },
  packGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
  },
  packShimmer: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 44,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  packHeaderCompact: { gap: 4, marginBottom: 6 },
  packName: { color: '#f8fafc', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  packNameCompact: { fontSize: 12 },
  packDesc: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
  packDescCompact: { fontSize: 9, marginTop: 0 },
  packSaveChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  packSaveChipCompact: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  packSaveText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  packSaveTextCompact: { fontSize: 8, letterSpacing: 0.2 },
  packPreview: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    paddingHorizontal: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  packPreviewCompact: { minHeight: 30, borderRadius: 8, paddingHorizontal: 4, marginBottom: 6 },
  packPreviewText: { color: '#f1f5f9', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  packPreviewTextCompact: { fontSize: 12 },
  packContents: { gap: 3, marginBottom: 11 },
  packContentsCompact: { gap: 2, marginBottom: 7 },
  packContentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  packBullet: { fontSize: 9 },
  packContentText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  packContentTextCompact: { fontSize: 9.5 },
  packMysteryText: { color: '#94a3b8', fontStyle: 'italic', letterSpacing: 0.3 },
  packHaveText: {
    color: '#4ade80',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  packFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  packPriceWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  packFullPrice: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    marginLeft: 2,
  },
  packBuyBtn: { paddingVertical: 7, paddingHorizontal: 14 },
  packBuyBtnCompact: { paddingVertical: 5, paddingHorizontal: 8 },
  priceIconCompact: { width: 14, height: 14 },
  priceTextCompact: { fontSize: 12 },
  packFullPriceCompact: { fontSize: 9 },
  buyBtnTextCompact: { fontSize: 10 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  sectionTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    backgroundColor: '#0f1523',
  },
  sectionTabBtnActive: {
    borderColor: 'rgba(125, 211, 252, 0.5)',
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
  },
  sectionTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTabTextActive: {
    color: '#7dd3fc',
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
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#64748b',
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
    backgroundColor: '#0f1523',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.10)',
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
    backgroundColor: '#0f1523',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.10)',
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
