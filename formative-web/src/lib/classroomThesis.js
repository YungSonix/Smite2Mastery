/**
 * Classroom "student thesis" + class next-trivia recipe.
 * Buckets by meta.remix_kind / hint_context so hosts can plan the next quiz.
 */

import { promptPlain } from './promptPlain';

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

/** Host-facing style groups → remix_kind membership. */
export const STYLE_GROUPS = [
  {
    id: 'gods',
    label: 'Gods',
    kinds: new Set([
      'ob_release',
      'pantheon_odd_one',
      'god_cc_odd_one',
      'god_role_odd_one',
      'god_scaling_odd_one',
      'god_aspect_odd_one',
      'god_claim_correct',
      'god_claim_incorrect',
      'aspect_name',
      'aspect_blank',
      'aspect_icon',
      'release_after',
      'ability_cc',
      'passive',
      'combo_cc',
      'god_emoji',
    ]),
  },
  {
    id: 'skins',
    label: 'Skins',
    kinds: new Set(['skin_guess']),
  },
  {
    id: 'voice',
    label: 'Voice lines',
    kinds: new Set(['voice_line']),
  },
  {
    id: 'ability_sfx',
    label: 'Ability SFX',
    kinds: new Set(['ability_sound']),
  },
  {
    id: 'items',
    label: 'Items',
    kinds: new Set(['item_has_stat', 'item_stat_amount', 'item_identify', 'item_stat_odd_one']),
  },
  {
    id: 'vgs',
    label: 'VGS',
    kinds: new Set(['vgs_listen', 'vgs_callout_pick', 'vgs_type_code']),
  },
];

const KIND_TO_GROUP = (() => {
  const map = new Map();
  for (const g of STYLE_GROUPS) {
    for (const k of g.kinds) map.set(k, g.id);
  }
  return map;
})();

function isScoredQuestion(q) {
  if (!q?.id) return false;
  if (SKIP_TYPES.has(q.type)) return false;
  if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate) return false;
  return Number(q.points) > 0;
}

function remixKind(q) {
  return String(q?.meta?.remix_kind || '').trim();
}

function hintContext(q) {
  const ctx = q?.meta?.hint_context;
  return ctx && typeof ctx === 'object' ? ctx : {};
}

function groupIdForQuestion(q) {
  const kind = remixKind(q);
  if (kind && KIND_TO_GROUP.has(kind)) return KIND_TO_GROUP.get(kind);
  const p = promptPlain(q?.prompt).toLowerCase();
  if (/skin|zoom|crop/i.test(p)) return 'skins';
  if (/voice\s*line|who said/i.test(p)) return 'voice';
  if (/ability.*(sound|sfx|cast)|cast sound/i.test(p)) return 'ability_sfx';
  if (/\bvgs\b|callout/i.test(p)) return 'vgs';
  if (/item|stat|passive item/i.test(p)) return 'items';
  if (/god|pantheon|aspect|passive|emoji|released/i.test(p)) return 'gods';
  return 'other';
}

function fracCorrect(perQuestion, qid) {
  const raw = perQuestion?.[qid];
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? Math.min(1, n / 100) : Math.max(0, Math.min(1, n));
}

function verdictFor(seen, pct) {
  if (seen <= 0) return 'Untested';
  if (seen < 2) return pct >= 0.75 ? 'OK' : pct != null && pct < 0.5 ? 'Shaky' : 'Thin';
  if (pct == null) return 'Thin';
  if (pct >= 0.75 && seen >= 3) return 'Solid';
  if (pct >= 0.5) return 'OK';
  return 'Shaky';
}

function uniquePush(list, key, label, max = 5) {
  if (!label || list.some((x) => x.key === key)) return;
  if (list.length >= max) return;
  list.push({ key, label });
}

function entityLabels(q, groupId) {
  const ctx = hintContext(q);
  const out = [];
  if (groupId === 'gods' || groupId === 'voice') {
    if (ctx.god) out.push({ key: `god:${ctx.god}`, label: String(ctx.god) });
  }
  if (groupId === 'skins') {
    const god = ctx.god ? String(ctx.god) : '';
    const skin = ctx.skin ? String(ctx.skin) : '';
    if (skin || god) {
      out.push({
        key: `skin:${god}|${skin}`,
        label: skin && god ? `${skin} (${god})` : skin || god,
      });
    }
  }
  if (groupId === 'ability_sfx') {
    const god = ctx.god ? String(ctx.god) : '';
    const ability = ctx.ability ? String(ctx.ability) : '';
    if (ability || god) {
      out.push({
        key: `sfx:${god}|${ability}`,
        label: ability && god ? `${ability} (${god})` : ability || god,
      });
    }
  }
  if (groupId === 'items' && ctx.item) {
    out.push({ key: `item:${ctx.item}`, label: String(ctx.item) });
  }
  if (groupId === 'vgs' && (ctx.code || ctx.callout)) {
    const label = String(ctx.code || ctx.callout);
    out.push({ key: `vgs:${label}`, label });
  }
  return out;
}

