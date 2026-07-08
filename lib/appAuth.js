/**
 * Bridge custom app_users login → Supabase Auth session (auth.uid()).
 * All Supabase writes require a linked auth session — set_current_user is deprecated.
 */

export const AUTH_EMAIL_DOMAIN = 'users.smite2app.app';

export function usernameToAuthEmail(username) {
  const safe = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_');
  return safe ? `${safe}@${AUTH_EMAIL_DOMAIN}` : '';
}

function getSupabase() {
  try {
    const sb = require('../config/supabase').supabase;
    return sb && sb.auth ? sb : null;
  } catch {
    return null;
  }
}

function isMissingConfigError(error) {
  return error?.code === 'MISSING_CONFIG' || error?.message?.includes('MISSING_CONFIG');
}

export async function fetchUsernameForAuthUserId(authUserId) {
  const sb = getSupabase();
  if (!sb || !authUserId) return null;
  try {
    const { data, error } = await sb
      .from('user_data')
      .select('username')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error || !data) return null;
    return data.username || null;
  } catch {
    return null;
  }
}

export async function linkAuthUserId(username) {
  const sb = getSupabase();
  if (!sb?.rpc || !username) return { ok: false };
  try {
    const { data, error } = await sb.rpc('link_auth_user_id', {
      p_username: String(username).trim(),
    });
    if (error) return { ok: false, error };
    const parsed = typeof data === 'object' ? data : null;
    return { ok: parsed?.ok === true, ...parsed };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/**
 * Sign in (or create) Supabase Auth user for this app username, then link user_data.auth_user_id.
 */
export async function establishSupabaseAuthSession(username, plainPassword) {
  const sb = getSupabase();
  const trimmed = String(username || '').trim();
  if (!sb?.auth || !trimmed || !plainPassword) {
    return { ok: false, reason: 'missing_input' };
  }

  const email = usernameToAuthEmail(trimmed);

  try {
    let { data, error } = await sb.auth.signInWithPassword({
      email,
      password: plainPassword,
    });

    if (error && !isMissingConfigError(error)) {
      const msg = String(error.message || '').toLowerCase();
      const needsSignup =
        msg.includes('invalid login') ||
        msg.includes('invalid credentials') ||
        error.status === 400;

      if (needsSignup) {
        const signUp = await sb.auth.signUp({ email, password: plainPassword });
        if (signUp.error && !isMissingConfigError(signUp.error)) {
          return { ok: false, error: signUp.error };
        }
        const retry = await sb.auth.signInWithPassword({ email, password: plainPassword });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error || !data?.session) {
      return { ok: false, error: error || { message: 'No session' } };
    }

    const link = await linkAuthUserId(trimmed);
    return { ok: true, session: data.session, linked: link.ok };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/** Alias for write paths (guides, builds, profile sync, prophecy decks). */
export async function ensureAppWriteSession(username) {
  return ensureAuthenticatedForUsername(username);
}

/** True when Supabase JWT matches the expected app username. */
export async function ensureAuthenticatedForUsername(username) {
  const sb = getSupabase();
  const trimmed = String(username || '').trim();
  if (!sb?.auth || !trimmed) return { ready: false, reason: 'missing_input' };

  try {
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !sessionData?.session?.user?.id) {
      return { ready: false, reason: 'no_session' };
    }

    const linked = await fetchUsernameForAuthUserId(sessionData.session.user.id);
    if (linked !== trimmed) {
      return { ready: false, reason: 'username_mismatch', linked };
    }

    return { ready: true, session: sessionData.session };
  } catch {
    return { ready: false, reason: 'error' };
  }
}

/** After password verified — open Supabase Auth session + persist currentUser. */
export async function finalizeAppLogin(username, plainPassword, storage) {
  const trimmed = String(username).trim();
  if (plainPassword) {
    await establishSupabaseAuthSession(trimmed, plainPassword);
  }
  if (storage?.setItem) {
    await storage.setItem('currentUser', trimmed);
  }
  return trimmed;
}

export async function completeAppLogout(storage) {
  const sb = getSupabase();
  try {
    if (sb?.auth?.signOut) await sb.auth.signOut();
  } catch (_) {}
  if (storage?.removeItem) {
    await storage.removeItem('currentUser');
  }
}

/** Restore username from persisted Supabase Auth session (if linked). */
export async function restoreAppAuthSession() {
  const sb = getSupabase();
  if (!sb?.auth) return null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user?.id) return null;
    return fetchUsernameForAuthUserId(session.user.id);
  } catch {
    return null;
  }
}
