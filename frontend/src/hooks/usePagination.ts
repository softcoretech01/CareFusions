import { useState, useEffect, useMemo } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Client-side pagination for a filtered list.
 *
 * Returns the current page's slice plus everything <Pagination /> needs. The
 * page snaps back to 1 whenever filtering shrinks the list below the current
 * page, so a search can never leave the user on an empty page.
 */
export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const paged = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, pageSize, total, totalPages, paged };
}
