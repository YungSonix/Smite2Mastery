import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getItemDisplayTags } from './itemTags';

function chipBackground(color) {
  if (!color || !color.startsWith('#') || color.length < 7) return 'rgba(15, 23, 42, 0.9)';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

/** Color-coded item tag chips (store / descriptor tags). */
export default function ItemTagChips({
  item,
  style,
  title = 'Tags',
  compact = false,
  hideTitle = false,
}) {
  const tags = getItemDisplayTags(item);
  if (!tags.length) return null;

  const showTitle = !hideTitle && !compact && title;

  return (
    <View style={[compact ? styles.sectionCompact : styles.section, style]}>
      {showTitle ? <Text style={styles.title}>{title}</Text> : null}
      <View style={compact ? styles.rowCompact : styles.row}>
        {tags.map((tag) => (
          <View
            key={tag.id}
            style={[
              compact ? styles.chipCompact : styles.chip,
              {
                borderColor: tag.color,
                backgroundColor: chipBackground(tag.color),
              },
            ]}
          >
            <Text style={[compact ? styles.chipTextCompact : styles.chipText, { color: tag.color }]}>
              {tag.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  sectionCompact: {
    marginBottom: 0,
    marginTop: 4,
  },
  title: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipCompact: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chipTextCompact: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
});
