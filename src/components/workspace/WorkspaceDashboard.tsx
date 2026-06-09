import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { masterBookingsApi } from "@/lib/master-calendar-api";
import { mastersApi, Master } from "@/lib/masters-api";
import { organizerApi, DashboardData } from "@/lib/organizer-api";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { MasterSection, OrgView } from "./workspace-types";

interface WorkspaceDashboardProps {
  isMaster: boolean;
  isOrganizer: boolean;
  onGoToMasterSection: (s: MasterSection) => void;
  onGoToOrgView: (v: OrgView) => void;
  onCreateEvent: () => void;
}

function StatCard({
  icon, color, bg, value, label, hint, onClick,
}: {
  icon: string; color: string; bg: string;
  value: string | number; label: string; hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left w-full group">
      <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full">
        <CardContent className="p-4">
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
            <Icon name={icon} size={15} className={color} />
          </div>
          <div className="text-xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-[11px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {hint} <Icon name="ArrowRight" size={10} />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export default function WorkspaceDashboard({
  isMaster, isOrganizer,
  onGoToMasterSection, onGoToOrgView, onCreateEvent,
}: WorkspaceDashboardProps) {
  const { user } = useAuth();

  const [masterData, setMasterData] = useState<{
    master: Master | null;
    stats: { upcoming_sessions: number; completed_sessions: number; total_revenue: number; occupancy_percent: number } | null;
    upcoming: { id: number; client_name: string; service_name?: string; datetime_start: string; price: number }[];
  }>({ master: null, stats: null, upcoming: [] });

  const [orgData, setOrgData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tasks: Promise<void>[] = [];
    if (isMaster) {
      tasks.push(
        mastersApi.getMyProfile()
          .then(async (m: Master) => {
            const [stats, bookings] = await Promise.all([
              masterBookingsApi.getStats(m.id),
              masterBookingsApi.getBookings(m.id, "confirmed"),
            ]);
            const now = new Date().toISOString();
            const upcoming = (bookings as typeof masterData.upcoming)
              .filter((x) => x.datetime_start >= now)
              .sort((a, b) => a.datetime_start.localeCompare(b.datetime_start))
              .slice(0, 5);
            setMasterData({ master: m, stats: stats as typeof masterData.stats, upcoming });
          })
          .catch(() => {})
      );
    }
    if (isOrganizer) {
      tasks.push(organizerApi.getDashboard().then(setOrgData).catch(() => {}));
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [isMaster, isOrganizer]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="h-8 w-8 bg-muted rounded-lg animate-pulse mb-3" />
                <div className="h-6 bg-muted rounded animate-pulse mb-1" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const upcomingEvents = orgData?.upcoming_events ?? [];

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{greeting()}, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">Рабочий кабинет</p>
      </div>

      {/* МАСТЕР */}
      {isMaster && masterData.stats && (
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Icon name="Flame" size={15} className="text-orange-500" />
            Мастер-услуги
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon="CalendarCheck" color="text-primary" bg="bg-primary/10"
              value={masterData.stats.upcoming_sessions}
              label="Предстоящих записей"
              hint="Открыть записи"
              onClick={() => onGoToMasterSection("bookings")}
            />
            <StatCard
              icon="CalendarDays" color="text-blue-600 dark:text-blue-400" bg="bg-blue-500/15"
              value=""
              label="Расписание"
              hint="Открыть расписание"
              onClick={() => onGoToMasterSection("schedule")}
            />
            <StatCard
              icon="TrendingUp" color="text-green-600 dark:text-green-400" bg="bg-green-500/15"
              value={`${masterData.stats.total_revenue.toLocaleString("ru-RU")} ₽`}
              label="Доход за месяц"
              hint="Открыть финансы"
              onClick={() => onGoToMasterSection("finances")}
            />
            <StatCard
              icon="User" color="text-violet-600 dark:text-violet-400" bg="bg-violet-500/15"
              value=""
              label="Профиль и услуги"
              hint="Открыть профиль"
              onClick={() => onGoToMasterSection("profile")}
            />
          </div>
        </div>
      )}

      {/* МАСТЕР — ближайшие сеансы */}
      {isMaster && masterData.upcoming.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name="Clock" size={14} className="text-primary" />
                Ближайшие сеансы
              </h3>
              <button
                onClick={() => onGoToMasterSection("bookings")}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Все записи <Icon name="ArrowRight" size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {masterData.upcoming.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onGoToMasterSection("bookings")}
                  className="w-full flex items-center gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-muted/40 rounded-lg px-1 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0 text-sm font-bold text-orange-600 dark:text-orange-400">
                    {b.client_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.client_name}</p>
                    {b.service_name && <p className="text-xs text-muted-foreground truncate">{b.service_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {format(parseISO(b.datetime_start), "d MMM, HH:mm", { locale: ru })}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.price.toLocaleString()} ₽</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ОРГАНИЗАТОР */}
      {isOrganizer && orgData && (
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Icon name="CalendarDays" size={15} className="text-emerald-600" />
            Мероприятия
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon="CalendarDays" color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/15"
              value={orgData.stats.upcoming_events ?? upcomingEvents.length}
              label="Предстоящих событий"
              hint="Мои события"
              onClick={() => onGoToOrgView("dashboard")}
            />
            <StatCard
              icon="Users" color="text-violet-600 dark:text-violet-400" bg="bg-violet-500/15"
              value={orgData.stats.total_participants ?? 0}
              label="Участников всего"
              hint="Открыть события"
              onClick={() => onGoToOrgView("dashboard")}
            />
            <StatCard
              icon="FileEdit" color="text-amber-600 dark:text-amber-400" bg="bg-amber-500/15"
              value={orgData.stats.drafts ?? 0}
              label="Черновики"
              hint="Создать событие"
              onClick={onCreateEvent}
            />
            <StatCard
              icon="MessageCircleQuestion" color="text-blue-600 dark:text-blue-400" bg="bg-blue-500/15"
              value={orgData.stats.unread_questions ?? 0}
              label="Вопросов без ответа"
              hint="Открыть вопросы"
              onClick={() => onGoToOrgView("questions")}
            />
          </div>
        </div>
      )}

      {/* ОРГАНИЗАТОР — ближайшие события */}
      {isOrganizer && upcomingEvents.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name="CalendarCheck" size={14} className="text-emerald-600" />
                Ближайшие события
              </h3>
              <button
                onClick={() => onGoToOrgView("dashboard")}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Все события <Icon name="ArrowRight" size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onGoToOrgView("dashboard")}
                  className="w-full flex items-center gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-muted/40 rounded-lg px-1 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Icon name="Calendar" size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{ev.bath_name || "Место не указано"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {ev.event_date ? format(parseISO(ev.event_date), "d MMM", { locale: ru }) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{ev.signups_count ?? 0} уч.</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Пусто */}
      {!isMaster && !isOrganizer && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Icon name="Briefcase" size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Нет активных рабочих ролей</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}