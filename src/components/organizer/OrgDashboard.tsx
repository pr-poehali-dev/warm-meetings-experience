import { DashboardData, OrgEvent } from "@/lib/organizer-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";

interface Props {
  data: DashboardData;
  onCreateEvent: () => void;
  onManageEvent: (event: OrgEvent) => void;
  onViewAll: () => void;
}

export default function OrgDashboard({ data, onCreateEvent, onManageEvent, onViewAll }: Props) {
  const { user, stats, upcoming_events } = data;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const statusColor = (e: OrgEvent) => {
    const ratio = e.signups_count / (e.total_spots || 1);
    if (ratio >= 1) return "text-red-500";
    if (ratio >= 0.7) return "text-orange-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Добро пожаловать, {user.name}!</h1>
          <p className="text-muted-foreground text-sm mt-1">Личный кабинет организатора</p>
        </div>
        <Button onClick={onCreateEvent} className="gap-2">
          <Icon name="Plus" size={16} />
          Создать событие
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Проведено событий", value: stats.total_events, icon: "CalendarCheck", color: "text-blue-600" },
          { label: "Предстоящих", value: stats.upcoming_events, icon: "Calendar", color: "text-green-600" },
          { label: "Всего участников", value: stats.total_participants, icon: "Users", color: "text-purple-600" },
          { label: "Черновики", value: stats.drafts, icon: "FileText", color: "text-gray-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className={`${s.color} mb-2`}>
                <Icon name={s.icon} size={22} />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ближайшие события</CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs gap-1">
              Все события <Icon name="ChevronRight" size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcoming_events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="CalendarX" size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Нет предстоящих событий</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onCreateEvent}>
                Создать первое
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming_events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name={ev.event_type_icon || "Calendar"} size={18} className="text-primary" fallback="Calendar" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{formatDate(ev.event_date)}</span>
                        {ev.bath_name && <span className="truncate">· {ev.bath_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right hidden sm:block">
                      <div className={`text-sm font-semibold ${statusColor(ev)}`}>
                        {ev.signups_count}/{ev.total_spots || "∞"}
                      </div>
                      <div className="text-xs text-muted-foreground">участников</div>
                    </div>
                    {ev.price_amount > 0 && (
                      <div className="text-right hidden md:block">
                        <div className="text-sm font-semibold">{ev.price_amount.toLocaleString("ru")} ₽</div>
                        <div className="text-xs text-muted-foreground">собрано</div>
                      </div>
                    )}
                    {!ev.is_visible && (
                      <Badge variant="secondary" className="text-xs">черновик</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onManageEvent(ev)}>
                      Управление
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button variant="outline" className="h-14 gap-2 text-sm" onClick={onCreateEvent}>
          <Icon name="Plus" size={18} />
          Создать событие
        </Button>
        <Button variant="outline" className="h-14 gap-2 text-sm" onClick={onViewAll}>
          <Icon name="List" size={18} />
          Все мои события
        </Button>
        <Button variant="outline" className="h-14 gap-2 text-sm" disabled>
          <Icon name="BarChart2" size={18} />
          Аналитика (скоро)
        </Button>
      </div>
    </div>
  );
}
