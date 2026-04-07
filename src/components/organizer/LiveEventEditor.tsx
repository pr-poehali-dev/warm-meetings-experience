import { useState, useRef, useEffect } from "react";
import { OrgEvent, PricingTier } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { format, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { getTypeColors } from "@/data/events";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import PricingTiersEditor from "@/components/admin/PricingTiersEditor";

/* ─── helpers ─── */

const BASE_EVENT_TYPES = [
  { value: "знакомство", label: "Знакомство", icon: "Users" },
  { value: "свидание", label: "Свидание", icon: "Heart" },
  { value: "обучение", label: "Обучение", icon: "GraduationCap" },
  { value: "встреча", label: "Встреча", icon: "Coffee" },
  { value: "вечеринка", label: "Вечеринка", icon: "PartyPopper" },
  { value: "спорт", label: "Спорт", icon: "Dumbbell" },
  { value: "другое", label: "Другое", icon: "Circle" },
];

function spotsColor(left: number) {
  if (left === 0) return "text-red-600 bg-red-50";
  if (left <= 2) return "text-orange-600 bg-orange-50";
  return "text-green-600 bg-green-50";
}

/* ─── inline editable text ─── */

interface InlineTextProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  inputClassName?: string;
  hint?: string;
}

function InlineText({ value, onChange, placeholder, className = "", multiline, maxLength, inputClassName = "", hint }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (editing) {
    const sharedProps = {
      ref,
      value,
      maxLength,
      className: `w-full bg-white/90 border-2 border-primary/60 rounded-md px-2 py-1 outline-none focus:border-primary shadow-sm ${inputClassName}`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      onBlur: () => setEditing(false),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); setEditing(false); }
        if (e.key === "Escape") setEditing(false);
      },
    };
    return (
      <div className="relative">
        {multiline
          ? <textarea {...sharedProps} rows={4} />
          : <input {...sharedProps} type="text" />
        }
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Нажмите, чтобы изменить"
      className={`group relative cursor-text rounded-md transition-all hover:ring-2 hover:ring-primary/30 hover:bg-primary/5 ${className}`}
    >
      {value
        ? <span>{value}</span>
        : <span className="text-muted-foreground/60 italic">{placeholder}</span>
      }
      <Icon
        name="Pencil"
        size={11}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-60 text-primary transition-opacity"
      />
    </div>
  );
}

/* ─── inline list editor (program / rules) ─── */

function InlineList({ items, onChange, placeholder, icon }: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  icon: string;
}) {
  const [editing, setEditing] = useState(false);
  const text = items.filter(Boolean).join("\n");

  if (editing) {
    return (
      <div>
        <Textarea
          autoFocus
          defaultValue={text}
          rows={5}
          className="text-sm"
          placeholder={placeholder}
          onBlur={(e) => { onChange(e.target.value.split("\n").filter(Boolean)); setEditing(false); }}
        />
        <p className="text-xs text-muted-foreground mt-1">Каждый пункт с новой строки. Кликните вне поля — сохранит.</p>
      </div>
    );
  }

  if (!items.filter(Boolean).length) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground/60 italic hover:text-primary transition-colors flex items-center gap-1.5 py-1"
      >
        <Icon name="Plus" size={13} />
        {placeholder}
      </button>
    );
  }

  return (
    <div className="group cursor-text rounded-md hover:bg-primary/5 hover:ring-2 hover:ring-primary/30 transition-all p-1 -m-1" onClick={() => setEditing(true)}>
      <div className="space-y-1.5">
        {items.filter(Boolean).map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              {icon === "num"
                ? <span className="text-xs font-medium text-accent">{i + 1}</span>
                : <Icon name={icon} size={11} className="text-accent" />
              }
            </div>
            <span className="text-xs text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-60 transition-opacity">
        <Icon name="Pencil" size={11} className="text-primary" />
        <span className="text-xs text-primary">Редактировать</span>
      </div>
    </div>
  );
}

/* ─── pricing lines editor ─── */

