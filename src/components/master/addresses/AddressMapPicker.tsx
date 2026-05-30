/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { useYandexMaps } from "./useYandexMaps";
import Icon from "@/components/ui/icon";

interface Props {
  lat?: number | null;
  lng?: number | null;
  onPick: (coords: { lat: number; lng: number; address?: string }) => void;
}

const DEFAULT_CENTER = [55.751244, 37.618423]; // Москва

const AddressMapPicker = ({ lat, lng, onPick }: Props) => {
  const status = useYandexMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (status !== "ready" || !containerRef.current || mapRef.current) return;
    const ymaps = window.ymaps as any;

    const center =
      lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;

    const map = new ymaps.Map(containerRef.current, {
      center,
      zoom: lat != null && lng != null ? 16 : 10,
      controls: ["zoomControl", "geolocationControl"],
    });
    mapRef.current = map;

    const reverseGeocode = (coords: number[]) => {
      ymaps.geocode(coords, { results: 1 }).then((res: any) => {
        const obj = res.geoObjects.get(0);
        const address = obj ? obj.getAddressLine() : undefined;
        onPickRef.current({ lat: coords[0], lng: coords[1], address });
      }).catch(() => {
        onPickRef.current({ lat: coords[0], lng: coords[1] });
      });
    };

    const setPlacemark = (coords: number[]) => {
      if (placemarkRef.current) {
        placemarkRef.current.geometry.setCoordinates(coords);
      } else {
        const pm = new ymaps.Placemark(coords, {}, {
          draggable: true,
          preset: "islands#redDotIcon",
        });
        pm.events.add("dragend", () => {
          const c = pm.geometry.getCoordinates();
          reverseGeocode(c);
        });
        map.geoObjects.add(pm);
        placemarkRef.current = pm;
      }
    };

    if (lat != null && lng != null) setPlacemark([lat, lng]);

    map.events.add("click", (e: any) => {
      const coords = e.get("coords");
      setPlacemark(coords);
      reverseGeocode(coords);
    });

    return () => {
      map.destroy();
      mapRef.current = null;
      placemarkRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Поиск адреса извне (через searchByAddress)
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    if (lat == null || lng == null) return;
    const coords = [lat, lng];
    mapRef.current.setCenter(coords, 16);
    const ymaps = window.ymaps as any;
    if (placemarkRef.current) {
      placemarkRef.current.geometry.setCoordinates(coords);
    } else {
      const pm = new ymaps.Placemark(coords, {}, {
        draggable: true,
        preset: "islands#redDotIcon",
      });
      pm.events.add("dragend", () => {
        const c = pm.geometry.getCoordinates();
        ymaps.geocode(c, { results: 1 }).then((res: any) => {
          const obj = res.geoObjects.get(0);
          onPickRef.current({ lat: c[0], lng: c[1], address: obj ? obj.getAddressLine() : undefined });
        });
      });
      mapRef.current.geoObjects.add(pm);
      placemarkRef.current = pm;
    }
     
  }, [lat, lng, status]);

  if (status === "loading") {
    return (
      <div className="h-64 rounded-xl bg-muted/40 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Icon name="Loader2" size={18} className="animate-spin" />
        Загрузка карты…
      </div>
    );
  }

  if (status === "no-key" || status === "error") {
    return (
      <div className="h-64 rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-2 px-4">
        <Icon name="MapPinOff" size={22} className="text-muted-foreground" />
        <span>
          {status === "no-key"
            ? "Карта пока недоступна — не подключён ключ Яндекс.Карт. Координаты можно ввести вручную."
            : "Не удалось загрузить карту. Координаты можно ввести вручную."}
        </span>
      </div>
    );
  }

  return <div ref={containerRef} className="h-64 rounded-xl overflow-hidden border border-border" />;
};

export default AddressMapPicker;