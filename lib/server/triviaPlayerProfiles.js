const { responseIsTestRow } = require('./triviaTestTake');
const { pickBadgeFileForDiscordKey } = require('../classroomBadges');
const { avatarDbFields, isValidAvatarSelection } = require('../classroomAvatars');

const SKIP_TYPES = new Set([
  'image',
  'content',
  'audio',
  'video',
  'embed',
  'file_response',
  'audio_response',
  'drawing',
]);

function normDiscordKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/#\d{4}$/, '')
    .replace(/[._\s-]+/g, '');
}

function promptPlain(prompt) {
  if (prompt == null) return '';
  if (typeof prompt === 'string') return prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (typeof prompt === 'object' && prompt.text) return promptPlain(prompt.text);
  return String(prompt);
}

function responseDurationMs(row) {
  const ms = Number(row?.answers?.__duration_ms);
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : null;
}

function isScoredQuestion(q) {
  if (!q?.id) return false;
  if (SKIP_TYPES.has(q.type)) return false;
  if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate) return false;
  return Number(q.points) > 0;
}

function shortLabel(text, max = 48) {
  const t = String(text || '').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function pctForResponse(r) {
  const max = Number(r.max_score) || 0;
  if (max <= 0) return null;
  return (Number(r.score) / max) * 100;
}

function buildQuestionPatterns(responses, questionById) {
  const byPrompt = new Map();
  for (const r of responses) {
    for (const [qid, fracRaw] of Object.entries(r.per_question || {})) {
      if (fracRaw == null) continue;
      const q = questionById.get(qid);
      if (!q) continue;
      const frac = Number(fracRaw);
      if (!Number.isFinite(frac)) continue;
      const key = promptPlain(q.prompt) || qid;
      let row = byPrompt.get(key);
      if (!row) {
        row = { label: shortLabel(key, 56), attempts: 0, sumFrac: 0 };
        byPrompt.set(key, row);
      }
      row.attempts += 1;
      row.sumFrac += frac;
    }
  }
  const rows = [...byPrompt.values()]
    .filter((r) => r.attempts > 0)
    .map((r) => ({
      label: r.label,
      attempts: r.attempts,
      avgPct: Math.round((r.sumFrac / r.attempts) * 100),
    }));
  const minAttempts = 2;
  const strong = rows
    .filter((r) => r.attempts >= minAttempts && r.avgPct >= 75)
    .sort((a, b) => b.avgPct - a.avgPct || b.attempts - a.attempts)
    .slice(0, 6);
  const weak = rows
    .filter((r) => r.attempts >= minAttempts && r.avgPct < 50)
    .sort((a, b) => a.avgPct - b.avgPct || b.attempts - a.attempts)
    .slice(0, 6);
  return { strong, weak };
}

function aggregatePlayerFromResponses(discordKey, discordUsername, responses, questionById) {
  const prod = (responses || []).filter((r) => !responseIsTestRow(r));
  if (!prod.length) return null;

  const ingameNames = new Set();
  const quizIds = new Set();
  const attempts = prod.map((r) => {
    const pct = pctForResponse(r);
    const durationMs = responseDurationMs(r);
    if (r.ingame_name) ingameNames.add(String(r.ingame_name).trim());
    quizIds.add(r.quiz_id);
    return {
      score: Number(r.score) || 0,
      maxScore: Number(r.max_score) || 0,
      pct: pct != null ? Math.round(pct) : null,
      durationMs,
      submittedAt: r.submitted_at,
      discord: r.discord_username,
      ingame: r.ingame_name,
    };
  });

  attempts.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  const pcts = attempts.map((a) => a.pct).filter((p) => p != null);
  const durations = attempts.map((a) => a.durationMs).filter((d) => d != null);
  const totalScore = attempts.reduce((s, a) => s + a.score, 0);
  const totalMax = attempts.reduce((s, a) => s + a.maxScore, 0);
  const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const bestPct = pcts.length ? Math.max(...pcts) : null;
  const passCount = pcts.filter((p) => p >= 70).length;
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;
  const patterns = buildQuestionPatterns(prod, questionById);
  const last = attempts[0];
  const first = attempts[attempts.length - 1];

  return {
    discord_key: discordKey,
    discord_username: String(last?.discord || discordUsername || '').trim() || discordKey,
    last_ingame_name: last?.ingame || [...ingameNames][0] || null,
    ingame_names: [...ingameNames],
    events_entered: attempts.length,
    trivias_done: quizIds.size,
    total_score: totalScore,
    total_max: totalMax,
    avg_pct: avgPct,
    best_pct: bestPct,
    pass_count: passCount,
    avg_duration_ms: avgDurationMs,
    strong_topics: patterns.strong,
    weak_topics: patterns.weak,
    first_seen_at: first?.submittedAt || null,
    last_seen_at: last?.submittedAt || null,
    updated_at: new Date().toISOString(),
  };
}

function classroomPoints(row) {
  const trivias = Number(row.trivias_done) || 0;
  const passes = Number(row.pass_count) || 0;
  const score = Number(row.total_score) || 0;
  return trivias * 15 + passes * 10 + Math.round(score / 5);
}

function profileRowToDb(
  row,
  {
    existingAvatarBadge = null,
    existingAvatarKind = null,
    existingAvatarRef = null,
    existingBonus = null,
  } = {}
) {
  let avatarKind = existingAvatarKind || row.avatar_kind || null;
  let avatarRef = existingAvatarRef || row.avatar_ref || existingAvatarBadge || row.avatar_badge || null;
  if (!avatarRef) {
    avatarRef = pickBadgeFileForDiscordKey(row.discord_key);
    avatarKind = 'badge';
  }
  if (!avatarKind) avatarKind = 'badge';
  const avatarFields = avatarDbFields(avatarKind, avatarRef);
  const pts = classroomPoints(row);
  const out = {
    discord_key: row.discord_key,
    discord_username: row.discord_username,
    last_ingame_name: row.last_ingame_name,
    ingame_names: row.ingame_names,
    events_entered: row.events_entered,
    trivias_done: row.trivias_done,
    total_score: row.total_score,
    total_max: row.total_max,
    avg_pct: row.avg_pct,
    best_pct: row.best_pct,
    pass_count: row.pass_count,
    avg_duration_ms: row.avg_duration_ms,
    strong_topics: row.strong_topics,
    weak_topics: row.weak_topics,
    ...avatarFields,
    classroom_points: pts,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    updated_at: row.updated_at,
  };
  if (existingBonus != null) out.classroom_bonus = existingBonus;
  return out;
}

async function fetchQuestionsForQuizIds(sb, quizIds) {
  if (!quizIds?.length) return [];
  const { data, error } = await sb
    .from('trivia_questions')
    .select('id, quiz_id, type, points, prompt, meta')
    .in('quiz_id', quizIds);
  if (error) throw error;
  return data || [];
}

function questionByIdFromList(questions) {
  const map = new Map();
  for (const q of questions || []) {
    if (!isScoredQuestion(q)) continue;
    map.set(q.id, q);
  }
  return map;
}

/** Upsert one player row after a production submit. Fire-and-forget safe. */
async function upsertPlayerProfileForDiscord(sb, discordUsername) {
  const discord = String(discordUsername || '').trim();
  const discordKey = normDiscordKey(discord);
  if (!discordKey) return null;

  const { data: responses, error: rErr } = await sb
    .from('trivia_responses')
    .select(
      'id, quiz_id, discord_username, ingame_name, answers, score, max_score, per_question, submitted_at'
    )
    .ilike('discord_username', discord);
  if (rErr) throw rErr;

  const prod = (responses || []).filter((r) => !responseIsTestRow(r));
  if (!prod.length) return null;

  const quizIds = [...new Set(prod.map((r) => r.quiz_id))];
  const questions = await fetchQuestionsForQuizIds(sb, quizIds);
  const questionById = questionByIdFromList(questions);
  const row = aggregatePlayerFromResponses(discordKey, discord, prod, questionById);
  if (!row) return null;

  const { data: existing } = await sb
    .from('trivia_player_profiles')
    .select('avatar_badge, avatar_kind, avatar_ref, classroom_bonus')
    .eq('discord_key', discordKey)
    .maybeSingle();

  const { data, error } = await sb
    .from('trivia_player_profiles')
    .upsert(
      profileRowToDb(row, {
        existingAvatarBadge: existing?.avatar_badge,
        existingAvatarKind: existing?.avatar_kind,
        existingAvatarRef: existing?.avatar_ref,
        existingBonus: existing?.classroom_bonus ?? 0,
      }),
      { onConflict: 'discord_key' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

function queuePlayerProfileUpsert(sb, discordUsername) {
  upsertPlayerProfileForDiscord(sb, discordUsername).catch((err) => {
    console.warn('trivia player profile upsert', discordUsername, err.message);
  });
}

/** Rebuild profiles for every Discord seen in these quizzes (stats include all their trivias). */
async function syncPlayerProfilesForHostQuizzes(sb, quizIds) {
  if (!quizIds?.length) return { synced: 0 };

  const { data: responses, error: rErr } = await sb
    .from('trivia_responses')
    .select('discord_username, answers')
    .in('quiz_id', quizIds);
  if (rErr) throw rErr;

  const discords = [
    ...new Set(
      (responses || [])
        .filter((r) => !responseIsTestRow(r))
        .map((r) => String(r.discord_username || '').trim())
        .filter(Boolean)
    ),
  ];

  let synced = 0;
  for (const discord of discords) {
    const row = await upsertPlayerProfileForDiscord(sb, discord);
    if (row) synced += 1;
  }
  return { synced, candidates: discords.length };
}

/** Rebuild all player profiles from every production response in the database. */
async function syncAllPlayerProfiles(sb) {
  const { data: responses, error: rErr } = await sb
    .from('trivia_responses')
    .select(
      'id, quiz_id, discord_username, ingame_name, answers, score, max_score, per_question, submitted_at'
    );
  if (rErr) throw rErr;

  const prod = (responses || []).filter((r) => !responseIsTestRow(r));
  const byKey = new Map();
  for (const r of prod) {
    const key = normDiscordKey(r.discord_username);
    if (!key) continue;
    let list = byKey.get(key);
    if (!list) {
      list = { discord: r.discord_username, rows: [] };
      byKey.set(key, list);
    }
    list.rows.push(r);
  }

  const allQuizIds = [...new Set(prod.map((r) => r.quiz_id))];
  const questions = await fetchQuestionsForQuizIds(sb, allQuizIds);
  const questionById = questionByIdFromList(questions);

  const { data: existingRows } = await sb
    .from('trivia_player_profiles')
    .select('discord_key, avatar_badge, avatar_kind, avatar_ref, classroom_bonus');
  const avatarByKey = Object.fromEntries(
    (existingRows || []).map((r) => [
      r.discord_key,
      {
        badge: r.avatar_badge,
        kind: r.avatar_kind,
        ref: r.avatar_ref,
      },
    ])
  );
  const bonusByKey = Object.fromEntries(
    (existingRows || []).map((r) => [r.discord_key, Number(r.classroom_bonus) || 0])
  );

  const profiles = [];
  for (const [discordKey, { discord, rows }] of byKey) {
    const row = aggregatePlayerFromResponses(discordKey, discord, rows, questionById);
    if (row) {
      const prev = avatarByKey[discordKey] || {};
      profiles.push(
        profileRowToDb(row, {
          existingAvatarBadge: prev.badge,
          existingAvatarKind: prev.kind,
          existingAvatarRef: prev.ref,
          existingBonus: bonusByKey[discordKey] ?? 0,
        })
      );
    }
  }

  if (!profiles.length) return { synced: 0 };

  const { error } = await sb.from('trivia_player_profiles').upsert(profiles, { onConflict: 'discord_key' });
  if (error) throw error;
  return { synced: profiles.length };
}

/** Host ClassDojo +/- — adjusts classroom_bonus without touching auto trivia points. */
async function adjustClassroomBonus(sb, discordKeyRaw, delta) {
  const discordKey = normDiscordKey(discordKeyRaw);
  const d = Math.round(Number(delta) * 10) / 10;
  if (!discordKey) {
    const err = new Error('Invalid student');
    err.status = 400;
    throw err;
  }
  if (!Number.isFinite(d) || d === 0) {
    const err = new Error('Invalid point change');
    err.status = 400;
    throw err;
  }
  // Allow half-points (±0.5) and whole points; reject weird fractions.
  if (Math.abs(d * 2 - Math.round(d * 2)) > 1e-9) {
    const err = new Error('Use whole or half points only (e.g. 1 or 0.5)');
    err.status = 400;
    throw err;
  }

  let { data: existing, error: gErr } = await sb
    .from('trivia_player_profiles')
    .select('*')
    .eq('discord_key', discordKey)
    .maybeSingle();
  if (gErr) throw gErr;

  if (!existing) {
    const discord = String(discordKeyRaw || '').trim();
    existing = await upsertPlayerProfileForDiscord(sb, discord);
    if (!existing) {
      const err = new Error('Student not found — no trivia submissions yet');
      err.status = 404;
      throw err;
    }
  }

  const nextBonus = Math.max(
    -9999,
    Math.min(99999, Math.round(((Number(existing.classroom_bonus) || 0) + d) * 10) / 10)
  );
  const { data, error } = await sb
    .from('trivia_player_profiles')
    .update({ classroom_bonus: nextBonus, updated_at: new Date().toISOString() })
    .eq('discord_key', discordKey)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Apply the same bonus delta to many students (everyone / filtered roster). */
async function adjustClassroomBonusBulk(sb, discordKeysRaw, delta) {
  const keys = [
    ...new Set(
      (Array.isArray(discordKeysRaw) ? discordKeysRaw : [])
        .map((k) => normDiscordKey(k))
        .filter(Boolean)
    ),
  ];
  if (!keys.length) {
    const err = new Error('No students selected');
    err.status = 400;
    throw err;
  }
  if (keys.length > 500) {
    const err = new Error('Too many students in one bulk update');
    err.status = 400;
    throw err;
  }

  const profiles = [];
  const chunkSize = 12;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const rows = await Promise.all(chunk.map((key) => adjustClassroomBonus(sb, key, delta)));
    profiles.push(...rows.filter(Boolean));
  }
  return { updated: profiles.length, profiles };
}

/** Host picks badge / god / skin portrait for a student. */
async function setClassroomAvatar(sb, discordKeyRaw, kind, ref) {
  const discordKey = normDiscordKey(discordKeyRaw);
  const k = String(kind || '').trim();
  const r = String(ref || '').trim();
  if (!discordKey) {
    const err = new Error('Invalid student');
    err.status = 400;
    throw err;
  }
  if (!isValidAvatarSelection(k, r)) {
    const err = new Error('Invalid avatar selection');
    err.status = 400;
    throw err;
  }

  let { data: existing, error: gErr } = await sb
    .from('trivia_player_profiles')
    .select('*')
    .eq('discord_key', discordKey)
    .maybeSingle();
  if (gErr) throw gErr;

  if (!existing) {
    const discord = String(discordKeyRaw || '').trim();
    existing = await upsertPlayerProfileForDiscord(sb, discord);
    if (!existing) {
      const err = new Error('Student not found — no trivia submissions yet');
      err.status = 404;
      throw err;
    }
  }

  const fields = {
    ...avatarDbFields(k, r),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('trivia_player_profiles')
    .update(fields)
    .eq('discord_key', discordKey)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  normDiscordKey,
  classroomPoints,
  upsertPlayerProfileForDiscord,
  queuePlayerProfileUpsert,
  syncPlayerProfilesForHostQuizzes,
  syncAllPlayerProfiles,
  adjustClassroomBonus,
  adjustClassroomBonusBulk,
  setClassroomAvatar,
};
