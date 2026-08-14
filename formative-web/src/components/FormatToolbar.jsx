import { applyLinePrefix, applyWrap } from '../lib/richText';

export default function FormatToolbar({ value, onChange, textareaRef }) {
  const run = (fn) => {
    const el = textareaRef?.current;
    const start = el?.selectionStart ?? String(value || '').length;
    const end = el?.selectionEnd ?? start;
    const next = fn(String(value || ''), start, end);
    onChange(next.value);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <div className="f-fmt-bar" role="toolbar" aria-label="Text formatting">
      <button type="button" title="Bold" onClick={() => run((v, s, e) => applyWrap(v, s, e, '**', '**'))}>
        <strong>B</strong>
      </button>
      <button type="button" title="Italic" onClick={() => run((v, s, e) => applyWrap(v, s, e, '*', '*'))}>
        <em>I</em>
      </button>
      <button type="button" title="Bullet list" onClick={() => run((v, s, e) => applyLinePrefix(v, s, e, '- '))}>
        • List
      </button>
      <button type="button" title="Numbered list" onClick={() => run((v, s, e) => applyLinePrefix(v, s, e, '1. '))}>
        1. List
      </button>
    </div>
  );
}
