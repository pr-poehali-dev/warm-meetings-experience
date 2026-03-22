import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { MasterBooking } from "@/lib/master-calendar-api";
import { getStatusColor, getStatusLabel, formatDateTime, formatPrice } from "./bookingUtils";

interface BookingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: MasterBooking | null;
  saving: boolean;
  onAction: (id: number, action: "confirm" | "cancel" | "complete" | "no_show") => void;
}

const BookingDetailDialog = ({ open, onOpenChange, booking, saving, onAction }: BookingDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="FileText" size={20} className="text-nature-forest" />
            Запись #{booking?.id}
          </DialogTitle>
        </DialogHeader>
        {booking && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">Клиент</span>
                <p className="text-sm font-semibold text-gray-900">{booking.client_name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Телефон</span>
                <p className="text-sm font-semibold text-gray-900">{booking.client_phone}</p>
              </div>
              {booking.client_email && (
                <div>
                  <span className="text-xs text-gray-500">Email</span>
                  <p className="text-sm font-semibold text-gray-900">{booking.client_email}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">Статус</span>
                <p className="mt-0.5">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500">Начало</span>
                  <p className="text-sm font-semibold text-gray-900">{formatDateTime(booking.datetime_start)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Окончание</span>
                  <p className="text-sm font-semibold text-gray-900">{formatDateTime(booking.datetime_end)}</p>
                </div>
                {booking.service_name && (
                  <div>
                    <span className="text-xs text-gray-500">Услуга</span>
                    <p className="text-sm font-semibold text-gray-900">{booking.service_name}</p>
                  </div>
                )}
                {booking.duration_minutes && (
                  <div>
                    <span className="text-xs text-gray-500">Длительность</span>
                    <p className="text-sm font-semibold text-gray-900">{booking.duration_minutes} мин</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
              <span className="text-sm text-gray-500">Стоимость</span>
              <span className="text-lg font-bold text-gray-900">{formatPrice(booking.price)}</span>
            </div>

            {booking.comment && (
              <div>
                <span className="text-xs text-gray-500">Комментарий</span>
                <p className="text-sm text-gray-700 mt-0.5 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {booking.comment}
                </p>
              </div>
            )}

            {booking.cancel_reason && (
              <div>
                <span className="text-xs text-red-500">Причина отмены</span>
                <p className="text-sm text-red-700 mt-0.5 bg-red-50 rounded-lg p-3 border border-red-200">
                  {booking.cancel_reason}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 border-t border-gray-200 pt-3">
              {booking.created_at && (
                <div>Создана: {formatDateTime(booking.created_at)}</div>
              )}
              {booking.confirmed_at && (
                <div>Подтверждена: {formatDateTime(booking.confirmed_at)}</div>
              )}
              {booking.completed_at && (
                <div>Завершена: {formatDateTime(booking.completed_at)}</div>
              )}
              {booking.canceled_at && (
                <div>Отменена: {formatDateTime(booking.canceled_at)}</div>
              )}
              {booking.source && (
                <div>Источник: {booking.source}</div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <div className="flex w-full gap-2 flex-wrap">
            {booking?.status === "pending" && booking.id && (
              <>
                <Button
                  size="sm"
                  className="bg-nature-forest hover:bg-nature-forest/90 text-white"
                  onClick={() => onAction(booking.id!, "confirm")}
                  disabled={saving}
                >
                  {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
                  <Icon name="Check" size={14} />
                  Подтвердить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onAction(booking.id!, "cancel")}
                  disabled={saving}
                >
                  <Icon name="X" size={14} />
                  Отменить
                </Button>
              </>
            )}
            {booking?.status === "confirmed" && booking.id && (
              <>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => onAction(booking.id!, "complete")}
                  disabled={saving}
                >
                  {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
                  <Icon name="CheckCircle" size={14} />
                  Завершить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onAction(booking.id!, "cancel")}
                  disabled={saving}
                >
                  <Icon name="X" size={14} />
                  Отменить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => onAction(booking.id!, "no_show")}
                  disabled={saving}
                >
                  <Icon name="UserX" size={14} />
                  Неявка
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="ml-auto"
            >
              Закрыть
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailDialog;
