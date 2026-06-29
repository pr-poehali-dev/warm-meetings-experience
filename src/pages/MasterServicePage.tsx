import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { masterCalendarApi, MasterService, ServiceFormat } from "@/lib/master-calendar-api";
import { parseServiceDescription, buildServiceDescription } from "@/lib/service-description";
import { toast } from "sonner";
import MasterBookingFlow, { BookingOption } from "@/components/masters/MasterBookingFlow";
import { BookingModal, BookingSuccess } from "@/components/masters/BookingModal";
import PageShell from "@/components/ui/page-shell";

/* ─── Константы ──────────────────────────────────────────────────── */

const FORMAT_META: Record<string, { emoji: string; label: string; color: string }> = {
  on_site:      { emoji: "🏠", label: "На месте у мастера", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  at_home:      { emoji: "🚗", label: "Выезд к гостю",      color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  by_agreement: { emoji: "🤝", label: "По согласованию",    color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
};

const STEP_ICONS = ["Sparkles","HandHeart","Flame","Droplets","Star","Leaf","Wind","Sun","Moon","Heart"];

/* ─── Утилиты ────────────────────────────────────────────────────── */

function fmtPrice(n: number) { return n.toLocaleString("ru-RU") + " ₽"; }
function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
function getVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let vid = u.searchParams.get("v");
      if (!vid && u.hostname === "youtu.be") vid = u.pathname.slice(1);
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (u.hostname.includes("rutube.ru")) {
      const m = u.pathname.match(/video\/([a-f0-9]+)/i);
      if (m) return `https://rutube.ru/play/embed/${m[1]}`;
    }
  } catch { /* ignore */ }
  return null;
}

/* ─── Шаги «Как проходит» (хранятся в rich_description как JSON-массив) ── */

interface Step { title: string; desc: string; icon: string; }

function parseSteps(raw: string | null | undefined): Step[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as Step[];
      if (Array.isArray(arr)) return arr;
    } catch { /* fall through */ }
  }
  return [];
}

function serializeSteps(steps: Step[]): string {
  return JSON.stringify(steps);
}

/* ─── Редактируемое поле ─────────────────────────────────────────── */

interface EditableFieldProps {
  value: string;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  onSave: (v: string) => void;
  editMode: boolean;
  inputType?: string;
  suffix?: string;
  light?: boolean;
}

function EditableField({ value, placeholder, multiline, className = "", onSave, editMode, inputType = "text", suffix, light }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editMode) {
    return (
      <span className={className}>
        {value ? <>{value}{suffix && <span className="opacity-50"> {suffix}</span>}</> : <span className="opacity-30 italic">{placeholder}</span>}
      </span>
    );
  }

  if (editing) {
    const cls = light
      ? `w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/50 resize-none text-white placeholder:text-white/40 ${className}`
      : `w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground placeholder:text-muted-foreground/50 ${className}`;
    const props = {
      ref, value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: () => { setEditing(false); onSave(draft); },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); setEditing(false); onSave(draft); }
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
      },
      className: cls, placeholder,
    };
    return multiline ? <textarea {...props} rows={3} /> : <input {...props} type={inputType} />;
  }

  return (
    <span className={`cursor-text group relative ${className}`} onClick={() => setEditing(true)} title="Нажмите чтобы изменить">
      {value ? <>{value}{suffix && <span className="opacity-50"> {suffix}</span>}</> : <span className="opacity-30 italic">{placeholder}</span>}
      <span className="ml-1 inline-flex opacity-0 group-hover:opacity-100 transition"><Icon name="Pencil" size={11} className="text-amber-400" /></span>
    </span>
  );
}

/* ─── Редактируемый список ───────────────────────────────────────── */

interface EditableListProps {
  items: string[];
  placeholder: string;
  editMode: boolean;
  onChange: (items: string[]) => void;
  icon: string;
  iconColor: string;
}

