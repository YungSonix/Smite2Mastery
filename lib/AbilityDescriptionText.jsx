import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { splitColoredDescriptionText } from './abilityDescriptionText';
import { UI_THEME } from './uiTheme';

/**
 * Ability/item tooltip copy — keyword tag colors + effect tokens.
 */
export default function AbilityDescriptionText({
  text,
  style,
  baseColor = UI_THEME.textBody,
  numberOfLines,
  splitFn = splitColoredDescriptionText,
}) {
  const segments = useMemo(() => splitFn(text), [text, splitFn]);
  if (!segments.length) return null;

  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = flatStyle.fontSize ?? 11;
  const lineHeight = flatStyle.lineHeight ?? Math.round(fontSize * 1.36);
  const baseStyle = {
    ...flatStyle,
    fontSize,
    lineHeight,
    color: baseColor,
  };

  const tokenStyle = {
    fontSize,
    lineHeight,
    fontWeight: '700',
  };

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {segments.map((seg, index) => {
        if (seg.type === 'token') {
          return (
            <Text key={`tok-${index}`} style={[tokenStyle, { color: seg.color }]}>
              {seg.text}
            </Text>
          );
        }
        return (
          <Text key={`txt-${index}`} style={{ fontSize, lineHeight }}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}
