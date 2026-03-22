import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { MasterBooking } from "@/lib/master-calendar-api";
import { getStatusColor, getStatusLabel, formatDateTime, formatPrice } from "./bookingUtils";

interface BookingsTableProps {
  bookings: MasterBooking[];
  saving: boolean;
  onAction: (id: number, action: "confirm" | "cancel" | "complete" | "no_show") => void;
  onOpenDetail: (booking: MasterBooking) => void;
}

const BookingsTable = ({ bookings, saving, onAction, onOpenDetail }: BookingsTableProps) => {
  return (
    <>
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Услуга</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата/время</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm text-gray-900">#{booking.id}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">{booking.client_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{booking.client_phone}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{booking.service_name || "-"}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDateTime(booking.datetime_start)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                    {formatPrice(booking.price)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenDetail(booking)}
                        className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Icon name="Eye" size={16} />
                      </button>
                      {booking.status === "pending" && booking.id && (
                        <>
                          <button
                            onClick={() => onAction(booking.id!, "confirm")}
                            className="p-1.5 text-green-600 hover:text-green-800 rounded hover:bg-green-50 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="Check" size={16} />
                          </button>
                          <button
                            onClick={() => onAction(booking.id!, "cancel")}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="X" size={16} />
                          </button>
                        </>
                      )}
                      {booking.status === "confirmed" && booking.id && (
                        <>
                          <button
                            onClick={() => onAction(booking.id!, "complete")}
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="CheckCircle" size={16} />
                          </button>
                          <button
                            onClick={() => onAction(booking.id!, "cancel")}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="X" size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:hidden space-y-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-500">Запись #{booking.id}</p>
                <p className="font-semibold text-gray-900 mt-1">{booking.client_name}</p>
                <p className="text-sm text-gray-600">{booking.client_phone}</p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {booking.service_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Услуга:</span>
                  <span className="text-gray-900">{booking.service_name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Дата:</span>
                <span className="text-gray-900">{formatDateTime(booking.datetime_start)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Цена:</span>
                <span className="font-semibold text-gray-900">{formatPrice(booking.price)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenDetail(booking)}
                className="flex-1"
              >
                <Icon name="Eye" size={14} className="mr-1" />
                Детали
              </Button>
              {booking.status === "pending" && booking.id && (
                <>
                  <Button
                    size="sm"
                    className="bg-nature-forest hover:bg-nature-forest/90 text-white"
                    onClick={() => onAction(booking.id!, "confirm")}
                    disabled={saving}
                  >
                    <Icon name="Check" size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => onAction(booking.id!, "cancel")}
                    disabled={saving}
                  >
                    <Icon name="X" size={14} />
                  </Button>
                </>
              )}
              {booking.status === "confirmed" && booking.id && (
                <>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => onAction(booking.id!, "complete")}
                    disabled={saving}
                  >
                    <Icon name="CheckCircle" size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => onAction(booking.id!, "cancel")}
                    disabled={saving}
                  >
                    <Icon name="X" size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default BookingsTable;
