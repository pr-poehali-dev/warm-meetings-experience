import { TicketStatus, TicketPriority } from "@/lib/support-api";

export const STATUS_LIST: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открыты" },
  { value: "in_progress", label: "В работе" },
  { value: "awaiting_reply", label: "Ждут пользователя" },
  { value: "closed", label: "Закрытые" },
];

export const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: "Открыт", cls: "bg-amber-100 text-amber-700" },
  in_progress: { label: "В работе", cls: "bg-blue-100 text-blue-700" },
  awaiting_reply: { label: "Ждём пользователя", cls: "bg-violet-100 text-violet-700" },
  closed: { label: "Закрыт", cls: "bg-slate-100 text-slate-600" },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; cls: string }> = {
  low: { label: "Низкий", cls: "text-slate-500" },
  medium: { label: "Средний", cls: "text-blue-600" },
  high: { label: "Высокий", cls: "text-rose-600 font-semibold" },
};

export const CATEGORY_LABELS: Record<string, string> = {
  booking: "Бронирование",
  payment: "Оплата",
  tech: "Техника",
  idea: "Предложение",
  other: "Другое",
};

export function formatDateTime(s: string) {
  try {
    return new Date(s).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}
