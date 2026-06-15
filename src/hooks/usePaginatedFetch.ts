import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import type { Paginated } from '../types/workerApi';

interface UsePaginatedFetchResult<T> {
  data: T[];
  setData: Dispatch<SetStateAction<Paginated<T>>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  loading: boolean;
  error: string;
  reload: () => void;
}

/**
 * Generic hook for paginated API calls that return { data, current_page, last_page, ... }.
 */
export function usePaginatedFetch<T>(
  fetcher: (page: number) => Promise<Paginated<T>>,
): UsePaginatedFetchResult<T> {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<T>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setPage(1);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetcher(page)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load data. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, reloadKey]);

  return {
    data: result.data,
    setData: setResult,
    page,
    setPage,
    totalPages: result.last_page,
    loading,
    error,
    reload,
  };
}
