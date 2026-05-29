import { useMemo, useState } from 'react';

function clampPage(page, totalPages) {
  const current = Number(page) || 1;
  const max = Math.max(1, Number(totalPages) || 1);
  return Math.min(Math.max(1, current), max);
}

export function usePagination(items = [], initialPageSize = 10) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(Number(initialPageSize) || 10);

  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = clampPage(page, totalPages);

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const setPage = (nextPage) => setPageState(clampPage(nextPage, totalPages));
  const nextPage = () => setPageState((current) => clampPage(current + 1, totalPages));
  const previousPage = () => setPageState((current) => clampPage(current - 1, totalPages));
  const setPageSize = (nextPageSize) => {
    const normalized = Math.max(1, Number(nextPageSize) || 10);
    setPageSizeState(normalized);
    setPageState(1);
  };

  return {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export default usePagination;
