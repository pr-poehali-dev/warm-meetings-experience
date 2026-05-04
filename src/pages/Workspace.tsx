import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import CabinetHeader from "@/components/CabinetHeader";

// Master imports
import { masterBookingsApi, masterCalendarApi, MasterReview } from "@/lib/master-calendar-api";
import { mastersApi, Master } from "@/lib/masters-api";
import MasterCalendar from "@/components/admin/MasterCalendar";
import MasterBookingsList from "@/components/admin/MasterBookingsList";
import MasterServices from "@/components/admin/MasterServices";
import MasterTemplates from "@/components/admin/MasterTemplates";
import MasterCalendarSettings from "@/components/admin/MasterCalendarSettings";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

// Organizer imports
import { organizerApi, OrgEvent, DashboardData } from "@/lib/organizer-api";
import OrgDashboard from "@/components/organizer/OrgDashboard";
import LiveEventEditor from "@/components/organizer/LiveEventEditor";
import UnifiedPeoplePanel from "@/components/organizer/UnifiedPeoplePanel";
import TelegramSettings from "@/components/organizer/TelegramSettings";
import EventCalculator from "@/components/organizer/EventCalculator";
import NotifyModule from "@/components/notify/NotifyModule";
import { useToast } from "@/hooks/use-toast";
import func2url from "../../backend/func2url.json";

// Workspace dashboard
import WorkspaceDashboard from "@/components/workspace/WorkspaceDashboard";

const UPLOAD_URL = func2url["upload-media"];

// ─── Типы ─────────────────────────────────────────────────────────────────────

type RoleTab = "dashboard" | "master" | "organizer";
type MasterSection = "dashboard" | "profile" | "schedule" | "bookings" | "reviews" | "finances" | "notifications";
type OrgView = "dashboard" | "create" | "edit" | "participants" | "telegram" | "calculator" | "notify";

const MASTER_NAV: { id: MasterSection; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "profile", label: "Мой профиль", icon: "User" },
  { id: "schedule", label: "Расписание", icon: "CalendarDays" },
  { id: "bookings", label: "Записи", icon: "ClipboardCheck" },
  { id: "reviews", label: "Отзывы", icon: "Star" },
  { id: "finances", label: "Финансы", icon: "Wallet" },
  { id: "notifications", label: "Уведомления", icon: "Bell" },
];

const ORG_NAV: { id: OrgView; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "calculator", label: "Калькулятор", icon: "Calculator" },
  { id: "notify", label: "Рассылки", icon: "Bell" },
  { id: "telegram", label: "Telegram", icon: "Send" },
];

// ─── Загрузка файлов ──────────────────────────────────────────────────────────

async function uploadFile(file: File) {
  return new Promise<{ url: string; type: "image" | "video" }>((resolve, reject) => {
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
      } catch (err) { reject(err); }
    };
    reader.readAsDataURL(file);
  });
}

// ─── Мастер: Профиль ──────────────────────────────────────────────────────────

