import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
 * Inline skin showcase (strip + hero + footer) for god detail — matches kit-tooltip chrome.
 * Optional `onRequestClose` renders corner × (e.g. collapse Skins section).
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

  useEffect(() => {
    setVariantIdx(0);
  }, [selectedSkinKey]);

  const godFallbackSource = useMemo(() => (godIconPath ? getLocalGodAsset(godIconPath) : null), [godIconPath]);

  const baseSkin = skinsRecord && selectedSkinKey ? skinsRecord[selectedSkinKey] : null;
  const variants = useMemo(() => parseSkinVariants(baseSkin), [baseSkin]);
  const mergedSkin = useMemo(() => mergeSkinVariant(baseSkin, variants[variantIdx]), [baseSkin, variants, variantIdx]);

  const cardPath = getSkinCardArtPath(mergedSkin);
  const modelPath = getSkinModelViewPath(mergedSkin);

  const heroPath =
    mainView === 'model'
      ? modelPath || null
      : cardPath || modelPath || null;
  const modelPlaceholder = mainView === 'model' && !modelPath;

  const mediaHeight = Math.min(340, Math.round(SCREEN_HEIGHT * 0.42));

  const toggleMainView = useCallback(() => {
    setMainView((v) => (v === 'card' ? 'model' : 'card'));
  }, []);

  if (!skinsRecord || !skinKeysOrdered?.length || !selectedSkinKey || !baseSkin) return null;

  return (
    <View style={[styles.embedWrap, onRequestClose ? styles.embedWrapWithClose : null]}>
      <View style={styles.sheet}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stripScroll}
          contentContainerStyle={styles.stripContent}
        >
          {skinKeysOrdered.map((key) => {
            const s = skinsRecord[key];
            const thumbPath = getSkinThumbPath(s);
            const selected = key === selectedSkinKey;
            const resolvedThumb = thumbPath ? getSkinImage(thumbPath) : null;
            const thumbSrc = pickImageSource(resolvedThumb) || godFallbackSource;

            return (
              <TouchableOpacity
                key={key}
                style={[styles.stripItem, selected && styles.stripItemSelected]}
                onPress={() => onSelectSkinKey(key)}
                accessibilityRole="button"
                accessibilityLabel={`Skin ${s?.name || key}${selected ? ', selected' : ''}`}
              >
                {thumbSrc ? (
                  <Image
                    source={thumbSrc}
                    style={styles.stripImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                ) : (
                  <View style={[styles.stripImage, styles.stripFallback]}>
                    <Text style={styles.stripFallbackText}>{(s?.name || key || '?').charAt(0)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.mediaBlock, { height: mediaHeight }]}>
          <TouchableOpacity
            style={styles.viewModelBtn}
            onPress={toggleMainView}
            accessibilityRole="button"
            accessibilityLabel={mainView === 'card' ? 'View model or gameplay image' : 'View card art'}
          >
            <Text style={styles.viewModelBtnText}>{mainView === 'card' ? 'VIEW MODEL' : 'VIEW CARD'}</Text>
          </TouchableOpacity>

          {variants.length > 1 ? (
            <View style={styles.variantRow}>
              {variants.map((_, i) => (
                <TouchableOpacity
                  key={`variant-${i}`}
                  style={[styles.variantDotOuter, i === variantIdx && styles.variantDotOuterActive]}
                  onPress={() => setVariantIdx(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Variant ${i + 1}`}
                >
                  <View style={[styles.variantDotInner, i === variantIdx && styles.variantDotInnerActive]} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.heroInner}>
            {!heroPath || modelPlaceholder ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>
                  {modelPlaceholder ? 'Model / gameplay' : 'Card art'}
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
                accessibilityLabel={`${baseSkin?.name || selectedSkinKey} ${mainView === 'model' ? 'model' : 'card art'}`}
              />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.skinTitle}>
            {(mergedSkin?.name || selectedSkinKey || 'Skin').toUpperCase()}
          </Text>
        </View>
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
    paddingTop: 12,
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
  stripScroll: {
    flexGrow: 0,
    marginBottom: 12,
    maxHeight: 52,
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
    minWidth: '100%',
  },
  stripItem: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
  },
  stripItemSelected: {
    borderColor: ACCENT_SKY,
    borderWidth: 2,
  },
  stripImage: {
    width: '100%',
    height: '100%',
  },
  stripFallback: {
    backgroundColor: PANEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripFallbackText: {
    color: ACCENT_SKY,
    fontWeight: '800',
    fontSize: 16,
  },
  mediaBlock: {
    width: '100%',
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  viewModelBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 8,
    backgroundColor: PANEL_BG,
  },
  viewModelBtnText: {
    color: ACCENT_SKY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  variantRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variantDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 22, 0.9)',
  },
  variantDotOuterActive: {
    borderColor: ACCENT_SKY,
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
  variantDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  variantDotInnerActive: {
    backgroundColor: ACCENT_SKY,
  },
  heroInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 36,
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
    letterSpacing: 0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderHint: {
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
    alignItems: 'center',
  },
  skinTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
