const { sanitizeQuestionForPublic } = require('./triviaVariants');

const THRESHOLDS = {
  WARN_TOTAL_BYTES: 500 * 1024,
  FAIL_TOTAL_BYTES: 2 * 1024 * 1024,
  MAX_FIELD_BYTES: 50 * 1024,
};

const MEDIA_REWRITE_REMINDER =
  'Inline data: URLs bloat quiz JSON and can crash take pages at scale. ' +
  'Host save runs lib/server/triviaMediaRewrite.js; unmapped blobs need ' +
  'scripts/extract-trivia-data-images.mjs / extract-trivia-data-audio.mjs ' +
  'and triviaDataMediaMap.json.';

function byteLen(value) {
  if (value == null) return 0;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function dataMediaKind(url) {
  const s = String(url || '').trim().toLowerCase();
  if (s.startsWith('data:image')) return 'image';
  if (s.startsWith('data:audio')) return 'audio';
  if (s.startsWith('data:video')) return 'video';
  if (s.startsWith('data:')) return 'data';
  return null;
}

function pushMediaUrl(out, path, url) {
  const kind = dataMediaKind(url);
  if (!kind) return;
  out.push({
    path,
    kind,
    bytes: byteLen(url),
    preview: String(url).slice(0, 48),
  });
}

function collectDataUrlsFromQuestion(q, qIndex, out) {
  const base = `questions[${qIndex}]`;
  pushMediaUrl(out, `${base}.image_url`, q?.image_url);
  pushMediaUrl(out, `${base}.banner_url`, q?.banner_url);
  for (const [i, u] of (q?.meta?.image_urls || []).entries()) {
    pushMediaUrl(out, `${base}.meta.image_urls[${i}]`, u);
  }
  for (const [vi, v] of (q?.meta?.variants || []).entries()) {
    pushMediaUrl(out, `${base}.meta.variants[${vi}].image_url`, v?.image_url);
    for (const [i, u] of (v?.image_urls || []).entries()) {
      pushMediaUrl(out, `${base}.meta.variants[${vi}].image_urls[${i}]`, u);
    }
  }
}

function collectLargeFieldsOnQuestion(q, qIndex, out) {
  const base = `questions[${qIndex}]`;
  const fields = [
    ['prompt', q?.prompt],
    ['image_url', q?.image_url],
    ['options', q?.options],
    ['meta', q?.meta],
    ['correct', q?.correct],
  ];
  for (const [name, value] of fields) {
    const bytes = byteLen(value);
    if (bytes > THRESHOLDS.MAX_FIELD_BYTES) {
      out.push({ path: `${base}.${name}`, bytes });
    }
  }
}

function collectLargeFieldsOnQuiz(quiz, out) {
  const fields = [
    ['banner_url', quiz?.banner_url],
    ['settings', quiz?.settings],
    ['title', quiz?.title],
  ];
  for (const [name, value] of fields) {
    const bytes = byteLen(value);
    if (bytes > THRESHOLDS.MAX_FIELD_BYTES) {
      out.push({ path: `quiz.${name}`, bytes });
    }
  }
}

/**
 * @param {{ quiz?: object, questions?: object[] }} input
 * @param {{ publicPayload?: boolean }} [options] publicPayload=true measures take-page JSON
 */
function checkTriviaPayload(input, options = {}) {
  const quiz = input?.quiz && typeof input.quiz === 'object' ? input.quiz : {};
  const rawQuestions = Array.isArray(input?.questions) ? input.questions : [];
  const usePublic = options.publicPayload !== false;
  const questions = usePublic
    ? rawQuestions.map((q) => sanitizeQuestionForPublic(q))
    : rawQuestions;

  const dataUrls = [];
  for (let i = 0; i < rawQuestions.length; i += 1) {
    collectDataUrlsFromQuestion(rawQuestions[i], i, dataUrls);
  }
  pushMediaUrl(dataUrls, 'quiz.banner_url', quiz.banner_url);

  const payload = { quiz, questions };
  const serialized = JSON.stringify(payload);
  const totalBytes = Buffer.byteLength(serialized, 'utf8');

  const largeFields = [];
  collectLargeFieldsOnQuiz(quiz, largeFields);
  for (let i = 0; i < questions.length; i += 1) {
    collectLargeFieldsOnQuestion(questions[i], i, largeFields);
  }
  const seenPaths = new Set();
  const oversizeFields = largeFields
    .filter((f) => f.bytes > THRESHOLDS.MAX_FIELD_BYTES)
    .filter((f) => {
      if (seenPaths.has(f.path)) return false;
      seenPaths.add(f.path);
      return true;
    });
  oversizeFields.sort((a, b) => b.bytes - a.bytes);

  const warnings = [];
  const failures = [];

  if (dataUrls.length) {
    failures.push(
      `${dataUrls.length} inline data: URL(s) in quiz media (image/audio/video)`
    );
  }
  if (totalBytes > THRESHOLDS.FAIL_TOTAL_BYTES) {
    failures.push(
      `Total payload ${formatBytes(totalBytes)} exceeds fail budget ${formatBytes(THRESHOLDS.FAIL_TOTAL_BYTES)}`
    );
  } else if (totalBytes > THRESHOLDS.WARN_TOTAL_BYTES) {
    warnings.push(
      `Total payload ${formatBytes(totalBytes)} exceeds warn budget ${formatBytes(THRESHOLDS.WARN_TOTAL_BYTES)}`
    );
  }
  if (oversizeFields.length) {
    const top = oversizeFields.slice(0, 5).map((f) => `${f.path} (${formatBytes(f.bytes)})`);
    failures.push(
      `${oversizeFields.length} field(s) exceed ${formatBytes(THRESHOLDS.MAX_FIELD_BYTES)}: ${top.join(', ')}`
    );
  }

  const level = failures.length ? 'fail' : warnings.length ? 'warn' : 'ok';

  return {
    ok: level !== 'fail',
    level,
    thresholds: { ...THRESHOLDS },
    questionCount: questions.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    payloadMode: usePublic ? 'public' : 'host',
    dataUrls,
    largeFields: oversizeFields,
    warnings,
    failures,
    mediaRewriteReminder: dataUrls.length ? MEDIA_REWRITE_REMINDER : null,
  };
}

function formatPayloadCheckReport(report) {
  const lines = [
    `trivia payload check: ${report.level.toUpperCase()} — ${report.questionCount} questions, ${report.totalFormatted} (${report.payloadMode})`,
  ];
  for (const w of report.warnings) lines.push(`  warn: ${w}`);
  for (const f of report.failures) lines.push(`  fail: ${f}`);
  if (report.dataUrls?.length) {
    lines.push(`  data: URLs (${report.dataUrls.length}):`);
    for (const hit of report.dataUrls.slice(0, 8)) {
      lines.push(`    - ${hit.path} [${hit.kind}] ${formatBytes(hit.bytes)} ${hit.preview}…`);
    }
    if (report.dataUrls.length > 8) {
      lines.push(`    … and ${report.dataUrls.length - 8} more`);
    }
    lines.push(`  ${report.mediaRewriteReminder}`);
  }
  if (report.largeFields?.length) {
    lines.push('  large fields:');
    for (const f of report.largeFields.slice(0, 8)) {
      lines.push(`    - ${f.path}: ${formatBytes(f.bytes)}`);
    }
  }
  return lines.join('\n');
}

module.exports = {
  THRESHOLDS,
  MEDIA_REWRITE_REMINDER,
  checkTriviaPayload,
  formatPayloadCheckReport,
  formatBytes,
};
