import { useEffect, useRef, useState } from 'react';
import { RESPONSE_SORT_OPTIONS, sortLabel } from '../lib/sortResponses';

export default function SortStudentsMenu({ value, onChange, options = RESPONSE_SORT_OPTIONS }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="f-sort-wrap" ref={ref}>
      <button
        type="button"
        className={`f-outline-btn f-sort-trigger ${open ? 'open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="f-sort-az" aria-hidden="true">
          A↓
        </span>
        {sortLabel(value)}
        <span className="f-sort-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="f-sort-menu" role="listbox" aria-label="Sort students by">
          <div className="f-sort-menu-label">Sort students by</div>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={value === opt.id}
              className={value === opt.id ? 'is-active' : ''}
              onClick={() => {
                onChange?.(opt.id);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
