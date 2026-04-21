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
  onEditEvent?: (event: OrgEvent) => void;
  onStatClick?: (filter: string) => void;
}

export default function OrgDashboard({ data, onCreateEvent, onManageEvent, onViewAll, onEditEvent, onStatClick }: Props) {
  const { user, stats, upcoming_events } = data;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

  const occupancyBadge = (e: OrgEvent) => {
    const ratio = e.total_spots ? e.signups_count / e.total_spots : 0;
    if (ratio >= 1) return <Badge className="bg-red-100 text-red-700 text-xs">Полный</Badge>;
    if (ratio >= 0.7) return <Badge className="bg-orange-100 text-orange-700 text-xs">Почти полный</Badge>;
    return <Badge className="bg-green-100 text-green-700 text-xs">Есть места</Badge>;
  };

  const now = new Date().toISOString().split("T")[0];

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
          { label: "Проведено событий", value: stats.total_events, icon: "CalendarCheck", color: "text-blue-600", filter: "past" },
          { label: "Предстоящих", value: stats.upcoming_events, icon: "Calendar", color: "text-green-600", filter: "upcoming" },
          { label: "Всего участников", value: stats.total_participants, icon: "Users", color: "text-purple-600", filter: "all" },
          { label: "Черновики", value: stats.drafts, icon: "FileText", color: "text-gray-600", filter: "draft" },
        ].map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30"
            onClick={() => onStatClick?.(s.filter)}
          >
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
                <Card key={ev.id} className={`transition-all ${!ev.is_visible ? "opacity-70" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {ev.image_url && (
                        <img
                          src={ev.image_url}
                          alt={ev.title}
                          className="w-16 h-16 rounded-lg object-cover shrink-0 hidden sm:block"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate">{ev.title}</span>
                              {!ev.is_visible && <Badge variant="secondary" className="text-xs shrink-0">черновик</Badge>}
                              {ev.event_date >= now && ev.is_visible && occupancyBadge(ev)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Icon name="Calendar" size={12} />
                                {formatDate(ev.event_date)}
                              </span>
                              {ev.start_time && (
                                <span className="flex items-center gap-1">
                                  <Icon name="Clock" size={12} />
                                  {ev.start_time.slice(0, 5)}–{ev.end_time?.slice(0, 5)}
                                </span>
                              )}
                              {ev.bath_name && (
                                <span className="flex items-center gap-1 truncate">
                                  <Icon name="MapPin" size={12} />
                                  {ev.bath_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold">
                              {ev.signups_count}/{ev.total_spots || "∞"}
                            </div>
                            <div className="text-xs text-muted-foreground">участников</div>
                            {ev.price_amount > 0 && (
                              <div className="text-xs text-green-600 font-medium mt-0.5">
                                {(ev.signups_count * ev.price_amount).toLocaleString("ru")} ₽
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {onEditEvent && (
                            <Button size="sm" variant="outline" onClick={() => onEditEvent(ev)} className="h-7 text-xs gap-1">
                              <Icon name="Pencil" size={12} />
                              Редактировать
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => onManageEvent(ev)} className="h-7 text-xs gap-1">
                            <Icon name="Users" size={12} />
                            Участники ({ev.signups_count})
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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