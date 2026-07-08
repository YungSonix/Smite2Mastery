import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ItemTagChips from './ItemTagChips';
import { getItemShortDescription } from './stringTableLookup';

export function ItemTierBadge({ tier, style }) {
  if (tier == null || tier === '') return null;
  const n = Number(tier);
  const tierLabel = Number.isFinite(n) ? String(n) : String(tier).trim();
  if (!tierLabel) return null;

  return (
    <View style={[styles.tierBadge, style]} accessibilityLabel={`Tier ${tierLabel} item`}>
      <Text style={styles.tierBadgePrefix}>Tier:</Text>
      <Text style={styles.tierBadgeValue}>{tierLabel}</Text>
    </View>
  );
}

/** Item name + inline tier badge + compact tags under the title. */
export default function ItemNameMeta({
  item,
  name,
  titleStyle,
  accentColor,
  wrapStyle,
  hideSubtitle = false,
  hideTags = false,
}) {
  const displayName = name || item?.name || item?.internalName || 'Unknown Item';
  const subtitle = hideSubtitle ? null : getItemShortDescription(item);

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <View style={styles.nameRow}>
        <Text
          style={[styles.title, accentColor ? { color: accentColor } : null, titleStyle]}
          numberOfLines={2}
        >
          {displayName}
        </Text>
        <ItemTierBadge tier={item?.tier} />
      </View>
      {hideTags ? null : <ItemTagChips item={item} compact hideTitle />}
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    color: '#e6eef8',
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexShrink: 0,
  },
  tierBadgePrefix: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tierBadgeValue: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
