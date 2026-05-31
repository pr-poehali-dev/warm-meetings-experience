/* eslint-disable @typescript-eslint/no-explicit-any */
import { masterCalendarApi } from "@/lib/master-calendar-api";
import { loadYandexMaps } from "./useYandexMaps";

export interface GeoResult {
  address: string;
  lat: number;
  lng: number;
}

// Дожидаемся загрузки ymaps (по тому же ключу, что и карта).
async function getYmaps(): Promise<any | null> {
  try {
    await loadYandexMaps();
    return (window as any).ymaps || null;
  } catch {
    return null;
  }
}

// Прямой геокодинг (адрес → координаты).
// Сначала через браузерный ymaps (JS API ключ), при неудаче — через бэкенд (HTTP Геокодер).
export async function geocodeAddress(query: string): Promise<GeoResult | null> {
  const q = query.trim();
  if (!q) return null;

  const ymaps = await getYmaps();
  if (ymaps?.geocode) {
    try {
      const res = await ymaps.geocode(q, { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) {
        const c = obj.geometry.getCoordinates();
        return { address: obj.getAddressLine(), lat: c[0], lng: c[1] };
      }
      return null;
    } catch (e) {
      console.warn("[geocode] ymaps failed, fallback to backend", e);
    }
  }

  try {
    const { results, error } = (await masterCalendarApi.geocode(q)) as any;
    if (error) console.warn("[geocode] backend error:", error);
    return results?.[0] || null;
  } catch (e) {
    console.warn("[geocode] backend failed", e);
    return null;
  }
}

// Обратный геокодинг (координаты → адрес).
export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const ymaps = await getYmaps();
  if (ymaps?.geocode) {
    try {
      const res = await ymaps.geocode([lat, lng], { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) return obj.getAddressLine();
    } catch (e) {
      console.warn("[reverseGeocode] ymaps failed", e);
    }
  }

  try {
    const { results } = await masterCalendarApi.reverseGeocode(lat, lng);
    return results?.[0]?.address;
  } catch {
    return undefined;
  }
}