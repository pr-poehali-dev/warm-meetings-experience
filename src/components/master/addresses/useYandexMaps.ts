import { useEffect, useState } from "react";
import { masterCalendarApi } from "@/lib/master-calendar-api";

// Глобальное состояние загрузки скрипта, чтобы не грузить его повторно.
let ymapsPromise: Promise<unknown> | null = null;
let cachedKey: string | null = null;

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      [key: string]: unknown;
    };
  }
}

async function loadYandexMaps(): Promise<unknown> {
  if (window.ymaps) {
    return new Promise((resolve) => window.ymaps!.ready(() => resolve(window.ymaps)));
  }
  if (ymapsPromise) return ymapsPromise;

  ymapsPromise = (async () => {
    if (cachedKey === null) {
      const { apikey } = await masterCalendarApi.getMapsKey();
      cachedKey = apikey || "";
    }
    if (!cachedKey) {
      throw new Error("no-key");
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${cachedKey}&lang=ru_RU`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("load-failed"));
      document.head.appendChild(script);
    });
    return new Promise((resolve) => window.ymaps!.ready(() => resolve(window.ymaps)));
  })();

  return ymapsPromise;
}

export type YmapsStatus = "loading" | "ready" | "no-key" | "error";

export function useYandexMaps() {
  const [status, setStatus] = useState<YmapsStatus>("loading");

  useEffect(() => {
    let mounted = true;
    loadYandexMaps()
      .then(() => mounted && setStatus("ready"))
      .catch((e) => {
        if (!mounted) return;
        setStatus(e?.message === "no-key" ? "no-key" : "error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
