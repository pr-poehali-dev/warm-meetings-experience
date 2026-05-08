declare global {
  interface Window {
    ym?: ((counterId: number, method: string, ...args: unknown[]) => void) & {
      a?: unknown[];
      l?: number;
    };
  }
}

const COUNTER_ID = Number(import.meta.env.VITE_YM_COUNTER_ID || 108242529);

let initialized = false;

export function getCounterId(): number {
  return COUNTER_ID;
}

export function initYandexMetrika(): void {
  if (initialized || !COUNTER_ID || typeof window === "undefined") return;
  initialized = true;

  (function (m: Window, e: Document, t: string, r: string, i: string) {
    const w = m as unknown as Record<string, unknown>;
    w[i] =
      w[i] ||
      function (...args: unknown[]) {
        ((w[i] as { a?: unknown[] }).a = (w[i] as { a?: unknown[] }).a || []).push(args);
      };
    (w[i] as { l?: number }).l = Number(new Date());
    const k = e.createElement(t) as HTMLScriptElement;
    const a = e.getElementsByTagName(t)[0];
    k.async = true;
    k.src = r;
    a.parentNode?.insertBefore(k, a);
  })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

  window.ym?.(COUNTER_ID, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  });
}

export function trackHit(url: string): void {
  if (!COUNTER_ID || typeof window === "undefined") return;
  window.ym?.(COUNTER_ID, "hit", url);
}