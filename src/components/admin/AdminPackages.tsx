import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const API_URL = "https://functions.poehali.dev/0c83af59-23b2-45d2-b91c-4948f162ee87";

interface Package {
  id?: number;
  name: string;
  description: string;
  base_price: string;
  duration_hours: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminPackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Package>({
    name: "",
    description: "",
    base_price: "",
    duration_hours: 2,
    is_active: true,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=packages`);
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пакеты",
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
      const method = editingPackage ? "PUT" : "POST";
      const body = editingPackage
        ? { ...formData, id: editingPackage.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=packages`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save package");

      toast({
        title: "Успешно!",
        description: editingPackage ? "Пакет обновлен" : "Пакет создан",
      });

      setIsDialogOpen(false);
      setEditingPackage(null);
      setFormData({
        name: "",
        description: "",
        base_price: "",
        duration_hours: 2,
        is_active: true,
      });
      fetchPackages();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить пакет",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData(pkg);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот пакет?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=packages&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete package");

      toast({
        title: "Успешно!",
        description: "Пакет удален",
      });

      fetchPackages();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пакет",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (pkg: Package) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=packages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pkg,
          is_active: !pkg.is_active,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Успешно!",
        description: pkg.is_active ? "Пакет отключен" : "Пакет активирован",
      });

      fetchPackages();
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Пакеты услуг</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление базовыми пакетами</p>
        </div>
        <Button
          onClick={() => {
            setEditingPackage(null);
            setFormData({
              name: "",
              description: "",
              base_price: "",
              duration_hours: 2,
              is_active: true,
            });
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить пакет
        </Button>
      </div>

      {loading && !packages.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pkg)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icon name="Pencil" size={18} />
                  </button>
                  <button
                    onClick={() => pkg.id && handleDelete(pkg.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Icon name="Trash2" size={18} />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Цена:</span>
                  <span className="font-semibold">{Number(pkg.base_price).toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Длительность:</span>
                  <span className="font-semibold">{pkg.duration_hours} ч</span>
                </div>
              </div>

              <button
                onClick={() => toggleActive(pkg)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  pkg.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {pkg.is_active ? "Активен" : "Неактивен"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Редактировать пакет" : "Новый пакет"}
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
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_price">Цена (₽)</Label>
                <Input
                  id="base_price"
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration_hours">Часов</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  min="1"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: Number(e.target.value) })}
                  required
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

export default AdminPackages;