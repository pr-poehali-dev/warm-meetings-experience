import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import type { ScheduleTemplate, MasterService } from "@/lib/master-calendar-api";

const DAY_NAMES = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export interface RuleForm {
  day_of_week: number;
  time_start: string;
  time_end: string;
  service_id: string;
  max_clients: number;
  is_day_off: boolean;
}

interface TemplateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: ScheduleTemplate | null;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  rules: RuleForm[];
  onUpdateRule: (index: number, patch: Partial<RuleForm>) => void;
  services: MasterService[];
  saving: boolean;
  onSave: () => void;
}

const TemplateEditDialog = ({
  open,
  onOpenChange,
  editingTemplate,
  templateName,
  onTemplateNameChange,
  rules,
  onUpdateRule,
  services,
  saving,
  onSave,
}: TemplateEditDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon
              name={editingTemplate ? "Pencil" : "Plus"}
              size={20}
              className="text-nature-forest"
            />
            {editingTemplate ? "Редактировать шаблон" : "Новый шаблон"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Название шаблона <span className="text-red-500">*</span></Label>
            <Input
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder="Основное расписание"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="mb-2 block">Расписание по дням</Label>
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${
                    rule.is_day_off
                      ? "border-red-200 bg-red-50/50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 sm:w-[140px] shrink-0">
                      <span className="text-sm font-medium text-gray-900 w-[100px]">
                        {DAY_NAMES[idx]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.is_day_off}
                        onCheckedChange={(v) => onUpdateRule(idx, { is_day_off: v })}
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Выходной</span>
                    </div>

                    {!rule.is_day_off && (
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={rule.time_start}
                          onChange={(e) => onUpdateRule(idx, { time_start: e.target.value })}
                          className="w-[110px] h-8 text-sm"
                        />
                        <span className="text-gray-400 text-sm">-</span>
                        <Input
                          type="time"
                          value={rule.time_end}
                          onChange={(e) => onUpdateRule(idx, { time_end: e.target.value })}
                          className="w-[110px] h-8 text-sm"
                        />
                        <Select
                          value={rule.service_id}
                          onValueChange={(v) => onUpdateRule(idx, { service_id: v })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Услуга" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без услуги</SelectItem>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={rule.max_clients}
                          onChange={(e) => onUpdateRule(idx, { max_clients: Number(e.target.value) || 1 })}
                          className="w-[60px] h-8 text-sm"
                          title="Макс. клиентов"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

export default TemplateEditDialog;
