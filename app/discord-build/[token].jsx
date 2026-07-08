import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import CustomBuildPage from '../_screens/custombuild';
import buildsData from '../../lib/buildsData';
import { getDiscordBotSharedBuildPayload } from '../../lib/discordBotSharedBuildSupabase';
import {
  getGodAbilityIcon,
  getLocalGodAsset,
  getLocalItemIcon,
  getRemoteGodIconByName,
  getRoleIcon,
} from '../localIcons';
import { GOLD_ICON } from '../../lib/imageGrabber';

/** UUID (any version) — matches tokens created by your bot for `discord_bot_shared_builds`. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function flattenAny(v) {
  if (Array.isArray(v)) return v.flatMap(flattenAny);
  if (v && typeof v === 'object') return [v];
  return [];
}

function normKey(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toAbilityOrderLabels(order) {
  if (!Array.isArray(order)) return [];
  return order
    .map((raw) => {
      const s = String(raw || '').toUpperCase().trim();
      if (!s) return null;
      const m = s.match(/^A0?([1-4])$/);
      if (m) return m[1];
      return s;
    })
    .filter(Boolean);
}

function abilityKeyToNumber(raw) {
  const s = String(raw || '').toUpperCase().trim();
  const m = s.match(/^A0?([1-4])$/);
  if (m) return m[1];
  if (['1', '2', '3', '4'].includes(s)) return s;
  return null;
}

function getHoverStatColor(statName) {
  const s = String(statName || '').toLowerCase();
  if (s.includes('strength')) return '#f97316';
  if (s.includes('intelligence')) return '#38bdf8';
  if (s.includes('lifesteal')) return '#a3e635';
  if (s.includes('cooldown')) return '#93c5fd';
  if (s.includes('mana')) return '#60a5fa';
  if (s.includes('health')) return '#34d399';
  if (s.includes('protection')) return '#f59e0b';
  return '#e2e8f0';
}

const LEVEL_BUTTONS = [1, 2, 3, 4, 5];
const ITEM_TOOLTIP_WIDTH = 286;
const ABILITY_TOOLTIP_WIDTH = 320;

function toLevelValueArray(raw) {
  if (Array.isArray(raw)) return raw.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (raw === null || raw === undefined) return [];
  const text = String(raw).trim();
  if (!text) return [];
  if (text.includes('/')) {
    return text
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [raw];
}

function getLevelValue(raw, levelIndex) {
  const arr = toLevelValueArray(raw);
  if (arr.length === 0) return null;
  const idx = Math.max(0, Math.min(levelIndex, arr.length - 1));
  return arr[idx];
}

function extractLeadingNumber(raw) {
  const match = String(raw ?? '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function formatIncreaseFromBase(raw, levelIndex) {
  if (levelIndex <= 0) return null;
  const base = getLevelValue(raw, 0);
  const current = getLevelValue(raw, levelIndex);
  const baseNum = extractLeadingNumber(base);
  const currentNum = extractLeadingNumber(current);
  if (!Number.isFinite(baseNum) || !Number.isFinite(currentNum)) return null;
  const delta = currentNum - baseNum;
  const rounded = Math.abs(delta) >= 10 || Number.isInteger(delta) ? Math.round(delta) : Number(delta.toFixed(2));
  return `${rounded >= 0 ? '+' : ''}${rounded}`;
}

function getTooltipPosition(pageX, pageY, cardWidth) {
  const { width, height } = Dimensions.get('window');
  const x = Number.isFinite(pageX) ? pageX : 0;
  const y = Number.isFinite(pageY) ? pageY : 0;
  const safeLeft = Math.max(10, Math.min(width - cardWidth - 10, x + 14));
  const safeTop = Math.max(10, Math.min(height - 310, y - 26));
  return { left: safeLeft, top: safeTop };
}

export default function DiscordBotDraftBuildScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const raw = Array.isArray(token) ? token[0] : token;
  const t = raw ? String(raw).trim() : '';
  const [activeTab, setActiveTab] = useState('add');
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [buildRows, setBuildRows] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [failedPreviewIconKeys, setFailedPreviewIconKeys] = useState({});
  const [hoverItemCard, setHoverItemCard] = useState(null);
  const [hoverAbilityCard, setHoverAbilityCard] = useState(null);

  if (!t || !UUID_RE.test(t)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Invalid link</Text>
        <Text style={styles.body}>
          This draft URL needs a valid token. Use the full link your bot sends (includes a UUID).
        </Text>
      </View>
    );
  }

  const currentTokenLower = t.toLowerCase();

  const markPreviewIconFailed = useCallback((key) => {
    setFailedPreviewIconKeys((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: true };
    });
  }, []);

  const openHoverItemCard = useCallback((item, key, e) => {
    if (Platform.OS !== 'web') return;
    const pageX = e?.nativeEvent?.pageX;
    const pageY = e?.nativeEvent?.pageY;
    const pos = getTooltipPosition(pageX, pageY, ITEM_TOOLTIP_WIDTH);
    setHoverItemCard({
      key,
      item,
      x: pos.left,
      y: pos.top,
    });
  }, []);

  const closeHoverItemCard = useCallback((key) => {
    if (Platform.OS !== 'web') return;
    setHoverItemCard((prev) => (prev?.key === key ? null : prev));
  }, []);

  const openHoverAbilityCard = useCallback((ability, key, e) => {
    if (Platform.OS !== 'web' || !ability) return;
    const pageX = e?.nativeEvent?.pageX;
    const pageY = e?.nativeEvent?.pageY;
    const pos = getTooltipPosition(pageX, pageY, ABILITY_TOOLTIP_WIDTH);
    setHoverAbilityCard({
      key,
      ability,
      levelIndex: 0,
      x: pos.left,
      y: pos.top,
    });
  }, []);

  const closeHoverAbilityCard = useCallback((key) => {
    if (Platform.OS !== 'web') return;
    setHoverAbilityCard((prev) => (prev?.key === key ? null : prev));
  }, []);

  const renderPreviewItemIcon = useCallback(
    (item, iconKey, style = styles.itemIcon) => {
      const iconCandidate = item?.icon || item?.itemIcon || item?.internalName || item?.name || null;
      const localIcon = getLocalItemIcon(iconCandidate);
      if (!localIcon) {
        return (
          <View style={styles.itemIconMissing}>
            <Text style={styles.itemIconMissingText}>?</Text>
          </View>
        );
      }
      const imageSource = localIcon.primary || localIcon;
      const fallbackSource = localIcon.fallback;
      const useFallback = failedPreviewIconKeys[iconKey];
      if (fallbackSource && !useFallback) {
        return (
          <Image
            source={imageSource}
            style={style}
            contentFit="cover"
            onError={() => markPreviewIconFailed(iconKey)}
          />
        );
      }
      return <Image source={fallbackSource || imageSource} style={style} contentFit="cover" />;
    },
    [failedPreviewIconKeys, markPreviewIconFailed]
  );

  const itemCatalog = useMemo(() => {
    const map = new Map();
    const all = flattenAny(buildsData?.items || []);
    all.forEach((it) => {
      if (!it || typeof it !== 'object') return;
      const payload = {
        icon: it.icon || null,
        totalCost: Number(it.totalCost) || 0,
        fullItem: it,
      };
      const keyA = normKey(it.internalName);
      const keyB = normKey(it.name);
      if (keyA) map.set(keyA, payload);
      if (keyB) map.set(keyB, payload);
    });
    return map;
  }, []);

  const godCatalog = useMemo(() => {
    const map = new Map();
    const gods = Array.isArray(buildsData?.gods) ? buildsData.gods : [];
    gods.forEach((g) => {
      if (!g || typeof g !== 'object') return;
      const payload = {
        icon: g.icon || g.GodIcon || null,
        abilities: g.abilities && typeof g.abilities === 'object' ? g.abilities : {},
      };
      const keyA = normKey(g.internalName);
      const keyB = normKey(g.name || g.GodName);
      if (keyA) map.set(keyA, payload);
      if (keyB) map.set(keyB, payload);
    });
    return map;
  }, []);

  const viewRows = useMemo(() => {
    return buildRows.map((row) => {
      const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
      const name = payload.name || payload.build_name || 'Untitled build';
      const god = payload.god || payload.god_name || payload.godInternalName || 'Unknown god';
      const itemCount = Array.isArray(payload.items) ? payload.items.filter(Boolean).length : 0;
      const updated = row?.updated_at ? new Date(row.updated_at) : null;
      const updatedLabel = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleString() : 'Unknown';
      const resolveIconCost = (x) => {
        const icon = x?.icon || x?.itemIcon || null;
        const keyA = normKey(x?.internalName);
        const keyB = normKey(x?.name);
        const fromCatalog = itemCatalog.get(keyA) || itemCatalog.get(keyB) || null;
        const full = fromCatalog?.fullItem || null;
        return {
          ...x,
          icon: icon || fromCatalog?.icon || full?.icon || null,
          totalCost: Number(x?.totalCost) || Number(fromCatalog?.totalCost) || 0,
          stats: x?.stats || full?.stats || null,
          passive: x?.passive || full?.passive || null,
        };
      };
      const finalItemsResolved = (Array.isArray(payload.items) ? payload.items : []).filter(Boolean).map(resolveIconCost);
      const startingItemsResolved = (
        Array.isArray(payload.startingItems)
          ? payload.startingItems
          : Array.isArray(payload.starting_items)
          ? payload.starting_items
          : []
      )
        .filter(Boolean)
        .map(resolveIconCost);
      const finalRelicResolved = (payload.finalRelic || payload.final_relic || payload.relic)
        ? resolveIconCost(payload.finalRelic || payload.final_relic || payload.relic)
        : null;
      const startingRelicResolved = payload.startingRelic || payload.starting_relic
        ? resolveIconCost(payload.startingRelic || payload.starting_relic)
        : null;
      const totalGold =
        finalItemsResolved.reduce((n, it) => n + (it.totalCost || 0), 0) +
        startingItemsResolved.reduce((n, it) => n + (it.totalCost || 0), 0) +
        (startingRelicResolved?.totalCost || 0) +
        (finalRelicResolved?.totalCost || 0);

      const godRef =
        godCatalog.get(normKey(payload.godInternalName || payload.god_internal_name)) ||
        godCatalog.get(normKey(god)) ||
        null;
      const abilities = godRef?.abilities || {};
      const abilityIconMap = {
        A01: abilities?.A01?.icon || null,
        A02: abilities?.A02?.icon || null,
        A03: abilities?.A03?.icon || null,
        A04: abilities?.A04?.icon || null,
      };
      const abilityDetails = {
        A01: abilities?.A01 || null,
        A02: abilities?.A02 || null,
        A03: abilities?.A03 || null,
        A04: abilities?.A04 || null,
      };

      return {
        token: String(row?.token || ''),
        name,
        god,
        itemCount: finalItemsResolved.length,
        updatedLabel,
        godIcon: payload.godIcon || payload.god_icon || null,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        items: finalItemsResolved,
        startingItems: startingItemsResolved,
        finalRelic: finalRelicResolved,
        startingRelic: startingRelicResolved,
        abilityLevelingOrder: Array.isArray(payload.abilityLevelingOrder)
          ? payload.abilityLevelingOrder
          : Array.isArray(payload.ability_leveling_order)
          ? payload.ability_leveling_order
          : [],
        startingAbilityOrder: Array.isArray(payload.startingAbilityOrder)
          ? payload.startingAbilityOrder
          : Array.isArray(payload.starting_ability_order)
          ? payload.starting_ability_order
          : [],
        totalGold,
        abilityIconMap,
        abilityDetails,
      };
    });
  }, [buildRows, godCatalog, itemCatalog]);

  useEffect(() => {
    if (activeTab !== 'view' || !t) return;
    let cancelled = false;
    (async () => {
      setIsLoadingBuilds(true);
      setLoadError('');
      try {
        const { data, error } = await getDiscordBotSharedBuildPayload(t);
        if (cancelled) return;
        if (error) {
          setLoadError(error.message || String(error));
          setBuildRows([]);
        } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setBuildRows([
            {
              token: t,
              payload: data,
              updated_at: null,
              created_at: null,
            },
          ]);
        } else {
          setBuildRows([]);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || String(e));
          setBuildRows([]);
        }
      } finally {
        if (!cancelled) setIsLoadingBuilds(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, reloadTick, t]);

  if (activeTab === 'add') {
    return (
      <View style={styles.page}>
        <View style={styles.tabBarWrap}>
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonActive]}
            onPress={() => setActiveTab('add')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>Add Build</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('view')}
            activeOpacity={0.85}
          >
            <Text style={styles.tabButtonText}>View Builds</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.builderWrap}>
          <CustomBuildPage botSharedDraftToken={t} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.tabBarWrap}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('add')}
          activeOpacity={0.85}
        >
          <Text style={styles.tabButtonText}>Add Build</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, styles.tabButtonActive]}
          onPress={() => setActiveTab('view')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>View Builds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>This draft link</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => setReloadTick((n) => n + 1)}
          activeOpacity={0.85}
        >
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoadingBuilds ? (
          <View style={styles.centeredListState}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.stateText}>Loading builds...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.centeredListState}>
            <Text style={styles.stateTitle}>Could not load builds</Text>
            <Text style={styles.stateText}>{loadError}</Text>
          </View>
        ) : viewRows.length === 0 ? (
          <View style={styles.centeredListState}>
            <Text style={styles.stateTitle}>No builds yet</Text>
            <Text style={styles.stateText}>Open a bot-shared link to view that draft. Listing all drafts is disabled for security.</Text>
          </View>
        ) : (
          viewRows.map((row) => {
            const isCurrent = row.token.toLowerCase() === currentTokenLower;
            return (
              <TouchableOpacity
                key={row.token}
                style={[styles.buildRow, isCurrent && styles.buildRowCurrent]}
                onPress={() => router.push(`/discord-build/${row.token}`)}
                activeOpacity={0.85}
              >
                <View style={styles.buildRowTop}>
                  <View style={styles.buildTitleWrap}>
                    <View style={styles.godIconWrap} title={Platform.OS === 'web' ? row.god : undefined}>
                      {row.godIcon ? (
                        <Image
                          source={getLocalGodAsset(row.godIcon)}
                          style={styles.godIcon}
                          contentFit="cover"
                          accessibilityLabel={row.god}
                        />
                      ) : row.god ? (
                        <Image
                          source={getRemoteGodIconByName(row.god)}
                          style={styles.godIcon}
                          contentFit="cover"
                          accessibilityLabel={row.god}
                        />
                      ) : (
                        <View style={styles.godIconPlaceholder} />
                      )}
                    </View>
                    <Text style={styles.buildName} numberOfLines={1}>
                      {row.name}
                    </Text>
                  </View>
                  <Text style={styles.buildDate}>{row.updatedLabel}</Text>
                </View>
                <Text style={styles.buildMeta} numberOfLines={1}>
                  {row.god} • {row.itemCount} items
                </Text>
                <View style={styles.goldRow}>
                  <Image source={GOLD_ICON} style={styles.goldIcon} contentFit="contain" />
                  <Text style={styles.goldText}>{row.totalGold.toLocaleString()} gold</Text>
                </View>
                {row.roles.length > 0 ? (
                  <View style={styles.rolesRow}>
                    {row.roles.map((role) => (
                      <View key={`${row.token}-${role}`} style={styles.roleChip}>
                        {getRoleIcon(role) ? (
                          <Image
                            source={getRoleIcon(role)}
                            style={styles.roleIcon}
                            contentFit="contain"
                          />
                        ) : null}
                        <Text style={styles.roleChipText}>{role}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {row.abilityLevelingOrder.length > 0 ? (
                  <View style={styles.orderBlock}>
                    <Text style={styles.orderLabel}>Max order</Text>
                    <View style={styles.orderIconRow}>
                      {row.abilityLevelingOrder.map((abilityKeyRaw, idx) => {
                        const abilityKey = String(abilityKeyRaw || '').toUpperCase().trim();
                        const abilityIconPath = row.abilityIconMap?.[abilityKey];
                        const abilityNum = abilityKeyToNumber(abilityKey);
                        const derivedAbilitySrc = abilityNum ? getGodAbilityIcon(row.god, abilityNum) : null;
                        const abilityNumber = toAbilityOrderLabels([abilityKey])[0] || abilityKey;
                        return (
                          <View key={`${row.token}-mo-${idx}-${abilityKey}`} style={styles.orderStep}>
                            <Pressable
                              style={styles.orderAbilityIconWrap}
                              onHoverIn={(e) =>
                                openHoverAbilityCard(
                                  row.abilityDetails?.[abilityKey],
                                  `${row.token}-ability-mo-${idx}-${abilityKey}`,
                                  e
                                )
                              }
                              onHoverOut={() => closeHoverAbilityCard(`${row.token}-ability-mo-${idx}-${abilityKey}`)}
                              title={
                                Platform.OS === 'web' && row.abilityDetails?.[abilityKey]?.name
                                  ? row.abilityDetails?.[abilityKey]?.name
                                  : undefined
                              }
                            >
                              {abilityIconPath ? (
                                <Image
                                  source={getLocalGodAsset(abilityIconPath)}
                                  style={styles.orderAbilityIcon}
                                  contentFit="cover"
                                />
                              ) : derivedAbilitySrc ? (
                                <Image source={derivedAbilitySrc} style={styles.orderAbilityIcon} contentFit="cover" />
                              ) : (
                                <Text style={styles.orderAbilityFallback}>{abilityNumber}</Text>
                              )}
                            </Pressable>
                            {idx < row.abilityLevelingOrder.length - 1 ? (
                              <Text style={styles.orderArrow}>›</Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                {row.startingAbilityOrder.length > 0 ? (
                  <View style={styles.orderBlock}>
                    <Text style={styles.orderLabel}>Level 1-5</Text>
                    <View style={styles.orderIconRow}>
                      {row.startingAbilityOrder.filter(Boolean).map((abilityKeyRaw, idx, arr) => {
                        const abilityKey = String(abilityKeyRaw || '').toUpperCase().trim();
                        const abilityIconPath = row.abilityIconMap?.[abilityKey];
                        const abilityNum = abilityKeyToNumber(abilityKey);
                        const derivedAbilitySrc = abilityNum ? getGodAbilityIcon(row.god, abilityNum) : null;
                        const abilityNumber = toAbilityOrderLabels([abilityKey])[0] || abilityKey;
                        return (
                          <View key={`${row.token}-so-${idx}-${abilityKey}`} style={styles.orderStep}>
                            <Pressable
                              style={styles.orderAbilityIconWrap}
                              onHoverIn={(e) =>
                                openHoverAbilityCard(
                                  row.abilityDetails?.[abilityKey],
                                  `${row.token}-ability-so-${idx}-${abilityKey}`,
                                  e
                                )
                              }
                              onHoverOut={() => closeHoverAbilityCard(`${row.token}-ability-so-${idx}-${abilityKey}`)}
                              title={
                                Platform.OS === 'web' && row.abilityDetails?.[abilityKey]?.name
                                  ? row.abilityDetails?.[abilityKey]?.name
                                  : undefined
                              }
                            >
                              {abilityIconPath ? (
                                <Image
                                  source={getLocalGodAsset(abilityIconPath)}
                                  style={styles.orderAbilityIcon}
                                  contentFit="cover"
                                />
                              ) : derivedAbilitySrc ? (
                                <Image source={derivedAbilitySrc} style={styles.orderAbilityIcon} contentFit="cover" />
                              ) : (
                                <Text style={styles.orderAbilityFallback}>{abilityNumber}</Text>
                              )}
                            </Pressable>
                            {idx < arr.length - 1 ? <Text style={styles.orderArrow}>›</Text> : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                <View style={styles.iconSection}>
                  <Text style={styles.iconSectionLabel}>Final build</Text>
                  <View style={styles.iconGrid}>
                    {row.items.slice(0, 7).map((item, idx) => (
                      (() => {
                        const itemName = item?.name || item?.internalName || `Item ${idx + 1}`;
                        const iconKey = `${row.token}-fi-${idx}`;
                        return (
                          <Pressable
                            key={iconKey}
                            style={styles.iconTile}
                            onHoverIn={(e) => openHoverItemCard(item, iconKey, e)}
                            onHoverOut={() => closeHoverItemCard(iconKey)}
                          >
                            {renderPreviewItemIcon(item, iconKey)}
                          </Pressable>
                        );
                      })()
                    ))}
                  </View>
                </View>
                {(row.startingItems.length > 0 || row.startingRelic || row.finalRelic) ? (
                  <View style={styles.iconSection}>
                    <Text style={styles.iconSectionLabel}>Starting / relics</Text>
                    <View style={styles.iconGrid}>
                      {row.startingItems.slice(0, 5).map((item, idx) => (
                        (() => {
                          const itemName = item?.name || item?.internalName || `Starting item ${idx + 1}`;
                          const iconKey = `${row.token}-si-${idx}`;
                          return (
                            <Pressable
                              key={iconKey}
                              style={styles.iconTile}
                              onHoverIn={(e) => openHoverItemCard(item, iconKey, e)}
                              onHoverOut={() => closeHoverItemCard(iconKey)}
                            >
                              {renderPreviewItemIcon(item, iconKey)}
                            </Pressable>
                          );
                        })()
                      ))}
                      {row.startingRelic ? (
                        (() => {
                          const itemName =
                            row.startingRelic?.name || row.startingRelic?.internalName || 'Starting relic';
                          const iconKey = `${row.token}-sr`;
                          return (
                            <Pressable
                              style={styles.iconTile}
                              onHoverIn={(e) => openHoverItemCard(row.startingRelic, iconKey, e)}
                              onHoverOut={() => closeHoverItemCard(iconKey)}
                            >
                              {renderPreviewItemIcon(row.startingRelic, iconKey)}
                            </Pressable>
                          );
                        })()
                      ) : null}
                      {row.finalRelic ? (
                        (() => {
                          const itemName = row.finalRelic?.name || row.finalRelic?.internalName || 'Final relic';
                          const iconKey = `${row.token}-fr`;
                          return (
                            <Pressable
                              style={styles.iconTile}
                              onHoverIn={(e) => openHoverItemCard(row.finalRelic, iconKey, e)}
                              onHoverOut={() => closeHoverItemCard(iconKey)}
                            >
                              {renderPreviewItemIcon(row.finalRelic, iconKey)}
                            </Pressable>
                          );
                        })()
                      ) : null}
                    </View>
                    {row.startingItems.length > 0 ? (
                      <Text style={styles.startingItemsText} numberOfLines={2}>
                        {row.startingItems
                          .slice(0, 5)
                          .map((x) => x?.name || x?.internalName)
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <Text style={styles.tokenText} numberOfLines={1}>
                  {row.token}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      {Platform.OS === 'web' && hoverItemCard?.item ? (
        <View
          style={[
            styles.hoverDetailCard,
            {
              left: hoverItemCard.x,
              top: hoverItemCard.y,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.hoverDetailTitle} numberOfLines={1}>
            {hoverItemCard.item?.name || hoverItemCard.item?.internalName || 'Item'}
          </Text>
          <View style={styles.hoverDetailIconWrap}>
            {renderPreviewItemIcon(hoverItemCard.item, `${hoverItemCard.key}-card`, styles.hoverDetailIcon)}
          </View>
          {hoverItemCard.item?.stats && typeof hoverItemCard.item.stats === 'object' ? (
            <View style={styles.hoverDetailSection}>
              {Object.entries(hoverItemCard.item.stats).map(([k, v]) => {
                const c = getHoverStatColor(k);
                return (
                  <View key={`s-${k}`} style={styles.hoverStatRow}>
                    <Text style={[styles.hoverDetailStatLabel, { color: c }]} numberOfLines={1}>
                      {k}:
                    </Text>
                    <Text style={[styles.hoverDetailStatValue, { color: c }]} numberOfLines={1}>
                      {v}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          {hoverItemCard.item?.passive ? (
            <View style={styles.hoverDetailSection}>
              <Text style={styles.hoverDetailPassiveLabel}>Passive</Text>
              <Text style={styles.hoverDetailPassiveText}>{String(hoverItemCard.item.passive)}</Text>
            </View>
          ) : null}
          <Text style={styles.hoverDetailCost}>
            Cost: {(Number(hoverItemCard.item?.totalCost) || 0).toLocaleString()} Gold
          </Text>
        </View>
      ) : null}
      {Platform.OS === 'web' && hoverAbilityCard?.ability ? (
        <View
          style={[
            styles.hoverAbilityCard,
            {
              left: hoverAbilityCard.x,
              top: hoverAbilityCard.y,
            },
          ]}
          pointerEvents="auto"
        >
          <View style={styles.hoverAbilityHeader}>
            <View style={styles.hoverAbilityIconWrap}>
              {hoverAbilityCard.ability?.icon ? (
                <Image
                  source={getLocalGodAsset(hoverAbilityCard.ability.icon)}
                  style={styles.hoverAbilityIcon}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.hoverAbilityIconFallback}>
                  <Text style={styles.hoverAbilityIconFallbackText}>A</Text>
                </View>
              )}
            </View>
            <View style={styles.hoverAbilityTitleWrap}>
              <Text style={styles.hoverAbilityTitle} numberOfLines={1}>
                {hoverAbilityCard.ability?.name || 'Ability'}
              </Text>
              <Text style={styles.hoverAbilityHint}>Pick a level to preview scaling</Text>
            </View>
          </View>

          <View style={styles.hoverAbilityLevelsRow}>
            {LEVEL_BUTTONS.map((level, idx) => {
              const isActive = hoverAbilityCard.levelIndex === idx;
              const firstStatValue = hoverAbilityCard.ability?.valueKeys
                ? Object.values(hoverAbilityCard.ability.valueKeys)[0]
                : null;
              const levelIncrease = formatIncreaseFromBase(firstStatValue, idx);
              return (
                <TouchableOpacity
                  key={`lv-${level}`}
                  style={[styles.hoverAbilityLevelBtn, isActive && styles.hoverAbilityLevelBtnActive]}
                  onPress={() => setHoverAbilityCard((prev) => (prev ? { ...prev, levelIndex: idx } : prev))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.hoverAbilityLevelText, isActive && styles.hoverAbilityLevelTextActive]}>
                    L{level}
                  </Text>
                  <Text
                    style={[
                      styles.hoverAbilityLevelDelta,
                      isActive && styles.hoverAbilityLevelTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {levelIncrease || '\u2014'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hoverAbilityCard.ability?.valueKeys &&
          typeof hoverAbilityCard.ability.valueKeys === 'object' &&
          Object.keys(hoverAbilityCard.ability.valueKeys).length > 0 ? (
            <ScrollView style={styles.hoverAbilityStatsWrap}>
              {Object.entries(hoverAbilityCard.ability.valueKeys).map(([statKey, rawValue]) => {
                const levelValue = getLevelValue(rawValue, hoverAbilityCard.levelIndex);
                if (levelValue === null || levelValue === undefined || String(levelValue).trim() === '') return null;
                const delta = formatIncreaseFromBase(rawValue, hoverAbilityCard.levelIndex);
                return (
                  <View key={`ability-stat-${statKey}`} style={styles.hoverAbilityStatRow}>
                    <Text style={styles.hoverAbilityStatLabel} numberOfLines={1}>
                      {statKey}
                    </Text>
                    <View style={styles.hoverAbilityStatValueWrap}>
                      <Text style={styles.hoverAbilityStatValue} numberOfLines={1}>
                        {String(levelValue)}
                      </Text>
                      {delta ? (
                        <Text style={styles.hoverAbilityStatDelta} numberOfLines={1}>
                          {delta}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.hoverAbilityEmpty}>No level-based stat values available.</Text>
          )}
          {hoverAbilityCard.ability?.shortDesc || hoverAbilityCard.ability?.description ? (
            <Text style={styles.hoverAbilityDesc} numberOfLines={3}>
              {String(hoverAbilityCard.ability.shortDesc || hoverAbilityCard.ability.description)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  tabBarWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#0f172a',
  },
  tabButton: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1324',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2d4a',
  },
  tabButtonText: {
    color: '#93c5fd',
    fontWeight: '600',
    fontSize: 13,
  },
  tabButtonTextActive: {
    color: '#7dd3fc',
    fontWeight: '800',
  },
  builderWrap: {
    flex: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  listTitle: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '800',
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1324',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  refreshBtnText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  centeredListState: {
    marginTop: 36,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  stateTitle: {
    color: '#f1f5f9',
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
  },
  stateText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  buildRow: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1324',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  buildRowCurrent: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2d4a',
  },
  buildRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  buildTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  godIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#10243d',
  },
  godIcon: {
    width: '100%',
    height: '100%',
  },
  godIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e3a5f',
  },
  buildName: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
  },
  buildDate: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  buildMeta: {
    color: '#93c5fd',
    fontSize: 12,
    marginBottom: 4,
  },
  goldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  goldIcon: {
    width: 14,
    height: 14,
  },
  goldText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  roleIcon: {
    width: 11,
    height: 11,
  },
  roleChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  orderBlock: {
    marginBottom: 6,
  },
  orderLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '700',
  },
  orderIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  orderStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderAbilityIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderAbilityIcon: {
    width: '100%',
    height: '100%',
  },
  orderAbilityFallback: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },
  orderArrow: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  iconSection: {
    marginBottom: 8,
  },
  iconSectionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0f172a',
  },
  itemIcon: {
    width: '100%',
    height: '100%',
  },
  itemIconMissing: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  itemIconMissingText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  startingItemsText: {
    marginTop: 6,
    color: '#94a3b8',
    fontSize: 11,
  },
  tokenText: {
    color: '#64748b',
    fontSize: 11,
  },
  hoverDetailCard: {
    position: 'fixed',
    width: 286,
    maxHeight: 340,
    overflow: 'hidden',
    backgroundColor: '#03112a',
    borderColor: '#0ea5e9',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  hoverDetailTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  hoverDetailIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  hoverDetailIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  hoverDetailSection: {
    marginBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 6,
  },
  hoverStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingVertical: 3,
  },
  hoverDetailStatLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  hoverDetailStatValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  hoverDetailPassiveLabel: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  hoverDetailPassiveText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },
  hoverDetailCost: {
    color: '#fbbf24',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  hoverAbilityCard: {
    position: 'fixed',
    width: ABILITY_TOOLTIP_WIDTH,
    maxHeight: 380,
    backgroundColor: '#03112a',
    borderColor: '#0ea5e9',
    borderWidth: 2,
    borderRadius: 12,
    padding: 10,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 12,
  },
  hoverAbilityHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 7,
  },
  hoverAbilityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  hoverAbilityIcon: {
    width: '100%',
    height: '100%',
  },
  hoverAbilityIconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  hoverAbilityIconFallbackText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '800',
  },
  hoverAbilityTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  hoverAbilityTitle: {
    color: '#7dd3fc',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  hoverAbilityHint: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 13,
    marginTop: 2,
  },
  hoverAbilityLevelsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  hoverAbilityLevelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 7,
    backgroundColor: '#0f172a',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoverAbilityLevelBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2d4a',
  },
  hoverAbilityLevelText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
  hoverAbilityLevelTextActive: {
    color: '#7dd3fc',
  },
  hoverAbilityLevelDelta: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  hoverAbilityStatsWrap: {
    maxHeight: 230,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 6,
  },
  hoverAbilityStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  hoverAbilityStatLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  hoverAbilityStatValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hoverAbilityStatValue: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  hoverAbilityStatDelta: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '700',
  },
  hoverAbilityEmpty: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  hoverAbilityDesc: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 6,
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#f87171',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 22,
  },
});