function MasterProfileSection({ masterId: _masterId }: { masterId: number }) {
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", tagline: "", bio: "", phone: "", telegram: "", instagram: "",
    city: "", experience_years: 0, price_from: 0,
  });
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    mastersApi.getMyProfile().then((m) => {
      setMaster(m);
      setForm({
        name: m.name || "", tagline: m.tagline || "", bio: m.bio || "",
        phone: m.phone || "", telegram: m.telegram || "", instagram: m.instagram || "",
        city: m.city || "", experience_years: m.experience_years || 0, price_from: m.price_from || 0,
      });
      setAvatar(m.avatar || "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await mastersApi.updateMyProfile({ ...form, avatar });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;
  if (!master) return null;

  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <div key={key}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input
        className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={String(form[key])}
        placeholder={placeholder}
        type={typeof form[key] === "number" ? "number" : "text"}
        onChange={(e) => setForm((p) => ({ ...p, [key]: typeof form[key] === "number" ? Number(e.target.value) : e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-bold">Мой профиль мастера</h2>
      {/* Аватар */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Icon name="User" size={28} className="text-primary" />}
        </div>
        <div>
          <p className="text-sm font-medium">{form.name}</p>
          <p className="text-xs text-muted-foreground">ID мастера: #{master.id}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("name", "Имя")}
        {field("tagline", "Слоган")}
        {field("city", "Город")}
        {field("phone", "Телефон")}
        {field("telegram", "Telegram")}
        {field("instagram", "Instagram")}
        {field("experience_years", "Лет опыта")}
        {field("price_from", "Цена от (₽)")}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">О себе</label>
        <textarea
          rows={4}
          className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : null}
        {saved ? "Сохранено!" : "Сохранить профиль"}
      </Button>
    </div>
  );
}

// ─── Мастер: Расписание ───────────────────────────────────────────────────────

function MasterScheduleSection({ masterId }: { masterId: number }) {
  const [tab, setTab] = useState<"calendar" | "services" | "templates" | "settings">("calendar");
  const tabs = [
    { id: "calendar", label: "Календарь", icon: "CalendarDays" },
    { id: "services", label: "Услуги", icon: "Sparkles" },
    { id: "templates", label: "Шаблоны", icon: "Copy" },
    { id: "settings", label: "Настройки", icon: "SlidersHorizontal" },
  ] as const;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Расписание</h2>
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} size={13} />
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

// ─── Мастер: Записи ───────────────────────────────────────────────────────────

function MasterBookingsSection({ masterId }: { masterId: number }) {
  return <div className="space-y-4"><h2 className="text-xl font-bold">Записи клиентов</h2><MasterBookingsList masterId={masterId} /></div>;
}

// ─── Мастер: Отзывы ───────────────────────────────────────────────────────────

function MasterReviewsSection({ masterId }: { masterId: number }) {
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    masterBookingsApi.getReviews(masterId).then(setReviews).catch(() => setReviews([])).finally(() => setLoading(false));
  }, [masterId]);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const filtered = filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Отзывы обо мне</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-2xl p-4 flex items-center gap-3">
          <div className="text-3xl font-bold text-primary">{avgRating.toFixed(1)}</div>
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Icon key={s} name="Star" size={12} className={s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />)}</div>
            <div className="text-xs text-muted-foreground">Средняя</div>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-4"><div className="text-3xl font-bold">{reviews.length}</div><div className="text-xs text-muted-foreground">Всего</div></div>
        <div className="bg-card border rounded-2xl p-4"><div className="text-3xl font-bold text-green-600">{reviews.filter((r) => r.rating >= 4).length}</div><div className="text-xs text-muted-foreground">Позитивных</div></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[null, 5, 4, 3, 2, 1].map((r) => (
          <button key={r ?? "all"} onClick={() => setFilterRating(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRating === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {r ? `${r} ★` : "Все"}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" /></div>
        : filtered.length === 0 ? <div className="text-center py-12 text-sm text-muted-foreground"><Icon name="MessageSquare" size={32} className="mx-auto mb-2 opacity-30" />{reviews.length === 0 ? "Пока нет отзывов" : "Нет отзывов с такой оценкой"}</div>
        : <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">{r.client_name[0].toUpperCase()}</div>
                  <div>
                    <div className="font-medium text-sm">{r.client_name}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(r.created_at), "d MMMM yyyy", { locale: ru })}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Icon key={s} name="Star" size={13} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />)}</div>
              </div>
              {r.text && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{r.text}</p>}
            </div>
          ))}
        </div>}
    </div>
  );
}

// ─── Мастер: Финансы ──────────────────────────────────────────────────────────

