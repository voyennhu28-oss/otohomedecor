'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

type FilterValues = Record<string, string>;

export function useUrlFilters<T extends FilterValues>(defaults: T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const value = searchParams.get(key as string);
      if (value !== null) result[key] = value as T[keyof T];
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setValues = useCallback(
    (patch: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === defaults[key]) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      if (!('page' in patch) && 'page' in defaults) params.delete('page');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, router, pathname],
  );

  const reset = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of Object.keys(defaults)) params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, pathname]);

  return { values, setValues, reset };
}

export function parsePositiveInt(value: string, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function parseOption<T extends string>(
  value: string,
  options: readonly T[],
  fallback: T,
): T {
  return (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
