export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeHttpUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function safeHref(raw) {
  const u = normalizeHttpUrl(String(raw || '').replace(/&amp;/g, '&'));
  return u ? escapeHtml(u) : '';
}

function inlineMd(s) {
  let out = s;
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, (_, label, href) => {
    const safe = safeHref(href);
    if (!safe) return label;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\|\|(.+?)\|\|/g, '<span class="f-spoiler" title="">$1</span>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__(.+?)__/g, '<u>$1</u>');
  out = out.replace(/~~(.+?)~~/g, '<del>$1</del>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return out;
}

/** Escape then apply Discord-style marks. Safe for innerHTML. */
export function markdownToSafeHtml(raw) {
  const escaped = escapeHtml(raw).replace(/\r\n/g, '\n');
  const lines = escaped.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const heading = lines[i].match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const n = Math.min(3, heading[1].length) + 2;
      out.push(`<h${n} class="f-md-h">${inlineMd(heading[2])}</h${n}>`);
      i += 1;
      continue;
    }
    const quote = [];
    while (i < lines.length && /^(&gt;|>)\s/.test(lines[i])) {
      quote.push(inlineMd(lines[i].replace(/^(&gt;|>)\s/, '')));
      i += 1;
    }
    if (quote.length) {
      out.push(`<blockquote>${quote.join('<br/>')}</blockquote>`);
      continue;
    }
    const ul = [];
    while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
      ul.push(`<li>${inlineMd(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
      i += 1;
    }
    if (ul.length) {
      out.push(`<ul>${ul.join('')}</ul>`);
      continue;
    }
    const ol = [];
    while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
      ol.push(`<li>${inlineMd(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
      i += 1;
    }
    if (ol.length) {
      out.push(`<ol>${ol.join('')}</ol>`);
      continue;
    }
    if (lines[i] === '') {
      i += 1;
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i] !== '' &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^(&gt;|>)\s/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i])
    ) {
      para.push(inlineMd(lines[i]));
      i += 1;
    }
    out.push(`<p>${para.join('<br/>')}</p>`);
  }
  return out.join('');
}

export function looksLikeHtml(raw) {
  const s = String(raw || '').trim();
  return s.startsWith('<') && /<\/?[a-z][\s\S]*>/i.test(s);
}

const RICH_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'A',
  'UL',
  'OL',
  'LI',
  'H3',
  'H4',
  'H5',
  'BLOCKQUOTE',
  'SPAN',
  'CODE',
  'DIV',
  'FONT',
]);

function filterStyle(style) {
  const keep = [];
  for (const part of String(style || '').split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (!val || /expression|javascript|url\s*\(/i.test(val)) continue;
    if (
      [
        'color',
        'background-color',
        'font-size',
        'font-weight',
        'font-style',
        'text-align',
        'text-decoration',
      ].includes(key)
    ) {
      keep.push(`${key}: ${val}`);
    }
  }
  return keep.join('; ');
}

function unwrap(el) {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/** Allowlisted HTML for stored instructions / prompts. Browser only. */
export function sanitizeRichHtml(html) {
  if (typeof DOMParser === 'undefined') return String(html || '');
  const doc = new DOMParser().parseFromString(`<div id="f-rich-root">${html || ''}</div>`, 'text/html');
  const root = doc.getElementById('f-rich-root') || doc.body;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) return;
      if (child.nodeType !== 1) {
        child.remove();
        return;
      }
      const tag = child.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT') {
        child.remove();
        return;
      }
      walk(child);
      if (!RICH_TAGS.has(tag)) {
        unwrap(child);
        return;
      }
      [...child.attributes].forEach((attr) => {
        const n = attr.name.toLowerCase();
        if (n === 'href' && tag === 'A') {
          const href = String(attr.value || '').trim();
          if (!/^https?:\/\//i.test(href)) child.removeAttribute('href');
          else {
            child.setAttribute('href', href);
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          }
          return;
        }
        if (n === 'style') {
          const next = filterStyle(attr.value);
          if (next) child.setAttribute('style', next);
          else child.removeAttribute('style');
          return;
        }
        if (n === 'class' && /\bf-md-h\b|\bf-spoiler\b/.test(attr.value)) return;
        child.removeAttribute(attr.name);
      });
    });
  };
  walk(root);
  return root.innerHTML;
}

