import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { AlignedBulletLines } from './alignedBulletText';
import { getLocalGodAsset } from '../app/localIcons';
import {
  KIT_TOOLTIP_CARD_WIDTH,
  KIT_TOOLTIP_CARD_HEIGHT,
  KIT_TOOLTIP_LEVELS,
  getLevelValue,
  formatIncreaseFromBase,
  formatAbilityStatKey,
} from './kitAbilityTooltip';
import { kitAbilityTooltipModalStyles as styles, UI_TOOLTIP_BORDER_DEFAULT } from './uiTheme';

export default function KitAbilityTooltipModal({
  visible,
  onClose,
  title,
  icon,
  body,
  valueKeys,
  borderColor = UI_TOOLTIP_BORDER_DEFAULT,
  levelIndex = 0,
  onLevelIndexChange,
  iconContentFit = 'cover',
  onCardHoverIn,
  onCardHoverOut,
}) {
  const { width: screenWidth, height: screenHeight } = useScreenDimensions();

  if (!visible) return null;

  const cardW = Math.min(KIT_TOOLTIP_CARD_WIDTH, screenWidth - 20);
  const cardH = Math.min(KIT_TOOLTIP_CARD_HEIGHT, screenHeight - 72);
  const selectedLevelIndex = Number.isFinite(levelIndex) ? levelIndex : 0;
  const hasValueKeys =
    valueKeys && typeof valueKeys === 'object' && Object.keys(valueKeys).length > 0;
  const top = Math.max(36, (screenHeight - cardH) / 2);
  const left = Math.max(10, (screenWidth - cardW) / 2);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayRoot} pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Dismiss ability preview"
        />
        <View style={[styles.cardWrap, { top, left, width: cardW, height: cardH }]}>
          <View
            style={[styles.card, { borderColor }]}
            onHoverIn={onCardHoverIn}
            onHoverOut={onCardHoverOut}
          >
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
                  <Text style={styles.title}>{title}</Text>
                  {hasValueKeys ? (
                    <Text style={styles.subTitle}>Level scaling preview</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.headerRight}>
                {hasValueKeys ? (
                  <View style={styles.levelStepperTopRight}>
                    <TouchableOpacity
                      style={styles.levelStepperBtn}
                      onPress={() => onLevelIndexChange?.(Math.max(0, selectedLevelIndex - 1))}
                      disabled={selectedLevelIndex <= 0}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.levelStepperText,
                          selectedLevelIndex <= 0 && styles.levelStepperTextDisabled,
                        ]}
                      >
                        -
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.levelCurrentText}>
                      {KIT_TOOLTIP_LEVELS[selectedLevelIndex]}
                    </Text>
                    <TouchableOpacity
                      style={styles.levelStepperBtn}
                      onPress={() =>
                        onLevelIndexChange?.(
                          Math.min(KIT_TOOLTIP_LEVELS.length - 1, selectedLevelIndex + 1)
                        )
                      }
                      disabled={selectedLevelIndex >= KIT_TOOLTIP_LEVELS.length - 1}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.levelStepperText,
                          selectedLevelIndex >= KIT_TOOLTIP_LEVELS.length - 1 &&
                            styles.levelStepperTextDisabled,
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.descSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <ScrollView
                style={styles.descScroll}
                contentContainerStyle={styles.descScrollContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                scrollEnabled
                showsVerticalScrollIndicator
              >
                <AlignedBulletLines
                  text={body}
                  textStyle={styles.body}
                  bulletMarkWidth={12}
                  bulletGap={4}
                />
              </ScrollView>
            </View>
            {hasValueKeys ? (
              <View style={styles.statsSection}>
                <Text style={styles.sectionLabel}>Stat Values</Text>
                <ScrollView
                  style={styles.statsScroll}
                  contentContainerStyle={styles.statsScrollContent}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled
                  showsVerticalScrollIndicator
                >
                  <View style={styles.statsBlock}>
                    {Object.entries(valueKeys).map(([key, rawValue]) => {
                      if (String(key || '').replace(/\s+/g, '').toLowerCase() === 'radiuscheat') {
                        return null;
                      }
                      const levelValue = getLevelValue(rawValue, selectedLevelIndex);
                      if (
                        levelValue === null ||
                        levelValue === undefined ||
                        String(levelValue).trim() === ''
                      ) {
                        return null;
                      }
                      const delta = formatIncreaseFromBase(rawValue, selectedLevelIndex);
                      return (
                        <View key={`tip-stat-${key}`} style={styles.statRow}>
                          <Text style={styles.statLabel}>{formatAbilityStatKey(key)}</Text>
                          <View style={styles.statValueWrap}>
                            <Text style={styles.statValue}>{String(levelValue)}</Text>
                            {delta ? <Text style={styles.statDelta}>{delta}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : null}
            <Text style={styles.hint}>Tap ×, outside, or the same icon again to close.</Text>
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
