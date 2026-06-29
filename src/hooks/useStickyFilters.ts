import { useEffect, useState, useCallback } from "react";

/**
 * Хук для хранения фильтров/сортировок раздела админки.
 * Источники в порядке приоритета: URL (?...) → localStorage(`admin:filters:{key}`) → defaults.
 * Меняешь фильтр — он автоматически пишется в URL и localStorage.
 *
 * Поля типизируются как Record<string, string | number | boolean | undefined>.
 */
// Поля, которые не нужно сохранять между сессиями (поисковые строки)
const TRANSIENT_KEYS = ["q", "search", "query"];

export function useStickyFilters<T extends Record<string, string | number | boolean | undefined>>(
  storageKey: string,
  defaults: T,
): {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (patch: Partial<T>) => void;
  reset: () => void;
} {
  const fullKey = `admin:filters:${storageKey}`;

  const readInitial = (): T => {
    if (typeof window === "undefined") return defaults;
    const result: Record<string, unknown> = { ...defaults };

    // 1. localStorage (только не-транзиентные поля)
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          for (const k of Object.keys(defaults)) {
            if (TRANSIENT_KEYS.includes(k)) continue;
            if (parsed[k] !== undefined) result[k] = parsed[k];
          }
        }
      }
    } catch {
      /* ignore */
    }

    // 2. URL поверх (более приоритетно — поделиться ссылкой)
    try {
      const url = new URL(window.location.href);
      for (const k of Object.keys(defaults)) {
        const v = url.searchParams.get(k);
        if (v !== null) {
          const def = defaults[k as keyof T];
          if (typeof def === "number") result[k] = Number(v);
          else if (typeof def === "boolean") result[k] = v === "1" || v === "true";
          else result[k] = v;
        }
      }
    } catch {
      /* ignore */
    }

    return result as T;
  };

  const [filters, setFiltersState] = useState<T>(readInitial);

  // Sync to localStorage + URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const toSave = Object.fromEntries(
        Object.entries(filters).filter(([k]) => !TRANSIENT_KEYS.includes(k))
      );
      window.localStorage.setItem(fullKey, JSON.stringify(toSave));
    } catch {
      /* ignore quota */
    }
    try {
      const url = new URL(window.location.href);
      let changed = false;
      for (const k of Object.keys(filters)) {
        const v = filters[k];
        const def = defaults[k as keyof T];
        if (v === undefined || v === "" || v === def) {
          if (url.searchParams.has(k)) {
            url.searchParams.delete(k);
            changed = true;
          }
        } else {
          const stringified =
            typeof v === "boolean" ? (v ? "1" : "0") : String(v);
          if (url.searchParams.get(k) !== stringified) {
            url.searchParams.set(k, stringified);
            changed = true;
          }
        }
      }
      if (changed) {
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      /* ignore */
    }
  }, [filters, fullKey, defaults]);

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setFilters = useCallback((patch: Partial<T>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setFiltersState(defaults);
  }, [defaults]);

  return { filters, setFilter, setFilters, reset };
}