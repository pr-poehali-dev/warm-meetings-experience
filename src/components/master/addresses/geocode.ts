/* eslint-disable @typescript-eslint/no-explicit-any */
import { masterCalendarApi } from "@/lib/master-calendar-api";

export interface GeoResult {
  address: string;
  lat: number;
  lng: number;
}

// Прямой геокодинг (адрес → координаты).
// Сначала через браузерный ymaps (JS API ключ), при неудаче — через бэкенд (HTTP Геокодер).
export async function geocodeAddress(query: string): Promise<GeoResult | null> {
  const q = query.trim();
  if (!q) return null;

  const ymaps = (window as any).ymaps;
  if (ymaps?.geocode) {
    try {
      const res = await ymaps.geocode(q, { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) {
        const c = obj.geometry.getCoordinates();
        return { address: obj.getAddressLine(), lat: c[0], lng: c[1] };
      }
    } catch {
      // переходим к бэкенду
    }
  }

  try {
    const { results } = await masterCalendarApi.geocode(q);
    return results[0] || null;
  } catch {
    return null;
  }
}

// Обратный геокодинг (координаты → адрес).
export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const ymaps = (window as any).ymaps;
  if (ymaps?.geocode) {
    try {
      const res = await ymaps.geocode([lat, lng], { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) return obj.getAddressLine();
    } catch {
      // переходим к бэкенду
    }
  }

  try {
    const { results } = await masterCalendarApi.reverseGeocode(lat, lng);
    return results[0]?.address;
  } catch {
    return undefined;
  }
}
