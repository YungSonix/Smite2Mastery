import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { useAbilityTooltipDetail } from '../hooks/useAbilityTooltipDetail';
import { useEphemeralTooltipDetail } from '../hooks/useEphemeralTooltipDetail';
import { AlignedBulletLines } from './alignedBulletText';
import { getLocalGodAsset } from '../app/localIcons';
import { getAbilityStatColor } from './abilityEffectTokens';
import AbilityCompactSubtitle from './AbilityCompactSubtitle';
import { ABILITY_TOOLTIP_DETAIL } from './abilityTooltipDetail';
import TooltipDetailToggle from './TooltipDetailToggle';
import AbilityLevelPicker from './AbilityLevelPicker';
import { getTooltipLayout } from './tooltipLayout';
import { computeHoverTooltipPosition, hoverCardPositionStyle } from './computeHoverTooltipPosition';
import HoverTooltipPortal from './HoverTooltipPortal';
import {
  KIT_TOOLTIP_CARD_HEIGHT,
  KIT_TOOLTIP_CARD_HEIGHT_MINIMAL,
  KIT_TOOLTIP_CARD_HEIGHT_DESCRIPTIVE_MAX,
  buildKitAbilityTooltipBody,
  getLevelValue,
  formatAbilityStatKey,
  formatAbilityStatDisplayValue,
  pickMinimalAbilityStatEntries,
} from './kitAbilityTooltip';
import { buildKitTalentTooltipPackage } from './kitTalentTooltip';
import { getGodTalentInfo } from './stringTableLookup';
import { formatTooltipTextForDetail } from './tooltipTextSplit';
import { kitAbilityTooltipModalStyles as styles, UI_TOOLTIP_BORDER_DEFAULT } from './uiTheme';

const IS_WEB = Platform.OS === 'web';

function buildAbilityStatRows(resolvedValueKeys, { minimal, levelIndex }) {
  if (!resolvedValueKeys || typeof resolvedValueKeys !== 'object') return [];

  const source = minimal
    ? pickMinimalAbilityStatEntries(resolvedValueKeys)
    : Object.entries(resolvedValueKeys).filter(([key]) => {
        if (String(key || '').replace(/\s+/g, '').toLowerCase() === 'radiuscheat') return false;
        return true;
      });

  return source
    .map(([key, rawValue]) => {
      const levelValue = getLevelValue(rawValue, levelIndex);
      if (levelValue === null || levelValue === undefined || String(levelValue).trim() === '') {
        return null;
      }
      const label = formatAbilityStatKey(key);
      const value = formatAbilityStatDisplayValue(rawValue, levelIndex);
      return {
        key,
        label,
        labelColor: getAbilityStatColor(key, label),
        value,
      };
    })
    .filter(Boolean);
}

