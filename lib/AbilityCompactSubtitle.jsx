import React from 'react';
import AbilityEffectText from './AbilityEffectText';
import { UI_THEME } from './uiTheme';
import { kitAbilityTooltipModalStyles as styles } from './uiTheme';

/** Full compact description under ability title — inline game-style coloring. */
export default function AbilityCompactSubtitle({ text }) {
  if (!text) return null;

  return (
    <AbilityEffectText
      text={text}
      style={styles.compactSubtitle}
      baseColor={UI_THEME.textMuted}
      numberOfLines={2}
    />
  );
}
