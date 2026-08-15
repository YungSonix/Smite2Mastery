import { applyLinePrefix, applyLink, applyWrap } from '../lib/richText';

export default function FormatToolbar({ value, onChange, textareaRef }) {
  const run = (fn) => {
    const el = textareaRef?.current;
    const current = el?.value ?? String(value || '');
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? start;
    const next = fn(current, start, end);
    const scrollTop = el?.scrollTop ?? 0;
    if (el) el.value = next.value;
    onChange(next.value);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.start, next.end);
      el.scrollTop = scrollTop;
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
      <button type="button" title="Underline" onClick={() => run((v, s, e) => applyWrap(v, s, e, '__', '__'))}>
        <u>U</u>
      </button>
      <button type="button" title="Strikethrough" onClick={() => run((v, s, e) => applyWrap(v, s, e, '~~', '~~'))}>
        <s>S</s>
      </button>
      <button type="button" title="Link" onClick={() => run(applyLink)}>
        Link
      </button>
      <button type="button" title="Inline code" onClick={() => run((v, s, e) => applyWrap(v, s, e, '`', '`'))}>
        {'</>'}
      </button>
      <button type="button" title="Spoiler" onClick={() => run((v, s, e) => applyWrap(v, s, e, '||', '||'))}>
        Spoiler
      </button>
      <button type="button" title="Heading" onClick={() => run((v, s, e) => applyLinePrefix(v, s, e, '## '))}>
        H
      </button>
      <button type="button" title="Quote" onClick={() => run((v, s, e) => applyLinePrefix(v, s, e, '> '))}>
        “
      </button>
      <button type="button" title="Bullet list" onClick={() => run((v, s, e) => applyLinePrefix(v, s, e, '- '))}>
        •
      </button>
      <button type="button" title="Numbered list" onClick={() => run((v, s, e) => applyLinePrefix(v, s, e, '1. '))}>
        1.
      </button>
    </div>
  );
}
