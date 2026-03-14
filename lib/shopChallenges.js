/**
 * Shared helper to award shop challenge gold from other parts of the app.
 * Syncs to Supabase (gold + total_gold_earned) when available so progress is global.
 */

import { CHALLENGES } from './shopData';
import { fetchUserShopData, updateUserShopData } from './shopSupabase';

const IS_WEB = typeof window !== 'undefined' && window.localStorage;

const storage = {
  async getItem(key) {
    try {
      if (IS_WEB && window.localStorage) return window.localStorage.getItem(key);
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (IS_WEB && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('shopChallenges setItem error:', e);
    }
  },
};

function getShopPrefix(username) {
  return `shop_${username || 'guest'}_`;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Award a raw amount of gold (no daily gating).
 * Used by minigames so players can earn more the better they perform.
 * Persists to local storage and Supabase (gold + total_gold_earned) when logged in.
 * @returns {Promise<{ gold: number }>}
 */
export async function awardGold(amount) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  if (safeAmount <= 0) return { gold: 0 };

  const username = await storage.getItem('currentUser');
  const prefix = getShopPrefix(username);

  const [remote, storedGold] = await Promise.all([
    username ? fetchUserShopData(username) : null,
    storage.getItem(prefix + 'gold'),
  ]);

  const currentGold = remote ? remote.gold : parseInt(storedGold || '0', 10) || 0;
  const newGold = currentGold + safeAmount;

  await storage.setItem(prefix + 'gold', String(newGold));

  if (username) {
    await updateUserShopData(username, { addGold: safeAmount, addTotalEarned: safeAmount });
  }

  return { gold: safeAmount };
}

/**
 * Award gold for a challenge if not already completed (today for repeatable, ever for one-time).
 * Persists to local storage and Supabase (gold + total_gold_earned) when logged in.
 * @returns {Promise<{ awarded: boolean, gold?: number }>}
 */
export async function awardChallenge(conditionKey) {
  const challenge = CHALLENGES.find((c) => c.condition === conditionKey);
  if (!challenge) return { awarded: false };

  const username = await storage.getItem('currentUser');
  const prefix = getShopPrefix(username);
  const today = getTodayDateString();

  const [savedChallenges, remote] = await Promise.all([
    storage.getItem(prefix + 'challenges'),
    username ? fetchUserShopData(username) : null,
  ]);

  const progress = savedChallenges ? JSON.parse(savedChallenges) : {};
  const prev = progress[challenge.id];
  if (challenge.repeatable) {
    if (prev === today) return { awarded: false };
    progress[challenge.id] = today;
  } else {
    if (prev) return { awarded: false };
    progress[challenge.id] = true;
  }

  const currentGold = remote ? remote.gold : parseInt(await storage.getItem(prefix + 'gold'), 10) || 0;
  const newGold = currentGold + challenge.goldReward;

  await storage.setItem(prefix + 'gold', String(newGold));
  await storage.setItem(prefix + 'challenges', JSON.stringify(progress));

  if (username) {
    await updateUserShopData(username, { addGold: challenge.goldReward, addTotalEarned: challenge.goldReward });
  }
  return { awarded: true, gold: challenge.goldReward };
}
