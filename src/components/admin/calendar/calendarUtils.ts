import type { MasterSlot } from "@/lib/master-calendar-api";

export const MASTER_ID = 1;
export const HOURS_START = 8;
export const HOURS_END = 23;
export const PX_PER_HOUR = 60;

export const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const MONTH_NAMES_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export type ViewMode = "week" | "month";

export interface SlotFormData {
  date: string;
  time_start: string;
  time_end: string;
  service_id: string;
  max_clients: number;
  notes: string;
}

export interface BlockFormData {
  date_from: string;
  date_to: string;
  reason: string;
  notes: string;
}

export interface TemplateFormData {
  template_id: string;
  weeks: number;
  start_date: string;
}

export const formatDateShort = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}.${m}`;
};

export const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}-${endDay} ${MONTH_NAMES_GENITIVE[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${startDay} ${MONTH_NAMES_GENITIVE[weekStart.getMonth()]} - ${endDay} ${MONTH_NAMES_GENITIVE[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
};

export const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseLocalTime = (dateStr: string): { hours: number; minutes: number } => {
  const timePart = dateStr.includes("T") ? dateStr.split("T")[1] : dateStr;
  const [h, m] = timePart.split(":").map(Number);
  return { hours: h, minutes: m };
};

export const getSlotPosition = (slot: MasterSlot) => {
  const start = parseLocalTime(slot.datetime_start);
  const end = parseLocalTime(slot.datetime_end);
  const startHour = start.hours + start.minutes / 60;
  const endHour = end.hours + end.minutes / 60;
  const top = (startHour - HOURS_START) * PX_PER_HOUR;
  const height = (endHour - startHour) * PX_PER_HOUR;
  return { top: `${top}px`, height: `${Math.max(height, 30)}px` };
};

export const getSlotColors = (status: MasterSlot["status"]): string => {
  const colors: Record<string, string> = {
    available: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
    pending: "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200",
    booked: "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
    blocked: "bg-gray-200 border-gray-300 text-gray-600 hover:bg-gray-300",
    event: "bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200",
  };
  return colors[status] || "bg-gray-100 border-gray-300 text-gray-600";
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    available: "Свободен",
    pending: "Ожидает",
    booked: "Забронирован",
    blocked: "Заблокирован",
    event: "Мероприятие",
    confirmed: "Подтверждён",
    canceled: "Отменён",
    completed: "Завершён",
    no_show: "Неявка",
  };
  return labels[status] || status;
};

export const getBookingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    canceled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    no_show: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export const formatTime = (dateStr: string): string => {
  const { hours, minutes } = parseLocalTime(dateStr);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};