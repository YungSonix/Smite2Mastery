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

export default function KitAbilityTooltipModal({
  visible,
  onClose,
  title,
  icon,
  body,
  valueKeys,
  borderColor = 'rgba(125, 211, 252, 0.42)',
  levelIndex = 0,
  onLevelIndexChange,
  iconContentFit = 'cover',
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
          <View style={[styles.card, { borderColor }]}>
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

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.42)',
  },
  cardWrap: {
    position: 'absolute',
    zIndex: 4,
    elevation: 10,
    overflow: 'visible',
  },
  card: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(8, 12, 22, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#f1f5f9',
    fontWeight: '800',
    fontSize: 15,
  },
  subTitle: {
    marginTop: 2,
    color: '#7dd3fc',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexShrink: 0,
  },
  closeCornerBtn: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  closeCornerText: {
    color: '#e6eef8',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -2,
  },
  sectionLabel: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  levelStepperTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#0b1220',
  },
  levelStepperBtn: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelStepperText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
  levelStepperTextDisabled: {
    color: '#64748b',
  },
  levelCurrentText: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
    minWidth: 14,
    textAlign: 'center',
  },
  descSection: {
    marginBottom: 6,
  },
  descScroll: {
    height: 118,
    marginHorizontal: -2,
  },
  descScrollContent: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  statsSection: {
    marginBottom: 4,
    height: 148,
    minHeight: 148,
  },
  statsScroll: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    backgroundColor: '#0b1220',
  },
  statsScrollContent: {
    paddingBottom: 8,
  },
  statsBlock: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statLabel: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
    flexWrap: 'wrap',
  },
  statValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: '46%',
    flexShrink: 1,
    minWidth: 0,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  statDelta: {
    color: '#67e8f9',
    fontSize: 8,
    fontWeight: '700',
    flexShrink: 0,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 14,
  },
  hint: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
