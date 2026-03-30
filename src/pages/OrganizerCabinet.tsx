import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { organizerApi, OrgEvent, OrgParticipant, DashboardData } from "@/lib/organizer-api";
import OrgDashboard from "@/components/organizer/OrgDashboard";
import OrgEventsList from "@/components/organizer/OrgEventsList";
import AdminEventForm from "@/components/admin/AdminEventForm";
import OrgParticipants from "@/components/organizer/OrgParticipants";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

type View = "dashboard" | "events" | "create" | "edit" | "participants";

export default function OrganizerCabinet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [view, setView] = useState<View>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<OrgEvent | null>(null);
  const [participants, setParticipants] = useState<OrgParticipant[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [formData, setFormData] = useState<OrgEvent>({} as OrgEvent);

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

  const loadParticipants = useCallback(async (eventId: number) => {
    try {
      const data = await organizerApi.getParticipants(eventId);
      setParticipants(data);
    } catch {
      toast({ title: "Ошибка загрузки участников", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login?redirect=/organizer-cabinet");
      } else {
        loadDashboard();
      }
    }
  }, [user, authLoading, navigate, loadDashboard]);

  useEffect(() => {
    if (view === "events") loadEvents();
  }, [view, loadEvents]);

  const emptyForm = (): OrgEvent => ({
    id: 0, title: "", short_description: "", full_description: "", description: "",
    event_date: "", start_time: "19:00", end_time: "23:00",
    event_type: "знакомство", event_type_icon: "Users",
    bath_name: "", bath_address: "",
    price: "", price_amount: 0, price_label: "",
    total_spots: 10, spots_left: 10, occupancy: "low",
    image_url: "", is_visible: false, featured: false,
    program: [], rules: [], slug: "", organizer_id: 0,
    signups_count: 0, paid_count: 0, created_at: "",
  });

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setFormData(emptyForm());
    setView("create");
  };

  const handleEditEvent = (event: OrgEvent) => {
    setSelectedEvent(event);
    setFormData({ ...emptyForm(), ...event });
    setView("edit");
  };

  const handleManageParticipants = async (event: OrgEvent) => {
    setSelectedEvent(event);
    await loadParticipants(event.id);
    setView("participants");
  };

  const handleSaveEvent = async (data: Partial<OrgEvent>) => {
    setFormLoading(true);
    try {
      if (selectedEvent?.id) {
        await organizerApi.updateEvent({ ...data, id: selectedEvent.id } as OrgEvent & { id: number });
        toast({ title: "Событие обновлено" });
      } else {
        await organizerApi.createEvent(data);
        toast({ title: data.is_visible ? "Событие опубликовано" : "Черновик сохранён" });
      }
      await loadDashboard();
      setView("events");
      await loadEvents();
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
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
      await loadEvents();
      if (view === "dashboard") await loadDashboard();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (event: OrgEvent) => {
    if (!confirm(`Скрыть событие «${event.title}»?`)) return;
    try {
      await organizerApi.deleteEvent(event.id);
      toast({ title: "Событие скрыто" });
      await loadEvents();
      if (view === "dashboard") await loadDashboard();
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
              {(["dashboard", "events"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === v || (view === "create" && v === "events") || (view === "edit" && v === "events") || (view === "participants" && v === "events") ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "dashboard" ? "Дашборд" : "События"}
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

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {view === "dashboard" && dashboard && (
          <OrgDashboard
            data={dashboard}
            onCreateEvent={handleCreateEvent}
            onManageEvent={handleManageParticipants}
            onViewAll={() => setView("events")}
          />
        )}

        {view === "events" && (
          <OrgEventsList
            events={events}
            loading={eventsLoading}
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            onManageParticipants={handleManageParticipants}
            onDuplicateEvent={handleDuplicateEvent}
            onToggleVisibility={handleToggleVisibility}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {(view === "create" || view === "edit") && (
          <AdminEventForm
            formData={formData}
            loading={formLoading}
            onFormChange={(data) => setFormData(data as OrgEvent)}
            onSubmit={async (e, _saveAndNew) => {
              e.preventDefault();
              await handleSaveEvent(formData);
            }}
            onCancel={() => setView(events.length ? "events" : "dashboard")}
          />
        )}

        {view === "participants" && selectedEvent && (
          <OrgParticipants
            event={selectedEvent}
            participants={participants}
            onBack={() => setView("events")}
            onRefresh={() => loadParticipants(selectedEvent.id)}
          />
        )}
      </main>
    </div>
  );
}