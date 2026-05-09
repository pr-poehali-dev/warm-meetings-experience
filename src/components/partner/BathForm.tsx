import { useState } from "react";
import { PartnerBath, BathFormData, partnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { formatPhone } from "@/hooks/usePhoneMask";
import BathMediaUpload, { MediaItem } from "@/components/admin/BathMediaUpload";
import ExternalVideoBlock from "@/components/video/ExternalVideoBlock";

interface BathFormProps {
  bath?: PartnerBath;
  onSaved: () => void;
  onCancel: () => void;
}

const FEATURES = [
  "Парная", "Сауна", "Хамам", "Бассейн", "Купель", "Веник",
  "Массаж", "Кают-компания", "Мангал", "Бар", "Детская зона", "Парковка",
];

export default function BathForm({ bath, onSaved, onCancel }: BathFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"info" | "media" | "video">("info");
  const [savedBath, setSavedBath] = useState<PartnerBath | null>(bath || null);

  const [form, setForm] = useState<BathFormData>({
    name: bath?.name || "",
    address: bath?.address || "",
    city: bath?.city || "",
    phone: bath?.phone || "",
    website: bath?.website || "",
    description: bath?.description || "",
    price_from: bath?.price_from || 0,
    price_per_hour: bath?.price_per_hour || 0,
    capacity_min: bath?.capacity_min || 2,
    capacity_max: bath?.capacity_max || 15,
    features: bath?.features || [],
    is_active: bath?.is_active ?? true,
  });

  const set = (key: keyof BathFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFeature = (f: string) => {
    const cur = (form.features as string[]) || [];
    set("features", cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast({ title: "Укажите название бани", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (bath || savedBath) {
        const target = bath || savedBath!;
        const { bath: updated } = await partnerApi.updateBath(target.id, form);
        setSavedBath(updated);
        toast({ title: "Баня обновлена" });
        onSaved();
      } else {
        const { bath: created } = await partnerApi.createBath(form);
        setSavedBath(created);
        toast({ title: "Баня добавлена — теперь добавьте фотографии!" });
        setTab("media");
      }
    } catch (e: unknown) {
      toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Не удалось сохранить", variant: "destructive" });
    }
    setSaving(false);
  };

  const currentSlug = savedBath?.slug || bath?.slug;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {bath ? "Редактировать баню" : "Добавить баню"}
          </h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Вкладки */}
        <div className="flex gap-1 mb-4 bg-muted/60 p-1 rounded-xl w-fit">
          {[
            { id: "info", label: "Информация", icon: "FileText" },
            { id: "media", label: "Фото и видео", icon: "Image", disabled: !currentSlug },
            { id: "video", label: "Видео", icon: "Play", disabled: !currentSlug },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => !t.disabled && setTab(t.id as "info" | "media" | "video")}
              disabled={t.disabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
              {t.disabled && <span className="opacity-60">(сначала сохраните)</span>}
            </button>
          ))}
        </div>

        {/* Блок внешних видео */}
        {tab === "video" && savedBath && (
          <ExternalVideoBlock
            ownerType="bath"
            ownerId={savedBath.id}
            userToken={localStorage.getItem("user_token") || ""}
          />
        )}

        {/* Блок медиа */}
        {tab === "media" && currentSlug && (
          <BathMediaUpload
            slug={currentSlug}
            photos={((savedBath as unknown as { photos?: MediaItem[] })?.photos || []) as MediaItem[]}
            videos={((savedBath as unknown as { videos?: MediaItem[] })?.videos || []) as MediaItem[]}
            onUpdate={async () => {
              if (savedBath) {
                try {
                  const { bath: refreshed } = await partnerApi.getBath(savedBath.id);
                  setSavedBath(refreshed);
                } catch { /* ignore */ }
              }
              onSaved();
            }}
          />
        )}

        {tab === "info" && <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Название *</label>
            <input
              className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Баня у реки"
              value={form.name || ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Адрес и город */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Город</label>
              <input
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Москва"
                value={form.city || ""}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Телефон</label>
              <input
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="+7(___) ___-__-__"
                value={form.phone || ""}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Адрес</label>
            <input
              className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="ул. Берёзовая, д. 5"
              value={form.address || ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          {/* Сайт */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Сайт</label>
            <input
              className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="https://banya.ru"
              value={form.website || ""}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>

          {/* Описание */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Описание</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Расскажите о вашей бане..."
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Цены и вместимость */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Цена от (₽)</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="1500"
                value={form.price_from || ""}
                onChange={(e) => set("price_from", parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">₽/час</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="2000"
                value={form.price_per_hour || ""}
                onChange={(e) => set("price_per_hour", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Мест мин.</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.capacity_min || 2}
                onChange={(e) => set("capacity_min", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Мест макс.</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.capacity_max || 15}
                onChange={(e) => set("capacity_max", parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Особенности */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Особенности</label>
            <div className="flex flex-wrap gap-1.5">
              {FEATURES.map((f) => {
                const selected = ((form.features as string[]) || []).includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Icon name="Loader2" size={15} className="animate-spin mr-2" /> : null}
              {bath ? "Сохранить" : "Добавить баню"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Отмена
            </Button>
          </div>
        </form>}
      </CardContent>
    </Card>
  );
}