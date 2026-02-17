import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

interface Event {
  id?: number;
  title: string;
  event_date: string;
  is_visible: boolean;
  occupancy?: string;
  total_spots?: number;
  spots_left?: number;
  [key: string]: unknown;
}

type ViewType = string;

interface AdminOverviewProps {
  events: Event[];
  onViewChange: (view: ViewType) => void;
  onEditEvent: (event: Event) => void;
  getOccupancyLabel?: (occupancy: string) => string;
  getOccupancyColor?: (occupancy: string) => string;
}

const defaultOccupancyLabel = (occ: string) => {
  const labels: Record<string, string> = { low: "Низкая", medium: "Средняя", high: "Высокая" };
  return labels[occ] || occ;
};

const defaultOccupancyColor = (occ: string) => {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };
  return colors[occ] || "bg-gray-100 text-gray-800";
};

const AdminOverview = ({
  events,
  onViewChange,
  onEditEvent,
  getOccupancyLabel = defaultOccupancyLabel,
  getOccupancyColor = defaultOccupancyColor,
}: AdminOverviewProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Обзор</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewChange("list")}>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Всего мероприятий</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800">{events.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Опубликовано</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {events.filter((e) => e.is_visible).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Скрыто</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600">
              {events.filter((e) => !e.is_visible).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние мероприятия</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-gray-500 py-4 text-center">Мероприятий пока нет</p>
          ) : (
            events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                onClick={() => onEditEvent(event)}
              >
                <div>
                  <p className="font-medium text-gray-800">{event.title}</p>
                  <p className="text-sm text-gray-500">{event.event_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  {event.total_spots ? (
                    <span className="text-xs text-gray-500">
                      {event.spots_left}/{event.total_spots} мест
                    </span>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOccupancyColor(event.occupancy || "low")}`}>
                      {getOccupancyLabel(event.occupancy || "low")}
                    </span>
                  )}
                  <Icon name="ChevronRight" size={16} className="text-gray-400" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
