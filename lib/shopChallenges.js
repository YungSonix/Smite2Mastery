/**
 * Shared helper to award shop challenge gold from other parts of the app.
 * Server RPCs enforce caps and duplicate claims when Supabase is configured.
 */

import { CHALLENGES } from './shopData';
import {
  fetchUserShopData,
  claimShopChallenge,
  awardMinigameGold,
  ensureShopSession,
} from './shopSupabase';

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
 * Award a raw amount of gold (no daily gating) — minigame performance bonus.
 * @returns {Promise<{ gold: number }>}
 */
export async function awardGold(amount) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  if (safeAmount <= 0) return { gold: 0 };

  const username = await storage.getItem('currentUser');
  const prefix = getShopPrefix(username);

  if (username) {
    const rpc = await awardMinigameGold(username, safeAmount);
    if (rpc.awarded) {
      const balance = rpc.balance ?? null;
      if (balance != null) await storage.setItem(prefix + 'gold', String(balance));
      else {
        const remote = await fetchUserShopData(username);
        if (remote) await storage.setItem(prefix + 'gold', String(remote.gold));
      }
      return { gold: rpc.gold ?? safeAmount };
    }
  }

  const [remote, storedGold] = await Promise.all([
    username ? fetchUserShopData(username) : null,
    storage.getItem(prefix + 'gold'),
  ]);
  const currentGold = remote ? remote.gold : parseInt(storedGold || '0', 10) || 0;
  const newGold = currentGold + safeAmount;
  await storage.setItem(prefix + 'gold', String(newGold));
  return { gold: safeAmount };
}

/**
 * Award gold for a challenge if not already completed (today for repeatable, ever for one-time).
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
  } else if (prev) {
    return { awarded: false };
  }

  if (username) {
    await ensureShopSession(username);
    const rpc = await claimShopChallenge(username, conditionKey);
    if (rpc.awarded) {
      if (challenge.repeatable) progress[challenge.id] = today;
      else progress[challenge.id] = true;
      await storage.setItem(prefix + 'challenges', JSON.stringify(progress));
      const gold = rpc.gold ?? challenge.goldReward;
      if (rpc.balance != null) await storage.setItem(prefix + 'gold', String(rpc.balance));
      else if (remote) await storage.setItem(prefix + 'gold', String(remote.gold + gold));
      return { awarded: true, gold };
    }
    if (rpc.reason === 'already_claimed') return { awarded: false };
  }

  if (challenge.repeatable) progress[challenge.id] = today;
  else progress[challenge.id] = true;

  const currentGold = remote ? remote.gold : parseInt(await storage.getItem(prefix + 'gold'), 10) || 0;
  const newGold = currentGold + challenge.goldReward;

  await storage.setItem(prefix + 'gold', String(newGold));
  await storage.setItem(prefix + 'challenges', JSON.stringify(progress));

  return { awarded: true, gold: challenge.goldReward };
}
