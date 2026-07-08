import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { extractAbilityEffectTokens } from './abilityEffectTokens';

function chipBackground(color) {
  if (!color || !color.startsWith('#') || color.length < 7) return 'rgba(15, 23, 42, 0.9)';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

/** Compact colored chips for ability effect tokens in subtitles. */
export default function AbilityEffectChips({ text, style }) {
  const tokens = useMemo(() => {
    const seen = new Set();
    return extractAbilityEffectTokens(text).filter((tok) => {
      const id = `${tok.key}|${tok.text}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [text]);

  if (!tokens.length) return null;

  return (
    <View style={[styles.row, style]}>
      {tokens.map((tok) => (
        <View
          key={`${tok.key}-${tok.text}`}
          style={[
            styles.chip,
            {
              borderColor: tok.color,
              backgroundColor: chipBackground(tok.color),
            },
          ]}
        >
          <Text style={[styles.chipText, { color: tok.color }]}>{tok.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
});
