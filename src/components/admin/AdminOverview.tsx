import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  image_url: string;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AdminOverviewProps {
  events: Event[];
  getOccupancyLabel: (occupancy: string) => string;
  getOccupancyColor: (occupancy: string) => string;
}

const AdminOverview = ({ events, getOccupancyLabel, getOccupancyColor }: AdminOverviewProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Обзор</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
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
          {events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div>
                <p className="font-medium text-gray-800">{event.title}</p>
                <p className="text-sm text-gray-500">{event.event_date}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getOccupancyColor(
                  event.occupancy
                )}`}
              >
                {getOccupancyLabel(event.occupancy)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
