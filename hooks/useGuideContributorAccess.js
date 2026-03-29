import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

const IS_WEB = Platform.OS === 'web';

const storage = {
  async getItem(key) {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  async setItem(key, value) {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (_) {
      // ignore
    }
  },
};

/**
 * “Contributor” for Featured builds/guides: approved certification_requests OR user_data.featured_creator.
 */
export function useGuideContributorAccess(username) {
  const [isContributor, setIsContributor] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const user = String(username || '').trim();
    if (!user) {
      setIsContributor(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (!supabase || typeof supabase.from !== 'function') {
        const cached = await storage.getItem(`certificationStatus_${user}`);
        setIsContributor(cached === 'approved');
        setLoading(false);
        return;
      }

      const { data: approvedData, error: approvedError } = await supabase
        .from('certification_requests')
        .select('status')
        .eq('username', user)
        .eq('status', 'approved')
        .limit(1);

      const hasApprovedRequest =
        !approvedError &&
        approvedData &&
        ((Array.isArray(approvedData) && approvedData.length > 0) ||
          (approvedData && approvedData.status === 'approved'));

      if (hasApprovedRequest) {
        setIsContributor(true);
        await storage.setItem(`certificationStatus_${user}`, 'approved');
        setLoading(false);
        return;
      }

      const { data: udRows, error: udErr } = await supabase
        .from('user_data')
        .select('featured_creator')
        .eq('username', user)
        .limit(1);
      const ud = Array.isArray(udRows) ? udRows[0] : udRows;
      if (!udErr && ud?.featured_creator) {
        setIsContributor(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('certification_requests')
        .select('status')
        .eq('username', user)
        .order('requested_at', { ascending: false })
        .limit(1);
      let status = null;
      if (!error && data) {
        if (Array.isArray(data) && data.length > 0) status = data[0].status;
        else if (data.status) status = data.status;
      }
      if (status) {
        await storage.setItem(`certificationStatus_${user}`, status);
      }
      const cached = await storage.getItem(`certificationStatus_${user}`);
      setIsContributor(status === 'approved' || cached === 'approved');
    } catch (_) {
      const fallback = String(username || '').trim();
      const cached = fallback ? await storage.getItem(`certificationStatus_${fallback}`) : null;
      setIsContributor(cached === 'approved');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isContributor, loading, refresh };
}
