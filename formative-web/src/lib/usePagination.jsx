import { useCallback, useEffect, useState } from 'react';

export const RESPONSES_PAGE_SIZE = 50;

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

export function PaginationBar({ page, pageCount, from, to, total, onPage, pageSize = RESPONSES_PAGE_SIZE }) {
  if (!total || total <= pageSize) return null;
  return (
    <div className="f-pagination" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 4px' }}>
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
