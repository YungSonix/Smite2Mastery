export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Escape then apply **bold**, *italic*, - bullets, 1. numbers. Safe for innerHTML. */
export function markdownToSafeHtml(raw) {
  const escaped = escapeHtml(raw).replace(/\r\n/g, '\n');
  const lines = escaped.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
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
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(inlineMd(lines[i]));
      i += 1;
    }
    out.push(`<p>${para.join('<br/>')}</p>`);
  }
  return out.join('');
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
      const stripped = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      return prefix + stripped;
    })
    .join('\n');
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  return { value: next, start: lineStart, end: lineStart + nextBlock.length };
}
