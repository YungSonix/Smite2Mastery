/** Normalize IP for duplicate detection (skip empty / localhost). */
export function ipDedupeKey(ip) {
  const raw = String(ip || '').trim().toLowerCase();
  if (!raw) return '';
  if (
    raw === '::1' ||
    raw === '127.0.0.1' ||
    raw === '::ffff:127.0.0.1' ||
    raw === 'localhost'
  ) {
    return '';
  }
  return raw;
}

/** Map normalized IP → submission count. */
export function duplicateIpCounts(responses) {
  const counts = new Map();
  for (const r of responses || []) {
    const key = ipDedupeKey(r.ip_address);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/** Map normalized IP → peers on that IP (discord + in-game). */
export function duplicateIpPeers(responses) {
  const peers = new Map();
  for (const r of responses || []) {
    const key = ipDedupeKey(r.ip_address);
    if (!key) continue;
    const row = {
      id: r.id,
      discord: String(r.discord_username || '').trim(),
      ingame: String(r.ingame_name || '').trim(),
    };
    if (!peers.has(key)) peers.set(key, []);
    peers.get(key).push(row);
  }
  return peers;
}

export function peerDisplayLabel(peer) {
  if (!peer) return '?';
  if (peer.ingame && peer.discord) return `${peer.discord} (${peer.ingame})`;
  return peer.discord || peer.ingame || '?';
}

export function sharedIpPeersFor(response, peersMap) {
  const key = ipDedupeKey(response?.ip_address);
  if (!key || !peersMap?.has(key)) return [];
  const list = peersMap.get(key) || [];
  return list.filter((p) => p.id !== response?.id);
}

export function sharedIpPeerSummary(peers, { max = 2 } = {}) {
  if (!peers?.length) return '';
  const labels = peers.slice(0, max).map(peerDisplayLabel);
  const extra = peers.length - labels.length;
  return extra > 0 ? `${labels.join(', ')} +${extra}` : labels.join(', ');
}

export function sharedIpPeerTitle(peers) {
  if (!peers?.length) return '';
  return `Same IP as: ${peers.map(peerDisplayLabel).join(' · ')}`;
}

export function sharedIpSubmissionCount(ip, counts) {
  const key = ipDedupeKey(ip);
  if (!key) return 0;
  return counts.get(key) || 0;
}

export function sharedIpLabel(count) {
  if (count <= 1) return '';
  const others = count - 1;
  return `Same IP as ${others} other submission${others === 1 ? '' : 's'}`;
}
