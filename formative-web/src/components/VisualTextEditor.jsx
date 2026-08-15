import { useEffect, useRef, useState } from 'react';
import { sanitizeRichHtml, toEditorHtml } from '../lib/richText';

function cssVar(el, name, fallback) {
  if (!el) return fallback;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function isEmptyHtml(html) {
  return !String(html || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export default function VisualTextEditor({
  initialValue = '',
  placeholder = '',
  minHeight = 160,
  onChange,
  onBlur,
}) {
  const editorRef = useRef(null);
  const [active, setActive] = useState({});
  const [empty, setEmpty] = useState(() => isEmptyHtml(toEditorHtml(initialValue)));

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = toEditorHtml(initialValue);
    if (el.innerHTML !== html) el.innerHTML = html;
    setEmpty(isEmptyHtml(html));
  }, [initialValue]);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    setEmpty(isEmptyHtml(html));
    onChange?.(html);
  };

  const run = (fn) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch {
      /* ignore */
    }
    fn(el);
    emit();
    syncActive();
  };

  const syncActive = () => {
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        center: document.queryCommandState('justifyCenter'),
      });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onSel = () => {
      const el = editorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
      syncActive();
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const applySize = (px) => {
    run((el) => {
      document.execCommand('fontSize', false, '7');
      el.querySelectorAll('font[size="7"]').forEach((font) => {
        const span = document.createElement('span');
        span.style.fontSize = px;
        while (font.firstChild) span.appendChild(font.firstChild);
        font.replaceWith(span);
      });
    });
  };

  const applyColor = (kind) => {
    run((el) => {
      const color =
        kind === 'accent'
          ? cssVar(el, '--f-blue', '#5b8ab0')
          : kind === 'gold'
            ? cssVar(el, '--f-label', '#c4a35a')
            : kind === 'muted'
              ? cssVar(el, '--f-muted', '#6b7280')
              : cssVar(el, '--f-text', '#2c3546');
      document.execCommand('foreColor', false, color);
    });
  };

  const applyMark = (kind) => {
    run((el) => {
      const bg =
        kind === 'gold'
          ? cssVar(el, '--f-label', '#c4a35a')
          : kind === 'blue'
            ? cssVar(el, '--f-blue-soft', 'rgba(91,138,176,0.35)')
            : 'transparent';
      document.execCommand('hiliteColor', false, bg);
    });
  };

  const hold = (e) => e.preventDefault();

  return (
    <div className="f-visual-wrap">
      <div className="f-fmt-bar f-fmt-bar-docs" role="toolbar" aria-label="Text formatting">
        <div className="f-fmt-group">
          <button type="button" title="Bold" className={active.bold ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('bold'))}>
            <strong>B</strong>
          </button>
          <button type="button" title="Italic" className={active.italic ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('italic'))}>
            <em>I</em>
          </button>
          <button type="button" title="Underline" className={active.underline ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('underline'))}>
            <u>U</u>
          </button>
          <button type="button" title="Strikethrough" className={active.strike ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('strikeThrough'))}>
            <s>S</s>
          </button>
        </div>
        <div className="f-fmt-group">
          <button type="button" title="Small" onMouseDown={hold} onClick={() => applySize('13px')}>
            A-
          </button>
          <button type="button" title="Normal" onMouseDown={hold} onClick={() => applySize('16px')}>
            A
          </button>
          <button type="button" title="Large" onMouseDown={hold} onClick={() => applySize('22px')}>
            A+
          </button>
          <button type="button" title="Title" onMouseDown={hold} onClick={() => run(() => document.execCommand('formatBlock', false, 'H3'))}>
            H
          </button>
        </div>
        <div className="f-fmt-group f-fmt-swatches">
          <button type="button" title="Ink" className="f-swatch ink" onMouseDown={hold} onClick={() => applyColor('ink')} />
          <button type="button" title="Accent" className="f-swatch accent" onMouseDown={hold} onClick={() => applyColor('accent')} />
          <button type="button" title="Gold" className="f-swatch gold" onMouseDown={hold} onClick={() => applyColor('gold')} />
          <button type="button" title="Muted" className="f-swatch muted" onMouseDown={hold} onClick={() => applyColor('muted')} />
          <button type="button" title="Highlight gold" className="f-swatch mark-gold" onMouseDown={hold} onClick={() => applyMark('gold')} />
          <button type="button" title="Clear highlight" className="f-swatch mark-off" onMouseDown={hold} onClick={() => applyMark('off')} />
        </div>
        <div className="f-fmt-group">
          <button type="button" title="Bullet list" className={active.ul ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('insertUnorderedList'))}>
            •
          </button>
          <button type="button" title="Numbered list" className={active.ol ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('insertOrderedList'))}>
            1.
          </button>
          <button type="button" title="Align left" onMouseDown={hold} onClick={() => run(() => document.execCommand('justifyLeft'))}>
            ⇤
          </button>
          <button type="button" title="Align center" className={active.center ? 'on' : ''} onMouseDown={hold} onClick={() => run(() => document.execCommand('justifyCenter'))}>
            ≡
          </button>
        </div>
        <div className="f-fmt-group">
          <button
            type="button"
            title="Link"
            onMouseDown={hold}
            onClick={() =>
              run(() => {
                const href = window.prompt('Link URL', 'https://');
                if (!href) return;
                const safe = String(href).trim();
                if (!/^https?:\/\//i.test(safe)) return;
                document.execCommand('createLink', false, safe);
              })
            }
          >
            Link
          </button>
          <button type="button" title="Quote" onMouseDown={hold} onClick={() => run(() => document.execCommand('formatBlock', false, 'BLOCKQUOTE'))}>
            “
          </button>
          <button type="button" title="Clear formatting" onMouseDown={hold} onClick={() => run(() => document.execCommand('removeFormat'))}>
            Tx
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        className={`f-visual-editor f-md ${empty ? 'is-empty' : ''}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder || 'Text'}
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emit}
        onBlur={() => {
          const el = editorRef.current;
          if (el) {
            el.innerHTML = sanitizeRichHtml(el.innerHTML);
            emit();
          }
          onBlur?.();
        }}
        suppressContentEditableWarning
      />
    </div>
  );
}
