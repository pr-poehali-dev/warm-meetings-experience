import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { masterCalendarApi } from "@/lib/master-calendar-api";
import type { MasterService } from "@/lib/master-calendar-api";

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  max_clients: string;
  is_active: boolean;
}

const emptyForm: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: "60",
  price: "",
  max_clients: "1",
  is_active: true,
};

const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

const MasterServices = ({ masterId }: { masterId: number }) => {
  const [services, setServices] = useState<MasterService[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingService, setEditingService] = useState<MasterService | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceFormData>({ ...emptyForm });

  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await masterCalendarApi.getServices(masterId);
      setServices(data);
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить услуги",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingService(null);
    setForm({ ...emptyForm });
    setIsDialogOpen(true);
  };

  const openEdit = (service: MasterService) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || "",
      duration_minutes: String(service.duration_minutes),
      price: String(service.price),
      max_clients: String(service.max_clients),
      is_active: service.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Ошибка", description: "Введите название услуги", variant: "destructive" });
      return;
    }
    if (!form.duration_minutes || Number(form.duration_minutes) <= 0) {
      toast({ title: "Ошибка", description: "Укажите длительность", variant: "destructive" });
      return;
    }
    if (!form.price || Number(form.price) < 0) {
      toast({ title: "Ошибка", description: "Укажите цену", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingService?.id) {
        await masterCalendarApi.updateService({
          id: editingService.id,
          master_id: masterId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
          max_clients: Number(form.max_clients) || 1,
          is_active: form.is_active,
        });
        toast({ title: "Готово", description: "Услуга обновлена" });
      } else {
        await masterCalendarApi.createService({
          master_id: masterId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
          max_clients: Number(form.max_clients) || 1,
          is_active: form.is_active,
        });
        toast({ title: "Готово", description: "Услуга создана" });
      }
      setIsDialogOpen(false);
      setEditingService(null);
      setForm({ ...emptyForm });
      fetchServices();
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить услугу",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await masterCalendarApi.deleteService(deletingId);
      toast({ title: "Готово", description: "Услуга удалена" });
      setIsDeleteOpen(false);
      setDeletingId(null);
      fetchServices();
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить услугу",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: MasterService) => {
    if (!service.id) return;
    setSaving(true);
    try {
      await masterCalendarApi.updateService({
        id: service.id,
        master_id: masterId,
        name: service.name,
        duration_minutes: service.duration_minutes,
        price: service.price,
        max_clients: service.max_clients,
        is_active: !service.is_active,
      });
      toast({
        title: "Готово",
        description: service.is_active ? "Услуга деактивирована" : "Услуга активирована",
      });
      fetchServices();
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Услуги мастера</h1>
          <p className="text-gray-500 mt-1 text-sm">Управление предоставляемыми услугами</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openCreate}
            size="sm"
            className="bg-nature-forest hover:bg-nature-forest/90 text-white lg:hidden"
          >
            <Icon name="Plus" size={16} />
          </Button>
          <Button
            onClick={openCreate}
            className="bg-nature-forest hover:bg-nature-forest/90 text-white hidden lg:flex"
          >
            <Icon name="Plus" size={18} className="mr-2" />
            Добавить услугу
          </Button>
        </div>
      </div>

      {loading && !services.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Icon name="Sparkles" size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Услуг пока нет</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте первую услугу, нажав кнопку выше</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow ${
                !service.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                  )}
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                    service.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {service.is_active ? "Активна" : "Неактивна"}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Clock" size={14} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600">{service.duration_minutes} мин</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Banknote" size={14} className="text-gray-400 shrink-0" />
                  <span className="text-gray-900 font-semibold">{formatPrice(service.price)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Users" size={14} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600">до {service.max_clients} чел.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(service)}
                  className="flex-1"
                >
                  <Icon name="Pencil" size={14} className="mr-1" />
                  Редактировать
                </Button>
                <button
                  onClick={() => toggleActive(service)}
                  className={`p-2 rounded-md transition-colors ${
                    service.is_active
                      ? "text-yellow-600 hover:bg-yellow-50"
                      : "text-green-600 hover:bg-green-50"
                  }`}
                  title={service.is_active ? "Деактивировать" : "Активировать"}
                  disabled={saving}
                >
                  <Icon name={service.is_active ? "EyeOff" : "Eye"} size={16} />
                </button>
                <button
                  onClick={() => service.id && confirmDelete(service.id)}
                  className="p-2 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                  title="Удалить"
                  disabled={saving}
                >
                  <Icon name="Trash2" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon
                name={editingService ? "Pencil" : "Plus"}
                size={20}
                className="text-nature-forest"
              />
              {editingService ? "Редактировать услугу" : "Новая услуга"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Название <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Парение в бане"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание услуги для клиентов..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Длительность (мин) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={5}
                  max={720}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  placeholder="60"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Цена (\u20BD) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="3000"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Макс. участников</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.max_clients}
                onChange={(e) => setForm({ ...form, max_clients: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <Label className="text-sm font-medium text-gray-900">Активна</Label>
                <p className="text-xs text-gray-500 mt-0.5">Услуга видна клиентам при записи</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white"
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Trash2" size={20} className="text-red-500" />
              Удалить услугу
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterServices;