import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { TOOLTIP_DETAIL, DEFAULT_TOOLTIP_DETAIL } from '../lib/tooltipDetail';

const caches = new Map();
const loadPromises = new Map();

async function readStoredDetail(storageKey, defaultDetail) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(storageKey);
      return raw === TOOLTIP_DETAIL.MINIMAL || raw === TOOLTIP_DETAIL.DESCRIPTIVE
        ? raw
        : defaultDetail;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(storageKey);
    return raw === TOOLTIP_DETAIL.MINIMAL || raw === TOOLTIP_DETAIL.DESCRIPTIVE
      ? raw
      : defaultDetail;
  } catch {
    return defaultDetail;
  }
}

async function writeStoredDetail(storageKey, level) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, level);
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(storageKey, level);
  } catch {
    // ignore
  }
}

export function preloadTooltipDetail(storageKey, defaultDetail = DEFAULT_TOOLTIP_DETAIL) {
  if (caches.has(storageKey)) return Promise.resolve(caches.get(storageKey));
  if (!loadPromises.has(storageKey)) {
    loadPromises.set(
      storageKey,
      readStoredDetail(storageKey, defaultDetail).then((level) => {
        caches.set(storageKey, level);
        return level;
      })
    );
  }
  return loadPromises.get(storageKey);
}

/** Persisted tooltip density — minimal (short) vs descriptive (full). */
export function useTooltipDetail(storageKey, defaultDetail = DEFAULT_TOOLTIP_DETAIL) {
  const [detailLevel, setDetailLevelState] = useState(
    () => caches.get(storageKey) || defaultDetail
  );

  useEffect(() => {
    let active = true;
    preloadTooltipDetail(storageKey, defaultDetail).then((level) => {
      if (active) setDetailLevelState(level);
    });
    return () => {
      active = false;
    };
  }, [storageKey, defaultDetail]);

  const setDetailLevel = useCallback(
    async (level) => {
      if (level !== TOOLTIP_DETAIL.MINIMAL && level !== TOOLTIP_DETAIL.DESCRIPTIVE) {
        return;
      }
      caches.set(storageKey, level);
      setDetailLevelState(level);
      await writeStoredDetail(storageKey, level);
    },
    [storageKey]
  );

  return [detailLevel, setDetailLevel];
}
