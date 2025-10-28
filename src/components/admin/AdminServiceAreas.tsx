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

interface ServiceArea {
  id?: number;
  name: string;
  multiplier: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminServiceAreas = () => {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceArea, setEditingServiceArea] = useState<ServiceArea | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<ServiceArea>({
    name: "",
    multiplier: "1.0",
    is_active: true,
  });

  useEffect(() => {
    fetchServiceAreas();
  }, []);

  const fetchServiceAreas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=service-areas`);
      const data = await response.json();
      setServiceAreas(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить зоны обслуживания",
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
      const method = editingServiceArea ? "PUT" : "POST";
      const body = editingServiceArea
        ? { ...formData, id: editingServiceArea.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=service-areas`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save service area");

      toast({
        title: "Успешно!",
        description: editingServiceArea ? "Зона обновлена" : "Зона создана",
      });

      setIsDialogOpen(false);
      setEditingServiceArea(null);
      setFormData({
        name: "",
        multiplier: "1.0",
        is_active: true,
      });
      fetchServiceAreas();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить зону",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (serviceArea: ServiceArea) => {
    setEditingServiceArea(serviceArea);
    setFormData(serviceArea);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту зону обслуживания?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=service-areas&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete service area");

      toast({
        title: "Успешно!",
        description: "Зона удалена",
      });

      fetchServiceAreas();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить зону",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (serviceArea: ServiceArea) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=service-areas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...serviceArea,
          is_active: !serviceArea.is_active,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Успешно!",
        description: serviceArea.is_active ? "Зона отключена" : "Зона активирована",
      });

      fetchServiceAreas();
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Зоны обслуживания</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление зонами и их коэффициентами</p>
        </div>
        <Button
          onClick={() => {
            setEditingServiceArea(null);
            setFormData({
              name: "",
              multiplier: "1.0",
              is_active: true,
            });
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить зону
        </Button>
      </div>

      {loading && !serviceAreas.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceAreas.map((area) => (
            <div
              key={area.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(area)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icon name="Pencil" size={18} />
                  </button>
                  <button
                    onClick={() => area.id && handleDelete(area.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Icon name="Trash2" size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 text-sm">Коэффициент:</span>
                <span className="text-lg font-semibold">
                  {(Number(area.multiplier) * 100).toFixed(0)}%
                </span>
              </div>

              <button
                onClick={() => toggleActive(area)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  area.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {area.is_active ? "Активна" : "Неактивна"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingServiceArea ? "Редактировать зону" : "Новая зона"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Название зоны</Label>
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

export default AdminServiceAreas;