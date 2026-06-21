#!/usr/bin/env node
/**
 * AI Council — prepare sessions, RAG context, config updates.
 * LLM calls happen in Cursor via Task subagents (see .cursor/rules/council.mdc).
 * No external API keys required when used inside Cursor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  exportSessionMarkdown,
  readVaultSessionSnippets,
  syncCouncilToVault,
} from './council-vault-sync.mjs';
import { applyWriteWithVault, appendOpenBug, appendPendingTask, applyVerdictTaskExtraction } from './council-repo-writes.mjs';
import { canvasDataPath } from './council-paths.mjs';
import { resolveAttachmentAbsPath } from '../docs/council/ui/attachments.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COUNCIL_DIR = path.join(ROOT, 'docs', 'council');
const CONFIG_PATH = path.join(COUNCIL_DIR, 'council.config.json');
const SESSIONS_DIR = path.join(COUNCIL_DIR, 'sessions');
const LATEST_PATH = path.join(SESSIONS_DIR, 'latest.json');
const CANVAS_DATA_PATH = canvasDataPath(ROOT);
const PANEL_STATE_PATH = path.join(COUNCIL_DIR, 'ui', 'state.json');
const LIVE_STATUS_PATH = path.join(COUNCIL_DIR, 'ui', 'live-status.json');
const DRAFTS_DIR = path.join(COUNCIL_DIR, 'ui', 'drafts');

function panelTiming(config = readConfig()) {
  return {
    streamMs: Math.max(25, Number(config.streamMsPerWord) || 55),
    pauseAfterMember: Math.max(0, Number(config.pauseMsBetweenPosts) ?? 2200),
    pauseBeforeRound2: Math.max(0, Number(config.pauseBeforeRound2Ms) ?? 4500),
    pollMsLive: Math.max(30, Number(config.pollMsLive) || 40),
    typeMsPerChar: Math.max(8, Number(config.typeMsPerChar) || 12),
    demoReadPauseMs: Math.max(0, Number(config.demoReadPauseMs) ?? 3500),
    demoParallelTypingMs: Math.max(0, Number(config.demoParallelTypingMs) ?? 2000),
  };
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

/** Pull memberModels from panel state (preferred) or canvas sidecar → council.config.json */
function syncModelsToConfig(models) {
  if (!models || typeof models !== 'object') {
    return { ok: false, reason: 'no memberModels' };
  }
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
  return { ok: true, updated };
}

function readPanelModels() {
  if (!fs.existsSync(PANEL_STATE_PATH)) return null;
  const data = JSON.parse(fs.readFileSync(PANEL_STATE_PATH, 'utf8'));
  return data.memberModels ?? null;
}

function syncCanvasToConfig() {
  const panel = readPanelModels();
  if (panel) return { ...syncModelsToConfig(panel), source: 'docs/council/ui/state.json' };

  if (!fs.existsSync(CANVAS_DATA_PATH)) {
    return { ok: false, reason: 'no panel or canvas state', path: PANEL_STATE_PATH };
  }
  const data = JSON.parse(fs.readFileSync(CANVAS_DATA_PATH, 'utf8'));
  const models = data.memberModelsV2 ?? data.memberModels;
  if (!models || typeof models !== 'object') {
    return { ok: false, reason: 'no memberModels in canvas data' };
  }
  return { ...syncModelsToConfig(models), source: CANVAS_DATA_PATH };
}

function cmdSyncPanel() {
  const result = syncCanvasToConfig();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

function cmdSyncCanvas() {
  cmdSyncPanel();
}

const MEMBER_IDS = ['nala', 'london', 'fasa'];

function defaultLiveStatus() {
  return {
    sessionId: null,
    round: 1,
    chair: { state: 'idle', detail: '' },
    members: Object.fromEntries(MEMBER_IDS.map((id) => [id, { state: 'idle', detail: '' }])),
    updatedAt: null,
  };
}

function readLiveStatus() {
  if (!fs.existsSync(LIVE_STATUS_PATH)) return defaultLiveStatus();
  return { ...defaultLiveStatus(), ...JSON.parse(fs.readFileSync(LIVE_STATUS_PATH, 'utf8')) };
}

function writeLiveStatus(data) {
  fs.mkdirSync(path.dirname(LIVE_STATUS_PATH), { recursive: true });
  fs.writeFileSync(
    LIVE_STATUS_PATH,
    JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2) + '\n',
    'utf8'
  );
}

function councilRound(live, session) {
  const r = Number(live?.round);
  if (r > 0) return r;
  return session?.messages?.some((m) => m.round === 2) ? 2 : 1;
}

function resetLiveStatus(sessionId, round = 1, chairDetail = '') {
  const phaseLabel =
    round === 2 ? 'Round 2 — reading each other…' : round === 1 ? 'Round 1 — opening takes' : `Round ${round}`;
  writeLiveStatus({
    sessionId,
    round,
    phase: { id: `round-${round}`, label: phaseLabel },
    chair: { state: 'running', detail: chairDetail || `Round ${round} — convening council…` },
    members: Object.fromEntries(
      MEMBER_IDS.map((id) => [
        id,
        {
          state: round === 1 ? 'thinking' : 'thinking',
          detail: round === 2 ? 'Reading peers…' : 'Thinking…',
          at: new Date().toISOString(),
        },
      ])
    ),
  });
}

