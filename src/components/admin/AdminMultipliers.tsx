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

interface Multiplier {
  id?: number;
  name: string;
  multiplier: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminMultipliers = () => {
  const [multipliers, setMultipliers] = useState<Multiplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState<Multiplier | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Multiplier>({
    name: "",
    multiplier: "1.0",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  useEffect(() => {
    fetchMultipliers();
  }, []);

  const fetchMultipliers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=multipliers`);
      const data = await response.json();
      setMultipliers(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить мультипликаторы",
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
      const method = editingMultiplier ? "PUT" : "POST";
      const body = editingMultiplier
        ? { ...formData, id: editingMultiplier.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=multipliers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save multiplier");

      toast({
        title: "Успешно!",
        description: editingMultiplier ? "Мультипликатор обновлен" : "Мультипликатор создан",
      });

      setIsDialogOpen(false);
      setEditingMultiplier(null);
      setFormData({
        name: "",
        multiplier: "1.0",
        start_date: "",
        end_date: "",
        is_active: true,
      });
      fetchMultipliers();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить мультипликатор",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (multiplier: Multiplier) => {
    setEditingMultiplier(multiplier);
    setFormData(multiplier);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот мультипликатор?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=multipliers&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete multiplier");

      toast({
        title: "Успешно!",
        description: "Мультипликатор удален",
      });

      fetchMultipliers();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить мультипликатор",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (multiplier: Multiplier) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=multipliers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...multiplier,
          is_active: !multiplier.is_active,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Успешно!",
        description: multiplier.is_active ? "Мультипликатор отключен" : "Мультипликатор активирован",
      });

      fetchMultipliers();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Мультипликаторы цен</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление сезонными и временными коэффициентами</p>
        </div>
        <Button
          onClick={() => {
            setEditingMultiplier(null);
            setFormData({
              name: "",
              multiplier: "1.0",
              start_date: "",
              end_date: "",
              is_active: true,
            });
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить мультипликатор
        </Button>
      </div>

      {loading && !multipliers.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {multipliers.map((mult) => (
            <div
              key={mult.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{mult.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(mult)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icon name="Pencil" size={18} />
                  </button>
                  <button
                    onClick={() => mult.id && handleDelete(mult.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Icon name="Trash2" size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Коэффициент:</span>
                  <span className="font-semibold">
                    {(Number(mult.multiplier) * 100).toFixed(0)}%
                  </span>
                </div>
                {mult.start_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Период:</span>
                    <span className="font-medium">
                      {formatDate(mult.start_date)} - {formatDate(mult.end_date)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleActive(mult)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  mult.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {mult.is_active ? "Активен" : "Неактивен"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMultiplier ? "Редактировать мультипликатор" : "Новый мультипликатор"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                1.0 = 100%, 1.5 = 150%, 0.8 = 80%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Дата начала</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="end_date">Дата окончания</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
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

export default AdminMultipliers;