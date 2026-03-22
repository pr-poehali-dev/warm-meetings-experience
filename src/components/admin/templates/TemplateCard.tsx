import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { ScheduleTemplate } from "@/lib/master-calendar-api";

const DAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface TemplateCardProps {
  template: ScheduleTemplate;
  onApply: (template: ScheduleTemplate) => void;
  onEdit: (template: ScheduleTemplate) => void;
  onDelete: (id: number) => void;
}

const TemplateCard = ({ template, onApply, onEdit, onDelete }: TemplateCardProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
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
          onClick={() => onApply(template)}
        >
          <Icon name="Play" size={14} className="mr-1" />
          Применить
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(template)}
        >
          <Icon name="Pencil" size={14} className="mr-1" />
          Редактировать
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => template.id && onDelete(template.id)}
        >
          <Icon name="Trash2" size={14} className="mr-1" />
          Удалить
        </Button>
      </div>
    </div>
  );
};

export default TemplateCard;
