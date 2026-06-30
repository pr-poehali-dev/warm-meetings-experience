 
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
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import AddressMapPicker from "./AddressMapPicker";
import { geocodeAddress } from "./geocode";
import type { AddressType, MasterAddress } from "@/lib/master-calendar-api";

export interface AddressFormData {
  address_text: string;
  address_type: AddressType;
  latitude: number | null;
  longitude: number | null;
  label: string;
  color: string;
  is_primary: boolean;
}

const TYPE_OPTIONS: { value: AddressType; label: string }[] = [
  { value: "home", label: "Дом" },
  { value: "studio", label: "Студия" },
  { value: "partner", label: "Партнёрская баня" },
  { value: "other", label: "Другое" },
];

const COLOR_OPTIONS = [
  { value: "#22c55e", label: "Зелёный" },
  { value: "#3b82f6", label: "Синий" },
  { value: "#f59e0b", label: "Оранжевый" },
  { value: "#ef4444", label: "Красный" },
  { value: "#a855f7", label: "Фиолетовый" },
  { value: "#14b8a6", label: "Бирюзовый" },
  { value: "#ec4899", label: "Розовый" },
  { value: "#6b7280", label: "Серый" },
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
    label: "",
    color: "",
    is_primary: false,
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
        label: editing?.label || "",
        color: editing?.color || "",
        is_primary: editing?.is_primary ?? false,
      });
      setSearch(editing?.address_text || "");
    }
  }, [open, editing]);

  const handleSearch = async () => {
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    try {
      const found = await geocodeAddress(query);
      if (found) {
        setForm((p) => ({
          ...p,
          latitude: found.lat,
          longitude: found.lng,
          address_text: found.address,
        }));
        setSearch(found.address);
      }
    } finally {
      setSearching(false);
    }
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
            <Label className="mb-1 block">Короткое название</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Например: Студия в центре"
              maxLength={60}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Так адрес будет отображаться в списках и расписании.
            </p>
          </div>

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

          <div>
            <Label className="mb-1.5 block">Цвет метки</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => {
                const active = form.color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() =>
                      setForm((p) => ({ ...p, color: active ? "" : c.value }))
                    }
                    className={`w-8 h-8 rounded-full transition-transform ${
                      active ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {active && <Icon name="Check" size={16} className="text-white mx-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg border border-border px-3 py-2.5">
            <Checkbox
              checked={form.is_primary}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_primary: v === true }))}
            />
            <div>
              <span className="text-sm font-medium">Основной адрес</span>
              <p className="text-[11px] text-muted-foreground">
                Используется по умолчанию при записи и в расписании.
              </p>
            </div>
          </label>
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