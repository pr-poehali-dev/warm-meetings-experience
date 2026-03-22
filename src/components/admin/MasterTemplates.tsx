import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { masterCalendarApi } from "@/lib/master-calendar-api";
import type { ScheduleTemplate, TemplateRule, MasterService } from "@/lib/master-calendar-api";
import TemplateCard from "./templates/TemplateCard";
import TemplateEditDialog from "./templates/TemplateEditDialog";
import type { RuleForm } from "./templates/TemplateEditDialog";
import TemplateApplyDialog, { TemplateDeleteDialog } from "./templates/TemplateApplyDialog";

const MASTER_ID = 1;

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
            <TemplateCard
              key={template.id}
              template={template}
              onApply={openApply}
              onEdit={openEdit}
              onDelete={confirmDelete}
            />
          ))}
        </div>
      )}

      <TemplateEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        editingTemplate={editingTemplate}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        rules={rules}
        onUpdateRule={updateRule}
        services={services}
        saving={saving}
        onSave={handleSave}
      />

      <TemplateApplyDialog
        open={isApplyOpen}
        onOpenChange={setIsApplyOpen}
        template={applyingTemplate}
        weeks={applyWeeks}
        onWeeksChange={setApplyWeeks}
        startDate={applyStartDate}
        onStartDateChange={setApplyStartDate}
        services={services}
        saving={saving}
        onApply={handleApply}
      />

      <TemplateDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        saving={saving}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default MasterTemplates;
