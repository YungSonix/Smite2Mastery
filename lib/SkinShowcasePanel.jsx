import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { getSkinImage, getLocalGodAsset, getRemoteGodIconByName } from '../app/localIcons';
import {
  getSkinCardArtPath,
  getSkinModelViewPath,
  getSkinLoadoutContentPosition,
  getSkinThumbPath,
  getOrderedVisibleSkinKeys,
  mergeSkinVariant,
  parseSkinVariants,
} from './skinShowcaseHelpers';
import { enrichGodSkinsRecord, refreshPantheonSkinsFromGitHub } from './pantheonSkinsLookup';
import { expandGodSkinsRecord } from './skinVariantGroups';
import {
  formatCostLabel,
  hasShowcaseMeta,
  resolveSkinCost,
  resolveSkinInformation,
  resolveSkinTier,
  resolveSkinType,
  resolveSkinUnlock,
} from './skinShowcaseMeta';
import {
  hasSkinVoxPreview,
  playRandomSkinVox,
} from './skinVox';
import {
  SKIN_LOADOUT_COVER_POSITION,
  SKIN_LOADOUT_FRAME_ASPECT,
  SKIN_LOADOUT_FRAME_MAX_WIDTH,
} from './skinPreviewFrame';
import {
  DROPDOWN_BORDER_CYAN,
  DROPDOWN_VISIBLE_ROWS,
  dropdownListMaxHeight,
  uiDropdownStyles as dd,
} from './uiDropdownStyles';
import { UI_THEME } from './uiTheme';

const CURRENCY_ICON_PATHS = {
  diamonds: 'app/data/Tiers/t_currency_diamond_512 (1).png',
  gems: 'app/data/Tiers/t_currency_gem_512.png',
};

const IS_WEB = Platform.OS === 'web';

