import React, { useRef } from 'react';
import { Platform, Pressable } from 'react-native';

/** Wraps an item icon — hover preview on web, press on mobile. */
export default function ItemTooltipTrigger({
  item,
  itemName,
  tooltip,
  style,
  children,
  disabled = false,
  accessibilityLabel,
}) {
  const ref = useRef(null);
  const handlers = tooltip?.bindTrigger?.(ref, item, itemName) ?? {};

  return (
    <Pressable
      ref={ref}
      style={({ hovered, pressed }) => [
        style,
        Platform.OS === 'web' && item ? styles.webCursor : null,
        Platform.OS === 'web' && hovered && !disabled && item ? styles.webHover : null,
        pressed && !disabled && item ? styles.pressed : null,
      ]}
      disabled={disabled || !item}
      onPress={handlers.onPress}
      onHoverIn={handlers.onHoverIn}
      onHoverOut={handlers.onHoverOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || itemName || item?.name || 'Item'}
      accessibilityHint={
        Platform.OS === 'web' ? 'Hover to preview item details' : 'Show item details'
      }
    >
      {children}
    </Pressable>
  );
}

const styles = {
  webCursor: {
    cursor: 'pointer',
  },
  webHover: {
    opacity: 0.92,
    transform: [{ scale: 1.04 }],
  },
  pressed: {
    opacity: 0.85,
  },
};