function setLiveMember(memberId, state, detail = '', draft = null) {
  const live = readLiveStatus();
  if (!live.members) live.members = {};
  const entry = {
    ...(live.members[memberId] ?? {}),
    state,
    detail,
    at: new Date().toISOString(),
  };
  if (draft != null && String(draft).length) {
    entry.draft = String(draft);
  } else {
    delete entry.draft;
  }
  live.members[memberId] = entry;
  if (Number(live.round) < 1) live.round = 1;
  writeLiveStatus(live);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function memberSpokeRound(memberId, round, sessionId = null) {
  const sessionPath = sessionId
    ? path.join(SESSIONS_DIR, `${sessionId}.json`)
    : LATEST_PATH;
  const loadPath = sessionId && fs.existsSync(sessionPath) ? sessionPath : LATEST_PATH;
  if (!fs.existsSync(loadPath)) return false;
  const session = JSON.parse(fs.readFileSync(loadPath, 'utf8'));
  return (session.messages ?? []).some(
    (m) => String(m.member).toLowerCase() === memberId && m.round === round
  );
}

function setPeerStates(activeMemberId, round, sessionId) {
  for (const id of MEMBER_IDS) {
    if (id === activeMemberId) continue;
    if (memberSpokeRound(id, round, sessionId)) {
      setLiveMember(id, 'done', `Spoke · Round ${round}`);
    } else {
      setLiveMember(id, 'waiting', 'Waiting…');
    }
  }
}

async function streamDraftChars(memberId, round, text) {
  clearDraftFile(memberId, round);
  const { typeMsPerChar, pollMsLive } = panelTiming();
  setLiveMember(memberId, 'speaking', 'Typing…', '');
  await sleep(50);
  for (let i = 1; i <= text.length; i++) {
    const partial = text.slice(0, i);
    fs.writeFileSync(draftFilePath(memberId, round), partial, 'utf8');
    setLiveMember(memberId, 'speaking', 'Typing…', partial);
    const remaining = text.length - i;
    const delay = remaining > 40 ? Math.max(10, typeMsPerChar - 10) : typeMsPerChar;
    await sleep(delay);
  }
  fs.writeFileSync(draftFilePath(memberId, round), text, 'utf8');
  setLiveMember(memberId, 'speaking', 'Typing…', text);
  await sleep(Math.max(280, pollMsLive * 4));
}

async function finalizeDraftMessage(sessionId, memberId, round, text) {
  clearDraftFile(memberId, round);
  setLiveMember(memberId, 'waiting', 'Waiting…');
  appendMessageToSession(sessionId, memberId, round, text);
  setLiveMember(memberId, 'done', `Spoke · Round ${round}`);
}

async function demoAllTypingTogether(round, holdMs) {
  for (const id of MEMBER_IDS) {
    setLiveMember(id, 'speaking', 'Typing…', '…');
  }
  await sleep(holdMs);
  for (const id of MEMBER_IDS) {
    clearDraftFile(id, round);
    setLiveMember(id, 'waiting', 'Waiting…');
  }
}

async function demoMemberReply(sessionId, memberId, round, text, readPauseMs) {
  setPeerStates(memberId, round, sessionId);
  setLiveMember(memberId, 'thinking', 'Thinking…');
  await sleep(1400);
  await streamDraftChars(memberId, round, text);
  await finalizeDraftMessage(sessionId, memberId, round, text);
  if (readPauseMs > 0) await sleep(readPauseMs);
}

function setupDemoPanel(session) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const sessionPath = path.join(SESSIONS_DIR, `${session.id}.json`);
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2) + '\n', 'utf8');
  fs.writeFileSync(LATEST_PATH, JSON.stringify(session, null, 2) + '\n', 'utf8');
  fs.writeFileSync(
    path.join(COUNCIL_DIR, 'ui', 'panel-view.json'),
    JSON.stringify({ clearedSessionId: null, maxVisibleBubbles: 200, clearedAt: null }, null, 2) + '\n',
    'utf8'
  );
  const pendingPath = path.join(COUNCIL_DIR, 'ui', 'pending-convene.json');
  if (fs.existsSync(pendingPath)) {
    const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
    pending.status = 'done';
    pending.completedAt = new Date().toISOString();
    fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2) + '\n', 'utf8');
  }
  clearAllDraftFiles();
}

function appendMessageToSession(sessionId, memberId, round, text) {
  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  const loadPath = fs.existsSync(sessionPath) ? sessionPath : LATEST_PATH;
  const session = JSON.parse(fs.readFileSync(loadPath, 'utf8'));
  session.messages.push({
    member: memberId,
    round,
    at: new Date().toISOString(),
    text,
  });
  session.status = 'in_progress';
  fs.writeFileSync(loadPath, JSON.stringify(session, null, 2) + '\n', 'utf8');
  if (loadPath !== sessionPath && session.id === sessionId) {
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2) + '\n', 'utf8');
  }
  fs.writeFileSync(LATEST_PATH, JSON.stringify(session, null, 2) + '\n', 'utf8');
  return session;
}

