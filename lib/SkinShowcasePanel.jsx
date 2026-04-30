import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { getSkinImage, getLocalGodAsset } from '../app/localIcons';
import {
  getSkinCardArtPath,
  getSkinModelViewPath,
  getSkinThumbPath,
  mergeSkinVariant,
  parseSkinVariants,
} from './skinShowcaseHelpers';

const IS_WEB = Platform.OS === 'web';

const CARD_BG = 'rgba(8, 12, 22, 0.98)';
const BORDER_CYAN = 'rgba(125, 211, 252, 0.42)';
const PANEL_BORDER = '#1e3a5f';
const PANEL_BG = '#0b1220';
const ACCENT_SKY = '#7dd3fc';
const LABEL_SOFT = '#93c5fd';
const TEXT_PRIMARY = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const CLOSE_BTN_BG = '#1e3a5f';
const CLOSE_BTN_TEXT = '#e6eef8';

const CLOSE_BTN_SIZE = 28;
const CLOSE_BTN_OFFSET = CLOSE_BTN_SIZE / 2;

function pickImageSource(resolved) {
  if (!resolved) return null;
  return resolved.primary || resolved.fallback || resolved;
}

function ShowcaseHeroImage({ path, godFallbackUri, style, accessibilityLabel }) {
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
      contentFit="contain"
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
 * God-detail skin preview — layout tuned to avoid wiki-style patterns (picker-under-hero, segments, name header).
 */
export default function SkinShowcasePanel({
  godIconPath,
  skinsRecord,
  skinKeysOrdered,
  selectedSkinKey,
  onSelectSkinKey,
  onRequestClose,
}) {
  const { height: SCREEN_HEIGHT } = useScreenDimensions();
  const [mainView, setMainView] = useState('card');
  const [variantIdx, setVariantIdx] = useState(0);

  const godFallbackSource = useMemo(() => (godIconPath ? getLocalGodAsset(godIconPath) : null), [godIconPath]);

  const baseSkin = skinsRecord && selectedSkinKey ? skinsRecord[selectedSkinKey] : null;
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

  const mediaHeight = Math.min(340, Math.round(SCREEN_HEIGHT * 0.42));

  const displayName = mergedSkin?.name || selectedSkinKey || 'Skin';
  const typeLine =
    mergedSkin && mergedSkin.type && String(mergedSkin.type).trim()
      ? String(mergedSkin.type).trim()
      : null;

  if (!skinsRecord || !skinKeysOrdered?.length || !selectedSkinKey || !baseSkin) return null;

  return (
    <View style={[styles.embedWrap, onRequestClose ? styles.embedWrapWithClose : null]}>
      <View style={styles.sheet}>
        <View style={styles.previewHeader}>
          <View style={styles.previewHeaderText}>
            <Text style={styles.previewKicker}>Skin preview</Text>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {displayName}
            </Text>
            {typeLine ? (
              <Text style={styles.previewMeta} numberOfLines={1}>
                {typeLine}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.mediaBlock, { height: mediaHeight }]}>
          <View style={styles.heroInner}>
            {!heroPath || modelPlaceholder ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>
                  {modelPlaceholder ? 'Loadout preview' : 'Splash art'}
                </Text>
                <Text style={styles.placeholderHint}>
                  {modelPlaceholder
                    ? 'Add inGame, gameplayScreenshot, modelPreview, or screenshot on this skin in builds.json.'
                    : 'Add cardArt or splash on this skin (or keep using skin).'}
                </Text>
              </View>
            ) : (
              <ShowcaseHeroImage
                key={`${selectedSkinKey}-${heroPath}-${mainView}`}
                path={heroPath}
                godFallbackUri={godFallbackSource}
                style={styles.heroImage}
                accessibilityLabel={`${displayName} ${mainView === 'model' ? 'loadout' : 'splash'}`}
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
            accessibilityLabel="Splash art"
          >
            <Text style={[styles.segmentBtnText, mainView === 'card' && styles.segmentBtnTextActive]}>Splash</Text>
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
                const thumbSrc = pickImageSource(resolvedThumb) || godFallbackSource;
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
                    {thumbSrc ? (
                      <Image
                        source={thumbSrc}
                        style={styles.variantPrismImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
                      />
                    ) : (
                      <View style={[styles.variantPrismImage, styles.variantPrismFallback]}>
                        <Text style={styles.variantPrismFallbackText}>{label.charAt(0)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <Text style={styles.pickerLabel}>Other skins</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pickerScroll}
          contentContainerStyle={styles.pickerContent}
        >
          {skinKeysOrdered.map((key) => {
            const s = skinsRecord[key];
            const label = s?.name || key;
            const thumbPath = getSkinThumbPath(s);
            const selected = key === selectedSkinKey;
            const resolvedThumb = thumbPath ? getSkinImage(thumbPath) : null;
            const thumbSrc = pickImageSource(resolvedThumb) || godFallbackSource;

            return (
              <TouchableOpacity
                key={key}
                style={[styles.skinPill, selected && styles.skinPillSelected]}
                onPress={() => onSelectSkinKey(key)}
                accessibilityRole="button"
                accessibilityLabel={`Skin ${label}${selected ? ', selected' : ''}`}
              >
                {thumbSrc ? (
                  <Image
                    source={thumbSrc}
                    style={styles.skinPillThumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                ) : (
                  <View style={[styles.skinPillThumb, styles.skinPillThumbFallback]}>
                    <Text style={styles.skinPillThumbLetter}>{label.charAt(0)}</Text>
                  </View>
                )}
                <Text style={[styles.skinPillLabel, selected && styles.skinPillLabelSelected]} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {onRequestClose ? (
        <TouchableOpacity
          style={styles.closeCornerBtn}
          onPress={onRequestClose}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Close skins section"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeCornerBtnText}>×</Text>
        </TouchableOpacity>
      ) : null}
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
  embedWrapWithClose: {
    marginTop: 18,
    paddingTop: 4,
  },
  sheet: {
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
  closeCornerBtn: {
    position: 'absolute',
    top: -CLOSE_BTN_OFFSET + 2,
    right: -CLOSE_BTN_OFFSET,
    width: CLOSE_BTN_SIZE,
    height: CLOSE_BTN_SIZE,
    borderRadius: CLOSE_BTN_SIZE / 2,
    backgroundColor: CLOSE_BTN_BG,
    borderWidth: 1,
    borderColor: BORDER_CYAN,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  closeCornerBtnText: {
    color: CLOSE_BTN_TEXT,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -2,
  },
  previewHeader: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  previewHeaderText: {
    paddingRight: 8,
  },
  previewKicker: {
    color: LABEL_SOFT,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  previewMeta: {
    marginTop: 4,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  mediaBlock: {
    width: '100%',
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  heroInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 28,
  },
  heroImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
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
  variantChip: {
    minWidth: 36,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: '#0f1724',
    alignItems: 'center',
  },
  variantChipActive: {
    borderColor: ACCENT_SKY,
    backgroundColor: 'rgba(125, 211, 252, 0.1)',
  },
  variantChipText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  variantChipTextActive: {
    color: ACCENT_SKY,
  },
  variantPrismRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: PANEL_BORDER,
    padding: 2,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  variantPrismRingActive: {
    borderColor: '#d4a24a',
    borderWidth: 3,
    padding: 1,
    shadowColor: '#d4a24a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  variantPrismImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#030712',
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
  pickerLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pickerScroll: {
    flexGrow: 0,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  skinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 200,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: '#0f1724',
    gap: 8,
  },
  skinPillSelected: {
    borderColor: ACCENT_SKY,
    backgroundColor: 'rgba(125, 211, 252, 0.08)',
  },
  skinPillThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  skinPillThumbFallback: {
    backgroundColor: PANEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinPillThumbLetter: {
    color: ACCENT_SKY,
    fontSize: 12,
    fontWeight: '800',
  },
  skinPillLabel: {
    flex: 1,
    flexShrink: 1,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  skinPillLabelSelected: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
});
