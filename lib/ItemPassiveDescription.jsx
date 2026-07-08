import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tightenMultilineGameText } from './alignedBulletText';
import AbilityDescriptionText from './AbilityDescriptionText';
import { normalizeItemPassiveLine, splitItemPassiveText } from './itemPassiveText';
import { UI_THEME } from './uiTheme';

const META_LINE =
  /^(cooldown\s*:|you can own up to\s*\d*\s*active items|notes\s*:|cost\s*:|requires\s)/i;

const HIGHLIGHT_LEAD = /^(\+\d+(?:\.\d+)?%?)/;

/** Split passive copy into prose paragraphs, sub-bullets, and muted footer lines. */
export function parseItemPassiveLines(passive) {
  const text = tightenMultilineGameText(String(passive || '').trim());
  if (!text) return [];

  return text
    .split('\n')
    .map((line) => {
      const indent = line.match(/^(\s+)/)?.[1]?.length || 0;
      const trimmed = normalizeItemPassiveLine(line.trim());
      if (!trimmed) return null;

      if (META_LINE.test(trimmed)) {
        return { type: 'meta', text: trimmed };
      }

      const highlightMatch = trimmed.match(HIGHLIGHT_LEAD);
      if (highlightMatch) {
        return {
          type: 'bullet',
          text: trimmed,
          highlight: highlightMatch[1],
          rest: trimmed.slice(highlightMatch[1].length),
        };
      }

      if (indent >= 2) {
        return { type: 'bullet', text: trimmed, highlight: null, rest: trimmed };
      }

      return { type: 'prose', text: trimmed };
    })
    .filter(Boolean);
}

function EffectLine({ line, bodyStyle, highlightStyle, bulletStyle, bulletMarkWidth, bulletGap, colorize }) {
  return (
    <View style={styles.effectRow}>
      <Text
        style={[
          bulletStyle,
          styles.bulletMark,
          { width: bulletMarkWidth, paddingRight: bulletGap },
        ]}
      >
        •
      </Text>
      {colorize ? (
        <View style={styles.effectBody}>
          <AbilityDescriptionText
            text={line.text}
            style={bodyStyle}
            baseColor={bodyStyle?.color}
            splitFn={splitItemPassiveText}
          />
        </View>
      ) : (
        <Text style={styles.effectBody}>
          {line.highlight ? (
            <>
              <Text style={highlightStyle}>{line.highlight}</Text>
              <Text style={bodyStyle}>{line.rest}</Text>
            </>
          ) : (
            <Text style={bodyStyle}>{line.text}</Text>
          )}
        </Text>
      )}
    </View>
  );
}

function ProseLine({ text, bodyStyle, colorize }) {
  if (colorize) {
    return (
      <View style={styles.proseRow}>
        <AbilityDescriptionText
          text={text}
          style={bodyStyle}
          baseColor={bodyStyle?.color}
          splitFn={splitItemPassiveText}
        />
      </View>
    );
  }
  return (
    <Text style={[bodyStyle, styles.proseRow]}>{text}</Text>
  );
}

/** In-game style item passive/active description — prose blocks, sub-bullets, muted cooldown. */
export default function ItemPassiveDescription({
  text,
  textStyle,
  bulletMarkWidth = 12,
  bulletGap = 6,
  colorize = true,
}) {
  const lines = parseItemPassiveLines(text);
  if (!lines.length) return null;

  const flatStyle = StyleSheet.flatten(textStyle) || {};
  const fontSize = flatStyle.fontSize ?? 13;
  const lineHeight = flatStyle.lineHeight ?? Math.round(fontSize * 1.38);

  const bodyStyle = {
    fontSize,
    lineHeight,
    color: UI_THEME.textBody,
    ...flatStyle,
  };
  const highlightStyle = {
    fontSize,
    lineHeight,
    color: UI_THEME.statDelta,
    fontWeight: '600',
  };
  const metaStyle = {
    fontSize: fontSize - 1,
    lineHeight,
    color: UI_THEME.textHint,
  };
  const bulletStyle = {
    fontSize,
    lineHeight,
    color: '#e2e8f0',
  };

  return (
    <View style={styles.root}>
      {lines.map((line, index) => {
        if (line.type === 'meta') {
          const prev = index > 0 ? lines[index - 1] : null;
          return colorize ? (
            <View
              key={`meta-${index}`}
              style={[styles.metaRow, prev?.type !== 'meta' ? styles.metaAfterEffects : null]}
            >
              <AbilityDescriptionText
                text={line.text}
                style={metaStyle}
                baseColor={UI_THEME.textHint}
                splitFn={splitItemPassiveText}
              />
            </View>
          ) : (
            <Text
              key={`meta-${index}`}
              style={[metaStyle, prev?.type !== 'meta' ? styles.metaAfterEffects : null]}
            >
              {line.text}
            </Text>
          );
        }

        if (line.type === 'prose') {
          return (
            <ProseLine
              key={`prose-${index}`}
              text={line.text}
              bodyStyle={bodyStyle}
              colorize={colorize}
            />
          );
        }

        return (
          <EffectLine
            key={`fx-${index}`}
            line={line}
            bodyStyle={bodyStyle}
            highlightStyle={highlightStyle}
            bulletStyle={bulletStyle}
            bulletMarkWidth={bulletMarkWidth}
            bulletGap={bulletGap}
            colorize={colorize}
          />
        );
      })}
    </View>
  );
}

const styles = {
  root: {
    marginTop: 2,
  },
  proseRow: {
    marginBottom: 2,
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  bulletMark: {
    flexShrink: 0,
    textAlign: 'center',
  },
  effectBody: {
    flex: 1,
    flexShrink: 1,
  },
  metaRow: {
    marginBottom: 2,
  },
  metaAfterEffects: {
    marginTop: 4,
  },
};
