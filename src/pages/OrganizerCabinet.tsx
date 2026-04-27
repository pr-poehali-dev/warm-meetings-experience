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

type View = "dashboard" | "create" | "edit" | "participants" | "telegram";

export default function OrganizerCabinet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState<View>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<OrgEvent | null>(null);

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
      // Убираем параметр из URL сразу
      window.history.replaceState({}, "", window.location.pathname);

      organizerApi.joinByInvite(eventId)
        .then((res) => {
          if (!res.already) {
            if (res.status === 'active') {
              toast({
                title: "Вы добавлены как соорганизатор",
                description: "Теперь вы можете управлять этой встречей",
              });
            } else if (res.status === 'pending') {
              toast({
                title: "Заявка отправлена на рассмотрение",
                description: "После одобрения администратором вы получите доступ к кабинету организатора.",
                duration: 8000,
              });
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          loadDashboard();
        });
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
    program: [], rules: [], pricing_lines: [], pricing_type: 'fixed', pricing_tiers: [], slug: "", organizer_id: 0,
    signups_count: 0, paid_count: 0, created_at: "",
  });

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setFormData(emptyForm());
    setView("create");
  };

  const handleEditEvent = async (event: OrgEvent) => {
    setSelectedEvent(event);
    setView("edit");
    // Загружаем полный объект события — дашборд возвращает только краткие поля
    let fullEvent = event;
    try {
      fullEvent = await organizerApi.getEvent(event.id);
    } catch (_) { /* fallback to passed event */ }
    let tiers = fullEvent.pricing_tiers || [];
    if (fullEvent.pricing_type === 'dynamic' && fullEvent.id && !tiers.length) {
      try { tiers = await organizerApi.getPricingTiers(fullEvent.id); } catch (_) { /* ignore */ }
    }
    setFormData({ ...emptyForm(), ...fullEvent, pricing_tiers: tiers });
  };

  const handleManageParticipants = (event: OrgEvent) => {
    setSelectedEvent(event);
    setView("participants");
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
        if (submitAction === "submit") {
          toast({ title: "Событие отправлено на модерацию", description: "Администратор проверит его в ближайшее время." });
        } else {
          toast({ title: "Черновик сохранён" });
        }
      } else {
        savedEvent = await organizerApi.createEvent({ ...payload, submit_action: submitAction } as Partial<OrgEvent> & { submit_action: string });
        if (submitAction === "submit") {
          toast({ title: "Событие отправлено на модерацию", description: "Администратор проверит его в ближайшее время." });
        } else {
          toast({ title: "Черновик сохранён" });
        }
      }
      if (data.pricing_type === 'dynamic' && data.pricing_tiers) {
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
    const dup = {
      ...emptyForm(), ...event,
      id: 0,
      event_date: tomorrow.toISOString().split("T")[0],
      is_visible: false,
      spots_left: event.total_spots,
    };
    setSelectedEvent(null);
    setFormData(dup);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView("dashboard"); loadDashboard(); }}
              className="font-semibold text-sm flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Icon name="LayoutDashboard" size={18} />
              <span className="hidden sm:inline">Кабинет организатора</span>
              <span className="sm:hidden">ЛК</span>
            </button>
            <span className="text-muted-foreground">/</span>
            <nav className="flex gap-1">
              {([["dashboard", "Дашборд"], ["telegram", "Telegram"]] as [View, string][]).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === v || (["create", "edit", "participants"].includes(view) && v === "dashboard") ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/account")} className="gap-2 text-xs">
            <Icon name="User" size={14} />
            <span className="hidden sm:inline">{user?.name}</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {view === "dashboard" && dashboard && (
          <OrgDashboard
            data={dashboard}
            events={events}
            eventsLoading={eventsLoading}
            onCreateEvent={handleCreateEvent}
            onManageEvent={handleManageParticipants}
            onEditEvent={handleEditEvent}
            onDuplicateEvent={handleDuplicateEvent}
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
          />
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
  );
}