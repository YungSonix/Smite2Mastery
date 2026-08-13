import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { getConquestProfileDisplayStats } from './conquestDataPageStats';

/**
 * Renders stat rows for a Conquest NPC profile at a given stack level (×3 min).
 * Used in Database → Conquest sections.
 */
export default function ConquestNpcStatRows({ profileKey, stackLevel, styles, footerNote }) {
  const display = useMemo(
    () => getConquestProfileDisplayStats(profileKey, stackLevel),
    [profileKey, stackLevel],
  );

  if (!display?.rows?.length) {
    return (
      <Text style={styles.detailBodyText}>
        Stats not available for this creature in the current export.
      </Text>
    );
  }

  return (
    <View style={styles.detailCampStats}>
      {display.rows.map((row) => (
        <View key={row.label} style={styles.detailCampStatRow}>
          <Text style={styles.detailCampStatLabel}>{row.label}:</Text>
          <Text style={styles.detailCampStatValue}>{row.value}</Text>
        </View>
      ))}
      <View style={styles.detailCampStatRow}>
        <Text style={styles.detailCampStatLabel}>NPC level:</Text>
        <Text style={styles.detailCampStatValue}>
          {display.npcLevel} @ {display.gameTimeMinutes} min
        </Text>
      </View>
      {footerNote ? (
        <Text style={[styles.detailBodyText, { marginTop: 8, fontSize: 12, opacity: 0.85 }]}>
          {footerNote}
        </Text>
      ) : null}
    </View>
  );
}
