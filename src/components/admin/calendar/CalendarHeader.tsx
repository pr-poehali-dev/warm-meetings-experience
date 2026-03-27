import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { formatWeekRange } from "./calendarUtils";
import type { ViewMode } from "./calendarUtils";

interface CalendarHeaderProps {
  weekStart: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onOpenSlotDialog: () => void;
  onOpenTemplateDialog: () => void;
  onOpenBlockDialog: () => void;
}

const CalendarHeader = ({
  weekStart,
  viewMode,
  onViewModeChange,
  onPrevWeek,
  onNextWeek,
  onToday,
  onOpenSlotDialog,
  onOpenTemplateDialog,
  onOpenBlockDialog,
}: CalendarHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            <Icon name="Calendar" size={28} className="inline-block mr-2 text-nature-forest" />
            Календарь мастера
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Управление расписанием и записями</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onOpenSlotDialog}
            className="bg-nature-forest hover:bg-nature-forest/90 text-white"
          >
            <Icon name="Plus" size={16} />
            <span className="hidden sm:inline">Добавить слот</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenTemplateDialog}
          >
            <Icon name="Copy" size={16} />
            <span className="hidden sm:inline">Применить шаблон</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenBlockDialog}
          >
            <Icon name="Ban" size={16} />
            <span className="hidden sm:inline">Заблокировать день</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPrevWeek}>
            <Icon name="ChevronLeft" size={18} />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={onNextWeek}>
            <Icon name="ChevronRight" size={18} />
          </Button>
          <span className="ml-2 text-sm font-semibold text-gray-900">
            {formatWeekRange(weekStart)}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("week")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "week"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Неделя
          </button>
          <button
            onClick={() => onViewModeChange("month")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "month"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Месяц
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
