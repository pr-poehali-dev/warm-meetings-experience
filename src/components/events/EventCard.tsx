import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import { EventItem, EVENT_TYPE_CONFIG } from "@/data/events";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface EventCardProps {
  event: EventItem;
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const typeConfig = EVENT_TYPE_CONFIG[event.type];
  const dateObj = parseISO(event.date);
  const spotsColor =
    event.spotsLeft === 0
      ? "text-red-600"
      : event.spotsLeft <= 2
        ? "text-orange-600"
        : "text-green-600";

  if (compact) {
    return (
      <Link to={`/events/${event.slug}`}>
        <Card className="bg-card border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              <span className={`text-xs font-medium ${spotsColor}`}>
                {event.spotsLeft === 0 ? "Мест нет" : `Осталось ${event.spotsLeft}`}
              </span>
            </div>
            <h3 className="text-base font-semibold mb-2 group-hover:text-accent transition-colors line-clamp-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={14} />
                {format(dateObj, "d MMM", { locale: ru })}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Clock" size={14} />
                {event.timeStart}
              </span>
            </div>
            <div className="mt-2 text-sm font-medium text-accent">{event.priceLabel}</div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/events/${event.slug}`}>
      <Card className="bg-card border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${typeConfig.bg} ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium bg-white/90 ${spotsColor}`}>
              {event.spotsLeft === 0 ? "Мест нет" : `Осталось ${event.spotsLeft}`}
            </span>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              <Icon name="Calendar" size={14} />
              {format(dateObj, "d MMMM, EEEE", { locale: ru })}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="Clock" size={14} />
              {event.timeStart} — {event.timeEnd}
            </span>
          </div>

          <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition-colors">
            {event.title}
          </h3>

          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{event.description}</p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Icon name="MapPin" size={14} />
            <span>{event.bathName}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-accent">{event.priceLabel}</div>
            <Button size="sm" className="rounded-full">
              Подробнее
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
