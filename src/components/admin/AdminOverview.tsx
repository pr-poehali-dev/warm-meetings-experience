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

const PRIORITY_LABEL: Record<string, string> = {
  high: "Срочно",
  medium: "Средний",
  low: "Низкий",
};
const PRIORITY_CLS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Открыт",
  in_progress: "В работе",
  awaiting_reply: "Ждёт юзера",
  closed: "Закрыт",
};

interface AttentionCard {
  label: string;
  hint: string;
  icon: string;
  count: number;
  view: ViewType;
  tone: "danger" | "warning" | "info" | "muted";
}

const TONE_CLS: Record<AttentionCard["tone"], string> = {
  danger: "border-red-200 bg-red-50/70 hover:bg-red-100/70",
  warning: "border-amber-200 bg-amber-50/70 hover:bg-amber-100/70",
  info: "border-blue-200 bg-blue-50/70 hover:bg-blue-100/70",
  muted: "border-border bg-muted/40 hover:bg-muted/60",
};

const TONE_BADGE: Record<AttentionCard["tone"], string> = {
  danger: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
  muted: "bg-muted-foreground/30 text-foreground",
};

export default function AdminOverview({
  events,
  onViewChange,
  onEditEvent,
}: AdminOverviewProps) {
  const { badges, insights } = useAdminBadges();

  const upcoming = events
    .filter((e) => e.is_visible && new Date(e.event_date) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
    )
    .slice(0, 5);

  const attentionCards: AttentionCard[] = [
    {
      label: "Тикеты поддержки",
      hint: badges.support > 0 ? "Открытые обращения" : "Все обработаны",
      icon: "LifeBuoy",
      count: badges.support,
      view: "support",
      tone: badges.support > 5 ? "danger" : badges.support > 0 ? "warning" : "muted",
    },
    {
      label: "Журнал ошибок",
      hint: "Ошибки сайта и сервера",
      icon: "Bug",
      count: 0,
      view: "errors",
      tone: "muted",
    },
    {
      label: "Гости (CRM)",
      hint: "Единая база гостей",
      icon: "Users",
      count: badges.events,
      view: "event-signups",
      tone: badges.events > 0 ? "info" : "muted",
    },
    {
      label: "Заявки на роли",
      hint: "Мастера и организаторы",
      icon: "Shield",
      count: badges.community,
      view: "roles",
      tone: badges.community > 0 ? "info" : "muted",
    },
    {
      label: "Модерация событий",
      hint: "От организаторов",
      icon: "ShieldCheck",
      count: badges.moderation,
      view: "moderation",
      tone: badges.moderation > 0 ? "warning" : "muted",
    },
    {
      label: "Статьи блога",
      hint: "Ждут публикации",
      icon: "BookOpen",
      count: badges.blog,
      view: "blog",
      tone: badges.blog > 0 ? "info" : "muted",
    },
    {
      label: "Видео",
      hint: "Ждут проверки",
      icon: "Video",
      count: badges.videos,
      view: "videos",
      tone: badges.videos > 0 ? "info" : "muted",
    },
    {
      label: "Мастера",
      hint: "Ждут верификации",
      icon: "Sparkles",
      count: badges.masters,
      view: "masters",
      tone: badges.masters > 0 ? "info" : "muted",
    },
  ];

  const totalPending = attentionCards.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Командный центр</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {totalPending > 0
              ? `${totalPending} задач требуют вашего внимания`
              : "Сейчас всё спокойно — отличная работа!"}
          </p>
        </div>
        <button
          onClick={() => {
            const ev = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              ctrlKey: true,
              bubbles: true,
            });
            document.dispatchEvent(ev);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm text-muted-foreground transition-colors"
        >
          <Icon name="Search" size={14} />
          <span>Найти что угодно…</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px]">
            ⌘K
          </kbd>
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Требует внимания
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {attentionCards.map((card) => (
            <button
              key={card.view + card.label}
              onClick={() => onViewChange(card.view)}
              className={`text-left rounded-xl border p-4 transition-all ${TONE_CLS[card.tone]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon name={card.icon} size={16} className="text-gray-600" />
                {card.count > 0 && (
                  <span
                    className={`min-w-[24px] h-6 px-2 rounded-full text-[11px] font-bold flex items-center justify-center ${TONE_BADGE[card.tone]}`}
                  >
                    {card.count > 99 ? "99+" : card.count}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-gray-900">{card.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Срочные тикеты
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => onViewChange("support")}
            >
              Все <Icon name="ChevronRight" size={13} className="ml-0.5" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {insights.loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Загружаем…</div>
              ) : insights.highTickets.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Нет открытых обращений
                </div>
              ) : (
                insights.highTickets.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => onViewChange("support")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${idx !== insights.highTickets.length - 1 ? "border-b" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="LifeBuoy" size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        #{t.id} · {t.subject}
                      </p>
                      <p className="text-xs text-gray-400">
                        {STATUS_LABEL[t.status] || t.status}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_CLS[t.priority] || "bg-slate-100 text-slate-600"}`}
                    >
                      {PRIORITY_LABEL[t.priority] || t.priority}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Новые брони
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => onViewChange("bookings")}
            >
              Все <Icon name="ChevronRight" size={13} className="ml-0.5" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {insights.loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Загружаем…</div>
              ) : insights.recentBookings.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Новых заявок нет
                </div>
              ) : (
                insights.recentBookings.map((b, idx) => (
                  <button
                    key={b.id}
                    onClick={() => onViewChange("bookings")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${idx !== insights.recentBookings.length - 1 ? "border-b" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="FileText" size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        #{b.id} · {b.name || "Без имени"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {b.phone || "—"}
                      </p>
                    </div>
                    {typeof b.total_price === "number" && (
                      <span className="text-xs text-gray-600 font-medium flex-shrink-0">
                        {b.total_price.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              На модерацию
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              {insights.loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Загружаем…</div>
              ) : insights.pendingModerations.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Очередь модерации пуста
                </div>
              ) : (
                insights.pendingModerations.map((m, idx) => (
                  <div
                    key={`${m.type}-${idx}`}
                    className={`flex items-center gap-3 px-4 py-3 ${idx !== insights.pendingModerations.length - 1 ? "border-b" : ""}`}
                  >
                    <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                      {m.type}
                    </span>
                    <p className="text-sm text-gray-800 truncate flex-1">{m.title}</p>
                    {m.meta && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{m.meta}</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Ближайшие события
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => onViewChange("list")}
            >
              Все <Icon name="ChevronRight" size={13} className="ml-0.5" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Нет предстоящих встреч
                </div>
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
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.event_date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    {event.total_spots ? (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {event.spots_left}/{event.total_spots} мест
                      </span>
                    ) : null}
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