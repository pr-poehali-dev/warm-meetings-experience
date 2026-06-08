import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateSelectArg, DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import ruLocale from "@fullcalendar/core/locales/ru";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {
  masterCalendarApi,
  masterBookingsApi,
  MasterBooking,
  MasterSlot,
  DayBlock,
  MasterService,
  CalendarSettings,
  MasterBackup,
  BookingApiError,
} from "@/lib/master-calendar-api";


import EventForm, { CreateMode, CreatePayload } from "./EventForm";
import QuickActionsPopover, { QuickEvent } from "./QuickActionsPopover";
import AgendaView from "./AgendaView";
import "./styles.css";

interface Props {
  masterId: number;
}

type FcbEvent = EventInput & {
  extendedProps: {
    kind: "booking" | "block" | "break" | "available" | "canceled";
    raw?: MasterBooking | MasterSlot | DayBlock;
    buffer?: number; // минут буфера после
    note?: string;
  };
};

// Форматируем в ЭКРАННОМ времени мастера (явный timeZone), а не браузера.
const fmtTime = (d: Date, tz: string) =>
  d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz });

const fmtDate = (d: Date, tz: string) =>
  d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", timeZone: tz });

// Человекочитаемая подпись часового пояса мастера: "Калининград (UTC+2)".
const TZ_LABELS: Record<string, string> = {
  "Europe/Kaliningrad": "Калининград",
  "Europe/Moscow": "Москва",
  "Europe/Samara": "Самара",
  "Asia/Yekaterinburg": "Екатеринбург",
  "Asia/Omsk": "Омск",
  "Asia/Novosibirsk": "Новосибирск",
  "Asia/Krasnoyarsk": "Красноярск",
  "Asia/Irkutsk": "Иркутск",
  "Asia/Yakutsk": "Якутск",
  "Asia/Vladivostok": "Владивосток",
  "Asia/Magadan": "Магадан",
  "Asia/Kamchatka": "Камчатка",
};

const tzLabel = (tz: string) => {
  const city = TZ_LABELS[tz] || tz;
  let off = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    off = parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    off = "";
  }
  return off ? `${city} (${off.replace("GMT", "UTC")})` : city;
};

// КАНОН ВРЕМЕНИ (фронт ↔ бэк) — «ЭКРАННОЕ ВРЕМЯ»:
// FullCalendar в timeZone-режиме знает зону мастера. Любые ISO-строки времени
// мы получаем ОТ САМОГО КАЛЕНДАРЯ:
//   • при выделении — sel.startStr / sel.endStr (уже с offset, напр. ...+03:00);
//   • при переносе/resize — ev.startStr / ev.endStr;
//   • для пересчитанных дат (мин.15мин, длительность услуги) — api.formatIso(date).
// Это ровно то же самое «экранное время», по которому рисуются события. Никаких
// getHours()/Intl — поэтому нет зависимости от зоны браузера и сдвигов на 3 часа.

