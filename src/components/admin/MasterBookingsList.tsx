import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { masterBookingsApi, masterCalendarApi } from "@/lib/master-calendar-api";
import type { MasterBooking, MasterService, BookingStats } from "@/lib/master-calendar-api";
import { emptyForm } from "./bookings/bookingUtils";
import type { BookingFormData } from "./bookings/bookingUtils";
import BookingsTable from "./bookings/BookingsTable";
import BookingDetailDialog from "./bookings/BookingDetailDialog";
import BookingCreateDialog from "./bookings/BookingCreateDialog";

const MASTER_ID = 1;

const MasterBookingsList = () => {
  const [bookings, setBookings] = useState<MasterBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [services, setServices] = useState<MasterService[]>([]);

  const [selectedBooking, setSelectedBooking] = useState<MasterBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<BookingFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
    fetchStats();
    fetchServices();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus === "all" ? undefined : filterStatus;
      const data = await masterBookingsApi.getBookings(MASTER_ID, statusParam);
      setBookings(data);
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить записи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await masterBookingsApi.getStats(MASTER_ID);
      setStats(data);
    } catch {
      // non-critical
    }
  };

  const fetchServices = async () => {
    try {
      const data = await masterCalendarApi.getServices(MASTER_ID);
      setServices(data);
    } catch {
      // non-critical
    }
  };

  const handleAction = async (id: number, action: "confirm" | "cancel" | "complete" | "no_show") => {
    setSaving(true);
    try {
      await masterBookingsApi.updateBooking({ id, action });
      const actionLabels: Record<string, string> = {
        confirm: "подтверждена",
        cancel: "отменена",
        complete: "завершена",
        no_show: "отмечена как неявка",
      };
      toast({ title: "Готово", description: `Запись ${actionLabels[action]}` });
      fetchBookings();
      fetchStats();
      setIsDetailOpen(false);
      setSelectedBooking(null);
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить запись",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.client_name || !form.client_phone || !form.date || !form.time_start || !form.time_end) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await masterBookingsApi.createBooking({
        master_id: MASTER_ID,
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email || undefined,
        service_id: form.service_id ? Number(form.service_id) : undefined,
        datetime_start: `${form.date}T${form.time_start}:00`,
        datetime_end: `${form.date}T${form.time_end}:00`,
        price: form.price ? Number(form.price) : 0,
        status: "pending",
        comment: form.comment || undefined,
      });
      toast({ title: "Готово", description: "Запись успешно создана" });
      setIsCreateOpen(false);
      setForm({ ...emptyForm });
      fetchBookings();
      fetchStats();
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось создать запись",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    setForm((prev) => {
      const svc = services.find((s) => String(s.id) === serviceId);
      if (!svc) return { ...prev, service_id: serviceId };
      const price = String(svc.price);
      let time_end = prev.time_end;
      if (prev.time_start && svc.duration_minutes) {
        const [h, m] = prev.time_start.split(":").map(Number);
        const totalMin = h * 60 + m + svc.duration_minutes;
        const endH = Math.floor(totalMin / 60).toString().padStart(2, "0");
        const endM = (totalMin % 60).toString().padStart(2, "0");
        time_end = `${endH}:${endM}`;
      }
      return { ...prev, service_id: serviceId, price, time_end };
    });
  };

  const openDetail = (booking: MasterBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const canceledCount = bookings.filter((b) => b.status === "canceled").length;

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Записи клиентов</h1>
            <p className="text-gray-500 mt-1 text-sm">Управление записями и бронированиями</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
                setIsCreateOpen(true);
              }}
              size="sm"
              className="bg-nature-forest hover:bg-nature-forest/90 text-white lg:hidden"
            >
              <Icon name="Plus" size={16} />
            </Button>
            <Button
              onClick={() => {
                setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
                setIsCreateOpen(true);
              }}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white hidden lg:flex"
            >
              <Icon name="Plus" size={18} className="mr-2" />
              Новая запись
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Фильтр по статусу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все записи</SelectItem>
              <SelectItem value="pending">Ожидают</SelectItem>
              <SelectItem value="confirmed">Подтверждены</SelectItem>
              <SelectItem value="canceled">Отменены</SelectItem>
              <SelectItem value="completed">Завершены</SelectItem>
              <SelectItem value="no_show">Неявки</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CalendarCheck" size={16} className="text-nature-forest" />
            <span className="text-xs text-gray-500">Всего записей</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_sessions ?? bookings.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CheckCircle" size={16} className="text-green-600" />
            <span className="text-xs text-gray-500">Подтверждённых</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Clock" size={16} className="text-yellow-600" />
            <span className="text-xs text-gray-500">Ожидают</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="XCircle" size={16} className="text-red-500" />
            <span className="text-xs text-gray-500">Отменённых</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{canceledCount}</p>
        </div>
      </div>

      {loading && !bookings.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Icon name="Calendar" size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Записей пока нет</p>
          <p className="text-gray-400 text-sm mt-1">Создайте первую запись, нажав кнопку выше</p>
        </div>
      ) : (
        <BookingsTable
          bookings={bookings}
          saving={saving}
          onAction={handleAction}
          onOpenDetail={openDetail}
        />
      )}

      <BookingDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        booking={selectedBooking}
        saving={saving}
        onAction={handleAction}
      />

      <BookingCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        form={form}
        onFormChange={setForm}
        services={services}
        saving={saving}
        onServiceChange={handleServiceChange}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default MasterBookingsList;