export function buildStudentThesis(player, questions) {
  const qById = new Map((questions || []).filter(isScoredQuestion).map((q) => [q.id, q]));
  const groupStats = Object.fromEntries(
    [...STYLE_GROUPS, { id: 'other', label: 'Other', kinds: new Set() }].map((g) => [
      g.id,
      { id: g.id, label: g.label, seen: 0, right: 0, sumFrac: 0 },
    ])
  );

  const recognizes = {
    gods: [],
    skins: [],
    voice: [],
    ability_sfx: [],
    items: [],
    vgs: [],
  };
  const misses = {
    gods: [],
    skins: [],
    voice: [],
    ability_sfx: [],
    items: [],
    vgs: [],
  };

  const attempts = player?.attempts || [];
  for (const attempt of attempts) {
    const per = attempt.perQuestion || {};
    for (const [qid] of Object.entries(per)) {
      const q = qById.get(qid);
      if (!q) continue;
      const frac = fracCorrect(per, qid);
      if (frac == null) continue;
      const gid = groupIdForQuestion(q);
      const bucket = groupStats[gid] || groupStats.other;
      bucket.seen += 1;
      bucket.sumFrac += frac;
      if (frac >= 0.999) bucket.right += 1;

      const entities = entityLabels(q, gid);
      const target = frac >= 0.999 ? recognizes : misses;
      const listKey =
        gid === 'gods'
          ? 'gods'
          : gid === 'skins'
            ? 'skins'
            : gid === 'voice'
              ? 'voice'
              : gid === 'ability_sfx'
                ? 'ability_sfx'
                : gid === 'items'
                  ? 'items'
                  : gid === 'vgs'
                    ? 'vgs'
                    : null;
      if (!listKey || !target[listKey]) continue;
      for (const ent of entities) {
        uniquePush(target[listKey], ent.key, ent.label, 8);
      }
    }
  }

  const styleCards = STYLE_GROUPS.map((g) => {
    const s = groupStats[g.id];
    const pct = s.seen ? s.sumFrac / s.seen : null;
    return {
      id: g.id,
      label: g.label,
      seen: s.seen,
      right: s.right,
      pct: pct != null ? Math.round(pct * 100) : null,
      verdict: verdictFor(s.seen, pct),
    };
  });

  const strongStyles = styleCards.filter((c) => c.verdict === 'Solid').map((c) => c.label);
  const weakStyles = styleCards.filter((c) => c.verdict === 'Shaky').map((c) => c.label);
  const untested = styleCards.filter((c) => c.verdict === 'Untested').map((c) => c.label);

  let oneLiner = '';
  if (strongStyles.length && weakStyles.length) {
    oneLiner = `Strong on ${strongStyles.slice(0, 2).join(' & ')} · shaky on ${weakStyles
      .slice(0, 2)
      .join(' & ')}`;
  } else if (strongStyles.length) {
    oneLiner = `Strong on ${strongStyles.slice(0, 3).join(', ')}`;
  } else if (weakStyles.length) {
    oneLiner = `Shaky on ${weakStyles.slice(0, 3).join(', ')}`;
  } else if (untested.length === STYLE_GROUPS.length) {
    oneLiner = 'Not enough style-tagged questions yet — keep remixed styles on new quizzes';
  } else {
    oneLiner = 'Mixed results — need more attempts to call a style';
  }

  const recent = attempts.slice(0, 5).map((a) => ({
    quizTitle: a.quizTitle,
    pct: a.pct,
    submittedAt: a.submittedAt,
  }));
  let trend = 'flat';
  if (recent.length >= 3 && recent.every((r) => r.pct != null)) {
    const first = recent[recent.length - 1].pct;
    const last = recent[0].pct;
    if (last - first >= 8) trend = 'up';
    else if (first - last >= 8) trend = 'down';
  }

  const byPrompt = new Map();
  for (const attempt of attempts) {
    for (const [qid] of Object.entries(attempt.perQuestion || {})) {
      const q = qById.get(qid);
      if (!q) continue;
      const frac = fracCorrect(attempt.perQuestion, qid);
      if (frac == null) continue;
      const key = promptPlain(q.prompt) || qid;
      let row = byPrompt.get(key);
      if (!row) {
        row = { label: key.length > 56 ? `${key.slice(0, 55)}…` : key, attempts: 0, sum: 0 };
        byPrompt.set(key, row);
      }
      row.attempts += 1;
      row.sum += frac;
    }
  }
  const promptRows = [...byPrompt.values()]
    .filter((r) => r.attempts >= 2)
    .map((r) => ({
      label: r.label,
      attempts: r.attempts,
      avgPct: Math.round((r.sum / r.attempts) * 100),
    }));
  const goodQuestions = promptRows
    .filter((r) => r.avgPct >= 75)
    .sort((a, b) => b.avgPct - a.avgPct)
    .slice(0, 8);
  const toughQuestions = promptRows
    .filter((r) => r.avgPct < 50)
    .sort((a, b) => a.avgPct - b.avgPct)
    .slice(0, 8);

  return {
    oneLiner,
    styleCards,
    recognizes,
    misses,
    goodQuestions,
    toughQuestions,
    recent,
    trend,
    sampleThin: attempts.length < 2,
  };
}

