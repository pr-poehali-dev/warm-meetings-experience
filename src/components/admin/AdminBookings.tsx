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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_URL = "https://functions.poehali.dev/0d9ea640-f2f5-4e63-8633-db26b10decc8";

interface Booking {
  id?: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  event_date: string;
  package_id?: number;
  selected_addons?: any[];
  service_area_id?: number;
  total_price: string;
  promo_code?: string;
  discount_amount?: string;
  base_price?: string;
  calculation_details?: any;
  status: string;
  consent_given?: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=bookings`);
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заявки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setLoading(true);
    try {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return;

      const response = await fetch(`${API_URL}?resource=bookings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "Успешно!",
        description: "Статус заявки обновлен",
      });

      fetchBookings();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await fetch(`${API_URL}?resource=bookings&export=csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Успешно!",
        description: "Заявки экспортированы в CSV",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать заявки",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "Новая",
      confirmed: "Подтверждена",
      cancelled: "Отменена",
      completed: "Завершена",
    };
    return labels[status] || status;
  };

  const filteredBookings = filterStatus === "all"
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заявки</h1>
          <p className="text-gray-500 mt-1">Управление заявками клиентов</p>
        </div>
        <div className="flex gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Фильтр по статусу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все заявки</SelectItem>
              <SelectItem value="new">Новые</SelectItem>
              <SelectItem value="confirmed">Подтверждены</SelectItem>
              <SelectItem value="cancelled">Отменены</SelectItem>
              <SelectItem value="completed">Завершены</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Icon name="Download" size={18} className="mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {loading && !bookings.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">#{booking.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{booking.client_phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(booking.event_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {Number(booking.total_price).toLocaleString()} ₽
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsDetailOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Icon name="Eye" size={18} />
                        </button>
                        <Select
                          value={booking.status}
                          onValueChange={(status) => booking.id && updateStatus(booking.id, status)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Новая</SelectItem>
                            <SelectItem value="confirmed">Подтверждена</SelectItem>
                            <SelectItem value="cancelled">Отменена</SelectItem>
                            <SelectItem value="completed">Завершена</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Заявка #{selectedBooking?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Клиент</p>
                  <p className="font-semibold">{selectedBooking.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Телефон</p>
                  <p className="font-semibold">{selectedBooking.client_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold">{selectedBooking.client_email || 'не указан'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Дата мероприятия</p>
                  <p className="font-semibold">
                    {new Date(selectedBooking.event_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>

              {selectedBooking.package_id && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Пакет</p>
                  <p className="font-semibold">Пакет #{selectedBooking.package_id}</p>
                </div>
              )}

              {selectedBooking.selected_addons && selectedBooking.selected_addons.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Дополнения</p>
                  <p className="text-gray-700">{selectedBooking.selected_addons.length} выбрано</p>
                </div>
              )}

              {selectedBooking.service_area_id && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Зона обслуживания</p>
                  <p className="font-semibold">Зона #{selectedBooking.service_area_id}</p>
                </div>
              )}

              {selectedBooking.promo_code && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Промо-код</p>
                  <p className="font-semibold">{selectedBooking.promo_code}</p>
                  {selectedBooking.discount_amount && (
                    <p className="text-sm text-green-600">
                      Скидка: {Number(selectedBooking.discount_amount).toLocaleString()} ₽
                    </p>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Итоговая сумма</p>
                <p className="text-2xl font-bold">{Number(selectedBooking.total_price).toLocaleString()} ₽</p>
                {selectedBooking.base_price && (
                  <p className="text-sm text-gray-500">Базовая цена: {Number(selectedBooking.base_price).toLocaleString()} ₽</p>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">Статус</p>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedBooking.status)}`}>
                  {getStatusLabel(selectedBooking.status)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookings;