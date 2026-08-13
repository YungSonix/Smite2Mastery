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

/** Map Supabase Auth errors to actionable copy for the reconnect modal. */
export function formatAuthConnectError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  if (msg.includes('email logins are disabled') || msg.includes('email provider is disabled')) {
    return (
      'Email sign-in is disabled in your Supabase project. ' +
      'Open Supabase Dashboard → Authentication → Sign In / Providers → Email → turn Email ON, ' +
      'then turn OFF "Confirm email" and save.'
    );
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'Wrong password. Use the same password you sign in with in the app.';
  }
  if (msg.includes('signup') && msg.includes('disabled')) {
    return 'New sign-ups are disabled in Supabase. Enable Email provider and allow sign-ups.';
  }
  return error?.message || 'Could not connect to cloud sync.';
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
    let { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !sessionData?.session?.user?.id) {
      const refreshed = await sb.auth.refreshSession();
      if (refreshed?.data?.session?.user?.id) {
        sessionData = refreshed.data;
      } else {
        return { ready: false, reason: 'no_session' };
      }
    }

    const userId = sessionData.session.user.id;
    let linked = await fetchUsernameForAuthUserId(userId);

    if (linked !== trimmed) {
      const expectedEmail = usernameToAuthEmail(trimmed);
      const sessionEmail = String(sessionData.session.user.email || '').toLowerCase();
      if (sessionEmail === expectedEmail.toLowerCase()) {
        const link = await linkAuthUserId(trimmed);
        if (link.ok) {
          linked = await fetchUsernameForAuthUserId(userId);
        }
      }
    }

    if (linked !== trimmed) {
      return { ready: false, reason: linked ? 'username_mismatch' : 'not_linked', linked };
    }

    return { ready: true, session: sessionData.session };
  } catch {
    return { ready: false, reason: 'error' };
  }
}

/** User-facing explanation for sync/auth failures. */
export function describeAuthSyncIssue(reason) {
  switch (reason) {
    case 'no_session':
      return 'Not connected to the cloud. Enter your password to link this device.';
    case 'not_linked':
      return 'Signed in but account is not linked yet. Enter your password to connect.';
    case 'username_mismatch':
      return 'Cloud session belongs to a different account. Sign out and sign in again.';
    case 'missing_config':
      return 'Supabase is not configured on this build.';
    default:
      return 'Cloud sync failed. Enter your password to reconnect.';
  }
}

/** Establish auth + link — use when cloud sync is off but user is logged in locally. */
export async function reconnectCloudAuth(username, plainPassword) {
  const trimmed = String(username || '').trim();
  if (!trimmed || !plainPassword) {
    return { ok: false, reason: 'missing_input' };
  }
  const result = await establishSupabaseAuthSession(trimmed, plainPassword);
  if (!result.ok) {
    return {
      ok: false,
      reason: 'auth_failed',
      message: formatAuthConnectError(result.error),
    };
  }
  if (!result.linked) {
    return { ok: false, reason: 'link_failed', message: 'Signed in but account link failed' };
  }
  const check = await ensureAuthenticatedForUsername(trimmed);
  if (!check.ready) {
    return { ok: false, reason: check.reason || 'not_linked', message: describeAuthSyncIssue(check.reason) };
  }
  return { ok: true };
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