function renderStatBlock(rows, keyPrefix, statLabelStyleFn, statValueStyle) {
  if (!rows.length) return null;
  return (
    <View style={styles.statsBlock}>
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <View
            key={`${keyPrefix}-${row.key}`}
            style={[styles.statRow, isLast && styles.statRowLast]}
          >
            <Text style={statLabelStyleFn(row.labelColor)}>{row.label}</Text>
            <View style={styles.statValueWrap}>
              <Text style={statValueStyle}>{row.value}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function KitAbilityTooltipModal({
  visible,
  onClose,
  title,
  icon,
  body,
  subtitle,
  ability,
  god = null,
  isAspect = false,
  valueKeys,
  borderColor = UI_TOOLTIP_BORDER_DEFAULT,
  levelIndex = 0,
  onLevelIndexChange,
  iconContentFit = 'cover',
  presentation = 'modal',
  anchor = null,
  isPinned = false,
  onPin,
  onCardHoverIn,
  onCardHoverOut,
  buildUsesTalent = false,
  showTalentVariantTag = false,
}) {
  const { width: screenWidth, height: screenHeight } = useScreenDimensions();
  const layout = getTooltipLayout(screenWidth);
  const isFloatingWeb = IS_WEB && (presentation === 'hover' || presentation === 'pinned');
  const isHover = isFloatingWeb;
  const [abilityTooltipPreference] = useAbilityTooltipDetail();
  const abilityResetKey =
    ability?.key || ability?.name || title || (isAspect ? 'aspect' : 'ability');
  const [detailLevel, setDetailLevel] = useEphemeralTooltipDetail(
    visible,
    abilityTooltipPreference,
    abilityResetKey
  );

  const isMinimal = detailLevel === ABILITY_TOOLTIP_DETAIL.MINIMAL;
  const abilityLevelResetKey =
    ability?.key || ability?.name || title || (isAspect ? 'aspect' : 'ability');

  const [localLevelIndex, setLocalLevelIndex] = useState(() =>
    Number.isFinite(levelIndex) ? levelIndex : 0
  );

  useEffect(() => {
    if (visible) setLocalLevelIndex(0);
  }, [visible, abilityLevelResetKey]);

  const handleLevelChange = useCallback(
    (nextIndex) => {
      onPin?.();
      setLocalLevelIndex(nextIndex);
      onLevelIndexChange?.(nextIndex);
    },
    [onLevelIndexChange, onPin]
  );

  const handleCardHoverOut = useCallback(() => {
    if (isPinned) return;
    onCardHoverOut?.();
  }, [isPinned, onCardHoverOut]);

  const handleCardInteract = useCallback(() => {
    onPin?.();
  }, [onPin]);

  const selectedLevelIndex = localLevelIndex;

  const talentPackage = useMemo(() => {
    if (!isAspect || !god) return null;
    return buildKitTalentTooltipPackage(god, ability, detailLevel, selectedLevelIndex);
  }, [isAspect, god, ability, detailLevel, selectedLevelIndex]);

  const talentTitle = useMemo(() => {
    if (!isAspect) return title;
    return talentPackage?.name || getGodTalentInfo(god)?.name || title;
  }, [isAspect, talentPackage, god, title]);

  const displayBody = useMemo(() => {
    if (isAspect) return '';
    let raw = '';
    if (ability && typeof ability === 'object') {
      raw = buildKitAbilityTooltipBody(ability, detailLevel, god, selectedLevelIndex, {
        buildUsesTalent,
      });
    } else {
      raw = body || '';
    }
    if (!raw) return '';
    return isMinimal ? formatTooltipTextForDetail(raw, detailLevel) : raw;
  }, [ability, god, isAspect, body, detailLevel, selectedLevelIndex, buildUsesTalent, isMinimal]);

  const resolvedValueKeys = useMemo(() => {
    if (valueKeys && typeof valueKeys === 'object') return valueKeys;
    if (ability?.valueKeys && typeof ability.valueKeys === 'object') return ability.valueKeys;
    return null;
  }, [valueKeys, ability]);

  const hasValueKeys =
    resolvedValueKeys &&
    typeof resolvedValueKeys === 'object' &&
    Object.keys(resolvedValueKeys).length > 0;

  const quickStatEntries = useMemo(() => {
    if (!hasValueKeys) return [];
    return buildAbilityStatRows(resolvedValueKeys, {
      minimal: true,
      levelIndex: selectedLevelIndex,
    });
  }, [hasValueKeys, resolvedValueKeys, selectedLevelIndex]);

  const fullStatEntries = useMemo(() => {
    if (!hasValueKeys || isMinimal) return [];
    return buildAbilityStatRows(resolvedValueKeys, {
      minimal: false,
      levelIndex: selectedLevelIndex,
    });
  }, [hasValueKeys, isMinimal, resolvedValueKeys, selectedLevelIndex]);

  const cardW = layout.abilityCardWidth;

  const maxCardCap = useMemo(() => {
    if (!visible) return 320;
    const hoverViewportCap = isHover
      ? Math.round(screenHeight * (isMinimal ? 0.5 : 0.58))
      : null;
    const contentCap = Math.min(
      isMinimal ? KIT_TOOLTIP_CARD_HEIGHT : KIT_TOOLTIP_CARD_HEIGHT_DESCRIPTIVE_MAX,
      screenHeight - 40
    );
    if (hoverViewportCap != null) {
      return Math.min(hoverViewportCap, contentCap);
    }
    return contentCap;
  }, [visible, isMinimal, isHover, screenHeight]);

  const hoverPosition = useMemo(() => {
    if (!isHover || !visible) return null;
    return computeHoverTooltipPosition({
      anchor,
      cardWidth: cardW,
      maxHeight: maxCardCap,
      estimatedHeight: maxCardCap,
      screenWidth,
      screenHeight,
      preferBelow: isAspect,
    });
  }, [anchor, isAspect, isHover, visible, cardW, maxCardCap, screenWidth, screenHeight]);

  if (!visible) return null;

  const showQuickStats =
    quickStatEntries.length > 0 && (isMinimal || fullStatEntries.length === 0);

  const lineH = layout.abilityBodyLineHeight;
  const headerEst = 84;
  const scrollCap = maxCardCap - headerEst;
  const bodyLineCount = isAspect
    ? (talentPackage?.summary ? 1 : 0) +
      (talentPackage?.changedAbilities?.length || 0) * (isMinimal ? 1.5 : 3.5)
    : String(displayBody || '').split('\n').filter((l) => l.trim()).length;
  const descEst = Math.max(44, bodyLineCount * lineH * 1.3 + 12);
  const statRowH = lineH + 4;
  const quickEst = showQuickStats
    ? quickStatEntries.length * statRowH + 20 + (hasValueKeys ? 34 : 0)
    : 0;
  const fullEst =
    !isMinimal && fullStatEntries.length > 0
      ? fullStatEntries.length * statRowH + 20 + (hasValueKeys ? 34 : 0)
      : 0;
  const contentEst = descEst + quickEst + fullEst;
  const needsBodyScroll = contentEst > scrollCap - 8;

  const bodyTextStyle = {
    ...StyleSheet.flatten(styles.body),
    fontSize: layout.abilityBodyFontSize,
    lineHeight: layout.abilityBodyLineHeight,
  };
  const sectionLabelStyle = StyleSheet.flatten([
    styles.sectionLabel,
    { fontSize: layout.abilitySectionLabelSize },
  ]);
  const statLabelStyle = (color) => [
    styles.statLabel,
    { color, fontSize: layout.abilityStatFontSize },
  ];
  const statValueStyle = [styles.statValue, { fontSize: layout.abilityStatFontSize }];
  const titleStyle = [styles.title, { fontSize: layout.abilityTitleFontSize }];

  const bodySections = isAspect && talentPackage ? (
    <View style={styles.bodyColumn}>
      {talentPackage.summary ? (
        <View style={styles.talentSummarySection}>
          <Text style={sectionLabelStyle}>Talent</Text>
          <AlignedBulletLines
            text={talentPackage.summary}
            textStyle={bodyTextStyle}
            bulletMarkWidth={layout.abilityBulletMarkWidth}
            bulletGap={layout.abilityBulletGap}
            colorizeEffects
          />
        </View>
      ) : null}

      {talentPackage.changedAbilities.length > 0 ? (
        <View style={[styles.talentChangesSection, { marginTop: layout.abilitySectionGap }]}>
          <Text style={sectionLabelStyle}>Changed abilities</Text>
          {talentPackage.changedAbilities.map((entry) => {
            const localAbilityIcon = entry.icon ? getLocalGodAsset(entry.icon) : null;
            return (
            <View key={`talent-${entry.slot}`} style={styles.talentAbilityBlock}>
              <View style={styles.talentAbilityTitleRow}>
                {localAbilityIcon ? (
                  <View style={styles.talentAbilityIconWrap}>
                    <Image
                      source={localAbilityIcon}
                      style={styles.talentAbilityIcon}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={100}
                      accessibilityLabel={`${entry.name} icon`}
                    />
                  </View>
                ) : null}
                <Text style={[styles.talentAbilityTitle, { fontSize: layout.abilityStatFontSize + 1 }]}>
                  {entry.name}
                </Text>
                <View style={styles.talentVariantTag}>
                  <Text style={styles.talentVariantTagText}>Talent</Text>
                </View>
              </View>
              <AlignedBulletLines
                text={entry.body}
                textStyle={bodyTextStyle}
                bulletMarkWidth={layout.abilityBulletMarkWidth}
                bulletGap={layout.abilityBulletGap}
                colorizeEffects
              />
            </View>
            );
          })}
        </View>
      ) : null}
    </View>
  ) : (
    <View style={styles.bodyColumn}>
      <Text style={sectionLabelStyle}>{isMinimal ? 'Summary' : 'Description'}</Text>
      <AlignedBulletLines
        text={displayBody}
        textStyle={bodyTextStyle}
        bulletMarkWidth={layout.abilityBulletMarkWidth}
        bulletGap={layout.abilityBulletGap}
        colorizeEffects
      />

      {hasValueKeys && (showQuickStats || fullStatEntries.length > 0) ? (
        <View style={styles.levelAboveStatsRow}>
          <Text style={sectionLabelStyle}>Level</Text>
          {IS_WEB && isFloatingWeb && !isAspect ? (
            <View style={styles.levelHintCallout}>
              <Text style={styles.levelHintText}>
                {isPinned ? (
                  <>
                    Use <Text style={styles.levelHintEmphasis}>+/−</Text> below to compare stats per level
                  </>
                ) : (
                  <>
                    <Text style={styles.levelHintEmphasis}>Tap</Text> this tooltip first to level up the ability
                  </>
                )}
              </Text>
            </View>
          ) : null}
          <AbilityLevelPicker
            levelIndex={selectedLevelIndex}
            onChange={handleLevelChange}
            size={IS_WEB && isFloatingWeb ? 'interactive' : 'compact'}
            onInteractionStart={handleCardInteract}
          />
        </View>
      ) : null}

      {showQuickStats ? (
        <View style={[styles.statsSection, { marginTop: layout.abilitySectionGap }]} key={`quick-stats-lv-${selectedLevelIndex}`}>
          <Text style={sectionLabelStyle}>Quick stats</Text>
          {renderStatBlock(quickStatEntries, 'quick-stat', statLabelStyle, statValueStyle)}
        </View>
      ) : null}

      {!isMinimal && fullStatEntries.length > 0 ? (
        <View style={[styles.statsSection, { marginTop: layout.abilitySectionGap }]} key={`full-stats-lv-${selectedLevelIndex}`}>
          <Text style={sectionLabelStyle}>Stat values</Text>
          {renderStatBlock(fullStatEntries, 'full-stat', statLabelStyle, statValueStyle)}
        </View>
      ) : null}
    </View>
  );

  const cardContent = (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            {icon ? (() => {
              const localIcon = getLocalGodAsset(icon);
              if (localIcon) {
                return (
                  <Image
                    source={localIcon}
                    style={styles.icon}
                    contentFit={iconContentFit}
                    cachePolicy="memory-disk"
                    transition={100}
                  />
                );
              }
              return (
                <View style={styles.iconFallback}>
                  <Text style={styles.iconFallbackText}>
                    {String(title || 'A').charAt(0)}
                  </Text>
                </View>
              );
            })() : (
              <View style={styles.iconFallback}>
                <Text style={styles.iconFallbackText}>
                  {String(title || 'A').charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <Text style={[titleStyle, styles.titleFlex]}>{talentTitle}</Text>
              {showTalentVariantTag ? (
                <View style={styles.talentVariantTag}>
                  <Text style={styles.talentVariantTagText}>Talent</Text>
                </View>
              ) : null}
            </View>
            {subtitle ? <AbilityCompactSubtitle text={subtitle} /> : null}
            <TooltipDetailToggle detailLevel={detailLevel} onChange={setDetailLevel} />
          </View>
        </View>
      </View>

      {needsBodyScroll ? (
        <ScrollView
          style={[styles.bodyScroll, { maxHeight: scrollCap }]}
          contentContainerStyle={styles.bodyScrollContent}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {bodySections}
        </ScrollView>
      ) : (
        bodySections
      )}
    </>
  );

  if (isHover) {
    const pos = hoverPosition || { left: 0, top: 0, placement: 'below' };
    return (
      <HoverTooltipPortal>
        <View style={hoverStyles.layer} pointerEvents="box-none">
          <View
            {...(IS_WEB ? { dataSet: { abilityTooltipSurface: 'true' } } : {})}
            style={[
              styles.card,
              hoverStyles.card,
              hoverCardPositionStyle(pos),
              isPinned && hoverStyles.cardPinned,
              {
                borderColor,
                maxHeight: maxCardCap,
                padding: layout.cardPadding,
                width: cardW,
                maxWidth: cardW,
              },
            ]}
            onHoverIn={onCardHoverIn}
            onHoverOut={handleCardHoverOut}
            {...(IS_WEB ? { onMouseDown: handleCardInteract } : {})}
          >
            {isPinned ? (
              <TouchableOpacity
                style={[hoverStyles.closeBtn, { borderColor }]}
                onPress={onClose}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close ability preview"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={hoverStyles.closeBtnText}>×</Text>
              </TouchableOpacity>
            ) : null}
            {cardContent}
          </View>
        </View>
      </HoverTooltipPortal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlayRoot, { paddingHorizontal: layout.overlayPadding }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Dismiss ability preview"
        />
        <View style={[styles.cardWrap, { width: cardW, maxWidth: cardW }]}>
          <View
            style={[
              styles.card,
              { borderColor, maxHeight: maxCardCap, padding: layout.cardPadding },
            ]}
            onHoverIn={onCardHoverIn}
            onHoverOut={onCardHoverOut}
          >
            {cardContent}
          </View>
          <TouchableOpacity
            style={[styles.closeCornerBtn, { borderColor }]}
            onPress={onClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Close ability preview"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeCornerText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const hoverStyles = StyleSheet.create({
  layer: {
    ...(IS_WEB
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10050,
        }
      : {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10050,
          elevation: 24,
        }),
  },
  card: {
    position: 'fixed',
    ...(IS_WEB
      ? {
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
        }
      : {}),
  },
  cardPinned: {
    ...(IS_WEB
      ? {
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(125, 211, 252, 0.28)',
        }
      : {}),
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  closeBtnText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: -1,
  },
});
