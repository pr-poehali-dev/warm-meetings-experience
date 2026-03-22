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
import type { ScheduleTemplate, MasterService } from "@/lib/master-calendar-api";

const DAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface TemplateApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ScheduleTemplate | null;
  weeks: number;
  onWeeksChange: (weeks: number) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  services: MasterService[];
  saving: boolean;
  onApply: () => void;
}

const getServiceName = (services: MasterService[], serviceId: number | null | undefined): string => {
  if (!serviceId) return "";
  const svc = services.find((s) => s.id === serviceId);
  return svc ? svc.name : "";
};

const TemplateApplyDialog = ({
  open,
  onOpenChange,
  template,
  weeks,
  onWeeksChange,
  startDate,
  onStartDateChange,
  services,
  saving,
  onApply,
}: TemplateApplyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Play" size={20} className="text-nature-forest" />
            Применить шаблон
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {template && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <span className="text-xs text-gray-500">Шаблон</span>
              <p className="text-sm font-semibold text-gray-900">{template.name}</p>
              {template.rules && template.rules.length > 0 && (
                <div className="mt-2 space-y-1">
                  {template.rules
                    .filter((r) => !r.is_day_off)
                    .map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-medium w-5">{DAY_NAMES_SHORT[rule.day_of_week]}</span>
                        <span>
                          {rule.time_start} - {rule.time_end}
                        </span>
                        {getServiceName(services, rule.service_id) && (
                          <span className="text-gray-400">({getServiceName(services, rule.service_id)})</span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          <div>
            <Label>Количество недель</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={weeks}
              onChange={(e) => onWeeksChange(Number(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Дата начала</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={onApply}
            disabled={saving}
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

interface TemplateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onDelete: () => void;
}

export const TemplateDeleteDialog = ({
  open,
  onOpenChange,
  saving,
  onDelete,
}: TemplateDeleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Trash2" size={20} className="text-red-500" />
            Удалить шаблон
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-2">
          Вы уверены, что хотите удалить этот шаблон? Уже созданные слоты останутся без изменений.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={saving}
          >
            {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateApplyDialog;
