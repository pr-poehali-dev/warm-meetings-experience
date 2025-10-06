import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  price: string;
  event_type: string;
  event_type_icon: string;
  image_url: string;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AdminEventsListProps {
  events: Event[];
  loading: boolean;
  searchTerm: string;
  filterOccupancy: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSearch: () => void;
  onNewEvent: () => void;
  onEdit: (event: Event) => void;
  onToggleVisibility: (event: Event) => void;
  onDeleteRequest: (id: number) => void;
  onViewDetails: (event: Event) => void;
  getOccupancyLabel: (occupancy: string) => string;
  getOccupancyColor: (occupancy: string) => string;
}

const AdminEventsList = ({
  events,
  loading,
  searchTerm,
  filterOccupancy,
  onSearchChange,
  onFilterChange,
  onSearch,
  onNewEvent,
  onEdit,
  onToggleVisibility,
  onDeleteRequest,
  onViewDetails,
  getOccupancyLabel,
  getOccupancyColor,
}: AdminEventsListProps) => {
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
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по названию..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Select value={filterOccupancy} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Загруженность" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Все</SelectItem>
                <SelectItem value="low">Низкая</SelectItem>
                <SelectItem value="medium">Средняя</SelectItem>
                <SelectItem value="high">Высокая</SelectItem>
                <SelectItem value="full">Полная</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onSearch}>
              <Icon name="Search" size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(event)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    title="Редактировать"
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onToggleVisibility(event)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    title={event.is_visible ? "Скрыть" : "Показать"}
                  >
                    <Icon name={event.is_visible ? "Eye" : "EyeOff"} size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onDeleteRequest(event.id!)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white hover:text-red-600"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                    <Icon name={event.event_type_icon || 'Users'} size={14} />
                    <span>{event.event_type}</span>
                  </div>
                  {!event.is_visible && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Скрыто</span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.short_description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Icon name="Calendar" size={14} />
                    <span>{event.event_date}</span>
                  </div>
                  {event.price && (
                    <span className="text-sm font-semibold text-gray-700">{event.price}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getOccupancyColor(
                      event.occupancy
                    )}`}
                  >
                    {getOccupancyLabel(event.occupancy)}
                  </span>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetails(event)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Подробнее
                    <Icon name="ChevronRight" size={14} className="ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEventsList;