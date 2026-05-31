import { useState } from "react";
import Icon from "@/components/ui/icon";
import AddressMapPicker from "@/components/master/addresses/AddressMapPicker";
import { geocodeAddress } from "@/components/master/addresses/geocode";

export interface MeetingLocation {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  value: MeetingLocation;
  onChange: (value: MeetingLocation) => void;
}

const MeetingLocationPicker = ({ value, onChange }: Props) => {
  const [search, setSearch] = useState(value.address || "");
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    try {
      const found = await geocodeAddress(query);
      if (found) {
        onChange({ address: found.address, latitude: found.lat, longitude: found.lng });
        setSearch(found.address);
      }
    } finally {
      setSearching(false);
    }
  };

  const handlePick = (c: { lat: number; lng: number; address?: string }) => {
    onChange({
      address: c.address || value.address,
      latitude: c.lat,
      longitude: c.lng,
    });
    if (c.address) setSearch(c.address);
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Icon name="MapPin" size={16} className="text-primary mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-foreground">Где провести встречу? *</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Мастер выезжает к вам. Укажите адрес или отметьте точку на карте.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Город, улица, дом"
          className="flex-1 px-4 py-3 min-h-[48px] rounded-xl border bg-background text-base outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="shrink-0 w-12 min-h-[48px] inline-flex items-center justify-center rounded-xl border bg-background hover:bg-muted transition disabled:opacity-50"
          aria-label="Найти адрес"
        >
          {searching ? (
            <Icon name="Loader2" size={18} className="animate-spin" />
          ) : (
            <Icon name="Search" size={18} />
          )}
        </button>
      </div>

      <AddressMapPicker lat={value.latitude} lng={value.longitude} onPick={handlePick} />

      <div>
        <label className="text-xs font-medium block mb-1 text-muted-foreground">Адрес (текст)</label>
        <input
          type="text"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="ул. Ленина, 10, кв. 5"
          className="w-full px-4 py-3 rounded-xl border bg-background text-base outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
      </div>

      {value.latitude != null && value.longitude != null && (
        <p className="text-[11px] text-muted-foreground">
          Координаты: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default MeetingLocationPicker;
