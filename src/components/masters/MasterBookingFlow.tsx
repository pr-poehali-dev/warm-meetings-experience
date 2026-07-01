import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";
import Icon from "@/components/ui/icon";
import { masterBookingsApi, MasterService, MasterSlot } from "@/lib/master-calendar-api";
import { parseServiceDescription } from "@/lib/service-description";
import { slotToWallDate } from "@/lib/masterTime";

const DAYS_AHEAD = 30;

function fmt(n: number | string) {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return Math.round(num).toLocaleString("ru-RU");
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

// Время мастера: извлекаем «стенные» часы из ISO с offset (см. masterTime.ts).
const parseLocalISO = slotToWallDate;

function fmtTime(d: Date) {
  return format(d, "HH:mm");
}

/** Ключ адреса слота — null если адрес не задан. */
function slotAddressKey(slot: MasterSlot): string {
  if (slot.address_id != null) return `id:${slot.address_id}`;
  if (slot.slot_address) return `txt:${slot.slot_address}`;
  return "none";
}

/** Короткое название адреса: последние 2 части (улица + дом). */
function shortAddress(text?: string | null): string {
  if (!text) return "Адрес";
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return text;
  // последние 2 части — обычно улица + номер дома
  return parts.slice(-2).join(", ");
}

/** Ссылка на Яндекс.Карты по координатам или тексту адреса. */
function mapUrl(slot: { slot_latitude?: number | null; slot_longitude?: number | null; slot_address?: string | null }): string {
  if (slot.slot_latitude != null && slot.slot_longitude != null) {
    return `https://yandex.ru/maps/?pt=${slot.slot_longitude},${slot.slot_latitude}&z=17&l=map`;
  }
  return `https://yandex.ru/maps/?text=${encodeURIComponent(slot.slot_address || "")}`;
}

interface AddressInfo {
  key: string;
  label: string;
  fullAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

const TZ_ABBR: Record<string, string> = {
  "Europe/Kaliningrad": "Калининград",
  "Europe/Moscow":      "Москва, Санкт-Петербург",
  "Europe/Samara":      "Самара, Ижевск",
  "Asia/Yekaterinburg": "Екатеринбург, Уфа, Пермь",
  "Asia/Omsk":          "Омск",
  "Asia/Krasnoyarsk":   "Красноярск, Новосибирск",
  "Asia/Irkutsk":       "Иркутск, Улан-Удэ",
  "Asia/Yakutsk":       "Якутск, Чита",
  "Asia/Vladivostok":   "Владивосток, Хабаровск",
  "Asia/Magadan":       "Магадан, Сахалин",
  "Asia/Kamchatka":     "Камчатка",
};



/**
 * Возможный «вариант времени начала» внутри окна доступности.
 * slot — рабочий интервал в БД, start/end — конкретное время сеанса.
 */
export interface BookingOption {
  slot: MasterSlot;
  start: Date;
  end: Date;
}

interface ActiveBooking {
  id: number;
  slot_id: number;
  datetime_start: string;
  datetime_end: string;
  status: string;
}

interface MasterBookingFlowProps {
  masterId: number;
  masterSlug?: string;
  services: MasterService[];
  onBookSlot: (option: BookingOption, service: MasterService) => void;
  preselectedServiceId?: number | null;
  /** Меняется родителем после успешной брони — триггерит перезагрузку слотов. */
  refreshKey?: number;
  /** Скрыть выбор услуги и заголовок (когда услуга уже выбрана извне). */
  hideServiceSelector?: boolean;
  /** Открыть диалог «написать мастеру» */
  onAskMaster?: () => void;
}

export default function MasterBookingFlow({ masterId, masterSlug, services, onBookSlot, preselectedServiceId, refreshKey = 0, hideServiceSelector = false, onAskMaster }: MasterBookingFlowProps) {
  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(preselectedServiceId ?? null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<MasterSlot[]>([]);
  const [bookings, setBookings] = useState<ActiveBooking[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [masterTz, setMasterTz] = useState<string>("Europe/Moscow");
  const [loading, setLoading] = useState(false);
  const [aboutServiceId, setAboutServiceId] = useState<number | null>(null);
  const [addressFilter, setAddressFilter] = useState<string>("all");
  const [addressOpen, setAddressOpen] = useState(false);

  useEffect(() => {
    masterBookingsApi
      .getPublicSettings(masterId)
      .then((s) => {
        setBufferMinutes(s.break_between_slots || 0);
        if (s.timezone) setMasterTz(s.timezone);
      })
      .catch(() => setBufferMinutes(0));
  }, [masterId]);

  const today = startOfToday();
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const from = format(today, "yyyy-MM-dd");
      const data = await masterBookingsApi.getPublicSlots(masterId, from);
      setSlots(data.slots || []);
      setBookings(data.bookings || []);
    } catch {
      setSlots([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots, refreshKey]);

  const selectedService = useMemo(
    () => activeServices.find((s) => s.id === selectedServiceId) ?? null,
    [activeServices, selectedServiceId]
  );

  /**
   * Вычисление на лету: для каждого рабочего интервала
   * считает свободные времена как «интервал минус брони (с буфером) минус прошлое»
   */
  const options = useMemo<BookingOption[]>(() => {
    if (!selectedService) return [];
    const duration = selectedService.duration_minutes;
    const now = new Date();
    const result: BookingOption[] = [];

    // Есть ли у слота фактический адрес (свой или адрес дня).
    const slotHasAddress = (slot: MasterSlot) =>
      slot.has_address ?? (slot.address_id != null || !!slot.slot_address);

    for (const slot of slots) {
      if (slot.service_id != null && slot.service_id !== selectedService.id) continue;
      if (slot.max_clients > 1 && slot.booked_count >= slot.max_clients) continue;

      // Фильтр по формату услуги:
      //  • at_home (выезд) — только выездные слоты (без адреса);
      //  • on_site (у мастера) — только слоты с адресом приёма;
      //  • by_agreement — любые слоты.
      const fmt = selectedService.service_format;
      if (fmt === "at_home" && slotHasAddress(slot)) continue;
      if (fmt === "on_site" && !slotHasAddress(slot)) continue;

      const winStart = parseLocalISO(slot.datetime_start);
      const winEnd = parseLocalISO(slot.datetime_end);

      // Занятые промежутки этого интервала, расширенные на буфер.
      // Учитываем не только брони, привязанные к слоту (slot_id), но и любые
      // активные брони мастера, пересекающиеся по времени с этим интервалом —
      // иначе слот покажется свободным, а бэкенд отклонит запись как «занято».
      const slotBookings = bookings
        .filter((b) => {
          if (b.slot_id === slot.id) return true;
          const bs = parseLocalISO(b.datetime_start);
          const be = parseLocalISO(b.datetime_end);
          return bs < winEnd && be > winStart;
        })
        .map((b) => {
          const bs = parseLocalISO(b.datetime_start);
          const be = parseLocalISO(b.datetime_end);
          return {
            start: new Date(bs.getTime() - bufferMinutes * 60000),
            end: new Date(be.getTime() + bufferMinutes * 60000),
          };
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      // Свободные подокна = рабочий интервал − брони
      const freeWindows: Array<{ start: Date; end: Date }> = [];
      let cursor = new Date(winStart);
      for (const b of slotBookings) {
        if (b.start > cursor) {
          freeWindows.push({ start: new Date(cursor), end: new Date(b.start) });
        }
        if (b.end > cursor) cursor = new Date(b.end);
      }
      if (cursor < winEnd) {
        freeWindows.push({ start: new Date(cursor), end: new Date(winEnd) });
      }

      // В каждом свободном подокне — все возможные времена начала с шагом duration
      for (const fw of freeWindows) {
        const winLen = (fw.end.getTime() - fw.start.getTime()) / 60000;
        if (winLen < duration) continue;

        let c = new Date(fw.start);
        while (c.getTime() + duration * 60000 <= fw.end.getTime()) {
          if (c > now) {
            const end = new Date(c.getTime() + duration * 60000);
            result.push({ slot, start: new Date(c), end });
          }
          c = new Date(c.getTime() + duration * 60000);
        }
      }
    }

    return result.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [slots, bookings, selectedService, bufferMinutes]);

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  // Уникальные адреса среди доступных вариантов выбранной услуги.
  const availableAddresses = useMemo<AddressInfo[]>(() => {
    const map = new Map<string, AddressInfo>();
    for (const o of options) {
      const key = slotAddressKey(o.slot);
      if (key === "none") continue;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: shortAddress(o.slot.slot_address),
          fullAddress: o.slot.slot_address ?? null,
          latitude: o.slot.slot_latitude ?? null,
          longitude: o.slot.slot_longitude ?? null,
        });
      }
    }
    return Array.from(map.values());
  }, [options]);

  // Сброс фильтра, если выбранный адрес исчез из доступных (например, сменили услугу).
  useEffect(() => {
    if (addressFilter !== "all" && !availableAddresses.some((a) => a.key === addressFilter)) {
      setAddressFilter("all");
    }
  }, [availableAddresses, addressFilter]);

  // Опции с применённым фильтром адреса.
  const filteredOptions = useMemo(() => {
    if (addressFilter === "all") return options;
    return options.filter((o) => slotAddressKey(o.slot) === addressFilter);
  }, [options, addressFilter]);

  const optionsByDay = useMemo(() => {
    const map: Record<string, BookingOption[]> = {};
    filteredOptions.forEach((o) => {
      const k = format(o.start, "yyyy-MM-dd");
      if (!map[k]) map[k] = [];
      map[k].push(o);
    });
    return map;
  }, [filteredOptions]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedDate(null);
      return;
    }
    // Если текущая дата ещё доступна (после смены адреса) — не сбрасываем её.
    setSelectedDate((prev) => {
      if (prev && (optionsByDay[dayKey(prev)] ?? []).length > 0) return prev;
      return days.find((d) => (optionsByDay[dayKey(d)] ?? []).length > 0) ?? null;
    });
     
  }, [selectedServiceId, optionsByDay, days, selectedService]);

  // Скролл к выбранному дню — только когда selectedDate реально меняется,
  // а не на каждый ререндер (иначе перехватывает клики).
  const selectedDayRef = useRef<HTMLButtonElement | null>(null);
  const selectedDayKey = selectedDate ? dayKey(selectedDate) : null;
  useEffect(() => {
    if (!selectedDayKey) return;
    const el = selectedDayRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 50);
    return () => clearTimeout(t);
  }, [selectedDayKey]);

  const optionsForDay = selectedDate ? optionsByDay[dayKey(selectedDate)] ?? [] : [];
  const hasAnyOptions = options.length > 0;

  if (!activeServices.length) return null;

  return (
    <div className={hideServiceSelector ? "" : "rounded-2xl p-5 sm:p-6 bg-card border border-border shadow-sm"}>
      {!hideServiceSelector && (
        <>
          <h2 className="text-2xl font-bold mb-1 text-foreground">
            Запись на сеанс
          </h2>
          <p className="text-sm mb-5 text-muted-foreground">
            Выберите услугу, дату и удобное время — мастер подтвердит запись.
          </p>
        </>
      )}

      {/* ШАГ 1: Услуги */}
      {!hideServiceSelector && (
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
          Услуга
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeServices.map((s) => {
            const active = selectedServiceId === s.id;
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedServiceId(active ? null : s.id!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedServiceId(active ? null : s.id!);
                  }
                }}
                className={`group relative text-left p-4 rounded-2xl transition-all overflow-hidden cursor-pointer touch-manipulation active:scale-[0.99] ${
                  active
                    ? "border-[1.5px] border-primary shadow-[0_4px_18px_rgba(200,131,74,0.18)] bg-gradient-to-br from-primary/15 to-nature-sage/10"
                    : "border border-border bg-background hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm leading-tight text-foreground break-words flex-1 min-w-0">
                      {s.name}
                    </div>
                    {active && (
                      <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-primary shrink-0">
                        <Icon name="Check" size={12} className="text-primary-foreground" />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-base text-primary whitespace-nowrap tabular-nums">
                    {fmt(Number(s.price))} ₽
                  </div>
                  <div className="min-w-0 flex-1">
                    {s.description && (
                      <p
                        className={`text-xs leading-relaxed mb-2 text-muted-foreground ${active ? "" : "line-clamp-2"}`}
                      >
                        {s.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
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
                    {s.service_format === "at_home" && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                        <Icon name="Car" size={11} />
                        Мастер приедет к вам
                      </span>
                    )}
                    {s.service_format === "by_agreement" && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-semibold text-muted-foreground">
                        <Icon name="MessagesSquare" size={11} />
                        Место по согласованию
                      </span>
                    )}
                  </div>
                </div>

                {/* Кнопка «Подробнее о процедуре» — появляется при выделении */}
                {active && (
                  masterSlug && s.id ? (
                    <Link
                      to={`/masters/${masterSlug}/services/${s.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors min-h-[40px] -mx-1 px-1 touch-manipulation"
                    >
                      <Icon name="Info" size={13} />
                      Подробнее о процедуре
                      <Icon name="ChevronRight" size={13} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAboutServiceId(s.id!);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors min-h-[40px] -mx-1 px-1 touch-manipulation"
                    >
                      <Icon name="Info" size={13} />
                      Подробнее о процедуре
                      <Icon name="ChevronRight" size={13} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Модалка с описанием процедуры */}
      {aboutServiceId !== null && (() => {
        const svc = activeServices.find((x) => x.id === aboutServiceId);
        if (!svc) return null;
        const parsed = parseServiceDescription(svc.description);
        const hasStructured =
          parsed.included.length > 0 ||
          parsed.bring.length > 0 ||
          parsed.contraindications.length > 0;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setAboutServiceId(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 sm:p-6">
                {/* Шапка */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Процедура
                    </div>
                    <h3 className="text-xl font-bold text-foreground leading-tight">
                      {svc.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAboutServiceId(null)}
                    className="shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>

                {/* Мета: длительность / гости / цена */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                  <span className="flex items-center gap-1.5">
                    <Icon name="Clock" size={13} className="text-primary" />
                    {fmtDuration(svc.duration_minutes)}
                  </span>
                  {svc.max_clients > 1 && (
                    <span className="flex items-center gap-1.5">
                      <Icon name="Users" size={13} className="text-primary" />
                      до {svc.max_clients} чел.
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 ml-auto font-bold text-primary text-base">
                    {fmt(svc.price)} ₽
                  </span>
                </div>

                {/* Краткое описание */}
                {parsed.intro && (
                  <div className="mb-5">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                      {parsed.intro}
                    </p>
                  </div>
                )}

                {/* Если описания нет совсем */}
                {!parsed.intro && !hasStructured && (
                  <p className="text-sm text-muted-foreground italic mb-3">
                    Мастер пока не добавил подробное описание этой процедуры. Свяжитесь с ним напрямую, чтобы узнать детали.
                  </p>
                )}

                {/* Что входит */}
                {parsed.included.length > 0 && (
                  <div className="mb-5 rounded-xl p-4 bg-primary/5 border border-primary/15">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/15 inline-flex items-center justify-center">
                        <Icon name="ListChecks" size={15} className="text-primary" />
                      </div>
                      <div className="font-semibold text-sm text-foreground">Что входит</div>
                    </div>
                    <ul className="space-y-1.5">
                      {parsed.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                          <Icon name="Check" size={14} className="text-primary mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Что взять с собой */}
                {parsed.bring.length > 0 && (
                  <div className="mb-5 rounded-xl p-4 bg-nature-sage/10 border border-nature-sage/25">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-full bg-nature-sage/20 inline-flex items-center justify-center">
                        <Icon name="Briefcase" size={15} className="text-nature-sage" fallback="Package" />
                      </div>
                      <div className="font-semibold text-sm text-foreground">Что взять с собой</div>
                    </div>
                    <ul className="space-y-1.5">
                      {parsed.bring.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                          <Icon name="Dot" size={16} className="text-nature-sage mt-0.5 shrink-0" fallback="Circle" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Противопоказания */}
                {parsed.contraindications.length > 0 && (
                  <div className="mb-5 rounded-xl p-4 bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 inline-flex items-center justify-center">
                        <Icon name="AlertTriangle" size={15} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="font-semibold text-sm text-foreground">Противопоказания</div>
                    </div>
                    <ul className="space-y-1.5 mb-2">
                      {parsed.contraindications.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                          <Icon name="X" size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-amber-500/20">
                      Если есть хронические заболевания или сомнения — обязательно предупредите мастера перед сеансом.
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setAboutServiceId(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Закрыть
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(svc.id!);
                      setAboutServiceId(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="CalendarCheck" size={14} />
                    Выбрать дату
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Фильтр по адресу / место встречи */}
      {selectedService && availableAddresses.length > 0 && (
        <div className="mb-5">
          <div className="mb-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--c-muted)" }}
            >
              Место встречи
            </div>
            {availableAddresses.length > 1 && (
              <div className="text-xs mt-0.5" style={{ color: "var(--c-muted)", opacity: 0.75 }}>
                Выберите удобный адрес — отобразятся только свободные окна там
              </div>
            )}
          </div>

          {availableAddresses.length > 1 ? (() => {
            const selected = availableAddresses.find((a) => a.key === addressFilter);
            const labelText = addressFilter === "all" ? "Все адреса" : (selected?.label ?? "Адрес");
            const subText = addressFilter !== "all" && selected?.fullAddress ? selected.fullAddress : null;
            return (
              <div
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "var(--card-idle)",
                  border: addressOpen ? "1.5px solid var(--c-terra)" : "1.5px solid color-mix(in srgb, currentColor 18%, transparent)",
                  boxShadow: addressOpen ? "0 4px 14px rgba(200,131,74,0.25)" : "none",
                }}
              >
                {/* Заголовок аккордиона */}
                <button
                  type="button"
                  onClick={() => setAddressOpen((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left touch-manipulation active:scale-[0.99] transition-all"
                  style={{ background: "transparent" }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--card-border)" }}
                  >
                    <Icon name={addressFilter === "all" ? "LayoutGrid" : "MapPin"} size={15} style={{ color: "var(--c-terra)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight" style={{ color: "var(--c-cream)" }}>
                      {labelText}
                    </div>
                    {subText && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: "var(--c-muted)" }}>
                        {subText}
                      </div>
                    )}
                  </div>
                  <Icon
                    name="ChevronDown"
                    size={16}
                    style={{
                      color: "var(--c-muted)",
                      transform: addressOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Список адресов */}
                {addressOpen && (
                  <div style={{ borderTop: "1px solid var(--card-border)" }}>
                    {/* Все адреса */}
                    <button
                      type="button"
                      onClick={() => { setAddressFilter("all"); setAddressOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation"
                      style={{
                        background: addressFilter === "all"
                          ? "linear-gradient(135deg, var(--c-terra), var(--c-sage))"
                          : "var(--card-idle)",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: addressFilter === "all" ? "rgba(255,255,255,0.2)" : "var(--card-border)" }}
                      >
                        <Icon name="LayoutGrid" size={13} style={{ color: addressFilter === "all" ? "#fff" : "var(--c-terra)" }} />
                      </div>
                      <span
                        className="text-sm font-semibold flex-1"
                        style={{ color: addressFilter === "all" ? "#fff" : "var(--c-cream)" }}
                      >
                        Все адреса
                      </span>
                      {addressFilter === "all" && <Icon name="Check" size={14} style={{ color: "#fff", flexShrink: 0 }} />}
                    </button>

                    {availableAddresses.map((a, i) => {
                      const active = addressFilter === a.key;
                      const hasMap = a.fullAddress || a.latitude != null;
                      return (
                        <div
                          key={a.key}
                          style={{
                            borderTop: "1px solid var(--card-border)",
                            background: active
                              ? "linear-gradient(135deg, var(--c-terra), var(--c-sage))"
                              : i % 2 === 0 ? "var(--card-idle)" : "color-mix(in srgb, var(--card-idle) 85%, transparent)",
                          }}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => { setAddressFilter(a.key); setAddressOpen(false); }}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left touch-manipulation"
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: active ? "rgba(255,255,255,0.2)" : "var(--card-border)" }}
                            >
                              <Icon name="MapPin" size={13} style={{ color: active ? "#fff" : "var(--c-terra)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold leading-tight" style={{ color: active ? "#fff" : "var(--c-cream)" }}>
                                {a.label}
                              </div>
                              {a.fullAddress && (
                                <div className="text-xs mt-0.5 leading-snug" style={{ color: active ? "rgba(255,255,255,0.7)" : "var(--c-muted)" }}>
                                  {a.fullAddress}
                                </div>
                              )}
                            </div>
                            {active && <Icon name="Check" size={14} style={{ color: "#fff", flexShrink: 0 }} />}
                          </button>
                          {hasMap && (
                            <a
                              href={mapUrl({ slot_latitude: a.latitude, slot_longitude: a.longitude, slot_address: a.fullAddress })}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Открыть на карте"
                              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation active:scale-95"
                              style={{
                                background: active ? "rgba(255,255,255,0.18)" : "var(--card-border)",
                                color: active ? "#fff" : "var(--c-terra)",
                              }}
                            >
                              <Icon name="Map" size={13} />
                              <span className="hidden sm:inline">Карта</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })() : (
            // Единственный адрес — статичная карточка
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "var(--card-idle)", border: "1.5px solid var(--card-border)" }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--card-border)" }}
              >
                <Icon name="MapPin" size={15} style={{ color: "var(--c-terra)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-tight" style={{ color: "var(--c-cream)" }}>
                  {availableAddresses[0].label}
                </div>
                {availableAddresses[0].fullAddress && availableAddresses[0].fullAddress !== availableAddresses[0].label && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
                    {availableAddresses[0].fullAddress}
                  </div>
                )}
              </div>
              {(availableAddresses[0].fullAddress || availableAddresses[0].latitude != null) && (
                <a
                  href={mapUrl({ slot_latitude: availableAddresses[0].latitude, slot_longitude: availableAddresses[0].longitude, slot_address: availableAddresses[0].fullAddress })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation active:scale-95"
                  style={{ background: "var(--card-border)", color: "var(--c-terra)" }}
                >
                  <Icon name="Map" size={13} />
                  <span>Карта</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ШАГ 2: Дата */}
      {selectedService && (
        <div className="mb-2">
          <div
            className="text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--c-muted)" }}
          >
            Дата
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Icon name="Loader2" size={24} className="animate-spin" style={{ color: "var(--c-muted)" }} />
            </div>
          ) : !hasAnyOptions ? (
            <div
              className="text-center py-8 px-5 rounded-2xl"
              style={{ background: "var(--card-idle)", border: "1px dashed var(--card-border)" }}
            >
              <Icon name="CalendarX" size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-cream)" }}>
                {selectedService?.service_format === "at_home"
                  ? "Мастер пока не открыл окна для выезда"
                  : selectedService?.service_format === "on_site"
                  ? "Нет свободного времени для приёма"
                  : "Нет свободного времени"}
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--c-text)" }}>
                {selectedService?.service_format === "at_home"
                  ? "Напишите мастеру — он подберёт удобную дату для выезда к вам"
                  : "Попробуйте позже или уточните у мастера"}
              </p>
              {onAskMaster && (
                <button
                  type="button"
                  onClick={onAskMaster}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all touch-manipulation active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, var(--c-terra), var(--c-sage))",
                    color: "#fff",
                  }}
                >
                  <Icon name="MessageCircleQuestion" size={15} />
                  Написать мастеру
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
                style={{
                  scrollbarWidth: "thin",
                  WebkitOverflowScrolling: "touch",
                  scrollPadding: "0 16px",
                }}
              >
                {days.map((d) => {
                  const has = (optionsByDay[dayKey(d)] ?? []).length > 0;
                  const isSelected = selectedDate && dayKey(d) === dayKey(selectedDate);
                  const slotsCount = (optionsByDay[dayKey(d)] ?? []).length;
                  return (
                    <button
                      key={dayKey(d)}
                      ref={isSelected ? selectedDayRef : undefined}
                      type="button"
                      disabled={!has}
                      onClick={() => setSelectedDate(d)}
                      aria-label={`${format(d, "d MMMM", { locale: ru })}${has ? `, ${slotsCount} свободных слотов` : ', нет свободного времени'}`}
                      className="snap-start flex-shrink-0 flex flex-col items-center justify-center px-3 py-3 rounded-xl text-xs font-medium transition-all min-w-[64px] min-h-[72px] touch-manipulation active:scale-95"
                      style={{
                        background: isSelected
                          ? "linear-gradient(135deg, var(--c-terra), var(--c-sage))"
                          : has
                          ? "var(--card-idle)"
                          : "transparent",
                        color: isSelected ? "#fff" : has ? "var(--c-cream)" : "var(--c-faint)",
                        border: isSelected
                          ? "1px solid transparent"
                          : has
                          ? "1px solid var(--card-border)"
                          : "1px solid transparent",
                        cursor: has ? "pointer" : "not-allowed",
                        opacity: has ? 1 : 0.4,
                        boxShadow: isSelected ? "0 4px 14px rgba(200,131,74,0.35)" : "none",
                      }}
                    >
                      <span className="text-[10px] uppercase opacity-70 text-gray-300">
                        {format(d, "EEE", { locale: ru })}
                      </span>
                      <span className="text-lg font-bold leading-tight text-orange-500">{format(d, "d")}</span>
                      <span className="text-[10px] opacity-60 text-gray-400">{format(d, "MMM", { locale: ru })}</span>
                      {has && (
                        <span
                          className="mt-1 inline-flex items-center justify-center text-[9px] font-bold leading-none rounded-full px-1.5 py-0.5"
                          style={{
                            background: isSelected ? "rgba(255,255,255,0.25)" : "var(--c-terra, #c8834a)",
                            color: "#fff",
                            minWidth: 16,
                          }}
                          aria-hidden="true"
                        >
                          {slotsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ШАГ 3: Время */}
              <div className="mt-5">
                <div
                  className="text-[11px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                  style={{ color: "var(--c-muted)" }}
                >
                  Время
                  {TZ_ABBR[masterTz] && (
                    <span className="normal-case font-normal opacity-60">({TZ_ABBR[masterTz]})</span>
                  )}
                </div>
                {optionsForDay.length === 0 ? (
                  <div className="text-center py-6 text-sm" style={{ color: "var(--c-text)" }}>
                    {addressFilter !== "all"
                      ? "В этот день нет свободного времени по выбранному адресу"
                      : "Нет свободного времени на эту дату"}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2">
                    {optionsForDay.map((opt, i) => {
                      // Показываем адрес у каждого слота, если адресов несколько
                      // и фильтр «Все адреса» (иначе адрес уже понятен из контекста).
                      const showAddr =
                        addressFilter === "all" &&
                        availableAddresses.length > 1 &&
                        !!opt.slot.slot_address;
                      return (
                        <button
                          key={`${opt.slot.id}-${i}`}
                          type="button"
                          onClick={() => {
                            if (selectedService) onBookSlot(opt, selectedService);
                          }}
                          className="min-h-[48px] px-3 py-2 rounded-xl transition-all font-semibold active:scale-95 md:hover:-translate-y-0.5 touch-manipulation flex flex-col items-center justify-center gap-0.5"
                          style={{
                            background: "var(--card-idle)",
                            border: "1px solid var(--card-border)",
                            color: "var(--c-cream)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, var(--c-terra), var(--c-sage))";
                            e.currentTarget.style.color = "#fff";
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--card-idle)";
                            e.currentTarget.style.color = "var(--c-cream)";
                            e.currentTarget.style.borderColor = "var(--card-border)";
                          }}
                        >
                          <span className="text-base leading-none">{fmtTime(opt.start)}</span>
                          {showAddr && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium opacity-70 leading-none mt-0.5 max-w-full truncate">
                              <Icon name="MapPin" size={9} />
                              <span className="truncate">{shortAddress(opt.slot.slot_address)}</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!selectedService && (
        <div
          className="text-center py-8 rounded-2xl"
          style={{
            background: "var(--card-idle)",
            border: "1px dashed var(--card-border)",
            color: "var(--c-text)",
          }}
        >
          <Icon name="MousePointerClick" size={20} className="mx-auto mb-1.5 opacity-50" />
          <p className="text-sm">Выберите услугу выше, чтобы посмотреть свободное время</p>
        </div>
      )}
    </div>
  );
}