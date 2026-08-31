const { responseIsTestRow } = require('./triviaTestTake');
const { normDiscordKey } = require('./triviaPlayerProfiles');
const {
  syncPlayerProfilesForHostQuizzes,
  syncAllPlayerProfiles,
  adjustClassroomBonus,
  setClassroomAvatar,
} = require('./triviaPlayerProfiles');

/** Shared host analytics + classroom payload (production API + local dev Supabase passthrough). */
async function fetchHostAnalytics(sb, username, { syncProfiles = false } = {}) {
  const { data: quizzes, error } = await sb
    .from('trivia_quizzes')
    .select('id, slug, title, updated_at')
    .eq('owner_username', username)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const quizIds = (quizzes || []).map((q) => q.id);
  if (!quizIds.length) {
    return { quizzes: [], questions: [], responses: [], playerProfiles: [], profileSync: null };
  }

  // Avoid rebuilding every profile on page load — that N×DB loop exceeds Vercel’s 30s limit.
  // Profiles are kept fresh on submit via queuePlayerProfileUpsert; opt in with syncProfiles=1.
  const [{ data: questions }, { data: responses, error: rErr }] = await Promise.all([
    sb.from('trivia_questions').select('id, quiz_id, type, points, prompt').in('quiz_id', quizIds),
    sb
      .from('trivia_responses')
      .select(
        'id, quiz_id, discord_username, ingame_name, answers, score, max_score, per_question, submitted_at, ip_address'
      )
      .in('quiz_id', quizIds)
      .order('submitted_at', { ascending: false }),
  ]);
  if (rErr) throw rErr;

  const productionResponses = (responses || []).filter((r) => !responseIsTestRow(r));

  let playerProfiles = [];
  let profileSync = null;

  if (syncProfiles) {
    try {
      profileSync = await syncPlayerProfilesForHostQuizzes(sb, quizIds);
    } catch (syncErr) {
      console.warn('trivia player profile sync', syncErr.message);
      profileSync = { error: syncErr.message };
    }
  }

  const hostKeys = [
    ...new Set(
      productionResponses.map((r) => normDiscordKey(r.discord_username)).filter(Boolean)
    ),
  ];

  try {
    if (hostKeys.length) {
      // Chunk .in() to stay under PostgREST URL limits for large classrooms.
      const chunkSize = 200;
      const chunks = [];
      for (let i = 0; i < hostKeys.length; i += chunkSize) {
        chunks.push(hostKeys.slice(i, i + chunkSize));
      }
      const results = await Promise.all(
        chunks.map(async (keys) => {
          const { data, error: pErr } = await sb
            .from('trivia_player_profiles')
            .select('*')
            .in('discord_key', keys);
          return { data, error: pErr };
        })
      );
      const firstErr = results.find((r) => r.error)?.error;
      if (!firstErr) {
        playerProfiles = results.flatMap((r) => r.data || []);
      } else if (String(firstErr.message || '').includes('trivia_player_profiles')) {
        profileSync = { ...(profileSync || {}), tableMissing: true };
      } else {
        throw firstErr;
      }
    }
  } catch (profileErr) {
    console.warn('trivia player profiles read', profileErr.message);
    if (String(profileErr.message || '').includes('trivia_player_profiles')) {
      profileSync = { ...(profileSync || {}), tableMissing: true };
    }
  }

  return {
    quizzes: quizzes || [],
    questions: questions || [],
    responses: productionResponses,
    playerProfiles,
    profileSync,
  };
}

async function handleHostClassroomPost(sb, username, body) {
  const action = body?.action;

  if (action === 'classroom-points') {
    const discordKey = String(body.discordKey || body.discord_key || '').trim();
    const delta = Number(body.delta);
    const profile = await adjustClassroomBonus(sb, discordKey, delta);
    return { status: 200, body: { ok: true, profile } };
  }

  if (action === 'set-classroom-avatar') {
    const discordKey = String(body.discordKey || body.discord_key || '').trim();
    const kind = String(body.kind || body.avatar_kind || '').trim();
    const ref = String(body.ref || body.avatar_ref || '').trim();
    const profile = await setClassroomAvatar(sb, discordKey, kind, ref);
    return { status: 200, body: { ok: true, profile } };
  }

  if (action === 'sync-player-profiles') {
    const scope = String(body.scope || 'host').toLowerCase();
    if (scope === 'all') {
      const result = await syncAllPlayerProfiles(sb);
      return { status: 200, body: { ok: true, ...result } };
    }
    const { data: quizzes } = await sb
      .from('trivia_quizzes')
      .select('id')
      .eq('owner_username', username);
    const quizIds = (quizzes || []).map((q) => q.id);
    const result = await syncPlayerProfilesForHostQuizzes(sb, quizIds);
    return { status: 200, body: { ok: true, ...result } };
  }

  return null;
}

module.exports = {
  fetchHostAnalytics,
  handleHostClassroomPost,
};
