import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform } from 'react-native';

import { KIT_TOOLTIP_LEVELS } from './kitAbilityTooltip';

const IS_WEB = Platform.OS === 'web';
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_INTERACTIVE = { top: 10, bottom: 10, left: 10, right: 10 };

const STEP = {
  compact: { size: 26, glyph: 15, radius: 13 },
  interactive: { size: 28, glyph: 16, radius: 14 },
};

function StepButton({ glyph, disabled, onPress, onPressIn, accessibilityLabel, size = 'compact' }) {
  const scale = useRef(new Animated.Value(1)).current;
  const metrics = STEP[size] ?? STEP.compact;

  const handlePressIn = (event) => {
    event?.stopPropagation?.();
    onPressIn?.(event);
  };

  const handlePress = (event) => {
    event?.stopPropagation?.();
    if (disabled) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 320,
        useNativeDriver: true,
      }),
    ]).start();
    onPress?.();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={size === 'interactive' ? HIT_SLOP_INTERACTIVE : HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={
        disabled || IS_WEB
          ? undefined
          : { color: 'rgba(125, 211, 252, 0.38)', borderless: false, radius: metrics.radius }
      }
      style={({ pressed }) => [
        styles.btn,
        {
          width: metrics.size,
          height: metrics.size,
          borderRadius: metrics.radius,
        },
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Animated.View style={[styles.btnInner, { transform: [{ scale }] }]}>
        <Text
          style={[
            styles.btnGlyph,
            { fontSize: metrics.glyph, lineHeight: metrics.glyph + 1 },
            disabled && styles.btnGlyphDisabled,
          ]}
        >
          {glyph}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Compact − / level / + stepper for ability stat scaling. */
export default function AbilityLevelPicker({
  levelIndex,
  onChange,
  levels = KIT_TOOLTIP_LEVELS,
  size = 'compact',
  onInteractionStart,
}) {
  const selected = Number.isFinite(levelIndex) ? levelIndex : 0;
  const atMin = selected <= 0;
  const atMax = selected >= levels.length - 1;
  const displayLevel = levels[selected] ?? selected + 1;
  const interactive = size === 'interactive';

  const readoutScale = useRef(new Animated.Value(1)).current;
  const readoutGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    readoutScale.setValue(1);
    readoutGlow.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(readoutScale, { toValue: 1.12, duration: 85, useNativeDriver: true }),
        Animated.spring(readoutScale, {
          toValue: 1,
          friction: 5,
          tension: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(readoutGlow, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(readoutGlow, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, [displayLevel, readoutGlow, readoutScale]);

  const pinBeforeChange = (event) => {
    event?.stopPropagation?.();
    onInteractionStart?.();
  };

  return (
    <View
      style={[styles.wrap, interactive && styles.wrapInteractive]}
      accessibilityLabel={`Ability level ${displayLevel}`}
      {...(IS_WEB ? { dataSet: { abilityTooltipControls: 'true' } } : {})}
    >
      <StepButton
        glyph="−"
        size={size}
        disabled={atMin}
        onPressIn={pinBeforeChange}
        onPress={() => onChange?.(selected - 1)}
        accessibilityLabel="Decrease ability level"
      />

      <Animated.View
        style={[
          styles.readout,
          interactive && styles.readoutInteractive,
          { transform: [{ scale: readoutScale }] },
        ]}
      >
        <Animated.View style={[styles.readoutGlow, { opacity: readoutGlow }]} />
        <Text style={[styles.readoutValue, interactive && styles.readoutValueInteractive]}>
          {displayLevel}
        </Text>
      </Animated.View>

      <StepButton
        glyph="+"
        size={size}
        disabled={atMax}
        onPressIn={pinBeforeChange}
        onPress={() => onChange?.(selected + 1)}
        accessibilityLabel="Increase ability level"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.32)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
  },
  wrapInteractive: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderColor: 'rgba(125, 211, 252, 0.48)',
    backgroundColor: 'rgba(11, 18, 32, 0.98)',
  },
  btn: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    flexGrow: 0,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'background-color 0.12s ease, border-color 0.12s ease',
      },
      default: {},
    }),
  },
  btnPressed: {
    borderColor: 'rgba(125, 211, 252, 0.75)',
    backgroundColor: 'rgba(125, 211, 252, 0.18)',
  },
  btnDisabled: {
    opacity: 0.32,
    borderColor: '#1e293b',
    backgroundColor: '#0b1220',
  },
  btnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGlyph: {
    color: '#e2e8f0',
    fontWeight: '700',
    textAlign: 'center',
    userSelect: 'none',
    includeFontPadding: false,
  },
  btnGlyphDisabled: {
    color: '#64748b',
  },
  readout: {
    minWidth: 20,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  readoutInteractive: {
    minWidth: 24,
    width: 24,
  },
  readoutGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: 'rgba(125, 211, 252, 0.35)',
  },
  readoutValue: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
    zIndex: 1,
    textAlign: 'center',
  },
  readoutValueInteractive: {
    fontSize: 15,
    lineHeight: 17,
  },
});
