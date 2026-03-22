import Icon from "@/components/ui/icon";
import type { MasterSlot, MasterBooking, DayBlock } from "@/lib/master-calendar-api";
import {
  HOURS_START,
  HOURS_END,
  PX_PER_HOUR,
  DAY_NAMES,
  formatDateShort,
  formatDateISO,
  getSlotPosition,
  getSlotColors,
  formatTime,
  isToday,
} from "./calendarUtils";

interface CalendarWeekGridProps {
  weekDays: Date[];
  hours: number[];
  loading: boolean;
  getSlotsForDay: (day: Date) => MasterSlot[];
  getBookingsForSlot: (slotId: number) => MasterBooking[];
  isDayBlocked: (day: Date) => DayBlock | undefined;
  onSlotClick: (slot: MasterSlot) => void;
  onDeleteBlock: (blockId: number) => void;
}

const CalendarWeekGrid = ({
  weekDays,
  hours,
  loading,
  getSlotsForDay,
  getBookingsForSlot,
  isDayBlocked,
  onSlotClick,
  onDeleteBlock,
}: CalendarWeekGridProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-center py-24">
          <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
            <div className="p-2 bg-gray-50 border-r border-gray-200" />
            {weekDays.map((day, idx) => {
              const blocked = isDayBlocked(day);
              const today = isToday(day);
              return (
                <div
                  key={idx}
                  className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${
                    today ? "bg-nature-forest/5" : "bg-gray-50"
                  } ${blocked ? "opacity-60" : ""}`}
                >
                  <div className={`text-xs font-medium ${today ? "text-nature-forest" : "text-gray-500"}`}>
                    {DAY_NAMES[idx]}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      today
                        ? "bg-nature-forest text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                        : "text-gray-900"
                    }`}
                  >
                    {formatDateShort(day)}
                  </div>
                  {blocked && (
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <Icon name="Lock" size={10} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                        {blocked.reason || "Заблокирован"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            <div className="border-r border-gray-200">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] flex items-start justify-end pr-2 pt-0.5 text-[11px] text-gray-400 border-b border-gray-100"
                >
                  {hour.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {weekDays.map((day, dayIdx) => {
              const daySlots = getSlotsForDay(day);
              const blocked = isDayBlocked(day);
              const totalHeight = (HOURS_END - HOURS_START + 1) * PX_PER_HOUR;

              return (
                <div
                  key={dayIdx}
                  className="relative border-r border-gray-200 last:border-r-0"
                  style={{ height: `${totalHeight}px` }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-b border-gray-100"
                      style={{ top: `${(hour - HOURS_START) * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
                    />
                  ))}

                  {blocked && (
                    <div className="absolute inset-0 bg-gray-100/60 z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <Icon name="Lock" size={20} />
                        <span className="text-xs">Заблокирован</span>
                        {blocked.id && (
                          <button
                            onClick={() => onDeleteBlock(blocked.id!)}
                            className="text-[10px] text-red-400 hover:text-red-600 underline mt-1"
                          >
                            Разблокировать
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {daySlots.map((slot) => {
                    const pos = getSlotPosition(slot);
                    const colors = getSlotColors(slot.status);
                    const bookings = slot.id ? getBookingsForSlot(slot.id) : [];
                    const clientName = bookings.length > 0 ? bookings[0].client_name : null;

                    return (
                      <div
                        key={slot.id || `${slot.datetime_start}`}
                        className={`absolute left-0.5 right-0.5 z-20 rounded border px-1.5 py-0.5 cursor-pointer transition-colors overflow-hidden ${colors}`}
                        style={{ top: pos.top, height: pos.height }}
                        onClick={() => onSlotClick(slot)}
                      >
                        <div className="text-[11px] font-semibold leading-tight truncate">
                          {formatTime(slot.datetime_start)} - {formatTime(slot.datetime_end)}
                        </div>
                        {slot.service_name && (
                          <div className="text-[10px] leading-tight truncate opacity-80">
                            {slot.service_name}
                          </div>
                        )}
                        {clientName && (
                          <div className="text-[10px] leading-tight truncate font-medium">
                            {clientName}
                          </div>
                        )}
                        {slot.booked_count > 0 && (
                          <div className="text-[10px] leading-tight opacity-70">
                            {slot.booked_count}/{slot.max_clients}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWeekGrid;
