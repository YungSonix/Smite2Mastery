#!/usr/bin/env node
/**
 * Council chat panel — docs/council/ui/
 * Serves chat UI, syncs models, queues topics for Chair agent (pending-convene.json)
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildChairGoDeeplink, readPanelAutoWake, wakeChairInCursor } from './council-chair-wake.mjs';
import { buildPanelDisplayBubbles, formatAttachmentsHtml, isLivePanelBubble, renderBubbleHtml } from '../docs/council/ui/chat-format.mjs';
import { getChangelogSince, getChangelogForVersion } from '../docs/council/ui/changelog.mjs';
import {
  MAX_ATTACHMENTS,
  inferMimeFromName,
  saveAttachmentBatch,
  saveAttachmentBufferBatch,
  serializeAttachmentsForJson,
} from '../docs/council/ui/attachments.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_DIR = path.join(ROOT, 'docs', 'council', 'ui');
const COUNCIL_DIR = path.join(ROOT, 'docs', 'council');
const STATE_PATH = path.join(UI_DIR, 'state.json');
const PENDING_PATH = path.join(UI_DIR, 'pending-convene.json');
const LIVE_STATUS_PATH = path.join(UI_DIR, 'live-status.json');
const DRAFTS_DIR = path.join(UI_DIR, 'drafts');
const SESSION_PATH = path.join(COUNCIL_DIR, 'sessions', 'latest.json');
const PANEL_VIEW_PATH = path.join(UI_DIR, 'panel-view.json');
const MOD_LOG_PATH = path.join(UI_DIR, 'mod-log.json');
const CONFIG_PATH = path.join(COUNCIL_DIR, 'council.config.json');
const VERSION_PATH = path.join(UI_DIR, 'version.json');
const ATTACHMENTS_DIR = path.join(UI_DIR, 'attachments');
const PORT = Number(process.env.COUNCIL_UI_PORT || 3939);

function readUiVersion() {
  const data = readJson(VERSION_PATH, { version: 1, updatedAt: null });
  return {
    version: Number(data.version) || 1,
    updatedAt: data.updatedAt ?? null,
  };
}

function injectUiVersion(html) {
  const v = String(readUiVersion().version);
  return html.replace(/__UI_VERSION__/g, v);
}

const BENCH_MEMBERS = [
  { id: 'nala', name: 'NALA', role: 'Contrarian' },
  { id: 'london', name: 'LONDON', role: 'First principles' },
  { id: 'fasa', name: 'FASA', role: 'Expansionist' },
];

const BENCH_MODELS = [
  { id: 'auto', pill: 'Auto' },
  { id: 'claude-4.6-sonnet-medium-thinking', pill: 'Sonnet' },
  { id: 'claude-opus-4-8-thinking-high', pill: 'Opus' },
  { id: 'composer-2.5-fast', pill: 'Composer' },
  { id: 'gpt-5.3-codex', pill: 'Codex' },
  { id: 'gpt-5.5-medium', pill: 'GPT' },
];

const DEFAULT_MEMBER_MODELS = {
  nala: 'auto',
  london: 'claude-4.6-sonnet-medium-thinking',
  fasa: 'gpt-5.3-codex',
};

function renderBenchHtml() {
  const saved = readJson(STATE_PATH, {});
  const models = { ...DEFAULT_MEMBER_MODELS, ...(saved.memberModels ?? {}) };
  return BENCH_MEMBERS.map((m) => {
    const pills = BENCH_MODELS.map((opt) => {
      const active = models[m.id] === opt.id ? ' active' : '';
      return `<button type="button" class="pill${active}" data-member="${m.id}" data-model="${opt.id}" onclick="window.councilPickModel('${m.id}','${opt.id}',this)">${opt.pill}</button>`;
    }).join('');
    return `<div class="seat"><h3>${m.name}</h3><p class="role">${m.role}</p><div class="pills">${pills}</div></div>`;
  }).join('');
}

function saveMemberModel(member, model) {
  const allowedMembers = new Set(BENCH_MEMBERS.map((m) => m.id));
  const allowedModels = new Set(BENCH_MODELS.map((m) => m.id));
  if (!allowedMembers.has(member) || !allowedModels.has(model)) {
    return { ok: false, error: 'invalid member or model' };
  }
  const existing = readJson(STATE_PATH, {});
  const memberModels = {
    ...(existing.memberModels ?? DEFAULT_MEMBER_MODELS),
    [member]: model,
  };
  const state = { ...existing, memberModels };
  writeJson(STATE_PATH, state);
  const updated = syncModelsToConfig(memberModels);
  const pill = BENCH_MODELS.find((m) => m.id === model)?.pill ?? model;
  return { ok: true, updated, memberModels, member, model, pill };
}

function injectBench(html) {
  return html.replace('<!--BENCH_INJECT-->', renderBenchHtml());
}

function readJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try {
    const raw = fs.readFileSync(p, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`readJson: using fallback for ${path.basename(p)} (${err.message})`);
    return fallback;
  }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, p);
}

function readConfig() {
  return readJson(CONFIG_PATH, { members: [], availableModels: [] });
}

function writeConfig(config) {
  writeJson(CONFIG_PATH, config);
}

function syncModelsToConfig(models) {
  const config = readConfig();
  const allowed = new Set((config.availableModels ?? []).map((m) => m.id));
  const updated = [];
  for (const member of config.members) {
    const next = models[member.id];
    if (!next || !allowed.has(next)) continue;
    if (member.model !== next) {
      member.model = next;
      updated.push({ id: member.id, model: next });
    }
  }
  if (updated.length) writeConfig(config);
  return updated;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function readBodyBuffer(req, maxBytes = 48 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Minimal multipart/form-data parser (no extra deps). */
