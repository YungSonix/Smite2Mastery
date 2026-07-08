import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { UI_THEME } from './uiTheme';

const IS_WEB = Platform.OS === 'web';

/**
 * Contextual one-line hint for new MOBA players — cyan dark shell, dismissible.
 */
export function BeginnerHintBar({ text, onDismiss, compact }) {
  if (!text) return null;
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={[styles.text, compact && styles.textCompact]}>{text}</Text>
      {onDismiss ? (
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss hint"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.borderCyanFill08,
  },
  wrapCompact: {
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  text: {
    flex: 1,
    color: UI_THEME.textBody,
    fontSize: 13,
    lineHeight: 19,
  },
  textCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  dismissBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: UI_THEME.radiusClose,
    backgroundColor: UI_THEME.panelBorder,
    ...(IS_WEB && { cursor: 'pointer', userSelect: 'none' }),
  },
  dismissText: {
    color: UI_THEME.textClose,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
});