export default function MasterCalendarDnd({ masterId }: Props) {
  const calRef = useRef<FullCalendar | null>(null);

  // Сериализует Date в ISO-строку с offset зоны КАЛЕНДАРЯ (экранное время).
  // Используется только для дат, посчитанных нами (длительность/мин.15мин).
  const calIso = useCallback((d: Date) => {
    const api = calRef.current?.getApi();
    return api ? api.formatIso(d) : d.toISOString();
  }, []);

  // Дата YYYY-MM-DD в ЭКРАННОМ времени мастера (зона календаря), без сдвига
  // на зону браузера. Используется для дат, отправляемых на бэк, и для сравнений.
  const calDateKey = useCallback((d: Date) => {
    const api = calRef.current?.getApi();
    return (api ? api.formatIso(d) : d.toISOString()).slice(0, 10);
  }, []);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<MasterBooking[]>([]);
  const [slots, setSlots] = useState<MasterSlot[]>([]);
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [services, setServices] = useState<MasterService[]>([]);
  const [settings, setSettings] = useState<CalendarSettings | null>(null);

  const [createMode, setCreateMode] = useState<{
    open: boolean;
    start: Date | null;
    end: Date | null;
    // «Экранное время» — ISO-строки с offset зоны календаря (для отправки на бэк).
    startStr: string | null;
    endStr: string | null;
    allDay: boolean;
  }>({ open: false, start: null, end: null, startStr: null, endStr: null, allDay: false });

  const [quick, setQuick] = useState<QuickEvent | null>(null);
  const [quickAnchor, setQuickAnchor] = useState<{ x: number; y: number } | null>(null);

  const [pendingMove, setPendingMove] = useState<EventDropArg | null>(null);
  const [pendingResize, setPendingResize] = useState<{ event: EventDropArg["event"]; revert: () => void } | null>(null);

  const [viewTitle, setViewTitle] = useState<string>("");
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");
  const [agendaMode, setAgendaMode] = useState(false);
  const [agendaDate, setAgendaDate] = useState<Date>(new Date());
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashBookings, setTrashBookings] = useState<MasterBooking[]>([]);
  const [trashBackups, setTrashBackups] = useState<MasterBackup[]>([]);
  const [restoring, setRestoring] = useState(false);

  const openTrash = async () => {
    setTrashOpen(true);
    setTrashLoading(true);
    try {
      const res = await masterCalendarApi.getTrash(masterId);
      setTrashBookings(res.bookings || []);
      setTrashBackups(res.backups || []);
    } catch (e) {
      toast.error("Не удалось открыть корзину: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTrashLoading(false);
    }
  };

  const handleRestoreAll = async () => {
    setRestoring(true);
    try {
      const res = await masterCalendarApi.restoreBookings(masterId);
      toast.success(`Восстановлено записей: ${res.restored}`);
      setTrashOpen(false);
      loadData();
    } catch (e) {
      toast.error("Не удалось восстановить: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRestoring(false);
    }
  };

  const handleRestoreOne = async (bookingId: number) => {
    setRestoring(true);
    try {
      await masterCalendarApi.restoreBookings(masterId, [bookingId]);
      toast.success("Запись восстановлена");
      await openTrash();
      loadData();
    } catch (e) {
      toast.error("Не удалось восстановить: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRestoring(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      const res = await masterCalendarApi.createBackup(masterId);
      toast.success(`Создана резервная копия: ${res.bookings_count} записей`);
      if (trashOpen) openTrash();
    } catch (e) {
      toast.error("Не удалось создать копию: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleClear = async (scope: "all" | "week" | "future") => {
    setClearing(true);
    try {
      let date_from: string | undefined;
      let date_to: string | undefined;
      if (scope === "week") {
        const api = calRef.current?.getApi();
        if (api) {
          // Экранное время мастера, а не UTC.
          date_from = calDateKey(api.view.activeStart);
          date_to = calDateKey(api.view.activeEnd);
        }
      } else if (scope === "future") {
        date_from = calDateKey(new Date());
      }
      const res = await masterCalendarApi.clearCalendar({
        master_id: masterId,
        scope: "all",
        date_from,
        date_to,
      });
      const total = res.deleted.bookings + res.deleted.slots + res.deleted.blocks;
      toast.success(
        `Очищено: ${total} элементов. Записи клиентов (${res.deleted.bookings}) перемещены в корзину — их можно восстановить.`
      );
      setClearOpen(false);
      loadData();
    } catch (e) {
      console.error("[Calendar] clear failed", e);
      toast.error("Не удалось очистить: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setClearing(false);
    }
  };

  // Загрузка
  const loadData = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    try {
      const [wv, srv, st] = await Promise.all([
        masterCalendarApi.getWeekView(masterId, undefined, dateFrom, dateTo),
        masterCalendarApi.getServices(masterId).catch(() => []),
        masterCalendarApi.getSettings(masterId).catch(() => null),
      ]);
      setBookings(wv.bookings || []);
      setSlots(wv.slots || []);
      setBlocks(wv.blocks || []);
      setServices(srv || []);
      setSettings(st);
    } catch (e) {
      toast.error("Не удалось загрузить календарь: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  // Перезагружаем данные при смене видимого диапазона FullCalendar
  const handleDatesSet = useCallback((arg: { start: Date; end: Date; view: { type: string; title: string } }) => {
    // Диапазон в экранном времени мастера. arg.end эксклюзивный — берём минус сутки.
    const endInclusive = new Date(arg.end.getTime() - 24 * 60 * 60_000);
    loadData(calDateKey(arg.start), calDateKey(endInclusive));
    setViewTitle(arg.view.title);
    setCurrentView(arg.view.type);
  }, [loadData, calDateKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Преобразуем в FC events
  const fcEvents = useMemo<FcbEvent[]>(() => {
    const list: FcbEvent[] = [];

    // Бронирования
    for (const b of bookings) {
      const isCanceled = b.status === "canceled" || b.status === "no_show";
      const cls =
        isCanceled ? "fcb-canceled" :
        b.status === "pending" ? "fcb-booking-pending" :
        "fcb-booking";
      list.push({
        id: `b-${b.id}`,
        title: `${b.client_name || "Клиент"}${b.service_name ? " · " + b.service_name : ""}`,
        start: b.datetime_start,
        end: b.datetime_end,
        classNames: [cls],
        editable: !isCanceled,
        extendedProps: {
          kind: isCanceled ? "canceled" : "booking",
          raw: b,
          buffer: settings?.break_between_slots || 0,
        },
      });
    }

    // Слоты (blocked/event = блок, available = свободно, busy/booked показываем как бронь только если нет booking)
    const bookedSlotIds = new Set(bookings.map(b => b.slot_id).filter(Boolean));
    for (const s of slots) {
      if (s.status === "blocked") {
        list.push({
          id: `s-${s.id}`,
          title: s.notes || "Заблокировано",
          start: s.datetime_start,
          end: s.datetime_end,
          classNames: ["fcb-block"],
          editable: true,
          extendedProps: { kind: "block", raw: s },
        });
      } else if (s.status === "event") {
        list.push({
          id: `s-${s.id}`,
          title: s.notes || "Перерыв",
          start: s.datetime_start,
          end: s.datetime_end,
          classNames: ["fcb-break"],
          editable: true,
          extendedProps: { kind: "break", raw: s },
        });
      } else if (s.status === "available" && !bookedSlotIds.has(s.id)) {
        // Показываем слабым пунктиром, но без drag
        list.push({
          id: `s-${s.id}`,
          title: `Свободно`,
          start: s.datetime_start,
          end: s.datetime_end,
          classNames: ["fcb-available"],
          editable: false,
          display: "background",
          extendedProps: { kind: "available", raw: s },
        });
      }
    }

    // Блокировки целых дней — каждая запись в БД = ровно 1 день
    // (backend сохраняет отпуск как N записей по 1 дню каждая, поэтому игнорируем block_end_date)
    const seenBlockDates = new Set<string>();
    for (const blk of blocks) {
      if (!blk.reason || blk.reason === "removed") continue;
      if (seenBlockDates.has(blk.block_date)) continue;
      seenBlockDates.add(blk.block_date);

      // Дату блокировки подаём строкой YYYY-MM-DD (allDay) — без new Date,
      // чтобы день не «уезжал» из-за разницы зон браузера и мастера.
      const blockDay = String(blk.block_date).slice(0, 10);

      // Компактная плашка в "Весь день" (только 1 день, не растягиваем)
      list.push({
        id: `blk-${blk.id}`,
        title: `🔒 ${blk.reason || "Выходной"}`,
        start: blockDay,
        allDay: true,
        classNames: ["fcb-day-block"],
        editable: false,
        extendedProps: { kind: "block", raw: blk },
      });
      // Заливка фона колонки дня (видна в timeGrid)
      list.push({
        id: `blk-bg-${blk.id}`,
        start: blockDay,
        allDay: true,
        display: "background",
        classNames: ["fcb-day-block-bg"],
        extendedProps: { kind: "available", raw: blk },
      });
    }

    return list;
  }, [bookings, slots, blocks, settings]);

  // Drag create
  const handleSelect = (sel: DateSelectArg) => {
    const api = sel.view.calendar;
    let start = sel.start;
    let end = sel.end;
    // «Экранное время» от календаря — ISO-строки с offset зоны мастера.
    const startStr = sel.startStr;
    let endStr = sel.endStr;

    if (sel.allDay) {
      // All-day выделение — захват целого дня (или нескольких дней).
      // Точное время выставится в handleCreate, строки тут не нужны.
      start = sel.start;
      end = sel.end;
    } else {
      // Минимум 15 минут → расширяем до 1 часа
      if (end.getTime() - start.getTime() < 15 * 60_000) {
        end = new Date(start.getTime() + 60 * 60_000);
        endStr = calIso(end);
      }
    }

    setCreateMode({ open: true, start, end, startStr, endStr, allDay: !!sel.allDay });
    api.unselect();
  };

  // Тап на ячейку (dateClick) — удобно на мобильном: без протягивания открывает
  // форму с диапазоном 1 час от тапнутого момента. На десктопе не мешает — там
  // работает привычное выделение (handleSelect).
  const handleDateClick = useCallback((arg: DateClickArg) => {
    if (arg.allDay) return; // блокировку дня создаём через allDay-полосу
    const start = arg.date;
    const end = new Date(start.getTime() + 60 * 60_000);
    const startStr = arg.dateStr;
    const endStr = calIso(end);
    setCreateMode({ open: true, start, end, startStr, endStr, allDay: false });
  }, [calIso]);

  // Создание
  const handleCreate = async (mode: CreateMode, payload: CreatePayload) => {
    if (!createMode.start || !createMode.end) return;
    let start = createMode.start;
    let end = createMode.end;
    const isAllDay = createMode.allDay;

    // Пользователь поправил время в форме (для брони не-all-day) — пересобираем
    // «экранные» строки из дня выделения и нового времени. Берём offset зоны
    // мастера из исходной startStr, чтобы не было сдвига на зону браузера.
    if (!isAllDay && mode === "booking" && payload.time_start && payload.time_end && payload.time_end > payload.time_start) {
      const base = createMode.startStr || calIso(start); // YYYY-MM-DDTHH:mm:ss±hh:mm
      const dayStr = base.slice(0, 10);
      // offset — хвост после времени: "+03:00" / "-05:00" / "Z" / "" 
      const offsetMatch = base.match(/(Z|[+-]\d{2}:\d{2})$/);
      const offset = offsetMatch ? offsetMatch[0] : "";
      const newStartStr = `${dayStr}T${payload.time_start}:00${offset}`;
      const newEndStr = `${dayStr}T${payload.time_end}:00${offset}`;
      start = new Date(newStartStr);
      end = new Date(newEndStr);
      createMode.start = start;
      createMode.end = end;
      createMode.startStr = newStartStr;
      createMode.endStr = newEndStr;
    }

    try {
      // All-day блок — создаём master_day_blocks (выходной/отпуск)
      if (isAllDay && mode === "block") {
        // День берём из «экранной» строки (для all-day это "YYYY-MM-DD") — без
        // getHours, чтобы день не уехал на сутки в иных зонах браузера.
        const firstDay = (createMode.startStr || "").slice(0, 10);
        // end эксклюзивен → последний реально захваченный день = endStr - 1 день
        const endExclusive = (createMode.endStr || createMode.startStr || "").slice(0, 10);
        const lastDayDate = new Date(`${endExclusive}T00:00:00`);
        lastDayDate.setDate(lastDayDate.getDate() - 1);
        const pad = (n: number) => String(n).padStart(2, "0");
        const lastDay = `${lastDayDate.getFullYear()}-${pad(lastDayDate.getMonth() + 1)}-${pad(lastDayDate.getDate())}`;
        const blockArgs = {
          master_id: masterId,
          block_date: firstDay,
          block_end_date: lastDay < firstDay ? firstDay : lastDay,
          reason: payload.comment || "Выходной",
        };
        const res = await masterCalendarApi.createBlock(blockArgs);
        if (res.conflict) {
          const list = res.conflicts
            .slice(0, 5)
            .map((c) => {
              const dt = new Date(c.datetime_start);
              const tz = settings?.timezone || "Europe/Moscow";
              const when = `${dt.toLocaleDateString("ru-RU", { timeZone: tz })} ${dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz })}`;
              return `• ${when} — ${c.client_name}${c.client_phone ? ", " + c.client_phone : ""}`;
            })
            .join("\n");
          const more = res.conflicts.length > 5 ? `\n…и ещё ${res.conflicts.length - 5}` : "";
          const ok = window.confirm(
            `На выбранные дни уже есть ${res.conflicts.length} активных записей:\n\n${list}${more}\n\nЗаблокировать дни и ОТМЕНИТЬ все эти записи?`
          );
          if (!ok) {
            return;
          }
          const forced = await masterCalendarApi.createBlock({ ...blockArgs, force: true });
          if (forced.conflict) {
            toast.error("Не удалось создать блокировку");
            return;
          }
          toast.success(`Выходной добавлен. Отменено записей: ${forced.canceled_bookings ?? res.conflicts.length}`);
        } else {
          toast.success("Выходной добавлен");
        }
        setCreateMode({ open: false, start: null, end: null, startStr: null, endStr: null, allDay: false });
        loadData();
        return;
      }

      // All-day: дата дня — из «экранной» строки (YYYY-MM-DD), время — стандартное.
      // Строки без offset бэк трактует как зону мастера (для дня offset неважен).
      let allDayStartIso: string | null = null;
      let allDayEndIso: string | null = null;
      if (isAllDay) {
        const dayStr = (createMode.startStr || "").slice(0, 10); // YYYY-MM-DD
        if (mode === "work") {
          allDayStartIso = `${dayStr}T09:00:00`;
          allDayEndIso = `${dayStr}T18:00:00`;
        } else {
          allDayStartIso = `${dayStr}T12:00:00`;
          allDayEndIso = `${dayStr}T13:00:00`;
        }
      }

      // Если выбрана процедура — автоподстановка длительности (для не-all-day)
      if (mode === "booking" && payload.service_id && !isAllDay) {
        const svc = services.find((s) => s.id === payload.service_id);
        if (svc?.duration_minutes) {
          end = new Date(start.getTime() + svc.duration_minutes * 60_000);
        }
      }

      // Канон «экранного времени»:
      //  • не-all-day → строки от календаря (с offset). Конец услуги — calIso(end).
      //  • all-day → заранее собранные строки дня.
      const startIso = allDayStartIso ?? (createMode.startStr as string);
      let endIso = allDayEndIso
        ?? (mode === "booking" && payload.service_id ? calIso(end) : (createMode.endStr as string));
      // All-day бронь с услугой: пересчёт конца по длительности от 12:00.
      if (mode === "booking" && payload.service_id && isAllDay && allDayStartIso) {
        const svc = services.find((s) => s.id === payload.service_id);
        if (svc?.duration_minutes) {
          const base = new Date(`${allDayStartIso}`);
          const e = new Date(base.getTime() + svc.duration_minutes * 60_000);
          const pad = (n: number) => String(n).padStart(2, "0");
          endIso = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}:00`;
        }
      }

      // Проверка конфликта (для рабочего времени не нужна — оно может охватывать брони)
      if (mode !== "work" && !isAllDay && hasConflict(start, end, null)) {
        toast.error("Это время уже занято");
        return;
      }

      if (mode === "work") {
        await masterCalendarApi.createSlot({
          master_id: masterId,
          datetime_start: startIso,
          datetime_end: endIso,
          max_clients: 1,
          status: "available",
          notes: "",
        });
        toast.success("Рабочее время добавлено");
      } else if (mode === "booking") {
        if (!payload.client_name?.trim()) {
          toast.error("Укажите имя клиента");
          return;
        }
        const svc = services.find((s) => s.id === payload.service_id);
        await masterBookingsApi.createBooking({
          master_id: masterId,
          client_name: payload.client_name,
          client_phone: payload.client_phone || "",
          service_id: payload.service_id || undefined,
          datetime_start: startIso,
          datetime_end: endIso,
          price: svc?.price || 0,
          status: "confirmed",
          source: "manual",
          comment: payload.comment || "",
        });
        toast.success("Бронь создана");
      } else if (mode === "block") {
        await masterCalendarApi.createSlot({
          master_id: masterId,
          datetime_start: startIso,
          datetime_end: endIso,
          max_clients: 1,
          status: "blocked",
          notes: payload.comment || "Заблокировано",
        });
        toast.success("Время заблокировано");
      } else if (mode === "break") {
        await masterCalendarApi.createSlot({
          master_id: masterId,
          datetime_start: startIso,
          datetime_end: endIso,
          max_clients: 1,
          status: "event",
          notes: payload.comment || "Перерыв",
        });
        toast.success("Перерыв добавлен");
      }
      setCreateMode({ open: false, start: null, end: null, startStr: null, endStr: null, allDay: false });
      loadData();
    } catch (e) {
      console.error("[Calendar] save failed", e);
      if (e instanceof BookingApiError && e.status === 409) {
        // Бэк прислал понятное сообщение — показываем его как есть
        toast.error(e.message);
      } else {
        toast.error("Не удалось сохранить: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  };

  // Конфликт-проверка с учётом буфера между сеансами (из настроек мастера).
  // Бэкенд тоже проверяет это, но локально мы предупреждаем сразу — без сетевого round-trip.
  const hasConflict = (start: Date, end: Date, ignoreId: string | null) => {
    const bufferMs = ((settings?.break_between_slots) || 0) * 60_000;
    const startMs = start.getTime() - bufferMs;
    const endMs = end.getTime() + bufferMs;
    return fcEvents.some(ev => {
      if (ev.extendedProps.kind === "available" || ev.extendedProps.kind === "canceled") return false;
      if (ignoreId && ev.id === ignoreId) return false;
      const s = ev.start instanceof Date ? ev.start.getTime() : new Date(ev.start as string).getTime();
      const e = ev.end instanceof Date ? ev.end.getTime() : new Date(ev.end as string).getTime();
      return s < endMs && e > startMs;
    });
  };

  // Drag move
  const handleEventDrop = (info: EventDropArg) => {
    if (!info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    if (hasConflict(info.event.start, info.event.end, info.event.id)) {
      info.el.classList.add("fcb-conflict");
      setTimeout(() => info.el.classList.remove("fcb-conflict"), 1500);
      toast.error("Это время уже занято");
      info.revert();
      return;
    }
    setPendingMove(info);
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    const ev = pendingMove.event;
    const id = ev.id;
    if (!ev.start || !ev.end) return;
    try {
      if (id.startsWith("b-")) {
        const bid = Number(id.slice(2));
        const b = bookings.find(x => x.id === bid);
        if (b) {
          // «Экранное время» от календаря — ISO-строки с offset зоны мастера.
          await rescheduleBooking(bid, ev.startStr, ev.endStr);
        }
      } else if (id.startsWith("s-")) {
        const sid = Number(id.slice(2));
        await masterCalendarApi.updateSlot({
          id: sid,
          datetime_start: ev.startStr,
          datetime_end: ev.endStr,
        });
      }
      toast.success("Перенесено");
      setPendingMove(null);
      loadData();
    } catch (e) {
      if (e instanceof BookingApiError && e.status === 409) {
        toast.error(e.message);
      } else {
        toast.error("Не удалось перенести: " + (e instanceof Error ? e.message : String(e)));
      }
      pendingMove.revert();
      setPendingMove(null);
    }
  };

  const cancelMove = () => {
    pendingMove?.revert();
    setPendingMove(null);
  };

  // Resize
  const handleEventResize = (info: EventDropArg) => {
    if (!info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    if (hasConflict(info.event.start, info.event.end, info.event.id)) {
      info.el.classList.add("fcb-conflict");
      setTimeout(() => info.el.classList.remove("fcb-conflict"), 1500);
      toast.error("Конфликт с другой записью");
      info.revert();
      return;
    }
    setPendingResize({ event: info.event, revert: info.revert });
  };

  const confirmResize = async () => {
    if (!pendingResize) return;
    const ev = pendingResize.event;
    if (!ev.start || !ev.end) return;
    try {
      if (ev.id.startsWith("b-")) {
        await rescheduleBooking(Number(ev.id.slice(2)), ev.startStr, ev.endStr);
      } else if (ev.id.startsWith("s-")) {
        await masterCalendarApi.updateSlot({
          id: Number(ev.id.slice(2)),
          datetime_start: ev.startStr,
          datetime_end: ev.endStr,
        });
      }
      toast.success("Длительность изменена");
      setPendingResize(null);
      loadData();
    } catch (e) {
      if (e instanceof BookingApiError && e.status === 409) {
        toast.error(e.message);
      } else {
        toast.error("Не удалось: " + (e instanceof Error ? e.message : String(e)));
      }
      pendingResize.revert();
      setPendingResize(null);
    }
  };

  const cancelResize = () => {
    pendingResize?.revert();
    setPendingResize(null);
  };

  // Прямой перенос брони через action='reschedule'.
  // start/end — «экранные» ISO-строки с offset зоны мастера (от календаря).
  // Бэк сам валидирует выходные / буфер / пересечения и синхронно двигает привязанный слот.
  const rescheduleBooking = async (bookingId: number, start: string, end: string) => {
    await masterBookingsApi.rescheduleBooking({
      id: bookingId,
      datetime_start: start,
      datetime_end: end,
    });
  };

  // Клик по блоку → мини-карточка
  const handleEventClick = (arg: EventClickArg) => {
    const kind = (arg.event.extendedProps as FcbEvent["extendedProps"]).kind;
    if (kind === "available") return;
    const rect = arg.el.getBoundingClientRect();
    setQuickAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    setQuick({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.start as Date,
      end: arg.event.end as Date,
      kind: kind === "booking" || kind === "canceled" ? "booking" : kind === "block" ? "block" : "break",
      raw: (arg.event.extendedProps as FcbEvent["extendedProps"]).raw,
    });
  };

  const handleQuickClose = () => {
    setQuick(null);
    setQuickAnchor(null);
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      await masterBookingsApi.updateBooking({ id: bookingId, action: "cancel" });
      toast.success("Запись отменена");
      handleQuickClose();
      loadData();
    } catch (e) {
      toast.error("Не удалось: " + String(e));
    }
  };

  const handleBookingStatus = async (
    bookingId: number,
    action: "confirm" | "complete" | "no_show" | "cancel",
  ) => {
    const labels: Record<typeof action, string> = {
      confirm: "Запись подтверждена",
      complete: "Запись завершена",
      no_show: "Отмечено: клиент не пришёл",
      cancel: "Запись отменена",
    };
    try {
      await masterBookingsApi.updateBooking({ id: bookingId, action });
      toast.success(labels[action]);
      handleQuickClose();
      loadData();
    } catch (e) {
      toast.error("Не удалось: " + String(e));
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    try {
      await masterCalendarApi.deleteSlot(slotId);
      toast.success("Удалено");
      handleQuickClose();
      loadData();
    } catch (e) {
      toast.error("Не удалось: " + String(e));
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    try {
      await masterCalendarApi.deleteBlock(blockId, masterId);
      toast.success("Выходной отменён");
      handleQuickClose();
      loadData();
    } catch (e) {
      toast.error("Не удалось: " + String(e));
    }
  };

  // Заголовок периода
  useEffect(() => {
    const api = calRef.current?.getApi();
    if (api) setViewTitle(api.view.title);
  }, [fcEvents]);

  const updateTitle = () => {
    const api = calRef.current?.getApi();
    if (api) setViewTitle(api.view.title);
  };

  // Прогресс загруженности дня
  const dayLoad = useMemo(() => {
    const map = new Map<string, { busy: number; total: number }>();
    const workMinPerDay = 12 * 60; // 9:00–21:00
    fcEvents.forEach(ev => {
      const kind = ev.extendedProps.kind;
      if (kind !== "booking" && kind !== "block" && kind !== "break") return;
      const s = ev.start instanceof Date ? ev.start : new Date(ev.start as string);
      const e = ev.end instanceof Date ? ev.end : new Date(ev.end as string);
      const key = calDateKey(s);
      const cur = map.get(key) || { busy: 0, total: workMinPerDay };
      cur.busy += (e.getTime() - s.getTime()) / 60_000;
      map.set(key, cur);
    });
    return map;
  }, [fcEvents, calDateKey]);

  // Множество заблокированных дат (YYYY-MM-DD) — 1 запись = 1 день
  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const blk of blocks) {
      if (!blk.reason || blk.reason === "removed") continue;
      set.add(blk.block_date);
    }
    return set;
  }, [blocks]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Render day header с прогресс-баром + меткой "выходной"
  const dayHeaderContent = (arg: { date: Date; text: string }) => {
    const key = calDateKey(arg.date);
    const load = dayLoad.get(key);
    const pct = load ? Math.min(100, Math.round((load.busy / load.total) * 100)) : 0;
    const isBlocked = blockedDates.has(key);
    const tz = settings?.timezone || "Europe/Moscow";
    // На мобильном в режиме недели — только число (08), иначе буквы налезают.
    // В режиме дня/месяца — полный формат.
    const shortDate = arg.date.toLocaleDateString("ru-RU", { day: "numeric", timeZone: tz });
    const shortDay = arg.date.toLocaleDateString("ru-RU", { weekday: "narrow", timeZone: tz });
    const label = (isMobile && currentView === "timeGridWeek")
      ? <><span style={{ display: "block", fontSize: 9, opacity: 0.7 }}>{shortDay}</span><span style={{ display: "block" }}>{shortDate}</span></>
      : arg.text;
    const handlePlusClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Открываем форму на этот день, время по умолчанию 9:00–10:00 (его можно
      // поправить в форме). День берём в зоне мастера; offset — из calIso.
      const dayStr = calDateKey(arg.date); // YYYY-MM-DD (зона мастера)
      const offMatch = calIso(arg.date).match(/(Z|[+-]\d{2}:\d{2})$/);
      const offset = offMatch ? offMatch[0] : "";
      const startStr = `${dayStr}T09:00:00${offset}`;
      const endStr = `${dayStr}T10:00:00${offset}`;
      const d = new Date(startStr);
      const end = new Date(endStr);
      setCreateMode({
        open: true,
        start: d,
        end,
        startStr,
        endStr,
        allDay: false,
      });
    };

    return (
      <div className="fcb-day-load group relative">
        <div className="text-sm font-semibold capitalize leading-tight">{label}</div>
        {isBlocked ? (
          <div className="fcb-day-header-block" title="Выходной">
            <Icon name="Lock" size={11} />
          </div>
        ) : (
          <>
            <div className="fcb-day-load-bar">
              <div className="fcb-day-load-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="fcb-day-load-label">{pct}%</div>
          </>
        )}
        {/* Кнопка «+» — на мобильном видна всегда, на десктопе при наведении */}
        <button
          onClick={handlePlusClick}
          className="absolute top-0 right-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-opacity z-10 sm:opacity-0 sm:group-hover:opacity-100"
          title="Создать запись на этот день"
          style={{ fontSize: 14, lineHeight: 1 }}
        >
          +
        </button>
      </div>
    );
  };

  return (
    <div className="fc-dnd space-y-3">
      {/* Шапка с навигацией */}
      <div className="flex flex-col gap-2">
        {/* Строка 1: переключатель Список/Календарь + навигация по датам */}
        <div className="flex items-center gap-2">
          {/* Переключатель — главный выбор режима, всегда виден */}
          <div className="inline-flex border border-border rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setAgendaMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${agendaMode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <Icon name="ListChecks" size={13} />
              Список
            </button>
            <button
              onClick={() => setAgendaMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-l border-border transition-colors ${!agendaMode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <Icon name="CalendarDays" size={13} />
              Календарь
            </button>
          </div>
          {/* Навигация по датам — только в режиме сетки */}
          {!agendaMode && (
            <>
              <div className="w-px h-5 bg-border shrink-0" />
              <Button size="sm" variant="outline" className="px-2 shrink-0" onClick={() => { calRef.current?.getApi().prev(); updateTitle(); }}>
                <Icon name="ChevronLeft" size={16} />
              </Button>
              <Button size="sm" variant="outline" className="px-2.5 shrink-0" onClick={() => { calRef.current?.getApi().today(); updateTitle(); }}>
                Сегодня
              </Button>
              <Button size="sm" variant="outline" className="px-2 shrink-0" onClick={() => { calRef.current?.getApi().next(); updateTitle(); }}>
                <Icon name="ChevronRight" size={16} />
              </Button>
              <span className="text-sm font-semibold capitalize flex-1 min-w-0 truncate">{viewTitle}</span>
            </>
          )}
          {loading && <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground ml-auto" />}
        </div>
        {/* Строка 2: виды сетки + служебные кнопки (только в режиме Календаря) */}
        {!agendaMode && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant={currentView === "timeGridDay" ? "default" : "outline"} onClick={() => calRef.current?.getApi().changeView("timeGridDay")}>День</Button>
            <Button size="sm" variant={currentView === "timeGridWeek" ? "default" : "outline"} onClick={() => calRef.current?.getApi().changeView("timeGridWeek")}>Неделя</Button>
            <Button size="sm" variant={currentView === "dayGridMonth" ? "default" : "outline"} onClick={() => calRef.current?.getApi().changeView("dayGridMonth")}>Месяц</Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" className="px-2" onClick={openTrash} title="Корзина и резервные копии">
              <Icon name="Archive" size={14} />
              <span className="hidden sm:inline ml-1">Корзина</span>
            </Button>
            <Button size="sm" variant="outline" className="px-2 text-red-600 hover:text-red-700" onClick={() => setClearOpen(true)} title="Очистить">
              <Icon name="Trash2" size={14} />
              <span className="hidden sm:inline ml-1">Очистить</span>
            </Button>
          </div>
        )}
      </div>

      {/* Подсказка + часовой пояс мастера */}
      <div className="flex items-center justify-between gap-2">
        {!agendaMode ? (
          <div className="hidden sm:flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Icon name="Info" size={12} className="shrink-0" />
              <span>Выделите диапазон мышью или пальцем — создать запись. Тяните блок — перенести. Нижний край — изменить длительность.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="Lock" size={12} className="shrink-0 text-red-400" />
              <span>Чтобы заблокировать <strong>целый день</strong> — выделите его в строке «Весь день» сверху сетки.</span>
            </div>
          </div>
        ) : <div />}
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 whitespace-nowrap">
          <Icon name="Globe" size={12} />
          <span>Время мастера: {tzLabel(settings?.timezone || "Europe/Moscow")}</span>
        </div>
      </div>

      {agendaMode && (
        <AgendaView
          date={agendaDate}
          bookings={bookings}
          timezone={settings?.timezone || "Europe/Moscow"}
          onPrev={() => setAgendaDate((d) => new Date(d.getTime() - 86400000))}
          onNext={() => setAgendaDate((d) => new Date(d.getTime() + 86400000))}
          onToday={() => setAgendaDate(new Date())}
          onChangeStatus={handleBookingStatus}
        />
      )}

      <div className={agendaMode ? "hidden" : ""}>
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
        timeZone={settings?.timezone || "Europe/Moscow"}
        locale={ruLocale}
        firstDay={1}
        allDaySlot={true}
        allDayText="Весь день"
        nowIndicator
        editable
        selectable
        selectMirror
        selectOverlap
        unselectAuto={false}
        longPressDelay={350}
        eventLongPressDelay={350}
        selectLongPressDelay={350}
        snapDuration="00:15:00"
        slotDuration="00:30:00"
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        height="auto"
        expandRows
        events={fcEvents}
        dayCellClassNames={(arg) => {
          const key = calDateKey(arg.date);
          return blockedDates.has(key) ? ["fcb-day-cell-blocked"] : [];
        }}
        selectAllow={(sel) => {
          // В all-day разрешаем любой диапазон дней.
          if (sel.allDay) return true;
          // Проверяем «один день» по ЭКРАННОМУ времени мастера (startStr/endStr с
          // offset зоны мастера), а не по Date в зоне браузера — иначе на границе
          // суток в другой таймзоне выделение ошибочно сбрасывалось.
          const startDay = sel.startStr.slice(0, 10);
          // Конец ровно в полночь (00:00) принадлежит предыдущему дню.
          const endTime = sel.endStr.slice(11, 16);
          let endDay = sel.endStr.slice(0, 10);
          if (endTime === "00:00") {
            const d = new Date(sel.end.getTime() - 60_000);
            endDay = (sel.view.calendar.formatIso(d) || "").slice(0, 10) || endDay;
          }
          return startDay === endDay;
        }}
        select={handleSelect}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        dayHeaderContent={dayHeaderContent}
        datesSet={handleDatesSet}
        eventDidMount={(info) => {
          // Добавляем буфер-полосу под бронями
          const buffer = (info.event.extendedProps as FcbEvent["extendedProps"]).buffer || 0;
          if (buffer > 0 && info.event.start && info.event.end) {
            const h = (buffer / 30) * 14; // 14px на 30 минут половинного слота — визуально достаточно
            const div = document.createElement("div");
            div.className = "fcb-buffer";
            div.style.height = `${Math.min(h, 12)}px`;
            info.el.appendChild(div);
          }
        }}
      />
      </div>

      {/* Floating Create Form */}
      {createMode.open && createMode.start && createMode.end && (
        <EventForm
          start={createMode.start}
          end={createMode.end}
          startStr={createMode.startStr}
          endStr={createMode.endStr}
          allDay={createMode.allDay}
          services={services}
          onCancel={() => setCreateMode({ open: false, start: null, end: null, startStr: null, endStr: null, allDay: false })}
          onCreate={handleCreate}
        />
      )}

      {/* Quick actions popover */}
      {quick && quickAnchor && (
        <QuickActionsPopover
          event={quick}
          anchor={quickAnchor}
          timezone={settings?.timezone}
          onClose={handleQuickClose}
          onCancelBooking={handleCancelBooking}
          onDeleteSlot={handleDeleteSlot}
          onDeleteBlock={handleDeleteBlock}
          onChangeStatus={handleBookingStatus}
        />
      )}

      {/* Подтверждение переноса */}
      {pendingMove && pendingMove.event.start && pendingMove.event.end && (
        <ConfirmBar
          title="Перенести запись?"
          oldText={`${fmtDate(pendingMove.oldEvent.start as Date, settings?.timezone || "Europe/Moscow")} · ${fmtTime(pendingMove.oldEvent.start as Date, settings?.timezone || "Europe/Moscow")}`}
          newText={`${fmtDate(pendingMove.event.start, settings?.timezone || "Europe/Moscow")} · ${fmtTime(pendingMove.event.start, settings?.timezone || "Europe/Moscow")}`}
          onConfirm={confirmMove}
          onCancel={cancelMove}
        />
      )}

      {/* Подтверждение resize */}
      {pendingResize && pendingResize.event.start && pendingResize.event.end && (
        <ConfirmBar
          title="Продлить сеанс?"
          oldText=""
          newText={`${fmtTime(pendingResize.event.start, settings?.timezone || "Europe/Moscow")} – ${fmtTime(pendingResize.event.end, settings?.timezone || "Europe/Moscow")}`}
          onConfirm={confirmResize}
          onCancel={cancelResize}
        />
      )}

      {/* Диалог очистки календаря */}
      <ClearCalendarDialog
        open={clearOpen}
        clearing={clearing}
        onClose={() => setClearOpen(false)}
        onClear={handleClear}
      />

      {/* Корзина и резервные копии */}
      <TrashDialog
        open={trashOpen}
        loading={trashLoading}
        bookings={trashBookings}
        backups={trashBackups}
        restoring={restoring}
        onClose={() => setTrashOpen(false)}
        onRestoreAll={handleRestoreAll}
        onRestoreOne={handleRestoreOne}
        onBackupNow={handleBackupNow}
        formatDt={(iso) => {
          try {
            return new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            }).format(new Date(iso));
          } catch {
            return iso;
          }
        }}
      />
    </div>
  );
}

const CLEAR_OPTIONS: { scope: "week" | "future" | "all"; icon: string; title: string; hint: string; danger?: boolean }[] = [
  { scope: "week", icon: "Calendar", title: "Только текущий период", hint: "То, что видно сейчас" },
  { scope: "future", icon: "CalendarClock", title: "Сегодня и далее", hint: "История сохранится" },
  { scope: "all", icon: "Trash2", title: "Полностью весь календарь", hint: "Включая историю", danger: true },
];

function ClearCalendarDialog({
  open, clearing, onClose, onClear,
}: {
  open: boolean;
  clearing: boolean;
  onClose: () => void;
  onClear: (scope: "all" | "week" | "future") => void;
}) {
  const [pending, setPending] = useState<"all" | "week" | "future" | null>(null);
  useEffect(() => {
    if (!open) setPending(null);
  }, [open]);
  if (!open) return null;

  const close = () => { if (!clearing) onClose(); };
  const chosen = CLEAR_OPTIONS.find((o) => o.scope === pending);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={close}>
      <div className="bg-card border rounded-2xl shadow-xl p-5 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Icon name="AlertTriangle" size={20} className="text-amber-500" />
          <div className="font-semibold text-lg">Очистить календарь</div>
        </div>

        {!pending ? (
          <>
            <div className="text-sm text-muted-foreground">
              Слоты и блокировки будут удалены. Записи клиентов попадут в корзину и сохранятся в резервную копию — их можно восстановить.
            </div>
            <div className="grid grid-cols-1 gap-2">
              {CLEAR_OPTIONS.map((o) => (
                <button
                  key={o.scope}
                  disabled={clearing}
                  onClick={() => setPending(o.scope)}
                  className={
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors text-left disabled:opacity-50 " +
                    (o.danger
                      ? "border-red-300 hover:bg-red-50 text-red-700"
                      : "hover:bg-muted/50")
                  }
                >
                  <Icon name={o.icon} size={16} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.hint}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={close} disabled={clearing}>Отмена</Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm">
              Вы выбрали: <span className="font-semibold">{chosen?.title}</span>.
              <div className="text-muted-foreground mt-1">
                Записи клиентов будут перемещены в корзину (не удалены безвозвратно). Подтвердить очистку?
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setPending(null)} disabled={clearing}>Назад</Button>
              <Button
                variant="destructive"
                onClick={() => pending && onClear(pending)}
                disabled={clearing}
                className="gap-1.5"
              >
                {clearing && <Icon name="Loader2" size={15} className="animate-spin" />}
                Очистить
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TrashDialog({
  open, loading, bookings, backups, restoring,
  onClose, onRestoreAll, onRestoreOne, onBackupNow, formatDt,
}: {
  open: boolean;
  loading: boolean;
  bookings: MasterBooking[];
  backups: MasterBackup[];
  restoring: boolean;
  onClose: () => void;
  onRestoreAll: () => void;
  onRestoreOne: (bookingId: number) => void;
  onBackupNow: () => void;
  formatDt: (iso: string) => string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-xl p-5 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Icon name="Archive" size={20} className="text-primary" />
          <div className="font-semibold text-lg">Корзина и резервные копии</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Удалённые записи ({bookings.length})</div>
                {bookings.length > 0 && (
                  <Button size="sm" onClick={onRestoreAll} disabled={restoring} className="gap-1.5">
                    {restoring && <Icon name="Loader2" size={14} className="animate-spin" />}
                    Восстановить все
                  </Button>
                )}
              </div>
              {bookings.length === 0 ? (
                <div className="text-xs text-muted-foreground">Корзина пуста.</div>
              ) : (
                <div className="space-y-1.5">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                      <Icon name="User" size={14} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{b.client_name}</div>
                        <div className="text-xs text-muted-foreground">{formatDt(b.datetime_start)} · {b.client_phone}</div>
                      </div>
                      {b.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 shrink-0 h-8"
                          disabled={restoring}
                          onClick={() => onRestoreOne(b.id!)}
                        >
                          <Icon name="RotateCcw" size={13} />
                          <span className="hidden sm:inline">Восстановить</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Резервные копии ({backups.length})</div>
                <Button size="sm" variant="outline" onClick={onBackupNow} className="gap-1.5">
                  <Icon name="Save" size={14} /> Создать копию
                </Button>
              </div>
              {backups.length === 0 ? (
                <div className="text-xs text-muted-foreground">Копий пока нет.</div>
              ) : (
                <div className="space-y-1.5">
                  {backups.map((bk) => (
                    <div key={bk.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                      <Icon name="FileArchive" size={14} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{bk.bookings_count} записей · {bk.reason === "clear" ? "перед очисткой" : "вручную"}</div>
                        <div className="text-xs text-muted-foreground">{formatDt(bk.created_at)}</div>
                      </div>
                      {bk.file_url && (
                        <a href={bk.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                          <Icon name="Download" size={13} /> Скачать
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="ghost" onClick={onClose}>Закрыть</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmBar({
  title,
  oldText,
  newText,
  onConfirm,
  onCancel,
}: {
  title: string;
  oldText: string;
  newText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-xl shadow-lg p-4 flex items-center gap-3 min-w-[300px]">
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        {oldText && <div className="text-xs text-muted-foreground">Было: {oldText}</div>}
        <div className="text-xs text-foreground">Стало: {newText}</div>
      </div>
      <Button size="sm" onClick={onConfirm}>Подтвердить</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Отмена</Button>
    </div>
  );
}