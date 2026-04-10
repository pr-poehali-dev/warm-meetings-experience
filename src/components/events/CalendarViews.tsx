import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import { EventItem, getTypeColors } from "@/data/events";
import {
  parseISO, isSameDay, format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isToday,
  startOfDay, isBefore,
} from "date-fns";
import { ru } from "date-fns/locale";
import { getTypeMeta } from "./calendarUtils";
import { SpotDot, EventTooltip } from "./CalendarShared";

// ═══════════════════════════════════════════════════════════════════════════════
// РЕЖИМ: МЕСЯЦ
// ═══════════════════════════════════════════════════════════════════════════════
export function MonthView({ events, currentDate, selectedDate, onDateSelect }: {
  events: EventItem[];
  currentDate: Date;
  selectedDate: Date | undefined;
  onDateSelect: (d: Date) => void;
}) {
  const [tooltipEvent, setTooltipEvent] = useState<{ event: EventItem; key: string } | null>(null);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = start;
    while (day <= end) { days.push(day); day = addDays(day, 1); }
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((e) => {
      const key = format(parseISO(e.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${wi < weeks.length - 1 ? "border-b border-border" : ""}`}>
            {week.map((day, di) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(key) || [];
              const isOtherMonth = !isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const MAX_SHOW = 2;

              return (
                <div
                  key={di}
                  className={`relative min-h-[80px] p-1.5 cursor-pointer transition-colors
                    ${di < 6 ? "border-r border-border" : ""}
                    ${isOtherMonth ? "bg-muted/30" : "bg-card"}
                    ${isSelected ? "ring-2 ring-inset ring-primary" : ""}
                    hover:bg-accent/5`}
                  onClick={() => onDateSelect(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                      ${isTodayDay ? "bg-primary text-primary-foreground" : isOtherMonth ? "text-muted-foreground/50" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > MAX_SHOW && (
                      <span className="text-[10px] text-muted-foreground font-medium">+{dayEvents.length - MAX_SHOW}</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, MAX_SHOW).map((ev) => {
                      const meta = getTypeMeta(ev.type);
                      const tooltipKey = `${key}-${ev.slug}`;
                      return (
                        <div
                          key={ev.slug}
                          className="relative flex items-center gap-1 text-[10px] rounded px-1 py-0.5 hover:bg-accent/10 cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTooltipEvent(tooltipEvent?.key === tooltipKey ? null : { event: ev, key: tooltipKey });
                          }}
                        >
                          <SpotDot event={ev} />
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0`} />
                          <span className="truncate text-foreground/80">{ev.timeStart}</span>
                          <span className="font-medium text-muted-foreground">{meta.short}</span>

                          {tooltipEvent?.key === tooltipKey && (
                            <EventTooltip event={ev} onClose={() => setTooltipEvent(null)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// РЕЖИМ: НЕДЕЛЯ
// ═══════════════════════════════════════════════════════════════════════════════
export function WeekView({ events, currentDate, onDateSelect }: {
  events: EventItem[];
  currentDate: Date;
  onDateSelect: (d: Date) => void;
}) {
  const [tooltipEvent, setTooltipEvent] = useState<{ event: EventItem; key: string } | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const HOUR_HEIGHT = 48;
  const START_HOUR = 8;
  const TOTAL_HOURS = 16;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((e) => {
      const key = format(parseISO(e.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 560 }}>
        {/* header */}
        <div className="grid border border-border rounded-t-xl overflow-hidden" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          <div className="bg-muted/30" />
          {days.map((d, i) => (
            <div
              key={i}
              className={`text-center py-2 text-xs font-medium border-l border-border cursor-pointer hover:bg-accent/5
                ${isToday(d) ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}
              onClick={() => onDateSelect(d)}
            >
              <div>{format(d, "EEE", { locale: ru })}</div>
              <div className={`text-base font-bold ${isToday(d) ? "text-primary" : "text-foreground"}`}>{format(d, "d")}</div>
            </div>
          ))}
        </div>

        {/* body */}
        <div className="relative border-x border-b border-border rounded-b-xl overflow-hidden" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          <div className="absolute inset-0" style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            {/* time column */}
            <div className="border-r border-border">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div key={i} className="flex items-start justify-end pr-2 text-[10px] text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
                  <span className="-translate-y-2">{String(START_HOUR + i).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            {/* hour grid lines */}
            {days.map((d, di) => {
              const key = format(d, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(key) || [];

              return (
                <div key={di} className="relative border-l border-border">
                  {/* hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="border-b border-border/40" style={{ height: HOUR_HEIGHT }} />
                  ))}

                  {/* events */}
                  {dayEvents.map((ev) => {
                    const [sh, sm] = (ev.timeStart || "19:00").split(":").map(Number);
                    const [eh, em] = (ev.timeEnd || "23:00").split(":").map(Number);
                    const top = ((sh - START_HOUR) + sm / 60) * HOUR_HEIGHT;
                    const height = Math.max(((eh - sh) + (em - sm) / 60) * HOUR_HEIGHT, 24);
                    const meta = getTypeMeta(ev.type);
                    const tooltipKey = `week-${key}-${ev.slug}`;

                    return (
                      <div
                        key={ev.slug}
                        className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium cursor-pointer
                          text-white opacity-90 hover:opacity-100 transition-opacity overflow-hidden`}
                        style={{ top, height: height - 2, background: meta.dot.replace("bg-[", "").replace("]", "") }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTooltipEvent(tooltipEvent?.key === tooltipKey ? null : { event: ev, key: tooltipKey });
                        }}
                      >
                        <div className="truncate">{ev.timeStart} {meta.short}</div>
                        <div className="truncate opacity-80">{ev.title}</div>
                        {tooltipEvent?.key === tooltipKey && (
                          <EventTooltip event={ev} onClose={() => setTooltipEvent(null)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// РЕЖИМ: ДЕНЬ
// ═══════════════════════════════════════════════════════════════════════════════
export function DayView({ events, currentDate }: { events: EventItem[]; currentDate: Date }) {
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(parseISO(e.date), currentDate))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart)),
    [events, currentDate]
  );

  if (dayEvents.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Icon name="CalendarX" size={40} className="mx-auto mb-3 opacity-30" />
        <p>Нет встреч на этот день</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dayEvents.map((ev) => {
        const meta = getTypeMeta(ev.type);
        const pct = ev.totalSpots > 0 ? ev.spotsLeft / ev.totalSpots : 1;
        const spotsText =
          ev.totalSpots === 0 ? null :
          ev.spotsLeft === 0 ? "Мест нет" :
          `Свободно: ${ev.spotsLeft} ${ev.spotsLeft === 1 ? "место" : ev.spotsLeft < 5 ? "места" : "мест"}`;
        const spotsColor = pct === 0 ? "text-red-600" : pct <= 0.3 ? "text-yellow-600" : "text-green-600";
        const past = isBefore(parseISO(ev.date), startOfDay(new Date()));

        return (
          <div key={ev.slug} className={`rounded-xl border border-border bg-card p-4 ${past ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`w-1 self-stretch rounded-full shrink-0 ${meta.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground">{ev.timeStart}</span>
                  <span className="text-xs text-muted-foreground">— {ev.timeEnd}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColors(ev.type).bg} ${getTypeColors(ev.type).color}`}>
                    {ev.type}
                  </span>
                </div>
                <h4 className="font-semibold text-base mb-1 line-clamp-1">{ev.title}</h4>
                {ev.bathName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Icon name="MapPin" size={11} />
                    {ev.bathName}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 text-xs">
                    {ev.priceLabel && <span className="font-semibold text-foreground">{ev.priceLabel}</span>}
                    {spotsText && <span className={`font-medium ${spotsColor}`}>{spotsText}</span>}
                  </div>
                  <Button asChild size="sm" variant={ev.spotsLeft === 0 ? "outline" : "default"} className="rounded-full h-7 text-xs" disabled={ev.spotsLeft === 0}>
                    <Link to={`/events/${ev.slug}`}>
                      {ev.spotsLeft === 0 ? "Нет мест" : "Записаться"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
