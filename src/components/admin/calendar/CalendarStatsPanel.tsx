import Icon from "@/components/ui/icon";
import { formatPrice } from "./calendarUtils";
import type { BookingStats } from "@/lib/master-calendar-api";

interface CalendarStatsPanelProps {
  stats: BookingStats | null;
}

const CalendarStatsPanel = ({ stats }: CalendarStatsPanelProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="CalendarCheck" size={16} className="text-nature-forest" />
          <span className="text-xs text-gray-500">Сеансов за месяц</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats?.total_sessions ?? "-"}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="TrendingUp" size={16} className="text-nature-olive" />
          <span className="text-xs text-gray-500">Занятость</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {stats?.occupancy_percent != null ? `${stats.occupancy_percent}%` : "-"}
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="Clock" size={16} className="text-yellow-600" />
          <span className="text-xs text-gray-500">Ожидают подтверждения</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats?.upcoming_sessions ?? "-"}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="Banknote" size={16} className="text-nature-brown" />
          <span className="text-xs text-gray-500">Доход за месяц</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {stats?.total_revenue != null ? formatPrice(stats.total_revenue) : "-"}
        </p>
      </div>
    </div>
  );
};

export default CalendarStatsPanel;
