import { supabase as sharedSupabase } from '../config/supabase';

function getClient() {
  try {
    if (sharedSupabase && typeof sharedSupabase.from === 'function') return sharedSupabase;
  } catch (_) {}
  return null;
}

async function setAppUser(client, username) {
  if (!client || !username) return;
  try {
    await client.rpc('set_current_user', { username_param: String(username).trim() });
  } catch (_) {
    // optional RPC
  }
}

/**
 * @param {{ featured: boolean }} opts
 */
export async function fetchCommunityGuides({ featured, limit = 120 } = {}) {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const { data, error } = await client
    .from('community_guides')
    .select('*')
    .eq('author_is_featured', !!featured)
    .order('updated_at', { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)));
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Insert a guide. `author_is_featured` is set server-side on insert (trigger).
 */
export async function insertCommunityGuide(username, fields) {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const u = String(username || '').trim();
  if (!u) throw new Error('Not logged in');

  await setAppUser(client, u);

  const row = {
    username: u,
    author_display_name: fields.author_display_name ?? null,
    guide_type: fields.guide_type,
    title: fields.title,
    subtitle: fields.subtitle || null,
    body: fields.body || '',
    god_name: fields.god_name || null,
    god_internal_name: fields.god_internal_name || null,
    role_lane: fields.role_lane || null,
    patch: fields.patch || null,
    extra: fields.extra && typeof fields.extra === 'object' ? fields.extra : {},
  };

  const { data, error } = await client.from('community_guides').insert(row).select();
  if (error) throw error;
  const inserted = Array.isArray(data) ? data[0] : data;
  if (!inserted) throw new Error('Insert returned no row');
  return inserted;
}

export async function updateCommunityGuide(guideId, username, payload) {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const u = String(username || '').trim();
  if (!u) throw new Error('Not logged in');

  const { data, error } = await client.rpc('update_community_guide', {
    guide_id: Number(guideId),
    request_username: u,
    payload,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Update returned no row (run supabase/community_guides.sql?)');
  return row;
}
