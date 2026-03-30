import { useState, useEffect } from "react";
import { OrgEvent } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/ui/icon";
import ImageUpload from "@/components/admin/ImageUpload";

interface Props {
  initial?: Partial<OrgEvent>;
  onSave: (data: Partial<OrgEvent>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const EVENT_TYPES = [
  { value: "знакомство", label: "Знакомство", icon: "Users" },
  { value: "мужской", label: "Мужской", icon: "Shield" },
  { value: "женский", label: "Женский", icon: "Heart" },
  { value: "смешанный", label: "Смешанный", icon: "UserCheck" },
  { value: "с мастером", label: "С мастером", icon: "GraduationCap" },
  { value: "праздник", label: "Праздник", icon: "PartyPopper" },
];

const ICON_OPTIONS = ["Users","Heart","GraduationCap","Coffee","PartyPopper","Dumbbell","Sparkles","Star","Flame","Zap","Music","Leaf","Sun","Moon","Wind","Droplets","Shield","Award","Gift","Camera","UserCheck","Waves"];

const empty: Partial<OrgEvent> = {
  title: "", short_description: "", description: "",
  event_date: "", start_time: "19:00", end_time: "23:00",
  event_type: "знакомство", event_type_icon: "Users",
  bath_name: "", bath_address: "",
  price_amount: 0, price_label: "",
  total_spots: 10, spots_left: 10,
  image_url: "", is_visible: false,
  program: [], rules: [],
};

export default function OrgEventForm({ initial, onSave, onCancel, loading }: Props) {
  const [data, setData] = useState<Partial<OrgEvent>>({ ...empty, ...initial });
  const [programLine, setProgramLine] = useState("");
  const [rulesLine, setRulesLine] = useState("");

  useEffect(() => {
    setData({ ...empty, ...initial });
  }, [initial]);

  const set = (key: keyof OrgEvent, val: unknown) => setData((d) => ({ ...d, [key]: val }));

  const addProgram = () => {
    if (!programLine.trim()) return;
    set("program", [...(data.program || []), programLine.trim()]);
    setProgramLine("");
  };
  const addRules = () => {
    if (!rulesLine.trim()) return;
    set("rules", [...(data.rules || []), rulesLine.trim()]);
    setRulesLine("");
  };

  const handleSubmit = async (visible: boolean) => {
    await onSave({ ...data, is_visible: visible, spots_left: data.total_spots });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <Icon name="ArrowLeft" size={18} />
        </Button>
        <h2 className="text-xl font-bold">{data.id ? "Редактировать событие" : "Новое событие"}</h2>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Основное</div>

          <div>
            <Label>Название *</Label>
            <Input value={data.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Например: Банный вечер знакомств" />
          </div>

          <div>
            <Label>Краткое описание</Label>
            <Textarea value={data.short_description || ""} onChange={(e) => set("short_description", e.target.value)} rows={2} placeholder="Для карточки события (до 200 символов)" maxLength={200} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Дата *</Label>
              <Input type="date" value={data.event_date || ""} onChange={(e) => set("event_date", e.target.value)} />
            </div>
            <div>
              <Label>Начало</Label>
              <Input type="time" value={data.start_time || "19:00"} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div>
              <Label>Конец</Label>
              <Input type="time" value={data.end_time || "23:00"} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Тип события</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { set("event_type", t.value); set("event_type_icon", t.icon); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs transition-colors ${data.event_type === t.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                >
                  <Icon name={t.icon} size={18} fallback="Calendar" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Иконка события</Label>
            <div className="grid grid-cols-11 gap-1.5 mt-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  title={icon}
                  onClick={() => set("event_type_icon", icon)}
                  className={`flex items-center justify-center w-9 h-9 rounded border-2 transition-colors ${data.event_type_icon === icon ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                >
                  <Icon name={icon} size={16} fallback="Circle" />
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Место и цена</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Название бани</Label>
              <Input value={data.bath_name || ""} onChange={(e) => set("bath_name", e.target.value)} placeholder="Баня «Берёзка»" />
            </div>
            <div>
              <Label>Адрес</Label>
              <Input value={data.bath_address || ""} onChange={(e) => set("bath_address", e.target.value)} placeholder="ул. Пушкина, 12" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Цена (₽)</Label>
              <Input type="number" min={0} value={data.price_amount || ""} onChange={(e) => { const v = Number(e.target.value); set("price_amount", v); set("price_label", v ? `${v} ₽` : ""); set("price", v ? `${v} ₽` : ""); }} placeholder="0" />
            </div>
            <div>
              <Label>Метка цены</Label>
              <Input value={data.price_label || ""} onChange={(e) => set("price_label", e.target.value)} placeholder="1500 ₽ / вечер" />
            </div>
            <div>
              <Label>Мест всего</Label>
              <Input type="number" min={1} value={data.total_spots || ""} onChange={(e) => set("total_spots", Number(e.target.value))} placeholder="10" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Программа и правила</div>

          <div>
            <Label>Полное описание</Label>
            <Textarea value={data.description || ""} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="Подробное описание события..." />
          </div>

          <div>
            <Label>Программа</Label>
            <div className="space-y-2">
              {(data.program || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded-md">{item}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => set("program", (data.program || []).filter((_, j) => j !== i))}>
                    <Icon name="X" size={12} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={programLine} onChange={(e) => setProgramLine(e.target.value)} placeholder="Добавить пункт программы" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProgram())} />
                <Button type="button" variant="outline" size="icon" onClick={addProgram}><Icon name="Plus" size={16} /></Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Правила</Label>
            <div className="space-y-2">
              {(data.rules || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded-md">{item}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => set("rules", (data.rules || []).filter((_, j) => j !== i))}>
                    <Icon name="X" size={12} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={rulesLine} onChange={(e) => setRulesLine(e.target.value)} placeholder="Добавить правило" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRules())} />
                <Button type="button" variant="outline" size="icon" onClick={addRules}><Icon name="Plus" size={16} /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Фото</div>
          <ImageUpload
            value={data.image_url || ""}
            onChange={(url) => set("image_url", url)}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 pb-6">
        <Button onClick={() => handleSubmit(true)} disabled={loading || !data.title || !data.event_date} className="gap-2">
          {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Globe" size={16} />}
          Опубликовать
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={loading || !data.title || !data.event_date}>
          Сохранить черновик
        </Button>
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}