function InlinePricingLines({ lines, onChange }: { lines: string[]; onChange: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const text = lines.filter(Boolean).join("\n");

  if (editing) {
    return (
      <div>
        <Textarea
          autoFocus
          defaultValue={text}
          rows={4}
          className="text-sm"
          placeholder={"5 000 ₽ — ранняя бронь\n6 000 ₽ — обычная цена"}
          onBlur={(e) => { onChange(e.target.value.split("\n")); setEditing(false); }}
        />
        <p className="text-xs text-muted-foreground mt-1">Каждая строка — отдельный пункт стоимости.</p>
      </div>
    );
  }

  if (!lines.filter(Boolean).length) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground/60 italic hover:text-primary transition-colors flex items-center gap-1.5">
        <Icon name="Plus" size={13} /> Добавить описание стоимости
      </button>
    );
  }

  return (
    <div className="group cursor-text rounded hover:bg-primary/5 hover:ring-2 hover:ring-primary/30 transition-all p-1 -m-1" onClick={() => setEditing(true)}>
      <ul className="space-y-1">
        {lines.filter(Boolean).map((line, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm text-foreground">
            <span className="flex-shrink-0">🔹</span><span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-60 transition-opacity">
        <Icon name="Pencil" size={11} className="text-primary" />
        <span className="text-xs text-primary">Редактировать</span>
      </div>
    </div>
  );
}

/* ─── main component ─── */

interface Props {
  formData: OrgEvent;
  loading: boolean;
  onFormChange: (data: OrgEvent) => void;
  onSubmit: (e: React.FormEvent, saveAndNew?: boolean) => void;
  onCancel: () => void;
}

export default function LiveEventEditor({ formData: fd, loading, onFormChange, onSubmit, onCancel }: Props) {
  const { toast } = useToast();
  const isEditing = Boolean(fd.id);

  const set = (patch: Partial<OrgEvent>) => onFormChange({ ...fd, ...patch });

  const typeColors = getTypeColors(fd.event_type || "знакомство");
  const typeIcon = fd.event_type_icon || "Users";
  const typeLabel = fd.event_type || "знакомство";

  const hasDate = fd.event_date && fd.event_date.length >= 10;
  let dateObj: Date | null = null;
  if (hasDate) {
    try { const d = parseISO(fd.event_date); if (isValid(d)) dateObj = d; } catch (_) { /* ignore */ }
  }

  const spotsLeft = fd.spots_left ?? 0;
  const totalSpots = fd.total_spots ?? 0;
  const priceDisplay = fd.price_label || (fd.price_amount ? `${fd.price_amount.toLocaleString("ru-RU")} ₽` : "");

  const handleSaveAsDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    set({ is_visible: false });
    setTimeout(() => onSubmit(e as unknown as React.FormEvent, false), 0);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!fd.title?.trim()) { toast({ title: "Укажите название встречи", variant: "destructive" }); return; }
    if (!fd.event_date) { toast({ title: "Укажите дату встречи", variant: "destructive" }); return; }
    set({ is_visible: true });
    setTimeout(() => onSubmit(e as unknown as React.FormEvent, false), 0);
  };

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); onSubmit(e, false); };

  /* ── image section ── */
  const [showImageUpload, setShowImageUpload] = useState(false);

  /* ── type selector ── */
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  /* ── pricing type ── */
  const [showPricingPanel, setShowPricingPanel] = useState(false);

  return (
    <form onSubmit={handleSave} className="pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <h1 className="text-xl font-bold">{isEditing ? "Редактировать встречу" : "Новая встреча"}</h1>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="MousePointer" size={13} />
          Кликайте на текст, чтобы редактировать
        </div>
      </div>

      {/* ── HERO IMAGE ── */}
      <div className="relative mb-0 rounded-t-2xl overflow-hidden bg-muted group"
        style={{ minHeight: fd.image_url ? undefined : "180px" }}
      >
        {fd.image_url ? (
          <>
            <img src={fd.image_url} alt="" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <div className="w-full h-44 flex flex-col items-center justify-center gap-2 bg-muted">
            <Icon name="Image" size={36} className="text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">Нажмите, чтобы добавить обложку</span>
          </div>
        )}

        {/* Overlay type badge — кликабельный */}
        <div className="absolute top-3 left-3">
          <button
            type="button"
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${typeColors.bg} ${typeColors.color} flex items-center gap-1 hover:opacity-80 transition-opacity`}
          >
            <Icon name={typeIcon} size={12} />
            {typeLabel}
            <Icon name="ChevronDown" size={11} className="ml-0.5" />
          </button>
        </div>

        {/* image change button */}
        <button
          type="button"
          onClick={() => setShowImageUpload(!showImageUpload)}
          className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
        >
          <Icon name="Camera" size={13} />
          {fd.image_url ? "Сменить фото" : "Добавить фото"}
        </button>
      </div>

      {/* Type selector dropdown */}
      {showTypeSelector && (
        <div className="border rounded-b-lg bg-background shadow-md p-3 mb-0 z-10 relative">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Тип мероприятия</p>
          <div className="flex flex-wrap gap-2">
            {BASE_EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { set({ event_type: t.value, event_type_icon: t.icon }); setShowTypeSelector(false); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${fd.event_type === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >
                <Icon name={t.icon} size={13} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image upload panel */}
      {showImageUpload && (
        <div className="border rounded-lg p-4 mb-3 bg-background shadow-sm">
          <ImageUpload
            currentImageUrl={fd.image_url}
            onImageUploaded={(url) => { set({ image_url: url }); setShowImageUpload(false); }}
          />
        </div>
      )}

      {/* ── CARD BODY ── */}
      <div className="border border-t-0 rounded-b-2xl bg-card px-5 pt-4 pb-5 space-y-4 mb-4">

        {/* Date & time row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <Icon name="Calendar" size={14} />
            <input
              type="date"
              value={fd.event_date || ""}
              onChange={(e) => set({ event_date: e.target.value })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors focus:text-foreground [color-scheme:light]"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Icon name="Clock" size={14} />
            <input
              type="time"
              value={fd.start_time || ""}
              onChange={(e) => set({ start_time: e.target.value })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors w-20"
            />
            <span className="text-muted-foreground/50">—</span>
            <input
              type="time"
              value={fd.end_time || ""}
              onChange={(e) => set({ end_time: e.target.value })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors w-20"
            />
          </label>
          {dateObj && (
            <span className="text-xs text-muted-foreground/60 hidden sm:inline">
              {format(dateObj, "EEEE", { locale: ru })}
            </span>
          )}
        </div>

        {/* Title */}
        <InlineText
          value={fd.title}
          onChange={(v) => set({ title: v })}
          placeholder="Название встречи"
          className="text-xl font-bold leading-snug"
          maxLength={255}
        />

        {/* Short description */}
        <InlineText
          value={fd.short_description}
          onChange={(v) => set({ short_description: v })}
          placeholder="Краткое описание — его увидят в карточке каталога"
          className="text-sm text-muted-foreground leading-relaxed"
          multiline
          maxLength={200}
          hint="Привлеките внимание кратким описанием"
        />

        {/* Location */}
        <div className="flex items-start gap-2">
          <Icon name="MapPin" size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <InlineText
              value={fd.bath_name || ""}
              onChange={(v) => set({ bath_name: v })}
              placeholder="Название места"
              className="text-sm font-medium"
              maxLength={255}
            />
            <InlineText
              value={fd.bath_address || ""}
              onChange={(v) => set({ bath_address: v })}
              placeholder="Адрес"
              className="text-xs text-muted-foreground"
              maxLength={500}
            />
          </div>
        </div>

        {/* Spots */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Icon name="Users" size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Мест:</span>
            <input
              type="number"
              value={totalSpots || ""}
              onChange={(e) => { const v = parseInt(e.target.value) || 0; set({ total_spots: v, spots_left: Math.min(fd.spots_left || v, v) }); }}
              className="w-14 text-sm font-medium bg-transparent border-b border-dashed border-muted-foreground/30 outline-none text-center hover:border-primary focus:border-primary transition-colors"
              placeholder="∞"
            />
          </div>
          {totalSpots > 0 && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${spotsColor(spotsLeft)}`}>
              {spotsLeft === 0 ? "Мест нет" : spotsLeft <= 2 ? `Последние ${spotsLeft}` : `Осталось ${spotsLeft}`}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Full description */}
        <div>
          <h3 className="font-semibold text-sm mb-2">О встрече</h3>
          <InlineText
            value={fd.full_description || ""}
            onChange={(v) => set({ full_description: v })}
            placeholder="Полное описание — расскажите, что ждёт участников, какая атмосфера…"
            className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
            multiline
            inputClassName="text-sm leading-relaxed"
          />
        </div>

        {/* Program */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Программа</h3>
          <InlineList
            items={fd.program || []}
            onChange={(v) => set({ program: v })}
            placeholder="Добавить программу (расписание по пунктам)"
            icon="num"
          />
        </div>

        {/* Rules */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Правила</h3>
          <InlineList
            items={fd.rules || []}
            onChange={(v) => set({ rules: v })}
            placeholder="Добавить правила участия"
            icon="Shield"
          />
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* ── PRICING BLOCK ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Стоимость</h3>
            <button
              type="button"
              onClick={() => setShowPricingPanel(!showPricingPanel)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="Settings" size={12} />
              Настроить
            </button>
          </div>

          {showPricingPanel && (
            <div className="border rounded-lg p-4 bg-muted/30 mb-3 space-y-3">
              {/* pricing type toggle */}
              <div className="flex gap-2">
                {["fixed", "dynamic"].map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => set({ pricing_type: pt as "fixed" | "dynamic" })}
                    className={`flex-1 py-2 px-3 rounded border text-xs font-medium transition-colors ${(fd.pricing_type || "fixed") === pt ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
                  >
                    <Icon name={pt === "fixed" ? "DollarSign" : "TrendingUp"} size={12} className="inline mr-1" />
                    {pt === "fixed" ? "Фиксированная" : "Динамическая"}
                  </button>
                ))}
              </div>

              {(fd.pricing_type || "fixed") === "fixed" ? (
                <div className="space-y-3">
                  <InlinePricingLines
                    lines={fd.pricing_lines || []}
                    onChange={(v) => set({ pricing_lines: v })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Цена, ₽ (число)</label>
                      <Input
                        type="number"
                        value={fd.price_amount || ""}
                        onChange={(e) => set({ price_amount: parseInt(e.target.value) || 0 })}
                        className="h-8 text-sm"
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Отображение цены</label>
                      <Input
                        value={fd.price_label || ""}
                        onChange={(e) => set({ price_label: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="от 5 000 ₽"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <PricingTiersEditor
                  tiers={fd.pricing_tiers || []}
                  onChange={(tiers: PricingTier[]) => set({ pricing_tiers: tiers })}
                />
              )}
            </div>
          )}

          {/* price display in card */}
          {fd.pricing_type === "dynamic" && fd.pricing_tiers?.length ? (
            <div className="space-y-1">
              {fd.pricing_tiers.map((tier, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tier.label}</span>
                  <span className="font-semibold text-accent">{tier.price_amount.toLocaleString("ru-RU")} ₽</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {priceDisplay
                ? <div className="text-2xl font-bold text-accent">{priceDisplay}</div>
                : <button type="button" onClick={() => setShowPricingPanel(true)} className="text-sm text-muted-foreground/60 italic hover:text-primary transition-colors">Нажмите «Настроить», чтобы указать стоимость</button>
              }
              {(fd.pricing_lines || []).filter(Boolean).length > 0 && (
                <InlinePricingLines
                  lines={fd.pricing_lines || []}
                  onChange={(v) => set({ pricing_lines: v })}
                />
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* ── PUBLISH SETTINGS ── */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Публикация</h3>

          {/* visibility toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${fd.is_visible ? "border-green-200 bg-green-50" : "border-border bg-muted/30"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${fd.is_visible ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                <Icon name={fd.is_visible ? "Eye" : "EyeOff"} size={16} />
              </div>
              <div>
                <p className="font-medium text-sm">{fd.is_visible ? "Опубликовано" : "Черновик"}</p>
                <p className="text-xs text-muted-foreground">{fd.is_visible ? "Видно всем посетителям" : "Только вы видите встречу"}</p>
              </div>
            </div>
            <Switch
              checked={fd.is_visible}
              onCheckedChange={(v) => set({ is_visible: v })}
            />
          </div>

          {/* featured + occupancy row */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fd.featured || false}
                onChange={(e) => set({ featured: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Избранное</span>
              <span className="text-xs text-muted-foreground">— выделить на главной</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Загруженность:</span>
              <Select value={fd.occupancy || "low"} onValueChange={(v) => set({ occupancy: v })}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкая</SelectItem>
                  <SelectItem value="medium">Средняя</SelectItem>
                  <SelectItem value="high">Высокая</SelectItem>
                  <SelectItem value="full">Полная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Отмена
          </Button>
          {isEditing ? (
            <Button type="submit" disabled={loading}>
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Сохранение...</> : "Сохранить"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleSaveAsDraft} disabled={loading}>
                {loading
                  ? <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Сохранение...</>
                  : <><Icon name="FileEdit" size={16} className="mr-2" />Черновик</>
                }
              </Button>
              <Button type="button" onClick={handlePublish} disabled={loading}>
                {loading
                  ? <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Публикация...</>
                  : <><Icon name="Globe" size={16} className="mr-2" />Опубликовать</>
                }
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
