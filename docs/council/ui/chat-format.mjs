/** Shared chat splitting + @mention formatting for panel (browser + server). */

export const PANEL_DEFAULT_MAX_BUBBLES = 200;
export const VERDICT_DISPLAY_MAX_WORDS = 45;

export function truncateVerdictText(text, maxWords = VERDICT_DISPLAY_MAX_WORDS) {
  const raw = String(text ?? '').trim();
  if (!raw) return { text: '', truncated: false };
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text: raw, truncated: false };
  return {
    text: `${words.slice(0, maxWords).join(' ')}…`,
    truncated: true,
    full: raw,
  };
}

export const MEMBER_LABELS = { nala: 'NALA', london: 'LONDON', fasa: 'FASA' };
export const MEMBER_INITIALS = { nala: 'N', london: 'L', fasa: 'F' };

export function splitForChat(text, maxChars = 200) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const paras = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const para of paras.length ? paras : [raw]) {
    if (para.length <= maxChars) {
      out.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?]+[.!?]+(?:\s|$)|[^\s].+$/g) || [para];
    let chunk = '';
    for (const sent of sentences) {
      const next = chunk ? `${chunk} ${sent.trim()}` : sent.trim();
      if (next.length > maxChars && chunk) {
        out.push(chunk.trim());
        chunk = sent.trim();
      } else {
        chunk = next;
      }
    }
    if (chunk.trim()) out.push(chunk.trim());
  }
  return out;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeNameRefs(text) {
  let s = String(text ?? '');
  for (const label of ['Nala', 'London', 'Fasa']) {
    const u = label.toUpperCase();
    s = s.replace(new RegExp(`^(${label}|${u})\\s*[—–\\-]\\s*`, 'i'), `@${label} `);
    s = s.replace(new RegExp(`\\n(${label}|${u})\\s*[—–\\-]\\s*`, 'gi'), `\n@${label} `);
    s = s.replace(new RegExp(`^(${label}|${u})\\s*,\\s*`, 'i'), `@${label}, `);
    s = s.replace(new RegExp(`([.!?]\\s+)(${label}|${u})\\s*,\\s*`, 'gi'), `$1@${label}, `);
    s = s.replace(new RegExp(`([.!?]\\s+)(${label}|${u})\\s*[—–\\-]\\s*`, 'gi'), `$1@${label} `);
  }
  return s;
}

export function formatAttachmentsHtml(attachments) {
  if (!attachments?.length) return '';
  const imgs = attachments
    .map((a) => {
      const url = escapeHtml(a.url || '');
      const name = escapeHtml(a.name || 'image');
      if (!url) return '';
      return `<a href="${url}" target="_blank" rel="noopener" class="attach-thumb-wrap"><img class="attach-thumb" src="${url}" alt="${name}" loading="lazy" /></a>`;
    })
    .filter(Boolean)
    .join('');
  if (!imgs) return '';
  return `<div class="bubble-attachments">${imgs}</div>`;
}

export function formatBodyHtml(text) {
  let s = escapeHtml(stripMarkdownLite(normalizeNameRefs(text)));
  const names = { nala: 'Nala', london: 'London', fasa: 'Fasa' };
  s = s.replace(/@(Nala|London|Fasa|NALA|LONDON|FASA|nala|london|fasa)\b/g, (_, name) => {
    const id = name.toLowerCase();
    const cls = id === 'nala' ? 'nala' : id === 'london' ? 'london' : 'fasa';
    return `<span class="mention ${cls}">@${names[id] || name}</span>`;
  });
  return s;
}

export function memberClass(id) {
  const m = String(id).toLowerCase();
  if (m === 'nala') return 'nala';
  if (m === 'london') return 'london';
  if (m === 'fasa') return 'fasa';
  return 'system';
}

export function bubbleKey(member, round, at, chunkIdx, kind = 'msg') {
  return `${kind}:${String(member).toLowerCase()}:r${round}:${at || '0'}:c${chunkIdx}`;
}

/** One bubble per turn on the panel — full reply in a single container. */
export const MAX_BUBBLES_PER_MEMBER = 1;
export const MAX_CHARS_PER_BUBBLE = 320;

