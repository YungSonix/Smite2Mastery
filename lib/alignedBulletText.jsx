import React from 'react';
import { View, Text } from 'react-native';

/** Collapse oversized paragraph gaps and tighten bullet-style line breaks. */
export function tightenMultilineGameText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(?=\s*[\u2022•\-*])/g, '\n');
}

function classifyLine(line) {
  const trimmedStart = line.trimStart();
  if (trimmedStart === '') return { type: 'blank' };
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
export function AlignedBulletLines({ text, textStyle, bulletMarkWidth = 16, bulletGap = 6 }) {
  const tightened = tightenMultilineGameText(text);
  const lines = tightened.split('\n');
  const fontSize = textStyle?.fontSize ?? 14;
  const lineHeight = textStyle?.lineHeight ?? Math.round(fontSize * 1.25);
  const blankH = Math.max(4, Math.round(lineHeight * 0.35));

  return (
    <View>
      {lines.map((line, i) => {
        const c = classifyLine(line);
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
                marginBottom: 1,
              }}
            >
              <Text
                style={[
                  textStyle,
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
              <Text style={[textStyle, { flex: 1, flexShrink: 1 }]}>{c.body}</Text>
            </View>
          );
        }
        return (
          <Text key={`tx-${i}`} style={textStyle}>
            {c.body}
          </Text>
        );
      })}
    </View>
  );
}
