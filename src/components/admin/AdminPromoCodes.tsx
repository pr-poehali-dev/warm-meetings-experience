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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL = "https://functions.poehali.dev/0c83af59-23b2-45d2-b91c-4948f162ee87";

interface PromoCode {
  id?: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  valid_from: string;
  valid_until: string;
  usage_limit: string;
  used_count: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminPromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<PromoCode>({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    valid_from: "",
    valid_until: "",
    usage_limit: "",
    used_count: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=promo-codes`);
      const data = await response.json();
      setPromoCodes(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить промо-коды",
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
      const method = editingPromoCode ? "PUT" : "POST";
      const body = editingPromoCode
        ? { ...formData, id: editingPromoCode.id, code: formData.code.toUpperCase() }
        : { ...formData, code: formData.code.toUpperCase() };

      const response = await fetch(`${API_URL}?resource=promo-codes`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save promo code");

      toast({
        title: "Успешно!",
        description: editingPromoCode ? "Промо-код обновлен" : "Промо-код создан",
      });

      setIsDialogOpen(false);
      setEditingPromoCode(null);
      setFormData({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        valid_from: "",
        valid_until: "",
        usage_limit: "",
        used_count: 0,
        is_active: true,
      });
      fetchPromoCodes();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить промо-код",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    setFormData(promoCode);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот промо-код?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=promo-codes&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete promo code");

      toast({
        title: "Успешно!",
        description: "Промо-код удален",
      });

      fetchPromoCodes();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить промо-код",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (promoCode: PromoCode) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=promo-codes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...promoCode,
          is_active: !promoCode.is_active,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Успешно!",
        description: promoCode.is_active ? "Промо-код отключен" : "Промо-код активирован",
      });

      fetchPromoCodes();
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

  const formatDiscount = (type: string, value: string) => {
    return type === "percentage" ? `${value}%` : `${Number(value).toLocaleString()} ₽`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Промо-коды</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление промо-кодами и скидками</p>
        </div>
        <Button
          onClick={() => {
            setEditingPromoCode(null);
            setFormData({
              code: "",
              discount_type: "percentage",
              discount_value: "",
              valid_from: "",
              valid_until: "",
              usage_limit: "",
              used_count: 0,
              is_active: true,
            });
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить промо-код
        </Button>
      </div>

      {loading && !promoCodes.length ? (
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
                    Код
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Скидка
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Период действия
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Использования
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promoCodes.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                      {promo.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {formatDiscount(promo.discount_type, promo.discount_value)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(promo.valid_from)} - {formatDate(promo.valid_until)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {promo.used_count} / {promo.usage_limit || "∞"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleActive(promo)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          promo.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {promo.is_active ? "Активен" : "Неактивен"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Icon name="Pencil" size={18} />
                        </button>
                        <button
                          onClick={() => promo.id && handleDelete(promo.id)}
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
            {promoCodes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Нет промо-кодов
              </div>
            )}
          </div>

          <div className="lg:hidden space-y-3">
            {promoCodes.map((promo) => (
              <div key={promo.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono font-bold text-gray-900 text-lg">{promo.code}</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                      {formatDiscount(promo.discount_type, promo.discount_value)}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleActive(promo)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      promo.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {promo.is_active ? "Активен" : "Неактивен"}
                  </button>
                </div>
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Период:</span>
                    <span className="text-gray-900">
                      {formatDate(promo.valid_from)} - {formatDate(promo.valid_until)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Использования:</span>
                    <span className="text-gray-900">
                      {promo.used_count} / {promo.usage_limit || "∞"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(promo)}
                    className="flex-1"
                  >
                    <Icon name="Pencil" size={16} className="mr-2" />
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => promo.id && handleDelete(promo.id)}
                    className="text-red-600 hover:text-red-700 border-red-200"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
            ))}
            {promoCodes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Нет промо-кодов
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPromoCode ? "Редактировать промо-код" : "Новый промо-код"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Код (будет преобразован в верхний регистр)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_type">Тип скидки</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Процент</SelectItem>
                    <SelectItem value="fixed">Фиксированная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount_value">
                  {formData.discount_type === "percentage" ? "Процент" : "Сумма (₽)"}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from">Действует с</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="valid_until">Действует до</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="usage_limit">Лимит использований (оставьте пустым для безлимита)</Label>
              <Input
                id="usage_limit"
                type="number"
                min="1"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
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

export default AdminPromoCodes;