export function toEditorHtml(raw) {
  const s = String(raw || '');
  if (!s.trim()) return '';
  if (looksLikeHtml(s)) return sanitizeRichHtml(s);
  return markdownToSafeHtml(s);
}

export function applyWrap(value, start, end, before, after) {
  const s = Math.max(0, start);
  const e = Math.max(s, end);
  const inner = value.slice(s, e) || 'text';
  const next = value.slice(0, s) + before + inner + after + value.slice(e);
  const ns = s + before.length;
  return { value: next, start: ns, end: ns + inner.length };
}

export function applyLinePrefix(value, start, end, prefix) {
  const s = Math.max(0, start);
  const e = Math.max(s, end);
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const nl = value.indexOf('\n', e);
  const lineEnd = nl === -1 ? value.length : nl;
  const block = value.slice(lineStart, lineEnd);
  const nextBlock = block
    .split('\n')
    .map((line) => {
      if (line.startsWith(prefix)) return line.slice(prefix.length);
      const stripped = line
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/^>\s+/, '')
        .replace(/^#{1,3}\s+/, '');
      return prefix + stripped;
    })
    .join('\n');
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  return { value: next, start: lineStart, end: lineStart + nextBlock.length };
}

export function applyLink(value, start, end) {
  const s = Math.max(0, start);
  const e = Math.max(s, end);
  const inner = value.slice(s, e) || 'link';
  const next = `${value.slice(0, s)}[${inner}](https://)${value.slice(e)}`;
  const urlStart = s + inner.length + 3;
  return { value: next, start: urlStart, end: urlStart + 8 };
}

/** Plain text from rich/markdown prompts (node-safe, no DOM). */
export function htmlToPlainText(raw) {
  return String(raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Copy bold / color / size / emphasis from a styled host prompt onto new prompt text.
 * Used when adding questions or Change/Random replaces the wording.
 */
export function applyPromptTextStyle(styleFromPrompt, newPrompt) {
  const from = String(styleFromPrompt || '');
  let next = String(newPrompt || '');
  if (!next.trim()) return next;
  // Already richly styled — keep as-is.
  if (looksLikeHtml(next) && /<(?:strong|b|em|i|u|span)\b/i.test(next) && /style=|<(?:strong|b)\b/i.test(next)) {
    return next;
  }
  if (looksLikeHtml(next)) next = htmlToPlainText(next);
  if (!looksLikeHtml(from)) return next;

  const color = from.match(/color:\s*([^;:"']+)/i)?.[1]?.trim();
  const fontSize = from.match(/font-size:\s*([^;:"']+)/i)?.[1]?.trim();
  const align = from.match(/text-align:\s*([^;:"']+)/i)?.[1]?.trim();
  const bold = /<(?:strong|b)\b/i.test(from) || /font-weight:\s*(bold|[6-9]00)/i.test(from);
  const italic = /<(?:em|i)\b/i.test(from) || /font-style:\s*italic/i.test(from);
  const underline = /<u\b/i.test(from) || /text-decoration:\s*underline/i.test(from);

  let inner = escapeHtml(next);
  const spanStyles = [];
  if (color) spanStyles.push(`color: ${color}`);
  if (fontSize) spanStyles.push(`font-size: ${fontSize}`);
  if (spanStyles.length) inner = `<span style="${spanStyles.join('; ')}">${inner}</span>`;
  if (underline) inner = `<u>${inner}</u>`;
  if (italic) inner = `<em>${inner}</em>`;
  if (bold) inner = `<strong>${inner}</strong>`;

  const pStyle = align ? ` style="text-align: ${align}"` : '';
  if (/<p\b/i.test(from) || bold || italic || underline || spanStyles.length) {
    return `<p${pStyle}>${inner}</p>`;
  }
  return inner;
}
