import { useEffect, useRef } from 'react';

/**
 * Hook for automatically refreshing data at a given interval.
 * It passes `true` (silent flag) to the callback to prevent loading spinners during background polling.
 * 
 * @param {Function} callback - The function to call periodically. Should accept a `silent` boolean.
 * @param {number} intervalMs - The interval in milliseconds (default 30000ms / 30s).
 * @param {Array} dependencies - Dependencies to watch for interval reset.
 */
export function useAutoRefresh(callback, intervalMs = 30000, dependencies = []) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!intervalMs || typeof savedCallback.current !== 'function') return;

    const intervalId = setInterval(() => {
      savedCallback.current(true);
    }, intervalMs);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...dependencies]);
}
