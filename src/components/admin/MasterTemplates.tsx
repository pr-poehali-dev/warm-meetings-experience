import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { masterCalendarApi } from "@/lib/master-calendar-api";
import type { ScheduleTemplate, TemplateRule, MasterService } from "@/lib/master-calendar-api";

const MASTER_ID = 1;

const DAY_NAMES = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

const DAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface RuleForm {
  day_of_week: number;
  time_start: string;
  time_end: string;
  service_id: string;
  max_clients: number;
  is_day_off: boolean;
}

const createEmptyRules = (): RuleForm[] =>
  Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    time_start: "10:00",
    time_end: "18:00",
    service_id: "",
    max_clients: 1,
    is_day_off: i >= 6,
  }));

const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const MasterTemplates = () => {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [services, setServices] = useState<MasterService[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<ScheduleTemplate | null>(null);

  const [templateName, setTemplateName] = useState("");
  const [rules, setRules] = useState<RuleForm[]>(createEmptyRules());
  const [applyWeeks, setApplyWeeks] = useState(1);
  const [applyStartDate, setApplyStartDate] = useState(formatDateISO(getMonday(new Date())));

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchServices();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await masterCalendarApi.getTemplates(MASTER_ID);
      setTemplates(data);
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить шаблоны",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await masterCalendarApi.getServices(MASTER_ID);
      setServices(data);
    } catch {
      // non-critical
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setRules(createEmptyRules());
    setIsEditOpen(true);
  };

  const openEdit = (template: ScheduleTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    if (template.rules && template.rules.length > 0) {
      const mapped = createEmptyRules();
      template.rules.forEach((rule) => {
        if (rule.day_of_week >= 0 && rule.day_of_week < 7) {
          mapped[rule.day_of_week] = {
            day_of_week: rule.day_of_week,
            time_start: rule.time_start || "10:00",
            time_end: rule.time_end || "18:00",
            service_id: rule.service_id ? String(rule.service_id) : "",
            max_clients: rule.max_clients || 1,
            is_day_off: rule.is_day_off,
          };
        }
      });
      setRules(mapped);
    } else {
      setRules(createEmptyRules());
    }
    setIsEditOpen(true);
  };

  const openApply = (template: ScheduleTemplate) => {
    setApplyingTemplate(template);
    setApplyWeeks(1);
    setApplyStartDate(formatDateISO(getMonday(new Date())));
    setIsApplyOpen(true);
  };

  const confirmDelete = (id: number) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const updateRule = (index: number, patch: Partial<RuleForm>) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({ title: "Ошибка", description: "Введите название шаблона", variant: "destructive" });
      return;
    }

    const apiRules: TemplateRule[] = rules.map((r) => ({
      day_of_week: r.day_of_week,
      time_start: r.time_start,
      time_end: r.time_end,
      service_id: r.service_id ? Number(r.service_id) : null,
      max_clients: r.max_clients,
      is_day_off: r.is_day_off,
    }));

    setSaving(true);
    try {
      if (editingTemplate?.id) {
        await masterCalendarApi.updateTemplate({
          id: editingTemplate.id,
          name: templateName.trim(),
          rules: apiRules,
        });
        toast({ title: "Готово", description: "Шаблон обновлён" });
      } else {
        await masterCalendarApi.createTemplate({
          master_id: MASTER_ID,
          name: templateName.trim(),
          rules: apiRules,
        });
        toast({ title: "Готово", description: "Шаблон создан" });
      }
      setIsEditOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить шаблон",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await masterCalendarApi.deleteTemplate(deletingId);
      toast({ title: "Готово", description: "Шаблон удалён" });
      setIsDeleteOpen(false);
      setDeletingId(null);
      fetchTemplates();
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить шаблон",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!applyingTemplate?.id) return;
    setSaving(true);
    try {
      const result = await masterCalendarApi.applyTemplate({
        template_id: applyingTemplate.id,
        master_id: MASTER_ID,
        weeks: applyWeeks,
        start_date: applyStartDate || undefined,
      });
      toast({
        title: "Шаблон применён",
        description: `Создано ${result.created} слотов, пропущено ${result.skipped}`,
      });
      setIsApplyOpen(false);
      setApplyingTemplate(null);
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось применить шаблон",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getServiceName = (serviceId: number | null | undefined): string => {
    if (!serviceId) return "";
    const svc = services.find((s) => s.id === serviceId);
    return svc ? svc.name : "";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Шаблоны расписания</h1>
          <p className="text-gray-500 mt-1 text-sm">Создание и применение шаблонов недельного расписания</p>
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
            Создать шаблон
          </Button>
        </div>
      </div>

      {loading && !templates.length ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Icon name="Copy" size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Шаблонов пока нет</p>
          <p className="text-gray-400 text-sm mt-1">Создайте шаблон для быстрого заполнения расписания</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-nature-forest/10 flex items-center justify-center shrink-0">
                    <Icon name="LayoutTemplate" size={20} className="text-nature-forest" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-xs text-gray-500">
                      {template.rules?.length || 0} правил
                      {template.created_at && (
                        <span>
                          {" \u00B7 "}создан {new Date(template.created_at).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                    template.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {template.is_active ? "Активен" : "Неактивен"}
                </span>
              </div>

              {template.rules && template.rules.length > 0 && (
                <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {DAY_NAMES_SHORT.map((dayName, dayIdx) => {
                      const rule = template.rules?.find((r) => r.day_of_week === dayIdx);
                      if (!rule) {
                        return (
                          <div key={dayIdx} className="text-center">
                            <div className="text-xs font-medium text-gray-400">{dayName}</div>
                            <div className="text-[10px] text-gray-300 mt-0.5">-</div>
                          </div>
                        );
                      }
                      return (
                        <div key={dayIdx} className="text-center">
                          <div className={`text-xs font-medium ${rule.is_day_off ? "text-red-400" : "text-gray-700"}`}>
                            {dayName}
                          </div>
                          {rule.is_day_off ? (
                            <div className="text-[10px] text-red-400 mt-0.5">Выходной</div>
                          ) : (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {rule.time_start}-{rule.time_end}
                              {rule.max_clients > 1 && (
                                <span className="block text-gray-400">до {rule.max_clients}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-nature-forest hover:bg-nature-forest/90 text-white"
                  onClick={() => openApply(template)}
                >
                  <Icon name="Play" size={14} className="mr-1" />
                  Применить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(template)}
                >
                  <Icon name="Pencil" size={14} className="mr-1" />
                  Редактировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => template.id && confirmDelete(template.id)}
                >
                  <Icon name="Trash2" size={14} className="mr-1" />
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                onChange={(e) => setTemplateName(e.target.value)}
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
                          onCheckedChange={(v) => updateRule(idx, { is_day_off: v })}
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">Выходной</span>
                      </div>

                      {!rule.is_day_off && (
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={rule.time_start}
                            onChange={(e) => updateRule(idx, { time_start: e.target.value })}
                            className="w-[110px] h-8 text-sm"
                          />
                          <span className="text-gray-400 text-sm">-</span>
                          <Input
                            type="time"
                            value={rule.time_end}
                            onChange={(e) => updateRule(idx, { time_end: e.target.value })}
                            className="w-[110px] h-8 text-sm"
                          />
                          <Select
                            value={rule.service_id}
                            onValueChange={(v) => updateRule(idx, { service_id: v })}
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
                            onChange={(e) => updateRule(idx, { max_clients: Number(e.target.value) || 1 })}
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
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

      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Play" size={20} className="text-nature-forest" />
              Применить шаблон
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {applyingTemplate && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-xs text-gray-500">Шаблон</span>
                <p className="text-sm font-semibold text-gray-900">{applyingTemplate.name}</p>
                {applyingTemplate.rules && applyingTemplate.rules.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {applyingTemplate.rules
                      .filter((r) => !r.is_day_off)
                      .map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium w-5">{DAY_NAMES_SHORT[rule.day_of_week]}</span>
                          <span>
                            {rule.time_start} - {rule.time_end}
                          </span>
                          {getServiceName(rule.service_id) && (
                            <span className="text-gray-400">({getServiceName(rule.service_id)})</span>
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
                value={applyWeeks}
                onChange={(e) => setApplyWeeks(Number(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Дата начала</Label>
              <Input
                type="date"
                value={applyStartDate}
                onChange={(e) => setApplyStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleApply}
              disabled={saving}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white"
            >
              {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
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

export default MasterTemplates;
