import { useEffect, useId, useRef, useState } from 'react';
import { responsePercent } from '../lib/sortResponses';
import { searchResponses } from '../lib/responseSearch';

function isTypingTarget(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = String(el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export default function ResponsesStudentSearch({
  responses,
  query,
  onQueryChange,
  onPick,
  filteredCount,
  totalCount,
}) {
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
  const { matches } = searchResponses(responses, debounced);
  const shown = isActive ? filteredCount : totalCount;

  useEffect(() => {
    if (!listOpen) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setListOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listOpen]);

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

  const pick = (response) => {
    onPick?.(response);
    setListOpen(false);
  };

  return (
    <div className="f-edit-search-wrap f-responses-search-wrap" ref={wrapRef}>
      <div className="f-edit-search-bar">
        <label className="f-sr-only" htmlFor={inputId}>
          Search students
        </label>
        <span className="f-edit-search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          className="f-edit-search-input"
          placeholder="Search Discord or in-game name…"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            onQueryChange?.(e.target.value);
            setListOpen(true);
          }}
          onFocus={() => {
            if (trimmed) setListOpen(true);
          }}
        />
        <div className="f-edit-search-meta">
          <span className="f-edit-search-count">
            {isActive ? `${shown} of ${totalCount} shown` : `${totalCount} students`}
          </span>
          <kbd className="f-edit-search-kbd" aria-hidden="true">
            /
          </kbd>
          {isActive ? (
            <button
              type="button"
              className="f-edit-search-clear"
              onClick={() => {
                onQueryChange?.('');
                setListOpen(false);
                inputRef.current?.focus();
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {listOpen && isActive ? (
        <ul className="f-edit-search-results" role="listbox">
          {matches.length ? (
            matches.map((m) => {
              const pct = responsePercent(m.response);
              return (
                <li key={m.response.id}>
                  <button
                    type="button"
                    className="f-edit-search-result"
                    role="option"
                    onClick={() => pick(m.response)}
                  >
                    <span className="f-edit-search-result-title">{m.label}</span>
                    {m.sub && m.sub !== m.label ? (
                      <span className="f-edit-search-result-snippet">{m.sub}</span>
                    ) : null}
                    <span className="f-edit-search-result-snippet">{pct}%</span>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="f-edit-search-empty">No students match “{trimmed}”</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