function EditableList({ items, placeholder, editMode, onChange, icon, iconColor }: EditableListProps) {
  const [newItem, setNewItem] = useState("");
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => { const t = newItem.trim(); if (!t) return; onChange([...items, t]); setNewItem(""); };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 group">
          <Icon name={icon as "Check"} size={15} className={`${iconColor} mt-0.5 shrink-0`} />
          <span className="text-sm text-muted-foreground flex-1 leading-relaxed">{item}</span>
          {editMode && (
            <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 shrink-0 transition">
              <Icon name="X" size={12} />
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="flex-1 bg-muted/60 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/50"
          />
          <button onClick={add} disabled={!newItem.trim()}
            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg transition disabled:opacity-40">
            <Icon name="Plus" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Редактор шагов «Как проходит» ─────────────────────────────── */

interface StepsEditorProps {
  steps: Step[];
  editMode: boolean;
  onChange: (steps: Step[]) => void;
}

function StepsEditor({ steps, editMode, onChange }: StepsEditorProps) {
  const updateStep = (i: number, field: keyof Step, val: string) =>
    onChange(steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeStep = (i: number) => onChange(steps.filter((_, idx) => idx !== i));
  const addStep = () => onChange([...steps, { title: "", desc: "", icon: STEP_ICONS[steps.length % STEP_ICONS.length] }]);

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="relative flex gap-5 group">
          {/* Вертикальная линия */}
          {i < steps.length - 1 && (
            <div className="absolute left-5 top-11 bottom-0 w-px bg-border/50" />
          )}
          {/* Иконка */}
          {editMode ? (
            <select value={step.icon} onChange={(e) => updateStep(i, "icon", e.target.value)}
              className="w-10 h-10 mt-1 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-center text-xs outline-none cursor-pointer">
              {STEP_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          ) : (
            <div className="w-10 h-10 mt-1 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon name={step.icon as "Star"} size={18} className="text-primary" />
            </div>
          )}
          {/* Контент шага */}
          <div className="flex-1 pb-8">
            {editMode ? (
              <>
                <input value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)}
                  placeholder={`Шаг ${i + 1} — название`}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 mb-2 text-foreground" />
                <textarea value={step.desc} onChange={(e) => updateStep(i, "desc", e.target.value)}
                  placeholder="Краткое описание шага..." rows={2}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground placeholder:text-muted-foreground/50" />
                <button onClick={() => removeStep(i)}
                  className="mt-1.5 opacity-0 group-hover:opacity-100 transition text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <Icon name="Trash2" size={11} /> Удалить шаг
                </button>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-foreground mb-1 mt-1.5">{step.title || `Шаг ${i + 1}`}</div>
                {step.desc && <div className="text-sm text-muted-foreground leading-relaxed">{step.desc}</div>}
              </>
            )}
          </div>
        </div>
      ))}
      {editMode && (
        <button onClick={addStep}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition px-4 py-2.5 rounded-xl border border-dashed border-primary/30 hover:border-primary/50 w-full justify-center">
          <Icon name="Plus" size={14} /> Добавить шаг
        </button>
      )}
    </div>
  );
}

/* ─── Главный компонент ──────────────────────────────────────────── */