/** Live panel stream — same path as chat-demo (char drafts + finalize). */
async function streamThenAppend(sessionId, memberId, round, text) {
  const { pauseAfterMember } = panelTiming();
  setPeerStates(memberId, round, sessionId);
  setLiveMember(memberId, 'thinking', 'Thinking…');
  await sleep(1200);
  await streamDraftChars(memberId, round, text);
  await finalizeDraftMessage(sessionId, memberId, round, text);
  if (pauseAfterMember > 0) await sleep(pauseAfterMember);
}

function draftFilePath(memberId, round) {
  return path.join(DRAFTS_DIR, `${memberId}-r${round}.txt`);
}

function clearDraftFile(memberId, round) {
  const p = draftFilePath(memberId, round);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function clearAllDraftFiles() {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  for (const file of fs.readdirSync(DRAFTS_DIR)) {
    if (file.endsWith('.txt')) fs.unlinkSync(path.join(DRAFTS_DIR, file));
  }
}

async function cmdDraft(args) {
  const typeSlow = args.includes('--type');
  const filtered = args.filter((a) => a !== '--type');
  const [memberId, roundStr, ...textParts] = filtered;
  const round = Number(roundStr);
  if (!MEMBER_IDS.includes(memberId) || !round) {
    console.error('Usage: npm run council:draft -- [--type] <nala|london|fasa> <round> "text"');
    console.error('       npm run council:draft -- <id> <round> clear');
    console.error('       --type pushes char-by-char like the demo (best for manual tests)');
    process.exit(1);
  }
  if (textParts[0] === 'clear') {
    clearDraftFile(memberId, round);
    setLiveMember(memberId, 'thinking', 'Thinking…', '');
    console.log(JSON.stringify({ ok: true, cleared: true, member: memberId, round }, null, 2));
    return;
  }
  const text = textParts.join(' ').trim();
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const live = readLiveStatus();
  live.round = round;
  if (!live.sessionId) live.sessionId = 'live-draft';
  writeLiveStatus(live);

  if (typeSlow && text) {
    await streamDraftChars(memberId, round, text);
    console.log(JSON.stringify({ ok: true, member: memberId, round, typed: true, chars: text.length }, null, 2));
    return;
  }

  fs.writeFileSync(draftFilePath(memberId, round), text, 'utf8');
  setLiveMember(memberId, text ? 'speaking' : 'thinking', text ? 'Typing…' : 'Thinking…', text);
  console.log(JSON.stringify({ ok: true, member: memberId, round, chars: text.length }, null, 2));
}

async function cmdStatus(args) {
  if (args[0] === 'clear') {
    clearAllDraftFiles();
    writeLiveStatus(defaultLiveStatus());
    console.log(JSON.stringify({ ok: true, cleared: true }, null, 2));
    return;
  }
  if (args[0] === 'pending') {
    cmdCompletePending();
    return;
  }
  if (args[0] === 'reset') {
    await cmdStatusReset(args.slice(1));
    return;
  }
  if (args[0] === 'phase') {
    const live = readLiveStatus();
    live.phase = { id: args[1] || 'phase', label: args.slice(2).join(' ').trim() || '…' };
    writeLiveStatus(live);
    console.log(JSON.stringify({ ok: true, phase: live.phase }, null, 2));
    return;
  }
  if (args[0] === 'all') {
    const state = args[1] || 'thinking';
    const detail = args.slice(2).join(' ').trim() || 'Thinking…';
    for (const id of MEMBER_IDS) setLiveMember(id, state, detail);
    console.log(JSON.stringify({ ok: true, all: state, detail }, null, 2));
    return;
  }
  if (args[0] === 'chair') {
    const live = readLiveStatus();
    live.chair = { state: args[1] || 'running', detail: args.slice(2).join(' ').trim() };
    writeLiveStatus(live);
    console.log(JSON.stringify({ ok: true, chair: live.chair }, null, 2));
    return;
  }
  const [memberId, state, ...detailParts] = args;
  if (!memberId || !state) {
    console.error('Usage: npm run council:status -- reset [--round=1]');
    console.error('       npm run council:status -- <nala|london|fasa> <waiting|thinking|speaking|done> "detail"');
    console.error('       npm run council:status -- chair running "Synthesizing verdict…"');
    console.error('       npm run council:status -- phase round2 "Reading Round 1…"');
    console.error('       npm run council:status -- all thinking "Round 1"');
    process.exit(1);
  }
  setLiveMember(memberId, state, detailParts.join(' ').trim());
  console.log(JSON.stringify({ ok: true, member: memberId, state, detail: detailParts.join(' ').trim() }, null, 2));
}

async function cmdStatusReset(args) {
  const roundArg = args.find((a) => a.startsWith('--round='));
  const round = roundArg ? Number(roundArg.split('=')[1]) : Number(args[0]) || 1;
  const session = fs.existsSync(LATEST_PATH)
    ? JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'))
    : { id: null };

  if (round === 2) {
    const { pauseBeforeRound2 } = panelTiming();
    const live = readLiveStatus();
    live.chair = { state: 'running', detail: 'Pause — read Round 1 before Round 2…' };
    live.phase = { id: 'pause-r1', label: 'Pause — read Round 1 replies' };
    for (const id of MEMBER_IDS) {
      live.members[id] = { state: 'done', detail: 'Round 1 complete', at: new Date().toISOString() };
    }
    writeLiveStatus(live);
    console.log(JSON.stringify({ ok: true, pausingMs: pauseBeforeRound2, reason: 'round-2' }, null, 2));
    await sleep(pauseBeforeRound2);
  }

  resetLiveStatus(session.id, round);
  console.log(JSON.stringify({ ok: true, reset: true, round, sessionId: session.id }, null, 2));
}

async function cmdPause(args) {
  const ms = Math.max(0, Number(args[0]) || panelTiming().pauseAfterMember);
  const live = readLiveStatus();
  live.chair = { state: 'running', detail: `Pause ${Math.round(ms / 1000)}s…` };
  writeLiveStatus(live);
  console.log(JSON.stringify({ ok: true, pausingMs: ms }, null, 2));
  await sleep(ms);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'session';
}

function readIdentity(relativeFile) {
  const p = path.join(COUNCIL_DIR, relativeFile);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function ragSnippet(filePath, maxChars = 4000) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(COUNCIL_DIR, filePath);
  if (!fs.existsSync(abs)) return '';
  if (fs.statSync(abs).isDirectory()) {
    const parts = [];
    for (const file of fs.readdirSync(abs).filter((f) => f.endsWith('.md')).sort()) {
      const raw = fs.readFileSync(path.join(abs, file), 'utf8');
      parts.push(`### ${file}\n${raw}`);
    }
    const joined = parts.join('\n\n');
    return joined.length > maxChars ? joined.slice(0, maxChars) + '\n…(truncated)' : joined;
  }
  const raw = fs.readFileSync(abs, 'utf8');
  return raw.length > maxChars ? raw.slice(0, maxChars) + '\n…(truncated)' : raw;
}

function ragSessionMarkdown(topic, maxChars = 5000) {
  if (!fs.existsSync(SESSIONS_DIR)) return '';
  const words = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const files = fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ f, m: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 30);
  const scored = files.map(({ f }) => {
    const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8');
    const hay = raw.toLowerCase();
    const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    return { f, raw, score };
  });
  scored.sort((a, b) => b.score - a.score || b.f.localeCompare(a.f));
  const picks = (scored.some((x) => x.score > 0) ? scored.filter((x) => x.score > 0) : scored).slice(0, 3);
  let out = picks.map((p) => `### ${p.f}\n${p.raw.slice(0, 1600)}`).join('\n\n');
  if (out.length > maxChars) out = out.slice(0, maxChars) + '\n…(truncated)';
  return out;
}

