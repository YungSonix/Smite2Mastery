import { useCallback, useEffect, useState } from 'react';
import { canAccessSmiteWars, fetchSmiteWarsIsDevAccount } from '../lib/smiteWarsAccess';

export function useSmiteWarsAccess(username) {
  const [isDevAccount, setIsDevAccount] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const user = String(username || '').trim();
    if (canAccessSmiteWars({ username: user })) {
      setIsDevAccount(true);
      setLoading(false);
      return;
    }
    if (!user) {
      setIsDevAccount(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const dev = await fetchSmiteWarsIsDevAccount(user);
    setIsDevAccount(dev);
    setLoading(false);
  }, [username]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canAccess = canAccessSmiteWars({ username, isDevAccount });

  return { canAccess, loading, isDevAccount, refresh };
}
