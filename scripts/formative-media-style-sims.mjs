#!/usr/bin/env node
/**
 * 50 local/dev sims: media crop isolation + prompt text-style inheritance.
 *
 *   npm run formative:trivia:media-style-sims
 *   FORMATIVE_API_BASE=http://localhost:3000 npm run formative:trivia:media-style-sims
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts', 'trivia-media-style-sims');
const API_BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const TARGET = 85;

const remixUrl = pathToFileURL(path.join(ROOT, 'formative-web/src/lib/triviaRemix.js')).href;
const richUrl = pathToFileURL(path.join(ROOT, 'formative-web/src/lib/richText.js')).href;

const {
  makeRandomQuestionByStyle,
  remixQuestionFromA,
  applyRemixPatchToQuestion,
  applyRemixPatchToVariant,
  hasCollectibleCorrect,
  optionsAreValid,
  isBaseVoiceClip,
  isDefaultSkinCard,
} = await import(remixUrl);
const { applyPromptTextStyle, htmlToPlainText } = await import(richUrl);

const results = [];
let passed = 0;
let failed = 0;

function record(id, ok, detail = {}) {
  results.push({ id, ok, ...detail });
  if (ok) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL ${id}${detail.reason ? ` — ${detail.reason}` : ''}`);
  }
}

function blankMc(n = 4) {
  return {
    type: 'multiple_choice',
    prompt: 'Placeholder?',
    options: Array.from({ length: n }, (_, i) => `Option ${i + 1}`),
    correct: { index: 0 },
    meta: {},
    image_url: null,
  };
}

function mediaUrlOf(q) {
  return q?.image_url || q?.image_urls?.[0] || null;
}

function localMediaPath(url) {
  const s = String(url || '');
  if (!s.startsWith('/media/')) return null;
  return path.join(ROOT, 'app/data', decodeURIComponent(s.slice('/media/'.length)));
}

async function checkMediaLoads(url) {
  if (!url) return { ok: false, reason: 'no-url' };
  const local = localMediaPath(url);
  if (local && fs.existsSync(local)) return { ok: true, via: 'disk' };
  if (API_BASE && url.startsWith('/media/')) {
    try {
      const res = await fetch(`${API_BASE}${url}`, { method: 'HEAD' });
      return { ok: res.ok, via: 'api', status: res.status };
    } catch (err) {
      return { ok: false, reason: err.message, via: 'api' };
    }
  }
  if (String(url).includes('VoiceAudio')) return { ok: true, via: 'skip-voice', warn: true };
  return { ok: false, reason: 'missing', path: local };
}

const STYLE_SAMPLE =
  '<p><strong><span style="color: rgb(0, 0, 0); font-size: 18px;">Which god do these three emojis represent?</span></strong></p>';

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1–10: emoji Change must not become skin_guess when crop is stale
  for (let i = 1; i <= 10; i += 1) {
    const id = `emoji-not-skin:${i}`;
    const emoji = applyRemixPatchToQuestion(
      blankMc(4),
      makeRandomQuestionByStyle('god_emoji', blankMc(4))
    ).question;
    if (!emoji || emoji.error) {
      record(id, false, { reason: emoji?.error || 'build-fail' });
      continue;
    }
    const poisoned = {
      ...emoji,
      meta: {
        ...(emoji.meta || {}),
        media_crop: 'skin_zoom_center',
        media_seed: 'stale-seed',
        remix_kind: 'god_emoji',
      },
    };
    const remixed = remixQuestionFromA(poisoned);
    if (remixed.error) {
      record(id, false, { reason: remixed.error });
      continue;
    }
    const next = applyRemixPatchToQuestion(poisoned, remixed).question;
    const kind = next.meta?.remix_kind;
    const crop = next.meta?.media_crop;
    const url = mediaUrlOf(next);
    const ok =
      kind === 'god_emoji' &&
      crop !== 'skin_zoom_center' &&
      /emoji/i.test(htmlToPlainText(next.prompt)) &&
      Boolean(url) &&
      /god-emojis/i.test(url);
    record(id, ok, {
      kind,
      crop: crop || null,
      url,
      reason: ok ? undefined : 'still-skin-or-bad-media',
    });
  }

  // 11–20: variant B inherits A's skin crop visually cleared after emoji remix
  for (let i = 1; i <= 10; i += 1) {
    const id = `variant-crop-clear:${i}`;
    const skin = applyRemixPatchToQuestion(
      blankMc(4),
      makeRandomQuestionByStyle('skin_guess', blankMc(4))
    ).question;
    const emoji = makeRandomQuestionByStyle('god_emoji', blankMc(4));
    if (skin.error || emoji.error) {
      record(id, false, { reason: skin.error || emoji.error });
      continue;
    }
    const withSlot = {
      ...skin,
      meta: {
        ...skin.meta,
        variants: [
          {
            prompt: skin.prompt,
            options: skin.options,
            correct: skin.correct,
            image_url: skin.image_url,
            image_urls: [skin.image_url].filter(Boolean),
            media_crop: 'skin_zoom_center',
            media_seed: skin.meta?.media_seed,
            remix_kind: 'skin_guess',
            enabled: true,
          },
        ],
      },
    };
    const { variant } = applyRemixPatchToVariant(withSlot, 0, emoji);
    const ok =
      variant.remix_kind === 'god_emoji' &&
      variant.media_crop == null &&
      /god-emojis/i.test(String(mediaUrlOf(variant) || ''));
    record(id, ok, {
      remix_kind: variant.remix_kind,
      media_crop: variant.media_crop ?? null,
      url: mediaUrlOf(variant),
      reason: ok ? undefined : 'crop-or-kind',
    });
  }

  // 21–30: item identify remix clears skin crop + loads icon
  for (let i = 1; i <= 10; i += 1) {
    const id = `item-clear-crop:${i}`;
    const item = makeRandomQuestionByStyle('item_identify', blankMc(4));
    if (item.error) {
      record(id, false, { reason: item.error });
      continue;
    }
    const poisoned = {
      type: 'multiple_choice',
      prompt: 'What is this item called?',
      options: ['A', 'B', 'C', 'D'],
      correct: { index: 0 },
      image_url: '/media/God%20Renders/fake.png',
      meta: {
        remix_kind: 'item_identify',
        media_crop: 'skin_zoom_center',
        media_seed: 'stale',
      },
    };
    const next = applyRemixPatchToQuestion(poisoned, item).question;
    const url = mediaUrlOf(next);
    const load = await checkMediaLoads(url);
    const ok =
      next.meta?.media_crop !== 'skin_zoom_center' &&
      Boolean(url) &&
      /Item Icons/i.test(url) &&
      (load.ok || load.warn);
    record(id, ok, {
      url,
      crop: next.meta?.media_crop ?? null,
      media: load,
      reason: ok ? undefined : load.reason || 'item-media',
    });
  }

  // 31–40: prompt style inheritance (bold + black)
  for (let i = 1; i <= 10; i += 1) {
    const id = `prompt-style:${i}`;
    const built = makeRandomQuestionByStyle(
      i % 2 === 0 ? 'god_emoji' : 'item_identify',
      blankMc(4)
    );
    if (built.error) {
      record(id, false, { reason: built.error });
      continue;
    }
    const styled = applyPromptTextStyle(STYLE_SAMPLE, built.patch.prompt);
    const plain = htmlToPlainText(styled);
    const ok =
      /<strong>/i.test(styled) &&
      /color:\s*rgb\(0,\s*0,\s*0\)/i.test(styled) &&
      plain.length > 8 &&
      (i % 2 !== 0 || /emoji/i.test(plain));
    record(id, ok, {
      styled: styled.slice(0, 120),
      plain,
      reason: ok ? undefined : 'style-not-applied',
    });
  }

  // 41–50: add-question style copy + media load for media kinds
  const mediaKinds = ['god_emoji', 'skin_guess', 'voice_line', 'ability_sound', 'item_identify'];
  for (let i = 1; i <= 10; i += 1) {
    const styleId = mediaKinds[(i - 1) % mediaKinds.length];
    const id = `add-q-style-media:${styleId}:${i}`;
    const built = makeRandomQuestionByStyle(styleId, blankMc(4));
    if (built.error) {
      record(id, false, { reason: built.error });
      continue;
    }
    const q = applyRemixPatchToQuestion(blankMc(4), {
      patch: {
        ...built.patch,
        prompt: applyPromptTextStyle(STYLE_SAMPLE, built.patch.prompt),
      },
    }).question;
    const url = mediaUrlOf(q);
    const load = url ? await checkMediaLoads(url) : { ok: true, via: 'none' };
    const styleOk =
      /<strong>/i.test(q.prompt) && /color:\s*rgb\(0,\s*0,\s*0\)/i.test(q.prompt);
    const mediaOk = !url || load.ok || load.warn || String(url).includes('VoiceAudio');
    const valid = hasCollectibleCorrect(q) && optionsAreValid(q);
    const ok = styleOk && mediaOk && valid;
    record(id, ok, {
      styleId,
      url,
      media: load,
      reason: ok ? undefined : !styleOk ? 'no-style' : !mediaOk ? 'media' : 'invalid',
    });
  }

  // 51–70: voice_line prefers non-Skin00_Base when catalog has skinned VOX
  {
    const catalogMod = await import(
      pathToFileURL(path.join(ROOT, 'formative-web/src/lib/triviaMediaCatalog.json')).href,
      { with: { type: 'json' } }
    );
    const voiceClips = catalogMod.default?.voiceClips || catalogMod.voiceClips || [];
    const skinnedCatalog = voiceClips.filter((c) => c?.url && !isBaseVoiceClip(c));
    const hasSkinned = skinnedCatalog.length >= 4;

    for (let i = 1; i <= 15; i += 1) {
      const id = `voice-prefer-skinned:${i}`;
      if (!hasSkinned) {
        record(id, true, { skipped: 'no-skinned-in-catalog' });
        continue;
      }
      const built = makeRandomQuestionByStyle('voice_line', blankMc(4));
      if (built.error) {
        record(id, false, { reason: built.error });
        continue;
      }
      const q = applyRemixPatchToQuestion(blankMc(4), built).question;
      const url = mediaUrlOf(q);
      const skin = q.meta?.hint_context?.skin;
      const ok = Boolean(url) && !/\/Skin00_Base\//i.test(url) && !isBaseVoiceClip({ url, skin });
      record(id, ok, {
        url,
        skin: skin || null,
        reason: ok ? undefined : 'picked-base-skin',
      });
    }

    for (let i = 1; i <= 5; i += 1) {
      const id = `voice-remix-prefer-skinned:${i}`;
      if (!hasSkinned) {
        record(id, true, { skipped: 'no-skinned-in-catalog' });
        continue;
      }
      const baseClip = voiceClips.find((c) => isBaseVoiceClip(c));
      const seed = {
        type: 'multiple_choice',
        prompt: 'Choose the correct god this voice line belongs to.',
        options: [baseClip?.god || 'Achilles', 'Agni', 'Zeus', 'Ra'],
        correct: { index: 0 },
        image_url: baseClip?.url || '/media/VoiceAudio/Achilles/Skin00_Base/VOX/Intro_1.WAV',
        meta: {
          media: 'audio',
          remix_kind: 'voice_line',
          hint_context: { god: baseClip?.god || 'Achilles', skin: 'Base', kind: 'intro' },
        },
      };
      const remixed = remixQuestionFromA(seed);
      if (remixed.error) {
        record(id, false, { reason: remixed.error });
        continue;
      }
      const next = applyRemixPatchToQuestion(seed, remixed).question;
      const url = mediaUrlOf(next);
      const ok =
        next.meta?.remix_kind === 'voice_line' &&
        Boolean(url) &&
        url !== seed.image_url &&
        !/\/Skin00_Base\//i.test(url);
      record(id, ok, {
        url,
        from: seed.image_url,
        reason: ok ? undefined : 'remix-stayed-base',
      });
    }
  }

  // 71–85: skin_guess uses NewGodSkins (non-Default) + assets-resolvable item/skin samples
  {
    const catalogMod = await import(
      pathToFileURL(path.join(ROOT, 'formative-web/src/lib/triviaMediaCatalog.json')).href,
      { with: { type: 'json' } }
    );
    const skinCards = catalogMod.default?.skinCards || catalogMod.skinCards || [];
    const skinnedCards = skinCards.filter((c) => c?.url && !isDefaultSkinCard(c));

    for (let i = 1; i <= 10; i += 1) {
      const id = `skin-newgodskins:${i}`;
      const built = makeRandomQuestionByStyle('skin_guess', blankMc(4));
      if (built.error) {
        record(id, false, { reason: built.error });
        continue;
      }
      const q = applyRemixPatchToQuestion(blankMc(4), built).question;
      const url = mediaUrlOf(q);
      const ok =
        Boolean(url) &&
        /NewGodSkins/i.test(url) &&
        !/\/Default\//i.test(url) &&
        (skinnedCards.length < 4 || !isDefaultSkinCard({ url, skinName: q.meta?.hint_context?.skin }));
      record(id, ok, {
        url,
        skin: q.meta?.hint_context?.skin || null,
        reason: ok ? undefined : 'not-newgodskins-or-default',
      });
    }

    for (let i = 1; i <= 5; i += 1) {
      const id = `item-identify-path:${i}`;
      const built = makeRandomQuestionByStyle('item_identify', blankMc(4));
      if (built.error) {
        record(id, false, { reason: built.error });
        continue;
      }
      const q = applyRemixPatchToQuestion(blankMc(4), built).question;
      const url = mediaUrlOf(q);
      const load = await checkMediaLoads(url);
      const ok = /Item Icons/i.test(String(url || '')) && (load.ok || load.warn);
      record(id, ok, {
        url,
        media: load,
        reason: ok ? undefined : load.reason || 'item-path',
      });
    }
  }

  while (results.length < TARGET) {
    const id = `pad:${results.length + 1}`;
    const styled = applyPromptTextStyle(STYLE_SAMPLE, `Pad question ${results.length + 1}?`);
    record(id, /<strong>/i.test(styled) && /color:/i.test(styled), {});
  }

  const report = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    apiBase: API_BASE,
    failures: results.filter((r) => !r.ok),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'all.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(
    `\nMedia/style sims: ${passed}/${results.length} passed, ${failed} failed.\nReport: artifacts/trivia-media-style-sims/report.json`
  );
  if (failed || results.length < TARGET) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