function searchMemberMemory(memberId, topic, limit = 6) {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  const words = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const hits = [];
  for (const file of fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json') && f !== 'latest.json')) {
    try {
      const session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8'));
      for (const m of session.messages ?? []) {
        if (String(m.member).toLowerCase() !== memberId) continue;
        const hay = `${session.topic} ${m.text}`.toLowerCase();
        const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
        hits.push({
          score,
          topic: session.topic,
          round: m.round,
          text: String(m.text).slice(0, 420),
          at: m.at ?? session.createdAt,
        });
      }
    } catch {
      /* skip */
    }
  }
  hits.sort((a, b) => b.score - a.score || String(b.at).localeCompare(String(a.at)));
  return hits.slice(0, limit);
}

function searchPastSessions(topic, limit = 3) {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  const files = fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'latest.json')
    .map((f) => ({ f, m: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 20);

  const words = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const scored = files.map(({ f }) => {
    const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
    const hay = `${data.topic} ${JSON.stringify(data.messages ?? [])}`.toLowerCase();
    const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    return { f, data, score };
  });
  scored.sort((a, b) => b.score - a.score || b.data.createdAt?.localeCompare(a.data.createdAt));
  return scored.filter((x) => x.score > 0).slice(0, limit).map((x) => x.data);
}

function buildRagPack(topic, config) {
  const parts = [];
  for (const rel of config.ragPaths ?? []) {
    if (rel === 'sessions') continue;
    const snippet = ragSnippet(rel, 3500);
    if (snippet) parts.push(`## ${rel}\n${snippet}`);
  }
  const past = searchPastSessions(topic);
  if (past.length) {
    parts.push(
      '## Past council sessions (relevant)\n' +
        past
          .map(
            (s) =>
              `### ${s.topic} (${s.id})\n` +
              (s.decision ? `Decision: ${s.decision}\n` : '') +
              (s.messages ?? [])
                .slice(-4)
                .map((m) => `- **${m.member}** (${m.round}): ${String(m.text).slice(0, 280)}`)
                .join('\n')
          )
          .join('\n\n')
    );
  }
  const mdSessions = ragSessionMarkdown(topic);
  if (mdSessions) parts.push(`## Session transcripts (markdown RAG)\n${mdSessions}`);
  const vaultSnippets = readVaultSessionSnippets(topic);
  if (vaultSnippets) parts.push(`## Obsidian council memory\n${vaultSnippets}`);
  return parts.join('\n\n');
}

function cmdPrepare(topicArg, { attachments = [] } = {}) {
  syncCanvasToConfig();
  const topic = topicArg?.trim();
  const hasImages = Array.isArray(attachments) && attachments.length > 0;
  if (!topic && !hasImages) {
    console.error('Usage: npm run council:prepare -- "Your question"');
    process.exit(1);
  }
  const config = readConfig();
  const slugSource = topic || 'image-attachment';
  const id = `${new Date().toISOString().slice(0, 10)}-${slugify(slugSource)}`;
  const session = {
    id,
    topic: topic || '',
    attachments: hasImages ? attachments : [],
    createdAt: new Date().toISOString(),
    status: 'prepared',
    rounds: config.rounds ?? 2,
    members: config.members.map((m) => ({
      id: m.id,
      name: m.name,
      model: m.model,
    })),
    ragPack: buildRagPack(topic, config),
    messages: [],
    decision: null,
  };
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const sessionPath = path.join(SESSIONS_DIR, `${id}.json`);
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2) + '\n', 'utf8');
  fs.writeFileSync(LATEST_PATH, JSON.stringify(session, null, 2) + '\n', 'utf8');
  resetLiveStatus(session.id, 1, 'Round 1 — opening takes');
  clearAllDraftFiles();
  for (const id of MEMBER_IDS) {
    setLiveMember(id, 'waiting', 'Standing by…');
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        id,
        sessionPath,
        latest: LATEST_PATH,
        flow: 'sequential',
        order: MEMBER_IDS,
        hint: 'One member at a time: council:turn → Task → council:append',
      },
      null,
      2
    )
  );
}

