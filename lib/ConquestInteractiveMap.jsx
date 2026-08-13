import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import {
  CONQUEST_MAP_VIEWBOX,
  CONQUEST_MAP_ASSETS,
  getConquestMapPoints,
} from '../app/data/Gamemodes/Conquest/conquestMapPoints';
import {
  getConquestNpcProfile,
  getConquestStatsKeyForPoi,
} from '../app/data/Gamemodes/Conquest/conquestNpcStats';
import { getBlueprintMetaForStatsKey } from '../app/data/Gamemodes/Conquest/conquestBlueprintRefs';
import { getConquestPoiPortrait } from './conquestNpcIcons';
import {
  getConquestPoiSpriteSource,
  getConquestPoiSpriteSize,
} from '../app/data/Gamemodes/Conquest/conquestMapSvgSprites';
import { getBuffHelpTextForLevel } from './conquestBuffInfamy';
import { getConquestBuffColor } from './conquestBuffColors';
import ConquestTooltipBody from './ConquestTooltipBody';
import {
  computeConquestPoiStats,
  formatHoverStatLine,
} from './conquestMapScaling';
import TooltipDetailToggle from './TooltipDetailToggle';
import { DEFAULT_TOOLTIP_DETAIL, isMinimalTooltipDetail } from './tooltipDetail';
import { getTooltipLayout } from './tooltipLayout';
import { UI_THEME, kitAbilityTooltipModalStyles } from './uiTheme';
import { COLORS } from './themeColors';

const IS_WEB = Platform.OS === 'web';
const MOBILE_MAP_WIDTH_RATIO = 0.86;
const TOOLTIP_HEADER_EST = 132;
const tooltipStyles = kitAbilityTooltipModalStyles;

/** Soft glow color per map icon — matches in-game objective hues. */
const POI_GLOW_COLOR = {
  inspiration: '#e879f9',
  primal: '#60a5fa',
  blight: '#f87171',
  pathfinder: '#fbbf24',
  tower: '#fb923c',
  phoenix: '#fb923c',
  titan: '#cbd5e1',
  camp: '#fbbf24',
  boss: '#f59e0b',
  goldFury: '#f59e0b',
  fireGiant: '#ef4444',
  objective: '#a78bfa',
};

function getPoiGlowColor(iconKey) {
  return POI_GLOW_COLOR[iconKey] || '#fbbf24';
}

/** Colored halo behind the icon silhouette (web). */
function getPoiIconGlowFilter(glowColor, selected) {
  if (!IS_WEB || !glowColor) return undefined;
  const inner = selected ? 5 : 3;
  const outer = selected ? 14 : 9;
  return `drop-shadow(0 0 ${inner}px ${glowColor}) drop-shadow(0 0 ${outer}px ${glowColor}bb) brightness(${selected ? 1.08 : 1.04})`;
}

function pct(value) {
  return `${(value / CONQUEST_MAP_VIEWBOX) * 100}%`;
}

function relPct(part, whole) {
  return `${(part / whole) * 100}%`;
}

function usePoiStats(point, gameTimeMinutes) {
  return useMemo(() => {
    if (!point) return { profile: null, stats: null, blueprintMeta: null };
    const profile = getConquestNpcProfile(point.id);
    const stats = profile ? computeConquestPoiStats(profile, gameTimeMinutes) : null;
    const blueprintMeta = getBlueprintMetaForStatsKey(profile?.blueprintRef || null);
    return { profile, stats, blueprintMeta };
  }, [point, gameTimeMinutes]);
}

function getHotspotLayout(point) {
  const spriteSize = getConquestPoiSpriteSize(point.id);
  if (spriteSize?.w && spriteSize?.h) {
    const pad = 6;
    return {
      left: point.x - pad,
      top: point.y - pad,
      w: Math.max(spriteSize.w + pad * 2, point.w),
      h: Math.max(spriteSize.h + pad * 2, point.h),
      iconLeft: point.x,
      iconTop: point.y,
      iconW: spriteSize.w,
      iconH: spriteSize.h,
    };
  }
  return {
    left: point.x,
    top: point.y,
    w: point.w,
    h: point.h,
    iconLeft: point.x,
    iconTop: point.y,
    iconW: point.w,
    iconH: point.h,
  };
}

function getPoiTooltipIcon(point) {
  if (!point) return null;
  return (
    getConquestPoiPortrait(point.id, getConquestStatsKeyForPoi(point.id)) ||
    getConquestPoiSpriteSource(point.id)
  );
}

