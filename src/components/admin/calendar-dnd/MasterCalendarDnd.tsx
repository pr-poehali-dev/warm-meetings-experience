import { useEffect, useMemo, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateSelectArg, DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, EventDropArg } from "@fullcalendar/core";
import ruLocale from "@fullcalendar/core/locales/ru";
import { toast } from "sonner";

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
  MasterAddress,
  DayAddress,
} from "@/lib/master-calendar-api";

import EventForm, { CreateMode, CreatePayload } from "./EventForm";
import QuickActionsPopover, { QuickEvent } from "./QuickActionsPopover";
import AgendaView from "./AgendaView";
import DayActionDialog, { DayBookingPayload, DayBlockPayload } from "./DayActionDialog";
import DayAddressDialog from "./DayAddressDialog";
import { FcbEvent, fmtTime, fmtDate } from "./calendarHelpers";
import { ConfirmBar, CancelBookingDialog, ClearCalendarDialog, TrashDialog } from "./CalendarDialogs";
import CalendarToolbar from "./CalendarToolbar";
import "./styles.css";

export interface MasterCalendarDndRef {
  openTrash: () => void;
  openClear: () => void;
}

interface Props {
  masterId: number;
  onTrash?: () => void;
  onClear?: () => void;
}

const MasterCalendarDnd = forwardRef<MasterCalendarDndRef, Props>(function MasterCalendarDnd({ masterId, onTrash: _onTrash, onClear: _onClear }, ref) {
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

  const [showConfirm, ConfirmDialog] = useConfirm();
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
    startStr: string | null;
    endStr: string | null;
    allDay: boolean;
  }>({ open: false, start: null, end: null, startStr: null, endStr: null, allDay: false });

  const [quick, setQuick] = useState<QuickEvent | null>(null);
  const [quickAnchor, setQuickAnchor] = useState<{ x: number; y: number } | null>(null);

  const [pendingMove, setPendingMove] = useState<EventDropArg | null>(null);
  const [pendingResize, setPendingResize] = useState<{ event: EventDropArg["event"]; revert: () => void } | null>(null);

  const [viewTitle, setViewTitle] = useState<string>("");
  const [viewStart, setViewStart] = useState<Date>(new Date());
  const STORAGE_VIEW_KEY = "master_cal_view";
  const [currentView, setCurrentView] = useState<string>(
    () => localStorage.getItem(STORAGE_VIEW_KEY) || "timeGridWeek"
  );
  const [agendaMode, setAgendaMode] = useState(false);

  const changeCalView = (view: string) => {
    const api = calRef.current?.getApi();
    if (api) { api.changeView(view); setViewTitle(api.view.title); }
    localStorage.setItem(STORAGE_VIEW_KEY, view);
  };
  const [agendaDate, setAgendaDate] = useState<Date>(new Date());
  const [dayAction, setDayAction] = useState<{ dayStr: string; dayLabel: string; offset: string } | null>(null);
  const [daySaving, setDaySaving] = useState(false);
  const [addresses, setAddresses] = useState<MasterAddress[]>([]);
  const [dayAddresses, setDayAddresses] = useState<Record<string, DayAddress>>({});
  const [dayAddrDialog, setDayAddrDialog] = useState<{ dayStr: string; dayLabel: string } | null>(null);
  // Флаг: следующий allDay-select пришёл от нашей кнопки «+» → игнорируем EventForm
  const suppressAllDaySelect = useRef(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashBookings, setTrashBookings] = useState<MasterBooking[]>([]);
  const [trashBackups, setTrashBackups] = useState<MasterBackup[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);

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

  useImperativeHandle(ref, () => ({
    openTrash,
    openClear: () => setClearOpen(true),
  }));

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
      const [wv, srv, st, addr, dayAddr] = await Promise.all([
        masterCalendarApi.getWeekView(masterId, undefined, dateFrom, dateTo),
        masterCalendarApi.getServices(masterId).catch(() => []),
        masterCalendarApi.getSettings(masterId).catch(() => null),
        masterCalendarApi.getAddresses(masterId).catch(() => []),
        masterCalendarApi.getDayAddresses(masterId, dateFrom, dateTo).catch(() => ({ days: {} })),
      ]);
      setBookings(wv.bookings || []);
      setSlots(wv.slots || []);
      setBlocks(wv.blocks || []);
      setServices(srv || []);
      setSettings(st);
      setAddresses(addr || []);
      setDayAddresses(dayAddr.days || {});
    } catch (e) {
      toast.error("Не удалось загрузить календарь: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  // Перезагружаем данные при смене видимого диапазона FullCalendar
  const handleDatesSet = useCallback((arg: { start: Date; end: Date; view: { type: string; title: string } }) => {
    const endInclusive = new Date(arg.end.getTime() - 24 * 60 * 60_000);
    loadData(calDateKey(arg.start), calDateKey(endInclusive));
    setViewTitle(arg.view.title.replace(/\s*[\u0433\u0413]\.\s*/g, " ").trim());
    setViewStart(arg.start);
    setCurrentView(arg.view.type);
    localStorage.setItem(STORAGE_VIEW_KEY, arg.view.type);
  }, [loadData, calDateKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateTitle = () => {
    const api = calRef.current?.getApi();
    if (api) setViewTitle(api.view.title);
  };

  // Короткое имя адреса слота по приоритету: адрес слота → адрес дня → выезд.
  const slotAddrLabel = useCallback((s: MasterSlot): string => {
    if (s.address_id) {
      const a = addresses.find((x) => x.id === s.address_id);
      if (a) return a.label || a.address_text;
      if (s.slot_address) return s.slot_address;
    }
    const dayKey = String(s.datetime_start).slice(0, 10);
    const da = dayAddresses[dayKey];
    if (da) return da.label || da.address_text;
    return "Выезд";
  }, [addresses, dayAddresses]);

  // Преобразуем в FC events
  const fcEvents = useMemo<FcbEvent[]>(() => {
    const list: FcbEvent[] = [];

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
        const addrLabel = slotAddrLabel(s);
        list.push({
          id: `s-${s.id}`,
          title: `Свободно · ${addrLabel}`,
          start: s.datetime_start,
          end: s.datetime_end,
          classNames: ["fcb-available"],
          editable: false,
          display: "background",
          extendedProps: { kind: "available", raw: s, addrLabel },
        });
      }
    }

    const seenBlockDates = new Set<string>();
    for (const blk of blocks) {
      if (!blk.reason || blk.reason === "removed") continue;
      if (seenBlockDates.has(blk.block_date)) continue;
      seenBlockDates.add(blk.block_date);

      const blockDay = String(blk.block_date).slice(0, 10);

      list.push({
        id: `blk-${blk.id}`,
        title: `🔒 ${blk.reason || "Выходной"}`,
        start: blockDay,
        allDay: true,
        classNames: ["fcb-day-block"],
        editable: false,
        extendedProps: { kind: "block", raw: blk },
      });
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
  }, [bookings, slots, blocks, settings, slotAddrLabel]);

  // Проверка конфликтов
  const hasConflict = useCallback((start: Date, end: Date, excludeId: string | null) => {
    return fcEvents.some((ev) => {
      if (ev.extendedProps.kind === "available") return false;
      if (excludeId && ev.id === excludeId) return false;
      const evStart = ev.start instanceof Date ? ev.start : new Date(ev.start as string);
      const evEnd = ev.end instanceof Date ? ev.end : new Date(ev.end as string);
      return start < evEnd && end > evStart;
    });
  }, [fcEvents]);

  // Drag create
  const handleSelect = (sel: DateSelectArg) => {
    const api = sel.view.calendar;

    if (sel.allDay && suppressAllDaySelect.current) {
      suppressAllDaySelect.current = false;
      api.unselect();
      return;
    }

    let start = sel.start;
    let end = sel.end;
    const startStr = sel.startStr;
    let endStr = sel.endStr;

    if (sel.allDay) {
      start = sel.start;
      end = sel.end;
    } else {
      if (end.getTime() - start.getTime() < 15 * 60_000) {
        end = new Date(start.getTime() + 60 * 60_000);
        endStr = calIso(end);
      }
    }

    setCreateMode({ open: true, start, end, startStr, endStr, allDay: !!sel.allDay });
    api.unselect();
  };

  const handleDateClick = useCallback((arg: DateClickArg) => {
    if (arg.allDay) return;
    const start = arg.date;
    const end = new Date(start.getTime() + 60 * 60_000);
    const startStr = calIso(start);
    const endStr = calIso(end);
    setCreateMode({ open: true, start, end, startStr, endStr, allDay: false });
  }, [calIso]);

  // Создание
  const handleCreate = async (mode: CreateMode, payload: CreatePayload) => {
    if (!createMode.start || !createMode.end) return;
    let start = createMode.start;
    let end = createMode.end;
    const isAllDay = createMode.allDay;

    if (!isAllDay && mode === "booking" && payload.time_start && payload.time_end && payload.time_end > payload.time_start) {
      const base = createMode.startStr || calIso(start);
      const dayStr = base.slice(0, 10);
      const offsetOf = (s: string) => {
        const m = s.match(/(Z|[+-]\d{2}:\d{2})$/);
        return m ? m[0] : "";
      };
      const offset = offsetOf(base) || offsetOf(calIso(start));
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
      if (isAllDay && mode === "block") {
        const firstDay = (createMode.startStr || "").slice(0, 10);
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

      let allDayStartIso: string | null = null;
      let allDayEndIso: string | null = null;
      if (isAllDay) {
        const dayStr = (createMode.startStr || "").slice(0, 10);
        if (mode === "work") {
          allDayStartIso = `${dayStr}T09:00:00`;
          allDayEndIso = `${dayStr}T18:00:00`;
        } else {
          allDayStartIso = `${dayStr}T12:00:00`;
          allDayEndIso = `${dayStr}T13:00:00`;
        }
      }

      if (mode === "booking" && payload.service_id && !isAllDay) {
        const svc = services.find((s) => s.id === payload.service_id);
        if (svc?.duration_minutes) {
          end = new Date(start.getTime() + svc.duration_minutes * 60_000);
        }
      }

      const startIso = allDayStartIso ?? (createMode.startStr as string);
      let endIso = allDayEndIso
        ?? (mode === "booking" && payload.service_id ? calIso(end) : (createMode.endStr as string));

      if (mode === "booking" && payload.service_id && isAllDay && allDayStartIso) {
        const svc = services.find((s) => s.id === payload.service_id);
        if (svc?.duration_minutes) {
          const pad = (n: number) => String(n).padStart(2, "0");
          const dayStr = allDayStartIso.slice(0, 10);
          const startMinutes = 12 * 60;
          const total = startMinutes + svc.duration_minutes;
          const addDays = Math.floor(total / (24 * 60));
          const hh = Math.floor((total % (24 * 60)) / 60);
          const mm = total % 60;
          let dateStr = dayStr;
          if (addDays > 0) {
            const [y, mo, d] = dayStr.split("-").map(Number);
            const t = new Date(Date.UTC(y, mo - 1, d) + addDays * 86_400_000);
            dateStr = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
          }
          endIso = `${dateStr}T${pad(hh)}:${pad(mm)}:00`;
        }
      }

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
          notes: payload.comment || "",
        });
        toast.success("Рабочее время добавлено");
      } else if (mode === "block") {
        await masterCalendarApi.createSlot({
          master_id: masterId,
          datetime_start: startIso,
          datetime_end: endIso,
          max_clients: 1,
          status: "blocked",
          notes: payload.comment || "Заблокировано",
        });
        toast.success("Перерыв добавлен");
      } else {
        await masterBookingsApi.createBooking({
          master_id: masterId,
          client_name: payload.client_name || "Клиент",
          client_phone: payload.client_phone || "",
          service_id: payload.service_id || undefined,
          datetime_start: startIso,
          datetime_end: endIso,
          price: services.find((s) => s.id === payload.service_id)?.price || 0,
          status: "confirmed",
          source: "manual",
          comment: payload.comment || "",
        });
        toast.success("Запись создана");
      }

      setCreateMode({ open: false, start: null, end: null, startStr: null, endStr: null, allDay: false });
      loadData();
    } catch (e) {
      if (e instanceof BookingApiError && e.status === 409) {
        toast.error(e.message);
      } else {
        toast.error("Не удалось создать: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  };

  // Drag & drop
  const handleEventDrop = (info: EventDropArg) => {
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
    setPendingMove(info);
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    const ev = pendingMove.event;
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

  const rescheduleBooking = async (bookingId: number, start: string, end: string) => {
    await masterBookingsApi.rescheduleBooking({
      id: bookingId,
      datetime_start: start,
      datetime_end: end,
    });
  };

  // ─── Действия из окна «+» на дне ──────────────────────────────────────
  const handleDayBooking = async (p: DayBookingPayload) => {
    if (!dayAction) return;
    if (!p.client_name.trim()) {
      toast.error("Укажите имя клиента");
      return;
    }
    const { dayStr, offset } = dayAction;
    const startIso = `${dayStr}T${p.time_start}:00${offset}`;
    const endIso = `${dayStr}T${p.time_end}:00${offset}`;
    const svc = services.find((s) => s.id === p.service_id);
    setDaySaving(true);
    try {
      await masterBookingsApi.createBooking({
        master_id: masterId,
        client_name: p.client_name,
        client_phone: p.client_phone || "",
        service_id: p.service_id || undefined,
        datetime_start: startIso,
        datetime_end: endIso,
        price: svc?.price || 0,
        status: "confirmed",
        source: "manual",
        comment: p.comment || "",
      });
      toast.success("Бронь создана");
      setDayAction(null);
      loadData();
    } catch (e) {
      if (e instanceof BookingApiError && e.status === 409) {
        toast.error(e.message);
      } else {
        toast.error("Не удалось: " + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      setDaySaving(false);
    }
  };

  const handleDayBlock = async (p: DayBlockPayload) => {
    if (!dayAction) return;
    const { dayStr, offset } = dayAction;
    setDaySaving(true);
    try {
      if (p.whole_day) {
        const res = await masterCalendarApi.createBlock({
          master_id: masterId,
          block_date: dayStr,
          block_end_date: dayStr,
          reason: p.reason || "Выходной",
        });
        if (res.conflict) {
          const ok = await showConfirm({
            title: "Заблокировать день?",
            description: `На этот день есть ${res.conflicts.length} активных записей. Они будут отменены.`,
            confirmLabel: "Заблокировать",
            variant: "destructive",
          });
          if (!ok) { setDaySaving(false); return; }
          const forced = await masterCalendarApi.createBlock({
            master_id: masterId,
            block_date: dayStr,
            block_end_date: dayStr,
            reason: p.reason || "Выходной",
            force: true,
          });
          if (forced.conflict) { toast.error("Не удалось заблокировать"); setDaySaving(false); return; }
          toast.success(`День заблокирован. Отменено записей: ${forced.canceled_bookings ?? res.conflicts.length}`);
        } else {
          toast.success("День заблокирован");
        }
      } else {
        await masterCalendarApi.createSlot({
          master_id: masterId,
          datetime_start: `${dayStr}T${p.time_start}:00${offset}`,
          datetime_end: `${dayStr}T${p.time_end}:00${offset}`,
          max_clients: 1,
          status: "blocked",
          notes: p.reason || "Заблокировано",
        });
        toast.success("Интервал заблокирован");
      }
      setDayAction(null);
      loadData();
    } catch (e) {
      if (e instanceof BookingApiError && e.status === 409) {
        toast.error(e.message);
      } else {
        toast.error("Не удалось: " + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      setDaySaving(false);
    }
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

  const handleCancelBooking = (bookingId: number) => {
    setCancelConfirm(bookingId);
  };

  const confirmCancelBooking = async () => {
    if (cancelConfirm === null) return;
    const bookingId = cancelConfirm;
    setCancelConfirm(null);
    try {
      await masterBookingsApi.updateBooking({ id: bookingId, action: "cancel" });
      toast.success("Запись отменена и перенесена в корзину");
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
    if (action === "cancel") {
      setCancelConfirm(bookingId);
      return;
    }
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

  // Нагрузка дня (прогресс-бар в шапке)
  const dayLoad = useMemo(() => {
    const map = new Map<string, { busy: number; total: number }>();
    const workMinPerDay = 12 * 60;
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

  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const blk of blocks) {
      if (!blk.reason || blk.reason === "removed") continue;
      set.add(blk.block_date);
    }
    return set;
  }, [blocks]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const openDayAction = useCallback((date: Date, suppressSelect = false) => {
    const tz = settings?.timezone || "Europe/Moscow";
    if (suppressSelect) suppressAllDaySelect.current = true;
    const dayStr = calDateKey(date);
    const offMatch = calIso(date).match(/(Z|[+-]\d{2}:\d{2})$/);
    const offset = offMatch ? offMatch[0] : "";
    const dayLabel = date.toLocaleDateString("ru-RU", {
      weekday: "long", day: "2-digit", month: "long", timeZone: tz,
    });
    setDayAction({ dayStr, dayLabel, offset });
  }, [settings?.timezone, calDateKey, calIso]);

  const openDayAddress = useCallback((date: Date) => {
    const tz = settings?.timezone || "Europe/Moscow";
    const dayStr = calDateKey(date);
    const dayLabel = date.toLocaleDateString("ru-RU", {
      weekday: "long", day: "2-digit", month: "long", timeZone: tz,
    });
    setDayAddrDialog({ dayStr, dayLabel });
  }, [settings?.timezone, calDateKey]);

  const handleSaveDayAddress = async (addressId: number | null) => {
    if (!dayAddrDialog) return;
    setDaySaving(true);
    try {
      await masterCalendarApi.setDayAddress(masterId, dayAddrDialog.dayStr, addressId);
      setDayAddresses((prev) => {
        const next = { ...prev };
        if (addressId) {
          const a = addresses.find((x) => x.id === addressId);
          if (a) {
            next[dayAddrDialog.dayStr] = {
              address_id: addressId,
              address_text: a.address_text,
              label: a.label,
              color: a.color,
              latitude: a.latitude,
              longitude: a.longitude,
            };
          }
        } else {
          delete next[dayAddrDialog.dayStr];
        }
        return next;
      });
      toast.success(addressId ? "Адрес дня сохранён" : "День стал выездным");
      setDayAddrDialog(null);
    } catch (e) {
      toast.error("Не удалось сохранить адрес дня: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDaySaving(false);
    }
  };

  const dayHeaderContent = (arg: { date: Date; text: string }) => {
    const key = calDateKey(arg.date);
    const load = dayLoad.get(key);
    const pct = load ? Math.min(100, Math.round((load.busy / load.total) * 100)) : 0;
    const isBlocked = blockedDates.has(key);
    const dayAddr = dayAddresses[key];
    const tz = settings?.timezone || "Europe/Moscow";
    const shortDate = arg.date.toLocaleDateString("ru-RU", { day: "numeric", timeZone: tz });
    const shortDay = arg.date.toLocaleDateString("ru-RU", { weekday: "narrow", timeZone: tz });
    const label = (isMobile && currentView === "timeGridWeek")
      ? <><span style={{ display: "block", fontSize: 9, opacity: 0.7 }}>{shortDay}</span><span style={{ display: "block" }}>{shortDate}</span></>
      : arg.text;
    return (
      <div className="fcb-day-load">
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
        {currentView !== "dayGridMonth" && (
          <button
            onClick={(e) => { e.stopPropagation(); openDayAction(arg.date); }}
            className="fcb-day-plus-row"
            title="Создать бронь или заблокировать этот день"
          >
            <span className="fcb-day-plus-icon">+</span>
            <span className="fcb-day-plus-text hidden sm:inline">запись</span>
          </button>
        )}
        {currentView !== "dayGridMonth" && (
          <button
            onClick={(e) => { e.stopPropagation(); openDayAddress(arg.date); }}
            className="fcb-day-addr-row"
            title={dayAddr ? `Адрес дня: ${dayAddr.label || dayAddr.address_text}` : "Задать адрес дня (иначе — выезд)"}
          >
            <span
              className="fcb-day-addr-dot"
              style={{ backgroundColor: dayAddr ? (dayAddr.color || "#22c55e") : "transparent" }}
            />
            <span className="fcb-day-addr-text hidden sm:inline">
              {dayAddr ? (dayAddr.label || "адрес") : "выезд"}
            </span>
          </button>
        )}
      </div>
    );
  };

  const tz = settings?.timezone || "Europe/Moscow";

  // Кастомный контент события: на свободном слоте показываем адрес-метку,
  // чтобы мастер сразу видел, где он работает в это время.
  const renderEventContent = (arg: {
    event: { title: string; extendedProps: Record<string, unknown>; classNames?: string[] };
    timeText: string;
  }) => {
    const ep = arg.event.extendedProps as FcbEvent["extendedProps"] & { addrLabel?: string };
    if (ep.kind === "available" && ep.addrLabel) {
      return (
        <div className="fcb-avail-label">
          <Icon name="MapPin" size={10} />
          <span>{ep.addrLabel}</span>
        </div>
      );
    }
    return (
      <div className="fc-event-main-frame">
        {arg.timeText && <div className="fc-event-time">{arg.timeText}</div>}
        <div className="fc-event-title-container">
          <div className="fc-event-title fc-sticky">{arg.event.title || "\u00A0"}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fc-dnd space-y-2">
      <CalendarToolbar
        agendaMode={agendaMode}
        setAgendaMode={setAgendaMode}
        currentView={currentView}
        viewStart={viewStart}
        timezone={tz}
        loading={loading}
        calRef={calRef}
        updateTitle={updateTitle}
        changeCalView={changeCalView}
      />

      {/* Подсказки — одна строка, только десктоп */}
      {!agendaMode && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon name="Info" size={11} className="shrink-0" />
          <span>Выделите диапазон — создать запись. Тяните блок — перенести. Нижний край — длительность.</span>
          <span className="opacity-30 mx-0.5">·</span>
          <Icon name="Plus" size={11} className="shrink-0 text-primary" />
          <span>Кнопка <strong>«+ запись»</strong> под датой — бронь или выходной.</span>
        </div>
      )}

      {agendaMode && (
        <AgendaView
          date={agendaDate}
          bookings={bookings}
          timezone={tz}
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
          initialView={currentView}
          timeZone={tz}
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
          eventContent={renderEventContent}
          dayCellClassNames={(arg) => {
            const key = calDateKey(arg.date);
            return blockedDates.has(key) ? ["fcb-day-cell-blocked"] : [];
          }}
          selectAllow={(sel) => {
            if (sel.allDay) return true;
            const startDay = sel.startStr.slice(0, 10);
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
            const buffer = (info.event.extendedProps as FcbEvent["extendedProps"]).buffer || 0;
            if (buffer > 0 && info.event.start && info.event.end) {
              const h = (buffer / 30) * 14;
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

      {/* Окно «+» на дне: ручная бронь или блокировка */}
      {dayAction && (
        <DayActionDialog
          dayStr={dayAction.dayStr}
          dayLabel={dayAction.dayLabel}
          services={services}
          saving={daySaving}
          onClose={() => setDayAction(null)}
          onCreateBooking={handleDayBooking}
          onBlock={handleDayBlock}
        />
      )}

      {/* Адрес дня */}
      {dayAddrDialog && (
        <DayAddressDialog
          dayLabel={dayAddrDialog.dayLabel}
          addresses={addresses}
          currentAddressId={dayAddresses[dayAddrDialog.dayStr]?.address_id ?? null}
          saving={daySaving}
          onClose={() => setDayAddrDialog(null)}
          onSave={handleSaveDayAddress}
        />
      )}

      {/* Подтверждение переноса */}
      {pendingMove && pendingMove.event.start && pendingMove.event.end && (
        <ConfirmBar
          title="Перенести запись?"
          oldText={`${fmtDate(pendingMove.oldEvent.start as Date, tz)} · ${fmtTime(pendingMove.oldEvent.start as Date, tz)}`}
          newText={`${fmtDate(pendingMove.event.start, tz)} · ${fmtTime(pendingMove.event.start, tz)}`}
          onConfirm={confirmMove}
          onCancel={cancelMove}
        />
      )}

      {/* Подтверждение resize */}
      {pendingResize && pendingResize.event.start && pendingResize.event.end && (
        <ConfirmBar
          title="Продлить сеанс?"
          oldText=""
          newText={`${fmtTime(pendingResize.event.start, tz)} – ${fmtTime(pendingResize.event.end, tz)}`}
          onConfirm={confirmResize}
          onCancel={cancelResize}
        />
      )}

      {/* Диалог подтверждения отмены записи */}
      <CancelBookingDialog
        open={cancelConfirm !== null}
        onConfirm={confirmCancelBooking}
        onClose={() => setCancelConfirm(null)}
      />

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
        formatDt={(iso: string) => {
          try {
            return new Intl.DateTimeFormat("ru-RU", {
              timeZone: tz,
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            }).format(new Date(iso));
          } catch {
            return iso;
          }
        }}
      />
      {ConfirmDialog}
    </div>
  );
});

export default MasterCalendarDnd;