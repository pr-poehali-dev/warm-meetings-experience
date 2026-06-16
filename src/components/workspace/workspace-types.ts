export type RoleTab = "dashboard" | "master" | "organizer" | "partner" | "telegram" | "landing" | "notify" | "blog" | "notifications";
export type MasterSection = "dashboard" | "profile" | "schedule" | "services" | "bookings" | "messages" | "reviews" | "finances" | "notifications" | "settings";
export type OrgView = "dashboard" | "create" | "edit" | "participants" | "calculator" | "notify" | "blog" | "questions";
export type PartnerView = "dashboard" | "baths" | "add" | "edit" | "notifications";

export const MASTER_NAV: { id: MasterSection; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "profile", label: "Мой профиль", icon: "User" },
  { id: "schedule", label: "Расписание", icon: "CalendarDays" },
  { id: "services", label: "Услуги", icon: "Sparkles" },
  { id: "bookings", label: "Записи", icon: "ClipboardCheck" },
  { id: "messages", label: "Сообщения", icon: "MessageCircle" },
  { id: "reviews", label: "Отзывы", icon: "Star" },
  { id: "finances", label: "Финансы", icon: "Wallet" },
  { id: "settings", label: "Настройки", icon: "Settings" },
];

export const ORG_NAV: { id: OrgView; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "calculator", label: "Калькулятор", icon: "Calculator" },
];
// Примечание: Telegram теперь общий для всех ролей (RoleTab = "telegram")