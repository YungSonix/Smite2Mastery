import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

export function useMinigameGold() {
  const [gold, setGold] = useState(0);

  const loadGold = useCallback(async () => {
    let username = null;
    try {
      const profileHelpers = require('../app/_screens/profile').profileHelpers;
      username = await profileHelpers?.getCurrentUser?.();
    } catch (_) {}

    const prefix = `shop_${username || 'guest'}_`;
    try {
      const { fetchUserShopData } = require('../lib/shopSupabase');
      if (username) {
        const remote = await fetchUserShopData(username);
        if (remote && typeof remote.gold === 'number') {
          setGold(remote.gold);
          return;
        }
      }
    } catch (_) {}

    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        setGold(parseInt(window.localStorage.getItem(prefix + 'gold') || '0', 10) || 0);
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const v = await AsyncStorage.getItem(prefix + 'gold');
        setGold(parseInt(v || '0', 10) || 0);
      }
    } catch (_) {
      setGold(0);
    }
  }, []);

  useEffect(() => {
    loadGold();
  }, [loadGold]);

  return { gold, setGold, refreshGold: loadGold };
}

export const MINIGAME_ROUND_DELAY_MS = 650;

export function pauseMinigameRound(setBusy) {
  setBusy(true);
  return new Promise((resolve) => {
    setTimeout(() => {
      setBusy(false);
      resolve();
    }, MINIGAME_ROUND_DELAY_MS);
  });
}
