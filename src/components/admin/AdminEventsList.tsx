import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

interface Event {
  id?: number;
  title: string;
  short_description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  occupancy?: string;
  price?: string;
  event_type?: string;
  event_type_icon?: string;
  image_url?: string;
  is_visible: boolean;
  total_spots?: number;
  spots_left?: number;
  price_label?: string;
  bath_name?: string;
  [key: string]: unknown;
}

interface AdminEventsListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (id: number) => void;
  onToggleVisibility: (event: Event) => void;
  onNewEvent: () => void;
}

const AdminEventsList = ({
  events,
  onEdit,
  onDelete,
  onToggleVisibility,
  onNewEvent,
}: AdminEventsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Все мероприятия</h1>
        <Button onClick={onNewEvent}>
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Inbox" size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Мероприятий не найдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover" />
                )}
                {!event.image_url && (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <Icon name={event.event_type_icon || "Calendar"} size={32} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(event)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title="Редактировать"
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onToggleVisibility(event)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title={event.is_visible ? "Скрыть" : "Показать"}
                  >
                    <Icon name={event.is_visible ? "Eye" : "EyeOff"} size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => event.id && onDelete(event.id)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
                {!event.is_visible && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs bg-gray-800/80 text-white px-2 py-1 rounded">Скрыто</span>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {event.event_type && (
                    <div className="flex items-center gap-1.5 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                      <Icon name={event.event_type_icon || "Users"} size={14} />
                      <span>{event.event_type}</span>
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2">{event.title}</h3>
                {event.short_description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.short_description}</p>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" size={14} />
                    {event.event_date}
                  </span>
                  {event.start_time && (
                    <span className="flex items-center gap-1">
                      <Icon name="Clock" size={14} />
                      {event.start_time}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(event.price_label || event.price) && (
                      <span className="text-sm font-semibold">{event.price_label || event.price}</span>
                    )}
                  </div>
                  {event.total_spots ? (
                    <span className="text-xs text-gray-500">
                      {event.spots_left}/{event.total_spots} мест
                    </span>
                  ) : null}
                </div>

                {event.bath_name && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Icon name="MapPin" size={12} />
                    {event.bath_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEventsList;