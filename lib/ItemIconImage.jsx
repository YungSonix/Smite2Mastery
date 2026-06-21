import React from 'react';
import { Image } from 'expo-image';
import { getLocalItemIcon, getItemIconSource, readItemIconAttempt, bumpItemIconAttempt } from '../app/localIcons';

/**
 * Item icon with multi-step URL fallback (PascalCase → camelCase → lowercase → aliases → spaced PNG).
 */
export function ItemIconImage({
  iconPath,
  internalName,
  iconKey,
  failedMap,
  setFailedMap,
  style,
  contentFit = 'contain',
  placeholder = null,
  ...rest
}) {
  const localIcon = getLocalItemIcon(iconPath || internalName, { internalName });
  const key = iconKey || internalName || iconPath || 'item';
  const attempt = readItemIconAttempt(failedMap, key);
  const source = getItemIconSource(localIcon, attempt);

  if (!source) {
    return placeholder;
  }

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      onError={() => bumpItemIconAttempt(setFailedMap, key, localIcon, attempt)}
      {...rest}
    />
  );
}
