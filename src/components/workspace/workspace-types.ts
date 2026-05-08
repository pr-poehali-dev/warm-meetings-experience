export type RoleTab = "dashboard" | "master" | "organizer" | "partner" | "telegram" | "landing";
export type MasterSection = "dashboard" | "profile" | "schedule" | "bookings" | "reviews" | "finances" | "notifications";
export type OrgView = "dashboard" | "create" | "edit" | "participants" | "calculator" | "notify" | "blog";
export type PartnerView = "dashboard" | "baths" | "add" | "edit";

export const MASTER_NAV: { id: MasterSection; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "profile", label: "Мой профиль", icon: "User" },
  { id: "schedule", label: "Расписание", icon: "CalendarDays" },
  { id: "bookings", label: "Записи", icon: "ClipboardCheck" },
  { id: "reviews", label: "Отзывы", icon: "Star" },
  { id: "finances", label: "Финансы", icon: "Wallet" },
  { id: "notifications", label: "Уведомления", icon: "Bell" },
];

export const ORG_NAV: { id: OrgView; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "calculator", label: "Калькулятор", icon: "Calculator" },
  { id: "notify", label: "Рассылки", icon: "Bell" },
];
// Примечание: Telegram теперь общий для всех ролей (RoleTab = "telegram")