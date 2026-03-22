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
import type { MasterService } from "@/lib/master-calendar-api";
import type { BookingFormData } from "./bookingUtils";
import { formatPrice } from "./bookingUtils";

interface BookingCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BookingFormData;
  onFormChange: (form: BookingFormData) => void;
  services: MasterService[];
  saving: boolean;
  onServiceChange: (serviceId: string) => void;
  onCreate: () => void;
}

const BookingCreateDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  services,
  saving,
  onServiceChange,
  onCreate,
}: BookingCreateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onChange={(e) => onFormChange({ ...form, client_name: e.target.value })}
                placeholder="Иван Иванов"
                className="mt-1"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Телефон <span className="text-red-500">*</span></Label>
              <Input
                value={form.client_phone}
                onChange={(e) => onFormChange({ ...form, client_phone: e.target.value })}
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
              onChange={(e) => onFormChange({ ...form, client_email: e.target.value })}
              placeholder="email@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Услуга</Label>
            <Select value={form.service_id} onValueChange={onServiceChange}>
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
              onChange={(e) => onFormChange({ ...form, date: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Начало <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                value={form.time_start}
                onChange={(e) => onFormChange({ ...form, time_start: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Конец <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                value={form.time_end}
                onChange={(e) => onFormChange({ ...form, time_end: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Цена ({"\u20BD"})</Label>
            <Input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => onFormChange({ ...form, price: e.target.value })}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Комментарий</Label>
            <Textarea
              value={form.comment}
              onChange={(e) => onFormChange({ ...form, comment: e.target.value })}
              placeholder="Дополнительная информация..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={onCreate}
            disabled={saving}
            className="bg-nature-forest hover:bg-nature-forest/90 text-white"
          >
            {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCreateDialog;
