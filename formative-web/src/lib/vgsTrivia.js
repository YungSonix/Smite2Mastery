/**
 * VGS trivia question builders (uses repo-root vgsCommands via Vite alias).
 */
import {
  VGS_COMMANDS,
  commandHasAudio,
  normalizeVgsCode,
} from '../../../lib/vgsCommands.js';

const VGS_GOD_FOLDERS = [
  'Achilles',
  'Anhur',
  'Anubis',
  'Apollo',
  'Artemis',
  'Athena',
  'Cupid',
  'GuanYu',
  'Hercules',
  'Neith',
  'Ra',
  'Thor',
  'Ymir',
  'Zeus',
];

function pickOne(list) {
  if (!list?.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function vgsOptionLabel(cmd) {
  return `${cmd.code}: ${cmd.text}`;
}

export function vgsAudioUrl(file, godFolder = null) {
  const folder = godFolder || pickOne(VGS_GOD_FOLDERS);
  const name = String(file || '').trim();
  if (!folder || !name) return null;
  return `/media/VoiceAudio/${folder}/Skin00_Base/VGS/${name}`;
}

function pickVgsCommand({ requireAudio = false } = {}) {
  let pool = VGS_COMMANDS.filter((c) => c.code && c.text);
  if (requireAudio) pool = pool.filter(commandHasAudio);
  return pickOne(pool);
}

function similarDistractors(cmd, count = 3) {
  const sameCat = VGS_COMMANDS.filter(
    (c) => c.code !== cmd.code && c.category === cmd.category && commandHasAudio(cmd) === commandHasAudio(c)
  );
  const sameGroup = VGS_COMMANDS.filter(
    (c) =>
      c.code !== cmd.code &&
      c.group &&
      cmd.group &&
      c.group === cmd.group &&
      !sameCat.some((x) => x.code === c.code)
  );
  const pool = shuffle([...sameCat, ...sameGroup, ...VGS_COMMANDS.filter((c) => c.code !== cmd.code)]);
  const out = [];
  const seen = new Set([norm(cmd.code)]);
  for (const row of pool) {
    const key = norm(row.code);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= count) break;
  }
  return out;
}

export function acceptedVgsCodes(cmd) {
  const codes = new Set([cmd.code, ...(cmd.aliases || [])]);
  const out = [];
  for (const c of codes) {
    out.push(c, c.toUpperCase(), normalizeVgsCode(c));
  }
  return [...new Set(out.filter(Boolean))];
}

/** Play a VGS line — pick the PC command (multiple choice). */
export function buildVgsListenQuestion({ count = 4 } = {}) {
  const cmd = pickVgsCommand({ requireAudio: true });
  if (!cmd?.file) return null;
  const godFolder = pickOne(VGS_GOD_FOLDERS);
  const audio = vgsAudioUrl(cmd.file, godFolder);
  if (!audio) return null;
  const wrong = similarDistractors(cmd, count - 1);
  const correctLabel = vgsOptionLabel(cmd);
  const options = shuffle([correctLabel, ...wrong.map(vgsOptionLabel)]).slice(0, count);
  const index = options.findIndex((o) => norm(o) === norm(correctLabel));
  return {
    type: 'multiple_choice',
    prompt: 'What VGS was that?',
    options,
    correct: { index: index >= 0 ? index : 0 },
    image_url: audio,
    image_urls: [audio],
    meta: {
      randomize_order: true,
      media: 'audio',
      remix_kind: 'vgs_listen',
      hint_context: { code: cmd.code, text: cmd.text, godFolder, file: cmd.file },
    },
  };
}

/** Show callout text — pick the matching PC code (multiple choice). */
export function buildVgsCalloutPickQuestion({ count = 4 } = {}) {
  const cmd = pickVgsCommand({ requireAudio: false });
  if (!cmd) return null;
  const wrong = similarDistractors(cmd, count - 1);
  const options = shuffle([cmd.code, ...wrong.map((c) => c.code)]).slice(0, count);
  const index = options.findIndex((o) => norm(o) === norm(cmd.code));
  return {
    type: 'multiple_choice',
    prompt: `What VGS code matches this callout?<br><br><strong>"${cmd.text}"</strong>`,
    options,
    correct: { index: index >= 0 ? index : 0 },
    meta: {
      randomize_order: true,
      remix_kind: 'vgs_callout_pick',
      hint_context: { code: cmd.code, text: cmd.text },
    },
  };
}

/** Type the PC VGS code for a written callout (short answer). */
export function buildVgsTypeCodeQuestion() {
  const cmd = pickVgsCommand({ requireAudio: false });
  if (!cmd) return null;
  return {
    type: 'short_answer',
    prompt: `Type the VGS code for this callout.<br><br><strong>"${cmd.text}"</strong>`,
    options: [],
    correct: { answers: acceptedVgsCodes(cmd) },
    meta: {
      remix_kind: 'vgs_type_code',
      hint_context: { code: cmd.code, text: cmd.text },
    },
  };
}

/** Fix correct index after shuffle in packMc wrapper. */
export function finalizeVgsMcPatch(patch, cmd, optionLabels) {
  if (!patch?.options?.length || !cmd) return patch;
  const labels = optionLabels || patch.options.map((o) => o);
  const target = vgsOptionLabel(cmd);
  const idx = patch.options.findIndex((o) => norm(o) === norm(target) || norm(o) === norm(cmd.code));
  if (idx >= 0) patch.correct = { index: idx };
  return patch;
}
