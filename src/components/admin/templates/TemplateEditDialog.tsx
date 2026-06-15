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
import type { ScheduleTemplate, MasterService, MasterAddress } from "@/lib/master-calendar-api";

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
  address_id: string;
}

interface TemplateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: ScheduleTemplate | null;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  rules: RuleForm[];
  onUpdateRule: (index: number, patch: Partial<RuleForm>) => void;
  onAddRuleForDay: (dayOfWeek: number) => void;
  onRemoveRule: (index: number) => void;
  services: MasterService[];
  addresses?: MasterAddress[];
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
  onAddRuleForDay,
  onRemoveRule,
  addresses = [],
  saving,
  onSave,
}: TemplateEditDialogProps) => {
  // Группируем правила по дням недели — для каждого дня может быть несколько правил
  const indicesByDay: number[][] = Array.from({ length: 7 }, () => []);
  rules.forEach((rule, idx) => {
    if (rule.day_of_week >= 0 && rule.day_of_week < 7) {
      indicesByDay[rule.day_of_week].push(idx);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Icon
              name={editingTemplate ? "Pencil" : "Plus"}
              size={20}
              className="text-nature-forest"
            />
            {editingTemplate ? "Редактировать шаблон" : "Новый шаблон"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
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
            <p className="text-xs text-gray-500 mb-3">
              Можно добавить несколько интервалов на один день — например, утренние парения и вечерний массаж.
            </p>
            <div className="space-y-3">
              {DAY_NAMES.map((dayName, dayIdx) => {
                const ruleIndices = indicesByDay[dayIdx];
                const hasOnlyDayOff =
                  ruleIndices.length === 1 && rules[ruleIndices[0]]?.is_day_off;
                const isCompletelyEmpty = ruleIndices.length === 0;

                return (
                  <div
                    key={dayIdx}
                    className={`rounded-lg border p-3 ${
                      hasOnlyDayOff || isCompletelyEmpty
                        ? "border-red-200 bg-red-50/50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {dayName}
                      </span>
                      <div className="flex items-center gap-2">
                        {hasOnlyDayOff && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-nature-forest hover:bg-nature-forest/10"
                            onClick={() => {
                              const ruleIdx = ruleIndices[0];
                              onUpdateRule(ruleIdx, { is_day_off: false });
                            }}
                          >
                            <Icon name="Sunrise" size={14} />
                            Сделать рабочим
                          </Button>
                        )}
                        {!hasOnlyDayOff && !isCompletelyEmpty && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-gray-500 hover:bg-gray-100"
                            onClick={() => {
                              ruleIndices.forEach((i) =>
                                onUpdateRule(i, { is_day_off: true })
                              );
                            }}
                          >
                            <Icon name="Moon" size={14} />
                            Сделать выходным
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-nature-forest hover:bg-nature-forest/10"
                          onClick={() => onAddRuleForDay(dayIdx)}
                        >
                          <Icon name="Plus" size={14} />
                          Интервал
                        </Button>
                      </div>
                    </div>

                    {(hasOnlyDayOff || isCompletelyEmpty) && (
                      <div className="text-xs text-gray-500 italic">
                        Выходной — слоты не создаются
                      </div>
                    )}

                    {!hasOnlyDayOff && !isCompletelyEmpty && (
                      <div className="space-y-2">
                        {ruleIndices.map((ruleIdx) => {
                          const rule = rules[ruleIdx];
                          if (rule.is_day_off) return null;
                          return (
                            <div
                              key={ruleIdx}
                              className="bg-gray-50 rounded-md p-2 space-y-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  type="time"
                                  value={rule.time_start}
                                  onChange={(e) =>
                                    onUpdateRule(ruleIdx, { time_start: e.target.value })
                                  }
                                  className="w-[110px] h-8 text-sm"
                                />
                                <span className="text-gray-400 text-sm">—</span>
                                <Input
                                  type="time"
                                  value={rule.time_end}
                                  onChange={(e) =>
                                    onUpdateRule(ruleIdx, { time_end: e.target.value })
                                  }
                                  className="w-[110px] h-8 text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 ml-auto"
                                  onClick={() => onRemoveRule(ruleIdx)}
                                  title="Удалить интервал"
                                >
                                  <Icon name="Trash2" size={14} />
                                </Button>
                              </div>
                              {addresses.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Icon name="MapPin" size={14} className="text-gray-400 shrink-0" />
                                  <select
                                    value={rule.address_id || ""}
                                    onChange={(e) =>
                                      onUpdateRule(ruleIdx, { address_id: e.target.value })
                                    }
                                    className="flex-1 h-8 text-sm rounded-md border border-input bg-background px-2"
                                  >
                                    <option value="">Адрес не указан</option>
                                    {addresses.map((a) => (
                                      <option key={a.id} value={String(a.id)}>
                                        {a.address_text}
                                        {a.is_primary ? " (основной)" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 pt-2 border-t">
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