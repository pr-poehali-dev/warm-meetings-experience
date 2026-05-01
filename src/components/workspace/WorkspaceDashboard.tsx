import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { masterBookingsApi } from "@/lib/master-calendar-api";
import { mastersApi, Master } from "@/lib/masters-api";
import { organizerApi, DashboardData } from "@/lib/organizer-api";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface WorkspaceDashboardProps {
  isMaster: boolean;
  isOrganizer: boolean;
  onGoToMaster: () => void;
  onGoToOrganizer: () => void;
}

export default function WorkspaceDashboard({ isMaster, isOrganizer, onGoToMaster, onGoToOrganizer }: WorkspaceDashboardProps) {
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
      tasks.push(
        organizerApi.getDashboard()
          .then(setOrgData)
          .catch(() => {})
      );
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
    <div className="space-y-5">
      {/* Приветствие */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{greeting()}, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">Рабочий кабинет</p>
      </div>

      {/* МАСТЕР — метрики */}
      {isMaster && masterData.stats && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="Flame" size={15} className="text-orange-500" />
              Как мастер
            </h2>
            <button onClick={onGoToMaster} className="text-xs text-primary hover:underline">Перейти →</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Предстоящих записей", value: masterData.stats.upcoming_sessions, icon: "CalendarCheck", color: "text-primary", bg: "bg-primary/10" },
              { label: "Проведено сеансов", value: masterData.stats.completed_sessions, icon: "CheckCircle2", color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Доход за месяц", value: `${masterData.stats.total_revenue.toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-green-600", bg: "bg-green-50" },
              { label: "Загруженность", value: `${masterData.stats.occupancy_percent}%`, icon: "BarChart2", color: "text-amber-600", bg: "bg-amber-50" },
            ].map((m) => (
              <Card key={m.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mb-2`}>
                    <Icon name={m.icon} size={15} className={m.color} />
                  </div>
                  <div className="text-xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* МАСТЕР — ближайшие сеансы */}
      {isMaster && masterData.upcoming.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="Clock" size={14} className="text-primary" />
              Ближайшие сеансы
            </h3>
            <div className="space-y-2">
              {masterData.upcoming.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-sm font-bold text-orange-600">
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ОРГАНИЗАТОР — метрики и события */}
      {isOrganizer && orgData && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="CalendarDays" size={15} className="text-emerald-600" />
              Как организатор
            </h2>
            <button onClick={onGoToOrganizer} className="text-xs text-primary hover:underline">Перейти →</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Предстоящих событий", value: upcomingEvents.length, icon: "CalendarDays", color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Всего событий", value: orgData.stats.total_events ?? 0, icon: "Layers", color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Участников всего", value: orgData.stats.total_participants ?? 0, icon: "Users", color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Черновики", value: orgData.stats.drafts ?? 0, icon: "FileEdit", color: "text-amber-600", bg: "bg-amber-50" },
            ].map((m) => (
              <Card key={m.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mb-2`}>
                    <Icon name={m.icon} size={15} className={m.color} />
                  </div>
                  <div className="text-xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ОРГАНИЗАТОР — ближайшие события */}
      {isOrganizer && upcomingEvents.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="CalendarCheck" size={14} className="text-emerald-600" />
              Ближайшие события
            </h3>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Icon name="Calendar" size={14} className="text-emerald-600" />
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
                </div>
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