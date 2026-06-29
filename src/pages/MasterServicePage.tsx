import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { masterCalendarApi, MasterService } from "@/lib/master-calendar-api";
import { parseServiceDescription } from "@/lib/service-description";
import { toast } from "sonner";

const FORMAT_META: Record<string, { emoji: string; label: string }> = {
  on_site:      { emoji: "🏠", label: "На месте у мастера" },
  at_home:      { emoji: "🚗", label: "Выезд к гостю" },
  by_agreement: { emoji: "🤝", label: "По согласованию" },
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

// Редактируемое поле — клик => textarea/input, blur/Enter => сохранение
interface EditableFieldProps {
  value: string;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  onSave: (v: string) => void;
  editMode: boolean;
}

function EditableField({ value, placeholder, multiline, className = "", onSave, editMode }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editMode) {
    return <span className={className}>{value || <span className="text-gray-300 italic">{placeholder}</span>}</span>;
  }

  if (editing) {
    const commonProps = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
      onBlur: () => { setEditing(false); onSave(draft); },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); setEditing(false); onSave(draft); }
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
      },
      className: `w-full bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none ${className}`,
      placeholder,
    };
    return multiline
      ? <textarea {...commonProps} rows={5} />
      : <input {...commonProps} />;
  }

  return (
    <span
      className={`cursor-text group relative ${className}`}
      onClick={() => setEditing(true)}
      title="Нажмите чтобы редактировать"
    >
      {value || <span className="text-gray-300 italic">{placeholder}</span>}
      <span className="ml-1.5 inline-flex opacity-0 group-hover:opacity-100 transition">
        <Icon name="Pencil" size={12} className="text-amber-500" />
      </span>
    </span>
  );
}

