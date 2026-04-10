import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import { EventItem, getTypeColors } from "@/data/events";
import {
  parseISO, isSameDay, format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  addWeeks, subWeeks, isSameMonth, isToday, startOfDay,
  getHours, getMinutes, differenceInMinutes, isBefore,
} from "date-fns";
import { ru } from "date-fns/locale";

// ── цветовая кодировка типов событий ─────────────────────────────────────────
const TYPE_META: Record<string, { dot: string; label: string; short: string }> = {
  "мужской":   { dot: "bg-[#C0674B]", label: "Мужской",   short: "М"  },
  "женский":   { dot: "bg-[#E8A2A2]", label: "Женский",   short: "Ж"  },
  "смешанный": { dot: "bg-[#5B8C5A]", label: "Смешанный", short: "С"  },
  "мастер":    { dot: "bg-[#4A90E2]", label: "С мастером", short: "Мс" },
  "мужской пар": { dot: "bg-[#C0674B]", label: "Мужской пар", short: "М" },
  "женский пар": { dot: "bg-[#E8A2A2]", label: "Женский пар", short: "Ж" },
};
const LEGEND = [
  { dot: "bg-[#C0674B]", label: "Мужской" },
  { dot: "bg-[#E8A2A2]", label: "Женский" },
  { dot: "bg-[#5B8C5A]", label: "Смешанный" },
  { dot: "bg-[#4A90E2]", label: "С мастером" },
];

function getTypeMeta(type: string) {
  const key = Object.keys(TYPE_META).find((k) => type.toLowerCase().includes(k));
  return key ? TYPE_META[key] : { dot: "bg-gray-400", label: type, short: type.slice(0, 2) };
}

// ── индикатор мест ─────────────────────────────────────────────────────────────
function SpotDot({ event }: { event: EventItem }) {
  const past = isBefore(parseISO(event.date), startOfDay(new Date()));
  if (past) return <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" title="Прошло" />;
  if (event.totalSpots === 0) return null;
  const pct = event.spotsLeft / event.totalSpots;
  const cls = pct === 0 ? "bg-red-500" : pct <= 0.3 ? "bg-yellow-400" : "bg-green-500";
  const label = pct === 0 ? "Мест нет" : pct <= 0.3 ? "Мало мест" : "Есть места";
  return <span className={`w-2 h-2 rounded-full ${cls} shrink-0`} title={label} />;
}

// ── мини-тултип (popup) при клике/hover ────────────────────────────────────────
function EventTooltip({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const meta = getTypeMeta(event.type);
  const pct = event.totalSpots > 0 ? event.spotsLeft / event.totalSpots : 1;
  const spotsText =
    event.totalSpots === 0 ? "" :
    event.spotsLeft === 0 ? "Мест нет" :
    `${event.spotsLeft} ${event.spotsLeft === 1 ? "место" : event.spotsLeft < 5 ? "места" : "мест"}`;
  const spotsColor = pct === 0 ? "text-red-600" : pct <= 0.3 ? "text-yellow-600" : "text-green-600";

  return (
    <div
      ref={ref}
      className="absolute z-50 left-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl p-4 text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot} shrink-0`} />
        <span className="font-semibold text-foreground line-clamp-2">{event.title}</span>
      </div>
      <div className="space-y-1 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <Icon name="Clock" size={12} />
          {event.timeStart} — {event.timeEnd}
        </div>
        {event.bathName && (
          <div className="flex items-center gap-1.5">
            <Icon name="MapPin" size={12} />
            {event.bathName}
          </div>
        )}
        {event.priceLabel && (
          <div className="flex items-center gap-1.5">
            <Icon name="Banknote" size={12} />
            {event.priceLabel}
          </div>
        )}
        {spotsText && (
          <div className={`flex items-center gap-1.5 font-medium ${spotsColor}`}>
            <Icon name="Users" size={12} />
            {spotsText}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Button asChild size="sm" className="flex-1 h-7 text-xs rounded-full">
          <Link to={`/events/${event.slug}`} onClick={onClose}>
            {event.spotsLeft === 0 ? "Подробнее" : "Записаться"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// РЕЖИМ: МЕСЯЦ
// ═══════════════════════════════════════════════════════════════════════════════
function MonthView({ events, currentDate, selectedDate, onDateSelect }: {
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
function WeekView({ events, currentDate, onDateSelect }: {
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
function DayView({ events, currentDate }: { events: EventItem[]; currentDate: Date }) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════
type CalendarMode = "month" | "week" | "day";

interface EventCalendarProps {
  events: EventItem[];
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date | undefined;
  filterType?: string;
  filterBath?: string;
  filterAvailability?: string;
}

export default function EventCalendar({
  events,
  onDateSelect,
  selectedDate,
  filterType = "all",
  filterBath = "all",
  filterAvailability = "all",
}: EventCalendarProps) {
  const [mode, setMode] = useState<CalendarMode>(() =>
    window.innerWidth < 640 ? "day" : "month"
  );
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  // touch swipe
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { if (dx < 0) goNext(); else goPrev(); }
    touchStartX.current = null;
  };

  const goNext = () => {
    if (mode === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (mode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };
  const goPrev = () => {
    if (mode === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (mode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, -1));
  };
  const goToday = () => setCurrentDate(new Date());

  const handleDateSelect = (d: Date) => {
    setCurrentDate(d);
    if (mode === "month") setMode("day");
    onDateSelect?.(d);
  };

  // фильтрация
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterBath !== "all" && e.bathName !== filterBath) return false;
      if (filterAvailability === "available" && e.spotsLeft === 0) return false;
      return true;
    });
  }, [events, filterType, filterBath, filterAvailability]);

  const navLabel = useMemo(() => {
    if (mode === "month") return format(currentDate, "LLLL yyyy", { locale: ru });
    if (mode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: ru })} — ${format(we, "d MMM yyyy", { locale: ru })}`;
    }
    return format(currentDate, "EEEE, d MMMM yyyy", { locale: ru });
  }, [mode, currentDate]);

  return (
    <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* ── шапка навигации ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={goPrev}>
            <Icon name="ChevronLeft" size={16} />
          </Button>
          <span className="text-sm font-semibold min-w-[180px] text-center capitalize">{navLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={goNext}>
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>

        <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={goToday}>
          Сегодня
        </Button>

        <div className="ml-auto flex gap-1 bg-muted rounded-full p-1">
          {(["month", "week", "day"] as CalendarMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "month" ? "Месяц" : m === "week" ? "Неделя" : "День"}
            </button>
          ))}
        </div>
      </div>

      {/* ── легенда ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
            {l.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Есть места
          <span className="w-2 h-2 rounded-full bg-yellow-400 ml-2" /> Мало
          <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Нет мест
        </div>
      </div>

      {/* ── виды ────────────────────────────────────────────────────────── */}
      {mode === "month" && (
        <MonthView
          events={filteredEvents}
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      )}
      {mode === "week" && (
        <WeekView
          events={filteredEvents}
          currentDate={currentDate}
          onDateSelect={handleDateSelect}
        />
      )}
      {mode === "day" && (
        <DayView events={filteredEvents} currentDate={currentDate} />
      )}
    </div>
  );
}