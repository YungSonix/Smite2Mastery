import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { STAT_CHART_GOLD, STAT_CHART_GOLD_DIM } from './buildStatChartConfig';

export function formatChartTickValue(value, key) {
  if (key === 'attackSpeed') return Number(value).toFixed(2);
  if (key === 'manaRegen' || key === 'healthRegen') return Number(value).toFixed(1);
  return Math.round(value).toString();
}

/** Item / base stat card shown when a chart step is selected (tap or hover). */
export function ChartPointTooltip({ row, series, iconUri, docked = false, style }) {
  if (!row || !series?.length) return null;

  return (
    <View style={[styles.tooltip, docked && styles.tooltipDocked, style]} pointerEvents="none">
      <View style={styles.tooltipHeader}>
        {iconUri ? (
          <Image source={{ uri: iconUri }} style={styles.tooltipIcon} contentFit="contain" />
        ) : (
          <View style={styles.tooltipIconPlaceholder} />
        )}
        <Text style={styles.tooltipTitle} numberOfLines={2}>
          {row.label}
        </Text>
      </View>
      {series.map((s) => (
        <View key={s.key} style={styles.tooltipRowWrap}>
          <View style={[styles.tooltipSwatch, { backgroundColor: s.color }]} />
          <Text style={styles.tooltipRowLabel}>{s.label} (P)</Text>
          <Text style={[styles.tooltipRowValue, { color: s.color }]}>
            {formatChartTickValue(row[s.key], s.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: 12,
    minWidth: 148,
    maxWidth: 220,
    backgroundColor: 'rgba(6, 10, 18, 0.97)',
    borderWidth: 1.5,
    borderColor: STAT_CHART_GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 4,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 16px 36px rgba(0,0,0,0.55)' }
      : {}),
  },
  tooltipDocked: {
    position: 'relative',
    top: 0,
    alignSelf: 'stretch',
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
    maxWidth: '100%',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: STAT_CHART_GOLD_DIM,
  },
  tooltipIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  tooltipIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  tooltipTitle: {
    flex: 1,
    color: STAT_CHART_GOLD,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tooltipRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  tooltipSwatch: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tooltipRowLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  tooltipRowValue: {
    fontSize: 11,
    fontWeight: '800',
  },
});
