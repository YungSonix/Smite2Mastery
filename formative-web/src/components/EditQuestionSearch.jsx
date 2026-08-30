import { useEffect, useId, useRef, useState } from 'react';
import { searchQuestions } from '../lib/questionSearch';

/** True when the keypress belongs to something the host is typing into. */
function isTypingTarget(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = String(el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export default function EditQuestionSearch({ questions, query, onQueryChange, onJump, totalCount }) {
  const inputId = useId();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [debounced, setDebounced] = useState('');
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 175);
    return () => clearTimeout(t);
  }, [query]);

  const trimmed = debounced.trim();
  const isActive = trimmed.length > 0;
  const { matches, matchedIds } = searchQuestions(questions, debounced);
  const shownCount = isActive ? matchedIds.size : totalCount;
  const sumPoints = (list) =>
    (list || []).reduce((sum, q) => {
      const pts = Number(q?.points);
      return sum + (Number.isFinite(pts) ? pts : 0);
    }, 0);
  const totalPoints = sumPoints(questions);
  const shownPoints = isActive
    ? sumPoints((questions || []).filter((q) => matchedIds.has(String(q.id))))
    : totalPoints;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  useEffect(() => {
    if (!listOpen) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setListOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listOpen]);

  // "/" jumps to search — Edit tab only, since this bar is not rendered elsewhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('.f-overlay')) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      setListOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleJump = (questionId, variantIndex) => {
    onJump?.(questionId, variantIndex);
    setListOpen(false);
  };

  return (
    <div className="f-edit-search-wrap" ref={wrapRef}>
      <div className="f-edit-search-bar">
        <label className="f-sr-only" htmlFor={inputId}>
          Search questions and versions
        </label>
        <span className="f-edit-search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          className="f-edit-search-input"
          placeholder="Search questions & versions…"
          title="Press / to search"
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setListOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (query) onQueryChange('');
              else setListOpen(false);
              e.currentTarget.blur();
            }
            if (e.key === 'Enter' && matches.length) {
              e.preventDefault();
              const first = matches[0];
              handleJump(first.questionId, first.variantIndex);
            }
          }}
        />
        <div className="f-edit-search-meta">
          <span className="f-edit-search-count" aria-live="polite">
            {isActive
              ? `${shownCount} of ${totalCount} shown · ${plural(shownPoints, 'pt')}`
              : `${plural(totalCount, 'question')} · ${plural(totalPoints, 'pt')}`}
          </span>
          {isActive ? (
            <button
              type="button"
              className="f-edit-search-clear"
              onClick={() => {
                onQueryChange('');
                setListOpen(false);
              }}
            >
              Clear
            </button>
          ) : (
            <kbd className="f-edit-search-kbd" title="Press / to search questions">
              /
            </kbd>
          )}
        </div>
      </div>

      {listOpen && isActive ? (
        <div className="f-edit-search-results" role="listbox" aria-label="Matching questions">
          {matches.length ? (
            matches.slice(0, 40).map((match) => (
              <button
                key={`${match.questionId}-${match.variantIndex}`}
                type="button"
                role="option"
                className="f-edit-search-result"
                onClick={() => handleJump(match.questionId, match.variantIndex)}
              >
                <span className="f-edit-search-result-title">{match.title}</span>
                <span className="f-edit-search-result-snippet">{match.snippet || 'Match'}</span>
              </button>
            ))
          ) : (
            <p className="f-edit-search-empty">No questions match &ldquo;{trimmed}&rdquo;</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
