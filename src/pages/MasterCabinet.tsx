import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { rolesApi } from "@/lib/roles-api";
import { masterBookingsApi, masterCalendarApi, MasterReview } from "@/lib/master-calendar-api";
import { mastersApi, Master } from "@/lib/masters-api";
import Icon from "@/components/ui/icon";
import MasterCalendar from "@/components/admin/MasterCalendar";
import MasterBookingsList from "@/components/admin/MasterBookingsList";
import MasterServices from "@/components/admin/MasterServices";
import MasterTemplates from "@/components/admin/MasterTemplates";
import MasterCalendarSettings from "@/components/admin/MasterCalendarSettings";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import func2url from "../../backend/func2url.json";

const UPLOAD_URL = func2url["upload-media"];

type PortfolioItem = { url: string; type: "image" | "video"; caption?: string };

async function uploadFile(file: File): Promise<PortfolioItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const isVideo = file.type.startsWith("video/");
      try {
        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, filename: file.name, folder: "masters" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
        resolve({ url: data.url, type: isVideo ? "video" : "image" });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

type Section = "dashboard" | "profile" | "schedule" | "bookings" | "reviews" | "finances" | "notifications";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { id: "profile", label: "Мой профиль", icon: "User" },
  { id: "schedule", label: "Расписание", icon: "CalendarDays" },
  { id: "bookings", label: "Записи", icon: "ClipboardCheck" },
  { id: "reviews", label: "Отзывы", icon: "Star" },
  { id: "finances", label: "Финансы", icon: "Wallet" },
  { id: "notifications", label: "Уведомления", icon: "Bell" },
];

// ─── Дашборд ──────────────────────────────────────────────────────────────────