function ConquestMapHotspot({ point, isSelected, isHovered, gameTimeMinutes, infamyCampLevel, onHover, onSelect }) {
  const { stats, blueprintMeta } = usePoiStats(point, gameTimeMinutes);
  const active = isHovered || isSelected;
  const hoverStatLine = active ? formatHoverStatLine(stats, blueprintMeta) : '';
  const hoverBuffLine = useMemo(
    () => getBuffHelpTextForLevel(point.helpTipKeys, infamyCampLevel),
    [point.helpTipKeys, infamyCampLevel]
  );
  const buffColor = getConquestBuffColor(point, blueprintMeta) || UI_THEME.accentSky;
  const tooltipIcon = useMemo(() => getPoiTooltipIcon(point), [point]);
  const spriteSource = getConquestPoiSpriteSource(point.id);
  const layout = getHotspotLayout(point);
  const glowColor = getPoiGlowColor(point.icon);
  const displayTitle = blueprintMeta?.title || point.title;

  return (
    <Pressable
      style={({ hovered, pressed }) => [
        styles.hotspot,
        {
          left: pct(layout.left),
          top: pct(layout.top),
          width: pct(layout.w),
          height: pct(layout.h),
        },
        (hovered || isHovered || pressed) && styles.hotspotElevated,
      ]}
      onHoverIn={() => onHover(point.id)}
      onHoverOut={() => onHover(null)}
      onPressIn={() => {
        if (!IS_WEB) onHover(point.id);
      }}
      onPressOut={() => {
        if (!IS_WEB) onHover(null);
      }}
      onPress={() => onSelect(point)}
      accessibilityRole="button"
      accessibilityLabel={`${point.title}. ${point.subtitle}`}
      accessibilityHint={IS_WEB ? 'Hover for preview, click for full details' : 'Show details'}
      hitSlop={8}
    >
      {active && spriteSource ? (
        <Image
          pointerEvents="none"
          source={spriteSource}
          style={[
            styles.poiMapIcon,
            {
              left: relPct(layout.iconLeft - layout.left, layout.w),
              top: relPct(layout.iconTop - layout.top, layout.h),
              width: relPct(layout.iconW, layout.w),
              height: relPct(layout.iconH, layout.h),
            },
            active && IS_WEB && { filter: getPoiIconGlowFilter(glowColor, isSelected) },
            active &&
              !IS_WEB && {
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isSelected ? 0.95 : 0.75,
                shadowRadius: isSelected ? 12 : 8,
                transform: [{ scale: isSelected ? 1.05 : 1.02 }],
              },
          ]}
          contentFit="contain"
        />
      ) : null}

      {IS_WEB && isHovered && !isSelected ? (
        <View pointerEvents="none" style={styles.hoverChip}>
          <View style={styles.hoverChipHeader}>
            {tooltipIcon ? (
              <Image source={tooltipIcon} style={styles.hoverChipIcon} contentFit="contain" />
            ) : null}
            <View style={styles.hoverChipHeaderText}>
              <Text style={styles.hoverChipTitle} numberOfLines={1}>
                {displayTitle}
              </Text>
              {point.subtitle ? (
                <Text style={[styles.hoverChipSubtitle, buffColor && { color: buffColor }]} numberOfLines={1}>
                  {point.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {hoverBuffLine ? (
            <Text style={[styles.hoverChipBuff, { color: buffColor }]} numberOfLines={3}>
              {hoverBuffLine}
            </Text>
          ) : null}
          {hoverStatLine ? (
            <Text style={styles.hoverChipStats} numberOfLines={2}>
              {hoverStatLine}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function ConquestPoiTooltip({ point, visible, gameTimeMinutes, infamyCampLevel, onClose }) {
  const { width: screenWidth, height: screenHeight } = useScreenDimensions();
  const layout = getTooltipLayout(screenWidth);
  const { profile, stats, blueprintMeta } = usePoiStats(point, gameTimeMinutes);
  const [detailLevel, setDetailLevel] = useState(DEFAULT_TOOLTIP_DETAIL);
  const buffColor = getConquestBuffColor(point, blueprintMeta);

  useEffect(() => {
    setDetailLevel(DEFAULT_TOOLTIP_DETAIL);
  }, [point?.id]);
  const minimal = isMinimalTooltipDetail(detailLevel);
  const tooltipIconSource = useMemo(() => getPoiTooltipIcon(point), [point]);
  const displayTitle = blueprintMeta?.title || point?.title;

  const maxCardCap = useMemo(() => {
    if (!visible) return 360;
    const viewportCap = Math.round(screenHeight * (IS_WEB ? 0.85 : 0.88));
    return Math.min(viewportCap, screenHeight - (layout.compact ? 24 : 40));
  }, [visible, screenHeight, layout.compact]);

  const scrollCap = Math.max(120, maxCardCap - TOOLTIP_HEADER_EST);
  const cardWidth = Math.min(520, screenWidth - layout.overlayPadding * 2);

  if (!point) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[tooltipStyles.overlayRoot, { paddingHorizontal: layout.overlayPadding }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Dismiss map details"
        />
        <View style={[tooltipStyles.cardWrap, styles.tooltipCardWrap, { width: cardWidth, maxWidth: cardWidth }]}>
          <View
            style={[
              tooltipStyles.card,
              styles.tooltipCard,
              { maxHeight: maxCardCap, padding: layout.cardPadding },
            ]}
          >
            <View style={styles.tooltipHeader}>
              {tooltipIconSource ? (
                <Image source={tooltipIconSource} style={styles.tooltipIcon} contentFit="contain" />
              ) : (
                <View style={styles.tooltipIconFallback}>
                  <Text style={styles.tooltipIconFallbackText}>?</Text>
                </View>
              )}
              <View style={styles.tooltipHeaderText}>
                <Text style={styles.tooltipTitle}>{displayTitle}</Text>
                {point.subtitle ? (
                  <Text style={[styles.tooltipSubtitle, buffColor && { color: buffColor }]}>
                    {point.subtitle}
                  </Text>
                ) : null}
                <Text style={styles.tooltipCategory}>{point.category.toUpperCase()}</Text>
                <TooltipDetailToggle detailLevel={detailLevel} onChange={setDetailLevel} />
              </View>
            </View>
            <ScrollView
              style={[styles.tooltipBodyScroll, { maxHeight: scrollCap }]}
              contentContainerStyle={styles.tooltipBodyScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              bounces
            >
              <ConquestTooltipBody
                point={point}
                minimal={minimal}
                stats={stats}
                gameTimeMinutes={gameTimeMinutes}
                blueprintMeta={blueprintMeta}
                profile={profile}
                infamyCampLevel={infamyCampLevel}
              />
            </ScrollView>
          </View>
          <TouchableOpacity
            style={tooltipStyles.closeCornerBtn}
            onPress={onClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Close tooltip"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={tooltipStyles.closeCornerText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MapSimControls({ minutes, onMinutesChange, infamyLevel, onInfamyChange }) {
  return (
    <View style={styles.controlsRow}>
      <View style={styles.controlsGroup}>
        <Text style={styles.controlsLabel}>Time</Text>
        <Pressable
          style={styles.controlsBtn}
          onPress={() => onMinutesChange(Math.max(0, minutes - 3))}
          accessibilityLabel="Decrease match time by 3 minutes"
        >
          <Text style={styles.controlsBtnText}>−3m</Text>
        </Pressable>
        <Text style={styles.controlsValue}>{minutes}m</Text>
        <Pressable
          style={styles.controlsBtn}
          onPress={() => onMinutesChange(Math.min(45, minutes + 3))}
          accessibilityLabel="Increase match time by 3 minutes"
        >
          <Text style={styles.controlsBtnText}>+3m</Text>
        </Pressable>
      </View>

      <View style={styles.controlsDivider} />

      <View style={styles.controlsGroup}>
        <Text style={styles.controlsLabel}>Infamy</Text>
        {[1, 2, 3].map((tier) => {
          const active = infamyLevel === tier;
          return (
            <Pressable
              key={tier}
              style={[styles.controlsTierBtn, active && styles.controlsTierBtnActive]}
              onPress={() => onInfamyChange(tier)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Camp level ${tier}`}
            >
              <Text style={[styles.controlsTierText, active && styles.controlsTierTextActive]}>
                L{tier}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ConquestInteractiveMap() {
  const { width: screenWidth } = useScreenDimensions();
  const [variant, setVariant] = useState('day');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [hoveredPointId, setHoveredPointId] = useState(null);
  const [gameTimeMinutes, setGameTimeMinutes] = useState(0);
  const [infamyCampLevel, setInfamyCampLevel] = useState(1);

  const mapWidth = IS_WEB
    ? Math.min(screenWidth - 32, 640)
    : Math.round((screenWidth - 40) * MOBILE_MAP_WIDTH_RATIO);
  const points = useMemo(() => getConquestMapPoints(variant), [variant]);
  const mapSource = variant === 'night' ? CONQUEST_MAP_ASSETS.night : CONQUEST_MAP_ASSETS.day;

  const closeTooltip = useCallback(() => setSelectedPoint(null), []);
  const handleHover = useCallback((pointId) => setHoveredPointId(pointId), []);

  const clearMapFocus = useCallback(() => {
    setHoveredPointId(null);
    setSelectedPoint(null);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, variant === 'day' && styles.toggleBtnActive]}
          onPress={() => {
            setVariant('day');
            clearMapFocus();
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: variant === 'day' }}
        >
          <Text style={[styles.toggleLabel, variant === 'day' && styles.toggleLabelActive]}>Day</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, variant === 'night' && styles.toggleBtnActive]}
          onPress={() => {
            setVariant('night');
            clearMapFocus();
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: variant === 'night' }}
        >
          <Text style={[styles.toggleLabel, variant === 'night' && styles.toggleLabelActive]}>Night</Text>
        </Pressable>
      </View>

      <MapSimControls
        minutes={gameTimeMinutes}
        onMinutesChange={setGameTimeMinutes}
        infamyLevel={infamyCampLevel}
        onInfamyChange={setInfamyCampLevel}
      />

      <Text style={styles.hint}>
        {IS_WEB
          ? 'Hover icons for a soft glow · click for stats and buff details.'
          : 'Tap icons for stats and buff details.'}
      </Text>

      <View style={[styles.mapFrame, { width: mapWidth, height: mapWidth }]}>
        <View style={[styles.mapClip, { width: mapWidth, height: mapWidth }]}>
          <Image
            source={mapSource}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel={variant === 'night' ? 'Conquest map at night' : 'Conquest map during the day'}
          />
        </View>
        {points.map((point) => (
          <ConquestMapHotspot
            key={`${variant}-${point.id}`}
            point={point}
            isSelected={selectedPoint?.id === point.id}
            isHovered={hoveredPointId === point.id}
            gameTimeMinutes={gameTimeMinutes}
            infamyCampLevel={infamyCampLevel}
            onHover={handleHover}
            onSelect={setSelectedPoint}
          />
        ))}
      </View>

      <ConquestPoiTooltip
        point={selectedPoint}
        visible={Boolean(selectedPoint)}
        gameTimeMinutes={gameTimeMinutes}
        infamyCampLevel={infamyCampLevel}
        onClose={closeTooltip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    padding: 4,
    borderRadius: 10,
    backgroundColor: UI_THEME.panelBg,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: UI_THEME.borderCyanFill12,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
  },
  toggleLabel: {
    color: UI_THEME.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleLabelActive: {
    color: UI_THEME.accentSky,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: UI_THEME.panelBgAlt,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    maxWidth: '100%',
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  controlsDivider: {
    width: 1,
    height: 18,
    backgroundColor: UI_THEME.panelBorder,
    marginHorizontal: 2,
  },
  controlsLabel: {
    color: UI_THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  controlsBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: UI_THEME.borderCyanFill10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
  },
  controlsBtnText: {
    color: UI_THEME.accentSky,
    fontSize: 11,
    fontWeight: '700',
  },
  controlsValue: {
    color: UI_THEME.textBright,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  controlsTierBtn: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
  },
  controlsTierBtnActive: {
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.borderCyanFill12,
  },
  controlsTierText: {
    color: UI_THEME.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  controlsTierTextActive: {
    color: UI_THEME.accentSky,
  },
  hint: {
    color: UI_THEME.textHint,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  mapFrame: {
    position: 'relative',
    overflow: 'visible',
  },
  mapClip: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: COLORS.bgDeep,
  },
  hotspot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...(IS_WEB ? { cursor: 'pointer' } : null),
  },
  hotspotElevated: {
    zIndex: 20,
  },
  poiMapIcon: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  hoverChip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    width: 220,
    marginLeft: -110,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: UI_THEME.cardBg,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    ...UI_THEME.shadowCard,
  },
  hoverChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoverChipIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  hoverChipHeaderText: {
    flex: 1,
  },
  hoverChipTitle: {
    color: UI_THEME.textBright,
    fontSize: 12,
    fontWeight: '700',
  },
  hoverChipSubtitle: {
    color: UI_THEME.labelSoft,
    fontSize: 10,
    marginTop: 2,
  },
  hoverChipBuff: {
    color: UI_THEME.textBody,
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  hoverChipStats: {
    color: UI_THEME.statDelta,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  tooltipCardWrap: {
    paddingHorizontal: 0,
    width: '100%',
  },
  tooltipCard: {
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    flexShrink: 0,
  },
  tooltipIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: UI_THEME.mediaBg,
  },
  tooltipIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: UI_THEME.mediaBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
  },
  tooltipIconFallbackText: {
    color: UI_THEME.textIconFallback,
    fontSize: 18,
    fontWeight: '700',
  },
  tooltipHeaderText: {
    flex: 1,
    paddingRight: 28,
  },
  tooltipTitle: {
    color: UI_THEME.textBright,
    fontSize: 17,
    fontWeight: '700',
  },
  tooltipSubtitle: {
    color: UI_THEME.labelSoft,
    fontSize: 13,
    marginTop: 2,
  },
  tooltipCategory: {
    color: UI_THEME.textHint,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 4,
    fontWeight: '600',
  },
  tooltipBodyScroll: {
    flexShrink: 1,
    width: '100%',
    ...(IS_WEB ? { overflow: 'auto' } : null),
  },
  tooltipBodyScrollContent: {
    paddingBottom: 24,
  },
  tooltipBody: {
    color: UI_THEME.textBody,
    fontSize: 14,
    lineHeight: 21,
  },
});
