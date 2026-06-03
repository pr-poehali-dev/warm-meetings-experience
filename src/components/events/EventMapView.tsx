import { useEffect, useRef } from "react";
import { useYandexMaps } from "@/components/master/addresses/useYandexMaps";
import Icon from "@/components/ui/icon";

interface Props {
  lat: number;
  lng: number;
  label?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function EventMapView({ lat, lng, label }: Props) {
  const status = useYandexMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (status !== "ready" || !containerRef.current || mapRef.current) return;
    const ymaps = (window as any).ymaps;

    const map = new ymaps.Map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      controls: ["zoomControl"],
    });
    mapRef.current = map;

    const pm = new ymaps.Placemark(
      [lat, lng],
      { balloonContent: label || "" },
      { preset: "islands#redDotIcon" }
    );
    map.geoObjects.add(pm);

    return () => {
      map.destroy();
      mapRef.current = null;
    };
  }, [status, lat, lng, label]);

  if (status === "loading") {
    return (
      <div className="h-48 rounded-xl bg-muted/40 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Icon name="Loader2" size={16} className="animate-spin" />
        Загрузка карты…
      </div>
    );
  }

  if (status === "no-key" || status === "error") return null;

  return (
    <div
      ref={containerRef}
      className="h-48 rounded-xl overflow-hidden border border-border"
    />
  );
}
