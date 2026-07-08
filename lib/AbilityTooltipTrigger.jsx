import React, { useRef } from 'react';
import { Platform, Pressable } from 'react-native';

const WEB_TRIGGER_PROPS =
  Platform.OS === 'web' ? { dataSet: { abilityTooltipTrigger: 'true' } } : {};

/** Wraps an ability icon — hover preview on web, press on mobile. */
export default function AbilityTooltipTrigger({
  payload,
  tooltip,
  style,
  children,
  disabled = false,
  accessibilityLabel,
}) {
  const ref = useRef(null);
  const handlers =
    tooltip?.bindTrigger?.(ref, () => payload, { enabled: !disabled && !!payload?.ability }) ?? {};

  return (
    <Pressable
      ref={ref}
      {...WEB_TRIGGER_PROPS}
      style={({ hovered, pressed }) => [
        style,
        Platform.OS === 'web' && payload?.ability ? styles.webCursor : null,
        Platform.OS === 'web' && hovered && !disabled && payload?.ability ? styles.webHover : null,
        pressed && !disabled && payload?.ability ? styles.pressed : null,
      ]}
      disabled={disabled || !payload?.ability}
      onPress={handlers.onPress}
      onHoverIn={handlers.onHoverIn}
      onHoverOut={handlers.onHoverOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || payload?.abilityName || 'Ability'}
      accessibilityHint={
        Platform.OS === 'web'
          ? 'Hover to preview · click to pin and adjust level'
          : 'Show ability details'
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
