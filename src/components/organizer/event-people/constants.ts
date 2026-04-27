export type GuestStatusFilter = "all" | "new" | "wrote" | "confirmed" | "refused";

export const GUEST_STATUS_FILTERS: { key: GuestStatusFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "wrote", label: "Написал" },
  { key: "confirmed", label: "Подтверждены" },
  { key: "refused", label: "Отказы" },
];

export const STATUS_MAP: Record<string, { label: string; color: string; filter: GuestStatusFilter }> = {
  new: { label: "Новая", color: "bg-gray-100 text-gray-600", filter: "new" },
  новая: { label: "Новая", color: "bg-gray-100 text-gray-600", filter: "new" },
  wrote: { label: "Написал", color: "bg-yellow-100 text-yellow-700", filter: "wrote" },
  confirmed: { label: "Подтверждён", color: "bg-green-100 text-green-700", filter: "confirmed" },
  подтверждён: { label: "Подтверждён", color: "bg-green-100 text-green-700", filter: "confirmed" },
  paid: { label: "Оплачено", color: "bg-green-100 text-green-700", filter: "confirmed" },
  оплачено: { label: "Оплачено", color: "bg-green-100 text-green-700", filter: "confirmed" },
  cancelled: { label: "Отказ", color: "bg-red-100 text-red-600", filter: "refused" },
  отменено: { label: "Отказ", color: "bg-red-100 text-red-600", filter: "refused" },
  refused: { label: "Отказ", color: "bg-red-100 text-red-600", filter: "refused" },
};

export const CHANNEL_ICON: Record<string, string> = {
  telegram: "Send",
  vk: "MessageCircle",
  email: "Mail",
  sms: "MessageSquare",
  site: "Globe",
};
