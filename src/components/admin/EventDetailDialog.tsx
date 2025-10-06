import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface EventDetailDialogProps {
  open: boolean;
  event: Event | null;
  onOpenChange: (open: boolean) => void;
  getOccupancyLabel: (occupancy: string) => string;
  getOccupancyColor: (occupancy: string) => string;
}

const EventDetailDialog = ({
  open,
  event,
  onOpenChange,
  getOccupancyLabel,
  getOccupancyColor,
}: EventDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {event && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Icon name={event.event_type_icon || 'Users'} size={24} />
                  <span className="text-sm font-medium">{event.event_type}</span>
                </div>
              </div>
              <DialogTitle className="text-2xl">{event.title}</DialogTitle>
              <DialogDescription>
                {event.event_date} | {event.start_time} - {event.end_time}
              </DialogDescription>
            </DialogHeader>

            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Краткое описание</h3>
                <p className="text-gray-600">{event.short_description}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Полное описание</h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {event.full_description}
                </p>
              </div>

              {event.price && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Стоимость</h3>
                  <p className="text-2xl font-bold text-gray-800">{event.price}</p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${getOccupancyColor(
                    event.occupancy
                  )}`}
                >
                  Загруженность: {getOccupancyLabel(event.occupancy)}
                </span>

                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    event.is_visible
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {event.is_visible ? "Опубликовано" : "Скрыто"}
                </span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;