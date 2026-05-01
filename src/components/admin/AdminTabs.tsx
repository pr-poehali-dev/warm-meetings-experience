import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ViewType } from "@/types/admin";
import { useAdminBadges, AdminBadges } from "@/hooks/useAdminBadges";
import ProfileDropdown from "@/components/ProfileDropdown";

interface NavItem {
  view: ViewType;
  label: string;
  icon: string;
  hint?: string;
  badgeKey?: keyof AdminBadges;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    id: "events",
    label: "События",
    icon: "PartyPopper",
    items: [
      {
        view: "overview",
        label: "Дашборд",
        icon: "LayoutDashboard",
        hint: "Общая сводка",
      },
      {
        view: "list",
        label: "Все события",
        icon: "List",
        hint: "Список событий",
      },
      {
        view: "add",
        label: "Создать встречу",
        icon: "Plus",
        hint: "Новое событие",
      },
      {
        view: "event-signups",
        label: "Записи",
        icon: "ClipboardList",
        hint: "Записи участников",
        badgeKey: "events",
      },
      {
        view: "moderation",
        label: "Модерация",
        icon: "ShieldCheck",
        hint: "Заявки организаторов",
        badgeKey: "moderation",
      },
    ],
  },
  {
    id: "people",
    label: "Люди",
    icon: "Users",
    items: [
      {
        view: "users",
        label: "Пользователи",
        icon: "Users",
        hint: "Все аккаунты",
      },
      {
        view: "roles",
        label: "Заявки на роли",
        icon: "Shield",
        hint: "Мастера, организаторы",
        badgeKey: "community",
      },
      {
        view: "masters",
        label: "Мастера",
        icon: "Sparkles",
        hint: "Верификация профилей",
      },
    ],
  },
  {
    id: "content",
    label: "Контент",
    icon: "FileText",
    items: [
      {
        view: "blog",
        label: "Статьи блога",
        icon: "BookOpen",
        hint: "Публикация, модерация",
      },
      {
        view: "baths",
        label: "Бани",
        icon: "Home",
        hint: "Карточки заведений",
      },
    ],
  },
  {
    id: "bookings",
    label: "Бронирования",
    icon: "CalendarCheck",
    items: [
      {
        view: "bookings",
        label: "Заявки",
        icon: "FileText",
        hint: "Из калькулятора",
        badgeKey: "calculator",
      },
      {
        view: "packages",
        label: "Пакеты",
        icon: "Package",
        hint: "Состав и цены",
      },
      {
        view: "addons",
        label: "Дополнения",
        icon: "ShoppingBag",
        hint: "Доп. услуги",
      },
    ],
  },
  {
    id: "pricing",
    label: "Цены и настройки",
    icon: "Settings",
    items: [
      {
        view: "service-areas",
        label: "Зоны доставки",
        icon: "MapPin",
        hint: "Районы и множители",
      },
      {
        view: "multipliers",
        label: "Коэффициенты",
        icon: "TrendingUp",
        hint: "Сезонные надбавки",
      },
      {
        view: "holidays",
        label: "Праздники",
        icon: "Calendar",
        hint: "Праздничные даты",
      },
      {
        view: "promo-codes",
        label: "Промо-коды",
        icon: "Tag",
        hint: "Скидки и акции",
      },
      {
        view: "availability",
        label: "Выходные дни",
        icon: "CalendarOff",
        hint: "Блокировка дат",
      },
      {
        view: "settings",
        label: "Настройки сайта",
        icon: "SlidersHorizontal",
        hint: "Общие параметры",
      },
    ],
  },
];

function getActiveGroup(view: ViewType): string {
  for (const group of NAV) {
    if (group.items.some((i) => i.view === view)) return group.id;
  }
  return NAV[0].id;
}

interface AdminTabsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewEvent: () => void;
  onLogout?: () => void;
}

const NotifBadge = ({ count }: { count: number }) => {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
};

export default function AdminTabs({
  currentView,
  onViewChange,
  onNewEvent,
  onLogout,
}: AdminTabsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { badges } = useAdminBadges();
  const activeGroupId = getActiveGroup(currentView);

  const getBadgeCount = (items: NavItem[]) =>
    items.reduce((acc, i) => acc + (i.badgeKey ? badges[i.badgeKey] : 0), 0);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const isGroupOpen = (id: string) =>
    id === activeGroupId || openGroups[id] === true;

  const handleClick = (view: ViewType) => {
    if (view === "add") onNewEvent();
    onViewChange(view);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((group) => {
        const groupBadge = getBadgeCount(group.items);
        const open = isGroupOpen(group.id);
        return (
          <div key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeGroupId === group.id
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon name={group.icon} size={16} className="flex-shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              {groupBadge > 0 && !open && <NotifBadge count={groupBadge} />}
              <Icon
                name="ChevronDown"
                size={14}
                className={`flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-gray-100 pl-3">
                {group.items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] : 0;
                  const active = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => handleClick(item.view)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors group ${
                        active
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon
                        name={item.icon}
                        size={14}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium leading-tight">
                          {item.label}
                        </div>
                        {item.hint && (
                          <div
                            className={`text-[11px] truncate ${active ? "text-white/70" : "text-gray-400"}`}
                          >
                            {item.hint}
                          </div>
                        )}
                      </div>
                      {count > 0 && <NotifBadge count={count} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Десктоп: боковая панель */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-card border-r border-border h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="ShieldCheck" size={15} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">Админ-панель</div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>

        <div className="border-t border-gray-100 p-3 flex items-center justify-between flex-shrink-0">
          <ProfileDropdown variant="compact" onLogout={onLogout} />
          <Link
            to="/events"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon name="ArrowLeft" size={13} />
            На сайт
          </Link>
        </div>
      </aside>

      {/* Мобильный: верхняя шапка */}
      <header className="lg:hidden bg-card/95 backdrop-blur border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition"
          >
            <Icon name={mobileOpen ? "X" : "Menu"} size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="ShieldCheck" size={15} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">Админ-панель</div>
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                {NAV.flatMap((g) => g.items).find((i) => i.view === currentView)?.label ?? "Управление"}
              </div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/events" className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
              <Icon name="ArrowUpRight" size={16} />
            </Link>
            <ProfileDropdown variant="compact" onLogout={onLogout} />
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-card shadow-xl max-h-[80vh] overflow-y-auto">
            <SidebarContent />
          </div>
        )}
      </header>
    </>
  );
}