export default function MasterServicePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { user, hasRole } = useAuth();

  const [service, setService] = useState<MasterService | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editMode, setEditMode] = useState(true);

  const [included, setIncluded] = useState<string[]>([]);
  const [bring, setBring] = useState<string[]>([]);
  const [contraindications, setContraindications] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);

  const [bookingState, setBookingState] = useState<{ option: BookingOption; service: MasterService } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingChatToken, setBookingChatToken] = useState<string | undefined>();
  const [bookingClientEmail, setBookingClientEmail] = useState<string | undefined>();
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0);

  const calendarRef = useRef<HTMLDivElement>(null);

  const scrollToCalendar = () => {
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBookSuccess = (chatToken?: string, clientEmail?: string) => {
    setBookingState(null);
    setBookingChatToken(chatToken);
    setBookingClientEmail(clientEmail);
    setBookingSuccess(true);
    setBookingRefreshKey((k) => k + 1);
  };

  const canEdit = hasRole("parmaster") && !!user && !!service &&
    service.master_user_id != null && service.master_user_id === user.id;
  const isOwner = canEdit && editMode;

  useEffect(() => {
    if (!id) return;
    masterCalendarApi.getServiceDetail(Number(id))
      .then((s) => {
        setService(s);
        const parsed = parseServiceDescription(s.description);
        setIncluded(parsed.included);
        setBring(parsed.bring);
        setContraindications(parsed.contraindications);
        setSteps(parseSteps(s.rich_description));
      })
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [id]);

  const updateField = (field: keyof MasterService, value: string | number | boolean) => {
    setService((prev) => prev ? { ...prev, [field]: value } : prev);
    setDirty(true);
  };

  const updateList = (type: "included" | "bring" | "contraindications", items: string[]) => {
    if (type === "included") setIncluded(items);
    if (type === "bring") setBring(items);
    if (type === "contraindications") setContraindications(items);
    setDirty(true);
  };

  const updateSteps = (newSteps: Step[]) => { setSteps(newSteps); setDirty(true); };

  const handleSave = async () => {
    if (!service?.id) return;
    setSaving(true);
    try {
      const parsed = parseServiceDescription(service.description);
      const fullDescription = buildServiceDescription({ intro: parsed.intro, included, bring, contraindications });
      await masterCalendarApi.updateService({
        id: service.id,
        master_id: service.master_id,
        name: service.name,
        description: fullDescription || undefined,
        rich_description: steps.length > 0 ? serializeSteps(steps) : undefined,
        video_url: service.video_url || undefined,
        duration_minutes: service.duration_minutes,
        price: service.price,
        max_clients: service.max_clients,
        is_active: service.is_active,
        service_format: service.service_format,
      });
      setDirty(false);
      toast.success("Сохранено");
    } catch {
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !service?.id) return;
    setPhotoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string) ?? "";
        const result = await masterCalendarApi.uploadServicePhoto(service.id!, base64, file.type);
        setService((prev) => prev ? { ...prev, photos: result.photos } : prev);
        setPhotoIdx(result.photos.length - 1);
        toast.success("Фото добавлено");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Не удалось загрузить фото");
    } finally {
      setPhotoUploading(false);
    }
    e.target.value = "";
  };

  const handlePhotoDelete = async (url: string) => {
    if (!service?.id) return;
    try {
      const result = await masterCalendarApi.deleteServicePhoto(service.id!, url);
      setService((prev) => prev ? { ...prev, photos: result.photos } : prev);
      setPhotoIdx(0);
      toast.success("Фото удалено");
    } catch {
      toast.error("Не удалось удалить фото");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Header />
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          <Icon name="Loader" size={32} className="animate-spin" />
        </div>
        <Footer />
      </PageShell>
    );
  }

  if (!service) {
    return (
      <PageShell>
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Icon name="SearchX" size={48} className="opacity-30" />
          <p className="text-lg">Услуга не найдена</p>
          <Link to={`/masters/${slug}`} className="text-primary underline text-sm">Вернуться к мастеру</Link>
        </div>
        <Footer />
      </PageShell>
    );
  }

  const parsed = parseServiceDescription(service.description);
  const fmt = service.service_format ? FORMAT_META[service.service_format] : null;
  const photos: string[] = Array.isArray(service.photos) ? service.photos : [];
  const embedUrl = service.video_url ? getVideoEmbedUrl(service.video_url) : null;
  const hasLists = included.length > 0 || bring.length > 0 || contraindications.length > 0;

  return (
    <PageShell className="flex flex-col">
      <Header transparent />

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative w-full flex flex-col" style={{ minHeight: "100svh" }}>

        {/* Фон */}
        {photos.length > 0 ? (
          <div className="absolute inset-0">
            <img src={photos[photoIdx]} alt={service.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90" />

        {/* Управление фото */}
        {isOwner && (
          <div className="absolute top-20 right-4 z-20 flex gap-2">
            {photos.length > 0 && (
              <button onClick={() => handlePhotoDelete(photos[photoIdx])}
                className="bg-black/50 hover:bg-red-600/80 text-white rounded-full p-2 transition backdrop-blur-sm">
                <Icon name="Trash2" size={15} />
              </button>
            )}
            <label className={`bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition backdrop-blur-sm cursor-pointer ${photoUploading ? "opacity-50 pointer-events-none" : ""}`}>
              {photoUploading ? <Icon name="Loader" size={15} className="animate-spin" /> : <Icon name="ImagePlus" size={15} />}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        )}

        {/* Листание фото */}
        {photos.length > 1 && (
          <>
            <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 transition backdrop-blur-sm">
              <Icon name="ChevronLeft" size={20} />
            </button>
            <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 transition backdrop-blur-sm">
              <Icon name="ChevronRight" size={20} />
            </button>
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition ${i === photoIdx ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}

        {/* Хлебные крошки */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/50 px-5 sm:px-10 pt-24">
          <Link to="/masters" className="hover:text-white/80 transition">Мастера</Link>
          <Icon name="ChevronRight" size={11} />
          <Link to={`/masters/${slug}`} className="hover:text-white/80 transition">{service.master_name || slug}</Link>
          <Icon name="ChevronRight" size={11} />
          <span className="text-white/70 truncate">{service.name}</span>
        </div>

        {/* Панель владельца */}
        {canEdit && (
          <div className="relative z-10 mx-5 sm:mx-10 mt-3">
            {isOwner ? (
              <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/15 rounded-2xl px-3 py-2">
                <Icon name="Pencil" size={13} className="text-amber-400 shrink-0" />
                <span className="text-xs text-white/60 hidden sm:block">Режим редактора</span>
                {dirty ? (
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition">
                    {saving ? <Icon name="Loader" size={12} className="animate-spin" /> : <Icon name="Save" size={12} />}
                    Сохранить
                  </button>
                ) : (
                  <span className="text-xs text-amber-400/80 flex items-center gap-1">
                    <Icon name="CheckCircle2" size={12} /> Сохранено
                  </span>
                )}
                <button onClick={() => setEditMode(false)} disabled={dirty}
                  className="flex items-center gap-1 text-white/60 hover:text-white text-xs border border-white/20 rounded-lg px-2.5 py-1.5 transition disabled:opacity-30">
                  <Icon name="Eye" size={12} /> Просмотр
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/15 rounded-2xl px-3 py-2">
                <Icon name="Eye" size={13} className="text-white/50" />
                <span className="text-xs text-white/60">Предпросмотр</span>
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition">
                  <Icon name="Pencil" size={12} /> Редактировать
                </button>
              </div>
            )}
          </div>
        )}

        {/* Основной контент hero — прибит к низу */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-5 sm:px-10 pb-20 max-w-3xl">

          {/* Формат */}
          {isOwner ? (
            <div className="flex gap-2 mb-5 flex-wrap">
              {(["on_site", "at_home", "by_agreement"] as ServiceFormat[]).map((f) => (
                <button key={f} onClick={() => updateField("service_format", f)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition ${
                    service.service_format === f ? "bg-white/20 border-white/40 text-white" : "bg-white/8 border-white/20 text-white/50 hover:bg-white/15"
                  }`}>
                  {FORMAT_META[f].emoji} {FORMAT_META[f].label}
                </button>
              ))}
            </div>
          ) : fmt ? (
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${fmt.color}`}>
                {fmt.emoji} {fmt.label}
              </span>
            </div>
          ) : null}

          {/* Название */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            <EditableField value={service.name} placeholder="Название услуги"
              onSave={(v) => updateField("name", v)} editMode={isOwner} light />
          </h1>

          {/* Краткое описание */}
          {(parsed.intro || isOwner) && (
            <p className="text-white/70 text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
              <EditableField value={parsed.intro} placeholder="Краткое описание — суть в 1–2 предложениях..."
                multiline
                onSave={(v) => {
                  const newDesc = buildServiceDescription({ intro: v, included, bring, contraindications });
                  setService((prev) => prev ? { ...prev, description: newDesc } : prev);
                  setDirty(true);
                }}
                editMode={isOwner} light className="block" />
            </p>
          )}

          {/* Цена + CTA */}
          <div className="flex flex-wrap items-end gap-5">
            <div>
              {isOwner ? (
                <div className="text-3xl font-bold text-white">
                  <EditableField value={String(service.price)} placeholder="0" inputType="number"
                    onSave={(v) => updateField("price", Number(v) || 0)}
                    editMode={isOwner} light suffix="₽" className="w-40 text-3xl font-bold" />
                </div>
              ) : (
                <div className="text-4xl font-bold text-white">{fmtPrice(service.price)}</div>
              )}
              <div className="text-white/50 text-sm mt-1 flex items-center gap-2">
                <Icon name="Clock" size={13} />
                {isOwner ? (
                  <EditableField value={String(service.duration_minutes)} placeholder="60" inputType="number"
                    onSave={(v) => updateField("duration_minutes", Number(v) || 60)}
                    editMode={isOwner} light suffix="мин" className="w-14" />
                ) : fmtDuration(service.duration_minutes)}
                <span className="text-white/30">·</span>
                {isOwner ? (
                  <EditableField value={String(service.max_clients)} placeholder="1" inputType="number"
                    onSave={(v) => updateField("max_clients", Number(v) || 1)}
                    editMode={isOwner} light suffix="чел." className="w-10" />
                ) : `до ${service.max_clients} чел.`}
              </div>
            </div>

            {!isOwner && service.is_active && (
              <button onClick={scrollToCalendar}
                className="flex items-center gap-2 bg-white text-stone-900 hover:bg-white/90 active:scale-95 font-bold px-7 py-3.5 rounded-2xl transition text-sm shadow-xl shadow-black/40">
                <Icon name="CalendarCheck" size={16} />
                Записаться
              </button>
            )}

            {isOwner && (
              <button onClick={() => updateField("is_active", !service.is_active)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm transition ${
                  service.is_active ? "bg-green-500/20 border-green-400/40 text-green-300" : "bg-white/10 border-white/20 text-white/50"
                }`}>
                <Icon name={service.is_active ? "Eye" : "EyeOff"} size={12} />
                {service.is_active ? "Видна гостям" : "Скрыта"}
              </button>
            )}
          </div>
        </div>

        {/* Стрелка вниз */}
        <button
          onClick={() => document.getElementById("landing-content")?.scrollIntoView({ behavior: "smooth" })}
          className="relative z-10 flex justify-center pb-8 text-white/30 hover:text-white/60 transition mx-auto">
          <Icon name="ChevronDown" size={28} className="animate-bounce" />
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          ЛЕНДИНГ — секции ниже hero
      ══════════════════════════════════════════════════════════════ */}
      <div id="landing-content">

        {/* ── КАК ПРОХОДИТ ──────────────────────────────────────────── */}
        {(steps.length > 0 || isOwner) && (
          <section className="py-20 px-5 sm:px-10 max-w-2xl mx-auto w-full">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-widest text-primary/60 uppercase">Процесс</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">Как проходит процедура</h2>
            </div>
            <StepsEditor steps={steps} editMode={isOwner} onChange={updateSteps} />
            {isOwner && steps.length === 0 && (
              <p className="text-sm text-muted-foreground/50 italic mb-4">
                Добавьте шаги — гости увидят как всё устроено
              </p>
            )}
          </section>
        )}

        {/* ── ЧТО ВХОДИТ ────────────────────────────────────────────── */}
        {(hasLists || isOwner) && (
          <section className="py-20 px-5 sm:px-10 max-w-2xl mx-auto w-full border-t border-border/30">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-widest text-primary/60 uppercase">Детали</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">Что включено</h2>
            </div>
            <div className="space-y-8">
              {(included.length > 0 || isOwner) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Icon name="CheckCircle2" size={16} className="text-emerald-500" /> Что входит
                  </h3>
                  <EditableList items={included} placeholder="Добавить пункт..." editMode={isOwner}
                    onChange={(items) => updateList("included", items)} icon="Check" iconColor="text-emerald-500" />
                </div>
              )}
              {(bring.length > 0 || isOwner) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Icon name="ShoppingBag" size={16} className="text-blue-500" /> Взять с собой
                  </h3>
                  <EditableList items={bring} placeholder="Добавить пункт..." editMode={isOwner}
                    onChange={(items) => updateList("bring", items)} icon="Dot" iconColor="text-blue-400" />
                </div>
              )}
              {(contraindications.length > 0 || isOwner) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Icon name="AlertTriangle" size={16} className="text-amber-500" /> Противопоказания
                  </h3>
                  <EditableList items={contraindications} placeholder="Добавить..." editMode={isOwner}
                    onChange={(items) => updateList("contraindications", items)} icon="Minus" iconColor="text-amber-400" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── ВИДЕО ─────────────────────────────────────────────────── */}
        {(service.video_url || isOwner) && (
          <section className="py-20 px-5 sm:px-10 max-w-2xl mx-auto w-full border-t border-border/30">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-widest text-primary/60 uppercase">Видео</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">Смотрите сами</h2>
            </div>
            {service.video_url && embedUrl ? (
              <div className="rounded-3xl overflow-hidden aspect-video shadow-2xl shadow-black/30">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : service.video_url ? (
              <a href={service.video_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline text-sm">
                <Icon name="ExternalLink" size={14} /> Смотреть видео
              </a>
            ) : null}
            {isOwner && (
              <div className="mt-6">
                <EditableField value={service.video_url || ""} placeholder="Ссылка на YouTube или Rutube..."
                  onSave={(v) => updateField("video_url", v)} editMode={isOwner} className="text-sm text-muted-foreground block" />
              </div>
            )}
          </section>
        )}

        {/* ── ЗАПИСЬ ────────────────────────────────────────────────── */}
        {!isOwner && service.is_active && (
          <section ref={calendarRef} className="py-20 px-5 sm:px-10 max-w-2xl mx-auto w-full border-t border-border/30 scroll-mt-8">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-widest text-primary/60 uppercase">Запись</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">Выберите дату и время</h2>
            </div>
            <MasterBookingFlow
              masterId={service.master_id}
              masterSlug={slug}
              services={[service]}
              preselectedServiceId={service.id}
              refreshKey={bookingRefreshKey}
              hideServiceSelector
              onBookSlot={(option, svc) => setBookingState({ option, service: svc })}
            />
          </section>
        )}

      </div>

      <Footer />

      {bookingState && (
        <BookingModal
          option={bookingState.option}
          service={bookingState.service}
          masterName={service.master_name || ""}
          onClose={() => setBookingState(null)}
          onSuccess={handleBookSuccess}
        />
      )}
      {bookingSuccess && (
        <BookingSuccess
          onClose={() => setBookingSuccess(false)}
          chatToken={bookingChatToken}
          clientEmail={bookingClientEmail}
          vkId={user?.vk_id}
        />
      )}
    </PageShell>
  );
}
