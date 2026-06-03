import { useState } from "react";
import Icon from "@/components/ui/icon";
import AddressMapPicker from "@/components/master/addresses/AddressMapPicker";
import { geocodeAddress } from "@/components/master/addresses/geocode";
import func2url from "../../../../backend/func2url.json";
import { authenticatedRequest } from "@/lib/http";

const EVENTS_API = func2url["events-api"];

interface Props {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  eventId?: number | null;
  onChange: (data: { address: string; latitude: number | null; longitude: number | null }) => void;
  onClose: () => void;
}

export default function EventLocationPicker({ address, latitude, longitude, eventId, onChange, onClose }: Props) {
  const [search, setSearch] = useState(address || "");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveCoords = async (lat: number | null, lng: number | null) => {
    if (!eventId || lat == null || lng == null) return;
    setSaving(true);
    try {
      await authenticatedRequest(`${EVENTS_API}/?resource=events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, latitude: lat, longitude: lng }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // тихая ошибка — координаты всё равно записаны в fd
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    try {
      const found = await geocodeAddress(q);
      if (found) {
        onChange({ address: found.address, latitude: found.lat, longitude: found.lng });
        setSearch(found.address);
        await saveCoords(found.lat, found.lng);
      }
    } finally {
      setSearching(false);
    }
  };

  const handlePick = async (c: { lat: number; lng: number; address?: string }) => {
    const newAddress = c.address || search;
    onChange({ address: newAddress, latitude: c.lat, longitude: c.lng });
    if (c.address) setSearch(c.address);
    await saveCoords(c.lat, c.lng);
  };

  return (
    <div className="border border-border rounded-xl bg-background shadow-sm p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon name="MapPin" size={14} className="text-primary" />
          Геопозиция на карте
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={15} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          placeholder="Поиск адреса…"
          className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="w-9 h-9 flex items-center justify-center rounded-lg border bg-background hover:bg-muted transition disabled:opacity-50"
        >
          {searching
            ? <Icon name="Loader2" size={15} className="animate-spin" />
            : <Icon name="Search" size={15} />
          }
        </button>
      </div>

      <AddressMapPicker lat={latitude} lng={longitude} onPick={handlePick} />

      {latitude != null && longitude != null && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {saving ? (
            <Icon name="Loader2" size={12} className="animate-spin text-muted-foreground" />
          ) : saved ? (
            <Icon name="CheckCircle2" size={12} className="text-green-500" />
          ) : (
            <Icon name="CheckCircle" size={12} className="text-green-500" />
          )}
          {saving ? "Сохранение…" : saved ? "Сохранено!" : `Метка: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        </p>
      )}
    </div>
  );
}