function ShowcaseMetaPanel({ entry, godDisplayName }) {
  if (!hasShowcaseMeta(entry)) return null;

  const cost = resolveSkinCost(entry);
  const costLabel = formatCostLabel(cost);
  const tier = resolveSkinTier(entry);
  const unlock = resolveSkinUnlock(entry);
  const typeLine = resolveSkinType(entry);
  const infoRows = resolveSkinInformation(entry);
  const godName =
    entry?.loadoutMeta?.godName ||
    (godDisplayName && String(godDisplayName).trim()) ||
    null;
  const currencyIconPath =
    cost?.kind === 'currency' ? CURRENCY_ICON_PATHS[cost.currency] : null;
  const tierBadgePath = tier?.tierBadge || null;
  const costIsAction = cost?.kind === 'action';

  return (
    <View style={styles.metaPanel}>
      {godName ? (
        <Text style={styles.metaGodName}>{String(godName).toUpperCase()}</Text>
      ) : null}
      <View style={styles.metaRows}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Cost</Text>
          <View style={styles.metaValueRow}>
            {currencyIconPath ? (
              <Image
                source={pickImageSource(getSkinImage(currencyIconPath))}
                style={styles.metaCurrencyIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
            {costIsAction ? (
              <View style={styles.metaCostAction}>
                <Text style={styles.metaCostActionText}>{costLabel}</Text>
              </View>
            ) : (
              <Text style={styles.metaValue}>{costLabel}</Text>
            )}
          </View>
        </View>
        {tier ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tier</Text>
            <View style={styles.metaValueRow}>
              {tierBadgePath ? (
                <Image
                  source={pickImageSource(getSkinImage(tierBadgePath))}
                  style={styles.metaTierBadge}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              ) : null}
              {tier.rarity ? (
                <Text style={styles.metaValue}>{tier.rarity}</Text>
              ) : !tierBadgePath ? (
                <Text style={styles.metaValueMuted}>—</Text>
              ) : null}
            </View>
          </View>
        ) : null}
        {unlock ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Unlock</Text>
            <Text style={[styles.metaValue, styles.metaValueFlex]} numberOfLines={4}>
              {unlock}
            </Text>
          </View>
        ) : null}
        {typeLine ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={[styles.metaValue, styles.metaValueFlex]} numberOfLines={2}>
              {typeLine}
            </Text>
          </View>
        ) : null}
      </View>
      {infoRows.length > 0 ? (
        <View style={styles.metaInfoList}>
          {infoRows.map((row, idx) => (
            <View key={`info-${idx}-${row.label || row.text}`} style={styles.metaInfoBlock}>
              {row.label ? (
                <Text style={styles.metaInfoLabel}>{String(row.label).toUpperCase()}</Text>
              ) : null}
              {row.text ? (
                <Text style={styles.metaInfoText}>{row.text}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const {
  panelBorder: PANEL_BORDER,
  panelBg: PANEL_BG,
  accentSky: ACCENT_SKY,
  labelSoft: LABEL_SOFT,
  textPrimary: TEXT_PRIMARY,
  textMuted: TEXT_MUTED,
  cardBg: CARD_BG,
  borderCyan: BORDER_CYAN,
} = UI_THEME;

function pickImageSource(resolved) {
  if (!resolved) return null;
  return resolved.primary || resolved.fallback || resolved;
}

function skinResolvedToCandidates(resolvedThumb) {
  if (!resolvedThumb) return [];
  const primary = pickImageSource(resolvedThumb);
  const out = [];
  if (primary) out.push(primary);
  const fb = resolvedThumb.fallback;
  if (fb && fb !== primary) out.push(fb);
  return out;
}

/** Try URIs in order; on load failure advance so skin primary → skin fallback → god portrait(s) → letter. */
function ChainedUriImage({
  candidates,
  style,
  contentFit,
  letter,
  accessibilityLabel,
  emptyWrapperStyle,
  emptyTextStyle,
}) {
  const flat = useMemo(() => (Array.isArray(candidates) ? candidates.filter(Boolean) : []), [candidates]);
  const chainKey = flat.map((x) => x?.uri || x?.cacheKey || '').join('|');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [chainKey]);

  if (index >= flat.length) {
    return (
      <View style={[style, emptyWrapperStyle]}>
        <Text style={emptyTextStyle}>{letter}</Text>
      </View>
    );
  }

  return (
    <Image
      source={flat[index]}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={0}
      accessibilityLabel={accessibilityLabel}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

function ShowcaseHeroImage({
  path,
  godFallbackUri,
  style,
  accessibilityLabel,
  contentFit = 'cover',
  contentPosition,
}) {
  const resolved = path ? getSkinImage(path) : null;
  const primary = pickImageSource(resolved);
  const fb =
    resolved && typeof resolved === 'object' && resolved.fallback && resolved.fallback !== primary
      ? resolved.fallback
      : null;
  const [useFb, setUseFb] = useState(false);

  useEffect(() => {
    setUseFb(false);
  }, [path]);

  const source = useFb && fb ? fb : primary || godFallbackUri;

  if (!source) return null;

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      contentPosition={contentPosition}
      cachePolicy="memory-disk"
      transition={0}
      accessibilityLabel={accessibilityLabel}
      onError={() => {
        if (fb && !useFb) setUseFb(true);
      }}
    />
  );
}

/**
 * God-detail skin preview — flat when embedded in Database Skins section (single outer container).
 */
export default function SkinShowcasePanel({
  flat = false,
  godIconPath,
  godDisplayName,
  godKey = null,
  pantheon = null,
  skinsRecord,
  skinKeysOrdered,
  selectedSkinKey,
  onSelectSkinKey,
}) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useScreenDimensions();
  const [mainView, setMainView] = useState('card');
  const [variantIdx, setVariantIdx] = useState(0);
  const [skinMenuOpen, setSkinMenuOpen] = useState(false);
  const [skinVoxPlaying, setSkinVoxPlaying] = useState(false);
  const [enrichedSkins, setEnrichedSkins] = useState(skinsRecord);

  useEffect(() => {
    if (!skinsRecord) {
      setEnrichedSkins(null);
      return;
    }
    let cancelled = false;
    const applyEnrichment = () => {
      if (!cancelled) {
        const merged = enrichGodSkinsRecord(godDisplayName, godKey, skinsRecord, pantheon);
        setEnrichedSkins(expandGodSkinsRecord(merged));
      }
    };
    applyEnrichment();
    if (pantheon) {
      refreshPantheonSkinsFromGitHub(pantheon).then(applyEnrichment);
    }
    return () => {
      cancelled = true;
    };
  }, [godDisplayName, godKey, pantheon, skinsRecord]);

  const activeSkinsRecord = enrichedSkins || skinsRecord;

  const visibleSkinKeys = useMemo(
    () => getOrderedVisibleSkinKeys(activeSkinsRecord || {}),
    [activeSkinsRecord]
  );

  const portraitFallbacks = useMemo(() => {
    const list = [];
    if (godIconPath) {
      const fromPath = getLocalGodAsset(godIconPath);
      if (fromPath) list.push(fromPath);
    }
    const name = godDisplayName && String(godDisplayName).trim();
    if (name) {
      const fromName = getRemoteGodIconByName(name);
      if (fromName && !list.some((x) => x.uri === fromName.uri)) list.push(fromName);
    }
    return list;
  }, [godIconPath, godDisplayName]);

  const baseSkin = activeSkinsRecord && selectedSkinKey ? activeSkinsRecord[selectedSkinKey] : null;
  /** Prism / style overlays: index 0 in the bar is always `baseSkin`; index 1+ merges `variantOverlays[idx - 1]`. */
  const variantOverlays = useMemo(() => parseSkinVariants(baseSkin), [baseSkin]);
  const prismSlotCount = 1 + variantOverlays.length;
  const mergedSkin = useMemo(() => {
    if (!baseSkin) return {};
    if (variantIdx === 0) return baseSkin;
    return mergeSkinVariant(baseSkin, variantOverlays[variantIdx - 1]);
  }, [baseSkin, variantOverlays, variantIdx]);

  useEffect(() => {
    setVariantIdx(0);
    setSkinMenuOpen(false);
  }, [selectedSkinKey]);

  useEffect(() => {
    if (variantIdx >= prismSlotCount) setVariantIdx(0);
  }, [variantIdx, prismSlotCount]);

  const cardPath = getSkinCardArtPath(mergedSkin);
  const modelPath = getSkinModelViewPath(mergedSkin);

  const heroPath =
    mainView === 'model'
      ? modelPath || null
      : cardPath || modelPath || null;
  const modelPlaceholder = mainView === 'model' && !modelPath;

  const mediaHeight = Math.min(420, Math.round(SCREEN_HEIGHT * 0.52));
  // Explicit frame size (3:4 card / loadout aspect) — RN Web ignores aspectRatio+maxHeight on large PNGs.
  const contentApprox = Math.max(260, SCREEN_WIDTH - 72);
  const cardFrameWidth = Math.min(contentApprox, Math.round(mediaHeight * (3 / 4)));
  const cardFrameHeight = Math.min(mediaHeight, Math.round(cardFrameWidth * (4 / 3)));
  const modelFrameWidth = Math.min(
    contentApprox,
    SKIN_LOADOUT_FRAME_MAX_WIDTH,
    Math.round(mediaHeight * SKIN_LOADOUT_FRAME_ASPECT)
  );
  const modelFrameHeight = Math.min(mediaHeight, Math.round(modelFrameWidth / SKIN_LOADOUT_FRAME_ASPECT));
  const loadoutContentPosition = {
    top: `${Math.round(SKIN_LOADOUT_COVER_POSITION.y * 100)}%`,
    left: `${Math.round(SKIN_LOADOUT_COVER_POSITION.x * 100)}%`,
  };
  const mediaStyle =
    mainView === 'model'
      ? {
          width: modelFrameWidth,
          height: modelFrameHeight,
          maxWidth: '100%',
          alignSelf: 'center',
        }
      : {
          width: cardFrameWidth,
          height: cardFrameHeight,
          maxWidth: '100%',
          alignSelf: 'center',
        };

  const displayName = mergedSkin?.name || selectedSkinKey || 'Skin';
  const typeLine =
    mergedSkin && mergedSkin.type && String(mergedSkin.type).trim()
      ? String(mergedSkin.type).trim()
      : null;
  const canPickSkin = visibleSkinKeys.length > 1;
  const skinMenuListHeight = dropdownListMaxHeight(visibleSkinKeys.length);
  const skinVoxAvailable = useMemo(
    () =>
      Boolean(
        godDisplayName &&
          selectedSkinKey &&
          baseSkin &&
          hasSkinVoxPreview(
            godDisplayName,
            godKey,
            baseSkin._sagaParentSkinKey || selectedSkinKey,
            baseSkin
          )
      ),
    [godDisplayName, godKey, selectedSkinKey, baseSkin]
  );

  const handlePlaySkinVox = useCallback(async () => {
    if (!godDisplayName || !selectedSkinKey || !baseSkin || skinVoxPlaying) return;
    setSkinVoxPlaying(true);
    try {
      await playRandomSkinVox(
        godDisplayName,
        godKey,
        baseSkin._sagaParentSkinKey || selectedSkinKey,
        baseSkin
      );
    } finally {
      setSkinVoxPlaying(false);
    }
  }, [godDisplayName, godKey, selectedSkinKey, baseSkin, skinVoxPlaying]);

  useEffect(() => {
    setSkinVoxPlaying(false);
  }, [selectedSkinKey, godDisplayName]);

  if (!activeSkinsRecord || !visibleSkinKeys.length || !selectedSkinKey || !baseSkin) return null;

  return (
    <View style={[styles.embedWrap, flat && styles.embedWrapFlat]}>
      <View style={[styles.content, flat && styles.contentFlat]}>
        <View style={styles.skinPickerSection}>
          {canPickSkin ? (
            <View style={[dd.selectShell, skinMenuOpen && dd.selectShellOpen]}>
              <TouchableOpacity
                style={dd.selectTrigger}
                onPress={() => setSkinMenuOpen((open) => !open)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ expanded: skinMenuOpen }}
                accessibilityLabel={`${displayName}, choose skin`}
              >
                <View style={dd.selectTriggerText}>
                  <Text style={styles.skinTitle} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {typeLine && !skinMenuOpen ? (
                    <Text style={styles.skinTypeLine} numberOfLines={1}>
                      {typeLine}
                    </Text>
                  ) : null}
                </View>
                <Text style={[dd.selectCaret, skinMenuOpen && dd.selectCaretOpen]}>▼</Text>
              </TouchableOpacity>

              {skinMenuOpen ? (
                <>
                  <View style={dd.selectDivider} />
                  <ScrollView
                    style={[dd.menuList, { maxHeight: skinMenuListHeight }]}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={visibleSkinKeys.length > DROPDOWN_VISIBLE_ROWS}
                    keyboardShouldPersistTaps="handled"
                  >
                    {visibleSkinKeys.map((key, index) => {
                      const s = activeSkinsRecord[key];
                      const label = s?.name || key;
                      const thumbPath = getSkinThumbPath(s);
                      const selected = key === selectedSkinKey;
                      const resolvedThumb = thumbPath ? getSkinImage(thumbPath) : null;
                      const menuCandidates = [...skinResolvedToCandidates(resolvedThumb), ...portraitFallbacks];
                      const isLast = index === visibleSkinKeys.length - 1;

                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            dd.menuItem,
                            selected && dd.menuItemActive,
                            isLast && dd.menuItemLast,
                          ]}
                          onPress={() => {
                            onSelectSkinKey(key);
                            setSkinMenuOpen(false);
                          }}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`Skin ${label}${selected ? ', selected' : ''}`}
                        >
                          <ChainedUriImage
                            candidates={menuCandidates}
                            style={styles.skinMenuThumb}
                            contentFit="cover"
                            letter={label.charAt(0)}
                            accessibilityLabel={`${label} thumbnail`}
                            emptyWrapperStyle={styles.skinMenuThumbFallback}
                            emptyTextStyle={styles.skinMenuThumbLetter}
                          />
                          <Text
                            style={[dd.menuItemText, selected && dd.menuItemTextActive]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {visibleSkinKeys.length > DROPDOWN_VISIBLE_ROWS ? (
                    <Text style={dd.menuScrollHint}>
                      {visibleSkinKeys.length} skins — scroll for more
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.skinPickerStatic}>
              <Text style={styles.skinTitle} numberOfLines={2}>
                {displayName}
              </Text>
              {typeLine ? (
                <Text style={styles.skinTypeLine} numberOfLines={1}>
                  {baseSkin._sagaParentSkinName
                    ? `Saga form · ${baseSkin._sagaParentSkinName}`
                    : typeLine}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={[styles.mediaBlock, mediaStyle]}>
          <View style={styles.heroInner}>
            {!heroPath || modelPlaceholder ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>
                  {modelPlaceholder ? 'Loadout preview' : 'Card art'}
                </Text>
                <Text style={styles.placeholderHint}>
                  {modelPlaceholder
                    ? 'Add inGame, gameplayScreenshot, modelPreview, or screenshot on this skin in builds.json.'
                    : 'Add cardArt on this skin (or keep using skin).'}
                </Text>
              </View>
            ) : (
              <ShowcaseHeroImage
                key={`${selectedSkinKey}-${heroPath}-${mainView}`}
                path={heroPath}
                godFallbackUri={portraitFallbacks[0] || null}
                style={styles.heroImage}
                accessibilityLabel={`${displayName} ${mainView === 'model' ? 'loadout' : 'card art'}`}
                contentFit="cover"
                contentPosition={mainView === 'model' ? loadoutContentPosition : undefined}
              />
            )}
          </View>
        </View>

        <View style={styles.segmentTrack}>
          <TouchableOpacity
            style={[styles.segmentBtn, mainView === 'card' && styles.segmentBtnActive]}
            onPress={() => setMainView('card')}
            accessibilityRole="button"
            accessibilityState={{ selected: mainView === 'card' }}
            accessibilityLabel="Card art"
          >
            <Text style={[styles.segmentBtnText, mainView === 'card' && styles.segmentBtnTextActive]}>Card Art</Text>
          </TouchableOpacity>
          <View style={styles.segmentDivider} />
          <TouchableOpacity
            style={[styles.segmentBtn, mainView === 'model' && styles.segmentBtnActive]}
            onPress={() => setMainView('model')}
            accessibilityRole="button"
            accessibilityState={{ selected: mainView === 'model' }}
            accessibilityLabel="Loadout preview"
          >
            <Text style={[styles.segmentBtnText, mainView === 'model' && styles.segmentBtnTextActive]}>Loadout</Text>
          </TouchableOpacity>
        </View>

        {skinVoxAvailable ? (
          <TouchableOpacity
            style={[styles.skinVoxBtn, skinVoxPlaying && styles.skinVoxBtnPlaying]}
            onPress={handlePlaySkinVox}
            disabled={skinVoxPlaying}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Play a random voiceline from this skin"
          >
            <Text style={styles.skinVoxBtnText}>
              {skinVoxPlaying ? 'Playing voiceline…' : 'Play a voiceline from this skin'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <ShowcaseMetaPanel entry={mergedSkin} godDisplayName={godDisplayName} />

        {variantOverlays.length > 0 ? (
          <View style={styles.variantBar}>
            <Text style={styles.variantBarLabel}>
              {baseSkin?.variantBarLabel || baseSkin?.variant_bar_label || 'Prisms'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantChips}>
              {Array.from({ length: prismSlotCount }, (_, i) => {
                const slotSkin =
                  i === 0 ? baseSkin : mergeSkinVariant(baseSkin, variantOverlays[i - 1]);
                const thumbPath = getSkinThumbPath(slotSkin);
                const resolvedThumb = thumbPath ? getSkinImage(thumbPath) : null;
                const prismCandidates = [...skinResolvedToCandidates(resolvedThumb), ...portraitFallbacks];
                const label =
                  i === 0
                    ? 'Default'
                    : String(variantOverlays[i - 1]?.name || `Prism ${i}`).trim() || `Prism ${i}`;
                return (
                  <TouchableOpacity
                    key={`prism-slot-${i}`}
                    style={[styles.variantPrismRing, i === variantIdx && styles.variantPrismRingActive]}
                    onPress={() => setVariantIdx(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}${i === variantIdx ? ', selected' : ''}`}
                    accessibilityState={{ selected: i === variantIdx }}
                  >
                    <ChainedUriImage
                      candidates={prismCandidates}
                      style={styles.variantPrismImage}
                      contentFit="cover"
                      letter={label.charAt(0)}
                      accessibilityLabel={label}
                      emptyWrapperStyle={styles.variantPrismFallback}
                      emptyTextStyle={styles.variantPrismFallbackText}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  embedWrap: {
    position: 'relative',
    width: '100%',
    marginTop: 12,
    alignSelf: 'stretch',
  },
  embedWrapFlat: {
    marginTop: 0,
  },
  content: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_CYAN,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    ...(IS_WEB && { boxSizing: 'border-box' }),
  },
  contentFlat: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  skinPickerSection: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  skinPickerStatic: {
    paddingVertical: 2,
  },
  skinTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  skinTypeLine: {
    marginTop: 2,
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  skinMenuThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  skinMenuThumbFallback: {
    backgroundColor: PANEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinMenuThumbLetter: {
    color: ACCENT_SKY,
    fontSize: 10,
    fontWeight: '800',
  },
  mediaBlock: {
    position: 'relative',
    backgroundColor: UI_THEME.mediaBg,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
    ...(IS_WEB && { flexShrink: 0 }),
  },
  heroInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    maxWidth: 280,
  },
  placeholderTitle: {
    color: LABEL_SOFT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderHint: {
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  segmentTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: UI_THEME.borderCyanFill12,
  },
  segmentDivider: {
    width: 1,
    backgroundColor: PANEL_BORDER,
  },
  segmentBtnText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: ACCENT_SKY,
  },
  skinVoxBtn: {
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DROPDOWN_BORDER_CYAN,
    backgroundColor: 'rgba(125, 211, 252, 0.08)',
    alignItems: 'center',
  },
  skinVoxBtnPlaying: {
    opacity: 0.72,
  },
  skinVoxBtnText: {
    color: ACCENT_SKY,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  variantBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  variantBarLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    width: 52,
  },
  variantChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  variantPrismRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: PANEL_BORDER,
    padding: 2,
    backgroundColor: UI_THEME.panelBgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  variantPrismRingActive: {
    borderColor: ACCENT_SKY,
    borderWidth: 3,
    padding: 1,
    shadowColor: ACCENT_SKY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  variantPrismImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: UI_THEME.mediaBg,
  },
  variantPrismFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantPrismFallbackText: {
    color: ACCENT_SKY,
    fontSize: 14,
    fontWeight: '800',
  },
  metaPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
  },
  metaGodName: {
    color: ACCENT_SKY,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.08,
    marginBottom: 10,
  },
  metaRows: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  metaLabel: {
    width: 72,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
    paddingTop: 1,
  },
  metaValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaValue: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  metaValueFlex: {
    flex: 1,
  },
  metaValueMuted: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  metaCurrencyIcon: {
    width: 20,
    height: 20,
  },
  metaTierBadge: {
    width: 22,
    height: 22,
  },
  metaCostAction: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.55)',
  },
  metaCostActionText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.04,
  },
  metaInfoList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
    gap: 8,
  },
  metaInfoBlock: {
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaInfoLabel: {
    color: ACCENT_SKY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.08,
    marginBottom: 4,
  },
  metaInfoText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
});
