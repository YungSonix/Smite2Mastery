import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AbilityDescriptionText from './AbilityDescriptionText';

/** Collapse oversized paragraph gaps and tighten bullet-style line breaks. */
export function tightenMultilineGameText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(?=\s*[\u2022•\-*])/g, '\n');
}

function stripBulletPrefix(line) {
  const trimmedStart = String(line || '').trimStart();
  if (!trimmedStart) return '';
  const m =
    trimmedStart.match(/^[\u2022•]\s*(.*)$/) ||
    trimmedStart.match(/^-\s+(.+)$/) ||
    trimmedStart.match(/^\*\s+(.+)$/);
  return m ? m[1].trimStart() : trimmedStart;
}

function classifyLine(line, { proseMode = false } = {}) {
  const trimmedStart = line.trimStart();
  if (trimmedStart === '') return { type: 'blank' };
  if (proseMode) {
    return { type: 'text', body: stripBulletPrefix(line) };
  }
  let m = trimmedStart.match(/^([\u2022•])\s*(.*)$/);
  if (m) return { type: 'bullet', mark: m[1], body: m[2].trimStart() };
  m = trimmedStart.match(/^(\-)\s+(.+)$/);
  if (m) return { type: 'bullet', mark: m[1], body: m[2].trimStart() };
  m = trimmedStart.match(/^(\*)\s+(.+)$/);
  if (m) return { type: 'bullet', mark: m[1], body: m[2].trimStart() };
  return { type: 'text', body: line };
}

/**
 * Renders multiline copy with list markers in a fixed gutter so every bullet lines up.
 */
export function AlignedBulletLines({
  text,
  textStyle,
  bulletMarkWidth = 16,
  bulletGap = 6,
  colorizeEffects = false,
  proseMode = false,
}) {
  const tightened = tightenMultilineGameText(text);
  const lines = tightened.split('\n');
  const flatStyle = StyleSheet.flatten(textStyle) || {};
  const fontSize = flatStyle.fontSize ?? 11;
  const lineHeight = flatStyle.lineHeight ?? Math.round(fontSize * 1.36);
  const blankH = proseMode ? Math.max(3, Math.round(lineHeight * 0.35)) : Math.max(2, Math.round(lineHeight * 0.2));
  const bodyColor = flatStyle.color;
  const resolvedTextStyle = { ...flatStyle, fontSize, lineHeight };

  const renderBody = (body, key) => {
    if (colorizeEffects) {
      return (
        <View key={key} style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
          <AbilityDescriptionText text={body} style={resolvedTextStyle} baseColor={bodyColor} />
        </View>
      );
    }
    return (
      <Text key={key} style={[resolvedTextStyle, { flex: 1, flexShrink: 1 }]}>
        {body}
      </Text>
    );
  };

  return (
    <View>
      {lines.map((line, i) => {
        const c = classifyLine(line, { proseMode });
        if (c.type === 'blank') {
          return <View key={`bl-${i}`} style={{ height: blankH }} />;
        }
        if (c.type === 'bullet') {
          return (
            <View
              key={`bu-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: 2,
              }}
            >
              <Text
                style={[
                  resolvedTextStyle,
                  {
                    width: bulletMarkWidth,
                    flexShrink: 0,
                    textAlign: 'center',
                    paddingRight: bulletGap,
                  },
                ]}
              >
                {c.mark}
              </Text>
              {renderBody(c.body, `bu-body-${i}`)}
            </View>
          );
        }
        if (colorizeEffects) {
          return (
            <View key={`tx-${i}`} style={{ marginBottom: proseMode ? 2 : 1 }}>
              {renderBody(c.body, `tx-body-${i}`)}
            </View>
          );
        }
        return (
          <Text key={`tx-${i}`} style={resolvedTextStyle}>
            {c.body}
          </Text>
        );
      })}
    </View>
  );
}
