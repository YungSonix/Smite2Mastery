import { responseDurationMs } from './triviaInsights';
import { responsePercent } from './sortResponses';

function normDiscord(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/#\d{4}$/, '')
    .replace(/[._\s-]+/g, '');
}

function normIngame(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/[._\s-]+/g, '');
}

function peerLabel(peer) {
  if (!peer) return '?';
  if (peer.ingame && peer.discord) return `${peer.discord} (${peer.ingame})`;
  return peer.discord || peer.ingame || '?';
}

function submittedMs(r) {
  const t = Date.parse(r?.submitted_at);
  return Number.isFinite(t) ? t : null;
}

function integrityLevel(score) {
  if (score >= 8) return 'high';
  if (score >= 5) return 'strong';
  if (score >= 3) return 'soft';
  return 'none';
}

/** Score pairs of submissions for likely same-person / alt accounts (no IP). */
export function buildSubmissionIntegrity(responses) {
  const rows = (responses || []).map((r) => ({
    id: r.id,
    discord: String(r.discord_username || '').trim(),
    ingame: String(r.ingame_name || '').trim(),
    discordKey: normDiscord(r.discord_username),
    ingameKey: normIngame(r.ingame_name),
    submitted: submittedMs(r),
    duration: responseDurationMs(r),
    score: Number(r.score) || 0,
    pct: responsePercent(r),
  }));

  const byIngame = new Map();
  const byDiscord = new Map();
  for (const row of rows) {
    if (row.ingameKey.length >= 3) {
      if (!byIngame.has(row.ingameKey)) byIngame.set(row.ingameKey, []);
      byIngame.get(row.ingameKey).push(row);
    }
    if (row.discordKey) {
      if (!byDiscord.has(row.discordKey)) byDiscord.set(row.discordKey, []);
      byDiscord.get(row.discordKey).push(row);
    }
  }

  const out = new Map();

  for (const row of rows) {
    const peers = new Map();
    let score = 0;
    const reasons = [];

    const addPeer = (other, reason, weight) => {
      if (!other || other.id === row.id) return;
      score += weight;
      if (!reasons.includes(reason)) reasons.push(reason);
      const existing = peers.get(other.id) || {
        id: other.id,
        discord: other.discord,
        ingame: other.ingame,
        reasons: [],
      };
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      peers.set(other.id, existing);
    };

    if (row.ingameKey.length >= 3) {
      for (const other of byIngame.get(row.ingameKey) || []) {
        if (other.discordKey !== row.discordKey) {
          addPeer(other, `Same in-game name: ${row.ingame}`, 5);
        }
      }
    }

    if (row.discordKey) {
      for (const other of byDiscord.get(row.discordKey) || []) {
        if (other.id !== row.id) {
          addPeer(other, `Same Discord: ${row.discord}`, 6);
        }
      }
      for (const other of rows) {
        if (other.id === row.id || !other.discordKey) continue;
        if (
          other.discordKey !== row.discordKey &&
          (other.discordKey.startsWith(row.discordKey) ||
            row.discordKey.startsWith(other.discordKey) ||
            other.discordKey.slice(0, 4) === row.discordKey.slice(0, 4))
        ) {
          addPeer(other, `Similar Discord to ${other.discord}`, 3);
        }
      }
    }

    for (const other of rows) {
      if (other.id === row.id) continue;
      if (row.submitted != null && other.submitted != null) {
        const delta = Math.abs(row.submitted - other.submitted);
        if (delta <= 90_000) {
          addPeer(other, 'Submitted within 90 seconds', 2);
        }
      }
      if (
        row.duration != null &&
        other.duration != null &&
        Math.abs(row.duration - other.duration) <= 5000 &&
        Math.abs(row.score - other.score) <= 1
      ) {
        addPeer(other, 'Nearly identical finish time and score', 3);
      }
    }

    const peerList = [...peers.values()];
    const level = integrityLevel(score);
    out.set(row.id, {
      score,
      level,
      peers: peerList,
      reasons,
      peerCount: peerList.length,
      title:
        peerList.length > 0
          ? `Review suggested: ${peerList.map((p) => peerLabel(p)).join(' · ')}`
          : reasons.length
            ? `Review suggested: ${reasons.join(' · ')}`
            : '',
    });
  }

  return out;
}

export function integrityFor(responseId, index) {
  return index?.get(responseId) || { level: 'none', peers: [], score: 0, title: '', peerCount: 0 };
}

export function integrityPairsCount(responses, index) {
  if (!index?.size) return 0;
  const seen = new Set();
  let n = 0;
  for (const r of responses || []) {
    const entry = index.get(r.id);
    if (!entry?.peers?.length) continue;
    for (const p of entry.peers) {
      const key = [String(r.id), String(p.id)].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        n += 1;
      }
    }
  }
  return n;
}