export default function MasterServicePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [service, setService] = useState<MasterService | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Является ли текущий пользователь владельцем этой услуги
  const isOwner = hasRole("parmaster") && !!user;

  useEffect(() => {
    if (!id) return;
    masterCalendarApi.getServiceDetail(Number(id))
      .then((s) => setService(s))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [id]);

  const updateField = (field: keyof MasterService, value: string) => {
    setService((prev) => prev ? { ...prev, [field]: value } : prev);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!service?.id) return;
    setSaving(true);
    try {
      await masterCalendarApi.updateService({
        id: service.id,
        master_id: service.master_id,
        name: service.name,
        rich_description: service.rich_description || undefined,
        video_url: service.video_url || undefined,
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
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Icon name="Loader" size={32} className="animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
          <Icon name="SearchX" size={48} className="opacity-30" />
          <p className="text-lg">Услуга не найдена</p>
          <Link to={`/masters/${slug}`} className="text-primary underline text-sm">Вернуться к мастеру</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const parsed = parseServiceDescription(service.description);
  const fmt = service.service_format ? FORMAT_META[service.service_format] : null;
  const photos: string[] = Array.isArray(service.photos) ? service.photos : [];
  const embedUrl = service.video_url ? getVideoEmbedUrl(service.video_url) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">

        {/* Хлебные крошки */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/masters" className="hover:text-gray-600">Мастера</Link>
          <Icon name="ChevronRight" size={14} />
          <Link to={`/masters/${slug}`} className="hover:text-gray-600">{service.master_name || slug}</Link>
          <Icon name="ChevronRight" size={14} />
          <span className="text-gray-700 truncate">{service.name}</span>
        </nav>

        {/* Панель владельца */}
        {isOwner && (
          <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <Icon name="Pencil" size={16} className="text-amber-500 shrink-0" />
            <span className="text-sm text-amber-800 flex-1">
              Режим редактора — нажмите на любой текст чтобы изменить
            </span>
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
              >
                {saving
                  ? <Icon name="Loader" size={14} className="animate-spin" />
                  : <Icon name="Save" size={14} />}
                Сохранить
              </button>
            )}
            {!dirty && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Icon name="CheckCircle2" size={13} /> Сохранено
              </span>
            )}
          </div>
        )}

        {/* Фото-галерея */}
        <div className="mb-6">
          {photos.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden bg-gray-200 aspect-[16/9]">
              <img src={photos[photoIdx]} alt={service.name} className="w-full h-full object-cover" />
              {isOwner && (
                <button
                  onClick={() => handlePhotoDelete(photos[photoIdx])}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-red-600 text-white rounded-full p-1.5 transition"
                  title="Удалить это фото"
                >
                  <Icon name="Trash2" size={16} />
                </button>
              )}
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition">
                    <Icon name="ChevronLeft" size={20} />
                  </button>
                  <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition">
                    <Icon name="ChevronRight" size={20} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIdx(i)}
                        className={`w-2 h-2 rounded-full transition ${i === photoIdx ? "bg-white" : "bg-white/50"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Миниатюры + кнопка добавить фото */}
          {(photos.length > 1 || isOwner) && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${i === photoIdx ? "border-primary" : "border-transparent"}`}>
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {isOwner && (
                <label className={`shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-400 flex items-center justify-center cursor-pointer transition ${photoUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {photoUploading
                    ? <Icon name="Loader" size={20} className="text-gray-400 animate-spin" />
                    : <Icon name="Plus" size={20} className="text-gray-400" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          )}

          {/* Если фото нет — показываем зону добавления для владельца */}
          {photos.length === 0 && isOwner && (
            <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 py-10 cursor-pointer hover:bg-amber-100 transition">
              {photoUploading
                ? <Icon name="Loader" size={32} className="text-amber-400 animate-spin" />
                : <Icon name="ImagePlus" size={32} className="text-amber-400" />}
              <span className="text-sm text-amber-700">{photoUploading ? "Загружаю..." : "Добавить фото"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>

        {/* Заголовок и мета */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              {fmt && (
                <span className="text-sm text-gray-400 flex items-center gap-1 mb-1">
                  <span>{fmt.emoji}</span> {fmt.label}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                <EditableField
                  value={service.name}
                  placeholder="Название услуги"
                  onSave={(v) => updateField("name", v)}
                  editMode={isOwner}
                />
              </h1>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-gray-900">{fmtPrice(service.price)}</div>
              <div className="text-sm text-gray-400">{fmtDuration(service.duration_minutes)}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
              <Icon name="Clock" size={14} className="text-gray-400" /> {fmtDuration(service.duration_minutes)}
            </span>
            <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
              <Icon name="Users" size={14} className="text-gray-400" /> до {service.max_clients} чел.
            </span>
            {fmt && (
              <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                {fmt.emoji} {fmt.label}
              </span>
            )}
          </div>
        </div>

        {/* Подробное описание */}
        {(service.rich_description || isOwner) && (
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Об услуге</h2>
            <div className="text-gray-700 leading-relaxed text-sm">
              <EditableField
                value={service.rich_description || ""}
                placeholder="Расскажите подробнее об услуге — как проходит процедура, ваш подход, особенности..."
                multiline
                onSave={(v) => updateField("rich_description", v)}
                editMode={isOwner}
                className="block whitespace-pre-wrap"
              />
            </div>
          </div>
        )}

        {/* Что входит / Взять / Противопоказания */}
        {(parsed.included.length > 0 || parsed.bring.length > 0 || parsed.contraindications.length > 0) && (
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm space-y-4">
            {parsed.included.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Icon name="CheckCircle2" size={16} className="text-green-500" /> Что входит
                </h3>
                <ul className="space-y-1">
                  {parsed.included.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <Icon name="Check" size={14} className="text-green-500 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.bring.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Icon name="ShoppingBag" size={16} className="text-blue-500" /> Взять с собой
                </h3>
                <ul className="space-y-1">
                  {parsed.bring.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <Icon name="Dot" size={14} className="text-blue-400 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.contraindications.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-amber-500" /> Противопоказания
                </h3>
                <ul className="space-y-1">
                  {parsed.contraindications.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <Icon name="Minus" size={14} className="text-amber-400 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Видео */}
        {(service.video_url || isOwner) && (
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Видео</h2>
            {service.video_url && embedUrl ? (
              <div className="rounded-xl overflow-hidden aspect-video mb-3">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : service.video_url ? (
              <a href={service.video_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline text-sm mb-3">
                <Icon name="Play" size={16} /> Смотреть видео
              </a>
            ) : null}
            {isOwner && (
              <EditableField
                value={service.video_url || ""}
                placeholder="Вставьте ссылку на YouTube или Rutube..."
                onSave={(v) => updateField("video_url", v)}
                editMode={isOwner}
                className="text-sm text-gray-500 block"
              />
            )}
          </div>
        )}

        {/* Кнопка записаться */}
        <div className="sticky bottom-4">
          <button
            onClick={() => navigate(`/masters/${slug}?service=${service.id}`)}
            className="w-full bg-primary text-white rounded-2xl py-4 text-lg font-semibold shadow-lg hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Icon name="CalendarCheck" size={22} />
            Записаться — {fmtPrice(service.price)}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