function readPendingConvene() {
  const pendingPath = path.join(COUNCIL_DIR, 'ui', 'pending-convene.json');
  if (!fs.existsSync(pendingPath)) {
    return { path: pendingPath, data: { status: 'idle', topic: null } };
  }
  return { path: pendingPath, data: JSON.parse(fs.readFileSync(pendingPath, 'utf8')) };
}

function writePendingConvene(data) {
  const pendingPath = path.join(COUNCIL_DIR, 'ui', 'pending-convene.json');
  fs.writeFileSync(pendingPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function cmdGo() {
  syncCanvasToConfig();
  const { path: pendingPath, data: pending } = readPendingConvene();
  if (pending.status !== 'new' || (!String(pending.topic || '').trim() && !pending.attachments?.length)) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'No queued topic — type in panel and Send first',
          pending: pending.status,
        },
        null,
        2
      )
    );
    process.exit(1);
  }
  const topic = String(pending.topic || '').trim();
  const attachments = pending.attachments ?? [];
  cmdPrepare(topic, { attachments });
  const session = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
  pending.status = 'in_progress';
  pending.startedAt = new Date().toISOString();
  pending.sessionId = session.id;
  writePendingConvene(pending);
  const sid = session.id;
  console.log(
    JSON.stringify(
      {
        ok: true,
        topic,
        attachmentCount: attachments.length,
        sessionId: sid,
        flow: 'sequential',
        members: MEMBER_IDS,
        round1: MEMBER_IDS.map((id) => ({
          member: id,
          begin: `npm run council:turn -- ${id} 1`,
          prompt: `npm run council:prompt -- ${id}`,
          append: `npm run council:append -- ${sid} ${id} 1 "<reply>"`,
        })),
        round2Pause: `npm run council:status -- reset --round=2`,
        round2: MEMBER_IDS.map((id) => ({
          member: id,
          begin: `npm run council:turn -- ${id} 2`,
          prompt: `npm run council:prompt -- ${id}`,
          append: `npm run council:append -- ${sid} ${id} 2 "<reply>"`,
        })),
        finish: [
          `npm run council:status -- chair running "Synthesizing Final Verdict…"`,
          `npm run council:decide -- "<verdict>"`,
          `npm run council:status -- pending`,
        ],
      },
      null,
      2
    )
  );
}

async function cmdTurn(args) {
  const [memberId, roundStr] = args;
  const round = Number(roundStr);
  if (!MEMBER_IDS.includes(memberId) || !round) {
    console.error('Usage: npm run council:turn -- <nala|london|fasa> <round>');
    process.exit(1);
  }
  const session = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
  setPeerStates(memberId, round, session.id);
  setLiveMember(memberId, 'thinking', 'Thinking…');
  await sleep(400);
  console.log(
    JSON.stringify(
      {
        ok: true,
        sessionId: session.id,
        member: memberId,
        round,
        panel: 'http://localhost:3939',
        promptCmd: `npm run council:prompt -- ${memberId}`,
        appendCmd: `npm run council:append -- ${session.id} ${memberId} ${round} "<reply>"`,
      },
      null,
      2
    )
  );
}

function cmdCompletePending() {
  const { data: pending } = readPendingConvene();
  pending.status = 'done';
  pending.completedAt = new Date().toISOString();
  writePendingConvene(pending);
  console.log(JSON.stringify({ ok: true, pending: 'done' }, null, 2));
}

function cmdConfig(args) {
  if (args[0] === 'show') {
    console.log(JSON.stringify(readConfig(), null, 2));
    return;
  }
  const [memberId, field, ...rest] = args;
  const value = rest.join(' ').trim();
  if (!memberId || !field || !value) {
    console.error('Usage: npm run council:config -- <memberId> model <modelId>');
    console.error('       npm run council:config -- show');
    process.exit(1);
  }
  const config = readConfig();
  const member = config.members.find((m) => m.id === memberId);
  if (!member) {
    console.error(`Unknown member: ${memberId}. IDs: ${config.members.map((m) => m.id).join(', ')}`);
    process.exit(1);
  }
  if (field === 'model') {
    const allowed = new Set((config.availableModels ?? []).map((m) => m.id));
    if (!allowed.has(value)) {
      console.error(`Unknown model "${value}". Allowed: ${[...allowed].join(', ')}`);
      process.exit(1);
    }
    member.model = value;
    writeConfig(config);
    console.log(JSON.stringify({ ok: true, member: memberId, model: value }, null, 2));
    return;
  }
  console.error(`Unknown field: ${field}`);
  process.exit(1);
}

