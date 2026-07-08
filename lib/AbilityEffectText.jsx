import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { splitAbilityEffectText } from './abilityEffectTokens';
import { UI_THEME } from './uiTheme';

/**
 * Inline text with effect vocabulary (Stun, Dash, Heal, …) color-coded
 * per ST_HW_God_AbilityShortDescriptions.
 */
export default function AbilityEffectText({
  text,
  style,
  baseColor = UI_THEME.textBody,
  numberOfLines,
}) {
  const segments = useMemo(() => splitAbilityEffectText(text), [text]);
  if (!segments.length) return null;

  const fontSize = style?.fontSize ?? 11;
  const lineHeight = style?.lineHeight ?? Math.round(fontSize * 1.35);
  const baseStyle = {
    fontSize,
    lineHeight,
    color: baseColor,
    ...style,
  };

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {segments.map((seg, index) => {
        if (seg.type === 'token') {
          return (
            <Text
              key={`tok-${index}`}
              style={{ color: seg.color, fontWeight: '700' }}
            >
              {seg.text}
            </Text>
          );
        }
        return <Text key={`txt-${index}`}>{seg.text}</Text>;
      })}
    </Text>
  );
}
