/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import AddressMapPicker from "./AddressMapPicker";
import type { AddressType, MasterAddress } from "@/lib/master-calendar-api";

export interface AddressFormData {
  address_text: string;
  address_type: AddressType;
  latitude: number | null;
  longitude: number | null;
}

const TYPE_OPTIONS: { value: AddressType; label: string }[] = [
  { value: "home", label: "Дом" },
  { value: "studio", label: "Студия" },
  { value: "partner", label: "Партнёрская баня" },
  { value: "other", label: "Другое" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: MasterAddress | null;
  saving: boolean;
  onSave: (data: AddressFormData) => void;
}

const AddressDialog = ({ open, onOpenChange, editing, saving, onSave }: Props) => {
  const [form, setForm] = useState<AddressFormData>({
    address_text: "",
    address_type: "other",
    latitude: null,
    longitude: null,
  });
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        address_text: editing?.address_text || "",
        address_type: editing?.address_type || "other",
        latitude: editing?.latitude ?? null,
        longitude: editing?.longitude ?? null,
      });
      setSearch(editing?.address_text || "");
    }
  }, [open, editing]);

  const handleSearch = () => {
    const query = search.trim();
    if (!query || !window.ymaps) return;
    setSearching(true);
    (window.ymaps as any)
      .geocode(query, { results: 1 })
      .then((res: any) => {
        const obj = res.geoObjects.get(0);
        if (obj) {
          const coords = obj.geometry.getCoordinates();
          const address = obj.getAddressLine();
          setForm((p) => ({
            ...p,
            latitude: coords[0],
            longitude: coords[1],
            address_text: address,
          }));
          setSearch(address);
        }
      })
      .finally(() => setSearching(false));
  };

  const handlePick = (c: { lat: number; lng: number; address?: string }) => {
    setForm((p) => ({
      ...p,
      latitude: c.lat,
      longitude: c.lng,
      address_text: c.address || p.address_text,
    }));
    if (c.address) setSearch(c.address);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Редактировать адрес" : "Новый адрес"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">Поиск адреса</Label>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Город, улица, дом"
              />
              <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <Icon name="Search" size={16} />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Найдите адрес или кликните точку на карте — координаты сохранятся автоматически.
            </p>
          </div>

          <AddressMapPicker lat={form.latitude} lng={form.longitude} onPick={handlePick} />

          <div>
            <Label className="mb-1 block">Адрес (текст)</Label>
            <Input
              value={form.address_text}
              onChange={(e) => setForm((p) => ({ ...p, address_text: e.target.value }))}
              placeholder="ул. Ленина, 10, Москва"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Тип</Label>
              <Select
                value={form.address_type}
                onValueChange={(v) => setForm((p) => ({ ...p, address_type: v as AddressType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Координаты</Label>
              <div className="h-10 flex items-center text-sm text-muted-foreground">
                {form.latitude != null && form.longitude != null
                  ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                  : "не заданы"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.address_text.trim()}
            className="gap-2"
          >
            {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddressDialog;
