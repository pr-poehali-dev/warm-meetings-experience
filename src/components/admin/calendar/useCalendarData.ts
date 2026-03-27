import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
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
  getMonday,
} from "./calendarUtils";
import type { ViewMode, SlotFormData, BlockFormData, TemplateFormData } from "./calendarUtils";

export const useCalendarData = () => {
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

  return {
    viewMode,
    setViewMode,
    weekStart,
    loading,
    weekDays,
    hours,
    stats,
    services,
    templates,
    selectedTemplate,

    isSlotDialogOpen,
    setIsSlotDialogOpen,
    isBlockDialogOpen,
    setIsBlockDialogOpen,
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    isSlotDetailOpen,
    setIsSlotDetailOpen,

    selectedSlot,
    slotBookings,

    slotForm,
    setSlotForm,
    blockForm,
    setBlockForm,
    templateForm,
    setTemplateForm,

    saving,

    goToPrevWeek,
    goToNextWeek,
    goToToday,

    getSlotsForDay,
    getBookingsForSlot,
    isDayBlocked,

    handleSlotClick,
    handleCreateSlot,
    handleDeleteSlot,
    handleCreateBlock,
    handleApplyTemplate,
    handleBookingAction,
    handleDeleteBlock,
  };
};
