import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Modern hook for handling async data loading with built-in race condition prevention
 * Uses a version counter to ensure only the latest request updates state
 */
export function useDeferredAsyncData<T>(
  asyncFn: () => Promise<T>,
  dependencies: any[] = [],
  initialData?: T,
) {
  const [data, setData] = useState<T | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const load = useCallback(async () => {
    // Increment version to invalidate previous requests
    versionRef.current += 1;
    const currentVersion = versionRef.current;

    try {
      setIsLoading(true);
      setError(null);

      const result = await asyncFn();

      // Only update state if this is still the latest request
      if (currentVersion === versionRef.current) {
        setData(result);
        setIsLoading(false);
      }
    } catch (err: any) {
      // Only update state if this is still the latest request
      if (currentVersion === versionRef.current) {
        setError(err.message || "Failed to load data");
        setData(initialData || null);
        setIsLoading(false);
      }
    }
  }, [asyncFn, initialData]);

  useEffect(() => {
    load();
  }, dependencies);

  return {
    data: (data || initialData) as T | null,
    isLoading,
    error,
    reload: load,
  };
}
