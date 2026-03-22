import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { masterCalendarApi, masterBookingsApi } from "@/lib/master-calendar-api";
import type {
  MasterSlot,
  MasterBooking,
  MasterService,
  WeekViewData,
  DayBlock,
  BookingStats,
  ScheduleTemplate,
} from "@/lib/master-calendar-api";

const MASTER_ID = 1;
const HOURS_START = 8;
const HOURS_END = 23;
const PX_PER_HOUR = 60;

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

type ViewMode = "week" | "month";

interface SlotFormData {
  date: string;
  time_start: string;
  time_end: string;
  service_id: string;
  max_clients: number;
  notes: string;
}

interface BlockFormData {
  date_from: string;
  date_to: string;
  reason: string;
  notes: string;
}

interface TemplateFormData {
  template_id: string;
  weeks: number;
  start_date: string;
}

const formatDateShort = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}.${m}`;
};

const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}-${endDay} ${MONTH_NAMES_GENITIVE[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${startDay} ${MONTH_NAMES_GENITIVE[weekStart.getMonth()]} - ${endDay} ${MONTH_NAMES_GENITIVE[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
};

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getSlotPosition = (slot: MasterSlot) => {
  const start = new Date(slot.datetime_start);
  const end = new Date(slot.datetime_end);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = (startHour - HOURS_START) * PX_PER_HOUR;
  const height = (endHour - startHour) * PX_PER_HOUR;
  return { top: `${top}px`, height: `${Math.max(height, 30)}px` };
};

const getSlotColors = (status: MasterSlot["status"]): string => {
  const colors: Record<string, string> = {
    available: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
    pending: "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200",
    booked: "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
    blocked: "bg-gray-200 border-gray-300 text-gray-600 hover:bg-gray-300",
    event: "bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200",
  };
  return colors[status] || "bg-gray-100 border-gray-300 text-gray-600";
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    available: "Свободен",
    pending: "Ожидает",
    booked: "Забронирован",
    blocked: "Заблокирован",
    event: "Мероприятие",
    confirmed: "Подтверждён",
    canceled: "Отменён",
    completed: "Завершён",
    no_show: "Неявка",
  };
  return labels[status] || status;
};

const getBookingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    canceled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    no_show: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

const MasterCalendar = () => {
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);

  const [weekData, setWeekData] = useState<WeekViewData | null>(null);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [services, setServices] = useState<MasterService[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSlotDetailOpen, setIsSlotDetailOpen] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<MasterSlot | null>(null);
  const [slotBookings, setSlotBookings] = useState<MasterBooking[]>([]);

  const [slotForm, setSlotForm] = useState<SlotFormData>({
    date: formatDateISO(new Date()),
    time_start: "10:00",
    time_end: "11:00",
    service_id: "",
    max_clients: 1,
    notes: "",
  });

  const [blockForm, setBlockForm] = useState<BlockFormData>({
    date_from: formatDateISO(new Date()),
    date_to: formatDateISO(new Date()),
    reason: "",
    notes: "",
  });

  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    template_id: "",
    weeks: 1,
    start_date: formatDateISO(getMonday(new Date())),
  });

  const [saving, setSaving] = useState(false);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = HOURS_START; i <= HOURS_END; i++) {
      h.push(i);
    }
    return h;
  }, []);

  const fetchWeekData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await masterCalendarApi.getWeekView(MASTER_ID, formatDateISO(weekStart));
      setWeekData(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные календаря",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [weekStart, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await masterBookingsApi.getStats(MASTER_ID);
      setStats(data);
    } catch {
      // stats are non-critical
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const data = await masterCalendarApi.getServices(MASTER_ID);
      setServices(data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await masterCalendarApi.getTemplates(MASTER_ID);
      setTemplates(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  useEffect(() => {
    fetchStats();
    fetchServices();
    fetchTemplates();
  }, [fetchStats, fetchServices, fetchTemplates]);

  const goToPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const goToToday = () => {
    setWeekStart(getMonday(new Date()));
  };

  const getSlotsForDay = (dayDate: Date): MasterSlot[] => {
    if (!weekData?.slots) return [];
    const dateStr = formatDateISO(dayDate);
    return weekData.slots.filter((slot) => {
      const slotDate = slot.datetime_start.split("T")[0];
      return slotDate === dateStr;
    });
  };

  const getBookingsForSlot = (slotId: number): MasterBooking[] => {
    if (!weekData?.bookings) return [];
    return weekData.bookings.filter((b) => b.slot_id === slotId);
  };

  const isDayBlocked = (dayDate: Date): DayBlock | undefined => {
    if (!weekData?.blocks) return undefined;
    const dateStr = formatDateISO(dayDate);
    return weekData.blocks.find((block) => {
      const start = block.block_date;
      const end = block.block_end_date || block.block_date;
      return dateStr >= start && dateStr <= end;
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleSlotClick = (slot: MasterSlot) => {
    setSelectedSlot(slot);
    const bookings = slot.id ? getBookingsForSlot(slot.id) : [];
    setSlotBookings(bookings);
    setIsSlotDetailOpen(true);
  };

  const handleCreateSlot = async () => {
    if (!slotForm.date || !slotForm.time_start || !slotForm.time_end) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await masterCalendarApi.createSlot({
        master_id: MASTER_ID,
        datetime_start: `${slotForm.date}T${slotForm.time_start}:00`,
        datetime_end: `${slotForm.date}T${slotForm.time_end}:00`,
        service_id: slotForm.service_id ? Number(slotForm.service_id) : null,
        max_clients: slotForm.max_clients,
        notes: slotForm.notes || undefined,
        status: "available",
        booked_count: 0,
      });
      toast({ title: "Готово", description: "Слот успешно создан" });
      setIsSlotDialogOpen(false);
      setSlotForm({
        date: formatDateISO(new Date()),
        time_start: "10:00",
        time_end: "11:00",
        service_id: "",
        max_clients: 1,
        notes: "",
      });
      fetchWeekData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось создать слот", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    setSaving(true);
    try {
      await masterCalendarApi.deleteSlot(slotId);
      toast({ title: "Готово", description: "Слот удалён" });
      setIsSlotDetailOpen(false);
      setSelectedSlot(null);
      fetchWeekData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить слот", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!blockForm.date_from) {
      toast({ title: "Ошибка", description: "Укажите дату", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await masterCalendarApi.createBlock({
        master_id: MASTER_ID,
        block_date: blockForm.date_from,
        block_end_date: blockForm.date_to || blockForm.date_from,
        reason: blockForm.reason || undefined,
        notes: blockForm.notes || undefined,
      });
      toast({ title: "Готово", description: "День заблокирован" });
      setIsBlockDialogOpen(false);
      setBlockForm({ date_from: formatDateISO(new Date()), date_to: formatDateISO(new Date()), reason: "", notes: "" });
      fetchWeekData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось заблокировать день", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!templateForm.template_id) {
      toast({ title: "Ошибка", description: "Выберите шаблон", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await masterCalendarApi.applyTemplate({
        template_id: Number(templateForm.template_id),
        master_id: MASTER_ID,
        weeks: templateForm.weeks,
        start_date: templateForm.start_date || undefined,
      });
      toast({
        title: "Шаблон применён",
        description: `Создано ${result.created} слотов, пропущено ${result.skipped}`,
      });
      setIsTemplateDialogOpen(false);
      setTemplateForm({ template_id: "", weeks: 1, start_date: formatDateISO(getMonday(new Date())) });
      fetchWeekData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось применить шаблон", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBookingAction = async (bookingId: number, action: "confirm" | "cancel" | "complete") => {
    setSaving(true);
    try {
      await masterBookingsApi.updateBooking({ id: bookingId, action });
      const actionLabels: Record<string, string> = {
        confirm: "подтверждена",
        cancel: "отменена",
        complete: "завершена",
      };
      toast({ title: "Готово", description: `Запись ${actionLabels[action]}` });
      fetchWeekData();
      fetchStats();
      if (selectedSlot?.id) {
        const bookings = getBookingsForSlot(selectedSlot.id);
        setSlotBookings(bookings);
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить запись", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    setSaving(true);
    try {
      await masterCalendarApi.deleteBlock(blockId, MASTER_ID);
      toast({ title: "Готово", description: "Блокировка снята" });
      fetchWeekData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось снять блокировку", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplate = useMemo(() => {
    if (!templateForm.template_id) return null;
    return templates.find((t) => t.id === Number(templateForm.template_id)) || null;
  }, [templateForm.template_id, templates]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              <Icon name="Calendar" size={28} className="inline-block mr-2 text-nature-forest" />
              Календарь мастера
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Управление расписанием и записями</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setIsSlotDialogOpen(true)}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white"
            >
              <Icon name="Plus" size={16} />
              <span className="hidden sm:inline">Добавить слот</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(true)}
            >
              <Icon name="Copy" size={16} />
              <span className="hidden sm:inline">Применить шаблон</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsBlockDialogOpen(true)}
            >
              <Icon name="Ban" size={16} />
              <span className="hidden sm:inline">Заблокировать день</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevWeek}>
              <Icon name="ChevronLeft" size={18} />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Сегодня
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <Icon name="ChevronRight" size={18} />
            </Button>
            <span className="ml-2 text-sm font-semibold text-gray-900">
              {formatWeekRange(weekStart)}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "week"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "month"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Месяц
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CalendarCheck" size={16} className="text-nature-forest" />
            <span className="text-xs text-gray-500">Сеансов за месяц</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_sessions ?? "-"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="TrendingUp" size={16} className="text-nature-olive" />
            <span className="text-xs text-gray-500">Занятость</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.occupancy_percent != null ? `${stats.occupancy_percent}%` : "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Clock" size={16} className="text-yellow-600" />
            <span className="text-xs text-gray-500">Ожидают подтверждения</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.upcoming_sessions ?? "-"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Banknote" size={16} className="text-nature-brown" />
            <span className="text-xs text-gray-500">Доход за месяц</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.total_revenue != null ? formatPrice(stats.total_revenue) : "-"}
          </p>
        </div>
      </div>

      {viewMode === "week" ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
                  <div className="p-2 bg-gray-50 border-r border-gray-200" />
                  {weekDays.map((day, idx) => {
                    const blocked = isDayBlocked(day);
                    const today = isToday(day);
                    return (
                      <div
                        key={idx}
                        className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${
                          today ? "bg-nature-forest/5" : "bg-gray-50"
                        } ${blocked ? "opacity-60" : ""}`}
                      >
                        <div className={`text-xs font-medium ${today ? "text-nature-forest" : "text-gray-500"}`}>
                          {DAY_NAMES[idx]}
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            today
                              ? "bg-nature-forest text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                              : "text-gray-900"
                          }`}
                        >
                          {formatDateShort(day)}
                        </div>
                        {blocked && (
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <Icon name="Lock" size={10} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                              {blocked.reason || "Заблокирован"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                  <div className="border-r border-gray-200">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] flex items-start justify-end pr-2 pt-0.5 text-[11px] text-gray-400 border-b border-gray-100"
                      >
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day, dayIdx) => {
                    const daySlots = getSlotsForDay(day);
                    const blocked = isDayBlocked(day);
                    const totalHeight = (HOURS_END - HOURS_START + 1) * PX_PER_HOUR;

                    return (
                      <div
                        key={dayIdx}
                        className="relative border-r border-gray-200 last:border-r-0"
                        style={{ height: `${totalHeight}px` }}
                      >
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-b border-gray-100"
                            style={{ top: `${(hour - HOURS_START) * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
                          />
                        ))}

                        {blocked && (
                          <div className="absolute inset-0 bg-gray-100/60 z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-1 text-gray-400">
                              <Icon name="Lock" size={20} />
                              <span className="text-xs">Заблокирован</span>
                              {blocked.id && (
                                <button
                                  onClick={() => handleDeleteBlock(blocked.id!)}
                                  className="text-[10px] text-red-400 hover:text-red-600 underline mt-1"
                                >
                                  Разблокировать
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {daySlots.map((slot) => {
                          const pos = getSlotPosition(slot);
                          const colors = getSlotColors(slot.status);
                          const bookings = slot.id ? getBookingsForSlot(slot.id) : [];
                          const clientName = bookings.length > 0 ? bookings[0].client_name : null;

                          return (
                            <div
                              key={slot.id || `${slot.datetime_start}`}
                              className={`absolute left-0.5 right-0.5 z-20 rounded border px-1.5 py-0.5 cursor-pointer transition-colors overflow-hidden ${colors}`}
                              style={{ top: pos.top, height: pos.height }}
                              onClick={() => handleSlotClick(slot)}
                            >
                              <div className="text-[11px] font-semibold leading-tight truncate">
                                {formatTime(slot.datetime_start)} - {formatTime(slot.datetime_end)}
                              </div>
                              {slot.service_name && (
                                <div className="text-[10px] leading-tight truncate opacity-80">
                                  {slot.service_name}
                                </div>
                              )}
                              {clientName && (
                                <div className="text-[10px] leading-tight truncate font-medium">
                                  {clientName}
                                </div>
                              )}
                              {slot.booked_count > 0 && (
                                <div className="text-[10px] leading-tight opacity-70">
                                  {slot.booked_count}/{slot.max_clients}
                                </div>
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
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Icon name="Calendar" size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Месячный вид в разработке</p>
          <p className="text-gray-400 text-sm mt-1">Переключитесь на недельный вид для работы с расписанием</p>
        </div>
      )}

      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Plus" size={20} className="text-nature-forest" />
              Добавить слот
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Дата</Label>
              <Input
                type="date"
                value={slotForm.date}
                onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Начало</Label>
                <Input
                  type="time"
                  value={slotForm.time_start}
                  onChange={(e) => setSlotForm({ ...slotForm, time_start: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Конец</Label>
                <Input
                  type="time"
                  value={slotForm.time_end}
                  onChange={(e) => setSlotForm({ ...slotForm, time_end: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Услуга</Label>
              <Select
                value={slotForm.service_id}
                onValueChange={(v) => setSlotForm({ ...slotForm, service_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите услугу" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.duration_minutes} мин, {formatPrice(s.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Макс. участников</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={slotForm.max_clients}
                onChange={(e) => setSlotForm({ ...slotForm, max_clients: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Заметки</Label>
              <Textarea
                value={slotForm.notes}
                onChange={(e) => setSlotForm({ ...slotForm, notes: e.target.value })}
                placeholder="Дополнительная информация..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSlotDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateSlot}
              disabled={saving}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white"
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Ban" size={20} className="text-red-500" />
              Заблокировать дни
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>С</Label>
                <Input
                  type="date"
                  value={blockForm.date_from}
                  onChange={(e) => setBlockForm({ ...blockForm, date_from: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>По</Label>
                <Input
                  type="date"
                  value={blockForm.date_to}
                  onChange={(e) => setBlockForm({ ...blockForm, date_to: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Причина</Label>
              <Input
                value={blockForm.reason}
                onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                placeholder="Отпуск, больничный, ремонт..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Заметки</Label>
              <Textarea
                value={blockForm.notes}
                onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })}
                placeholder="Дополнительная информация..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateBlock}
              disabled={saving}
              variant="destructive"
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Заблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Copy" size={20} className="text-nature-olive" />
              Применить шаблон
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Шаблон</Label>
              <Select
                value={templateForm.template_id}
                onValueChange={(v) => setTemplateForm({ ...templateForm, template_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} {t.rules ? `(${t.rules.length} правил)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Количество недель</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={templateForm.weeks}
                onChange={(e) => setTemplateForm({ ...templateForm, weeks: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Дата начала</Label>
              <Input
                type="date"
                value={templateForm.start_date}
                onChange={(e) => setTemplateForm({ ...templateForm, start_date: e.target.value })}
                className="mt-1"
              />
            </div>
            {selectedTemplate?.rules && selectedTemplate.rules.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-2">Предварительный просмотр:</div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {selectedTemplate.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="font-medium w-6">{DAY_NAMES[rule.day_of_week] || `Д${rule.day_of_week}`}</span>
                      {rule.is_day_off ? (
                        <span className="text-red-500">Выходной</span>
                      ) : (
                        <>
                          <span>{rule.time_start} - {rule.time_end}</span>
                          <span className="text-gray-400">
                            (до {rule.max_clients} чел.)
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Будет создано на {templateForm.weeks} нед. с {templateForm.start_date}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleApplyTemplate}
              disabled={saving || !templateForm.template_id}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white"
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSlotDetailOpen} onOpenChange={setIsSlotDetailOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="CalendarClock" size={20} className="text-nature-forest" />
              Детали слота
            </DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Время</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatTime(selectedSlot.datetime_start)} - {formatTime(selectedSlot.datetime_end)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Дата</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(selectedSlot.datetime_start).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Статус</span>
                  <p className="mt-0.5">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getSlotColors(selectedSlot.status).split(" hover:")[0]}`}
                    >
                      {getStatusLabel(selectedSlot.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Записей</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedSlot.booked_count} / {selectedSlot.max_clients}
                  </p>
                </div>
              </div>

              {selectedSlot.service_name && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <span className="text-xs text-gray-500">Услуга</span>
                  <p className="text-sm font-semibold text-gray-900">{selectedSlot.service_name}</p>
                  {selectedSlot.service_price != null && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatPrice(selectedSlot.service_price)}
                      {selectedSlot.duration_minutes && ` / ${selectedSlot.duration_minutes} мин`}
                    </p>
                  )}
                </div>
              )}

              {selectedSlot.notes && (
                <div>
                  <span className="text-xs text-gray-500">Заметки</span>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedSlot.notes}</p>
                </div>
              )}

              {slotBookings.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500 mb-2 block">
                    Записи ({slotBookings.length})
                  </span>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {slotBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{booking.client_name}</p>
                            <p className="text-xs text-gray-500">{booking.client_phone}</p>
                            {booking.service_name && (
                              <p className="text-xs text-gray-500 mt-0.5">{booking.service_name}</p>
                            )}
                          </div>
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${getBookingStatusColor(booking.status)}`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                        {booking.comment && (
                          <p className="text-xs text-gray-500 mt-1 italic">{booking.comment}</p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          {booking.status === "pending" && booking.id && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-nature-forest hover:bg-nature-forest/90 text-white"
                                onClick={() => handleBookingAction(booking.id!, "confirm")}
                                disabled={saving}
                              >
                                <Icon name="Check" size={12} />
                                Подтвердить
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleBookingAction(booking.id!, "cancel")}
                                disabled={saving}
                              >
                                <Icon name="X" size={12} />
                                Отменить
                              </Button>
                            </>
                          )}
                          {booking.status === "confirmed" && booking.id && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleBookingAction(booking.id!, "complete")}
                              disabled={saving}
                            >
                              <Icon name="CheckCircle" size={12} />
                              Завершить
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedSlot?.id && selectedSlot.status !== "booked" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteSlot(selectedSlot.id!)}
                disabled={saving}
                className="mr-auto"
              >
                {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
                <Icon name="Trash2" size={14} />
                Удалить слот
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsSlotDetailOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterCalendar;
