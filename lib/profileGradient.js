import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { UI_THEME } from './uiTheme';

/** @returns {string[] | null} */
export function getProfileGradientStops(gradient) {
  if (!Array.isArray(gradient)) return null;
  const stops = gradient
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => /^#[0-9a-f]{3,6}$/i.test(c));
  return stops.length >= 2 ? stops.slice(0, 5) : null;
}

/** Gradient from theme settings, or single accent color for a matching glow. */
export function resolveProfileThemeStops(profileColor, profileGradient) {
  const fromGradient = getProfileGradientStops(profileGradient);
  if (fromGradient) return fromGradient;
  const accent = typeof profileColor === 'string' ? profileColor.trim() : '';
  if (/^#[0-9a-f]{3,6}$/i.test(accent)) {
    const hex = accent.toUpperCase();
    return [hex, hex];
  }
  return null;
}

function buildGlowShadow(stops) {
  const end = stops[stops.length - 1];
  return Platform.OS === 'web'
    ? {
        boxShadow: `0 0 22px ${stops[0]}aa, 0 0 44px ${end}77, 0 0 64px ${stops[0]}44`,
      }
    : {
        shadowColor: stops[0],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 18,
        elevation: 12,
      };
}

/** Gradient ring + glow around profile card (web + native). */
export function ProfileGradientBorderWrap({ gradient, children, style }) {
  const stops = getProfileGradientStops(gradient);
  if (!stops) {
    return <View style={style}>{children}</View>;
  }
  const glow = buildGlowShadow(stops);

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          wrapStyles.webOuter,
          glow,
          {
            backgroundImage: `linear-gradient(135deg, ${stops.join(', ')})`,
          },
          style,
        ]}
      >
        <View style={wrapStyles.webInner}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[wrapStyles.nativeOuter, glow, style]}>
      <ProfileGradientBorderRing stops={stops} borderRadius={16} />
      <View style={wrapStyles.nativeInner}>{children}</View>
    </View>
  );
}

function ProfileGradientBorderRing({ stops, borderRadius = 16, style }) {
  const end = stops[stops.length - 1];
  return (
    <View
      style={[StyleSheet.absoluteFillObject, { borderRadius, overflow: 'hidden' }, style]}
      pointerEvents="none"
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: stops[0] }]} />
      <View
        style={{
          position: 'absolute',
          right: '-12%',
          top: 0,
          bottom: 0,
          width: '70%',
          backgroundColor: end,
          transform: [{ skewX: '-10deg' }],
        }}
      />
    </View>
  );
}

const wrapStyles = StyleSheet.create({
  webOuter: {
    marginBottom: 24,
    borderRadius: 16,
    padding: 3,
    overflow: 'visible',
    alignSelf: 'stretch',
    flexGrow: 0,
  },
  webInner: {
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: UI_THEME.panelBgSection,
  },
  nativeOuter: {
    marginBottom: 24,
    borderRadius: 16,
    padding: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  nativeInner: {
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: UI_THEME.panelBgSection,
  },
});