function parseMultipartForm(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^\s;]+))/i.exec(contentType || '');
  if (!match) throw new Error('multipart boundary missing');
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const fields = {};
  const files = [];

  let pos = buffer.indexOf(boundary);
  while (pos >= 0) {
    let next = buffer.indexOf(boundary, pos + boundary.length);
    if (next < 0) next = buffer.length;
    const part = buffer.subarray(pos + boundary.length, next);
    pos = next;

    if (part.length < 4) continue;
    let body = part;
    if (body[0] === 0x0d && body[1] === 0x0a) body = body.subarray(2);
    if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
      body = body.subarray(0, body.length - 2);
    }

    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd < 0) continue;

    const headerBlock = body.subarray(0, headerEnd).toString('utf8');
    const content = body.subarray(headerEnd + 4);

    const disposition = /Content-Disposition:[^\r\n]*/i.exec(headerBlock)?.[0] || '';
    const nameMatch = /name="([^"]+)"/i.exec(disposition);
    const fileMatch = /filename="([^"]*)"/i.exec(disposition);
    const fieldName = nameMatch?.[1];
    if (!fieldName) continue;

    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerBlock);
    const mime = typeMatch?.[1]?.trim() || '';

    if (fileMatch && fileMatch[1]) {
      const filename = fileMatch[1];
      files.push({
        name: fieldName,
        filename,
        mime: mime || inferMimeFromName(filename) || 'image/png',
        buffer: content,
      });
    } else {
      fields[fieldName] = content.toString('utf8');
    }
  }

  return { fields, files };
}

