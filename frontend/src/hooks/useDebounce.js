import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), Number(delay) || 0);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
