import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rolesApi } from "@/lib/roles-api";
import { mastersApi } from "@/lib/masters-api";
import Icon from "@/components/ui/icon";
import MasterCalendar from "@/components/admin/MasterCalendar";
import MasterBookingsList from "@/components/admin/MasterBookingsList";
import MasterServices from "@/components/admin/MasterServices";
import MasterTemplates from "@/components/admin/MasterTemplates";
import MasterCalendarSettings from "@/components/admin/MasterCalendarSettings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MasterTab = "calendar" | "bookings" | "services" | "templates" | "settings";

const TABS: { id: MasterTab; label: string; icon: string; hint: string }[] = [
  { id: "calendar", label: "Расписание", icon: "CalendarDays", hint: "Окна доступности — время, когда гости могут к вам записаться. Добавляйте, редактируйте и блокируйте слоты." },
  { id: "bookings", label: "Записи", icon: "ClipboardCheck", hint: "Все записи гостей: ожидают подтверждения, подтверждены, завершены. Здесь подтверждаете или отменяете каждую запись." },
  { id: "services", label: "Услуги", icon: "Sparkles", hint: "Создайте услуги — название, длительность, цена. Гость выбирает услугу при записи, система сама подберёт подходящий слот." },
  { id: "templates", label: "Шаблоны", icon: "Copy", hint: "Шаблон — это ваш типичный рабочий график (дни, часы, услуга). Один раз настройте и применяйте на любое количество недель." },
  { id: "settings", label: "Настройки", icon: "SlidersHorizontal", hint: "Часовой пояс, перерыв между записями, автоподтверждение и другие параметры." },
];

const MyCalendar = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [masterId, setMasterId] = useState<number | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [tab, setTab] = useState<MasterTab>("calendar");

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { roles } = await rolesApi.getMyRoles();
        const isParmaster = roles.some(
          (r) => r.slug === "parmaster" && r.status === "active"
        );
        if (cancelled) return;
        setHasAccess(isParmaster);
        if (!isParmaster) return;
        // Резолвим реальный master_id из таблицы masters, а не user.id.
        // У одного пользователя user.id и masters.id могут не совпадать.
        try {
          const profile = await mastersApi.getMyProfile();
          if (cancelled) return;
          if (profile?.id) {
            setMasterId(profile.id);
          } else {
            setProfileError("Профиль мастера не найден");
          }
        } catch {
          if (!cancelled) setProfileError("Не удалось загрузить профиль мастера");
        }
      } catch {
        if (!cancelled) setHasAccess(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
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

  if (profileError) {
    return (
      <div className="text-center py-16">
        <Icon name="AlertCircle" size={40} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{profileError}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Заполните профиль мастера на странице «Профиль», затем вернитесь.
        </p>
      </div>
    );
  }

  if (masterId === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      <TooltipProvider delayDuration={400}>
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {TABS.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                    tab === t.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon name={t.icon} size={15} />
                  {t.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-snug">
                {t.hint}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      {renderTab()}
    </div>
  );
};

export default MyCalendar;