export function stripMarkdownLite(text) {
  return String(text ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '');
}

/** Split into 1–3 short bubbles for group-chat feel. */
export function memberReplyChunks(text, maxBubbles = MAX_BUBBLES_PER_MEMBER, maxChars = MAX_CHARS_PER_BUBBLE) {
  let raw = stripMarkdownLite(normalizeNameRefs(String(text ?? '').trim()));
  if (!raw) return [];

  let parts = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    const sentences = raw.match(/[^.!?]+[.!?]+(?:\s|$)|[^\s].+$/g) || [raw];
    parts = [];
    let chunk = '';
    for (const sent of sentences) {
      const s = sent.trim();
      const next = chunk ? `${chunk} ${s}` : s;
      const sentenceCount = (chunk.match(/[.!?](?:\s|$)/g) || []).length + 1;
      if ((next.length > maxChars || sentenceCount >= 2) && chunk) {
        parts.push(chunk.trim());
        chunk = s;
      } else {
        chunk = next;
      }
    }
    if (chunk.trim()) parts.push(chunk.trim());
  }

  parts = parts.map((p) => (p.length > maxChars + 40 ? `${p.slice(0, maxChars).trim()}…` : p));

  if (parts.length > maxBubbles) {
    const head = parts.slice(0, maxBubbles - 1);
    head.push(parts.slice(maxBubbles - 1).join(' ').slice(0, maxChars + 20));
    parts = head;
  }

  return parts.filter(Boolean);
}

export function getPanelViewDefaults() {
  return { clearedSessionId: null, maxVisibleBubbles: PANEL_DEFAULT_MAX_BUBBLES, clearedAt: null };
}

export function isCouncilLive(live, session) {
  if (!live) return session?.status === 'in_progress' || session?.status === 'prepared';
  const streaming = ['nala', 'london', 'fasa'].some((id) => {
    const m = live.members?.[id] ?? {};
    const draft = String(m.draft || '').trim();
    return m.state === 'speaking' || Boolean(draft);
  });
  if (session?.status === 'complete') return streaming;
  if (live.chair?.state === 'running') return true;
  if (session?.status === 'in_progress' || session?.status === 'prepared') return true;
  return ['nala', 'london', 'fasa'].some((id) =>
    ['waiting', 'thinking', 'speaking'].includes(live.members?.[id]?.state)
  );
}

export function thinkingBubbleText(memberState) {
  const draft = String(memberState?.draft || '').trim();
  if (draft) return draft;
  const st = memberState?.state;
  const detail = String(memberState?.detail || '').trim();
  if (st === 'speaking' && detail) return detail;
  if (st === 'thinking' && detail) return detail;
  if (st === 'waiting') return detail || 'Waiting for turn…';
  return detail || 'Thinking…';
}

export function shouldHideSessionForPanel(session, panelView) {
  if (!panelView?.clearedSessionId || !session?.id) return false;
  return session.id === panelView.clearedSessionId;
}

/** Keep only the tail when user explicitly cleared view — full session otherwise. */
export function applyPanelBubbleLimit(bubbles, { maxVisible = PANEL_DEFAULT_MAX_BUBBLES, liveActive = false, trimEnabled = false } = {}) {
  if (liveActive || !trimEnabled || bubbles.length <= maxVisible) {
    return { bubbles, truncated: false, hiddenCount: 0 };
  }
  const verdict = bubbles.find((b) => b.kind === 'verdict');
  const hasVerdict = Boolean(verdict);
  let kept;
  if (hasVerdict && bubbles[bubbles.length - 1]?.kind === 'verdict') {
    const body = bubbles.slice(0, -1);
    kept = [...body.slice(-(maxVisible - 1)), verdict];
  } else {
    kept = bubbles.slice(-maxVisible);
  }
  return { bubbles: kept, truncated: true, hiddenCount: bubbles.length - kept.length };
}

