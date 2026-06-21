import {
  buildPanelDisplayBubbles,
  formatAttachmentsHtml,
  formatBodyHtml,
  isLivePanelBubble,
  MEMBER_LABELS,
  MEMBER_INITIALS,
} from './chat-format.mjs';

const MEMBERS = [
  { id: 'nala', name: 'NALA', role: 'Contrarian' },
  { id: 'london', name: 'LONDON', role: 'First principles' },
  { id: 'fasa', name: 'FASA', role: 'Expansionist' },
];

const MODELS = [
  { id: 'auto', pill: 'Auto' },
  { id: 'claude-4.6-sonnet-medium-thinking', pill: 'Sonnet' },
  { id: 'claude-opus-4-8-thinking-high', pill: 'Opus' },
  { id: 'composer-2.5-fast', pill: 'Composer' },
  { id: 'gpt-5.3-codex', pill: 'Codex' },
  { id: 'gpt-5.5-medium', pill: 'GPT' },
];

const DEFAULT_MODELS = {
  nala: 'auto',
  london: 'claude-4.6-sonnet-medium-thinking',
  fasa: 'gpt-5.3-codex',
};

const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function inferMimeFromName(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

function resolveImageMime(file) {
  if (file.type && ALLOWED_IMAGE_TYPES.has(file.type)) return file.type;
  const fromName = inferMimeFromName(file.name);
  if (fromName) return fromName;
  if (file.type && file.type.startsWith('image/')) return file.type;
  return null;
}

let state = { memberModels: { ...DEFAULT_MODELS } };
let lastSessionId = null;
let pendingTopic = null;
let composerAttachments = [];
let loadedUiVersion = null;
let lastSessionSnapshot = '';
let lastLiveSnapshot = '';
let pollTimer = null;
let firstPollDone = false;
let panelViewForcedClear = false;

const MEMBER_ORDER = ['nala', 'london', 'fasa'];

const LS_VERSION_KEY = 'council-ui-version';
const LS_CHANGELOG_KEY = 'council-ui-changelog-seen';
const $ = (sel) => document.querySelector(sel);

async function fetchJson(url, ms = 15000) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function fetchJsonSafe(url, fallback) {
  try {
    return await fetchJson(url);
  } catch {
    return fallback;
  }
}

function memberClass(id) {
  if (id === 'nala' || id === 'NALA') return 'nala';
  if (id === 'london' || id === 'LONDON') return 'london';
  if (id === 'fasa' || id === 'FASA') return 'fasa';
  return 'system';
}

function scrollChatToBottom(feed) {
  if (!feed) return;
  const run = () => {
    feed.scrollTop = feed.scrollHeight;
  };
  run();
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
}

function appendBubble(feed, b, { animate = false } = {}) {
  const el = document.createElement('div');
  const cont = b.continuation ? ' continuation' : '';
  const think = b.thinking ? ' thinking' : '';
  const speak = b.speaking ? ' speaking' : '';
  el.className = `msg ${b.kind}${cont}${think}${speak}`;
  el.dataset.msgKey = b.key;
  const initial =
    b.member === 'user'
      ? 'Y'
      : b.member === 'chair' || b.kind === 'verdict'
        ? '⚖'
        : MEMBER_INITIALS[b.member] || '?';
  const label = b.continuation
    ? ''
    : `<div class="msg-label">${escapeHtml(b.label)}${b.thinking ? (b.speaking ? ' · typing…' : ' · thinking…') : ''}</div>`;
  const verdictExpand =
    b.verdictTruncated && b.verdictFull
      ? `<details class="verdict-expand"><summary>Full verdict</summary><p>${formatBodyHtml(b.verdictFull)}</p></details>`
      : '';
  const bubbleClass = b.kind === 'verdict' ? 'bubble verdict-bubble' : 'bubble';
  const attachmentsHtml = formatAttachmentsHtml(b.attachments);
  const showText = b.text && b.text !== '(image attached)';
  el.innerHTML = `
    <div class="msg-row">
      <div class="msg-avatar" aria-hidden="true">${initial}</div>
      <div class="msg-body">
        ${label}
        <div class="${bubbleClass}">${showText ? '<p></p>' : ''}${attachmentsHtml || (!showText ? '<p></p>' : '')}${verdictExpand}</div>
      </div>
    </div>`;
  feed.appendChild(el);
  const p = el.querySelector('.bubble p');
  if (p && showText) {
    if (animate && !b.thinking && b.text.length < 600) {
      typewriterInto(p, b.text);
    } else {
      p.innerHTML = formatBodyHtml(b.text);
      scrollChatToBottom(feed);
    }
  } else if (!b.thinking) {
    scrollChatToBottom(feed);
  }
}

function typewriterInto(el, text, ms = 12) {
  const feed = $('chat-feed');
  const plain = String(text);
  let i = 0;
  el.textContent = '';
  const tick = () => {
    i += Math.max(1, Math.floor(plain.length / 80));
    el.innerHTML = formatBodyHtml(plain.slice(0, i));
    scrollChatToBottom(feed);
    if (i < plain.length) {
      setTimeout(tick, ms);
    }
  };
  tick();
}

function upsertBubble(feed, b) {
  const existing = [...feed.querySelectorAll('[data-msg-key]')].find((el) => el.dataset.msgKey === b.key);
  if (existing) {
    if (b.thinking || b.speaking) {
      const p = existing.querySelector('.bubble p');
      const label = existing.querySelector('.msg-label');
      if (p) p.innerHTML = formatBodyHtml(b.text);
      if (label) {
        label.innerHTML = `${escapeHtml(b.label)}${b.speaking ? ' · typing…' : ' · thinking…'}`;
      }
      existing.classList.toggle('speaking', Boolean(b.speaking));
      scrollChatToBottom(feed);
    }
    return;
  }
  const skipAnimate = b.thinking || b.speaking;
  appendBubble(feed, b, { animate: !skipAnimate && !b.thinking && b.kind !== 'system' && b.kind !== 'user' });
}

function addBubble(feed, { kind, label, text, thinking = false }) {
  appendBubble(feed, {
    key: `legacy:${Date.now()}:${Math.random()}`,
    kind,
    member: kind,
    label,
    text,
    thinking,
    continuation: false,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setStatus(text, ok = false) {
  const el = $('sync-status');
  if (!el) return;
  el.textContent = text;
  el.className = ok ? 'ok' : '';
}

function setFooterVersion(v) {
  const el = $('footer-version');
  if (el) {
    el.textContent = `chat v${v} · if stuck, open in Chrome/Edge: http://localhost:3939`;
  }
}

function hideUpdateBar() {
  const bar = $('update-bar');
  if (bar) bar.hidden = true;
}

function showUpdateBar(kind, message, { onAction } = {}) {
  const bar = $('update-bar');
  if (!bar) return;
  bar.hidden = false;
  bar.className = `update-bar ${kind}`;
  const actionLabel = kind === 'pending' ? 'Refresh' : 'Dismiss';
  bar.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" id="update-bar-action">${actionLabel}</button>`;
  const actionBtn = $('update-bar-action');
  if (actionBtn) {
    actionBtn.onclick = () => {
      if (onAction) onAction();
      else hideUpdateBar();
    };
  }
}

function hideChangelogModal() {
  const modal = $('changelog-modal');
  if (modal) modal.hidden = true;
}

function showChangelogModal(releases, version) {
  const modal = $('changelog-modal');
  const body = $('changelog-body');
  const title = $('changelog-title');
  if (!modal || !body) return;

  const kindLabel = { feature: 'New', fix: 'Fix', improvement: 'QoL' };
  const items = releases.flatMap((r) =>
    r.highlights.map(
      (h) => `
      <li class="changelog-item ${h.kind}">
        <span class="changelog-kind">${kindLabel[h.kind] || 'Update'}</span>
        <div class="changelog-text">
          <strong>${escapeHtml(h.title)}</strong>
          ${h.detail ? `<span>${escapeHtml(h.detail)}</span>` : ''}
        </div>
      </li>`
    )
  );

  if (title) {
    title.textContent =
      releases.length === 1
        ? `What's new — chat v${version}`
        : `What's new — chat v${version} (${releases.length} updates)`;
  }
  body.innerHTML = `<ul class="changelog-list">${items.join('')}</ul>`;
  modal.hidden = false;

  const close = () => {
    localStorage.setItem(LS_VERSION_KEY, String(version));
    localStorage.setItem(LS_CHANGELOG_KEY, String(version));
    hideChangelogModal();
  };
  $('changelog-dismiss')?.addEventListener('click', close, { once: true });
  modal.querySelector('.changelog-backdrop')?.addEventListener('click', close, { once: true });
}

async function maybeShowChangelog(version) {
  const lastSeen = parseInt(localStorage.getItem(LS_CHANGELOG_KEY) || localStorage.getItem(LS_VERSION_KEY) || '0', 10);
  if (version <= lastSeen) return;
  try {
    const data = await fetchJson(`/api/changelog?since=${lastSeen}`);
    if (data.releases?.length) showChangelogModal(data.releases, version);
  } catch {
    /* offline */
  }
}

async function checkUiVersion() {
  try {
    const data = await fetchJson('/api/version');
    const v = Number(data.version) || 1;
    setFooterVersion(v);

    const lastSeen = parseInt(localStorage.getItem(LS_VERSION_KEY) || '0', 10);

    if (loadedUiVersion === null) {
      loadedUiVersion = v;
      if (v > lastSeen) {
        await maybeShowChangelog(v);
        if ($('changelog-modal')?.hidden !== false) {
          showUpdateBar('success', `Panel updated — now on chat v${v}`);
          localStorage.setItem(LS_VERSION_KEY, String(v));
        }
      } else {
        localStorage.setItem(LS_VERSION_KEY, String(v));
      }
      return;
    }

    if (v > loadedUiVersion) {
      showUpdateBar('pending', `Chat v${v} is ready — refresh to load it`, {
        onAction: () => location.reload(),
      });
    }
  } catch {
    /* offline */
  }
}

async function loadState() {
  const data = await fetchJson('/api/state');
  state.memberModels = { ...DEFAULT_MODELS, ...(data.memberModels ?? {}) };
}

async function saveState() {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberModels: state.memberModels }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  if (data.ok) setStatus('Models saved', true);
  return data;
}

async function pickModel(member, model, btn) {
  if (typeof window.councilPickModel === 'function') {
    window.councilPickModel(member, model, btn);
    if (window.councilState?.memberModels) {
      state.memberModels = { ...DEFAULT_MODELS, ...window.councilState.memberModels };
    }
    return;
  }
  state.memberModels[member] = model;
  syncBenchActivePills();
  setStatus(`Saving ${member.toUpperCase()} → ${btn.textContent}…`, true);
  const res = await fetch('/api/model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member, model }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'save failed');
  state.memberModels = { ...DEFAULT_MODELS, ...data.memberModels };
  setStatus(`Saved — ${member.toUpperCase()} → ${data.pill || btn.textContent}`, true);
}

function renderBench() {
  const bench = $('bench');
  if (!bench) return;
  bench.innerHTML = '';
  for (const m of MEMBERS) {
    const card = document.createElement('div');
    card.className = 'seat';
    card.innerHTML = `<h3>${m.name}</h3><p class="role">${m.role}</p><div class="pills"></div>`;
    const pills = card.querySelector('.pills');
    for (const opt of MODELS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (state.memberModels[m.id] === opt.id ? ' active' : '');
      btn.textContent = opt.pill;
      btn.dataset.member = m.id;
      btn.dataset.model = opt.id;
      btn.onclick = () => pickModel(m.id, opt.id, btn);
      pills.appendChild(btn);
    }
    bench.appendChild(card);
  }
}

function syncBenchActivePills() {
  const bench = $('bench');
  if (!bench) return;
  bench.querySelectorAll('.pill[data-member]').forEach((btn) => {
    const member = btn.dataset.member;
    const model = btn.dataset.model;
    btn.classList.toggle('active', state.memberModels[member] === model);
  });
}

function onBenchClick(event) {
  const btn = event.target.closest('.pill[data-member][data-model]');
  if (!btn || btn.getAttribute('onclick')) return;
  const { member, model } = btn.dataset;
  if (!member || !model) return;
  pickModel(member, model, btn).catch(() => setStatus('Save failed — refresh page', false));
}

function bindBench() {
  const bench = $('bench');
  if (!bench || bench.dataset.bound) return;
  bench.dataset.bound = '1';
  if (!bench.querySelector('.pill[onclick]')) {
    bench.addEventListener('click', onBenchClick);
  }
}

function sessionSnapshot(session) {
  if (!session) return '';
  const msgs = (session.messages ?? []).map((m) => `${m.member}:${m.round}:${m.at}`).join('|');
  return `${session.id}|${session.status}|${msgs}|${session.decision ?? ''}`;
}

function liveSnapshot(live) {
  if (!live) return '';
  const parts = MEMBER_ORDER.map((id) => {
    const m = live.members?.[id] ?? {};
    return `${id}:${m.state}:${m.detail}:${m.draft || ''}`;
  });
  return `${live.sessionId}|${live.round}|${live.chair?.detail}|${parts.join('|')}`;
}

function memberHasRoundMessage(session, memberId, round) {
  return (session?.messages ?? []).some(
    (m) => String(m.member).toLowerCase() === memberId && m.round === round
  );
}

function renderLiveActivity(live, session) {
  const el = $('live-activity');
  if (!el) return;
  const active =
    live &&
    (live.chair?.state === 'running' ||
      MEMBER_ORDER.some((id) => ['waiting', 'thinking', 'speaking'].includes(live.members?.[id]?.state)));
  if (!active) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const chairLine = live.chair?.detail
    ? `<p class="live-chair"><strong>CHAIR</strong> ${escapeHtml(live.chair.detail)}</p>`
    : '';
  const chips = MEMBER_ORDER.map((id) => {
    const m = live.members?.[id] ?? { state: 'idle', detail: '' };
    const round = live.round || 1;
    const hasMsg = memberHasRoundMessage(session, id, round);
    let state = m.state;
    if (state === 'done' || (hasMsg && state !== 'thinking')) state = 'done';
    const thinking = state === 'thinking' || state === 'speaking';
    const dots = thinking
      ? '<span class="live-dots"><span></span><span></span><span></span></span>'
      : '';
    const detail =
      m.detail ||
      (state === 'waiting' ? 'Waiting…' : state === 'done' ? 'Spoke' : 'Thinking…');
    return `<div class="live-chip ${id} ${thinking ? 'thinking' : state}">
      <div class="live-chip-name">${MEMBER_LABELS[id]}</div>
      <div class="live-chip-detail">${dots}${escapeHtml(detail)}</div>
    </div>`;
  }).join('');
  el.innerHTML = `${chairLine}<div class="live-row">${chips}</div>`;
}

function updatePanelNotice(session) {
  const el = $('panel-trim-notice');
  if (!el) return;
  if (session?.panelHidden) {
    el.hidden = false;
    el.textContent = 'View cleared — full history kept for council memory. Ask a new topic below.';
    return;
  }
  if (session?.panelTruncated && !session?.liveActive) {
    el.hidden = false;
    el.textContent = `Showing last ${session.panelMaxVisible ?? 8} messages · tap Clear view for a fresh panel`;
    return;
  }
  el.hidden = true;
}

function renderSession(session, feed, live = null, queueOnly = false) {
  const sessionId = queueOnly ? 'queued' : session?.id || '';
  const panelHidden =
    panelViewForcedClear || window.__councilPanelCleared || session?.panelHidden;
  const pending = queueOnly ? { status: 'new', topic: pendingTopic } : { status: 'idle' };
  const { bubbles } = buildPanelDisplayBubbles(session, {
    pending,
    live,
    panelView: session?.panelView ?? {},
  });

  const viewCleared = panelHidden && !queueOnly;
  const displayBubbles = viewCleared ? bubbles.filter(isLivePanelBubble) : bubbles;

  if (viewCleared && !displayBubbles.length) {
    if (feed.querySelector('.msg')) {
      feed.innerHTML = '';
      feed.dataset.sessionId = 'cleared';
    }
    showWelcome(true);
    return;
  }

  const effectiveSessionId = viewCleared ? `live:${sessionId}` : sessionId;
  const needsReset = feed.dataset.sessionId !== effectiveSessionId;

  if (needsReset) {
    feed.innerHTML = '';
    feed.dataset.sessionId = effectiveSessionId;
  }

  if (!displayBubbles.length) {
    showWelcome(true);
    return;
  }

  for (const b of displayBubbles) {
    upsertBubble(feed, b);
  }

  if (session?.panelTruncated && !session?.liveActive && !viewCleared) {
    const keep = new Set(displayBubbles.map((x) => x.key));
    feed.querySelectorAll('[data-msg-key]').forEach((el) => {
      if (!keep.has(el.dataset.msgKey)) el.remove();
    });
  }

  feed.querySelectorAll('.msg.thinking[data-msg-key^="think:"]').forEach((el) => {
    const member = el.dataset.msgKey.split(':')[1];
    const round = Number(el.dataset.msgKey.match(/r(\d)/)?.[1] || 1);
    if (memberHasRoundMessage(session, member, round)) el.remove();
  });

  scrollChatToBottom(feed);
}

async function clearPanelView() {
  const session = await fetchJsonSafe('/api/session', {});
  const res = await fetch('/api/panel/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session?.id ?? null }),
  });
  if (!res.ok) {
    setStatus('Could not clear view', false);
    return;
  }
  panelViewForcedClear = true;
  window.__councilPanelCleared = true;
  if (typeof window.__councilFeedPollReset === 'function') window.__councilFeedPollReset();
  pendingTopic = null;
  const feed = $('chat-feed');
  if (feed) {
    feed.innerHTML = '';
    feed.dataset.sessionId = 'cleared';
    delete feed.dataset.booted;
  }
  const banner = document.querySelector('.queue-banner');
  if (banner) banner.remove();
  lastSessionSnapshot = '';
  lastLiveSnapshot = '';
  firstPollDone = false;
  updatePanelNotice({ panelHidden: true });
  showWelcome(true);
  setStatus('View cleared — history saved', true);
}

function isLiveNow(session, live) {
  if (!live) return session?.status === 'in_progress' || session?.status === 'prepared';
  if (live.chair?.state === 'running') return true;
  if (session?.status === 'in_progress' || session?.status === 'prepared') return true;
  return MEMBER_ORDER.some((id) => {
    const st = live.members?.[id]?.state;
    return ['waiting', 'thinking', 'speaking'].includes(st);
  });
}

async function pollSession() {
  if (window.__councilUseInlineFeedPoll) return;
  const feed = $('chat-feed');
  if (!feed || location.protocol === 'file:') return;
  try {
    const [session, pending, live] = await Promise.all([
      fetchJsonSafe('/api/session', { messages: [], decision: null, status: 'idle' }),
      fetchJsonSafe('/api/pending', { status: 'idle', topic: null }),
      fetchJsonSafe('/api/live', { chair: { state: 'idle' }, members: {} }),
    ]);

    pendingTopic = pending?.status === 'new' ? pending.topic : null;
    const queueOnly = pending?.status === 'new';

    const snap = sessionSnapshot(session);
    const liveSnap = liveSnapshot(live);
    const liveNow = isLiveNow(session, live);
    const changed =
      !firstPollDone || snap !== lastSessionSnapshot || liveSnap !== lastLiveSnapshot || pendingTopic;

    if (changed || liveNow) {
      firstPollDone = true;
      lastSessionSnapshot = snap;
      lastLiveSnapshot = liveSnap;
      lastSessionId = session?.id;
      if (session?.id && session.id !== session?.panelView?.clearedSessionId) {
        panelViewForcedClear = false;
        window.__councilPanelCleared = false;
      }
      if (queueOnly && feed.dataset.sessionId && feed.dataset.sessionId !== 'queued') {
        feed.innerHTML = '';
        panelViewForcedClear = false;
        window.__councilPanelCleared = false;
      }
      renderLiveActivity(live, session);
      updatePanelNotice(session);
      renderSession(session, feed, live, queueOnly);
      feed.dataset.booted = '1';
    }

    const hint = $('composer-hint');
    if (hint) {
      if (pending?.status === 'new') {
        hint.innerHTML = 'Topic queued — Chair should open with <code>go</code>. Confirm in Cursor if prompted.';
        setStatus('Queued — confirm go in Cursor', true);
      } else if (session?.status === 'complete') {
        hint.innerHTML = 'Verdict in. Ask another topic below.';
        pendingTopic = null;
        setStatus('Session complete', true);
      } else if (session?.status === 'in_progress' || live?.chair?.state === 'running') {
        hint.innerHTML = 'Council live — messages appear here as members speak.';
        setStatus('Council live', true);
      } else if (session?.messages?.length) {
        setStatus('Live', true);
      }
    }

    const fast =
      pending?.status === 'new' ||
      session?.status === 'in_progress' ||
      session?.status === 'prepared' ||
      live?.chair?.state === 'running' ||
      MEMBER_ORDER.some((id) => ['waiting', 'thinking', 'speaking'].includes(live?.members?.[id]?.state));
    schedulePoll(liveNow ? 200 : fast ? 400 : 3000);
  } catch (err) {
    console.error('pollSession', err);
    if (!feed.querySelector('.msg')) showWelcome();
    schedulePoll(3000);
  }
}

function schedulePoll(ms) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => pollSession().catch(() => schedulePoll(3000)), ms);
}

function tryWakeChairLink(autoWake) {
  const href = autoWake?.app || autoWake?.deeplink;
  if (!href) return;
  try {
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* server-side wake via cmd start is primary on Windows */
  }
}

async function fileToAttachment(file) {
  const mime = resolveImageMime(file);
  if (!mime) {
    throw new Error(`Unsupported: ${file.name} — use PNG, JPG, GIF, or WebP`);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} is too large (max 5MB)`);
  }
  const name = file.name || `paste-${Date.now()}.png`;
  return {
    name,
    mime,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function renderComposerAttachments() {
  const strip = $('composer-attachments');
  if (!strip) return;
  if (!composerAttachments.length) {
    strip.hidden = true;
    strip.innerHTML = '';
    return;
  }
  strip.hidden = false;
  strip.innerHTML = composerAttachments
    .map(
      (a, i) => `
    <div class="composer-attach-chip" data-idx="${i}">
      <img src="${escapeHtml(a.previewUrl)}" alt="" />
      <button type="button" class="composer-attach-remove" data-idx="${i}" title="Remove">×</button>
    </div>`
    )
    .join('');
  strip.querySelectorAll('.composer-attach-remove').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      const removed = composerAttachments[idx];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      composerAttachments.splice(idx, 1);
      renderComposerAttachments();
    };
  });
}

async function addFilesToComposer(files) {
  const list = [...files];
  if (!list.length) return;
  const room = MAX_ATTACHMENTS - composerAttachments.length;
  if (room <= 0) {
    setStatus(`Max ${MAX_ATTACHMENTS} images`, false);
    return;
  }
  const batch = list.slice(0, room);
  for (const file of batch) {
    try {
      const att = await fileToAttachment(file);
      att.previewUrl = URL.createObjectURL(file);
      composerAttachments.push(att);
    } catch (err) {
      setStatus(err.message || 'Could not add image', false);
    }
  }
  renderComposerAttachments();
  if (composerAttachments.length) {
    setStatus(`${composerAttachments.length} image${composerAttachments.length > 1 ? 's' : ''} ready — Send when done`, true);
  }
}

function clearComposerAttachments() {
  for (const a of composerAttachments) {
    if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
  }
  composerAttachments = [];
  renderComposerAttachments();
  const input = $('attach-input');
  if (input) input.value = '';
}

function bindComposerAttachments() {
  const btn = $('btn-attach');
  const input = $('attach-input');
  const topic = $('topic-input');
  const composer = document.querySelector('.composer');
  const pickFiles = () => input?.click();

  window.councilAttachClick = function (event) {
    if (event) event.preventDefault();
    pickFiles();
    return false;
  };

  if (btn && input) {
    if (!btn.getAttribute('onclick')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        pickFiles();
      });
    }
    input.addEventListener('change', () => {
      addFilesToComposer(input.files || []).catch(() => {});
      input.value = '';
    });
  }
  if (topic) {
    topic.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (!imageFiles.length) return;
      e.preventDefault();
      addFilesToComposer(imageFiles).catch(() => {});
    });
  }
  if (composer) {
    composer.addEventListener('dragover', (e) => {
      if ([...e.dataTransfer?.types || []].includes('Files')) {
        e.preventDefault();
        composer.classList.add('composer-drag');
      }
    });
    composer.addEventListener('dragleave', () => composer.classList.remove('composer-drag'));
    composer.addEventListener('drop', (e) => {
      e.preventDefault();
      composer.classList.remove('composer-drag');
      const files = [...(e.dataTransfer?.files || [])].filter((f) => resolveImageMime(f));
      if (files.length) addFilesToComposer(files).catch(() => {});
    });
  }
}

async function postConvene(topic) {
  const formData = new FormData();
  formData.append('topic', topic);
  for (const att of composerAttachments) {
    if (att.file) formData.append('images', att.file, att.name);
  }
  const res = await fetch('/api/convene', { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Could not send (${res.status})`);
  return data;
}

