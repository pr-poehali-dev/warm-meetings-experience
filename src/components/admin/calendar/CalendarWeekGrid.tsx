import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { MasterSlot, MasterBooking, DayBlock } from "@/lib/master-calendar-api";
import {
  PX_PER_HOUR,
  DAY_NAMES,
  formatDateShort,
  getSlotPosition,
  getSlotColors,
  formatTime,
  isToday,
  formatDateISO,
} from "./calendarUtils";

const SLOT_MINUTES = 30;
const PX_PER_SLOT = PX_PER_HOUR / 2;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;

interface CalendarWeekGridProps {
  weekDays: Date[];
  hours: number[];
  hoursRange: { start: number; end: number };
  loading: boolean;
  getSlotsForDay: (day: Date) => MasterSlot[];
  getBookingsForSlot: (slotId: number) => MasterBooking[];
  isDayBlocked: (day: Date) => DayBlock | undefined;
  onSlotClick: (slot: MasterSlot) => void;
  onDeleteBlock: (blockId: number) => void;
  onCreateBusySlot: (datetimeStart: string, datetimeEnd: string, notes?: string) => void;
}

interface Selection {
  dayIdx: number;
  startSlotIdx: number;
  endSlotIdx: number;
}

const CalendarWeekGrid = ({
  weekDays,
  hours,
  hoursRange,
  loading,
  getSlotsForDay,
  getBookingsForSlot,
  isDayBlocked,
  onSlotClick,
  onDeleteBlock,
  onCreateBusySlot,
}: CalendarWeekGridProps) => {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<Selection | null>(null);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const totalSlots = (hoursRange.end - hoursRange.start + 1) * SLOTS_PER_HOUR;

  const slotIndexFromY = (y: number): number => {
    const idx = Math.floor(y / PX_PER_SLOT);
    return Math.max(0, Math.min(totalSlots - 1, idx));
  };

  const startDrag = (dayIdx: number, clientY: number) => {
    const container = containerRefs.current[dayIdx];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const slotIdx = slotIndexFromY(clientY - rect.top);
    setIsDragging(true);
    setSelection({ dayIdx, startSlotIdx: slotIdx, endSlotIdx: slotIdx });
    setPendingConfirm(null);
  };

  const updateDrag = (clientY: number) => {
    if (!isDragging || !selection) return;
    const container = containerRefs.current[selection.dayIdx];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const slotIdx = slotIndexFromY(clientY - rect.top);
    setSelection({ ...selection, endSlotIdx: slotIdx });
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (selection) {
      setPendingConfirm(selection);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => updateDrag(e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) updateDrag(e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, selection]);

  const selectionRange = (sel: Selection) => {
    const from = Math.min(sel.startSlotIdx, sel.endSlotIdx);
    const to = Math.max(sel.startSlotIdx, sel.endSlotIdx);
    return { from, to };
  };

  const selectionToDateTime = (sel: Selection) => {
    const { from, to } = selectionRange(sel);
    const day = weekDays[sel.dayIdx];
    const dateStr = formatDateISO(day);

    const startMinutes = hoursRange.start * 60 + from * SLOT_MINUTES;
    const endMinutes = hoursRange.start * 60 + (to + 1) * SLOT_MINUTES;

    const fmt = (m: number) => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    return {
      datetimeStart: `${dateStr}T${fmt(startMinutes)}:00`,
      datetimeEnd: `${dateStr}T${fmt(endMinutes)}:00`,
      timeStartLabel: fmt(startMinutes),
      timeEndLabel: fmt(endMinutes),
    };
  };

  const confirmBusy = () => {
    if (!pendingConfirm) return;
    const { datetimeStart, datetimeEnd, timeStartLabel, timeEndLabel } = selectionToDateTime(pendingConfirm);
    onCreateBusySlot(datetimeStart, datetimeEnd, `Занято ${timeStartLabel}–${timeEndLabel}`);
    setPendingConfirm(null);
    setSelection(null);
  };

  const cancelSelection = () => {
    setPendingConfirm(null);
    setSelection(null);
  };

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
      {/* Подсказка / панель действий */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs">
        {pendingConfirm ? (
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-gray-700">
              <Icon name="MousePointer2" size={14} className="text-orange-500" />
              <span>
                Выбрано:{" "}
                <strong>{DAY_NAMES[pendingConfirm.dayIdx]} {formatDateShort(weekDays[pendingConfirm.dayIdx])}</strong>{" "}
                {selectionToDateTime(pendingConfirm).timeStartLabel}–{selectionToDateTime(pendingConfirm).timeEndLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelSelection}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md font-medium"
              >
                Отмена
              </button>
              <button
                onClick={confirmBusy}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium flex items-center gap-1.5"
              >
                <Icon name="Lock" size={12} />
                Пометить занятым
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Icon name="MousePointer2" size={14} />
            <span>Выделите ячейки мышью или пальцем, чтобы пометить время занятым</span>
          </div>
        )}
      </div>

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
              const totalHeight = (hoursRange.end - hoursRange.start + 1) * PX_PER_HOUR;

              const activeSel =
                selection && selection.dayIdx === dayIdx
                  ? selectionRange(selection)
                  : pendingConfirm && pendingConfirm.dayIdx === dayIdx
                  ? selectionRange(pendingConfirm)
                  : null;

              return (
                <div
                  key={dayIdx}
                  ref={(el) => (containerRefs.current[dayIdx] = el)}
                  className="relative border-r border-gray-200 last:border-r-0 select-none"
                  style={{ height: `${totalHeight}px`, touchAction: blocked ? "auto" : "none" }}
                  onMouseDown={(e) => {
                    if (blocked) return;
                    // не начинаем выделение, если кликнули на существующий слот
                    const target = e.target as HTMLElement;
                    if (target.closest("[data-slot-card]")) return;
                    e.preventDefault();
                    startDrag(dayIdx, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    if (blocked) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("[data-slot-card]")) return;
                    if (e.touches[0]) {
                      e.preventDefault();
                      startDrag(dayIdx, e.touches[0].clientY);
                    }
                  }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-b border-gray-100"
                      style={{ top: `${(hour - hoursRange.start) * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
                    >
                      {/* линия середины часа (30 мин) */}
                      <div
                        className="absolute left-0 right-0 border-b border-dashed border-gray-100"
                        style={{ top: `${PX_PER_HOUR / 2}px` }}
                      />
                    </div>
                  ))}

                  {/* Подсветка выделения */}
                  {activeSel && (
                    <div
                      className="absolute left-0.5 right-0.5 z-10 rounded border-2 border-orange-400 bg-orange-200/40 pointer-events-none"
                      style={{
                        top: `${activeSel.from * PX_PER_SLOT}px`,
                        height: `${(activeSel.to - activeSel.from + 1) * PX_PER_SLOT}px`,
                      }}
                    >
                      <div className="text-[10px] font-semibold text-orange-700 px-1 py-0.5">
                        {(() => {
                          const sel = selection?.dayIdx === dayIdx ? selection : pendingConfirm;
                          if (!sel) return null;
                          const { timeStartLabel, timeEndLabel } = selectionToDateTime(sel);
                          return `${timeStartLabel}–${timeEndLabel}`;
                        })()}
                      </div>
                    </div>
                  )}

                  {blocked && (
                    <div className="absolute inset-0 bg-gray-100/60 z-20 flex items-center justify-center">
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
                    const pos = getSlotPosition(slot, hoursRange.start);
                    const colors = getSlotColors(slot.status);
                    const bookings = slot.id ? getBookingsForSlot(slot.id) : [];
                    const clientName = bookings.length > 0 ? bookings[0].client_name : null;

                    return (
                      <div
                        key={slot.id || `${slot.datetime_start}`}
                        data-slot-card
                        className={`absolute left-0.5 right-0.5 z-30 rounded border px-1.5 py-0.5 cursor-pointer transition-colors overflow-hidden ${colors}`}
                        style={{ top: pos.top, height: pos.height }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotClick(slot);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
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