function cmdAppend(args) {
  const instant = args.includes('--instant');
  const filtered = args.filter((a) => a !== '--instant');
  const [sessionId, memberId, roundStr, ...textParts] = filtered;
  const text = textParts.join(' ').trim();
  const round = Number(roundStr);
  if (!sessionId || !memberId || !round || !text) {
    console.error('Usage: npm run council:append -- <sessionId> <memberId> <round> "message text"');
    console.error('       Add --instant to skip typing animation on the panel');
    process.exit(1);
  }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const limit = round >= 2 ? 45 : 55;
  if (wordCount > limit) {
    console.warn(
      `Warning: ${memberId} R${round} is ${wordCount} words (target ≤${limit}). Trim before append — panel should feel like short chat bubbles.`
    );
  }
  if (!instant) {
    return streamThenAppend(sessionId, memberId, round, text).then(() => {
      console.log(
        JSON.stringify(
          { ok: true, streamed: true, member: memberId, round, pauseMs: panelTiming().pauseAfterMember },
          null,
          2
        )
      );
    });
  }
  console.warn('Warning: --instant skips live typing on the panel. Avoid during user-visible convenes.');
  appendMessageToSession(sessionId, memberId, round, text);
  clearDraftFile(memberId, round);
  setLiveMember(memberId, 'done', `Spoke · Round ${round}`);
  console.log(JSON.stringify({ ok: true, messageCount: JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8')).messages.length }, null, 2));
}

function cmdDecide(decisionText, flags = {}) {
  const decision = decisionText?.trim();
  if (!decision) {
    console.error('Usage: npm run council:decide -- "One-paragraph decision"');
    process.exit(1);
  }
  const wordCount = decision.split(/\s+/).filter(Boolean).length;
  if (wordCount > 45) {
    console.warn(
      `Warning: Final Verdict is ${wordCount} words (target ≤45). Panel will truncate display; shorten for readability.`
    );
  }
  const session = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
  session.decision = decision;
  session.status = 'complete';
  session.completedAt = new Date().toISOString();
  const sessionPath = path.join(SESSIONS_DIR, `${session.id}.json`);
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2) + '\n', 'utf8');
  fs.writeFileSync(LATEST_PATH, JSON.stringify(session, null, 2) + '\n', 'utf8');
  exportSessionMarkdown(session);
  syncCouncilToVault();
  writeLiveStatus({
    ...readLiveStatus(),
    phase: null,
    chair: { state: 'done', detail: 'Final Verdict delivered' },
    members: Object.fromEntries(
      MEMBER_IDS.map((id) => [id, { state: 'done', detail: 'Session complete' }])
    ),
  });

  let taskExtract = null;
  const config = readConfig();
  const autoExtract = config.autoExtractVerdictTasks !== false && !flags.noExtract;
  if (autoExtract) {
    taskExtract = applyVerdictTaskExtraction(decision, {
      topic: session.topic ?? '',
      messages: session.messages ?? [],
      sessionId: session.id,
    });
    if (taskExtract.wrote > 0) {
      console.warn(
        `Verdict extract: wrote ${taskExtract.wrote} task(s) to TASKS.md — see mod log in panel.`
      );
    }
  }

  console.log(JSON.stringify({ ok: true, id: session.id, taskExtract }, null, 2));
}

function cmdPrompt(memberId) {
  const config = readConfig();
  const member = config.members.find((m) => m.id === memberId);
  if (!member) {
    console.error(`Unknown member: ${memberId}`);
    process.exit(1);
  }
  const session = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
  const identity = readIdentity(member.identityFile);
  const sharedLens = config.sharedLensFile ? readIdentity(config.sharedLensFile) : '';
  const stressLens = config.stressTestLensFile ? readIdentity(config.stressTestLensFile) : '';
  const peerMessages = session.messages.filter((m) => m.member !== memberId);
  const round = session.messages.some((m) => m.round === 2) ? 2 : 1;
  const memory = searchMemberMemory(member.id, session.topic);
  const memoryBlock = memory.length
    ? `\n## Your past council positions (memory — stay consistent, evolve when warranted)\n${memory
        .map((h) => `- **${h.topic}** (R${h.round}): ${h.text}`)
        .join('\n')}`
    : '';
  const peersBlock =
    round === 2 && peerMessages.length
      ? `\n## Other members said (respond to them, stay in character)\n${peerMessages
          .map((m) => `### ${m.member} (round ${m.round})\n${m.text}`)
          .join('\n\n')}`
      : '';

  const attachmentPaths = (session.attachments ?? [])
    .map((a) => resolveAttachmentAbsPath(ROOT, a))
    .filter(Boolean);
  const attachmentsBlock = attachmentPaths.length
    ? `\n## Attached images (${attachmentPaths.length})\nThe user attached images with this topic. **Read each file** with the Read tool before answering.\n${attachmentPaths.map((p) => `- ${p}`).join('\n')}`
    : '';

  const prompt = `# Council member: ${member.name} (${member.id})
Model slug for Task tool: ${member.model}

## Identity
${identity}

## Shared outsider lens (required in every reply)
${sharedLens || '(See identities/_shared-smite-lens.md)'}

## Stress-test lens (required — no glazing, challenge before affirm)
${stressLens || '(See identities/_shared-stress-test.md)'}

## Topic
${session.topic || '(image-only — read attachments below)'}
${attachmentsBlock}

## Context pack (RAG)
${session.ragPack}
${memoryBlock}
${peersBlock}

## Instructions
- Round ${round} of ${session.rounds}.
- **Voice:** Like texting a sharp friend on Slack — human, plain English, warm but direct. No memo tone.
- **Length:** Round 1 → **40–55 words total**. Round 2 → **30–45 words total**. Say less; mean more.
- **Format:** **1–2 short bubbles** — put ONE blank line between thoughts (panel splits on blank lines). **Max 2 sentences per bubble.** No markdown, no **bold headers**, no bullet lists.
- Round 2: **@mention one peer** naturally (\`@Nala\`, \`@London\`, or \`@Fasa\`).
- ${round === 1 ? 'One clear stance + optional one-line question.' : 'React to a peer in one breath; don’t rehash R1.'}
- Stay in character (${member.name} + Willow lens) but **keep it conversational**, not academic.
- Skip jargon; if you need a term, define it in five words or drop it.
- Do NOT write other members' sections or a Final Verdict — only your own take.

## LIVE PANEL (mandatory — user watches http://localhost:3939)

Stream your reply **while you write** using Shell:

1. \`npm run council:draft -- ${member.id} ${round} clear\`
2. After **each sentence**, run: \`npm run council:draft -- ${member.id} ${round} "your full reply text so far as one line"\`
3. When done composing, run draft one last time with your complete reply, then return that same text to Chair.

The user must see words appear mid-generation. Skipping draft updates = failed task.
`;
  console.log(prompt);
}