async function submitTopic(topic) {
  const t = topic.trim();
  if (!t && !composerAttachments.length) return;
  try {
    const data = await postConvene(t);
    pendingTopic = t || '(image attached)';
    const input = $('topic-input');
    if (input) input.value = '';
    clearComposerAttachments();
    if (data.autoWake?.ok) {
      setStatus('Opening Chair with go… confirm in Cursor if asked', true);
      tryWakeChairLink(data.autoWake);
    } else if (data.autoWake?.app) {
      setStatus('Queued — confirm go in Cursor', true);
      tryWakeChairLink(data.autoWake);
    } else {
      setStatus('Queued — confirm go in Cursor', true);
    }
    await pollSession();
  } catch (err) {
    setStatus(err.message || 'Could not queue topic', false);
  }
}

function showWelcome(force = false) {
  const feed = $('chat-feed');
  if (!feed) return;
  if (feed.querySelector('.msg')) {
    if (!force) setStatus('Queued — confirm go in Cursor', true);
    return;
  }
  feed.dataset.booted = '1';
  addBubble(feed, {
    kind: 'system',
    label: 'CHAIR',
    text: 'Type a topic below → Send — Chair opens with go (confirm in Cursor if prompted)',
  });
}

function init() {
  if (location.protocol === 'file:') {
    setStatus('Wrong URL — use http://localhost:3939');
    $('url-warning')?.removeAttribute('hidden');
    showWelcome();
    return;
  }

  setStatus('Live', true);
  bindBench();

  const bench = $('bench');
  if (bench && !bench.querySelector('.seat')) {
    renderBench();
  } else {
    syncBenchActivePills();
  }

  const feed = $('chat-feed');
  if (feed?.querySelector('.msg')) {
    feed.dataset.booted = '1';
    setStatus('Live', true);
    scrollChatToBottom(feed);
  }

  const btnClear = $('btn-clear-view');
  if (btnClear && !btnClear.getAttribute('onclick')) {
    btnClear.addEventListener('click', () => {
      clearPanelView().catch(() => setStatus('Clear failed — refresh page', false));
    });
  }

  const btnModels = $('btn-toggle-bench');
  const benchDrawer = $('bench-drawer');
  if (btnModels && benchDrawer && !btnModels.getAttribute('onclick')) {
    const syncBenchOpen = () => {
      const open = benchDrawer.open;
      btnModels.classList.toggle('active', open);
      btnModels.textContent = open ? 'Models ▲' : 'Models ▼';
      btnModels.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    syncBenchOpen();
    btnModels.addEventListener('click', (e) => {
      e.preventDefault();
      benchDrawer.open = !benchDrawer.open;
      syncBenchOpen();
    });
  }

  const form = $('convene-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const topic = $('topic-input')?.value?.trim() ?? '';
      if (!topic && !composerAttachments.length) return;
      setStatus('Sending…', true);
      postConvene(topic)
        .then((data) => {
          pendingTopic = topic || '(image attached)';
          if ($('topic-input')) $('topic-input').value = '';
          clearComposerAttachments();
          setStatus('Queued — confirm go in Cursor', true);
          if (data.autoWake) tryWakeChairLink(data.autoWake);
          location.reload();
        })
        .catch((err) => setStatus(err.message || 'Send failed — restart council:ui', false));
    });
  }

  bindComposerAttachments();

  loadState()
    .then(() => {
      if (window.councilState?.memberModels) {
        state.memberModels = { ...DEFAULT_MODELS, ...window.councilState.memberModels };
      }
      syncBenchActivePills();
      setStatus('Live — tap pills to save models', true);
    })
    .catch(() => setStatus('Live (models use defaults)', true));

  checkUiVersion().catch(() => {});
  setInterval(() => checkUiVersion().catch(() => {}), 5000);

  if (!window.__councilUseInlineFeedPoll) {
    pollSession().catch(() => {
      if (!$('chat-feed')?.querySelector('.msg')) showWelcome();
      schedulePoll(3000);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      init();
    } catch (err) {
      setStatus('JS error — hard refresh (Ctrl+Shift+R)');
      console.error(err);
    }
  });
} else {
  try {
    init();
  } catch (err) {
    setStatus('JS error — hard refresh (Ctrl+Shift+R)');
    console.error(err);
  }
}
