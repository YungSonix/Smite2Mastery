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

function normIp(ip) {
  const raw = String(ip || '').trim();
  if (!raw || raw.toLowerCase() === 'unknown') return '';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
}

function peerLabel(peer) {
  if (!peer) return '?';
  if (peer.ingame && peer.discord) return `${peer.discord} (${peer.ingame})`;
  return peer.discord || peer.ingame || '?';
}

function integrityLevel(score) {
  if (score >= 10) return 'high';
  if (score >= 6) return 'strong';
  if (score >= 5) return 'soft';
  return 'none';
}

/** Flag duplicate Discord, in-game name, or IP (host-only; no timing heuristics). */
export function buildSubmissionIntegrity(responses) {
  const rows = (responses || []).map((r) => ({
    id: r.id,
    discord: String(r.discord_username || '').trim(),
    ingame: String(r.ingame_name || '').trim(),
    discordKey: normDiscord(r.discord_username),
    ingameKey: normIngame(r.ingame_name),
    ipKey: normIp(r.ip_address),
  }));

  const byIngame = new Map();
  const byDiscord = new Map();
  const byIp = new Map();
  for (const row of rows) {
    if (row.ingameKey.length >= 3) {
      if (!byIngame.has(row.ingameKey)) byIngame.set(row.ingameKey, []);
      byIngame.get(row.ingameKey).push(row);
    }
    if (row.discordKey) {
      if (!byDiscord.has(row.discordKey)) byDiscord.set(row.discordKey, []);
      byDiscord.get(row.discordKey).push(row);
    }
    if (row.ipKey) {
      if (!byIp.has(row.ipKey)) byIp.set(row.ipKey, []);
      byIp.get(row.ipKey).push(row);
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

    if (row.discordKey) {
      for (const other of byDiscord.get(row.discordKey) || []) {
        if (other.id !== row.id) {
          addPeer(other, `Duplicate Discord: ${row.discord}`, 6);
        }
      }
    }

    if (row.ingameKey.length >= 3) {
      for (const other of byIngame.get(row.ingameKey) || []) {
        if (other.discordKey !== row.discordKey) {
          addPeer(other, `Same in-game name: ${row.ingame}`, 5);
        }
      }
    }

    if (row.ipKey) {
      for (const other of byIp.get(row.ipKey) || []) {
        if (other.id !== row.id) {
          addPeer(other, 'Same IP address', 5);
        }
      }
    }

    const peerList = [...peers.values()];
    const level = peerList.length ? integrityLevel(score) : 'none';
    out.set(row.id, {
      score,
      level,
      peers: peerList,
      reasons,
      peerCount: peerList.length,
      title:
        peerList.length > 0
          ? peerList
              .map((p) => `${peerLabel(p)} (${(p.reasons || []).join(', ')})`)
              .join(' · ')
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
