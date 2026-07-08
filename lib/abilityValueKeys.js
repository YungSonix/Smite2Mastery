function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toLevelValueArray(raw) {
  if (Array.isArray(raw)) {
    return raw.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  }
  if (raw === null || raw === undefined) return [];
  const text = String(raw).trim();
  if (!text) return [];
  if (text.includes('/')) {
    return text
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [raw];
}

export function getLevelValue(raw, levelIndex) {
  const arr = toLevelValueArray(raw);
  if (arr.length === 0) return null;
  const idx = Math.max(0, Math.min(levelIndex, arr.length - 1));
  return arr[idx];
}

function replaceToken(text, token, replacement) {
  if (!text || replacement === null || replacement === undefined || String(replacement).trim() === '') {
    return text;
  }
  const display = String(replacement).trim();
  const key = escapeRegExp(token);
  return String(text)
    .replace(new RegExp(`\\[\\{${key}\\}\\]`, 'gi'), display)
    .replace(new RegExp(`\\{${key}\\}`, 'gi'), display);
}

function resolveFormulaExpression(expr, valueKeys, levelIndex) {
  let out = String(expr || '');
  Object.entries(valueKeys || {}).forEach(([key, raw]) => {
    const val = getLevelValue(raw, levelIndex);
    if (val === null || val === undefined || String(val).trim() === '') return;
    out = replaceToken(out, key, val);
  });
  const sumMatch = out.match(/^(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)$/);
  if (sumMatch) {
    const total = Number(sumMatch[1]) + Number(sumMatch[2]);
    if (Number.isFinite(total)) return String(total);
  }
  return out.replace(/\{[^}]+\}/g, '').trim() || out;
}

/** Inject per-level valueKeys (and formulas) into ability copy before formula stripping. */
export function applyAbilityLevelValues(text, ability, levelIndex = 0) {
  if (!text || !ability?.valueKeys || typeof ability.valueKeys !== 'object') return text;

  let out = String(text);
  const valueKeys = ability.valueKeys;

  if (ability.formulas && typeof ability.formulas === 'object') {
    Object.entries(ability.formulas).forEach(([formulaKey, expr]) => {
      out = replaceToken(out, formulaKey, resolveFormulaExpression(expr, valueKeys, levelIndex));
    });
  }

  Object.entries(valueKeys).forEach(([key, raw]) => {
    const val = getLevelValue(raw, levelIndex);
    if (val === null || val === undefined || String(val).trim() === '') return;
    out = replaceToken(out, key, val);
  });

  return out;
}

export function isAbilityStatConstantAcrossLevels(raw) {
  const arr = toLevelValueArray(raw);
  if (arr.length <= 1) return true;
  const first = String(arr[0]).trim();
  return arr.every((v) => String(v).trim() === first);
}

export function formatAbilityStatDisplayValue(raw, levelIndex) {
  const levelValue = getLevelValue(raw, levelIndex);
  if (levelValue === null || levelValue === undefined || String(levelValue).trim() === '') {
    return '';
  }
  if (isAbilityStatConstantAcrossLevels(raw)) {
    return String(toLevelValueArray(raw)[0]).trim();
  }
  return String(levelValue).trim();
}
