import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
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
import {
  MASTER_ID,
  HOURS_START,
  HOURS_END,
  formatDateISO,
  formatWeekRange,
  formatPrice,
  getMonday,
} from "./calendar/calendarUtils";
import type { ViewMode, SlotFormData, BlockFormData, TemplateFormData } from "./calendar/calendarUtils";
import CalendarWeekGrid from "./calendar/CalendarWeekGrid";
import { SlotCreateDialog, BlockCreateDialog, TemplateApplyDialog } from "./calendar/CalendarDialogs";
import SlotDetailDialog from "./calendar/SlotDetailDialog";

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
        <CalendarWeekGrid
          weekDays={weekDays}
          hours={hours}
          loading={loading}
          getSlotsForDay={getSlotsForDay}
          getBookingsForSlot={getBookingsForSlot}
          isDayBlocked={isDayBlocked}
          onSlotClick={handleSlotClick}
          onDeleteBlock={handleDeleteBlock}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Icon name="Calendar" size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Месячный вид в разработке</p>
          <p className="text-gray-400 text-sm mt-1">Переключитесь на недельный вид для работы с расписанием</p>
        </div>
      )}

      <SlotCreateDialog
        open={isSlotDialogOpen}
        onOpenChange={setIsSlotDialogOpen}
        form={slotForm}
        onFormChange={setSlotForm}
        services={services}
        saving={saving}
        onSave={handleCreateSlot}
      />

      <BlockCreateDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        form={blockForm}
        onFormChange={setBlockForm}
        saving={saving}
        onSave={handleCreateBlock}
      />

      <TemplateApplyDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        form={templateForm}
        onFormChange={setTemplateForm}
        templates={templates}
        selectedTemplate={selectedTemplate}
        saving={saving}
        onApply={handleApplyTemplate}
      />

      <SlotDetailDialog
        open={isSlotDetailOpen}
        onOpenChange={setIsSlotDetailOpen}
        slot={selectedSlot}
        bookings={slotBookings}
        saving={saving}
        onBookingAction={handleBookingAction}
        onDeleteSlot={handleDeleteSlot}
      />
    </div>
  );
};

export default MasterCalendar;
