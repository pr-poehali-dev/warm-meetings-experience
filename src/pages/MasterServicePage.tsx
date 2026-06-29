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

const FORMAT_META: Record<string, { emoji: string; label: string; color: string }> = {
  on_site:      { emoji: "🏠", label: "На месте у мастера", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  at_home:      { emoji: "🚗", label: "Выезд к гостю",      color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  by_agreement: { emoji: "🤝", label: "По согласованию",    color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
};

function fmtPrice(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
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

interface EditableFieldProps {
  value: string;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  onSave: (v: string) => void;
  editMode: boolean;
  inputType?: string;
  suffix?: string;
  lightInput?: boolean;
}

function EditableField({ value, placeholder, multiline, className = "", onSave, editMode, inputType = "text", suffix, lightInput }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editMode) {
    return (
      <span className={className}>
        {value
          ? <>{value}{suffix && <span className="opacity-60"> {suffix}</span>}</>
          : <span className="opacity-30 italic">{placeholder}</span>}
      </span>
    );
  }

  if (editing) {
    const inputClass = lightInput
      ? `w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/50 resize-none text-white placeholder:text-white/40 ${className}`
      : `w-full bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none ${className}`;
    const commonProps = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
      onBlur: () => { setEditing(false); onSave(draft); },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); setEditing(false); onSave(draft); }
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
      },
      className: inputClass,
      placeholder,
    };
    return multiline ? <textarea {...commonProps} rows={4} /> : <input {...commonProps} type={inputType} />;
  }

  return (
    <span
      className={`cursor-text group relative ${className}`}
      onClick={() => setEditing(true)}
      title="Нажмите чтобы редактировать"
    >
      {value
        ? <>{value}{suffix && <span className="opacity-60"> {suffix}</span>}</>
        : <span className="opacity-30 italic">{placeholder}</span>}
      {editMode && (
        <span className="ml-1.5 inline-flex opacity-0 group-hover:opacity-100 transition">
          <Icon name="Pencil" size={11} className="text-amber-400" />
        </span>
      )}
    </span>
  );
}

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
  const add = () => {
    const t = newItem.trim();
    if (!t) return;
    onChange([...items, t]);
    setNewItem("");
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 group">
          <Icon name={icon as "Check"} size={15} className={`${iconColor} mt-0.5 shrink-0`} />
          <span className="text-sm text-muted-foreground flex-1 leading-relaxed">{item}</span>
          {editMode && (
            <button
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-50 text-red-400 shrink-0"
            >
              <Icon name="X" size={12} />
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/50"
          />
          <button
            onClick={add}
            disabled={!newItem.trim()}
            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg transition disabled:opacity-40"
          >
            <Icon name="Plus" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

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

  const [bookingState, setBookingState] = useState<{ option: BookingOption; service: MasterService } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingChatToken, setBookingChatToken] = useState<string | undefined>(undefined);
  const [bookingClientEmail, setBookingClientEmail] = useState<string | undefined>(undefined);
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0);

  const handleBookSuccess = (chatToken?: string, clientEmail?: string) => {
    setBookingState(null);
    setBookingChatToken(chatToken);
    setBookingClientEmail(clientEmail);
    setBookingSuccess(true);
    setBookingRefreshKey((k) => k + 1);
  };

  const canEdit =
    hasRole("parmaster") && !!user && !!service &&
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
        rich_description: service.rich_description || undefined,
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-screen">
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
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground min-h-screen">
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

      {/* ── ОБЛОЖКА-ГЕРОЙ ─────────────────────────────────────────── */}
      <div className="relative w-full" style={{ minHeight: "55vh" }}>
        {/* Фото / плейсхолдер */}
        {photos.length > 0 ? (
          <div className="absolute inset-0">
            <img
              src={photos[photoIdx]}
              alt={service.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950" />
        )}

        {/* Градиент снизу */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Хлебные крошки поверх фото */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/60 px-4 sm:px-8 pt-24 pb-2">
          <Link to="/masters" className="hover:text-white/90 transition">Мастера</Link>
          <Icon name="ChevronRight" size={12} />
          <Link to={`/masters/${slug}`} className="hover:text-white/90 transition">{service.master_name || slug}</Link>
          <Icon name="ChevronRight" size={12} />
          <span className="text-white/80 truncate">{service.name}</span>
        </div>

        {/* Панель владельца (поверх фото) */}
        {canEdit && (
          <div className="relative z-10 mx-4 sm:mx-8 mt-3">
            {isOwner ? (
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/15 rounded-2xl px-3 py-2">
                <Icon name="Pencil" size={13} className="text-amber-400 shrink-0" />
                <span className="text-xs text-white/70 flex-1 hidden sm:block">Режим редактора</span>
                {dirty ? (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition shrink-0"
                  >
                    {saving ? <Icon name="Loader" size={12} className="animate-spin" /> : <Icon name="Save" size={12} />}
                    Сохранить
                  </button>
                ) : (
                  <span className="text-xs text-amber-400/80 flex items-center gap-1 shrink-0">
                    <Icon name="CheckCircle2" size={12} /> Сохранено
                  </span>
                )}
                <button
                  onClick={() => setEditMode(false)}
                  disabled={dirty}
                  className="flex items-center gap-1 text-white/60 hover:text-white text-xs border border-white/20 rounded-lg px-2.5 py-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <Icon name="Eye" size={12} /> Просмотр
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/15 rounded-2xl px-3 py-2">
                <Icon name="Eye" size={13} className="text-white/50 shrink-0" />
                <span className="text-xs text-white/60 flex-1">Так вашу услугу видят гости</span>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition shrink-0"
                >
                  <Icon name="Pencil" size={12} /> Редактировать
                </button>
              </div>
            )}
          </div>
        )}

        {/* Листание фото */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
            >
              <Icon name="ChevronLeft" size={20} />
            </button>
            <button
              onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
            >
              <Icon name="ChevronRight" size={20} />
            </button>
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition ${i === photoIdx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Кнопки управления фото (владелец) */}
        {isOwner && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {photos.length > 0 && (
              <button
                onClick={() => handlePhotoDelete(photos[photoIdx])}
                className="bg-black/50 hover:bg-red-600 text-white rounded-full p-2 transition"
                title="Удалить фото"
              >
                <Icon name="Trash2" size={15} />
              </button>
            )}
            <label className={`bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition cursor-pointer ${photoUploading ? "opacity-50 pointer-events-none" : ""}`}>
              {photoUploading
                ? <Icon name="Loader" size={15} className="animate-spin" />
                : <Icon name="ImagePlus" size={15} />}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        )}

        {/* Контент поверх фото: название, цена, теги */}
        <div className="relative z-10 px-4 sm:px-8 pb-8 pt-6">
          {/* Формат */}
          {isOwner ? (
            <div className="flex gap-2 mb-4 flex-wrap">
              {(["on_site", "at_home", "by_agreement"] as ServiceFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => updateField("service_format", f)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition ${
                    service.service_format === f
                      ? "bg-white/25 border-white/50 text-white"
                      : "bg-white/8 border-white/20 text-white/55 hover:bg-white/15"
                  }`}
                >
                  {FORMAT_META[f].emoji} {FORMAT_META[f].label}
                </button>
              ))}
            </div>
          ) : fmt ? (
            <div className="mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${fmt.color}`}>
                {fmt.emoji} {fmt.label}
              </span>
            </div>
          ) : null}

          {/* Название */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-2 max-w-2xl">
            <EditableField
              value={service.name}
              placeholder="Название услуги"
              onSave={(v) => updateField("name", v)}
              editMode={isOwner}
              lightInput
            />
          </h1>

          {/* Краткое описание */}
          {(parsed.intro || isOwner) && (
            <p className="text-white/65 text-sm sm:text-base max-w-xl mb-5 leading-relaxed">
              <EditableField
                value={parsed.intro}
                placeholder="Краткое описание в 1–2 предложениях..."
                multiline
                onSave={(v) => {
                  const newDesc = buildServiceDescription({ intro: v, included, bring, contraindications });
                  setService((prev) => prev ? { ...prev, description: newDesc } : prev);
                  setDirty(true);
                }}
                editMode={isOwner}
                lightInput
                className="block"
              />
            </p>
          )}

          {/* Цена + мета-теги */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Цена */}
            <div className="flex items-baseline gap-1">
              {isOwner ? (
                <span className="text-3xl font-bold text-white">
                  <EditableField
                    value={String(service.price)}
                    placeholder="0"
                    inputType="number"
                    onSave={(v) => updateField("price", Number(v) || 0)}
                    editMode={isOwner}
                    lightInput
                    suffix="₽"
                    className="w-32 text-3xl font-bold"
                  />
                </span>
              ) : (
                <span className="text-3xl font-bold text-white">{fmtPrice(service.price)}</span>
              )}
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Длительность */}
            <span className="flex items-center gap-1.5 text-white/70 text-sm">
              <Icon name="Clock" size={14} className="text-white/50" />
              {isOwner ? (
                <EditableField
                  value={String(service.duration_minutes)}
                  placeholder="60"
                  inputType="number"
                  onSave={(v) => updateField("duration_minutes", Number(v) || 60)}
                  editMode={isOwner}
                  lightInput
                  suffix="мин"
                  className="w-14"
                />
              ) : (
                fmtDuration(service.duration_minutes)
              )}
            </span>

            {/* Участники */}
            <span className="flex items-center gap-1.5 text-white/70 text-sm">
              <Icon name="Users" size={14} className="text-white/50" />
              {isOwner ? (
                <EditableField
                  value={String(service.max_clients)}
                  placeholder="1"
                  inputType="number"
                  onSave={(v) => updateField("max_clients", Number(v) || 1)}
                  editMode={isOwner}
                  lightInput
                  suffix="чел."
                  className="w-10"
                />
              ) : (
                `до ${service.max_clients} чел.`
              )}
            </span>

            {/* Активность (только владелец) */}
            {isOwner && (
              <button
                onClick={() => updateField("is_active", !service.is_active)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition ${
                  service.is_active
                    ? "bg-green-500/20 border-green-400/40 text-green-300"
                    : "bg-white/10 border-white/20 text-white/50"
                }`}
              >
                <Icon name={service.is_active ? "Eye" : "EyeOff"} size={12} />
                {service.is_active ? "Видна гостям" : "Скрыта"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── КОНТЕНТ НИЖЕ ОБЛОЖКИ ──────────────────────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">

        {/* Подробное описание */}
        {(service.rich_description || isOwner) && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="BookOpen" size={16} className="text-primary" />
              Об услуге
            </h2>
            <div className="text-muted-foreground leading-relaxed text-sm">
              <EditableField
                value={service.rich_description || ""}
                placeholder="Расскажите подробнее об услуге — как проходит процедура, ваш подход, особенности..."
                multiline
                onSave={(v) => updateField("rich_description", v)}
                editMode={isOwner}
                className="block whitespace-pre-wrap"
              />
            </div>
          </section>
        )}

        {/* Что входит / Взять / Противопоказания */}
        {(hasLists || isOwner) && (
          <div className="grid sm:grid-cols-1 gap-6">
            {(included.length > 0 || isOwner) && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="CheckCircle2" size={16} className="text-emerald-500" />
                  Что входит
                </h2>
                <EditableList
                  items={included}
                  placeholder="Добавить пункт..."
                  editMode={isOwner}
                  onChange={(items) => updateList("included", items)}
                  icon="Check"
                  iconColor="text-emerald-500"
                />
              </section>
            )}

            {(bring.length > 0 || isOwner) && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="ShoppingBag" size={16} className="text-blue-500" />
                  Взять с собой
                </h2>
                <EditableList
                  items={bring}
                  placeholder="Добавить пункт..."
                  editMode={isOwner}
                  onChange={(items) => updateList("bring", items)}
                  icon="Dot"
                  iconColor="text-blue-400"
                />
              </section>
            )}

            {(contraindications.length > 0 || isOwner) && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-amber-500" />
                  Противопоказания
                </h2>
                <EditableList
                  items={contraindications}
                  placeholder="Добавить противопоказание..."
                  editMode={isOwner}
                  onChange={(items) => updateList("contraindications", items)}
                  icon="Minus"
                  iconColor="text-amber-400"
                />
              </section>
            )}
          </div>
        )}

        {/* Видео */}
        {(service.video_url || isOwner) && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="Play" size={16} className="text-primary" />
              Видео
            </h2>
            {service.video_url && embedUrl ? (
              <div className="rounded-2xl overflow-hidden aspect-video mb-3">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : service.video_url ? (
              <a
                href={service.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline text-sm mb-3"
              >
                <Icon name="ExternalLink" size={14} /> Смотреть видео
              </a>
            ) : null}
            {isOwner && (
              <EditableField
                value={service.video_url || ""}
                placeholder="Вставьте ссылку на YouTube или Rutube..."
                onSave={(v) => updateField("video_url", v)}
                editMode={isOwner}
                className="text-sm text-muted-foreground block"
              />
            )}
          </section>
        )}

        {/* Запись */}
        {!isOwner && service.is_active && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="CalendarCheck" size={16} className="text-primary" />
              Выберите дату и время
            </h2>
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

      </main>

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

      <Footer />
    </PageShell>
  );
}