async function cmdChatDemo() {
  const { demoReadPauseMs, pauseBeforeRound2 } = panelTiming();
  const config = readConfig();
  const id = `${new Date().toISOString().slice(0, 10)}-group-chat-demo`;
  const topic = 'Group chat demo — favorite color (watch the panel)';
  const session = {
    id,
    topic,
    createdAt: new Date().toISOString(),
    status: 'prepared',
    rounds: 2,
    members: config.members.map((m) => ({ id: m.id, name: m.name, model: m.model })),
    ragPack: '',
    messages: [],
    decision: null,
  };
  setupDemoPanel(session);
  resetLiveStatus(id, 1, 'Round 1 — opening takes');
  for (const memberId of MEMBER_IDS) {
    setLiveMember(memberId, 'waiting', 'Standing by…');
  }
  await sleep(800);

  console.log(
    JSON.stringify(
      {
        ok: true,
        demo: 'chat',
        sessionId: id,
        hint: 'Watch http://localhost:3939 — ~90s, pauses so you can read',
      },
      null,
      2
    )
  );

  const round1 = [
    {
      id: 'nala',
      text: 'Favorite color again? Sage green — same as the shell. Not a mood board pick, a brand pick. You testing bubbles or actually asking?',
    },
    {
      id: 'london',
      text: 'Define favorite: what you pick with zero stakes. Mine is deep forest green — restful on screen, holds up in print. Who counts as everyone without a real poll?',
    },
    {
      id: 'fasa',
      text: 'Sage green, no hesitation. Dark shell, heat maps, rank climbing — that is Willow compounding in your pocket. Gray icons get deleted before coffee.',
    },
  ];

  for (const line of round1) {
    await demoMemberReply(id, line.id, 1, line.text, demoReadPauseMs);
  }

  const live = readLiveStatus();
  live.chair = { state: 'running', detail: 'Pause — read Round 1 before Round 2…' };
  live.phase = { id: 'pause-r1', label: 'Pause — read Round 1 replies' };
  for (const memberId of MEMBER_IDS) {
    live.members[memberId] = { state: 'done', detail: 'Round 1 complete', at: new Date().toISOString() };
  }
  writeLiveStatus(live);
  console.log(JSON.stringify({ ok: true, pausingMs: pauseBeforeRound2, phase: 'round-2-soon' }, null, 2));
  await sleep(pauseBeforeRound2);

  resetLiveStatus(id, 2, 'Round 2 — replies to each other…');
  for (const memberId of MEMBER_IDS) {
    setLiveMember(memberId, 'waiting', 'Reading Round 1…');
  }
  await sleep(1200);

  const round2 = [
    {
      id: 'nala',
      text: '@London — “restful” is still a feelings word. Sage stays mine; brand beats biography every time.',
    },
    {
      id: 'london',
      text: '@Nala, fair — I over-indexed on comfort language. @Fasa, three greens is a shared constraint, not agreement. Forest stays personal, not the deck.',
    },
    {
      id: 'fasa',
      text: '@London, constraint framing lands. @Nala — conceded, not therapy hour. Same hue without comparing hex codes is the whole demo.',
    },
  ];

  for (const line of round2) {
    await demoMemberReply(id, line.id, 2, line.text, demoReadPauseMs);
  }

  setLiveMember('nala', 'done', 'Session complete');
  setLiveMember('london', 'done', 'Session complete');
  setLiveMember('fasa', 'done', 'Session complete');
  writeLiveStatus({
    ...readLiveStatus(),
    chair: { state: 'running', detail: 'Synthesizing Final Verdict…' },
  });
  await sleep(2000);

  cmdDecide(
    'Three greens, three voices — sage twice for brand, forest once for personal taste. Demo passes. Take your time reading; real convenes use the same pacing.'
  );

  console.log(JSON.stringify({ ok: true, demo: 'complete', reset: 'npm run council:status -- clear' }, null, 2));
}

