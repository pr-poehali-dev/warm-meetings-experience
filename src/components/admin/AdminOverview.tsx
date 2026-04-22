import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useAdminBadges } from "@/hooks/useAdminBadges";
import { ViewType } from "@/types/admin";

interface Event {
  id?: number;
  title: string;
  event_date: string;
  is_visible: boolean;
  occupancy?: string;
  total_spots?: number;
  spots_left?: number;
  [key: string]: unknown;
}

interface AdminOverviewProps {
  events: Event[];
  onViewChange: (view: ViewType) => void;
  onEditEvent: (event: Event) => void;
}

const OCCUPANCY_LABEL: Record<string, string> = { low: "Свободно", medium: "Заполняется", high: "Почти полный" };
const OCCUPANCY_COLOR: Record<string, string> = {
  low: "text-green-700 bg-green-50",
  medium: "text-amber-700 bg-amber-50",
  high: "text-red-700 bg-red-50",
};

interface QuickAction {
  label: string;
  hint: string;
  icon: string;
  view: ViewType;
  accent: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Создать встречу", hint: "Новое событие для участников", icon: "Plus", view: "add", accent: "bg-primary text-white hover:bg-primary/90" },
  { label: "Заявки участников", hint: "Подтвердить записи", icon: "ClipboardList", view: "event-signups", accent: "bg-white border hover:bg-gray-50 text-gray-800" },
  { label: "Заявки на роли", hint: "Одобрить мастеров и организаторов", icon: "Shield", view: "roles", accent: "bg-white border hover:bg-gray-50 text-gray-800" },
  { label: "Статьи блога", hint: "Промодерировать публикации", icon: "BookOpen", view: "blog", accent: "bg-white border hover:bg-gray-50 text-gray-800" },
];

export default function AdminOverview({ events, onViewChange, onEditEvent }: AdminOverviewProps) {
  const { badges } = useAdminBadges();

  const published = events.filter((e) => e.is_visible);
  const hidden = events.filter((e) => !e.is_visible);
  const upcoming = events
    .filter((e) => e.is_visible && new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 5);
  const recent = events.slice(0, 5);

  const totalPending = badges.events + badges.calculator + badges.community;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать в панель управления</h1>
        <p className="text-gray-500 mt-1 text-sm">Здесь вы управляете всем контентом и пользователями сайта</p>
      </div>

      {totalPending > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Icon name="Bell" size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-amber-800">Требует внимания: </span>
            <span className="text-amber-700">
              {[
                badges.events > 0 && `${badges.events} заявок на встречи`,
                badges.calculator > 0 && `${badges.calculator} заявок из калькулятора`,
                badges.community > 0 && `${badges.community} заявок на роли`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Всего встреч", value: events.length, icon: "CalendarDays", color: "text-gray-700", onClick: () => onViewChange("list") },
          { label: "Опубликовано", value: published.length, icon: "Eye", color: "text-green-600", onClick: () => onViewChange("list") },
          { label: "Скрыто", value: hidden.length, icon: "EyeOff", color: "text-gray-400", onClick: () => onViewChange("list") },
          { label: "Новых заявок", value: totalPending, icon: "Bell", color: "text-amber-600", onClick: () => onViewChange("event-signups") },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={stat.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <Icon name={stat.icon} size={15} className={stat.color} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Быстрые действия</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const badge = action.view === "event-signups" ? badges.events
              : action.view === "roles" ? badges.community
              : 0;
            return (
              <button
                key={action.view}
                onClick={() => onViewChange(action.view)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${action.accent}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.view === "add" ? "bg-white/20" : "bg-gray-100"}`}>
                  <Icon name={action.icon} size={16} className={action.view === "add" ? "text-white" : "text-gray-600"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className={`text-xs truncate ${action.view === "add" ? "text-white/70" : "text-gray-400"}`}>{action.hint}</div>
                </div>
                {badge > 0 && (
                  <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ближайшие встречи</h2>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onViewChange("list")}>
              Все <Icon name="ChevronRight" size={13} className="ml-0.5" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Нет предстоящих встреч</div>
              ) : (
                upcoming.map((event, idx) => (
                  <div
                    key={event.id}
                    onClick={() => onEditEvent(event)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${idx !== upcoming.length - 1 ? "border-b" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="CalendarDays" size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                      <p className="text-xs text-gray-400">{new Date(event.event_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p>
                    </div>
                    {event.total_spots ? (
                      <span className="text-xs text-gray-500 flex-shrink-0">{event.spots_left}/{event.total_spots} мест</span>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${OCCUPANCY_COLOR[event.occupancy || "low"]}`}>
                        {OCCUPANCY_LABEL[event.occupancy || "low"]}
                      </span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Последние добавленные</h2>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onViewChange("list")}>
              Все <Icon name="ChevronRight" size={13} className="ml-0.5" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Встреч ещё нет</div>
              ) : (
                recent.map((event, idx) => (
                  <div
                    key={event.id}
                    onClick={() => onEditEvent(event)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${idx !== recent.length - 1 ? "border-b" : ""}`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${event.is_visible ? "bg-green-400" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                      <p className="text-xs text-gray-400">{event.is_visible ? "Опубликовано" : "Скрыто"}</p>
                    </div>
                    <Icon name="ChevronRight" size={14} className="text-gray-300 flex-shrink-0" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
