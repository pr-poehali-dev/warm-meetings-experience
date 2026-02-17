import { Calendar } from "@/components/ui/calendar";
import { EventItem, getTypeColors } from "@/data/events";
import { parseISO, isSameDay, format } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";

interface EventCalendarProps {
  events: EventItem[];
  onDateSelect: (date: Date | undefined) => void;
  selectedDate: Date | undefined;
}

export default function EventCalendar({ events, onDateSelect, selectedDate }: EventCalendarProps) {
  const [month, setMonth] = useState(new Date());

  const eventDates = events.map((e) => parseISO(e.date));

  const eventsForSelectedDate = selectedDate
    ? events.filter((e) => isSameDay(parseISO(e.date), selectedDate))
    : [];

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        month={month}
        onMonthChange={setMonth}
        locale={ru}
        modifiers={{ hasEvent: eventDates }}
        modifiersClassNames={{ hasEvent: "bg-accent/20 font-bold text-accent" }}
        className="rounded-lg border-0 shadow-sm bg-card p-4"
      />

      {selectedDate && eventsForSelectedDate.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground px-1">
            {format(selectedDate, "d MMMM", { locale: ru })}:
          </h4>
          {eventsForSelectedDate.map((event) => {
            const typeColors = getTypeColors(event.type);
            return (
              <a
                key={event.slug}
                href={`/events/${event.slug}`}
                className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeColors.bg} ${typeColors.color}`}>
                    {event.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.timeStart} — {event.timeEnd}
                  </span>
                </div>
                <div className="text-sm font-medium">{event.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[event.bathName, event.priceLabel].filter(Boolean).join(" · ")}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {selectedDate && eventsForSelectedDate.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Нет событий на эту дату
        </p>
      )}
    </div>
  );
}
