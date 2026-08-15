/** Matching prompts, extra decoy answers, and multi-right keys. */

function asList(v) {
  if (Array.isArray(v)) return v.map((s) => String(s || '').trim()).filter(Boolean);
  const s = String(v || '').trim();
  if (!s) return [];
  return s.includes(',') ? s.split(',').map((x) => x.trim()).filter(Boolean) : [s];
}

export function matchingPrompts(q) {
  return (Array.isArray(q?.options) ? q.options : []).filter((p) => String(p?.left || '').trim());
}

function extraRightRows(q) {
  return (Array.isArray(q?.options) ? q.options : []).filter(
    (p) => !String(p?.left || '').trim() && !Array.isArray(p?.rights)
  );
}

export function matchingExtraRightsEditor(q) {
  const fromPairs = extraRightRows(q).map((p) => String(p.right || ''));
  if (fromPairs.length) return fromPairs;
  return Array.isArray(q?.meta?.extra_rights)
    ? q.meta.extra_rights.map((s) => String(s || ''))
    : [];
}

export function matchingExtraRights(q) {
  const seen = new Set();
  const out = [];
  for (const s of matchingExtraRightsEditor(q)) {
    const t = String(s || '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function matchingCorrectRights(q, left) {
  const map = q?.correct?.map && typeof q.correct.map === 'object' ? q.correct.map : {};
  if (map[left] != null) return asList(map[left]);
  const pair = (Array.isArray(q?.options) ? q.options : []).find((p) => p.left === left);
  if (!pair) return [];
  if (Array.isArray(pair.rights)) return asList(pair.rights);
  return asList(pair.right);
}

export function matchingAllRights(q) {
  const seen = new Set();
  const out = [];
  const add = (s) => {
    const t = String(s || '').trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const p of matchingPrompts(q)) matchingCorrectRights(q, p.left).forEach(add);
  matchingExtraRights(q).forEach(add);
  return out;
}

export function matchingEditorRows(q) {
  const opts = Array.isArray(q?.options) ? q.options : [];
  const promptOpts = opts.filter(
    (p) => String(p?.left || '').trim() || Array.isArray(p?.rights)
  );
  const source = promptOpts.length ? promptOpts : matchingPrompts(q);
  return source.map((p) => ({
    left: p.left || '',
    rightsText: matchingCorrectRights(q, p.left).join(', ') || asList(p.right).join(', '),
  }));
}

export function buildMatchingSave(rows, extras) {
  const prompts = (rows || []).map((r) => ({
    left: String(r.left || '').trim(),
    rights: asList(r.rightsText),
  }));
  const extra = (extras || []).map((s) => String(s || ''));
  const options = [
    ...prompts.map((p) => ({
      left: p.left,
      right: p.rights[0] || '',
      rights: p.rights,
    })),
    ...extra.map((right) => ({ left: '', right })),
  ];
  const map = {};
  for (const p of prompts) {
    if (!p.left || !p.rights.length) continue;
    map[p.left] = p.rights.length === 1 ? p.rights[0] : p.rights;
  }
  return {
    options,
    correct: { map },
    extra_rights: extra.map((s) => s.trim()).filter(Boolean),
  };
}

export function isOrderingQuestion(q) {
  const t = String(q?.type || '');
  if (t === 'ordering') return true;
  if (t === 'drag_drop' && Array.isArray(q.options)) return true;
  return false;
}