async function parseConveneRequest(req) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    const buffer = await readBodyBuffer(req);
    const { fields, files } = parseMultipartForm(buffer, ct);
    const images = files.filter((f) => f.name === 'images' || f.name === 'image');
    return {
      topic: String(fields.topic || '').trim(),
      fileBuffers: images.map((f) => ({
        name: f.filename || 'image.png',
        mime: f.mime,
        buffer: f.buffer,
      })),
    };
  }

  const body = await readBody(req);
  const attachments = body.attachments ?? [];
  return { topic: String(body.topic || '').trim(), attachments };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function queuePendingTopic(topic, incomingAttachments = [], { fileBuffers = null } = {}) {
  const t = String(topic || '').trim();
  const hasBase64 = Array.isArray(incomingAttachments) && incomingAttachments.length > 0;
  const hasBuffers = Array.isArray(fileBuffers) && fileBuffers.length > 0;
  const imageCount = hasBuffers ? fileBuffers.length : hasBase64 ? incomingAttachments.length : 0;
  if (!t && !imageCount) return { ok: false, error: 'type a message or attach at least one image' };
  if (imageCount > MAX_ATTACHMENTS) {
    return { ok: false, error: `At most ${MAX_ATTACHMENTS} images per message` };
  }

  let attachmentBatchId = null;
  let attachments = [];
  if (imageCount) {
    try {
      const saved = hasBuffers
        ? saveAttachmentBufferBatch(ATTACHMENTS_DIR, fileBuffers)
        : saveAttachmentBatch(ATTACHMENTS_DIR, incomingAttachments);
      attachmentBatchId = saved.batchId;
      attachments = serializeAttachmentsForJson(
        saved.attachments.map((a) => ({ ...a, batchId: saved.batchId })),
        ROOT
      );
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  }

  const pending = {
    status: 'new',
    topic: t,
    attachments,
    attachmentBatchId,
    requestedAt: new Date().toISOString(),
    memberModels: readJson(STATE_PATH, {}).memberModels ?? DEFAULT_MEMBER_MODELS,
  };
  writeJson(PENDING_PATH, pending);
  const result = { ok: true, pending };
  if (readPanelAutoWake()) {
    try {
      result.autoWake = { ...wakeChairInCursor(), ...buildChairGoDeeplink() };
    } catch (err) {
      result.autoWake = { ok: false, error: String(err), ...buildChairGoDeeplink() };
    }
  }
  return result;
}

function renderQueueFeedHtml() {
  const pending = readJson(PENDING_PATH, { status: 'idle' });
  if (pending.status !== 'new' || (!pending.topic && !pending.attachments?.length)) return '';
  const topicHtml = pending.topic ? `<p>${escapeHtml(pending.topic)}</p>` : '';
  const attachmentsHtml = formatAttachmentsHtml(pending.attachments ?? []);
  return `
    <div class="msg user">
      <div class="msg-label">YOU</div>
      <div class="bubble">${topicHtml}${attachmentsHtml}</div>
    </div>
    <div class="msg system">
      <div class="msg-label">CHAIR</div>
      <div class="bubble"><p>Queued. Opening Chair with <strong>go</strong> — confirm in Cursor if prompted.</p></div>
    </div>`;
}

function panelMemberClass(id) {
  const m = String(id).toLowerCase();
  if (m === 'nala') return 'nala';
  if (m === 'london') return 'london';
  if (m === 'fasa') return 'fasa';
  return 'system';
}

function readPanelView() {
  return readJson(PANEL_VIEW_PATH, {
    clearedSessionId: null,
    maxVisibleBubbles: 200,
    clearedAt: null,
  });
}

function writePanelView(data) {
  writeJson(PANEL_VIEW_PATH, data);
}

function clearPanelView(sessionId) {
  const session = readJson(SESSION_PATH, {});
  const id = sessionId || session.id || null;
  const view = {
    clearedSessionId: id,
    maxVisibleBubbles: readPanelView().maxVisibleBubbles ?? 8,
    clearedAt: new Date().toISOString(),
  };
  writePanelView(view);
  return { ok: true, ...view };
}

function readLiveWithDrafts() {
  const live = readJson(LIVE_STATUS_PATH, { chair: { state: 'idle' }, members: {} });
  const session = readJson(SESSION_PATH, { messages: [] });
  if (!fs.existsSync(DRAFTS_DIR)) return live;
  for (const file of fs.readdirSync(DRAFTS_DIR)) {
    const m = file.match(/^(nala|london|fasa)-r(\d)\.txt$/);
    if (!m) continue;
    const id = m[1];
    const round = Number(m[2]);
    if (memberHasRoundMessage(session, id, round)) continue;
    const text = fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf8').trim();
    if (!text) continue;
    if (!live.members) live.members = {};
    const mem = live.members[id] ?? {};
    if (mem.state === 'done') continue;
    live.members[id] = {
      ...mem,
      state: 'speaking',
      detail: 'Typing…',
      draft: text,
      at: new Date().toISOString(),
    };
  }
  return live;
}

function panelDisplayContext() {
  const session = readJson(SESSION_PATH, { messages: [], decision: null, topic: '', status: 'idle' });
  const pending = readJson(PENDING_PATH, { status: 'idle' });
  const live = readLiveWithDrafts();
  const panelView = readPanelView();
  const modLog = readJson(MOD_LOG_PATH, { entries: [] });
  const display = buildPanelDisplayBubbles(session, { pending, live, panelView, modLog });
  return { session, pending, live, panelView, modLog, display };
}

function renderSessionFeedHtml() {
  const { display } = panelDisplayContext();
  if (!display.bubbles.length) return '';
  const bubbles = display.panelHidden
    ? display.bubbles.filter(isLivePanelBubble)
    : display.bubbles;
  if (!bubbles.length) return '';
  return bubbles.map(renderBubbleHtml).join('');
}

const LIVE_MEMBER_ORDER = ['nala', 'london', 'fasa'];
const LIVE_MEMBER_LABELS = { nala: 'NALA', london: 'LONDON', fasa: 'FASA' };

function memberHasRoundMessage(session, memberId, round) {
  return (session?.messages ?? []).some(
    (m) => String(m.member).toLowerCase() === memberId && m.round === round
  );
}

function renderLiveActivityHtml(live, session) {
  const active =
    live &&
    (live.chair?.state === 'running' ||
      LIVE_MEMBER_ORDER.some((id) =>
        ['waiting', 'thinking', 'speaking'].includes(live.members?.[id]?.state)
      ));
  if (!active) return { html: '', active: false };

  const chairLine = live.chair?.detail
    ? `<p class="live-chair"><strong>CHAIR</strong> ${escapeHtml(live.chair.detail)}</p>`
    : '';
  const round = Number(live.round) > 0 ? Number(live.round) : 1;
  const chips = LIVE_MEMBER_ORDER.map((id) => {
    const m = live.members?.[id] ?? { state: 'idle', detail: '' };
    const hasMsg = memberHasRoundMessage(session, id, round);
    let state = m.state;
    if (state === 'done' || (hasMsg && !m.draft)) state = 'done';
    const thinking = state === 'thinking' || state === 'speaking';
    const dots = thinking
      ? '<span class="live-dots"><span></span><span></span><span></span></span>'
      : '';
    const detail =
      m.detail ||
      (state === 'waiting' ? 'Waiting…' : state === 'done' ? 'Spoke' : 'Thinking…');
    return `<div class="live-chip ${id} ${thinking ? 'thinking' : state}">
      <div class="live-chip-name">${LIVE_MEMBER_LABELS[id]}</div>
      <div class="live-chip-detail">${dots}${escapeHtml(detail)}</div>
    </div>`;
  }).join('');

  return {
    html: `${chairLine}<div class="live-row">${chips}</div>`,
    active: true,
  };
}

function panelFeedHash(session, pending, live, panelView) {
  const msgs = (session.messages ?? []).map(
    (m) => `${m.member}:${m.round}:${m.at}:${String(m.text ?? '').length}`
  );
  const payload = {
    sid: session.id ?? '',
    status: session.status ?? '',
    decisionLen: String(session.decision ?? '').length,
    msgs,
    pending: pending.status === 'new' ? pending.topic : '',
    attachCount:
      pending.status === 'new'
        ? (pending.attachments ?? []).length
        : (session.attachments ?? []).length,
    phase: live.phase?.id ?? '',
    cleared: panelView.clearedSessionId ?? '',
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

function typingFeedHash(typing) {
  return createHash('sha256')
    .update(JSON.stringify(typing.map((t) => `${t.key}:${t.text}:${t.speaking}`)))
    .digest('hex')
    .slice(0, 16);
}

function buildTypingState(session, live) {
  const currentRound =
    Number(live?.round) > 0 ? Number(live.round) : session?.messages?.some((m) => m.round === 2) ? 2 : 1;
  const out = [];
  for (const id of LIVE_MEMBER_ORDER) {
    const m = live.members?.[id] ?? {};
    const st = m.state;
    const draft = String(m.draft || '').trim();
    if (!['thinking', 'speaking', 'waiting'].includes(st) && !draft) continue;
    const hasMsg = memberHasRoundMessage(session, id, currentRound);
    if (hasMsg && !draft) continue;
    if (hasMsg && draft) continue; /* committed — ignore stale draft during finalize */
    if (st === 'thinking' && hasMsg) continue;
    let text = draft;
    if (!text) {
      if (st === 'waiting') text = m.detail || 'Waiting…';
      else if (st === 'speaking') text = m.detail || 'Typing…';
      else text = m.detail || 'Thinking…';
    }
    out.push({
      key: `think:${id}:r${currentRound}`,
      member: id,
      label: LIVE_MEMBER_LABELS[id],
      text,
      speaking: st === 'speaking' || Boolean(draft),
    });
  }
  return out;
}

function buildPanelFeedPayload() {
  const { session, pending, live, panelView, display } = panelDisplayContext();
  const config = readJson(CONFIG_PATH, {});
  const pollMsLive = Math.max(30, Number(config.pollMsLive) || 50);
  const typeMsPerChar = Math.max(8, Number(config.typeMsPerChar) || 14);
  const typing = buildTypingState(session, live);
  const typingActive = typing.some((t) => t.speaking && t.text && t.text !== 'Thinking…');
  const feedHtml = renderSessionFeedHtml();
  const { html: liveHtml, active: liveBarActive } = renderLiveActivityHtml(live, session);
  const liveActive = display.liveActive || liveBarActive;

  let panelNotice = '';
  if (display.panelHidden) {
    panelNotice = 'View cleared — full history kept for council memory. Ask a new topic below.';
  } else if (display.truncated && !liveActive) {
    panelNotice = `Showing last ${display.maxVisible} messages · full history kept on backend`;
  }

  let composerHint = 'Type topic → Enter. Then in pinned <strong>Chair</strong> chat send: <code>go</code>';
  let statusLine = 'Live';
  let statusOk = true;
  if (pending.status === 'new') {
    composerHint = 'Topic queued — send <code>go</code> in Chair. Replies appear here live.';
    statusLine = 'Queued — send go in Chair';
  } else if (session.status === 'complete' && !liveActive) {
    composerHint = 'Verdict in. Ask another topic below.';
    statusLine = 'Session complete';
  } else if (session.status === 'in_progress' || live.chair?.state === 'running' || liveActive) {
    composerHint = 'Council live — messages update automatically.';
    statusLine = liveActive ? 'Council live' : 'Live';
  }

  return {
    contentHash: panelFeedHash(session, pending, live, panelView),
    hash: panelFeedHash(session, pending, live, panelView),
    typingHash: typingFeedHash(typing),
    typing,
    feedHtml,
    liveHtml,
    liveActive,
    pollMs: typingActive ? Math.min(pollMsLive, 50) : liveActive ? pollMsLive : 250,
    typeMsPerChar,
    sessionId: session.id ?? null,
    panelNotice: panelNotice || null,
    composerHint,
    statusLine,
    statusOk,
  };
}

function readPanelSession() {
  const { session, display, panelView } = panelDisplayContext();
  const fullMessages = session.messages ?? [];

  return {
    id: session.id ?? null,
    topic: session.topic ?? '',
    status: session.status ?? 'idle',
    messages: fullMessages,
    decision: session.decision ?? null,
    completedAt: session.completedAt ?? null,
    messageCount: fullMessages.length,
    panelHidden: display.panelHidden,
    panelTruncated: display.truncated,
    panelHiddenBubbleCount: display.hiddenCount,
    panelMaxVisible: display.maxVisible,
    panelView: {
      clearedSessionId: panelView.clearedSessionId,
      maxVisibleBubbles: panelView.maxVisibleBubbles,
    },
    liveActive: display.liveActive,
  };
}

function injectPanelNotice(html) {
  const { display } = panelDisplayContext();
  let notice = '';
  if (display.panelHidden) {
    notice = 'View cleared — full history kept for council memory. Ask a new topic below.';
  } else if (display.truncated && !display.liveActive) {
    notice = `Showing last ${display.maxVisible} messages · full history kept on backend`;
  }
  const hidden = notice ? '' : ' hidden';
  const text = notice ? escapeHtml(notice) : '';
  return html.replace(
    '<p id="panel-trim-notice" class="panel-trim-notice" hidden role="status"></p>',
    `<p id="panel-trim-notice" class="panel-trim-notice"${hidden} role="status">${text}</p>`
  );
}

function injectChatFeed(html) {
  const pending = readJson(PENDING_PATH, { status: 'idle' });
  const feed = renderSessionFeedHtml() || renderQueueFeedHtml();
  const banner =
    pending.status === 'new' && (pending.topic || pending.attachments?.length)
      ? `<div class="queue-banner">Topic queued — send <code>go</code> in pinned Chair chat</div>`
      : '';
  return injectPanelNotice(
    html.replace('<!--QUEUE_BANNER-->', banner).replace('<!--QUEUE_FEED_INJECT-->', feed)
  );
}

function bundlePanelAppJs() {
  const chatPath = path.join(UI_DIR, 'chat-format.mjs');
  const appPath = path.join(UI_DIR, 'app.js');
  let chat = fs.readFileSync(chatPath, 'utf8');
  let app = fs.readFileSync(appPath, 'utf8');
  chat = chat.replace(/^export /gm, '');
  app = app.replace(/^import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/chat-format\.mjs['"];\s*\n/m, '');
  const v = readUiVersion().version;
  return `/* Council panel bundle — chat v${v} (no ES modules — Cursor Simple Browser safe) */\n${chat}\n${app}\n`;
}

function mime(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.gif')) return 'image/gif';
  if (file.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function safeJson(res, code, data) {
  if (res.writableEnded || res.headersSent) return false;
  try {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
    return true;
  } catch (err) {
    if (!res.writableEnded && !res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal error');
    }
    console.error('Council panel JSON response failed:', err);
    return false;
  }
}

function safeText(res, code, body, contentType = 'text/plain; charset=utf-8') {
  if (res.writableEnded || res.headersSent) return false;
  res.writeHead(code, { 'Content-Type': contentType });
  res.end(body);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const json = (code, data) => safeJson(res, code, data);

  try {
    if (url.pathname === '/api/state' && req.method === 'GET') {
      return json(200, readJson(STATE_PATH, {}));
    }

    if (url.pathname === '/api/state' && req.method === 'POST') {
      const incoming = await readBody(req);
      const existing = readJson(STATE_PATH, {});
      const state = {
        ...existing,
        ...incoming,
        memberModels: {
          ...(existing.memberModels ?? DEFAULT_MEMBER_MODELS),
          ...(incoming.memberModels ?? {}),
        },
      };
      writeJson(STATE_PATH, state);
      const updated = state.memberModels ? syncModelsToConfig(state.memberModels) : [];
      return json(200, { ok: true, updated, memberModels: state.memberModels });
    }

    if (url.pathname === '/api/model' && req.method === 'POST') {
      const { member, model } = await readBody(req);
      const result = saveMemberModel(String(member || ''), String(model || ''));
      if (!result.ok) return json(400, result);
      return json(200, result);
    }

    if (url.pathname === '/api/model' && req.method === 'GET') {
      const member = url.searchParams.get('member') || '';
      const model = url.searchParams.get('model') || '';
      const result = saveMemberModel(member, model);
      if (!result.ok) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(result.error || 'bad request');
        return;
      }
      res.writeHead(302, { Location: '/' });
      res.end();
      return;
    }

    if (url.pathname === '/api/panel/view' && req.method === 'GET') {
      return json(200, readPanelView());
    }

    if (url.pathname === '/api/panel/clear' && req.method === 'POST') {
      const body = await readBody(req);
      return json(200, clearPanelView(body.sessionId));
    }

    if (url.pathname === '/api/session' && req.method === 'GET') {
      return json(200, readPanelSession());
    }

    if (url.pathname === '/api/pending' && req.method === 'GET') {
      return json(200, readJson(PENDING_PATH, { status: 'idle', topic: null }));
    }

    if (url.pathname === '/api/live' && req.method === 'GET') {
      return json(200, readLiveWithDrafts());
    }

    if (url.pathname === '/api/mod-log' && req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      const log = readJson(MOD_LOG_PATH, { entries: [] });
      let entries = log.entries ?? [];
      if (sessionId) entries = entries.filter((e) => e.sessionId === sessionId);
      return json(200, { entries: entries.slice(-50) });
    }

    if (url.pathname === '/api/panel/feed' && req.method === 'GET') {
      let payload;
      try {
        payload = buildPanelFeedPayload();
      } catch (err) {
        console.error('buildPanelFeedPayload failed:', err);
        return json(500, { ok: false, error: String(err), feedHtml: '', typing: [] });
      }
      return json(200, payload);
    }

    if (url.pathname === '/api/convene' && req.method === 'POST') {
      const parsed = await parseConveneRequest(req);
      const result = queuePendingTopic(parsed.topic, parsed.attachments, {
        fileBuffers: parsed.fileBuffers,
      });
      if (!result.ok) return json(400, result);
      return json(200, result);
    }

    if (url.pathname === '/convene' && req.method === 'POST') {
      const raw = await readRawBody(req);
      const ct = req.headers['content-type'] || '';
      let topic = '';
      let attachments = [];
      if (ct.includes('application/json')) {
        try {
          const parsed = JSON.parse(raw || '{}');
          topic = parsed.topic;
          attachments = parsed.attachments ?? [];
        } catch {
          topic = '';
        }
      } else {
        topic = new URLSearchParams(raw).get('topic') || '';
      }
      const result = queuePendingTopic(topic, attachments);
      if (!result.ok) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(result.error || 'topic required');
        return;
      }
      res.writeHead(302, { Location: '/?queued=1' });
      res.end();
      return;
    }

    if (url.pathname === '/api/pending/complete' && req.method === 'POST') {
      const pending = readJson(PENDING_PATH, {});
      pending.status = 'done';
      pending.completedAt = new Date().toISOString();
      writeJson(PENDING_PATH, pending);
      return json(200, { ok: true });
    }

    if (url.pathname === '/api/version' && req.method === 'GET') {
      const meta = readUiVersion();
      return json(200, {
        ...meta,
        changelog: getChangelogForVersion(meta.version),
      });
    }

    if (url.pathname === '/api/changelog' && req.method === 'GET') {
      const since = Number(url.searchParams.get('since') || 0);
      const releases = getChangelogSince(since);
      return json(200, { releases, since });
    }

    if (url.pathname.startsWith('/attachments/')) {
      const rel = decodeURIComponent(url.pathname.slice('/attachments/'.length));
      const filePath = path.join(ATTACHMENTS_DIR, rel);
      if (!filePath.startsWith(ATTACHMENTS_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        safeText(res, 404, 'Not found');
        return;
      }
      const headers = { 'Content-Type': mime(filePath), 'Cache-Control': 'private, max-age=86400' };
      if (!res.headersSent) {
        res.writeHead(200, headers);
        res.end(fs.readFileSync(filePath));
      }
      return;
    }

    let rel = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = path.join(UI_DIR, rel);
    if (!filePath.startsWith(UI_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      safeText(res, 404, 'Not found');
      return;
    }
    let body = fs.readFileSync(filePath);
    if (rel === '/app.js' || filePath.endsWith(`${path.sep}app.js`)) {
      body = Buffer.from(bundlePanelAppJs(), 'utf8');
    } else if (filePath.endsWith('.html')) {
      try {
        body = Buffer.from(
          injectChatFeed(injectBench(injectUiVersion(body.toString('utf8')))),
          'utf8'
        );
      } catch (err) {
        console.error('injectChatFeed failed:', err);
        body = Buffer.from(injectUiVersion(body.toString('utf8')), 'utf8');
      }
    }
    const headers = { 'Content-Type': mime(filePath) };
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.css')) {
      headers['Cache-Control'] = 'no-cache';
    }
    if (!res.headersSent) {
      res.writeHead(200, headers);
      res.end(body);
    }
  } catch (e) {
    console.error('Council panel request error:', e);
    if (!res.headersSent) {
      json(500, { ok: false, error: String(e) });
    }
  }
});

server.listen(PORT, () => {
  const { version } = readUiVersion();
  console.log(`Council chat panel: http://localhost:${PORT} (chat v${version})`);
  console.log(`Folder: ${UI_DIR}`);
  console.log('Type a topic in the panel → send "go" in pinned Chair chat.\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Council panel already running: http://localhost:${PORT}`);
    console.log('Open that URL in your browser — no need to start again.');
    console.log('To restart: stop the other process, or run:');
    console.log(`  npx kill-port ${PORT}`);
    process.exit(0);
  }
  throw err;
});
