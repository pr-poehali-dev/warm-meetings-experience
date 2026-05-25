import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";
import Icon from "@/components/ui/icon";
import { masterBookingsApi, MasterService, MasterSlot } from "@/lib/master-calendar-api";

const DAYS_AHEAD = 30;

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function parseLocalISO(iso: string): Date {
  const clean = iso.replace("T", " ").replace(/\+.*$/, "").replace(/Z$/, "").trim();
  return new Date(clean);
}

function fmtTime(d: Date) {
  return format(d, "HH:mm");
}

function slotDurationMinutes(slot: MasterSlot): number {
  const s = parseLocalISO(slot.datetime_start).getTime();
  const e = parseLocalISO(slot.datetime_end).getTime();
  return Math.round((e - s) / 60000);
}

/**
 * Возможный «вариант времени начала» внутри окна доступности.
 * slot — само окно (физический слот в БД), start/end — конкретное время сеанса.
 */
export interface BookingOption {
  slot: MasterSlot;
  start: Date;
  end: Date;
}

interface MasterBookingFlowProps {
  masterId: number;
  services: MasterService[];
  onBookSlot: (option: BookingOption, service: MasterService) => void;
}

export default function MasterBookingFlow({ masterId, services, onBookSlot }: MasterBookingFlowProps) {
  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<MasterSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedService = useMemo(
    () => activeServices.find((s) => s.id === selectedServiceId) ?? null,
    [activeServices, selectedServiceId]
  );

  const today = startOfToday();
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadSlots = useCallback(async () => {
    if (!selectedServiceId) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const from = format(today, "yyyy-MM-dd");
      // Запрашиваем все слоты мастера — фильтр по услуге делаем сами,
      // чтобы поддержать «универсальные» окна доступности без service_id.
      const data = await masterBookingsApi.getPublicSlots(masterId, from);
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId, selectedServiceId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Из каждого подходящего «окна» собираем все возможные времена начала услуги
  const options = useMemo<BookingOption[]>(() => {
    if (!selectedService) return [];
    const duration = selectedService.duration_minutes;
    const now = new Date();
    const result: BookingOption[] = [];

    for (const slot of slots) {
      if (slot.status !== "available") continue;
      if (slot.booked_count >= slot.max_clients) continue;

      // Если слот жёстко привязан к другой услуге — пропускаем
      if (slot.service_id != null && slot.service_id !== selectedService.id) continue;

      const winStart = parseLocalISO(slot.datetime_start);
      const winEnd = parseLocalISO(slot.datetime_end);
      const winLen = slotDurationMinutes(slot);

      if (winLen < duration) continue;

      // Если слот привязан именно к этой услуге — берём его время как есть
      if (slot.service_id === selectedService.id) {
        if (winStart <= now) continue;
        result.push({ slot, start: winStart, end: winEnd });
        continue;
      }

      // Универсальное окно: разбиваем на интервалы по длительности услуги
      let cursor = new Date(winStart);
      while (cursor.getTime() + duration * 60000 <= winEnd.getTime()) {
        if (cursor > now) {
          const end = new Date(cursor.getTime() + duration * 60000);
          result.push({ slot, start: new Date(cursor), end });
        }
        cursor = new Date(cursor.getTime() + duration * 60000);
      }
    }

    return result.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [slots, selectedService]);

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  const optionsByDay = useMemo(() => {
    const map: Record<string, BookingOption[]> = {};
    options.forEach((o) => {
      const k = format(o.start, "yyyy-MM-dd");
      if (!map[k]) map[k] = [];
      map[k].push(o);
    });
    return map;
  }, [options]);

  // Авто-выбор первого дня со свободным временем
  useEffect(() => {
    if (!selectedService) {
      setSelectedDate(null);
      return;
    }
    const firstAvailable = days.find((d) => (optionsByDay[dayKey(d)] ?? []).length > 0);
    setSelectedDate(firstAvailable ?? null);
  }, [selectedServiceId, optionsByDay, days, selectedService]);

  const optionsForDay = selectedDate ? optionsByDay[dayKey(selectedDate)] ?? [] : [];
  const hasAnyOptions = options.length > 0;

  if (!activeServices.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-1">Запись на сеанс</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Выберите услугу, дату и удобное время — мастер подтвердит запись.
      </p>

      {/* ШАГ 1: Услуги */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[10px] font-bold">1</span>
          Услуга
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeServices.map((s) => {
            const active = selectedServiceId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedServiceId(active ? null : s.id!)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm leading-tight">{s.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Icon name="Clock" size={11} />
                        {fmtDuration(s.duration_minutes)}
                      </span>
                      {s.max_clients > 1 && (
                        <span className="flex items-center gap-1">
                          <Icon name="Users" size={11} />
                          до {s.max_clients}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-sm text-primary">{fmt(s.price)} ₽</span>
                    {active && (
                      <span className="w-5 h-5 rounded-full bg-primary inline-flex items-center justify-center">
                        <Icon name="Check" size={12} className="text-primary-foreground" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ШАГ 2: Дата */}
      {selectedService && (
        <div className="mb-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[10px] font-bold">2</span>
            Дата
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : !hasAnyOptions ? (
            <div className="text-center py-8 rounded-xl bg-muted/40 border border-dashed border-border">
              <Icon name="CalendarX" size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Нет свободного времени</p>
              <p className="text-xs text-muted-foreground mt-1">
                Попробуйте позже или свяжитесь с мастером напрямую
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
                {days.map((d) => {
                  const has = (optionsByDay[dayKey(d)] ?? []).length > 0;
                  const isSelected = selectedDate && dayKey(d) === dayKey(selectedDate);
                  return (
                    <button
                      key={dayKey(d)}
                      type="button"
                      disabled={!has}
                      onClick={() => setSelectedDate(d)}
                      className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all min-w-[56px] ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : has
                          ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800"
                          : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-[10px] uppercase opacity-70">
                        {format(d, "EEE", { locale: ru })}
                      </span>
                      <span className="text-base font-bold leading-tight">{format(d, "d")}</span>
                      <span className="text-[10px] opacity-60">{format(d, "MMM", { locale: ru })}</span>
                    </button>
                  );
                })}
              </div>

              {/* ШАГ 3: Время */}
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[10px] font-bold">3</span>
                  Время
                </div>
                {optionsForDay.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Нет свободного времени на эту дату
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {optionsForDay.map((opt, i) => (
                      <button
                        key={`${opt.slot.id}-${i}`}
                        type="button"
                        onClick={() => onBookSlot(opt, selectedService)}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-semibold"
                      >
                        {fmtTime(opt.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!selectedService && (
        <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
          <Icon name="MousePointerClick" size={20} className="mx-auto mb-1.5 opacity-50" />
          Выберите услугу выше, чтобы посмотреть свободное время
        </div>
      )}
    </div>
  );
}
