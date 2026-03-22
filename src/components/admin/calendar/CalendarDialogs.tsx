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
import type { MasterService, ScheduleTemplate } from "@/lib/master-calendar-api";
import type { SlotFormData, BlockFormData, TemplateFormData } from "./calendarUtils";
import { DAY_NAMES, formatPrice } from "./calendarUtils";

interface SlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: SlotFormData;
  onFormChange: (form: SlotFormData) => void;
  services: MasterService[];
  saving: boolean;
  onSave: () => void;
}

export const SlotCreateDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  services,
  saving,
  onSave,
}: SlotDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Plus" size={20} className="text-nature-forest" />
            Добавить слот
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Дата</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => onFormChange({ ...form, date: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Начало</Label>
              <Input
                type="time"
                value={form.time_start}
                onChange={(e) => onFormChange({ ...form, time_start: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Конец</Label>
              <Input
                type="time"
                value={form.time_end}
                onChange={(e) => onFormChange({ ...form, time_end: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Услуга</Label>
            <Select
              value={form.service_id}
              onValueChange={(v) => onFormChange({ ...form, service_id: v })}
            >
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
            <Label>Макс. участников</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.max_clients}
              onChange={(e) => onFormChange({ ...form, max_clients: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Заметки</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
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
            onClick={onSave}
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

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BlockFormData;
  onFormChange: (form: BlockFormData) => void;
  saving: boolean;
  onSave: () => void;
}

export const BlockCreateDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  saving,
  onSave,
}: BlockDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Ban" size={20} className="text-red-500" />
            Заблокировать дни
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>С</Label>
              <Input
                type="date"
                value={form.date_from}
                onChange={(e) => onFormChange({ ...form, date_from: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>По</Label>
              <Input
                type="date"
                value={form.date_to}
                onChange={(e) => onFormChange({ ...form, date_to: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Причина</Label>
            <Input
              value={form.reason}
              onChange={(e) => onFormChange({ ...form, reason: e.target.value })}
              placeholder="Отпуск, больничный, ремонт..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>Заметки</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
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
            onClick={onSave}
            disabled={saving}
            variant="destructive"
          >
            {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
            Заблокировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TemplateFormData;
  onFormChange: (form: TemplateFormData) => void;
  templates: ScheduleTemplate[];
  selectedTemplate: ScheduleTemplate | null;
  saving: boolean;
  onApply: () => void;
}

export const TemplateApplyDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  templates,
  selectedTemplate,
  saving,
  onApply,
}: TemplateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Copy" size={20} className="text-nature-olive" />
            Применить шаблон
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Шаблон</Label>
            <Select
              value={form.template_id}
              onValueChange={(v) => onFormChange({ ...form, template_id: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите шаблон" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} {t.rules ? `(${t.rules.length} правил)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Количество недель</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={form.weeks}
              onChange={(e) => onFormChange({ ...form, weeks: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Дата начала</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => onFormChange({ ...form, start_date: e.target.value })}
              className="mt-1"
            />
          </div>
          {selectedTemplate?.rules && selectedTemplate.rules.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-2">Предварительный просмотр:</div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {selectedTemplate.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="font-medium w-6">{DAY_NAMES[rule.day_of_week] || `Д${rule.day_of_week}`}</span>
                    {rule.is_day_off ? (
                      <span className="text-red-500">Выходной</span>
                    ) : (
                      <>
                        <span>{rule.time_start} - {rule.time_end}</span>
                        <span className="text-gray-400">
                          (до {rule.max_clients} чел.)
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Будет создано на {form.weeks} нед. с {form.start_date}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={onApply}
            disabled={saving || !form.template_id}
            className="bg-nature-forest hover:bg-nature-forest/90 text-white"
          >
            {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
