import { splitAbilityEffectText } from './abilityEffectTokens';

const KEYWORD_BLOCK_RE =
  /<keyword\s+tag="([^"]*)">([\s\S]*?)(?:<\/>|<\/keyword>)/gi;

/** Remove Unreal formula / scaling placeholders — keep effect words only. */
export function stripAbilityFormulaTokens(text, { trim = true } = {}) {
  let out = String(text || '')
    .replace(/\[\{[^}]+\}\]/g, '')
    .replace(/\{[A-Za-z0-9_]+\}/g, '')
    .replace(/\[\d+(?:\.\d+)?%[^\]]*\]/gi, '')
    .replace(/\[\s*\]/g, '');
  if (trim) out = out.trim();
  return out;
}

/** Map in-game keyword tag paths → tooltip accent colors. */
export function keywordTagToColor(tag) {
  const t = String(tag || '').toLowerCase();
  if (t.includes('cc.hard') || t.includes('cc.soft')) return '#f472b6';
  if (t.includes('damagemagical')) return '#e879f9';
  if (t.includes('.god.') || t.includes('genie')) return '#fbbf24';
  if (t.includes('unarmored')) return '#fb923c';
  if (t.includes('armored')) return '#fbbf24';
  if (t.includes('damage')) return '#fda4af';
  if (t.includes('movement')) return '#22d3ee';
  if (t.includes('debuff')) return '#c084fc';
  if (t.includes('buff')) return '#a78bfa';
  if (t.includes('heal') || t.includes('regen') || t.includes('lifesteal')) return '#4ade80';
  if (t.includes('shield') || t.includes('protection')) return '#38bdf8';
  if (t.includes('health')) return '#4ade80';
  if (t.includes('immunity')) return '#34d399';
  return '#7dd3fc';
}

export function cleanAbilityDescriptionLayout(text) {
  return String(text || '')
    .replace(/<highlight>/gi, '')
    .replace(/<\/highlight>/gi, '')
    .replace(/<Highlight>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\.\.+/g, '.')
    .replace(/,{2,}/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripFormulasOutsideKeywords(text) {
  return String(text || '')
    .split(/(<keyword[\s\S]*?<\/>)/gi)
    .map((part) => {
      if (/^<keyword/i.test(part)) return part;
      return stripAbilityFormulaTokens(part, { trim: false });
    })
    .join('');
}

/** Strip formulas inside keyword blocks; keep keyword wrappers for render-time coloring. */
export function normalizeKeywordTaggedDescription(raw) {
  if (!raw || String(raw).trim() === 'NA') return '';
  let text = String(raw);

  text = text.replace(KEYWORD_BLOCK_RE, (_, tag, inner) => {
    const cleaned = stripAbilityFormulaTokens(inner, { trim: false });
    if (!String(cleaned).trim()) return '';
    return `<keyword tag="${tag}">${cleaned}</>`;
  });

  text = text.replace(/<Damage>([\s\S]*?)<\/Damage>/gi, (_, inner) =>
    stripAbilityFormulaTokens(inner, { trim: false })
  );

  text = stripFormulasOutsideKeywords(text);
  text = text.replace(/\[\s*\]/g, '');

  return cleanAbilityDescriptionLayout(text);
}

/** Last-resort cleanup if any markup leaked through. */
export function stripStrayKeywordMarkup(text) {
  return String(text || '')
    .replace(/<keyword\s+tag="[^"]*">/gi, '')
    .replace(/<\/>/gi, '')
    .replace(/<\/keyword>/gi, '');
}

export function mergeOrphanPunctuation(segments) {
  const out = [];
  for (const seg of segments) {
    const text = String(seg.text || '');
    if (
      seg.type === 'text' &&
      /^[.,;:!?\s]+$/.test(text) &&
      out.length > 0
    ) {
      out[out.length - 1].text += text;
      continue;
    }
    if (
      out.length > 0 &&
      seg.type === 'text' &&
      /^[.,;:!?]/.test(text) &&
      out[out.length - 1].type === 'token'
    ) {
      const lead = text.match(/^([.,;:!?]+)/)?.[1] || '';
      const rest = text.slice(lead.length);
      out[out.length - 1].text += lead;
      if (rest) out.push({ ...seg, text: rest });
      continue;
    }
    out.push({ ...seg });
  }
  return out;
}

function plainTextToSegments(chunk) {
  if (!chunk) return [];
  const safe = stripStrayKeywordMarkup(chunk);
  if (!safe) return [];
  return mergeOrphanPunctuation(
    splitAbilityEffectText(safe).map((seg) =>
      seg.type === 'token'
        ? { type: 'token', text: seg.text, color: seg.color }
        : { type: 'text', text: seg.text }
    )
  );
}

/**
 * Parse ability/item copy into colored segments — keyword tags first, else effect tokens.
 * @returns {{ type: 'text'|'token', text: string, color?: string }[]}
 */
export function splitColoredDescriptionText(raw) {
  const text = String(raw || '');
  if (!text) return [];
  if (/<keyword\s+tag=/i.test(text)) return splitKeywordTaggedAbilityText(text);
  return plainTextToSegments(text);
}

/**
 * Parse ST_HW_God_AbilityDescriptions copy into colored segments.
 * Keyword tags are consumed here — never shown as raw markup.
 */
export function splitKeywordTaggedAbilityText(raw) {
  const text = String(raw || '');
  if (!text) return [];

  if (!/<keyword\s+tag=/i.test(text)) {
    return plainTextToSegments(text);
  }

  const segments = [];
  const re = new RegExp(KEYWORD_BLOCK_RE.source, 'gi');
  let last = 0;
  let match;

  while ((match = re.exec(text))) {
    if (match.index > last) {
      segments.push(...plainTextToSegments(text.slice(last, match.index)));
    }
    const inner = String(match[2] || '');
    if (inner.trim()) {
      segments.push({
        type: 'token',
        text: inner,
        color: keywordTagToColor(match[1]),
      });
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push(...plainTextToSegments(text.slice(last)));
  }

  if (!segments.length) {
    return plainTextToSegments(stripStrayKeywordMarkup(text));
  }

  return mergeOrphanPunctuation(segments);
}
