const BLANK_MARKERS = ['{{blank}}', '_____', '___'];

export function splitFillBlankPrompt(prompt) {
  const text = String(prompt || '');
  for (const marker of BLANK_MARKERS) {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      return {
        before: text.slice(0, idx),
        after: text.slice(idx + marker.length),
        marker,
        hasBlank: true,
      };
    }
  }
  return { before: text, after: '', marker: '{{blank}}', hasBlank: false };
}

export function joinFillBlankPrompt(before, after, marker = '{{blank}}') {
  return `${before || ''}${marker}${after || ''}`;
}
