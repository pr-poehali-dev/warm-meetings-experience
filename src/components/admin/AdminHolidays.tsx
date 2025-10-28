import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const API_URL = "https://functions.poehali.dev/0c83af59-23b2-45d2-b91c-4948f162ee87";

interface Holiday {
  id?: number;
  holiday_date: string;
  name: string;
  multiplier: string;
  created_at?: string;
  updated_at?: string;
}

const AdminHolidays = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Holiday>({
    holiday_date: "",
    name: "",
    multiplier: "1.5",
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=holidays`);
      const data = await response.json();
      setHolidays(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить праздники",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingHoliday ? "PUT" : "POST";
      const body = editingHoliday
        ? { ...formData, id: editingHoliday.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=holidays`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save holiday");

      toast({
        title: "Успешно!",
        description: editingHoliday ? "Праздник обновлен" : "Праздник создан",
      });

      setIsDialogOpen(false);
      setEditingHoliday(null);
      setFormData({
        holiday_date: "",
        name: "",
        multiplier: "1.5",
      });
      fetchHolidays();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить праздник",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData(holiday);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот праздник?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=holidays&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete holiday");

      toast({
        title: "Успешно!",
        description: "Праздник удален",
      });

      fetchHolidays();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить праздник",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Праздничный календарь</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление праздничными днями и коэффициентами</p>
        </div>
        <Button
          onClick={() => {
            setEditingHoliday(null);
            setFormData({
              holiday_date: "",
              name: "",
              multiplier: "1.5",
            });
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить праздник
        </Button>
      </div>

      {loading && !holidays.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <>
          <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Коэффициент
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(holiday.holiday_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {holiday.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {(Number(holiday.multiplier) * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Icon name="Pencil" size={18} />
                        </button>
                        <button
                          onClick={() => holiday.id && handleDelete(holiday.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Icon name="Trash2" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {holidays.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Нет праздников в календаре
              </div>
            )}
          </div>

          <div className="lg:hidden space-y-3">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{holiday.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(holiday.holiday_date)}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {(Number(holiday.multiplier) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(holiday)}
                    className="flex-1"
                  >
                    <Icon name="Pencil" size={16} className="mr-2" />
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => holiday.id && handleDelete(holiday.id)}
                    className="text-red-600 hover:text-red-700 border-red-200"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
            ))}
            {holidays.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Нет праздников в календаре
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Редактировать праздник" : "Новый праздник"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="holiday_date">Дата праздника</Label>
              <Input
                id="holiday_date"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Новый год, 8 марта и т.д."
                required
              />
            </div>

            <div>
              <Label htmlFor="multiplier">Коэффициент</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.01"
                min="0"
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                1.0 = 100%, 1.5 = 150%, 2.0 = 200%
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHolidays;