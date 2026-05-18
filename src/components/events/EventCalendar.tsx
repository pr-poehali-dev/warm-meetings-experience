import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { EventItem } from "@/data/events";
import {
  format, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  addWeeks, subWeeks,
} from "date-fns";
import { ru } from "date-fns/locale";
import { LEGEND } from "./calendarUtils";
import { MonthView, WeekView, DayView } from "./CalendarViews";

type CalendarMode = "month" | "week" | "day";

interface EventCalendarProps {
  events: EventItem[];
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date | undefined;
  filterType?: string;
  filterBath?: string;
  filterAvailability?: string;
  themed?: boolean;
}

export default function EventCalendar({
  events,
  onDateSelect,
  selectedDate,
  filterType = "all",
  filterBath = "all",
  filterAvailability = "all",
  themed = false,
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

  if (themed) {
    return (
      <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* ── шапка навигации (themed) ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:brightness-110"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--c-cream)" }}
              onClick={goPrev}
            >
              <Icon name="ChevronLeft" size={16} />
            </button>
            <span
              className="text-sm font-semibold min-w-[180px] text-center capitalize"
              style={{ color: "var(--c-cream)" }}
            >
              {navLabel}
            </span>
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:brightness-110"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--c-cream)" }}
              onClick={goNext}
            >
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>

          <button
            className="h-8 px-4 rounded-full text-xs font-medium transition-all hover:brightness-110"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--c-terra)" }}
            onClick={goToday}
          >
            Сегодня
          </button>

          <div className="ml-auto flex gap-1 rounded-full p-1" style={{ background: "var(--toggle-bg)" }}>
            {(["month", "week", "day"] as CalendarMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
                style={mode === m
                  ? { background: "rgba(200,131,74,0.3)", color: "var(--c-terra)" }
                  : { color: "var(--toggle-idle)" }
                }
              >
                {m === "month" ? "Месяц" : m === "week" ? "Неделя" : "День"}
              </button>
            ))}
          </div>
        </div>

        {/* ── легенда (themed) ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs" style={{ color: "var(--c-muted)" }}>
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
              {l.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" /> Есть места
            <span className="w-2 h-2 rounded-full bg-yellow-500 dark:bg-yellow-400 ml-2" /> Мало
            <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 ml-2" /> Нет мест
          </div>
        </div>

        {mode === "month" && <MonthView events={filteredEvents} currentDate={currentDate} selectedDate={selectedDate} onDateSelect={handleDateSelect} themed />}
        {mode === "week" && <WeekView events={filteredEvents} currentDate={currentDate} onDateSelect={handleDateSelect} themed />}
        {mode === "day" && <DayView events={filteredEvents} currentDate={currentDate} themed />}
      </div>
    );
  }

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