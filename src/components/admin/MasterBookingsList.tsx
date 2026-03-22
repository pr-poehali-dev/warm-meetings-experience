import { useState, useEffect } from "react";
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
import { masterBookingsApi, masterCalendarApi } from "@/lib/master-calendar-api";
import type { MasterBooking, MasterService, BookingStats } from "@/lib/master-calendar-api";

const MASTER_ID = 1;

interface BookingFormData {
  client_name: string;
  client_phone: string;
  client_email: string;
  service_id: string;
  date: string;
  time_start: string;
  time_end: string;
  price: string;
  comment: string;
}

const emptyForm: BookingFormData = {
  client_name: "",
  client_phone: "",
  client_email: "",
  service_id: "",
  date: "",
  time_start: "10:00",
  time_end: "11:00",
  price: "",
  comment: "",
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    canceled: "bg-red-100 text-red-800",
    completed: "bg-gray-100 text-gray-800",
    no_show: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Ожидает",
    confirmed: "Подтверждена",
    canceled: "Отменена",
    completed: "Завершена",
    no_show: "Неявка",
  };
  return labels[status] || status;
};

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

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
        <>
          <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Услуга</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата/время</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">#{booking.id}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium">{booking.client_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{booking.client_phone}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{booking.service_name || "-"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDateTime(booking.datetime_start)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                        {formatPrice(booking.price)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openDetail(booking)}
                            className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100 transition-colors"
                          >
                            <Icon name="Eye" size={16} />
                          </button>
                          {booking.status === "pending" && booking.id && (
                            <>
                              <button
                                onClick={() => handleAction(booking.id!, "confirm")}
                                className="p-1.5 text-green-600 hover:text-green-800 rounded hover:bg-green-50 transition-colors"
                                disabled={saving}
                              >
                                <Icon name="Check" size={16} />
                              </button>
                              <button
                                onClick={() => handleAction(booking.id!, "cancel")}
                                className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                                disabled={saving}
                              >
                                <Icon name="X" size={16} />
                              </button>
                            </>
                          )}
                          {booking.status === "confirmed" && booking.id && (
                            <>
                              <button
                                onClick={() => handleAction(booking.id!, "complete")}
                                className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 transition-colors"
                                disabled={saving}
                              >
                                <Icon name="CheckCircle" size={16} />
                              </button>
                              <button
                                onClick={() => handleAction(booking.id!, "cancel")}
                                className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                                disabled={saving}
                              >
                                <Icon name="X" size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:hidden space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Запись #{booking.id}</p>
                    <p className="font-semibold text-gray-900 mt-1">{booking.client_name}</p>
                    <p className="text-sm text-gray-600">{booking.client_phone}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>
                <div className="space-y-2 mb-3">
                  {booking.service_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Услуга:</span>
                      <span className="text-gray-900">{booking.service_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Дата:</span>
                    <span className="text-gray-900">{formatDateTime(booking.datetime_start)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Цена:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(booking.price)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetail(booking)}
                    className="flex-1"
                  >
                    <Icon name="Eye" size={14} className="mr-1" />
                    Детали
                  </Button>
                  {booking.status === "pending" && booking.id && (
                    <>
                      <Button
                        size="sm"
                        className="bg-nature-forest hover:bg-nature-forest/90 text-white"
                        onClick={() => handleAction(booking.id!, "confirm")}
                        disabled={saving}
                      >
                        <Icon name="Check" size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleAction(booking.id!, "cancel")}
                        disabled={saving}
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    </>
                  )}
                  {booking.status === "confirmed" && booking.id && (
                    <>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleAction(booking.id!, "complete")}
                        disabled={saving}
                      >
                        <Icon name="CheckCircle" size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleAction(booking.id!, "cancel")}
                        disabled={saving}
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="FileText" size={20} className="text-nature-forest" />
              Запись #{selectedBooking?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Клиент</span>
                  <p className="text-sm font-semibold text-gray-900">{selectedBooking.client_name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Телефон</span>
                  <p className="text-sm font-semibold text-gray-900">{selectedBooking.client_phone}</p>
                </div>
                {selectedBooking.client_email && (
                  <div>
                    <span className="text-xs text-gray-500">Email</span>
                    <p className="text-sm font-semibold text-gray-900">{selectedBooking.client_email}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500">Статус</span>
                  <p className="mt-0.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedBooking.status)}`}>
                      {getStatusLabel(selectedBooking.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Начало</span>
                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(selectedBooking.datetime_start)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Окончание</span>
                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(selectedBooking.datetime_end)}</p>
                  </div>
                  {selectedBooking.service_name && (
                    <div>
                      <span className="text-xs text-gray-500">Услуга</span>
                      <p className="text-sm font-semibold text-gray-900">{selectedBooking.service_name}</p>
                    </div>
                  )}
                  {selectedBooking.duration_minutes && (
                    <div>
                      <span className="text-xs text-gray-500">Длительность</span>
                      <p className="text-sm font-semibold text-gray-900">{selectedBooking.duration_minutes} мин</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-sm text-gray-500">Стоимость</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(selectedBooking.price)}</span>
              </div>

              {selectedBooking.comment && (
                <div>
                  <span className="text-xs text-gray-500">Комментарий</span>
                  <p className="text-sm text-gray-700 mt-0.5 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {selectedBooking.comment}
                  </p>
                </div>
              )}

              {selectedBooking.cancel_reason && (
                <div>
                  <span className="text-xs text-red-500">Причина отмены</span>
                  <p className="text-sm text-red-700 mt-0.5 bg-red-50 rounded-lg p-3 border border-red-200">
                    {selectedBooking.cancel_reason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 border-t border-gray-200 pt-3">
                {selectedBooking.created_at && (
                  <div>Создана: {formatDateTime(selectedBooking.created_at)}</div>
                )}
                {selectedBooking.confirmed_at && (
                  <div>Подтверждена: {formatDateTime(selectedBooking.confirmed_at)}</div>
                )}
                {selectedBooking.completed_at && (
                  <div>Завершена: {formatDateTime(selectedBooking.completed_at)}</div>
                )}
                {selectedBooking.canceled_at && (
                  <div>Отменена: {formatDateTime(selectedBooking.canceled_at)}</div>
                )}
                {selectedBooking.source && (
                  <div>Источник: {selectedBooking.source}</div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex w-full gap-2 flex-wrap">
              {selectedBooking?.status === "pending" && selectedBooking.id && (
                <>
                  <Button
                    size="sm"
                    className="bg-nature-forest hover:bg-nature-forest/90 text-white"
                    onClick={() => handleAction(selectedBooking.id!, "confirm")}
                    disabled={saving}
                  >
                    {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
                    <Icon name="Check" size={14} />
                    Подтвердить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleAction(selectedBooking.id!, "cancel")}
                    disabled={saving}
                  >
                    <Icon name="X" size={14} />
                    Отменить
                  </Button>
                </>
              )}
              {selectedBooking?.status === "confirmed" && selectedBooking.id && (
                <>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleAction(selectedBooking.id!, "complete")}
                    disabled={saving}
                  >
                    {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
                    <Icon name="CheckCircle" size={14} />
                    Завершить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleAction(selectedBooking.id!, "cancel")}
                    disabled={saving}
                  >
                    <Icon name="X" size={14} />
                    Отменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => handleAction(selectedBooking.id!, "no_show")}
                    disabled={saving}
                  >
                    <Icon name="UserX" size={14} />
                    Неявка
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="ml-auto"
              >
                Закрыть
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Plus" size={20} className="text-nature-forest" />
              Новая запись
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label>Имя клиента <span className="text-red-500">*</span></Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Иван Иванов"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Телефон <span className="text-red-500">*</span></Label>
                <Input
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.client_email}
                onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Услуга</Label>
              <Select value={form.service_id} onValueChange={handleServiceChange}>
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
              <Label>Дата <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Начало <span className="text-red-500">*</span></Label>
                <Input
                  type="time"
                  value={form.time_start}
                  onChange={(e) => setForm({ ...form, time_start: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Конец <span className="text-red-500">*</span></Label>
                <Input
                  type="time"
                  value={form.time_end}
                  onChange={(e) => setForm({ ...form, time_end: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Цена (\u20BD)</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Комментарий</Label>
              <Textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Дополнительная информация..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white"
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterBookingsList;
