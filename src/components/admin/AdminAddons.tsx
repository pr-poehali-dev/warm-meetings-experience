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

interface Addon {
  id?: number;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminAddons = () => {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Addon>({
    name: "",
    description: "",
    price: "",
    is_active: true,
  });

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=addons`);
      const data = await response.json();
      setAddons(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить дополнения",
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
      const method = editingAddon ? "PUT" : "POST";
      const body = editingAddon
        ? { ...formData, id: editingAddon.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=addons`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save addon");

      toast({
        title: "Успешно!",
        description: editingAddon ? "Дополнение обновлено" : "Дополнение создано",
      });

      setIsDialogOpen(false);
      setEditingAddon(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        is_active: true,
      });
      fetchAddons();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить дополнение",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setFormData(addon);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить это дополнение?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=addons&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete addon");

      toast({
        title: "Успешно!",
        description: "Дополнение удалено",
      });

      fetchAddons();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить дополнение",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (addon: Addon) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=addons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addon,
          is_active: !addon.is_active,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Успешно!",
        description: addon.is_active ? "Дополнение отключено" : "Дополнение активировано",
      });

      fetchAddons();
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Дополнительные услуги</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление дополнениями к пакетам</p>
        </div>
        <Button
          onClick={() => {
            setEditingAddon(null);
            setFormData({
              name: "",
              description: "",
              price: "",
              is_active: true,
            });
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить услугу
        </Button>
      </div>

      {loading && !addons.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{addon.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(addon)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icon name="Pencil" size={18} />
                  </button>
                  <button
                    onClick={() => addon.id && handleDelete(addon.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Icon name="Trash2" size={18} />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{addon.description}</p>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 text-sm">Цена:</span>
                <span className="text-lg font-semibold">{Number(addon.price).toLocaleString()} ₽</span>
              </div>

              <button
                onClick={() => toggleActive(addon)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  addon.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {addon.is_active ? "Активна" : "Неактивна"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddon ? "Редактировать услугу" : "Новая услуга"}
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

            <div>
              <Label htmlFor="price">Цена (₽)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
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

export default AdminAddons;