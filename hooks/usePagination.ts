import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], itemsPerPage: number = 20) {
  const [currentPage, setCurrentPage] = useState(1);

  const maxPage = Math.max(1, Math.ceil(data.length / itemsPerPage));

  const currentData = useMemo(() => {
    const begin = (currentPage - 1) * itemsPerPage;
    const end = begin + itemsPerPage;
    return data.slice(begin, end);
  }, [data, currentPage, itemsPerPage]);

  const next = () => {
    setCurrentPage((currentPage) => Math.min(currentPage + 1, maxPage));
  };

  const prev = () => {
    setCurrentPage((currentPage) => Math.max(currentPage - 1, 1));
  };

  const jump = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, maxPage));
    setCurrentPage(pageNumber);
  };

  // Reset to first page when data changes significantly
  useMemo(() => {
      if (currentPage > maxPage) {
          setCurrentPage(maxPage);
      }
  }, [maxPage]);


  return { next, prev, jump, currentData, currentPage, maxPage };
}