function DashboardSection({ masterId }: { masterId: number }) {
  const [stats, setStats] = useState<{
    upcoming_sessions: number;
    completed_sessions: number;
    total_revenue: number;
    expected_revenue: number;
    free_slots: number;
    occupancy_percent: number;
  } | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<{
    id: number; client_name: string; service_name?: string;
    datetime_start: string; datetime_end: string; price: number; status: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      masterBookingsApi.getStats(masterId),
      masterBookingsApi.getBookings(masterId, "confirmed"),
    ]).then(([s, b]) => {
      setStats(s as typeof stats);
      const now = new Date().toISOString();
      const upcoming = (b as typeof upcomingBookings)
        .filter((x) => x.datetime_start >= now)
        .sort((a, b) => a.datetime_start.localeCompare(b.datetime_start))
        .slice(0, 5);
      setUpcomingBookings(upcoming);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [masterId]);

  if (loading) return <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Дашборд</h2>

      {/* Метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Предстоящих записей", value: stats?.upcoming_sessions ?? 0, icon: "CalendarCheck", color: "text-primary" },
          { label: "Проведено сеансов", value: stats?.completed_sessions ?? 0, icon: "CheckCircle2", color: "text-green-600" },
          { label: "Доход (месяц)", value: `${(stats?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-emerald-600" },
          { label: "Загруженность", value: `${stats?.occupancy_percent ?? 0}%`, icon: "BarChart2", color: "text-amber-600" },
        ].map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-4">
            <div className={`w-9 h-9 bg-muted rounded-xl flex items-center justify-center mb-3`}>
              <Icon name={m.icon} size={18} className={m.color} />
            </div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Ближайшие записи */}
      <div className="bg-card border rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="Clock" size={16} className="text-primary" />
          Ближайшие сеансы
        </h3>
        {upcomingBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Icon name="CalendarX" size={28} className="mx-auto mb-2 opacity-30" />
            Нет предстоящих записей
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
                    {b.client_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{b.client_name}</div>
                    {b.service_name && <div className="text-xs text-muted-foreground truncate">{b.service_name}</div>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium">
                    {format(parseISO(b.datetime_start), "d MMM, HH:mm", { locale: ru })}
                  </div>
                  <div className="text-xs text-primary font-semibold">{b.price.toLocaleString("ru-RU")} ₽</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Профиль ──────────────────────────────────────────────────────────────────

function ProfileSection({ masterId: _masterId }: { masterId: number }) {
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", tagline: "", bio: "", phone: "", telegram: "", instagram: "",
    city: "", experience_years: 0, price_from: 0,
  });
  const [activeTab, setActiveTab] = useState<"info" | "portfolio">("info");

  // Avatar state
  const [avatar, setAvatar] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioSaved, setPortfolioSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mastersApi.getMyProfile().then((m) => {
      setMaster(m);
      setForm({
        name: m.name || "",
        tagline: m.tagline || "",
        bio: m.bio || "",
        phone: m.phone || "",
        telegram: m.telegram || "",
        instagram: m.instagram || "",
        city: m.city || "",
        experience_years: m.experience_years || 0,
        price_from: m.price_from || 0,
      });
      setAvatar(m.avatar || "");
      // Load existing portfolio
      if (m.portfolio && Array.isArray(m.portfolio)) {
        const items: PortfolioItem[] = m.portfolio.map((p) => {
          if (typeof p === "string") return { url: p, type: "image" as const };
          const raw = p as { url: string; type?: string; caption?: string };
          return { url: raw.url, type: (raw.type === "video" ? "video" : "image") as "image" | "video", caption: raw.caption };
        });
        setPortfolio(items);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await mastersApi.updateMyProfile({ ...form, avatar });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const item = await uploadFile(file);
      setAvatar(item.url);
    } catch {
      // ignore
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = await Promise.all(files.map(uploadFile));
      setPortfolio((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (idx: number) => {
    setPortfolio((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSavePortfolio = async () => {
    setPortfolioSaving(true);
    setUploadError("");
    try {
      await mastersApi.updateMyProfile({ portfolio: portfolio } as Parameters<typeof mastersApi.updateMyProfile>[0]);
      setPortfolioSaved(true);
      setTimeout(() => setPortfolioSaved(false), 2500);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setPortfolioSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Мой профиль</h2>

      <div className="flex gap-2 border-b pb-2">
        {[{ id: "info", label: "Публичная информация" }, { id: "portfolio", label: "Портфолио и фото" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as "info" | "portfolio")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="space-y-4 max-w-xl">
          {/* Аватар */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Аватар" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="User" size={32} className="text-muted-foreground" />
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Icon name="Loader2" size={20} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition disabled:opacity-50"
              >
                <Icon name="Camera" size={15} />
                {avatarUploading ? "Загружаем..." : "Изменить фото"}
              </button>
              {avatar && (
                <button
                  onClick={() => setAvatar("")}
                  className="mt-1 text-xs text-muted-foreground hover:text-destructive transition"
                >
                  Удалить фото
                </button>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {[
            { key: "name", label: "Имя", placeholder: "Иван Иванов" },
            { key: "tagline", label: "Короткое описание", placeholder: "Мастер банных ритуалов" },
            { key: "city", label: "Город", placeholder: "Москва" },
            { key: "phone", label: "Телефон", placeholder: "+7 (999) 000-00-00" },
            { key: "telegram", label: "Telegram", placeholder: "@username" },
            { key: "instagram", label: "Instagram", placeholder: "@username" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium block mb-1">{f.label}</label>
              <input
                type="text"
                value={String(form[f.key as keyof typeof form])}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Опыт (лет)</label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) => setForm((p) => ({ ...p, experience_years: +e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Цена от (₽)</label>
              <input
                type="number"
                value={form.price_from}
                onChange={(e) => setForm((p) => ({ ...p, price_from: +e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">О себе</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Расскажите о своём опыте и подходе..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : saved ? <Icon name="Check" size={15} /> : <Icon name="Save" size={15} />}
            {saving ? "Сохраняем..." : saved ? "Сохранено!" : "Сохранить изменения"}
          </button>
        </div>
      )}

      {activeTab === "portfolio" && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Добавьте фото и видео своих работ. Клиенты увидят их в вашем публичном профиле.
          </p>

          {/* Сетка медиа */}
          {portfolio.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {portfolio.map((item, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted relative group">
                  {item.type === "video" ? (
                    <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={item.url} alt={item.caption || `Фото ${i + 1}`} className="w-full h-full object-cover" />
                  )}
                  {/* Тип медиа */}
                  {item.type === "video" && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                      <Icon name="Play" size={10} className="text-white fill-white" />
                      <span className="text-white text-[10px] font-medium">Видео</span>
                    </div>
                  )}
                  {/* Кнопка удаления */}
                  <button
                    onClick={() => handleRemove(i)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-destructive"
                  >
                    <Icon name="Trash2" size={13} className="text-white" />
                  </button>
                </div>
              ))}

              {/* Кнопка добавить ещё */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 flex flex-col items-center justify-center gap-1 transition disabled:opacity-50"
              >
                {uploading ? (
                  <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Icon name="Plus" size={20} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Добавить</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Зона загрузки (если пусто) */}
          {portfolio.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Загружаем файлы...</span>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                    <Icon name="ImagePlus" size={24} className="text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Нажмите, чтобы добавить фото или видео</p>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP, MP4, MOV — до 50 МБ каждый</p>
                  </div>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

          {portfolio.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePortfolio}
                disabled={portfolioSaving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50"
              >
                {portfolioSaving ? <Icon name="Loader2" size={15} className="animate-spin" /> : portfolioSaved ? <Icon name="Check" size={15} /> : <Icon name="Save" size={15} />}
                {portfolioSaving ? "Сохраняем..." : portfolioSaved ? "Сохранено!" : "Сохранить портфолио"}
              </button>
              <span className="text-xs text-muted-foreground">{portfolio.length} файл{portfolio.length === 1 ? "" : portfolio.length < 5 ? "а" : "ов"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Расписание ───────────────────────────────────────────────────────────────

type ScheduleTab = "calendar" | "services" | "templates" | "settings";

const SCHEDULE_TABS: { id: ScheduleTab; label: string; icon: string }[] = [
  { id: "calendar", label: "Календарь", icon: "CalendarDays" },
  { id: "services", label: "Услуги", icon: "Sparkles" },
  { id: "templates", label: "Шаблоны", icon: "Copy" },
  { id: "settings", label: "Настройки", icon: "SlidersHorizontal" },
];

function ScheduleSection({ masterId }: { masterId: number }) {
  const [tab, setTab] = useState<ScheduleTab>("calendar");
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Расписание</h2>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SCHEDULE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "calendar" && <MasterCalendar masterId={masterId} />}
      {tab === "services" && <MasterServices masterId={masterId} />}
      {tab === "templates" && <MasterTemplates masterId={masterId} />}
      {tab === "settings" && <MasterCalendarSettings masterId={masterId} />}
    </div>
  );
}

// ─── Записи ───────────────────────────────────────────────────────────────────

function BookingsSection({ masterId }: { masterId: number }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Записи клиентов</h2>
      <MasterBookingsList masterId={masterId} />
    </div>
  );
}

// ─── Отзывы ───────────────────────────────────────────────────────────────────

function ReviewsSection({ masterId }: { masterId: number }) {
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    masterBookingsApi.getReviews(masterId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [masterId]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const filtered = filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Отзывы обо мне</h2>

      {/* Сводка */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 flex items-center gap-4">
          <div className="text-4xl font-bold text-primary">{avgRating.toFixed(1)}</div>
          <div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Icon key={s} name="Star" size={16} className={s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">Средняя оценка</div>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <div className="text-3xl font-bold">{reviews.length}</div>
          <div className="text-sm text-muted-foreground">Всего отзывов</div>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <div className="text-3xl font-bold text-green-600">
            {reviews.filter((r) => r.rating >= 4).length}
          </div>
          <div className="text-sm text-muted-foreground">Положительных</div>
        </div>
      </div>

      {/* Фильтр по оценке */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterRating(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterRating === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Все
        </button>
        {[5,4,3,2,1].map((r) => (
          <button
            key={r}
            onClick={() => setFilterRating(filterRating === r ? null : r)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterRating === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {r} <Icon name="Star" size={12} className="fill-current" />
          </button>
        ))}
      </div>

      {/* Список отзывов */}
      {loading ? (
        <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Icon name="MessageSquare" size={32} className="mx-auto mb-2 opacity-30" />
          {reviews.length === 0 ? "Пока нет отзывов" : "Нет отзывов с такой оценкой"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                    {r.client_name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{r.client_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(r.created_at), "d MMMM yyyy", { locale: ru })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  {[1,2,3,4,5].map((s) => (
                    <Icon key={s} name="Star" size={14} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />
                  ))}
                </div>
              </div>
              {r.text && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{r.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Финансы ──────────────────────────────────────────────────────────────────

function FinancesSection({ masterId }: { masterId: number }) {
  const [stats, setStats] = useState<{ total_revenue: number; expected_revenue: number; completed_sessions: number } | null>(null);

  useEffect(() => {
    masterBookingsApi.getStats(masterId).then((s) => setStats(s as typeof stats)).catch(() => {});
  }, [masterId]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Финансы</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Доход за месяц", value: `${(stats?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-emerald-600" },
          { label: "Ожидаемый доход", value: `${(stats?.expected_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "Clock", color: "text-primary" },
          { label: "Завершённых сеансов", value: stats?.completed_sessions ?? 0, icon: "CheckCircle2", color: "text-green-600" },
        ].map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-5">
            <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center mb-3">
              <Icon name={m.icon} size={18} className={m.color} />
            </div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 border rounded-2xl p-6 text-center space-y-2">
        <Icon name="Wallet" size={36} className="mx-auto text-muted-foreground/40" />
        <div className="font-semibold">Вывод средств</div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Система выплат находится в разработке. Для расчётов свяжитесь с администратором.
        </p>
      </div>
    </div>
  );
}

// ─── Уведомления ──────────────────────────────────────────────────────────────

function NotificationsSection({ masterId }: { masterId: number }) {
  const [settings, setSettings] = useState({
    notify_new_booking: true,
    notify_24h_reminder: true,
    notify_cancellation: true,
    auto_confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    masterCalendarApi.getSettings(masterId).then((s) => {
      setSettings({
        notify_new_booking: s.notify_new_booking,
        notify_24h_reminder: s.notify_24h_reminder,
        notify_cancellation: s.notify_cancellation,
        auto_confirm: s.auto_confirm,
      });
    }).catch(() => {});
  }, [masterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await masterCalendarApi.saveSettings({ master_id: masterId, ...settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const toggles: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: "notify_new_booking", label: "Новая запись", desc: "Уведомление при каждой новой записи клиента" },
    { key: "notify_24h_reminder", label: "Напоминание за 24 часа", desc: "Напомнить о предстоящем сеансе за сутки" },
    { key: "notify_cancellation", label: "Отмена записи", desc: "Уведомление при отмене клиентом" },
    { key: "auto_confirm", label: "Автоподтверждение записей", desc: "Записи автоматически получают статус «Подтверждено»" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Уведомления</h2>

      <div className="space-y-3 max-w-xl">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 bg-card border rounded-2xl p-4">
            <div>
              <div className="font-medium text-sm">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
            </div>
            <button
              onClick={() => setSettings((p) => ({ ...p, [t.key]: !p[t.key] }))}
              className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${settings[t.key] ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[t.key] ? "translate-x-5" : ""}`}
              />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50"
      >
        {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : saved ? <Icon name="Check" size={15} /> : <Icon name="Save" size={15} />}
        {saving ? "Сохраняем..." : saved ? "Сохранено!" : "Сохранить"}
      </button>
    </div>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function MasterCabinet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionParam = (searchParams.get("section") || "dashboard") as Section;
  const [section, setSection] = useState<Section>(sectionParam);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?redirect=/master");
      return;
    }
    rolesApi.getMyRoles().then(({ roles }) => {
      const ok = roles.some((r) => r.slug === "parmaster" && r.status === "active");
      setHasAccess(ok);
    }).catch(() => setHasAccess(false));
  }, [user, authLoading, navigate]);

  const handleNav = (s: Section) => {
    setSection(s);
    setSearchParams({ section: s });
    setSidebarOpen(false);
  };

  if (authLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="Lock" size={28} className="text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-2">Доступ закрыт</h1>
          <p className="text-muted-foreground text-sm mb-5">
            Кабинет мастера доступен только для пользователей с ролью «Пармастер».
          </p>
          <button onClick={() => navigate("/account")} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition">
            Подать заявку на роль
          </button>
        </div>
      </div>
    );
  }

  const masterId = user!.id;
  const currentNav = NAV.find((n) => n.id === section)!;

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <DashboardSection masterId={masterId} />;
      case "profile": return <ProfileSection masterId={masterId} />;
      case "schedule": return <ScheduleSection masterId={masterId} />;
      case "bookings": return <BookingsSection masterId={masterId} />;
      case "reviews": return <ReviewsSection masterId={masterId} />;
      case "finances": return <FinancesSection masterId={masterId} />;
      case "notifications": return <NotificationsSection masterId={masterId} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition"
          >
            <Icon name={sidebarOpen ? "X" : "Menu"} size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Sparkles" size={14} className="text-primary" />
            </div>
            <span className="font-semibold text-sm hidden sm:block">Кабинет мастера</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-sm text-muted-foreground">
            <Icon name={currentNav.icon} size={14} />
            <span>{currentNav.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate("/masters")} className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1">
              <Icon name="ExternalLink" size={13} />
              Мой профиль
            </button>
            <button onClick={() => navigate("/account")} className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1">
              <Icon name="ChevronLeft" size={13} />
              Аккаунт
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-60 bg-card border-r flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNav(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  section === n.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon name={n.icon} size={16} />
                {n.label}
              </button>
            ))}
          </nav>

          <div className="border-t p-3">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                {user!.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{user!.name}</div>
                <div className="text-[10px] text-muted-foreground">Пармастер</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-5 lg:p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}