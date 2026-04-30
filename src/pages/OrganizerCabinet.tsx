import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { organizerApi, OrgEvent, DashboardData } from "@/lib/organizer-api";
import OrgDashboard from "@/components/organizer/OrgDashboard";
import UnifiedPeoplePanel from "@/components/organizer/UnifiedPeoplePanel";
import LiveEventEditor from "@/components/organizer/LiveEventEditor";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import TelegramSettings from "@/components/organizer/TelegramSettings";
import EventCalculator from "@/components/organizer/EventCalculator";
import NotifyModule from "@/components/notify/NotifyModule";

type View = "dashboard" | "create" | "edit" | "participants" | "telegram" | "calculator" | "notify";

const NAV_ITEMS: { view: View; label: string; icon: string; group?: "dashboard" | "edit" }[] = [
  { view: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { view: "calculator", label: "Калькулятор", icon: "Calculator" },
  { view: "notify", label: "Уведомления", icon: "Bell" },
  { view: "telegram", label: "Telegram", icon: "Send" },
];

export default function OrganizerCabinet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState<View>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<OrgEvent | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashLoading, setDashLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [formData, setFormData] = useState<OrgEvent & { submit_action?: string }>({} as OrgEvent);
  const formDataRef = React.useRef(formData);
  formDataRef.current = formData;

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const data = await organizerApi.getDashboard();
      setDashboard(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("Forbidden")) {
        setAccessDenied(true);
      } else {
        toast({ title: "Ошибка загрузки", variant: "destructive" });
      }
    } finally {
      setDashLoading(false);
    }
  }, [toast]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await organizerApi.getEvents();
      setEvents(data);
    } catch {
      toast({ title: "Ошибка загрузки событий", variant: "destructive" });
    } finally {
      setEventsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?redirect=/organizer-cabinet");
      return;
    }

    const inviteEventId = searchParams.get("invite_event");
    const eventId = inviteEventId ? parseInt(inviteEventId) : null;

    if (eventId) {
      window.history.replaceState({}, "", window.location.pathname);
      organizerApi.joinByInvite(eventId)
        .then((res) => {
          if (!res.already) {
            if (res.status === "active") {
              toast({ title: "Вы добавлены как соорганизатор", description: "Теперь вы можете управлять этой встречей" });
            } else if (res.status === "pending") {
              toast({ title: "Заявка отправлена на рассмотрение", description: "После одобрения администратором вы получите доступ к кабинету организатора.", duration: 8000 });
            }
          }
        })
        .catch(() => {})
        .finally(() => { loadDashboard(); });
    } else {
      loadDashboard();
    }
  }, [user, authLoading, navigate, loadDashboard, searchParams, toast]);

  useEffect(() => {
    if (!authLoading && user) loadEvents();
  }, [authLoading, user, loadEvents]);

  const emptyForm = (): OrgEvent => ({
    id: 0, title: "", short_description: "", full_description: "", description: "",
    event_date: "", start_time: "19:00", end_time: "23:00",
    event_type: "знакомство", event_type_icon: "Users",
    bath_name: "", bath_address: "",
    price: "", price_amount: 0, price_label: "",
    total_spots: 10, spots_left: 10, occupancy: "low",
    image_url: "", is_visible: false, featured: false,
    program: [], rules: [], pricing_lines: [], pricing_type: "fixed", pricing_tiers: [], slug: "", organizer_id: 0,
    signups_count: 0, paid_count: 0, created_at: "",
  });

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setFormData(emptyForm());
    setView("create");
    setSidebarOpen(false);
  };

  const handleCreateFromCalc = (calcParams: { guestPrice: number; participants: number }) => {
    setSelectedEvent(null);
    setFormData({
      ...emptyForm(),
      price_amount: calcParams.guestPrice,
      price_label: `${calcParams.guestPrice.toLocaleString("ru")} ₽`,
      price: `${calcParams.guestPrice.toLocaleString("ru")} ₽`,
      total_spots: calcParams.participants,
      spots_left: calcParams.participants,
    });
    setView("create");
    setSidebarOpen(false);
    toast({ title: "Данные из калькулятора перенесены в форму события" });
  };

  const handleEditEvent = async (event: OrgEvent) => {
    setSelectedEvent(event);
    setView("edit");
    setSidebarOpen(false);
    let fullEvent = event;
    try { fullEvent = await organizerApi.getEvent(event.id); } catch { /* fallback */ }
    let tiers = fullEvent.pricing_tiers || [];
    if (fullEvent.pricing_type === "dynamic" && fullEvent.id && !tiers.length) {
      try { tiers = await organizerApi.getPricingTiers(fullEvent.id); } catch { /* ignore */ }
    }
    setFormData({ ...emptyForm(), ...fullEvent, pricing_tiers: tiers });
  };

  const handleManageParticipants = (event: OrgEvent) => {
    setSelectedEvent(event);
    setView("participants");
    setSidebarOpen(false);
  };

  const handleSaveEvent = async (data: Partial<OrgEvent> & { submit_action?: string }) => {
    setFormLoading(true);
    try {
      let savedEvent: OrgEvent;
      const submitAction = data.submit_action || "draft";
      const payload = { ...data };
      delete (payload as Record<string, unknown>).submit_action;

      if (selectedEvent?.id) {
        savedEvent = await organizerApi.updateEvent({ ...payload, id: selectedEvent.id, submit_action: submitAction } as OrgEvent & { id: number; submit_action: string });
        toast({ title: submitAction === "submit" ? "Событие отправлено на модерацию" : "Черновик сохранён" });
      } else {
        savedEvent = await organizerApi.createEvent({ ...payload, submit_action: submitAction } as Partial<OrgEvent> & { submit_action: string });
        toast({ title: submitAction === "submit" ? "Событие отправлено на модерацию" : "Черновик сохранён" });
      }
      if (data.pricing_type === "dynamic" && data.pricing_tiers) {
        await organizerApi.savePricingTiers(savedEvent.id, data.pricing_tiers);
      }
      await Promise.all([loadDashboard(), loadEvents()]);
      setView("dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка сохранения";
      toast({ title: "Ошибка сохранения", description: msg, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDuplicateEvent = (event: OrgEvent) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedEvent(null);
    setFormData({ ...emptyForm(), ...event, id: 0, event_date: tomorrow.toISOString().split("T")[0], is_visible: false, spots_left: event.total_spots });
    setView("create");
    toast({ title: "Событие скопировано — измените дату и сохраните" });
  };

  const handleToggleVisibility = async (event: OrgEvent) => {
    try {
      await organizerApi.updateEvent({ id: event.id, is_visible: !event.is_visible } as OrgEvent & { id: number });
      await Promise.all([loadEvents(), loadDashboard()]);
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (event: OrgEvent) => {
    if (!confirm(`Скрыть событие «${event.title}»?`)) return;
    try {
      await organizerApi.deleteEvent(event.id);
      toast({ title: "Событие скрыто" });
      await Promise.all([loadEvents(), loadDashboard()]);
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    }
  };

  const handleRepeatEvent = async (event: OrgEvent, dates: string[]) => {
    setFormLoading(true);
    let created = 0;
    for (const date of dates) {
      try {
        await organizerApi.createEvent({ ...event, id: 0, event_date: date, is_visible: false, spots_left: event.total_spots, submit_action: "draft" } as Partial<OrgEvent> & { submit_action: string });
        created++;
      } catch { /* skip */ }
    }
    setFormLoading(false);
    await Promise.all([loadEvents(), loadDashboard()]);
    toast({ title: `Создано ${created} из ${dates.length} событий` });
  };

  const navigateTo = (v: View) => {
    setView(v);
    setSidebarOpen(false);
  };

  if (authLoading || dashLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Загрузка кабинета...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Icon name="Lock" size={40} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-bold mb-2">Доступ закрыт</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Личный кабинет организатора доступен только пользователям с ролью «Организатор».
            Подай заявку или обратись к администратору.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/account")}>Мой профиль</Button>
            <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>
          </div>
        </div>
      </div>
    );
  }

  const activeNav = ["create", "edit", "participants"].includes(view) ? "dashboard" : view;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-20 flex-shrink-0">
        <div className="h-14 px-4 flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile only) */}
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Меню"
            >
              <Icon name={sidebarOpen ? "X" : "Menu"} size={20} />
            </button>
            <span className="font-semibold text-sm flex items-center gap-2">
              <Icon name="LayoutDashboard" size={17} className="text-primary hidden sm:block" />
              Кабинет организатора
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/account")} className="gap-2 text-xs">
            <Icon name="User" size={14} />
            <span className="hidden sm:inline">{user?.name}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-xl mx-auto w-full">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-14 left-0 bottom-0 z-40 w-60 bg-background border-r flex flex-col py-4 transition-transform duration-200
            lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:w-56 lg:flex-shrink-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* User info */}
          <div className="px-4 mb-4 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() ?? "О"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ view: v, label, icon }) => (
              <button
                key={v}
                onClick={() => navigateTo(v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeNav === v
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon name={icon} size={16} className={activeNav === v ? "text-primary" : "text-muted-foreground"} />
                {label}
              </button>
            ))}

            <div className="pt-3 mt-3 border-t">
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleCreateEvent}
              >
                <Icon name="Plus" size={14} />
                Новое событие
              </Button>
            </div>
          </nav>

          {/* Bottom: back to account */}
          <div className="px-3 mt-4 pt-4 border-t">
            <button
              onClick={() => navigate("/account")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon name="ArrowLeft" size={16} />
              Мой профиль
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6 lg:px-6">
          {/* Breadcrumb for sub-views */}
          {(view === "create" || view === "edit" || view === "participants") && (
            <div className="flex items-center gap-2 mb-5 text-sm text-muted-foreground">
              <button onClick={() => setView("dashboard")} className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <Icon name="LayoutDashboard" size={13} />
                Дашборд
              </button>
              <Icon name="ChevronRight" size={13} />
              <span className="text-foreground font-medium">
                {view === "create" && "Новое событие"}
                {view === "edit" && (selectedEvent?.title || "Редактирование")}
                {view === "participants" && `Участники${selectedEvent ? ` — ${selectedEvent.title}` : ""}`}
              </span>
            </div>
          )}

          {view === "dashboard" && dashboard && (
            <OrgDashboard
              data={dashboard}
              events={events}
              eventsLoading={eventsLoading}
              onCreateEvent={handleCreateEvent}
              onManageEvent={handleManageParticipants}
              onEditEvent={handleEditEvent}
              onDuplicateEvent={handleDuplicateEvent}
              onRepeat={handleRepeatEvent}
              repeatLoading={formLoading}
              onToggleVisibility={handleToggleVisibility}
              onDeleteEvent={handleDeleteEvent}
            />
          )}

          {(view === "create" || view === "edit") && (
            <div className="max-w-2xl mx-auto">
              <LiveEventEditor
                formData={formData}
                loading={formLoading}
                onFormChange={(data) => setFormData(data as OrgEvent)}
                onSubmit={async (e, _saveAndNew, override) => {
                  e.preventDefault();
                  const merged = { ...formDataRef.current, ...(override || {}) } as OrgEvent & { submit_action?: string };
                  await handleSaveEvent(merged);
                }}
                onCancel={() => setView("dashboard")}
              />
            </div>
          )}

          {view === "participants" && selectedEvent && (
            <UnifiedPeoplePanel
              event={selectedEvent}
              onBack={() => setView("dashboard")}
              onNotify={() => setView("notify")}
            />
          )}

          {view === "calculator" && (
            <EventCalculator onCreateEvent={handleCreateFromCalc} />
          )}

          {view === "notify" && (
            <div className="max-w-2xl mx-auto">
              <NotifyModule role="organizer" eventId={selectedEvent?.id ?? null} />
            </div>
          )}

          {view === "telegram" && (
            <div className="max-w-lg mx-auto">
              <TelegramSettings
                tgLinked={dashboard?.tg_linked ?? false}
                tgChannelsCount={dashboard?.tg_channels_count ?? 0}
                onRefresh={loadDashboard}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}