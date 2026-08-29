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
