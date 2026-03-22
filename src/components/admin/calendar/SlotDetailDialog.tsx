import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { MasterSlot, MasterBooking } from "@/lib/master-calendar-api";
import {
  getSlotColors,
  getStatusLabel,
  getBookingStatusColor,
  formatTime,
  formatPrice,
} from "./calendarUtils";

interface SlotDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: MasterSlot | null;
  bookings: MasterBooking[];
  saving: boolean;
  onBookingAction: (bookingId: number, action: "confirm" | "cancel" | "complete") => void;
  onDeleteSlot: (slotId: number) => void;
}

const SlotDetailDialog = ({
  open,
  onOpenChange,
  slot,
  bookings,
  saving,
  onBookingAction,
  onDeleteSlot,
}: SlotDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="CalendarClock" size={20} className="text-nature-forest" />
            Детали слота
          </DialogTitle>
        </DialogHeader>
        {slot && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">Время</span>
                <p className="text-sm font-semibold text-gray-900">
                  {formatTime(slot.datetime_start)} - {formatTime(slot.datetime_end)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Дата</span>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(slot.datetime_start).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Статус</span>
                <p className="mt-0.5">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getSlotColors(slot.status).split(" hover:")[0]}`}
                  >
                    {getStatusLabel(slot.status)}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Записей</span>
                <p className="text-sm font-semibold text-gray-900">
                  {slot.booked_count} / {slot.max_clients}
                </p>
              </div>
            </div>

            {slot.service_name && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-xs text-gray-500">Услуга</span>
                <p className="text-sm font-semibold text-gray-900">{slot.service_name}</p>
                {slot.service_price != null && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatPrice(slot.service_price)}
                    {slot.duration_minutes && ` / ${slot.duration_minutes} мин`}
                  </p>
                )}
              </div>
            )}

            {slot.notes && (
              <div>
                <span className="text-xs text-gray-500">Заметки</span>
                <p className="text-sm text-gray-700 mt-0.5">{slot.notes}</p>
              </div>
            )}

            {bookings.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 mb-2 block">
                  Записи ({bookings.length})
                </span>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{booking.client_name}</p>
                          <p className="text-xs text-gray-500">{booking.client_phone}</p>
                          {booking.service_name && (
                            <p className="text-xs text-gray-500 mt-0.5">{booking.service_name}</p>
                          )}
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${getBookingStatusColor(booking.status)}`}
                        >
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>
                      {booking.comment && (
                        <p className="text-xs text-gray-500 mt-1 italic">{booking.comment}</p>
                      )}
                      <div className="flex gap-1.5 mt-2">
                        {booking.status === "pending" && booking.id && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-nature-forest hover:bg-nature-forest/90 text-white"
                              onClick={() => onBookingAction(booking.id!, "confirm")}
                              disabled={saving}
                            >
                              <Icon name="Check" size={12} />
                              Подтвердить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => onBookingAction(booking.id!, "cancel")}
                              disabled={saving}
                            >
                              <Icon name="X" size={12} />
                              Отменить
                            </Button>
                          </>
                        )}
                        {booking.status === "confirmed" && booking.id && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => onBookingAction(booking.id!, "complete")}
                            disabled={saving}
                          >
                            <Icon name="CheckCircle" size={12} />
                            Завершить
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {slot?.id && slot.status !== "booked" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDeleteSlot(slot.id!)}
              disabled={saving}
              className="mr-auto"
            >
              {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
              <Icon name="Trash2" size={14} />
              Удалить слот
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SlotDetailDialog;
