import { useEffect, useRef, useState } from 'react';
import { escapeHtml, normalizeHttpUrl, sanitizeRichHtml, toEditorHtml } from '../lib/richText';

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
  const skipInput = useRef(false);
  const userEdited = useRef(false);
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const wrapRef = useRef(null);
  const [active, setActive] = useState({});
  const [empty, setEmpty] = useState(() => isEmptyHtml(toEditorHtml(initialValue)));
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkLabel, setLinkLabel] = useState('');

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    skipInput.current = true;
    userEdited.current = false;
    const html = toEditorHtml(initialValue);
    if (el.innerHTML !== html) el.innerHTML = html;
    setEmpty(isEmptyHtml(html));
    const frame = requestAnimationFrame(() => {
      skipInput.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [initialValue]);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    setEmpty(isEmptyHtml(html));
    onChange?.(html);
  };

  const markAndEmit = () => {
    userEdited.current = true;
    emit();
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
    markAndEmit();
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
    run(() => {
      const classMap = {
        ink: 'f-rt-ink',
        accent: 'f-rt-accent',
        gold: 'f-rt-gold',
        muted: 'f-rt-muted',
      };
      const cls = classMap[kind] || 'f-rt-ink';
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) {
        document.execCommand('insertHTML', false, `<span class="${cls}">\u200b</span>`);
        return;
      }
      const span = document.createElement('span');
      span.className = cls;
      try {
        range.surroundContents(span);
      } catch {
        document.execCommand('insertHTML', false, `<span class="${cls}">${range.toString()}</span>`);
      }
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

  const snapshotRange = () => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) {
      savedRange.current = null;
      return '';
    }
    if (!el.contains(sel.anchorNode)) {
      savedRange.current = null;
      return '';
    }
    savedRange.current = sel.getRangeAt(0).cloneRange();
    return sel.toString();
  };

  const restoreRange = () => {
    const el = editorRef.current;
    const range = savedRange.current;
    if (!el || !range) return;
    el.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const decorateLinks = () => {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  };

  const openLinkPanel = () => {
    const selected = savedRange.current?.toString?.() || snapshotRange();
    const fromText = normalizeHttpUrl(selected);
    setLinkUrl(fromText || 'https://');
    setLinkLabel(fromText ? '' : selected);
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = normalizeHttpUrl(linkUrl);
    if (!href) return;
    restoreRange();
    const sel = window.getSelection();
    const hasSelection = sel && !sel.isCollapsed;
    if (hasSelection) {
      document.execCommand('createLink', false, href);
    } else {
      const label = String(linkLabel || href).trim() || href;
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      );
    }
    decorateLinks();
    markAndEmit();
    setLinkOpen(false);
  };

  const removeLink = () => {
    restoreRange();
    document.execCommand('unlink');
    markAndEmit();
    setLinkOpen(false);
  };

  return (
    <div className="f-visual-wrap" ref={wrapRef}>
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
            title="Attach link to selected text"
            className={linkOpen ? 'on' : ''}
            onMouseDown={(e) => {
              hold(e);
              snapshotRange();
            }}
            onClick={openLinkPanel}
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
      {linkOpen ? (
        <div className="f-link-pop">
          <p className="f-link-pop-hint">
            Highlight words, then paste a URL, or type link text below if nothing is selected.
          </p>
          <input
            className="f-link-pop-input"
            type="text"
            inputMode="url"
            value={linkUrl}
            placeholder="https://…"
            autoFocus
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
              if (e.key === 'Escape') setLinkOpen(false);
            }}
          />
          <input
            className="f-link-pop-input"
            type="text"
            value={linkLabel}
            placeholder="Text to show (if nothing is highlighted)"
            onChange={(e) => setLinkLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <div className="f-link-pop-actions">
            <button type="button" onClick={applyLink}>
              Attach
            </button>
            <button type="button" onClick={removeLink}>
              Remove
            </button>
            <button type="button" onClick={() => setLinkOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <div
        ref={editorRef}
        className={`f-visual-editor f-md ${empty ? 'is-empty' : ''}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder || 'Text'}
        data-placeholder={placeholder}
        style={{ minHeight }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          // Word-select only — never format. Also block parent <label> from activating Bold.
          e.stopPropagation();
        }}
        onInput={() => {
          if (skipInput.current) return;
          markAndEmit();
        }}
        onPaste={(e) => {
          const text = e.clipboardData?.getData('text/plain') || '';
          const href = normalizeHttpUrl(text);
          if (!href || /\s/.test(text.trim())) return;
          e.preventDefault();
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) document.execCommand('createLink', false, href);
          else {
            document.execCommand(
              'insertHTML',
              false,
              `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.trim())}</a>`,
            );
          }
          decorateLinks();
          markAndEmit();
        }}
        onBlur={(e) => {
          const wrap = wrapRef.current;
          if (wrap && e.relatedTarget && wrap.contains(e.relatedTarget)) return;
          const el = editorRef.current;
          if (el && userEdited.current) {
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