function MasterFinancesSection({ masterId }: { masterId: number }) {
  const [stats, setStats] = useState<{ total_revenue: number; expected_revenue: number; completed_sessions: number } | null>(null);
  useEffect(() => { masterBookingsApi.getStats(masterId).then((s) => setStats(s as typeof stats)).catch(() => {}); }, [masterId]);
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Финансы</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Доход за месяц", value: `${(stats?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-emerald-600" },
          { label: "Ожидаемый доход", value: `${(stats?.expected_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "Clock", color: "text-primary" },
          { label: "Завершённых сеансов", value: stats?.completed_sessions ?? 0, icon: "CheckCircle2", color: "text-green-600" },
        ].map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-4">
            <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center mb-2"><Icon name={m.icon} size={16} className={m.color} /></div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-muted/50 border rounded-2xl p-6 text-center">
        <Icon name="Wallet" size={32} className="mx-auto text-muted-foreground/40 mb-2" />
        <div className="font-semibold text-sm">Вывод средств</div>
        <p className="text-xs text-muted-foreground mt-1">Система выплат в разработке. Для расчётов свяжитесь с администратором.</p>
      </div>
    </div>
  );
}

// ─── Мастер: Уведомления ──────────────────────────────────────────────────────

function MasterNotificationsSection({ masterId }: { masterId: number }) {
  const [settings, setSettings] = useState({ notify_new_booking: true, notify_24h_reminder: true, notify_cancellation: true, auto_confirm: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { masterCalendarApi.getSettings(masterId).then((s) => setSettings({ notify_new_booking: s.notify_new_booking, notify_24h_reminder: s.notify_24h_reminder, notify_cancellation: s.notify_cancellation, auto_confirm: s.auto_confirm })).catch(() => {}); }, [masterId]);
  const handleSave = async () => {
    setSaving(true);
    try { await masterCalendarApi.saveSettings({ master_id: masterId, ...settings }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch { /* ignore */ } finally { setSaving(false); }
  };
  const toggles: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: "notify_new_booking", label: "Новая запись", desc: "Уведомление при каждой новой записи клиента" },
    { key: "notify_24h_reminder", label: "Напоминание за 24 часа", desc: "Напомнить о предстоящем сеансе за сутки" },
    { key: "notify_cancellation", label: "Отмена записи", desc: "Уведомление при отмене клиентом" },
    { key: "auto_confirm", label: "Автоподтверждение", desc: "Записи автоматически получают статус «Подтверждено»" },
  ];
  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-xl font-bold">Уведомления</h2>
      <div className="space-y-2">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 bg-card border rounded-2xl p-4">
            <div><div className="font-medium text-sm">{t.label}</div><div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div></div>
            <button onClick={() => setSettings((p) => ({ ...p, [t.key]: !p[t.key] }))}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${settings[t.key] ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[t.key] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : null}
        {saved ? "Сохранено!" : "Сохранить"}
      </Button>
    </div>
  );
}

// ─── Мастер: Дашборд ──────────────────────────────────────────────────────────

function MasterDashboardSection({ masterId }: { masterId: number }) {
  const [stats, setStats] = useState<{ upcoming_sessions: number; completed_sessions: number; total_revenue: number; occupancy_percent: number } | null>(null);
  const [upcoming, setUpcoming] = useState<{ id: number; client_name: string; service_name?: string; datetime_start: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([masterBookingsApi.getStats(masterId), masterBookingsApi.getBookings(masterId, "confirmed")])
      .then(([s, b]) => {
        setStats(s as typeof stats);
        const now = new Date().toISOString();
        setUpcoming((b as typeof upcoming).filter((x) => x.datetime_start >= now).sort((a, b) => a.datetime_start.localeCompare(b.datetime_start)).slice(0, 5));
      }).catch(() => {}).finally(() => setLoading(false));
  }, [masterId]);
  if (loading) return <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Обзор мастера</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Предстоящих записей", value: stats?.upcoming_sessions ?? 0, icon: "CalendarCheck", color: "text-primary" },
          { label: "Проведено сеансов", value: stats?.completed_sessions ?? 0, icon: "CheckCircle2", color: "text-green-600" },
          { label: "Доход (месяц)", value: `${(stats?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-emerald-600" },
          { label: "Загруженность", value: `${stats?.occupancy_percent ?? 0}%`, icon: "BarChart2", color: "text-amber-600" },
        ].map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-4">
            <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center mb-2"><Icon name={m.icon} size={16} className={m.color} /></div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>
      {upcoming.length > 0 && (
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Icon name="Clock" size={14} className="text-primary" />Ближайшие сеансы</h3>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary text-xs">{b.client_name[0].toUpperCase()}</div>
                  <div className="min-w-0"><div className="text-sm font-medium truncate">{b.client_name}</div>{b.service_name && <div className="text-xs text-muted-foreground truncate">{b.service_name}</div>}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium">{format(parseISO(b.datetime_start), "d MMM, HH:mm", { locale: ru })}</div>
                  <div className="text-xs text-primary">{b.price.toLocaleString()} ₽</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function Workspace() {
  const { user, loading: authLoading, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const isMaster = hasRole("parmaster");
  const isOrganizer = hasRole("organizer");

  // Определяем начальный таб по ролям и URL
  const initialTab = (): RoleTab => {
    const p = searchParams.get("tab") as RoleTab | null;
    if (p === "master" && isMaster) return "master";
    if (p === "organizer" && isOrganizer) return "organizer";
    return "dashboard";
  };

  const [roleTab, setRoleTab] = useState<RoleTab>(initialTab);
  const [masterSection, setMasterSection] = useState<MasterSection>((searchParams.get("section") as MasterSection) || "dashboard");
  const [orgView, setOrgView] = useState<OrgView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Organizer state
  const [orgDashboard, setOrgDashboard] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<OrgEvent | null>(null);
  const [formData, setFormData] = useState<OrgEvent & { submit_action?: string }>({} as OrgEvent);
  const formDataRef = { current: formData };
  formDataRef.current = formData;
  const [orgFormLoading, setOrgFormLoading] = useState(false);

  const loadOrgDashboard = useCallback(async () => {
    try { const data = await organizerApi.getDashboard(); setOrgDashboard(data); } catch { /* ignore */ }
  }, []);

  const loadOrgEvents = useCallback(async () => {
    try { const data = await organizerApi.getEvents(); setEvents(data); } catch { toast({ title: "Ошибка загрузки событий", variant: "destructive" }); }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login?redirect=/workspace"); return; }
    if (!isMaster && !isOrganizer) { navigate("/account"); return; }
    if (isOrganizer) { loadOrgDashboard(); loadOrgEvents(); }
  }, [authLoading, user, isMaster, isOrganizer, navigate, loadOrgDashboard, loadOrgEvents]);

  const switchRoleTab = (tab: RoleTab) => {
    setRoleTab(tab);
    setSearchParams({ tab });
    setSidebarOpen(false);
  };

  const switchMasterSection = (s: MasterSection) => {
    setRoleTab("master");
    setMasterSection(s);
    setSearchParams({ tab: "master", section: s });
    setSidebarOpen(false);
  };

  const switchOrgView = (v: OrgView) => {
    setRoleTab("organizer");
    setOrgView(v);
    setSearchParams({ tab: "organizer" });
    setSidebarOpen(false);
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" /></div>;

  const masterId = user!.id;

  // Текущее название раздела в шапке
  const currentLabel = () => {
    if (roleTab === "dashboard") return "Обзор";
    if (roleTab === "master") {
      const label = MASTER_NAV.find((n) => n.id === masterSection)?.label ?? "Мастер";
      return `Мастер · ${label}`;
    }
    const label = ORG_NAV.find((n) => n.id === orgView)?.label
      ?? (orgView === "create" ? "Создание события" : orgView === "edit" ? "Редактирование" : orgView === "participants" ? "Участники" : "Организатор");
    return `Организатор · ${label}`;
  };

  // Боковая навигация — плоская, понятная, единая
  const NavItem = ({ active, onClick, icon, label, accent, badge }: { active: boolean; onClick: () => void; icon: string; label: string; accent?: string; badge?: string | number }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon name={icon} size={16} className={active ? "" : accent || ""} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge !== 0 && badge !== "" && (
        <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{badge}</span>
      )}
    </button>
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1.5 mt-3">{children}</div>
  );

  const renderSidebar = () => (
    <nav className="space-y-0.5">
      {/* Сводка — всегда сверху */}
      <SectionLabel>Главное</SectionLabel>
      <NavItem
        active={roleTab === "dashboard"}
        onClick={() => switchRoleTab("dashboard")}
        icon="LayoutDashboard"
        label="Обзор"
      />

      {/* Мастер-разделы (плоско, без вложенности) */}
      {isMaster && (
        <>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5"><Icon name="Flame" size={11} className="text-orange-500" />Мастер-услуги</span>
          </SectionLabel>
          {MASTER_NAV.filter((n) => n.id !== "dashboard").map((n) => (
            <NavItem
              key={n.id}
              active={roleTab === "master" && masterSection === n.id}
              onClick={() => switchMasterSection(n.id)}
              icon={n.icon}
              label={n.label}
            />
          ))}
        </>
      )}

      {/* Организатор-разделы */}
      {isOrganizer && (
        <>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5"><Icon name="CalendarDays" size={11} className="text-emerald-500" />Мероприятия</span>
          </SectionLabel>
          <NavItem
            active={roleTab === "organizer" && orgView === "dashboard"}
            onClick={() => switchOrgView("dashboard")}
            icon="LayoutGrid"
            label="Мои события"
            badge={events.length || undefined}
          />
          <NavItem
            active={roleTab === "organizer" && (orgView === "create" || orgView === "edit")}
            onClick={() => { setSelectedEvent(null); setFormData({} as OrgEvent); switchOrgView("create"); }}
            icon="Plus"
            label="Создать событие"
          />
          <NavItem
            active={roleTab === "organizer" && orgView === "calculator"}
            onClick={() => switchOrgView("calculator")}
            icon="Calculator"
            label="Калькулятор"
          />
          <NavItem
            active={roleTab === "organizer" && orgView === "notify"}
            onClick={() => switchOrgView("notify")}
            icon="Bell"
            label="Рассылки"
          />
          <NavItem
            active={roleTab === "organizer" && orgView === "telegram"}
            onClick={() => switchOrgView("telegram")}
            icon="Send"
            label="Telegram"
          />
        </>
      )}

      {/* Низ: личный кабинет + выход */}
      <div className="border-t border-border/60 pt-2 mt-3">
        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Icon name="User" size={16} />Личный кабинет
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <Icon name="LogOut" size={16} />Выйти
        </button>
      </div>
    </nav>
  );

  // Рендер основного контента
  const renderContent = () => {
    if (roleTab === "dashboard") {
      return (
        <WorkspaceDashboard
          isMaster={isMaster}
          isOrganizer={isOrganizer}
          onGoToMaster={() => switchRoleTab("master")}
          onGoToOrganizer={() => switchRoleTab("organizer")}
        />
      );
    }

    if (roleTab === "master" && isMaster) {
      switch (masterSection) {
        case "dashboard": return <MasterDashboardSection masterId={masterId} />;
        case "profile": return <MasterProfileSection masterId={masterId} />;
        case "schedule": return <MasterScheduleSection masterId={masterId} />;
        case "bookings": return <MasterBookingsSection masterId={masterId} />;
        case "reviews": return <MasterReviewsSection masterId={masterId} />;
        case "finances": return <MasterFinancesSection masterId={masterId} />;
        case "notifications": return <MasterNotificationsSection masterId={masterId} />;
      }
    }

    if (roleTab === "organizer" && isOrganizer) {
      switch (orgView) {
        case "dashboard":
          return orgDashboard ? (
            <OrgDashboard
              data={orgDashboard}
              events={events}
              eventsLoading={false}
              onCreateEvent={() => setOrgView("create")}
              onManageEvent={(ev) => { setSelectedEvent(ev); setOrgView("participants"); }}
              onEditEvent={async (ev) => {
                setSelectedEvent(ev);
                let fullEvent = ev;
                try { fullEvent = await organizerApi.getEvent(ev.id); } catch { /* fallback */ }
                setFormData({ ...fullEvent });
                setOrgView("edit");
              }}
              onDuplicateEvent={(ev) => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedEvent(null);
                setFormData({ ...ev, id: 0, event_date: tomorrow.toISOString().split("T")[0], is_visible: false, spots_left: ev.total_spots });
                setOrgView("create");
              }}
              onRepeat={async (ev, dates) => {
                for (const date of dates) {
                  try { await organizerApi.createEvent({ ...ev, id: 0, event_date: date, is_visible: false, submit_action: "draft" } as Parameters<typeof organizerApi.createEvent>[0]); } catch { /* skip */ }
                }
                await Promise.all([loadOrgDashboard(), loadOrgEvents()]);
                toast({ title: `Создано ${dates.length} событий` });
              }}
              onToggleVisibility={async (ev) => {
                try {
                  await organizerApi.updateEvent({ id: ev.id, is_visible: !ev.is_visible } as OrgEvent & { id: number });
                  await Promise.all([loadOrgEvents(), loadOrgDashboard()]);
                } catch { toast({ title: "Ошибка", variant: "destructive" }); }
              }}
              onDeleteEvent={async (ev) => {
                if (!confirm(`Скрыть событие «${ev.title}»?`)) return;
                try { await organizerApi.deleteEvent(ev.id); await Promise.all([loadOrgEvents(), loadOrgDashboard()]); } catch { toast({ title: "Ошибка", variant: "destructive" }); }
              }}
            />
          ) : <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;
        case "create":
        case "edit":
          return (
            <div className="max-w-2xl mx-auto">
              <LiveEventEditor
                formData={formData}
                loading={orgFormLoading}
                onFormChange={(data) => setFormData(data as OrgEvent)}
                onSubmit={async (e, _saveAndNew, override) => {
                  e.preventDefault();
                  const merged = { ...formDataRef.current, ...(override || {}) } as OrgEvent & { submit_action?: string };
                  setOrgFormLoading(true);
                  try {
                    const submitAction = merged.submit_action || "draft";
                    if (selectedEvent?.id) {
                      await organizerApi.updateEvent({ ...merged, id: selectedEvent.id, submit_action: submitAction } as OrgEvent & { id: number; submit_action: string });
                      toast({ title: submitAction === "submit" ? "Событие отправлено на модерацию" : "Черновик сохранён" });
                    } else {
                      await organizerApi.createEvent({ ...merged, submit_action: submitAction } as Parameters<typeof organizerApi.createEvent>[0]);
                      toast({ title: submitAction === "submit" ? "Событие отправлено на модерацию" : "Черновик сохранён" });
                    }
                    await Promise.all([loadOrgDashboard(), loadOrgEvents()]);
                    setOrgView("dashboard");
                  } catch (e: unknown) {
                    toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Не удалось сохранить", variant: "destructive" });
                  } finally {
                    setOrgFormLoading(false);
                  }
                }}
                onCancel={() => setOrgView("dashboard")}
              />
            </div>
          );
        case "participants":
          return selectedEvent ? (
            <UnifiedPeoplePanel
              event={selectedEvent}
              onBack={() => setOrgView("dashboard")}
              onNotify={() => setOrgView("notify")}
            />
          ) : null;
        case "calculator": return <EventCalculator onCreateEvent={(data) => { setFormData(data as OrgEvent); setSelectedEvent(null); setOrgView("create"); }} />;
        case "notify": return <div className="max-w-2xl mx-auto"><NotifyModule role="organizer" eventId={selectedEvent?.id ?? null} /></div>;
        case "telegram": return <TelegramSettings tgLinked={orgDashboard?.tg_linked ?? false} tgChannelsCount={orgDashboard?.tg_channels_count ?? 0} onRefresh={loadOrgDashboard} />;
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Шапка */}
      <CabinetHeader
        icon="Briefcase"
        title="Рабочий кабинет"
        subtitle={currentLabel()}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        menuOpen={sidebarOpen}
        actions={
          isOrganizer ? (
            <Button
              size="sm"
              onClick={() => { setSelectedEvent(null); setFormData({} as OrgEvent); switchOrgView("create"); }}
              className="gap-1.5 h-9 hidden sm:inline-flex"
            >
              <Icon name="Plus" size={14} />Создать событие
            </Button>
          ) : undefined
        }
        onLogout={logout}
      />

      {/* Мобильное меню */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-card border-r shadow-xl p-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {renderSidebar()}
          </div>
        </div>
      )}

      {/* Основной layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Десктопный сайдбар */}
        <aside className="hidden lg:block w-56 flex-shrink-0 border-r bg-card p-3 overflow-y-auto sticky top-14 h-[calc(100vh-56px)]">
          {renderSidebar()}
        </aside>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}