export function buildMessageBubbles(
  session,
  {
    pendingTopic = null,
    pendingAttachments = null,
    live = null,
    queueOnly = false,
    hideSessionContent = false,
  } = {}
) {
  const bubbles = [];
  const pendingImages = pendingAttachments ?? [];

  if (queueOnly && (pendingTopic || pendingImages.length)) {
    bubbles.push({
      key: 'user:pending',
      kind: 'user',
      member: 'user',
      label: 'YOU',
      text: pendingTopic || (pendingImages.length ? '(image attached)' : ''),
      attachments: pendingImages,
      continuation: false,
    });
    bubbles.push({
      key: 'chair:queued',
      kind: 'system',
      member: 'chair',
      label: 'CHAIR',
      text: 'Queued. Opening Chair with go — confirm in Cursor if prompted.',
      continuation: false,
    });
    return bubbles;
  }

  if (pendingTopic || pendingImages.length) {
    bubbles.push({
      key: 'user:pending',
      kind: 'user',
      member: 'user',
      label: 'YOU',
      text: pendingTopic || (pendingImages.length ? '(image attached)' : ''),
      attachments: pendingImages,
      continuation: false,
    });
    if (!session?.messages?.length) {
      bubbles.push({
        key: 'chair:queued',
        kind: 'system',
        member: 'chair',
        label: 'CHAIR',
        text: 'Queued. Opening Chair with go — confirm in Cursor if prompted.',
        continuation: false,
      });
    }
  } else if (
    !hideSessionContent &&
    session?.topic &&
    (session.messages?.length || session.decision)
  ) {
    bubbles.push({
      key: `user:${session.id || 'topic'}`,
      kind: 'user',
      member: 'user',
      label: 'YOU',
      text: session.topic || (session.attachments?.length ? '(image attached)' : ''),
      attachments: session.attachments ?? [],
      continuation: false,
    });
  }

  if (live?.phase?.label && isCouncilLive(live, session)) {
    bubbles.push({
      key: `phase:${live.phase.id || 'live'}`,
      kind: 'system',
      member: 'chair',
      label: 'CHAIR',
      text: live.phase.label,
      continuation: false,
    });
  }

  if (!hideSessionContent) {
    for (const round of [1, 2]) {
      for (const m of (session?.messages ?? []).filter((x) => x.round === round)) {
        const id = memberClass(m.member);
        const chunks = memberReplyChunks(m.text, MAX_BUBBLES_PER_MEMBER);
        chunks.forEach((chunk, i) => {
          bubbles.push({
            key: bubbleKey(m.member, m.round, m.at, i),
            kind: id,
            member: id,
            label: MEMBER_LABELS[id] || String(m.member).toUpperCase(),
            round: m.round,
            text: chunk,
            continuation: i > 0,
          });
        });
      }
    }

    if (session?.decision) {
      const verdict = truncateVerdictText(normalizeNameRefs(session.decision));
      bubbles.push({
        key: 'verdict:0',
        kind: 'verdict',
        member: 'chair',
        label: 'FINAL VERDICT',
        text: verdict.text,
        verdictTruncated: verdict.truncated,
        verdictFull: verdict.full,
        continuation: false,
      });
    }
  }

  const currentRound =
    Number(live?.round) > 0 ? Number(live.round) : session?.messages?.some((m) => m.round === 2) ? 2 : 1;
  if (isCouncilLive(live, session)) {
    for (const id of ['nala', 'london', 'fasa']) {
      const st = live?.members?.[id]?.state;
      if (!['thinking', 'speaking', 'waiting'].includes(st)) continue;
      const hasMsg = (session?.messages ?? []).some(
        (m) => String(m.member).toLowerCase() === id && m.round === currentRound
      );
      const liveMember = live?.members?.[id] ?? {};
      const draft = String(liveMember.draft || '').trim();
      if (hasMsg && !draft) continue;
      if (hasMsg && draft) continue;
      if (st === 'thinking' && hasMsg) continue;
      bubbles.push({
        key: `think:${id}:r${currentRound}`,
        kind: id,
        member: id,
        label: MEMBER_LABELS[id],
        round: currentRound,
        text: thinkingBubbleText(liveMember),
        thinking: st !== 'done',
        speaking: st === 'speaking',
        continuation: false,
      });
    }
  }

  return bubbles;
}