async function cmdTypeDemo() {
  const id = `${new Date().toISOString().slice(0, 10)}-typing-demo`;
  const config = readConfig();
  const session = {
    id,
    topic: 'Quick typing demo — Nala only',
    createdAt: new Date().toISOString(),
    status: 'prepared',
    rounds: 1,
    members: config.members.map((m) => ({ id: m.id, name: m.name, model: m.model })),
    ragPack: '',
    messages: [],
    decision: null,
  };
  setupDemoPanel(session);
  resetLiveStatus(id, 1, 'Quick typing demo');
  setLiveMember('nala', 'thinking', 'Thinking…');
  setLiveMember('london', 'idle', '');
  setLiveMember('fasa', 'idle', '');
  console.log(JSON.stringify({ ok: true, sessionId: id, hint: 'Watch http://localhost:3939 (Nala only — use chat-demo for all three)' }, null, 2));
  await sleep(500);
  await streamDraftChars('nala', 1, 'Word one. Word two. Word three.');
  await finalizeDraftMessage(id, 'nala', 1, 'Word one. Word two. Word three.');
  console.log(JSON.stringify({ ok: true, demo: 'done', reset: 'npm run council:status -- clear' }, null, 2));
}

async function runCommand(command, rest) {
  switch (command) {
    case 'go':
      await cmdGo();
      break;
    case 'turn':
      await cmdTurn(rest);
      break;
    case 'prepare':
      cmdPrepare(rest.join(' '));
      break;
    case 'config':
      cmdConfig(rest);
      break;
    case 'append':
      await cmdAppend(rest);
      break;
    case 'decide': {
      const noExtract = rest.includes('--no-extract');
      const textParts = rest.filter((a) => a !== '--no-extract');
      cmdDecide(textParts.join(' '), { noExtract });
      break;
    }
    case 'prompt':
      cmdPrompt(rest[0]);
      break;
    case 'chat-demo':
      await cmdChatDemo();
      break;
    case 'type-demo':
      await cmdTypeDemo();
      break;
    case 'draft':
      await cmdDraft(rest);
      break;
    case 'sync-canvas':
    case 'sync-panel':
      cmdSyncPanel();
      break;
    case 'vault-sync':
      console.log(JSON.stringify(syncCouncilToVault(), null, 2));
      break;
    case 'write-bug': {
      const title = rest.join(' ').replace(/^["']|["']$/g, '');
      console.log(JSON.stringify(applyWriteWithVault(appendOpenBug, title), null, 2));
      break;
    }
    case 'write-task': {
      const tags = rest.filter((p) => /^#[\w-]+$/.test(p));
      const title = rest.filter((p) => !/^#[\w-]+$/.test(p)).join(' ').replace(/^["']|["']$/g, '');
      console.log(JSON.stringify(applyWriteWithVault(appendPendingTask, title, tags), null, 2));
      break;
    }
    case 'status':
      await cmdStatus(rest);
      break;
    case 'pause':
      await cmdPause(rest);
      break;
    default:
      console.log(`AI Council CLI (Cursor-native — no API keys in this script)

Commands:
  go                           Panel queued topic → prepare + sequential flow JSON
  turn <id> <round>            Panel: one member thinking (before Task + append)
  prepare "topic"              Create session + RAG pack → sessions/latest.json
  sync-canvas                  Canvas dropdowns → council.config.json (also runs on prepare)
  config show                  Print council.config.json
  config <id> model <slug>     e.g. config nala model claude-4.6-sonnet-medium-thinking
  prompt <memberId>            Print Task subagent prompt for member
  chat-demo                    Full 3-member group chat on panel (~90s, pauses to read)
  type-demo                    Quick Nala-only typing demo
  draft [--type] <id> <round> "text"  Push mid-generation text to live panel
  append <id> <member> <r> "…" Append a message (streams on panel; blocks until done)
  pause [ms]                   Optional pause (default from config)
  decide "…"                   Chair decision → marks session complete
  write-task "Title" #tags     Append TASKS.md Pending + mod log + vault:sync
  write-bug "Title"            Append BUGS.md Open + mod log + vault:sync

Auto-sync while using the canvas: npm run council:watch

In chat: "Convene council on …" or "Nala switch to Claude and answer"
See docs/council/README.md`);
  }
}

const [, , command, ...rest] = process.argv;
runCommand(command, rest).catch((e) => {
  console.error(e);
  process.exit(1);
});
