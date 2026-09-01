import { useCallback, useEffect, useState } from 'react';

export const RESPONSES_PAGE_SIZE = 50;
export const RESPONSES_PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const RESPONSES_PAGE_SIZE_STORAGE_KEY = 'trivia_responses_page_size';
const CLASSROOM_PAGE_SIZE_STORAGE_KEY = 'trivia_classroom_page_size';

function readStoredPageSize(key) {
  try {
    const n = Number(localStorage.getItem(key));
    if (RESPONSES_PAGE_SIZE_OPTIONS.includes(n)) return n;
  } catch {
    /* ignore */
  }
  return RESPONSES_PAGE_SIZE;
}

function writeStoredPageSize(key, n) {
  try {
    if (RESPONSES_PAGE_SIZE_OPTIONS.includes(n)) {
      localStorage.setItem(key, String(n));
    }
  } catch {
    /* ignore */
  }
}

export function readResponsesPageSize() {
  return readStoredPageSize(RESPONSES_PAGE_SIZE_STORAGE_KEY);
}

export function writeResponsesPageSize(n) {
  writeStoredPageSize(RESPONSES_PAGE_SIZE_STORAGE_KEY, n);
}

export function readClassroomPageSize() {
  return readStoredPageSize(CLASSROOM_PAGE_SIZE_STORAGE_KEY);
}

export function writeClassroomPageSize(n) {
  writeStoredPageSize(CLASSROOM_PAGE_SIZE_STORAGE_KEY, n);
}

export function usePagination(total, pageSize = RESPONSES_PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil((total || 0) / pageSize) || 1);
  const clampedPage = Math.min(page, pageCount - 1);
  const reset = useCallback(() => setPage(0), []);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  return {
    page: clampedPage,
    setPage,
    pageSize,
    pageCount,
    reset,
    slice: (items) => items.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
    from: total ? clampedPage * pageSize + 1 : 0,
    to: Math.min(total || 0, (clampedPage + 1) * pageSize),
  };
}

export function PaginationBar({ page, pageCount, from, to, total, onPage, pageSize = RESPONSES_PAGE_SIZE, className = '' }) {
  if (!total) return null;
  return (
    <div className={`f-pagination ${className}`.trim()}>
      <button type="button" className="f-outline-btn" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span className="f-muted">
        {from}–{to} of {total}
      </span>
      <button
        type="button"
        className="f-outline-btn"
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function PageSizePicker({ value, onChange, options = RESPONSES_PAGE_SIZE_OPTIONS }) {
  return (
    <div className="f-page-size-picker" role="group" aria-label="Rows per page">
      <span className="f-page-size-label">Rows</span>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          className={`f-page-size-btn${value === n ? ' is-active' : ''}`}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