/** Live typing / phase bubbles — shown even when panel view is cleared. */
export function isLivePanelBubble(b) {
  return Boolean(b.thinking || b.speaking || String(b.key || '').startsWith('phase:'));
}

export function buildModLogBubbles(modLog, session) {
  const sid = session?.id;
  const entries = (modLog?.entries ?? []).filter((e) => !sid || e.sessionId === sid);
  return entries.map((e) => ({
    key: `mod:${e.id}`,
    kind: 'mod',
    member: 'chair',
    label: 'MOD LOG',
    text: `${e.summary} → ${e.file}`,
    continuation: false,
    at: e.at,
  }));
}

export function buildPanelDisplayBubbles(
  session,
  { pending = { status: 'idle' }, live = null, panelView = getPanelViewDefaults(), modLog = { entries: [] } } = {}
) {
  const pendingTopic = pending.status === 'new' ? pending.topic : null;
  const pendingAttachments = pending.status === 'new' ? pending.attachments ?? [] : null;
  const queueOnly = pending.status === 'new';
  const liveActive = isCouncilLive(live, session);
  const panelHidden = shouldHideSessionForPanel(session, panelView);
  const trimEnabled = Boolean(panelView.clearedSessionId && panelHidden);
  const raw = buildMessageBubbles(session, {
    pendingTopic,
    pendingAttachments,
    live,
    queueOnly,
    hideSessionContent: panelHidden,
  });
  const modBubbles = panelHidden ? [] : buildModLogBubbles(modLog, session);
  const merged = [...raw];
  if (modBubbles.length) {
    const verdictIdx = merged.findIndex((b) => b.kind === 'verdict');
    if (verdictIdx >= 0) merged.splice(verdictIdx + 1, 0, ...modBubbles);
    else merged.push(...modBubbles);
  }
  const maxVisible = panelView.maxVisibleBubbles ?? PANEL_DEFAULT_MAX_BUBBLES;
  const { bubbles, truncated, hiddenCount } = applyPanelBubbleLimit(merged, {
    maxVisible,
    liveActive,
    trimEnabled,
  });
  return { bubbles, truncated, hiddenCount, panelHidden, maxVisible, liveActive };
}

export function renderBubbleHtml(b) {
  const initial =
    b.member === 'user'
      ? 'Y'
      : b.kind === 'mod'
        ? '📝'
        : b.member === 'chair' || b.kind === 'verdict'
          ? '⚖'
          : MEMBER_INITIALS[b.member] || '?';
  const cont = b.continuation ? ' continuation' : '';
  const think = b.thinking ? ' thinking' : '';
  const speak = b.speaking ? ' speaking' : '';
  const label = b.continuation
    ? ''
    : `<div class="msg-label">${escapeHtml(b.label)}${b.thinking ? (b.speaking ? ' · typing…' : ' · thinking…') : ''}</div>`;
  const verdictExpand =
    b.verdictTruncated && b.verdictFull
      ? `<details class="verdict-expand"><summary>Full verdict</summary><p>${formatBodyHtml(b.verdictFull)}</p></details>`
      : '';
  const attachmentsHtml = formatAttachmentsHtml(b.attachments);
  const hideText =
    b.speaking && b.thinking && b.text && b.text !== 'Thinking…' && b.text !== 'Waiting…';
  const showText = !hideText && b.text && b.text !== '(image attached)';
  const bodyText = showText ? formatBodyHtml(b.text) : '';
  const textBlock = bodyText ? `<p>${bodyText}</p>` : attachmentsHtml ? '' : '<p></p>';
  return `
    <div class="msg ${b.kind}${cont}${think}${speak}" data-msg-key="${escapeHtml(b.key)}">
      <div class="msg-row">
        <div class="msg-avatar" aria-hidden="true">${initial}</div>
        <div class="msg-body">
          ${label}
          <div class="bubble${b.kind === 'verdict' ? ' verdict-bubble' : ''}${b.kind === 'mod' ? ' mod-bubble' : ''}">${textBlock}${attachmentsHtml}${verdictExpand}</div>
        </div>
      </div>
    </div>`;
}
