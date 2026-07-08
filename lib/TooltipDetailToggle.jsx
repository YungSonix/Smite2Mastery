import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { TOOLTIP_DETAIL } from './tooltipDetail';

export default function TooltipDetailToggle({ detailLevel, onChange, style }) {
  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        style={[styles.chip, detailLevel === TOOLTIP_DETAIL.MINIMAL && styles.chipActive]}
        onPress={() => onChange(TOOLTIP_DETAIL.MINIMAL)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: detailLevel === TOOLTIP_DETAIL.MINIMAL }}
        accessibilityLabel="Minimal tooltip"
      >
        <Text
          style={[
            styles.chipText,
            detailLevel === TOOLTIP_DETAIL.MINIMAL && styles.chipTextActive,
          ]}
        >
          Minimal
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.chip,
          detailLevel === TOOLTIP_DETAIL.DESCRIPTIVE && styles.chipActive,
        ]}
        onPress={() => onChange(TOOLTIP_DETAIL.DESCRIPTIVE)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: detailLevel === TOOLTIP_DETAIL.DESCRIPTIVE }}
        accessibilityLabel="Descriptive tooltip"
      >
        <Text
          style={[
            styles.chipText,
            detailLevel === TOOLTIP_DETAIL.DESCRIPTIVE && styles.chipTextActive,
          ]}
        >
          Descriptive
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1220',
  },
  chipActive: {
    borderColor: 'rgba(125, 211, 252, 0.55)',
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#7dd3fc',
  },
});
