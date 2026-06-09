import { useEffect, useRef } from "react";

/**
 * Периодически вызывает callback с заданным интервалом.
 * Автоматически ставит поллинг на паузу, когда вкладка неактивна
 * (свёрнута / в фоне), и сразу обновляет данные при возврате на вкладку.
 *
 * @param callback   функция-загрузчик (вызывается сразу и далее по интервалу)
 * @param intervalMs интервал в миллисекундах
 * @param enabled    включён ли поллинг (например, нужная роль/условие)
 * @param deps       зависимости, при изменении которых поллинг перезапускается
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled: boolean = true,
  deps: React.DependencyList = [],
) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => savedCallback.current();

    const start = () => {
      if (timer) return;
      tick();
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    if (!document.hidden) {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, ...deps]);
}

export default usePolling;
