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

interface Setting {
  id?: number;
  setting_key: string;
  setting_value: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Setting>({
    setting_key: "",
    setting_value: "",
    description: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=settings`);
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки",
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
      const method = editingSetting ? "PUT" : "POST";
      const body = editingSetting
        ? { ...formData, id: editingSetting.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=settings`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save setting");

      toast({
        title: "Успешно!",
        description: editingSetting ? "Настройка обновлена" : "Настройка создана",
      });

      setIsDialogOpen(false);
      setEditingSetting(null);
      setFormData({
        setting_key: "",
        setting_value: "",
        description: "",
      });
      fetchSettings();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройку",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: Setting) => {
    setEditingSetting(setting);
    setFormData(setting);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту настройку?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=settings&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete setting");

      toast({
        title: "Успешно!",
        description: "Настройка удалена",
      });

      fetchSettings();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить настройку",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки прайса</h1>
          <p className="text-gray-500 mt-1">Глобальные параметры системы расчета цен</p>
        </div>
        <Button
          onClick={() => {
            setEditingSetting(null);
            setFormData({
              setting_key: "",
              setting_value: "",
              description: "",
            });
            setIsDialogOpen(true);
          }}
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить настройку
        </Button>
      </div>

      {loading && !settings.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 font-mono">
                      {setting.setting_key}
                    </h3>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">
                      {setting.setting_value}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{setting.description}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(setting)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icon name="Pencil" size={18} />
                  </button>
                  <button
                    onClick={() => setting.id && handleDelete(setting.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Icon name="Trash2" size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {settings.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
              Нет настроек
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? "Редактировать настройку" : "Новая настройка"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="setting_key">Ключ настройки</Label>
              <Input
                id="setting_key"
                value={formData.setting_key}
                onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                placeholder="min_order_amount"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Используйте snake_case для названия ключа
              </p>
            </div>

            <div>
              <Label htmlFor="setting_value">Значение</Label>
              <Input
                id="setting_value"
                value={formData.setting_value}
                onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
                placeholder="5000"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Минимальная сумма заказа в рублях"
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

export default AdminSettings;
