import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rolesApi } from "@/lib/roles-api";
import Icon from "@/components/ui/icon";
import MasterCalendar from "@/components/admin/MasterCalendar";
import MasterBookingsList from "@/components/admin/MasterBookingsList";
import MasterServices from "@/components/admin/MasterServices";
import MasterTemplates from "@/components/admin/MasterTemplates";
import MasterCalendarSettings from "@/components/admin/MasterCalendarSettings";

type MasterTab = "calendar" | "bookings" | "services" | "templates" | "settings";

const TABS: { id: MasterTab; label: string; icon: string }[] = [
  { id: "calendar", label: "Расписание", icon: "CalendarDays" },
  { id: "bookings", label: "Записи", icon: "ClipboardCheck" },
  { id: "services", label: "Услуги", icon: "Sparkles" },
  { id: "templates", label: "Шаблоны", icon: "Copy" },
  { id: "settings", label: "Настройки", icon: "SlidersHorizontal" },
];

const MyCalendar = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [tab, setTab] = useState<MasterTab>("calendar");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { roles } = await rolesApi.getMyRoles();
        const isParmaster = roles.some(
          (r) => r.slug === "parmaster" && r.status === "active"
        );
        setHasAccess(isParmaster);
      } catch {
        setHasAccess(false);
      }
    };
    checkRole();
  }, []);

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-16">
        <Icon name="Lock" size={40} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Календарь доступен для пармастеров</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Получите роль «Пармастер», чтобы управлять расписанием
        </p>
      </div>
    );
  }

  if (!user) return null;

  const masterId = user.id;

  const renderTab = () => {
    switch (tab) {
      case "calendar":
        return <MasterCalendar masterId={masterId} />;
      case "bookings":
        return <MasterBookingsList masterId={masterId} />;
      case "services":
        return <MasterServices masterId={masterId} />;
      case "templates":
        return <MasterTemplates masterId={masterId} />;
      case "settings":
        return <MasterCalendarSettings masterId={masterId} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  );
};

export default MyCalendar;