export function buildClassNextTriviaRecipe({ students = [], questions = [], responses = [] } = {}) {
  const qById = new Map((questions || []).filter(isScoredQuestion).map((q) => [q.id, q]));
  const group = Object.fromEntries(
    STYLE_GROUPS.map((g) => [
      g.id,
      { id: g.id, label: g.label, seen: 0, sumFrac: 0, questions: new Set() },
    ])
  );

  for (const r of responses || []) {
    const per = r.per_question || {};
    for (const [qid] of Object.entries(per)) {
      const q = qById.get(qid);
      if (!q) continue;
      const frac = fracCorrect(per, qid);
      if (frac == null) continue;
      const gid = groupIdForQuestion(q);
      if (!group[gid]) continue;
      group[gid].seen += 1;
      group[gid].sumFrac += frac;
      group[gid].questions.add(qid);
    }
  }

  const mix = STYLE_GROUPS.map((g) => {
    const s = group[g.id];
    const pct = s.seen ? Math.round((s.sumFrac / s.seen) * 100) : null;
    return {
      id: g.id,
      label: g.label,
      seen: s.seen,
      questionCount: s.questions.size,
      pct,
      verdict: verdictFor(s.seen, pct != null ? pct / 100 : null),
    };
  });

  const bullets = [];
  const byPctAsc = [...mix].filter((m) => m.seen >= 5).sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999));
  const byPctDesc = [...mix].filter((m) => m.seen >= 5).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const untested = mix.filter((m) => m.seen === 0 || m.questionCount === 0);

  for (const m of byPctAsc.slice(0, 2)) {
    if (m.pct != null && m.pct < 55) {
      const add = m.pct < 40 ? 3 : 2;
      bullets.push({
        action: 'ADD',
        text: `Add ${add}× ${m.label} — class at ${m.pct}% (${m.seen} answers)`,
      });
    }
  }
  for (const m of untested.slice(0, 2)) {
    bullets.push({
      action: 'ADD',
      text: `Add 1–2× ${m.label} — untested in this host’s recent pool`,
    });
  }
  for (const m of byPctDesc.slice(0, 2)) {
    if (m.pct != null && m.pct >= 80 && m.questionCount >= 4) {
      bullets.push({
        action: 'CUT',
        text: `Cut 1–2× ${m.label} — over-tested / too easy (${m.pct}%, ${m.questionCount} questions)`,
      });
    }
  }
  const mid = mix.filter((m) => m.pct != null && m.pct >= 55 && m.pct < 80 && m.seen >= 5);
  for (const m of mid.slice(0, 1)) {
    bullets.push({
      action: 'KEEP',
      text: `Keep ${m.label} in the middle band (${m.pct}%) — good discriminator`,
    });
  }

  const godHits = new Map();
  for (const s of students || []) {
    for (const g of s.thesis?.recognizes?.gods || []) {
      godHits.set(g.label, (godHits.get(g.label) || 0) + 1);
    }
  }
  const topGods = [...godHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => `${name} (${n})`);
  if (topGods.length) {
    bullets.push({
      action: 'FRESH',
      text: `Fresh gods — class already knows: ${topGods.join(', ')}`,
    });
  }

  const studentCount = (students || []).length;
  const sampleOK = (responses || []).length >= 10;

  return {
    bullets: bullets.slice(0, 6),
    mix,
    studentCount,
    responseCount: (responses || []).length,
    sampleOK,
    headline: sampleOK
      ? `Next trivia recipe · ${studentCount} students · ${responses?.length || 0} submissions`
      : `Next trivia recipe · thin sample (${responses?.length || 0} submissions) — soft advice`,
  };
}

export function attachThesesToStudents(students, questions) {
  return (students || []).map((s) => ({
    ...s,
    thesis: buildStudentThesis(s, questions),
  }));
}
